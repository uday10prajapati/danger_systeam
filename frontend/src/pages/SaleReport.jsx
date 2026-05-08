import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import {
  Search, RefreshCcw as SyncIcon, Download, Hash, User,
  ExternalLink, ShoppingCart, CreditCard, Banknote,
  FileText, BarChart3, LayoutGrid, Box, ChevronDown,
  ChevronRight, UserCheck, TrendingUp, Tags, Database,
  ShieldCheck, Layout, Layers, Filter, Calendar, ArrowRight,
  CheckCircle2, History, Package, RefreshCcw, Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const { t } = useTranslation();
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
    s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.customer_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.member_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedReports = filteredReports.reduce((acc, s) => {
    const key = s.customer_name || 'COUNTER SALE';
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
      } catch (e) {
         console.warn('Could not load Gujarati font', e);
      }
   };

  const handlePrint = () => {
    const cName = company?.company_name || 'Company';
    const totalAmt = filteredReports.reduce((s, x) => s + parseFloat(x.total_amount || 0), 0);
    const win = window.open('', '_blank', 'width=900,height=800');
    const rows = filteredReports.map((s, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td>${s.customer_name || 'COUNTER SALE'}</td>
        <td>${new Date(s.invoice_date).toLocaleDateString('en-GB')}</td>
        <td>#${s.invoice_no}</td>
        <td style="text-align:center">${s.item_count} Items</td>
        <td style="text-align:right">${formatCurrency(s.total_amount)}</td>
        <td style="text-align:right">${formatCurrency(s.discount_amount || 0)}</td>
        <td style="text-align:right;font-weight:700">${formatCurrency(s.net_amount)}</td>
        <td style="text-align:center">${(s.payment_type || 'cash').toUpperCase()}</td>
      </tr>`);
    win.document.write(`
      <html><head><title>${cName} - Sale Report</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:10px;color:#1e293b;padding:20px}
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
      <div class='report-title'>Revenue Command Deck</div>
      <div class='report-sub'>Period: ${startDate} &rarr; ${endDate} &nbsp;|&nbsp; Records: ${filteredReports.length} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</div>
      <hr class='divider'/>
      <table>
        <thead><tr>
          <th>Client</th><th>Date</th><th>Invoice</th><th>Items</th>
          <th style='text-align:right'>Gross Amt</th>
          <th style='text-align:right'>Discount</th>
          <th style='text-align:right'>Net Amt</th>
          <th style='text-align:center'>Mode</th>
        </tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot><tr>
          <td colspan='4'>TOTALS &mdash; ${filteredReports.length} Records</td>
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
    const cName = company?.company_name || 'Company';

    const hdr = () => {
       doc.setFillColor(...navy); doc.rect(0,0,W,26,'F');
       doc.setFont('NotoGujarati','normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
       doc.text(cName.toUpperCase(), M, 17);
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
    doc.text('Revenue Command Deck', M, y);
    doc.setFontSize(7.5); doc.setTextColor(...gray);
    doc.text('Period: ' + startDate + ' to ' + endDate + '  |  Records: ' + filteredReports.length + '  |  Generated: ' + new Date().toLocaleString('en-IN'), M, y+13);
    doc.setDrawColor(226,232,240); doc.setLineWidth(0.4); doc.line(M, y+18, W-M, y+18);
    y += 28;

    const totalAmt = filteredReports.reduce((s, x) => s + parseFloat(x.net_amount || 0), 0);

    const bodyRows = filteredReports.map(s => [
        s.customer_name || 'COUNTER SALE',
        new Date(s.invoice_date).toLocaleDateString('en-GB'),
        '#' + s.invoice_no,
        s.item_count + ' Items',
        'Rs.' + parseFloat(s.total_amount || 0).toLocaleString('en-IN', {minimumFractionDigits:2}),
        'Rs.' + parseFloat(s.discount_amount || 0).toLocaleString('en-IN', {minimumFractionDigits:2}),
        'Rs.' + parseFloat(s.net_amount || 0).toLocaleString('en-IN', {minimumFractionDigits:2}),
        (s.payment_type || 'cash').toUpperCase()
    ]);

    autoTable(doc, {
       startY: y,
       head: [['Client', 'Date', 'Invoice', 'Items', 'Gross Amt', 'Discount', 'Net Amt', 'Mode']],
       body: bodyRows,
       foot: [['', '', '', '', '', 'TOTAL', 'Rs.' + totalAmt.toLocaleString('en-IN', {minimumFractionDigits:2}), '']],
       styles: { font: 'helvetica', fontSize:7.5, cellPadding:[4,5], textColor:dark, lineColor:[226,232,240], lineWidth:0.3 },
       headStyles: { font: 'helvetica', fillColor:navy, textColor:white, fontStyle: 'normal' },
       footStyles: { font: 'helvetica', fillColor:[30,41,59], textColor:white },
       alternateRowStyles: { fillColor:stripe },
       theme: 'grid',
       margin: { left:M, right:M }
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i=1; i<=tot; i++) { doc.setPage(i); ftr(i,tot); }
    doc.save('Sale_Report_' + startDate + '_to_' + endDate + '.pdf');
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-8 font-sans">
        <div className="text-center font-bold text-zinc-400">
          <p className="text-xs mb-4 uppercase tracking-widest font-mono">Loading Enterprise Core...</p>
          <RefreshCcw className="animate-spin mx-auto text-blue-500" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none animate-none">
      <Toast message={message} onClose={() => setMessage(null)} />
      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">

        <PageHeader
          eyebrow="Revenue Core / Sales Audit Registry"
          eyebrowIcon={<ShoppingCart size={12} />}
          title="Revenue Command Deck"
          subtitle="Consolidated analytics for enterprise revenue"
        >
          <div className="flex gap-2">
            <button onClick={() => setViewType('report')} className={`px-4 py-2 border text-xs font-bold uppercase tracking-widest transition-all ${viewType === 'report' ? 'bg-zinc-800 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50'}`}>
              <UserCheck size={14} className="inline mr-2" /> Report
            </button>
            <button onClick={() => setViewType('summary')} className={`px-4 py-2 border text-xs font-bold uppercase tracking-widest transition-all ${viewType === 'summary' ? 'bg-zinc-800 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50'}`}>
              <Tags size={14} className="inline mr-2" /> Summary
            </button>
            <button onClick={handleExportPDF} className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 text-xs font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center gap-2">
              <FileText size={14} /> PDF
            </button>
            <button onClick={handlePrint} className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 text-xs font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center gap-2">
              <Printer size={14} /> Print
            </button>
            <button onClick={exportToExcel} className="px-3 py-2 bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-all">
              <Download size={14} />
            </button>
            <button onClick={fetchData} className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-all">
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 print:hidden">
          {[
            { label: 'Total Revenue Yield', val: formatCurrency(totalRevenueAudit), icon: <TrendingUp size={18} />, color: 'blue' },
            { label: 'Settlement Nodes', val: filteredReports.length, icon: <FileText size={18} />, color: 'indigo' },
            { label: 'Catalog Throughput', val: itemData.length, icon: <LayoutGrid size={18} />, color: 'emerald' },
            { label: 'Audit Protocol', val: 'SYMMETRICAL', icon: <ShieldCheck size={18} />, color: 'slate' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm group hover:border-slate-200 transition-all flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">{stat.label}</p>
                <h5 className="text-2xl font-bold tracking-tighter text-slate-800">{stat.val}</h5>
              </div>
              <div className={`p-4 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg group-hover:scale-110 transition-transform`}>{stat.icon}</div>
            </div>
          ))}
        </div>

        {/* Command Deck Toolbar */}
        <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm mb-10 print:hidden flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[350px]">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 italic">Identity Search Audit</span>
            <div className="relative group">
              <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="SEARCH CLIENTS, PRODUCTS OR INVOICES..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-bold uppercase text-[11px] tracking-widest"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm h-full">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all font-mono" />
            <ArrowRight size={14} className="text-slate-200" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all font-mono" />
          </div>

          <button onClick={fetchData} className="bg-slate-900 text-white px-10 py-4 rounded-lg font-bold uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-xl active:scale-95 h-[52px]">Sync Revenue</button>
        </div>

        {/* Revenue Manifest Canvas */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[700px] relative">

          <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] italic">Consolidated Revenue Manifest</p>
            </div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">View: {viewType === 'report' ? 'Grouped Settlement' : 'Categorized Product'}</p>
          </div>

          <div className="flex-1 overflow-x-auto px-4 pb-12 scroller-airy">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC]">
                {viewType === 'report' ? (
                  <tr className="uppercase text-[10px] font-bold text-slate-400 tracking-widest italic">
                    <th className="px-10 py-5 w-1/3">Client Identity / Timeline</th>
                    <th className="px-8 py-5">Reference Ledger</th>
                    <th className="px-8 py-5 text-center">Settlement Type</th>
                    <th className="px-8 py-5 text-right">Net Proceeds</th>
                    <th className="px-8 py-5 text-center">Audit</th>
                  </tr>
                ) : (
                  <tr className="uppercase text-[10px] font-bold text-slate-400 tracking-widest italic">
                    <th className="px-10 py-5 w-1/3">Product Taxonomy / SKU</th>
                    <th className="px-8 py-5 text-center">Unit</th>
                    <th className="px-8 py-5 text-right">Yield Volume</th>
                    <th className="px-8 py-5 text-right">Gross Proceeds</th>
                    <th className="px-8 py-5 text-center">Status</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-32 text-center">
                      <SyncIcon className="animate-spin text-blue-100 mx-auto" size={50} />
                      <p className="mt-4 text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">Building Revenue Matrix...</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {viewType === 'report' ? (
                      Object.values(groupedReports).length === 0 ? (
                        <tr><td colSpan="5" className="py-32 text-center italic font-bold text-slate-300 uppercase tracking-widest text-xs">Zero Sales Isolated</td></tr>
                      ) : (
                        Object.values(groupedReports).map((group, gIdx) => (
                          <React.Fragment key={gIdx}>
                            <tr onClick={() => toggleGroup(group.name)} className="bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all border-l-[6px] border-emerald-600 group">
                              <td className="px-10 py-6">
                                <div className="flex items-center gap-4">
                                  <div className={`p-2 rounded-lg transition-all ${expandedGroups[group.name] ? 'bg-emerald-600 text-white' : 'bg-white text-slate-300 group-hover:text-emerald-600 shadow-sm'}`}>
                                    {expandedGroups[group.name] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-base tracking-tight uppercase italic">{group.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.invoices.length} RECORDED SETTLEMENTS</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-[10px] font-bold text-slate-300 uppercase italic">BATCH_AUDIT</td>
                              <td className="px-8 py-6 text-center text-slate-300 font-bold text-xs">—</td>
                              <td className="px-8 py-6 text-right font-bold text-slate-900 italic text-lg">{formatCurrency(group.total)}</td>
                              <td className="px-8 py-6 text-center">
                                <button onClick={(e) => exportGroupToExcel(e, group, 'report')} className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 shadow-sm mx-auto active:scale-95">
                                  <Download size={18} />
                                </button>
                              </td>
                            </tr>
                            {expandedGroups[group.name] && group.invoices.map((s, sIdx) => (
                              <tr key={sIdx} className="group hover:bg-[#F8FAFC]/50 transition-colors">
                                <td className="px-10 py-5 pl-24 text-[11px] font-bold text-slate-400 font-mono italic">
                                  {new Date(s.invoice_date).toLocaleDateString('en-GB')}
                                </td>
                                <td className="px-8 py-5">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase italic tracking-tight">
                                    <Hash size={14} className="text-slate-200" /> {s.invoice_no}
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                  <div className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest inline-block ${s.payment_type === 'cash' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                    {s.payment_type?.toUpperCase() || 'CASH'}
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-right font-bold text-slate-600 font-mono text-sm opacity-60 italic">
                                  {formatCurrency(s.total_amount)}
                                </td>
                                <td className="px-8 py-5 text-center">
                                  <button className="text-slate-300 hover:text-emerald-600 transition-colors"><ExternalLink size={16} /></button>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      )
                    ) : (
                      Object.values(groupedSummary).length === 0 ? (
                        <tr><td colSpan="5" className="py-32 text-center italic font-bold text-slate-300 uppercase tracking-widest text-xs">Zero Revenue Vectors Isolated</td></tr>
                      ) : (
                        Object.values(groupedSummary).map((cat, cIdx) => (
                          <React.Fragment key={cIdx}>
                            <tr onClick={() => toggleGroup(cat.name)} className="bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all border-l-[6px] border-slate-900 group">
                              <td className="px-10 py-6">
                                <div className="flex items-center gap-4">
                                  <div className={`p-2 rounded-lg transition-all ${expandedGroups[cat.name] ? 'bg-slate-900 text-white' : 'bg-white text-slate-300 group-hover:text-slate-900 shadow-sm'}`}>
                                    {expandedGroups[cat.name] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-base tracking-tight uppercase italic">{cat.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cat.items.length} ACTIVE PRODUCT LINES</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-center text-slate-300 font-bold text-xs">—</td>
                              <td className="px-8 py-6 text-right text-slate-300 font-bold text-xs">—</td>
                              <td className="px-8 py-6 text-right font-bold text-slate-900 italic text-lg">{formatCurrency(cat.total)}</td>
                              <td className="px-8 py-6 text-center">
                                <button onClick={(e) => exportGroupToExcel(e, cat, 'summary')} className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm mx-auto active:scale-95">
                                  <Download size={18} />
                                </button>
                              </td>
                            </tr>
                            {expandedGroups[cat.name] && cat.items.map((item, iIdx) => (
                              <tr key={iIdx} className="group hover:bg-[#F8FAFC]/50 transition-colors">
                                <td className="px-10 py-5 pl-24">
                                  <div className="flex items-center gap-3">
                                    <Package size={16} className="text-slate-100" />
                                    <div>
                                      <p className="text-xs font-bold text-slate-800 uppercase italic tracking-tight leading-none mb-1">{item.item_name}</p>
                                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] font-mono">#{item.item_code}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">{item.unit || 'NOS'}</td>
                                <td className="px-8 py-5 text-right font-bold text-slate-400 font-mono text-sm leading-none italic">{formatQty(item.outward)}</td>
                                <td className="px-8 py-5 text-right font-bold text-slate-600 font-mono text-sm leading-none opacity-60">
                                  {formatCurrency(parseFloat(item.outward || 0) * parseFloat(item.sale_price || 0))}
                                </td>
                                <td className="px-8 py-5 text-center">
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

          {/* Dashboard Insight Footer */}
          <div className="mt-auto p-10 border-t border-slate-50 bg-[#F8FAFC]/30 flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg shadow-sm border border-slate-50"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Revenue Stream: Optimal</span>
              <span className="flex items-center gap-2"><Layout size={12} /> Repository Status: Validated</span>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <span>REVENUE_CHRONO: {new Date().getTime().toString(16).toUpperCase()}</span>
              <div className="w-px h-3 bg-slate-200"></div>
              <span>REF: {company.id}</span>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .scroller-airy::-webkit-scrollbar { width: 4px; }
        .scroller-airy::-webkit-scrollbar-track { background: transparent; }
        .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
    </div>
  );
}
