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
import { addGujaratiFont } from '../utils/pdfFonts';
import PurchaseForm from '../components/PurchaseForm';
import SaleForm from '../components/SaleForm';
import CashEntryModal from '../components/CashEntryModal';
import JVEntryModal from '../components/JVEntryModal';
import Loading from '../components/Loading';
import api from '../api';
import { formatBilingualText, translateSystemText } from '../utils/textUtils';
import { toISTDateInput, formatToIST } from '../utils/dateUtils';

export default function Rojmel() {
   const { t, i18n } = useTranslation();

   // Helper to extract language-appropriate text from mixed format
   const cleanTextByLanguage = (text, isGujarati) => {
      if (!text) return '';
      const str = String(text).trim();
      // Pattern: "English (Gujarati)" or "Gujarati (English)"
      const bracketMatch = str.match(/^([^()]+)\s*\(([^)]+)\)$/);
      if (bracketMatch) {
         const part1 = bracketMatch[1].trim();
         const part2 = bracketMatch[2].trim();
         const isGujaratiInPart1 = /[\u0A80-\u0AFF]/.test(part1);
         const isGujaratiInPart2 = /[\u0A80-\u0AFF]/.test(part2);
         if (isGujarati) {
            return isGujaratiInPart1 ? part1 : (isGujaratiInPart2 ? part2 : str);
         } else {
            return !isGujaratiInPart1 ? part1 : (!isGujaratiInPart2 ? part2 : str);
         }
      }
      return str;
   };

   // Helper function to display language-appropriate names
   const getDisplayName = (row, isGujarati) => {
      if (isGujarati) {
         // For Gujarati: prefer _gu field, then clean any mixed text
         let text = row.description_gu || row.description || row.details || '';
         return cleanTextByLanguage(text, true);
      } else {
         // For English: use description_en or description, then clean any mixed text
         let text = row.description_en || row.description || row.details || '';
         return cleanTextByLanguage(text, false);
      }
   };

   const getDisplaySubName = (row, isGujarati) => {
      const mainName = getDisplayName(row, isGujarati);
      
      // Don't show sub-text for opening/closing balance rows
      if (row.isOpening || row.isClosing) {
         return '';
      }
      
      let subName = '';
      if (isGujarati) {
         subName = row.sub_details_gu || '';
         if (!subName && row.sub_details_acc_gu && row.sub_details_acc_gu !== mainName) {
            subName = row.sub_details_acc_gu;
         }
         if (!subName && row.sub_details && row.sub_details !== mainName) {
            subName = row.sub_details;
         }
         // Only return if it's different from main name and not brackets-only
         const cleaned = cleanTextByLanguage(subName || row.notes || '', true);
         return (cleaned && cleaned !== mainName && cleaned !== '(' && cleaned !== ')') ? cleaned : '';
      } else {
         subName = row.sub_details || '';
         if (subName === mainName) {
            subName = '';
         }
         const cleaned = cleanTextByLanguage(subName || row.notes || '', false);
         return (cleaned && cleaned !== mainName && cleaned !== '(' && cleaned !== ')') ? cleaned : '';
      }
   };

   // Date State
   const [date, setDate] = useState(toISTDateInput());
   const [data, setData] = useState(null);
   const [loading, setLoading] = useState(true);
   const [company, setCompany] = useState(null);
   const [navDates, setNavDates] = useState({ prev: null, next: null });

   // Checkboxes
   const [showSubledger, setShowSubledger] = useState(false);
   const [printItemDetails, setPrintItemDetails] = useState(false);
   const [showVigat, setShowVigat] = useState(false);

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
                  <RefreshCcw className="w-4 h-4 mr-2" /> {t('common.retryConnection')}
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
         alert(t('itemMaster.errors.failedLoadItems'));
         return;
      }
      const cName = company ? (company.company_name || 'Company') : 'Company';
      const rows = paddedJama.map((j, i) => {
         const u = paddedUdhar[i] || { details: '', amount: '' };
         const isLast = i === paddedJama.length - 1;
         const rowStyle = isLast ? 'font-weight:bold; background:#f1f5f9; border-top:2px solid #cbd5e1;' : `background:${i % 2 === 0 ? '#fff' : '#f8fafc'}`;
         return `<tr style="${rowStyle}">
            <td style="border-right:1px solid #e2e8f0; width:35%; font-family: monospace;">${translateSystemText(j.details || '')}</td>
            <td style="border-right:1px solid #94a3b8; width:15%; text-align:right; color:#059669; font-family: monospace;">${j.amount ? parseFloat(j.amount).toFixed(2) : ''}</td>
            <td style="border-right:1px solid #e2e8f0; width:35%; padding-left:10px; font-family: monospace;">${translateSystemText(u.details || '')}</td>
            <td style="width:15%; text-align:right; color:#2563eb; font-family: monospace;">${u.amount ? parseFloat(u.amount).toFixed(2) : ''}</td>
         </tr>`;
      });

      const win = window.open('', '_blank', 'width=1100,height=800');
      win.document.write(`<html><head><title>${t('rojmel.pdf.dailyLedger')}</title>
         <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:Arial, sans-serif;font-size:10px;color:#1e293b;padding:30px;background:#fff}
            .logo-bar{background:#2563eb;color:#fff;padding:12px 15px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
            .logo-bar h1{font-size:12px;font-weight:900;text-transform:uppercase}
            .logo-bar .lbl{font-size:12px;color:#dbeafe;text-transform:uppercase;letter-spacing:1px}
            .logo-bar .conf{font-size:12px;color:#fecaca;font-weight:bold;letter-spacing:0.5px}
            h2{font-size:112px;font-weight:bold;color:#0f172a;margin-bottom:2px}
            p.sub{font-size:8.5px;color:#64748b;margin-bottom:16px;text-transform:uppercase}
            table{width:100%;border-collapse:collapse;border:1px solid #e2e8f0}
            th{padding:10px;font-size:12px;font-weight:bold;text-transform:uppercase;background:#2563eb;color:#fff;border:1px solid #1e40af;text-align:left}
            td{padding:12px 10px;border:1px solid #e2e8f0;font-size:12px}
            tfoot tr{background:#1e3a8a;color:#fff;font-weight:bold}
            .jama-amt{color:#15803d;font-weight:bold}
            .udhar-amt{color:#1d4ed8;font-weight:bold}
            @media print{@page{size:A4 portrait;margin:1.5cm}}
         </style></head><body>
         <div class='logo-bar'>
            <h1>${cName}</h1>
            <span>${t('rojmel.pdf.registryTitle')} &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN')}</span>
         </div>
         <h2>${t('rojmel.pdf.dailyLedger')}</h2>
         <p class='sub'>${t('rojmel.pdf.journalDate')}: ${date} &nbsp;|&nbsp; ${t('rojmel.pdf.generated')}: ${new Date().toLocaleString('en-IN')}</p>
         <table>
         <thead>
            <tr><th colspan="2" style="text-align:center; background:#059669; border-color:#047857">${t('rojmel.pdf.jamaSide')}</th><th colspan="2" style="text-align:center; background:#2563eb; border-color:#1e40af">${t('rojmel.pdf.udharSide')}</th></tr>
            <tr><th>${t('rojmel.pdf.particulars')}</th><th style="text-align:right">${t('rojmel.pdf.amount')}</th><th>${t('rojmel.pdf.particulars')}</th><th style="text-align:right">${t('rojmel.pdf.amount')}</th></tr>
         </thead>
         <tbody>${rows.join('')}</tbody>
         <tfoot>
            <tr class="total-row" style="background:#1e3a8a;">
               <td style="padding:10px; border-right:1px solid #1e40af">${t('rojmel.pdf.grossJama')}</td>
               <td style="padding:10px; text-align:right; border-right:1px solid #1e40af; color:#4ade80">${data?.totals?.jama_total ? parseFloat(data.totals.jama_total).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
               <td style="padding:10px; border-right:1px solid #1e40af; padding-left:10px">${t('rojmel.pdf.grossUdhar')}</td>
               <td style="padding:10px; text-align:right; color:#bfdbfe">${data?.totals?.udhar_total ? parseFloat(data.totals.udhar_total).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
            </tr>
         </tfoot>
         </table></body></html>`);
      win.document.close(); win.focus();
      setTimeout(() => { win.print(); win.close(); }, 400);
   };

   const handleDownloadPDF = async () => {
      const { paddedJama, paddedUdhar } = getPrintData();
      if (!paddedJama.length && !paddedUdhar.length) {
         alert(t('itemMaster.errors.failedLoadItems'));
         return;
      }
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      await addGujaratiFont(doc);

      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 40;
      const cName = (company?.company_name || 'Company');

      // Header
      const navy = [37, 99, 235], gray = [100, 116, 139], white = [255, 255, 255];
      doc.setFillColor(...navy); doc.rect(0, 0, W, 28, 'F');
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(10); doc.setTextColor(...white);
      doc.text(cName, M, 18);
      doc.setFontSize(7.5); doc.setTextColor(219, 234, 254);
      doc.text(t('rojmel.pdf.registryTitle'), W / 2, 18, { align: 'center' });
      doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
      doc.text(t('rojmel.pdf.confidential'), W - M, 18, { align: 'right' });

      let y = 60;
      doc.setFont('NotoGujarati', 'bold'); doc.setFontSize(15); doc.setTextColor(...navy);
      doc.text(t('rojmel.pdf.dailyLedger'), M, y);
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
      doc.text(`${t('rojmel.pdf.journalDate')}: ${date}  |  ${t('rojmel.pdf.generated')}: ${new Date().toLocaleString('en-IN')}`, M, y + 13);
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
      y += 28;

      const body = paddedJama.map((j, i) => {
         const u = paddedUdhar[i] || { details: '', amount: '' };
         return [
            translateSystemText(j.details || ''),
            j.amount ? parseFloat(j.amount).toFixed(2) : '',
            translateSystemText(u.details || ''),
            u.amount ? parseFloat(u.amount).toFixed(2) : ''
         ];
      });

      autoTable(doc, {
         startY: y,
         head: [
            [{ content: t('rojmel.pdf.jamaSide'), colSpan: 2, styles: { fillColor: [5, 150, 105], halign: 'center', font: 'NotoGujarati' } },
            { content: t('rojmel.pdf.udharSide'), colSpan: 2, styles: { fillColor: [37, 99, 235], halign: 'center', font: 'NotoGujarati' } }],
            [t('rojmel.pdf.particulars'), t('rojmel.pdf.amount'), t('rojmel.pdf.particulars'), t('rojmel.pdf.amount')]
         ],
         body: body,
         foot: [[
            t('rojmel.pdf.totalJama'),
            { content: parseFloat(data?.totals?.jama_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right' } },
            t('rojmel.pdf.totalUdhar'),
            { content: parseFloat(data?.totals?.udhar_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right' } }
         ]],
         styles: { font: 'NotoGujarati', fontSize: 8.5, cellPadding: 5, lineColor: [226, 232, 240], lineWidth: 0.3 },
         headStyles: { font: 'NotoGujarati', fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
         footStyles: { font: 'NotoGujarati', fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', fontSize: 8 },
         didParseCell: (data) => {
            const text = data.cell.text.join(' ');
            if (text && !/[\u0A80-\u0AFF]/.test(text)) {
               data.cell.styles.font = 'helvetica';
            }
         },
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

   const groupRows = (list) => {
      if (!showSubledger) return list;
      const grouped = [];
      list.forEach(row => {
         if (row.isOpening || row.isClosing) {
            grouped.push({ ...row });
            return;
         }
         const accountKey = row.account_code || row.account_id || row.description_en || row.description_gu || row.details;
         const existingIdx = grouped.findIndex(g => !g.isOpening && !g.isClosing && (g.account_code || g.account_id || g.description_en || g.description_gu || g.details) === accountKey);
         
         if (existingIdx !== -1) {
            const existing = grouped[existingIdx];
            if (!existing.grouped_items) {
               existing.grouped_items = [{ ...existing }];
               existing.isGrouped = true;
            }
            existing.grouped_items.push({ ...row });
            existing.amount = (parseFloat(existing.amount || 0) + parseFloat(row.amount || 0)).toFixed(2);
            if (row.sub_amount) existing.sub_amount = (parseFloat(existing.sub_amount || 0) + parseFloat(row.sub_amount || 0)).toFixed(2);
         } else {
            grouped.push({ ...row });
         }
      });
      return grouped;
   };

   const rawJamaList = (data?.jama || []).filter(r =>
      r.isOpening || r.isClosing ||
      (r.details || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.amount || '').toString().includes(searchQuery)
   );
   const rawUdharList = (data?.udhar || []).filter(r =>
      r.isOpening || r.isClosing ||
      (r.details || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.amount || '').toString().includes(searchQuery)
   );

   const jamaList = groupRows(rawJamaList);
   const udharList = groupRows(rawUdharList);
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
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 select-none pb-12">
         <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">

            {/* Registry Container */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none">

               {/* Control Header Bar */}
               <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none print:hidden">
                  <div className="flex items-center gap-2">
                     <span className={`text-sm font-extrabold text-slate-800 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
                        {t('rojmel.title')}
                     </span>
                     <span className="bg-slate-200 text-slate-600 font-bold force-en text-[12px] px-1.5 py-0.5 rounded-sm">
                        {jamaList.length + udharList.length} {t('rojmel.postings')}
                     </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                     {/* Search */}
                     <div className="relative flex items-center border border-slate-200 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] rounded-md bg-white px-2.5 py-1 transition-colors w-48 sm:w-64">
                        <Search size={12} className="text-slate-400 mr-1.5" />
                        <input
                           type="text"
                           placeholder={t('rojmel.searchPlaceholder')}
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-300 w-full font-semibold"
                        />
                        {searchQuery && (
                           <button onClick={() => setSearchQuery('')} className="p-0.5 text-slate-300 hover:text-slate-600 transition">
                              <X size={10} />
                           </button>
                        )}
                     </div>

                     {/* Options */}
                     <div className="flex items-center gap-3 border border-slate-200 rounded-md bg-white px-2.5 py-1">
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                           <input
                              type="checkbox"
                              checked={showSubledger}
                              onChange={(e) => setShowSubledger(e.target.checked)}
                              className="w-3.5 h-3.5 rounded-sm border-slate-300 text-[#1d5f84] focus:ring-[#1d5f84]"
                           />
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700">{t('rojmel.showSubledger')}</span>
                        </label>
                        <div className="w-px h-3 bg-slate-200"></div>
                        <label className="flex items-center gap-1.5 cursor-pointer group">
                           <input
                              type="checkbox"
                              checked={printItemDetails}
                              onChange={(e) => setPrintItemDetails(e.target.checked)}
                              className="w-3.5 h-3.5 rounded-sm border-slate-300 text-[#1d5f84] focus:ring-[#1d5f84]"
                           />
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700">{t('rojmel.itemDetails')}</span>
                        </label>
                     </div>

                     {/* Date Nav */}
                     <div className="flex items-center border border-slate-200 rounded-md bg-white p-0.5">
                        <button
                           disabled={!navDates.prev}
                           onClick={() => setDate(navDates.prev)}
                           className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-sm"
                        >
                           <ChevronLeft size={13} />
                        </button>
                        <div className="relative flex items-center px-2 py-0.5 min-w-[90px] justify-center group cursor-pointer" onClick={() => document.getElementById('rojmel-date-input').showPicker()}>
                           <span className="text-[12px] font-bold text-slate-700 font-mono tracking-wider">
                              {new Date(date).toLocaleDateString('en-GB').replace(/\//g, '-')}
                           </span>
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
                           className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-sm"
                        >
                           <ChevronRight size={13} />
                        </button>
                     </div>

                     {/* Actions */}
                     <div className="flex items-center gap-1.5 ml-1">
                        <button
                           onClick={() => setShowVigat(!showVigat)}
                           className={`h-7 flex items-center gap-1.5 px-3 ${showVigat ? 'bg-[#1d5f84] text-white' : 'bg-white text-slate-600 border border-slate-200'} text-[12px] font-bold rounded-md transition uppercase tracking-wider`}
                           title={i18n.language === 'gu' ? 'વિગત બતાવો/છુપાવો' : 'Toggle Vigat columns'}
                        >
                           {i18n.language === 'gu' ? 'વિગત' : 'VIGAT'}
                        </button>
                        <button onClick={fetchRojmel} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer" title={t('common.refreshRegistry')}>
                           <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={handleDownloadPDF} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer" title={t('common.pdf')}>
                           <FileText size={13} />
                        </button>
                        <button onClick={handlePrint} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer" title={t('common.print')}>
                           <Printer size={13} />
                        </button>
                     </div>
                  </div>
               </div>

               {/* Ledger Registry Table */}
               {/* Ledger Registry Table */}
               <div id="rojmel-container" className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200 min-h-[600px] print:border-black print:rounded-none select-none">

                  {/* JAMA SIDE */}
                  <div className={`flex flex-col ${showVigat ? 'overflow-x-auto' : 'overflow-x-hidden'} custom-scrollbar w-full`}>
                     <div className={`${showVigat ? 'min-w-[800px]' : 'min-w-0 w-full'} flex flex-col flex-1`}>
                        {/* Header */}
                        <div className="py-2.5 bg-emerald-50/50 flex flex-col items-center justify-center relative border-b border-slate-200">
                           <div className="flex items-center gap-1.5">
                              <ArrowUpRight size={14} className="text-emerald-700" />
                              <h2 className="text-[12px] font-bold text-emerald-700 uppercase tracking-widest font-mono">{t('rojmel.jamaBaju')}</h2>
                           </div>
                        </div>

                        {/* Sub Header - Sub column removed; adjusted spans */}
                        <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 uppercase text-[12px] font-bold text-slate-500 tracking-wider">
                           <div className={`${showVigat ? 'col-span-4' : 'col-span-6'} px-3.5 py-2 text-left`}>{t('rojmel.particulars')}</div>
                           {showVigat && (
                              <div className="col-span-2 px-3.5 py-2 text-right">{t('rojmel.sub')}</div>
                           )}
                           {showVigat ? (
                              <>
                                 <div className="col-span-2 px-3.5 py-2 text-right bg-emerald-100/50 text-emerald-800">{t('rojmel.amount')}</div>
                                 <div className={`col-span-2 px-3.5 py-2 text-right border-l border-slate-200 ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>{i18n.language === 'gu' ? 'રસીદ નં.' : 'RECPT NO'}</div>
                                 <div className={`col-span-1 px-3.5 py-2 text-right border-l border-slate-200 ${i18n.language === 'gu' ? 'font-prompt tracking-normal' : ''}`}>{i18n.language === 'gu' ? 'રોકડ' : 'ROKAD'}</div>
                                 <div className={`col-span-1 px-3.5 py-2 text-right border-l border-slate-200 ${i18n.language === 'gu' ? 'font-prompt tracking-normal' : ''}`}>{i18n.language === 'gu' ? 'જમા ખર્ચ' : 'J.K.'}</div>
                              </>
                           ) : (
                              <>
                                 <div className="col-span-3 px-3.5 py-2 text-right bg-emerald-100/50 text-emerald-800">{i18n.language === 'gu' ? 'પેટા રકમ' : 'PETA RAKAM'}</div>
                                 <div className="col-span-3 px-3.5 py-2 text-right bg-emerald-200/50 text-emerald-900 border-l border-slate-200">{t('rojmel.amount')}</div>
                              </>
                           )}
                        </div>

                        {/* Body */}
                        <div className="flex flex-col flex-1 divide-y divide-slate-100 bg-white font-sans text-slate-800">
                           {normalizedJama.map((row, idx) => {
                              const isHighNode = row.isOpening || row.isClosing;
                              const isJVEntry = row.isJV || String(row.id || '').startsWith('JV-ITEM-') || String(row.reference_no || '').startsWith('JV-');
                              const isSalesAccount = row.account_code === 'S0001' || row.account_type === 'sales' || String(row.description_en || '').toLowerCase().includes('sales') || String(row.description_gu || '').includes('વેચાણ');
                              const isMemberAccount = row.account_code === 'M0001' || row.account_type === 'member' || String(row.description_en || '').toLowerCase().includes('member') || String(row.description_gu || '').includes('સદસ્ય');
                              return (
                                 <div
                                    key={idx}
                                    className={`grid grid-cols-12 items-center text-[12px] ${isHighNode ? 'bg-slate-50 font-bold' : 'hover:bg-slate-50/75 transition-colors cursor-pointer'}`}
                                    onDoubleClick={() => handleEditEntry(row, 'jama')}
                                 >
                                    <div className={`${showVigat ? 'col-span-4' : 'col-span-6'} px-3.5 py-2`}>
                                       <div className={`font-bold text-slate-700 flex items-center gap-1.5 ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
                                          {isJVEntry && <span className="inline-block w-2 h-2 rounded-full bg-orange-500 shrink-0" title="JV" />}
                                          <span>{getDisplayName(row, i18n.language === 'gu')}</span>
                                       </div>
                                       {showSubledger && isMemberAccount && !row.isGrouped && (row.sub_details || row.sub_details_gu) && !row.isOpening && !row.isClosing && (
                                          <div className={`text-[10px] text-slate-400 font-semibold mt-0.5 leading-tight ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
                                             {i18n.language === 'gu' ? (row.sub_details_gu || row.sub_details) : (row.sub_details || row.sub_details_gu)}
                                          </div>
                                       )}
                                       {showSubledger && row.isGrouped && row.grouped_items && (
                                          <div className="text-[11px] text-slate-500 mt-1.5 font-semibold flex flex-col gap-1">
                                             {row.grouped_items.map((gItem, gIdx) => {
                                                const subTextGu = gItem.sub_details_gu || gItem.sub_details || gItem.notes || '';
                                                const subTextEn = gItem.sub_details || gItem.sub_details_gu || gItem.notes || '';
                                                return (
                                                   <div key={gIdx} className="flex justify-between items-center group/item hover:bg-slate-100 px-1 py-0.5 rounded cursor-pointer" onDoubleClick={(e) => { e.stopPropagation(); handleEditEntry(gItem, 'jama'); }}>
                                                      <span className={`${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
                                                         - {i18n.language === 'gu' ? subTextGu : subTextEn}
                                                      </span>
                                                      <span className="font-mono force-en text-slate-600 ml-2">₹{parseFloat(gItem.amount || 0).toFixed(2)}</span>
                                                   </div>
                                                );
                                             })}
                                          </div>
                                       )}
                                       {showSubledger && isSalesAccount && row.sale_items && row.sale_items.length > 0 && (
                                          <div className="text-[12px] text-slate-400 font-mono mt-0.5 font-bold">
                                             {row.sale_items.map((item, iIndex) => {
                                                const qtyVal = parseFloat(item.weight) > 0 ? parseFloat(item.weight).toFixed(3) : parseFloat(item.quantity).toFixed(2);
                                                return (
                                                   <div key={iIndex} className="mt-0.5">
                                                      <span>{i18n.language === 'gu' ? (item.item_name_gu || item.item_name) : (item.item_name || item.item_name_gu)} </span>
                                                      <span className="force-en">{qtyVal} x {parseFloat(item.sale_rate).toFixed(2)} = ₹{parseFloat(item.amount).toFixed(2)}</span>
                                                   </div>
                                                );
                                             })}
                                          </div>
                                       )}
                                    </div>
                                    {showVigat ? (
                                       <>
                                          <div className="col-span-2 px-3.5 py-2 text-right text-slate-600 font-mono font-bold">{row.sub_amount ? parseFloat(row.sub_amount).toFixed(2) : ''}</div>
                                          <div className={`col-span-2 px-3.5 py-2 text-right font-mono font-bold ${isHighNode ? 'text-slate-800' : 'text-emerald-600'}`}>
                                             {row.amount ? parseFloat(row.amount).toFixed(2) : ''}
                                          </div>
                                          <div className="col-span-2 px-3.5 py-2 text-right text-slate-500 font-mono text-[12px]">{row.reference_no || ''}</div>
                                          <div className="col-span-1 px-3.5 py-2 text-right text-slate-600 font-mono text-[12px]">{((!row.isJV && !row.isContra && !isHighNode && !row.isGST && row.amount) || (parseFloat(row.cash_in || 0) > 0 || parseFloat(row.cash_out || 0) > 0)) ? parseFloat(row.amount).toFixed(2) : ''}</div>
                                          <div className="col-span-1 px-3.5 py-2 text-right text-slate-600 font-mono text-[12px] font-semibold">{(row.isJV || row.isContra || String(row.id || '').startsWith('JV-ITEM-')) ? parseFloat(row.amount).toFixed(2) : ''}</div>
                                       </>
                                    ) : (
                                       <>
                                          <div className="col-span-3 px-3.5 py-2 text-right font-mono font-bold text-slate-600">
                                             {!isHighNode && row.amount ? parseFloat(row.amount).toFixed(2) : ''}
                                          </div>
                                          <div className={`col-span-3 px-3.5 py-2 text-right font-mono font-bold ${isHighNode ? 'text-slate-800' : 'text-emerald-600'}`}>
                                             {isHighNode && row.amount ? parseFloat(row.amount).toFixed(2) : ''}
                                          </div>
                                       </>
                                    )}
                                 </div>
                              );
                           })}
                        </div>

                        {/* Footer */}
                        {data?.totals && (
                           <div className="grid grid-cols-12 items-center bg-slate-100 border-t border-slate-300 uppercase text-[12px] font-bold tracking-widest mt-auto">
                              {showVigat ? (
                                 <>
                                    <div className="col-span-6 px-4 py-3 text-slate-500 text-right">{t('rojmel.grossJama')}</div>
                                    <div className="col-span-2 px-4 py-3 text-right text-emerald-600 text-md font-bold font-mono tracking-tighter">
                                       ₹{parseFloat(data.totals.jama_total).toFixed(2)}
                                    </div>
                                    <div className="col-span-4"></div>
                                 </>
                              ) : (
                                 <>
                                    <div className="col-span-9 px-4 py-3 text-slate-500 text-right">{t('rojmel.grossJama')}</div>
                                    <div className="col-span-3 px-4 py-3 text-right text-emerald-600 text-md font-bold font-mono tracking-tighter">
                                       ₹{parseFloat(data.totals.jama_total).toFixed(2)}
                                    </div>
                                 </>
                              )}
                           </div>
                        )}
                     </div>
                  </div>

                  {/* UDHAR SIDE */}
                  <div className={`flex flex-col ${showVigat ? 'overflow-x-auto' : 'overflow-x-hidden'} custom-scrollbar w-full`}>
                     <div className={`${showVigat ? 'min-w-[800px]' : 'min-w-0 w-full'} flex flex-col flex-1`}>
                        {/* Header */}
                        <div className="py-2.5 bg-blue-50/50 flex flex-col items-center justify-center relative border-b border-slate-200">
                           <div className="flex items-center gap-1.5">
                              <ArrowDownLeft size={14} className="text-[#1d5f84]" />
                              <h2 className="text-[12px] font-bold text-[#1d5f84] uppercase tracking-widest font-mono">{t('rojmel.udharBaju')}</h2>
                           </div>
                        </div>

                        {/* Sub Header - Sub column removed; adjusted spans */}
                        <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 uppercase text-[12px] font-bold text-slate-500 tracking-wider">
                           <div className={`${showVigat ? 'col-span-4' : 'col-span-6'} px-3.5 py-2 text-left`}>{t('rojmel.particulars')}</div>
                           {showVigat && (
                              <div className="col-span-2 px-3.5 py-2 text-right">{t('rojmel.sub')}</div>
                           )}
                           {showVigat ? (
                              <>
                                 <div className="col-span-2 px-3.5 py-2 text-right bg-blue-100/30 text-[#1d5f84]">{t('rojmel.amount')}</div>
                                 <div className={`col-span-2 px-3.5 py-2 text-right border-l border-slate-200 ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>{i18n.language === 'gu' ? 'રસીદ નં.' : 'RECPT NO'}</div>
                                 <div className={`col-span-1 px-3.5 py-2 text-right border-l border-slate-200 ${i18n.language === 'gu' ? 'font-prompt tracking-normal' : ''}`}>{i18n.language === 'gu' ? 'રોકડ' : 'ROKAD'}</div>
                                 <div className={`col-span-1 px-3.5 py-2 text-right border-l border-slate-200 ${i18n.language === 'gu' ? 'font-prompt tracking-normal' : ''}`}>{i18n.language === 'gu' ? 'જમા ખર્ચ' : 'J.K.'}</div>
                              </>
                           ) : (
                              <>
                                 <div className="col-span-3 px-3.5 py-2 text-right bg-blue-100/30 text-[#1d5f84]">{i18n.language === 'gu' ? 'પેટા રકમ' : 'PETA RAKAM'}</div>
                                 <div className="col-span-3 px-3.5 py-2 text-right bg-blue-200/30 text-[#154662] border-l border-slate-200">{t('rojmel.amount')}</div>
                              </>
                           )}
                        </div>

                        {/* Body */}
                        <div className="flex flex-col flex-1 divide-y divide-slate-100 bg-white font-sans text-slate-800">
                           {normalizedUdhar.map((row, idx) => {
                              const isHighNode = row.isOpening || row.isClosing;
                              const isJVEntry = row.isJV || String(row.id || '').startsWith('JV-ITEM-') || String(row.reference_no || '').startsWith('JV-');
                              const isSalesAccount = row.account_code === 'S0001' || row.account_type === 'sales' || String(row.description_en || '').toLowerCase().includes('sales') || String(row.description_gu || '').includes('વેચાણ');
                              const isMemberAccount = row.account_code === 'M0001' || row.account_type === 'member' || String(row.description_en || '').toLowerCase().includes('member') || String(row.description_gu || '').includes('સદસ્ય');
                              return (
                                 <div
                                    key={idx}
                                    className={`grid grid-cols-12 items-center text-[12px] ${isHighNode ? 'bg-slate-50 font-bold' : 'hover:bg-slate-50/75 transition-colors cursor-pointer'}`}
                                    onDoubleClick={() => handleEditEntry(row, 'udhar')}
                                 >
                                    <div className={`${showVigat ? 'col-span-4' : 'col-span-6'} px-3.5 py-2`}>
                                       <div className={`font-bold text-slate-700 flex items-center gap-1.5 ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
                                          {isJVEntry && <span className="inline-block w-2 h-2 rounded-full bg-orange-500 shrink-0" title="JV" />}
                                          <span>{getDisplayName(row, i18n.language === 'gu')}</span>
                                       </div>
                                       {showSubledger && isMemberAccount && !row.isGrouped && (row.sub_details || row.sub_details_gu) && !row.isOpening && !row.isClosing && (
                                          <div className={`text-[10px] text-slate-400 font-semibold mt-0.5 leading-tight ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
                                             {i18n.language === 'gu' ? (row.sub_details_gu || row.sub_details) : (row.sub_details || row.sub_details_gu)}
                                          </div>
                                       )}
                                       {showSubledger && row.isGrouped && row.grouped_items && (
                                          <div className="text-[11px] text-slate-500 mt-1.5 font-semibold flex flex-col gap-1">
                                             {row.grouped_items.map((gItem, gIdx) => {
                                                const subTextGu = gItem.sub_details_gu || gItem.sub_details || gItem.notes || '';
                                                const subTextEn = gItem.sub_details || gItem.sub_details_gu || gItem.notes || '';
                                                return (
                                                   <div key={gIdx} className="flex justify-between items-center group/item hover:bg-slate-100 px-1 py-0.5 rounded cursor-pointer" onDoubleClick={(e) => { e.stopPropagation(); handleEditEntry(gItem, 'udhar'); }}>
                                                      <span className={`${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
                                                         - {i18n.language === 'gu' ? subTextGu : subTextEn}
                                                      </span>
                                                      <span className="font-mono force-en text-slate-600 ml-2">₹{parseFloat(gItem.amount || 0).toFixed(2)}</span>
                                                   </div>
                                                );
                                             })}
                                          </div>
                                       )}
                                       {showSubledger && isSalesAccount && row.sale_items && row.sale_items.length > 0 && (
                                          <div className="text-[12px] text-slate-400 font-mono mt-0.5 font-bold">
                                             {row.sale_items.map((item, iIndex) => {
                                                const qtyVal = parseFloat(item.weight) > 0 ? parseFloat(item.weight).toFixed(3) : parseFloat(item.quantity).toFixed(2);
                                                return (
                                                   <div key={iIndex} className="mt-0.5">
                                                      <span>{i18n.language === 'gu' ? (item.item_name_gu || item.item_name) : (item.item_name || item.item_name_gu)} </span>
                                                      <span className="force-en">{qtyVal} x {parseFloat(item.sale_rate).toFixed(2)} = ₹{parseFloat(item.amount).toFixed(2)}</span>
                                                   </div>
                                                );
                                             })}
                                          </div>
                                       )}
                                    </div>
                                    {showVigat ? (
                                       <>
                                          <div className="col-span-2 px-3.5 py-2 text-right text-slate-600 font-mono font-bold">{row.sub_amount ? parseFloat(row.sub_amount).toFixed(2) : ''}</div>
                                          <div className={`col-span-2 px-3.5 py-2 text-right font-mono font-bold ${isHighNode ? 'text-slate-800' : 'text-[#1d5f84]'}`}>
                                             {row.amount ? parseFloat(row.amount).toFixed(2) : ''}
                                          </div>
                                          <div className="col-span-2 px-3.5 py-2 text-right text-slate-500 font-mono text-[12px]">{row.reference_no || ''}</div>
                                          <div className="col-span-1 px-3.5 py-2 text-right text-slate-600 font-mono text-[12px]">{((!row.isJV && !row.isContra && !isHighNode && !row.isGST && row.amount) || (parseFloat(row.cash_in || 0) > 0 || parseFloat(row.cash_out || 0) > 0)) ? parseFloat(row.amount).toFixed(2) : ''}</div>
                                          <div className="col-span-1 px-3.5 py-2 text-right text-slate-600 font-mono text-[12px] font-semibold">{(row.isJV || row.isContra || String(row.id || '').startsWith('JV-ITEM-')) ? parseFloat(row.amount).toFixed(2) : ''}</div>
                                       </>
                                    ) : (
                                       <>
                                          <div className="col-span-3 px-3.5 py-2 text-right font-mono font-bold text-slate-600">
                                             {!isHighNode && row.amount ? parseFloat(row.amount).toFixed(2) : ''}
                                          </div>
                                          <div className={`col-span-3 px-3.5 py-2 text-right font-mono font-bold ${isHighNode ? 'text-slate-800' : 'text-[#1d5f84]'}`}>
                                             {isHighNode && row.amount ? parseFloat(row.amount).toFixed(2) : ''}
                                          </div>
                                       </>
                                    )}
                                 </div>
                              );
                           })}
                        </div>

                        {/* Footer */}
                        {data?.totals && (
                           <div className="grid grid-cols-12 items-center bg-slate-100 border-t border-slate-300 uppercase text-[12px] font-bold tracking-widest mt-auto">
                              {showVigat ? (
                                 <>
                                    <div className="col-span-6 px-4 py-3 text-slate-500 text-right">{t('rojmel.grossUdhar')}</div>
                                    <div className="col-span-2 px-4 py-3 text-right text-[#1d5f84] text-md font-bold font-mono tracking-tighter">
                                       ₹{parseFloat(data.totals.udhar_total).toFixed(2)}
                                    </div>
                                    <div className="col-span-4"></div>
                                 </>
                              ) : (
                                 <>
                                    <div className="col-span-9 px-4 py-3 text-slate-500 text-right">{t('rojmel.grossUdhar')}</div>
                                    <div className="col-span-3 px-4 py-3 text-right text-[#1d5f84] text-md font-bold font-mono tracking-tighter">
                                       ₹{parseFloat(data.totals.udhar_total).toFixed(2)}
                                    </div>
                                 </>
                              )}
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               {/* Quick Actions Footer */}
               <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 border-t border-slate-200 print:hidden">
                  <div className="flex items-center gap-2">
                     <button
                        onClick={() => { setEditingEntry(null); setActiveModal('credit'); }}
                        className="h-7 flex items-center gap-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider"
                     >
                        <Plus size={13} /> {t('rojmel.actions.jamaEntry')}
                     </button>
                     <button
                        onClick={() => { setEditingEntry(null); setActiveModal('debit'); }}
                        className="h-7 flex items-center gap-1.5 px-3 bg-[#1d5f84] hover:bg-[#154662] text-white text-[10px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider"
                     >
                        <Plus size={13} /> {t('rojmel.actions.udharEntry')}
                     </button>
                  </div>

                  <div className="flex items-center gap-2">
                     <button
                        onClick={() => setActiveModal('sales')}
                        className="h-7 flex items-center px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-800 text-[10px] font-bold rounded-md transition uppercase tracking-wider cursor-pointer"
                     >
                        {t('rojmel.actions.sale')}
                     </button>
                     <button
                        onClick={() => setActiveModal('jv')}
                        className="h-7 flex items-center px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-800 text-[10px] font-bold rounded-md transition uppercase tracking-wider cursor-pointer"
                     >
                        {t('rojmel.actions.journal')}
                     </button>
                  </div>
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