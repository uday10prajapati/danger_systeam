import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Search, Calendar, Hash, Calculator, Plus, Printer, Check, ArrowDownLeft, ArrowUpRight, Users } from 'lucide-react';

export default function CashEntryModal({ company, type = 'debit', editId = null, onSubmit, onClose }) {
  const isCredit = type === 'credit';
  const title = isCredit ? 'Credit Entry (Cash In)' : 'Debit Entry (Cash Out)';
  const themeColor = isCredit ? 'emerald' : 'blue';

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [members, setMembers] = useState([]);
  const [narrationsList, setNarrationsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subEntries, setSubEntries] = useState([{ id: Date.now(), description: '', amount: '' }]);

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
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Subledger Search States
  const [memberSearchText, setMemberSearchText] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [activeRowId, setActiveRowId] = useState(null);

  const dropdownRef = useRef(null);
  const memberDropdownRef = useRef(null);

  useEffect(() => {
    fetchAccounts();
    if (company) {
      fetchMembers();
      fetchNarrations();
    }
  }, [company]);

  useEffect(() => {
    if (editId && company?.id) {
      console.log('Fetching editId:', editId);
      fetchEditEntry();
    }
  }, [editId, company?.id]);

  const fetchEditEntry = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`/api/cash-book/${editId}`, {
        headers: { 'x-company-id': company.id }
      });
      if (res.data.success) {
        const entry = res.data.data;
        console.log('Entry retrieved:', entry);

        setFormData({
          transaction_date: entry.transaction_date ? entry.transaction_date.split('T')[0] : new Date().toISOString().split('T')[0],
          account_id: entry.account_id || '',
          amount: (parseFloat(entry.cash_in || 0) + parseFloat(entry.cash_out || 0)).toFixed(2),
          reference_no: entry.reference_no || '',
          description: entry.description || ''
        });

        // Parse notes back to subEntries
        if (entry.notes) {
          const rows = entry.notes.split('; ').filter(p => p.includes(': ')).map(pair => {
            const [desc, amt] = pair.split(': ');
            return { id: Date.now() + Math.random(), description: desc, amount: amt || '' };
          });
          if (rows.length > 0) setSubEntries(rows);
        }

        // Force find account object with type-safety
        const entryAccountId = entry.account_id;
        const entryMemberId = entry.member_id;
        const lookupId = entryAccountId ? String(entryAccountId) : (entryMemberId ? `M${entryMemberId}` : null);

        if (lookupId) {
          let currentAccs = accounts;
          if (currentAccs.length === 0) {
            const accRes = await axios.get(`/api/accounts/company/${company.id}`, { headers: { 'x-company-id': company.id } });
            currentAccs = accRes.data.data;
            setAccounts(currentAccs);
          }

          const found = currentAccs.find(a => String(a.id) === lookupId);
          if (found) {
            console.log('Found matching entity during hydration:', found.account_name);
            setSelectedAccount(found);
            setSearchCode(String(found.account_code || found.id));
            setSearchText(found.account_name);
            setFormData(prev => ({ ...prev, account_id: found.id }));
          }
        }
      }
    } catch (err) {
      console.error('Fetch edit entry error', err);
      setError('Failed to load transaction data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNarrations = async () => {
    try {
      const res = await axios.get(`/api/narrations`, {
        headers: { 'x-company-id': company.id }
      });
      setNarrationsList(res.data.success ? res.data.data : []);
    } catch (err) {
      console.error('Fetch narrations error', err);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await axios.get(`/api/members/company/${company.id}`, {
        headers: { 'x-company-id': company.id, 'x-financial-year': '2026-27' }
      });
      setMembers(res.data.success ? res.data.data : []);
    } catch (err) {
      console.error('Fetch members error', err);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await axios.get(`/api/accounts/company/${company.id}`, {
        headers: { 'x-company-id': company.id }
      });
      setAccounts(res.data.success ? res.data.data : []);
    } catch (err) {
      console.error('Fetch accounts error', err);
    }
  };

  const handleAccountSelect = (acc) => {
    setSelectedAccount(acc);
    setFormData(prev => ({ ...prev, account_id: acc.id }));
    setSearchCode(String(acc.account_code || acc.id));
    setSearchText(acc.account_name);
    setShowDropdown(false);
  };

  const handleMemberSelect = (member) => {
    setFormData(prev => ({
      ...prev,
      description: `${member.member_code} - ${member.member_name}`
    }));
    setMemberSearchText(`${member.member_code} - ${member.member_name}`);
    setShowMemberDropdown(false);
  };

  const filteredMembers = members.filter(m =>
    m.member_name.toLowerCase().includes(memberSearchText.toLowerCase()) ||
    m.member_code.toString().includes(memberSearchText)
  );

  const filteredAccounts = accounts.filter(a => {
    // Only show standard accounts (NOT members) in the top main account search
    if (a.account_type === 'member') return false;

    const codeMatch = searchCode ? (String(a.account_code || a.id).includes(searchCode)) : true;
    const nameMatch = searchText ? a.account_name.toLowerCase().includes(searchText.toLowerCase()) : true;
    return codeMatch && nameMatch;
  });

  const handleSave = async () => {
    if (!formData.account_id || parseFloat(formData.amount) <= 0) {
      setError('Select account and enter a valid amount.');
      return;
    }
    setLoading(true);
    try {
      const idStr = String(formData.account_id);
      const isMember = idStr.startsWith('M');
      const finalAccountId = isMember ? null : parseInt(idStr);
      const finalMemberId = isMember ? parseInt(idStr.substring(1)) : null;

      let extractedMemberId = finalMemberId;
      if (selectedAccount?.is_subledger && subEntries.length > 0) {
        extractedMemberId = subEntries[0].member_id || parseInt(subEntries[0].code) || null;
      }

      const payload = {
        transaction_date: formData.transaction_date,
        account_id: finalAccountId,
        member_id: extractedMemberId,
        description: formData.description || `Cash ${isCredit ? 'In' : 'Out'} - ${searchText}`,
        cash_in: isCredit ? parseFloat(formData.amount) : 0,
        cash_out: isCredit ? 0 : parseFloat(formData.amount),
        notes: subEntries.filter(r => r.description).map(r => `${r.description}: ${r.amount}`).join('; ')
      };

      const ledgerDesc = subEntries
        .filter(r => r.description)
        .map(r => r.description)
        .join('; ') || formData.description || 'Cash Transaction';

      if (editId) {
        await axios.patch(`/api/cash-book/${editId}`, payload, {
          headers: { 'x-company-id': company.id }
        });
      } else {
        const res = await axios.post(`/api/cash-book/manual`, payload, {
          headers: { 'x-company-id': company.id, 'x-user-id': 1 }
        });
      }
      onSubmit();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col border border-slate-300 overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header - Fixed to 9vh */}
        <div className={`h-[9vh] bg-slate-700 text-white px-6 flex justify-between items-center border-b border-white/10 shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded bg-white/10`}>
              {isCredit ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
            </div>
            <h2 className="font-bold uppercase tracking-wide text-sm">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-rose-500 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 bg-slate-200/50 flex-1 space-y-4 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-50 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Loading Node Data...</span>
              </div>
            </div>
          )}
          {error && <div className="bg-rose-100 border border-rose-200 text-rose-700 px-4 py-2 rounded text-xs font-bold">{error}</div>}

          {/* Top Form Fields */}
          <div className="space-y-2">
            {/* Date Row */}
            <div className="flex items-center gap-4">
              <label className="w-24 text-xs font-bold text-slate-700">Date:</label>
              <input
                type="date"
                value={formData.transaction_date}
                onChange={e => setFormData({ ...formData, transaction_date: e.target.value })}
                className="w-40 px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
              />
            </div>

            {/* Account Row */}
            <div className="flex items-center gap-4 relative">
              <label className="w-24 text-xs font-bold text-slate-700">Account:</label>
              <div className="flex-1 flex gap-2" ref={dropdownRef}>
                <input
                  type="text"
                  placeholder="Code"
                  value={searchCode}
                  onChange={e => { setSearchCode(e.target.value); setShowDropdown(true); }}
                  className="w-20 px-3 py-1.5 border border-slate-300 rounded text-sm font-mono text-center outline-none focus:border-blue-500 bg-white"
                />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search Account Name..."
                    value={searchText}
                    onChange={e => { setSearchText(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm font-bold bg-white outline-none focus:border-blue-500"
                  />
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 shadow-xl z-50 max-h-48 overflow-y-auto rounded shadow-blue-900/10">
                      {filteredAccounts.map(acc => (
                        <div
                          key={acc.id}
                          onClick={() => handleAccountSelect(acc)}
                          className="px-4 py-2 hover:bg-slate-100 cursor-pointer flex justify-between border-b border-slate-100 last:border-0"
                        >
                          <span className="text-xs font-bold">{acc.account_name}</span>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">#{acc.account_code || acc.id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Balance & Receipt Row */}
            <div className="flex items-center gap-4">
              <div className="w-24 shrink-0">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-tighter">Balance:</label>
              </div>
              <div className="flex-1 flex gap-4">
                <div className="w-40 px-3 py-1.5 border border-slate-200 rounded text-sm font-black text-slate-500 bg-slate-50 flex items-center h-[30px]">
                  {selectedAccount ? `₹${selectedAccount.closing_balance.toLocaleString('en-IN')}` : '₹0.00'}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-700 ml-4">Receipt No:</label>
                  <input
                    type="text"
                    value={formData.reference_no}
                    onChange={e => setFormData({ ...formData, reference_no: e.target.value })}
                    className="w-32 px-3 py-1.5 border border-slate-300 rounded text-sm uppercase outline-none focus:border-blue-500 font-mono font-bold"
                  />
                  <span className="text-[10px] font-bold text-blue-500 italic ml-2">Vector ID: 0Y</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className={`bg-white border-2 border-slate-300 rounded overflow-hidden flex flex-col transition-all duration-500 ${!selectedAccount ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
            <div className="bg-slate-500 text-white px-4 py-1.5 text-[10px] font-bold flex justify-between items-center border-b border-slate-300 shrink-0">
              <div className="flex items-center gap-2">
                <span>PETA RAKAM DETAILS (Sub-Amounts)</span>
                {!selectedAccount && <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded italic">Select account to unlock...</span>}
              </div>
              <button
                disabled={!selectedAccount}
                onClick={() => setSubEntries([...subEntries, { id: Date.now(), description: '', amount: '', code: '' }])}
                className="hover:text-emerald-300 disabled:opacity-30 transition-all font-black"
              >
                + ADD ROW
              </button>
            </div>
            <div className="max-h-[250px] overflow-y-auto scroller-cash">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                  <tr className="text-[10px] font-black uppercase text-slate-500 border-b border-slate-300">
                    <th className="w-20 border-r border-slate-300 py-1.5 text-center px-2">Code</th>
                    <th className="px-4 border-r border-slate-300 text-left">
                      {selectedAccount?.is_subledger ? 'Sabhasad (Member) Selection' : 'Narration / Description'}
                    </th>
                    <th className="w-40 text-right px-4">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {subEntries.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="w-20 border-r border-slate-200 text-center">
                        <input
                          type="text"
                          disabled={!selectedAccount}
                          value={row.code || ''}
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
                              member_id: matched && selectedAccount?.is_subledger ? matched.id : r.member_id
                            } : r);
                            setSubEntries(updated);
                          }}
                          placeholder="CODE"
                          className="w-full px-2 py-1.5 text-center text-xs font-mono font-bold outline-none bg-yellow-50/30 disabled:bg-slate-100"
                        />
                      </td>
                      <td className="border-r border-slate-200 relative">
                        <input
                          type="text"
                          disabled={!selectedAccount}
                          value={row.description || ''}
                          onFocus={() => { setActiveRowId(row.id); setShowMemberDropdown(true); }}
                          onChange={e => {
                            const desc = e.target.value;
                            let matched = null;
                            if (selectedAccount?.is_subledger) {
                              matched = members.find(m => m.member_name.toLowerCase() === desc.toLowerCase());
                            } else {
                              matched = narrationsList.find(n => n.narration_text.toLowerCase() === desc.toLowerCase());
                            }

                            const updated = subEntries.map(r => r.id === row.id ? {
                              ...r,
                              description: desc,
                              code: matched ? (selectedAccount?.is_subledger ? matched.member_code : matched.narration_code) : r.code,
                              member_id: matched && selectedAccount?.is_subledger ? matched.id : r.member_id
                            } : r);
                            setSubEntries(updated);
                            setActiveRowId(row.id);
                            setShowMemberDropdown(true);
                          }}
                          placeholder={selectedAccount?.is_subledger ? "Search Sabhasad..." : (selectedAccount ? "Search Narration..." : "LOCKED")}
                          className="w-full px-4 py-1.5 text-xs outline-none bg-transparent font-bold disabled:cursor-not-allowed"
                        />
                        {showMemberDropdown && activeRowId === row.id && row.description.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-2xl z-[100] max-h-48 overflow-y-auto rounded-lg divide-y divide-slate-50">
                            {selectedAccount?.is_subledger ? (
                              members.filter(m => m.member_name.toLowerCase().includes(row.description.toLowerCase()) || m.member_code.toString().includes(row.description)).map(m => (
                                <div
                                  key={m.id}
                                  onClick={() => {
                                    const updated = subEntries.map(r => r.id === row.id ? { ...r, description: m.member_name, code: m.member_code, member_id: m.id } : r);
                                    setSubEntries(updated);
                                    setShowMemberDropdown(false);
                                    setActiveRowId(null);
                                  }}
                                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center group transition-colors"
                                >
                                  <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-600">{m.member_name}</span>
                                  <span className="text-[9px] font-black bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">#{m.member_code}</span>
                                </div>
                              ))
                            ) : (
                              narrationsList.filter(n => n.narration_text.toLowerCase().includes(row.description.toLowerCase()) || (n.narration_code && n.narration_code.toLowerCase().includes(row.description.toLowerCase()))).map(n => (
                                <div
                                  key={n.id}
                                  onClick={() => {
                                    const updated = subEntries.map(r => r.id === row.id ? { ...r, description: n.narration_text, code: n.narration_code } : r);
                                    setSubEntries(updated);
                                    setShowMemberDropdown(false);
                                    setActiveRowId(null);
                                  }}
                                  className="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex justify-between items-center group transition-colors"
                                >
                                  <span className="text-[11px] font-bold text-slate-700 group-hover:text-indigo-600 italic">"{n.narration_text}"</span>
                                  <span className="text-[9px] font-black bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-400 font-mono">{n.narration_code || 'UNC'}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          disabled={!selectedAccount}
                          value={row.amount}
                          onChange={e => {
                            const updated = subEntries.map(r => r.id === row.id ? { ...r, amount: e.target.value } : r);
                            setSubEntries(updated);
                            const total = updated.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
                            setFormData({ ...formData, amount: total.toFixed(2) });
                          }}
                          className="w-full px-4 py-1.5 text-xs text-right font-bold outline-none bg-transparent disabled:bg-slate-50"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 border-t-2 border-slate-300 px-4 py-2 flex justify-end gap-10 items-center font-bold shrink-0">
              <span className="text-xs uppercase text-slate-500">Total Calculation:</span>
              <span className="text-sm">₹{parseFloat(formData.amount).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/50 p-3 rounded border border-slate-200">
            <label className="text-[10px] font-bold text-slate-500">Narrative:</label>
            <input
              type="text"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Transaction note summary..."
              className="flex-1 bg-transparent border-none outline-none text-xs italic text-slate-600"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 p-4 px-6 flex justify-between items-center border-t border-slate-300">
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-500">Ctrl+S: Commit</div>
            <div className="px-3 py-1 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-500">Esc: Cancel</div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="min-w-[100px] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold text-xs transition-shadow shadow-md active:scale-95"
            >
              <Check size={16} /> OK
            </button>
            <button
              onClick={onClose}
              className="min-w-[100px] flex items-center justify-center gap-2 bg-slate-500 hover:bg-slate-600 text-white px-6 py-2 rounded font-bold text-xs shadow-md active:scale-95"
            >
              CANCEL
            </button>
            <button className="flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded font-bold text-xs shadow-md active:scale-95">
              <Printer size={16} /> PRINT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
