import React, { useState, useEffect, useRef } from 'react';
import {
  X, Search, Calendar, Hash, Calculator, Plus, Printer,
  Check, ArrowDownLeft, ArrowUpRight, Users, User, RefreshCcw,
  Layout, Database, Info, Trash2
} from 'lucide-react';
import api from '../api';

export default function CashEntryModal({ company, type = 'debit', editId = null, onSubmit, onClose }) {
  const isCredit = type === 'credit';
  const title = isCredit ? 'Jama (Receipts)' : 'Udhar (Payments)';
  const subtitle = isCredit ? 'Incoming Capital Stream' : 'Outgoing Capital Stream';

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [members, setMembers] = useState([]);
  const [narrationsList, setNarrationsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subEntries, setSubEntries] = useState([{ id: Date.now(), description: '', amount: '', code: '', member_id: null }]);

  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    account_id: '',
    amount: '0.00',
    reference_no: '',
    description: ''
  });

  // Search States
  const [searchCode, setSearchCode] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Subledger Search States
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [activeRowId, setActiveRowId] = useState(null);

  const dropdownRef = useRef(null);
  const rowRefs = useRef({});

  useEffect(() => {
    if (company?.id) {
      fetchInitialData();
    }
  }, [company]);

  // Focus helper
  const focusInput = (rowId, field) => {
    if (rowRefs.current[rowId] && rowRefs.current[rowId][field]) {
      rowRefs.current[rowId][field].focus();
    }
  };

  const addNewRow = () => {
    const newId = Date.now();
    setSubEntries(prev => [...prev, { id: newId, description: '', amount: '', code: '', member_id: null }]);
  };

  useEffect(() => {
    if (subEntries.length > 0) {
      const lastRow = subEntries[subEntries.length - 1];
      // Only focus if it's a new empty row
      if (!lastRow.code && !lastRow.description && !lastRow.amount) {
        setTimeout(() => focusInput(lastRow.id, 'code'), 50);
      }
    }
  }, [subEntries.length]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [accRes, memRes, narrRes] = await Promise.all([
        api.get(`/accounts?type=ledger`),
        api.get('/members'),
        api.get('/narrations')
      ]);

      setAccounts(accRes.data.success ? accRes.data.data : []);
      setMembers(memRes.data.success ? memRes.data.data : []);
      setNarrationsList(narrRes.data.success ? narrRes.data.data : []);

      if (editId) {
        fetchEditEntry(accRes.data.data, memRes.data.data);
      }
    } catch (err) {
      console.error('Fetch initial data error', err);
      setError('Failed to load dependency data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEditEntry = async (loadedAccs, loadedMembers) => {
    try {
      setLoading(true);
      const res = await api.get(`/cash-book/${editId}`);
      if (res.data.success) {
        const entry = res.data.data;

        // Find and set selected account FIRST so we know if it's a subledger
        const acc = loadedAccs.find(a => a.id === entry.account_id);
        if (acc) {
          setSelectedAccount(acc);
          setSearchCode(String(acc.account_code || acc.id));
          setSearchText(acc.account_name);
        }

        setFormData({
          transaction_date: entry.transaction_date ? entry.transaction_date.split('T')[0] : new Date().toISOString().split('T')[0],
          account_id: entry.account_id || '',
          amount: (parseFloat(entry.cash_in || 0) + parseFloat(entry.cash_out || 0)).toFixed(2),
          reference_no: entry.reference_no || '',
          description: entry.description || ''
        });

        // Hydrate subEntries from notes or from the main entry
        if (entry.notes && entry.notes.includes(': ')) {
          const rows = entry.notes.split('; ').filter(p => p.includes(': ')).map(pair => {
            const [desc, amt] = pair.split(': ');
            const codeMatch = desc.match(/^(\d+)\s*-\s*(.*)/);
            const code = codeMatch ? codeMatch[1] : '';
            let description = codeMatch ? codeMatch[2] : desc;

            let m_id = null;
            if (acc?.is_subledger) {
              const m = loadedMembers.find(mem => String(mem.member_code) === code || mem.member_name === description);
              if (m) {
                m_id = m.id;
                description = m.member_name;
              }
            }

            return {
              id: Math.random(),
              description,
              amount: amt || '',
              code,
              member_id: m_id
            };
          });
          if (rows.length > 0) setSubEntries(rows);
        } else {
          // If no complex notes, use the main entry data (now including member details from API join)
          setSubEntries([{
            id: Date.now(),
            description: entry.member_name || entry.description || '',
            amount: (parseFloat(entry.cash_in || 0) + parseFloat(entry.cash_out || 0)).toFixed(2),
            code: entry.member_code || '',
            member_id: entry.member_id || null
          }]);
        }
      }
    } catch (err) {
      console.error('Fetch edit entry error', err);
      setError('Failed to load entry details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = (acc) => {
    setSelectedAccount(acc);
    setFormData(prev => ({ ...prev, account_id: acc.id }));
    setSearchCode(String(acc.account_code || acc.id));
    setSearchText(acc.account_name);
    setShowDropdown(false);
  };

  const filteredAccounts = accounts.filter(a => {
    const codeMatch = searchCode ? (String(a.account_code || a.id).includes(searchCode)) : true;
    const nameMatch = searchText ? a.account_name.toLowerCase().includes(searchText.toLowerCase()) : true;
    return codeMatch && nameMatch;
  });

  const handleSave = async () => {
    if (!formData.account_id || parseFloat(formData.amount) <= 0) {
      setError('Please select an account and enter a valid amount.');
      return;
    }

    setLoading(true);
    try {
      const batchEntries = subEntries
        .filter(r => r.amount && parseFloat(r.amount) > 0)
        .map(r => ({
          account_id: formData.account_id,
          member_id: r.member_id || null,
          description: r.description || formData.description,
          cash_in: isCredit ? parseFloat(r.amount) : 0,
          cash_out: isCredit ? 0 : parseFloat(r.amount),
          notes: r.code ? `${r.code} - ${r.description}` : r.description
        }));

      const payload = {
        transaction_date: formData.transaction_date,
        account_id: formData.account_id,
        description: formData.description || (isCredit ? 'Cash Receipt' : 'Cash Payment'),
        entries: batchEntries
      };

      if (editId) {
        await api.patch(`/cash-book/${editId}`, payload);
      } else {
        await api.post(`/cash-book/manual`, payload);
      }
      onSubmit();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = subEntries.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl flex flex-col border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh]">

        {/* Header */}
        <div className="bg-blue-600 text-white px-4 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-lg backdrop-blur-md">
              {isCredit ? <ArrowUpRight size={22} strokeWidth={2.5} /> : <ArrowDownLeft size={22} strokeWidth={2.5} />}
            </div>
            <div>
              <h2 className="font-black uppercase tracking-tight text-xl">{title}</h2>
              <p className="text-[10px] font-bold text-blue-100 uppercase tracking-[0.3em] mt-0.5 opacity-80">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-full transition-all active:scale-90">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-4 rounded-lg text-sm font-bold flex items-center gap-4 animate-in slide-in-from-top-2">
              <Info size={18} /> {error}
            </div>
          )}

          {/* Primary Details Card */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Date</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <input
                    type="date"
                    value={formData.transaction_date}
                    onChange={e => setFormData({ ...formData, transaction_date: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none text-sm font-black text-slate-700 transition-all"
                  />
                </div>
              </div>

              {/* Reference No */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voucher / Ref No</label>
                <div className="relative group">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="Enter Reference Number..."
                    value={formData.reference_no}
                    onChange={e => setFormData({ ...formData, reference_no: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none text-sm font-black text-slate-700 font-mono transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Account Search */}
            <div className="space-y-2 relative" ref={dropdownRef}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Account Node</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="CODE"
                  value={searchCode}
                  onChange={e => { setSearchCode(e.target.value); setShowDropdown(true); }}
                  className="w-24 px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg text-sm font-black text-center outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                />
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="Search Account Name (e.g. Purchase, Sales, Bank...)"
                    value={searchText}
                    onChange={e => { setSearchText(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-lg text-sm font-black text-slate-700 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 shadow-2xl z-50 max-h-60 overflow-y-auto rounded-lg divide-y divide-slate-50 animate-in slide-in-from-top-2">
                      {filteredAccounts.length === 0 ? (
                        <div className="p-4 text-center text-xs font-bold text-slate-400 italic">No matching accounts found</div>
                      ) : filteredAccounts.map(acc => (
                        <div
                          key={acc.id}
                          onClick={() => handleAccountSelect(acc)}
                          className="px-5 py-4 hover:bg-blue-50 cursor-pointer flex justify-between items-center group transition-colors"
                        >
                          <div>
                            <p className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors">{acc.account_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{acc.account_type || 'Standard'}</p>
                          </div>
                          <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-lg text-slate-500 font-mono group-hover:bg-blue-600 group-hover:text-white transition-all">#{acc.account_code || acc.id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Entries Matrix */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
            <div className="bg-slate-50 px-4 py-4 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Layout size={16} /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Entry Allocation Matrix</h3>
              </div>
              <button
                disabled={!selectedAccount}
                onClick={addNewRow}
                className="flex items-center gap-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-30"
              >
                <Plus size={14} strokeWidth={3} /> Add Record
              </button>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">
                    <th className="w-24 px-4 py-4 text-center">Code</th>
                    <th className="px-4 py-4">{selectedAccount?.is_subledger ? 'Member (Sabhasad)' : 'Narration / Detail'}</th>
                    <th className="w-48 px-4 py-4 text-right">{isCredit ? 'Jama' : 'Udhar'} (₹)</th>
                    <th className="w-16 px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {subEntries.map((row, idx) => (
                    <tr key={row.id} className="group hover:bg-slate-50/30 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          ref={el => { if (!rowRefs.current[row.id]) rowRefs.current[row.id] = {}; rowRefs.current[row.id].code = el; }}
                          value={row.code}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              focusInput(row.id, 'description');
                            }
                          }}
                          onChange={e => {
                            const val = e.target.value;
                            let matched = null;
                            if (selectedAccount?.is_subledger) {
                              matched = members.find(m => String(m.member_code) === val);
                            } else {
                              matched = narrationsList.find(n => String(n.narration_code) === val);
                            }
                            const updated = subEntries.map(r => r.id === row.id ? {
                              ...r,
                              code: val,
                              description: matched ? (selectedAccount?.is_subledger ? matched.member_name : matched.narration_text) : r.description,
                              member_id: matched && selectedAccount?.is_subledger ? matched.id : (matched ? null : r.member_id)
                            } : r);
                            setSubEntries(updated);
                          }}
                          placeholder="0000"
                          className="w-full bg-slate-50/50 border border-transparent rounded-lg py-2 px-1 text-center text-xs font-mono font-black text-slate-700 focus:bg-white focus:border-blue-300 outline-none transition-all"
                        />

                      </td>
                      <td className="px-4 py-4 relative">
                        <input
                          type="text"
                          ref={el => { if (!rowRefs.current[row.id]) rowRefs.current[row.id] = {}; rowRefs.current[row.id].description = el; }}
                          value={row.description}
                          onFocus={() => { setActiveRowId(row.id); setShowMemberDropdown(true); }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              setShowMemberDropdown(false);
                              focusInput(row.id, 'amount');
                            }
                          }}
                          onChange={e => {
                            const desc = e.target.value;
                            const updated = subEntries.map(r => r.id === row.id ? { ...r, description: desc } : r);
                            setSubEntries(updated);
                            setActiveRowId(row.id);
                            setShowMemberDropdown(true);
                          }}
                          placeholder={selectedAccount?.is_subledger ? "Search member name..." : "Enter details..."}
                          className="w-full bg-transparent border-none py-2 px-0 text-xs font-black text-slate-800 outline-none placeholder:text-slate-300"
                        />

                        {showMemberDropdown && activeRowId === row.id && row.description.length > 0 && (
                          <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-slate-200 shadow-2xl z-[100] max-h-48 overflow-y-auto rounded-lg divide-y divide-slate-50">
                            {(selectedAccount?.is_subledger ? members : narrationsList)
                              .filter(m => {
                                const target = selectedAccount?.is_subledger ? m.member_name : m.narration_text;
                                const code = selectedAccount?.is_subledger ? m.member_code : m.narration_code;
                                return target.toLowerCase().includes(row.description.toLowerCase()) || (code && String(code).includes(row.description));
                              })
                              .map(m => (
                                <div
                                  key={m.id}
                                  onClick={() => {
                                    const updated = subEntries.map(r => r.id === row.id ? {
                                      ...r,
                                      description: selectedAccount?.is_subledger ? m.member_name : m.narration_text,
                                      code: selectedAccount?.is_subledger ? m.member_code : m.narration_code,
                                      member_id: selectedAccount?.is_subledger ? m.id : null
                                    } : r);
                                    setSubEntries(updated);
                                    setShowMemberDropdown(false);
                                    focusInput(row.id, 'amount');
                                  }}
                                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center group transition-colors"
                                >
                                  <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-600">{selectedAccount?.is_subledger ? m.member_name : m.narration_text}</span>
                                  <span className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded-lg text-slate-400">#{selectedAccount?.is_subledger ? m.member_code : (m.narration_code || 'UNC')}</span>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          ref={el => { if (!rowRefs.current[row.id]) rowRefs.current[row.id] = {}; rowRefs.current[row.id].amount = el; }}
                          value={row.amount}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addNewRow();
                            }
                          }}
                          onChange={e => {
                            const updated = subEntries.map(r => r.id === row.id ? { ...r, amount: e.target.value } : r);
                            setSubEntries(updated);
                            const total = updated.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
                            setFormData(prev => ({ ...prev, amount: total.toFixed(2) }));
                          }}
                          placeholder="0.00"
                          className="w-full bg-slate-50/50 border border-transparent rounded-lg py-2 px-4 text-right text-xs font-black text-slate-800 focus:bg-white focus:border-blue-300 outline-none transition-all font-mono"
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => {
                            if (subEntries.length > 1) {
                              setSubEntries(subEntries.filter(r => r.id !== row.id));
                            }
                          }}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Matrix Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-4 flex justify-between items-center">
              <div className="flex items-center gap-4 text-slate-400">
                <div className="p-1 bg-white rounded-lg shadow-sm border border-slate-100">
                  <Info size={14} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest italic">Consolidated Aggregate Verification</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Grand Aggregate</span>
                <span className="text-xl font-black text-slate-900 font-mono italic tracking-tighter">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white px-4 py-4 border-t border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Node Status</span>
              <div className="flex items-center gap-2 text-emerald-500 font-black text-[11px] uppercase italic">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Ready to Commit
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-black uppercase tracking-widest hover:border-slate-400 transition-all active:scale-95 shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !selectedAccount}
              className="px-10 py-3.5 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-100 flex items-center gap-4 disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? <RefreshCcw size={16} className="animate-spin" /> : <Check size={16} strokeWidth={4} />}
              Commit Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
