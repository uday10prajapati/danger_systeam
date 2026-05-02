import React, { useState, useEffect } from 'react';
import {
  Database, Search, Filter, Download, Plus,
  Eye, RefreshCcw, Layout, FileText, Printer,
  Calendar, User, Box, Shield,
  CheckCircle, Loader, Info, Edit3
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';
import { useTranslation } from 'react-i18next';
import Toast from '../components/Toast';
import Loading from '../components/Loading';

export default function DangarMaster() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [company, setCompany] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [season, setSeason] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const companyRes = await api.get('/company');
      if (companyRes.data.success) {
        setCompany(companyRes.data.data);
        fetchEntries(companyRes.data.data.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async (compId) => {
    try {
      setLoading(true);
      const params = {};
      if (dateRange.start && dateRange.end) {
        params.startDate = dateRange.start;
        params.endDate = dateRange.end;
      }
      if (season) {
        params.season = season;
      }
      const res = await api.get('/dangar-entry', { params: { companyId: compId, ...params } });
      if (res.data.success) {
        setEntries(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
    } catch (e) { console.warn('Gujarati font load failed', e); }
  };

  const handleExportPDF = async () => {
    const cName = company ? (company.company_name || 'Company') : 'Company';
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    await addGujaratiFont(doc);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 32;
    const navy = [37, 99, 235], white = [255, 255, 255], gray = [100, 116, 139];
    const dark = [30, 41, 59], stripe = [241, 245, 249];

    const hdr = () => {
      doc.setFillColor(...navy); doc.rect(0, 0, W, 26, 'F');
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
      doc.text(cName.toUpperCase(), M, 17);
      doc.setFontSize(7); doc.setTextColor(191, 219, 254);
      doc.text('DANGAR ENTRY REGISTRY', W / 2, 17, { align: 'center' });
      doc.setFontSize(7); doc.setTextColor(239, 68, 68);
      doc.text('CONFIDENTIAL', W - M, 17, { align: 'right' });
    };
    const ftr = (pg, tot) => {
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4);
      doc.line(M, H - 18, W - M, H - 18);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text(cName + ' - Dangar Entry Registry', M, H - 9);
      doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' });
      doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' });
    };

    hdr();
    let y = 60;

    doc.setFont('NotoGujarati', 'bold'); doc.setFontSize(14); doc.setTextColor(...navy);
    doc.text('Dangar Entry Registry', M, y);
    doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gray);
    doc.text('Period: ' + (dateRange.start || '--') + ' to ' + (dateRange.end || '--') + '  |  Season: ' + (season || 'All') + '  |  Generated: ' + new Date().toLocaleString('en-IN'), M, y + 13);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
    y += 28;

    const totalQtl = filteredEntries.reduce((a, c) => a + parseFloat(c.net_quintal || 0), 0);
    const totalAmt = filteredEntries.reduce((a, c) => a + parseFloat(c.amount || 0), 0);

    autoTable(doc, {
      startY: y,
      head: [['Date', 'SR #', 'Member', 'Item', 'Net Quintal', 'Rate (Qt)', 'Amount']],
      body: filteredEntries.map(r => [
        new Date(r.entry_date).toLocaleDateString('en-GB'),
        '#' + r.sr_no,
        r.member_name + (r.member_code ? ' [' + r.member_code + ']' : ''),
        r.item_name,
        parseFloat(r.net_quintal).toFixed(2) + ' Qt',
        parseFloat(r.rate).toFixed(2),
        parseFloat(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })
      ]),
      foot: [['', '', '', 'TOTALS', totalQtl.toFixed(2) + ' Qt', '', totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })]],
      styles: { font: 'NotoGujarati', fontSize: 7.5, cellPadding: [4, 5], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
      headStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'bold' },
      footStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: stripe },
      theme: 'grid',
      margin: { left: M, right: M }
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i = 1; i <= tot; i++) { doc.setPage(i); ftr(i, tot); }
    doc.save('Dangar_Entry_Registry_' + new Date().toISOString().split('T')[0] + '.pdf');
  };

  const handlePrint = () => {
    const printContents = document.getElementById('dangar-registry-table');
    if (!printContents) { window.print(); return; }
    const win = window.open('', '_blank', 'width=1200,height=800');
    win.document.write(`
      <html><head><title>Dangar Entry Registry</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 20px; }
        .logo-bar { background: #2563eb; color: #fff; padding: 6px 18px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
        .logo-bar h1 { font-size: 9.5px; font-weight: bold; text-transform: uppercase; }
        .logo-bar .lbl { font-size: 8px; color: #bfdbfe; font-weight: normal; letter-spacing: 1px; }
        .logo-bar .conf { font-size: 8px; color: #fecaca; font-weight: bold; letter-spacing: 0.5px; }
        h2 { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 2px; }
        p.sub { font-size: 8.5px; color: #64748b; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        thead tr { background: #2563eb; color: #fff; }
        th, td { padding: 8px 10px; border: 1px solid #e2e8f0; text-align: left; }
        tbody tr:nth-child(even) { background: #f1f5f9; }
        tfoot tr { background: #1e40af; color: #fff; font-weight: 700; }
        .amt { text-align: right; }
        @media print { @page { size: A4 landscape; margin: 1cm; } }
      </style></head><body>
      <div class='logo-bar'>
         <h1>${(company?.company_name || 'Company').toUpperCase()}</h1>
         <span class='lbl'>DANGAR ENTRY REGISTRY</span>
         <span class='conf'>CONFIDENTIAL</span>
      </div>
      <h2>Dangar Entry Registry</h2>
      <p class='sub'>Period: ${dateRange.start || '--'} to ${dateRange.end || '--'} &nbsp;|&nbsp; Season: ${season || 'All'} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</p>
      ${printContents.outerHTML}
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleAddNewRedirect = () => {
    window.location.hash = '#/dangar-entry';
  };

  const filteredEntries = entries.filter(e =>
    e.member_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.member_code?.toString().includes(searchQuery) ||
    e.sr_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.vehicle_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.item_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || !company) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none animate-none">
      
      {/* Toast Notification */}
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
              <Database size={20} className="text-zinc-600" />
              Dangar Entry Registry
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">Management / Dangar Entry Master</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
              title="Print Registry"
            >
              <Printer size={14} /> Print
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
              title="PDF Export"
            >
              <FileText size={14} /> PDF
            </button>

            <button
              onClick={handleAddNewRedirect}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none"
            >
              <Plus size={16} /> ADD NEW
            </button>

            <button
              onClick={() => fetchEntries(company?.id)}
              className="p-1.5 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm"
            >
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Dynamic Filters */}
        <div className="bg-zinc-50 border border-zinc-300 p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-zinc-500" size={15} />
            <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase">Date Filter:</span>
          </div>
          <div className="flex items-center gap-1 border border-zinc-300 bg-white p-1">
            <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-transparent border-none outline-none text-[11px] font-bold text-zinc-700 uppercase font-mono" />
            <span className="text-zinc-400 font-bold">/</span>
            <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-transparent border-none outline-none text-[11px] font-bold text-zinc-700 uppercase font-mono" />
          </div>
          <button onClick={() => fetchEntries(company?.id)} className="px-3 py-1.5 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold text-xs uppercase transition rounded-none">Verify Registry</button>

          <div className="flex items-center gap-1 bg-zinc-200 border border-zinc-300 p-0.5">
            {['', 'Winter', 'Summer'].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSeason(s);
                  const params = { companyId: company?.id };
                  if (dateRange.start && dateRange.end) {
                    params.startDate = dateRange.start;
                    params.endDate = dateRange.end;
                  }
                  if (s) params.season = s;
                  api.get('/dangar-entry', { params }).then(res => {
                    if (res.data.success) setEntries(res.data.data);
                  });
                }}
                className={`px-3 py-1 text-[10px] font-bold uppercase transition select-none ${season === s
                  ? 'bg-white text-zinc-800 font-mono font-bold border border-zinc-300'
                  : 'text-zinc-500 hover:text-zinc-700'
                  }`}
              >
                {s || 'All Seasons'}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-[9px] font-mono text-zinc-400 uppercase">Total Net Volume</p>
              <p className="text-base font-bold font-mono text-zinc-800">{filteredEntries.reduce((a,c)=>a+parseFloat(c.net_quintal||0),0).toFixed(2)} Qt</p>
            </div>
            <div className="w-px h-8 bg-zinc-300" />
            <div className="text-right">
              <p className="text-[9px] font-mono text-zinc-400 uppercase">Total Amount</p>
              <p className="text-base font-bold font-mono text-emerald-600">₹{filteredEntries.reduce((a,c)=>a+parseFloat(c.amount||0),0).toLocaleString('en-IN', {minimumFractionDigits:2})}</p>
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Permanent Node Archive
              </span>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5">
                {filteredEntries.length} RECORDS
              </span>
            </div>

            <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
              <Search size={16} className="text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Member, SR, Vehicle..."
                className="bg-transparent border-none outline-none text-xs text-zinc-800 placeholder:text-zinc-400 w-full md:w-56 font-mono"
              />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-white">
            {loading && entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                <Loader className="animate-spin text-zinc-500" size={24} />
                <p className="text-xs font-mono">LOADING DANGAR DATA...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500 select-none">
                <Box size={32} className="text-zinc-400" />
                <p className="text-xs font-mono">NO TRANSACTION ENTRIES FOUND</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse font-mono text-xs select-none" id="dangar-registry-table">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">
                    <th className="px-4 py-2 border-r border-zinc-200">Date</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Member</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Ref. SR</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Item</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">Net Volume</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">Rate</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">Amount</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-center">Status</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {filteredEntries.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-2 border-r border-zinc-200">
                        {new Date(row.entry_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 font-sans font-bold tracking-tight text-zinc-800 uppercase italic">
                        {row.member_name} {row.member_code && `[#${row.member_code}]`}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 font-bold text-blue-600">
                        #{row.sr_no}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 uppercase font-bold text-zinc-700">
                        {row.item_name}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-right font-bold text-zinc-800">
                        {parseFloat(row.net_quintal).toFixed(2)} Qt
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-right font-bold text-zinc-800">
                        ₹{parseFloat(row.rate).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-right font-bold text-emerald-600">
                        ₹{parseFloat(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold border bg-emerald-50 border-emerald-300 text-emerald-700">
                          COMMITTED
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => {
                            window.location.hash = `#/dangar-entry/${row.id}`;
                          }}
                          className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition"
                          title="Edit Transaction"
                        >
                          <Edit3 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
