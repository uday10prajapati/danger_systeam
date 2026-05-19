import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import {
  Search, RefreshCcw as SyncIcon, Download, Hash, User,
  ExternalLink, ShoppingCart, CreditCard, Banknote,
  FileText, BarChart3, LayoutGrid, Box, ChevronDown,
  ChevronRight, UserCheck, TrendingUp, Tags, Database,
  ShieldCheck, Layout, Layers, Filter, Calendar, ArrowRight,
  CheckCircle2, History, Package, Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addGujaratiFont } from '../utils/pdfFonts';
import PageHeader from '../components/PageHeader';
import Toast from '../components/Toast';

const formatCurrency = (num) => {
  return parseFloat(num || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  });
};

const formatQty = (qty) => {
  return parseFloat(qty || 0).toFixed(3);
};

export default function SaleReport() {
  const { t, i18n } = useTranslation();
  const [viewType, setViewType] = useState('report');
  const [data, setData] = useState([]);
  const [itemData, setItemData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [company, setCompany] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [message, setMessage] = useState(null);

  const exportToExcel = () => {
    setMessage('Excel export functionality coming soon');
  };

  const exportGroupToExcel = (e, group, type) => {
    e.stopPropagation();
    setMessage('Group export coming soon');
  };

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    if (company?.id) {
      fetchData();
    }
  }, [company, startDate, endDate]);

  const loadCompany = async () => {
    try {
      const response = await api.get('/company');
      setCompany(response.data.success ? response.data.data : null);
    } catch (error) {
      console.error('Failed to load company', error);
    }
  };

  const fetchData = async () => {
    if (!company?.id) return;
    try {
      setLoading(true);
      const salesRes = await api.get('/sales', {
        params: { startDate, endDate }
      });
      const itemRes = await api.get(`/items/company/${company.id}`);
      if (salesRes.data.success) setData(salesRes.data.data);
      if (itemRes.data.success) setItemData(itemRes.data.data.filter(i => parseFloat(i.outward) > 0));
    } catch (error) {
      console.error('Error fetching sale data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const filteredReports = data.filter(s =>
    s.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.customer_name_gu || s.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.customer_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.member_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedReports = filteredReports.reduce((acc, s) => {
    const key = s.customer_name_gu || s.customer_name || 'COUNTER SALE';
    if (!acc[key]) acc[key] = { name: key, invoices: [], total: 0 };
    acc[key].invoices.push(s);
    acc[key].total += parseFloat(s.total_amount || 0);
    return acc;
  }, {});

  const filteredSummary = itemData.filter(i =>
    i.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.item_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedSummary = filteredSummary.reduce((acc, i) => {
    const key = i.category || 'RETAIL INVENTORY';
    if (!acc[key]) acc[key] = { name: key, items: [], total: 0 };
    acc[key].items.push(i);
    acc[key].total += (parseFloat(i.outward || 0) * parseFloat(i.sale_price || 0));
    return acc;
  }, {});

  const totalRevenueAudit = filteredReports.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);

  const handlePrint = () => {
    const cName = company?.company_name_gu || company?.company_name || 'Company';
    const totalAmt = filteredReports.reduce((s, x) => s + parseFloat(x.total_amount || 0), 0);
    const win = window.open('', '_blank', 'width=900,height=800');
    const rows = filteredReports.map((s, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td>${s.customer_name_gu || s.customer_name || 'COUNTER SALE'}</td>
        <td>${new Date(s.invoice_date).toLocaleDateString('en-GB')}</td>
        <td>#${s.invoice_no}</td>
        <td style="text-align:center">${s.item_count} ${t('common.items')}</td>
        <td style="text-align:right">${formatCurrency(s.total_amount)}</td>
        <td style="text-align:right">${formatCurrency(s.discount_amount || 0)}</td>
        <td style="text-align:right;font-weight:700">${formatCurrency(s.net_amount)}</td>
        <td style="text-align:center">${(s.payment_type || 'cash')}</td>
      </tr>`);
    win.document.write(`
      <html><head><title>${cName} - Sale Report</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box }
        body { font-family: 'Noto Sans Gujarati', 'Prompt', Arial, sans-serif; font-size: 10px; color: #1e293b; padding: 32px }
        .logo-bar{background:#0f172a;color:#fff;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-radius:4px}
        .logo-bar h1{font-size:13px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}
        .logo-bar span{font-size:9px;color:#94a3b8}
        .report-title{font-size:18px;font-weight:900;text-transform:uppercase;color:#0f172a;margin-bottom:2px}
        .report-sub{font-size:9px;color:#64748b;margin-bottom:10px}
        .divider{border:none;border-top:1px solid #e2e8f0;margin:8px 0}
        table{width:100%;border-collapse:collapse;margin-top:6px}
        thead tr{background:#0f172a;color:#fff}
        th{padding:7px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:left}
        td{padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:9px}
        tfoot tr{background:#1e293b;color:#fff;font-weight:700}
        @media print{@page{size:A4 portrait;margin:1.5cm}}
      </style></head><body>
      <div class='logo-bar'><h1>${cName}</h1><span>Sale Report / Analytics &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN')}</span></div>
      <div class='report-title'>${t('saleReport.title')}</div>
      <div class='report-sub'>Period: ${startDate} &rarr; ${endDate} &nbsp;|&nbsp; ${t('common.records')}: ${filteredReports.length} &nbsp;|&nbsp; ${t('saleReport.generated') || 'Generated'}: ${new Date().toLocaleString('en-IN')}</div>
      <hr class='divider'/>
      <table>
        <thead><tr>
          <th>${t('common.client')}</th><th>${t('common.date')}</th><th>${t('common.invoice')}</th><th>${t('common.items')}</th>
          <th style='text-align:right'>${t('common.grossAmt')}</th>
          <th style='text-align:right'>${t('common.discount')}</th>
          <th style='text-align:right'>${t('common.netAmt')}</th>
          <th style='text-align:center'>${t('common.mode')}</th>
        </tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot><tr>
          <td colspan='4'>${t('common.totals')} &mdash; ${filteredReports.length} ${t('common.records')}</td>
          <td colspan='2'></td>
          <td style='text-align:right'>${formatCurrency(totalAmt)}</td>
          <td></td>
        </tr></tfoot>
      </table>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    await addGujaratiFont(doc);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 32;
    const navy = [15,23,42], white = [255,255,255], gray = [100,116,139], dark = [30,41,59], stripe = [241,245,249];
    const cName = company?.company_name_gu || company?.company_name || 'Company';

    const hdr = () => {
       doc.setFillColor(...navy); doc.rect(0,0,W,26,'F');
       doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...white);
       doc.text(cName, M, 17);
       doc.setFontSize(7); doc.setTextColor(148,163,184);
       doc.text('SALE REPORT / ANALYTICS', W/2, 17, {align:'center'});
       doc.setFontSize(7); doc.setTextColor(239,68,68);
       doc.text('CONFIDENTIAL', W-M, 17, {align:'right'});
    };

    const ftr = (pg, tot) => {
       doc.setDrawColor(226,232,240); doc.setLineWidth(0.4); doc.line(M, H-18, W-M, H-18);
       doc.setFont('NotoGujarati','normal'); doc.setFontSize(7); doc.setTextColor(...gray);
       doc.text(cName + ' - Sale Report', M, H-9);
       doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W/2, H-9, {align:'center'});
       doc.text('Page ' + pg + ' of ' + tot, W-M, H-9, {align:'right'});
    };

    hdr();
    let y = 40;
    doc.setFont('NotoGujarati','normal'); doc.setFontSize(15); doc.setTextColor(...navy);
    doc.text(t('saleReport.title'), M, y);
    doc.setFontSize(7.5); doc.setTextColor(...gray);
    doc.text('Period: ' + startDate + ' to ' + endDate + '  |  Records: ' + filteredReports.length + '  |  Generated: ' + new Date().toLocaleString('en-IN'), M, y+13);
    doc.setDrawColor(226,232,240); doc.setLineWidth(0.4); doc.line(M, y+18, W-M, y+18);
    y += 28;

    const totalAmt = filteredReports.reduce((s, x) => s + parseFloat(x.net_amount || 0), 0);

    const bodyRows = filteredReports.map(s => [
        s.customer_name_gu || s.customer_name || 'COUNTER SALE',
        new Date(s.invoice_date).toLocaleDateString('en-GB'),
        '#' + s.invoice_no,
        s.item_count + ' ' + t('common.items'),
        'Rs.' + parseFloat(s.total_amount || 0).toLocaleString('en-IN', {minimumFractionDigits:2}),
        'Rs.' + parseFloat(s.discount_amount || 0).toLocaleString('en-IN', {minimumFractionDigits:2}),
        'Rs.' + parseFloat(s.net_amount || 0).toLocaleString('en-IN', {minimumFractionDigits:2}),
        (s.payment_type || 'cash')
    ]);

    autoTable(doc, {
       startY: y,
       head: [[t('saleReport.clientIdentity'), t('common.date'), t('common.invoice'), t('common.items'), t('common.grossAmt'), t('common.discount'), t('saleReport.netProceeds'), t('common.mode')]],
       body: bodyRows,
       foot: [['', '', '', '', '', t('common.totals'), 'Rs.' + totalAmt.toLocaleString('en-IN', {minimumFractionDigits:2}), '']],
       styles: { font: 'NotoGujarati', fontSize:7.5, cellPadding:[4,5], textColor:dark, lineColor:[226,232,240], lineWidth:0.3 },
       headStyles: { font: 'NotoGujarati', fillColor:navy, textColor:white, fontStyle: 'normal' },
       footStyles: { font: 'NotoGujarati', fillColor:[30,41,59], textColor:white },
       alternateRowStyles: { fillColor:stripe },
       didParseCell: (data) => {
         const text = data.cell.text.join(' ');
         if (text && !/[\u0A80-\u0AFF]/.test(text)) {
           data.cell.styles.font = 'helvetica';
         }
       },
       theme: 'grid',
       margin: { left:M, right:M }
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i=1; i<=tot; i++) { doc.setPage(i); ftr(i,tot); }
    doc.save('Sale_Report_' + startDate + '_to_' + endDate + '.pdf');
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-8 font-mono">
        <div className="text-center font-bold text-zinc-400">
          <p className="text-xs mb-4 uppercase tracking-widest">Loading Enterprise Core...</p>
          <SyncIcon className="animate-spin mx-auto text-blue-600" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 text-zinc-900 select-none animate-none font-bold">
      <Toast message={message} onClose={() => setMessage(null)} />
      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6 shadow-sm rounded-none">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4 print:hidden">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 select-none">
              <ShoppingCart size={20} className="text-zinc-600" />
              {t('saleReport.title')}
            </h1>
            <p className="text-[10px] font-mono text-zinc-500 mt-0.5 uppercase tracking-wider select-none">{t('saleReport.subtitle')}</p>
          </div>
          
          <div className="flex flex-wrap gap-2 select-none">
            <button 
              onClick={() => setViewType('report')} 
              className={`px-3 py-1.5 border text-xs font-bold uppercase tracking-wider transition rounded-none shadow-sm flex items-center gap-1.5 ${viewType === 'report' ? 'bg-zinc-800 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'}`}
            >
              <UserCheck size={13} /> {t('common.report')}
            </button>
            <button 
              onClick={() => setViewType('summary')} 
              className={`px-3 py-1.5 border text-xs font-bold uppercase tracking-wider transition rounded-none shadow-sm flex items-center gap-1.5 ${viewType === 'summary' ? 'bg-zinc-800 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'}`}
            >
              <Tags size={13} /> {t('common.summary')}
            </button>
            <button 
              onClick={handleExportPDF} 
              className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-700 text-xs font-bold uppercase tracking-wider transition rounded-none shadow-sm flex items-center gap-1.5"
            >
              <FileText size={13} /> {t('common.pdf')}
            </button>
            <button 
              onClick={handlePrint} 
              className="px-3 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-700 text-xs font-bold uppercase tracking-wider transition rounded-none shadow-sm flex items-center gap-1.5"
            >
              <Printer size={13} /> {t('common.print')}
            </button>
            <button 
              onClick={exportToExcel} 
              className="p-2 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-700 transition rounded-none shadow-sm"
            >
              <Download size={13} />
            </button>
            <button 
              onClick={fetchData} 
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-none transition shadow-sm"
            >
              <SyncIcon size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 select-none">
          {[
            { label: t('saleReport.totalRevenue'), val: formatCurrency(totalRevenueAudit), icon: <TrendingUp size={16} /> },
            { label: t('saleReport.settlementNodes'), val: filteredReports.length, icon: <FileText size={16} /> },
            { label: t('saleReport.catalogThroughput'), val: itemData.length, icon: <LayoutGrid size={16} /> },
            { label: t('saleReport.auditProtocol'), val: 'SYMMETRICAL', icon: <ShieldCheck size={16} /> }
          ].map((stat, i) => (
            <div key={i} className="bg-zinc-50 border border-zinc-300 p-4 shadow-sm flex items-center justify-between rounded-none">
              <div>
                <span className="text-[10px] font-sans text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                <span className="text-lg font-bold mt-1 block font-mono text-zinc-800">{stat.val}</span>
              </div>
              <div className="w-10 h-10 border border-zinc-200 bg-white text-zinc-600 flex items-center justify-center rounded-none shrink-0">
                {stat.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Command Deck Toolbar */}
        <div className="bg-zinc-50 p-4 border border-zinc-300 flex flex-wrap items-end gap-4 rounded-none">
          <div className="flex-1 min-w-[280px]">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">{t('saleReport.searchPrompt')}</label>
            <div className="relative group">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-600 transition-colors" />
              <input
                type="text"
                placeholder={t('saleReport.searchPrompt')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-none focus:border-zinc-500 outline-none transition font-bold text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white p-1.5 border border-zinc-300 rounded-none shadow-sm shrink-0">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="bg-zinc-50 border border-zinc-200 rounded-none px-2 py-1 text-xs font-bold text-zinc-600 outline-none focus:border-zinc-400 font-mono" 
            />
            <ArrowRight size={12} className="text-zinc-400" />
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="bg-zinc-50 border border-zinc-200 rounded-none px-2 py-1 text-xs font-bold text-zinc-600 outline-none focus:border-zinc-400 font-mono" 
            />
          </div>

          <button 
            onClick={fetchData} 
            className="bg-zinc-800 hover:bg-zinc-950 text-white text-xs font-bold px-4 py-2.5 rounded-none transition shadow-sm uppercase tracking-wider shrink-0"
          >
            {t('saleReport.syncRevenue')}
          </button>
        </div>

        {/* Revenue Manifest Grid */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px] rounded-none">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3 select-none">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-700 select-none">
                Revenue Manifest
              </span>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-xs px-2 py-0.5 select-none">
                {viewType === 'report' ? 'Grouped Settlement' : 'Categorized Product'}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse select-none">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600 text-xs font-bold uppercase tracking-wider">
                  {viewType === 'report' ? (
                    <>
                      <th className="px-4 py-3 border-r border-zinc-200 w-1/3">{t('saleReport.clientIdentity')}</th>
                      <th className="px-4 py-3 border-r border-zinc-200">{t('saleReport.referenceLedger')}</th>
                      <th className="px-4 py-3 border-r border-zinc-200 text-center">{t('saleReport.settlementType')}</th>
                      <th className="px-4 py-3 border-r border-zinc-200 text-right">{t('saleReport.netProceeds')}</th>
                      <th className="px-4 py-3 text-center">{t('saleReport.audit')}</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 border-r border-zinc-200 w-1/3">{t('saleReport.productTaxonomy')}</th>
                      <th className="px-4 py-3 border-r border-zinc-200 text-center">{t('saleReport.unit')}</th>
                      <th className="px-4 py-3 border-r border-zinc-200 text-right">{t('saleReport.yieldVolume')}</th>
                      <th className="px-4 py-3 border-r border-zinc-200 text-right">{t('saleReport.grossProceeds')}</th>
                      <th className="px-4 py-3 text-center">{t('saleReport.status')}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 font-mono text-xs text-zinc-700">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-24 text-center">
                      <SyncIcon className="animate-spin text-zinc-400 mx-auto mb-2" size={24} />
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('saleReport.buildingMatrix')}</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {viewType === 'report' ? (
                      Object.values(groupedReports).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-24 text-center text-zinc-400 uppercase tracking-widest">
                            Zero Sales Isolated
                          </td>
                        </tr>
                      ) : (
                        Object.values(groupedReports).map((group, gIdx) => (
                          <React.Fragment key={gIdx}>
                            <tr 
                              onClick={() => toggleGroup(group.name)} 
                              className="bg-zinc-50/60 hover:bg-zinc-100/50 cursor-pointer border-l-4 border-emerald-600 transition-colors"
                            >
                              <td className="px-4 py-3 border-r border-zinc-200">
                                <div className="flex items-center gap-3">
                                  <div className="p-1 border border-zinc-300 bg-white text-zinc-600 shrink-0">
                                    {expandedGroups[group.name] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                  </div>
                                  <div>
                                    <p className={`font-bold text-zinc-800 text-sm tracking-tight ${i18n.language === 'gu' ? 'font-prompt' : 'uppercase font-prompt'}`}>{group.name}</p>
                                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{group.invoices.length} settlements</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-zinc-200 text-[10px] text-zinc-400 uppercase tracking-wide">BATCH_AUDIT</td>
                              <td className="px-4 py-3 border-r border-zinc-200 text-center text-zinc-400 font-bold">—</td>
                              <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-zinc-900 text-sm">{formatCurrency(group.total)}</td>
                              <td className="px-4 py-2 text-center">
                                <button 
                                  onClick={(e) => exportGroupToExcel(e, group, 'report')} 
                                  className="p-1 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-600 transition shadow-sm"
                                >
                                  <Download size={13} />
                                </button>
                              </td>
                            </tr>
                            {expandedGroups[group.name] && group.invoices.map((s, sIdx) => (
                              <tr key={sIdx} className="hover:bg-zinc-50/40 transition-colors">
                                <td className="px-4 py-2.5 pl-12 border-r border-zinc-200 text-[10px] text-zinc-400 italic">
                                  {new Date(s.invoice_date).toLocaleDateString('en-GB')}
                                </td>
                                <td className="px-4 py-2.5 border-r border-zinc-200">
                                  <div className="flex items-center gap-1.5 font-bold text-zinc-700">
                                    <Hash size={12} className="text-zinc-300" /> {s.invoice_no}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 border-r border-zinc-200 text-center">
                                  <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wider ${s.payment_type === 'cash' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-blue-50 text-blue-700 border-blue-300'}`}>
                                    {s.payment_type === 'cash' ? t('sale.cash') : t('sale.credit')}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 border-r border-zinc-200 text-right font-bold text-zinc-500 font-mono">
                                  {formatCurrency(s.total_amount)}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <button className="text-zinc-400 hover:text-zinc-700 transition"><ExternalLink size={13} /></button>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      )
                    ) : (
                      Object.values(groupedSummary).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-24 text-center text-zinc-400 uppercase tracking-widest">
                            Zero Revenue Vectors Isolated
                          </td>
                        </tr>
                      ) : (
                        Object.values(groupedSummary).map((cat, cIdx) => (
                          <React.Fragment key={cIdx}>
                            <tr 
                              onClick={() => toggleGroup(cat.name)} 
                              className="bg-zinc-50/60 hover:bg-zinc-100/50 cursor-pointer border-l-4 border-zinc-800 transition-colors"
                            >
                              <td className="px-4 py-3 border-r border-zinc-200">
                                <div className="flex items-center gap-3">
                                  <div className="p-1 border border-zinc-300 bg-white text-zinc-600 shrink-0">
                                    {expandedGroups[cat.name] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                  </div>
                                  <div>
                                    <p className="font-bold text-zinc-800 text-sm tracking-tight uppercase font-prompt">{cat.name}</p>
                                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{cat.items.length} product lines</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 border-r border-zinc-200 text-center text-zinc-400 font-bold">—</td>
                              <td className="px-4 py-3 border-r border-zinc-200 text-right text-zinc-400 font-bold">—</td>
                              <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-zinc-900 text-sm">{formatCurrency(cat.total)}</td>
                              <td className="px-4 py-2 text-center">
                                <button 
                                  onClick={(e) => exportGroupToExcel(e, cat, 'summary')} 
                                  className="p-1 border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-600 transition shadow-sm"
                                >
                                  <Download size={13} />
                                </button>
                              </td>
                            </tr>
                            {expandedGroups[cat.name] && cat.items.map((item, iIdx) => (
                              <tr key={iIdx} className="hover:bg-zinc-50/40 transition-colors">
                                <td className="px-4 py-2.5 pl-12 border-r border-zinc-200">
                                  <div className="flex items-center gap-2">
                                    <Package size={13} className="text-zinc-400 shrink-0" />
                                    <div>
                                      <p className="text-xs font-bold text-zinc-800 uppercase tracking-tight leading-none mb-1 font-prompt">{item.item_name}</p>
                                      <p className="text-[9px] text-zinc-400 tracking-wider font-mono">CODE: #{item.item_code}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 border-r border-zinc-200 text-center text-[10px] text-zinc-400 uppercase tracking-wide font-sans">{item.unit || 'NOS'}</td>
                                <td className="px-4 py-2.5 border-r border-zinc-200 text-right font-bold text-zinc-400 font-mono">{formatQty(item.outward)}</td>
                                <td className="px-4 py-2.5 border-r border-zinc-200 text-right font-bold text-zinc-500 font-mono">
                                  {formatCurrency(parseFloat(item.outward || 0) * parseFloat(item.sale_price || 0))}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block"></span>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      )
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Insight Footer */}
          <div className="bg-zinc-100 border-t border-zinc-300 px-4 py-3 flex flex-col sm:flex-row justify-between items-center text-[9px] font-mono text-zinc-400 uppercase tracking-wider gap-2 select-none">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Revenue Stream: Optimal</span>
              <span>Ref: validated</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span>SYS_MD5: {new Date().getTime().toString(16)}</span>
              <span>REF: {company.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
