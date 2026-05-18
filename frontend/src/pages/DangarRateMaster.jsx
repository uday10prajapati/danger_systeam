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
import { addGujaratiFont } from '../utils/pdfFonts';
import Toast from '../components/Toast';
import html2canvas from 'html2canvas';
import Loading from '../components/Loading';

export default function DangarRateMaster() {
   const { t } = useTranslation();
   const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
   const toGu = (num) => String(num ?? '').replace(/[0-9]/g, d => guDigits[d] || d);
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
            setMessage({ type: 'error', text: t('dangarRateMaster.errors.companyNotFound') });
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
         setMessage({ type: 'error', text: t('dangarRateMaster.errors.syncFailure') });
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
      (item.item_name_gu || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.item_code || '').toLowerCase().includes(searchTerm.toLowerCase())
   );

   const buildRateTableHTML = (forPrint = false) => {
      const cName = companyName || 'Company';
      const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
      const toGu = (num) => String(num || '').replace(/[0-9]/g, d => guDigits[d] || d);
      
      const tableRows = filteredItems.map((item, i) => {
         const rateObj = rates.find(r => r.item_id === item.id);
         return `
         <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
           <td style="padding:10px; font-family:'Prompt', sans-serif; font-weight:700; font-size: 13px; color: #1e293b;">${item.item_name_gu || item.item_name}</td>
           <td style="padding:10px; text-align:center; font-family:Arial, sans-serif; font-size: 12px; color: #64748b;">${item.item_code || '-'}</td>
           <td style="padding:10px; text-align:right; font-family:Arial, sans-serif; font-weight:700; font-size: 13px; color: #0f172a;">₹${parseFloat(rateObj?.rate || 0).toFixed(2)}</td>
           <td style="padding:10px; text-align:right; font-family:Arial, sans-serif; font-weight:700; font-size: 13px; color: #0f172a;">₹${parseFloat(rateObj?.winter_rate || 0).toFixed(2)}</td>
           <td style="padding:10px; text-align:right; font-family:Arial, sans-serif; font-weight:700; font-size: 13px; color: #0f172a;">₹${parseFloat(rateObj?.summer_rate || 0).toFixed(2)}</td>
         </tr>`;
      }).join('');

      return `
      <div style="border:1px solid #cbd5e1; background:#fff; font-family:'Noto Sans Gujarati', 'NotoGujarati', Arial, sans-serif; width: 850px;">
        <div style="background:#2563eb; color:#fff; padding:20px 30px; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:24px; font-weight:900; font-family:'Prompt', sans-serif;">${cName}</div>
          <div style="font-size:14px; font-weight:700; letter-spacing:1px; opacity:0.9;">${t('dangarRateMaster.pdf.title')}</div>
        </div>
        
        <div style="padding:30px;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#64748b; margin-bottom:20px; padding-bottom:12px; border-bottom:2px solid #f1f5f9;">
            <div>${t('dangarRateMaster.financialYear')}: <b style="color:#0f172a;">${financialYear}</b></div>
            <div>${t('itemMaster.totalItems')}: <b style="color:#0f172a;">${filteredItems.length}</b></div>
            <div>${t('dangarRateMaster.pdf.generated')}: <b style="color:#0f172a;">${new Date().toLocaleString('en-IN')}</b></div>
          </div>
          
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="background:#f8fafc; border-bottom: 2px solid #e2e8f0;">
                <th style="padding:12px 10px; text-align:left; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase;">${t('dangarRateMaster.table.itemName')}</th>
                <th style="padding:12px 10px; text-align:center; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase;">${t('dangarRateMaster.table.sku')}</th>
                <th style="padding:12px 10px; text-align:right; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase;">${t('dangarRateMaster.table.class1')}</th>
                <th style="padding:12px 10px; text-align:right; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase;">${t('dangarRateMaster.table.class2')}</th>
                <th style="padding:12px 10px; text-align:right; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase;">${t('dangarRateMaster.table.class3')}</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          
          <div style="margin-top:20px; background:#1e40af; color:#fff; padding:12px 20px; font-size:13px; font-weight:700; display:flex; justify-content:flex-end;">
            ${t('dangarRateMaster.pdf.totalItems')}: ${filteredItems.length}
          </div>
        </div>
      </div>`;
   };

   const handlePrint = () => {
      const cName = companyName || 'Company';
      const win = window.open('', '_blank', 'width=1100,height=800');
      win.document.write(`<html><head><title>${t('dangarRateMaster.pdf.title')}</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&display=swap" rel="stylesheet"/>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#fff;padding:20px;}
        @media print{@page{size:A4 portrait;margin:1.5cm}}
      </style></head><body>
      ${buildRateTableHTML(true)}
      </body></html>`);
      win.document.close(); win.focus();
      setTimeout(() => { win.print(); win.close(); }, 600);
   };

   const handleExportPDF = async () => {
      if (!filteredItems.length) {
         setMessage({ type: 'error', text: t('dangarRateMaster.errors.syncFailure') });
         return;
      }
      setLoading(true);
      try {
         const tempWrap = document.createElement('div');
         tempWrap.style.position = 'fixed';
         tempWrap.style.left = '-10000px';
         tempWrap.style.top = '0';
         tempWrap.style.width = '850px';
         tempWrap.style.background = '#fff';
         tempWrap.style.fontFamily = '"Noto Sans Gujarati", "NotoGujarati", "Prompt", Arial, sans-serif';
         tempWrap.innerHTML = buildRateTableHTML(false);
         document.body.appendChild(tempWrap);

         // Load fonts before capture
         if (document.fonts && document.fonts.ready) await document.fonts.ready;
         await new Promise(r => setTimeout(r, 600));

         const canvas = await html2canvas(tempWrap, { scale: 3, useCORS: true, backgroundColor: '#fff', logging: false });
         document.body.removeChild(tempWrap);

         const imgData = canvas.toDataURL('image/png');
         const doc = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
         const W = doc.internal.pageSize.getWidth();
         const H = doc.internal.pageSize.getHeight();
         const margin = 20;
         const imgW = W - margin * 2;
         const imgH = (canvas.height / canvas.width) * imgW;
         let yPos = margin;
         let remaining = imgH;
         let srcY = 0;
         const pageH = H - margin * 2;
         while (remaining > 0) {
            const sliceH = Math.min(remaining, pageH);
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = (sliceH / imgW) * canvas.width;
            const ctx = sliceCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, srcY * (canvas.width / imgW), canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
            doc.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, yPos, imgW, sliceH);
            remaining -= sliceH;
            srcY += sliceH;
            if (remaining > 0) { doc.addPage(); yPos = margin; }
         }
         doc.save(`Dangar_Rate_Master_FY${financialYear.replace('-', '_')}.pdf`);
      } catch (err) {
         console.error('PDF Export Error:', err);
         setMessage({ type: 'error', text: 'PDF generation failed' });
      } finally {
         setLoading(false);
      }
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
                     {t('dangarRateMaster.title')}
                  </h1>
                  <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider select-none">{t('dangarRateMaster.eyebrow')}</p>
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
                     <Plus size={14} /> {t('dangarRateMaster.newSeason')}
                  </button>
                  <button
                     onClick={handleExportPDF}
                     className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
                  >
                     <FileText size={14} />{t('common.pdf')}</button>
                  <button
                     onClick={handlePrint}
                     className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
                  >
                     <Printer size={14} /> {t('dangarMaster.print')}
                  </button>
               </div>
            </div>

            {/* Dense Minimalist Accounting Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
               <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
                  <span className="text-sm font-sans text-zinc-500 ">{t('dangarRateMaster.stats.totalCommodities')}</span>
                  <span className="text-2xl font-bold font-sans text-zinc-800 mt-1 force-en">{filteredItems.length}</span>
               </div>
               <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
                  <span className="text-sm font-sans text-zinc-500 ">{t('dangarRateMaster.stats.avgRate')}</span>
                  <span className="text-2xl font-bold font-sans text-zinc-800 mt-1 force-en">
                     ₹{rates.length ? (rates.reduce((s, r) => s + (parseFloat(r.rate) || 0), 0) / rates.length).toFixed(2) : '0.00'}
                  </span>
               </div>
               <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
                  <span className="text-sm font-sans text-zinc-500 ">{t('dangarRateMaster.stats.activeSeason')}</span>
                  <span className="text-2xl font-bold font-sans text-zinc-800 mt-1  truncate">
                      {currentSeason ? `${currentSeason.name} (${currentSeason.season_type === 'Summer' ? t('dangarRateMaster.summer') : currentSeason.season_type === 'Winter' ? t('dangarRateMaster.winter') : (currentSeason.season_type || '')})` : t('dangarRateMaster.stats.winter')}
                  </span>
               </div>
            </div>

            {/* Table Area */}
            <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
               <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3 select-none">
                  <div className="flex items-center gap-2">
                     <span className="text-sm font-bold text-zinc-700   select-none">
                        {t('dangarRateMaster.table.matrix')}
                     </span>
                     <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-sm px-2 py-0.5 select-none force-en">
                        {filteredItems.length} {t('dangarMaster.records')}
                     </span>
                  </div>

                  <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
                     <Search size={16} className="text-zinc-400" />
                     <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t('dangarRateMaster.searchPlaceholder')}
                        className="bg-transparent border-none outline-none text-xs text-zinc-800 placeholder:text-zinc-400 w-full md:w-48 font-mono"
                     />
                  </div>
               </div>

               <div className="overflow-x-auto bg-white select-none flex-1">
                  <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50 select-none">
                     <tr>
                        <th scope="col" className="px-4 py-3 text-left text-sm font-bold text-zinc-500 font-prompt">{t('dangarRateMaster.table.itemName')}</th>
                        <th scope="col" className="px-4 py-3 text-center text-sm font-bold text-zinc-500 font-prompt">{t('dangarRateMaster.table.sku')}</th>
                        <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-zinc-500 font-prompt">{t('dangarRateMaster.table.class1')}</th>
                        <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-zinc-500 font-prompt">{t('dangarRateMaster.table.class2')}</th>
                        <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-zinc-500 font-prompt">{t('dangarRateMaster.table.class3')}</th>
                        <th scope="col" className="px-4 py-3 text-right text-sm font-bold text-zinc-500 font-prompt">{t('dangarRateMaster.table.ops')}</th>
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
                                       {toGu(idx + 1)}
                                    </div>
                                    <div>
                                       <p className="font-bold text-zinc-800 tracking-tight font-prompt">{item.item_name_gu || item.item_name}</p>
                                       <p className="text-[10px] font-bold text-zinc-400">{t('dangarRateMaster.table.category') || 'Category'}: {item.category || 'N/A'}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-4 py-3.5 text-center font-sans text-sm font-bold text-zinc-500 select-none">
                                 {item.item_code}
                              </td>
                              <td className="px-4 py-3.5 text-right font-bold text-zinc-800 select-none force-en">
                                 {isEditing ? (
                                    <input
                                       type="number"
                                       value={editRate}
                                       onChange={(e) => setEditRate(e.target.value)}
                                       placeholder="0.00"
                                       className="w-24 px-2 py-1 bg-white border border-zinc-300 text-right font-bold text-zinc-700 outline-none focus:border-zinc-500 transition shadow-sm force-en"
                                    />
                                 ) : (
                                    <span>
                                       {rateObj ? `₹${parseFloat(rateObj.rate).toFixed(2)}` : '0.00'}
                                    </span>
                                 )}
                              </td>
                              <td className="px-4 py-3.5 text-right font-bold text-zinc-800 select-none force-en">
                                 {isEditing ? (
                                    <input
                                       type="number"
                                       value={editWinterRate}
                                       onChange={(e) => setEditWinterRate(e.target.value)}
                                       placeholder="0.00"
                                       className="w-24 px-2 py-1 bg-white border border-zinc-300 text-right font-bold text-zinc-700 outline-none focus:border-zinc-500 transition shadow-sm force-en"
                                    />
                                 ) : (
                                    <span>
                                       {rateObj ? `₹${parseFloat(rateObj.winter_rate || 0).toFixed(2)}` : '0.00'}
                                    </span>
                                 )}
                              </td>
                              <td className="px-4 py-3.5 text-right font-bold text-zinc-800 select-none force-en">
                                 {isEditing ? (
                                    <input
                                       type="number"
                                       value={editSummerRate}
                                       onChange={(e) => setEditSummerRate(e.target.value)}
                                       placeholder="0.00"
                                       className="w-24 px-2 py-1 bg-white border border-zinc-300 text-right font-bold text-zinc-700 outline-none focus:border-zinc-500 transition shadow-sm force-en"
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
                        {t('dangarRateMaster.initializeNewSeason')}
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
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">{t('dangarRateMaster.seasonDescription')}</label>
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
                           <label className="text-[10px] font-bold text-zinc-500 uppercase">{t('dangarRateMaster.seasonType')}</label>
                           <select
                              ref={seasonTypeRef}
                              required
                              value={newSeason.season}
                              onChange={(e) => setNewSeason({ ...newSeason, season: e.target.value })}
                              onKeyDown={(e) => handleSeasonKeyDown(e, seasonYearRef)}
                              className="w-full px-3 py-1.5 bg-white border border-zinc-300 outline-none text-xs focus:border-zinc-600 transition font-mono font-bold text-zinc-700 uppercase"
                           >
                              <option value="Winter">{t('dangarRateMaster.winter')}</option>
                              <option value="Summer">{t('dangarRateMaster.summer')}</option>
                           </select>
                        </div>

                        <div className="flex flex-col gap-1">
                           <label className="text-[10px] font-bold text-zinc-500 uppercase">{t('company.financialYear')}</label>
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
                           {t('common.cancel')}
                        </button>
                        <button
                           type="submit"
                           disabled={isSaving}
                           className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 text-xs font-bold px-4 py-2 select-none transition flex items-center gap-1"
                        >
                           {isSaving ? <RefreshCcw size={13} className="animate-spin" /> : <Save size={13} />}
                           {t('dangarRateMaster.register')}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
}
