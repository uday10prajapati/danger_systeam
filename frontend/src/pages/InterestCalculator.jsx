import React, { useState, useEffect } from 'react';
import {
  Calculator, Calendar, Download, RefreshCcw, TrendingUp, DollarSign,
  Users, ChevronRight, AlertCircle, Search, Info, History, Database,
  Plus, X, Save, TrendingDown, Layout, FileText, Printer
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';
import Toast from '../components/Toast';
import Loading from '../components/Loading';

export default function InterestCalculator() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [calculationDate, setCalculationDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ totalPrincipal: 0, totalInterest: 0 });
  const [globalRate, setGlobalRate] = useState('');
  const [globalRateType, setGlobalRateType] = useState('per_month');
  const [settleModalRow, setSettleModalRow] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleType, setSettleType] = useState('Credit');
  const [searchQuery, setSearchQuery] = useState('');
  const [isComputed, setIsComputed] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (memberId) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(memberId)) newSet.delete(memberId);
    else newSet.add(memberId);
    setExpandedRows(newSet);
  };

  const fetchCalculations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/account-ledger/interest-calculations', {
        params: { date: calculationDate }
      });

      if (response.data.success) {
        const initialData = response.data.data.map(row => {
          const end = new Date(calculationDate);

          const start = new Date(row.transaction_date);
          const diffTime = end - start;
          const elapsedDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);

          return {
            ...row,
            elapsedDays: elapsedDays,
            entries: (row.entries || []).map(entry => {
              const eStart = new Date(entry.transaction_date);
              const eDiff = end - eStart;
              return { ...entry, elapsedDays: Math.max(0, Math.floor(eDiff / (1000 * 60 * 60 * 24)) + 1) };
            })
          };
        });
        setResults(initialData);
        setIsComputed(false);
      }
    } catch (error) {
      console.error('Error fetching interest calculations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const totals = results.reduce((acc, curr) => {
      const interest = isComputed ? (parseFloat(calculateYield(curr)) || 0) : 0;
      const principal = parseFloat(curr.principal || 0);

      return {
        totalPrincipal: acc.totalPrincipal + principal,
        totalInterest: acc.totalInterest + interest
      };
    }, { totalPrincipal: 0, totalInterest: 0 });

    setStats(totals);
  }, [results, globalRate, globalRateType, isComputed]);

  const calculateYield = (row) => {
    if (!isComputed) return '0.00';
    const r = parseFloat(globalRate) || parseFloat(row.interest_percent) || 0;

    if (row.entries && row.entries.length > 0) {
      const totalYield = row.entries.reduce((acc, entry) => {
        const p = parseFloat(entry.principal);
        const d = parseInt(entry.elapsedDays) || 0;
        let m = 0;
        if (globalRateType === 'per_day') m = d;
        else if (globalRateType === 'per_month') m = d / 30.0;
        else if (globalRateType === 'per_year') m = d / 365.0;
        return acc + (p * (r / 100) * m);
      }, 0);
      return totalYield.toFixed(2);
    }

    const days = parseInt(row.elapsedDays) || 0;
    let multiplier = 0;
    if (globalRateType === 'per_day') multiplier = days;
    else if (globalRateType === 'per_month') multiplier = days / 30.0;
    else if (globalRateType === 'per_year') multiplier = days / 365.0;

    const yieldAmt = (parseFloat(row.principal) * (r / 100) * multiplier);
    return isNaN(yieldAmt) ? '0.00' : yieldAmt.toFixed(2);
  };

  const handleCompute = async () => {
    try {
      setLoading(true);
      if (globalRate && results.length > 0) {
        await api.post('/account-ledger/bulk-apply-interest', {
          globalRate: parseFloat(globalRate),
          asOfDate: calculationDate,
          rateType: globalRateType
        });
      }
      setIsComputed(true);
    } catch (error) {
      console.error('Error applying interest to DB:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalRateChange = (e) => {
    setGlobalRate(e.target.value);
  };

  const handleSettleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!settleModalRow || !settleAmount) return;
    try {
      setLoading(true);
      const cashIn = settleType === 'Credit' ? parseFloat(settleAmount) : 0;
      const cashOut = settleType === 'Debit' ? parseFloat(settleAmount) : 0;

      const response = await api.post('/cash-book/manual', {
        transaction_date: calculationDate,
        description: `Interest Settlement / Adjustment for ${settleModalRow.member_name}`,
        cash_in: cashIn,
        cash_out: cashOut,
        notes: `Calculated Yield Reference: ${calculateYield(settleModalRow)}`,
        member_id: settleModalRow.member_id
      }, {
        headers: { 'x-user-id': 1 }
      });

      if (response.data.success) {
        setSettleModalRow(null);
        setSettleAmount('');
        setMessage({ type: 'success', text: 'Interest settlement recorded successfully' });
        fetchCalculations();
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Failed to record settlement' });
      }
    } catch (error) {
      console.error('Error settling interest:', error);
      setMessage({ type: 'error', text: 'Operational failure' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalculations();
  }, [calculationDate]);


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
    const rows = filteredResults.map((row, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td>${row.member_name || '-'}</td>
        <td>${row.reference_no || '-'}</td>
        <td style="text-align:right">${parseFloat(row.debit || 0).toFixed(2)}</td>
        <td style="text-align:right">${parseFloat(row.credit || 0).toFixed(2)}</td>
        <td style="text-align:right">${parseFloat(row.principal || 0).toFixed(2)}</td>
        <td style="text-align:center">${row.elapsedDays} D</td>
        <td style="text-align:center">${isComputed ? (parseFloat(globalRate) || row.interest_percent) + '%' : '-'}</td>
        <td style="text-align:right">${calculateYield(row)}</td>
      </tr>`);
    const totalInterest = filteredResults.reduce((s, r) => s + parseFloat(calculateYield(r) || 0), 0);
    const totalPrincipal = filteredResults.reduce((s, r) => s + parseFloat(r.principal || 0), 0);
    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.write(`<html><head><title>Interest Computation</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:10px;color:#1e293b;padding:20px}
        .logo-bar{background:#0f172a;color:#fff;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-radius:4px}
        .logo-bar h1{font-size:13px;font-weight:900;text-transform:uppercase}
        .logo-bar span{font-size:9px;color:#94a3b8}
        h2{font-size:18px;font-weight:900;text-transform:uppercase;margin-bottom:2px}
        p.sub{font-size:9px;color:#64748b;margin-bottom:10px}
        hr{border:none;border-top:1px solid #e2e8f0;margin:8px 0}
        table{width:100%;border-collapse:collapse}
        thead tr{background:#0f172a;color:#fff}
        th{padding:7px 8px;font-size:9px;font-weight:700;text-transform:uppercase;text-align:left}
        td{padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:9px}
        tfoot tr{background:#1e293b;color:#fff;font-weight:700}
        @media print{@page{size:A4 portrait;margin:1.5cm}}
      </style></head><body>
      <div class='logo-bar'><h1>Interest Computation Manifest</h1><span>Date: ${calculationDate} &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN')}</span></div>
      <h2>Interest Simulator</h2>
      <p class='sub'>Calculation Date: ${calculationDate} &nbsp;|&nbsp; Rate: ${globalRate || '--'}% ${globalRateType.replace('_', ' ')} &nbsp;|&nbsp; Records: ${filteredResults.length} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</p>
      <hr/>
      <table>
        <thead><tr><th>Member</th><th>Reference</th><th style='text-align:right'>Debit</th><th style='text-align:right'>Credit</th><th style='text-align:right'>Principal</th><th style='text-align:center'>Days</th><th style='text-align:center'>Rate</th><th style='text-align:right'>Interest</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot><tr><td colspan='4'>TOTALS &mdash; ${filteredResults.length} Members</td><td style='text-align:right'>${totalPrincipal.toFixed(2)}</td><td colspan='2'></td><td style='text-align:right'>${totalInterest.toFixed(2)}</td></tr></tfoot>
      </table></body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    await addGujaratiFont(doc);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 32;
    const navy = [15, 23, 42], white = [255, 255, 255], gray = [100, 116, 139], dark = [30, 41, 59], stripe = [241, 245, 249];
    const cName = (() => { try { const u = JSON.parse(localStorage.getItem('user')); return u?.company_name || 'Company'; } catch (e) { return 'Company'; } })();

    const hdr = () => {
      doc.setFillColor(...navy); doc.rect(0, 0, W, 26, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
      doc.text(cName.toUpperCase(), M, 17);
      doc.setFontSize(7); doc.setTextColor(148, 163, 184);
      doc.text('INTEREST COMPUTATION MANIFEST', W / 2, 17, { align: 'center' });
      doc.setFontSize(7); doc.setTextColor(239, 68, 68);
      doc.text('CONFIDENTIAL', W - M, 17, { align: 'right' });
    };
    const ftr = (pg, tot) => {
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, H - 18, W - M, H - 18);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text(cName + ' - Interest Computation', M, H - 9);
      doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' });
      doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' });
    };

    hdr();
    let y = 45;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...navy);
    doc.text('Interest Computation Manifest', M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gray);
    doc.text('Date: ' + calculationDate + '  |  Rate: ' + (globalRate || '--') + '% ' + globalRateType.replace('_', ' ') + '  |  Records: ' + filteredResults.length + '  |  Generated: ' + new Date().toLocaleString('en-IN'), M, y + 13);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
    y += 28;

    const totalInterest = filteredResults.reduce((s, r) => s + parseFloat(calculateYield(r) || 0), 0);
    const totalPrincipal = filteredResults.reduce((s, r) => s + parseFloat(r.principal || 0), 0);

    const bodyRows = filteredResults.map(row => [
      row.member_name || '-',
      row.reference_no || '-',
      parseFloat(row.debit || 0).toFixed(2),
      parseFloat(row.credit || 0).toFixed(2),
      parseFloat(row.principal || 0).toFixed(2),
      row.elapsedDays + ' D',
      isComputed ? (parseFloat(globalRate) || row.interest_percent) + '%' : '-',
      calculateYield(row)
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Member', 'Reference', 'Debit', 'Credit', 'Principal', 'Days', 'Rate', 'Interest']],
      body: bodyRows,
      foot: [['', '', '', '', totalPrincipal.toFixed(2), '', 'TOTAL', totalInterest.toFixed(2)]],
      styles: { font: 'helvetica', fontSize: 8, cellPadding: [4, 5], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
      headStyles: { font: 'helvetica', fillColor: navy, textColor: white, fontStyle: 'normal' },
      footStyles: { font: 'helvetica', fillColor: [30, 41, 59], textColor: white },
      alternateRowStyles: { fillColor: stripe },
      theme: 'grid',
      margin: { left: M, right: M }
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i = 1; i <= tot; i++) { doc.setPage(i); ftr(i, tot); }
    doc.save('Interest_Computation_' + calculationDate + '.pdf');
  };

  const filteredResults = results.filter(row =>
    (row.member_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (row.member_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (row.reference_no || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none animate-none">
      <Toast message={message} onClose={() => setMessage(null)} />
      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 select-none">
              <Calculator size={20} className="text-zinc-600" />
              Interest Calculator & Simulator
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">Financial Analytics / Computation</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto select-none">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
            >
              <Printer size={14} /> PRINT
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
            >
              <FileText size={14} /> PDF
            </button>
          </div>
        </div>

        {/* Dynamic Parameter Ribbon */}
        <div className="flex flex-wrap items-center gap-4 bg-zinc-50 border border-zinc-300 p-3 select-none">
          <div className="flex items-center gap-3 px-3 flex-1 md:flex-initial">
            <DollarSign className="w-4 h-4 text-zinc-600" />
            <div className="flex flex-col">
              <label className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase">Rate (%)</label>
              <input
                type="number"
                step="0.01"
                placeholder="2.00"
                value={globalRate}
                onChange={handleGlobalRateChange}
                className="text-xs font-bold text-zinc-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-16"
              />
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-zinc-200" />
          <div className="flex items-center gap-3 px-3 flex-1 md:flex-initial">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <div className="flex flex-col">
              <label className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase">Period</label>
              <select
                value={globalRateType}
                onChange={(e) => setGlobalRateType(e.target.value)}
                className="text-xs font-bold text-zinc-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-24 appearance-none"
              >
                <option value="per_month">Per Month</option>
                <option value="per_year">Per Year</option>
                <option value="per_day">Per Day</option>
              </select>
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-zinc-200" />
          <div className="flex items-center gap-3 px-3 flex-1 md:flex-initial">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <div className="flex flex-col">
              <label className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase">Target Date</label>
              <input
                type="date"
                value={calculationDate}
                onChange={(e) => setCalculationDate(e.target.value)}
                className="text-xs font-bold text-zinc-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-28"
              />
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-zinc-200" />
          <div className="flex items-center px-3">
            <button
              onClick={handleCompute}
              disabled={loading || !results.length}
              className={`flex items-center gap-1.5 border px-4 py-2 text-white text-xs font-bold transition shadow-sm select-none ${
                isComputed ? 'bg-zinc-700 hover:bg-zinc-800 border-zinc-600' : 'bg-blue-600 hover:bg-blue-700 border-blue-500'
              } disabled:opacity-50`}
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {isComputed ? 'RE-COMPUTE' : 'COMPUTE'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-4 flex flex-col justify-between h-24">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Active Principal</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">₹{stats.totalPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="bg-zinc-50 border border-zinc-300 p-4 flex flex-col justify-between h-24">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Accrued Interest</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">₹{stats.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Dense Minimal Classic Interest Computation Table */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex flex-wrap items-center justify-between gap-3">
             <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                   Calculation Matrix
                </span>
                <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5 uppercase">
                   {filteredResults.length} NODES
                </span>
             </div>
             <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
               <Search className="w-4 h-4 text-zinc-400" />
               <input
                 type="text"
                 placeholder="Search identity..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="bg-transparent text-xs font-bold text-zinc-700 outline-none w-64 placeholder:text-zinc-300 font-mono"
               />
             </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-white select-none">
            <table className="w-full text-left border-collapse font-sans text-xs select-none">
               <thead>
                 <tr className="bg-zinc-50 border-b border-zinc-300 text-[10px] font-bold text-zinc-600 uppercase tracking-wider select-none font-sans">
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-left">Entity</th>
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-left">Reference</th>
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-right">Debit</th>
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-right">Credit</th>
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-right">Principal</th>
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-center">Days</th>
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-center">Rate</th>
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-right">Yield</th>
                   <th scope="col" className="px-4 py-2 text-right">Total</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-zinc-200 text-xs font-mono">
                 {loading ? (
                   <tr>
                     <td colSpan="9" className="py-20 text-center">
                       <RefreshCcw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Processing Computation...</p>
                     </td>
                   </tr>
                 ) : filteredResults.length === 0 ? (
                   <tr>
                     <td colSpan="9" className="py-20 text-center">
                       <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No matching financial nodes</p>
                     </td>
                   </tr>
                 ) : (
                   filteredResults.map((row, idx) => (
                     <React.Fragment key={row.member_id || idx}>
                       <tr
                         className={`group hover:bg-slate-50/50 transition-all cursor-pointer ${expandedRows.has(row.member_id) ? 'bg-blue-50/30' : ''}`}
                         onClick={() => row.entry_count > 1 && toggleRow(row.member_id)}
                       >
                         <td className="py-3 px-4 border-r border-zinc-200">
                           <div className="flex items-center gap-3">
                             {row.entry_count > 1 && (
                               <ChevronRight size={14} className={`text-slate-400 transition-transform ${expandedRows.has(row.member_id) ? 'rotate-90' : ''}`} />
                             )}
                             <div>
                               <p className="text-sm font-bold text-slate-800 tracking-tight font-sans uppercase italic">{row.member_name}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">CODE: {row.member_code}</p>
                             </div>
                           </div>
                         </td>
                         <td className="py-3 px-4 border-r border-zinc-200">
                           <p className="text-xs font-bold text-slate-600 truncate max-w-[200px] font-sans">{row.description}</p>
                           <p className="text-[10px] font-mono text-slate-400"># {row.reference_no}</p>
                         </td>
                         <td className="py-3 px-4 border-r border-zinc-200 text-right">
                           <span className="text-sm font-bold text-rose-600 font-mono">₹{parseFloat(row.debit || 0).toLocaleString('en-IN')}</span>
                         </td>
                         <td className="py-3 px-4 border-r border-zinc-200 text-right">
                           <span className="text-sm font-bold text-emerald-600 font-mono">₹{parseFloat(row.credit || 0).toLocaleString('en-IN')}</span>
                         </td>
                         <td className="py-3 px-4 border-r border-zinc-200 text-right">
                           <span className="text-sm font-bold text-slate-800 font-mono">₹{parseFloat(row.principal).toLocaleString('en-IN')}</span>
                         </td>
                         <td className="py-3 px-4 border-r border-zinc-200 text-center">
                           <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 border border-zinc-300 font-sans">
                             {row.elapsedDays} D
                           </span>
                         </td>
                         <td className="py-3 px-4 border-r border-zinc-200 text-center text-xs font-bold text-slate-600 font-mono">
                           {isComputed ? `${parseFloat(globalRate) || row.interest_percent}%` : '—'}
                         </td>
                         <td className="py-3 px-4 border-r border-zinc-200 text-right font-bold text-blue-600 text-sm font-mono">
                           ₹{calculateYield(row)}
                         </td>
                         <td className="py-3 px-4 text-right font-bold font-mono">
                           <span className="text-sm font-bold text-slate-900 bg-blue-50/50 px-2 py-1 border border-blue-200/60">
                             ₹{(parseFloat(row.principal) + parseFloat(calculateYield(row))).toLocaleString('en-IN')}
                           </span>
                         </td>
                       </tr>
                       {expandedRows.has(row.member_id) && row.entries && row.entries.map((entry, eIdx) => (
                         <tr key={`${row.member_id}-sub-${eIdx}`} className="bg-slate-50/30 border-t border-slate-100 font-mono">
                           <td className="py-2 px-4 pl-14 border-r border-zinc-200">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Node {eIdx + 1}</p>
                           </td>
                           <td className="py-2 px-4 border-r border-zinc-200">
                             <p className="text-[11px] font-bold text-slate-500 truncate max-w-[200px] font-sans">{entry.description}</p>
                             <p className="text-[9px] font-mono text-slate-400"># {entry.reference_no}</p>
                           </td>
                           <td className="py-2 px-4 border-r border-zinc-200 text-right text-xs text-rose-600">₹{parseFloat(entry.debit || 0).toFixed(2)}</td>
                           <td className="py-2 px-4 border-r border-zinc-200 text-right text-xs text-emerald-600">₹{parseFloat(entry.credit || 0).toFixed(2)}</td>
                           <td className="py-2 px-4 border-r border-zinc-200 text-right text-xs font-bold text-slate-600">₹{parseFloat(entry.principal).toFixed(2)}</td>
                           <td className="py-2 px-4 border-r border-zinc-200 text-center text-[10px] text-slate-400">{entry.elapsedDays} d</td>
                           <td className="py-2 px-4 border-r border-zinc-200 text-center text-[10px] text-slate-400">—</td>
                           <td className="py-2 px-4 border-r border-zinc-200 text-right font-bold text-blue-600 text-xs">₹{isComputed ? calculateYield(entry) : '0.00'}</td>
                           <td className="py-2 px-4 text-right font-bold text-slate-400 text-xs">₹{parseFloat(entry.principal).toFixed(2)}</td>
                         </tr>
                       ))}
                     </React.Fragment>
                   ))
                 )}
               </tbody>
            </table>
          </div>
        </div>

      {settleModalRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white shadow-2xl w-full max-w-md overflow-hidden border border-zinc-300 animate-in zoom-in-95 duration-200">
            <div className="bg-zinc-800 p-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">Settle Account</h2>
                <p className="text-[10px] font-mono text-zinc-300 uppercase tracking-widest mt-1">{settleModalRow.member_name} [{settleModalRow.member_code}]</p>
              </div>
              <button onClick={() => setSettleModalRow(null)} className="p-2 text-white/50 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSettleSubmit} className="p-6 space-y-6">
              <div className="flex bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() => setSettleType('Credit')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${settleType === 'Credit' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-400'}`}
                >
                  Receive (Credit)
                </button>
                <button
                  type="button"
                  onClick={() => setSettleType('Debit')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${settleType === 'Debit' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-400'}`}
                >
                  Give (Debit)
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Settle Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-xl font-black text-zinc-900 outline-none focus:bg-white focus:border-zinc-500 transition-all tracking-tighter"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setSettleModalRow(null)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all">Cancel</button>
                <button type="submit" className="flex-2 py-3 bg-zinc-800 text-white font-bold uppercase tracking-widest text-xs hover:bg-zinc-900 transition-all shadow-sm">Confirm Settlement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
