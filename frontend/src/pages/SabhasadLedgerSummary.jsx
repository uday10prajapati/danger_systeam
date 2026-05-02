import React, { useState, useEffect } from 'react';
import {
  Search, Download, Filter, FileText,
  Database, RefreshCcw, Layout, Users,
  TrendingUp, TrendingDown, ShieldCheck,
  Printer, X, Hash, User, Activity, Clock
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';
import Loading from '../components/Loading';
import Toast from '../components/Toast';

export default function SabhasadLedgerSummary() {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({ opening_balance: 0, debit: 0, credit: 0, closing_balance: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [company, setCompany] = useState(null);
  const [bardanPrice, setBardanPrice] = useState(0);
  const [toast, setToast] = useState(null);

  // Filters
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [accountId, setAccountId] = useState('all');
  const [memberId, setMemberId] = useState('all');
  const [hideZeroBalance, setHideZeroBalance] = useState(false);

  // Audit Modal States
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditMember, setAuditMember] = useState(null);
  const [auditTransactions, setAuditTransactions] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Search/Auto-Fetch States
  const [accCode, setAccCode] = useState('');
  const [accName, setAccName] = useState('');
  const [showAccDrop, setShowAccDrop] = useState(false);

  const [memCode, setMemCode] = useState('');
  const [memName, setMemName] = useState('');
  const [showMemDrop, setShowMemDrop] = useState(false);

  // Dropdown lists
  const [accounts, setAccounts] = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const response = await axios.get('/api/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load company', error);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchDropdownData();
      fetchBardanPrice();
    }
  }, [company]);

  const fetchBardanPrice = async () => {
    try {
      const response = await axios.get('/api/bardan-price', {
        headers: { 'x-company-id': company.id }
      });
      if (response.data.success && response.data.data) {
        setBardanPrice(parseFloat(response.data.data.price_per_bardan || 0));
      }
    } catch (error) {
      console.error('Failed to load bardan price', error);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const accRes = await axios.get(`/api/accounts/company/${company.id}`, {
        headers: { 'x-company-id': company.id }
      });
      if (accRes.data.success) {
        const filteredAccounts = accRes.data.data.filter(a =>
          !a.account_name.toLowerCase().includes('brokerage') &&
          !a.account_name.toLowerCase().includes('labour') &&
          !a.account_name.toLowerCase().includes('rounding')
        );
        setAccounts(filteredAccounts);
      }

      const memRes = await axios.get(`/api/members/company/${company.id}`, {
        headers: { 'x-company-id': company.id }
      });
      if (memRes.data.success) {
        setMembers(memRes.data.data);
      }

      fetchReportData();
    } catch (error) {
      console.error('Failed to load dropdowns', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async () => {
    if (!company?.id) return;

    setSyncing(true);
    try {
      const response = await axios.get(`/api/sabhasad-ledger-summary`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          accountId,
          memberId,
          hideZeroBalance
        },
        headers: { 'x-company-id': company.id }
      });

      if (response.data.success) {
        setData(response.data.data);
        setTotals(response.data.totals);
      }
    } catch (error) {
      console.error('Fetch report error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const openAudit = async (mem) => {
    setAuditMember(mem);
    setShowAuditModal(true);
    setAuditLoading(true);
    try {
      const response = await axios.get(`/api/account-ledger`, {
        params: {
          memberId: mem.member_id,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          accountId: accountId !== 'all' ? accountId : undefined
        },
        headers: { 'x-company-id': company.id }
      });
      if (response.data.success) {
        setAuditTransactions(response.data.data);
      }
    } catch (error) {
      console.error('Audit fetch error:', error);
    } finally {
      setAuditLoading(false);
    }
  };

  const handlePrint = () => {
    if (data.length === 0) {
      setToast({ msg: 'No data available to print.', type: 'error' });
      return;
    }
    const cName = company?.company_name || 'Company';
    const win = window.open('', '_blank', 'width=1100,height=800');

    const thCols = hideBardan ?
      `<th>Sr</th><th>Code</th><th>Member Name</th><th>Account</th><th>Date</th><th style="text-align:right">Debit (+)</th><th style="text-align:right">Credit (-)</th><th style="text-align:right">Closing</th>` :
      `<th>Sr</th><th>Code</th><th>Member Name</th><th>Account</th><th>Date</th><th style="text-align:right">Debit (+)</th><th style="text-align:right">Credit (-)</th><th style="text-align:right">Closing</th><th style="text-align:right">Bardan Bal</th><th style="text-align:right">Self Jama</th><th style="text-align:right">Bardan Amt</th>`;

    const rows = data.map((row, idx) => {
      let r = `
        <td style="text-align:center">${String(idx + 1).padStart(3, '0')}</td>
        <td>${row.member_code || '-'}</td>
        <td style="font-weight:600">${row.member_name || '-'}</td>
        <td>${row.account_name || '-'}</td>
        <td style="text-align:center">${row.last_activity_date ? new Date(row.last_activity_date).toLocaleDateString('en-GB') : '-'}</td>
        <td style="text-align:right">${parseFloat(row.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right">${parseFloat(row.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="text-align:right; font-weight:bold;">${Math.abs(parseFloat(row.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(row.closing_balance || 0) >= 0 ? 'DR' : 'CR'}</td>
      `;
      if (!hideBardan) {
        r += `
          <td style="text-align:right">${Math.abs(parseFloat(row.bardan_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(row.bardan_balance || 0) >= 0 ? 'DR' : 'CR'}</td>
          <td style="text-align:right">${parseFloat(row.bardan_self_jama || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td style="text-align:right">${Math.abs((parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0)) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0) >= 0 ? 'DR' : 'CR'}</td>
        `;
      }
      return `<tr>${r}</tr>`;
    });

    const tfootRow = hideBardan ?
      `<td colspan="5" style="text-align:right; font-weight:bold;">CONSOLIDATED TOTALS</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
       <td style="text-align:right; font-weight:bold;">${Math.abs(parseFloat(totals.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(totals.closing_balance || 0) >= 0 ? 'DR' : 'CR'}</td>` :
      `<td colspan="5" style="text-align:right; font-weight:bold;">CONSOLIDATED TOTALS</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
       <td style="text-align:right; font-weight:bold;">${Math.abs(parseFloat(totals.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(totals.closing_balance || 0) >= 0 ? 'DR' : 'CR'}</td>
       <td colspan="3"></td>`;

    win.document.write(`
      <html>
        <head>
          <title>Sabhasad Ledger Summary</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Helvetica', sans-serif; color: #1f2937; margin: 0; padding: 0; font-size: 9pt; }
            .header-bar { background: #1e40af; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; -webkit-print-color-adjust: exact; }
            .header-bar h1 { margin: 0; font-size: 14pt; font-weight: 700; letter-spacing: -0.025em; }
            .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; padding: 15px 20px; border-bottom: 2px solid #e5e7eb; }
            .info-item { font-size: 8pt; color: #6b7280; font-weight: 600; text-transform: uppercase; }
            .info-value { font-size: 10pt; color: #111827; font-weight: 700; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f8fafc; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 7.5pt; padding: 8px 10px; border: 1px solid #e2e8f0; text-align: left; }
            td { padding: 8px 10px; border: 1px solid #e2e8f0; font-size: 8.5pt; color: #334155; }
            tr:nth-child(even) { background: #f1f5f9; }
            .footer { position: fixed; bottom: 0; width: 100%; padding: 10px 20px; font-size: 7pt; color: #94a3b8; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; }
            tfoot td { background: #1e293b; color: white; border: none; padding: 10px; }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <h1>${cName.toUpperCase()}</h1>
            <div style="font-weight: 600; font-size: 9pt; opacity: 0.9;">SABHASAD LEDGER SUMMARY</div>
          </div>
          
          <div class="info-grid">
            <div>
              <div class="info-item">Registry Period</div>
              <div class="info-value">${new Date(dateRange.startDate).toLocaleDateString('en-GB')} to ${new Date(dateRange.endDate).toLocaleDateString('en-GB')}</div>
            </div>
            <div style="text-align: right">
              <div class="info-item">Report Generation</div>
              <div class="info-value">${new Date().toLocaleString('en-IN')}</div>
            </div>
          </div>

          <table>
            <thead><tr>${thCols}</tr></thead>
            <tbody>${rows.join('')}</tbody>
            <tfoot><tr>${tfootRow}</tr></tfoot>
          </table>
          
          <div class="footer">
            <div>${cName} - Audit Connectivity Protocol Active</div>
            <div>Generated by Antigravity OS / Accounting Suite v2.0</div>
            <div>Page 1 of 1</div>
          </div>
          
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
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
    } catch (e) {
      console.warn('Could not load Gujarati font', e);
    }
  };

  const handleExportPDF = async () => {
    if (data.length === 0) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    await addGujaratiFont(doc);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 32;
    const navy = [37, 99, 235], white = [255, 255, 255], gray = [100, 116, 139], dark = [30, 41, 59], stripe = [241, 245, 249];
    const cName = company ? (company.company_name || 'Company') : 'Company';

    const hdr = () => {
      doc.setFillColor(...navy); doc.rect(0, 0, W, 28, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...white);
      doc.text(cName.toUpperCase(), M, 18);
      doc.setFontSize(7.5); doc.setTextColor(191, 219, 254);
      doc.text('SABHASAD LEDGER SUMMARY REGISTRY', W / 2, 18, { align: 'center' });
      doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
      doc.text('AUDIT CERTIFIED', W - M, 18, { align: 'right' });
    };

    const ftr = (pg, tot) => {
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4);
      doc.line(M, H - 18, W - M, H - 18);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text(cName + ' - Sabhasad Ledger Registry', M, H - 9);
      doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' });
      doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' });
    };

    hdr();
    let y = 62;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...navy);
    doc.text('Ledger Summary Registry', M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text('PERIOD: ' + dateRange.startDate + ' to ' + dateRange.endDate, M, y + 13);
    doc.text('GENERATED: ' + new Date().toLocaleString('en-IN'), W - M, y + 13, { align: 'right' });
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
    y += 32;

    const head = hideBardan ?
      [['Sr', 'Code', 'Member Name', 'Account', 'Date', 'Debit (+)', 'Credit (-)', 'Closing']] :
      [['Sr', 'Code', 'Member Name', 'Account', 'Date', 'Debit (+)', 'Credit (-)', 'Closing', 'Bardan Bal', 'Self Jama', 'Bardan Amt']];

    const body = data.map((row, i) => {
      const base = [
        String(i + 1).padStart(3, '0'),
        row.member_code || '-',
        row.member_name || '-',
        row.account_name || '-',
        row.last_activity_date ? new Date(row.last_activity_date).toLocaleDateString('en-GB') : '-',
        parseFloat(row.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        parseFloat(row.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        Math.abs(parseFloat(row.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' ' + (parseFloat(row.closing_balance || 0) >= 0 ? 'DR' : 'CR')
      ];
      if (!hideBardan) {
        base.push(
          Math.abs(parseFloat(row.bardan_balance || 0)).toLocaleString('en-IN') + ' ' + (parseFloat(row.bardan_balance || 0) >= 0 ? 'DR' : 'CR'),
          parseFloat(row.bardan_self_jama || 0).toLocaleString('en-IN'),
          Math.abs((parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0)) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' ' + (parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0) >= 0 ? 'DR' : 'CR')
        );
      }
      return base;
    });

    const foot = hideBardan ?
      [['', '', '', 'TOTALS', '', parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), Math.abs(parseFloat(totals.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' ' + (parseFloat(totals.closing_balance || 0) >= 0 ? 'DR' : 'CR')]] :
      [['', '', '', 'TOTALS', '', parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), Math.abs(parseFloat(totals.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' ' + (parseFloat(totals.closing_balance || 0) >= 0 ? 'DR' : 'CR'), '', '', '']];

    autoTable(doc, {
      startY: y,
      head: head,
      body: body,
      foot: foot,
      theme: 'grid',
      styles: { font: 'NotoGujarati', fontSize: 6.5, cellPadding: [3, 4], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { font: 'helvetica', fillColor: navy, textColor: white, fontStyle: 'bold', fontSize: 6.5 },
      footStyles: { font: 'helvetica', fillColor: navy, textColor: white, fontStyle: 'bold', fontSize: 6.5 },
      alternateRowStyles: { fillColor: stripe },
      margin: { left: M, right: M },
      columnStyles: {
        0: { cellWidth: 20 }, // Sr
        1: { cellWidth: 25 }, // Code
        2: { cellWidth: 'auto' }, // Member Name
        3: { cellWidth: 70 }, // Account
        4: { cellWidth: 45 }, // Date
        5: { halign: 'right', cellWidth: 50 }, // Debit
        6: { halign: 'right', cellWidth: 50 }, // Credit
        7: { halign: 'right', fontStyle: 'bold', cellWidth: 55 }, // Closing
        8: { halign: 'right', cellWidth: 45 }, // Bardan Bal
        9: { halign: 'right', cellWidth: 40 }, // Self Jama
        10: { halign: 'right', cellWidth: 55 }, // Bardan Amt
      },
      didDrawPage: (pageData) => {
        if (pageData.pageNumber > 1) hdr();
      }
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i = 1; i <= tot; i++) { doc.setPage(i); ftr(i, tot); }

    doc.save(`Sabhasad_Ledger_${dateRange.startDate}_${dateRange.endDate}.pdf`);
  };

  const clearFilters = () => {
    setAccountId('all');
    setAccCode('');
    setAccName('');
    setMemberId('all');
    setMemCode('');
    setMemName('');
    setHideZeroBalance(false);
    setDateRange({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleSelectAcc = (acc) => {
    setAccountId(acc?.id || 'all');
    setAccCode(acc ? String(acc.id) : '');
    setAccName(acc ? acc.account_name : 'ALL ACCOUNTS');
    setShowAccDrop(false);
  };

  const handleSelectMem = (mem) => {
    setMemberId(mem?.id || 'all');
    setMemCode(mem ? String(mem.id) : '');
    setMemName(mem ? mem.member_name : 'ALL MEMBERS');
    setShowMemDrop(false);
  };

  useEffect(() => {
    if (accCode && accountId === 'all') {
      const match = accounts.find(a => String(a.id) === accCode && a.is_subledger);
      if (match) handleSelectAcc(match);
    } else if (!accCode && accountId !== 'all') {
      handleSelectAcc(null);
    }
  }, [accCode]);

  useEffect(() => {
    if (memCode && memberId === 'all') {
      const match = members.find(m => String(m.id) === memCode);
      if (match) handleSelectMem(match);
    } else if (!memCode && memberId !== 'all') {
      handleSelectMem(null);
    }
  }, [memCode]);

  useEffect(() => {
    if (company?.id) {
      fetchReportData();
    }
  }, [dateRange.startDate, dateRange.endDate, accountId, memberId, hideZeroBalance]);

  const filteredAccs = accounts.filter(a =>
    (accCode ? String(a.id).includes(accCode) : true) &&
    (accName ? a.account_name.toLowerCase().includes(accName.toLowerCase()) : true)
  );

  const filteredMems = members.filter(m =>
    (memCode ? String(m.id).includes(memCode) : true) &&
    (memName ? m.member_name.toLowerCase().includes(memName.toLowerCase()) : true)
  );

  if (loading || !company) return <Loading />;

  const selectedAcc = accounts.find(a => a.id === parseInt(accountId));
  const isDangar = selectedAcc?.account_code === 'DS0001' || selectedAcc?.account_name?.toLowerCase().includes('dangar system');
  const isInterest = selectedAcc?.account_code === 'IK0001' || selectedAcc?.account_name?.toLowerCase().includes('interest khate');
  const isBrokerage = selectedAcc?.account_name?.toLowerCase().includes('brokerage');
  const isLabour = selectedAcc?.account_name?.toLowerCase().includes('labour');
  const hideBardan = selectedAcc?.account_name?.toLowerCase().includes('member adv');

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans select-none text-zinc-900">
      <Toast message={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />

      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">

        {/* Superior Header */}
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 select-none">
                <Users size={20} className="text-zinc-600" />
                Sabhasad Ledger Summary
              </h1>
              <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider select-none">
                Reports / Member Ledger Analytics
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={clearFilters} className="px-4 py-2 bg-white border border-zinc-300 text-zinc-600 rounded-none shadow-sm hover:bg-zinc-50 transition font-bold text-xs flex items-center gap-2 select-none uppercase">
                <X size={14} /> Clear
              </button>
              <button onClick={fetchReportData} className="px-4 py-2 bg-blue-600 border border-blue-500 text-white rounded-none shadow-sm hover:bg-blue-700 transition font-bold text-xs flex items-center gap-2 select-none uppercase">
                <RefreshCcw size={14} className={syncing ? 'animate-spin' : ''} /> Sync Report
              </button>
              <button onClick={handlePrint} className="px-4 py-2 bg-white border border-zinc-300 text-zinc-600 rounded-none shadow-sm hover:bg-zinc-50 transition font-bold text-xs flex items-center gap-2 select-none uppercase">
                <Printer size={14} /> Print
              </button>
              <button onClick={handleExportPDF} className="px-4 py-2 bg-white border border-zinc-300 text-zinc-600 rounded-none shadow-sm hover:bg-zinc-50 transition font-bold text-xs flex items-center gap-2 select-none uppercase">
                <FileText size={14} /> PDF
              </button>
            </div>
          </div>

          {/* Intelligence Control Console */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-5 bg-zinc-50 border border-zinc-200 rounded-none">
            <div className="md:col-span-3 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Start Date</span>
                <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-xs text-zinc-700" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">End Date</span>
                <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-xs text-zinc-700" />
              </div>
            </div>

            <div className="md:col-span-3 relative space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Account Nomenclature</span>
              <div className="relative group">
                <Hash size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={accCode}
                  onChange={(e) => { setAccCode(e.target.value); setShowAccDrop(true); }}
                  onFocus={() => { setShowAccDrop(true); setShowMemDrop(false); }}
                  placeholder="ID / NAME"
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-xs text-zinc-700"
                />
              </div>

              {showAccDrop && (
                <div className="absolute top-[60px] left-0 right-0 bg-white border border-zinc-300 shadow-xl rounded-none z-[100] overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <div onClick={() => handleSelectAcc(null)} className="px-4 py-2 hover:bg-zinc-50 cursor-pointer font-bold text-[10px] text-blue-600 border-b border-zinc-200 uppercase tracking-widest">ALL ACCOUNTS</div>
                    {filteredAccs.map(a => (
                      <div key={a.id} onClick={() => handleSelectAcc(a)} className="px-4 py-2 hover:bg-blue-50 flex justify-between items-center cursor-pointer border-b border-zinc-100 last:border-none group">
                        <span className="text-[11px] font-bold text-zinc-700 group-hover:text-blue-600 transition-colors uppercase">{a.account_name}</span>
                        <span className="text-[10px] font-mono text-zinc-400">#{a.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-4 relative space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Member Identity</span>
              <div className="flex gap-2">
                <div className="w-24 relative">
                  <Hash size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={memCode}
                    onChange={(e) => { setMemCode(e.target.value); setShowMemDrop(true); }}
                    onFocus={() => { setShowMemDrop(true); setShowAccDrop(false); }}
                    placeholder="ID"
                    className="w-full pl-9 pr-2 py-1.5 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-xs text-zinc-700"
                  />
                </div>
                <div className="flex-1 relative">
                  <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={memName}
                    onChange={(e) => { setMemName(e.target.value); setShowMemDrop(true); }}
                    onFocus={() => { setShowMemDrop(true); setShowAccDrop(false); }}
                    placeholder="NAME SEARCH"
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-xs text-zinc-700 uppercase"
                  />
                </div>
              </div>

              {showMemDrop && (
                <div className="absolute top-[60px] left-0 right-0 bg-white border border-zinc-300 shadow-xl rounded-none z-[100] overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <div onClick={() => handleSelectMem(null)} className="px-4 py-2 hover:bg-zinc-50 cursor-pointer font-bold text-[10px] text-blue-600 border-b border-zinc-200 uppercase tracking-widest">ALL MEMBERS</div>
                    {filteredMems.map(m => (
                      <div key={m.id} onClick={() => handleSelectMem(m)} className="px-4 py-2 hover:bg-blue-50 flex justify-between items-center cursor-pointer border-b border-zinc-100 last:border-none group">
                        <span className="text-[11px] font-bold text-zinc-700 group-hover:text-blue-600 transition-colors uppercase">{m.member_name}</span>
                        <span className="text-[10px] font-mono text-zinc-400">#{m.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex items-center justify-end h-[42px] pt-4">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={hideZeroBalance} onChange={(e) => setHideZeroBalance(e.target.checked)} className="w-4 h-4 text-blue-600 border-zinc-300 rounded-none focus:ring-0 focus:ring-offset-0" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Hide Zero Bal</span>
              </label>
            </div>
          </div>
        </div>

        {/* Summary Metric Grid — Village style */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Opening Balance</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">
              ₹{Math.abs(parseFloat(totals.opening_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} <span className="text-sm">{parseFloat(totals.opening_balance || 0) >= 0 ? 'DR' : 'CR'}</span>
            </span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Debit (+)</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">
              ₹{parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Credit (-)</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">
              ₹{parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Closing Balance</span>
            <span className="text-2xl font-bold font-mono text-blue-600 mt-1">
              ₹{Math.abs(parseFloat(totals.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} <span className="text-sm">{parseFloat(totals.closing_balance || 0) >= 0 ? 'DR' : 'CR'}</span>
            </span>
          </div>
        </div>

        {/* Ledger Registry */}
        <div className="bg-white border border-zinc-300 shadow-sm overflow-hidden flex flex-col min-h-[600px] relative">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Sabhasad Registry Summary
              </span>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5">
                {data.length} RECORDS
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchReportData}
                className="p-1.5 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm"
                title="Refresh Registry"
              >
                <RefreshCcw size={14} className={syncing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto scroller-airy">
            <table className="w-full text-left border-collapse select-none">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600 font-mono text-xs">
                  <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200">Sr No</th>
                  <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200">Code</th>
                  <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 min-w-[200px]">Member Name</th>
                  {(() => {
                    if (isDangar) {
                      return (
                        <>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200">Date</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 text-right">Purches Rate</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200">Item Name</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200">Class</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200">Season</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 text-right">Total Qty (Qt)</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 text-right text-blue-600">Total Rate</th>
                        </>
                      );
                    }
                    if (isInterest) {
                      return (
                        <>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200">Accrual Date</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 text-right">Interest Rate (%)</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200">Days</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 min-w-[150px]">Reference</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 text-right text-blue-600">Interest Amount</th>
                        </>
                      );
                    }
                    if (isBrokerage) {
                      return (
                        <>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200">Date</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200">Invoice No</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 min-w-[150px]">Description</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 text-right text-blue-600">Brokerage Amount</th>
                        </>
                      );
                    }
                    if (isLabour) {
                      return (
                        <>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200">Date</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200">Invoice No</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 min-w-[150px]">Description</th>
                          <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 text-right text-blue-600">Labour Amount</th>
                        </>
                      );
                    }
                    return (
                      <>
                        <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 min-w-[150px]">Account Name</th>
                        <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200">Date</th>
                        <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 text-right">Debit (+)</th>
                        <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 text-right">Credit (-)</th>
                        <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 text-right">Closing</th>
                        {!hideBardan && (
                          <>
                            <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 text-right text-indigo-600">Bardan Bal</th>
                            <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 text-right text-emerald-600">Self Jama</th>
                            <th className="px-6 py-4 uppercase tracking-widest font-bold border-r border-zinc-200 text-right text-blue-600">Bardan Amt</th>
                          </>
                        )}
                      </>
                    );
                  })()}
                  <th className="px-6 py-4 uppercase tracking-widest font-bold text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {syncing ? (
                  <tr>
                    <td colSpan="12" className="py-32 text-center">
                      <RefreshCcw size={48} className="animate-spin text-zinc-200 mx-auto mb-4" />
                      <p className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest italic">Synchronizing Registry...</p>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="py-32 text-center text-zinc-300 font-bold uppercase text-[10px] tracking-[0.4em] italic bg-zinc-50/30">
                      <Database size={56} className="mx-auto mb-4 opacity-50" strokeWidth={1} />
                      No Sabhasad Records Found
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.map((row, idx) => (
                      <tr key={idx} className="group hover:bg-zinc-50 transition-all duration-300">
                        <td className="px-6 py-4 text-zinc-400 border-r border-zinc-100">{String(idx + 1).padStart(3, '0')}</td>
                        <td className="px-6 py-4 text-blue-600 font-bold border-r border-zinc-100 italic">{row.member_code}</td>
                        <td className="px-6 py-4 font-bold text-zinc-800 uppercase border-r border-zinc-100">{row.member_name}</td>
                        {(() => {
                          if (isDangar) {
                            return (
                              <>
                                <td className="px-6 py-4 text-zinc-400 border-r border-zinc-100 italic">{new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
                                <td className="px-6 py-4 text-right font-bold text-blue-600 border-r border-zinc-100">₹{parseFloat(row.rate || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-4 text-zinc-500 uppercase border-r border-zinc-100">{row.item_name || 'Item'}</td>
                                <td className="px-6 py-4 text-zinc-400 uppercase border-r border-zinc-100">{row.quality_class || '1st'}</td>
                                <td className="px-6 py-4 text-amber-600 uppercase border-r border-zinc-100">{row.book_type || 'Season'}</td>
                                <td className="px-6 py-4 text-right font-bold text-indigo-600 border-r border-zinc-100">{parseFloat(row.net_quintal || 0).toFixed(2)} <span className="text-[9px] opacity-50 font-sans ml-1">Qt</span></td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600 border-r border-zinc-100">₹{parseFloat(row.amount || 0).toLocaleString('en-IN')}</td>
                              </>
                            );
                          }
                          if (isInterest) {
                            return (
                              <>
                                <td className="px-6 py-4 text-zinc-400 border-r border-zinc-100 italic">{new Date(row.transaction_date).toLocaleDateString('en-GB')}</td>
                                <td className="px-6 py-4 text-right font-bold text-blue-600 border-r border-zinc-100">{parseFloat(row.interest_percent || 0).toFixed(2)} %</td>
                                <td className="px-6 py-4 text-zinc-500 border-r border-zinc-100">{row.days || 0} Days</td>
                                <td className="px-6 py-4 text-zinc-400 uppercase border-r border-zinc-100">{row.description || 'Interest'}</td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600 border-r border-zinc-100">₹{parseFloat(row.interest_amount || 0).toLocaleString('en-IN')}</td>
                              </>
                            );
                          }
                          if (isBrokerage) {
                            return (
                              <>
                                <td className="px-6 py-4 text-zinc-400 border-r border-zinc-100 italic">{new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
                                <td className="px-6 py-4 text-blue-500 italic border-r border-zinc-100">{row.invoice_no}</td>
                                <td className="px-6 py-4 text-zinc-400 uppercase border-r border-zinc-100">{row.description}</td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600 border-r border-zinc-100">₹{parseFloat(row.amount || 0).toLocaleString('en-IN')}</td>
                              </>
                            );
                          }
                          if (isLabour) {
                            return (
                              <>
                                <td className="px-6 py-4 text-zinc-400 border-r border-zinc-100 italic">{new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
                                <td className="px-6 py-4 text-blue-500 italic border-r border-zinc-100">{row.invoice_no}</td>
                                <td className="px-6 py-4 text-zinc-400 uppercase border-r border-zinc-100">{row.description}</td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600 border-r border-zinc-100">₹{parseFloat(row.amount || 0).toLocaleString('en-IN')}</td>
                              </>
                            );
                          }
                          return (
                            <>
                              <td className="px-6 py-4 text-zinc-400 uppercase border-r border-zinc-100">{row.account_name}</td>
                              <td className="px-6 py-4 text-zinc-400 border-r border-zinc-100 italic">
                                {row.last_activity_date ? new Date(row.last_activity_date).toLocaleDateString('en-GB') : '-'}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-blue-600 border-r border-zinc-100">₹{parseFloat(row.debit || 0).toLocaleString('en-IN')}</td>
                              <td className="px-6 py-4 text-right font-bold text-red-600 border-r border-zinc-100">₹{parseFloat(row.credit || 0).toLocaleString('en-IN')}</td>
                              <td className={`px-6 py-4 text-right font-bold border-r border-zinc-100 ${parseFloat(row.closing_balance || 0) >= 0 ? 'text-zinc-800' : 'text-red-600'}`}>
                                ₹{Math.abs(parseFloat(row.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {parseFloat(row.closing_balance || 0) >= 0 ? 'DR' : 'CR'}
                              </td>
                              {!hideBardan && (
                                <>
                                  <td className={`px-6 py-4 text-right font-bold border-r border-zinc-100 ${parseFloat(row.bardan_balance || 0) <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {Math.abs(parseFloat(row.bardan_balance || 0)).toLocaleString()} {parseFloat(row.bardan_balance || 0) >= 0 ? 'DR' : 'CR'}
                                  </td>
                                  <td className="px-6 py-4 text-right font-bold text-emerald-600 border-r border-zinc-100">
                                    {parseFloat(row.bardan_self_jama || 0).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 text-right font-bold text-blue-600 border-r border-zinc-100">
                                    ₹{Math.abs(parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0) >= 0 ? 'DR' : 'CR'}
                                  </td>
                                </>
                              )}
                            </>
                          );
                        })()}
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => openAudit(row)}
                            className="p-2 bg-zinc-100 text-blue-600 border border-zinc-200 rounded hover:bg-blue-600 hover:text-white transition shadow-sm"
                            title="Audit Ledger"
                          >
                            <Activity size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-blue-600 font-bold text-white uppercase text-[11px] tracking-widest ">
                      <td colSpan="4" className="px-6 py-4 text-right">CONSOLIDATED SUMMARY</td>
                      {(() => {
                        if (isDangar) {
                          return (
                            <>
                              <td className="px-6 py-4 text-right">SUMMARY</td>
                              <td colSpan="3" className="px-6 py-4 text-right text-lg tracking-tighter">
                                {data.reduce((acc, r) => acc + parseFloat(r.net_quintal || 0), 0).toFixed(2)} <span className="text-[10px] opacity-70 ml-1">Qt</span>
                              </td>
                              <td colSpan="1" className="px-6 py-4 text-right text-lg tracking-tighter">
                                ₹{data.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0).toLocaleString('en-IN')}
                              </td>
                            </>
                          );
                        }
                        if (isInterest) {
                          return (
                            <>
                              <td className="px-6 py-4 text-right">TOTAL ACCRUAL</td>
                              <td colSpan="4" className="px-6 py-4 text-right text-lg tracking-tighter">
                                ₹{data.reduce((acc, r) => acc + parseFloat(r.interest_amount || 0), 0).toLocaleString('en-IN')}
                              </td>
                            </>
                          );
                        }
                        if (isBrokerage || isLabour) {
                          return (
                            <>
                              <td className="px-6 py-4 text-right">TOTAL BROKERAGE</td>
                              <td colSpan="3" className="px-6 py-4 text-right text-lg tracking-tighter">
                                ₹{data.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0).toLocaleString('en-IN')}
                              </td>
                            </>
                          );
                        }
                        if (isLabour) {
                          return (
                            <>
                              <td className="px-6 py-4 text-right">TOTAL LABOUR</td>
                              <td colSpan="3" className="px-6 py-4 text-right text-lg tracking-tighter">
                                ₹{data.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0).toLocaleString('en-IN')}
                              </td>
                            </>
                          );
                        }
                        return (
                          <>
                            <td className="px-6 py-4 border-r border-blue-500/30"></td>
                            <td className="px-6 py-4 text-right text-white italic">₹{parseFloat(totals.debit || 0).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4 text-right text-white italic">₹{parseFloat(totals.credit || 0).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4 text-right text-white italic">₹{Math.abs(parseFloat(totals.closing_balance || 0)).toLocaleString('en-IN')} {parseFloat(totals.closing_balance || 0) >= 0 ? 'DR' : 'CR'}</td>
                            {!hideBardan && (
                              <>
                                <td className="px-6 py-4 text-right text-white">
                                  {Math.abs(data.reduce((s, r) => s + parseFloat(r.bardan_balance || 0), 0)).toLocaleString()} {data.reduce((s, r) => s + parseFloat(r.bardan_balance || 0), 0) >= 0 ? 'DR' : 'CR'}
                                </td>
                                <td className="px-6 py-4 text-right text-white">
                                  {data.reduce((s, r) => s + parseFloat(r.bardan_self_jama || 0), 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right text-white">
                                  ₹{Math.abs(data.reduce((s, r) => s + (parseFloat(r.bardan_penalty_balance || r.bardan_balance || 0) * bardanPrice), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {data.reduce((s, r) => s + parseFloat(r.bardan_penalty_balance || r.bardan_balance || 0), 0) >= 0 ? 'DR' : 'CR'}
                                </td>
                              </>
                            )}
                          </>
                        );
                      })()}
                      <td className="px-6 py-6"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Audit Modal */}
      {showAuditModal && auditMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAuditModal(false)} />

          <div className="relative w-full max-w-6xl bg-white border border-zinc-400 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] rounded-none">
            {/* Header — AccountForm style */}
            <div className="bg-zinc-100 px-5 py-3.5 border-b border-zinc-300 flex justify-between items-center select-none">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white border border-zinc-200 text-blue-600">
                  <Activity size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-tight">
                    {auditMember.member_name}
                    <span className="text-blue-600 ml-2 font-mono">#{auditMember.member_code}</span>
                  </h2>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5 tracking-wider">Audit Protocol Activation</p>
                </div>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="p-1 text-zinc-400 hover:text-red-600 transition">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scroller-airy bg-white">
              {auditLoading ? (
                <div className="py-32 text-center">
                  <RefreshCcw className="animate-spin mx-auto text-blue-500 mb-4" size={40} />
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest italic">Decrypting Ledger Stream...</p>
                </div>
              ) : (
                <div className="border border-zinc-300 overflow-hidden">
                  <table className="w-full text-left font-mono text-[11px] border-collapse">
                    <thead className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">
                      <tr>
                        <th className="px-4 py-3 border-r border-zinc-200">Date</th>
                        <th className="px-4 py-3 border-r border-zinc-200">Description</th>
                        <th className="px-4 py-3 border-r border-zinc-200">Reference</th>
                        <th className="px-4 py-3 text-right border-r border-zinc-200">Debit (+)</th>
                        <th className="px-4 py-3 text-right border-r border-zinc-200">Credit (-)</th>
                        <th className="px-4 py-3 text-right border-r border-zinc-200">Self Jama</th>
                        <th className="px-4 py-3 text-right">Running</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-bold uppercase">
                      {auditTransactions.map((tx, i) => (
                        <tr key={i} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-3 text-zinc-400 border-r border-zinc-200 italic">{new Date(tx.transaction_date).toLocaleDateString('en-GB')}</td>
                          <td className="px-4 py-3 text-zinc-800 border-r border-zinc-200">{tx.description}</td>
                          <td className="px-4 py-3 text-zinc-400 border-r border-zinc-200">{tx.reference_no}</td>
                          <td className="px-4 py-3 text-right text-blue-600 border-r border-zinc-200">₹{(parseFloat(tx.debit) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right text-red-600 border-r border-zinc-200">{parseFloat(tx.company_credit || 0) > 0 ? `₹${parseFloat(tx.company_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 border-r border-zinc-200">{parseFloat(tx.self_credit || 0) > 0 ? parseFloat(tx.self_credit).toLocaleString() : '—'}</td>
                          <td className={`px-4 py-3 text-right font-black ${parseFloat(tx.running_balance || 0) >= 0 ? 'text-zinc-800' : 'text-red-600'}`}>
                            ₹{Math.abs(parseFloat(tx.running_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            <span className="text-[9px] ml-1 opacity-50 not-italic">
                              {parseFloat(tx.running_balance || 0) >= 0 ? 'DR' : 'CR'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-zinc-100 border-t border-zinc-300 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition rounded-none uppercase text-xs"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
