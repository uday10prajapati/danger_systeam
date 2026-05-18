import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar, Search, 
  Plus, Filter, Download, ArrowUpRight, ArrowDownLeft,
  MoreHorizontal, Edit2, Trash2, Database, Layout, 
  ChevronRight, RefreshCcw, History, FileText, Printer
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addGujaratiFont } from '../utils/pdfFonts';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';
import CashEntryModal from '../components/CashEntryModal';
import Toast from '../components/Toast';
import Loading from '../components/Loading';
import api from '../api';

export default function CashBook() { 
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total_in: 0, total_out: 0, balance: 0 });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Toast System
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('debit'); // 'credit' or 'debit'
  const [editingId, setEditingId] = useState(null);

  const [company, setCompany] = useState(null);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const response = await api.get('/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      } else {
        showToast('No company found. Please create a company first.', 'error');
      }
    } catch (error) {
      console.error('Failed to load company', error);
      showToast('Failed to load system context. Check backend connection.', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchData();
    }
  }, [dateRange, company]);

  const fetchData = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const response = await api.get('/cash-book', {
        params: dateRange
      });
      if (response.data.success) {
        setEntries(response.data.data);
        setFilteredEntries(response.data.data);
        calculateSummary(response.data.data);
      }
    } catch (error) {
      console.error('Fetch cash book error:', error);
      showToast('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data) => {
    const total_in = data.reduce((sum, item) => sum + parseFloat(item.cash_in || 0), 0);
    const total_out = data.reduce((sum, item) => sum + parseFloat(item.cash_out || 0), 0);
    setSummary({
      total_in,
      total_out,
      balance: total_in - total_out
    });
  };

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = entries.filter(item => 
      item.description?.toLowerCase().includes(term) || 
      (item.reference_no && item.reference_no.toLowerCase().includes(term)) ||
      (item.notes && item.notes.toLowerCase().includes(term))
    );
    setFilteredEntries(filtered);
  }, [searchTerm, entries]);

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setModalType(parseFloat(entry.cash_in) > 0 ? 'credit' : 'debit');
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await api.delete(`/cash-book/${id}`);
      fetchData();
      showToast('Record deleted successfully');
    } catch (error) {
      showToast('Failed to delete record', 'error');
    }
  };

  const handleExportPDF = async () => {
    if (filteredEntries.length === 0) {
      alert('No data available to export.');
      return;
    }
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    await addGujaratiFont(doc);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 32;
    const navy = [37, 99, 235], white = [255, 255, 255], gray = [100, 116, 139];
    const dark = [30, 41, 59], stripe = [241, 245, 249];

    let cName = company?.company_name || 'Company';

    const hdr = () => {
      const navy = [37, 99, 235], white = [255, 255, 255];
      doc.setFillColor(...navy); doc.rect(0, 0, W, 26, 'F');
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
      doc.text(cName, M, 17);
      doc.setFontSize(7); doc.setTextColor(191, 219, 254);
      doc.text('DAILY FINANCIAL LEDGER (ROJMEL)', W / 2, 17, { align: 'center' });
      doc.setFontSize(7); doc.setTextColor(239, 68, 68);
      doc.text('CONFIDENTIAL', W - M, 17, { align: 'right' });
    };

    const ftr = (pg, tot) => {
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, H - 18, W - M, H - 18);
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text(cName + ' - Cash Book Registry', M, H - 9);
      doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' });
      doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' });
    };

    hdr();
    let y = 60;
    doc.setFont('NotoGujarati', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(24, 24, 27);
    doc.text('Daily Financial Ledger Registry', M, y);
    y += 20;
    
    doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gray);
    doc.text(`Period: ${dateRange.startDate} to ${dateRange.endDate}  |  Records: ${filteredEntries.length}`, M, y);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 8, W - M, y + 8);
    y += 25;

    const headRow = [['Date', 'Details', 'Reference', 'Jama (In)', 'Udhar (Out)', 'Balance']];
    const bodyRows = filteredEntries.map(entry => [
      new Date(entry.transaction_date).toLocaleDateString('en-GB'),
      entry.description + (entry.notes ? ' - ' + entry.notes : ''),
      entry.reference_no || 'MANUAL',
      parseFloat(entry.cash_in || 0) > 0 ? parseFloat(entry.cash_in).toFixed(2) : '-',
      parseFloat(entry.cash_out || 0) > 0 ? parseFloat(entry.cash_out).toFixed(2) : '-',
      parseFloat(entry.net_amount || entry.balance || 0).toFixed(2)
    ]);

    autoTable(doc, {
      startY: y,
      head: headRow,
      body: bodyRows,
      foot: [
        [
          { content: 'CONSOLIDATED TOTALS', colSpan: 3, styles: { halign: 'right', fillColor: navy, textColor: white, fontStyle: 'bold' } },
          { content: summary.total_in.toFixed(2), styles: { halign: 'right', fillColor: navy, textColor: white, fontStyle: 'bold' } },
          { content: summary.total_out.toFixed(2), styles: { halign: 'right', fillColor: navy, textColor: white, fontStyle: 'bold' } },
          { content: summary.balance.toFixed(2), styles: { halign: 'right', fillColor: navy, textColor: white, fontStyle: 'bold' } }
        ]
      ],
      styles: { font: 'NotoGujarati', fontSize: 8, cellPadding: [4, 5], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
      headStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'bold' },
      footStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: stripe },
      didParseCell: (data) => {
        const text = data.cell.text.join(' ');
        if (text && !/[\u0A80-\u0AFF]/.test(text)) {
          data.cell.styles.font = 'helvetica';
        }
      },
      theme: 'grid',
      margin: { left: M, right: M },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' }
      },
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i = 1; i <= tot; i++) { doc.setPage(i); ftr(i, tot); }
    doc.save(`Cash_Book_${dateRange.startDate}_${dateRange.endDate}.pdf`);
  };

  const handlePrint = () => {
    if (filteredEntries.length === 0) {
      alert('No data available to print.');
      return;
    }
    const cName = company?.company_name || 'Company';
    const rows = filteredEntries.map((entry, i) => `
      <tr style="background:${i%2===0?'#fff':'#f8fafc'}">
        <td>${new Date(entry.transaction_date).toLocaleDateString('en-GB')}</td>
        <td>${entry.description} ${entry.notes ? '<br/><span style="color:#64748b;font-size:9px;">' + entry.notes + '</span>' : ''}</td>
        <td>${entry.reference_no || 'MANUAL'}</td>
        <td style="text-align:right">${parseFloat(entry.cash_in || 0) > 0 ? parseFloat(entry.cash_in).toFixed(2) : '-'}</td>
        <td style="text-align:right">${parseFloat(entry.cash_out || 0) > 0 ? parseFloat(entry.cash_out).toFixed(2) : '-'}</td>
        <td style="text-align:right"><strong>${parseFloat(entry.net_amount || entry.balance || 0).toFixed(2)}</strong></td>
      </tr>`);
    
    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.write(`<html><head><title>Cash Book Registry</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:10px;color:#1e293b;padding:30px}
        .logo-bar{background:#2563eb;color:#fff;padding:8px 15px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-radius:0}
        .logo-bar h1{font-size:12px;font-weight:900;text-transform:uppercase}
        .logo-bar span{font-size:8px;color:#dbeafe}
        h2{font-size:16px;font-weight:bold;text-transform:uppercase;margin-bottom:4px;color:#18181b}
        p.sub{font-size:8px;color:#71717a;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px}
        hr{border:none;border-top:1px solid #e2e8f0;margin:8px 0}
        table{width:100%;border-collapse:collapse;border:1px solid #18181b}
        thead tr{background:#2563eb;color:#fff}
        th{padding:8px;font-size:9px;font-weight:bold;text-transform:uppercase;background:#f4f4f5;border:1px solid #18181b;text-align:left}
        td{padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:9px;border:1px solid #e4e4e7}
        tfoot tr{background:#1e293b;color:#fff;font-weight:700}
        @media print{@page{size:A4 portrait;margin:1.5cm}}
      </style></head><body>

      <div class='logo-bar'><h1>${cName}</h1><span>Cash Book Registry &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN')}</span></div>
      <h2>Cash Book Registry / Treasury</h2>
      <p class='sub'>Period: ${dateRange.startDate} to ${dateRange.endDate} &nbsp;|&nbsp; Records: ${filteredEntries.length} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</p>
      
      <div style="display:flex; justify-content:space-between; margin-bottom:15px; background:#f8fafc; padding:10px 15px; border-radius:6px; border:1px solid #e2e8f0;">
         <div style="text-align:center;">
            <div style="font-size:9px; color:#64748b; font-weight:bold; text-transform:uppercase;">Total Receipts (Jama)</div>
            <div style="font-size:16px; color:#059669; font-weight:bold;">${summary.total_in.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
         </div>
         <div style="text-align:center;">
            <div style="font-size:9px; color:#64748b; font-weight:bold; text-transform:uppercase;">Total Payments (Udhar)</div>
            <div style="font-size:16px; color:#e11d48; font-weight:bold;">${summary.total_out.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
         </div>
         <div style="text-align:center;">
            <div style="font-size:9px; color:#64748b; font-weight:bold; text-transform:uppercase;">Net Cash Balance</div>
            <div style="font-size:16px; color:#1e293b; font-weight:bold;">${summary.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
         </div>
      </div>
      
      <hr/>
      <table>
        <thead><tr><th>Date</th><th>Manifest Details</th><th>Reference</th><th style="text-align:right">Jama (In)</th><th style="text-align:right">Udhar (Out)</th><th style="text-align:right">Balance</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot>
           <tr style="background:#2563eb; color:#fff; font-weight:bold; text-transform:uppercase;">
              <td colspan="3" style="text-align:right; padding:10px; border:1px solid #1e40af;">CONSOLIDATED TOTALS</td>
              <td style="text-align:right; padding:10px; color:#fff; border:1px solid #1e40af;">${summary.total_in.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="text-align:right; padding:10px; color:#fff; border:1px solid #1e40af;">${summary.total_out.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="text-align:right; padding:10px; border:1px solid #1e40af;">${summary.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
           </tr>
        </tfoot>
      </table></body></html>`);
    win.document.close(); win.focus();
    setTimeout(()=>{win.print();win.close();},400);
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

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 animate-in fade-in duration-300">
      <div className="max-w-[1400px] mx-auto bg-white border border-zinc-300 shadow-sm p-5 space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 select-none">
              <Database size={20} className="text-zinc-600" />
              Cash Book Registry
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider select-none">Financial Management / Treasury</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
             <button 
               onClick={() => { setEditingId(null); setModalType('credit'); setModalOpen(true); }}
               className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 border border-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none uppercase"
             >
               <ArrowUpRight size={16} /> JAMA ENTRY
             </button>
             <button 
               onClick={() => { setEditingId(null); setModalType('debit'); setModalOpen(true); }}
               className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 border border-red-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none uppercase"
             >
               <ArrowDownLeft size={16} /> UDHAR ENTRY
             </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-sm font-sans text-zinc-500  ">Total Receipts (Jama)</span>
            <span className="text-2xl font-bold font-sans text-emerald-600 mt-1">₹{summary.total_in.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-sm font-sans text-zinc-500  ">Total Payments (Udhar)</span>
            <span className="text-2xl font-bold font-sans text-red-600 mt-1">₹{summary.total_out.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-sm font-sans text-zinc-500  ">Net Cash Balance</span>
            <span className="text-2xl font-bold font-sans text-zinc-800 mt-1">₹{summary.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Table/Manifest Container */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3 select-none">
             <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-700   select-none">
                   Transaction Manifest
                </span>
                <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-sm px-2 py-0.5 select-none">
                   {filteredEntries.length} RECORDS
                </span>
             </div>
             
             <div className="flex items-center gap-3">
               <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
                 <Search size={16} className="text-zinc-400" />
                 <input
                   type="text" 
                   placeholder="SEARCH..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="bg-transparent border-none outline-none text-xs text-zinc-800 placeholder:text-zinc-400 w-full md:w-48 font-mono"
                 />
               </div>
               
               <div className="flex items-center border border-zinc-300 bg-white px-2 py-1.5 select-none gap-2">
                 <Calendar size={14} className="text-zinc-400" />
                 <input 
                   type="date" 
                   value={dateRange.startDate}
                   onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                   className="bg-transparent text-xs text-zinc-800 outline-none font-mono"
                 />
                 <span className="text-zinc-400 text-sm font-sans">-</span>
                 <input 
                   type="date" 
                   value={dateRange.endDate}
                   onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                   className="bg-transparent text-xs text-zinc-800 outline-none font-mono"
                 />
               </div>

               <button onClick={fetchData} className="p-1.5 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm" title={t('common.refreshRegistry')}>
                 <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
               </button>

               <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none uppercase transition shadow-sm"
               >
                  <FileText size={14} />{t('common.pdf')}</button>
               <button
                  onClick={handlePrint}
                  className="flex items-center gap-1 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none uppercase transition shadow-sm"
               >
                  <Printer size={14} />{t('common.print')}</button>
             </div>
          </div>

          <div className="overflow-x-auto flex-1 bg-white">
            {loading ? (
              <div className="py-20 text-center">
                <RefreshCcw className="animate-spin mx-auto text-blue-500 mb-2" size={24} />
                <p className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-widest">Synchronizing Treasury Streams...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="py-20 text-center text-zinc-400 font-bold font-mono text-xs uppercase tracking-widest">
                No Transaction Nodes Isolated
              </div>
            ) : (
              <table className="w-full text-left border-collapse font-sans text-xs select-none">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600 font-mono text-xs">
                    <th className="px-4 py-2 border-r border-zinc-200">Date</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Details</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Reference</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">Jama (In)</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">Udhar (Out)</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">Balance</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredEntries.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-zinc-50/60 font-mono text-xs transition-colors">
                      <td className="px-4 py-2 border-r border-zinc-200 font-bold text-zinc-600">
                        {new Date(entry.transaction_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 font-sans font-bold tracking-tight text-zinc-800 ">
                        <div className="flex flex-col">
                          <span className="text-zinc-800">{entry.description}</span>
                          {entry.notes && (
                            <span className="text-sm font-sans text-zinc-400 mt-0.5 ">
                              {entry.notes}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-zinc-700 font-sans  ">{entry.reference_no || 'MANUAL'}</span>
                          <span className={`inline-flex w-fit px-1.5 py-0.5 mt-0.5 text-[8px] font-bold border ${
                            entry.reference_type === 'sale' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                            entry.reference_type === 'purchase' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                            'bg-zinc-100 border-zinc-300 text-zinc-500'
                          }`}>
                            {entry.reference_type || 'Core'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-right font-bold text-emerald-600 font-sans">
                        {parseFloat(entry.cash_in || 0) > 0 ? `₹${parseFloat(entry.cash_in).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-right font-bold text-red-600 font-sans">
                        {parseFloat(entry.cash_out || 0) > 0 ? `₹${parseFloat(entry.cash_out).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className={`px-4 py-2 border-r border-zinc-200 text-right font-bold font-mono text-zinc-800`}>
                        ₹{parseFloat(entry.net_amount || entry.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(entry)} className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm" title="Edit Entry">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(entry.id)} className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-red-600 transition shadow-sm" title="Delete Entry">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[1000] animate-in slide-in-from-right-10 duration-300">
          <div className={`px-4 py-3 shadow-2xl border flex items-center gap-3 ${
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-600 border-blue-500 text-white'
          }`}>
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span className="text-sm font-bold font-sans  ">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70"><X size={14} /></button>
          </div>
        </div>
      )}

      {modalOpen && (
        <CashEntryModal
          company={company}
          type={modalType}
          editId={editingId}
          onClose={() => { setModalOpen(false); setEditingId(null); }}
          onSubmit={() => { 
             setModalOpen(false); 
             setEditingId(null); 
             fetchData(); 
             showToast("Registry Synchronization Successful");
          }}
        />
      )}
    </div>
  );
}
