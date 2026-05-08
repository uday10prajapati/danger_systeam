import React, { useState, useEffect } from 'react';
import {
  FileText, Search, Printer, Download, Filter,
  Calendar, User, Box, ArrowRight, TrendingUp,
  CreditCard, ChevronDown, ChevronRight, AlertCircle, Clock, X, Shield,
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
    bankName: '',
    season: '',
    qualityClass: ''
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
  const [company, setCompany] = useState(null);
  const [companyAccount, setCompanyAccount] = useState('');
  const [txtModal, setTxtModal] = useState(false);
  const [billModal, setBillModal] = useState(false);
  const [billSearch, setBillSearch] = useState({ from: '', to: '' });
  const [selectedBills, setSelectedBills] = useState([]);
  const [narration, setNarration] = useState('');
  const [seasons, setSeasons] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);

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
      if (cRes.data.success) {
        const compData = cRes.data.data;
        setCompany(compData);
        setCompanyAccount(compData?.company_account_no || '');
        const sRes = await api.get(`/seasons/company/${compData.id}`);
        if (sRes.data.success) {
          const sList = sRes.data.data || [];
          setSeasons(sList);
          if (sList.length > 0) setCurrentSeason(sList[0]);
        }
      }
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
        if (filters.qualityClass) {
          rows = rows.filter(r => r.quality_class === filters.qualityClass);
        }
        if (filters.season) {
          rows = rows.filter(r => r.entries.some(e => e.season === filters.season));
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
    const aggregated = Object.values(data.reduce((acc, r) => {
      const amt = parseFloat(r.final_amount || 0);
      if (amt < 0) return acc;
      if (!acc[r.member_id]) {
        acc[r.member_id] = { ...r, final_amount: 0 };
      }
      acc[r.member_id].final_amount += amt;
      return acc;
    }, {}));

    if (!aggregated.length) { alert('No valid data to export.'); return; }
    
    const rows = aggregated.map((r, i) => ({
      'Sr.': i + 1,
      'CODE': r.member_code,
      'NAME': r.member_name,
      'ACCOUNT NUMBER': r.full_ac_number || '',
      'IFSC': r.ifsc_code || '',
      'PAYABLE AMOUNT': parseFloat(r.final_amount || 0),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
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
      if (filters.season) {
        doc.setFontSize(7); doc.setTextColor(...white);
        doc.text(`SEASON: ${filters.season}`, M, 35);
      }
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
      r.quality_class,
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
      head: [['Sr.', 'Code', 'Member Name', 'Class', 'Account No.', 'Total Qt', 'Rate/Qt', 'Rate Amt', 'Interest', 'Godown Fund', 'Bag Penalty', 'Final Amt']],
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

  const num = (value) => {
    const parsed = parseFloat(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const money = (value) => num(value).toFixed(2);

  const resolveBillMeta = (bill = {}, mList = [], bList = [], comp = null, season = null) => {
    const member = (mList || []).find(m => String(m.id) === String(bill.member_id)) || {};
    const bank = (bList || []).find(b => String(b.bank_name || '').trim().toLowerCase() === String(bill.bank_name || '').trim().toLowerCase()) || {};
    const cachedCompany = (() => {
      try { return JSON.parse(localStorage.getItem('company') || '{}'); }
      catch (e) { return {}; }
    })();

    const activeComp = comp || company || cachedCompany;
    const activeSeason = season || currentSeason;

    const companyName = activeComp?.company_name_gu || activeComp?.company_name || 'CO-OPERATIVE SOCIETY LTD.';
    const billDate = bill.entry_date || bill.date || new Date();
    const d = new Date(billDate);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    const fyS = mo >= 4 ? yr : yr - 1;
    const fyE = fyS + 1;
    const calculatedFY = `${fyS}-${fyE % 100}`;
    
    const seasonName = bill.season || activeSeason?.name || activeSeason?.season || '';
    const financialYear = bill.financial_year || activeSeason?.financial_year || activeSeason?.year || calculatedFY;

    const seasonText = seasonName 
      ? (seasonName.includes(financialYear) ? seasonName : `${seasonName} (${financialYear})`)
      : `DANGAR REPORT - ${financialYear}`;

    return {
      companyName,
      seasonText,
      memberName: bill.member_name || member.member_name || member.eng_name || 'SABHASAD',
      villageName: bill.village_name || member.village_name || member.village || '---',
      memberCode: bill.member_code || member.member_code || '---',
      bankName: bill.bank_name || member.bank_name || bank.bank_name || '---',
      branchName: bill.branch_name || member.branch_name || bank.branch_name || '---',
      accountNo: bill.full_ac_number || member.full_ac_number || bank.full_ac_number || '---',
      ifscCode: bill.ifsc_code || member.ifsc_code || bank.ifsc_code || '---',
      itemName: bill.dangar_name || bill.dangar_name_gu || bill.item_name || 'DANGAR',
      qualityClass: bill.quality_class || '1st',
    };
  };

  const ensurePdfDependencies = async () => {
    const needsMembers = !members.length;
    const needsBanks = !banks.length;
    const needsCompany = !company;

    let freshMembers = members;
    let freshBanks = banks;
    let freshCompany = company;
    let freshSeason = currentSeason;

    try {
      const requests = [];
      if (needsMembers) requests.push(api.get('/members'));
      if (needsBanks) requests.push(api.get('/banks'));
      if (needsCompany) requests.push(api.get('/company'));

      if (requests.length > 0) {
        const results = await Promise.all(requests);
        let idx = 0;
        if (needsMembers) {
          const res = results[idx++];
          freshMembers = res?.data?.data || [];
          setMembers(freshMembers);
        }
        if (needsBanks) {
          const res = results[idx++];
          freshBanks = res?.data?.data || [];
          setBanks(freshBanks);
        }
        if (needsCompany) {
          const res = results[idx++];
          freshCompany = res?.data?.data;
          setCompany(freshCompany);
          if (freshCompany?.id) {
            const sRes = await api.get(`/seasons/company/${freshCompany.id}`);
            if (sRes.data.success && sRes.data.data.length > 0) {
              freshSeason = sRes.data.data[0];
              setCurrentSeason(freshSeason);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Dependency refresh failed', e);
    }
    return { freshMembers, freshBanks, freshCompany, freshSeason };
  };

  const getSeasonLabel = () => {
    if (currentSeason?.name) {
      return `${currentSeason.name} ડાંગર નો છેવટ નો હિસાબ`;
    }
    if (!filters.startDate) return "ચોમાસુ ડાંગર - ૨૦૨૪-૨૦૨૫";
    const date = new Date(filters.startDate);
    const year = date.getFullYear();
    const nextYear = year + 1;
    const enToGu = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
    const toGu = (str) => str.toString().split('').map(c => enToGu[c] || c).join('');
    return `ચોમાસુ ડાંગર - ${toGu(year)}-${toGu(nextYear)} ડાંગર નો છેવટ નો હિસાબ`;
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

    const aggregated = Object.values(data.reduce((acc, r) => {
      const amt = parseFloat(r.final_amount || 0);
      if (amt < 0) return acc;
      if (!acc[r.member_id]) {
        acc[r.member_id] = { ...r, final_amount: 0 };
      }
      acc[r.member_id].final_amount += amt;
      return acc;
    }, {}));

    if (!aggregated.length) { alert('No valid data to export.'); return; }

    const msg = fw(narration, 67, ' ', true);
    const totalAmountPaise = Math.abs(Math.round(aggregated.reduce((sum, row) => sum + parseFloat(row.final_amount || 0), 0) * 100));
    const totalAmtStr = fw(totalAmountPaise, 16);

    lines.push(('51' + '00000' + fw(companyAccount, 12) + totalAmtStr + msg).padEnd(LINE, ' ').slice(0, LINE));
    aggregated.forEach(function (row) {
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

  const downloadAllBillsPDF = async (mode = 'download') => {
    if (!selectedBills.length) return;
    try {
      setLoading(true);
      const deps = await ensurePdfDependencies() || {};
      const freshMembers = deps.freshMembers || [];
      const freshBanks = deps.freshBanks || [];
      const freshCompany = deps.freshCompany || company;
      
      // Use filtered season if selected, else default to freshSeason
      let targetSeason = deps.freshSeason || currentSeason;
      if (filters.season) {
        const found = seasons.find(s => s.season_name === filters.season);
        if (found) targetSeason = found;
      }
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      await addGujaratiFont(pdf);
      pdf.setFont('NotoGujarati', 'normal');

      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const M = 10;
      const contentW = W - (M * 2);
      const slipH = (H - (M * 2)) / 2 - 2;
      
      const navy = [15, 23, 42];
      const white = [255, 255, 255];
      const gray = [100, 116, 139];
      const dark = [30, 41, 59];

      const drawDynamicText = (p, text, x, y, options = {}, bFont = 'NotoGujarati', fFont = 'helvetica') => {
        const str = String(text || '');
        let needsRegional = false;
        for (let i = 0; i < str.length; i++) {
          if (str.charCodeAt(i) > 255) {
            needsRegional = true;
            break;
          }
        }
        p.setFont(needsRegional ? bFont : fFont, options.fontStyle || 'normal');
        p.text(str, x, y, options);
      };

      const drawSlip = (bill, yOffset, copyTitle) => {
        const meta = resolveBillMeta(bill, freshMembers, freshBanks, freshCompany, targetSeason);
        
        // Outer border
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.3);
        pdf.rect(M, yOffset, contentW, slipH);

        // Header Bar
        pdf.setFillColor(...navy);
        pdf.rect(M, yOffset, contentW, 8, 'F');
        pdf.setTextColor(...white);
        drawDynamicText(pdf, meta.companyName, M + 3, yOffset + 5.5, { fontStyle: 'bold' });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        pdf.text(copyTitle, W / 2, yOffset + 5.5, { align: 'center' });
        pdf.setTextColor(251, 191, 36);
        pdf.text('PAYMENT SLIP', W - M - 3, yOffset + 5.5, { align: 'right' });

        const headerY = yOffset + 14;
        pdf.setFontSize(13);
        pdf.setTextColor(...dark);
        drawDynamicText(pdf, meta.seasonText, W / 2, headerY, { align: 'center' });

        pdf.setFontSize(7.5);
        pdf.setFont('NotoGujarati', 'normal');
        pdf.text(`સભાસદ:`, M + 4, headerY + 6);
        drawDynamicText(pdf, meta.memberName, M + 18, headerY + 6);

        pdf.setFont('NotoGujarati', 'normal');
        pdf.text(`કોડ:`, W - M - 30, headerY + 6);
        drawDynamicText(pdf, meta.memberCode, W - M - 22, headerY + 6);

        pdf.setFont('NotoGujarati', 'normal');
        pdf.text(`ગામ:`, M + 4, headerY + 11);
        drawDynamicText(pdf, meta.villageName, M + 18, headerY + 11);

        pdf.setFont('NotoGujarati', 'normal');
        pdf.text(`તારીખ:`, W - M - 30, headerY + 11);
        pdf.setFont('helvetica', 'normal');
        pdf.text(new Date().toLocaleDateString('en-GB'), W - M - 20, headerY + 11);

        // Procurement Table
        const tableStartY = headerY + 17;
        const procRows = bill.classes.map(cls => [
          `${cls.dangar_name || meta.itemName} (${cls.quality_class || '1st'})`,
          cls.entry_count || 1,
          cls.total_quintal || '0.00',
          money(cls.rate_per_kg || cls.rate || 0),
          money(cls.rate_amount || 0)
        ]);

        autoTable(pdf, {
          startY: tableStartY,
          head: [["ડાંગર નું નામ (ક્લાસ)", "ગુણ", "વજન", "ભાવ (કવી)", "કિંમત ૨."]],
          body: procRows,
          theme: 'grid',
          margin: { left: M + 4, right: M + 4 },
          tableWidth: contentW - 8,
          styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.5, textColor: dark, lineWidth: 0.1, halign: 'center', fontStyle: 'normal' },
          headStyles: { font: 'NotoGujarati', fillColor: [241, 245, 249], textColor: dark, fontStyle: 'normal' },
          columnStyles: { 0: { cellWidth: 'auto', halign: 'left' }, 1: { cellWidth: 12 }, 2: { cellWidth: 18 }, 3: { cellWidth: 18 }, 4: { halign: 'right', cellWidth: 22 } },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 0) {
              const isGu = /[\u0a80-\u0aff]/.test(data.cell.text[0] || '');
              data.cell.styles.font = isGu ? 'NotoGujarati' : 'helvetica';
            }
          }
        });

        const midY = pdf.lastAutoTable.finalY + 4;
        const boxW = (contentW - 12) / 2;
        pdf.setDrawColor(203, 213, 225);
        pdf.rect(M + 4, midY, boxW, 42);
        
        pdf.setFontSize(7.5);
        pdf.setFont('NotoGujarati', 'normal');
        pdf.setTextColor(...gray);
        pdf.text('બેંક વિગત / બેંક નું નામ', M + 6, midY + 4);
        
        pdf.setFontSize(7);
        pdf.setTextColor(...dark);
        drawDynamicText(pdf, `Bank: ${meta.bankName}`, M + 6, midY + 11);
        drawDynamicText(pdf, `A/c No: ${meta.accountNo}`, M + 6, midY + 18);
        drawDynamicText(pdf, `IFSC: ${meta.ifscCode}`, M + 6, midY + 25);
        
        pdf.setFont('NotoGujarati', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(...gray);
        pdf.text('* Computer Generated Audit Slip', M + 6, midY + 38);

        const summaryRows = [
          ['ડાંગર હિસાબ ના જમા', money(bill.total_rate_amt), ''],
          ['ડાંગર એડવાન્સ', '', money(bill.total_adv)],
          ['ખાલી બારદાન કપાત', '', money(bill.total_bardan_penalty)],
          ['ડાં.માલ ગોડા.કપાત (૧મણ ૧રૂ.)', '', money(bill.total_fund)],
          ['વ્યાજ', '', money(bill.total_int)],
          ...bill.all_other_deductions.map(od => [od.account_name, '', money(od.amount)])
        ];

        autoTable(pdf, {
          startY: midY,
          head: [['વિગત', 'જમા રકમ', 'ઉધાર રકમ']],
          body: summaryRows,
          theme: 'grid',
          margin: { left: M + 4 + boxW + 4, right: M + 4 },
          tableWidth: boxW,
          styles: { font: 'NotoGujarati', fontSize: 6.5, cellPadding: 1, textColor: dark, lineWidth: 0.1, fontStyle: 'normal' },
          headStyles: { fillColor: [241, 245, 249], textColor: dark, fontStyle: 'normal', halign: 'center' },
          columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 16 }, 2: { halign: 'right', cellWidth: 16 } }
        });

        const totalY = Math.max(pdf.lastAutoTable.finalY + 1, midY + 44);
        pdf.setFillColor(...navy);
        pdf.rect(M + 4 + boxW + 4, totalY, boxW, 8, 'F');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...white);
        pdf.text('બાકી નીકળતી રકમ', M + 4 + boxW + 6, totalY + 5.5);
        pdf.text(`₹ ${money(bill.total_final)}`, W - M - 6, totalY + 5.5, { align: 'right' });

        const footerY = yOffset + slipH - 6;
        pdf.setFontSize(7);
        pdf.setTextColor(...dark);
        pdf.text('લેનારની સહી', M + contentW * 0.15, footerY, { align: 'center' });
        pdf.text('સેક્રેટરી ની સહી', M + contentW * 0.5, footerY, { align: 'center' });
        pdf.text('મેનેજર ની સહી', M + contentW * 0.85, footerY, { align: 'center' });
      };

      const groupedMap = selectedBills.reduce((acc, b) => {
        if (!acc[b.member_id]) {
          acc[b.member_id] = {
            ...b,
            classes: [],
            total_final: 0, total_rate_amt: 0, total_adv: 0, total_fund: 0, total_int: 0, total_bardan_penalty: 0, all_other_deductions: []
          };
        }
        acc[b.member_id].classes.push(b);
        acc[b.member_id].total_final += parseFloat(b.final_amount || 0);
        acc[b.member_id].total_rate_amt += parseFloat(b.rate_amount || 0);
        acc[b.member_id].total_adv += parseFloat(b.member_advance || 0);
        acc[b.member_id].total_fund += parseFloat(b.godown_fund || 0);
        acc[b.member_id].total_int += parseFloat(b.total_interest || 0);
        acc[b.member_id].total_bardan_penalty += parseFloat(b.bardan_penalty || 0);
        if (b.other_deductions) {
          b.other_deductions.forEach(od => {
            const existing = acc[b.member_id].all_other_deductions.find(x => x.account_name === od.account_name);
            if (existing) existing.amount = (parseFloat(existing.amount) + parseFloat(od.amount)).toFixed(2);
            else acc[b.member_id].all_other_deductions.push({...od});
          });
        }
        return acc;
      }, {});

      const billList = Object.values(groupedMap);
      billList.forEach((bill, i) => {
        if (i > 0) pdf.addPage();
        drawSlip(bill, M, 'CUSTOMER COPY');
        drawSlip(bill, M + slipH + 4, 'OFFICE COPY');
        pdf.setLineDashPattern([2, 2], 0);
        pdf.line(M, M + slipH + 2, W - M, M + slipH + 2);
        pdf.setLineDashPattern([], 0);
      });

      if (mode === 'print') {
        pdf.autoPrint();
        window.open(pdf.output('bloburl'), '_blank');
      } else {
        pdf.save(`Dangar_Slips_${new Date().getTime()}.pdf`);
      }
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Season</label>
              <select
                className="w-full px-4 py-2 bg-white border border-zinc-300 focus:border-zinc-500 outline-none font-bold text-sm text-zinc-700 appearance-none uppercase"
                value={filters.season}
                onChange={(e) => setFilters({ ...filters, season: e.target.value })}
              >
                <option value="">ALL SEASONS</option>
                {seasons.map(s => (
                  <option key={s.id} value={s.name}>{s.name} ({s.financial_year})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Class</label>
              <select
                className="w-full px-4 py-2 bg-white border border-zinc-300 focus:border-zinc-500 outline-none font-bold text-sm text-zinc-700 appearance-none uppercase"
                value={filters.qualityClass}
                onChange={(e) => setFilters({ ...filters, qualityClass: e.target.value })}
              >
                <option value="">ALL CLASSES</option>
                <option value="1st">1st Class</option>
                <option value="2nd">2nd Class</option>
                <option value="3rd">3rd Class</option>
              </select>
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
                  <th scope="col" className="px-4 py-2 border-r border-zinc-200 select-none">Class</th>
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
                  }).map((row, i, arr) => {
                    const isFirstOfMember = i === 0 || arr[i - 1].member_id !== row.member_id;
                    return (
                      <tr key={`${row.member_id}-${row.quality_class}`} className="hover:bg-zinc-50/60 transition-all select-none border-b border-zinc-100">
                        <td className="px-4 py-3 border-r border-zinc-200 text-xs font-bold text-zinc-400 text-center select-none">{i + 1}</td>
                        <td className={`px-4 py-3 border-r border-zinc-200 select-none ${!isFirstOfMember ? 'opacity-20' : ''}`}>
                          {isFirstOfMember && (
                            <>
                              <p className="text-sm font-bold text-slate-800 uppercase tracking-tight font-sans italic">{row.member_name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">CODE: {row.member_code}</p>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 border-r border-zinc-200 select-none font-bold text-zinc-600 uppercase text-center">
                          {row.quality_class}
                        </td>
                        <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-slate-600 text-sm font-mono select-none">{row.total_quintal}</td>
                        <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-zinc-800 text-sm font-mono select-none">₹{row.rate_amount}</td>
                        <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-rose-600 text-sm font-mono select-none">₹{row.member_advance}</td>
                        <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-blue-600 text-sm font-mono select-none">₹{row.total_interest}</td>
                        <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-zinc-800 text-sm font-mono select-none">₹{row.godown_fund}</td>
                        <td className="px-4 py-3 border-r border-zinc-200 text-right select-none">
                          <p className="text-sm font-bold text-amber-600 font-mono">₹{row.bardan_penalty}</p>
                          {isFirstOfMember && <p className="text-[9px] font-bold text-slate-400 font-sans uppercase tracking-wider">{row.bardan_remaining} BAGS</p>}
                        </td>
                        <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-rose-600 text-sm font-mono select-none">₹{row.total_deductions}</td>
                        <td className="px-4 py-3 text-right select-none">
                          <span className="text-base font-black text-emerald-600 tracking-tighter bg-emerald-50/50 px-3 py-1 border border-emerald-200/60 font-mono select-none">₹{row.final_amount}</span>
                        </td>
                      </tr>
                    );
                  })
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
                    <button onClick={() => downloadAllBillsPDF('print')} className="flex-1 py-4 bg-blue-600 text-white rounded-lg font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"><Printer size={16} /> Print</button>
                    <button onClick={() => downloadAllBillsPDF('download')} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><Download size={16} /> PDF</button>
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

      {/* A4 Printable Bills - Two Copies */}
      <div className="hidden print:block">
        {(() => {
          // Group selected bills by member for consolidated view
          const groupedMap = selectedBills.reduce((acc, b) => {
            if (!acc[b.member_id]) {
              acc[b.member_id] = {
                ...b,
                classes: [],
                total_final: 0,
                total_rate_amt: 0,
                total_adv: 0,
                total_kapat: 0,
                total_fund: 0,
                total_int: 0,
                total_other: 0,
                total_bardan_penalty: 0,
                all_other_deductions: []
              };
            }
            acc[b.member_id].classes.push(b);
            acc[b.member_id].total_final += parseFloat(b.final_amount || 0);
            acc[b.member_id].total_rate_amt += parseFloat(b.rate_amount || 0);
            acc[b.member_id].total_adv += parseFloat(b.member_advance || 0);
            acc[b.member_id].total_fund += parseFloat(b.godown_fund || 0);
            acc[b.member_id].total_int += parseFloat(b.total_interest || 0);
            acc[b.member_id].total_bardan_penalty += parseFloat(b.bardan_penalty || 0);
            if (b.other_deductions) {
              b.other_deductions.forEach(od => {
                 acc[b.member_id].total_other += parseFloat(od.amount || 0);
                 const existing = acc[b.member_id].all_other_deductions.find(x => x.account_name === od.account_name);
                 if (existing) existing.amount = (parseFloat(existing.amount || 0) + parseFloat(od.amount || 0)).toFixed(2);
                 else acc[b.member_id].all_other_deductions.push({...od});
              });
            }
            return acc;
          }, {});

          return Object.values(groupedMap).map((bill, bIdx) => {
            const meta = resolveBillMeta(bill);
            const otherRows = (bill.all_other_deductions || []).map((od) => ({
              label: od.account_name || 'અન્ય કપાત',
              credit: '',
              debit: parseFloat(od.amount || 0).toFixed(2)
            }));

            const summaryRows = [
              { label: 'ડાંગર હિસાબ ના જમા', credit: parseFloat(bill.total_rate_amt || 0).toFixed(2), debit: '' },
              { label: 'ડાંગર એડવાન્સ', credit: '', debit: parseFloat(bill.total_adv || 0).toFixed(2) },
              { label: 'ખાલી બારદાન કપાત', credit: '', debit: parseFloat(bill.total_bardan_penalty || 0).toFixed(2) },
              { label: 'ડાં.માલ ગોડા.કપાત (૧મણ ૧રૂ.)', credit: '', debit: parseFloat(bill.total_fund || 0).toFixed(2) },
              { label: 'વ્યાજ', credit: '', debit: parseFloat(bill.total_int || 0).toFixed(2) },
              ...otherRows,
            ];

            const SlipCopy = ({ title }) => (
              <div className="w-full h-[148.5mm] border-b border-zinc-400 p-8 flex flex-col font-sans relative overflow-hidden" style={{ boxSizing: 'border-box' }}>
                {/* Copy Badge */}
                <div className="absolute top-4 right-4 text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{title}</div>
                
                {/* Header */}
                <div className="text-center mb-4">
                  <h1 className="text-xl font-bold text-zinc-900 mb-1 leading-none">{meta.companyName}</h1>
                  <p className="text-[11px] font-bold text-zinc-600 italic leading-none">{meta.seasonText}</p>
                </div>

                {/* Metadata Table */}
                <table className="w-full border-collapse border border-zinc-400 text-[10px] mb-3">
                  <tbody>
                    <tr className="border-b border-zinc-400">
                      <td className="w-3/5 p-1.5 border-r border-zinc-400"><b>સભાસદ નું નામ :</b> <span className="font-bold uppercase">{meta.memberName}</span></td>
                      <td className="w-2/5 p-1.5"><b>કોડ નંબર :</b> {meta.memberCode}</td>
                    </tr>
                    <tr className="border-b border-zinc-400">
                      <td className="p-1.5 border-r border-zinc-400"><b>ગામ :</b> {meta.villageName}</td>
                      <td className="p-1.5"><b>તારીખ :</b> {new Date().toLocaleDateString('en-GB')}</td>
                    </tr>
                    <tr className="border-b border-zinc-400">
                      <td className="p-1.5 border-r border-zinc-400"><b>બેંક :</b> {meta.bankName}</td>
                      <td className="p-1.5"><b>એકાઉન્ટ નંબર :</b> {meta.accountNo}</td>
                    </tr>
                    <tr>
                      <td className="p-1.5 border-r border-zinc-400"><b>શાખા નું નામ :</b> {meta.branchName}</td>
                      <td className="p-1.5"><b>IFSC :</b> {meta.ifscCode}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Procurement Table */}
                <table className="w-full border-collapse border border-zinc-400 text-[10px] mb-3">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-400">
                      <th className="p-1.5 border-r border-zinc-400 text-left">ડાંગર નું નામ (ક્લાસ)</th>
                      <th className="p-1.5 border-r border-zinc-400 text-center w-12">ગુણ</th>
                      <th className="p-1.5 border-r border-zinc-400 text-center w-18">વજન (Qt)</th>
                      <th className="p-1.5 border-r border-zinc-400 text-center w-20">ભાવ (Qt)</th>
                      <th className="p-1.5 text-right w-24">રકમ ₹</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bill.classes || []).map((cls, ci) => (
                      <tr key={ci} className="border-b border-zinc-200">
                        <td className="p-1.5 border-r border-zinc-400 font-bold uppercase">{cls.dangar_name_gu || cls.item_name_gu || cls.dangar_name || cls.item_name || meta.itemName} ({cls.quality_class || meta.qualityClass})</td>
                        <td className="p-1.5 border-r border-zinc-400 text-center">{cls.bardan_remaining || '-'}</td>
                        <td className="p-1.5 border-r border-zinc-400 text-center font-bold">{cls.total_quintal}</td>
                        <td className="p-1.5 border-r border-zinc-400 text-center">{cls.rate_per_kg}</td>
                        <td className="p-1.5 text-right font-bold">{cls.rate_amount}</td>
                      </tr>
                    ))}
                    {/* Filler rows */}
                    {[...Array(Math.max(0, 3 - (bill.classes || []).length))].map((_, i) => (
                      <tr key={`empty-${i}`} className="h-6 border-b border-zinc-100"><td colSpan={5}></td></tr>
                    ))}
                  </tbody>
                </table>

                {/* Calculation Manifest */}
                <div className="flex-1 grid grid-cols-12 gap-3">
                  <div className="col-span-5 border border-zinc-400 p-2 text-[10px] flex flex-col">
                    <table className="w-full border-collapse">
                      <tbody>
                        <tr><td className="py-1 font-bold text-zinc-500 uppercase border-b border-zinc-200" colSpan={2}>બેંક વિગત / બેંક નું નામ</td></tr>
                        <tr><td className="py-1 pr-2 font-bold w-28">કંપની :</td><td className="py-1">{meta.companyName}</td></tr>
                        <tr><td className="py-1 pr-2 font-bold">બેંક :</td><td className="py-1">{meta.bankName}</td></tr>
                        <tr><td className="py-1 pr-2 font-bold">શાખા :</td><td className="py-1">{meta.branchName}</td></tr>
                        <tr><td className="py-1 pr-2 font-bold">એકાઉન્ટ નં. :</td><td className="py-1">{meta.accountNo}</td></tr>
                        <tr><td className="py-1 pr-2 font-bold">IFSC :</td><td className="py-1">{meta.ifscCode}</td></tr>
                      </tbody>
                    </table>
                    <div className="mt-auto pt-2 border-t border-dashed border-zinc-300 italic text-zinc-400 text-[9px]">
                      * Computer Generated / Audit Purpose
                    </div>
                  </div>

                  <div className="col-span-7 border border-zinc-400 flex flex-col">
                    <table className="w-full border-collapse text-[10px] font-bold">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-400 text-[9px] text-center">
                          <th className="p-1 border-r border-zinc-400 w-[55%]">વિગત</th>
                          <th className="p-1 border-r border-zinc-400 w-[22.5%]">જમા રકમ</th>
                          <th className="p-1 w-[22.5%]">ઉધાર રકમ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryRows.map((row, idx) => (
                          <tr key={idx} className="border-b border-zinc-200">
                            <td className="p-1 border-r border-zinc-400">{row.label}</td>
                            <td className="p-1 border-r border-zinc-400 text-right">{row.credit}</td>
                            <td className="p-1 text-right">{row.debit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="mt-auto border-t-2 border-zinc-800 font-bold bg-zinc-50 grid grid-cols-12">
                      <div className="col-span-7 p-1.5 text-center text-xs border-r border-zinc-400">બાકી નીકળતી રકમ</div>
                      <div className="col-span-5 p-1.5 text-right text-base pr-4">₹ {bill.total_final.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Footer Signatures */}
                <div className="mt-auto grid grid-cols-3 text-[10px] font-bold text-center border-t border-zinc-200 pt-4">
                  <div>લેનારની સહી</div>
                  <div>સેક્રેટરી ની સહી</div>
                  <div>મેનેજર ની સહી</div>
                </div>
              </div>
            );

            return (
              <div key={bill.member_id} id={`printable-bill-${bill.member_id}`} className="hidden print:flex w-[210mm] h-[297mm] bg-white mx-auto break-after-page flex-col no-scrollbar overflow-hidden">
                <SlipCopy title="CUSTOMER COPY" />
                <div className="h-px w-full border-t border-dashed border-zinc-500 my-2"></div>
                <SlipCopy title="OFFICE COPY" />
              </div>
            );
          });
        })()}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 0; background: white !important; -webkit-print-color-adjust: exact; }
            @page {
              size: A4 portrait;
              margin: 0;
            }
            .no-scrollbar::-webkit-scrollbar { display: none; }
          }
       `}} />
    </div>
  );
};

export default DangarPaymentReport;
