import React, { useState, useEffect } from 'react';
import { Plus, X, Database, Layout, CheckCircle, UserCheck, ArrowRight, User } from 'lucide-react';
import api, { sabhasadMasterApi } from '../api';

export default function DeductionConsole() {
   const [showMembersModal, setShowMembersModal] = useState(false);
   const [loading, setLoading] = useState(false);
   const [members, setMembers] = useState([]);
   const [accounts, setAccounts] = useState([]);
   const [deductionRules, setDeductionRules] = useState([]);
   const [selectedIdentities, setSelectedIdentities] = useState([]);
   const [identitySearch, setIdentitySearch] = useState('');
   const [identityTab, setIdentityTab] = useState('sabhasad');
   const [narrations, setNarrations] = useState([]);
   const [showDeductionModal, setShowDeductionModal] = useState(false);
   const [deductionPayload, setDeductionPayload] = useState({
      date: new Date().toISOString().split('T')[0],
      master_id: '',
      remark: '',
      global_amount: '',
      target_identifier: ''
   });
   const [manualDeductions, setManualDeductions] = useState([]);

   const [accountStatsRange, setAccountStatsRange] = useState({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
   });
   const [activeAccountStats, setActiveAccountStats] = useState({ total_debit: 0, total_credit: 0, balance: 0 });

   useEffect(() => {
      if (deductionPayload.target_identifier && deductionPayload.target_identifier.startsWith('account-')) {
         const accId = deductionPayload.target_identifier.split('-')[1];
         api.get(`/account-ledger/account-stats/${accId}`, { params: accountStatsRange })
            .then(res => {
               if (res.data.success) setActiveAccountStats(res.data.data);
            })
            .catch(console.error);
      } else {
         setActiveAccountStats({ total_debit: 0, total_credit: 0, balance: 0 });
      }
   }, [deductionPayload.target_identifier, accountStatsRange]);

   useEffect(() => { loadIdentities(); }, []);

   const loadIdentities = async () => {
      try {
         setLoading(true);
         const companyRes = await api.get('/company');
         const [memRes, accRes, targetsRes, rulesRes, narrRes] = await Promise.all([
            sabhasadMasterApi.getAllSabhasad(),
            api.get('/accounts?type=ledger'),
            api.get('/deductions/targets'),
            api.get('/deductions/master'),
            api.get('/narrations')
         ]);
         if (memRes.data.success) setMembers(memRes.data.data);
         if (accRes.data.success) setAccounts(accRes.data.data);
         if (rulesRes.data.success) setDeductionRules(rulesRes.data.data);
         if (narrRes.data.success) setNarrations(narrRes.data.data);
         if (targetsRes.data && targetsRes.data.success) setSelectedIdentities(targetsRes.data.data);
      } catch (e) {
         console.error(e);
      } finally {
         setLoading(false);
      }
   };

   const fetchIdentityBalance = async (type, id, sabhasadId = null) => {
      console.log(`[fetchIdentityBalance] type: ${type}, id: ${id}, sabhasadId: ${sabhasadId}`);
      try {
         if (type === 'account' && sabhasadId) {
            const res = await sabhasadMasterApi.getMemberBalance(id, sabhasadId);
            console.log(`[fetchIdentityBalance] API Response for Member Balance:`, res.data);
            if (res.data.success && res.data.data) {
               return { total_debit: parseFloat(res.data.data.total_debit || 0), total_credit: parseFloat(res.data.data.total_credit || 0) };
            }
         } else {
            const res = await api.get(`/accounts/${type === 'member' ? 'M' + id : id}/balance`);
            console.log(`[fetchIdentityBalance] API Response for Global Balance:`, res.data);
            if (res.data.success) {
               return { total_debit: parseFloat(res.data.data.total_debit || 0), total_credit: parseFloat(res.data.data.total_credit || 0) };
            }
         }
      } catch (e) { console.error(e); }
      return { total_debit: 0, total_credit: 0 };
   };

   const preloadIdentityInsights = async (identities, sabhasadId = null) => {
      const rows = identities || [];
      if (!rows.length) return;
      try {
         console.log(`[preloadIdentityInsights] Fetching insights for sabhasadId: ${sabhasadId}`);
         const results = await Promise.all(rows.map(async (item) => {
            const metrics = await fetchIdentityBalance(item.type, item.id, sabhasadId);
            return { type: item.type, id: item.id, metrics };
         }));
         console.log(`[preloadIdentityInsights] Results:`, results);
         setSelectedIdentities(prev => prev.map(item => {
            const match = results.find(r => r.type === item.type && r.id === item.id);
            return match ? { ...item, ...match.metrics } : item;
         }));
      } catch (e) { console.error(e); }
   };

   const updateTargetMetrics = (type, id, metrics) => {
      setSelectedIdentities(prev => prev.map(item =>
         (item.type === type && item.id === id) ? { ...item, ...metrics } : item
      ));
   };

   const handleUpdateTargetAmount = (type, id, value) => {
      setSelectedIdentities(prev => prev.map(item =>
         (item.type === type && item.id === id) ? { ...item, deduction_amount: value } : item
      ));
   };

   const totalDeductionAmount = selectedIdentities.reduce((sum, item) => sum + (parseFloat(item.deduction_amount) || 0), 0);

   const toggleIdentitySelection = (id, type, name, code) => {
      const exists = selectedIdentities.find(i => i.id === id && i.type === type);
      if (exists) {
         setSelectedIdentities(selectedIdentities.filter(i => !(i.id === id && i.type === type)));
      } else {
         setSelectedIdentities([...selectedIdentities, { id, type, name, code }]);
      }
   };

   const removeIdentity = async (id, type) => {
      try {
         setSelectedIdentities(selectedIdentities.filter(i => !(i.id === id && i.type === type)));
         await api.delete(`/deductions/targets/${type}/${id}`);
      } catch (e) { console.error(e); }
   };

   const confirmSelection = async () => {
      try {
         setLoading(true);
         const syncRes = await api.post('/deductions/targets/sync', { identities: selectedIdentities });
         if (syncRes.data.success) {
            const targetsRes = await api.get('/deductions/targets');
            if (targetsRes.data && targetsRes.data.success) {
               setSelectedIdentities(targetsRes.data.data);
               setDeductionPayload(prev => ({ ...prev, target_identifier: 'all' }));
            }
         }
      } catch (e) { console.error(e); } finally {
         setLoading(false);
         setShowMembersModal(false);
      }
   };

   const handleExecuteBatch = async () => {
      try {
         setLoading(true);
         const res = await api.post('/deductions/execute-batch', {
            ...deductionPayload, manualDeductions, identities: selectedIdentities
         });
         if (res.data.success) {
            alert(res.data.message);
            setShowDeductionModal(false);
         }
      } catch (e) {
         alert(e.response?.data?.error || 'Execution failed');
      } finally {
         setLoading(false);
      }
   };

   const activeTarget = selectedIdentities.find(i => `${i.type}-${i.id}` === deductionPayload.target_identifier);
   const activeAccount = activeTarget?.type === 'account' ? accounts.find(a => a.id === activeTarget.id) : null;
   const isSubledger = activeAccount ? activeAccount.is_subledger === 1 : true;

   return (
      <div className="min-h-screen bg-slate-50 p-8">
         <div className="max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                     <Database size={24} />
                  </div>
                  <div>
                     <h1 className="text-xl font-bold text-slate-900 tracking-tight">Kapat Console</h1>
                     <p className="text-sm font-medium text-slate-500 mt-0.5">Automated Deduction Extraction</p>
                  </div>
               </div>
               <div className="flex gap-3">
                  <button onClick={() => setShowMembersModal(true)} className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-sm flex items-center gap-2 shadow-sm">
                     <Plus size={16} /> Add Targets
                  </button>
                  <button
                     onClick={() => { setDeductionPayload(prev => ({ ...prev, target_identifier: 'all' })); setShowDeductionModal(true); preloadIdentityInsights(selectedIdentities); }}
                     disabled={selectedIdentities.length === 0}
                     className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                     <Database size={16} /> Process Kapat
                  </button>
               </div>
            </div>

            {/* Extraction Matrix Table */}
            {selectedIdentities.length > 0 ? (
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                     <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <UserCheck className="text-blue-600" size={18} /> Extraction Matrix
                     </h2>
                     <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-md">{selectedIdentities.length} Targets</span>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                           <tr>
                              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Action</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {selectedIdentities.map((item) => (
                              <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50/50 transition-colors">
                                 <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${item.type === 'member' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                       {item.type === 'member' ? <User size={12} /> : <Layout size={12} />}
                                       {item.type === 'member' ? 'Member' : 'Account'}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                                 <td className="px-6 py-4 text-sm text-slate-500 font-mono italic">#{item.code}</td>
                                 <td className="px-6 py-4 text-right">
                                    <button onClick={() => removeIdentity(item.id, item.type)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"><X size={16} /></button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            ) : (
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mb-4"><Database size={28} /></div>
                  <p className="text-sm font-medium text-slate-500">No identities added to matrix.</p>
               </div>
            )}
         </div>

         {/* ── KAPAT ENTRY MODAL ── */}
         {showDeductionModal && (
            <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
               <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeductionModal(false)} />
               <div className="relative w-full max-w-3xl bg-white shadow-2xl flex flex-col border-2 border-slate-400 rounded-sm" style={{ maxHeight: '90vh' }}>

                  {/* Title bar */}
                  <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white px-3 py-1.5 flex justify-between items-center shrink-0">
                     <span className="text-xs font-bold tracking-wide">Kapat Entry</span>
                     <button onClick={() => setShowDeductionModal(false)} className="w-5 h-5 bg-white/20 hover:bg-red-500 flex items-center justify-center rounded-sm text-xs font-black transition-colors">✕</button>
                  </div>

                  {/* Form fields */}
                  <div className="bg-slate-100 border-b-2 border-slate-300 px-4 py-3 space-y-2 shrink-0">
                     <div className="flex items-center gap-4">
                        <label className="text-[11px] font-bold text-slate-700 w-24 text-right shrink-0">Voucher No :</label>
                        <div className="px-3 bg-white border border-slate-300 rounded-sm text-xs font-mono font-black text-slate-600 w-28 h-7 flex items-center">000001</div>
                        <div className="flex items-center gap-2 ml-auto">
                           <label className="text-[11px] font-bold text-slate-700 shrink-0">Date :</label>
                           <input type="date" value={deductionPayload.date}
                              onChange={e => setDeductionPayload(p => ({ ...p, date: e.target.value }))}
                              className="px-2 bg-white border border-slate-300 rounded-sm text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500 h-7 w-36" />
                        </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-700 w-24 text-right shrink-0">{isSubledger ? 'Sabhasad :' : 'Narration :'}</label>
                        {/* Code box — small, auto-fills name on change */}
                        <input
                           type="text"
                           value={deductionPayload.sabhasad_code || ''}
                           onChange={async (e) => {
                              const code = e.target.value;
                              let match = null;
                              if (isSubledger) {
                                 match = members.find(m => String(m.member_code) === String(code));
                              } else {
                                 match = narrations.find(n => String(n.narration_code) === String(code));
                              }

                              setDeductionPayload(p => ({
                                 ...p,
                                 sabhasad_code: code,
                                 sabhasad_name: match ? (isSubledger ? match.member_name : match.narration_text) : '',
                                 sabhasad_id: match && isSubledger ? match.id : null
                              }));

                              if (match && isSubledger) {
                                 preloadIdentityInsights(selectedIdentities, match.id);
                              }
                           }}
                           className="w-20 px-2 bg-white border border-slate-300 rounded-sm text-xs font-mono font-black text-slate-800 outline-none focus:border-blue-500 h-7 text-center"
                           placeholder="Code"
                        />
                        {/* Name box — auto-filled, editable */}
                        <input
                           type="text"
                           value={deductionPayload.sabhasad_name || ''}
                           onChange={e => setDeductionPayload(p => ({ ...p, sabhasad_name: e.target.value }))}
                           className="flex-1 px-2 bg-white border border-slate-300 rounded-sm text-xs font-bold text-slate-800 outline-none focus:border-blue-500 h-7"
                           placeholder={isSubledger ? "Member Name" : "Narration / Description"}
                        />
                     </div>
                  </div>

                  {/* Account Stats Summary */}
                  {deductionPayload.target_identifier && deductionPayload.target_identifier.startsWith('account-') && (
                     <div className="bg-blue-50 border-b-2 border-slate-300 px-4 py-2 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-black text-slate-500 uppercase">From:</span>
                           <input type="date" value={accountStatsRange.startDate}
                              onChange={e => setAccountStatsRange(p => ({ ...p, startDate: e.target.value }))}
                              className="px-2 py-0.5 bg-white border border-slate-300 rounded-sm text-[10px] font-bold text-slate-800 outline-none focus:border-blue-500" />
                           <span className="text-[10px] font-black text-slate-500 uppercase">To:</span>
                           <input type="date" value={accountStatsRange.endDate}
                              onChange={e => setAccountStatsRange(p => ({ ...p, endDate: e.target.value }))}
                              className="px-2 py-0.5 bg-white border border-slate-300 rounded-sm text-[10px] font-bold text-slate-800 outline-none focus:border-blue-500" />
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-mono font-black">
                           <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100/50 border border-emerald-200 rounded">
                              <span className="text-emerald-700 uppercase">Total Credited (Jama):</span>
                              <span className="text-emerald-900">{parseFloat(activeAccountStats.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                           </div>
                           <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-100/50 border border-rose-200 rounded">
                              <span className="text-rose-700 uppercase">Total Debited (Udhar):</span>
                              <span className="text-rose-900">{parseFloat(activeAccountStats.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                           </div>
                           <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-100/50 border border-blue-200 rounded">
                              <span className="text-blue-700 uppercase">Remaining Balance:</span>
                              <span className="text-blue-900 text-[11px]">{parseFloat(activeAccountStats.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Table */}
                  <div className="flex flex-col overflow-hidden flex-1" style={{ minHeight: 0 }}>
                     {/* Header */}
                     <div className="grid shrink-0 border-b-2 border-slate-400 bg-slate-200"
                        style={{ gridTemplateColumns: '36px 72px 1fr 110px 100px' }}>
                        {['No.', 'Code', 'Account Name', 'Balance', 'Amount'].map((h, i) => (
                           <div key={h} className={`py-1.5 text-[10px] font-black text-slate-700 uppercase ${i < 4 ? 'border-r border-slate-400' : ''} ${i >= 2 ? 'text-right px-3' : 'text-center'}`}>{h}</div>
                        ))}
                     </div>

                     {/* Body */}
                     <div className="overflow-y-auto flex-1 bg-white">
                        {selectedIdentities.length === 0 ? (
                           <div className="py-10 text-center text-xs text-slate-400 font-bold">No members added to deduction list.</div>
                        ) : selectedIdentities.map((item, idx) => {
                           const key = `${item.type}-${item.id}`;
                           const isActive = key === deductionPayload.target_identifier;
                           const bal = Number(item.total_debit || 0) - Number(item.total_credit || 0);
                           const deducted = parseFloat(item.deduction_amount) || 0;
                           const closing = bal - deducted;
                           return (
                              <div key={key}
                                 onClick={async () => {
                                    setDeductionPayload(p => ({
                                       ...p,
                                       target_identifier: key
                                    }));
                                 }}
                                 className={`grid border-b border-slate-200 cursor-pointer transition-colors ${isActive ? 'bg-blue-600' : idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50 hover:bg-blue-50'}`}
                                 style={{ gridTemplateColumns: '36px 72px 1fr 110px 100px' }}>
                                 <div className={`border-r py-1.5 text-center text-[11px] font-bold ${isActive ? 'border-blue-500 text-blue-100' : 'border-slate-200 text-slate-400'}`}>{idx + 1}</div>
                                 <div className={`border-r py-1.5 text-center text-[11px] font-mono font-black ${isActive ? 'border-blue-500 text-white' : 'border-slate-200 text-slate-700'}`}>{String(item.code || '').padStart(4, '0')}</div>
                                 <div className={`border-r px-3 py-1.5 text-[11px] font-bold truncate ${isActive ? 'border-blue-500 text-white' : 'border-slate-200 text-slate-800'}`}>{item.name}</div>
                                 <div className={`border-r px-3 py-1.5 flex items-center justify-end ${isActive ? 'border-blue-500' : 'border-slate-200'}`}>
                                    <div className={`text-[12px] font-mono font-black ${isActive ? 'text-white' : bal < 0 ? 'text-rose-600' : bal > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                       {bal > 0 ? '+' : bal < 0 ? '-' : ''}{Math.abs(bal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                 </div>
                                 <div className="px-2 py-0.5 flex items-center" onClick={e => e.stopPropagation()}>
                                    <input type="number" value={item.deduction_amount || ''}
                                       onChange={e => handleUpdateTargetAmount(item.type, item.id, e.target.value)}
                                       className="w-full bg-white border border-slate-300 rounded-sm px-1.5 py-0.5 text-right font-mono font-black text-xs text-slate-900 outline-none focus:border-blue-600"
                                       placeholder="0.00" />
                                 </div>
                              </div>
                           );
                        })}
                     </div>

                     {/* Total footer */}
                     <div className="border-t-2 border-slate-400 bg-slate-100 shrink-0 flex items-center justify-between px-4 py-1.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{selectedIdentities.length} member(s)</span>
                        <div className="flex items-center gap-3">
                           <span className="text-[11px] font-black text-slate-600 uppercase">Total Amount :</span>
                           <span className="text-sm font-black font-mono text-slate-900 bg-white border border-slate-400 px-4 py-0.5 rounded-sm min-w-[100px] text-right">
                              {Number(totalDeductionAmount).toFixed(2)}
                           </span>
                        </div>
                     </div>
                  </div>

                  {/* Action buttons */}
                  <div className="bg-slate-100 border-t-2 border-slate-300 px-4 py-2 flex justify-end items-center gap-2 shrink-0">
                     <button onClick={() => setShowDeductionModal(false)} className="px-5 py-1.5 bg-white border border-slate-400 text-slate-700 text-xs font-bold rounded-sm hover:bg-slate-200 transition-colors">Cancel</button>
                     <button onClick={handleExecuteBatch} disabled={loading} className="px-8 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-sm hover:bg-blue-700 transition-colors disabled:opacity-60">
                        {loading ? 'Saving...' : 'Save'}
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* ── TARGET SELECTOR MODAL ── */}
         {showMembersModal && (
            <div className="fixed inset-0 z-[100] flex justify-center items-center p-6 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowMembersModal(false)}>
               <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-slate-200" onClick={e => e.stopPropagation()}>
                  <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                     <h2 className="text-xl font-bold tracking-tight">Identity Matrix Selector</h2>
                     <button onClick={() => setShowMembersModal(false)} className="text-slate-300 hover:text-white"><X size={18} /></button>
                  </div>
                  <div className="p-6 bg-white border-b border-slate-200 space-y-4">
                     <input type="text" placeholder="Search Identity..." value={identitySearch}
                        onChange={e => setIdentitySearch(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500" />
                     <div className="flex gap-2">
                        <button onClick={() => setIdentityTab('sabhasad')} className={`flex-1 py-3 text-xs font-bold rounded-xl ${identityTab === 'sabhasad' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Members</button>
                        <button onClick={() => setIdentityTab('account')} className={`flex-1 py-3 text-xs font-bold rounded-xl ${identityTab === 'account' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Ledgers</button>
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-3 bg-slate-50">
                     {identityTab === 'sabhasad' ? (
                        members.filter(m => String(m.member_code).includes(identitySearch) || m.member_name.toLowerCase().includes(identitySearch.toLowerCase())).map(m => {
                           const isSel = selectedIdentities.some(i => i.id === m.id && i.type === 'member');
                           return (
                              <div key={m.id} onClick={() => toggleIdentitySelection(m.id, 'member', m.member_name, m.member_code)}
                                 className={`p-4 bg-white border rounded-xl cursor-pointer flex items-center gap-4 ${isSel ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'}`}>
                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSel ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300'}`}><CheckCircle size={16} /></div>
                                 <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold truncate">{m.member_name}</h3>
                                    <span className="text-[10px] font-black text-slate-400 font-mono">#{m.member_code}</span>
                                 </div>
                              </div>
                           );
                        })
                     ) : (
                        accounts.filter(a => a.is_subledger === 1 && a.account_name.toLowerCase().includes(identitySearch.toLowerCase())).map(a => {
                           const isSel = selectedIdentities.some(i => i.id === a.id && i.type === 'account');
                           return (
                              <div key={a.id} onClick={() => toggleIdentitySelection(a.id, 'account', a.account_name, a.account_code || a.id)}
                                 className={`p-4 bg-white border rounded-xl cursor-pointer flex items-center gap-4 ${isSel ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'}`}>
                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSel ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}><CheckCircle size={16} /></div>
                                 <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-bold truncate">{a.account_name}</h3>
                                    <span className="text-[10px] font-black text-slate-400 font-mono">#{a.account_code || a.id}</span>
                                 </div>
                              </div>
                           );
                        })
                     )}
                  </div>
                  <div className="p-6 bg-white border-t border-slate-200">
                     <button onClick={confirmSelection} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-3">
                        Confirm Selection <ArrowRight size={18} />
                     </button>
                  </div>
               </div>
            </div>
         )}

         <style dangerouslySetInnerHTML={{
            __html: `
        .overflow-y-auto::-webkit-scrollbar { width: 6px; }
        .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
        .overflow-y-auto::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
        .overflow-y-auto:hover::-webkit-scrollbar-thumb { background: #CBD5E1; }
      ` }} />
      </div>
   );
}
