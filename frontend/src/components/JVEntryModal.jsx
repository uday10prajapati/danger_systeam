import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, Search, AlertCircle, Trash2, Edit3, 
  Calendar, FileText, ArrowRightLeft, Plus, 
  ChevronRight, Calculator, CheckCircle2,
  Database
} from 'lucide-react';

export default function JVEntryModal({ company, initialDate, editId = null, onClose, onSubmit }) {
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
         const res = await axios.get(`/api/jv/${editId}`, {
            headers: { 'x-company-id': company?.id }
         });
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
         const res = await axios.get(`/api/accounts/company/${company?.id}`, {
            headers: { 'x-company-id': company?.id }
         });
         if (res.data.success) {
            setAccounts(res.data.data);
         }
      } catch (err) { }
   };

   const handleSave = async () => {
      try {
         if (credits.length === 0 && debits.length === 0) return;

         const payload = {
            voucher_date: voucherDate,
            credits,
            debits,
            voucher_type: 'CONTRA/JV'
         };

         await axios.post(`/api/jv`, payload, {
            headers: { 'x-company-id': company.id, 'x-user-id': 1 }
         });

         if (onSubmit) onSubmit();
      } catch (err) {
         alert('Failed to save JV: ' + (err.response?.data?.error || err.message));
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

   const displayCredits = [...credits];
   const displayDebits = [...debits];
   while (displayCredits.length < 5) displayCredits.push(null);
   while (displayDebits.length < 5) displayDebits.push(null);

   return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 font-sans animate-in fade-in duration-300">

         <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl flex flex-col border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-500 relative">

            {/* Light Header Shard */}
            <div className="bg-slate-50 p-5 px-8 flex justify-between items-center border-b border-slate-100">
               <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-600">
                     <ArrowRightLeft size={22} strokeWidth={3} />
                  </div>
                  <div>
                     <h2 className="text-base font-bold text-slate-800 tracking-tight italic uppercase">Contra / J.V. Entry</h2>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 italic">Inter-Account Logic Shard</p>
                  </div>
               </div>
               <button onClick={onClose} className="hover:bg-red-50 text-slate-400 hover:text-red-600 p-2.5 rounded-xl transition-all active:scale-95">
                  <X size={20} strokeWidth={3} />
               </button>
            </div>

            {/* Global Metadata Strip */}
            <div className="p-4 px-8 bg-white flex items-center justify-between border-b border-slate-50">
               <div className="flex items-center gap-4 bg-[#F8FAFC] p-2 px-5 rounded-2xl border border-slate-50">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Node Date :</span>
                  <input
                     type="date"
                     value={voucherDate}
                     onChange={e => setVoucherDate(e.target.value)}
                     className="bg-transparent border-none outline-none font-bold text-slate-700 text-xs italic"
                  />
               </div>
               
               {totalCredit !== totalDebit && (
                  <div className="flex items-center gap-2 text-red-500 font-black text-[9px] uppercase tracking-widest animate-pulse italic">
                     <AlertCircle size={14} /> Fiscal Imbalance: ({(totalCredit - totalDebit).toFixed(2)})
                  </div>
               )}
            </div>

            {/* Dual Processing Vector */}
            <div className="flex h-[400px] relative">
               {loading && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-50 flex items-center justify-center">
                     <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Reconstructing Matrix Nodes...</span>
                     </div>
                  </div>
               )}
               {/* Credit Vector */}
               <div className="flex-1 flex flex-col border-r border-slate-100">
                  <div className="bg-emerald-50/30 p-3 px-6 border-b border-emerald-50 flex justify-between items-center">
                     <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] italic">Credit Stream (Jama)</span>
                     </div>
                     <button 
                        onClick={() => { setEditIndex(null); setActiveSubModal('credit'); }} 
                        className="bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-50 px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
                     >
                        <Plus size={12} strokeWidth={4} /> Add Credit
                     </button>
                  </div>

                  <div className="grid grid-cols-12 bg-[#F8FAFC] text-slate-400 text-[9px] font-black uppercase tracking-widest py-2 border-b border-slate-50">
                     <div className="col-span-8 px-6">Source Particular</div>
                     <div className="col-span-4 px-6 text-right">Value (₹)</div>
                  </div>

                  <div className="flex-1 overflow-y-auto scroller-airy">
                     {displayCredits.map((item, i) => (
                        <div
                           key={i}
                           onClick={() => item && setSelected({ type: 'credit', index: i })}
                           onDoubleClick={() => { if (item) { setEditIndex(i); setActiveSubModal('credit'); } }}
                           className={`grid grid-cols-12 transition-all min-h-[4rem] items-center border-b border-slate-50 group cursor-pointer ${selected?.type === 'credit' && selected?.index === i
                                 ? 'bg-slate-900 text-white'
                                 : 'hover:bg-slate-50'
                              }`}
                        >
                           <div className="col-span-8 px-6 flex flex-col gap-1">
                              <div className={`font-black uppercase text-xs tracking-tight italic ${selected?.type === 'credit' && selected?.index === i ? 'text-white' : 'text-slate-800'}`}>
                                 {item?.account_name || ''}
                              </div>
                              {item && (
                                 <div className={`text-[9px] font-bold italic truncate flex items-center gap-2 ${selected?.type === 'credit' && selected?.index === i ? 'text-slate-400' : 'text-slate-400'}`}>
                                    <ChevronRight size={10} className="text-emerald-500"/> {item?.particulars || 'No narrative provided'}
                                 </div>
                              )}
                           </div>
                           <div className="col-span-4 px-6 flex justify-between items-center group/item">
                              <span className={`font-black font-mono text-sm tracking-tighter ${selected?.type === 'credit' && selected?.index === i ? 'text-white' : 'text-slate-700'}`}>
                                 {item ? parseFloat(item.amount).toFixed(2) : ''}
                              </span>
                              {item && (
                                 <button
                                    onClick={(e) => { e.stopPropagation(); removeItem('credit', i); }}
                                    className={`p-1.5 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all ${selected?.type === 'credit' && selected?.index === i ? 'text-red-400 hover:bg-red-400/10' : 'text-red-600 hover:bg-red-50'}`}
                                 >
                                    <Trash2 size={14} />
                                 </button>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>

                  {/* Sector Footer */}
                  <div className="p-4 px-8 bg-slate-50/50 flex justify-between items-center border-t border-slate-100">
                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic tracking-[0.3em]">Sector Yield Total</span>
                     <span className="font-black font-mono text-lg text-emerald-600 tracking-tighter italic">₹ {totalCredit.toFixed(2)}</span>
                  </div>
               </div>

               {/* Debit Vector */}
               <div className="flex-1 flex flex-col">
                  <div className="bg-blue-50/30 p-3 px-6 border-b border-blue-50 flex justify-between items-center">
                     <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"></div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] italic">Debit Stream (Udhar)</span>
                     </div>
                     <button 
                        onClick={() => { setEditIndex(null); setActiveSubModal('debit'); }} 
                        className="bg-white border border-blue-100 text-blue-600 hover:bg-blue-50 px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
                     >
                        <Plus size={12} strokeWidth={4} /> Add Debit
                     </button>
                  </div>

                  <div className="grid grid-cols-12 bg-[#F8FAFC] text-slate-400 text-[9px] font-black uppercase tracking-widest py-2 border-b border-slate-50">
                     <div className="col-span-8 px-6">Destination Particular</div>
                     <div className="col-span-4 px-6 text-right">Value (₹)</div>
                  </div>

                  <div className="flex-1 overflow-y-auto scroller-airy">
                     {displayDebits.map((item, i) => (
                        <div
                           key={i}
                           onClick={() => item && setSelected({ type: 'debit', index: i })}
                           onDoubleClick={() => { if (item) { setEditIndex(i); setActiveSubModal('debit'); } }}
                           className={`grid grid-cols-12 transition-all min-h-[4rem] items-center border-b border-slate-50 group cursor-pointer ${selected?.type === 'debit' && selected?.index === i
                                 ? 'bg-slate-900 text-white'
                                 : 'hover:bg-slate-50'
                              }`}
                        >
                           <div className="col-span-8 px-6 flex flex-col gap-1">
                              <div className={`font-black uppercase text-xs tracking-tight italic ${selected?.type === 'debit' && selected?.index === i ? 'text-white' : 'text-slate-800'}`}>
                                 {item?.account_name || ''}
                              </div>
                              {item && (
                                 <div className={`text-[9px] font-bold italic truncate flex items-center gap-2 ${selected?.type === 'debit' && selected?.index === i ? 'text-slate-400' : 'text-slate-400'}`}>
                                    <ChevronRight size={10} className="text-blue-500"/> {item?.particulars || 'No narrative provided'}
                                 </div>
                              )}
                           </div>
                           <div className="col-span-4 px-6 flex justify-between items-center group/item">
                              <span className={`font-black font-mono text-sm tracking-tighter ${selected?.type === 'debit' && selected?.index === i ? 'text-white' : 'text-slate-700'}`}>
                                 {item ? parseFloat(item.amount).toFixed(2) : ''}
                              </span>
                              {item && (
                                 <button
                                    onClick={(e) => { e.stopPropagation(); removeItem('debit', i); }}
                                    className={`p-1.5 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all ${selected?.type === 'debit' && selected?.index === i ? 'text-red-400 hover:bg-red-400/10' : 'text-red-600 hover:bg-red-50'}`}
                                 >
                                    <Trash2 size={14} />
                                 </button>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>

                  {/* Sector Footer */}
                  <div className="p-4 px-8 bg-slate-50/50 flex justify-between items-center border-t border-slate-100">
                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic tracking-[0.3em]">Sector Yield Total</span>
                     <span className="font-black font-mono text-lg text-blue-600 tracking-tighter italic">₹ {totalDebit.toFixed(2)}</span>
                  </div>
               </div>
            </div>

            {/* Terminal Actions */}
            <div className="bg-slate-50 border-t border-slate-100 p-6 px-10 flex justify-end gap-5">
               <button onClick={onClose} className="px-8 py-3.5 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:text-slate-600 shadow-sm transition-all active:scale-95">Cancel Operation</button>
               <button
                  onClick={handleSave}
                  disabled={totalCredit === 0 || totalCredit !== totalDebit}
                  className="bg-indigo-600 text-white px-10 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:grayscale disabled:opacity-50 flex items-center gap-3"
               >
                  {totalCredit > 0 && totalCredit === totalDebit && <CheckCircle2 size={16} strokeWidth={3}/>}
                  Commit Fiscal Voucher
               </button>
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
         
         <style dangerouslySetInnerHTML={{ __html: `
            .scroller-airy::-webkit-scrollbar { width: 4px; }
            .scroller-airy::-webkit-scrollbar-track { background: transparent; }
            .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
         `}} />
      </div>
   );
}

// Compact Sub Entry Modal with Identity Discovery Engine
function SubEntryModal({ type, date, accounts, onClose, onAdd, initialData, company }) {
   const isCredit = type === 'credit';
   const themeColor = isCredit ? 'emerald' : 'blue';
   const title = initialData ? 'Modify Node' : (isCredit ? 'Jama Allocation' : 'Udhar Allocation');

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
   const dropdownRef = React.useRef(null);
   const codeInputRef = React.useRef(null);
   const nameInputRef = React.useRef(null);

   useEffect(() => {
      if (initialData?.account_id) {
         const acc = accounts.find(a => a.id === initialData.account_id);
         if (acc) setSelectedAccount(acc);
      }
      fetchMembers();
   }, []);

   const fetchMembers = async () => {
      try {
         const res = await axios.get(`/api/members/company/${company?.id}`);
         if (res.data.success) setMembers(res.data.data);
      } catch (err) {}
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
   };

   // Auto-fetch by code logic
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

   return (
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md z-[1200] flex items-center justify-center p-6 animate-in fade-in duration-300">
         <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-500">
            <div className={`bg-${themeColor}-600 p-5 px-7 flex justify-between items-center`}>
               <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center text-white">
                     <Database size={18} strokeWidth={3} />
                  </div>
                  <span className="text-[11px] font-black uppercase text-white tracking-[0.2em] italic">{title}</span>
               </div>
               <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white rounded-xl p-2 transition-all"><X size={16} strokeWidth={3} /></button>
            </div>

            <div className="p-7 space-y-5 bg-white relative">
               <div className="flex items-center justify-between bg-[#F8FAFC] p-4 border border-slate-50 rounded-2xl">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Voucher Timeline :</span>
                  <span className="font-mono font-black text-slate-800 text-[10px] tracking-widest">{date}</span>
               </div>

               {/* Account Discovery */}
               <div className="relative group">
                  <div className="flex items-center gap-4 bg-[#F8FAFC] p-4 rounded-xl border border-slate-50 group-focus-within:border-indigo-100 transition-all">
                     <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400 group-focus-within:text-indigo-500"><Search size={14}/></div>
                     <div className="flex-1 grid grid-cols-12 gap-3" ref={dropdownRef}>
                        <div className="col-span-3 border-r border-slate-100 pr-3">
                           <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5 italic text-center">Node ID</p>
                           <input
                              ref={codeInputRef}
                              type="text"
                              placeholder="CODE"
                              value={searchCode}
                              onChange={(e) => { setSearchCode(e.target.value); setShowDropdown(true); if (accountId) { setAccountId(''); setSelectedAccount(null); } }}
                              onFocus={() => setShowDropdown(true)}
                              onKeyDown={handleSearchKeyDown}
                              className="w-full bg-transparent border-none outline-none font-black text-slate-800 text-xs tracking-widest text-center"
                           />
                        </div>
                        <div className="col-span-9">
                           <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5 italic">Ledger Account</p>
                           <input
                              ref={nameInputRef}
                              type="text"
                              placeholder="START TYPING..."
                              value={searchText}
                              onChange={(e) => { setSearchText(e.target.value); setShowDropdown(true); if (accountId) { setAccountId(''); setSelectedAccount(null); } }}
                              onFocus={() => setShowDropdown(true)}
                              onKeyDown={handleSearchKeyDown}
                              className="w-full bg-transparent border-none outline-none font-bold text-slate-800 text-xs italic"
                           />
                        </div>
                     </div>
                  </div>

                  {showDropdown && (
                     <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 shadow-2xl z-[1300] max-h-48 overflow-y-auto rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-slate-900 text-white p-2.5 px-5 text-[7px] font-black uppercase tracking-[0.4em] flex justify-between items-center sticky top-0 italic">
                           <span>Identity Cluster Feed</span>
                           <X size={10} className="cursor-pointer" onClick={() => setShowDropdown(false)} />
                        </div>
                        {filteredAccounts.length === 0 ? (
                           <div className="p-8 text-center text-slate-300 text-[8px] font-black uppercase tracking-widest italic">Identity Node Null</div>
                        ) : (
                           filteredAccounts.map((acc, idx) => (
                              <div
                                 key={acc.id}
                                 onClick={() => handleAccountSelect(acc)}
                                 className={`px-5 py-3 border-b border-slate-50 flex justify-between items-center cursor-pointer transition-all ${selectedIndex === idx ? `bg-${themeColor}-50` : 'hover:bg-slate-50'}`}
                              >
                                 <p className={`font-black text-[10px] uppercase italic tracking-tight ${selectedIndex === idx ? `text-${themeColor}-600` : 'text-slate-800'}`}>{acc.account_name}</p>
                                 <div className={`px-2.5 py-1 rounded-md text-[7px] font-mono font-bold ${selectedIndex === idx ? `bg-${themeColor}-600 text-white` : 'bg-slate-50 text-slate-400'}`}>#{acc.id}</div>
                              </div>
                           ))
                        )}
                     </div>
                  )}
               </div>

               {/* Member Selection - Dynamic Shard */}
               {selectedAccount?.is_subledger === 1 && (
                  <div className="relative animate-in slide-in-from-left duration-300">
                     <div className="flex items-center gap-4 bg-indigo-50/30 p-4 rounded-xl border border-indigo-100 transition-all shadow-sm">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-500"><Users size={14}/></div>
                        <div className="flex-1">
                           <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 italic">Member Assignment (Subledger Required)</p>
                           <input
                              type="text"
                              placeholder="SEARCH SABHASAD..."
                              value={memberSearch}
                              onChange={(e) => { setMemberSearch(e.target.value); setShowMemberDropdown(true); if (memberId) setMemberId(''); }}
                              onFocus={() => setShowMemberDropdown(true)}
                              className="w-full bg-transparent border-none outline-none font-black text-indigo-900 text-xs italic tracking-tight"
                           />
                        </div>
                        {memberId && <CheckCircle2 size={16} className="text-emerald-500" strokeWidth={3} />}
                     </div>

                     {showMemberDropdown && memberSearch.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-indigo-100 shadow-2xl z-[1300] max-h-40 overflow-y-auto rounded-xl overflow-hidden divide-y divide-indigo-50">
                           {members.filter(m => m.member_name.toLowerCase().includes(memberSearch.toLowerCase()) || m.member_code.toString().includes(memberSearch)).map(m => (
                              <div 
                                 key={m.id}
                                 onClick={() => {
                                    setMemberId(m.id);
                                    setMemberName(m.member_name);
                                    setMemberSearch(m.member_name);
                                    setShowMemberDropdown(false);
                                 }}
                                 className="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex justify-between items-center group transition-colors"
                              >
                                 <span className="text-[10px] font-bold text-slate-700 italic">{m.member_name}</span>
                                 <span className="text-[8px] font-black bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono">#{m.member_code}</span>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Value (₹)</span>
                     <input
                        type="number"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-slate-50 h-11 px-5 rounded-xl outline-none font-black text-indigo-600 focus:border-indigo-100 text-lg font-mono tracking-tighter shadow-sm"
                        placeholder="0.00"
                     />
                  </div>
                  <div className="space-y-1.5">
                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Reference Node</span>
                     <input
                        type="text"
                        value={refNo}
                        onChange={e => setRefNo(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-slate-50 h-11 px-5 rounded-xl outline-none font-black text-slate-700 focus:border-indigo-100 text-[10px] shadow-sm tracking-widest uppercase italic"
                        placeholder="REF_ID"
                     />
                  </div>
               </div>

               <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Fiscal Narrative</span>
                  <textarea
                     value={particulars}
                     onChange={e => setParticulars(e.target.value)}
                     className="w-full bg-[#F8FAFC] border border-slate-50 px-5 py-3 rounded-xl outline-none uppercase font-bold text-slate-600 h-16 resize-none focus:border-indigo-100 shadow-sm italic text-[10px]"
                     placeholder="AUTOGEN_IF_EMPTY..."
                  />
               </div>
            </div>

            <div className="bg-[#F8FAFC] p-6 px-7 flex justify-end gap-3 border-t border-slate-50 shadow-inner">
               <button onClick={onClose} className="px-6 py-3 text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">Cancel</button>
               <button onClick={handleSubmit} className={`bg-${themeColor}-600 text-white px-8 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-${themeColor}-100 hover:bg-${themeColor}-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale`} disabled={!accountId || !amount || (selectedAccount?.is_subledger === 1 && !memberId)}>
                  {initialData ? 'Update Node' : 'Initialize Node'}
               </button>
            </div>
         </div>
      </div>
   );
}
