import React, { useState, useEffect, useRef } from 'react';
import {
   Plus, X, Database, Layout, CheckCircle, UserCheck,
   ArrowRight, User, TrendingUp, Save, Search, RefreshCcw, Calendar, FileText
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import api, { sabhasadMasterApi } from '../api';
import Toast from '../components/Toast';
import Loading from '../components/Loading';
import { formatBilingualText } from '../utils/textUtils';

export default function DeductionConsole() {
   const { t } = useTranslation();
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
   const [activeAccountStats, setActiveAccountStats] = useState({ total_debit: 0, total_credit: 0, balance: 0, dangar_amount: 0 });

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

   const toGujaratiDigits = (value) => {
      const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
      return String(value ?? '').replace(/[0-9]/g, (d) => guDigits[d] || d);
   };

   const handleExportPDF = async () => {
      if (!selectedIdentities.length) { 
         setMessage({ type: 'error', text: t('kapatConsole.modal.noMembers') || 'No records to export.' }); 
         return; 
      }

      setLoading(true);
      try {

         const company = JSON.parse(localStorage.getItem('company') || '{}');
         const cName = company.company_name_gu || company.company_name || 'Company';
         const reportTitle = 'કપાત (Deduction) રજીસ્ટ્રી';
         const fy = localStorage.getItem('financial_year') || '2026-27';

         const tempWrap = document.createElement('div');
         tempWrap.style.position = 'fixed';
         tempWrap.style.left = '-10000px';
         tempWrap.style.top = '0';
         tempWrap.style.width = '1000px';
         tempWrap.style.background = '#fff';
         tempWrap.style.color = '#111827';
         tempWrap.style.fontFamily = '"NotoGujarati", "Noto Sans Gujarati", Arial, sans-serif';
         tempWrap.style.padding = '24px';

         const tableRows = selectedIdentities.map((item, idx) => `
            <tr>
               <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${toGujaratiDigits(idx + 1)}</td>
               <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${item.type === 'member' ? 'સભ્ય' : 'ખાતું'}</td>
               <td style="padding:8px 10px;border:1px solid #d1d5db;font-weight:700;">${item.name || ''}</td>
               <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;font-family:Arial, sans-serif;">${item.code || ''}</td>
               <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${item.is_auto !== false ? 'ઓટો' : 'મેન્યુઅલ'}</td>
               <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:right;font-weight:700;">${toGujaratiDigits(parseFloat(item.deduction_amount || 0).toFixed(2))}</td>
            </tr>
         `).join('');

         const totalAmount = selectedIdentities.reduce((sum, item) => sum + (parseFloat(item.deduction_amount) || 0), 0);

         tempWrap.innerHTML = `
            <div style="border:1px solid #cbd5e1;">
               <div style="background:#2563eb;color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
                  <div style="font-size:18px;font-weight:700;">${cName}</div>
                  <div style="font-size:12px;font-weight:700;">${reportTitle}</div>
               </div>
               <div style="padding:18px;">
                  <div style="font-size:22px;font-weight:700;color:#1f2937;margin-bottom:6px;">${reportTitle}</div>
                  <div style="font-size:12px;color:#6b7280;margin-bottom:16px;display:flex;justify-content:space-between;">
                     <span>નાણાકીય વર્ષ: ${toGujaratiDigits(fy)} | કુલ કપાત પાત્રો: ${toGujaratiDigits(selectedIdentities.length)}</span>
                     <span>બનાવેલ: ${toGujaratiDigits(new Date().toLocaleString('en-IN'))}</span>
                  </div>
                  <table style="width:100%;border-collapse:collapse;font-size:13px;">
                     <thead>
                        <tr style="background:#f8fafc;">
                           <th style="padding:8px 10px;border:1px solid #d1d5db;">ક્રમ</th>
                           <th style="padding:8px 10px;border:1px solid #d1d5db;">પ્રકાર</th>
                           <th style="padding:8px 10px;border:1px solid #d1d5db;">નામ</th>
                           <th style="padding:8px 10px;border:1px solid #d1d5db;">કોડ</th>
                           <th style="padding:8px 10px;border:1px solid #d1d5db;">ગણતરી</th>
                           <th style="padding:8px 10px;border:1px solid #d1d5db;text-align:right;">કપાત રકમ (₹)</th>
                        </tr>
                     </thead>
                     <tbody>${tableRows}</tbody>
                     <tfoot>
                        <tr style="background:#f1f5f9;font-weight:900;color:#111827;">
                           <td colspan="5" style="padding:10px;border:1px solid #d1d5db;text-align:right;font-size:14px;">કુલ કપાત રકમ:</td>
                           <td style="padding:10px;border:1px solid #d1d5db;text-align:right;font-size:14px;">${toGujaratiDigits(totalAmount.toFixed(2))}</td>
                        </tr>
                     </tfoot>
                  </table>
               </div>
            </div>
         `;

         document.body.appendChild(tempWrap);

         // Wait for fonts to render
         await new Promise(resolve => setTimeout(resolve, 500));

         const canvas = await html2canvas(tempWrap, { 
            scale: 3, 
            backgroundColor: '#ffffff', 
            useCORS: true,
            allowTaint: false,
            logging: false
         });
         document.body.removeChild(tempWrap);

         const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
         const pageW = doc.internal.pageSize.getWidth();
         const pageH = doc.internal.pageSize.getHeight();
         const margin = 32;
         const imgW = pageW - margin * 2;
         const pageHpx = ((pageH - margin * 2) * canvas.width) / imgW;

         let y = 0;
         let pageIndex = 0;
         while (y < canvas.height) {
            const sliceHeight = Math.min(pageHpx, canvas.height - y);
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeight;
            const ctx = pageCanvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

            const imgData = pageCanvas.toDataURL('image/png');
            const imgH = (sliceHeight * imgW) / canvas.width;

            if (pageIndex > 0) doc.addPage();
            doc.addImage(imgData, 'PNG', margin, margin, imgW, imgH);

            y += sliceHeight;
            pageIndex += 1;
         }

         doc.save(`Kapat_Registry_${new Date().toISOString().split('T')[0]}.pdf`);
         setMessage({ type: 'success', text: 'PDF report generated successfully.' });
      } catch (err) {
         console.error('PDF Export Error:', err);
         setMessage({ type: 'error', text: 'Operational failure during PDF generation.' });
      } finally {
         setLoading(false);
      }
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
                     {t('kapatConsole.title')}
                  </h1>
                  <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">{t('kapatConsole.eyebrow')}</p>
               </div>
               
               <div className="flex flex-wrap items-center gap-2">
                  <button
                     onClick={handleExportPDF}
                     className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
                  >
                     <FileText size={14} /> {t('kapatConsole.exportPDF')}
                  </button>

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
                     className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none disabled:opacity-50"
                  >
                     <TrendingUp size={14} /> {t('kapatConsole.smartFill')}
                  </button>

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
                     className="flex items-center gap-1.5 bg-emerald-600 border border-emerald-500 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 select-none disabled:opacity-50"
                  >
                     <CheckCircle size={14} /> {t('kapatConsole.smartPay')}
                  </button>

                  <button
                     onClick={() => setShowMembersModal(true)}
                     className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
                  >
                     <Plus size={14} /> {t('kapatConsole.addTargets')}
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
                     <Database size={14} /> {t('kapatConsole.processKapat')}
                  </button>
               </div>
            </div>

            {/* Matrix / Content Table */}
            {selectedIdentities.length > 0 ? (
               <div className="border border-zinc-300 bg-zinc-50 flex flex-col">
                  <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex flex-wrap items-center justify-between gap-3">
                     <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                           {t('kapatConsole.listTitle')}
                        </span>
                        <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5">
                           {selectedIdentities.length} {t('kapatConsole.records')}
                        </span>
                     </div>
                  </div>
                  <div className="overflow-x-auto bg-white select-none">
                     <table className="min-w-full divide-y divide-zinc-200">
                        <thead className="bg-zinc-50 select-none">
                           <tr>
                              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('kapatConsole.table.type')}</th>
                              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('kapatConsole.table.name')}</th>
                              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('kapatConsole.table.code')}</th>
                              <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t('kapatConsole.table.autoCalc')}</th>
                              <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-24">{t('kapatConsole.table.action')}</th>
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
                                       {item.type === 'member' ? t('kapatConsole.addTargetModal.members') : t('kapatConsole.addTargetModal.accounts')}
                                    </span>
                                 </td>
                                 <td className="px-4 py-3.5 font-bold text-zinc-800 tracking-tight">
                                    {item.type === 'member'
                                       ? <span className="font-prompt-sm">{item.name}</span>
                                       : formatBilingualText(item.name)
                                    }
                                 </td>
                                 <td className="px-4 py-3.5 font-sans font-bold text-zinc-500 force-en">{item.code}</td>
                                 <td className="px-4 py-3.5">
                                    <button 
                                       onClick={() => toggleAutoCalc(item.id, item.type)}
                                       className={`px-3 py-1 border text-[10px] font-bold uppercase tracking-wider transition-all select-none ${
                                          item.is_auto !== false ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-zinc-100 border-zinc-300 text-zinc-600'
                                       }`}
                                    >
                                       {item.is_auto !== false ? (t('kapatConsole.table.auto') || 'Auto') : (t('kapatConsole.table.manual') || 'Manual')}
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
                  <p className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest">{t('kapatConsole.modal.noMembers')}</p>
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
                           <label className="text-[10px] font-bold text-zinc-500 uppercase">{t('kapatConsole.modal.voucherNo')}</label>
                           <div className="px-3 py-1.5 bg-zinc-100 border border-zinc-300 text-xs font-mono font-bold text-zinc-500 select-none">000001</div>
                        </div>
                        <div className="flex flex-col gap-1">
                           <label className="text-[10px] font-bold text-zinc-500 uppercase">{t('kapatConsole.modal.processDate')}</label>
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
                                    const udhar = parseFloat(item.total_debit) || 0; const dangar = parseFloat(item.dangar_amount) || 0; const payAmount = Math.min(udhar, dangar);
                                    if (payAmount > 0) return { ...item, deduction_amount: payAmount.toFixed(2) };
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
                                    const udhar = parseFloat(item.total_debit) || 0; const dangar = parseFloat(item.dangar_amount) || 0; const payAmount = Math.min(udhar, dangar);
                                    if (payAmount > 0) return { ...item, deduction_amount: payAmount.toFixed(2) };
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
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">{isSubledger ? t('kapatConsole.modal.memberIdentity') : t('kapatConsole.modal.narration')}</label>
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
                                    sabhasad_name: match ? (isSubledger ? match.member_name : match.narration_text) : '',
                                    sabhasad_id: match && isSubledger ? match.id : null
                                 }));

                                 if (match && isSubledger) {
                                    preloadIdentityInsights(selectedIdentities, match.id);
                                 }
                              }}
                              onKeyDown={e => handleKeyDown(e, nameInputRef)}
                              className="w-24 px-3 py-1.5 bg-white border border-zinc-300 outline-none text-xs focus:border-zinc-600 transition font-mono font-bold text-center notranslate"
                              placeholder={t('kapatConsole.table.code') || 'Code'}
                           />
                           <input
                              ref={nameInputRef}
                              type="text"
                              value={deductionPayload.sabhasad_name || ''}
                              onChange={e => setDeductionPayload(p => ({ ...p, sabhasad_name: e.target.value }))}
                              onKeyDown={e => handleKeyDown(e, null)}
                              lang={isSubledger ? 'gu' : 'en'}
                              className={`flex-1 px-3 py-1.5 bg-white border border-zinc-300 outline-none text-xs focus:border-zinc-600 transition font-sans font-bold ${isSubledger ? 'font-prompt' : ''}`}
                              placeholder={isSubledger ? (t('kapatConsole.modal.enterMemberName') || 'Enter Member Name...') : (t('kapatConsole.modal.enterNarration') || 'Enter Narration Text...')}
                           />
                        </div>
                     </div>
                  </div>

                  {(deductionPayload.target_identifier || deductionPayload.sabhasad_id) && (
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
                              <span className="text-zinc-500 text-[8px] font-bold uppercase tracking-widest">{t('kapatConsole.modal.dangarJama')}</span>
                              <span className="text-emerald-700 font-mono font-bold text-xs leading-none">
                                 {parseFloat(activeAccountStats.dangar_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                           <div className="flex flex-col items-end px-3 py-1 bg-white border border-zinc-300">
                              <span className="text-zinc-500 text-[8px] font-bold uppercase tracking-widest">{t('kapatConsole.modal.udhar')}</span>
                              <span className="text-rose-700 font-mono font-bold text-xs leading-none">
                                 {parseFloat(activeAccountStats.net_debit || activeAccountStats.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                           </div>
                           <div className="flex flex-col items-end px-4 py-1 bg-zinc-800 text-white border border-zinc-800">
                              <span className="text-zinc-400 text-[8px] font-bold uppercase tracking-widest">{t('kapatConsole.modal.balance')}</span>
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
                        {[t('kapatConsole.modal.no'), t('kapatConsole.table.code'), t('kapatConsole.modal.accountName'), t('kapatConsole.modal.udhar'), t('kapatConsole.modal.amount')].map((h, i) => (
                           <div key={h} className={`py-1.5 text-[10px] font-bold text-zinc-500 uppercase ${i < 4 ? 'border-r border-zinc-300' : ''} ${i >= 3 ? 'text-right px-3' : 'text-center'}`}>{h}</div>
                        ))}
                     </div>

                     <div className="divide-y divide-zinc-200">
                        {selectedIdentities.length === 0 ? (
                           <div className="py-10 text-center text-xs text-zinc-400 font-bold">{t('kapatConsole.modal.noMembers')}</div>
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
                                 className={`grid cursor-pointer transition-colors ${isActive ? 'bg-zinc-100' : idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}`}
                                 style={{ gridTemplateColumns: '40px 80px 1fr 120px 110px' }}>
                                 <div className="border-r border-zinc-200 py-2 text-center text-xs font-mono font-bold text-zinc-400">{idx + 1}</div>
                                 <div className="border-r border-zinc-200 py-2 text-center text-xs font-sans font-bold text-zinc-700 force-en">{String(item.code || '').padStart(4, '0')}</div>
                                 <div className="border-r border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-800 tracking-tight truncate">
                                    {item.type === 'member'
                                       ? <span className="font-prompt-sm">{item.name}</span>
                                       : formatBilingualText(item.name)
                                    }
                                 </div>
                                 <div className="border-r border-zinc-200 px-3 py-2 flex flex-col items-end justify-center select-none">
                                    <div className={`text-xs font-mono font-bold text-rose-600`}>
                                       {bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                    {isActive && deducted !== 0 && (
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
                        <span className="text-xs font-bold text-zinc-600 uppercase">{t('kapatConsole.total')}</span>
                        <span className="text-base font-mono font-bold text-zinc-800 bg-white border border-zinc-300 px-4 py-1 min-w-[120px] text-right">
                           {Number(totalDeductionAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                     </div>

                     <div className="flex gap-2">
                        <button onClick={() => setShowDeductionModal(false)} className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold select-none">Cancel</button>
                        <button onClick={handleExecuteBatch} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 text-xs font-bold select-none transition flex items-center gap-1">
                           <CheckCircle size={14} /> {t('kapatConsole.modal.commitBatch')}
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
                        <h3 className="text-base font-bold text-zinc-900">{t('kapatConsole.addTargetModal.title')}</h3>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase">{t('kapatConsole.addTargetModal.subtitle')}</p>
                     </div>
                     <button onClick={() => setShowMembersModal(false)} className="p-1 border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-700 transition"><X size={16} /></button>
                  </div>

                  <div className="flex gap-1 bg-zinc-100 border border-zinc-300 p-1 mb-4 select-none">
                     <button onClick={() => setIdentityTab('member')} className={`flex-1 py-1.5 text-xs font-bold transition-all select-none ${identityTab === 'member' ? 'bg-white border border-zinc-300 text-zinc-800 shadow-sm' : 'text-zinc-600'}`}>{t('kapatConsole.addTargetModal.members')}</button>
                     <button onClick={() => setIdentityTab('account')} className={`flex-1 py-1.5 text-xs font-bold transition-all select-none ${identityTab === 'account' ? 'bg-white border border-zinc-300 text-zinc-800 shadow-sm' : 'text-zinc-600'}`}>{t('kapatConsole.addTargetModal.accounts')}</button>
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
                                    <p className="text-xs font-bold text-zinc-800 tracking-tight">{identityTab === 'member' ? <span className="font-prompt-sm">{name}</span> : formatBilingualText(name)}</p>
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
