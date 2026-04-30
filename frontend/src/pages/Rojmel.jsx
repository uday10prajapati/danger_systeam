import React, { useState, useEffect } from 'react';
import {
   Search, Printer, FileText, X, ChevronRight, RefreshCcw,
   ChevronLeft, Layout, ArrowRight, Calendar, Calculator,
   Activity, Database, ShieldCheck, Download, Plus, ShoppingBag,
   ArrowUpRight, ArrowDownLeft, FileSpreadsheet, Box
} from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import PurchaseForm from '../components/PurchaseForm';
import SaleForm from '../components/SaleForm';
import CashEntryModal from '../components/CashEntryModal';
import JVEntryModal from '../components/JVEntryModal';

export default function Rojmel() {
   const { t } = useTranslation();

   // Date State
   const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
   const [data, setData] = useState(null);
   const [loading, setLoading] = useState(true);
   const [company, setCompany] = useState(null);
   const [navDates, setNavDates] = useState({ prev: null, next: null });

   // Checkboxes
   const [showSubledger, setShowSubledger] = useState(false);
   const [printItemDetails, setPrintItemDetails] = useState(false);

   // Modal State
   const [activeModal, setActiveModal] = useState(null); // 'credit', 'debit', 'purchase', 'sales', 'jv', null
   const [editingEntry, setEditingEntry] = useState(null);

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
      if (company?.id && date) {
         fetchRojmel();
         fetchNavDates();
      }
   }, [date, company]);

   const fetchNavDates = async () => {
      try {
         const response = await axios.get('/api/rojmel/nav-dates', {
            params: { date },
            headers: { 'x-company-id': company.id }
         });
         if (response.data.success) {
            setNavDates({
               prev: response.data.prevDate || null,
               next: response.data.nextDate || null
            });
         }
      } catch (error) {
         console.error('Fetch nav dates error:', error);
      }
   };

   const fetchRojmel = async () => {
      if (!company?.id || !date) return;
      setLoading(true);
      try {
         const response = await axios.get('/api/rojmel', {
            params: { date },
            headers: { 'x-company-id': company.id }
         });

         if (response.data.success) {
            setData(response.data.data);
         }
      } catch (error) {
         console.error('Fetch rojmel error:', error);
      } finally {
         setLoading(false);
      }
   };

   const handlePrint = () => {
      window.print();
   };

   const handleDownloadPDF = async () => {
      const element = document.getElementById('rojmel-container');
      if (!element) return;

      try {
         const dataUrl = await toPng(element, {
            quality: 0.95,
            pixelRatio: 2,
            backgroundColor: '#F8FAFC'
         });

         const pdf = new jsPDF('p', 'mm', 'a4');
         const imgProps = pdf.getImageProperties(dataUrl);
         const pdfWidth = pdf.internal.pageSize.getWidth();
         const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

         pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
         pdf.save(`Rojmel_${date}.pdf`);
      } catch (err) {
         console.error('PDF Generation Failed:', err);
      }
   };

   const handleEditEntry = (row, side) => {
      if (!row.id || row.isOpening || row.isClosing) return;

      // 1. Check if it is a Journal Voucher item
      if (String(row.id).startsWith('JV-ITEM-')) {
         setEditingEntry({ id: row.id.split('-').pop(), type: 'jv' });
         setActiveModal('jv');
         return;
      }

      // 2. Default to Cash Entry for standard IDs
      setEditingEntry({ id: row.id, side: side, type: 'cash' });
      setActiveModal(side === 'jama' ? 'credit' : 'debit');
   };

   const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
   };

   // Helper to ensure both lists have the same number of rows for visually balanced table
   const jamaList = data?.jama || [];
   const udharList = data?.udhar || [];

   let jamaClosed = null;
   let udharClosed = null;

   // Separate closing rows out
   const baseJama = jamaList.filter(r => {
      if (r.isOpening) return true; // keep opening
      if (r.isClosing) { jamaClosed = r; return false; }
      return true;
   });

   const baseUdhar = udharList.filter(r => {
      if (r.isOpening) return true; // keep opening
      if (r.isClosing) { udharClosed = r; return false; }
      return true;
   });

   // Calculate max rows for transactions
   const maxBaseRows = Math.max(baseJama.length, baseUdhar.length);

   // Pad to max elements
   const paddedJama = [...baseJama];
   const paddedUdhar = [...baseUdhar];
   while (paddedJama.length < maxBaseRows) {
      paddedJama.push({ details: '', sub_amount: '', amount: '' });
   }
   while (paddedUdhar.length < maxBaseRows) {
      paddedUdhar.push({ details: '', sub_amount: '', amount: '' });
   }

   // Append closing row at the absolute bottom
   if (jamaClosed || udharClosed) {
      paddedJama.push(jamaClosed || { details: '', sub_amount: '', amount: '' });
      paddedUdhar.push(udharClosed || { details: '', sub_amount: '', amount: '' });
   }

   const normalizedJama = paddedJama;
   const normalizedUdhar = paddedUdhar;

   return (
      <div className="min-h-screen bg-[#F8FAFC] pb-24 animate-in fade-in duration-700 font-sans">
         <div className="max-w-[1600px] mx-auto px-8">

            {/* Superior Header - Dashboard Style */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-6 print:hidden">
               <div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
                     <Calculator size={12} />
                     <span>Fiscal Core / Live Daily Journal (Rojmel)</span>
                  </div>
                  <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                     Daily Financial Ledger
                     <span className="text-slate-300 font-mono text-xl">[{formatDate(date)}]</span>
                  </h1>
               </div>

               <div className="flex gap-3">
                  <button onClick={fetchRojmel} className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-all shadow-sm active:scale-95">
                     <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                  </button>
                  <button onClick={handleDownloadPDF} className="flex items-center gap-3 px-8 py-3.5 bg-blue-600 text-white rounded-lg font-bold uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95">
                     <Download size={16} strokeWidth={3} /> Download Report
                  </button>
               </div>
            </div>

            {/* Command Deck Toolbar */}
            <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm mb-10 print:hidden flex flex-wrap items-center gap-10">

               <div className="flex items-center gap-4 border-r border-slate-100 pr-10">
                  <label className="flex items-center gap-3 cursor-pointer group">
                     <div className="relative w-6 h-6">
                        <input type="checkbox" checked={showSubledger} onChange={(e) => setShowSubledger(e.target.checked)} className="peer hidden" />
                        <div className="w-6 h-6 border-2 border-slate-100 rounded-lg peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all group-hover:border-blue-200"></div>
                        <X size={14} className="absolute top-1 left-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={4} />
                     </div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic group-hover:text-slate-600">Show Subledger</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                     <div className="relative w-6 h-6">
                        <input type="checkbox" checked={printItemDetails} onChange={(e) => setPrintItemDetails(e.target.checked)} className="peer hidden" />
                        <div className="w-6 h-6 border-2 border-slate-100 rounded-lg peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all group-hover:border-blue-200"></div>
                        <X size={14} className="absolute top-1 left-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={4} />
                     </div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic group-hover:text-slate-600">Item Details</span>
                  </label>
               </div>

               <div className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic leading-none">Journal Timeline:</span>
                  <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100 shadow-inner">
                     <button disabled={!navDates.prev} onClick={() => setDate(navDates.prev)} className="p-2.5 bg-white text-slate-400 hover:text-blue-600 rounded-lg disabled:opacity-30 disabled:pointer-events-none shadow-sm transition-all active:scale-90">
                        <ChevronLeft size={18} strokeWidth={3} />
                     </button>
                     <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent px-4 py-2 text-xs font-bold text-slate-600 outline-none font-mono" />
                     <button disabled={!navDates.next} onClick={() => setDate(navDates.next)} className="p-2.5 bg-white text-slate-400 hover:text-blue-600 rounded-lg disabled:opacity-30 disabled:pointer-events-none shadow-sm transition-all active:scale-90">
                        <ChevronRight size={18} strokeWidth={3} />
                     </button>
                  </div>
               </div>

               <div className="ml-auto text-right">
                  <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1 italic leading-none">Previous Ledger Node</p>
                  <p className="text-xs font-bold text-slate-400 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 italic">{formatDate(new Date(new Date(date).getTime() - 86400000))}</p>
               </div>
            </div>

            {/* Ledger Core Container */}
            <div id="rojmel-container" className="bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)] rounded-lg overflow-hidden border border-slate-100 flex flex-col min-h-[700px] print:shadow-none print:border-black print:rounded-none">

               {/* Ledger Master Headers */}
               <div className="grid grid-cols-2 text-center border-b border-slate-100 relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-px bg-slate-50 print:bg-black"></div>

                  <div className="py-8 bg-emerald-50/10 flex flex-col items-center justify-center relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                     <div className="flex items-center gap-2.5 mb-1.5 relative z-10">
                        <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg"><Plus size={16} /></div>
                        <h2 className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.4em] italic">Jama (Receipts)</h2>
                     </div>
                     <p className="text-xs font-bold text-slate-800 tracking-tight uppercase relative z-10">Incoming Capital Stream</p>
                  </div>

                  <div className="py-8 bg-blue-50/10 flex flex-col items-center justify-center relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                     <div className="flex items-center gap-2.5 mb-1.5 relative z-10">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg"><ShoppingBag size={16} /></div>
                        <h2 className="text-[9px] font-black text-blue-600 uppercase tracking-[0.4em] italic">Udhar (Payments)</h2>
                     </div>
                     <p className="text-xs font-bold text-slate-800 tracking-tight uppercase relative z-10">Outgoing Liquidity Flow</p>
                  </div>
               </div>

               {/* Table Subheaders */}
               <div className="grid grid-cols-2 bg-[#F8FAFC] border-b border-slate-50 uppercase text-[9px] font-bold text-slate-400 tracking-widest italic">
                  <div className="grid grid-cols-12 border-r border-slate-50">
                     <div className="col-span-6 px-10 py-5 text-left">Nomenclature Breakdown</div>
                     <div className="col-span-3 px-8 py-5 text-right">Sub_vector</div>
                     <div className="col-span-3 px-10 py-5 text-right bg-emerald-50/20 text-emerald-600">Total Yield</div>
                  </div>
                  <div className="grid grid-cols-12">
                     <div className="col-span-6 px-10 py-5 text-left">Nomenclature Breakdown</div>
                     <div className="col-span-3 px-8 py-5 text-right">Sub_vector</div>
                     <div className="col-span-3 px-10 py-5 text-right bg-blue-50/20 text-blue-600">Total Yield</div>
                  </div>
               </div>

               {/* Ledger Core Data */}
               <div className="grid grid-cols-2 flex-1 divide-x divide-slate-50 relative">

                  {/* Receipt Vector (Jama) */}
                  <div className="flex flex-col">
                     <div className="flex-1 divide-y divide-slate-50/50">
                        {loading ? (
                           <div className="py-32 text-center opacity-30"><RefreshCcw className="animate-spin mx-auto" /></div>
                        ) : normalizedJama.map((row, idx) => {
                           const isHighNode = row.isOpening || row.isClosing;
                           return (
                              <div key={idx} className="group" onDoubleClick={() => handleEditEntry(row, 'jama')}>
                                 <div className={`grid grid-cols-12 transition-all items-center ${isHighNode ? 'bg-slate-50/80' : 'hover:bg-slate-50/30'}`}>
                                    <div className="col-span-6 px-10 py-5">
                                       <div className="flex items-center gap-2">
                                          {(row.isJV || row.isContra) && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" title="Journal Entry"></div>}

                                          <p className={`uppercase italic tracking-tight ${isHighNode ? 'font-black text-slate-900 text-sm' : 'font-bold text-slate-600 text-xs'}`}>{row.details}</p>
                                       </div>
                                       {printItemDetails && row.notes && (
                                          <p className="text-[9px] font-bold text-slate-300 mt-1 uppercase italic tracking-widest">{row.notes}</p>
                                       )}
                                    </div>
                                    <div className="col-span-3 px-8 py-5 text-right font-mono text-[11px] font-bold text-slate-400 italic">
                                       {row.sub_amount ? parseFloat(row.sub_amount).toFixed(2) : ''}
                                    </div>
                                    <div className={`col-span-3 px-10 py-5 text-right font-mono font-bold tracking-tighter ${isHighNode ? 'text-slate-900 text-base italic' : 'text-slate-800 text-xs'}`}>
                                       {row.amount ? parseFloat(row.amount).toFixed(2) : ''}
                                    </div>
                                 </div>

                                 {/* Subledger Shard */}
                                 {showSubledger && row.isGST && row.subledger?.length > 0 && (
                                    <div className="bg-[#F8FAFC]/50 px-10 py-3 space-y-2 border-l-4 border-emerald-500 m-2 rounded-lg">
                                       {row.subledger.map((sub, sIdx) => (
                                          <div key={sIdx} className="flex justify-between items-center text-[10px] font-bold italic tracking-tight">
                                             <span className="text-slate-400 flex items-center gap-2"><ArrowRight size={10} /> {sub.description}</span>
                                             <span className="text-slate-900 font-mono">₹{parseFloat(sub.amount).toFixed(2)}</span>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </div>
                           )
                        })}
                     </div>
                     {data?.totals && (
                        <div className="mt-6 bg-[#F8FAFC] p-6 rounded-lg border border-slate-100 flex justify-between items-center relative overflow-hidden group border-l-4 border-l-emerald-600">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                           <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-0.5 italic">Consolidated Intake</p>
                              <h4 className="text-slate-800 text-base font-black italic tracking-tighter uppercase leading-none">Gross Posted Jama</h4>
                           </div>
                           <div className="text-right relative z-10">
                              <p className="text-emerald-600 text-2xl font-black italic font-mono tracking-tighter leading-none">₹{parseFloat(data.totals.jama_total).toFixed(2)} C</p>
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Payment Vector (Udhar) */}
                  <div className="flex flex-col">
                     <div className="flex-1 divide-y divide-slate-50/50">
                        {loading ? (
                           <div className="py-32 text-center opacity-30"><RefreshCcw className="animate-spin mx-auto" /></div>
                        ) : normalizedUdhar.map((row, idx) => {
                           const isHighNode = row.isOpening || row.isClosing;
                           return (
                              <div key={idx} className="group" onDoubleClick={() => handleEditEntry(row, 'udhar')}>
                                 <div className={`grid grid-cols-12 transition-all items-center ${isHighNode ? 'bg-slate-50/80' : 'hover:bg-slate-50/30'}`}>
                                    <div className="col-span-6 px-10 py-5">
                                       <div className="flex items-center gap-2">
                                          {(row.isJV || row.isContra) && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>}
                                          <p className={`uppercase italic tracking-tight ${isHighNode ? 'font-black text-slate-900 text-sm' : 'font-bold text-slate-600 text-xs'}`}>{row.details}</p>
                                       </div>
                                       {printItemDetails && row.notes && (
                                          <p className="text-[9px] font-bold text-slate-300 mt-1 uppercase italic tracking-widest">{row.notes}</p>
                                       )}
                                    </div>
                                    <div className="col-span-3 px-8 py-5 text-right font-mono text-[11px] font-bold text-slate-400 italic">
                                       {row.sub_amount ? parseFloat(row.sub_amount).toFixed(2) : ''}
                                    </div>
                                    <div className={`col-span-3 px-10 py-5 text-right font-mono font-bold tracking-tighter ${isHighNode ? 'text-slate-900 text-base italic' : 'text-slate-800 text-xs'}`}>
                                       {row.amount ? parseFloat(row.amount).toFixed(2) : ''}
                                    </div>
                                 </div>

                                 {/* Subledger Shard */}
                                 {showSubledger && row.isGST && row.subledger?.length > 0 && (
                                    <div className="bg-[#F8FAFC]/50 px-10 py-3 space-y-2 border-l-4 border-blue-500 m-2 rounded-lg">
                                       {row.subledger.map((sub, sIdx) => (
                                          <div key={sIdx} className="flex justify-between items-center text-[10px] font-bold italic tracking-tight">
                                             <span className="text-slate-400 flex items-center gap-2"><ArrowRight size={10} /> {sub.description}</span>
                                             <span className="text-slate-900 font-mono">₹{parseFloat(sub.amount).toFixed(2)}</span>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </div>
                           )
                        })}
                     </div>
                     {data?.totals && (
                        <div className="mt-6 bg-[#F8FAFC] p-6 rounded-lg border border-slate-100 flex justify-between items-center relative overflow-hidden group border-l-4 border-l-blue-600">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                           <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-0.5 italic">Consolidated Outflow</p>
                              <h4 className="text-slate-800 text-base font-black italic tracking-tighter uppercase leading-none">Gross Posted Udhar</h4>
                           </div>
                           <div className="text-right relative z-10">
                              <p className="text-blue-600 text-2xl font-black italic font-mono tracking-tighter leading-none">₹{parseFloat(data.totals.udhar_total).toFixed(2)} D</p>
                           </div>
                        </div>
                     )}
                  </div>

               </div>
            </div>

            {/* Floating Command Hub - Airy Glassmorphic Shard */}
            <div className="mt-8 bg-white/80 backdrop-blur-xl p-3 border border-slate-200/50 shadow-[0_30px_70px_rgba(0,0,0,0.08)] rounded-lg flex items-center gap-2 z-50 print:hidden">

               <div className="flex gap-2 p-1 bg-slate-50/50 rounded-lg border border-slate-100">
                  <button
                     onClick={() => { setEditingEntry(null); setActiveModal('credit'); }}
                     className="bg-emerald-600 text-white pl-4 pr-6 py-3 rounded-lg font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-100 flex items-center gap-2 transition-all hover:bg-emerald-700 active:scale-95"
                  >
                     <ArrowUpRight size={14} strokeWidth={3} /> Jama (Receipt)
                  </button>
                  <button
                     onClick={() => { setEditingEntry(null); setActiveModal('debit'); }}
                     className="bg-blue-600 text-white pl-4 pr-6 py-3 rounded-lg font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2 transition-all hover:bg-blue-700 active:scale-95"
                  >
                     <ArrowDownLeft size={14} strokeWidth={3} /> Udhar (Payment)
                  </button>
               </div>

               <div className="w-px h-8 bg-slate-100 mx-2"></div>

               <div className="flex gap-2">
                  <button
                     onClick={() => setActiveModal('purchase')}
                     className="bg-white border border-slate-100 text-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-lg font-bold uppercase text-[9px] tracking-widest transition-all active:scale-95 shadow-sm flex items-center gap-2"
                  >
                     <Box size={14} /> Procure
                  </button>
                  <button
                     onClick={() => setActiveModal('sales')}
                     className="bg-white border border-slate-100 text-violet-600 hover:bg-violet-50 px-6 py-3 rounded-lg font-bold uppercase text-[9px] tracking-widest transition-all active:scale-95 shadow-sm flex items-center gap-2"
                  >
                     <ShoppingBag size={14} /> Sell
                  </button>
                  <button
                     onClick={() => setActiveModal('jv')}
                     className="bg-white border border-slate-100 text-slate-500 hover:bg-slate-50 px-6 py-3 rounded-lg font-bold uppercase text-[9px] tracking-widest transition-all active:scale-95 shadow-sm flex items-center gap-2"
                  >
                     <FileSpreadsheet size={14} /> Journal
                  </button>
               </div>

               <div className="w-px h-8 bg-slate-100 mx-2"></div>

               <div className="flex gap-1 pr-2">
                  <button
                     onClick={() => setDate(new Date().toISOString().split('T')[0])}
                     className="p-3 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:rotate-[-45deg] group"
                     title="Reset Timeline Node"
                  >
                     <HistoryIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  </button>
                  <div className="flex gap-2 p-1 bg-slate-50/50 rounded-lg border border-slate-100 ml-4 italic">
                     <button
                        onClick={handleDownloadPDF}
                        className="bg-white text-indigo-600 p-3 rounded-lg hover:bg-slate-50 transition-all active:scale-95 shadow-sm border border-slate-100"
                        title="Download Daily PDF"
                     >
                        <Download size={20} strokeWidth={3} />
                     </button>
                  </div>
               </div>
            </div>

         </div>

         {/* Entry Modals - Logic Intact */}
         {activeModal === 'purchase' && (
            <PurchaseForm
               company={company}
               onCancel={() => setActiveModal(null)}
               onSubmit={() => { setActiveModal(null); fetchRojmel(); }}
            />
         )}

         {activeModal === 'sales' && (
            <SaleForm
               company={company}
               onCancel={() => setActiveModal(null)}
               onSubmit={() => { setActiveModal(null); fetchRojmel(); }}
            />
         )}

         {(activeModal === 'credit' || activeModal === 'debit') && (
            <CashEntryModal
               company={company}
               type={activeModal}
               editId={editingEntry?.type === 'cash' ? editingEntry.id : null}
               onClose={() => { setActiveModal(null); setEditingEntry(null); }}
               onSubmit={() => { setActiveModal(null); setEditingEntry(null); fetchRojmel(); }}
            />
         )}

         {activeModal === 'jv' && (
            <JVEntryModal
               company={company}
               initialDate={date}
               editId={editingEntry?.type === 'jv' ? editingEntry.id : null}
               onClose={() => { setActiveModal(null); setEditingEntry(null); }}
               onSubmit={() => { setActiveModal(null); setEditingEntry(null); fetchRojmel(); }}
            />
         )}

         {/* Dynamic Master Print Styles */}
         <style dangerouslySetInnerHTML={{
            __html: `
        @media print {
          @page { margin: 1cm; size: auto; }
          body { background-color: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .bg-slate-900, .bg-black, .bg-slate-800 { background-color: #000 !important; color: #fff !important; }
          .bg-slate-50, .bg-slate-100, .bg-slate-200 { background-color: #f1f5f9 !important; }
          .border-slate-100, .border-slate-200, .border-slate-300, .border-slate-800 { border-color: #ddd !important; }
          .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; }
          .grid { display: grid !important; }
          .col-span-6 { grid-column: span 6 / span 6 !important; }
          .col-span-3 { grid-column: span 3 / span 3 !important; }
        }
        .scroller-airy::-webkit-scrollbar { width: 4px; }
        .scroller-airy::-webkit-scrollbar-track { background: transparent; }
        .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
      </div>
   );
}

const HistoryIcon = ({ className }) => (
   <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
   </svg>
);
