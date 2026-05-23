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
import { addGujaratiFont } from '../utils/pdfFonts';
import { toISTDateInput, formatToIST } from '../utils/dateUtils';
import { toPng } from 'html-to-image';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';
import Toast from '../components/Toast';
import Loading from '../components/Loading';

const DangarPaymentReport = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    startDate: '2026-04-01',
    endDate: toISTDateInput(),
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
    totalAdvance: 0,
    totalInterest: 0,
    totalGodownFund: 0,
    totalBardanPenalty: 0,
    totalDeduction: 0,
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
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  useEffect(() => {
    const load = async () => {
      const initialData = await fetchInitialData();
      fetchReport(initialData?.members || [], initialData?.items || []);
    };

    load();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [mRes, iRes, cRes, bRes] = await Promise.all([
        api.get('/members'),
        api.get('/items'),
        api.get('/company'),
        api.get('/banks')
      ]);

      let fetchedMembers = [];

      if (mRes.data.success) {
        fetchedMembers = mRes.data.data;
        setMembers(fetchedMembers);
      }

      let fetchedItems = [];
      if (iRes.data.success) {
        fetchedItems = iRes.data.data;
        setItems(fetchedItems);
      }

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

      return {
        members: fetchedMembers,
        items: fetchedItems
      };

    } catch (err) {
      console.error('Failed to load filter dependencies:', err);
      return { members: [], items: [] };
    }
  };

  const fetchReport = async (membersList = members, itemsList = items) => {
    try {
      setLoading(true);
      setError('');

      // Ensure membersList is always a safe array regardless of API response shape
      const safeMembersList = Array.isArray(membersList)
        ? membersList
        : (membersList?.data ?? membersList?.members ?? []);

      const safeItemsList = Array.isArray(itemsList)
        ? itemsList
        : (itemsList?.data ?? itemsList?.items ?? []);

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

        // Enrich rows with member English names from members list and Item English names
        // Try multiple match strategies: id, member_id, then member_code
        rows = rows.map(r => {
          const member = safeMembersList.find(m => String(m.id) === String(r.member_id))
            || safeMembersList.find(m => String(m.member_id) === String(r.member_id))
            || safeMembersList.find(m => String(m.member_code) === String(r.member_code));

          const item = r.item_id ? safeItemsList.find(i => String(i.id) === String(r.item_id)) : null;

          return {
            ...r,
            eng_name: member?.eng_name || r.eng_name || '',
            member_name_gu: r.member_name_gu || r.member_name || '', // Store original Gujarati name
            dangar_name: item?.item_name || r.dangar_name || '',
            dangar_name_gu: item?.item_name_gu || r.dangar_name_gu || ''
          };
        });

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
        const s = rows.reduce((acc, r) => {
          let finalAmt = parseFloat(r.final_amount || 0);

          return {
            totalQuintal: acc.totalQuintal + parseFloat(r.total_quintal || 0),
            totalRateAmount: acc.totalRateAmount + parseFloat(r.rate_amount || 0),
            totalAdvance: acc.totalAdvance + parseFloat(r.member_advance || 0),
            totalInterest: acc.totalInterest + parseFloat(r.total_interest || 0),
            totalGodownFund: acc.totalGodownFund + parseFloat(r.godown_fund || 0),
            totalBardanPenalty: acc.totalBardanPenalty + parseFloat(r.bardan_penalty || 0),
            totalDeduction: acc.totalDeduction + parseFloat(r.total_deductions || 0),
            totalFinal: acc.totalFinal + finalAmt,
            count: acc.count + 1,
          };
        }, { totalQuintal: 0, totalRateAmount: 0, totalAdvance: 0, totalInterest: 0, totalGodownFund: 0, totalBardanPenalty: 0, totalDeduction: 0, totalFinal: 0, count: 0 });

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
      let amt = parseFloat(r.final_amount || 0);

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
      'NAME': isGu ? (r.member_name_gu || r.member_name || '') : (r.eng_name || r.member_name || ''),
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

  const exportPDF = async () => {
    const validData = data.filter(r => parseFloat(r.final_amount || 0) >= 0);
    if (!validData.length) { alert('No valid data to export.'); return; }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    await addGujaratiFont(doc);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 32;
    const navy = [37, 99, 235], white = [255, 255, 255], gray = [100, 116, 139], dark = [30, 41, 59], stripe = [241, 245, 249];
    const cName = getCompanyName();

    const hdr = () => {
      doc.setFillColor(...navy); doc.rect(0, 0, W, 26, 'F');
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
      doc.text(cName, M, 17);
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
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text(cName + ' - Dangar Payment Report', M, H - 9);
      doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' });
      doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' });
    };

    hdr();
    let y = 45;
    doc.setFont('NotoGujarati', 'bold'); doc.setFontSize(15); doc.setTextColor(...navy);
    doc.text('Dangar Payment Report', M, y);
    doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gray);
    doc.text('Period: ' + filters.startDate + ' to ' + filters.endDate + '   |   Generated: ' + new Date().toLocaleString('en-IN'), M, y + 13);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
    y += 28;

    const pdfTotals = validData.reduce((acc, r) => {
      let finalAmt = parseFloat(r.final_amount || 0);

      return {
        totalQuintal: acc.totalQuintal + parseFloat(r.total_quintal || 0),
        totalRateAmount: acc.totalRateAmount + parseFloat(r.rate_amount || 0),
        totalInterest: acc.totalInterest + parseFloat(r.total_interest || 0),
        totalBardanPenalty: acc.totalBardanPenalty + parseFloat(r.bardan_penalty || 0),
        totalFinal: acc.totalFinal + finalAmt,
      };
    }, { totalQuintal: 0, totalRateAmount: 0, totalInterest: 0, totalBardanPenalty: 0, totalFinal: 0 });

    const tableRows = validData.map((r, i) => {
      let finalAmt = parseFloat(r.final_amount || 0);

      const displayName = isGu ? (r.member_name_gu || r.member_name || '') : (r.member_name || r.member_name_gu || '');

      return [
        i + 1,
        r.member_code,
        displayName,
        r.quality_class,
        r.full_ac_number || '-',
        parseFloat(r.total_quintal || 0).toFixed(2),
        parseFloat(r.rate_per_kg || 0).toFixed(2),
        parseFloat(r.rate_amount || 0).toFixed(2),
        parseFloat(r.total_interest || 0).toFixed(2),
        parseFloat(r.godown_fund || 0).toFixed(2),
        parseFloat(r.bardan_penalty || 0).toFixed(2),
        finalAmt.toFixed(2),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [[t('dangarPaymentReport.table.sr'), t('dangarPaymentReport.table.code'), t('dangarPaymentReport.table.memberName'), t('dangarPaymentReport.table.class'), t('dangarPaymentReport.table.accountNo'), t('dangarPaymentReport.table.totalQt'), t('dangarPaymentReport.table.rateQt'), t('dangarPaymentReport.table.rateAmt'), t('dangarPaymentReport.table.interest'), t('dangarPaymentReport.table.godownFund'), t('dangarPaymentReport.table.bagPenalty'), t('dangarPaymentReport.table.finalAmt')]],
      body: tableRows,
      styles: { font: 'NotoGujarati', fontSize: 7.5, cellPadding: [4, 5], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
      headStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'normal' },
      footStyles: { font: 'NotoGujarati', fillColor: [30, 41, 59], textColor: white },
      alternateRowStyles: { fillColor: stripe },
      didParseCell: (data) => {
        const text = data.cell.text.join(' ');
        if (text && !/[\u0A80-\u0AFF]/.test(text)) {
          data.cell.styles.font = 'helvetica';
        }
      },
      theme: 'grid',
      foot: [['', '', '', 'TOTALS', (i18n.language === 'gu' ? toGujaratiDigits(pdfTotals.totalQuintal.toFixed(2)) + ' કવીન્ટલ' : pdfTotals.totalQuintal.toFixed(2) + ' Qt'), '',
        pdfTotals.totalRateAmount.toFixed(2), pdfTotals.totalInterest.toFixed(2), '', '', pdfTotals.totalFinal.toFixed(2)]],
      margin: { left: M, right: M }
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i = 1; i <= tot; i++) { doc.setPage(i); ftr(i, tot); }
    doc.save('dangar_payment_' + filters.startDate + '_' + filters.endDate + '.pdf');
  };

  // Helper: Get member name in correct language
  const getMemberName = (member) => {
    if (!member) return '';
    return isGu ? (member.member_name || member.eng_name || '') : (member.eng_name || member.member_name || '');
  };

  // Helper: Get company name in correct language
  const getCompanyName = (comp = null) => {
    const activeComp = comp || company;
    if (!activeComp) return isGu ? 'ડાંગર સિસ્ટમ' : 'Dangar System';
    return isGu ? (activeComp.company_name_gu || activeComp.company_name || 'ડાંગર સિસ્ટમ') : (activeComp.company_name || 'Dangar System');
  };

  // Helper: Format number with language-appropriate representation
  const formatNumber = (value, decimals = 2) => {
    const num = Number(value || 0).toFixed(decimals);
    return isGu ? toGujaratiDigits(num) : num;
  };

  const num = (value) => {
    const parsed = parseFloat(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const money = (value) => num(value).toFixed(2);

  const EN_TO_GU = {
    '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
    '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯'
  };

  const toGujaratiDigits = (value) => String(value ?? '').replace(/[0-9]/g, (d) => EN_TO_GU[d] || d);

  const guMoney = (value) => toGujaratiDigits(money(value));

  const guDate = (value) => toGujaratiDigits(new Date(value || new Date()).toLocaleDateString('en-GB'));

  const fromGujaratiDigits = (value) => {
    const guToEn = { '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4', '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9' };
    return String(value || '').replace(/[૦-૯]/g, (d) => guToEn[d] || d);
  };

  const formatQualityClass = (cls) => {
    if (!cls) return '';
    const str = String(cls).toLowerCase();
    if (str.includes('1')) return '1';
    if (str.includes('2')) return '2';
    if (str.includes('3')) return '3';
    return cls;
  };

  const resolveBillMeta = (bill = {}, mList = [], bList = [], comp = null, season = null) => {
    const member = (mList || []).find(m => String(m.id) === String(bill.member_id))
      || (mList || []).find(m => String(m.member_code || '').trim() === String(bill.member_code || '').trim())
      || (mList || []).find(m => String(m.full_ac_number || '').trim() === String(bill.full_ac_number || '').trim())
      || {};
    const bank = (bList || []).find(b => String(b.bank_name || '').trim().toLowerCase() === String(bill.bank_name || '').trim().toLowerCase())
      || (bList || []).find(b => String(b.ifsc_code || '').trim().toLowerCase() === String(bill.ifsc_code || '').trim().toLowerCase())
      || (bList || []).find(b => String(b.full_ac_number || '').trim() === String(bill.full_ac_number || '').trim())
      || {};
    const cachedCompany = (() => {
      try { return JSON.parse(localStorage.getItem('company') || '{}'); }
      catch (e) { return {}; }
    })();

    const activeComp = comp || company || cachedCompany;
    const activeSeason = season || currentSeason;

    const companyName = getCompanyName(activeComp);
    const billDate = bill.entry_date || bill.date || new Date();
    const d = new Date(billDate);
    const yr = d.getFullYear();
    const mo = d.getMonth() + 1;
    const fyS = mo >= 4 ? yr : yr - 1;
    const fyE = fyS + 1;
    const calculatedFY = `${fyS}-${fyE % 100}`;

    const seasonName = bill.season || activeSeason?.name || activeSeason?.season || '';
    const financialYear = bill.financial_year || activeSeason?.financial_year || activeSeason?.year || calculatedFY;

    const tSeason = (seasonName || '').toLowerCase();
    const seasonLabel = tSeason.includes('summer') ? 'ઉનાળુ' : (tSeason.includes('winter') ? 'શિયાળુ' : (seasonName || 'ડાંગર અહેવાલ'));
    const seasonText = `${seasonLabel} ${toGujaratiDigits(financialYear)}`;

    const mName = isGu
      ? (bill.member_name_gu || member.member_name_gu || member.member_name || bill.member_name || member.eng_name || '')
      : (member.eng_name || member.member_name || bill.member_name || bill.member_name_gu || member.member_name_gu || '');
    const vName = bill.village_name || member.village_name || member.village || '';
    const matchedItem = items.find(i => String(i.id) === String(bill.item_id)) || {};
    const dName = isGu
      ? (matchedItem.item_name_gu || bill.dangar_name_gu || bill.item_name_gu || matchedItem.item_name || bill.dangar_name || bill.item_name || '')
      : (matchedItem.item_name || bill.dangar_name || bill.item_name || matchedItem.item_name_gu || bill.dangar_name_gu || bill.item_name_gu || '');
    const bName = member.bank_name || bill.bank_name || bank.bank_name || '';
    const brName = member.branch_name || bill.branch_name || bank.branch_name || '';

    return {
      companyName,
      seasonText,
      memberName: mName.trim() || bill.member_code || '---',
      villageName: vName.trim() || '---',
      memberCode: bill.member_code || member.member_code || '---',
      bankName: bName.trim() || '---',
      branchName: brName.trim() || '---',
      accountNo: bill.full_ac_number || member.full_ac_number || bank.full_ac_number || '---',
      ifscCode: bill.ifsc_code || member.ifsc_code || bank.ifsc_code || '---',
      itemName: dName.trim() || 'ડાંગર',
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

    // Generate a clean default narration in English
    const date = new Date();
    const yr = date.getFullYear();
    setNarration(`DANGAR PAYMENT REPORT - ${yr}`);

    setTxtModal(true);
  };

  const doExportTxt = () => {
    const fw = (val, len, padChar, right) => {
      padChar = padChar || '0';
      const s = String(val !== null && val !== undefined ? val : '').slice(0, len);
      return right ? s.padEnd(len, padChar) : s.padStart(len, padChar);
    };
    const guToEnDigits = { '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4', '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9' };
    const toEnglishText = (value) => String(value || '')
      .replace(/[૦-૯]/g, (d) => guToEnDigits[d] || d)
      .normalize('NFKD')
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

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

    const englishNarration = toEnglishText(narration) || `DANGAR PAYMENT ${filters.startDate} TO ${filters.endDate}`;
    const msg = fw(englishNarration, 67, ' ', true);
    const totalAmountPaise = Math.abs(Math.round(aggregated.reduce((sum, row) => sum + parseFloat(row.final_amount || 0), 0) * 100));
    const totalAmtStr = fw(totalAmountPaise, 16);
    const englishCompanyAccount = toEnglishText(companyAccount).replace(/\s+/g, '');

    lines.push(('51' + '00000' + fw(englishCompanyAccount, 12) + totalAmtStr + msg).padEnd(LINE, ' ').slice(0, LINE));
    aggregated.forEach(function (row) {
      var acct = fw(toEnglishText(String(row.full_ac_number || '')).replace(/\s+/g, ''), 12);
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

      const drawDynamicText = (p, text, x, y, options = {}) => {
        const str = String(text || '').trim();
        if (!str) return;

        const isGujarati = options.forceGujarati || /[\u0A80-\u0AFF]/.test(str);
        p.setFont(isGujarati ? 'NotoGujarati' : 'helvetica', options.fontStyle || 'normal');
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
        // Company Name branding
        drawDynamicText(pdf, meta.companyName, M + 3, yOffset + 5.5, { fontStyle: 'bold' });
        pdf.setFont('NotoGujarati', 'normal');
        pdf.setFontSize(6);
        pdf.text(copyTitle, W / 2, yOffset + 5.5, { align: 'center' });
        pdf.setTextColor(251, 191, 36);
        pdf.text('ચુકવણી સ્લિપ', W - M - 3, yOffset + 5.5, { align: 'right' });

        const headerY = yOffset + 14;
        pdf.setFontSize(13);
        pdf.setTextColor(...dark);
        drawDynamicText(pdf, meta.seasonText, W / 2, headerY, { align: 'center', forceGujarati: true });

        pdf.setFontSize(7.5);
        pdf.setFont('NotoGujarati', 'normal');
        pdf.text(`સભાસદ:`, M + 4, headerY + 6);
        drawDynamicText(pdf, meta.memberName, M + 22, headerY + 6, { fontStyle: 'bold' });

        pdf.setFont('NotoGujarati', 'normal');
        pdf.text(`કોડ:`, W - M - 30, headerY + 6);
        drawDynamicText(pdf, meta.memberCode, W - M - 18, headerY + 6);

        pdf.setFont('NotoGujarati', 'normal');
        pdf.text(`ગામ:`, M + 4, headerY + 11);
        drawDynamicText(pdf, meta.villageName, M + 22, headerY + 11);

        pdf.setFont('NotoGujarati', 'normal');
        pdf.text(`તારીખ:`, W - M - 30, headerY + 11);
        pdf.text(guDate(new Date()), W - M - 18, headerY + 11);

        // Procurement Table
        const tableStartY = headerY + 17;
        const procRows = bill.classes.map(cls => {
          const matchedItem = items.find(i => String(i.id) === String(cls.item_id)) || {};
          const rawName = isGu
            ? (matchedItem.item_name_gu || cls.dangar_name_gu || cls.item_name_gu || matchedItem.item_name || cls.dangar_name || cls.item_name || meta.itemName || 'ડાંગર')
            : (matchedItem.item_name || cls.dangar_name || cls.item_name || matchedItem.item_name_gu || cls.dangar_name_gu || cls.item_name_gu || meta.itemName || 'DANGAR');
          const name = String(rawName).trim();
          const isNameGuj = /[\u0A80-\u0AFF]/.test(name);

          const clsVal = formatQualityClass(cls.quality_class || meta.qualityClass);
          // IMPORTANT: If name is English, we MUST use English class digits (1, 2, 3) 
          // because the NotoGujarati font cannot render English letters.
          const clsText = isNameGuj ? toGujaratiDigits(clsVal) : clsVal;

          return [
            `${name} (${clsText})`,
            toGujaratiDigits(cls.entry_count || 1),
            guMoney(cls.total_quintal || '0.00'),
            guMoney(cls.rate_per_kg || cls.rate || 0),
            guMoney(cls.rate_amount || 0)
          ];
        });

        autoTable(pdf, {
          startY: tableStartY,
          head: [["ડાંગર નું નામ (ક્લાસ)", "ગુણ", "વજન", "ભાવ (કવી)", "કિંમત ૨."]],
          body: procRows,
          theme: 'grid',
          margin: { left: M + 4, right: M + 4 },
          tableWidth: contentW - 8,
          styles: { font: 'NotoGujarati', fontSize: 7, cellPadding: 1.5, textColor: dark, lineWidth: 0.1, halign: 'center' },
          didParseCell: (data) => {
            const text = String(data.cell.text.join(' '));
            // Always use NotoGujarati for body text to maintain consistent look
            // Only use helvetica for numbers if they don't look good in Noto
            if (text && !/[\u0A80-\u0AFF]/.test(text) && !/[0-9]/.test(text)) {
              data.cell.styles.font = 'NotoGujarati';
            } else if (/[\u0A80-\u0AFF]/.test(text)) {
              data.cell.styles.font = 'NotoGujarati';
            } else {
              data.cell.styles.font = 'helvetica';
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
        pdf.setFont('NotoGujarati', 'normal');
        pdf.text('બેંક:', M + 6, midY + 11);
        drawDynamicText(pdf, meta.bankName, M + 14, midY + 11);

        pdf.setFont('NotoGujarati', 'normal');
        pdf.text('ખાતા નં:', M + 6, midY + 18);
        drawDynamicText(pdf, toGujaratiDigits(meta.accountNo), M + 22, midY + 18);

        pdf.setFont('helvetica', 'normal');
        pdf.text('IFSC:', M + 6, midY + 25);
        drawDynamicText(pdf, meta.ifscCode, M + 18, midY + 25);

        pdf.setFont('NotoGujarati', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(...gray);
        pdf.text('* કોમ્પ્યુટર દ્વારા જનરેટ કરેલ ઓડિટ સ્લિપ', M + 6, midY + 38);

        const summaryRows = [
          ['ડાંગર હિસાબ ના જમા', guMoney(bill.total_rate_amt), ''],
          ['ડાંગર એડવાન્સ', '', guMoney(bill.total_adv)],
          ['ખાલી બારદાન કપાત', '', guMoney(bill.total_bardan_penalty)],
          ['ડાં.માલ ગોડા.કપાત (૧મણ ૧રૂ.)', '', guMoney(bill.total_fund)],
          ['વ્યાજ', '', guMoney(bill.total_int)],
          ...bill.all_other_deductions.map(od => [od.account_name, '', guMoney(od.amount)])
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
          columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 16 }, 2: { halign: 'right', cellWidth: 16 } },
          didParseCell: (data) => {
            const text = String(data.cell.text.join(' '));
            if (text && /[\u0A80-\u0AFF]/.test(text)) {
              data.cell.styles.font = 'NotoGujarati';
            } else {
              // For deductions, we stay in NotoGujarati for labels
              data.cell.styles.font = 'NotoGujarati';
            }
          }
        });

        const totalY = Math.max(pdf.lastAutoTable.finalY + 1, midY + 44);
        pdf.setFillColor(...navy);
        pdf.rect(M + 4 + boxW + 4, totalY, boxW, 8, 'F');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...white);
        pdf.text('બાકી નીકળતી રકમ', M + 4 + boxW + 6, totalY + 5.5);
        pdf.text(`₹ ${guMoney(bill.total_final)}`, W - M - 6, totalY + 5.5, { align: 'right' });

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
        acc[b.member_id].total_rate_amt += parseFloat(b.rate_amount || 0);
        acc[b.member_id].total_adv += parseFloat(b.member_advance || 0);
        acc[b.member_id].total_fund += parseFloat(b.godown_fund || 0);
        acc[b.member_id].total_int += parseFloat(b.total_interest || 0);
        acc[b.member_id].total_bardan_penalty += parseFloat(b.bardan_penalty || 0);

        let subtotal = parseFloat(b.final_amount || 0);

        if (b.other_deductions) {
          b.other_deductions.forEach(od => {
            const existing = acc[b.member_id].all_other_deductions.find(x => x.account_name === od.account_name);
            if (existing) existing.amount = (parseFloat(existing.amount) + parseFloat(od.amount)).toFixed(2);
            else acc[b.member_id].all_other_deductions.push({ ...od });
          });
        }

        acc[b.member_id].total_final += subtotal;
        return acc;
      }, {});

      const billList = Object.values(groupedMap);
      billList.forEach((bill, i) => {
        if (i > 0) pdf.addPage();
        drawSlip(bill, M, 'ગ્રાહક નકલ');
        drawSlip(bill, M + slipH + 4, 'ઓફિસ નકલ');
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

  const defaultStart = '2026-04-01';
  const defaultEnd = toISTDateInput();
  const hasActiveFilters = filters.memberId !== '' || filters.bankName !== '' || filters.season !== '' || filters.qualityClass !== '' || filters.startDate !== defaultStart || filters.endDate !== defaultEnd;
  const showExtraDeductionColumns = false;
  const tableColumnCount = showExtraDeductionColumns ? 11 : 7;

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800 select-none animate-none pb-12">
      <Toast message={message} onClose={() => setMessage(null)} />
      <div className="max-w-[1600px] mx-auto">

        {error && (
          <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
            <AlertCircle size={14} />
            <span className="text-sm font-bold uppercase tracking-wider">{error}</span>
          </div>
        )}

        {/* Main Table Card */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col min-h-[600px] shadow-none select-none">

          {/* Table Header Bar */}
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                {t('dangarPaymentReport.paymentList')}
              </span>
              <span className="bg-slate-200 text-slate-600 font-bold text-[12px] px-1.5 py-0.5 rounded-sm font-mono">
                {data.length} {t('dangarPaymentReport.records')}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Search */}
              <div className="h-7 flex items-center gap-1.5 px-2 bg-white border border-slate-200 rounded-md focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] w-52 transition">
                <Search size={13} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("dangarPaymentReport.searchPlaceholder")}
                  className="bg-transparent border-none outline-none text-[12px] text-slate-700 placeholder:text-slate-400 w-full font-bold"
                />
              </div>

              {/* Filter Drawer Button */}
              <button
                onClick={() => setShowFiltersDrawer(true)}
                className={`px-2.5 h-7 flex items-center gap-1.5 justify-center transition-all rounded-md cursor-pointer relative select-none shadow-sm text-sm font-semibold ${hasActiveFilters
                  ? 'bg-[#1d5f84] border border-[#1d5f84] text-white hover:bg-[#154662]'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
              >
                <Filter size={13} className={hasActiveFilters ? 'text-white' : 'text-slate-500'} />
                <span>Filters</span>
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 border border-white"></span>
                  </span>
                )}
              </button>

              {/* Icon-only action buttons */}
              <button
                onClick={() => { setBillModal(true); setSelectedBills([]); }}
                title={t('dangarPaymentReport.printBill')}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <Printer size={13} className="text-slate-500" />
              </button>
              <button
                onClick={openExportModal}
                title={t('dangarPaymentReport.txt')}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <FileText size={13} className="text-slate-500" />
              </button>
              <button
                onClick={exportExcel}
                title={t('dangarPaymentReport.excel')}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <Database size={13} className="text-slate-500" />
              </button>
              <button
                onClick={exportPDF}
                title={t('dangarPaymentReport.pdf')}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <Download size={13} className="text-slate-500" />
              </button>
              <button
                onClick={() => navigate('/dangar-summary')}
                title={t('dangarPaymentReport.dangarSummary')}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#1d5f84] transition rounded-md cursor-pointer shadow-sm"
              >
                <TrendingUp size={13} className="text-slate-500" />
              </button>
              <button
                onClick={() => fetchReport()}
                title="Refresh"
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <RefreshCcw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white select-none flex-1">
            <table className="min-w-[1200px] w-full text-left border-collapse font-sans text-sm select-none">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-2.5 border-r border-slate-100 w-12 text-center">#</th>
                  <th className="px-4 py-2.5 border-r border-slate-100 text-center">{isGu ? 'સભ્ય કોડ' : 'Member Code'}</th>
                  <th className="px-4 py-2.5 border-r border-slate-100">{t('dangarPaymentReport.table.memberName')}</th>
                  <th className="px-4 py-2.5 border-r border-slate-100">{isGu ? 'વસ્તુનું નામ' : 'Item Name'}</th>
                  <th className="px-4 py-2.5 border-r border-slate-100 text-center">{t('dangarPaymentReport.class')}</th>
                  <th className="px-4 py-2.5 border-r border-slate-100 text-right">{isGu ? 'વજન (QTL)' : 'Weight (Qtl)'}</th>
                  <th className="px-4 py-2.5 border-r border-slate-100 text-right">{isGu ? 'ભાવ' : 'Rate'}</th>
                  <th className="px-4 py-2.5 border-r border-slate-100 text-right">{isGu ? 'રકમ' : 'Amount'}</th>
                  <th className="px-4 py-2.5 border-r border-slate-100 text-right text-blue-600">{isGu ? 'કુલ વજન' : 'Net Weight'}</th>
                  <th className="px-4 py-2.5 border-r border-slate-100 text-right text-blue-600">{isGu ? 'સરેરાશ ભાવ' : 'Net Avg Rate'}</th>
                  <th className="px-4 py-2.5 border-r border-slate-100 text-right text-blue-600">{isGu ? 'કુલ રકમ' : 'Net Amount'}</th>
                  {showExtraDeductionColumns && (
                    <>
                      <th className="px-4 py-2.5 border-r border-slate-100 text-right text-rose-400">{t('dangarPaymentReport.table.advance')}</th>
                      <th className="px-4 py-2.5 border-r border-slate-100 text-right text-blue-400">{t('dangarPaymentReport.table.interest')}</th>
                      <th className="px-4 py-2.5 border-r border-slate-100 text-right">{t('dangarPaymentReport.table.godownFund')}</th>
                      <th className="px-4 py-2.5 border-r border-slate-100 text-right text-amber-400">{t('dangarPaymentReport.table.bagPenalty')}</th>
                    </>
                  )}
                  <th className="px-4 py-2.5 border-r border-slate-100 text-right text-rose-400">{t('dangarPaymentReport.table.totalDeduction')}</th>
                  <th className="px-4 py-2.5 text-right text-emerald-500">{t('dangarPaymentReport.table.finalAmt')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={tableColumnCount} className="py-20 text-center">
                      <RefreshCcw size={28} className="animate-spin text-[#1d5f84] mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Report...</p>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={tableColumnCount} className="py-20 text-center">
                      <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No transaction data available</p>
                    </td>
                  </tr>
                ) : (() => {
                  const filteredData = data.filter(row => {
                    const term = (searchQuery || '').toLowerCase();
                    return !term ||
                      String(row.member_name).toLowerCase().includes(term) ||
                      String(row.member_code).toLowerCase().includes(term);
                  });

                  // Group by member_id and item_id
                  const groupedByGroupKey = {};
                  filteredData.forEach((row, idx) => {
                    const groupKey = `${row.member_id}-${row.item_id || 'null'}`;
                    if (!groupedByGroupKey[groupKey]) {
                      groupedByGroupKey[groupKey] = { rows: [], displayIdx: idx + 1 };
                    }
                    groupedByGroupKey[groupKey].rows.push(row);
                  });

                  const renderedMemberIds = new Set();

                  // Render rows with per-member-item totals
                  return Object.entries(groupedByGroupKey).map(([groupKey, memberData], memberIdx) => {
                    const memberRows = memberData.rows;
                    const displayStartIdx = memberData.displayIdx;

                    // Calculate member-specific totals
                    const memberTotals = memberRows.reduce((acc, r) => ({
                      totalQuintal: acc.totalQuintal + parseFloat(r.total_quintal || 0),
                      totalRateAmount: acc.totalRateAmount + parseFloat(r.rate_amount || 0),
                      totalAdvance: acc.totalAdvance + parseFloat(r.member_advance || 0),
                      totalInterest: acc.totalInterest + parseFloat(r.total_interest || 0),
                      totalGodownFund: acc.totalGodownFund + parseFloat(r.godown_fund || 0),
                      totalBardanPenalty: acc.totalBardanPenalty + parseFloat(r.bardan_penalty || 0),
                      totalDeduction: acc.totalDeduction + parseFloat(r.total_deductions || 0),
                      totalFinal: acc.totalFinal + parseFloat(r.final_amount || 0),
                    }), { totalQuintal: 0, totalRateAmount: 0, totalAdvance: 0, totalInterest: 0, totalGodownFund: 0, totalBardanPenalty: 0, totalDeduction: 0, totalFinal: 0 });

                    return memberRows.map((row, idx) => {
                      const isFirstOfMember = idx === 0;
                      let isAbsoluteFirstOfMember = false;
                      if (!renderedMemberIds.has(row.member_id)) {
                        renderedMemberIds.add(row.member_id);
                        isAbsoluteFirstOfMember = true;
                      }
                      return (
                        <tr key={`${row.member_id}-${row.item_id || 'null'}-${row.quality_class}-${idx}`} className="hover:bg-slate-50/50 transition-all select-none">
                          <td className="py-3 px-4 border-r border-slate-100 text-[10px] font-bold text-slate-400 text-center">{displayStartIdx + idx}</td>
                          <td className="py-3 px-4 border-r border-slate-100 text-center">
                            {isAbsoluteFirstOfMember && (
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">{row.member_code}</span>
                            )}
                          </td>
                          <td className={`py-3 px-4 border-r border-slate-100 ${!isAbsoluteFirstOfMember ? 'opacity-20' : ''}`}>
                            {isAbsoluteFirstOfMember && (
                              <>
                                <p className="text-[12px] font-bold text-slate-800 tracking-tight uppercase font-prompt">
                                  {isGu ? (row.member_name_gu || row.member_name || '') : (row.eng_name || row.member_name || '')}
                                </p>
                                {isGu && row.eng_name && (
                                  <p className="text-[12px] text-slate-400 tracking-tight uppercase font-mono mt-0.5">
                                    {row.eng_name}
                                  </p>
                                )}
                              </>
                            )}
                          </td>
                          <td className="py-3 px-4 border-r border-slate-100 w-32">
                            <p className={`text-[12px] font-bold text-slate-700 break-words whitespace-normal ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>
                              {isGu ? (row.dangar_name_gu || row.dangar_name || '—') : (row.dangar_name || '—')}
                            </p>
                          </td>
                          <td className="py-3 px-4 border-r border-slate-100 font-bold text-slate-600 uppercase text-center text-[12px]">
                            {formatQualityClass(row.quality_class)}
                          </td>
                          <td className="py-3 px-4 border-r border-slate-100 text-right font-bold text-slate-700 font-mono">{formatNumber(row.total_quintal)}</td>
                          <td className="py-3 px-4 border-r border-slate-100 text-right font-bold text-slate-700 font-mono">{formatNumber(row.rate_per_kg)}</td>
                          <td className="py-3 px-4 border-r border-slate-100 text-right font-bold text-slate-800 font-mono">₹{formatNumber(row.rate_amount)}</td>
                          {isFirstOfMember && (
                            <>
                              <td rowSpan={memberRows.length} className="py-3 px-4 border-r border-slate-200 text-right font-bold text-blue-700 bg-blue-50/50 font-mono align-middle">
                                {formatNumber(memberTotals.totalQuintal)}
                              </td>
                              <td rowSpan={memberRows.length} className="py-3 px-4 border-r border-slate-200 text-right font-bold text-blue-700 bg-blue-50/50 font-mono align-middle">
                                {formatNumber(memberTotals.totalQuintal > 0 ? memberTotals.totalRateAmount / memberTotals.totalQuintal : 0)}
                              </td>
                              <td rowSpan={memberRows.length} className="py-3 px-4 border-r border-slate-200 text-right font-bold text-blue-800 bg-blue-50/50 font-mono align-middle">
                                ₹{formatNumber(memberTotals.totalRateAmount)}
                              </td>
                            </>
                          )}
                          {showExtraDeductionColumns && (
                            isFirstOfMember ? (
                              <>
                                <td rowSpan={memberRows.length} className="py-3 px-4 border-r border-slate-100 text-right font-bold text-rose-600 font-mono align-middle">₹{formatNumber(memberTotals.totalAdvance)}</td>
                                <td rowSpan={memberRows.length} className="py-3 px-4 border-r border-slate-100 text-right font-bold text-blue-600 font-mono align-middle">₹{formatNumber(memberTotals.totalInterest)}</td>
                                <td rowSpan={memberRows.length} className="py-3 px-4 border-r border-slate-100 text-right font-bold text-slate-700 font-mono align-middle">₹{formatNumber(memberTotals.totalGodownFund)}</td>
                                <td rowSpan={memberRows.length} className="py-3 px-4 border-r border-slate-100 text-right align-middle">
                                  <p className="font-bold text-amber-600 font-mono">₹{formatNumber(memberTotals.totalBardanPenalty)}</p>
                                  <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">{formatNumber(row.bardan_remaining)} {isGu ? 'ગુણ' : 'units'}</p>
                                </td>
                              </>
                            ) : null
                          )}
                          {isFirstOfMember ? (
                            <>
                              <td rowSpan={memberRows.length} className="py-3 px-4 border-r border-slate-100 text-right font-bold text-rose-600 font-mono align-middle">₹{formatNumber(memberTotals.totalDeduction)}</td>
                              <td rowSpan={memberRows.length} className="py-3 px-4 text-right align-middle">
                                <span className="font-black text-emerald-600 bg-emerald-50/50 px-2 py-0.5 border border-emerald-200/60 rounded font-mono text-[12px]">₹{formatNumber(memberTotals.totalFinal)}</span>
                              </td>
                            </>
                          ) : null}
                        </tr>
                      );
                    });
                  }).flat();
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Slide-Out Filters Drawer */}
      <div className={`fixed inset-0 z-[100] overflow-hidden ${showFiltersDrawer ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px] transition-opacity duration-300 ${showFiltersDrawer ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setShowFiltersDrawer(false)}
        />
        {/* Drawer Panel */}
        <div className={`fixed inset-y-0 right-0 max-w-full flex pl-10 transform transition-transform duration-300 ease-in-out ${showFiltersDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="w-screen max-w-sm bg-white border-l border-slate-200 flex flex-col shadow-none">

            {/* Drawer Title Bar */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 select-none">
                <Filter size={14} className="text-[#1d5f84]" />
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">Filter Parameters</span>
              </div>
              <button
                onClick={() => setShowFiltersDrawer(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable Filters Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">

              {/* Date Range */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date Range Period</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 font-bold uppercase">From</span>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-10 pr-2 py-1.5 text-sm text-slate-700 font-bold font-mono outline-none w-full"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 font-bold uppercase">To</span>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-6 pr-2 py-1.5 text-sm text-slate-700 font-bold font-mono outline-none w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Member */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('dangarPaymentReport.sabhasad')}</span>
                <select
                  value={filters.memberId}
                  onChange={(e) => setFilters({ ...filters, memberId: e.target.value })}
                  className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 cursor-pointer outline-none w-full"
                >
                  <option value="">{t('dangarPaymentReport.allIdentities')}</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.member_code} - {getMemberName(m)}</option>)}
                </select>
              </div>

              {/* Bank */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('dangarPaymentReport.bankStream')}</span>
                <select
                  value={filters.bankName}
                  onChange={(e) => setFilters({ ...filters, bankName: e.target.value })}
                  className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 cursor-pointer outline-none w-full"
                >
                  <option value="">{t('dangarPaymentReport.allBanks')}</option>
                  {banks.map(b => <option key={b.id} value={b.bank_name}>{b.bank_name}</option>)}
                </select>
              </div>

              {/* Season */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('dangarPaymentReport.season')}</span>
                <select
                  value={filters.season}
                  onChange={(e) => setFilters({ ...filters, season: e.target.value })}
                  className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 cursor-pointer outline-none w-full"
                >
                  <option value="">{t('dangarPaymentReport.allSeasons')}</option>
                  {seasons.map(s => <option key={s.id} value={s.name}>{s.name} ({s.financial_year})</option>)}
                </select>
              </div>

              {/* Quality Class */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('dangarPaymentReport.class')}</span>
                <select
                  value={filters.qualityClass}
                  onChange={(e) => setFilters({ ...filters, qualityClass: e.target.value })}
                  className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 cursor-pointer outline-none w-full"
                >
                  <option value="">{t('dangarPaymentReport.allClasses')}</option>
                  <option value="1st">1st Class</option>
                  <option value="2nd">2nd Class</option>
                  <option value="3rd">3rd Class</option>
                </select>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => {
                  setFilters({
                    startDate: '2026-04-01',
                    endDate: new Date().toISOString().split('T')[0],
                    memberId: '',
                    itemId: '',
                    bankName: '',
                    season: '',
                    qualityClass: ''
                  });
                }}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold rounded-md transition cursor-pointer uppercase tracking-wider"
              >
                Reset All
              </button>
              <button
                onClick={() => { setShowFiltersDrawer(false); fetchReport(); }}
                className="flex-1 px-3 py-2 bg-[#1d5f84] hover:bg-[#154662] text-white text-sm font-bold rounded-md transition cursor-pointer uppercase tracking-wider"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* TXT Export Modal */}
      {txtModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-white animate-in zoom-in-95 duration-200">
            <div className="bg-blue-600 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">{t('dangarPaymentReport.bankExport.title')}</h2>
                <p className="text-sm font-medium text-blue-100 mt-1">{t('dangarPaymentReport.bankExport.subtitle')}</p>
              </div>
              <button onClick={() => setTxtModal(false)} className="p-2 text-white/50 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-1.5 notranslate google-notranslate force-en" translate="no" lang="en">
                <label className="text-sm font-bold text-slate-500 ml-1">{t('dangarPaymentReport.bankExport.narration')}</label>
                <input
                  type="text"
                  maxLength={67}
                  value={narration}
                  translate="no"
                  lang="en"
                  spellCheck={false}
                  onChange={e => setNarration(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && narration.trim()) {
                      e.preventDefault();
                      doExportTxt();
                    }
                  }}
                  placeholder="DANGAR PAYMENT"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm focus:bg-white focus:border-blue-500 notranslate google-notranslate force-en"
                />
                <div className="flex justify-between px-1">
                  <p className="text-[12px] text-slate-400 font-bold uppercase">{narration.length} / 67 CHARS</p>
                  <p className="text-[12px] text-blue-500 font-bold uppercase italic">Will be space-padded</p>
                </div>
              </div>
              <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
                <p className="text-sm font-bold text-blue-600 mb-3">{t('dangarPaymentReport.bankExport.summaryTitle') || 'નિકાસ સારાંશ'}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('dangarPaymentReport.bankExport.totalRows') || 'કુલ હરોળ'}</p>
                    <p className="text-lg font-bold text-slate-800">{toGujaratiDigits(data.length + 1)} {t('dangarPaymentReport.bankExport.lines') || 'સ્લિપ'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('dangarPaymentReport.bankExport.grossPayout') || 'કુલ રકમ'}</p>
                    <p className="text-lg font-bold text-slate-800">₹{toGujaratiDigits(data.reduce((s, r) => s + parseFloat(r.final_amount || 0), 0).toFixed(2))}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setTxtModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all">{t('common.cancel')}</button>
                <button
                  onClick={doExportTxt}
                  disabled={!narration.trim()}
                  className="flex-3 py-4 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Download size={18} /> {t('dangarPaymentReport.bankExport.generateBatch')}
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
                <h2 className="text-xl font-black text-white italic uppercase tracking-tight">{t('dangarPaymentReport.printSlip.title')}</h2>
                <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-1">{t('dangarPaymentReport.printSlip.subtitle')}</p>
              </div>
              <button onClick={() => setBillModal(false)} className="p-2 text-white/50 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('dangarPaymentReport.printSlip.rangeStart')}</label>
                  <input
                    type="text"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-sm focus:bg-white focus:border-blue-500"
                    placeholder="0001"
                    value={billSearch.from}
                    onChange={(e) => {
                      const from = e.target.value;
                      const to = billSearch.to || from;
                      setBillSearch({ ...billSearch, from });
                      const start = parseInt(fromGujaratiDigits(from)) || 0;
                      const end = parseInt(fromGujaratiDigits(billSearch.to)) || 999999;
                      const inRange = data.filter(r => {
                        const code = parseInt(fromGujaratiDigits(r.member_code));
                        return code >= start && code <= end;
                      });
                      setSelectedBills(inRange);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('dangarPaymentReport.printSlip.rangeEnd')}</label>
                  <input
                    type="text"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-slate-700 text-sm focus:bg-white focus:border-blue-500"
                    placeholder="0050"
                    value={billSearch.to}
                    onChange={(e) => {
                      const to = e.target.value;
                      setBillSearch({ ...billSearch, to });
                      const start = parseInt(fromGujaratiDigits(billSearch.from)) || 0;
                      const end = parseInt(fromGujaratiDigits(to)) || 999999;
                      const inRange = data.filter(r => {
                        const code = parseInt(fromGujaratiDigits(r.member_code));
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
                    <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">{selectedBills.length} Slips Found</p>
                    <p className="text-lg font-black text-slate-900">₹{selectedBills.reduce((s, b) => s + parseFloat(b.final_amount || 0), 0).toFixed(2)}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => downloadAllBillsPDF('print')} className="flex-1 py-4 bg-blue-600 text-white rounded-lg font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"><Printer size={16} />{t('common.print')}</button>
                    <button onClick={() => downloadAllBillsPDF('download')} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><Download size={16} />{t('common.pdf')}</button>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-lg">
                  <Info size={32} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Enter Code Range</p>
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
                else acc[b.member_id].all_other_deductions.push({ ...od });
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
                <div className="absolute top-4 right-4 text-[12px] font-bold text-zinc-400 uppercase tracking-widest">{title}</div>

                {/* Header */}
                <div className="text-center mb-4">
                  <h1 className="text-xl font-bold text-zinc-900 mb-1 leading-none">{meta.companyName}</h1>
                  <p className="text-[12px] font-bold text-zinc-600 italic leading-none">{meta.seasonText}</p>
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
                      <th className="p-1.5 border-r border-zinc-400 text-center w-18">વજન (કવીન્ટલ)</th>
                      <th className="p-1.5 border-r border-zinc-400 text-center w-20">ભાવ (કવીન્ટલ)</th>
                      <th className="p-1.5 text-right w-24">રકમ ₹</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bill.classes || []).map((cls, ci) => (
                      <tr key={ci} className="border-b border-zinc-200">
                        <td className="p-1.5 border-r border-zinc-400 font-bold uppercase">
                          {(() => {
                            const matchedItem = items.find(i => String(i.id) === String(cls.item_id)) || {};
                            const name = isGu
                              ? (matchedItem.item_name_gu || cls.dangar_name_gu || cls.item_name_gu || matchedItem.item_name || cls.dangar_name || cls.item_name || meta.itemName)
                              : (matchedItem.item_name || cls.dangar_name || cls.item_name || matchedItem.item_name_gu || cls.dangar_name_gu || cls.item_name_gu || meta.itemName);
                            return name;
                          })()} ({formatQualityClass(cls.quality_class || meta.qualityClass)})
                        </td>
                        <td className="p-1.5 border-r border-zinc-400 text-center">{toGujaratiDigits(formatQualityClass(cls.quality_class || meta.qualityClass))}</td>
                        <td className="p-1.5 border-r border-zinc-400 text-center font-bold">{toGujaratiDigits(cls.total_quintal)}</td>
                        <td className="p-1.5 border-r border-zinc-400 text-center">{toGujaratiDigits(cls.rate_per_kg)}</td>
                        <td className="p-1.5 text-right font-bold">{toGujaratiDigits(cls.rate_amount)}</td>
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
                        <tr><td className="py-1 pr-2 font-bold">એકાઉન્ટ નં. :</td><td className="py-1">{toGujaratiDigits(meta.accountNo)}</td></tr>
                        <tr><td className="py-1 pr-2 font-bold">IFSC :</td><td className="py-1">{meta.ifscCode}</td></tr>
                      </tbody>
                    </table>
                    <div className="mt-auto pt-2 border-t border-dashed border-zinc-300 italic text-zinc-400 text-[12px]">
                      * કોમ્પ્યુટર દ્વારા જનરેટ કરેલ / ઓડિટ હેતુ માટે
                    </div>
                  </div>

                  <div className="col-span-7 border border-zinc-400 flex flex-col">
                    <table className="w-full border-collapse text-[10px] font-bold">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-400 text-[12px] text-center">
                          <th className="p-1 border-r border-zinc-400 w-[55%]">વિગત</th>
                          <th className="p-1 border-r border-zinc-400 w-[22.5%]">જમા રકમ</th>
                          <th className="p-1 w-[22.5%]">ઉધાર રકમ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryRows.map((row, idx) => (
                          <tr key={idx} className="border-b border-zinc-200">
                            <td className="p-1 border-r border-zinc-400">{row.label}</td>
                            <td className="p-1 border-r border-zinc-400 text-right">{toGujaratiDigits(row.credit)}</td>
                            <td className="p-1 text-right">{toGujaratiDigits(row.debit)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="mt-auto border-t-2 border-zinc-800 font-bold bg-zinc-50 grid grid-cols-12">
                      <div className="col-span-7 p-1.5 text-center text-sm border-r border-zinc-400">બાકી નીકળતી રકમ</div>
                      <div className="col-span-5 p-1.5 text-right text-base pr-4">₹ {toGujaratiDigits(bill.total_final.toFixed(2))}</div>
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
                <SlipCopy title="ગ્રાહક નકલ" />
                <div className="h-px w-full border-t border-dashed border-zinc-500 my-2"></div>
                <SlipCopy title="ઓફિસ નકલ" />
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
