import React, { useState, useEffect, useRef } from 'react';
import {
   Plus, X, Database, Layout, CheckCircle, UserCheck,
   ArrowRight, User, TrendingUp, Save, Search, RefreshCcw, Calendar, FileText
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api, { sabhasadMasterApi } from '../api';
import Toast from '../components/Toast';
import Loading from '../components/Loading';
import { formatBilingualText } from '../utils/textUtils';
import { exportToPDF, toGujaratiDigits as guDigitsUtil } from '../utils/pdfExporter';

export default function DeductionConsole() {
   const { t, i18n } = useTranslation();
   const isGu = i18n.language === 'gu';
   const [showMembersModal, setShowMembersModal] = useState(false);
   const [loading, setLoading] = useState(false);
   const [members, setMembers] = useState([]);
   const [accounts, setAccounts] = useState([]);
   const [selectedIdentities, setSelectedIdentities] = useState([]);
   const [identityTab, setIdentityTab] = useState('member');
   const [filterQuery, setFilterQuery] = useState('');
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
   const [activeAccountStats, setActiveAccountStats] = useState({ total_debit: 0, total_credit: 0, balance: 0, dangar_amount: 0 });

   const displayIdentityName = (item) => {
      if (item.type === 'member') {
         return isGu
            ? (item.name_gu || item.name)
            : (item.eng_name || item.name || '—');
      } else {
         return isGu
            ? formatBilingualText(item.name_gu || item.name)
            : (item.name || '—');
      }
   };

   // Refs for Deduction Modal
   const codeInputRef = useRef(null);
   const nameInputRef = useRef(null);
   const dateInputRef = useRef(null);

   useEffect(() => {
      const sabhasadId = deductionPayload.sabhasad_id;
      const targetId = deductionPayload.target_identifier;

      if (sabhasadId || (targetId && targetId.startsWith('account-'))) {
         const accId = targetId && targetId.startsWith('account-') ? targetId.split('-')[1] : 'all';

         api.get(`/account-ledger/account-stats/${accId}`, {
            params: { ...accountStatsRange, endDate: deductionPayload.date, memberId: sabhasadId }
         })
            .then(res => {
               if (res.data.success) {
                  const stats = res.data.data;
                  setActiveAccountStats(stats);

                  if (stats.total_interest > 0 && targetId) {
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
         setActiveAccountStats({ total_debit: 0, total_credit: 0, balance: 0, dangar_amount: 0 });
      }
   }, [deductionPayload.target_identifier, deductionPayload.sabhasad_id, accountStatsRange.startDate, deductionPayload.date]);

   useEffect(() => { loadIdentities(); }, []);

   const loadIdentities = async () => {
      try {
         setLoading(true);
         const user = JSON.parse(localStorage.getItem('user') || '{}');
         if (!user.company_id) return;

         const [memRes, accRes, targetsRes, narrRes] = await Promise.all([
            sabhasadMasterApi.getAllSabhasad(),
            api.get(`/accounts/company/${user.company_id}?type=ledger`),
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
                  total_interest: parseFloat(res.data.data.total_interest || 0), dangar_amount: parseFloat(res.data.data.dangar_amount || 0),
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

   const toggleIdentitySelection = (id, type, name, code, name_gu, eng_name) => {
      setSelectedIdentities(prev => {
         const exists = prev.find(i => i.id === id && i.type === type);
         if (exists) return prev.filter(i => !(i.id === id && i.type === type));
         return [...prev, { id, type, name, code, name_gu, eng_name, deduction_amount: '', is_auto: true }];
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

   const toGujaratiDigits = (value) => {
      if (!isGu) return String(value ?? '');
      const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
      return String(value ?? '').replace(/[0-9]/g, (d) => guDigits[d] || d);
   };

   const handleExportPDF = async () => {
      if (!selectedIdentities.length) {
         setMessage({ type: 'error', text: t('kapatConsole.modal.noMembers') || 'No records to export.' });
         return;
      }

      const rowsToExport = [...selectedIdentities];
      rowsToExport.push({
         isTotal: true,
         totalCount: selectedIdentities.length,
         totalAmount: totalDeductionAmount
      });

      const columns = [
         {
            header: isGu ? 'ક્રમ' : 'Sr. No.',
            align: 'center',
            width: '6%',
            render: (item, idx) => {
               if (item.isTotal) return '';
               return isGu ? toGujaratiDigits(idx + 1) : String(idx + 1);
            }
         },
         {
            header: isGu ? 'પ્રકાર' : 'Type',
            align: 'center',
            width: '12%',
            render: (item) => {
               if (item.isTotal) return '';
               return item.type === 'member'
                  ? (isGu ? 'સભ્ય' : 'Member')
                  : (isGu ? 'ખાતું' : 'Account');
            }
         },
         {
            header: isGu ? 'નામ' : 'Name',
            align: 'left',
            width: '32%',
            render: (item) => {
               if (item.isTotal) {
                  return `<strong style="font-size:12px;">${isGu ? 'કુલ' : 'Total'} (${toGujaratiDigits(item.totalCount)} ${isGu ? 'રેકોર્ડ્સ' : 'Records'})</strong>`;
               }
               return `<strong>${displayIdentityName(item) || item.name || ''}</strong>`;
            },
            usePromptFont: true
         },
         {
            header: isGu ? 'કોડ' : 'Code',
            align: 'center',
            width: '14%',
            render: (item) => {
               if (item.isTotal) return '';
               return item.code || '—';
            }
         },
         {
            header: isGu ? 'ગણતરી' : 'Calc. Mode',
            align: 'center',
            width: '14%',
            render: (item) => {
               if (item.isTotal) return '';
               return item.is_auto !== false
                  ? (isGu ? 'ઓટો' : 'Auto')
                  : (isGu ? 'મેન્યુઅલ' : 'Manual');
            }
         },
         {
            header: isGu ? 'કપાત રકમ (₹)' : 'Deduction (₹)',
            align: 'right',
            width: '22%',
            render: (item) => {
               const val = item.isTotal
                  ? item.totalAmount.toFixed(2)
                  : parseFloat(item.deduction_amount || 0).toFixed(2);
               return `<strong>₹${isGu ? toGujaratiDigits(val) : val}</strong>`;
            }
         }
      ];

      const fy = localStorage.getItem('financialYear') || localStorage.getItem('financial_year') || '2026-27';
      const metaInfo = [
         {
            label: isGu ? 'કુલ કપાત પાત્રો' : 'Total Targets',
            value: isGu ? toGujaratiDigits(selectedIdentities.length) : String(selectedIdentities.length)
         },
         {
            label: isGu ? 'કુલ કપાત' : 'Total Deduction',
            value: `₹${isGu ? toGujaratiDigits(totalDeductionAmount.toFixed(2)) : totalDeductionAmount.toFixed(2)}`
         }
      ];

      await exportToPDF({
         title: isGu ? 'કપાત (Deduction) રજીસ્ટ્રી' : 'Deduction Registry',
         columns,
         rows: rowsToExport,
         isGu,
         metaInfo,
         filename: `Kapat_Registry_${new Date().toISOString().split('T')[0]}.pdf`,
         onStart: () => setLoading(true),
         onComplete: () => setLoading(false)
      });
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
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 select-none pb-12">
         <Toast message={message} onClose={() => setMessage(null)} />

         <div className="px-4 py-4 max-w-[1600px] mx-auto space-y-4">

            {/* Minimal Classic Registry Directory Wrapper (Full Width) */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none">

               {/* Table Control Header Bar (First Line) */}
               <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
                  <div className="flex items-center gap-2">
                     <span className={`text-sm font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                        {t('kapatConsole.title') || 'Kapat (Deduction) Console'}
                     </span>
                     <span className="bg-slate-200 text-slate-600 font-bold force-en text-[12px] px-1.5 py-0.5 rounded-sm">
                        {toGujaratiDigits(selectedIdentities.length)} {t('kapatConsole.records') || 'Records'}
                     </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                     {/* PDF Report Button */}
                     <button
                        onClick={handleExportPDF}
                        title={t('kapatConsole.exportPDF') || "Export PDF"}
                        className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-655 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none"
                     >
                        <FileText size={13} className="text-slate-500" />
                     </button>

                     {/* Smart Fill Button */}
                     <button
                        onClick={async () => {
                           setIsSmartFilling(true);
                           try {
                              if (!deductionPayload.sabhasad_id) {
                                 let currentIdentities = [...selectedIdentities];

                                 if (currentIdentities.length === 0 && accounts.length > 0) {
                                    currentIdentities = accounts.map(acc => ({
                                       id: acc.id,
                                       type: 'account',
                                       name: acc.account_name,
                                       name_gu: acc.account_name_gu,
                                       code: acc.account_code || `ACC-${acc.id}`,
                                       is_auto: true
                                    }));
                                 }

                                 const freshIdentities = await preloadIdentityInsights(currentIdentities);

                                 const updated = freshIdentities.map(item => {
                                    if (item.is_auto === false) return item;
                                    const bal = parseFloat(item.balance) || 0;
                                    if (bal < -0.01) return { ...item, deduction_amount: Math.abs(bal).toFixed(2) };
                                    return item;
                                 });

                                 setSelectedIdentities(updated);
                              } else {
                                 const freshIdentities = await preloadIdentityInsights(selectedIdentities, deductionPayload.sabhasad_id);
                                 const updated = freshIdentities.map(item => {
                                    if (item.is_auto === false) return item;
                                    const udhar = parseFloat(item.total_debit) || 0;
                                    const jama = parseFloat(item.dangar_amount) || 0;
                                    const payAmount = Math.min(udhar, jama);
                                    if (payAmount > 0) return { ...item, deduction_amount: payAmount.toFixed(2) };
                                    return item;
                                 });
                                 setSelectedIdentities(updated);
                              }
                              setMessage({ type: 'success', text: 'Matrix filled successfully.' });
                           } catch (err) { console.error(err); } finally { setIsSmartFilling(false); }
                        }}
                        disabled={isSmartFilling}
                        className="h-7 flex items-center gap-1.5 px-2.5 bg-white border border-slate-200 text-slate-655 hover:bg-slate-50 hover:text-slate-800 text-[12px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider disabled:opacity-50"
                     >
                        <TrendingUp size={13} className="text-slate-500" />
                        <span>{t('kapatConsole.smartFill')}</span>
                     </button>

                     {/* Smart Pay Button */}
                     <button
                        onClick={async () => {
                           setIsSmartFilling(true);
                           try {
                              let updatedIdentities = [];
                              if (!deductionPayload.sabhasad_id) {
                                 // 1. Refresh balances for all items in matrix
                                 const freshIdentities = await preloadIdentityInsights(selectedIdentities);

                                 // 2. Populate deduction amounts for any item with a debit balance (Udhar)
                                 updatedIdentities = freshIdentities.map(item => {
                                    if (item.is_auto === false) return item;
                                    const bal = parseFloat(item.balance) || 0;
                                    if (bal < -0.01) return { ...item, deduction_amount: Math.abs(bal).toFixed(2) };
                                    return item;
                                 });
                                 setSelectedIdentities(updatedIdentities);
                              } else {
                                 // Member-specific mode: settle debt using available credit (e.g., Dangar Jama)
                                 const freshIdentities = await preloadIdentityInsights(selectedIdentities, deductionPayload.sabhasad_id);
                                 updatedIdentities = freshIdentities.map(item => {
                                    if (item.is_auto === false) return item;
                                    const udhar = parseFloat(item.total_debit) || 0;
                                    const jama = parseFloat(item.dangar_amount) || 0;
                                    const payAmount = Math.min(udhar, jama);
                                    if (payAmount > 0) return { ...item, deduction_amount: payAmount.toFixed(2) };
                                    return item;
                                 });
                                 setSelectedIdentities(updatedIdentities);
                              }

                              const identitiesToPay = updatedIdentities.filter(i => parseFloat(i.deduction_amount) > 0);
                              if (identitiesToPay.length > 0) {
                                 await handleExecuteBatch(updatedIdentities);
                              } else {
                                 setMessage({ type: 'error', text: 'No outstanding balances found to pay.' });
                              }
                           } catch (err) { console.error(err); } finally { setIsSmartFilling(false); }
                        }}
                        disabled={isSmartFilling}
                        className="h-7 flex items-center gap-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 border border-emerald-500 text-white text-[12px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider disabled:opacity-50"
                     >
                        <CheckCircle size={13} />
                        <span>{t('kapatConsole.smartPay')}</span>
                     </button>

                     {/* Add Targets Button */}
                     <button
                        onClick={() => setShowMembersModal(true)}
                        className="h-7 flex items-center gap-1.5 px-2.5 bg-white border border-slate-200 text-slate-655 hover:bg-slate-50 hover:text-slate-800 text-[12px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider"
                     >
                        <Plus size={13} className="text-slate-500" />
                        <span>{t('kapatConsole.addTargets')}</span>
                     </button>

                     {/* Process Kapat Button */}
                     <button
                        onClick={() => {
                           setDeductionPayload(prev => ({ ...prev, target_identifier: 'all' }));
                           setShowDeductionModal(true);
                           preloadIdentityInsights(selectedIdentities);
                        }}
                        disabled={selectedIdentities.length === 0}
                        className="h-7 flex items-center gap-1.5 px-2.5 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[12px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider disabled:opacity-50"
                     >
                        <Database size={13} />
                        <span>{t('kapatConsole.processKapat')}</span>
                     </button>
                  </div>
               </div>

               {/* Full Width Table Registry */}
               <div className="overflow-x-auto w-full">
                  {selectedIdentities.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-64 gap-2 text-center p-4">
                        <Database size={32} className="text-slate-300 opacity-35" />
                        <p className="text-sm font-bold text-slate-400">{t('kapatConsole.modal.noMembers')}</p>
                        <button
                           onClick={() => setShowMembersModal(true)}
                           className="text-sm font-bold text-blue-600 hover:text-blue-850 transition uppercase tracking-wider cursor-pointer"
                        >
                           + {t('kapatConsole.addTargets')}
                        </button>
                     </div>
                  ) : (
                     <table className="min-w-full divide-y divide-slate-200 border-collapse text-[12px]">
                        <thead className="bg-slate-50 font-sans">
                           <tr>
                              <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-12">#</th>
                              <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-32">{t('kapatConsole.table.type')}</th>
                              <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('kapatConsole.table.name')}</th>
                              <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-28">{t('kapatConsole.table.code')}</th>
                              <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-28">{t('kapatConsole.table.autoCalc')}</th>
                              <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 w-16">{t('kapatConsole.table.action')}</th>
                           </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                           {selectedIdentities.map((item, idx) => (
                              <tr
                                 key={`${item.type}-${item.id}-${idx}`}
                                 className="hover:bg-slate-50/75 transition-colors cursor-pointer select-none"
                              >
                                 <td className="px-3.5 py-2 text-center font-mono text-slate-500 border-r border-slate-100">{toGujaratiDigits(idx + 1)}</td>
                                 <td className="px-3.5 py-2 border-r border-slate-100">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-bold uppercase tracking-wider border ${item.type === 'member'
                                       ? 'bg-sky-50 border-sky-200 text-sky-700'
                                       : 'bg-slate-50 border-slate-200 text-slate-700'
                                       }`}>
                                       {item.type === 'member' ? <User size={10} /> : <Layout size={10} />}
                                       {item.type === 'member' ? t('kapatConsole.addTargetModal.members') : t('kapatConsole.addTargetModal.accounts')}
                                    </span>
                                 </td>
                                 <td
                                    className={`px-3.5 py-2 border-r border-slate-100 font-bold text-slate-800 ${isGu ? '' : 'font-sans uppercase'}`}
                                    style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}
                                 >
                                    {displayIdentityName(item)}
                                 </td>
                                 <td className="px-3.5 py-2 text-center border-r border-slate-100 font-mono font-bold text-slate-600 force-en">
                                    {item.code}
                                 </td>
                                 <td className="px-3.5 py-2 text-center border-r border-slate-100">
                                    <button
                                       onClick={() => toggleAutoCalc(item.id, item.type)}
                                       className={`px-2.5 py-0.5 text-[12px] font-bold rounded-md border transition cursor-pointer ${item.is_auto !== false
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                          }`}
                                    >
                                       {item.is_auto !== false ? (t('kapatConsole.table.auto') || 'Auto') : (t('kapatConsole.table.manual') || 'Manual')}
                                    </button>
                                 </td>
                                 <td className="px-3.5 py-2 text-center flex items-center justify-center">
                                    <button
                                       onClick={() => removeIdentity(item.id, item.type)}
                                       className="p-1 border border-rose-100 rounded text-rose-600 bg-rose-50 hover:bg-rose-150 transition cursor-pointer"
                                       title="Remove"
                                    >
                                       <X size={12} />
                                    </button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}
               </div>
            </div>
         </div>

         {/* Process Kapat Modal */}
         {showDeductionModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-150" onClick={() => setShowDeductionModal(false)} />
               <div className="relative w-full max-w-4xl max-h-[92vh] bg-white border border-slate-200 rounded-lg p-5 shadow-xl z-10 flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden">

                  {/* Close button */}
                  <button
                     onClick={() => setShowDeductionModal(false)}
                     className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 transition cursor-pointer bg-slate-50 rounded-md hover:bg-slate-100 border border-slate-200/50"
                  >
                     <X size={14} />
                  </button>

                  <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4 pr-8 font-prompt-sm">
                     <Database size={16} className="text-[#1d5f84]" />
                     <span>{t('kapatConsole.modal.processDeduction') || 'કપાત રજીસ્ટ્રી એન્ટ્રી (Process Deduction)'}</span>
                  </h2>

                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4 mb-4 space-y-3 shrink-0">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('kapatConsole.modal.voucherNo')}</label>
                           <div className="px-3 py-1.5 bg-slate-200/60 border border-slate-200 text-sm font-mono font-bold text-slate-500 rounded">000001</div>
                        </div>
                        <div className="flex flex-col gap-1">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('kapatConsole.modal.processDate')}</label>
                           <input
                              ref={dateInputRef}
                              type="date"
                              value={deductionPayload.date}
                              onChange={e => setDeductionPayload(p => ({ ...p, date: e.target.value }))}
                              onKeyDown={e => handleKeyDown(e, codeInputRef)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded outline-none text-sm focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition font-mono font-bold"
                           />
                        </div>
                     </div>

                     <div className="flex justify-end gap-2 pt-1">
                        <button
                           onClick={async () => {
                              setIsSmartFilling(true);
                              try {
                                 const updated = selectedIdentities.map(item => {
                                    if (item.is_auto === false) return item;
                                    const udhar = parseFloat(item.total_debit) || 0;
                                    const dangar = parseFloat(item.dangar_amount) || 0;
                                    const payAmount = Math.min(udhar, dangar);
                                    if (payAmount > 0) return { ...item, deduction_amount: payAmount.toFixed(2) };
                                    return item;
                                 });
                                 setSelectedIdentities(updated);
                              } catch (e) { console.error(e); } finally { setIsSmartFilling(false); }
                           }}
                           className="h-7 flex items-center gap-1.5 px-2.5 bg-white border border-slate-200 text-slate-655 hover:bg-slate-50 hover:text-slate-800 text-[10px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider"
                        >
                           <TrendingUp size={12} className="text-slate-500" />
                           <span>Smart Fill</span>
                        </button>
                        <button
                           onClick={async () => {
                              setIsSmartFilling(true);
                              try {
                                 const updated = selectedIdentities.map(item => {
                                    if (item.is_auto === false) return item;
                                    const udhar = parseFloat(item.total_debit) || 0;
                                    const dangar = parseFloat(item.dangar_amount) || 0;
                                    const payAmount = Math.min(udhar, dangar);
                                    if (payAmount > 0) return { ...item, deduction_amount: payAmount.toFixed(2) };
                                    return item;
                                 });
                                 setSelectedIdentities(updated);
                                 await handleExecuteBatch(updated);
                              } catch (e) { console.error(e); } finally { setIsSmartFilling(false); }
                           }}
                           className="h-7 flex items-center gap-1.5 px-2.5 bg-emerald-600 border border-emerald-500 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider"
                        >
                           <CheckCircle size={12} />
                           <span>Smart Pay</span>
                        </button>
                     </div>

                     <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isSubledger ? t('kapatConsole.modal.memberIdentity') : t('kapatConsole.modal.narration')}</label>
                        <div className="flex gap-2">
                           <input
                              ref={codeInputRef}
                              type="text"
                              value={deductionPayload.sabhasad_code || ''}
                              translate="no"
                              lang="en"
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
                                    sabhasad_name: match
                                       ? (isSubledger
                                          ? (isGu ? (match.member_name_gu || match.member_name) : (match.eng_name || match.member_name))
                                          : match.narration_text)
                                       : '',
                                    sabhasad_id: match && isSubledger ? match.id : null
                                 }));

                                 if (match && isSubledger) {
                                    preloadIdentityInsights(selectedIdentities, match.id);
                                 }
                              }}
                              onKeyDown={e => handleKeyDown(e, nameInputRef)}
                              className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded outline-none text-sm focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition font-mono font-bold text-center notranslate"
                              placeholder={t('kapatConsole.table.code') || 'Code'}
                           />
                           <input
                              ref={nameInputRef}
                              type="text"
                              value={deductionPayload.sabhasad_name || ''}
                              onChange={e => setDeductionPayload(p => ({ ...p, sabhasad_name: e.target.value }))}
                              onKeyDown={e => handleKeyDown(e, null)}
                              lang={isSubledger ? 'gu' : 'en'}
                              className={`flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded outline-none text-sm focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition font-bold ${(isSubledger && isGu) ? 'font-prompt-sm' : 'font-sans uppercase'}`}
                              placeholder={isSubledger ? (t('kapatConsole.modal.enterMemberName') || 'Enter Member Name...') : (t('kapatConsole.modal.enterNarration') || 'Enter Narration Text...')}
                           />
                        </div>
                     </div>
                  </div>

                  {(deductionPayload.target_identifier || deductionPayload.sabhasad_id) && (
                     <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mb-4 flex items-center justify-between gap-4 select-none shrink-0">
                        <div className="flex items-center gap-3">
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start</span>
                              <input type="date" value={accountStatsRange.startDate}
                                 onChange={e => setAccountStatsRange(p => ({ ...p, startDate: e.target.value }))}
                                 className="bg-transparent border border-slate-200 rounded text-sm font-mono font-bold text-slate-700 px-2 py-0.5 outline-none focus:border-[#1d5f84]" />
                           </div>
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">End</span>
                              <input type="date" value={accountStatsRange.endDate}
                                 onChange={e => setAccountStatsRange(p => ({ ...p, endDate: e.target.value }))}
                                 className="bg-transparent border border-slate-200 rounded text-sm font-mono font-bold text-slate-700 px-2 py-0.5 outline-none focus:border-[#1d5f84]" />
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="flex flex-col items-end px-3 py-1 bg-white border border-slate-200 rounded">
                              <span className="text-slate-400 text-[12px] font-bold uppercase tracking-wider">{t('kapatConsole.modal.dangarJama')}</span>
                              <span className="text-emerald-700 font-mono font-bold text-sm leading-none">
                                 {parseFloat(activeAccountStats.dangar_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                           <div className="flex flex-col items-end px-3 py-1 bg-white border border-slate-200 rounded">
                              <span className="text-slate-400 text-[12px] font-bold uppercase tracking-wider">{t('kapatConsole.modal.udhar')}</span>
                              <span className="text-rose-700 font-mono font-bold text-sm leading-none">
                                 {parseFloat(activeAccountStats.net_debit || activeAccountStats.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                           <div className="flex flex-col items-end px-4 py-1 bg-[#1d5f84] text-white border border-[#1d5f84] rounded">
                              <span className="text-slate-200 text-[12px] font-bold uppercase tracking-wider">{t('kapatConsole.modal.balance')}</span>
                              <span className="text-white font-mono font-bold text-sm leading-none">
                                 {parseFloat(activeAccountStats.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Modal Grid */}
                  <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg mb-4 select-none bg-white">
                     <div className="grid border-b border-slate-200 bg-slate-50 font-sans"
                        style={{ gridTemplateColumns: '40px 80px 1fr 120px 110px' }}>
                        {[t('kapatConsole.modal.no'), t('kapatConsole.table.code'), t('kapatConsole.modal.accountName'), t('kapatConsole.modal.udhar'), t('kapatConsole.modal.amount')].map((h, i) => (
                           <div key={h} className={`py-1.5 text-[10px] font-bold text-slate-400 uppercase ${i < 4 ? 'border-r border-slate-200' : ''} ${i >= 3 ? 'text-right px-3' : 'text-center'}`}>{h}</div>
                        ))}
                     </div>

                     <div className="divide-y divide-slate-100">
                        {selectedIdentities.length === 0 ? (
                           <div className="py-10 text-center text-sm text-slate-400 font-bold">{t('kapatConsole.modal.noMembers')}</div>
                        ) : selectedIdentities.map((item, idx) => {
                           const key = `${item.type}-${item.id}-${idx}`;
                           const isActive = key === deductionPayload.target_identifier;
                           const bal = Number(item.total_debit || 0);
                           const deducted = parseFloat(item.deduction_amount) || 0;
                           const closing = bal - deducted;

                           return (
                              <div key={key}
                                 onClick={async () => {
                                    setDeductionPayload(p => ({ ...p, target_identifier: key }));
                                    if (!item.deduction_amount || parseFloat(item.deduction_amount) === 0) {
                                       const bal = Number(item.total_debit || 0);
                                       handleUpdateTargetAmount(item.type, item.id, Math.abs(bal).toFixed(2));
                                    }
                                 }}
                                 className={`grid cursor-pointer transition-all border-b border-slate-100 hover:bg-slate-50/60 ${isActive
                                    ? 'bg-sky-50/40 border-l-2 border-[#1d5f84]'
                                    : idx % 2 === 0
                                       ? 'bg-white border-l-2 border-transparent'
                                       : 'bg-slate-50/30 border-l-2 border-transparent'
                                    }`}
                                 style={{ gridTemplateColumns: '40px 80px 1fr 120px 110px' }}>
                                 <div className="border-r border-slate-100 py-2 text-center text-sm font-mono font-bold text-slate-400">{idx + 1}</div>
                                 <div className="border-r border-slate-100 py-2 text-center text-sm font-sans font-bold text-slate-700 force-en">{String(item.code || '').padStart(4, '0')}</div>
                                 <div
                                    className={`border-r border-slate-100 px-3 py-2 text-sm font-bold text-slate-800 tracking-tight truncate ${isGu ? '' : 'font-sans uppercase'}`}
                                    style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}
                                 >
                                    {displayIdentityName(item)}
                                 </div>
                                 <div className="border-r border-slate-100 px-3 py-2 flex flex-col items-end justify-center select-none">
                                    <div className={`text-sm font-mono font-bold text-rose-600`}>
                                       {bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                    {isActive && deducted !== 0 && (
                                       <div className="text-[10px] font-mono font-bold italic text-slate-400">
                                          {closing > 0 ? '+' : closing < 0 ? '-' : ''}{Math.abs(closing).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                       </div>
                                    )}
                                 </div>
                                 <div className="px-2 py-1 flex items-center" onClick={e => e.stopPropagation()}>
                                    {(isActive || deducted !== 0) && (
                                       <input type="number" value={item.deduction_amount || ''}
                                          onChange={e => handleUpdateTargetAmount(item.type, item.id, e.target.value)}
                                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-right font-mono font-bold text-sm outline-none focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84]"
                                          placeholder="0.00" />
                                    )}
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-md p-3 select-none shrink-0">
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{t('kapatConsole.total')}</span>
                        <span className="text-base font-mono font-bold text-slate-700 bg-white border border-slate-200 rounded px-4 py-1 min-w-[120px] text-right">
                           {Number(totalDeductionAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                     </div>

                     <div className="flex gap-2">
                        <button onClick={() => setShowDeductionModal(false)} className="px-4 py-2 bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-655 text-sm font-bold select-none cursor-pointer transition">Cancel</button>
                        <button onClick={handleExecuteBatch} className="px-5 py-2 bg-[#1d5f84] hover:bg-[#154662] text-white border border-[#1d5f84] rounded-md text-sm font-bold select-none transition flex items-center gap-1.5 cursor-pointer">
                           <CheckCircle size={14} /> {t('kapatConsole.modal.commitBatch')}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Add Targets Modal */}
         {showMembersModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-150" onClick={() => setShowMembersModal(false)} />
               <div className="relative w-full max-w-lg max-h-[85vh] bg-white border border-slate-200 rounded-lg p-5 shadow-xl z-10 flex flex-col animate-in fade-in zoom-in-95 duration-150 overflow-hidden">

                  {/* Close button */}
                  <button onClick={() => setShowMembersModal(false)} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 transition cursor-pointer bg-slate-50 rounded-md hover:bg-slate-100 border border-slate-200/50"><X size={14} /></button>

                  <h3 className="text-base font-extrabold text-slate-800 border-b border-slate-100 pb-3 mb-4 pr-8 font-prompt-sm">
                     {t('kapatConsole.addTargetModal.title') || 'કપાત લક્ષ્યો ઉમેરો (Add Deduction Targets)'}
                  </h3>

                  <div className="flex gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1 mb-3 select-none shrink-0">
                     <button
                        onClick={() => { setIdentityTab('member'); setFilterQuery(''); }}
                        className={`flex-1 py-1.5 text-sm font-bold transition-all rounded-md cursor-pointer select-none ${identityTab === 'member'
                           ? 'bg-[#1d5f84] text-white shadow-none'
                           : 'text-slate-500 hover:text-slate-800'
                           }`}
                     >
                        {t('kapatConsole.addTargetModal.members')}
                     </button>
                     <button
                        onClick={() => { setIdentityTab('account'); setFilterQuery(''); }}
                        className={`flex-1 py-1.5 text-sm font-bold transition-all rounded-md cursor-pointer select-none ${identityTab === 'account'
                           ? 'bg-[#1d5f84] text-white shadow-none'
                           : 'text-slate-500 hover:text-slate-800'
                           }`}
                     >
                        {t('kapatConsole.addTargetModal.accounts')}
                     </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative mb-3 shrink-0">
                     <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input
                        type="text"
                        value={filterQuery}
                        onChange={e => setFilterQuery(e.target.value)}
                        placeholder={identityTab === 'member' ? "સભ્ય શોધો (નામ અથવા કોડ)..." : "ખાતું શોધો..."}
                        className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:border-[#1d5f84] focus:bg-white transition"
                     />
                     {filterQuery && (
                        <button
                           onClick={() => setFilterQuery('')}
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                           <X size={12} />
                        </button>
                     )}
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg mb-4 select-none bg-white">
                     {(() => {
                        const itemsToRender = (identityTab === 'member' ? members : accounts).filter(idnt => {
                           const name = identityTab === 'member'
                              ? (isGu ? (idnt.member_name_gu || idnt.member_name) : (idnt.eng_name || idnt.member_name))
                              : (isGu ? (idnt.account_name_gu || idnt.account_name) : idnt.account_name);

                           const altName = identityTab === 'member'
                              ? (isGu ? (idnt.eng_name || idnt.member_name) : (idnt.member_name_gu || idnt.member_name))
                              : (isGu ? idnt.account_name : (idnt.account_name_gu || idnt.account_name));

                           const code = identityTab === 'member' ? idnt.member_code : (idnt.account_code || idnt.id);
                           const query = filterQuery.toLowerCase();
                           return (
                              String(name || '').toLowerCase().includes(query) ||
                              String(altName || '').toLowerCase().includes(query) ||
                              String(code || '').toLowerCase().includes(query)
                           );
                        });

                        if (itemsToRender.length === 0) {
                           return (
                              <div className="flex flex-col items-center justify-center py-10 gap-1 text-slate-400 font-bold text-sm">
                                 <span>{t('common.noRecords') || "કોઈ માહિતી મળી નથી"}</span>
                                 <span className="text-[10px] font-normal text-slate-350">Try refining your search query</span>
                              </div>
                           );
                        }

                        return itemsToRender.map(idnt => {
                           const id = idnt.id;
                           const name = identityTab === 'member'
                              ? (isGu ? (idnt.member_name_gu || idnt.member_name) : (idnt.eng_name || idnt.member_name))
                              : (isGu ? (idnt.account_name_gu || idnt.account_name) : idnt.account_name);
                           const code = identityTab === 'member' ? idnt.member_code : (idnt.account_code || idnt.id);
                           const isSelected = selectedIdentities.find(i => i.id === id && i.type === identityTab);
                           return (
                              <div key={id} onClick={() => {
                                 const nameVal = identityTab === 'member' ? idnt.member_name : idnt.account_name;
                                 const nameGuVal = identityTab === 'member' ? idnt.member_name_gu : idnt.account_name_gu;
                                 const engNameVal = identityTab === 'member' ? idnt.eng_name : idnt.account_name;
                                 toggleIdentitySelection(id, identityTab, nameVal, code, nameGuVal, engNameVal);
                              }} className={`flex items-center justify-between p-3 cursor-pointer transition-colors select-none ${isSelected ? 'bg-slate-50/70' : 'hover:bg-slate-50/40'}`}>
                                 <div className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-sm select-none ${isSelected ? 'bg-[#1d5f84] border-[#1d5f84] text-white' : 'bg-slate-50 text-slate-400'}`}>
                                       {isSelected ? <CheckCircle size={14} /> : (identityTab === 'member' ? <User size={14} /> : <Layout size={14} />)}
                                    </div>
                                    <div>
                                       <p
                                          className={`text-sm font-bold text-slate-850 tracking-tight ${isGu ? '' : 'font-sans uppercase'}`}
                                          style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}
                                       >
                                          {identityTab === 'member' ? name : (isGu ? formatBilingualText(name) : name)}
                                       </p>
                                       <p className="text-[10px] font-mono text-slate-400 font-bold">#{code}</p>
                                    </div>
                                 </div>
                                 {isSelected && <ArrowRight size={14} className="text-[#1d5f84]" />}
                              </div>
                           );
                        });
                     })()}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
                     <button onClick={() => setShowMembersModal(false)} className="bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-655 text-sm font-bold px-4 py-2 cursor-pointer select-none">Cancel</button>
                     <button onClick={confirmSelection} className="bg-[#1d5f84] hover:bg-[#154662] text-white border border-[#1d5f84] rounded-md text-sm font-bold px-4 py-2 cursor-pointer select-none transition flex items-center gap-1">Confirm Selection</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
