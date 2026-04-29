import React, { useState, useEffect } from 'react';
import {
   Search, Download, Filter, X, ChevronRight, Printer,
   FileText, Database, Activity, Layout, BookOpen,
   TrendingDown, TrendingUp, DollarSign, RefreshCcw,
   Trash2, ShieldCheck, CheckCircle2, Hash, User
} from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export default function AccountLedger() {
   const { t } = useTranslation();
   const [view, setView] = useState('ledger');
   const [accounts, setAccounts] = useState([]);
   const [selectedAccount, setSelectedAccount] = useState(null);
   const [ledgerEntries, setLedgerEntries] = useState([]);
   const [trialBalance, setTrialBalance] = useState([]);
   const [totals, setTotals] = useState({ total_debit: 0, total_credit: 0, difference: 0 });
   const [accountBalance, setAccountBalance] = useState({ total_debit: 0, total_credit: 0, running_balance: 0 });
   const [searchTerm, setSearchTerm] = useState('');
   const [company, setCompany] = useState(null);
   const [dateRange, setDateRange] = useState({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
   });
   const [loading, setLoading] = useState(false);
   const [showPrintModal, setShowPrintModal] = useState(false);
   const [memberCodeSearch, setMemberCodeSearch] = useState('');
   const [memberNameSearch, setMemberNameSearch] = useState('');
   const [showMemberDropdown, setShowMemberDropdown] = useState(false);

   useEffect(() => {
      loadCompany();
   }, []);

   const loadCompany = async () => {
      try {
         const response = await axios.get('/api/company');
         if (response.data.success && response.data.data) {
            setCompany(response.data.data);
         }
      } catch (error) {
         console.error('Failed to load company', error);
      }
   };

   useEffect(() => {
      if (company?.id) {
         fetchAccounts();
         if (view === 'trial-balance') {
            fetchTrialBalance();
         }
      }
   }, [view, company]);

   const fetchAccounts = async () => {
      try {
         const response = await axios.get(
            `/api/accounts/company/${company.id}`,
            { headers: { 'x-company-id': company.id } }
         );
         if (response.data.data) {
            setAccounts(response.data.data);
         }
      } catch (err) {
         console.error('Fetch accounts error:', err);
      }
   };

   const fetchAccountLedger = async (accountId) => {
      try {
         setLoading(true);
         const response = await axios.get(
            `/api/account-ledger/account/${accountId}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
            { headers: { 'x-company-id': company.id } }
         );
         if (response.data.success) {
            setLedgerEntries(response.data.data);
         }
      } catch (err) {
         console.error('Fetch ledger error:', err);
      } finally {
         setLoading(false);
      }
   };

   const fetchAccountBalance = async (accountId) => {
      try {
         const response = await axios.get(
            `/api/account-ledger/account-stats/${accountId}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
            { headers: { 'x-company-id': company.id } }
         );
         if (response.data.success) {
            setAccountBalance(response.data.data);
         }
      } catch (err) {
         console.error('Fetch balance error:', err);
      }
   };

   const fetchTrialBalance = async () => {
      try {
         setLoading(true);
         const response = await axios.get(
            `/api/account-ledger/trial-balance`,
            { headers: { 'x-company-id': company.id } }
         );
         if (response.data.success) {
            setTrialBalance(response.data.data);
            setTotals(response.data.totals);
         }
      } catch (err) {
         console.error('Fetch trial balance error:', err);
      } finally {
         setLoading(false);
      }
   };

   const handleSelectAccount = async (account) => {
      setSelectedAccount(account);
      setMemberCodeSearch(String(account.id));
      setMemberNameSearch(account.account_name);
      setShowMemberDropdown(false);
      setView('ledger');
      await Promise.all([
         fetchAccountLedger(account.id),
         fetchAccountBalance(account.id)
      ]);
   };

   // Automated Identity Synthesis: Auto-select on exact Code match
   useEffect(() => {
      if (memberCodeSearch && (!selectedAccount || String(selectedAccount.id) !== memberCodeSearch)) {
         const exactMatch = accounts.find(acc => String(acc.id) === memberCodeSearch);
         if (exactMatch) {
            handleSelectAccount(exactMatch);
         }
      }
   }, [memberCodeSearch, accounts]);

   const filteredAccounts = accounts.filter(acc =>
      (String(acc.id).includes(memberCodeSearch) || memberCodeSearch === '') &&
      (acc.account_name.toLowerCase().includes(memberNameSearch.toLowerCase()) || memberNameSearch === '')
   );

   const handleDateChange = () => {
      if (selectedAccount) {
         fetchAccountLedger(selectedAccount.id);
      }
   };

   const handlePrint = () => {
      if (!selectedAccount || ledgerEntries.length === 0) {
         alert('Incomplete data stream for deployment.');
         return;
      }
      setShowPrintModal(true);
   };

   if (!company?.id) {
      return (
         <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
            <div className="text-center font-black uppercase tracking-widest text-slate-300">
               <p className="text-xs mb-6 italic tracking-[0.4em]">Establishing Audit Connectivity...</p>
               <div className="w-24 h-1 bg-slate-100 mx-auto overflow-hidden rounded-full relative">
                  <div className="absolute top-0 left-0 w-1/2 h-full bg-blue-600 animate-[slide_1.5s_infinite]"></div>
               </div>
            </div>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-[#F8FAFC] pb-12 font-sans animate-in fade-in duration-700">
         <div className="max-w-[1600px] mx-auto px-8">

            {/* Superior Header Shard */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-10 gap-8 print:hidden">
               <div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
                     <Database size={12} />
                     <span>Fiscal Infrastructure / Consolidated Registry</span>
                  </div>
                  <h1 className="text-4xl font-bold text-slate-800 tracking-tight">
                     Account Ledger <span className="text-blue-600 italic">Audit</span>
                  </h1>
               </div>

               <div className="flex items-center gap-4 bg-white/50 backdrop-blur-xl p-2 rounded-lg border border-white shadow-sm transition-all hover:shadow-md">
                  <button
                     onClick={() => setView('ledger')}
                     className={`px-8 py-3 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${view === 'ledger' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'
                        }`}
                  >
                     <Activity size={14} /> Transaction Mode
                  </button>
                  <button
                     onClick={() => { setView('trial-balance'); fetchTrialBalance(); }}
                     className={`px-8 py-3 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${view === 'trial-balance' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'
                        }`}
                  >
                     <Layout size={14} /> Trial Summary
                  </button>
               </div>
            </div>

            {view === 'ledger' && (
               <div className="space-y-10">

                  {/* Intelligence Control Shard */}
                  <div className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm relative print:hidden">
                     <div className="flex flex-wrap items-end justify-between gap-10">
                        <div className="flex-1 flex flex-wrap items-end gap-6 relative">
                           {/* Node ID Input */}
                           <div className="w-full md:w-32">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 italic">Node ID</span>
                              <div className="relative group">
                                 <Hash size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                                 <input
                                    type="text"
                                    value={memberCodeSearch}
                                    onChange={(e) => {
                                       setMemberCodeSearch(e.target.value);
                                       setShowMemberDropdown(true);
                                    }}
                                    onFocus={() => setShowMemberDropdown(true)}
                                    placeholder="ID"
                                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all font-bold uppercase text-[11px]"
                                 />
                              </div>
                           </div>

                           {/* Identity Search */}
                           <div className="flex-1 min-w-[300px]">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 italic">Search Nomenclature</span>
                              <div className="relative group">
                                 <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                                 <input
                                    type="text"
                                    value={memberNameSearch}
                                    onChange={(e) => {
                                       setMemberNameSearch(e.target.value);
                                       setShowMemberDropdown(true);
                                    }}
                                    onFocus={() => setShowMemberDropdown(true)}
                                    placeholder="IDENTIFY ENTITY..."
                                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all font-bold uppercase text-[11px]"
                                 />
                              </div>
                           </div>

                           {/* Dropdown - Glassmorphic Airy Style */}
                           {showMemberDropdown && accounts.length > 0 && (
                              <div className="absolute top-[85px] left-0 right-0 bg-white/95 backdrop-blur-2xl border border-white shadow-2xl rounded-lg overflow-hidden z-[100] animate-in zoom-in-95">
                                 <div className="max-h-64 overflow-y-auto">
                                    {filteredAccounts.map((acc) => (
                                       <div
                                          key={acc.id}
                                          onClick={() => handleSelectAccount(acc)}
                                          className="px-8 py-5 hover:bg-blue-50/50 flex justify-between items-center cursor-pointer transition-all border-b border-slate-50 last:border-none group"
                                       >
                                          <div>
                                             <p className="text-sm font-bold text-slate-600 group-hover:text-blue-600 transition-colors uppercase italic">{acc.account_name}</p>
                                             <p className="text-[10px] font-bold text-slate-300 uppercase leading-none mt-1 group-hover:text-blue-300">{acc.account_type}</p>
                                          </div>
                                          <span className="text-[10px] font-black text-slate-200 group-hover:text-blue-600 tracking-widest">#{acc.id}</span>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}

                           <div className="flex flex-wrap items-end gap-4">
                              <div>
                                 <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 italic">Temporal Start</span>
                                 <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} onBlur={handleDateChange} className="bg-slate-50 border-none rounded-lg px-6 py-3.5 text-xs font-bold text-slate-600 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-mono" />
                              </div>
                              <div>
                                 <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 italic">Temporal End</span>
                                 <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} onBlur={handleDateChange} className="bg-slate-50 border-none rounded-lg px-6 py-3.5 text-xs font-bold text-slate-600 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all font-mono" />
                              </div>
                           </div>
                        </div>

                        <div className="flex gap-4">
                           <button
                              onClick={handlePrint}
                              className="bg-slate-900 text-white px-10 py-4 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 flex items-center gap-3"
                           >
                              <Printer size={18} /> Print Statement
                           </button>
                        </div>
                     </div>
                  </div>

                  {selectedAccount ? (
                     <>
                        {/* Position Metrics Shards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 print:grid-cols-4">
                           {[
                              { label: 'Cumulative Debit Accumulation', val: parseFloat(accountBalance.total_debit || 0), icon: <TrendingUp size={20} />, color: 'indigo' },
                              { label: 'Cumulative Credit Accumulation', val: parseFloat(accountBalance.total_credit || 0), icon: <TrendingDown size={20} />, color: 'amber' },
                              { label: 'Pending Interest Accumulation', val: parseFloat(accountBalance.total_interest || 0), icon: <RefreshCcw size={20} />, color: 'orange' },
                              { label: 'Net Liquidity Position', val: parseFloat(accountBalance.balance || accountBalance.running_balance || 0), icon: <DollarSign size={20} />, color: 'emerald', special: true },
                           ].map((shard, i) => (
                              <div key={i} className={`bg-white p-8 rounded-lg border border-slate-100 shadow-sm relative group hover:shadow-lg transition-all ${shard.special && shard.val < 0 ? 'bg-rose-50/30' : ''}`}>
                                 <div className="flex justify-between items-start mb-6">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{shard.label}</p>
                                    <div className={`p-3 bg-${shard.color}-50 text-${shard.color}-600 rounded-lg group-hover:scale-110 transition-transform`}>{shard.icon}</div>
                                 </div>
                                 <p className={`text-3xl font-bold tracking-tighter ${shard.special ? (shard.val >= 0 ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-800'}`}>
                                    ₹{shard.val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                 </p>
                              </div>
                           ))}
                        </div>

                        {/* Operational Table Canvas */}
                        <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[600px] relative">
                           <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-[#F8FAFC]/50 backdrop-blur-sm">
                              <div>
                                 <h2 className="text-xl font-bold text-slate-800 tracking-tight uppercase italic">{selectedAccount.account_name}</h2>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Nomenclature Registry: {selectedAccount.account_type}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                 <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Temporal Status: Checked</span>
                                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200"></div>
                              </div>
                           </div>

                           <div className="flex-1 overflow-x-auto scroller-airy">
                              <table className="w-full text-left">
                                 <thead className="bg-[#F8FAFC]">
                                    <tr>
                                       {['Post Epoch', 'Reference Registry', 'Nomenclature Payload', 'Debit (+)', 'Credit (-)', 'Running Balance'].map((h, i) => (
                                          <th key={i} className={`px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest ${i > 2 ? 'text-right' : ''}`}>
                                             {h}
                                          </th>
                                       ))}
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                       <tr>
                                          <td colSpan="6" className="py-32 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">
                                             <RefreshCcw className="animate-spin mx-auto mb-4 text-blue-100" size={40} />
                                             Synchronizing Ledger Segments...
                                          </td>
                                       </tr>
                                    ) : ledgerEntries.length === 0 ? (
                                       <tr>
                                          <td colSpan="6" className="py-32 text-center">
                                             <Database size={48} className="mx-auto text-slate-50 mb-4" strokeWidth={1} />
                                             <p className="text-slate-300 font-bold uppercase tracking-widest text-[10px] italic">No transaction nodes detected in specified window</p>
                                          </td>
                                       </tr>
                                    ) : (
                                       ledgerEntries.map((row, idx) => (
                                          <tr key={idx} className="group hover:bg-slate-50/50 transition-all duration-300">
                                             <td className="px-10 py-5 text-[11px] font-bold text-slate-400 font-mono italic">{new Date(row.transaction_date).toLocaleDateString('en-GB')}</td>
                                             <td className="px-10 py-5 text-[10px] font-bold text-slate-300 uppercase tracking-tight italic">{row.reference_no}</td>
                                             <td className="px-10 py-5 font-bold text-slate-700 text-sm uppercase tracking-tight">
                                                <div className="flex flex-col">
                                                   <span>{row.description}</span>
                                                   {row.member_name && (
                                                      <span className="text-[10px] text-blue-500 font-black italic mt-0.5">
                                                         ENTITY: {row.member_name} {row.member_code ? `[${row.member_code}]` : ''}
                                                      </span>
                                                   )}
                                                </div>
                                                {parseFloat(row.interest_percent || 0) > 0 && (
                                                   <span className="mt-1 inline-block px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded text-[9px] font-black italic">
                                                      @{row.interest_percent}% Interest
                                                   </span>
                                                )}
                                             </td>

                                             <td className={`px-10 py-5 text-right font-bold text-slate-900 italic`}>

                                                {parseFloat(row.debit || 0) > 0 ? `₹${parseFloat(row.debit).toLocaleString('en-IN')}` : '—'}
                                             </td>
                                             <td className="px-10 py-5 text-right font-bold text-slate-400 italic">
                                                {parseFloat(row.credit || 0) > 0 ? `₹${parseFloat(row.credit).toLocaleString('en-IN')}` : '—'}
                                             </td>
                                             <td className={`px-10 py-5 text-right font-black text-sm italic ${parseFloat(row.running_balance) >= 0 ? 'text-slate-800' : 'text-rose-600 underline decoration-rose-100 decoration-4 underline-offset-8'}`}>
                                                ₹{parseFloat(row.running_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                             </td>
                                          </tr>
                                       ))
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     </>
                  ) : (
                     <>
                        {/* Transaction Shard Registry - Default View */}
                        <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[600px] relative animate-in slide-in-from-bottom duration-500">
                           <div className="p-10 border-b border-slate-50 bg-[#F8FAFC]/50 backdrop-blur-sm flex justify-between items-center">
                              <div>
                                 <h2 className="text-xl font-bold text-slate-800 tracking-tight uppercase italic">Institutional Registry</h2>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select nomenclature node for deep shard audit</p>
                              </div>
                              <div className="flex items-center gap-3">
                                 <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm flex items-center gap-2">
                                    <Database size={10} /> Total Nodes: {filteredAccounts.length}
                                 </span>
                              </div>
                           </div>

                           <div className="flex-1 overflow-x-auto scroller-airy">
                              <table className="w-full text-left">
                                 <thead className="bg-[#F8FAFC]">
                                    <tr>
                                       <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Nomenclature</th>
                                       <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Registry Class</th>
                                       <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Audit Status</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50">
                                    {filteredAccounts.length === 0 ? (
                                       <tr>
                                          <td colSpan="3" className="py-32 text-center text-slate-200 font-black uppercase text-[10px] tracking-[0.4em] italic">No shards matched nomenclature</td>
                                       </tr>
                                    ) : (
                                       filteredAccounts.map(acc => (
                                          <tr
                                             key={acc.id}
                                             onClick={() => handleSelectAccount(acc)}
                                             className="group hover:bg-blue-50/30 cursor-pointer transition-all duration-300"
                                          >
                                             <td className="px-10 py-5">
                                                <div className="flex flex-col">
                                                   <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase italic tracking-tight">{acc.account_name}</span>
                                                   <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-0.5">SHA_ID: #{acc.id}</span>
                                                </div>
                                             </td>
                                             <td className="px-10 py-5">
                                                <span className="px-3 py-1 bg-white border border-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-tighter group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">{acc.account_type}</span>
                                             </td>
                                             <td className="px-10 py-5 text-right">
                                                <button className="p-2.5 bg-slate-50 text-slate-300 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:scale-110 shadow-sm">
                                                   <ChevronRight size={18} />
                                                </button>
                                             </td>
                                          </tr>
                                       ))
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     </>
                  )}
               </div>
            )}

            {view === 'trial-balance' && (
               <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom duration-700">
                  <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-[#F8FAFC]/50 backdrop-blur-sm">
                     <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight uppercase italic">Global Settlement Summary</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Consolidated Institutional Trial Balance</p>
                     </div>
                     <button className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-100 hover:scale-105 transition-all">
                        <Download size={16} /> Data Export
                     </button>
                  </div>

                  <div className="overflow-x-auto scroller-airy">
                     <table className="w-full text-left">
                        <thead className="bg-[#F8FAFC]">
                           <tr>
                              {['Nomenclature Identifier', 'Registry Class', 'Aggregate Credit (-)', 'Aggregate Debit (+)', 'Net Position Exposure'].map((col, i) => (
                                 <th key={i} className={`px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest ${i > 1 ? 'text-right' : ''}`}>
                                    {col}
                                 </th>
                              ))}
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {loading ? (
                              <tr><td colSpan="5" className="py-32 text-center text-slate-300 uppercase font-black text-xs italic tracking-widest"><RefreshCcw className="animate-spin mx-auto mb-4" size={40} /> Processing Settlement Matrix...</td></tr>
                           ) : (
                              trialBalance.map((acc, idx) => (
                                 <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-10 py-5 text-sm font-bold text-slate-700 uppercase italic transition-colors group-hover:text-blue-600">{acc.account_name}</td>
                                    <td className="px-10 py-5 text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">{acc.account_type}</td>
                                    <td className="px-10 py-5 text-right font-bold text-slate-400 italic">₹{parseFloat(acc.total_credit || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-10 py-5 text-right font-bold text-slate-900 italic">₹{parseFloat(acc.total_debit || 0).toLocaleString('en-IN')}</td>
                                    <td className={`px-10 py-5 text-right font-black italic text-sm ${parseFloat(acc.balance) >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>₹{Math.abs(parseFloat(acc.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                 </tr>
                              ))
                           )}
                        </tbody>
                        <tfoot className="bg-slate-900 text-white font-black italic">
                           <tr>
                              <td colSpan="2" className="px-10 py-8 text-xs font-black uppercase tracking-[0.4em] text-blue-500">Master Settlement Integrity</td>
                              <td className="px-10 py-8 text-right text-xl tracking-tighter text-slate-400">₹{parseFloat(totals.total_credit || 0).toLocaleString('en-IN')}</td>
                              <td className="px-10 py-8 text-right text-xl tracking-tighter">₹{parseFloat(totals.total_debit || 0).toLocaleString('en-IN')}</td>
                              <td className={`px-10 py-8 text-right text-xs tracking-widest uppercase ${totals.difference < 0.1 ? 'text-blue-400' : 'text-rose-400 underline decoration-red-600 decoration-4'}`}>
                                 {totals.difference < 0.1 ? '✓ VERIFIED' : `Δ ERROR: ₹${totals.difference.toFixed(2)}`}
                              </td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>
               </div>
            )}
         </div>

         {/* Modern High-Monochrome Print Modal */}
         {showPrintModal && selectedAccount && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xl flex items-center justify-center z-50 p-4 animate-in zoom-in-95 duration-300">
               <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-white">
                  <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                     <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Print Deployment Protocol</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedAccount.account_name} / Statement</p>
                     </div>
                     <button onClick={() => setShowPrintModal(false)} className="p-3 bg-white text-slate-400 hover:text-rose-600 rounded-lg shadow-sm hover:scale-110 transition-all active:scale-95"><X size={24} /></button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-16 bg-white" id="printable-ledger">
                     <div className="text-center pb-12 mb-12 border-b-8 border-black">
                        <h1 className="text-5xl font-black text-black tracking-tighter uppercase italic">{company.company_name}</h1>
                        <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.5em] mt-2 italic underline decoration-slate-100 decoration-8 underline-offset-8">OFFICIAL_STATEMENT_CORE</p>
                     </div>

                     <div className="grid grid-cols-2 gap-16 mb-12">
                        <div>
                           <h2 className="text-2xl font-black text-black uppercase italic mb-1">{selectedAccount.account_name}</h2>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">REGISTRY_PATH: {selectedAccount.account_type}</p>
                           <div className="space-y-1 font-mono text-[10px] font-bold text-slate-300 uppercase italic">
                              <p>TELECOM: {selectedAccount.phone || 'DISCONNECTED'}</p>
                              <p>NODE_ID: #{selectedAccount.id}</p>
                           </div>
                        </div>
                        <div className="text-right flex flex-col justify-end">
                           <p className="text-[10px] font-black text-slate-200 uppercase tracking-[0.4em] mb-1">AUDIT_TIMESTAMP</p>
                           <p className="text-xs font-black text-black font-mono">{new Date().toLocaleString()}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 italic">WINDOW: {dateRange.startDate} / {dateRange.endDate}</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-8 mb-16">
                        <div className="bg-black p-8 rounded-lg text-white">
                           <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest mb-2">GROSS DEBIT</p>
                           <p className="text-3xl font-bold tracking-tighter italic">₹{parseFloat(accountBalance.total_debit || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-lg border border-slate-100">
                           <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">GROSS CREDIT</p>
                           <p className="text-3xl font-bold text-slate-400 tracking-tighter italic">₹{parseFloat(accountBalance.total_credit || 0).toLocaleString('en-IN')}</p>
                        </div>
                        <div className={`p-8 rounded-lg border-4 ${parseFloat(accountBalance.running_balance) >= 0 ? 'border-black' : 'border-rose-600'}`}>
                           <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">NET SETTLEMENT</p>
                           <p className={`text-3xl font-black tracking-tighter italic ${parseFloat(accountBalance.running_balance) >= 0 ? 'text-black' : 'text-rose-600'}`}>₹{Math.abs(parseFloat(accountBalance.running_balance || 0)).toLocaleString('en-IN')}</p>
                        </div>
                     </div>

                     <table className="w-full text-[12px] font-mono mb-20">
                        <thead className="bg-[#000] text-white">
                           <tr>
                              <th className="p-4 text-left uppercase tracking-widest font-black">Epoch</th>
                              <th className="p-4 text-left uppercase tracking-widest font-black">Ref_No</th>
                              <th className="p-4 text-left uppercase tracking-widest font-black">Particulars</th>
                              <th className="p-4 text-right uppercase tracking-widest font-black">Debit</th>
                              <th className="p-4 text-right uppercase tracking-widest font-black">Credit</th>
                              <th className="p-4 text-right uppercase tracking-widest font-black">Pos</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-slate-100 italic font-bold">
                           {ledgerEntries.map((e, i) => (
                              <tr key={i}>
                                 <td className="p-4 text-slate-400">{new Date(e.transaction_date).toLocaleDateString('en-GB')}</td>
                                 <td className="p-4 text-slate-300">{e.reference_no}</td>
                                 <td className="p-4 text-black uppercase">{e.description}</td>
                                 <td className="p-4 text-right">{parseFloat(e.debit || 0) > 0 ? parseFloat(e.debit).toLocaleString('en-IN') : '—'}</td>
                                 <td className="p-4 text-right text-slate-400">{parseFloat(e.credit || 0) > 0 ? parseFloat(e.credit).toLocaleString('en-IN') : '—'}</td>
                                 <td className="p-4 text-right font-black text-black">₹{parseFloat(e.running_balance).toLocaleString('en-IN')}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>

                     <div className="text-center font-black text-[9px] text-slate-200 uppercase tracking-[0.8em] mt-20 pt-10 border-t-2 border-slate-50 italic">
                        END_OF_MANIFEST_AUDIT_VERIFIED
                     </div>
                  </div>

                  <div className="p-8 bg-slate-900 flex justify-between items-center">
                     <button onClick={() => window.print()} className="bg-white text-black px-12 py-4 rounded-lg font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-105 transition-all">EXECUTE_PRINT</button>
                     <button onClick={() => setShowPrintModal(false)} className="text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors">ABORT_PROTOCOL</button>
                  </div>
               </div>
            </div>
         )}

         <style dangerouslySetInnerHTML={{
            __html: `
        @media print {
          @page { margin: 1cm; size: auto; }
          body { background-color: white !important; margin: 0; padding: 0; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          #printable-ledger { width: 100% !important; padding: 0 !important; }
          .bg-slate-900, .bg-black { background-color: #000 !important; color: #fff !important; }
          .scroller-airy::-webkit-scrollbar { width: 4px; }
          .scroller-airy::-webkit-scrollbar-track { background: transparent; }
          .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        }
        input::-webkit-calendar-picker-indicator { opacity: 0.3; cursor: pointer; }
      `}} />
      </div>
   );
}
