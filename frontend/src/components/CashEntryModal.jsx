import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Search, Calendar, Hash, Plus, Check, ArrowDownLeft, ArrowUpRight,
  RefreshCcw, Layout, Database, Info, Trash2, Save
} from 'lucide-react';
import api from '../api';
import { formatBilingualText } from '../utils/textUtils';

export default function CashEntryModal({ company, type = 'debit', editId = null, onSubmit, onClose }) {
  const { t } = useTranslation();
  const isCredit = type === 'credit';
  const titleKey = isCredit ? 'cashEntry.jama' : 'cashEntry.udhar';
  const title = t(titleKey);
  const subtitle = isCredit ? t('cashEntry.jamaSubtitle') : t('cashEntry.udharSubtitle');

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

  const guDigits = {
    '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
    '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯'
  };
  const toGujaratiDigits = (value) => String(value ?? '').replace(/[0-9]/g, (d) => guDigits[d] || d);
  const toEnglishDigits = (value) => String(value ?? '').replace(/[૦-૯]/g, (d) => '0123456789'['૦૧૨૩૪૫૬૭૪૯'.indexOf(d)] || d);

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
        api.get(`/accounts/company/${company.id}`),
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
      setError(t('cashEntry.errors.dependency'));
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
                description = m.member_name_gu || m.member_name;
              }
            } else {
              const narr = narrationsList.find(n => n.narration_text === description || n.narration_text_gu === description);
              if (narr) {
                description = narr.narration_text_gu || narr.narration_text;
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
            description: entry.member_name_gu || entry.member_name || entry.narration_text_gu || entry.narration_text || entry.description || '',
            amount: (parseFloat(entry.cash_in || 0) + parseFloat(entry.cash_out || 0)).toFixed(2),
            code: entry.member_code || entry.narration_code || '',
            member_id: entry.member_id || null
          }]);
        }
      }
    } catch (err) {
      console.error('Fetch edit entry error', err);
      setError(t('cashEntry.errors.loadEntry'));
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = (acc) => {
    setSelectedAccount(acc);
    setFormData(prev => ({ ...prev, account_id: acc.id }));
    setSearchCode(String(acc.account_code || acc.id));
    setSearchText(acc.account_name_gu || acc.account_name);
    setShowDropdown(false);
  };

  const filteredAccounts = accounts.filter(a => {
    const searchCodeEn = toEnglishDigits(searchCode);
    const accCodeEn = toEnglishDigits(String(a.account_code || a.id));
    const codeMatch = searchCode ? (accCodeEn.includes(searchCodeEn)) : true;
    
    const nameMatch = searchText ? (
      (a.account_name && a.account_name.toLowerCase().includes(searchText.toLowerCase())) || 
      (a.account_name_gu && a.account_name_gu.toLowerCase().includes(searchText.toLowerCase()))
    ) : true;
    return codeMatch && nameMatch;
  });

  const handleSave = async () => {
    if (!formData.account_id || parseFloat(formData.amount) <= 0) {
      setError(t('cashEntry.errors.validation'));
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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !loading && onClose()}></div>
      
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-4xl shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            {isCredit ? <ArrowUpRight size={16} className="text-emerald-700" /> : <ArrowDownLeft size={16} className="text-[#1d5f84]" />}
            <h2 className="text-sm font-extrabold tracking-tight text-slate-800 uppercase font-mono">
              {editId ? t('cashEntry.editTitle', { title }) : t('cashEntry.newTitle', { title })}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-md transition">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 bg-white">
          {error && (
            <div className="p-3 border border-red-200 bg-red-50 text-red-700 text-xs font-bold font-mono uppercase tracking-widest rounded-md">
              • {error}
            </div>
          )}

          {/* Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                {t('cashEntry.transactionDate')} *
              </label>
              <div className="relative flex items-center border border-slate-300 bg-white rounded-md px-3 h-10 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] transition-all">
                <Calendar className="text-slate-400 mr-2" size={14} />
                <input
                  type="date"
                  value={formData.transaction_date}
                  onChange={e => setFormData({ ...formData, transaction_date: e.target.value })}
                  className="bg-transparent text-xs font-mono font-bold text-slate-800 outline-none w-full"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                {t('cashEntry.reference')}
              </label>
              <div className="relative flex items-center border border-slate-300 bg-white rounded-md px-3 h-10 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] transition-all">
                <Hash className="text-slate-400 mr-2" size={14} />
                <input
                  type="text"
                  placeholder={t('cashEntry.autoPlaceholder')}
                  value={formData.reference_no}
                  onChange={e => setFormData({ ...formData, reference_no: e.target.value })}
                  className="bg-transparent text-xs font-mono font-bold text-slate-800 outline-none w-full placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="flex flex-col md:col-span-2 relative" ref={dropdownRef}>
              <label className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                {t('cashEntry.targetAccount')} *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="CODE"
                  value={searchCode}
                  onChange={e => { setSearchCode(e.target.value); setShowDropdown(true); }}
                  className="w-24 text-center border border-slate-300 bg-white rounded-md px-2 py-1.5 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] text-xs font-mono font-bold text-slate-800 outline-none h-10 uppercase transition-all"
                />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={t('cashEntry.searchAccountPlaceholder')}
                    value={searchText}
                    onChange={e => { setSearchText(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full border border-slate-300 bg-white rounded-md px-3 py-1.5 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] text-[13px] font-bold text-slate-800 outline-none h-10 placeholder:text-slate-300 transition-all"
                    style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}
                  />
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {filteredAccounts.length === 0 ? (
                        <div className="p-3 text-center text-[10px] font-bold font-mono text-slate-400 uppercase">
                          {t('cashEntry.noNodesIsolated')}
                        </div>
                      ) : filteredAccounts.map(acc => (
                        <div
                          key={acc.id}
                          onClick={() => handleAccountSelect(acc)}
                          className="p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center select-none transition-colors"
                        >
                          <div>
                            <span className="text-[13px] font-bold text-slate-800 leading-tight block">
                              {formatBilingualText(acc.account_name_gu || acc.account_name)}
                            </span>
                            <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest mt-0.5">
                              {acc.account_type || 'Ledger Node'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold font-mono text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 uppercase bg-slate-50">
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
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col min-h-[260px] shadow-sm">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-600 font-mono uppercase tracking-widest">{t('cashEntry.allocationMatrix')}</span>
              <button
                disabled={!selectedAccount}
                onClick={addNewRow}
                className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold px-2.5 py-1.5 select-none uppercase tracking-widest transition-colors disabled:opacity-50 disabled:hover:bg-white"
              >
                <Plus size={14} /> {t('cashEntry.addRow')}
              </button>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left font-sans text-[13px] select-none">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="w-24 px-4 py-3 border-r border-slate-200 text-center">{t('cashEntry.code')}</th>
                    <th className="px-4 py-3 border-r border-slate-200">
                      {selectedAccount?.is_subledger ? t('cashEntry.subledger') : t('cashEntry.description')}
                    </th>
                    <th className="w-40 px-4 py-3 border-r border-slate-200 text-right">
                      {t('cashEntry.amount')}
                    </th>
                    <th className="w-12 px-4 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subEntries.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-1.5 border-r border-slate-200 text-center">
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
                              description: matched ? (selectedAccount?.is_subledger ? (matched.member_name_gu || matched.member_name) : (matched.narration_text_gu || matched.narration_text)) : r.description,
                              member_id: matched && selectedAccount?.is_subledger ? matched.id : (matched ? null : r.member_id)
                            } : r);
                            setSubEntries(updated);
                          }}
                          placeholder={t('cashEntry.codePlaceholder')}
                          className="w-full bg-slate-50/50 border border-slate-200 rounded px-2 py-1.5 text-center text-[11px] font-mono font-bold text-slate-700 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none uppercase transition-all"
                        />
                      </td>
                      <td className="px-3 py-1.5 border-r border-slate-200 relative">
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
                          placeholder={selectedAccount?.is_subledger ? t('cashEntry.searchMemberPlaceholder') : t('cashEntry.enterDetailPlaceholder')}
                          className="w-full bg-transparent border border-transparent rounded px-2 py-1.5 text-[13px] font-bold text-slate-800 outline-none focus:bg-slate-50 focus:border-slate-200 placeholder:text-slate-300 transition-colors"
                          style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}
                        />

                        {showMemberDropdown && activeRowId === row.id && row.description.length > 0 && (
                          <div className="absolute top-full left-1 right-1 mt-1 bg-white border border-slate-200 rounded-md shadow-xl z-[100] max-h-48 overflow-y-auto divide-y divide-slate-100">
                            {(() => {
                              const list = (selectedAccount?.is_subledger ? members : narrationsList)
                                .filter(m => {
                                  const target = selectedAccount?.is_subledger ? (m.member_name_gu || m.member_name) : m.narration_text;
                                  const targetEng = selectedAccount?.is_subledger ? m.member_name : '';
                                  const code = selectedAccount?.is_subledger ? m.member_code : m.narration_code;
                                  return target.toLowerCase().includes(row.description.toLowerCase()) || 
                                         (targetEng && targetEng.toLowerCase().includes(row.description.toLowerCase())) ||
                                         (code && String(code).includes(row.description));
                                });
                              
                              if (list.length === 0) {
                                return (
                                  <div className="p-3 text-center text-[10px] font-bold font-mono text-slate-400 uppercase">
                                    {t('cashEntry.noNodesIsolated')}
                                  </div>
                                );
                              }

                              return list.map(m => (
                                <div
                                  key={m.id}
                                  onClick={() => {
                                    const updated = subEntries.map(r => r.id === row.id ? {
                                      ...r,
                                      description: selectedAccount?.is_subledger ? (m.member_name_gu || m.member_name) : (m.narration_text_gu || m.narration_text),
                                      code: selectedAccount?.is_subledger ? m.member_code : m.narration_code,
                                      member_id: selectedAccount?.is_subledger ? m.id : null
                                    } : r);
                                    setSubEntries(updated);
                                    setShowMemberDropdown(false);
                                    focusInput(row.id, 'amount');
                                  }}
                                  className="p-2.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center select-none transition-colors"
                                >
                                  <span className="text-[13px] font-bold text-slate-700 leading-tight" style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}>
                                    {selectedAccount?.is_subledger ? (m.member_name_gu || m.member_name) : (m.narration_text_gu || m.narration_text)}
                                  </span>
                                  <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50">
                                    #{selectedAccount?.is_subledger ? m.member_code : (m.narration_code || 'UNC')}
                                  </span>
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-1.5 border-r border-slate-200">
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
                          className="w-full bg-slate-50/50 border border-slate-200 rounded px-2 py-1.5 text-right text-[12px] font-mono font-bold text-slate-800 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition-all"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          onClick={() => {
                            if (subEntries.length > 1) {
                              setSubEntries(subEntries.filter(r => r.id !== row.id));
                            }
                          }}
                          className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-400 transition-colors shadow-sm"
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
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">{t('cashEntry.aggregate')}</span>
              <span className={`text-[15px] font-bold font-mono ${isCredit ? 'text-emerald-700' : 'text-[#1d5f84]'}`}>
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-md transition-colors uppercase text-[10px] tracking-wider"
          >
            {t('common.cancel') || 'CANCEL'}
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !selectedAccount}
            className="px-6 py-2.5 bg-[#1d5f84] hover:bg-[#154662] text-white font-bold rounded-md transition-colors uppercase flex items-center justify-center gap-2 text-[10px] tracking-wider disabled:opacity-50 disabled:hover:bg-[#1d5f84] shadow-sm"
          >
            {loading ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
            {editId ? t('common.update') || 'UPDATE' : t('common.save') || 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
}
