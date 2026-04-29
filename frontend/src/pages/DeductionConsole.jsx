import React, { useState, useEffect } from 'react';
import { Plus, X, Database, Layout, CheckCircle, UserCheck, ArrowRight, User, TrendingUp } from 'lucide-react';

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
   const [isSmartFilling, setIsSmartFilling] = useState(false);

   const [accountStatsRange, setAccountStatsRange] = useState({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
   });
   const [activeAccountStats, setActiveAccountStats] = useState({ total_debit: 0, total_credit: 0, balance: 0 });

   useEffect(() => {
      if (deductionPayload.target_identifier && deductionPayload.target_identifier.startsWith('account-')) {
         const accId = deductionPayload.target_identifier.split('-')[1];
         api.get(`/account-ledger/account-stats/${accId}`, {
            params: { ...accountStatsRange, endDate: deductionPayload.date, memberId: deductionPayload.sabhasad_id }
         })
            .then(res => {
               if (res.data.success) {
                  const stats = res.data.data;
                  setActiveAccountStats(stats);

                  if (stats.total_interest > 0) {
                     setSelectedIdentities(prev => prev.map(item => {
                        if (item.code === 'IK0001') {
                           return {
                              ...item,
                              total_debit: (parseFloat(item.total_debit) || 0) + stats.total_interest,
                              total_interest: stats.total_interest,
                              deduction_amount: item.deduction_amount || stats.total_interest.toFixed(2)
                           };
                        }
                        return item;
                     }));
                  }
               }
            })
            .catch(console.error);
      } else {
         setActiveAccountStats({ total_debit: 0, total_credit: 0, balance: 0 });
      }
   }, [deductionPayload.target_identifier, accountStatsRange.startDate, deductionPayload.date, deductionPayload.sabhasad_id]);

   useEffect(() => { loadIdentities(); }, []);

   const loadIdentities = async () => {
      try {
         setLoading(true);
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
      try {
         if (type === 'account' && sabhasadId) {
            const res = await api.get(`/account-ledger/account-stats/${id}`, {
               params: { memberId: sabhasadId, endDate: deductionPayload.date }
            });
            if (res.data.success && res.data.data) {
               return {
                  total_debit: parseFloat(res.data.data.total_debit || 0),
                  total_credit: parseFloat(res.data.data.total_credit || 0),
                  total_interest: parseFloat(res.data.data.total_interest || 0),
                  balance: parseFloat(res.data.data.balance || 0)
               };


            }
         } else {
            const res = await api.get(`/accounts/${type === 'member' ? 'M' + id : id}/balance`);
            if (res.data.success) {
               return {
                  total_debit: parseFloat(res.data.data.total_debit || 0),
                  total_credit: parseFloat(res.data.data.total_credit || 0),
                  balance: parseFloat(res.data.data.balance || 0)
               };


            }
         }
      } catch (e) { console.error(e); }
      return { total_debit: 0, total_credit: 0, balance: 0 };
   };

   const preloadIdentityInsights = async (identities, sabhasadId = null) => {
      const rows = identities || [];
      if (!rows.length) return rows;
      try {
         const results = await Promise.all(rows.map(async (item) => {
            const metrics = await fetchIdentityBalance(item.type, item.id, sabhasadId);
            return { type: item.type, id: item.id, metrics };
         }));
         console.log(`[preloadIdentityInsights] Results:`, results);
         const updated = rows.map(item => {
            const match = results.find(r => r.type === item.type && r.id === item.id);
            return match ? { ...item, ...match.metrics } : item;
         });
         setSelectedIdentities(updated);
         return updated;
      } catch (e) {
         console.error(e);
         return rows;
      }
   };

   const handleUpdateTargetAmount = (type, id, value) => {
      setSelectedIdentities(prev => prev.map(item =>
         (item.type === type && item.id === id) ? { ...item, deduction_amount: value } : item
      ));
   };

   const totalDeductionAmount = selectedIdentities.reduce((sum, item) => sum + (parseFloat(item.deduction_amount) || 0), 0);

   const removeIdentity = async (id, type) => {
      try {
         setSelectedIdentities(selectedIdentities.filter(i => !(i.id === id && i.type === type)));
         await api.delete(`/deductions/targets/${type}/${id}`);
      } catch (e) { console.error(e); }
   };

   const toggleIdentitySelection = (id, type, name, code) => {
      setSelectedIdentities(prev => {
         const exists = prev.find(i => i.id === id && i.type === type);
         if (exists) return prev.filter(i => !(i.id === id && i.type === type));
         return [...prev, { id, type, name, code, deduction_amount: '' }];
      });
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

         <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                  <Database size={24} />
               </div>
               <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Kapat Console</h1>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">Automated Deduction Extraction</p>
               </div>
            </div>
            <div className="flex gap-3">
               <button
                  onClick={async () => {
                     setIsSmartFilling(true);
                     try {
                        if (!deductionPayload.sabhasad_id) {
                           if (!window.confirm('Global Scan: Automatically find all members with outstanding balances in the matrix accounts?')) {
                              setIsSmartFilling(false);
                              return;
                           }
                           const ledgerAccounts = selectedIdentities.filter(i => i.type === 'account');
                           if (ledgerAccounts.length === 0) {
                              alert('Please add at least one account (e.g. Adv A/C) to the matrix first.');
                              setIsSmartFilling(false);
                              return;
                           }
                           const globalRes = await api.get('/account-ledger/global-balances', {
                              params: {
                                 accountIds: ledgerAccounts.map(a => a.id).join(','),
                                 endDate: deductionPayload.date
                              }
                           });
                           if (globalRes.data.success) {
                              const memberBalances = globalRes.data.data;
                              const membersToAdd = [];
                              memberBalances.forEach(mb => {
                                 if (Math.abs(mb.balance) > 0.01) {
                                    const member = members.find(m => m.id === mb.member_id);
                                    if (member) {
                                       membersToAdd.push({
                                          id: member.id,
                                          type: 'member',
                                          name: member.member_name,
                                          code: member.member_code,
                                          deduction_amount: Math.abs(mb.balance).toFixed(2)
                                       });
                                    }
                                 }
                              });
                              if (membersToAdd.length === 0) {
                                 alert('No members with outstanding balances found for the selected accounts.');
                              } else {
                                 setSelectedIdentities(prev => {
                                    const existingIds = new Set(prev.map(p => `${p.type}-${p.id}`));
                                    const filteredNew = membersToAdd.filter(m => !existingIds.has(`${m.type}-${m.id}`));
                                    return [...prev, ...filteredNew];
                                 });
                                 alert(`Auto Mode: Added ${membersToAdd.length} members with pending balances.`);
                              }
                           }
                        } else {
                           const freshIdentities = await preloadIdentityInsights(selectedIdentities, deductionPayload.sabhasad_id);
                           setSelectedIdentities(freshIdentities.map(item => {
                              if (item.code === 'IK0001' && item.total_interest > 0) {
                                 return { ...item, deduction_amount: item.total_interest.toFixed(2) };
                              }
                              const udhar = parseFloat(item.total_debit) || 0;
                              const jama = parseFloat(item.total_credit) || 0;
                              const bal = jama - udhar;
                              if (bal < 0) {
                                 return { ...item, deduction_amount: Math.abs(bal).toFixed(2) };
                              }
                              return item;
                           }));
                        }
                     } catch (err) {
                        console.error('Smart Fill failed:', err);
                        alert('Smart Fill operation failed. Check console for details.');
                     } finally {
                        setIsSmartFilling(false);
                     }
                  }}
                  disabled={isSmartFilling}
                  className="px-6 py-3 bg-white text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors font-semibold text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
               >
                  {isSmartFilling ? (
                     <>
                        <div className="w-4 h-4 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                     </>
                  ) : (
                     <>
                        <TrendingUp size={16} /> Smart Fill
                     </>
                  )}
               </button>
               <button onClick={() => setShowMembersModal(true)} className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-sm flex items-center gap-2 shadow-sm">
                  <Plus size={16} /> Add Targets
               </button>
               <button
                  onClick={() => { setDeductionPayload(prev => ({ ...prev, target_identifier: 'all' })); setShowDeductionModal(true); preloadIdentityInsights(selectedIdentities); }}
                  disabled={selectedIdentities.length === 0}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
               >
                  <Database size={16} /> Process Kapat
               </button>
            </div>
         </div>


         {selectedIdentities.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
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
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-16 flex flex-col items-center justify-center">
               <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 mb-4"><Database size={28} /></div>
               <p className="text-sm font-medium text-slate-500">No identities added to matrix.</p>
            </div>
         )}
      </div>

      {showDeductionModal && (
         <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeductionModal(false)} />
            <div className="relative w-full max-w-3xl bg-white shadow-2xl flex flex-col border-2 border-slate-400 rounded-sm" style={{ maxHeight: '90vh' }}>

               <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white px-3 py-1.5 flex justify-between items-center shrink-0">
                  <span className="text-xs font-bold tracking-wide">Kapat Entry</span>
                  <button onClick={() => setShowDeductionModal(false)} className="w-5 h-5 bg-white/20 hover:bg-red-500 flex items-center justify-center rounded-sm text-xs font-black transition-colors">X</button>
               </div>

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
                     <input
                        type="text"
                        value={deductionPayload.sabhasad_name || ''}
                        onChange={e => setDeductionPayload(p => ({ ...p, sabhasad_name: e.target.value }))}
                        className="flex-1 px-2 bg-white border border-slate-300 rounded-sm text-xs font-bold text-slate-800 outline-none focus:border-blue-500 h-7"
                        placeholder={isSubledger ? "Member Name" : "Narration / Description"}
                     />
                  </div>
               </div>

               {deductionPayload.target_identifier && (
                  <div className="bg-slate-50 border-b border-slate-300 px-3 py-2 flex items-center justify-between shrink-0 gap-2">
                     <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-0.5">
                           <span className="text-[9px] font-black text-slate-400 uppercase">From:</span>
                           <input type="date" value={accountStatsRange.startDate}
                              onChange={e => setAccountStatsRange(p => ({ ...p, startDate: e.target.value }))}
                              className="bg-transparent border-none text-[10px] font-bold text-slate-800 outline-none w-20" />
                        </div>
                        <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-0.5">
                           <span className="text-[9px] font-black text-slate-400 uppercase">To:</span>
                           <input type="date" value={accountStatsRange.endDate}
                              onChange={e => setAccountStatsRange(p => ({ ...p, endDate: e.target.value }))}
                              className="bg-transparent border-none text-[10px] font-bold text-slate-800 outline-none w-20" />
                        </div>
                     </div>
                     <div className="flex items-center gap-2 text-[10px] font-mono font-black">
                        <div className="flex flex-col items-end px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded min-w-[80px]">
                           <span className="text-emerald-700 text-[8px] uppercase leading-none mb-0.5">Jama</span>
                           <span className="text-emerald-900 leading-none">{parseFloat(activeAccountStats.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex flex-col items-end px-2 py-0.5 bg-rose-50 border border-rose-200 rounded min-w-[80px]">
                           <span className="text-rose-700 text-[8px] uppercase leading-none mb-0.5">Total Udhar</span>
                           <span className="text-rose-900 leading-none">{parseFloat(activeAccountStats.net_debit || activeAccountStats.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex flex-col items-end px-3 py-0.5 bg-blue-600 border border-blue-700 rounded shadow-sm min-w-[120px]">
                           <span className="text-blue-100 text-[8px] uppercase leading-none mb-0.5">Remaining Bal.</span>
                           <span className="text-white text-[11px] leading-none">
                              {parseFloat(activeAccountStats.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                           </span>
                           {parseFloat(activeAccountStats.total_interest || 0) !== 0 && (
                              <span className="text-[7px] text-blue-200 mt-0.5 font-bold italic leading-none">
                                 Interest: {parseFloat(activeAccountStats.total_interest).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                           )}
                        </div>
                     </div>
                  </div>
               )}

               <div className="flex flex-col overflow-hidden flex-1" style={{ minHeight: 0 }}>
                  <div className="grid shrink-0 border-b-2 border-slate-400 bg-slate-200"
                     style={{ gridTemplateColumns: '36px 72px 1fr 110px 100px' }}>
                     {['No.', 'Code', 'Account Name', 'Balance', 'Amount'].map((h, i) => (
                        <div key={h} className={`py-1.5 text-[10px] font-black text-slate-700 uppercase ${i < 4 ? 'border-r border-slate-400' : ''} ${i >= 2 ? 'text-right px-3' : 'text-center'}`}>{h}</div>
                     ))}
                  </div>

                  <div className="overflow-y-auto flex-1 bg-white">
                     {selectedIdentities.length === 0 ? (
                        <div className="py-10 text-center text-xs text-slate-400 font-bold">No members added to deduction list.</div>
                     ) : selectedIdentities.map((item, idx) => {
                        const key = `${item.type}-${item.id}`;
                        const isActive = key === deductionPayload.target_identifier;
                        const bal = Number(item.total_credit || 0) - Number(item.total_debit || 0);
                        const deducted = parseFloat(item.deduction_amount) || 0;
                        const closing = bal + deducted;

                        return (
                           <div key={key}
                              onClick={async () => {
                                 setDeductionPayload(p => ({ ...p, target_identifier: key }));
                                 if (!item.deduction_amount || parseFloat(item.deduction_amount) === 0) {
                                    const bal = Number(item.total_credit || 0) - Number(item.total_debit || 0);
                                    handleUpdateTargetAmount(item.type, item.id, Math.abs(bal).toFixed(2));
                                 }
                              }}
                              className={`grid border-b border-slate-200 cursor-pointer transition-colors ${isActive ? 'bg-blue-600' : idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-slate-50 hover:bg-blue-50'}`}
                              style={{ gridTemplateColumns: '36px 72px 1fr 110px 100px' }}>
                              <div className={`border-r py-1.5 text-center text-[11px] font-bold ${isActive ? 'border-blue-500 text-blue-100' : 'border-slate-200 text-slate-400'}`}>{idx + 1}</div>
                              <div className={`border-r py-1.5 text-center text-[11px] font-mono font-black ${isActive ? 'border-blue-500 text-white' : 'border-slate-200 text-slate-700'}`}>{String(item.code || '').padStart(4, '0')}</div>
                              <div className={`border-r px-3 py-1.5 text-[11px] font-bold truncate ${isActive ? 'border-blue-500 text-white' : 'border-slate-200 text-slate-800'}`}>{item.name}</div>
                              <div className={`border-r px-3 py-1.5 flex flex-col items-end justify-center ${isActive ? 'border-blue-500' : 'border-slate-200'}`}>
                                 {isActive && (
                                    <>
                                       <div className={`text-[11px] font-mono font-black ${isActive ? 'text-white' : bal < 0 ? 'text-rose-600' : bal > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                          {bal > 0 ? '+' : bal < 0 ? '-' : ''}{Math.abs(bal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                       </div>
                                       {deducted !== 0 && Math.abs(closing) > 0.01 && (
                                          <div className={`text-[10px] font-mono font-black italic mt-0.5 ${isActive ? 'text-blue-100' :
                                             closing < 0 ? 'text-rose-600' :
                                                closing > 0 ? 'text-emerald-600' : 'text-slate-400'
                                             }`}>
                                             {closing > 0 ? '+' : closing < 0 ? '-' : ''}{Math.abs(closing).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                          </div>
                                       )}
                                    </>
                                 )}
                              </div>
                              <div className="px-2 py-0.5 flex items-center" onClick={e => e.stopPropagation()}>
                                 {(isActive || deducted !== 0) && (
                                    <input type="number" value={item.deduction_amount || ''}
                                       onChange={e => handleUpdateTargetAmount(item.type, item.id, e.target.value)}
                                       className={`w-full rounded-sm px-1.5 py-0.5 text-right font-mono font-black text-xs outline-none ${isActive ? 'bg-white text-slate-900' : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'}`}
                                       placeholder="0.00" />
                                 )}
                              </div>
                           </div>
                        );
                     })}
                  </div>

                  <div className="border-t-2 border-slate-400 bg-slate-100 shrink-0 flex items-center justify-end px-4 py-1.5">
                     <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-slate-600 uppercase">Total Money :</span>
                        <span className="text-sm font-black font-mono text-slate-900 bg-white border border-slate-400 px-4 py-0.5 rounded-sm min-w-[100px] text-right">
                           {Number(totalDeductionAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                     </div>
                  </div>
               </div>

               <div className="bg-slate-200 p-3 flex justify-between items-center shrink-0">
                  <div className="flex gap-2">
                     <button onClick={handleExecuteBatch} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-sm shadow-sm transition-colors flex items-center gap-2">
                        <CheckCircle size={14} /> SAVE & POST
                     </button>
                     <button onClick={() => setShowDeductionModal(false)} className="px-6 py-2 bg-slate-500 hover:bg-slate-600 text-white text-xs font-black rounded-sm shadow-sm transition-colors">CANCEL</button>
                  </div>
                  <div className="text-[10px] font-black text-slate-500 italic uppercase">System ready for commit</div>
               </div>
            </div>
         </div>
      )}

      {showMembersModal && (
         <div className="fixed inset-0 z-[110] flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMembersModal(false)} />
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div>
                     <h3 className="text-lg font-bold text-slate-900">Add Targets</h3>
                     <p className="text-xs font-medium text-slate-500">Select accounts or members for matrix</p>
                  </div>
                  <button onClick={() => setShowMembersModal(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><X size={20} /></button>
               </div>
               <div className="p-6 flex gap-2 border-b border-slate-100">
                  <button onClick={() => setIdentityTab('sabhasad')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${identityTab === 'sabhasad' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Members</button>
                  <button onClick={() => setIdentityTab('account')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${identityTab === 'account' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Accounts</button>
               </div>
               <div className="p-4 flex-1 overflow-y-auto max-h-[400px]">
                  <div className="space-y-1">
                     {(identityTab === 'sabhasad' ? members : accounts).map(idnt => {
                        const id = idnt.id;
                        const name = identityTab === 'sabhasad' ? idnt.member_name : idnt.account_name;
                        const code = identityTab === 'sabhasad' ? idnt.member_code : (idnt.account_code || idnt.id);
                        const isSelected = selectedIdentities.find(i => i.id === id && i.type === identityTab);
                        return (
                           <div key={id} onClick={() => toggleIdentitySelection(id, identityTab, name, code)} className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent'}`}>
                              <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                                    {isSelected ? <CheckCircle size={16} /> : (identityTab === 'sabhasad' ? <User size={16} /> : <Layout size={16} />)}
                                 </div>
                                 <div>
                                    <p className="text-sm font-bold text-slate-800">{name}</p>
                                    <p className="text-[10px] font-mono text-slate-500 italic">#{code}</p>
                                 </div>
                              </div>
                              {isSelected && <ArrowRight size={16} className="text-blue-500" />}
                           </div>
                        );
                     })}
                  </div>
               </div>
               <div className="p-6 bg-slate-50 flex gap-3">
                  <button onClick={confirmSelection} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">Confirm & Sync</button>
               </div>
            </div>
         </div>
      )}
   </div>
);
}
