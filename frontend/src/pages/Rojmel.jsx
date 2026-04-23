import React, { useState, useEffect } from 'react';
import { Search, Printer, FileText, X, ChevronRight, RefreshCcw, ChevronLeft } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
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
  const [activeModal, setActiveModal] = useState(null); // 'credit', 'debit', 'purchase', 'sales', null

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
    <div className="p-6 bg-slate-50 min-h-screen text-slate-900 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header Ribbon - Industrial Monochrome */}
        <div className="flex justify-between items-end border-b-4 border-black pb-4 print:hidden">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
              {t('rojmel.title', 'Rojmel')} <span className="text-slate-300 ml-2 font-black">/ {formatDate(date)}</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">DAILY CASH BOOK & LEDGER SETTLEMENT</p>
          </div>
          <div className="flex gap-3">
             <button onClick={fetchRojmel} className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-lg hover:bg-slate-800 font-black shadow-xl transition-all active:scale-95 uppercase tracking-widest text-[10px]">
               <RefreshCcw size={16} strokeWidth={3} />
               {t('common.generate', 'Generate')}
             </button>
             <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-black text-black rounded-lg hover:bg-slate-50 font-black shadow-lg transition-all active:scale-95 uppercase tracking-widest text-[10px]">
               <Printer size={16} strokeWidth={3} />
               {t('common.print', 'Print')}
             </button>
          </div>
        </div>

        {/* Global Toolbar - High Contrast Grayscale */}
        <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 flex flex-wrap gap-8 items-center print:hidden">
           <div className="flex gap-6 border-r border-slate-200 pr-8">
             <label className="flex items-center gap-2.5 cursor-pointer group outline-none" 
               tabIndex="0"
               onKeyDown={(e) => { if (e.key === 'Enter') setShowSubledger(!showSubledger); }}
             >
               <div className="relative w-5 h-5">
                 <input type="checkbox" checked={showSubledger} onChange={(e) => setShowSubledger(e.target.checked)} className="peer hidden" tabIndex="-1" />
                 <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-black peer-checked:border-black transition-all group-focus:border-black"></div>
                 <X size={14} className="absolute top-0.5 left-0.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={4} />
               </div>
               <span className="font-black text-[10px] text-slate-500 uppercase tracking-widest group-hover:text-black transition-colors">Show Subledger</span>
             </label>
             
             <label className="flex items-center gap-2.5 cursor-pointer group outline-none" 
               tabIndex="0"
               onKeyDown={(e) => { if (e.key === 'Enter') setPrintItemDetails(!printItemDetails); }}
             >
               <div className="relative w-5 h-5">
                 <input type="checkbox" checked={printItemDetails} onChange={(e) => setPrintItemDetails(e.target.checked)} className="peer hidden" tabIndex="-1" />
                 <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-black peer-checked:border-black transition-all group-focus:border-black"></div>
                 <X size={14} className="absolute top-0.5 left-0.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={4} />
               </div>
               <span className="font-black text-[10px] text-slate-500 uppercase tracking-widest group-hover:text-black transition-colors">Item Details</span>
             </label>
           </div>

           <div className="flex items-center gap-3">
             <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest leading-none">Primary Date :</span>
             <div className="flex items-center gap-1.5">
                <button 
                  disabled={!navDates.prev}
                  onClick={() => setDate(navDates.prev)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-black rounded-lg disabled:opacity-20 disabled:grayscale transition-all active:scale-90"
                  title="Previous Entry Date"
                >
                  <ChevronLeft size={18} strokeWidth={3} />
                </button>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="px-4 py-2 border-2 border-slate-100 rounded-lg outline-none w-48 focus:border-black transition-all bg-slate-50 font-black text-xs shadow-inner uppercase h-10"
                />
                <button 
                  disabled={!navDates.next}
                  onClick={() => setDate(navDates.next)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-black rounded-lg disabled:opacity-20 disabled:grayscale transition-all active:scale-90"
                  title="Next Entry Date"
                >
                  <ChevronRight size={18} strokeWidth={3} />
                </button>
             </div>
           </div>

           <div className="flex items-center gap-4 ml-auto">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Previous Log</span>
                <span className="text-slate-900 font-bold px-1 font-mono text-xs">{formatDate(new Date(new Date(date).getTime() - 86400000))}</span>
             </div>
           </div>
        </div>

        {/* The Rojmel Main Core UI */}
        {loading ? (
             <div className="text-center py-32 bg-white rounded-2xl shadow-2xl border border-slate-100 animate-pulse">
                <div className="w-16 h-1 bg-slate-200 mx-auto overflow-hidden rounded-full mb-6 relative">
                   <div className="absolute top-0 left-0 w-1/2 h-full bg-black animate-[slide_1.5s_infinite]"></div>
                </div>
                <p className="font-black text-slate-400 uppercase tracking-[0.4em] text-xs italic">Syncing Financial Ledger...</p>
             </div>
        ) : (
          <div className="bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-2xl overflow-hidden border border-slate-200 print:shadow-none print:border-black print:rounded-none">
            
            {/* Split Headers - Industrial Dark */}
            <div className="grid grid-cols-2 text-center font-black text-white bg-slate-900 border-b-2 border-black">
               <div className="py-4 border-r border-slate-800 text-sm uppercase tracking-[0.2em] italic">જમા (Jama | Receipts)</div>
               <div className="py-4 text-sm uppercase tracking-[0.2em] italic">ઉધાર (Udhar | Payments)</div>
            </div>

            <div className="grid grid-cols-2 text-[10px] text-slate-500 font-black bg-slate-50 border-b border-slate-200 uppercase tracking-widest">
               {/* Left (Jama) Subheaders */}
               <div className="grid grid-cols-12 border-r border-slate-200">
                  <div className="col-span-6 p-3 border-r border-slate-200">વીગત (Details)</div>
                  <div className="col-span-3 p-3 border-r border-slate-200 text-right">પેટા રકમ (Sub Amt)</div>
                  <div className="col-span-3 p-3 text-right">રકમ (Total Amt)</div>
               </div>
               {/* Right (Udhar) Subheaders */}
               <div className="grid grid-cols-12">
                  <div className="col-span-6 p-3 border-r border-slate-200">વીગત (Details)</div>
                  <div className="col-span-3 p-3 border-r border-slate-200 text-right">પેટા રકમ (Sub Amt)</div>
                  <div className="col-span-3 p-3 text-right">રકમ (Total Amt)</div>
               </div>
            </div>

            {/* Main Data Section */}
            <div className="grid grid-cols-2 text-xs bg-white text-slate-800 min-h-[500px]">
               
               {/* Jama Side */}
               <div className="border-r border-slate-200 relative flex flex-col">
                 <div className="flex-1">
                   {normalizedJama.map((row, idx) => {
                     const isOpening = row.isOpening;
                     const isClosing = row.isClosing;
                     const isGST = row.isGST;
                     let rowClasses = "grid grid-cols-12 border-b border-dotted hover:bg-slate-50 transition-colors ";
                     if (isOpening) rowClasses += "bg-slate-50 text-slate-900 font-black border-slate-200 border-t-2 border-b-2";
                     else if (isClosing) rowClasses += "bg-slate-100 text-slate-900 font-black border-slate-900 border-b-2 border-solid shadow-inner";
                     else rowClasses += "border-slate-100";
                     
                     return (
                      <div key={idx} className="group/row">
                        <div className={rowClasses}>
                           <div className={`col-span-6 p-3 border-r ${isOpening || isClosing ? 'border-transparent' : 'border-slate-50'} uppercase`}>
                             <div className={isOpening || isClosing ? "text-[14px] text-black font-black italic tracking-tighter" : "font-bold text-slate-800"}>{row.details}</div>
                             {printItemDetails && row.notes && (
                               <div className="text-[10px] text-slate-400 mt-1.5 font-bold italic leading-tight bg-slate-50 p-1.5 rounded border border-slate-100">{row.notes}</div>
                             )}
                           </div>
                           <div className={`col-span-3 p-3 border-r ${isOpening || isClosing ? 'border-transparent' : 'border-slate-50'} text-right font-mono font-bold text-slate-400`}>
                             {row.sub_amount !== '' && row.sub_amount !== null ? parseFloat(row.sub_amount).toFixed(2) : ''}
                           </div>
                           <div className={`col-span-3 p-3 text-right font-mono font-black ${isOpening || isClosing ? 'text-black text-[15px]' : 'text-slate-900 underline decoration-slate-100'}`}>
                             {row.amount !== '' && row.amount !== null ? parseFloat(row.amount).toFixed(2) : ''}
                           </div>
                        </div>
                        {/* Subledger Details */}
                        {showSubledger && isGST && row.subledger && row.subledger.length > 0 && (
                          <div className="bg-slate-50 border-l-4 border-slate-900 ml-4 my-1 rounded-r-lg overflow-hidden shadow-inner">
                            {row.subledger.map((subRow, subIdx) => (
                              <div key={subIdx} className="grid grid-cols-12 py-2 px-3 text-[10px] border-b border-slate-100 last:border-0 hover:bg-white transition-colors">
                                <div className="col-span-6 pl-2 border-r border-slate-100 text-slate-600 font-bold uppercase tracking-tight flex items-center gap-2">
                                   <ChevronRight size={10} className="text-slate-300" /> {subRow.description}
                                </div>
                                <div className="col-span-6 text-right text-slate-900 font-black font-mono tracking-tighter">{parseFloat(subRow.amount).toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )})}
                 </div>
                  {data?.totals && (
                    <div className="mt-auto grid grid-cols-12 border-t-2 border-black text-white font-black bg-black h-12 items-center">
                       <div className="col-span-9 p-3 border-r border-slate-800 text-left uppercase tracking-widest text-[10px]">Grand Total Receipts</div>
                       <div className="col-span-3 p-3 text-right font-mono text-[16px] tracking-tighter">₹{parseFloat(data.totals.jama_total).toFixed(2)}</div>
                    </div>
                  )}
               </div>

                {/* Udhar Side */}
                <div className="relative flex flex-col">
                  <div className="flex-1">
                    {normalizedUdhar.map((row, idx) => {
                      const isOpening = row.isOpening;
                      const isClosing = row.isClosing;
                      const isGST = row.isGST;
                      let rowClasses = "grid grid-cols-12 border-b border-dotted hover:bg-slate-50 transition-colors ";
                      if (isOpening) rowClasses += "bg-slate-50 text-slate-900 font-black border-slate-200 border-t-2 border-b-2";
                      else if (isClosing) rowClasses += "bg-slate-100 text-slate-900 font-black border-slate-900 border-b-2 border-solid shadow-inner";
                      else rowClasses += "border-slate-100";

                      return (
                      <div key={idx} className="group/row">
                        <div className={rowClasses}>
                           <div className={`col-span-6 p-3 border-r ${isOpening || isClosing ? 'border-transparent' : 'border-slate-50'} uppercase`}>
                             <div className={isOpening || isClosing ? "text-[14px] text-black font-black italic tracking-tighter" : "font-bold text-slate-800"}>{row.details}</div>
                             {printItemDetails && row.notes && (
                               <div className="text-[10px] text-slate-400 mt-1.5 font-bold italic leading-tight bg-slate-50 p-1.5 rounded border border-slate-100">{row.notes}</div>
                             )}
                           </div>
                           <div className={`col-span-3 p-3 border-r ${isOpening || isClosing ? 'border-transparent' : 'border-slate-50'} text-right font-mono font-bold text-slate-400`}>
                             {row.sub_amount !== '' && row.sub_amount !== null ? parseFloat(row.sub_amount).toFixed(2) : ''}
                           </div>
                           <div className={`col-span-3 p-3 text-right font-mono font-black ${isOpening || isClosing ? 'text-black text-[15px]' : 'text-slate-900 underline decoration-slate-100'}`}>
                             {row.amount !== '' && row.amount !== null ? parseFloat(row.amount).toFixed(2) : ''}
                           </div>
                        </div>
                        {/* Subledger Details */}
                        {showSubledger && isGST && row.subledger && row.subledger.length > 0 && (
                          <div className="bg-slate-50 border-l-4 border-slate-900 ml-4 my-1 rounded-r-lg overflow-hidden shadow-inner">
                            {row.subledger.map((subRow, subIdx) => (
                              <div key={subIdx} className="grid grid-cols-12 py-2 px-3 text-[10px] border-b border-slate-100 last:border-0 hover:bg-white transition-colors">
                                <div className="col-span-6 pl-2 border-r border-slate-100 text-slate-600 font-bold uppercase tracking-tight flex items-center gap-2">
                                   <ChevronRight size={10} className="text-slate-300" /> {subRow.description}
                                </div>
                                <div className="col-span-6 text-right text-slate-900 font-black font-mono tracking-tighter">{parseFloat(subRow.amount).toFixed(2)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )})}
                  </div>
                  {data?.totals && (
                    <div className="mt-auto grid grid-cols-12 border-t-2 border-black text-white font-black bg-black h-12 items-center">
                       <div className="col-span-9 p-3 border-r border-slate-800 text-left uppercase tracking-widest text-[10px]">Grand Total Payments</div>
                       <div className="col-span-3 p-3 text-right font-mono text-[16px] tracking-tighter">₹{parseFloat(data.totals.udhar_total).toFixed(2)}</div>
                    </div>
                  )}
                </div>

            </div>
          </div>
        )}

        {/* Global Control Module - Industrial Dark Action Bar */}
        <div className="bg-slate-900 p-4 border border-black shadow-2xl print:hidden flex justify-between items-center rounded-2xl">
           <div className="flex gap-2">
             <button onClick={() => setActiveModal('credit')} className="bg-white hover:bg-slate-50 text-black px-6 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg border border-black">Jama Entry</button>
             <button onClick={() => setActiveModal('debit')} className="bg-white hover:bg-slate-50 text-black px-6 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg border border-black">Udhar Entry</button>
             <div className="w-[1px] bg-slate-800 mx-2"></div>
             <button onClick={() => setActiveModal('purchase')} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all border border-slate-700">Procure</button>
             <button onClick={() => setActiveModal('sales')} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all border border-slate-700">Sell</button>
             <button onClick={() => setActiveModal('jv')} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all border border-slate-700">Journal</button>
           </div>
           
           <div className="flex gap-3">
             <button onClick={fetchRojmel} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg transition-all active:rotate-180 duration-500"><RefreshCcw size={18} /></button>
             <button onClick={() => setDate(new Date().toISOString().split('T')[0])} className="bg-red-900 hover:bg-red-800 text-white px-6 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg border border-red-800">Reset Date</button>
             <button onClick={handlePrint} className="bg-white text-black px-8 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all border border-black shadow-xl">Print Report</button>
           </div>
        </div>

      </div>

      {/* Entry Modals Container */}
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
           onClose={() => setActiveModal(null)}
           onSubmit={() => { setActiveModal(null); fetchRojmel(); }}
         />
      )}

      {activeModal === 'jv' && (
         <JVEntryModal 
           company={company}
           onClose={() => setActiveModal(null)}
           onSubmit={() => { setActiveModal(null); fetchRojmel(); }}
         />
      )}
      
      {/* Dynamic Master Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 1cm; size: auto; }
          body { background-color: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .bg-slate-900, .bg-black, .bg-slate-800 { background-color: #000 !important; color: #fff !important; }
          .bg-slate-50, .bg-slate-100, .bg-slate-200 { background-color: #f1f5f9 !important; }
          .border-slate-100, .border-slate-200, .border-slate-300, .border-slate-800 { border-color: #ddd !important; }
          .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; }
          table, .grid { page-break-inside: auto; }
          tr, .grid > div { page-break-inside: avoid; page-break-after: auto; }
        }
      `}} />
    </div>
  );
}
