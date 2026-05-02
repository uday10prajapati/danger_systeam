import React, { useState, useEffect, useRef } from 'react';
import {
   Shield, Search, Plus, Save, RefreshCcw,
   AlertCircle, CheckCircle, Database, Calendar,
   TrendingUp, Scale, Box, Loader, Info, Edit3, X, FileText, Printer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';
import Toast from '../components/Toast';
import Loading from '../components/Loading';

export default function DangarRateMaster() {
   const { t } = useTranslation();
   const [companyId, setCompanyId] = useState(null);
   const [companyName, setCompanyName] = useState('');
   const [items, setItems] = useState([]);
   const [rates, setRates] = useState([]);
   const [loading, setLoading] = useState(true);
   const [message, setMessage] = useState(null);
   const [financialYear, setFinancialYear] = useState('2026-27');
   const [searchTerm, setSearchTerm] = useState('');
   const [isSaving, setIsSaving] = useState(false);

   // Season Modal State
   const [showSeasonModal, setShowSeasonModal] = useState(false);
   const [newSeason, setNewSeason] = useState({ name: '', season: 'Winter', year: '2026-27' });
   const [currentSeason, setCurrentSeason] = useState(null);

   // Edit states
   const [editingItemId, setEditingItemId] = useState(null);
   const [editRate, setEditRate] = useState('');
   const [editWinterRate, setEditWinterRate] = useState('');
   const [editSummerRate, setEditSummerRate] = useState('');

   // Refs for season modal
   const seasonNameRef = useRef(null);
   const seasonTypeRef = useRef(null);
   const seasonYearRef = useRef(null);

   useEffect(() => {
      loadInitialData();
   }, [financialYear]);

   const loadInitialData = async () => {
      try {
         setLoading(true);
         const companyRes = await api.get('/company');
         const comp = companyRes?.data?.data;

         if (!companyRes?.data?.success || !comp?.id) {
            setCompanyId(null);
            setCompanyName('');
            setItems([]);
            setRates([]);
            setCurrentSeason(null);
            setMessage({ type: 'error', text: 'Company not found. Please create company first.' });
            return;
         }

         setCompanyId(comp.id);
         setCompanyName(comp.company_name || '');

         const headers = { 'X-Company-Id': comp.id };
         const [itemsListRes, ratesRes, seasonsRes] = await Promise.all([
            api.get('/items', { headers }),
            api.get('/dangar-rates', { headers, params: { year: financialYear } }),
            api.get(`/seasons/company/${comp.id}`)
         ]);

         if (itemsListRes?.data?.success) {
            setItems(itemsListRes.data.data || []);
         } else {
            setItems([]);
         }

         if (ratesRes?.data?.success) {
            setRates(ratesRes.data.data || []);
         } else {
            setRates([]);
         }

         if (seasonsRes?.data?.success && (seasonsRes.data.data || []).length > 0) {
            setCurrentSeason(seasonsRes.data.data[0]);
         } else {
            setCurrentSeason(null);
         }
      } catch (error) {
         console.error('Failed to load data:', error);
         setMessage({ type: 'error', text: 'Cloud infrastructure synchronization failure' });
      } finally {
         setLoading(false);
      }
   };

   const handleEdit = (item, rateObj) => {
      setEditingItemId(item.id);
      setEditRate(rateObj?.rate ?? '');
      setEditWinterRate(rateObj?.winter_rate ?? '');
      setEditSummerRate(rateObj?.summer_rate ?? '');
   };

   const handleSave = async (itemId) => {
      try {
         setIsSaving(true);
         const res = await api.post('/dangar-rates', {
            company_id: companyId,
            financial_year: financialYear,
            item_id: itemId,
            rate: parseFloat(editRate) || 0,
            winter_rate: parseFloat(editWinterRate) || 0,
            summer_rate: parseFloat(editSummerRate) || 0
         });

         if (res.data.success) {
            setMessage({ type: 'success', text: 'Rate configuration finalized' });
            setEditingItemId(null);
            loadInitialData();
         }
      } catch (error) {
         setMessage({ type: 'error', text: 'Secure commit failed' });
      } finally {
         setIsSaving(false);
      }
   };

   const handleCreateSeason = async (e) => {
      if (e) e.preventDefault();
      try {
         setIsSaving(true);
         const payload = {
            company_id: companyId,
            name: newSeason.name,
            season_type: newSeason.season,
            financial_year: newSeason.year
         };

         const res = await api.post('/seasons', payload);

         if (res.data.success) {
            setMessage({ type: 'success', text: 'New season configuration registered successfully' });
            setShowSeasonModal(false);
            setNewSeason({ name: '', season: 'Winter', year: '2026-27' });
            loadInitialData();
         } else {
            throw new Error(res.data.error || 'Server rejection');
         }
      } catch (error) {
         console.error('Season creation error:', error);
         setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to initialize new season' });
      } finally {
         setIsSaving(false);
      }
   };

   const handleSeasonKeyDown = (e, nextRef) => {
      if (e.key === 'Enter') {
         e.preventDefault();
         if (nextRef && nextRef.current) {
            nextRef.current.focus();
         } else {
            handleCreateSeason();
         }
      }
   };

   const filteredItems = items.filter(item =>
      (item.item_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.item_code || '').toLowerCase().includes(searchTerm.toLowerCase())
   );

   const handlePrint = () => {
      const cName = companyName || 'Company';
      const rows = filteredItems.map((item, i) => {
         const rateObj = rates.find(r => r.item_id === item.id);
         return `
         <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
           <td>${item.item_name}</td>
           <td>${item.item_code || '-'}</td>
           <td style="text-align:right">₹${parseFloat(rateObj?.rate || 0).toFixed(2)}</td>
           <td style="text-align:right">₹${parseFloat(rateObj?.winter_rate || 0).toFixed(2)}</td>
           <td style="text-align:right">₹${parseFloat(rateObj?.summer_rate || 0).toFixed(2)}</td>
         </tr>`;
      });
      const win = window.open('', '_blank', 'width=1100,height=800');
      win.document.write(`<html><head><title>Dangar Rate Master</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:10px;color:#1e293b;padding:32px}
        .logo-bar{background:#2563eb;color:#fff;padding:6px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
        .logo-bar h1{font-size:9.5px;font-weight:bold;text-transform:uppercase}
        .logo-bar .lbl{font-size:8px;color:#bfdbfe;font-weight:normal;letter-spacing:1px}
        .logo-bar .conf{font-size:8px;color:#fecaca;font-weight:bold;letter-spacing:0.5px}
        h2{font-size:16px;font-weight:bold;color:#0f172a;margin-bottom:2px}
        p.sub{font-size:8.5px;color:#64748b;margin-bottom:12px}
        hr{border:none;border-top:1px solid #e2e8f0;margin:8px 0}
        table{width:100%;border-collapse:collapse}
        thead tr{background:#2563eb;color:#fff}
        th{padding:8px 10px;font-size:8.5px;font-weight:700;text-transform:uppercase;text-align:left}
        td{padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:8.5px}
        tfoot tr{background:#1e40af;color:#fff;font-weight:700}
        @media print{@page{size:A4 portrait;margin:1.5cm}}
      </style></head><body>

      <div class='logo-bar'>
         <h1>${cName.toUpperCase()}</h1>
         <span class='lbl'>DANGAR RATE MASTER REGISTRY</span>
         <span class='conf'>CONFIDENTIAL</span>
      </div>
      <h2>Year-Wise Dangar Rate Master</h2>
      <p class='sub'>Financial Year: ${financialYear} &nbsp;|&nbsp; Items: ${filteredItems.length} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</p>
      <hr/>
      <table>
        <thead><tr><th>Item Name</th><th>SKU / Code</th><th style="text-align:right">1st Class Rate</th><th style="text-align:right">2nd Class Rate</th><th style="text-align:right">3rd Class Rate</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot><tr><td colspan='5'>TOTAL ITEMS: ${filteredItems.length} Commodities</td></tr></tfoot>
      </table></body></html>`);
      win.document.close(); win.focus();
      setTimeout(() => { win.print(); win.close(); }, 400);
   };

   const handleExportPDF = async () => {
      const cName = companyName || 'Company';
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 32;
      const navy = [15, 23, 42], white = [255, 255, 255], gray = [100, 116, 139];
      const dark = [30, 41, 59], stripe = [241, 245, 249];

      try {
         const res = await fetch('/fonts/NotoSansGujarati-Regular.ttf');
         const blob = await res.blob();
         await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
               doc.addFileToVFS('NotoSansGujarati.ttf', reader.result.split(',')[1]);
               doc.addFont('NotoSansGujarati.ttf', 'NotoGujarati', 'normal');
               resolve();
            };
            reader.readAsDataURL(blob);
         });
      } catch (e) { console.warn('Could not load font', e); }

      const hdr = () => {
         const navy = [37, 99, 235], white = [255, 255, 255];
         doc.setFillColor(...navy); doc.rect(0, 0, W, 26, 'F');
         doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
         doc.text(cName.toUpperCase(), M, 17);
         doc.setFontSize(7); doc.setTextColor(191, 219, 254);
         doc.text('DANGAR RATE MASTER REGISTRY', W / 2, 17, { align: 'center' });
         doc.setFontSize(7); doc.setTextColor(239, 68, 68);
         doc.text('CONFIDENTIAL', W - M, 17, { align: 'right' });
      };
      const ftr = (pg, tot) => {
         doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4);
         doc.line(M, H - 18, W - M, H - 18);
         doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
         doc.text(cName + ' - Dangar Rate Master', M, H - 9);
         doc.text('FY: ' + financialYear + '  |  Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' });
         doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' });
      };

      hdr();
      let y = 60;
      doc.setFont('NotoGujarati', 'bold'); doc.setFontSize(15); doc.setTextColor(37, 99, 235);
      doc.text('Year-Wise Dangar Rate Master', M, y);
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gray);
      doc.text('Financial Year: ' + financialYear + '  |  Items: ' + filteredItems.length + '  |  Generated: ' + new Date().toLocaleString('en-IN'), M, y + 13);
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
      y += 28;

      autoTable(doc, {
         startY: y,
         head: [['Item Name', 'SKU / Code', '1st Class Rate', '2nd Class Rate', '3rd Class Rate']],
         body: filteredItems.map(item => {
            const rateObj = rates.find(r => r.item_id === item.id);
            return [
               item.item_name,
               item.item_code || '-',
               rateObj ? parseFloat(rateObj.rate || 0).toFixed(2) : '0.00',
               rateObj ? parseFloat(rateObj.winter_rate || 0).toFixed(2) : '0.00',
               rateObj ? parseFloat(rateObj.summer_rate || 0).toFixed(2) : '0.00'
            ];
         }),
         foot: [['', 'TOTAL ITEMS', filteredItems.length + ' Commodities', '', '']],
         styles: { font: 'NotoGujarati', fontSize: 7.5, cellPadding: [5, 6], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
         headStyles: { font: 'NotoGujarati', fillColor: [37, 99, 235], textColor: white, fontStyle: 'bold' },
         footStyles: { font: 'NotoGujarati', fillColor: [37, 99, 235], textColor: white, fontStyle: 'bold' },
         alternateRowStyles: { fillColor: stripe },
         theme: 'grid',
         margin: { left: M, right: M }
      });

      const tot = doc.internal.getNumberOfPages();
      for (let i = 1; i <= tot; i++) { doc.setPage(i); ftr(i, tot); }
      doc.save('Dangar_Rate_Master_FY' + financialYear.replace('-', '_') + '.pdf');
   };

   if (loading && !companyId) {
      return <Loading />;
   }

   return (
      <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none animate-none">
         <Toast message={message} onClose={() => setMessage(null)} />

         <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
               <div>
                  <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 select-none">
                     <TrendingUp size={20} className="text-zinc-600" />
                     Dangar Rate Master
                  </h1>
                  <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider select-none">Registry Management / Dangar Rates</p>
               </div>
               
               <div className="flex flex-wrap items-center gap-2 select-none">
                  <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-300 px-3 py-1.5 select-none">
                     <Calendar size={14} className="text-zinc-400" />
                     <select
                        value={financialYear}
                        onChange={(e) => setFinancialYear(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs text-zinc-700 font-bold select-none"
                     >
                        <option value="2026-27">2026-27</option>
                        <option value="2025-26">2025-26</option>
                     </select>
                  </div>
                  <button
                     onClick={() => setShowSeasonModal(true)}
                     className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
                  >
                     <Plus size={14} /> New Season
                  </button>
                  <button
                     onClick={handleExportPDF}
                     className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
                  >
                     <FileText size={14} /> PDF
                  </button>
                  <button
                     onClick={handlePrint}
                     className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
                  >
                     <Printer size={14} /> Print
                  </button>
               </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-white p-5 border border-zinc-300 relative overflow-hidden flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-100 text-zinc-600 border border-zinc-200 flex items-center justify-center shrink-0">
                     <Database size={24} />
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Commodities</p>
                     <p className="text-xl font-black text-zinc-800 tracking-tight leading-none mt-1">{filteredItems.length}</p>
                  </div>
               </div>

               <div className="bg-white p-5 border border-zinc-300 relative overflow-hidden flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-100 text-zinc-600 border border-zinc-200 flex items-center justify-center shrink-0">
                     <TrendingUp size={24} />
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Avg 1st Class Rate</p>
                     <p className="text-xl font-black text-zinc-800 tracking-tight leading-none mt-1">
                        ₹{rates.length ? (rates.reduce((s, r) => s + (parseFloat(r.rate) || 0), 0) / rates.length).toFixed(2) : '0.00'}
                     </p>
                  </div>
               </div>

               <div className="bg-white p-5 border border-zinc-300 relative overflow-hidden flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-100 text-zinc-600 border border-zinc-200 flex items-center justify-center shrink-0">
                     <Calendar size={24} />
                  </div>
                  <div>
                     <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active Season</p>
                     <p className="text-xl font-black text-zinc-800 tracking-tight leading-none mt-1 uppercase">
                        {currentSeason ? `${currentSeason.name} (${currentSeason.season})` : 'Winter 26-27'}
                     </p>
                  </div>
               </div>
            </div>

            {/* Table Area */}
            <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
               <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3 select-none">
                  <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider select-none">
                        Dangar Rate Configuration Matrix
                     </span>
                     <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5 select-none">
                        {filteredItems.length} RECORDS
                     </span>
                  </div>

                  <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
                     <Search size={16} className="text-zinc-400" />
                     <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search items..."
                        className="bg-transparent border-none outline-none text-xs text-zinc-800 placeholder:text-zinc-400 w-full md:w-48 font-mono"
                     />
                  </div>
               </div>

               <div className="overflow-x-auto bg-white select-none flex-1">
                  <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50 select-none">
                     <tr>
                        <th scope="col" className="px-4 py-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Item Name</th>
                        <th scope="col" className="px-4 py-3 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">SKU</th>
                        <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold text-zinc-500 uppercase tracking-wider">1st Class (100kg)</th>
                        <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold text-zinc-500 uppercase tracking-wider">2nd Class (100kg)</th>
                        <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold text-zinc-500 uppercase tracking-wider">3rd Class (100kg)</th>
                        <th scope="col" className="px-4 py-3 text-right text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Ops</th>
                     </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-zinc-200 text-xs select-none">
                     {filteredItems.map((item, idx) => {
                        const rateObj = rates.find(r => r.item_id === item.id);
                        const isEditing = editingItemId === item.id;

                        return (
                           <tr key={item.id} className="hover:bg-zinc-50 transition select-none">
                              <td className="px-4 py-3.5 select-none">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-zinc-100 border border-zinc-300 flex items-center justify-center text-zinc-400 font-mono text-xs select-none">
                                       {idx + 1}
                                    </div>
                                    <div>
                                       <p className="font-bold text-zinc-800 uppercase tracking-tight">{item.item_name}</p>
                                       <p className="text-[10px] font-bold text-zinc-400">Category: {item.category || 'N/A'}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-zinc-500 select-none">
                                 {item.item_code}
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono font-bold text-zinc-800 select-none">
                                 {isEditing ? (
                                    <input
                                       type="number"
                                       value={editRate}
                                       onChange={(e) => setEditRate(e.target.value)}
                                       placeholder="0.00"
                                       className="w-24 px-2 py-1 bg-white border border-zinc-300 text-right font-bold text-zinc-700 outline-none focus:border-zinc-500 transition shadow-sm font-mono"
                                    />
                                 ) : (
                                    <span>
                                       {rateObj ? `₹${parseFloat(rateObj.rate).toFixed(2)}` : '0.00'}
                                    </span>
                                 )}
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono font-bold text-zinc-800 select-none">
                                 {isEditing ? (
                                    <input
                                       type="number"
                                       value={editWinterRate}
                                       onChange={(e) => setEditWinterRate(e.target.value)}
                                       placeholder="0.00"
                                       className="w-24 px-2 py-1 bg-white border border-zinc-300 text-right font-bold text-zinc-700 outline-none focus:border-zinc-500 transition shadow-sm font-mono"
                                    />
                                 ) : (
                                    <span>
                                       {rateObj ? `₹${parseFloat(rateObj.winter_rate || 0).toFixed(2)}` : '0.00'}
                                    </span>
                                 )}
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono font-bold text-zinc-800 select-none">
                                 {isEditing ? (
                                    <input
                                       type="number"
                                       value={editSummerRate}
                                       onChange={(e) => setEditSummerRate(e.target.value)}
                                       placeholder="0.00"
                                       className="w-24 px-2 py-1 bg-white border border-zinc-300 text-right font-bold text-zinc-700 outline-none focus:border-zinc-500 transition shadow-sm font-mono"
                                    />
                                 ) : (
                                    <span>
                                       {rateObj ? `₹${parseFloat(rateObj.summer_rate || 0).toFixed(2)}` : '0.00'}
                                    </span>
                                 )}
                              </td>

                              <td className="px-4 py-3.5 text-right select-none">
                                 {isEditing ? (
                                    <div className="flex items-center justify-end gap-1">
                                       <button
                                          onClick={() => handleSave(item.id)}
                                          disabled={isSaving}
                                          className="p-1.5 border border-zinc-300 bg-zinc-50 hover:bg-emerald-50 hover:text-emerald-600 text-zinc-600 transition"
                                          title="Save rates"
                                       >
                                          {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
                                       </button>
                                       <button
                                          onClick={() => setEditingItemId(null)}
                                          className="p-1.5 border border-zinc-300 bg-zinc-50 hover:bg-rose-50 hover:text-rose-600 text-zinc-600 transition"
                                          title="Cancel"
                                       >
                                          <X size={14} />
                                       </button>
                                    </div>
                                 ) : (
                                    <div className="flex items-center justify-end gap-1">
                                       <button
                                          onClick={async () => {
                                             if (!window.confirm(`Sync all previous entries for ${item.item_name} with current master rates?`)) return;
                                             try {
                                                setIsSaving(true);
                                                const res = await api.post('/dangar-entry/recalculate', {
                                                   item_id: item.id,
                                                   financial_year: financialYear,
                                                   company_id: companyId
                                                });
                                                if (res.data.success) {
                                                   setMessage({ type: 'success', text: res.data.message });
                                                }
                                             } catch (e) {
                                                setMessage({ type: 'error', text: 'Synchronization engine error' });
                                             } finally {
                                                setIsSaving(false);
                                             }
                                          }}
                                          disabled={isSaving}
                                          title="Recalculate earlier entries"
                                          className="p-1.5 border border-zinc-300 bg-zinc-50 hover:bg-amber-50 hover:text-amber-600 text-zinc-600 transition"
                                       >
                                          <RefreshCcw size={14} className={isSaving ? 'animate-spin' : ''} />
                                       </button>
                                       <button
                                          onClick={() => handleEdit(item, rateObj)}
                                          className="p-1.5 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 transition"
                                          title="Edit Rates"
                                       >
                                          <Edit3 size={14} />
                                       </button>
                                    </div>
                                 )}
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         </div>
       </div>

         {/* Season Registration Modal */}
         {showSeasonModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
               <div className="bg-white border border-zinc-300 p-5 w-full max-w-md animate-none">
                  <div className="flex justify-between items-center border-b border-zinc-300 pb-3 mb-4">
                     <h2 className="text-base font-bold text-zinc-800 flex items-center gap-2">
                        <Calendar size={18} className="text-zinc-600" />
                        Initialize New Season
                     </h2>
                     <button
                        onClick={() => setShowSeasonModal(false)}
                        className="p-1 border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-700 transition"
                     >
                        <X size={16} />
                     </button>
                  </div>

                  <form onSubmit={handleCreateSeason} className="space-y-4">
                     <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Season Description</label>
                        <input
                           ref={seasonNameRef}
                           type="text"
                           required
                           value={newSeason.name}
                           onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                           onKeyDown={(e) => handleSeasonKeyDown(e, seasonTypeRef)}
                           placeholder="e.g. Winter Epoch 26"
                           className="w-full px-3 py-1.5 bg-white border border-zinc-300 outline-none text-xs focus:border-zinc-600 transition font-mono font-bold text-zinc-700"
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                           <label className="text-[10px] font-bold text-zinc-500 uppercase">Season Type</label>
                           <select
                              ref={seasonTypeRef}
                              required
                              value={newSeason.season}
                              onChange={(e) => setNewSeason({ ...newSeason, season: e.target.value })}
                              onKeyDown={(e) => handleSeasonKeyDown(e, seasonYearRef)}
                              className="w-full px-3 py-1.5 bg-white border border-zinc-300 outline-none text-xs focus:border-zinc-600 transition font-mono font-bold text-zinc-700 uppercase"
                           >
                              <option value="Winter">Winter</option>
                              <option value="Summer">Summer</option>
                           </select>
                        </div>

                        <div className="flex flex-col gap-1">
                           <label className="text-[10px] font-bold text-zinc-500 uppercase">Financial Year</label>
                           <input
                              ref={seasonYearRef}
                              type="text"
                              required
                              value={newSeason.year}
                              onChange={(e) => setNewSeason({ ...newSeason, year: e.target.value })}
                              onKeyDown={(e) => handleSeasonKeyDown(e, null)}
                              placeholder="2026-27"
                              className="w-full px-3 py-1.5 bg-white border border-zinc-300 outline-none text-xs focus:border-zinc-600 transition font-mono font-bold text-zinc-700 text-center"
                           />
                        </div>
                     </div>

                     <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 mt-4">
                        <button
                           type="button"
                           onClick={() => setShowSeasonModal(false)}
                           className="bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-4 py-2 select-none"
                        >
                           Cancel
                        </button>
                        <button
                           type="submit"
                           disabled={isSaving}
                           className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 text-xs font-bold px-4 py-2 select-none transition flex items-center gap-1"
                        >
                           {isSaving ? <RefreshCcw size={13} className="animate-spin" /> : <Save size={13} />}
                           Register
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
}
