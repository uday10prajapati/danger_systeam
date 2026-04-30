import React, { useState, useEffect } from 'react';
import {
  FileText, Search, Printer, Download, Filter,
  Calendar, User, Box, ArrowRight, TrendingUp,
  CreditCard, ChevronDown, ChevronRight, CheckCircle, Clock, X, Shield,
  Table
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api, { dangarEntryApi } from '../api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';

const DangarPaymentReport = () => {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
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

      // Use the dedicated payment-report endpoint (account_ledger + dangar_entry + bardan_entry)
      const res = await api.get('/dangar-entry/payment-report', {
        params: { companyId, startDate: filters.startDate, endDate: filters.endDate }
      });
      console.log('" Payment report response:', res.data);

      if (res.data.success) {
        let rows = res.data.data || [];

        // Client-side member filter
        if (filters.memberId) {
          rows = rows.filter(r => String(r.member_id) === String(filters.memberId));
        }

        // Client-side bank filter
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

  const handlePrint = () => window.print();

  // ── Excel Export ────────────────────────────────────────────────────────
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
      'Member Code': r.member_code,
      'Member Name': r.member_name,
      'Account No.': r.full_ac_number || '',
      'Total KG': parseFloat(r.total_kg || 0),
      'Rate/Qt': parseFloat(r.rate_per_kg || 0),
      'Rate Amount': parseFloat(r.rate_amount || 0),
      'Interest': parseFloat(r.total_interest || 0),
      'Bag Penalty': parseFloat(r.bardan_penalty || 0),
      'Godown Fund': parseFloat(r.godown_fund || 0),
      'Final Amount': parseFloat(r.final_amount || 0),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    // Column widths
    ws['!cols'] = [5, 12, 25, 20, 15, 15, 12, 25, 18, 10, 10, 14, 12, 14, 14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payment Report');
    XLSX.writeFile(wb, 'dangar_payment_' + filters.startDate + '_' + filters.endDate + '.xlsx');
  };

  // ── PDF Export ──────────────────────────────────────────────────────────
  const exportPDF = () => {
    const validData = data.filter(r => parseFloat(r.final_amount || 0) >= 0);
    if (!validData.length) { alert('No valid data to export.'); return; }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Dangar Payment Report', 14, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Period: ' + filters.startDate + ' to ' + filters.endDate, 14, 23);
    doc.text('Generated: ' + new Date().toLocaleDateString('en-IN'), 220, 23, { align: 'right' });

    // Calculate dynamic totals for PDF footer
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
      parseFloat(r.total_kg || 0).toFixed(2),
      parseFloat(r.rate_per_kg || 0).toFixed(2),
      parseFloat(r.rate_amount || 0).toFixed(2),
      parseFloat(r.total_interest || 0).toFixed(2),
      parseFloat(r.bardan_penalty || 0).toFixed(2),
      parseFloat(r.final_amount || 0).toFixed(2),
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Sr.', 'Code', 'Member Name', 'Account No.', 'Total KG', 'Rate/Qt', 'Rate Amt', 'Interest', 'Bag Penalty', 'Final Amt']],
      body: tableRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 60], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 14 },
        2: { cellWidth: 45 },
        3: { cellWidth: 32 },
        4: { halign: 'right', cellWidth: 16 },
        5: { halign: 'right', cellWidth: 14 },
        6: { halign: 'right', cellWidth: 18 },
        7: { halign: 'right', cellWidth: 16 },
        8: { halign: 'right', cellWidth: 20 },
      },
      foot: [['', '', '', 'TOTAL', pdfTotals.totalQuintal.toFixed(2) + ' Qt', '',
        pdfTotals.totalRateAmount.toFixed(2), pdfTotals.totalInterest.toFixed(2), pdfTotals.totalBardanPenalty.toFixed(2), pdfTotals.totalFinal.toFixed(2)]],
      footStyles: { fillColor: [20, 20, 50], textColor: 255, fontStyle: 'bold' },
    });
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

  // Build and download the 102-char fixed-width bank batch file
  const doExportTxt = () => {
    const fw = (val, len, padChar, right) => {
      padChar = padChar || '0';
      const s = String(val !== null && val !== undefined ? val : '').slice(0, len);
      return right ? s.padEnd(len, padChar) : s.padStart(len, padChar);
    };
    const LINE = 101;
    const lines = [];
    const validData = data.filter(r => parseFloat(r.final_amount || 0) >= 0);
    const missing = validData.filter(r => !r.full_ac_number);
    if (missing.length) {
      const names = missing.map(r => r.member_name).join(', ');
      if (!window.confirm(missing.length + ' member(s) have no bank account. They export with 0000000000000. Continue?')) return;
    }
    const msg = fw(narration, 67, ' ', true);

    // Calculate total sum of all valid members (Absolute value to avoid leading minus sign)
    const totalAmountPaise = Math.abs(Math.round(validData.reduce((sum, row) => sum + parseFloat(row.final_amount || 0), 0) * 100));
    const totalAmtStr = fw(totalAmountPaise, 16);

    // Header (51): 2 (code) + 5 (zeros) + 12 (company acct) + 16 (total amt) + 67 (narration) = 102
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

        // Force visibility for capture
        element.style.display = 'block';
        element.style.position = 'fixed';
        element.style.left = '0px';
        element.style.top = '0px';
        element.style.zIndex = '9999';
        
        await new Promise(r => setTimeout(r, 50));
        const dataUrl = await toPng(element, { 
          backgroundColor: '#ffffff',
          width: 8 * 96,
          height: 6 * 96,
          pixelRatio: 2
        });
        
        element.style.display = 'none';
        
        if (i > 0) pdf.addPage([8, 6], 'landscape');
        pdf.addImage(dataUrl, 'PNG', 0, 0, 8, 6);
      }
      
      pdf.save(`Payout_Slips_${billSearch.from}_to_${billSearch.to}.pdf`);
    } catch (err) {
      console.error('Batch PDF Error:', err);
      alert('Failed to generate batch PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-8">

        {/* Modern Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-10 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1 italic">
              <TrendingUp size={12} />
              <span>Financial Intelligence / Payout Analytics</span>
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none italic uppercase">
              Dangar Payment Report
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Audit-Ready Manifest * Fiscal 2026-27</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">

            <button
              onClick={() => { setBillModal(true); setSelectedBills([]); }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Printer size={16} /> Print Bill
            </button>
            <button
              onClick={openExportModal}
              className="flex items-center gap-2 bg-amber-500 text-white px-5 py-3.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
            >
              <FileText size={16} /> TXT
            </button>
            <button
              onClick={exportExcel}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
              <Download size={16} /> Excel
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 bg-rose-600 text-white px-5 py-3.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
            >
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>

        {/* Dynamic Filter Consolidation */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-lg border border-white shadow-xl mb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Start Period</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input
                  type="date"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-xs text-slate-700"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">End Period</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input
                  type="date"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-xs text-slate-700"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Sabhasad Filter</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <select
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-xs text-slate-700 appearance-none italic"
                  value={filters.memberId}
                  onChange={(e) => setFilters({ ...filters, memberId: e.target.value })}
                >
                  <option value="">All Identities</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.member_code} - {m.member_name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Bank Stream</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <select
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-xs text-slate-700 appearance-none italic"
                  value={filters.bankName}
                  onChange={(e) => setFilters({ ...filters, bankName: e.target.value })}
                >
                  <option value="">All Banks</option>
                  {banks.map(b => <option key={b.id} value={b.bank_name}>{b.bank_name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Resource Vector</label>
              <div className="relative">
                <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <select
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-xs text-slate-700 appearance-none italic"
                  value={filters.itemId}
                  onChange={(e) => setFilters({ ...filters, itemId: e.target.value })}
                >
                  <option value="">All Items</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.item_name}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={fetchReport}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Clock className="animate-spin" size={16} /> : <Filter size={16} />}
              Generate Report
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-lg text-xs font-black uppercase tracking-widest">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Volume', val: `${summary.totalQuintal.toFixed(2)} Qt`, icon: Box, color: 'blue' },
            { label: 'Bag Penalty', val: `₹${summary.totalBardanPenalty?.toFixed(2) || '0.00'}`, icon: Shield, color: 'amber' },
            { label: 'Final Payable', val: `₹${summary.totalFinal.toFixed(2)}`, icon: CheckCircle, color: 'emerald' },
          ].map((shard, i) => (
            <div key={i} className="bg-white p-5 rounded-lg border border-white shadow-sm flex items-center gap-4 hover:shadow-md transition-all group">
              <div className={`p-3 bg-${shard.color}-50 text-${shard.color}-600 rounded-lg group-hover:scale-110 transition-transform shrink-0`}>
                <shard.icon size={20} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 italic">{shard.label}</p>
                <p className="text-lg font-black text-slate-800 italic tracking-tighter leading-none">{shard.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Manifest Table */}
        <div className="bg-white/60 backdrop-blur-xl rounded-lg border border-white shadow-2xl overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 italic text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="px-6 py-5">#</th>
                  <th className="px-6 py-5">Member Code</th>
                  <th className="px-6 py-5">Member Name</th>
                  <th className="px-6 py-5 text-right">Qty (Qt)</th>
                  <th className="px-6 py-5 text-right">Rate/Qt</th>
                  <th className="px-6 py-5 text-right text-indigo-500">Rate Amount</th>
                  <th className="px-6 py-5 text-right text-rose-500">Adv Amount</th>
                  <th className="px-6 py-5 text-right text-blue-600">Interest</th>
                  <th className="px-6 py-5 text-right text-amber-600">Bag Penalty</th>
                  <th className="px-6 py-5 text-right text-rose-700">Total Deduction</th>
                  <th className="px-6 py-5 text-right text-emerald-600">Final Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="11" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-300">
                        <Clock size={40} className="animate-spin opacity-30" />
                        <p className="text-xs font-black uppercase tracking-widest italic">Loading...</p>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-300">
                        <FileText size={64} className="opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest italic">No Transaction Data Found</p>
                        <p className="text-[10px] text-slate-400">Make sure there are entries in the ledger for this period.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={row.member_id} className="group hover:bg-indigo-50/30 transition-all cursor-default">
                      <td className="px-6 py-4 text-xs font-black text-slate-400">{i + 1}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-800 font-mono">{row.member_code}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{row.member_name}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{row.entry_count} entries</p>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-600 italic text-sm">{row.total_quintal} Qt</td>
                      <td className="px-6 py-4 text-right font-black text-slate-500 italic text-sm">₹{row.rate_per_kg}/Qt</td>
                      <td className="px-6 py-4 text-right font-black text-indigo-600 italic text-sm">₹{row.rate_amount}</td>
                      <td className="px-6 py-4 text-right font-black text-rose-600 italic text-sm">₹{row.member_advance}</td>
                      <td className="px-6 py-4 text-right font-black text-blue-600 italic text-sm">₹{row.total_interest}</td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-black text-amber-600 italic">₹{row.bardan_penalty}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{row.bardan_remaining} bags</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-rose-700 italic">₹{row.total_deductions}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-base font-black italic tracking-tighter text-emerald-600">₹{row.final_amount}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>
        </div>


      </div>

      {/* Export TXT Modal */}
      {txtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-amber-100 uppercase tracking-widest mb-1">Bank Batch File</p>
                  <h2 className="text-xl font-black text-white tracking-tight">Export TXT - Configure Narration</h2>
                </div>
                <button onClick={() => setTxtModal(false)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-8 py-6 space-y-6">
              {/* Narration Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Narration / Payment Message <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  maxLength={67}
                  value={narration}
                  onChange={e => setNarration(e.target.value)}
                  placeholder="e.g. PMS MILK PAYMENT MARCH -2026"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm font-mono"
                />
                <p className="text-xs text-slate-400 font-bold">{narration.length}/67 chars (max) - will be space-padded to fill 67</p>
              </div>

              <p className="text-xs text-slate-400 italic font-bold">
                Row 1 = <span className="text-rose-400">Debit</span> (51 company A/C) Row 2 = <span className="text-emerald-400">Credit</span> (01 member A/C) - first member sample
              </p>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Total Lines</p>
                  <p className="text-lg font-black text-slate-800">{data.length + 1}</p>
                  <p className="text-[9px] text-slate-400">(1 header + {data.length} members)</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Chars/Line</p>
                  <p className="text-lg font-black text-slate-800">101</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <p className="text-[9px] text-amber-600 font-black uppercase tracking-widest">Total Payable</p>
                  <p className="text-lg font-black text-amber-700">
                    ₹{data.reduce((s, r) => s + parseFloat(r.final_amount || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setTxtModal(false)}
                className="px-6 py-3 text-sm font-black text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={doExportTxt}
                disabled={!narration.trim()}
                className="flex items-center gap-2 px-8 py-3 text-sm font-black text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-100"
              >
                <Download size={16} /> Generate &amp; Download TXT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Generation Modal */}
      {billModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-white">
            <div className="bg-indigo-600 p-6 flex justify-between items-center">
               <div>
                  <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Print Payout Slip</h2>
                  <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest mt-1">A5 Optimized Format (8x6)</p>
               </div>
               <button onClick={() => setBillModal(false)} className="p-2 text-white/50 hover:text-white transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-8 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">From Member Code</label>
                     <input 
                        type="text"
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-sm text-slate-700"
                        placeholder="e.g. 0001"
                        value={billSearch.from}
                        onChange={(e) => {
                           const from = e.target.value;
                           const to = billSearch.to || from;
                           setBillSearch({ ...billSearch, from });
                           
                           // Identify bills in range
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
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">To Member Code</label>
                     <input 
                        type="text"
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-sm text-slate-700"
                        placeholder="e.g. 0050"
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
                  <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 animate-in fade-in zoom-in duration-300">
                     <div className="flex justify-between items-start mb-6">
                        <div>
                           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 italic">Batch Processing Ready</p>
                           <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{selectedBills.length} Slips Selected</h3>
                        </div>
                        <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-indigo-100">
                           <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest leading-none text-right">Total Payable</p>
                           <p className="text-xl font-black text-slate-900 tracking-tighter mt-1">₹{selectedBills.reduce((s, b) => s + parseFloat(b.final_amount || 0), 0).toFixed(2)}</p>
                        </div>
                     </div>
                     <div className="flex gap-3">
                        <button 
                           onClick={() => window.print()}
                           className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-95"
                        >
                           <Printer size={18} /> Print All ({selectedBills.length})
                        </button>
                        <button 
                           onClick={downloadAllBillsPDF}
                           disabled={loading}
                           className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                           {loading ? <Clock className="animate-spin" size={18} /> : <Download size={18} />} PDF Batch
                        </button>
                     </div>
                  </div>
               ) : (
                  <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-xl">
                     <Clock size={32} className="mx-auto text-slate-200 mb-3" />
                     <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Enter Code Range to Generate Slips...</p>
                     <p className="text-[10px] text-slate-400 font-bold mt-1">Found in current manifest: {data.length} records</p>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* A5 Printable Bill Section - Gujarati Traditional Layout */}
       {selectedBills.map((bill, index) => (
          <div key={bill.member_id} id={`printable-bill-${bill.member_id}`} className={`hidden print:block fixed bg-white z-[9999] p-4 text-black ${index > 0 ? 'break-before-page' : ''}`} style={{ width: '8in', height: '6in', boxSizing: 'border-box' }}>
            <div className="border-2 border-black h-full flex flex-col relative p-2">
               {/* Main Header */}
               <div className="text-center border-b border-black pb-2 mb-2">
                  <h1 className="text-lg font-bold leading-tight">ધી પારડીઝાંખરી, નેશ, કરંજ ગ્રુપ દૂધ અને શાકભાજી વેચાણ કરનારી સહકારી મંડળી લી.</h1>
                  <h2 className="text-sm font-semibold mt-1">ચોમાસુ ડાંગર - ૨૦૨૪/૨૦૨૫ ડાંગર નો છેવટ નો હિસાબ</h2>
               </div>

               {/* Sub Header / Member Info */}
               <div className="grid grid-cols-12 text-[11px] border-b border-black pb-2 mb-2">
                  <div className="col-span-7 space-y-1">
                     <div className="flex gap-2">
                        <span className="font-bold whitespace-nowrap">સભાસદ નું નામ :</span>
                        <span className="font-bold border-b border-dotted border-black flex-1">{bill.member_name}</span>
                     </div>
                     <div className="flex gap-2">
                        <span className="font-bold whitespace-nowrap">નાનીનેશ</span>
                     </div>
                  </div>
                  <div className="col-span-5 border-l border-black pl-4 space-y-1">
                     <div className="flex justify-between">
                        <span className="font-bold">નંબર :</span>
                        <span className="font-bold">{bill.member_code}</span>
                     </div>
                     <div className="flex justify-between border-t border-black pt-1">
                        <span className="font-bold">તારીખ :</span>
                        <span className="font-bold">{new Date().toLocaleDateString('en-GB')}</span>
                     </div>
                  </div>
               </div>

               {/* Item Table Header */}
               <div className="grid grid-cols-12 text-[10px] border-b border-black bg-slate-50 font-bold">
                  <div className="col-span-5 px-2 py-1 border-r border-black text-center">ડાંગર નું નામ</div>
                  <div className="col-span-1 px-2 py-1 border-r border-black text-center">ગુણ</div>
                  <div className="col-span-2 px-2 py-1 border-r border-black text-center">વજન</div>
                  <div className="col-span-2 px-2 py-1 border-r border-black text-center">ભાવ (કવી)</div>
                  <div className="col-span-2 px-2 py-1 text-center">કિંમત રૂ.</div>
               </div>
               
               {/* Item Table Body */}
               <div className="grid grid-cols-12 text-[11px] border-b border-black min-h-[60px]">
                  <div className="col-span-5 px-2 py-2 border-r border-black font-bold italic">{bill.dangar_name_gu || '---'}</div>
                  <div className="col-span-1 px-2 py-2 border-r border-black text-center font-bold">{bill.entry_count || '1'}</div>
                  <div className="col-span-2 px-2 py-2 border-r border-black text-center font-bold">{bill.total_quintal}</div>
                  <div className="col-span-2 px-2 py-2 border-r border-black text-center font-bold">{bill.rate_per_kg}</div>
                  <div className="col-span-2 px-2 py-2 text-right font-bold">{bill.rate_amount}</div>
               </div>

               {/* Mid Section: Bank & Deductions Split */}
               <div className="flex-1 grid grid-cols-12 text-[11px]">
                  {/* Left Side: Bank Details */}
                  <div className="col-span-5 border-r border-black p-2 space-y-2">
                     <div className="flex gap-2">
                        <span className="font-bold whitespace-nowrap">બેંક નું નામ :</span>
                        <span className="font-bold text-[10px]">{bill.bank_name || '----------------'}</span>
                     </div>
                     <div className="flex gap-2">
                        <span className="font-bold whitespace-nowrap">બ્રાન્ચ નું નામ :</span>
                        <span className="font-bold">{bill.branch_name || '----------------'}</span>
                     </div>
                     <div className="flex gap-2">
                        <span className="font-bold whitespace-nowrap">એકાઉન્ટ નંબર :</span>
                        <span className="font-bold">{bill.full_ac_number || '----------------'}</span>
                     </div>
                  </div>

                  {/* Right Side: Detailed Accounting */}
                  <div className="col-span-7 flex flex-col">
                     <div className="grid grid-cols-5 text-[9px] border-b border-black font-bold">
                        <div className="col-span-3 border-r border-black px-2 py-0.5">વિગત</div>
                        <div className="border-r border-black px-2 py-0.5 text-center">જમા રકમ</div>
                        <div className="px-2 py-0.5 text-center">ઉધાર રકમ</div>
                     </div>
                     
                     {/* Calculation Rows */}
                     <div className="flex-1 text-[10px] font-bold">
                        <div className="grid grid-cols-5 border-b border-slate-200">
                           <div className="col-span-3 border-r border-black px-2 py-1">ડાંગર હિસાબ ના જમા</div>
                           <div className="border-r border-black px-2 py-1 text-right">{bill.rate_amount}</div>
                           <div className="px-2 py-1 text-right"></div>
                        </div>
                        <div className="grid grid-cols-5 border-b border-slate-200">
                           <div className="col-span-3 border-r border-black px-2 py-1">ડાંગર એડવાન્સ</div>
                           <div className="border-r border-black px-2 py-1 text-right"></div>
                           <div className="px-2 py-1 text-right">{bill.member_advance}</div>
                        </div>
                        <div className="grid grid-cols-5 border-b border-slate-200">
                           <div className="col-span-3 border-r border-black px-2 py-1">ખાલી બારદાન કપાત</div>
                           <div className="border-r border-black px-2 py-1 text-right"></div>
                           <div className="px-2 py-1 text-right">{bill.bardan_penalty}</div>
                        </div>
                        <div className="grid grid-cols-5 border-b border-slate-200">
                           <div className="col-span-3 border-r border-black px-2 py-1">ડાંગર ગોડાઉન ફંડ</div>
                           <div className="border-r border-black px-2 py-1 text-right"></div>
                           <div className="px-2 py-1 text-right">{bill.godown_fund}</div>
                        </div>
                        <div className="grid grid-cols-5 border-b border-slate-200">
                           <div className="col-span-3 border-r border-black px-2 py-1">વ્યાજ</div>
                           <div className="border-r border-black px-2 py-1 text-right"></div>
                           <div className="px-2 py-1 text-right">{bill.total_interest}</div>
                        </div>
                         {bill.other_deductions && bill.other_deductions.length > 0 ? (
                            bill.other_deductions.map((d, di) => (
                               <div key={di} className="grid grid-cols-5 border-b border-slate-200">
                                  <div className="col-span-3 border-r border-black px-2 py-1">{d.account_name}</div>
                                  <div className="border-r border-black px-2 py-1 text-right"></div>
                                  <div className="px-2 py-1 text-right">{d.amount}</div>
                               </div>
                            ))
                         ) : (
                            <div className="grid grid-cols-5 border-b border-black bg-slate-50 font-bold">
                               <div className="col-span-3 border-r border-black px-2 py-1 text-slate-400 italic">અન્ય કપાત (Total)</div>
                               <div className="border-r border-black px-2 py-1 text-right"></div>
                               <div className="px-2 py-1 text-right">0.00</div>
                            </div>
                         )}
                     </div>

                     {/* Result Row */}
                     <div className="grid grid-cols-5 text-sm font-black border-t-2 border-black bg-slate-50">
                        <div className="col-span-3 border-r border-black px-2 py-2 text-center uppercase tracking-tight">બાકી નીકળતી રકમ</div>
                        <div className="col-span-2 px-2 py-2 text-right text-base tracking-tighter">₹ {bill.final_amount}</div>
                     </div>
                  </div>
               </div>

               {/* Footer Signatures */}
               <div className="grid grid-cols-3 text-[10px] font-bold text-center mt-4 pt-4 border-t border-dotted border-black">
                  <div>લેનારની સહી</div>
                  <div>સેક્રેટરી ની સહી</div>
                  <div>મેનેજર ની સહી</div>
               </div>
            </div>
          </div>
        ))}

      <style dangerouslySetInnerHTML={{
         __html: `
          @media print {
            .no-print { display: none !important; }
            .break-before-page { break-before: page !important; }
            body { margin: 0; padding: 0; }
            @page {
              size: 8in 6in landscape;
              margin: 0;
            }
          }
         @media print {
           .no-print { display: none !important; }
           body { 
             background: white !important; 
             margin: 0 !important; 
             padding: 0 !important;
           }
           @page {
             size: 8in 6in;
             margin: 0.25in;
           }
           .shadow-2xl, .shadow-xl, .shadow-sm { box-shadow: none !important; }
           div[class*="max-w-"] { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
           div[class*="bg-"] { background: white !important; }
           .animate-in { animation: none !important; }
         }
       `}} />
    </div>
  );
};

export default DangarPaymentReport;
