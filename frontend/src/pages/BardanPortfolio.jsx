import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Printer, Save,
  Search, X, RefreshCcw, Calendar,
  AlertCircle, CheckCircle, History,
  Package, User, FileText, ChevronRight,
  Database, Info, Layout, ArrowLeftRight,
  TrendingDown, TrendingUp, IndianRupee, Tag, Edit2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api, { bardanEntryApi, jamaBardanEntryApi, sabhasadMasterApi } from '../api';

const BardanPortfolio = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    id: null,
    type: 'GIVEN', // GIVEN or RETURNED
    bookType: 'Combo1',
    pavtiNo: '',
    date: new Date().toISOString().split('T')[0],
    memNominal: '',
    code: '',
    name: '',
    qty: '',
    remark: '',
    dayQty: '',
    totalQty: '',
    option: 'Company' // Default to Company Bags for returns
  });

  const [gridRows, setGridRows] = useState(Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [members, setMembers] = useState([]);
  const [history, setHistory] = useState([]);
  const [ledgerData, setLedgerData] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [balanceData, setBalanceData] = useState({ taken: 0, returned: 0, balance: 0 });
  const [bardanPrice, setBardanPrice] = useState(0);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceForm, setPriceForm] = useState({ price_per_bardan: '' });
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [dropdowns, setDropdowns] = useState({ code: false, name: false });

  useEffect(() => {
    const total = gridRows.reduce((acc, row) => {
      const sum = (parseFloat(row.col1) || 0) + (parseFloat(row.col2) || 0) + (parseFloat(row.col3) || 0);
      return acc + sum;
    }, 0);
    // Only auto-fill qty from grid if grid has data
    if (total > 0) {
      setFormData(prev => ({ ...prev, qty: total.toFixed(2) }));
    }
  }, [gridRows]);

  useEffect(() => {
    loadData();
    loadBardanPrice();

    const handleOutsideClick = (e) => {
      if (!e.target.closest('.member-select-container')) {
        setDropdowns({ code: false, name: false });
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const loadData = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr || userStr === 'undefined') {
        console.warn('Redirecting to login: No session found');
        return;
      }

      const user = JSON.parse(userStr);
      if (!user.company_id) {
        console.warn('Incomplete session: Missing company_id');
        setMessage({ type: 'error', text: 'Authentication session incomplete' });
        return;
      }

      setLoading(true);
      const [membersRes, givenRes, returnedRes] = await Promise.all([
        sabhasadMasterApi.getAllSabhasad(),
        bardanEntryApi.getAllEntries(),
        jamaBardanEntryApi.getAllEntries()
      ]);

      const membersArr = membersRes.data.success ? (membersRes.data.data || membersRes.data) : (Array.isArray(membersRes.data) ? membersRes.data : []);
      setMembers(membersArr);

      const combined = [
        ...(givenRes.data.success ? (givenRes.data.data || []).map(item => ({ ...item, debit: item.qty, credit: 0, type: 'GIVEN' })) : []),
        ...(returnedRes.data.success ? (returnedRes.data.data || []).map(item => ({ ...item, debit: 0, credit: item.qty, type: 'RETURNED' })) : []),
        ...membersArr.map(m => ({
          code: m.member_code,
          name: m.member_name,
          debit: parseFloat(m.bardan_opening || 0),
          credit: 0,
          entry_date: null,
          pavti_no: 'OPENING',
          type: 'OPENING'
        }))
      ].sort((a, b) => new Date(b.entry_date || 0) - new Date(a.entry_date || 0));

      // Group history by Member only for a "summed up" view
      const memberGroups = {};
      combined.forEach(item => {
        const key = item.code;
        if (!memberGroups[key]) {
          memberGroups[key] = {
            code: item.code,
            name: item.name,
            date: item.entry_date,
            debit: 0,
            credit: 0,
            details: []
          };
        }
        memberGroups[key].debit += parseFloat(item.debit || 0);
        memberGroups[key].credit += parseFloat(item.credit || 0);
        if (item.pavti_no && item.pavti_no !== 'OPENING') memberGroups[key].details.push(item.pavti_no);
      });

      const processedHistory = Object.values(memberGroups)
        .filter(m => m.debit !== 0 || m.credit !== 0) // Only show members with activity or opening
        .map(m => ({
          ...m,
          pavti_no: m.details.length > 0 ? [...new Set(m.details)].join(', ') : 'INITIAL',
          balance: m.debit - m.credit
        }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      setHistory(processedHistory);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      if (error.response?.status === 400) {
        setMessage({ type: 'error', text: 'Authorization failure: Company context missing' });
      } else {
        setMessage({ type: 'error', text: 'Synchronization failure' });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadBardanPrice = async () => {
    try {
      const res = await api.get('/bardan-price');
      if (res.data.success) {
        setBardanPrice(res.data.data?.price_per_bardan || 0);
        setPriceForm({ price_per_bardan: res.data.data?.price_per_bardan || '' });
      }
    } catch (err) {
      console.error('Bardan price fetch error:', err);
    }
  };

  const saveBardanPrice = async () => {
    try {
      const res = await api.post('/bardan-price', priceForm);
      if (res.data.success) {
        setBardanPrice(parseFloat(priceForm.price_per_bardan) || 0);
        setShowPriceModal(false);
        setMessage({ type: 'success', text: 'Bardan price updated successfully' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update bardan price' });
    }
  };

  const fetchBalance = async (code) => {
    if (!code) {
      setBalanceData({ opening: 0, taken: 0, returned: 0, balance: 0 });
      setLedgerData([]);
      return;
    }
    try {
      setLoading(true);
      const [balRes, ledRes] = await Promise.all([
        bardanEntryApi.getBalance(code),
        bardanEntryApi.getLedger(code)
      ]);

      if (balRes.data.success) {
        setBalanceData(balRes.data.data);
      }
      if (ledRes.data.success) {
        setLedgerData(ledRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch balance/ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryPrint = () => {
    const dataToPrint = formData.code ? ledgerData : history;
    const rows = dataToPrint.filter(row => {
      const term = (historySearchQuery || '').toLowerCase();
      return !term ||
        String(row.sabhasad_name || row.sabhasad_code || row.member_name || row.member_code || '').toLowerCase().includes(term) ||
        String(row.particulars || '').toLowerCase().includes(term) ||
        String(row.pavti_no || '').toLowerCase().includes(term);
    }).map((r, i) =>
      '<tr style="background:' + (i % 2 === 0 ? '#fff' : '#f8fafc') + '">' +
        '<td>' + (r.date || '') + '</td>' +
        '<td>' + (r.particulars || '') + '</td>' +
        '<td style="text-align:right">' + (r.taken || r.debit || r.given || '-') + '</td>' +
        '<td style="text-align:right">' + (r.returned || r.credit || '-') + '</td>' +
        '<td style="text-align:right">' + (r.balance || '-') + '</td>' +
      '</tr>'
    );

    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.write('<html><head><title>Bardan History</title>' +
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:10px;color:#1e293b;padding:32px}' +
      '.logo-bar{background:#0f172a;color:#fff;padding:8px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}' +
      '.logo-bar h1{font-size:11px;font-weight:normal;text-transform:uppercase}' +
      '.logo-bar .lbl{font-size:9px;color:#94a3b8;font-weight:normal;letter-spacing:1px}' +
      '.logo-bar .conf{font-size:9px;color:#ef4444;font-weight:bold;letter-spacing:0.5px}' +
      'h2{font-size:18px;font-weight:bold;color:#0f172a;margin-bottom:2px}' +
      'p.sub{font-size:9px;color:#64748b;margin-bottom:12px}' +
      'hr{border:none;border-top:1px solid #e2e8f0;margin:8px 0}' +
      'table{width:100%;border-collapse:collapse}' +
      'thead tr{background:#0f172a;color:#fff}' +
      'th{padding:8px 10px;font-size:9px;font-weight:700;text-transform:uppercase;text-align:left}' +
      'td{padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:9px}' +
      'tfoot tr{background:#1e293b;color:#fff;font-weight:700}' +
      '@media print{@page{size:A4 portrait;margin:1.5cm}}' +
    '</style></head><body>' +
    '<div class="logo-bar">' +
       '<h1>BARDAN HISTORY</h1>' +
       '<span class="lbl">BARDAN LEDGER REPORT</span>' +
       '<span class="conf">CONFIDENTIAL</span>' +
    '</div>' +
    '<h2>Bardan History & Ledger</h2>' +
    '<p class="sub">Generated: ' + new Date().toLocaleString('en-IN') + '</p>' +
    '<hr/>' +
    '<table>' +
      '<thead><tr><th>Date</th><th>Particulars</th><th style="text-align:right">Debit (Taken)</th><th style="text-align:right">Credit (Returned)</th><th style="text-align:right">Balance</th></tr></thead>' +
      '<tbody>' + rows.join('') + '</tbody>' +
    '</table></body></html>');
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleHistoryExportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 32;
    const navy = [15, 23, 42], white = [255, 255, 255], gray = [100, 116, 139];
    const dark = [30, 41, 59], stripe = [241, 245, 249];

    const hdr = () => {
       doc.setFillColor(...navy); doc.rect(0, 0, W, 26, 'F');
       doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
       doc.text('BARDAN LEDGER', M, 17);
       doc.setFontSize(7); doc.setTextColor(148, 163, 184);
       doc.text('BARDAN PORTFOLIO HISTORY', W / 2, 17, { align: 'center' });
       doc.setFontSize(7); doc.setTextColor(239, 68, 68);
       doc.text('CONFIDENTIAL', W - M, 17, { align: 'right' });
    };
    const ftr = (pg, tot) => {
       doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4);
       doc.line(M, H - 18, W - M, H - 18);
       doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
       doc.text('Bardan Ledger Summary', M, H - 9);
       doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' });
       doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' });
    };

    hdr();
    let y = 45;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...navy);
    doc.text('Bardan History & Ledger', M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gray);
    doc.text('Generated: ' + new Date().toLocaleString('en-IN'), M, y + 13);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
    y += 28;

    const dataToPrint = formData.code ? ledgerData : history;
    autoTable(doc, {
       startY: y,
       head: [['Date', 'Particulars', 'Debit (Taken)', 'Credit (Returned)', 'Balance']],
       body: dataToPrint.filter(row => {
          const term = (historySearchQuery || '').toLowerCase();
          return !term ||
            String(row.sabhasad_name || row.sabhasad_code || row.member_name || row.member_code || '').toLowerCase().includes(term) ||
            String(row.particulars || '').toLowerCase().includes(term) ||
            String(row.pavti_no || '').toLowerCase().includes(term);
       }).map(r => [
          r.date || '',
          r.particulars || '',
          r.taken || r.debit || r.given || '-',
          r.returned || r.credit || '-',
          r.balance || '-'
       ]),
       styles: { font: 'helvetica', fontSize: 7.5, cellPadding: [5, 6], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
       headStyles: { font: 'helvetica', fillColor: navy, textColor: white },
       footStyles: { font: 'helvetica', fillColor: [30, 41, 59], textColor: white },
       alternateRowStyles: { fillColor: stripe },
       theme: 'grid',
       margin: { left: M, right: M }
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i = 1; i <= tot; i++) { doc.setPage(i); ftr(i, tot); }
    doc.save('Bardan_History_' + (formData.code || 'all') + '.pdf');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setDropdowns(prev => ({ ...prev, [name]: true }));

    if (name === 'code') {
      const member = members.find(m => m.member_code === value);
      if (member) {
        setFormData(prev => ({ ...prev, name: member.member_name }));
        fetchBalance(value);
        setDropdowns(prev => ({ ...prev, code: false }));
      } else {
        setBalanceData({ taken: 0, returned: 0, balance: 0 });
      }
    }
    if (name === 'name') {
      const member = members.find(m => m.member_name === value);
      if (member) {
        setFormData(prev => ({ ...prev, code: member.member_code }));
        fetchBalance(member.member_code);
        setDropdowns(prev => ({ ...prev, name: false }));
      } else {
        setBalanceData({ taken: 0, returned: 0, balance: 0 });
      }
    }
  };

  const selectMember = (member) => {
    setFormData(prev => ({
      ...prev,
      code: member.member_code,
      name: member.member_name,
      memNominal: member.nominal_member === 'Member' ? 'Member' : 'Nominal'
    }));
    setDropdowns({ code: false, name: false });
    fetchBalance(member.member_code);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.date) {
      setMessage({ type: 'error', text: '⚠️ Please select a member and ensure date is set before saving.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!formData.qty || parseFloat(formData.qty) <= 0) {
      setMessage({ type: 'error', text: '⚠️ Quantity must be greater than 0. Enter bags count or fill the grid.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const payload = {
        ...formData,
        gridRows,
        company_id: user.company_id,
        financial_year: user.financial_year || '2026-27'
      };

      let res;
      if (formData.id) {
        res = formData.type === 'GIVEN'
          ? await bardanEntryApi.updateEntry(formData.id, payload)
          : await jamaBardanEntryApi.updateEntry(formData.id, payload);
      } else {
        res = formData.type === 'GIVEN'
          ? await bardanEntryApi.createEntry(payload)
          : await jamaBardanEntryApi.createEntry(payload);
      }

      if (res.data.success) {
        setMessage({ type: 'success', text: formData.id ? 'Transaction updated' : 'Transaction committed' });
        if (!formData.id) resetForm();
        loadData();
        if (formData.code) fetchBalance(formData.code);
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ type: 'error', text: res.data.error || 'Operational failure' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network or server error during commit' });
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async (id, type) => {
    if (!window.confirm('⚠️ Are you sure you want to VOID this transaction? This will set quantity to zero but keep the record for audit.')) return;
    try {
      setLoading(true);
      const res = type === 'GIVEN'
        ? await bardanEntryApi.getEntryById(id)
        : await jamaBardanEntryApi.getEntryById(id);

      if (res.data.success) {
        const entry = res.data.data;
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const payload = {
          ...entry,
          qty: 0,
          gridRows: Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })),
          remark: `[VOIDED] ${entry.remark || ''}`,
          company_id: user.company_id,
          financial_year: user.financial_year || '2026-27'
        };

        const updateRes = type === 'GIVEN'
          ? await bardanEntryApi.updateEntry(id, payload)
          : await jamaBardanEntryApi.updateEntry(id, payload);

        if (updateRes.data.success) {
          setMessage({ type: 'success', text: 'Transaction voided successfully' });
          loadData();
          if (formData.code) fetchBalance(formData.code);
          setTimeout(() => setMessage(null), 5000);
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Operational failure during voiding' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (item) => {
    try {
      setLoading(true);
      const res = item.type === 'GIVEN'
        ? await bardanEntryApi.getEntryById(item.id)
        : await jamaBardanEntryApi.getEntryById(item.id);

      if (res.data.success) {
        const entry = res.data.data;
        setFormData({
          id: entry.id,
          type: item.type,
          bookType: entry.book_type,
          pavtiNo: entry.pavti_no,
          date: entry.entry_date ? new Date(entry.entry_date).toISOString().split('T')[0] : '',
          memNominal: entry.mem_nominal,
          code: entry.code,
          name: entry.name,
          qty: entry.qty,
          option: entry.option_type || 'Company',
          remark: entry.remark,
          dayQty: entry.day_qty,
          totalQty: entry.total_qty
        });
        setGridRows(entry.gridRows || Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
        setShowHistory(false);
        fetchBalance(entry.code);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load transaction details' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      type: 'GIVEN',
      bookType: 'Combo1',
      pavtiNo: '',
      date: new Date().toISOString().split('T')[0],
      memNominal: '',
      code: '',
      name: '',
      qty: '',
      option: 'Company',
      remark: '',
      dayQty: '',
      totalQty: ''
    });
    setGridRows(Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
    setBalanceData({ taken: 0, returned: 0, balance: 0 });
  };

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none animate-none">
      {message && (
        <div className={`p-4 mb-4 border text-xs font-bold ${message.type === 'error' ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-emerald-50 border-emerald-300 text-emerald-700'}`}>
          {message.text}
        </div>
      )}

      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">
        {showHistory ? (
          <div className="space-y-6 select-none animate-none">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
                  <History size={20} className="text-zinc-600" />
                  Bardan History & Ledger
                </h1>
                <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">Asset Management / Logistics</p>
              </div>

              <div className="flex items-center gap-2 select-none w-full md:w-auto">
                <button
                  onClick={handleHistoryPrint}
                  className="flex items-center gap-1.5 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-700 text-xs font-bold px-3 py-2 transition shadow-sm select-none"
                >
                  <Printer size={15} /> PRINT
                </button>
                <button
                  onClick={handleHistoryExportPDF}
                  className="flex items-center gap-1.5 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-700 text-xs font-bold px-3 py-2 transition shadow-sm select-none"
                >
                  <FileText size={15} /> PDF
                </button>
                <button
                  onClick={() => setShowHistory(false)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 transition shadow-sm select-none"
                >
                  <X size={16} /> EXIT HISTORY
                </button>
              </div>
            </div>

            {/* Dense Table Layout */}
            <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
              <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Transaction History Log
                  </span>
                  <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5">
                    {(formData.code ? ledgerData : history).length} RECORDS
                  </span>
                </div>

                <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
                  <Search size={16} className="text-zinc-400" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Search logs..."
                    className="bg-transparent border-none outline-none text-xs text-zinc-800 placeholder:text-zinc-400 w-full md:w-48 font-mono"
                  />
                </div>
              </div>

              <div className="overflow-x-auto bg-white">
                <table className="min-w-full divide-y divide-zinc-200 select-none">
                  <thead className="bg-zinc-50 select-none">
                    <tr className="text-left text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-300">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Particulars</th>
                      <th className="px-4 py-3 text-right">Debit (Taken)</th>
                      <th className="px-4 py-3 text-right">Credit (Jama)</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      <th className="px-4 py-3 text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-zinc-200 text-xs select-none">
                    {(formData.code ? ledgerData : history).filter(row => {
                      const term = (historySearchQuery || '').toLowerCase();
                      const dateStr = (row.date || row.entry_date) ? new Date(row.date || row.entry_date).toLocaleDateString() : '—';
                      const partStr = row.particulars || row.name || (row.type === 'GIVEN' ? 'Given' : 'Returned');
                      const pvtStr = row.pavti_no || '';
                      return dateStr.toLowerCase().includes(term) || partStr.toLowerCase().includes(term) || pvtStr.toLowerCase().includes(term);
                    }).map((row, i) => (
                      <tr key={row.id || i} className="hover:bg-zinc-50 transition select-none">
                        <td className="px-4 py-3 font-mono">
                          {(row.date || row.entry_date) ? new Date(row.date || row.entry_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 font-bold text-zinc-800 uppercase tracking-tight">
                          {row.particulars || row.name || (row.type === 'GIVEN' ? 'Given' : 'Returned')}
                          {row.pavti_no && <span className="block text-[10px] font-mono text-blue-600 mt-0.5">PVT: {row.pavti_no}</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-zinc-700">
                          {row.debit ?? (row.type === 'GIVEN' ? row.qty : '—')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                          {row.credit ?? (row.type === 'RETURNED' ? row.qty : '—')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-zinc-800">
                          {row.balance != null ? row.balance : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            {row.id !== 'OP' && row.type !== 'OPENING' && (
                              <>
                                <button 
                                  onClick={() => handleEdit(row)} 
                                  className="p-1 border border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-blue-600 transition"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button 
                                  onClick={() => handleVoid(row.id, row.type)} 
                                  className="p-1 border border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-rose-600 transition"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 select-none animate-none">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
                  <ArrowLeftRight size={20} className="text-zinc-600" />
                  Bardan Portfolio Registry
                </h1>
                <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">Inventory & Logistics Management</p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setShowPriceModal(true)}
                  className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none transition"
                >
                  <Tag size={14} /> BARDAN RATE
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none transition"
                >
                  <History size={14} /> HISTORY
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 select-none transition shadow-sm"
                >
                  <Save size={14} /> SAVE TRANSACTION
                </button>
              </div>
            </div>

            {/* Entry Workspace Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-white p-5 border border-zinc-300 space-y-5">
                  {/* Ledger Type Toggler */}
                  <div className="flex gap-1 bg-zinc-100 border border-zinc-300 p-1 select-none">
                    <button
                      onClick={() => setFormData({ ...formData, type: 'GIVEN' })}
                      disabled={!!formData.id}
                      className={`flex-1 py-2.5 rounded-sm flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-wider select-none ${formData.type === 'GIVEN'
                        ? 'bg-blue-600 text-white border border-blue-600'
                        : 'text-zinc-600'
                        } ${formData.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <TrendingUp size={15} /> Give Bags (Uthar)
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, type: 'RETURNED' })}
                      disabled={!!formData.id}
                      className={`flex-1 py-2.5 rounded-sm flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-wider select-none ${formData.type === 'RETURNED'
                        ? 'bg-blue-600 text-white border border-blue-600'
                        : 'text-zinc-600'
                        } ${formData.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <TrendingDown size={15} /> Return Bags (Jama)
                    </button>
                  </div>

                  {/* Form Grid Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Book Type</label>
                      <select
                        name="bookType"
                        className="w-full px-3 py-1.5 bg-white border border-zinc-300 focus:border-zinc-500 outline-none transition font-mono font-bold text-xs select-none"
                        value={formData.bookType}
                        onChange={handleChange}
                      >
                        <option>Combo1</option>
                        <option>Combo2</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">{t('bardanEntry.pavti_no')}</label>
                      <input
                        name="pavtiNo"
                        className="w-full px-3 py-1.5 bg-white border border-zinc-300 focus:border-zinc-500 outline-none transition font-mono font-bold text-xs"
                        placeholder="ENTER PVT NO"
                        value={formData.pavtiNo}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">{t('bardanEntry.date')}</label>
                      <input
                        type="date"
                        name="date"
                        className="w-full px-3 py-1.5 bg-white border border-zinc-300 focus:border-zinc-500 outline-none transition font-mono font-bold text-xs"
                        value={formData.date}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 relative member-select-container">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Member Code</label>
                      <input
                        type="text"
                        name="code"
                        className="w-full px-3 py-1.5 bg-white border border-zinc-300 focus:border-zinc-500 outline-none transition font-mono font-bold text-xs"
                        placeholder="SEARCH CODE"
                        value={formData.code}
                        autoComplete="off"
                        onFocus={() => setDropdowns(prev => ({ ...prev, code: true }))}
                        onChange={handleChange}
                      />
                      {dropdowns.code && (
                        <div className="absolute z-[100] w-full top-full left-0 mt-1 bg-white border border-zinc-300 shadow-lg max-h-[250px] overflow-y-auto">
                          {members
                            .filter(m => m.member_code.toString().toLowerCase().includes(formData.code.toLowerCase()))
                            .slice(0, 50)
                            .map(m => (
                              <div
                                key={m.id}
                                onClick={() => selectMember(m)}
                                className="px-3 py-2 hover:bg-zinc-100 border-b border-zinc-200 cursor-pointer text-xs transition"
                              >
                                <div className="flex justify-between items-center select-none">
                                  <span className="font-bold text-zinc-800">{m.member_code}</span>
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase">{m.village_name}</span>
                                </div>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">{m.member_name}</p>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 relative member-select-container">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Member Name</label>
                      <input
                        type="text"
                        name="name"
                        className="w-full px-3 py-1.5 bg-white border border-zinc-300 focus:border-zinc-500 outline-none transition font-mono font-bold text-xs"
                        placeholder="SEARCH NAME"
                        value={formData.name}
                        autoComplete="off"
                        onFocus={() => setDropdowns(prev => ({ ...prev, name: true }))}
                        onChange={handleChange}
                      />
                      {dropdowns.name && (
                        <div className="absolute z-[100] w-full top-full left-0 mt-1 bg-white border border-zinc-300 shadow-lg max-h-[250px] overflow-y-auto">
                          {members
                            .filter(m => m.member_name.toLowerCase().includes(formData.name.toLowerCase()))
                            .slice(0, 50)
                            .map(m => (
                              <div
                                key={m.id}
                                onClick={() => selectMember(m)}
                                className="px-3 py-2 hover:bg-zinc-100 border-b border-zinc-200 cursor-pointer text-xs transition"
                              >
                                <div className="flex justify-between items-center select-none">
                                  <span className="font-bold text-zinc-800">{m.member_name}</span>
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase">{m.member_code}</span>
                                </div>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">{m.village_name}</p>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
                    <div className="flex flex-col gap-1 relative">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Quantity</label>
                      <div className="relative">
                        <input
                          type="number"
                          name="qty"
                          className="w-full px-3 py-1.5 bg-white border border-zinc-300 focus:border-zinc-500 outline-none transition font-mono font-bold text-xs"
                          placeholder="0.00"
                          value={formData.qty}
                          onChange={handleChange}
                        />
                        {formData.type === 'RETURNED' && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-zinc-50 border border-zinc-300 px-2 py-0.5 select-none">
                            <span className="text-zinc-500 text-[8px] font-bold uppercase tracking-widest leading-none">Pending: </span>
                            <span className="text-emerald-700 font-mono font-bold text-xs leading-none">#{balanceData.balance || 0}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Member Type</label>
                      <div className="flex items-center gap-3 bg-zinc-50 p-2 border border-zinc-300 select-none">
                        <input
                          type="checkbox"
                          id="memNominalCheck"
                          className="w-4 h-4 rounded text-zinc-600 border-zinc-300 focus:ring-zinc-500 transition-all cursor-pointer"
                          checked={formData.memNominal === 'Member'}
                          onChange={(e) => setFormData({ ...formData, memNominal: e.target.checked ? 'Member' : 'Nominal' })}
                        />
                        <label htmlFor="memNominalCheck" className="text-xs font-bold uppercase tracking-wider text-zinc-700 cursor-pointer select-none">
                          {formData.memNominal === 'Member' ? 'Sabhasad (Active)' : 'Nominal Member'}
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 select-none">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('bardanEntry.remark')}</label>
                    <textarea
                      name="remark"
                      className="w-full px-3 py-1.5 bg-white border border-zinc-300 focus:border-zinc-500 outline-none transition font-mono font-bold text-xs min-h-[70px]"
                      placeholder="ENTER REMARK..."
                      value={formData.remark}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Side Panels - Metric Insights & Grid Matrix */}
              <div className="lg:col-span-4 space-y-4 select-none">
                <div className="bg-white p-4 border border-zinc-300 space-y-3">
                  <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-300">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={15} className="text-zinc-600" />
                      <p className="text-[10px] font-bold text-zinc-600 uppercase">Asset Load</p>
                    </div>
                    <p className="text-base font-mono font-bold text-zinc-800 leading-none">#{((balanceData.opening || 0) + (balanceData.taken || 0)).toFixed(2)}</p>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-300">
                    <div className="flex items-center gap-2">
                      <TrendingDown size={15} className="text-zinc-600" />
                      <p className="text-[10px] font-bold text-zinc-600 uppercase">Return Reg</p>
                    </div>
                    <p className="text-base font-mono font-bold text-zinc-800 leading-none">#{balanceData.returned}</p>
                  </div>

                  <div className="p-4 bg-zinc-50 border border-zinc-300 flex justify-between items-center">
                    <div className="flex flex-col justify-between">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none">Net Position</span>
                      <span className="text-lg font-bold font-mono text-zinc-800 mt-1 leading-none">#{balanceData.balance}</span>
                    </div>
                    {bardanPrice > 0 && (
                      <div className="text-right flex flex-col justify-between">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none">Valuation</span>
                        <span className="text-sm font-bold font-mono text-blue-600 mt-1 leading-none">₹{(balanceData.balance * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-zinc-300 flex flex-col select-none">
                  <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between select-none">
                    <span className="text-xs font-bold text-zinc-700 uppercase">Allocation Matrix</span>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {formData.type === 'RETURNED' && (
                      <div className="flex flex-col gap-1 select-none">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase italic">Return Category</label>
                        <select
                          name="option"
                          className="w-full px-3 py-1.5 bg-white border border-zinc-300 focus:border-zinc-500 outline-none transition font-mono font-bold text-xs select-none"
                          value={formData.option}
                          onChange={handleChange}
                        >
                          <option value="Company">Company Bags</option>
                          <option value="Self">Self Bags (Penalty Applies)</option>
                        </select>
                      </div>
                    )}

                    <div className="flex flex-col gap-1 select-none">
                      <div className="max-h-[180px] overflow-y-auto border border-zinc-200">
                        <table className="w-full text-xs select-none">
                          <thead className="bg-zinc-50 select-none">
                            <tr className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-300 select-none">
                              <th className="py-2 text-center w-8">#</th>
                              <th className="py-2 px-1 text-left">POS 1</th>
                              <th className="py-2 px-1 text-left">POS 2</th>
                              <th className="py-2 px-1 text-left">POS 3</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200">
                            {gridRows.map((row, i) => (
                              <tr key={i} className="hover:bg-zinc-50 transition select-none">
                                <td className="text-center font-bold text-zinc-400 font-mono text-[10px] select-none">{i + 1}</td>
                                <td className="px-1 py-1">
                                  <input
                                    className="w-full bg-white border border-zinc-300 px-2 py-1 font-mono font-bold text-zinc-700 outline-none focus:border-zinc-500"
                                    value={row.col1}
                                    onChange={(e) => {
                                      const r = [...gridRows]; r[i].col1 = e.target.value; setGridRows(r);
                                    }}
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <input
                                    className="w-full bg-white border border-zinc-300 px-2 py-1 font-mono font-bold text-zinc-700 outline-none focus:border-zinc-500"
                                    value={row.col2}
                                    onChange={(e) => {
                                      const r = [...gridRows]; r[i].col2 = e.target.value; setGridRows(r);
                                    }}
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <input
                                    className="w-full bg-white border border-zinc-300 px-2 py-1 font-mono font-bold text-zinc-700 outline-none focus:border-zinc-500"
                                    value={row.col3}
                                    onChange={(e) => {
                                      const r = [...gridRows]; r[i].col3 = e.target.value; setGridRows(r);
                                    }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-zinc-300 bg-zinc-50 select-none">
                    <div className="flex justify-between items-center text-zinc-600">
                      <p className="text-[10px] font-bold uppercase tracking-wider">Total Volume</p>
                      <p className="text-xl font-mono font-bold tracking-tight text-zinc-900 leading-none">{parseFloat(formData.qty || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bardan Rate Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white border border-zinc-300 p-5 w-full max-w-md flex flex-col animate-none">
            <div className="flex justify-between items-center border-b border-zinc-300 pb-3 mb-4 select-none">
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-zinc-600" />
                <div>
                  <h2 className="text-base font-bold text-zinc-900">Bardan Price Protocol</h2>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">Set rate calculation (₹)</p>
                </div>
              </div>
              <button onClick={() => setShowPriceModal(false)} className="p-1 border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-700 transition"><X size={16} /></button>
            </div>

            <div className="space-y-4 select-none">
              <div className="p-4 bg-zinc-50 border border-zinc-300 flex justify-between items-center">
                <div className="flex items-center gap-2 leading-none">
                  <Database size={14} className="text-zinc-400" />
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest leading-none">Active System Rate</p>
                </div>
                <p className="text-lg font-mono font-bold text-zinc-800 leading-none">₹{parseFloat(bardanPrice || 0).toFixed(2)}</p>
              </div>

              <div className="flex flex-col gap-1 select-none">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed">Market Valuation (Per Bag)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-sm font-mono font-bold text-zinc-800 text-lg outline-none focus:border-zinc-500 transition"
                  placeholder="0.00"
                  value={priceForm.price_per_bardan}
                  onChange={(e) => setPriceForm({ ...priceForm, price_per_bardan: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveBardanPrice();
                  }}
                />
                <p className="text-[9px] font-medium text-zinc-400 uppercase tracking-wider leading-relaxed select-none">
                  This rate defines the valuation for extraction computing protocols.
                </p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-zinc-200">
                <button
                  onClick={() => setShowPriceModal(false)}
                  className="flex-1 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold select-none transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBardanPrice}
                  className="flex-[2] py-2 bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 text-xs font-bold select-none transition flex items-center justify-center gap-1.5"
                >
                  <Save size={15} />
                  <span>Update Rate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BardanPortfolio;
