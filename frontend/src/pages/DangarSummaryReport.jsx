import React, { useState, useEffect } from 'react';
import { Database, Calendar, RefreshCcw, X, CreditCard, Box, Calculator, TrendingUp, Printer, FileText, MapPin } from 'lucide-react';
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
   const { t } = useTranslation();
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
         const res = await api.get('/dangar-entry/summary-report', {
            params: { companyId, startDate: dateRange.startDate, endDate: dateRange.endDate },
         });
         if (res.data.success) setData(res.data.data);
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
      const rose = [225, 29, 72], green = [5, 150, 105];

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
               r.item_name || '-',
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
               a.account_name || '-',
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
   const totalMemberCredit = parseFloat(memberPaymentSummary.total_member_credit || 0);
   const totalMemberDebit = parseFloat(memberPaymentSummary.total_member_debit || 0);
   const netPayable = totalMemberCredit - totalMemberDebit;
   const totalKapatBal = fixedAccounts.reduce((s, a) => s + parseFloat(a.total_balance || 0), 0);

   const kpis = [
      { label: t('dangarSummaryReport.kpis.procurement'), value: `₹${fmt(grandRateAmount)}`, sub: `${grandEntryCount} ` + t('dangarSummaryReport.kpis.entries') },
      { label: t('dangarSummaryReport.kpis.weight'), value: `${fmt(grandKg, 0)} KG`, sub: `${fmt(grandQuintal)} ` + t('dangarSummaryReport.table.quintal') },
      { label: t('dangarSummaryReport.kpis.members'), value: activeMembers, sub: t('dangarSummaryReport.kpis.activeSuppliers') },
      { label: t('dangarSummaryReport.kpis.memberPayable'), value: `₹${fmt(totalMemberCredit)}`, sub: t('dangarSummaryReport.kpis.totalCredited') },
      { label: t('dangarSummaryReport.kpis.deductions'), value: `₹${fmt(grandDeduction)}`, sub: t('dangarSummaryReport.kpis.kapatFund') },
      { label: t('dangarSummaryReport.kpis.interest'), value: `₹${fmt(totalInterest)}`, sub: t('dangarSummaryReport.kpis.accumulated') },
      { label: t('dangarSummaryReport.kpis.netPayable'), value: `₹${fmt(netPayable)}`, sub: t('dangarSummaryReport.kpis.creditDebit') },
   ];

   if (loading) {
      return <Loading />;
   }

   return (
      <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none animate-none">
         <Toast message={message} onClose={() => setMessage(null)} />

         <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
               <div>
                  <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 select-none">
                     <Database size={20} className="text-zinc-600" />
                     {t('dangarSummaryReport.title')}
                  </h1>
                  <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider select-none">{t('dangarSummaryReport.eyebrow')}</p>
               </div>

               <div className="flex flex-wrap items-center gap-3 w-full md:w-auto select-none no-print">
                  <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500">
                     <Calendar size={14} className="text-zinc-400" />
                     <input type="date" value={dateRange.startDate}
                        onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })}
                        className="bg-transparent border-none outline-none text-xs text-zinc-700 w-[105px] font-bold"
                     />
                     <span className="text-zinc-300 text-sm select-none">—</span>
                     <input type="date" value={dateRange.endDate}
                        onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })}
                        className="bg-transparent border-none outline-none text-xs text-zinc-700 w-[105px] font-bold"
                     />
                  </div>
                  <button
                     onClick={handleExportPDF}
                     className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none transition"
                  >
                     <Printer size={14} />{t('common.pdf')}</button>
                  <button onClick={fetchSummary} className="p-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 transition select-none">
                     <RefreshCcw size={15} className={`${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button onClick={() => navigate(-1)} className="p-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 transition select-none">
                     <X size={15} />
                  </button>
               </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-4 mb-4 select-none">
               {kpis.map((k, i) => (
                  <div key={i} className="border border-zinc-300 px-4 py-3 flex flex-col gap-0.5 bg-zinc-50">
                     <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold font-mono">{k.label}</p>
                     <p className="text-lg font-bold text-zinc-800 leading-tight font-mono">{k.value}</p>
                     <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{k.sub}</p>
                  </div>
               ))}
            </div>

            {/* {t('dangarSummaryReport.varietyBreakdown')} Table */}
            <section className="mb-4">
               <div className="border border-zinc-300 bg-zinc-50 flex flex-col">
                  <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex flex-wrap items-center justify-between gap-3">
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-700  ">
                           {t('dangarSummaryReport.varietyBreakdown')}
                        </span>
                        <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-sm px-2 py-0.5">
                           {dangarSummary.length} ` + t('dangarSummaryReport.table.varieties')
                        </span>
                     </div>
                  </div>
                  <div className="overflow-x-auto bg-white select-none">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-zinc-50 border-b border-zinc-300 text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none">
                              {[t('dangarSummaryReport.table.item'), t('dangarSummaryReport.table.class'), t('dangarSummaryReport.table.entries'), t('dangarSummaryReport.table.kg'), t('dangarSummaryReport.table.quintal'), t('dangarSummaryReport.table.avgRate'), t('dangarSummaryReport.table.deduction'), t('dangarSummaryReport.table.amount')].map((h, idx) => (
                                 <th key={idx} className={`px-4 py-3 ${idx < 2 ? 'text-left' : 'text-right'}`}>{h}</th>
                              ))}
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 text-xs font-mono">
                           {dangarSummary.length === 0 ? (
                              <tr><td colSpan="8" className="py-8 text-center text-zinc-400">No entries recorded in selected range</td></tr>
                           ) : (
                              <>
                                 {dangarSummary.map((row, i) => {
                                    const cls = row.quality_class || '1st';
                                    const c = clsConfig[cls] || clsConfig['1st'];
                                    return (
                                       <tr key={i} className="hover:bg-zinc-50 transition">
                                          <td className="px-4 py-3 text-sm font-bold text-zinc-700 ">{row.item_name || '—'}</td>
                                          <td className="px-4 py-3">
                                             <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase ${c.text}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
                                                {c.label}
                                                {row.item_name_gu && <span className="text-zinc-400 font-normal ml-1 font-sans">{row.item_name_gu}</span>}
                                             </span>
                                          </td>
                                          <td className="px-4 py-3 text-right text-zinc-400">{row.entry_count}</td>
                                          <td className="px-4 py-3 text-right text-zinc-500">{fmt(row.total_kg, 0)}</td>
                                          <td className="px-4 py-3 text-right text-zinc-700 font-bold">{fmt(row.total_quintal)}</td>
                                          <td className="px-4 py-3 text-right text-zinc-600">₹{fmt(row.avg_rate)}</td>
                                          <td className="px-4 py-3 text-right text-rose-500 font-bold">₹{fmt(row.total_deduction)}</td>
                                          <td className="px-4 py-3 text-right text-zinc-800 font-bold">₹{fmt(row.total_amount)}</td>
                                       </tr>
                                    );
                                 })}
                                 <tr className="bg-zinc-100 font-bold border-t border-zinc-300">
                                    <td className="px-4 py-3 text-zinc-700 " colSpan="2">{t('dangarSummaryReport.table.total')}</td>
                                    <td className="px-4 py-3 text-right text-zinc-700">{grandEntryCount}</td>
                                    <td className="px-4 py-3 text-right text-zinc-700">{fmt(grandKg, 0)}</td>
                                    <td className="px-4 py-3 text-right text-zinc-800">{fmt(grandQuintal)}</td>
                                    <td className="px-4 py-3 text-right text-zinc-300">—</td>
                                    <td className="px-4 py-3 text-right text-rose-600">₹{fmt(grandDeduction)}</td>
                                    <td className="px-4 py-3 text-right text-zinc-800">₹{fmt(grandRateAmount)}</td>
                                 </tr>
                              </>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </section>

            {/* {t('dangarSummaryReport.procurementByVillage')} */}
            <section className="mb-4">
               <div className="border border-zinc-300 bg-zinc-50 flex flex-col">
                  <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex flex-wrap items-center justify-between gap-3">
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-700  ">
                           {t('dangarSummaryReport.procurementByVillage')}
                        </span>
                        <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-sm px-2 py-0.5">
                           {villageSummary.length} ` + t('dangarSummaryReport.table.regions')
                        </span>
                     </div>
                  </div>
                  <div className="overflow-x-auto bg-white select-none">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-zinc-50 border-b border-zinc-300 text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none">
                              {[t('dangarSummaryReport.table.village'), t('dangarSummaryReport.table.entries'), t('dangarSummaryReport.table.kg'), t('dangarSummaryReport.table.quintal'), t('dangarSummaryReport.table.deduction'), t('dangarSummaryReport.table.amount')].map((h, idx) => (
                                 <th key={idx} className={`px-4 py-3 ${idx === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                              ))}
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 text-xs font-mono">
                           {villageSummary.length === 0 ? (
                              <tr><td colSpan="6" className="py-8 text-center text-zinc-400">No village records present</td></tr>
                           ) : (
                              villageSummary.map((row, i) => (
                                 <tr key={i} className="hover:bg-zinc-50 transition">
                                    <td className="px-4 py-3 text-sm font-bold text-zinc-700  font-sans">
                                       {row.village_name || '—'}
                                       {row.village_name_gu && <span className="text-zinc-400 font-normal ml-2 font-sans">{row.village_name_gu}</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right text-zinc-400">{row.entry_count}</td>
                                    <td className="px-4 py-3 text-right text-zinc-500">{fmt(row.total_kg, 0)}</td>
                                    <td className="px-4 py-3 text-right text-zinc-700 font-bold">{fmt(row.total_quintal)}</td>
                                    <td className="px-4 py-3 text-right text-rose-500 font-bold">₹{fmt(row.total_deduction)}</td>
                                    <td className="px-4 py-3 text-right text-zinc-800 font-bold">₹{fmt(row.total_amount)}</td>
                                 </tr>
                              ))
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </section>

            {/* Account Matrix & Summaries */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 select-none">
               <div className="xl:col-span-2">
                  <div className="border border-zinc-300 bg-zinc-50 flex flex-col h-full">
                     <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-bold text-zinc-700  ">
                              {t('dangarSummaryReport.paymentActivityByAccount')}
                           </span>
                           <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-sm px-2 py-0.5">
                              {paymentPerAccount.length} ` + t('dangarSummaryReport.table.accounts')
                           </span>
                        </div>
                     </div>
                     <div className="overflow-x-auto bg-white select-none">
                        <table className="w-full text-left h-full">
                           <thead>
                              <tr className="bg-zinc-50 border-b border-zinc-300 text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none">
                                 {[t('dangarSummaryReport.table.account'), t('dangarSummaryReport.table.type'), t('dangarSummaryReport.table.txns'), t('dangarSummaryReport.table.credited'), t('dangarSummaryReport.table.debited'), t('dangarSummaryReport.table.net')].map((h, idx) => (
                                 <th key={idx} className={`px-4 py-3 ${idx < 2 ? 'text-left' : 'text-right'}`}>{h}</th>
                              ))}
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-200 text-xs font-mono">
                              {paymentPerAccount.length === 0 ? (
                                 <tr><td colSpan="6" className="py-8 text-center text-zinc-400">No active accounts</td></tr>
                              ) : (
                                 paymentPerAccount.map((acc, i) => {
                                    const net = parseFloat(acc.net_paid || 0);
                                    return (
                                       <tr key={i} className="hover:bg-zinc-50 transition select-none">
                                          <td className="px-4 py-3 font-sans font-bold">
                                             <Link to="/account-ledger" state={{ selectedAccount: { id: acc.account_id, account_name: acc.account_name } }} className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline">{acc.account_name}</Link>
                                             <p className="text-[9px] text-zinc-400 mt-0.5 tracking-wider font-mono">{acc.account_code}</p>
                                          </td>
                                          <td className="px-4 py-3 font-sans text-zinc-500">{acc.account_type || '—'}</td>
                                          <td className="px-4 py-3 text-right text-zinc-400">{acc.txn_count}</td>
                                          <td className="px-4 py-3 text-right text-zinc-600 font-bold">
                                             {parseFloat(acc.total_credited || 0) > 0 ? `₹${fmt(acc.total_credited)}` : '—'}
                                          </td>
                                          <td className="px-4 py-3 text-right text-zinc-600 font-bold">
                                             {parseFloat(acc.total_debited || 0) > 0 ? `₹${fmt(acc.total_debited)}` : '—'}
                                          </td>
                                          <td className={`px-4 py-3 text-right font-bold font-sans text-sm ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                             {net >= 0 ? '+' : '-'}₹{fmt(Math.abs(net))}
                                          </td>
                                       </tr>
                                    );
                                 })
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>

               <div className="space-y-6">
                  {/* {t('dangarSummaryReport.financialSummary')} */}
                  <div className="border border-zinc-300 bg-zinc-50 flex flex-col select-none">
                     <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center gap-2">
                        <TrendingUp size={16} className="text-zinc-600" />
                        <span className="text-sm font-bold text-zinc-700  ">
                           {t('dangarSummaryReport.financialSummary')}
                        </span>
                     </div>
                     <div className="bg-white divide-y divide-zinc-200 font-mono text-xs select-none">
                        {[
                           { label: t('dangarSummaryReport.summary.grossProcurement'), value: `₹${fmt(grandRateAmount)}`, color: 'text-zinc-800' },
                           { label: t('dangarSummaryReport.summary.kapatDeductions'), value: `− ₹${fmt(grandDeduction)}`, color: 'text-rose-600 font-bold' },
                           { label: t('dangarSummaryReport.kpis.interest'), value: `− ₹${fmt(totalInterest)}`, color: 'text-rose-600 font-bold' },
                           { label: t('dangarSummaryReport.summary.accountKapatBal'), value: `₹${fmt(Math.abs(totalKapatBal))}`, color: totalKapatBal < 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold' },
                        ].map((r, i) => (
                           <div key={i} className="flex items-center justify-between px-4 py-3 select-none">
                              <span className="font-sans text-zinc-500 font-bold">{r.label}</span>
                              <span className={`font-mono text-xs ${r.color}`}>{r.value}</span>
                           </div>
                        ))}
                        <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 border-t border-zinc-300 font-sans select-none">
                           <span className="text-sm font-bold text-zinc-700  ">{t('dangarSummaryReport.kpis.netPayable')}</span>
                           <span className={`text-base font-bold font-mono ${netPayable >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}`}>
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
