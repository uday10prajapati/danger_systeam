import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { formatBilingualText } from '../utils/textUtils';
import {
   X, Search, AlertCircle, Trash2, Edit3,
   Calendar, FileText, ArrowRightLeft, Plus,
   ChevronRight, Calculator, CheckCircle2,
   Database, Users, Save, Loader, ArrowLeftRight
} from 'lucide-react';

export default function JVEntryModal({ company, initialDate, editId = null, onClose, onSubmit }) {
   const { t, i18n } = useTranslation();
   const [voucherDate, setVoucherDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
   const [credits, setCredits] = useState([]);
   const [debits, setDebits] = useState([]);

   const [activeSubModal, setActiveSubModal] = useState(null);
   const [editIndex, setEditIndex] = useState(null);
   const [selected, setSelected] = useState(null);

   const [accounts, setAccounts] = useState([]);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      fetchAccounts();
   }, [company]);

   useEffect(() => {
      if (editId && company?.id) fetchJV();
   }, [editId, company?.id]);

   const fetchJV = async () => {
      try {
         setLoading(true);
         const res = await api.get(`/jv/${editId}`);
         if (res.data.success) {
            const { voucher_date, credits, debits } = res.data.data;
            setVoucherDate(voucher_date.split('T')[0]);
            setCredits(credits);
            setDebits(debits);
         }
      } catch (err) {
         console.error('Fetch JV error', err);
      } finally {
         setLoading(false);
      }
   };

   const fetchAccounts = async () => {
      try {
         const res = await api.get(`/accounts/company/${company?.id}`);
         if (res.data.success) {
            setAccounts(res.data.data);
         }
      } catch (err) { }
   };

   const handleSave = async () => {
      try {
         if (credits.length === 0 && debits.length === 0) return;
         setLoading(true);

         const payload = {
            voucher_date: voucherDate,
            credits,
            debits,
            voucher_type: 'CONTRA/JV'
         };

         if (editId) {
            await api.put(`/jv/${editId}`, payload);
         } else {
            await api.post(`/jv`, payload);
         }

         if (onSubmit) onSubmit();
      } catch (err) {
         alert('Failed to save JV: ' + (err.response?.data?.error || err.message));
      } finally {
         setLoading(false);
      }
   };

   const removeItem = (type, index) => {
      if (type === 'credit') {
         setCredits(prev => prev.filter((_, i) => i !== index));
      } else {
         setDebits(prev => prev.filter((_, i) => i !== index));
      }
      if (selected?.type === type && selected?.index === index) setSelected(null);
   };

   const totalCredit = credits.reduce((sum, item) => sum + parseFloat(item.amount), 0);
   const totalDebit = debits.reduce((sum, item) => sum + parseFloat(item.amount), 0);

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
         <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-none" onClick={() => !loading && onClose()}></div>
         
         <div className="bg-white border border-zinc-400 rounded-none w-full max-w-5xl shadow-lg relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] font-mono text-xs select-none">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <ArrowLeftRight size={16} className="text-blue-600" />
                  <h2 className={`text-sm font-bold tracking-tight text-zinc-800 ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'}`}>
                     {t('jvEntry.title')}
                  </h2>
               </div>
               <button onClick={onClose} className="p-1 text-zinc-400 hover:text-red-600 transition">
                  <X size={18} />
               </button>
            </div>

            {/* Global Settings Strip */}
            <div className="p-4 px-6 bg-zinc-50 flex items-center justify-between border-b border-zinc-200">
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                     <span className={`font-bold text-zinc-400 tracking-widest text-[9px] ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'}`}>{t('jvEntry.voucherDate')} :</span>
                     <input
                        type="date"
                        value={voucherDate}
                        onChange={e => setVoucherDate(e.target.value)}
                        className="bg-white border border-zinc-300 px-3 py-1.5 focus:border-zinc-500 outline-none transition font-bold text-zinc-800 text-xs h-9 force-en"
                     />
                  </div>
               </div>

               {totalCredit !== totalDebit && totalCredit > 0 && (
                  <div className="flex items-center gap-2 text-red-600 font-bold text-[9px] uppercase tracking-widest animate-pulse">
                     <AlertCircle size={14} /> {t('jvEntry.imbalance')}: ₹{(totalCredit - totalDebit).toFixed(2)}
                  </div>
               )}
               {totalCredit === totalDebit && totalCredit > 0 && (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-[9px] uppercase tracking-widest">
                     <CheckCircle2 size={14} /> {t('jvEntry.standardized')}
                  </div>
               )}
            </div>

            {/* Matrix Vector Processing */}
            <div className="flex flex-1 overflow-hidden h-[400px]">
               {/* Credit Vector (Jama) */}
               <div className="flex-1 flex flex-col border-r border-zinc-200">
                  <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex justify-between items-center">
                     <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        {t('jvEntry.creditSide')}
                     </span>
                     <button
                        onClick={() => { setEditIndex(null); setActiveSubModal('credit'); }}
                        className={`bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white px-3 py-1 text-[9px] font-bold transition ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'}`}
                     >
                        + {t('jvEntry.addCredit')}
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-white">
                     <table className="w-full">
                        <thead className="sticky top-0 bg-zinc-50 text-[9px] font-bold text-zinc-400 uppercase border-b border-zinc-100">
                           <tr>
                              <th className="px-4 py-2 text-left">{t('jvEntry.selectAccount')}</th>
                              <th className="px-4 py-2 text-right w-32">{t('rojmel.amount')}</th>
                              <th className="px-4 py-2 text-center w-10"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                           {credits.map((item, i) => (
                              <tr key={i} className="hover:bg-zinc-50 group transition-colors">
                                 <td className="px-4 py-2.5">
                                    <p className="font-bold text-zinc-800">{formatBilingualText(item.account_name)}</p>
                                    <p className="text-[9px] text-zinc-400 italic mt-0.5">{item.particulars || t('jvEntry.noNarrative') || 'No narrative'}</p>
                                 </td>
                                 <td className="px-4 py-2.5 text-right font-bold text-zinc-700 font-mono italic">
                                    ₹{parseFloat(item.amount).toFixed(2)}
                                 </td>
                                 <td className="px-2 py-2.5 text-center">
                                    <button onClick={() => removeItem('credit', i)} className="text-zinc-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">
                                       <Trash2 size={13} />
                                    </button>
                                 </td>
                              </tr>
                           ))}
                           {credits.length === 0 && (
                              <tr>
                                 <td colSpan="3" className="px-4 py-12 text-center text-zinc-300 uppercase tracking-widest text-[9px] italic">
                                    {t('jvEntry.noEntries')}
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>

                  <div className="p-3 px-5 bg-zinc-50 border-t border-zinc-200 flex justify-between items-center">
                     <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{t('jvEntry.creditTotal')}</span>
                     <span className="font-bold font-mono text-emerald-600 text-sm italic">₹{totalCredit.toFixed(2)}</span>
                  </div>
               </div>

               {/* Debit Vector (Udhar) */}
               <div className="flex-1 flex flex-col">
                  <div className="bg-blue-50 px-4 py-2.5 border-b border-blue-100 flex justify-between items-center">
                     <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        {t('jvEntry.debitSide')}
                     </span>
                     <button
                        onClick={() => { setEditIndex(null); setActiveSubModal('debit'); }}
                        className={`bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1 text-[9px] font-bold transition ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'}`}
                     >
                        + {t('jvEntry.addDebit')}
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-white">
                     <table className="w-full">
                        <thead className="sticky top-0 bg-zinc-50 text-[9px] font-bold text-zinc-400 uppercase border-b border-zinc-100">
                           <tr>
                              <th className="px-4 py-2 text-left">{t('jvEntry.selectAccount')}</th>
                              <th className="px-4 py-2 text-right w-32">{t('rojmel.amount')}</th>
                              <th className="px-4 py-2 text-center w-10"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                           {debits.map((item, i) => (
                              <tr key={i} className="hover:bg-zinc-50 group transition-colors">
                                 <td className="px-4 py-2.5">
                                    <p className="font-bold text-zinc-800">{formatBilingualText(item.account_name)}</p>
                                    <p className="text-[9px] text-zinc-400 italic mt-0.5">{item.particulars || t('jvEntry.noNarrative') || 'No narrative'}</p>
                                 </td>
                                 <td className="px-4 py-2.5 text-right font-bold text-zinc-700 font-mono italic">
                                    ₹{parseFloat(item.amount).toFixed(2)}
                                 </td>
                                 <td className="px-2 py-2.5 text-center">
                                    <button onClick={() => removeItem('debit', i)} className="text-zinc-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition">
                                       <Trash2 size={13} />
                                    </button>
                                 </td>
                              </tr>
                           ))}
                           {debits.length === 0 && (
                              <tr>
                                 <td colSpan="3" className="px-4 py-12 text-center text-zinc-300 uppercase tracking-widest text-[9px] italic">
                                    {t('jvEntry.noEntries')}
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>

                  <div className="p-3 px-5 bg-zinc-50 border-t border-zinc-200 flex justify-between items-center">
                     <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{t('jvEntry.debitTotal')}</span>
                     <span className="font-bold font-mono text-blue-600 text-sm italic">₹{totalDebit.toFixed(2)}</span>
                  </div>
               </div>
            </div>

            {/* Action Bar */}
            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-100 flex items-center justify-between shadow-inner">
               <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">
                  * {t('jvEntry.commitNote') || 'Fiscal Balances must be standardized (Credit = Debit) for Commit.'}
               </p>
               <div className="flex gap-3">
                  <button onClick={onClose} className={`px-5 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition rounded-none text-[10px] tracking-widest shadow-sm ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'}`}>
                     {t('common.cancel') || 'Cancel'}
                  </button>
                  <button 
                     onClick={handleSave} 
                     disabled={loading || totalCredit === 0 || totalCredit !== totalDebit}
                     className={`px-8 py-2 bg-blue-600 border border-blue-500 hover:bg-blue-700 disabled:grayscale disabled:opacity-50 text-white font-bold transition rounded-none flex items-center justify-center gap-2 text-[10px] tracking-widest shadow-sm ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'}`}
                  >
                     {loading ? <Loader className="animate-spin" size={14} /> : <><Save size={14} /> {t('jvEntry.commit')}</>}
                  </button>
               </div>
            </div>

            {/* Sub Shard Overlay */}
            {activeSubModal && (
               <SubEntryModal
                  type={activeSubModal}
                  date={voucherDate}
                  accounts={accounts}
                  company={company}
                  initialData={editIndex !== null ? (activeSubModal === 'credit' ? credits[editIndex] : debits[editIndex]) : null}
                  onClose={() => { setActiveSubModal(null); setEditIndex(null); }}
                  onAdd={(item) => {
                     if (activeSubModal === 'credit') {
                        if (editIndex !== null) {
                           const newC = [...credits];
                           newC[editIndex] = item;
                           setCredits(newC);
                        } else {
                           setCredits(prev => [...prev, item]);
                        }
                     } else {
                        if (editIndex !== null) {
                           const newD = [...debits];
                           newD[editIndex] = item;
                           setDebits(newD);
                        } else {
                           setDebits(prev => [...prev, item]);
                        }
                     }
                     setActiveSubModal(null);
                     setEditIndex(null);
                  }}
               />
            )}
         </div>
      </div>
   );
}

function SubEntryModal({ type, date, accounts, onClose, onAdd, initialData, company }) {
   const { t, i18n } = useTranslation();
   const isCredit = type === 'credit';
   const themeColor = isCredit ? 'emerald' : 'blue';
   
   const [accountId, setAccountId] = useState(initialData?.account_id || '');
   const [selectedAccount, setSelectedAccount] = useState(null);
   const [searchCode, setSearchCode] = useState(initialData?.account_id ? String(initialData.account_id) : '');
   const [searchText, setSearchText] = useState(initialData?.account_name || '');

   const [memberId, setMemberId] = useState(initialData?.member_id || '');
   const [memberName, setMemberName] = useState(initialData?.member_name || '');
   const [memberSearch, setMemberSearch] = useState(initialData?.member_name || '');
   const [members, setMembers] = useState([]);
   const [showMemberDropdown, setShowMemberDropdown] = useState(false);

   const [amount, setAmount] = useState(initialData?.amount || '');
   const [refNo, setRefNo] = useState(initialData?.reference_no || '');
   const [particulars, setParticulars] = useState(initialData?.particulars || '');

   const [showDropdown, setShowDropdown] = useState(false);
   const [selectedIndex, setSelectedIndex] = useState(0);

   // Traversal Refs
   const codeRef = useRef(null);
   const nameRef = useRef(null);
   const memberInputRef = useRef(null);
   const amountRef = useRef(null);
   const refNoRef = useRef(null);
   const partRef = useRef(null);

   const focusNext = (ref) => ref?.current?.focus();

   useEffect(() => {
      if (initialData?.account_id) {
         const acc = accounts.find(a => a.id === initialData.account_id);
         if (acc) setSelectedAccount(acc);
      }
      fetchMembers();
   }, []);

   const fetchMembers = async () => {
      try {
         const res = await api.get(`/members/company/${company?.id}`);
         if (res.data.success) setMembers(res.data.data);
      } catch (err) { }
   };

   const filteredAccounts = accounts.filter(a => {
      const codeMatch = searchCode ? (String(a.id).includes(searchCode) || (a.phone && String(a.phone).includes(searchCode))) : true;
      const nameMatch = searchText ? a.account_name.toLowerCase().includes(searchText.toLowerCase()) : true;
      return codeMatch && nameMatch;
   });

   const handleAccountSelect = (acc) => {
      setAccountId(acc.id);
      setSelectedAccount(acc);
      setSearchCode(String(acc.id));
      setSearchText(acc.account_name);
      setShowDropdown(false);
      // Auto focus next logic
      setTimeout(() => {
         if (acc.is_subledger === 1) focusNext(memberInputRef);
         else focusNext(amountRef);
      }, 50);
   };

   useEffect(() => {
      if (searchCode && !accountId) {
         const match = accounts.find(a => String(a.id) === searchCode || (a.phone && String(a.phone) === searchCode));
         if (match) handleAccountSelect(match);
      }
   }, [searchCode, accounts]);

   const handleSearchKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
         e.preventDefault();
         setSelectedIndex(prev => (prev < filteredAccounts.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
         e.preventDefault();
         setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
         if (showDropdown && filteredAccounts.length > 0) {
            e.preventDefault();
            handleAccountSelect(filteredAccounts[selectedIndex]);
         } else if (accountId) {
            if (selectedAccount?.is_subledger === 1) focusNext(memberInputRef);
            else focusNext(amountRef);
         }
      } else if (e.key === 'Escape') {
         setShowDropdown(false);
      }
   };

   const handleSubmit = () => {
      if (!accountId || !amount) return;
      onAdd({
         account_id: parseInt(accountId),
         account_name: searchText || 'Account Node',
         member_id: memberId || null,
         member_name: memberName || '',
         amount: parseFloat(amount),
         reference_no: refNo,
         particulars: particulars || (memberName ? `${searchText} - ${memberName}` : searchText) || ''
      });
   };

   const actionLabel = initialData ? t('jvEntry.modify') : t('jvEntry.new');
   const typeLabel = isCredit ? t('jvEntry.credit') : t('jvEntry.debit');

   return (
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-none z-[1200] flex items-center justify-center p-6 animate-in fade-in duration-300">
         <div className="bg-white border border-zinc-400 rounded-none w-full max-w-lg shadow-2xl overflow-hidden flex flex-col font-mono text-xs">
            
            <div className={`px-5 py-3.5 ${isCredit ? 'bg-emerald-50' : 'bg-blue-50'} border-b border-zinc-300 flex items-center justify-between`}>
               <div className="flex items-center gap-2">
                  <Database size={16} className={isCredit ? 'text-emerald-600' : 'text-blue-600'} />
                  <span className={`text-[10px] font-bold tracking-widest ${isCredit ? 'text-emerald-800' : 'text-blue-800'} ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'}`}>
                     {t('jvEntry.allocationTitle', { action: actionLabel, type: typeLabel })}
                  </span>
               </div>
               <button onClick={onClose} className="p-1 text-zinc-400 hover:text-red-600 transition">
                  <X size={18} />
               </button>
            </div>

            <div className="p-6 space-y-5 bg-zinc-50">
               {/* Account Picker */}
               <div className="relative space-y-1">
                  <label className={`text-[10px] font-bold text-zinc-500 tracking-widest ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'}`}>{t('jvEntry.selectAccount')} *</label>
                  <div className="flex gap-2">
                     <input
                        ref={codeRef}
                        type="text"
                        placeholder="CODE"
                        value={searchCode}
                        onChange={(e) => { setSearchCode(e.target.value); setShowDropdown(true); }}
                        onFocus={() => setShowDropdown(true)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-20 text-center border border-zinc-300 bg-white px-2 py-1.5 focus:border-zinc-600 outline-none transition font-bold text-zinc-800 uppercase h-9"
                     />
                     <div className="flex-1 relative">
                        <input
                           ref={nameRef}
                           type="text"
                           placeholder="SEARCH ACCOUNT NAME..."
                           value={searchText}
                           onChange={(e) => { setSearchText(e.target.value); setShowDropdown(true); }}
                           onFocus={() => setShowDropdown(true)}
                           onKeyDown={handleSearchKeyDown}
                           className={`w-full border border-zinc-300 bg-white px-3 py-1.5 focus:border-zinc-600 outline-none transition font-bold text-zinc-800 h-9 ${i18n.language === 'gu' ? '' : 'uppercase'}`}
                           style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}
                        />
                        {showDropdown && (
                           <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-300 shadow-2xl z-[1300] max-h-48 overflow-y-auto divide-y divide-zinc-100">
                              {filteredAccounts.map((acc, idx) => (
                                 <div
                                    key={acc.id}
                                    onClick={() => handleAccountSelect(acc)}
                                    className={`px-4 py-2.5 flex justify-between items-center cursor-pointer transition-colors ${selectedIndex === idx ? `bg-blue-600 text-white` : 'hover:bg-zinc-50 text-zinc-800'}`}
                                 >
                                    <span className="text-[11px] font-bold" style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}>{acc.account_name_gu || acc.account_name}</span>
                                    <span className={`text-[9px] font-bold ${selectedIndex === idx ? 'text-blue-100' : 'text-zinc-400'}`}>#{acc.id}</span>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               {/* Subledger Node */}
               {selectedAccount?.is_subledger === 1 && (
                  <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                     <label className={`text-[10px] font-bold text-zinc-500 tracking-widest flex items-center gap-2 ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'}`}>
                        <Users size={12} className="text-blue-600" /> {t('jvEntry.memberNode')} *
                     </label>
                     <div className="relative">
                        <input
                           ref={memberInputRef}
                           type="text"
                           placeholder="SEARCH SABHASAD / MEMBER..."
                           value={memberSearch}
                           onChange={(e) => { setMemberSearch(e.target.value); setShowMemberDropdown(true); }}
                           onFocus={() => setShowMemberDropdown(true)}
                           onKeyDown={e => e.key === 'Enter' && focusNext(amountRef)}
                           className={`w-full border border-zinc-300 bg-white px-3 py-1.5 focus:border-zinc-600 outline-none transition font-bold text-zinc-800 h-9 ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'}`}
                           style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}
                        />
                        {showMemberDropdown && memberSearch.length > 0 && (
                           <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-300 shadow-2xl z-[1300] max-h-40 overflow-y-auto divide-y divide-zinc-100">
                              {members.filter(m => m.member_name.toLowerCase().includes(memberSearch.toLowerCase())).map(m => (
                                 <div
                                    key={m.id}
                                    onClick={() => {
                                       setMemberId(m.id);
                                       setMemberName(m.member_name);
                                       setMemberSearch(m.member_name);
                                       setShowMemberDropdown(false);
                                       focusNext(amountRef);
                                    }}
                                    className="px-4 py-2 hover:bg-zinc-50 cursor-pointer flex justify-between items-center group transition-colors"
                                 >
                                    <span className="text-[10px] font-bold text-zinc-700 tracking-tight" style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}>{m.member_name_gu || m.member_name}</span>
                                    <span className="text-[9px] font-bold text-zinc-400 font-mono">#{m.member_code}</span>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  </div>
               )}

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className={`text-[10px] font-bold text-zinc-500 tracking-widest ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'}`}>{t('jvEntry.financialValue')} *</label>
                     <input
                        ref={amountRef}
                        type="number"
                        placeholder="0.00"
                        onKeyDown={e => e.key === 'Enter' && focusNext(refNoRef)}
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full border border-zinc-300 bg-white px-3 py-1.5 focus:border-zinc-600 outline-none transition font-bold text-blue-600 text-lg font-mono tracking-tighter h-11"
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('jvEntry.refNode')}</label>
                     <input
                        ref={refNoRef}
                        type="text"
                        placeholder="OPTIONAL"
                        onKeyDown={e => e.key === 'Enter' && focusNext(partRef)}
                        value={refNo}
                        onChange={e => setRefNo(e.target.value)}
                        className="w-full border border-zinc-300 bg-white px-3 py-1.5 focus:border-zinc-600 outline-none transition font-bold text-zinc-800 text-xs h-11 uppercase"
                     />
                  </div>
               </div>

               <div className="space-y-1">
                  <label className={`text-[10px] font-bold text-zinc-500 tracking-widest ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'}`}>{t('jvEntry.narrative')}</label>
                  <textarea
                     ref={partRef}
                     placeholder={t('common.autoGeneratedPlaceholder')}
                     value={particulars}
                     onChange={e => setParticulars(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                     className={`w-full border border-zinc-300 bg-white px-3 py-2 focus:border-zinc-600 outline-none transition font-bold text-zinc-600 text-[10px] h-16 resize-none italic ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'}`}
                  />
               </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-100 flex items-center justify-end gap-3 shadow-inner">
               <button onClick={onClose} className={`px-5 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition rounded-none text-[10px] tracking-widest ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'}`}>
                  {t('common.cancel') || 'Cancel'}
               </button>
               <button 
                  onClick={handleSubmit} 
                  disabled={!accountId || !amount || (selectedAccount?.is_subledger === 1 && !memberId)}
                  className={`px-8 py-2 ${isCredit ? 'bg-emerald-600 border-emerald-500 hover:bg-emerald-700' : 'bg-blue-600 border-blue-500 hover:bg-blue-700'} text-white font-bold transition rounded-none text-[10px] tracking-widest shadow-sm disabled:grayscale disabled:opacity-50 ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'}`}
               >
                  {initialData ? t('jvEntry.applyModification') : t('jvEntry.initializeNode')}
               </button>
            </div>
         </div>
      </div>
   );
}
