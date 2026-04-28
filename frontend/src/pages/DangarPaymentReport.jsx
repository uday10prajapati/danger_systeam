import React, { useState, useEffect } from 'react';
import {
  FileText, Search, Printer, Download, Filter,
  Calendar, User, Box, ArrowRight, TrendingUp,
  CreditCard, ChevronDown, ChevronRight, CheckCircle, Clock, X, Shield ,
  Table
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api, { dangarEntryApi } from '../api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DangarPaymentReport = () => {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '2026-04-01',
    endDate: new Date().toISOString().split('T')[0],
    memberId: '',
    itemId: ''
  });
  const [summary, setSummary] = useState({
    totalQuintal: 0,
    totalRateAmount: 0,
    totalDeduction: 0,
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
  const [narration, setNarration] = useState('');

  useEffect(() => {
    fetchInitialData().then(() => fetchReport());
  }, []);

  const fetchInitialData = async () => {
    try {
      const [mRes, iRes, cRes] = await Promise.all([
        api.get('/members'),
        api.get('/items'),
        api.get('/company')
      ]);
      if (mRes.data.success) setMembers(mRes.data.data);
      if (iRes.data.success) setItems(iRes.data.data);
      if (cRes.data.success) setCompanyAccount(cRes.data.data?.company_account_no || '');
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

        setData(rows);

        const s = rows.reduce((acc, r) => ({
          totalQuintal: acc.totalQuintal + parseFloat(r.total_quintal || 0),
          totalRateAmount: acc.totalRateAmount + parseFloat(r.rate_amount || 0),
          totalDeduction: acc.totalDeduction + parseFloat(r.total_kapat || 0),
          totalBardanPenalty: acc.totalBardanPenalty + parseFloat(r.bardan_penalty || 0),
          totalFinal: acc.totalFinal + parseFloat(r.final_amount || 0),
          count: acc.count + 1,
        }), { totalQuintal: 0, totalRateAmount: 0, totalDeduction: 0, totalBardanPenalty: 0, totalFinal: 0, count: 0 });

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
    if (!data.length) { alert('No data to export.'); return; }
    const rows = data.map((r, i) => ({
      'Sr.': i + 1,
      'Member Code': r.member_code,
      'Member Name': r.member_name,
      'Account No.': r.full_ac_number || '',
      'Total KG': parseFloat(r.total_kg || 0),
      'Rate/Qt': parseFloat(r.rate_per_kg || 0),
      'Rate Amount': parseFloat(r.rate_amount || 0),
      'Total Kapat': parseFloat(r.total_kapat || 0),
      'Bag Penalty': parseFloat(r.bardan_penalty || 0),
      'Final Amount': parseFloat(r.final_amount || 0),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    // Column widths
    ws['!cols'] = [5, 12, 25, 18, 10, 10, 14, 12, 14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payment Report');
    XLSX.writeFile(wb, 'dangar_payment_' + filters.startDate + '_' + filters.endDate + '.xlsx');
  };

  // ── PDF Export ──────────────────────────────────────────────────────────
  const exportPDF = () => {
    if (!data.length) { alert('No data to export.'); return; }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Dangar Payment Report', 14, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Period: ' + filters.startDate + ' to ' + filters.endDate, 14, 23);
    doc.text('Generated: ' + new Date().toLocaleDateString('en-IN'), 220, 23, { align: 'right' });

    const tableRows = data.map((r, i) => [
      i + 1,
      r.member_code,
      r.member_name,
      r.full_ac_number || '-',
      parseFloat(r.total_kg || 0).toFixed(2),
      parseFloat(r.rate_per_kg || 0).toFixed(2),
      parseFloat(r.rate_amount || 0).toFixed(2),
      parseFloat(r.total_kapat || 0).toFixed(2),
      parseFloat(r.bardan_penalty || 0).toFixed(2),
      parseFloat(r.final_amount || 0).toFixed(2),
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Sr.', 'Code', 'Member Name', 'Account No.', 'Total KG', 'Rate/Qt', 'Rate Amt', 'Kapat', 'Bag Penalty', 'Final Amt']],
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
        6: { halign: 'right', cellWidth: 20 },
        7: { halign: 'right', cellWidth: 18 },
        8: { halign: 'right', cellWidth: 22 },
      },
      foot: [['', '', '', 'TOTAL', summary.totalQuintal.toFixed(2) + ' Qt', '',
        summary.totalRateAmount.toFixed(2), summary.totalDeduction.toFixed(2), summary.totalBardanPenalty.toFixed(2), summary.totalFinal.toFixed(2)]],
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
    const LINE = 102;
    const lines = [];
    const missing = data.filter(r => !r.full_ac_number);
    if (missing.length) {
      const names = missing.map(r => r.member_name).join(', ');
      if (!window.confirm(missing.length + ' member(s) have no bank account. They export with 0000000000000. Continue?')) return;
    }
    const msg = fw(narration, 67, ' ', true);
    
    // Calculate total sum of all members (Absolute value to avoid leading minus sign)
    const totalAmountPaise = Math.abs(Math.round(data.reduce((sum, row) => sum + parseFloat(row.final_amount || 0), 0) * 100));
    const totalAmtStr = fw(totalAmountPaise, 16);

    // Header (51): 2 (code) + 5 (zeros) + 13 (company acct) + 16 (total amt) + 66 (narration) = 102
    lines.push(('51' + '00000' + fw(companyAccount, 12) + totalAmtStr + msg).padEnd(LINE, ' ').slice(0, LINE));

    data.forEach(function (row) {
      var acct = String(row.full_ac_number || '').slice(0, 12);
      var paise = Math.abs(Math.round(parseFloat(row.final_amount || 0) * 100));
      var amt = fw(paise, 16);
      var line = '01' + '00000' + acct + amt + msg;
      lines.push(line.slice(0, LINE).padEnd(LINE, ' '));
    });
    const content = lines.join('\r\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dangar_payment_' + filters.startDate + '_' + filters.endDate + '.txt';
    a.click();
    URL.revokeObjectURL(url);
    setTxtModal(false);
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
            { label: 'Kapat (Deduction)', val: `₹${summary.totalDeduction.toFixed(2)}`, icon: Filter, color: 'rose' },
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
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 italic text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="px-6 py-5">#</th>
                  <th className="px-6 py-5">Member Code</th>
                  <th className="px-6 py-5">Member Name</th>
                  <th className="px-6 py-5 text-right">Qty (Qt)</th>
                  <th className="px-6 py-5 text-right">Rate/Qt</th>
                  <th className="px-6 py-5 text-right text-indigo-500">Rate Amount</th>
                  <th className="px-6 py-5 text-right text-rose-500">Kapat</th>
                  <th className="px-6 py-5 text-right text-amber-600">Bag Penalty</th>
                  <th className="px-6 py-5 text-right text-emerald-600">Final Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-300">
                        <Clock size={40} className="animate-spin opacity-30" />
                        <p className="text-xs font-black uppercase tracking-widest italic">Loading...</p>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-300">
                        <FileText size={64} className="opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest italic">No Transaction Data Found</p>
                        <p className="text-[10px] text-slate-400">Make sure there are entries in the ledger for this period.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((row, i) => (
                    <React.Fragment key={row.member_id}>
                      {/* Main member row */}
                      <tr className="group hover:bg-indigo-50/30 transition-all cursor-default">
                        <td className="px-6 py-4 text-xs font-black text-slate-400">{i + 1}</td>
                        <td className="px-6 py-4 text-sm font-black text-slate-800 font-mono">{row.member_code}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{row.member_name}</p>
                          <p className="text-[9px] text-slate-400 font-bold">{row.entry_count} entries</p>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-600 italic text-sm">{row.total_quintal} Qt</td>
                        <td className="px-6 py-4 text-right font-black text-slate-500 italic text-sm">₹{row.rate_per_kg}/Qt</td>
                        <td className="px-6 py-4 text-right font-black text-indigo-600 italic text-sm">₹{row.rate_amount}</td>
                        {/* Kapat cell "" clickable to expand sub-rows */}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => toggleRow(row.member_id)}
                            className="flex items-center gap-1 ml-auto font-black text-rose-500 italic text-sm hover:text-rose-700 transition-colors"
                          >
                            {expandedRows[row.member_id]
                              ? <ChevronDown size={13} className="shrink-0" />
                              : <ChevronRight size={13} className="shrink-0" />}
                            ₹{row.total_kapat}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-black text-amber-600 italic">₹{row.bardan_penalty}</p>
                          <p className="text-[9px] text-slate-400 font-bold">{row.bardan_remaining} bags</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-base font-black italic tracking-tighter text-emerald-600">₹{row.final_amount}</span>
                        </td>
                      </tr>
                      {/* Kapat sub-rows */}
                      {expandedRows[row.member_id] && (
                        row.kapat_entries && row.kapat_entries.length > 0 ? (
                          row.kapat_entries.map((k, ki) => (
                            <tr key={`kapat-${row.member_id}-${ki}`} className="bg-rose-50/60 border-b border-rose-100">
                              <td className="pl-10 pr-2 py-2" />
                              <td className="px-3 py-2 text-[10px] text-rose-400 font-mono">{k.reference_no}</td>
                              <td className="px-3 py-2" colSpan="2">
                                <p className="text-[11px] font-bold text-rose-700">{k.account_name || '""'}</p>
                                <p className="text-[9px] text-slate-500">{k.description}</p>
                              </td>
                              <td className="px-3 py-2 text-[10px] text-slate-400 italic" colSpan="2">
                                {k.transaction_date ? new Date(k.transaction_date).toLocaleDateString('en-IN') : '""'}
                              </td>
                              <td className="px-6 py-2 text-right text-[11px] font-black text-rose-600">₹{parseFloat(k.amount || 0).toFixed(2)}</td>
                              <td colSpan="2" />
                            </tr>
                          ))
                        ) : (
                          <tr className="bg-rose-50/40">
                            <td colSpan="9" className="px-12 py-2 text-[10px] text-slate-400 italic">No kapat entries found for this period.</td>
                          </tr>
                        )
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>

            </table>
          </div>
        </div>


      </div>

      {/* "" Export TXT Modal """"""""""""""""""""""""""""""""""""""""""" */}
      {txtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-amber-100 uppercase tracking-[0.25em] mb-1">Bank Batch File</p>
                  <h2 className="text-xl font-black text-white tracking-tight">Export TXT "" Configure Narration</h2>
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
                <p className="text-[9px] text-slate-400 font-bold">{narration.length}/67 chars (max) "" will be space-padded to fill 67</p>
              </div>

              {/* Live Preview */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Line Preview (102 chars)</p>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-[10px] text-amber-300 font-mono whitespace-pre leading-relaxed">
                    {/* Debit header: 51 + 00000 + company account + Total Amount + Narration */}
                    {`5100000${String(companyAccount).padStart(12, '0').slice(-12)}${String(Math.abs(Math.round(data.reduce((s, r) => s + parseFloat(r.final_amount || 0), 0) * 100))).padStart(16, '0').slice(-16)}${narration.slice(0, 67).padEnd(67, ' ')}`.slice(0, 102)}{`\n`}
                    {/* Credit sample: 01 + 00000 + member full_ac_number + amount + narration */}
                    {`0100000${String(data[0]?.full_ac_number || '').padStart(12, '0').slice(-12)}${String(Math.round(parseFloat(data[0]?.final_amount || 0) * 100)).padStart(16, '0').slice(-16)}${narration.slice(0, 67).padEnd(67, ' ')}`.slice(0, 102)}
                  </pre>
                </div>
                <p className="text-[9px] text-slate-400 italic font-bold">
                  Row 1 = <span className="text-rose-400">Debit</span> (51  company A/C)  Row 2 = <span className="text-emerald-400">Credit</span> (01  member A/C) "" first member sample
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Total Lines</p>
                  <p className="text-lg font-black text-slate-800">{data.length + 1}</p>
                  <p className="text-[9px] text-slate-400">(1 header + {data.length} members)</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Chars/Line</p>
                  <p className="text-lg font-black text-slate-800">102</p>
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

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .shadow-2xl, .shadow-xl, .shadow-sm { box-shadow: none !important; }
          .max-w-[1600px] { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .bg-[#F8FAFC] { background: white !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border-bottom: 1px solid #eee !important; padding: 8px !important; }
          .animate-in { animation: none !important; }
        }
      `}} />
    </div>
  );
};

export default DangarPaymentReport;
