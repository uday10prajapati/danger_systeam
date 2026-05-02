import React, { useState, useEffect } from 'react';
import {
  FileText, Search, Printer, Download, Filter,
  Calendar, User, Box, ArrowRight, TrendingUp,
  CreditCard, ChevronDown, ChevronRight, CheckCircle, Clock, X, Shield,
  Table, Layout, Database, Info, RefreshCcw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api, { dangarEntryApi } from '../api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';
import Toast from '../components/Toast';
import Loading from '../components/Loading';

const DangarPaymentReport = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    startDate: '2026-04-01',
    endDate: new Date().toISOString().split('T')[0],
    memberId: '',
    itemId: '',
    bankName: ''
  });
  const [banks, setBanks] = useState([]);
  const [summary, setSummary] = useState({
    totalQuintal: 0,
    totalRateAmount: 0,
    totalDeduction: 0,
    totalInterest: 0,
    totalBardanPenalty: 0,
    totalFinal: 0,
    count: 0
  });
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const toggleRow = (memberId) => setExpandedRows(prev => ({ ...prev, [memberId]: !prev[memberId] }));

  const [members, setMembers] = useState([]);
  const [items, setItems] = useState([]);
  const [companyAccount, setCompanyAccount] = useState('');
  const [txtModal, setTxtModal] = useState(false);
  const [billModal, setBillModal] = useState(false);
  const [billSearch, setBillSearch] = useState({ from: '', to: '' });
  const [selectedBills, setSelectedBills] = useState([]);
  const [narration, setNarration] = useState('');

  useEffect(() => {
    fetchInitialData().then(() => fetchReport());
  }, []);

  const fetchInitialData = async () => {
    try {
      const [mRes, iRes, cRes, bRes] = await Promise.all([
        api.get('/members'),
        api.get('/items'),
        api.get('/company'),
        api.get('/banks')
      ]);
      if (mRes.data.success) setMembers(mRes.data.data);
      if (iRes.data.success) setItems(iRes.data.data);
      if (cRes.data.success) setCompanyAccount(cRes.data.data?.company_account_no || '');
      if (bRes.data.success) setBanks(bRes.data.data);
    } catch (err) {
      console.error('Failed to load filter dependencies:', err);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');

      const company = JSON.parse(localStorage.getItem('company') || '{}');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const companyId = company.id || user.company_id;

      if (!companyId) {
        setError('Company not found. Please log in again.');
        return;
      }

      const res = await api.get('/dangar-entry/payment-report', {
        params: { companyId, startDate: filters.startDate, endDate: filters.endDate }
      });

      if (res.data.success) {
        let rows = res.data.data || [];
        if (filters.memberId) {
          rows = rows.filter(r => String(r.member_id) === String(filters.memberId));
        }
        if (filters.bankName) {
          rows = rows.filter(r => String(r.bank_name).toLowerCase().includes(filters.bankName.toLowerCase()));
        }

        setData(rows);
        const s = rows.reduce((acc, r) => ({
          totalQuintal: acc.totalQuintal + parseFloat(r.total_quintal || 0),
          totalRateAmount: acc.totalRateAmount + parseFloat(r.rate_amount || 0),
          totalInterest: acc.totalInterest + parseFloat(r.total_interest || 0),
          totalBardanPenalty: acc.totalBardanPenalty + parseFloat(r.bardan_penalty || 0),
          totalFinal: acc.totalFinal + parseFloat(r.final_amount || 0),
          count: acc.count + 1,
        }), { totalQuintal: 0, totalRateAmount: 0, totalInterest: 0, totalBardanPenalty: 0, totalFinal: 0, count: 0 });

        setSummary(s);
      } else {
        setError(res.data.error || 'Failed to load report.');
      }
    } catch (err) {
      console.error('Report fetch error:', err);
      setError('Server error: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    const validData = data.filter(r => parseFloat(r.final_amount || 0) >= 0);
    if (!validData.length) { alert('No valid data to export.'); return; }
    const rows = validData.map((r, i) => ({
      'Sr.': i + 1,
      'CODE': r.member_code,
      'NAME': r.member_name,
      'ACCOUNT NUMBER': r.full_ac_number || '',
      'IFSC': r.ifsc_code || '',
      'PAYABLE AMOUNT': parseFloat(r.final_amount || 0),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    // Column widths
    ws['!cols'] = [6, 12, 40, 25, 15, 18].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payment Report');
    XLSX.writeFile(wb, 'dangar_payment_' + filters.startDate + '_' + filters.endDate + '.xlsx');
  };

  const exportPDF = () => {
    const validData = data.filter(r => parseFloat(r.final_amount || 0) >= 0);
    if (!validData.length) { alert('No valid data to export.'); return; }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 32;
    const navy = [37, 99, 235], white = [255, 255, 255], gray = [100, 116, 139], dark = [30, 41, 59], stripe = [241, 245, 249];
    const cName = (() => { try { const u = JSON.parse(localStorage.getItem('company')); return u?.company_name || 'Company'; } catch (e) { return 'Company'; } })();

    const hdr = () => {
      doc.setFillColor(...navy); doc.rect(0, 0, W, 26, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
      doc.text(cName.toUpperCase(), M, 17);
      doc.setFontSize(7); doc.setTextColor(191, 219, 254);
      doc.text('DANGAR PAYMENT REPORT', W / 2, 17, { align: 'center' });
      doc.setFontSize(7); doc.setTextColor(239, 68, 68);
      doc.text('CONFIDENTIAL', W - M, 17, { align: 'right' });
    };

    const ftr = (pg, tot) => {
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, H - 18, W - M, H - 18);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text(cName + ' - Dangar Payment Report', M, H - 9);
      doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' });
      doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' });
    };

    hdr();
    let y = 45;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...navy);
    doc.text('Dangar Payment Report', M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gray);
    doc.text('Period: ' + filters.startDate + ' to ' + filters.endDate + '   |   Generated: ' + new Date().toLocaleString('en-IN'), M, y + 13);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
    y += 28;

    const pdfTotals = validData.reduce((acc, r) => ({
      totalQuintal: acc.totalQuintal + parseFloat(r.total_quintal || 0),
      totalRateAmount: acc.totalRateAmount + parseFloat(r.rate_amount || 0),
      totalInterest: acc.totalInterest + parseFloat(r.total_interest || 0),
      totalBardanPenalty: acc.totalBardanPenalty + parseFloat(r.bardan_penalty || 0),
      totalFinal: acc.totalFinal + parseFloat(r.final_amount || 0),
    }), { totalQuintal: 0, totalRateAmount: 0, totalInterest: 0, totalBardanPenalty: 0, totalFinal: 0 });

    const tableRows = validData.map((r, i) => [
      i + 1,
      r.member_code,
      r.member_name,
      r.full_ac_number || '-',
      parseFloat(r.total_quintal || 0).toFixed(2),
      parseFloat(r.rate_per_kg || 0).toFixed(2),
      parseFloat(r.rate_amount || 0).toFixed(2),
      parseFloat(r.total_interest || 0).toFixed(2),
      parseFloat(r.godown_fund || 0).toFixed(2),
      parseFloat(r.bardan_penalty || 0).toFixed(2),
      parseFloat(r.final_amount || 0).toFixed(2),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Sr.', 'Code', 'Member Name', 'Account No.', 'Total Qt', 'Rate/Qt', 'Rate Amt', 'Interest', 'Godown Fund', 'Bag Penalty', 'Final Amt']],
      body: tableRows,
      styles: { font: 'helvetica', fontSize: 7.5, cellPadding: [4, 5], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
      headStyles: { font: 'helvetica', fillColor: navy, textColor: white, fontStyle: 'normal' },
      footStyles: { font: 'helvetica', fillColor: [30, 41, 59], textColor: white },
      alternateRowStyles: { fillColor: stripe },
      theme: 'grid',
      foot: [['', '', '', 'TOTALS', pdfTotals.totalQuintal.toFixed(2) + ' Qt', '',
        pdfTotals.totalRateAmount.toFixed(2), pdfTotals.totalInterest.toFixed(2), '', '', pdfTotals.totalFinal.toFixed(2)]],
      margin: { left: M, right: M }
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i = 1; i <= tot; i++) { doc.setPage(i); ftr(i, tot); }
    doc.save('dangar_payment_' + filters.startDate + '_' + filters.endDate + '.pdf');
  };

  const openExportModal = () => {
    if (!companyAccount) {
      alert('Company Bank Account No. is not set. Please update it in Company Settings.');
      return;
    }
    if (!data.length) { alert('No data to export.'); return; }
    setTxtModal(true);
  };

  const doExportTxt = () => {
    const fw = (val, len, padChar, right) => {
      padChar = padChar || '0';
      const s = String(val !== null && val !== undefined ? val : '').slice(0, len);
      return right ? s.padEnd(len, padChar) : s.padStart(len, padChar);
    };
    const LINE = 101;
    const lines = [];
    const validData = data.filter(r => parseFloat(r.final_amount || 0) >= 0);
    const msg = fw(narration, 67, ' ', true);
    const totalAmountPaise = Math.abs(Math.round(validData.reduce((sum, row) => sum + parseFloat(row.final_amount || 0), 0) * 100));
    const totalAmtStr = fw(totalAmountPaise, 16);

    lines.push(('51' + '00000' + fw(companyAccount, 12) + totalAmtStr + msg).padEnd(LINE, ' ').slice(0, LINE));
    validData.forEach(function (row) {
      var acct = fw(String(row.full_ac_number || '').trim().replace(/\s/g, ''), 12);
      var paise = Math.abs(Math.round(parseFloat(row.final_amount || 0) * 100));
      var amt = fw(paise, 16);
      var line = '01' + '00000' + acct + amt + msg;
      lines.push(line.slice(0, LINE).padEnd(LINE, ' '));
    });
    const content = lines.join('\n') + '\n';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dangar_payment_' + filters.startDate + '_' + filters.endDate + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    setTxtModal(false);
    setMessage({ type: 'success', text: 'Batch TXT file exported successfully' });
  };

  const downloadAllBillsPDF = async () => {
    if (!selectedBills.length) return;
    try {
      setLoading(true);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [8, 6] });
      for (let i = 0; i < selectedBills.length; i++) {
        const bill = selectedBills[i];
        const elementId = `printable-bill-${bill.member_id}`;
        const element = document.getElementById(elementId);
        if (!element) continue;
        element.style.display = 'block';
        element.style.position = 'fixed';
        element.style.left = '0px';
        element.style.top = '0px';
        element.style.zIndex = '9999';
        await new Promise(r => setTimeout(r, 50));
        const dataUrl = await toPng(element, { backgroundColor: '#ffffff', width: 8 * 96, height: 6 * 96, pixelRatio: 2 });
        element.style.display = 'none';
        if (i > 0) pdf.addPage([8, 6], 'landscape');
        pdf.addImage(dataUrl, 'PNG', 0, 0, 8, 6);
      }
      pdf.save(`Payout_Slips_${billSearch.from}_to_${billSearch.to}.pdf`);
    } catch (err) {
      console.error('Batch PDF Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none animate-none">
      <Toast message={message} onClose={() => setMessage(null)} />
      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 select-none">
              <TrendingUp size={20} className="text-zinc-600" />
              Dangar Payment Report
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">Financial Intelligence / Payout Analytics</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 select-none w-full md:w-auto">
            <button
              onClick={() => { setBillModal(true); setSelectedBills([]); }}
              className="px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition select-none"
            >
              <Printer size={14} /> Print Bill
            </button>
            <button
              onClick={openExportModal}
              className="px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition select-none"
            >
              <FileText size={14} /> TXT
            </button>
            <button
              onClick={exportExcel}
              className="px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition select-none"
            >
              <Database size={14} /> Excel
            </button>
            <button
              onClick={exportPDF}
              className="px-3 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition select-none"
            >
              <FileText size={14} /> PDF
            </button>
            <button
              onClick={() => navigate('/dangar-summary')}
              className="px-4 py-2 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-xs font-bold flex items-center gap-2 transition-all shadow-sm text-white select-none"
            >
              <TrendingUp size={15} /> Dangar Summary
            </button>
          </div>
        </div>

        <div className="bg-white p-5 border border-zinc-300 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                <input
                  type="date"
                  className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-300 focus:border-zinc-500 outline-none transition-all font-bold text-sm text-zinc-700"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                <input
                  type="date"
                  className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-300 focus:border-zinc-500 outline-none transition-all font-bold text-sm text-zinc-700"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Sabhasad</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                <select
                  className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-300 focus:border-zinc-500 outline-none transition-all font-bold text-sm text-zinc-700 appearance-none uppercase"
                  value={filters.memberId}
                  onChange={(e) => setFilters({ ...filters, memberId: e.target.value })}
                >
                  <option value="">ALL IDENTITIES</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.member_code} - {m.member_name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Bank Stream</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                <select
                  className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-300 focus:border-zinc-500 outline-none transition-all font-bold text-sm text-zinc-700 appearance-none uppercase"
                  value={filters.bankName}
                  onChange={(e) => setFilters({ ...filters, bankName: e.target.value })}
                >
                  <option value="">ALL BANKS</option>
                  {banks.map(b => <option key={b.id} value={b.bank_name}>{b.bank_name}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={fetchReport}
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs select-none shadow-sm"
            >
              {loading ? <RefreshCcw className="animate-spin" size={15} /> : <Filter size={15} />}
              GENERATE REPORT
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-700 rounded-lg flex items-center gap-3">
            <AlertCircle size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between h-24">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Total Volume</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{summary.totalQuintal.toFixed(2)} Qt</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between h-24">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Bag Penalty</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">₹{summary.totalBardanPenalty?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between h-24">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Final Payable</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">₹{summary.totalFinal.toFixed(2)}</span>
          </div>
        </div>

        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[400px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3 select-none">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider select-none">
                Payment List
              </span>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5 select-none">
                {data.length} RECORDS
              </span>
            </div>

            <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
              <Search size={16} className="text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by member..."
                className="bg-transparent border-none outline-none text-xs text-zinc-800 placeholder:text-zinc-400 w-full md:w-48 font-mono"
              />
            </div>
          </div>

          <div className="overflow-x-auto bg-white select-none flex-1">
            <table className="min-w-[1200px] w-full text-left border-collapse font-sans text-xs select-none">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-300 text-[10px] font-bold text-zinc-600 uppercase tracking-wider select-none font-sans">
                  <th scope="col" className="px-4 py-2 border-r border-zinc-200 w-12 text-center select-none">#</th>
                  <th scope="col" className="px-4 py-2 border-r border-zinc-200 select-none">Member Name</th>
                  <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-right select-none">Quintal (Qt)</th>
                  <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-right select-none text-zinc-800">Rate Amt</th>
                  <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-right select-none text-rose-600">Advance</th>
                  <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-right select-none text-blue-600">Interest</th>
                  <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-right select-none text-zinc-800">Dangar Fund</th>
                  <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-right select-none text-amber-600">Baradan Kapat</th>
                  <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-right select-none text-rose-600">Total Deduction</th>
                  <th scope="col" className="px-4 py-2 text-right select-none text-emerald-600">Net Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-xs font-mono">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="py-20 text-center">
                      <RefreshCcw size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Report...</p>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-20 text-center">
                      <Info size={48} className="text-slate-100 mx-auto mb-3" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No transaction data available</p>
                    </td>
                  </tr>
                ) : (
                  data.filter(row => {
                    const term = (searchQuery || '').toLowerCase();
                    return !term ||
                      String(row.member_name).toLowerCase().includes(term) ||
                      String(row.member_code).toLowerCase().includes(term);
                  }).map((row, i) => (
                    <tr key={row.member_id} className="hover:bg-zinc-50/60 transition-all select-none">
                      <td className="px-4 py-3 border-r border-zinc-200 text-xs font-bold text-zinc-400 text-center select-none">{i + 1}</td>
                      <td className="px-4 py-3 border-r border-zinc-200 select-none">
                        <p className="text-sm font-bold text-slate-800 uppercase tracking-tight font-sans italic">{row.member_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">CODE: {row.member_code} • {row.entry_count} Entries</p>
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-slate-600 text-sm font-mono select-none">{row.total_quintal}</td>
                      <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-zinc-800 text-sm font-mono select-none">₹{row.rate_amount}</td>
                      <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-rose-600 text-sm font-mono select-none">₹{row.member_advance}</td>
                      <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-blue-600 text-sm font-mono select-none">₹{row.total_interest}</td>
                      <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-zinc-800 text-sm font-mono select-none">₹{row.godown_fund}</td>
                      <td className="px-4 py-3 border-r border-zinc-200 text-right select-none">
                        <p className="text-sm font-bold text-amber-600 font-mono">₹{row.bardan_penalty}</p>
                        <p className="text-[9px] font-bold text-slate-400 font-sans uppercase tracking-wider">{row.bardan_remaining} BAGS</p>
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-rose-600 text-sm font-mono select-none">₹{row.total_deductions}</td>
                      <td className="px-4 py-3 text-right select-none">
                        <span className="text-base font-black text-emerald-600 tracking-tighter bg-emerald-50/50 px-3 py-1 border border-emerald-200/60 font-mono select-none">₹{row.final_amount}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TXT Export Modal */}
      {txtModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-white animate-in zoom-in-95 duration-200">
            <div className="bg-blue-600 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Bank Export</h2>
                <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-1">Bank Batch Configuration</p>
              </div>
              <button onClick={() => setTxtModal(false)} className="p-2 text-white/50 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Payment Narration</label>
                <input
                  type="text"
                  maxLength={67}
                  value={narration}
                  onChange={e => setNarration(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && narration.trim()) {
                      e.preventDefault();
                      doExportTxt();
                    }
                  }}
                  placeholder="e.g. MILK PAYMENT MARCH-2026"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm font-mono focus:bg-white focus:border-blue-500"
                />
                <div className="flex justify-between px-1">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{narration.length} / 67 CHARS</p>
                  <p className="text-[9px] text-blue-500 font-bold uppercase italic">Will be space-padded</p>
                </div>
              </div>
              <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-3">Export Summary</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Total Rows</p>
                    <p className="text-lg font-black text-slate-800 tracking-tight">{data.length + 1} Lines</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Gross Payout</p>
                    <p className="text-lg font-black text-slate-800 tracking-tight">₹{data.reduce((s, r) => s + parseFloat(r.final_amount || 0), 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setTxtModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">Cancel</button>
                <button
                  onClick={doExportTxt}
                  disabled={!narration.trim()}
                  className="flex-3 py-4 bg-blue-600 text-white rounded-lg font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Download size={18} /> Generate Batch File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      {billModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-white animate-in zoom-in-95 duration-200">
            <div className="bg-blue-600 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Print Payout Slip</h2>
                <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-1">A5 Optimization (8x6)</p>
              </div>
              <button onClick={() => setBillModal(false)} className="p-2 text-white/50 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Range Start</label>
                  <input
                    type="text"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-sm focus:bg-white focus:border-blue-500"
                    placeholder="0001"
                    value={billSearch.from}
                    onChange={(e) => {
                      const from = e.target.value;
                      const to = billSearch.to || from;
                      setBillSearch({ ...billSearch, from });
                      const inRange = data.filter(r => {
                        const code = parseInt(r.member_code);
                        const start = parseInt(from);
                        const end = parseInt(to);
                        return code >= start && code <= end;
                      });
                      setSelectedBills(inRange);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Range End</label>
                  <input
                    type="text"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-sm focus:bg-white focus:border-blue-500"
                    placeholder="0050"
                    value={billSearch.to}
                    onChange={(e) => {
                      const to = e.target.value;
                      setBillSearch({ ...billSearch, to });
                      const inRange = data.filter(r => {
                        const code = parseInt(r.member_code);
                        const start = parseInt(billSearch.from);
                        const end = parseInt(to);
                        return code >= start && code <= end;
                      });
                      setSelectedBills(inRange);
                    }}
                  />
                </div>
              </div>
              {selectedBills.length > 0 ? (
                <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{selectedBills.length} Slips Found</p>
                    <p className="text-lg font-black text-slate-900">₹{selectedBills.reduce((s, b) => s + parseFloat(b.final_amount || 0), 0).toFixed(2)}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => window.print()} className="flex-1 py-4 bg-blue-600 text-white rounded-lg font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"><Printer size={16} /> Print</button>
                    <button onClick={downloadAllBillsPDF} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><Download size={16} /> PDF</button>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-lg">
                  <Info size={32} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Enter Code Range</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* A5 Printable Bills */}
      {selectedBills.map((bill, index) => (
        <div key={bill.member_id} id={`printable-bill-${bill.member_id}`} className={`hidden print:block fixed bg-white z-[9999] p-4 text-black ${index > 0 ? 'break-before-page' : ''}`} style={{ width: '8in', height: '6in', boxSizing: 'border-box' }}>
          <div className="border-2 border-black h-full flex flex-col relative p-2">
            <div className="text-center border-b border-black pb-2 mb-2">
              <h1 className="text-lg font-bold">શાખાઓ નાગરિક બેંક લિ. - પદ્ધતિ અનુસાર પત્રક</h1>
              <h2 className="text-sm font-semibold mt-1">ચોમાસું ડાંગર - ૨૦૨૬-૨૭ ની પતાવટની પાવતી</h2>
            </div>
            <div className="grid grid-cols-12 text-[11px] border-b border-black pb-2 mb-2">
              <div className="col-span-7 space-y-1">
                <p><b>સભાસદનું નામ :</b> {bill.member_name}</p>
                <p><b>નાનીનિગમ</b></p>
              </div>
              <div className="col-span-5 border-l border-black pl-4">
                <p><b>કોડ નંબર :</b> {bill.member_code}</p>
                <p><b>તારીખ :</b> {new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>
            <div className="grid grid-cols-12 text-[10px] border-b border-black bg-slate-100 font-bold">
              <div className="col-span-5 px-2 py-1 border-r border-black">ડાંગરનું નામ</div>
              <div className="col-span-1 px-2 py-1 border-r border-black text-center">નંગ</div>
              <div className="col-span-2 px-2 py-1 border-r border-black text-center">ક્વિન્ટલ</div>
              <div className="col-span-2 px-2 py-1 border-r border-black text-center">ભાવ/Qt</div>
              <div className="col-span-2 px-2 py-1 text-center">રકમ ₹</div>
            </div>
            <div className="grid grid-cols-12 text-[11px] border-b border-black min-h-[60px]">
              <div className="col-span-5 px-2 py-2 border-r border-black font-bold italic">{bill.dangar_name_gu || '---'}</div>
              <div className="col-span-1 px-2 py-2 border-r border-black text-center">{bill.entry_count || '1'}</div>
              <div className="col-span-2 px-2 py-2 border-r border-black text-center">{bill.total_quintal}</div>
              <div className="col-span-2 px-2 py-2 border-r border-black text-center">{bill.rate_per_kg}</div>
              <div className="col-span-2 px-2 py-2 text-right">{bill.rate_amount}</div>
            </div>
            <div className="flex-1 grid grid-cols-12 text-[11px]">
              <div className="col-span-5 border-r border-black p-2 space-y-1">
                <p><b>બેંકનું નામ :</b> {bill.bank_name || '---'}</p>
                <p><b>બ્રાન્ચ :</b> {bill.branch_name || '---'}</p>
                <p><b>ખાતા નંબર :</b> {bill.full_ac_number || '---'}</p>
              </div>
              <div className="col-span-7 flex flex-col">
                <div className="grid grid-cols-5 text-[9px] border-b border-black font-bold text-center">
                  <div className="col-span-3 border-r border-black px-2">વિગત</div>
                  <div className="border-r border-black px-2">જમા રકમ</div>
                  <div className="px-2">ઉધાર રકમ</div>
                </div>
                <div className="flex-1 text-[10px] font-bold">
                  <div className="grid grid-cols-5 border-b border-slate-100">
                    <div className="col-span-3 border-r border-black px-2 py-1">ડાંગર હિસાબ જમા</div>
                    <div className="border-r border-black px-2 py-1 text-right">{bill.rate_amount}</div>
                    <div className="px-2 py-1"></div>
                  </div>
                  <div className="grid grid-cols-5 border-b border-slate-100">
                    <div className="col-span-3 border-r border-black px-2 py-1">ડાંગર એડવાન્સ</div>
                    <div className="border-r border-black px-2 py-1 text-right"></div>
                    <div className="px-2 py-1 text-right">{bill.member_advance}</div>
                  </div>
                  <div className="grid grid-cols-5 border-b border-slate-100">
                    <div className="col-span-3 border-r border-black px-2 py-1">ખાલી બારદાન કપાત</div>
                    <div className="border-r border-black px-2 py-1 text-right"></div>
                    <div className="px-2 py-1 text-right">{bill.bardan_penalty}</div>
                  </div>
                  <div className="grid grid-cols-5 border-b border-slate-100">
                    <div className="col-span-3 border-r border-black px-2 py-1">ડાંગર ગોડાઉન ફંડ</div>
                    <div className="border-r border-black px-2 py-1 text-right"></div>
                    <div className="px-2 py-1 text-right">{bill.godown_fund}</div>
                  </div>
                  <div className="grid grid-cols-5 border-b border-slate-100">
                    <div className="col-span-3 border-r border-black px-2 py-1">વ્યાજ</div>
                    <div className="border-r border-black px-2 py-1 text-right"></div>
                    <div className="px-2 py-1 text-right">{bill.total_interest}</div>
                  </div>
                  {bill.other_deductions && bill.other_deductions.length > 0 ? (
                    bill.other_deductions.map((d, di) => (
                      <div key={di} className="grid grid-cols-5 border-b border-slate-100">
                        <div className="col-span-3 border-r border-black px-2 py-1">{d.account_name}</div>
                        <div className="border-r border-black px-2 py-1 text-right"></div>
                        <div className="px-2 py-1 text-right">{d.amount}</div>
                      </div>
                    ))
                  ) : null}
                </div>
                <div className="grid grid-cols-5 text-sm font-black border-t-2 border-black bg-slate-50">
                  <div className="col-span-3 border-r border-black px-2 py-2 text-center uppercase tracking-tight">ચુકવવા પાત્ર રકમ</div>
                  <div className="col-span-2 px-2 py-2 text-right text-base tracking-tighter">₹ {bill.final_amount}</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 text-[10px] font-bold text-center mt-4 pt-2 border-t border-dotted border-black">
              <div>લેનારની સહી</div>
              <div>સેક્રેટરીની સહી</div>
              <div>મેનેજરની સહી</div>
            </div>
          </div>
        </div>
      ))}

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .no-print { display: none !important; }
            .break-before-page { break-before: page !important; }
            body { margin: 0; padding: 0; background: white !important; }
            @page {
              size: 8in 6in landscape;
              margin: 0.2in;
            }
          }
       `}} />
    </div>
  );
};

export default DangarPaymentReport;
