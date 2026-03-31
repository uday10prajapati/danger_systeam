import React, { useState, useEffect } from 'react';
import { Search, Printer, FileText } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import PurchaseForm from '../components/PurchaseForm';
import SaleForm from '../components/SaleForm';
import CashEntryModal from '../components/CashEntryModal';

export default function Rojmel() {
  const { t } = useTranslation();
  
  // Date State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);

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
  const maxRows = Math.max(jamaList.length, udharList.length);

  // Normalize arrays to maxRows
  const normalizedJama = [...jamaList];
  const normalizedUdhar = [...udharList];

  while (normalizedJama.length < maxRows) {
    normalizedJama.push({ details: '', sub_amount: '', amount: '' });
  }
  while (normalizedUdhar.length < maxRows) {
    normalizedUdhar.push({ details: '', sub_amount: '', amount: '' });
  }

  return (
    <div className="p-4 md:p-6 bg-[#f3f4f6] min-h-full flex flex-col relative">
      <div className="max-w-[1400px] mx-auto space-y-4 w-full">
        
        {/* Header Ribbon matching screenshot */}
        <div className="bg-[#46a2de] text-white py-2 px-4 shadow-sm flex items-center justify-between font-bold text-lg print:hidden">
           <div>રોજમેળ તારીખ {formatDate(date)}</div>
           <div className="flex gap-2">
             <button onClick={fetchRojmel} className="bg-white text-blue-800 text-sm px-4 py-1 rounded shadow hover:bg-blue-50 flex items-center gap-2">
               <Search size={16} /> જનરેટ (Generate)
             </button>
             <button onClick={handlePrint} className="bg-slate-800 text-white text-sm px-4 py-1 rounded shadow hover:bg-slate-700 flex items-center gap-2">
               <Printer size={16} /> પ્રિન્ટ (Print)
             </button>
           </div>
        </div>

        {/* Filters Top Bar */}
        <div className="bg-[#e4efff] border-b-2 border-[#46a2de] p-3 text-sm text-[#0d3b8e] font-semibold flex flex-wrap gap-8 items-center print:hidden shadow-sm">
           <label className="flex items-center gap-2 cursor-pointer">
             <input type="checkbox" checked={showSubledger} onChange={(e) => setShowSubledger(e.target.checked)} className="w-4 h-4 cursor-pointer" />
             સબલેજર બતાવવા (Show Subledger)
           </label>
           
           <label className="flex items-center gap-2 cursor-pointer">
             <input type="checkbox" checked={printItemDetails} onChange={(e) => setPrintItemDetails(e.target.checked)} className="w-4 h-4 cursor-pointer" />
             વસ્તુની વીગત છાપવી (Print Item Details)
           </label>

           <div className="flex items-center gap-2 mx-auto">
             <span>રોજમેળ તારીખ :</span>
             <input 
               type="date" 
               value={date} 
               onChange={(e) => setDate(e.target.value)}
               className="px-2 py-1 border border-blue-300 rounded outline-none w-40"
             />
           </div>

           <div className="flex items-center gap-2">
             <span>છેલ્લા રોજમેળ ની તા. :</span>
             <span className="text-blue-900 border-b border-blue-400 font-bold">{formatDate(new Date(new Date(date).getTime() - 86400000))}</span>
           </div>
        </div>

        {/* The Rojmel Main Report Container */}
        {loading ? (
             <div className="text-center py-20 print:hidden bg-white shadow min-h-[400px]">
               <div className="w-10 h-10 border-4 border-blue-300 border-t-blue-700 rounded-full animate-spin mx-auto mb-4"></div>
               <p className="font-bold text-blue-800">લોડ થઈ રહ્યું છે... (Loading...)</p>
             </div>
        ) : (
          <div className="bg-[#fcfdf7] shadow-lg border border-slate-300 print:shadow-none print:border-none">
            
            {/* Headers exactly like screenshot */}
            <div className="grid grid-cols-2 text-center font-bold text-[#0d3b8e] bg-[#e4efff] border-b-2 border-blue-400">
               <div className="py-2 border-r border-blue-400 text-lg uppercase tracking-wider">જમા (Jama | Receipts)</div>
               <div className="py-2 text-lg uppercase tracking-wider">ઉધાર (Udhar | Payments)</div>
            </div>

            <div className="grid grid-cols-2 text-sm text-[#0d3b8e] font-bold bg-[#e4efff] border-b border-blue-300">
               {/* Jama Headers */}
               <div className="grid grid-cols-12 border-r border-blue-400">
                  <div className="col-span-6 p-2 border-r border-blue-300 text-left">વીગત (Details)</div>
                  <div className="col-span-3 p-2 border-r border-blue-300 text-right">પેટા રકમ (Sub Amount)</div>
                  <div className="col-span-3 p-2 text-right">રકમ (Amount)</div>
               </div>
               
               {/* Udhar Headers */}
               <div className="grid grid-cols-12">
                  <div className="col-span-6 p-2 border-r border-blue-300 text-left">વીગત (Details)</div>
                  <div className="col-span-3 p-2 border-r border-blue-300 text-right">પેટા રકમ (Sub Amount)</div>
                  <div className="col-span-3 p-2 text-right">રકમ (Amount)</div>
               </div>
            </div>

            {/* Data Rows */}
            <div className="grid grid-cols-2 text-[13px] bg-white text-slate-800 min-h-[400px]">
               
               {/* Jama Side */}
               <div className="border-r border-blue-300 relative flex flex-col">
                 <div className="flex-1">
                   {normalizedJama.map((row, idx) => (
                     <div key={idx} className="grid grid-cols-12 border-b border-dashed border-slate-200 hover:bg-blue-50">
                        <div className="col-span-6 p-2 border-r border-slate-100 uppercase">{row.details}</div>
                        <div className="col-span-3 p-2 border-r border-slate-100 text-right font-medium text-slate-600">
                          {row.sub_amount !== '' && row.sub_amount !== null ? parseFloat(row.sub_amount).toFixed(2) : ''}
                        </div>
                        <div className="col-span-3 p-2 text-right font-bold text-slate-800">
                          {row.amount !== '' && row.amount !== null ? parseFloat(row.amount).toFixed(2) : ''}
                        </div>
                     </div>
                   ))}
                 </div>
                 {data?.totals && (
                   <div className="mt-auto grid grid-cols-12 border-t-2 border-blue-400 text-[#0d3b8e] font-bold bg-[#e4efff]">
                      <div className="col-span-9 p-2 border-r border-blue-300 text-left uppercase">સરવાળો (Total)</div>
                      <div className="col-span-3 p-2 text-right">{parseFloat(data.totals.jama_total).toFixed(2)}</div>
                   </div>
                 )}
               </div>

               {/* Udhar Side */}
               <div className="relative flex flex-col">
                 <div className="flex-1">
                   {normalizedUdhar.map((row, idx) => (
                     <div key={idx} className="grid grid-cols-12 border-b border-dashed border-slate-200 hover:bg-blue-50">
                        <div className="col-span-6 p-2 border-r border-slate-100 uppercase text-blue-900">{row.details}</div>
                        <div className="col-span-3 p-2 border-r border-slate-100 text-right font-medium text-slate-600">
                          {row.sub_amount !== '' && row.sub_amount !== null ? parseFloat(row.sub_amount).toFixed(2) : ''}
                        </div>
                        <div className="col-span-3 p-2 text-right font-bold text-slate-800">
                          {row.amount !== '' && row.amount !== null ? parseFloat(row.amount).toFixed(2) : ''}
                        </div>
                     </div>
                   ))}
                 </div>
                 {data?.totals && (
                   <div className="mt-auto grid grid-cols-12 border-t-2 border-blue-400 text-[#0d3b8e] font-bold bg-[#e4efff]">
                      <div className="col-span-9 p-2 border-r border-blue-300 text-left uppercase">સરવાળો (Total)</div>
                      <div className="col-span-3 p-2 text-right">{parseFloat(data.totals.udhar_total).toFixed(2)}</div>
                   </div>
                 )}
               </div>

            </div>
          </div>
        )}

        {/* Footer Action Bar directly below the card */}
        <div className="border border-blue-400 bg-[#cbdcf5] shadow-sm p-2 print:hidden flex justify-center mt-2 rounded-b">
           <div className="flex flex-wrap gap-1 md:gap-2 w-full justify-between">
              <button onClick={() => setActiveModal('credit')} className="flex-1 min-w-[80px] py-1.5 border border-slate-500 bg-gradient-to-b from-slate-100 to-slate-300 rounded shadow hover:from-slate-200 hover:to-slate-400 text-[13px] font-bold text-[#0d3b8e]">Credit</button>
              <button onClick={() => setActiveModal('purchase')} className="flex-1 min-w-[80px] py-1.5 border border-slate-500 bg-gradient-to-b from-slate-100 to-slate-300 rounded shadow hover:from-slate-200 hover:to-slate-400 text-[13px] font-bold text-[#0d3b8e]">Purchase</button>
              <button onClick={() => setActiveModal('sales')} className="flex-1 min-w-[80px] py-1.5 border border-slate-500 bg-gradient-to-b from-slate-100 to-slate-300 rounded shadow hover:from-slate-200 hover:to-slate-400 text-[13px] font-bold text-[#0d3b8e]">Sales</button>
              <button className="flex-1 min-w-[80px] py-1.5 border border-slate-500 bg-gradient-to-b from-slate-100 to-slate-300 rounded shadow hover:from-slate-200 hover:to-slate-400 text-[13px] font-bold text-[#0d3b8e] opacity-70">J.V.</button>
              <button className="flex-1 min-w-[80px] py-1.5 border border-slate-500 bg-gradient-to-b from-slate-100 to-slate-300 rounded shadow hover:from-slate-200 hover:to-slate-400 text-[13px] font-bold text-[#0d3b8e] opacity-70">Milk Entry</button>
              <button onClick={() => setActiveModal('debit')} className="flex-1 min-w-[80px] py-1.5 border border-slate-500 bg-gradient-to-b from-slate-100 to-slate-300 rounded shadow hover:from-slate-200 hover:to-slate-400 text-[13px] font-bold text-[#0d3b8e]">Debit</button>
              <button className="flex-1 min-w-[80px] py-1.5 border border-slate-500 bg-gradient-to-b from-slate-100 to-slate-300 rounded shadow hover:from-slate-200 hover:to-slate-400 text-[13px] font-bold text-red-600">Close</button>
              <div className="flex-[1.5] min-w-[140px] flex gap-1">
                 <button onClick={handlePrint} className="flex-1 py-1.5 border border-slate-500 bg-gradient-to-b from-slate-100 to-slate-300 rounded shadow hover:from-slate-200 hover:to-slate-400 text-[13px] font-bold text-[#0d3b8e]">Print</button>
                 <button className="flex-[1.5] py-1.5 border border-slate-500 bg-gradient-to-b from-slate-100 to-slate-300 rounded shadow hover:from-slate-200 hover:to-slate-400 text-[13px] font-bold text-[#0d3b8e] px-1 line-clamp-1 opacity-70">Receipt Print</button>
              </div>
              <button className="flex-[1.5] py-1.5 border border-slate-500 bg-gradient-to-b from-slate-100 to-slate-300 rounded shadow hover:from-slate-200 hover:to-slate-400 text-[13px] font-bold text-[#0d3b8e] opacity-70 whitespace-nowrap">Cashbook Date List</button>
           </div>
        </div>

      </div>

      {/* Modals Container */}
      {activeModal === 'purchase' && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
           <div className="min-h-screen flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl relative">
                 <PurchaseForm 
                    company={company} 
                    onClose={() => setActiveModal(null)} 
                    onSubmit={async (data) => {
                       await axios.post(`${import.meta.env.VITE_API_URL}/api/purchases`, data, { headers: { 'x-company-id': company.id, 'x-user-id': 1 }});
                       setActiveModal(null);
                       fetchRojmel();
                    }} 
                 />
              </div>
           </div>
        </div>
      )}

      {activeModal === 'sales' && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
           <div className="min-h-screen flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl relative">
                 <SaleForm 
                    company={company} 
                    onClose={() => setActiveModal(null)} 
                    onSubmit={async (data) => {
                       await axios.post(`${import.meta.env.VITE_API_URL}/api/sales/with-gst`, data, { headers: { 'x-company-id': company.id, 'x-user-id': 1 }});
                       setActiveModal(null);
                       fetchRojmel();
                    }} 
                 />
              </div>
           </div>
        </div>
      )}

      {(activeModal === 'credit' || activeModal === 'debit') && (
         <CashEntryModal 
           company={company}
           type={activeModal}
           onClose={() => setActiveModal(null)}
           onSubmit={() => { setActiveModal(null); fetchRojmel(); }}
         />
      )}
      
      {/* Print Styles representing standard Deshi Nama */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white !important; margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          .bg-\\[\\#46a2de\\] { background-color: #46a2de !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-\\[\\#e4efff\\] { background-color: #e4efff !important; color: #0d3b8e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-[#fcfdf7] { background-color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          * { border-color: #000 !important; }
          .border-slate-100, .border-slate-200, .border-blue-300, .border-blue-400 { border-color: #000 !important; }
          .text-\\[\\#0d3b8e\\], .text-slate-800 { color: #000 !important; }
        }
      `}} />
    </div>
  );
}
