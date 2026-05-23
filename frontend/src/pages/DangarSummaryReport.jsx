import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCcw, X, FileText } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import Toast from '../components/Toast';
import Loading from '../components/Loading';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addGujaratiFont } from '../utils/pdfFonts';

const fmt = (n, dec = 2) =>
   parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const clsConfig = {
   '1st': { dot: 'bg-emerald-400', text: 'text-emerald-600', label: '1st' },
   '2nd': { dot: 'bg-amber-400', text: 'text-amber-600', label: '2nd' },
   '3rd': { dot: 'bg-rose-400', text: 'text-rose-600', label: '3rd' },
};

const DangarSummaryReport = () => {
   const { t, i18n } = useTranslation();
   const navigate = useNavigate();
   const [loading, setLoading] = useState(false);
   const [message, setMessage] = useState(null);
   const [data, setData] = useState({
      dangarSummary: [], villageSummary: [], fixedAccounts: [], paymentPerAccount: [],
      grandTotals: {}, totalInterest: 0, activeMembers: 0, memberPaymentSummary: {},
   });
   const [dateRange, setDateRange] = useState({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
   });

   useEffect(() => { fetchSummary(); }, [dateRange.startDate, dateRange.endDate]);

   const fetchSummary = async () => {
      try {
         setLoading(true);
         const company = JSON.parse(localStorage.getItem('company') || '{}');
         const user = JSON.parse(localStorage.getItem('user') || '{}');
         const companyId = company.id || user.company_id;
         const [res, paymentRes] = await Promise.all([
            api.get('/dangar-entry/summary-report', {
               params: { companyId, startDate: dateRange.startDate, endDate: dateRange.endDate },
            }),
            api.get('/dangar-entry/payment-report', {
               params: { companyId, startDate: dateRange.startDate, endDate: dateRange.endDate },
            })
         ]);
         if (res.data.success) {
            setData({
               ...res.data.data,
               paymentReportData: paymentRes.data.success ? paymentRes.data.data : []
            });
         }
      } catch (err) {
         console.error('Failed to load summary:', err);
      } finally {
         setLoading(false);
      }
   };

   const handleExportPDF = async () => {
      const company = JSON.parse(localStorage.getItem('company') || '{}');
      const cName = company.company_name || company.name || 'Company';
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      await addGujaratiFont(doc);

      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 32;
      const navy = [15, 23, 42], white = [255, 255, 255], gray = [100, 116, 139], dark = [30, 41, 59], stripe = [241, 245, 249];

      const hdr = () => {
         doc.setFillColor(...navy); doc.rect(0, 0, W, 26, 'F');
         doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
         doc.text(cName, M, 17);
         doc.setFontSize(7); doc.setTextColor(148, 163, 184);
         doc.text('DANGAR PURCHASE SUMMARY & AUDIT', W / 2, 17, { align: 'center' });
         doc.setFontSize(7); doc.setTextColor(239, 68, 68);
         doc.text('CONFIDENTIAL', W - M, 17, { align: 'right' });
      };

      const ftr = (pg, tot) => {
         doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, H - 18, W - M, H - 18);
         doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
         doc.text(cName + ' - Dangar Audit', M, H - 9);
         doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' });
         doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' });
      };

      hdr();
      let y = 45;
      doc.setFont('NotoGujarati', 'bold'); doc.setFontSize(15); doc.setTextColor(...navy);
      doc.text(t('dangarSummaryReport.title'), M, y);
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gray);
      doc.text('Period: ' + dateRange.startDate + ' to ' + dateRange.endDate + '   |   Generated: ' + new Date().toLocaleString('en-IN'), M, y + 13);
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
      y += 32;

      // Section 1: Variety Table
      autoTable(doc, {
         startY: y,
         head: [[t('dangarSummaryReport.table.item'), t('dangarSummaryReport.table.class'), t('dangarSummaryReport.table.entries'), t('dangarSummaryReport.table.kg'), t('dangarSummaryReport.table.quintal'), t('dangarSummaryReport.table.avgRate'), t('dangarSummaryReport.table.deduction'), t('dangarSummaryReport.table.amount')]],
         body: [
            ...dangarSummary.map(r => [
               isGu ? (r.item_name_gu || r.item_name || '-') : (r.item_name || '-').toUpperCase(),
               r.quality_class || '1st',
               r.entry_count,
               fmt(r.total_kg, 0),
               fmt(r.total_quintal),
               'Rs.' + fmt(r.avg_rate),
               'Rs.' + fmt(r.total_deduction),
               'Rs.' + fmt(r.total_amount)
            ]),
            [t('dangarSummaryReport.table.total'), '', grandEntryCount, fmt(grandKg, 0), fmt(grandQuintal), '-', 'Rs.' + fmt(grandDeduction), 'Rs.' + fmt(grandRateAmount)]
         ],
         styles: { font: 'NotoGujarati', fontSize: 7.5, cellPadding: [4, 5], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
         headStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'normal' },
         footStyles: { font: 'NotoGujarati', fillColor: [30, 41, 59], textColor: white },
         alternateRowStyles: { fillColor: stripe },
         theme: 'grid',
         margin: { left: M, right: M },
         didParseCell: (d) => {
            if (d.row.index === dangarSummary.length) {
               d.cell.styles.fontStyle = 'bold';
               d.cell.styles.fillColor = [241, 245, 249];
            }
            const text = d.cell.text.join(' ');
            if (text && !/[\u0A80-\u0AFF]/.test(text)) {
               d.cell.styles.font = 'helvetica';
            }
         }
      });
      y = doc.lastAutoTable.finalY + 20;

      // Section 2: Account Payment activity
      if (y > H - 120) { doc.addPage(); hdr(); y = 45; }
      doc.setFont('NotoGujarati', 'bold'); doc.setFontSize(10); doc.setTextColor(...navy);
      doc.text(t('dangarSummaryReport.paymentActivityByAccount'), M, y);
      y += 12;

      autoTable(doc, {
         startY: y,
         head: [[t('dangarSummaryReport.table.account'), t('dangarSummaryReport.table.code'), t('dangarSummaryReport.table.type'), t('dangarSummaryReport.table.txns'), t('dangarSummaryReport.table.credited'), t('dangarSummaryReport.table.debited'), t('dangarSummaryReport.table.net')]],
         body: paymentPerAccount.map(a => {
            const net = parseFloat(a.net_paid || 0);
            return [
               (isGu ? (a.account_name_gu || a.account_name) : a.account_name) || '-',
               a.account_code || '-',
               a.account_type || '-',
               a.txn_count || 0,
               'Rs.' + fmt(a.total_credited || 0),
               'Rs.' + fmt(a.total_debited || 0),
               (net >= 0 ? '+' : '-') + 'Rs.' + fmt(Math.abs(net))
            ];
         }),
         styles: { font: 'NotoGujarati', fontSize: 7.5, cellPadding: [4, 5], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
         headStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'normal' },
         alternateRowStyles: { fillColor: stripe },
         didParseCell: (data) => {
            const text = data.cell.text.join(' ');
            if (text && !/[\u0A80-\u0AFF]/.test(text)) {
               data.cell.styles.font = 'helvetica';
            }
         },
         theme: 'grid',
         margin: { left: M, right: M }
      });
      y = doc.lastAutoTable.finalY + 20;

      // Section 3: Village Summary
      if (y > H - 120) { doc.addPage(); hdr(); y = 45; }
      doc.setFont('NotoGujarati', 'bold'); doc.setFontSize(10); doc.setTextColor(...navy);
      doc.text(t('dangarSummaryReport.procurementByVillage'), M, y);
      y += 12;

      autoTable(doc, {
         startY: y,
         head: [[t('dangarSummaryReport.table.village'), t('dangarSummaryReport.table.entries'), t('dangarSummaryReport.table.kg'), t('dangarSummaryReport.table.quintal'), t('dangarSummaryReport.table.deduction'), t('dangarSummaryReport.table.amount')]],
         body: villageSummary.map(r => [
            r.village_name || '-',
            r.entry_count,
            fmt(r.total_kg, 0),
            fmt(r.total_quintal),
            'Rs.' + fmt(r.total_deduction),
            'Rs.' + fmt(r.total_amount)
         ]),
         styles: { font: 'NotoGujarati', fontSize: 7.5, cellPadding: [4, 5], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
         headStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'normal' },
         alternateRowStyles: { fillColor: stripe },
         didParseCell: (data) => {
            const text = data.cell.text.join(' ');
            if (text && !/[\u0A80-\u0AFF]/.test(text)) {
               data.cell.styles.font = 'helvetica';
            }
         },
         theme: 'grid',
         margin: { left: M, right: M }
      });

      const tot = doc.internal.getNumberOfPages();
      for (let i = 1; i <= tot; i++) { doc.setPage(i); ftr(i, tot); }
      doc.save('Dangar_Summary_' + dateRange.startDate + '_to_' + dateRange.endDate + '.pdf');
   };

   const { dangarSummary = [], villageSummary = [], fixedAccounts = [], paymentPerAccount = [], grandTotals = {}, totalInterest = 0, activeMembers = 0, memberPaymentSummary = {} } = data;

   const grandRateAmount = parseFloat(grandTotals.grand_rate_amount || 0);
   const grandDeduction = parseFloat(grandTotals.grand_total_deduction || 0);
   const grandKg = parseFloat(grandTotals.grand_total_kg || 0);
   const grandQuintal = parseFloat(grandTotals.grand_total_quintal || 0);
   const grandEntryCount = parseInt(grandTotals.grand_entry_count || 0);
   const overallAvgRate = grandQuintal > 0 ? (grandRateAmount / grandQuintal) : 0;
   const totalKapatBal = fixedAccounts.reduce((s, a) => s + parseFloat(a.total_balance || 0), 0);
   const totalDeduction = grandDeduction + totalInterest + Math.abs(totalKapatBal);
   const netPayable = grandRateAmount - totalDeduction;
   const isGu = i18n.language === 'gu';

   const groupedSummary = dangarSummary.reduce((acc, row) => {
      const item = row.item_name || '—';
      if (!acc[item]) acc[item] = { rows: [], kg: 0, q: 0, amt: 0, entries: 0, item_name_gu: row.item_name_gu || '' };
      acc[item].rows.push(row);
      acc[item].kg += parseFloat(row.total_kg || 0);
      acc[item].q += parseFloat(row.total_quintal || 0);
      acc[item].amt += parseFloat(row.total_amount || 0);
      acc[item].entries += parseInt(row.entry_count || 0, 10);
      return acc;
   }, {});

   if (loading) {
      return <Loading />;
   }

   return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 select-none pb-12">
         <Toast message={message} onClose={() => setMessage(null)} />

         <div className="px-4 py-4 max-w-[1600px] mx-auto space-y-4">

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 select-none">

               {/* Left Column: Tables */}
               <div className="xl:col-span-2 space-y-4">

                  {/* Variety & Class Breakdown Box */}
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none">

                     {/* Table Control Header Bar */}
                     <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
                        <div className="flex items-center gap-2">
                           <span className={`text-sm font-extrabold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>
                              {t('dangarSummaryReport.varietyBreakdown') || 'Variety & Class Breakdown'}
                           </span>
                           <span className="bg-slate-200 text-slate-600 font-bold force-en text-[12px] px-1.5 py-0.5 rounded-sm">
                              {dangarSummary.length} {t('dangarSummaryReport.table.varieties') || 'Varieties'}
                           </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                           {/* Date Range Picker */}
                           <div className="flex items-center border border-slate-200 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] rounded-md bg-white px-2.5 py-1 transition-colors">
                              <Calendar size={12} className="text-slate-400 mr-1.5" />
                              <input type="date" value={dateRange.startDate}
                                 onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })}
                                 className="bg-transparent border-none outline-none text-sm text-slate-700 font-bold w-[95px]"
                              />
                              <span className="text-slate-300 text-[10px] px-1">—</span>
                              <input type="date" value={dateRange.endDate}
                                 onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })}
                                 className="bg-transparent border-none outline-none text-sm text-slate-700 font-bold w-[95px]"
                              />
                           </div>

                           {/* PDF Report Button */}
                           <button
                              onClick={handleExportPDF}
                              title={t('common.pdf') || "PDF Report"}
                              className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none"
                           >
                              <FileText size={13} className="text-slate-500" />
                           </button>

                           {/* Refresh Button */}
                           <button
                              onClick={fetchSummary}
                              className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none"
                              title="Refresh"
                           >
                              <RefreshCcw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                           </button>

                           {/* Close Button */}
                           <button
                              onClick={() => navigate(-1)}
                              className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none"
                              title="Close"
                           >
                              <X size={13} className="text-slate-500" />
                           </button>
                        </div>
                     </div>

                     {/* Variety Table Container */}
                     <div className="overflow-x-auto bg-white select-none">
                        <table className="min-w-full divide-y divide-slate-200 border-collapse text-[12px]">
                           <thead className="bg-slate-50 font-sans">
                              <tr>
                                 <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-12">#</th>
                                 <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('dangarSummaryReport.table.item') || 'Item'}</th>
                                 <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-24">{t('dangarSummaryReport.table.class') || 'Class'}</th>
                                 <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-24">{t('dangarSummaryReport.table.entries') || 'Entries'}</th>
                                 <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-28">{t('dangarSummaryReport.table.kg') || 'Weight (Kg)'}</th>
                                 <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-28">{t('dangarSummaryReport.table.quintal') || 'Weight (Qtl)'}</th>
                                 <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-28">{t('dangarSummaryReport.table.avgRate') || 'Avg Rate'}</th>
                                 <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 w-32">{t('dangarSummaryReport.table.amount') || 'Amount'}</th>
                              </tr>
                           </thead>
                           <tbody className="bg-white divide-y divide-slate-100">
                              {dangarSummary.length === 0 ? (
                                 <tr>
                                    <td colSpan="8" className="py-8 text-center text-slate-400 font-medium">No entries recorded in selected range</td>
                                 </tr>
                              ) : (
                                 <>
                                    {dangarSummary.map((row, i) => {
                                       const cls = row.quality_class || '1st';
                                       const c = clsConfig[cls] || clsConfig['1st'];
                                       return (
                                          <tr key={i} className="hover:bg-slate-50/75 transition-colors cursor-pointer select-none">
                                             <td className="px-3.5 py-2 text-center font-mono text-slate-500 border-r border-slate-100">{i + 1}</td>
                                             <td className={`px-3.5 py-2 border-r border-slate-100 font-bold text-slate-800 break-words whitespace-normal ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>
                                                {isGu ? (row.item_name_gu || row.item_name || '—') : (row.item_name || '—')}
                                             </td>
                                             <td className="px-3.5 py-2 border-r border-slate-100 text-center">
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase ${c.text}`}>
                                                   <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
                                                   {c.label}
                                                </span>
                                             </td>
                                             <td className="px-3.5 py-2 text-center border-r border-slate-100 font-mono font-bold text-slate-500">{row.entry_count}</td>
                                             <td className="px-3.5 py-2 text-right border-r border-slate-100 font-mono font-bold text-slate-500">{fmt(row.total_kg, 0)}</td>
                                             <td className="px-3.5 py-2 text-right border-r border-slate-100 font-mono font-bold text-slate-700">{fmt(row.total_quintal)}</td>
                                             <td className="px-3.5 py-2 text-right border-r border-slate-100 font-mono font-bold text-slate-600">₹{fmt(row.avg_rate)}</td>
                                             <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-800">₹{fmt(row.total_amount)}</td>
                                          </tr>
                                       );
                                    })}
                                    <tr className="bg-slate-50 font-bold border-t border-slate-200">
                                       <td className="px-3.5 py-2.5 text-slate-700 text-center font-bold border-r border-slate-100" colSpan="3">{t('dangarSummaryReport.table.total') || 'Total'}</td>
                                       <td className="px-3.5 py-2.5 text-center font-mono font-bold text-slate-700 border-r border-slate-100">{grandEntryCount}</td>
                                       <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-700 border-r border-slate-100">{fmt(grandKg, 0)}</td>
                                       <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-800 border-r border-slate-100">{fmt(grandQuintal)}</td>
                                       <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-800 border-r border-slate-100">₹{fmt(overallAvgRate)}</td>
                                       <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-800">₹{fmt(grandRateAmount)}</td>
                                    </tr>
                                 </>
                              )}
                           </tbody>
                        </table>
                     </div>

                     {/* Grouped Summary Analytics */}
                     {Object.keys(groupedSummary).length > 0 && (
                        <div className="flex flex-col bg-white border-t border-slate-200 divide-y divide-slate-100">
                           {Object.entries(groupedSummary).map(([itemName, group], groupIdx) => {
                              const itemAvgRate = group.q > 0 ? (group.amt / group.q) : 0;
                              const displayName = isGu ? (group.item_name_gu || itemName) : itemName;
                              return (
                                 <div key={groupIdx} className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 text-[12px] font-bold">
                                    <div className="flex-1 flex items-center justify-between px-3.5 py-2 bg-slate-50/25 select-none">
                                       <span className={`text-slate-500 font-bold ${isGu ? 'font-prompt text-sm' : 'font-sans uppercase text-[10px] tracking-wider'}`}>
                                          {isGu ? `${displayName} નો સરેરાશ ભાવ` : `${displayName} AVERAGE RATE`}
                                       </span>
                                       <span className="text-slate-700 font-mono font-bold">₹{fmt(itemAvgRate)}</span>
                                    </div>
                                    <div className="flex-1 flex items-center justify-between px-3.5 py-2 bg-slate-50/50 select-none">
                                       <span className={`text-slate-700 font-bold ${isGu ? 'font-prompt text-sm' : 'font-sans uppercase text-[10px] tracking-wider'}`}>
                                          {isGu ? `${displayName} ની કુલ રકમ` : `${displayName} TOTAL AMOUNT`}
                                       </span>
                                       <span className="text-emerald-600 font-mono font-black text-sm">₹{fmt(group.amt)}</span>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     )}
                  </div>

                  {/* Payment Activity by Account Registry Box */}
                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none">

                     {/* Table Control Header Bar */}
                     <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
                        <div className="flex items-center gap-2">
                           <span className={`text-sm font-extrabold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>
                              {t('dangarSummaryReport.paymentActivityByAccount') || 'Payment Activity by Account'}
                           </span>
                           <span className="bg-slate-200 text-slate-600 font-bold force-en text-[12px] px-1.5 py-0.5 rounded-sm">
                              {paymentPerAccount.filter(acc => parseFloat(acc.net_paid || 0) < 0).length} {t('dangarSummaryReport.table.accounts') || 'Accounts'}
                           </span>
                        </div>
                     </div>

                     {/* Account Activity Table Container */}
                     <div className="overflow-x-auto bg-white select-none">
                        <table className="min-w-full divide-y divide-slate-200 border-collapse text-[12px]">
                           <thead className="bg-slate-50 font-sans">
                              <tr>
                                 <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-12">#</th>
                                 <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('dangarSummaryReport.table.account') || 'Account Name'}</th>
                                 <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 w-44">{t('dangarSummaryReport.table.amount') || 'Amount'}</th>
                              </tr>
                           </thead>
                           <tbody className="bg-white divide-y divide-slate-100">
                              {paymentPerAccount.filter(acc => parseFloat(acc.net_paid || 0) < 0).length === 0 ? (
                                 <tr>
                                    <td colSpan="3" className="py-8 text-center text-slate-400 font-medium">No active accounts</td>
                                 </tr>
                              ) : (
                                 paymentPerAccount
                                    .filter(acc => parseFloat(acc.net_paid || 0) < 0)
                                    .map((acc, i) => {
                                       const net = parseFloat(acc.net_paid || 0);
                                       return (
                                          <tr key={i} className="hover:bg-slate-50/75 transition-colors cursor-pointer select-none">
                                             <td className="px-3.5 py-2 text-center font-mono text-slate-500 border-r border-slate-100">{i + 1}</td>
                                             <td className="px-3.5 py-2 border-r border-slate-100 font-sans font-bold text-slate-800 uppercase">
                                                <Link
                                                   to="/account-ledger"
                                                   state={{ selectedAccount: { id: acc.account_id, account_name: isGu ? (acc.account_name_gu || acc.account_name) : acc.account_name } }}
                                                   className="text-[#1d5f84] hover:text-[#154662] hover:underline"
                                                >
                                                   {isGu ? (acc.account_name_gu || acc.account_name) : acc.account_name}
                                                </Link>
                                             </td>
                                             <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-700">₹{fmt(Math.abs(net))}</td>
                                          </tr>
                                       );
                                    })
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>

               </div>

               {/* Right Column: Detailed Financial Summary */}
               <div className="xl:col-span-1">

                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none">

                     <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 select-none">
                        <span className={`text-sm font-extrabold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>
                           {t('dangarSummaryReport.financialSummary') || 'Financial Summary'}
                        </span>
                     </div>

                     <div className="bg-white divide-y divide-slate-100 font-mono text-[12px] select-none">
                        {[
                           { label: `${t('dangarSummaryReport.table.total') || 'Total'} ${t('dangarSummaryReport.table.kg') || 'Weight (Kg)'}`, value: `${fmt(grandKg)}`, color: 'text-slate-800' },
                           { label: `${t('dangarSummaryReport.table.total') || 'Total'} ${t('dangarSummaryReport.table.quintal') || 'Weight (Qtl)'}`, value: `${fmt(grandQuintal)}`, color: 'text-slate-800' },
                           { label: `${t('dangarSummaryReport.table.total') || 'Total'} ${t('dangarSummaryReport.table.avgRate') || 'Avg Rate'}`, value: `₹${fmt(overallAvgRate)}`, color: 'text-slate-800' },
                           { label: t('dangarSummaryReport.summary.grossProcurement') || 'Gross Procurement', value: `₹${fmt(grandRateAmount)}`, color: 'text-slate-800' },
                        ].map((r, i) => (
                           <div key={i} className="flex items-center justify-between px-3.5 py-2.5 select-none">
                              <span className="font-sans text-slate-500 font-bold">{r.label}</span>
                              <span className={`font-mono font-bold ${r.color}`}>{r.value}</span>
                           </div>
                        ))}
                        <div className="flex items-center justify-between px-3.5 py-2.5 select-none">
                           <span className="font-sans text-slate-500 font-bold">Total Deduction</span>
                           <span className="font-mono text-rose-600 font-bold">₹{fmt(totalDeduction)}</span>
                        </div>
                        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 font-sans select-none border-t border-slate-200">
                           <span className="text-sm font-bold text-slate-800">{t('dangarSummaryReport.kpis.netPayable') || 'Net Payable'}</span>
                           <span className={`text-[13px] font-bold font-mono ${netPayable >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              ₹{fmt(netPayable)}
                           </span>
                        </div>
                     </div>
                  </div>

               </div>

            </div>

         </div>
      </div>
   );
};

export default DangarSummaryReport;
