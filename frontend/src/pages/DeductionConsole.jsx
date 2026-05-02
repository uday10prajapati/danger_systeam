import React, { useState, useEffect, useRef } from 'react';
import {
   Plus, X, Database, Layout, CheckCircle, UserCheck,
   ArrowRight, User, TrendingUp, Save, Search, RefreshCcw, Calendar, FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api, { sabhasadMasterApi } from '../api';
import Toast from '../components/Toast';
import Loading from '../components/Loading';

export default function DeductionConsole() {
   const [showMembersModal, setShowMembersModal] = useState(false);
   const [loading, setLoading] = useState(false);
   const [members, setMembers] = useState([]);
   const [accounts, setAccounts] = useState([]);
   const [selectedIdentities, setSelectedIdentities] = useState([]);
   const [identityTab, setIdentityTab] = useState('member');
   const [narrations, setNarrations] = useState([]);
   const [showDeductionModal, setShowDeductionModal] = useState(false);
   const [message, setMessage] = useState(null);
   const [deductionPayload, setDeductionPayload] = useState({
      date: new Date().toISOString().split('T')[0],
      remark: '',
      global_amount: '',
      target_identifier: '',
      sabhasad_code: '',
      sabhasad_name: '',
      sabhasad_id: null
   });
   const [manualDeductions, setManualDeductions] = useState([]);
   const [isSmartFilling, setIsSmartFilling] = useState(false);

   const [accountStatsRange, setAccountStatsRange] = useState({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
   });
   const [activeAccountStats, setActiveAccountStats] = useState({ total_debit: 0, total_credit: 0, balance: 0 });

   // Refs for Deduction Modal
   const codeInputRef = useRef(null);
   const nameInputRef = useRef(null);
   const dateInputRef = useRef(null);

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
         const [memRes, accRes, targetsRes, narrRes] = await Promise.all([
            sabhasadMasterApi.getAllSabhasad(),
            api.get('/accounts?type=ledger'),
            api.get('/deductions/targets'),
            api.get('/narrations?type=JV')
         ]);
         if (memRes.data.success) setMembers(memRes.data.data);
         if (accRes.data.success) setAccounts(accRes.data.data);
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
         setMessage({ type: 'success', text: 'Target removed successfully.' });
      } catch (e) { console.error(e); }
   };

   const toggleIdentitySelection = (id, type, name, code) => {
      setSelectedIdentities(prev => {
         const exists = prev.find(i => i.id === id && i.type === type);
         if (exists) return prev.filter(i => !(i.id === id && i.type === type));
         return [...prev, { id, type, name, code, deduction_amount: '', is_auto: true }];
      });
   };

   const toggleAutoCalc = async (id, type) => {
      setSelectedIdentities(prev => {
         const updated = prev.map(p => (p.id === id && p.type === type) ? { ...p, is_auto: !p.is_auto } : p);
         api.post('/deductions/targets/sync', { identities: updated }).catch(console.error);
         return updated;
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
         setMessage({ type: 'success', text: 'Targets synchronized successfully.' });
      } catch (e) { console.error(e); } finally {
         setLoading(false);
         setShowMembersModal(false);
      }
   };

   const handleExecuteBatch = async (providedIdentities = null) => {
      try {
         setLoading(true);
         const res = await api.post('/deductions/execute-batch', {
            ...deductionPayload, 
            manualDeductions, 
            identities: providedIdentities || selectedIdentities
         });
         if (res.data.success) {
            setMessage({ type: 'success', text: res.data.message });
            setShowDeductionModal(false);
            loadIdentities();
         }
      } catch (e) {
         setMessage({ type: 'error', text: e.response?.data?.error || 'Execution failed' });
      } finally {
         setLoading(false);
      }
   };

   const handleExportPDF = () => {
      if (!selectedIdentities.length) { alert('No valid data to export.'); return; }
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 32;
      const navy = [15, 23, 42], white = [255, 255, 255], gray = [100, 116, 139], dark = [30, 41, 59], stripe = [241, 245, 249];
      const cName = (() => { try { const u = JSON.parse(localStorage.getItem('company')); return u?.company_name || 'Company'; } catch (e) { return 'Company'; } })();

      const hdr = () => {
         doc.setFillColor(...navy); doc.rect(0, 0, W, 26, 'F');
         doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
         doc.text(cName.toUpperCase(), M, 17);
         doc.setFontSize(7); doc.setTextColor(148, 163, 184);
         doc.text('KAPAT EXTRACTION MANIFEST', W / 2, 17, { align: 'center' });
         doc.setFontSize(7); doc.setTextColor(239, 68, 68);
         doc.text('CONFIDENTIAL', W - M, 17, { align: 'right' });
      };

      const ftr = (pg, tot) => {
         doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, H - 18, W - M, H - 18);
         doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
         doc.text(cName + ' - Kapat Extraction', M, H - 9);
         doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' });
         doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' });
      };

      hdr();
      let y = 45;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...navy);
      doc.text('Kapat (Deduction) Console Matrix', M, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gray);
      doc.text('Targeted Identities: ' + selectedIdentities.length + '   |   Generated: ' + new Date().toLocaleString('en-IN'), M, y + 13);
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
      y += 28;

      const bodyRows = selectedIdentities.map(item => [
         item.type === 'member' ? 'Member' : 'Account',
         item.name || '-',
         item.code || '-',
         item.is_auto !== false ? 'Auto' : 'Manual',
         parseFloat(item.deduction_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
      ]);

      const totalDeductions = selectedIdentities.reduce((s, r) => s + (parseFloat(r.deduction_amount) || 0), 0);

      autoTable(doc, {
         startY: y,
         head: [['Type', 'Target Name', 'Code', 'Calculation Mode', 'Amount (₹)']],
         body: bodyRows,
         styles: { font: 'helvetica', fontSize: 7.5, cellPadding: [4, 5], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
         headStyles: { font: 'helvetica', fillColor: navy, textColor: white, fontStyle: 'normal' },
         footStyles: { font: 'helvetica', fillColor: [30, 41, 59], textColor: white },
         alternateRowStyles: { fillColor: stripe },
         theme: 'grid',
         foot: [['', '', '', 'TOTAL', totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })]],
         margin: { left: M, right: M }
      });

      const tot = doc.internal.getNumberOfPages();
      for (let i = 1; i <= tot; i++) { doc.setPage(i); ftr(i, tot); }
      doc.save('Kapat_Console_' + new Date().toISOString().split('T')[0] + '.pdf');
   };

   const activeTarget = selectedIdentities.find(i => `${i.type}-${i.id}` === deductionPayload.target_identifier);
   const activeAccount = activeTarget?.type === 'account' ? accounts.find(a => a.id === activeTarget.id) : null;
   const isSubledger = activeAccount ? activeAccount.is_subledger === 1 : true;

   const handleKeyDown = (e, nextRef) => {
      if (e.key === 'Enter') {
         e.preventDefault();
         if (nextRef && nextRef.current) {
            nextRef.current.focus();
         } else {
            handleExecuteBatch();
         }
      }
   };

   if (loading) {
      return <Loading />;
   }

   return (
      <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none animate-none">
         <Toast message={message} onClose={() => setMessage(null)} />

         <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
               <div>
                  <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
                     <Database size={20} className="text-zinc-600" />
                     Kapat (Deduction) Console
                  </h1>
                  <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">Financial Operations / Extraction</p>
               </div>
               
               <div className="flex flex-wrap items-center gap-2">
                  <button
                     onClick={handleExportPDF}
                     className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
                  >
                     <FileText size={14} /> Export PDF
                  </button>

                  <button
                     onClick={async () => {
                        setIsSmartFilling(true);
                        try {
                           if (!deductionPayload.sabhasad_id) {
                              if (!window.confirm('Global Scan: Automatically find all members with outstanding balances?')) {
                                 setIsSmartFilling(false);
                                 return;
                              }
                              const ledgerAccounts = selectedIdentities.filter(i => i.type === 'account');
                              if (ledgerAccounts.length === 0) {
                                 setMessage({ type: 'error', text: 'Please add at least one account to the matrix first.' });
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
                                    if (mb.balance < -0.01) {
                                       const member = members.find(m => m.id === mb.member_id);
                                       if (member) {
                                          membersToAdd.push({
                                             id: member.id, type: 'member',
                                             name: member.member_name, code: member.member_code,
                                             deduction_amount: Math.abs(mb.balance).toFixed(2),
                                             is_auto: true
                                         });
                                       }
                                    }
                                 });
                                 setSelectedIdentities(prev => {
                                    const existingIds = new Set(prev.map(p => `${p.type}-${p.id}`));
                                    const filteredNew = membersToAdd.filter(m => !existingIds.has(`${m.type}-${m.id}`));
                                    return [...prev, ...filteredNew];
                                 });
                              }
                           } else {
                              const freshIdentities = await preloadIdentityInsights(selectedIdentities, deductionPayload.sabhasad_id);
                              const updated = freshIdentities.map(item => {
                                 if (item.is_auto === false) return item;
                                 const udhar = parseFloat(item.total_debit) || 0;
                                 const jama = parseFloat(item.total_credit) || 0;
                                 const bal = jama - udhar;
                                 if (bal < 0) return { ...item, deduction_amount: Math.abs(bal).toFixed(2) };
                                 return item;
                              });
                              setSelectedIdentities(updated);
                           }
                           setMessage({ type: 'success', text: 'Matrix filled successfully.' });
                        } catch (err) { console.error(err); } finally { setIsSmartFilling(false); }
                     }}
                     disabled={isSmartFilling}
                     className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none disabled:opacity-50"
                  >
                     <TrendingUp size={14} /> Smart Fill
                  </button>

                  <button
                     onClick={async () => {
                        setIsSmartFilling(true);
                        try {
                           let updatedIdentities = [];
                           if (!deductionPayload.sabhasad_id) {
                              const ledgerAccounts = selectedIdentities.filter(i => i.type === 'account');
                              const globalRes = await api.get('/account-ledger/global-balances', {
                                 params: { accountIds: ledgerAccounts.map(a => a.id).join(','), endDate: deductionPayload.date }
                              });
                              if (globalRes.data.success) {
                                 const membersToAdd = [];
                                 globalRes.data.data.forEach(mb => {
                                    if (mb.balance < -0.01) {
                                       const member = members.find(m => m.id === mb.member_id);
                                       if (member) {
                                          membersToAdd.push({
                                             id: member.id, type: 'member', name: member.member_name, code: member.member_code,
                                             deduction_amount: Math.abs(mb.balance).toFixed(2), is_auto: true
                                          });
                                       }
                                    }
                                 });
                                 const existingIds = new Set(selectedIdentities.map(p => `${p.type}-${p.id}`));
                                 const filteredNew = membersToAdd.filter(m => !existingIds.has(`${m.type}-${m.id}`));
                                 updatedIdentities = [...selectedIdentities, ...filteredNew];
                                 setSelectedIdentities(updatedIdentities);
                              }
                           } else {
                              const freshIdentities = await preloadIdentityInsights(selectedIdentities, deductionPayload.sabhasad_id);
                              updatedIdentities = freshIdentities.map(item => {
                                 if (item.is_auto === false) return item;
                                 const bal = (parseFloat(item.total_credit) || 0) - (parseFloat(item.total_debit) || 0);
                                 if (bal < 0) return { ...item, deduction_amount: Math.abs(bal).toFixed(2) };
                                 return item;
                              });
                              setSelectedIdentities(updatedIdentities);
                           }
                           if (updatedIdentities.length > 0) {
                              await handleExecuteBatch(updatedIdentities);
                           } else {
                              setMessage({ type: 'error', text: 'No outstanding balances found to pay.' });
                           }
                        } catch (err) { console.error(err); } finally { setIsSmartFilling(false); }
                     }}
                     disabled={isSmartFilling}
                     className="flex items-center gap-1.5 bg-emerald-600 border border-emerald-500 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 select-none disabled:opacity-50"
                  >
                     <CheckCircle size={14} /> Smart Pay
                  </button>

                  <button
                     onClick={() => setShowMembersModal(true)}
                     className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
                  >
                     <Plus size={14} /> Add Targets
                  </button>

                  <button
                     onClick={() => {
                        setDeductionPayload(prev => ({ ...prev, target_identifier: 'all' }));
                        setShowDeductionModal(true);
                        preloadIdentityInsights(selectedIdentities);
                     }}
                     disabled={selectedIdentities.length === 0}
                     className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 text-xs font-bold px-3 py-1.5 select-none disabled:opacity-50"
                  >
                     <Database size={14} /> Process Kapat
                  </button>
               </div>
            </div>

            {/* Matrix / Content Table */}
            {selectedIdentities.length > 0 ? (
               <div className="border border-zinc-300 bg-zinc-50 flex flex-col">
                  <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex flex-wrap items-center justify-between gap-3">
                     <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                           Deduction List
                        </span>
                        <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5">
                           {selectedIdentities.length} RECORDS
                        </span>
                     </div>
                  </div>
                  <div className="overflow-x-auto bg-white select-none">
                     <table className="min-w-full divide-y divide-zinc-200">
                        <thead className="bg-zinc-50 select-none">
                           <tr>
                              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Type</th>
                              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Name</th>
                              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Code</th>
                              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Auto-Calc</th>
                              <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-24">Action</th>
                           </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-zinc-200 text-xs select-none">
                           {selectedIdentities.map((item, idx) => (
                              <tr key={`${item.type}-${item.id}-${idx}`} className="hover:bg-zinc-50 transition">
                                 <td className="px-4 py-3.5 select-none">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${
                                       item.type === 'member' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-zinc-50 border-zinc-300 text-zinc-700'
                                    }`}>
                                       {item.type === 'member' ? <User size={11} /> : <Layout size={11} />}
                                       {item.type === 'member' ? 'Member' : 'Account'}
                                    </span>
                                 </td>
                                 <td className="px-4 py-3.5 font-bold text-zinc-800 uppercase tracking-tight">{item.name}</td>
                                 <td className="px-4 py-3.5 font-mono font-bold text-zinc-500">#{item.code}</td>
                                 <td className="px-4 py-3.5">
                                    <button 
                                       onClick={() => toggleAutoCalc(item.id, item.type)}
                                       className={`px-3 py-1 border text-[10px] font-bold uppercase tracking-wider transition-all select-none ${
                                          item.is_auto !== false ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-zinc-100 border-zinc-300 text-zinc-600'
                                       }`}
                                    >
                                       {item.is_auto !== false ? 'Auto' : 'Manual'}
                                    </button>
                                 </td>
                                 <td className="px-4 py-3.5 text-right select-none">
                                    <button onClick={() => removeIdentity(item.id, item.type)} className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-rose-50 hover:text-rose-600 text-zinc-600 transition"><X size={14} /></button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            ) : (
               <div className="bg-white border border-zinc-300 p-12 flex flex-col items-center justify-center select-none">
                  <div className="w-12 h-12 bg-zinc-100 border border-zinc-300 flex items-center justify-center text-zinc-400 mb-4"><Database size={24} /></div>
                  <p className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest">No identities added to matrix</p>
               </div>
            )}
         </div>

         {/* Process Kapat Modal */}
         {showDeductionModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
               <div className="bg-white border border-zinc-300 p-5 w-full max-w-4xl flex flex-col max-h-[90vh] animate-none">
                  <div className="flex justify-between items-center border-b border-zinc-300 pb-3 mb-4">
                     <h2 className="text-base font-bold text-zinc-800 flex items-center gap-2">
                        <Database size={18} className="text-zinc-600" />
                        Kapat Entry Modal
                     </h2>
                     <button
                        onClick={() => setShowDeductionModal(false)}
                        className="p-1 border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-700 transition"
                     >
                        <X size={16} />
                     </button>
                  </div>

                  <div className="bg-zinc-50 border border-zinc-300 p-4 mb-4 space-y-3">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                           <label className="text-[10px] font-bold text-zinc-500 uppercase">Voucher No</label>
                           <div className="px-3 py-1.5 bg-zinc-100 border border-zinc-300 text-xs font-mono font-bold text-zinc-500 select-none">000001</div>
                        </div>
                        <div className="flex flex-col gap-1">
                           <label className="text-[10px] font-bold text-zinc-500 uppercase">Process Date</label>
                           <input 
                              ref={dateInputRef}
                              type="date" 
                              value={deductionPayload.date}
                              onChange={e => setDeductionPayload(p => ({ ...p, date: e.target.value }))}
                              onKeyDown={e => handleKeyDown(e, codeInputRef)}
                              className="w-full px-3 py-1.5 bg-white border border-zinc-300 outline-none text-xs focus:border-zinc-600 transition font-mono font-bold" 
                           />
                        </div>
                     </div>

                     <div className="flex justify-end gap-2 pt-1 select-none">
                        <button 
                           onClick={async () => {
                              setIsSmartFilling(true);
                              try {
                                 const updated = selectedIdentities.map(item => {
                                    if (item.is_auto === false) return item;
                                    const bal = (parseFloat(item.total_credit) || 0) - (parseFloat(item.total_debit) || 0);
                                    if (bal < 0) return { ...item, deduction_amount: Math.abs(bal).toFixed(2) };
                                    return item;
                                 });
                                 setSelectedIdentities(updated);
                              } catch (e) { console.error(e); } finally { setIsSmartFilling(false); }
                           }}
                           className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-[10px] font-bold px-3 py-1 select-none"
                        >
                           <TrendingUp size={12} /> Smart Fill
                        </button>
                        <button 
                           onClick={async () => {
                              setIsSmartFilling(true);
                              try {
                                 const updated = selectedIdentities.map(item => {
                                    if (item.is_auto === false) return item;
                                    const bal = (parseFloat(item.total_credit) || 0) - (parseFloat(item.total_debit) || 0);
                                    if (bal < 0) return { ...item, deduction_amount: Math.abs(bal).toFixed(2) };
                                    return item;
                                 });
                                 setSelectedIdentities(updated);
                                 await handleExecuteBatch(updated);
                              } catch (e) { console.error(e); } finally { setIsSmartFilling(false); }
                           }}
                           className="flex items-center gap-1.5 bg-emerald-600 border border-emerald-500 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1 select-none"
                        >
                           <CheckCircle size={12} /> Smart Pay
                        </button>
                     </div>

                     <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">{isSubledger ? 'Member (Sabhasad) Identity' : 'Narration / Description'}</label>
                        <div className="flex gap-2">
                           <input
                              ref={codeInputRef}
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
                              onKeyDown={e => handleKeyDown(e, nameInputRef)}
                              className="w-24 px-3 py-1.5 bg-white border border-zinc-300 outline-none text-xs focus:border-zinc-600 transition font-mono font-bold text-center"
                              placeholder="Code"
                           />
                           <input
                              ref={nameInputRef}
                              type="text"
                              value={deductionPayload.sabhasad_name || ''}
                              onChange={e => setDeductionPayload(p => ({ ...p, sabhasad_name: e.target.value }))}
                              onKeyDown={e => handleKeyDown(e, null)}
                              className="flex-1 px-3 py-1.5 bg-white border border-zinc-300 outline-none text-xs focus:border-zinc-600 transition font-mono font-bold"
                              placeholder={isSubledger ? "Enter Member Name..." : "Enter Narration Text..."}
                           />
                        </div>
                     </div>
                  </div>

                  {deductionPayload.target_identifier && (
                     <div className="bg-zinc-50 border border-zinc-300 p-3 mb-4 flex items-center justify-between gap-4 select-none">
                        <div className="flex items-center gap-3">
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase">Start</span>
                              <input type="date" value={accountStatsRange.startDate}
                                 onChange={e => setAccountStatsRange(p => ({ ...p, startDate: e.target.value }))}
                                 className="bg-transparent border border-zinc-300 text-xs font-mono font-bold text-zinc-700 px-2 py-0.5 outline-none" />
                           </div>
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase">End</span>
                              <input type="date" value={accountStatsRange.endDate}
                                 onChange={e => setAccountStatsRange(p => ({ ...p, endDate: e.target.value }))}
                                 className="bg-transparent border border-zinc-300 text-xs font-mono font-bold text-zinc-700 px-2 py-0.5 outline-none" />
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="flex flex-col items-end px-3 py-1 bg-white border border-zinc-300">
                              <span className="text-zinc-500 text-[8px] font-bold uppercase tracking-widest">Jama</span>
                              <span className="text-emerald-700 font-mono font-bold text-xs leading-none">
                                 {parseFloat(activeAccountStats.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                           <div className="flex flex-col items-end px-3 py-1 bg-white border border-zinc-300">
                              <span className="text-zinc-500 text-[8px] font-bold uppercase tracking-widest">Udhar</span>
                              <span className="text-rose-700 font-mono font-bold text-xs leading-none">
                                 {parseFloat(activeAccountStats.net_debit || activeAccountStats.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                           <div className="flex flex-col items-end px-4 py-1 bg-zinc-800 text-white border border-zinc-800">
                              <span className="text-zinc-400 text-[8px] font-bold uppercase tracking-widest">Balance</span>
                              <span className="text-white font-mono font-bold text-sm leading-none">
                                 {parseFloat(activeAccountStats.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Modal Grid */}
                  <div className="flex-1 overflow-y-auto border border-zinc-300 mb-4 select-none bg-white">
                     <div className="grid border-b border-zinc-300 bg-zinc-50"
                        style={{ gridTemplateColumns: '40px 80px 1fr 120px 110px' }}>
                        {['No.', 'Code', 'Account Name', 'Balance', 'Amount'].map((h, i) => (
                           <div key={h} className={`py-1.5 text-[10px] font-bold text-zinc-500 uppercase ${i < 4 ? 'border-r border-zinc-300' : ''} ${i >= 3 ? 'text-right px-3' : 'text-center'}`}>{h}</div>
                        ))}
                     </div>

                     <div className="divide-y divide-zinc-200">
                        {selectedIdentities.length === 0 ? (
                           <div className="py-10 text-center text-xs text-zinc-400 font-bold">No members added to deduction list.</div>
                        ) : selectedIdentities.map((item, idx) => {
                           const key = `${item.type}-${item.id}-${idx}`;
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
                                 className={`grid cursor-pointer transition-colors ${isActive ? 'bg-zinc-100' : idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}`}
                                 style={{ gridTemplateColumns: '40px 80px 1fr 120px 110px' }}>
                                 <div className="border-r border-zinc-200 py-2 text-center text-xs font-mono font-bold text-zinc-400">{idx + 1}</div>
                                 <div className="border-r border-zinc-200 py-2 text-center text-xs font-mono font-bold text-zinc-700">{String(item.code || '').padStart(4, '0')}</div>
                                 <div className="border-r border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-800 uppercase tracking-tight truncate">{item.name}</div>
                                 <div className="border-r border-zinc-200 px-3 py-2 flex flex-col items-end justify-center select-none">
                                    <div className={`text-xs font-mono font-bold ${bal < 0 ? 'text-rose-600' : bal > 0 ? 'text-emerald-600' : 'text-zinc-600'}`}>
                                       {bal > 0 ? '+' : bal < 0 ? '-' : ''}{Math.abs(bal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                    {isActive && deducted !== 0 && Math.abs(closing) > 0.01 && (
                                       <div className="text-[10px] font-mono font-bold italic text-zinc-400">
                                          {closing > 0 ? '+' : closing < 0 ? '-' : ''}{Math.abs(closing).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                       </div>
                                    )}
                                 </div>
                                 <div className="px-2 py-1.5 flex items-center" onClick={e => e.stopPropagation()}>
                                    {(isActive || deducted !== 0) && (
                                       <input type="number" value={item.deduction_amount || ''}
                                          onChange={e => handleUpdateTargetAmount(item.type, item.id, e.target.value)}
                                          className="w-full bg-white border border-zinc-300 px-2 py-1 text-right font-mono font-bold text-xs outline-none focus:border-zinc-500"
                                          placeholder="0.00" />
                                    )}
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>

                  <div className="flex justify-between items-center bg-zinc-50 border border-zinc-300 p-3 select-none">
                     <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-600 uppercase">Total:</span>
                        <span className="text-base font-mono font-bold text-zinc-800 bg-white border border-zinc-300 px-4 py-1 min-w-[120px] text-right">
                           {Number(totalDeductionAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                     </div>

                     <div className="flex gap-2">
                        <button onClick={() => setShowDeductionModal(false)} className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold select-none">Cancel</button>
                        <button onClick={handleExecuteBatch} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 text-xs font-bold select-none transition flex items-center gap-1">
                           <CheckCircle size={14} /> Commit Batch
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Add Targets Modal */}
         {showMembersModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
               <div className="bg-white border border-zinc-300 p-5 w-full max-w-lg flex flex-col max-h-[85vh] animate-none">
                  <div className="flex justify-between items-center border-b border-zinc-300 pb-3 mb-4">
                     <div>
                        <h3 className="text-base font-bold text-zinc-900">Add Targets Matrix</h3>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">Select accounts or members for extraction</p>
                     </div>
                     <button onClick={() => setShowMembersModal(false)} className="p-1 border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-700 transition"><X size={16} /></button>
                  </div>

                  <div className="flex gap-1 bg-zinc-100 border border-zinc-300 p-1 mb-4 select-none">
                     <button onClick={() => setIdentityTab('member')} className={`flex-1 py-1.5 text-xs font-bold transition-all select-none ${identityTab === 'member' ? 'bg-white border border-zinc-300 text-zinc-800 shadow-sm' : 'text-zinc-600'}`}>Members</button>
                     <button onClick={() => setIdentityTab('account')} className={`flex-1 py-1.5 text-xs font-bold transition-all select-none ${identityTab === 'account' ? 'bg-white border border-zinc-300 text-zinc-800 shadow-sm' : 'text-zinc-600'}`}>Accounts</button>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-zinc-200 border border-zinc-300 mb-4 select-none bg-white">
                     {(identityTab === 'member' ? members : accounts).map(idnt => {
                        const id = idnt.id;
                        const name = identityTab === 'member' ? idnt.member_name : idnt.account_name;
                        const code = identityTab === 'member' ? idnt.member_code : (idnt.account_code || idnt.id);
                        const isSelected = selectedIdentities.find(i => i.id === id && i.type === identityTab);
                        return (
                           <div key={id} onClick={() => toggleIdentitySelection(id, identityTab, name, code)} className={`flex items-center justify-between p-3 cursor-pointer transition-colors select-none ${isSelected ? 'bg-zinc-100' : 'hover:bg-zinc-50'}`}>
                              <div className="flex items-center gap-3">
                                 <div className={`w-7 h-7 rounded border border-zinc-300 flex items-center justify-center text-xs select-none ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-zinc-50 text-zinc-400'}`}>
                                    {isSelected ? <CheckCircle size={14} /> : (identityTab === 'member' ? <User size={14} /> : <Layout size={14} />)}
                                 </div>
                                 <div>
                                    <p className="text-xs font-bold text-zinc-800 uppercase tracking-tight">{name}</p>
                                    <p className="text-[10px] font-mono text-zinc-500 font-bold">#{code}</p>
                                 </div>
                              </div>
                              {isSelected && <ArrowRight size={14} className="text-blue-500" />}
                           </div>
                        );
                     })}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
                     <button onClick={() => setShowMembersModal(false)} className="bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-4 py-2 select-none">Cancel</button>
                     <button onClick={confirmSelection} className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 text-xs font-bold px-4 py-2 select-none transition flex items-center gap-1">Confirm Selection</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
