import React, { useState, useEffect } from 'react';
import {
   Search, Printer, FileText, X, ChevronRight, RefreshCcw,
   ChevronLeft, Layout, ArrowRight, Calendar, Calculator,
   Activity, Database, ShieldCheck, Download, Plus, ShoppingBag,
   ArrowUpRight, ArrowDownLeft, FileSpreadsheet, Box
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PurchaseForm from '../components/PurchaseForm';
import SaleForm from '../components/SaleForm';
import CashEntryModal from '../components/CashEntryModal';
import JVEntryModal from '../components/JVEntryModal';
import Loading from '../components/Loading';
import api from '../api';

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
   const [searchQuery, setSearchQuery] = useState('');

   useEffect(() => {
      loadCompany();
   }, []);

   const loadCompany = async () => {
      try {
         setLoading(true);
         const response = await api.get('/company');
         if (response.data.success && response.data.data) {
            setCompany(response.data.data);
         }
      } catch (error) {
         console.error('Failed to load company', error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      if (company?.id && date) {
         fetchRojmel();
         fetchNavDates();
      }
   }, [date, company, showSubledger, printItemDetails]);

   const fetchNavDates = async () => {
      try {
         const response = await api.get('/rojmel/nav-dates', {
            params: { date }
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
         const response = await api.get('/rojmel', {
            params: { 
               date, 
               showSubledger: showSubledger ? 1 : 0,
               itemDetails: printItemDetails ? 1 : 0
            }
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

   if (loading) {
      return <Loading />;
   }

   if (!company) {
      return (
         <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6">
            <Database className="w-16 h-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Company Context Missing</h2>
            <p className="text-slate-500 mb-6 text-center max-w-md">
               We couldn't load the company information. This usually happens if no company has been created yet or the connection to the server was lost.
            </p>
            <div className="flex gap-4">
               <button onClick={() => window.location.reload()} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <RefreshCcw className="w-4 h-4 mr-2" /> Retry Connection
               </button>
            </div>
         </div>
      );
   }

   const getPrintData = () => {
      const jamaList = data?.jama || [];
      const udharList = data?.udhar || [];
      let jamaClosed = null, udharClosed = null;
      const baseJama = jamaList.filter(r => { if (r.isClosing) { jamaClosed = r; return false; } return true; });
      const baseUdhar = udharList.filter(r => { if (r.isClosing) { udharClosed = r; return false; } return true; });
      const maxRows = Math.max(baseJama.length, baseUdhar.length);
      const paddedJama = [...baseJama];
      const paddedUdhar = [...baseUdhar];
      while (paddedJama.length < maxRows) paddedJama.push({ details: '', amount: '' });
      while (paddedUdhar.length < maxRows) paddedUdhar.push({ details: '', amount: '' });
      if (jamaClosed || udharClosed) {
         paddedJama.push(jamaClosed || { details: '', amount: '' });
         paddedUdhar.push(udharClosed || { details: '', amount: '' });
      }
      return { paddedJama, paddedUdhar };
   };

   const handlePrint = () => {
      const { paddedJama, paddedUdhar } = getPrintData();
      if (!paddedJama.length && !paddedUdhar.length) {
         alert('No data available to print.');
         return;
      }
      const cName = company ? (company.company_name || 'Company') : 'Company';
      const rows = paddedJama.map((j, i) => {
         const u = paddedUdhar[i] || { details: '', amount: '' };
         const isLast = i === paddedJama.length - 1;
         const rowStyle = isLast ? 'font-weight:bold; background:#f1f5f9; border-top:2px solid #cbd5e1;' : `background:${i % 2 === 0 ? '#fff' : '#f8fafc'}`;
         return `<tr style="${rowStyle}">
            <td style="border-right:1px solid #e2e8f0; width:35%; font-family: monospace;">${j.details || ''}</td>
            <td style="border-right:1px solid #94a3b8; width:15%; text-align:right; color:#059669; font-family: monospace;">${j.amount ? parseFloat(j.amount).toFixed(2) : ''}</td>
            <td style="border-right:1px solid #e2e8f0; width:35%; padding-left:10px; font-family: monospace;">${u.details || ''}</td>
            <td style="width:15%; text-align:right; color:#2563eb; font-family: monospace;">${u.amount ? parseFloat(u.amount).toFixed(2) : ''}</td>
         </tr>`;
      });

      const win = window.open('', '_blank', 'width=1100,height=800');
      win.document.write(`<html><head><title>Daily Ledger Registry (Rojmel)</title>
         <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:Arial, sans-serif;font-size:10px;color:#1e293b;padding:30px;background:#fff}
            .logo-bar{background:#2563eb;color:#fff;padding:8px 15px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
            .logo-bar h1{font-size:12px;font-weight:900;text-transform:uppercase}
            .logo-bar .lbl{font-size:8px;color:#dbeafe;text-transform:uppercase;letter-spacing:1px}
            .logo-bar .conf{font-size:8px;color:#fecaca;font-weight:bold;letter-spacing:0.5px}
            h2{font-size:18px;font-weight:bold;color:#0f172a;margin-bottom:2px}
            p.sub{font-size:8.5px;color:#64748b;margin-bottom:16px;text-transform:uppercase}
            table{width:100%;border-collapse:collapse;border:1px solid #e2e8f0}
            th{padding:10px;font-size:9px;font-weight:bold;text-transform:uppercase;background:#2563eb;color:#fff;border:1px solid #1e40af;text-align:left}
            td{padding:8px 10px;border:1px solid #e2e8f0;font-size:9px}
            tfoot tr{background:#1e3a8a;color:#fff;font-weight:bold}
            .jama-amt{color:#15803d;font-weight:bold}
            .udhar-amt{color:#1d4ed8;font-weight:bold}
            @media print{@page{size:A4 portrait;margin:1.5cm}}
         </style></head><body>
         <div class='logo-bar'>
            <h1>${cName.toUpperCase()}</h1>
            <span>DAILY FINANCIAL LEDGER (ROJMEL) &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN')}</span>
         </div>
         <h2>Daily Ledger Registry (Rojmel)</h2>
         <p class='sub'>Journal Date: ${date} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</p>
         <table>
         <thead>
            <tr><th colspan="2" style="text-align:center; background:#059669; border-color:#047857">JAMA (RECEIPTS)</th><th colspan="2" style="text-align:center; background:#2563eb; border-color:#1e40af">UDHAR (PAYMENTS)</th></tr>
            <tr><th>Particulars</th><th style="text-align:right">Amount</th><th>Particulars</th><th style="text-align:right">Amount</th></tr>
         </thead>
         <tbody>${rows.join('')}</tbody>
         <tfoot>
            <tr class="total-row" style="background:#1e3a8a;">
               <td style="padding:10px; border-right:1px solid #1e40af">GROSS POSTED JAMA</td>
               <td style="padding:10px; text-align:right; border-right:1px solid #1e40af; color:#4ade80">${data?.totals?.jama_total ? parseFloat(data.totals.jama_total).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
               <td style="padding:10px; border-right:1px solid #1e40af; padding-left:10px">GROSS POSTED UDHAR</td>
               <td style="padding:10px; text-align:right; color:#bfdbfe">${data?.totals?.udhar_total ? parseFloat(data.totals.udhar_total).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
            </tr>
         </tfoot>
         </table></body></html>`);
      win.document.close(); win.focus();
      setTimeout(() => { win.print(); win.close(); }, 400);
   };

   const addGujaratiFont = async (doc) => {
      try {
         const res = await fetch('/fonts/NotoSansGujarati-Regular.ttf');
         const blob = await res.blob();
         return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
               const base64 = reader.result.split(',')[1];
               doc.addFileToVFS('NotoSansGujarati.ttf', base64);
               doc.addFont('NotoSansGujarati.ttf', 'NotoGujarati', 'normal');
               resolve();
            };
            reader.readAsDataURL(blob);
         });
      } catch (e) { console.warn('Could not load font', e); }
   };

   const handleDownloadPDF = async () => {
      const { paddedJama, paddedUdhar } = getPrintData();
      if (!paddedJama.length && !paddedUdhar.length) {
         alert('No data available to export.');
         return;
      }
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      await addGujaratiFont(doc);

      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 40;
      const cName = (company?.company_name || 'Company').toUpperCase();

      // Header
      const navy = [37, 99, 235], gray = [100, 116, 139], white = [255, 255, 255];
      doc.setFillColor(...navy); doc.rect(0, 0, W, 28, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...white);
      doc.text(cName, M, 18);
      doc.setFontSize(7.5); doc.setTextColor(219, 234, 254);
      doc.text('DAILY FINANCIAL LEDGER (ROJMEL)', W / 2, 18, { align: 'center' });
      doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
      doc.text('CONFIDENTIAL', W - M, 18, { align: 'right' });

      let y = 60;
      doc.setFont('NotoGujarati', 'bold'); doc.setFontSize(15); doc.setTextColor(...navy);
      doc.text('Daily Ledger Registry (Rojmel)', M, y);
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
      doc.text(`Journal Date: ${date}  |  Generated: ${new Date().toLocaleString('en-IN')}`, M, y + 13);
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
      y += 28;

      const body = paddedJama.map((j, i) => {
         const u = paddedUdhar[i] || { details: '', amount: '' };
         return [
            j.details || '',
            j.amount ? parseFloat(j.amount).toFixed(2) : '',
            u.details || '',
            u.amount ? parseFloat(u.amount).toFixed(2) : ''
         ];
      });

      autoTable(doc, {
         startY: y,
         head: [
            [{ content: 'JAMA (RECEIPTS)', colSpan: 2, styles: { fillColor: [5, 150, 105], halign: 'center', font: 'helvetica' } },
            { content: 'UDHAR (PAYMENTS)', colSpan: 2, styles: { fillColor: [37, 99, 235], halign: 'center', font: 'helvetica' } }],
            ['Particulars', 'Amount', 'Particulars', 'Amount']
         ],
         body: body,
         foot: [[
            'TOTAL JAMA',
            { content: parseFloat(data?.totals?.jama_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right' } },
            'TOTAL UDHAR',
            { content: parseFloat(data?.totals?.udhar_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right' } }
         ]],
         styles: { font: 'NotoGujarati', fontSize: 8.5, cellPadding: 5, lineColor: [226, 232, 240], lineWidth: 0.3 },
         headStyles: { font: 'helvetica', fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
         footStyles: { font: 'helvetica', fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 8 },
         theme: 'grid',
         margin: { left: M, right: M }
      });

      doc.save(`Rojmel_${date}.pdf`);
   };

   const handleEditEntry = (row, side) => {
      if (!row.id || row.isOpening || row.isClosing) return;
      if (String(row.id).startsWith('JV-ITEM-')) {
         setEditingEntry({ id: row.id.split('-').pop(), type: 'jv' });
         setActiveModal('jv');
         return;
      }
      setEditingEntry({ id: row.id, side: side, type: 'cash' });
      setActiveModal(side === 'jama' ? 'credit' : 'debit');
   };

   const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
   };

   const jamaList = (data?.jama || []).filter(r => 
      r.isOpening || r.isClosing || 
      (r.details || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.amount || '').toString().includes(searchQuery)
   );
   const udharList = (data?.udhar || []).filter(r => 
      r.isOpening || r.isClosing || 
      (r.details || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.amount || '').toString().includes(searchQuery)
   );
   let jamaClosed = null, udharClosed = null;

   const baseJama = jamaList.filter(r => {
      if (r.isOpening) return true;
      if (r.isClosing) { jamaClosed = r; return false; }
      return true;
   });

   const baseUdhar = udharList.filter(r => {
      if (r.isOpening) return true;
      if (r.isClosing) { udharClosed = r; return false; }
      return true;
   });

   const maxBaseRows = Math.max(baseJama.length, baseUdhar.length);
   const paddedJama = [...baseJama];
   const paddedUdhar = [...baseUdhar];
   while (paddedJama.length < maxBaseRows) paddedJama.push({ details: '', sub_amount: '', amount: '' });
   while (paddedUdhar.length < maxBaseRows) paddedUdhar.push({ details: '', sub_amount: '', amount: '' });

   if (jamaClosed || udharClosed) {
      paddedJama.push(jamaClosed || { details: '', sub_amount: '', amount: '' });
      paddedUdhar.push(udharClosed || { details: '', sub_amount: '', amount: '' });
   }

   const normalizedJama = paddedJama;
   const normalizedUdhar = paddedUdhar;

   return (
      <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none animate-in fade-in duration-500">
         <div className="max-w-[1400px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4 print:hidden">
               <div>
                  <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
                     <Calculator size={20} className="text-zinc-600" />
                     Daily Financial Ledger
                  </h1>
                  <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">Fiscal Core / Live Daily Journal (Rojmel)</p>
               </div>

               <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                     onClick={fetchRojmel}
                     className="p-1.5 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm"
                     title="Refresh Registry"
                  >
                     <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                  </button>
                  <button
                     onClick={handlePrint}
                     className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none uppercase tracking-widest"
                  >
                     <Printer size={14} /> PRINT
                  </button>
                  <button
                     onClick={handleDownloadPDF}
                     className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none uppercase tracking-widest"
                  >
                     <FileText size={14} /> PDF
                  </button>
               </div>
            </div>

            {/* Toolbar Section */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-50 border border-zinc-300 p-3 print:hidden">
               <div className="flex items-center gap-6">
                  <div className="relative flex-1 min-w-[240px] group">
                     <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors" />
                     <input
                        type="text"
                        placeholder="SEARCH TRANSACTIONS..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 bg-white border border-zinc-300 outline-none focus:border-zinc-500 text-[10px] font-bold uppercase tracking-widest transition-all"
                     />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer group">
                     <input
                        type="checkbox"
                        checked={showSubledger}
                        onChange={(e) => setShowSubledger(e.target.checked)}
                        className="w-4 h-4 rounded-none border-zinc-300 text-blue-600 focus:ring-0 focus:ring-offset-0"
                     />
                     <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-700">Show Subledger</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer group">
                     <input
                        type="checkbox"
                        checked={printItemDetails}
                        onChange={(e) => setPrintItemDetails(e.target.checked)}
                        className="w-4 h-4 rounded-none border-zinc-300 text-blue-600 focus:ring-0 focus:ring-offset-0"
                     />
                     <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-zinc-700">Item Details</span>
                  </label>
               </div>

               <div className='flex gap-2'>
                  <div className="flex items-center gap-3">
                     <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Journal Timeline:</span>
                     <div className="flex items-center bg-white border border-zinc-300 shadow-sm">
                        <button
                           disabled={!navDates.prev}
                           onClick={() => setDate(navDates.prev)}
                           className="p-1.5 hover:bg-zinc-50 text-zinc-400 hover:text-zinc-800 disabled:opacity-20 border-r border-zinc-300"
                        >
                           <ChevronLeft size={16} />
                        </button>

                        <div className="relative flex items-center px-3 py-1.5 min-w-[140px] justify-center group cursor-pointer" onClick={() => document.getElementById('rojmel-date-input').showPicker()}>
                           <span className="text-xs font-bold text-zinc-700 font-mono tracking-widest">
                              {new Date(date).toLocaleDateString('en-GB').replace(/\//g, '-')}
                           </span>
                           <Calendar size={14} className="ml-3 text-zinc-400 group-hover:text-blue-600 transition-colors" />
                           <input
                              id="rojmel-date-input"
                              type="date"
                              value={date}
                              onChange={(e) => setDate(e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                           />
                        </div>

                        <button
                           disabled={!navDates.next}
                           onClick={() => setDate(navDates.next)}
                           className="p-1.5 hover:bg-zinc-50 text-zinc-400 hover:text-zinc-800 disabled:opacity-20 border-l border-zinc-300"
                        >
                           <ChevronRight size={16} />
                        </button>
                     </div>
                  </div>
               </div>
            </div>

            {/* Table Header Section like other pages */}
            <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between border-b-0 print:hidden select-none">
               <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                     Journal Registry Shard
                  </span>
                  <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5">
                     {jamaList.length + udharList.length} POSTINGS
                  </span>
               </div>
               <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Journal Date: {new Date(date).toLocaleDateString('en-GB')}</p>
            </div>

            {/* Ledger Registry Table */}
            <div id="rojmel-container" className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[600px] print:border-black print:rounded-none select-none">

               {/* Dual Column Headers */}
               <div className="grid grid-cols-2 text-center relative border-b border-zinc-300">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-px bg-zinc-300 print:bg-black"></div>

                  <div className="py-5 bg-emerald-50/30 flex flex-col items-center justify-center relative select-none">
                     <div className="flex items-center gap-2 mb-1">
                        <ArrowUpRight size={16} className="text-emerald-700" />
                        <h2 className="text-xs font-bold text-emerald-700 uppercase tracking-widest font-mono">JAMA (RECEIPTS)</h2>
                     </div>
                     <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">INCOMING CAPITAL STREAM</p>
                  </div>

                  <div className="py-5 bg-blue-50/30 flex flex-col items-center justify-center relative select-none">
                     <div className="flex items-center gap-2 mb-1">
                        <ArrowDownLeft size={16} className="text-blue-700" />
                        <h2 className="text-xs font-bold text-blue-700 uppercase tracking-widest font-mono">UDHAR (PAYMENTS)</h2>
                     </div>
                     <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">OUTGOING LIQUIDITY FLOW</p>
                  </div>
               </div>

               {/* Table Columns Sub-Headers */}
               <div className="grid grid-cols-2 bg-zinc-100 border-b border-zinc-300 uppercase text-[10px] font-bold text-zinc-600 tracking-wider">
                  <div className="grid grid-cols-12 border-r border-zinc-300">
                     <div className="col-span-6 px-4 py-2 text-left">Particulars</div>
                     <div className="col-span-3 px-4 py-2 text-right">Sub</div>
                     <div className="col-span-3 px-4 py-2 text-right bg-emerald-100/50 text-emerald-800">Amount</div>
                  </div>
                  <div className="grid grid-cols-12">
                     <div className="col-span-6 px-4 py-2 text-left">Particulars</div>
                     <div className="col-span-3 px-4 py-2 text-right">Sub</div>
                     <div className="col-span-3 px-4 py-2 text-right bg-blue-100/50 text-blue-800">Amount</div>
                  </div>
               </div>

               {/* Ledger Data Rows */}
               <div className="grid grid-cols-2 flex-1 divide-x divide-zinc-300 relative bg-white font-mono">
                  {/* Jama Side */}
                  <div className="flex flex-col divide-y divide-zinc-200">
                     {normalizedJama.map((row, idx) => {
                        const isHighNode = row.isOpening || row.isClosing;
                        return (
                           <div
                              key={idx}
                              className={`grid grid-cols-12 items-center text-[11px] ${isHighNode ? 'bg-zinc-50 font-bold' : 'hover:bg-zinc-50/50'}`}
                              onDoubleClick={() => handleEditEntry(row, 'jama')}
                           >
                              <div className="col-span-6 px-4 py-2 uppercase truncate">
                                 <div className="font-bold text-zinc-800">{row.details}</div>
                                 {showSubledger && row.sub_details && (
                                    <div className="text-[10px] text-zinc-700 font-bold mt-0.5 leading-tight uppercase">
                                       {row.sub_details}
                                    </div>
                                 )}
                                 {printItemDetails && row.notes && (
                                    <div className="text-[9px] text-zinc-600 font-bold mt-0.5 leading-tight italic">
                                       {row.notes}
                                    </div>
                                 )}
                              </div>
                              <div className="col-span-3 px-4 py-2 text-right text-zinc-700 font-bold">{row.sub_amount ? parseFloat(row.sub_amount).toFixed(2) : ''}</div>
                              <div className={`col-span-3 px-4 py-2 text-right font-black ${isHighNode ? 'text-zinc-900' : 'text-emerald-700'}`}>
                                 {row.amount ? parseFloat(row.amount).toFixed(2) : ''}
                              </div>
                           </div>
                        );
                     })}
                  </div>

                  {/* Udhar Side */}
                  <div className="flex flex-col divide-y divide-zinc-200">
                     {normalizedUdhar.map((row, idx) => {
                        const isHighNode = row.isOpening || row.isClosing;
                        return (
                           <div
                              key={idx}
                              className={`grid grid-cols-12 items-center text-[11px] ${isHighNode ? 'bg-zinc-50 font-bold' : 'hover:bg-zinc-50/50'}`}
                              onDoubleClick={() => handleEditEntry(row, 'udhar')}
                           >
                              <div className="col-span-6 px-4 py-2 uppercase truncate">
                                 <div className="font-bold text-zinc-800">{row.details}</div>
                                 {showSubledger && row.sub_details && (
                                    <div className="text-[10px] text-zinc-700 font-bold mt-0.5 leading-tight uppercase">
                                       {row.sub_details}
                                    </div>
                                 )}
                                 {printItemDetails && row.notes && (
                                    <div className="text-[9px] text-zinc-600 font-bold mt-0.5 leading-tight italic">
                                       {row.notes}
                                    </div>
                                 )}
                              </div>
                              <div className="col-span-3 px-4 py-2 text-right text-zinc-700 font-bold">{row.sub_amount ? parseFloat(row.sub_amount).toFixed(2) : ''}</div>
                              <div className={`col-span-3 px-4 py-2 text-right font-black ${isHighNode ? 'text-zinc-900' : 'text-blue-700'}`}>
                                 {row.amount ? parseFloat(row.amount).toFixed(2) : ''}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>

               {/* Totals Footer */}
               {data?.totals && (
                  <div className="grid grid-cols-2 bg-blue-600 text-white uppercase text-[10px] font-bold tracking-widest border-t border-blue-500">
                     <div className="grid grid-cols-12 items-center">
                        <div className="col-span-9 px-4 py-3 text-white">Gross Posted Jama</div>
                        <div className="col-span-3 px-4 py-3 text-right text-white text-sm font-black font-mono tracking-tighter italic">
                           ₹{parseFloat(data.totals.jama_total).toFixed(2)}
                        </div>
                     </div>
                     <div className="grid grid-cols-12 items-center border-l border-blue-500">
                        <div className="col-span-9 px-4 py-3 text-white">Gross Posted Udhar</div>
                        <div className="col-span-3 px-4 py-3 text-right text-white text-sm font-black font-mono tracking-tighter italic">
                           ₹{parseFloat(data.totals.udhar_total).toFixed(2)}
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-between gap-4 p-3 bg-zinc-50 border border-zinc-300 print:hidden">
               <div className="flex items-center gap-3">
                  <button
                     onClick={() => { setEditingEntry(null); setActiveModal('credit'); }}
                     className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 border border-emerald-500 text-white text-[10px] font-bold px-4 py-2 rounded-none transition shadow-sm uppercase tracking-widest"
                  >
                     <Plus size={14} /> JAMA ENTRY
                  </button>
                  <button
                     onClick={() => { setEditingEntry(null); setActiveModal('debit'); }}
                     className="flex items-center gap-2 bg-red-600 hover:bg-red-700 border border-red-500 text-white text-[10px] font-bold px-4 py-2 rounded-none transition shadow-sm uppercase tracking-widest"
                  >
                     <Plus size={14} /> UDHAR ENTRY
                  </button>
               </div>

               <div className="flex items-center gap-2">
                  <button
                     onClick={() => setActiveModal('purchase')}
                     className="bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-[10px] font-bold px-4 py-2 uppercase tracking-widest"
                  >
                     PROCURE
                  </button>
                  <button
                     onClick={() => setActiveModal('sales')}
                     className="bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-[10px] font-bold px-4 py-2 uppercase tracking-widest"
                  >
                     SALE
                  </button>
                  <button
                     onClick={() => setActiveModal('jv')}
                     className="bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-[10px] font-bold px-4 py-2 uppercase tracking-widest"
                  >
                     JOURNAL
                  </button>
               </div>
            </div>
         </div>

         {/* Entry Modals */}
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
      </div>
   );
}
