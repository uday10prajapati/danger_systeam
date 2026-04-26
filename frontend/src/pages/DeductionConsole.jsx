import React, { useState, useEffect } from 'react';
import { Plus, X, Search, Database, Layout, CheckCircle, UserCheck, ArrowRight, User } from 'lucide-react';
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

  // Deduction Processing State
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [deductionPayload, setDeductionPayload] = useState({
     date: new Date().toISOString().split('T')[0],
     master_id: '',
     remark: '',
     global_amount: '',
     target_identifier: ''
  });

  const [manualDeductions, setManualDeductions] = useState([]);
  const [modalSearch, setModalSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    loadIdentities();
  }, []);

  const loadIdentities = async () => {
    try {
      setLoading(true);
      const companyRes = await api.get('/company');
      const compId = companyRes.data?.data?.id || 1;
      
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
      if (targetsRes.data && targetsRes.data.success) {
         setSelectedIdentities(targetsRes.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchIdentityBalance = async (type, id) => {
    try {
      // Use the generic balance endpoint
      const res = await api.get(`/accounts/${type === 'member' ? 'M'+id : id}/balance`);
      
      if (res.data.success) {
         const data = res.data.data;
         return {
            total_debit: parseFloat(data.total_debit || 0),
            total_credit: parseFloat(data.total_credit || 0),
         };
      }
    } catch (e) {
      console.error(`Failed to fetch identity balance for ${type} ${id}`, e);
    }
    return { total_debit: 0, total_credit: 0 };
  };

   const preloadIdentityInsights = async (identities) => {
      const rows = identities || [];
      if (rows.length === 0) return;

      try {
         const results = await Promise.all(rows.map(async (item) => {
            const metrics = await fetchIdentityBalance(item.type, item.id);

            return {
               type: item.type,
               id: item.id,
               metrics
            };
         }));

         setSelectedIdentities(prev => prev.map(item => {
            const match = results.find(r => r.type === item.type && r.id === item.id);
            return match ? { ...item, ...match.metrics } : item;
         }));
      } catch (e) {
         console.error('Failed to preload identity insights', e);
      }
   };

   const updateTargetField = (type, id, field, value) => {
      setSelectedIdentities(prev => prev.map(item => 
         (item.type === type && item.id === id) ? { ...item, [field]: value } : item
      ));
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

  const handleVoidClick = (e) => {
    if (e.target === e.currentTarget) {
       setDeductionPayload(prev => ({ ...prev, target_identifier: '' }));
       setIsDropdownOpen(false);
       setModalSearch('');
    }
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
    } catch (e) {
      console.error('Failed to remove target', e);
    }
  };

  const confirmSelection = async () => {
    try {
      setLoading(true);
      const syncRes = await api.post('/deductions/targets/sync', { identities: selectedIdentities });
      if (syncRes.data.success) {
         const targetsRes = await api.get('/deductions/targets');
         if (targetsRes.data && targetsRes.data.success) {
            setSelectedIdentities(targetsRes.data.data);
            setDeductionPayload(prev => ({...prev, target_identifier: 'all'}));
         }
      }
    } catch (e) {
      console.error('Sync error', e);
    } finally {
      setLoading(false);
      setShowMembersModal(false);
    }
  };

  const handleExecuteBatch = async () => {
    try {
      setLoading(true);
      const res = await api.post('/deductions/execute-batch', {
        ...deductionPayload,
        manualDeductions,
        identities: selectedIdentities
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

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Main Header */}
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
             <button 
               onClick={() => setShowMembersModal(true)}
               className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-sm flex items-center gap-2 shadow-sm"
             >
               <Plus size={16} /> Add Targets
             </button>
             <button 
               onClick={() => {
                  setDeductionPayload(prev => ({
                     ...prev, 
                     target_identifier: selectedIdentities.length > 0 ? `${selectedIdentities[0].type}-${selectedIdentities[0].id}` : 'all'
                  }));
                  setShowDeductionModal(true);
                  preloadIdentityInsights(selectedIdentities);
               }}
               disabled={selectedIdentities.length === 0}
               className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
             >
               <Database size={16} /> Process Kapat
             </button>
          </div>
        </div>

        {/* Matrix Registry */}
        {selectedIdentities.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                   <UserCheck className="text-blue-600" size={18}/> Extraction Matrix
                </h2>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-md">{selectedIdentities.length} Targets</span>
             </div>
             
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                         <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                         <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                         <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Identifier</th>
                         <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Position Balance</th>
                         <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Action</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {selectedIdentities.map((item) => (
                         <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                               <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${item.type === 'member' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                  {item.type === 'member' ? <User size={12}/> : <Layout size={12}/>}
                                  {item.type === 'member' ? 'Member' : 'Account'}
                               </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                            <td className="px-6 py-4 text-sm text-slate-500 font-mono italic">#{item.code}</td>
                            <td className="px-6 py-4 text-right text-sm font-black text-slate-900">
                               ₹{Number((item.total_credit || 0) - (item.total_debit || 0)).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right">
                               <button onClick={() => removeIdentity(item.id, item.type)} className="p-2 text-slate-400 hover: Rose-600 rounded-lg transition-colors"><X size={16} /></button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 mb-4"><Database size={28}/></div>
             <p className="text-sm font-medium text-slate-500">No identities added to matrix.</p>
          </div>
        )}
      </div>

      {/* DEDUCTION EXECUTION MODAL (SIDE-BY-SIDE LEDGER AUDIT) */}
      {showDeductionModal && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDeductionModal(false)}></div>
           <div 
             onClick={handleVoidClick}
             className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col h-[85vh] border border-slate-200"
            >
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center relative shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                       <Database size={20} />
                    </div>
                    <div>
                       <h2 className="text-lg font-black tracking-tight leading-none uppercase italic">કપાત એન્ટ્રી (Deduction Entry)</h2>
                       <p className="text-[10px] font-bold text-indigo-400 mt-1 uppercase tracking-widest tracking-tighter">Unified Extraction Console • Account Ledger Sync</p>
                    </div>
                 </div>
                 <button onClick={() => setShowDeductionModal(false)} className="w-10 h-10 bg-white/10 hover:bg-rose-500 rounded-lg flex items-center justify-center transition-colors text-white"><X size={18} /></button>
              </div>

              <div className="p-6 bg-slate-50 flex-1 overflow-y-auto space-y-6">
                 {/* Unified Extraction Parameters */}
                 <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Deduction Rule (કપાતનો પ્રકાર):</label>
                          <select 
                            value={deductionPayload.master_id}
                            onChange={async (e) => {
                               const mid = e.target.value;
                               setDeductionPayload(prev => ({ ...prev, master_id: mid }));
                               
                               // Find ledger account for this rule to refresh balances in context
                               const rule = deductionRules.find(r => String(r.id) === String(mid));
                               if (rule && rule.ledger_account_id) {
                                  setLoading(true);
                                  const updated = await Promise.all(selectedIdentities.map(async (item) => {
                                     try {
                                        const res = await api.get(`/deductions/balance/${item.type}/${item.id}/${rule.ledger_account_id}`);
                                        if (res.data.success) {
                                           return { ...item, total_debit: res.data.total_debit, total_credit: res.data.total_credit };
                                        }
                                     } catch(err) { console.error(err); }
                                     return item;
                                  }));
                                  setSelectedIdentities(updated);
                                  setLoading(false);
                               }
                            }}
                            className="w-full px-4 py-2 bg-white border border-slate-300 rounded text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 shadow-inner"
                          >
                             <option value="">Select Deduction Rule...</option>
                             {deductionRules.map(rule => (
                                <option key={rule.id} value={rule.id}>{rule.name} ({rule.account_name})</option>
                             ))}
                          </select>
                       </div>
                       <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Operation Date:</label>
                          <input 
                            type="date"
                            value={deductionPayload.date}
                            onChange={(e) => setDeductionPayload({...deductionPayload, date: e.target.value})}
                            className="w-full px-4 py-1.5 bg-white border border-slate-300 rounded text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 font-mono h-[38px]"
                          />
                       </div>
                    </div>

                    <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-4">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Remark (શેરો):</label>
                       <input 
                         type="text"
                         value={deductionPayload.remark}
                         placeholder="Describe this batch operation..."
                         onChange={(e) => setDeductionPayload({...deductionPayload, remark: e.target.value})}
                         className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
                       />
                    </div>
                 </div>

                 {/* COMBINED EXTRACTION + AUDIT TABLE */}
                 <div className="bg-white border-2 border-slate-300 rounded overflow-hidden flex flex-col shadow-xl shadow-blue-900/5 h-[420px]">
                    <div className="bg-slate-800 text-white px-4 py-1.5 text-[10px] font-black flex justify-between items-center border-b border-slate-300">
                       <span className="uppercase tracking-widest flex items-center gap-2">
                          <UserCheck size={14} className="text-blue-300"/> Extraction Matrix + Audit Ledger (સભાસદ કપાત યાદી + ખાતાની વિગત)
                       </span>
                    </div>

                    <div className="flex-1 overflow-y-auto scroller-airy bg-slate-50">
                       <table className="w-full border-collapse">
                          <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                             <tr className="text-[10px] font-black uppercase text-slate-600 border-b border-slate-300">
                                <th className="w-10 border-r border-slate-300 py-2">No.</th>
                                <th className="w-20 border-r border-slate-300 text-center">Code</th>
                                <th className="px-4 border-r border-slate-300 text-left">Identity</th>
                                <th className="w-48 border-r border-slate-300 text-right px-4">Balance</th>
                                <th className="w-32 text-right px-4">Amount</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                             {selectedIdentities.map((item, idx) => {
                                const key = `${item.type}-${item.id}`;
                                const isSelected = key === deductionPayload.target_identifier;
                                const totalDebit = Number(item.total_debit || 0);
                                const totalCredit = Number(item.total_credit || 0);
                                const currentBalance = totalCredit - totalDebit;

                                return (
                                   <tr
                                     key={key}
                                     onClick={async () => {
                                       setDeductionPayload({ ...deductionPayload, target_identifier: key });
                                       
                                       // Fetch balance for the specific account of this deduction rule
                                       const ruleId = deductionPayload.master_id;
                                       const rule = deductionRules.find(r => String(r.id) === String(ruleId));
                                       
                                       if (rule && rule.ledger_account_id) {
                                          try {
                                             const res = await api.get(`/deductions/balance/${item.type}/${item.id}/${rule.ledger_account_id}`);
                                             if (res.data.success) {
                                                updateTargetMetrics(item.type, item.id, {
                                                   total_debit: res.data.total_debit,
                                                   total_credit: res.data.total_credit
                                                });
                                             }
                                          } catch(e) { console.error(e); }
                                       } else {
                                          // Fallback to global balance if no rule selected
                                          const metrics = await fetchIdentityBalance(item.type, item.id);
                                          updateTargetMetrics(item.type, item.id, metrics);
                                       }
                                     }}
                                     className={`cursor-pointer transition-all ${isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-500/20' : 'hover:bg-white'}`}
                                   >
                                      <td className="border-r border-slate-200 text-center text-[10px] font-bold text-slate-400">{idx + 1}</td>
                                      <td className="border-r border-slate-200 text-center text-xs font-mono font-black">{item.sub_code || item.code}</td>
                                      <td className={`px-4 border-r border-slate-200 text-[11px] font-bold uppercase truncate ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                                         {item.sub_name || item.name}
                                      </td>
                                      <td className="px-4 border-r border-slate-200 text-right">
                                         <div className={`text-xs font-black font-mono ${currentBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            ₹{Math.abs(currentBalance).toFixed(2)} {currentBalance < 0 ? 'Dr' : 'Cr'}
                                         </div>
                                         <div className="text-[9px] font-mono text-slate-400">Dr {totalDebit.toFixed(2)} | Cr {totalCredit.toFixed(2)}</div>
                                      </td>
                                      <td className="px-4 text-right">
                                         <input
                                            type="number"
                                            value={item.deduction_amount || ''}
                                            onChange={(e) => handleUpdateTargetAmount(item.type, item.id, e.target.value)}
                                            className="w-full bg-slate-100/50 px-2 py-1 border border-slate-200 rounded text-right font-black outline-none text-xs focus:border-blue-500"
                                            placeholder="0.00"
                                         />
                                      </td>
                                   </tr>
                                );
                             })}
                          </tbody>
                       </table>
                    </div>

                    <div className="bg-slate-50 border-t-2 border-slate-300 px-6 py-2 flex justify-between items-center font-black shrink-0">
                       <span className="text-[8px] uppercase text-slate-400 tracking-widest italic">Total Batch:</span>
                       <span className="text-sm font-black text-slate-900 font-mono tracking-tighter italic">₹{Number(totalDeductionAmount).toFixed(2)}</span>
                    </div>
                 </div>
              </div>

              <div className="p-6 bg-white border-t border-slate-200 flex justify-end items-center">
                 <button onClick={handleExecuteBatch} disabled={loading} className="px-12 py-3.5 bg-slate-900 text-white rounded-lg font-black text-sm tracking-wide shadow-2xl hover:bg-indigo-600 transition-all flex items-center gap-3 uppercase">
                    {loading ? 'Processing...' : 'Commit Batch Matrix'} <ArrowRight size={18} />
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* TARGET SELECTOR MODAL */}
      {showMembersModal && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-6 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowMembersModal(false)}>
           <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-slate-200" onClick={e => e.stopPropagation()}>
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                 <h2 className="text-xl font-bold tracking-tight">Identity Matrix Selector</h2>
                 <button onClick={() => setShowMembersModal(false)} className="text-slate-300 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-6 bg-white border-b border-slate-200 space-y-4">
                 <input 
                   type="text" 
                   placeholder="Search Identity..."
                   value={identitySearch}
                   onChange={(e) => setIdentitySearch(e.target.value)}
                   className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-blue-500"
                 />
                 <div className="flex gap-2">
                    <button onClick={() => setIdentityTab('sabhasad')} className={`flex-1 py-3 text-xs font-bold rounded-xl ${identityTab === 'sabhasad' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Members</button>
                    <button onClick={() => setIdentityTab('account')} className={`flex-1 py-3 text-xs font-bold rounded-xl ${identityTab === 'account' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Ledgers</button>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-3 bg-slate-50">
                 {identityTab === 'sabhasad' ? (
                    members.filter(m => String(m.member_code).includes(identitySearch) || m.member_name.toLowerCase().includes(identitySearch.toLowerCase())).map(m => {
                       const isSelected = selectedIdentities.some(i => i.id === m.id && i.type === 'member');
                       return (
                          <div key={m.id} onClick={() => toggleIdentitySelection(m.id, 'member', m.member_name, m.member_code)} className={`p-4 bg-white border rounded-xl cursor-pointer flex items-center gap-4 ${isSelected ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'}`}>
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-300'}`}><CheckCircle size={16} /></div>
                             <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold truncate">{m.member_name}</h3>
                                <span className="text-[10px] font-black text-slate-400 font-mono">#{m.member_code}</span>
                             </div>
                          </div>
                       )
                    })
                 ) : (
                    accounts.filter(a => a.account_name.toLowerCase().includes(identitySearch.toLowerCase())).map(a => {
                       const isSelected = selectedIdentities.some(i => i.id === a.id && i.type === 'account');
                       return (
                          <div key={a.id} onClick={() => toggleIdentitySelection(a.id, 'account', a.account_name, a.account_code || a.id)} className={`p-4 bg-white border rounded-xl cursor-pointer flex items-center gap-4 ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'}`}>
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}><CheckCircle size={16} /></div>
                             <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold truncate">{a.account_name}</h3>
                                <span className="text-[10px] font-black text-slate-400 font-mono">#{a.account_code || a.id}</span>
                             </div>
                          </div>
                       )
                    })
                 )}
              </div>
              <div className="p-6 bg-white border-t border-slate-200">
                 <button onClick={confirmSelection} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-3">Confirm Selection matrix <ArrowRight size={18} /></button>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .scroller-airy::-webkit-scrollbar { width: 6px; }
        .scroller-airy::-webkit-scrollbar-track { background: transparent; }
        .scroller-airy::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
        .scroller-airy:hover::-webkit-scrollbar-thumb { background: #CBD5E1; }
      `}} />
    </div>
  );
}
