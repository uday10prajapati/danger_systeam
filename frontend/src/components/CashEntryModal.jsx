import React, { useState, useEffect, useRef } from 'react';
import {
  X, Search, Calendar, Hash, Plus, Check, ArrowDownLeft, ArrowUpRight,
  RefreshCcw, Layout, Database, Info, Trash2, Save
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

  // Handle Enter key for non-interactive areas if needed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      if (!lastRow.code && !lastRow.description && !lastRow.amount) {
        setTimeout(() => focusInput(lastRow.id, 'code'), 50);
      }
    }
  }, [subEntries.length]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const narrationType = isCredit ? 'Credit' : 'Debit';
      const [accRes, memRes, narrRes] = await Promise.all([
        api.get(`/accounts?type=ledger`),
        api.get('/members'),
        api.get(`/narrations?type=${narrationType}`)
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
        member_id: batchEntries[0]?.member_id || null,
        cash_in: batchEntries.reduce((s, e) => s + (e.cash_in || 0), 0),
        cash_out: batchEntries.reduce((s, e) => s + (e.cash_out || 0), 0),
        description: formData.description || (isCredit ? 'Cash Receipt' : 'Cash Payment'),
        notes: batchEntries[0]?.notes || '',
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-none" onClick={() => !loading && onClose()}></div>
      
      <div className="bg-white border border-zinc-400 rounded-none w-full max-w-4xl shadow-lg relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            {isCredit ? <ArrowUpRight size={16} className="text-emerald-700" /> : <ArrowDownLeft size={16} className="text-red-700" />}
            <h2 className="text-sm font-bold tracking-tight text-zinc-800 uppercase font-mono">
              {editId ? `EDIT ${title} RECORD` : `NEW ${title} RECORD`}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-red-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-zinc-50">
          {error && (
            <div className="p-2 border border-red-300 bg-red-50 text-red-700 text-[10px] font-bold font-mono uppercase tracking-widest leading-normal">
              • {error}
            </div>
          )}

          {/* Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white border border-zinc-300 p-3">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest mb-1">
                Transaction Date *
              </label>
              <div className="relative flex items-center border border-zinc-300 bg-white px-2.5 h-9 focus-within:border-zinc-500">
                <Calendar className="text-zinc-400 mr-2" size={14} />
                <input
                  type="date"
                  value={formData.transaction_date}
                  onChange={e => setFormData({ ...formData, transaction_date: e.target.value })}
                  className="bg-transparent text-xs font-mono font-bold text-zinc-700 outline-none w-full"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest mb-1">
                Reference / Voucher #
              </label>
              <div className="relative flex items-center border border-zinc-300 bg-white px-2.5 h-9 focus-within:border-zinc-500">
                <Hash className="text-zinc-400 mr-2" size={14} />
                <input
                  type="text"
                  placeholder="AUTO"
                  value={formData.reference_no}
                  onChange={e => setFormData({ ...formData, reference_no: e.target.value })}
                  className="bg-transparent text-xs font-mono font-bold text-zinc-700 outline-none w-full placeholder:text-zinc-300"
                />
              </div>
            </div>

            <div className="flex flex-col md:col-span-2 relative" ref={dropdownRef}>
              <label className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-widest mb-1">
                Target Account Node *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="CODE"
                  value={searchCode}
                  onChange={e => { setSearchCode(e.target.value); setShowDropdown(true); }}
                  className="w-20 text-center border border-zinc-300 bg-white px-2 py-1.5 focus:border-zinc-500 text-xs font-mono font-bold text-zinc-700 outline-none h-9 uppercase"
                />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="SEARCH ACCOUNT NAME..."
                    value={searchText}
                    onChange={e => { setSearchText(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full border border-zinc-300 bg-white px-2.5 py-1.5 focus:border-zinc-500 text-xs font-mono font-bold text-zinc-700 outline-none h-9 placeholder:text-zinc-300 uppercase"
                  />
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-300 shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-zinc-200">
                      {filteredAccounts.length === 0 ? (
                        <div className="p-2 text-center text-[10px] font-bold font-mono text-zinc-400 uppercase">
                          No Nodes Isolated
                        </div>
                      ) : filteredAccounts.map(acc => (
                        <div
                          key={acc.id}
                          onClick={() => handleAccountSelect(acc)}
                          className="p-2 hover:bg-zinc-50 cursor-pointer flex justify-between items-center select-none"
                        >
                          <div>
                            <span className="text-xs font-bold text-zinc-800 uppercase tracking-tight leading-tight block">
                              {acc.account_name}
                            </span>
                            <span className="text-[9px] font-bold font-mono text-zinc-400 uppercase tracking-widest mt-0.5">
                              {acc.account_type || 'Ledger Node'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold font-mono text-zinc-400 border border-zinc-200 px-1.5 py-0.5 uppercase bg-zinc-50">
                            #{acc.account_code || acc.id}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Matrix Ledger Subentries */}
          <div className="bg-white border border-zinc-300 overflow-hidden flex flex-col min-h-[260px]">
            <div className="bg-zinc-100 px-3 py-2 border-b border-zinc-300 flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-700 font-mono uppercase tracking-widest">Entry Allocation Matrix</span>
              <button
                disabled={!selectedAccount}
                onClick={addNewRow}
                className="flex items-center gap-1 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-[10px] font-bold px-2 py-1 select-none uppercase tracking-widest shadow-sm disabled:opacity-30 disabled:hover:bg-white"
              >
                <Plus size={12} /> Add Row
              </button>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left font-sans text-xs select-none">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    <th className="w-24 px-3 py-2 border-r border-zinc-200 text-center">Code</th>
                    <th className="px-3 py-2 border-r border-zinc-200">
                      {selectedAccount?.is_subledger ? 'Subledger (Member)' : 'Narration / Description'}
                    </th>
                    <th className="w-40 px-3 py-2 border-r border-zinc-200 text-right">
                      {isCredit ? 'Jama' : 'Udhar'} Amount
                    </th>
                    <th className="w-12 px-3 py-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {subEntries.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-3 py-1 border-r border-zinc-200 text-center">
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
                          className="w-full bg-white border border-zinc-300 py-1 px-2 text-center text-xs font-mono font-bold text-zinc-700 focus:border-zinc-500 outline-none uppercase"
                        />
                      </td>
                      <td className="px-3 py-1 border-r border-zinc-200 relative">
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
                          placeholder={selectedAccount?.is_subledger ? "SEARCH MEMBER..." : "ENTER DETAIL..."}
                          className="w-full bg-transparent border-none py-1 px-1 text-xs font-bold text-zinc-800 outline-none placeholder:text-zinc-300 uppercase"
                        />

                        {showMemberDropdown && activeRowId === row.id && row.description.length > 0 && (
                          <div className="absolute top-full left-1 right-1 mt-0.5 bg-white border border-zinc-300 shadow-2xl z-[100] max-h-40 overflow-y-auto divide-y divide-zinc-200">
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
                                  className="p-2 hover:bg-zinc-50 cursor-pointer flex justify-between items-center select-none"
                                >
                                  <span className="text-xs font-bold text-zinc-700 uppercase leading-tight">
                                    {selectedAccount?.is_subledger ? m.member_name : m.narration_text}
                                  </span>
                                  <span className="text-[9px] font-bold font-mono text-zinc-400 uppercase tracking-widest border border-zinc-200 px-1.5 py-0.5 bg-zinc-50">
                                    #{selectedAccount?.is_subledger ? m.member_code : (m.narration_code || 'UNC')}
                                  </span>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-1 border-r border-zinc-200">
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
                          className="w-full bg-white border border-zinc-300 py-1 px-2 text-right text-xs font-mono font-bold text-zinc-700 focus:border-zinc-500 outline-none"
                        />
                      </td>
                      <td className="px-3 py-1 text-center">
                        <button
                          onClick={() => {
                            if (subEntries.length > 1) {
                              setSubEntries(subEntries.filter(r => r.id !== row.id));
                            }
                          }}
                          className="p-1 border border-zinc-300 bg-white hover:bg-zinc-50 hover:text-red-600 text-zinc-500 transition shadow-sm"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Matrix Footer */}
            <div className="bg-zinc-100 border-t border-zinc-300 px-3 py-2 flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Aggregate Verified</span>
              <span className="text-sm font-bold font-mono text-zinc-800">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-3 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition rounded-none uppercase text-xs tracking-tight"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !selectedAccount}
            className="px-5 py-2 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold transition rounded-none uppercase flex items-center justify-center gap-2 text-xs tracking-tight disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            {loading ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
            {editId ? 'UPDATE' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
}
