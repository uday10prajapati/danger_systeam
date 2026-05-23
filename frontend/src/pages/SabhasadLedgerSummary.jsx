
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import React, { useState, useEffect } from 'react';
import {
  Search, Download, Filter, FileText,
  Database, RefreshCcw, Layout, Users,
  TrendingUp, TrendingDown, ShieldCheck,
  Printer, X, Hash, User, Activity, Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import api from '../api';
import { formatBilingualText, translateSystemText } from '../utils/textUtils';
import { exportToPDF } from '../utils/pdfExporter';
import { toISTDateInput } from '../utils/dateUtils';

// Helper function to format dates gracefully and avoid "Invalid Date"
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB');
};

export default function SabhasadLedgerSummary() {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';

  const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
  const toGujaratiDigits = (value) => String(value ?? '').replace(/[0-9]/g, (d) => guDigits[d] || d);

  const fmtAmount = (val, prefix = '') => {
    const num = parseFloat(val) || 0;
    const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const str = prefix ? `${prefix}${formatted}` : formatted;
    return isGu ? toGujaratiDigits(str) : str;
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return '—';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      return isGu ? toGujaratiDigits(dateString) : dateString;
    }
    let cleanStr = dateString;
    if (cleanStr.includes(' ')) cleanStr = cleanStr.split(' ')[0];
    if (cleanStr.includes('T')) cleanStr = cleanStr.split('T')[0];

    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const engDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      return isGu ? toGujaratiDigits(engDate) : engDate;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const formatted = `${day}/${month}/${year}`;
    return isGu ? toGujaratiDigits(formatted) : formatted;
  };

  const getSafeDescription = (desc, fallback = '—') => {
    if (!desc || desc === 'undefined' || desc === 'null') return fallback;
    return desc;
  };

  const toLocale = (val, opts = { minimumFractionDigits: 2, maximumFractionDigits: 2 }) => {
    const num = parseFloat(val) || 0;
    const formatted = num.toLocaleString('en-IN', opts);
    return isGu ? toGujaratiDigits(formatted) : formatted;
  };

  const toLocaleSimple = (val) => {
    const num = parseFloat(val) || 0;
    const formatted = num.toLocaleString();
    return isGu ? toGujaratiDigits(formatted) : formatted;
  };

  const toFixed2 = (val) => {
    const num = parseFloat(val) || 0;
    const formatted = num.toFixed(2);
    return isGu ? toGujaratiDigits(formatted) : formatted;
  };

  const displayAccountName = (acc) => {
    if (!acc) return '';
    if (isGu) {
      return acc.account_name_gu || acc.account_name || acc.eng_name || '';
    }
    return acc.account_name || acc.eng_name || acc.account_name_gu || '';
  };

  const displayMemberName = (row) => {
    if (!row) return '';
    if (isGu) {
      return row.member_name_gu || row.member_name || row.eng_name || '';
    }
    return row.eng_name || row.member_name || row.member_name_gu || '';
  };

  const displayItemName = (item) => {
    if (!item) return '';
    return isGu
      ? (item.item_name_gu || item.item_name || '')
      : (item.item_name || item.item_name_gu || '');
  };

  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({ opening_balance: 0, debit: 0, credit: 0, closing_balance: 0 });
  const [loading, setLoading] = useState(true);
  const [backendFlags, setBackendFlags] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [company, setCompany] = useState(null);
  const [bardanPrice, setBardanPrice] = useState(0);
  const [toast, setToast] = useState(null);

  // Drawer Toggle State
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState({
    startDate: toISTDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    endDate: toISTDateInput()
  });
  const [accountId, setAccountId] = useState('all');
  const [memberId, setMemberId] = useState('all');
  const [village, setVillage] = useState('');
  const [bankName, setBankName] = useState('');
  const [season, setSeason] = useState('');
  const [itemId, setItemId] = useState('');
  const [fromMemberCode, setFromMemberCode] = useState('');
  const [toMemberCode, setToMemberCode] = useState('');
  const [dangarClass, setDangarClass] = useState('');
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
  const [banks, setBanks] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [items, setItems] = useState([]);

  // Refs for navigation
  const startDateRef = React.useRef(null);
  const endDateRef = React.useRef(null);

  const accCodeRef = React.useRef(null);
  const accNameRef = React.useRef(null);
  const memCodeRef = React.useRef(null);
  const memNameRef = React.useRef(null);
  const accDropRef = React.useRef(null);
  const memDropRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (accDropRef.current && !accDropRef.current.contains(event.target)) {
        setShowAccDrop(false);
      }
      if (memDropRef.current && !memDropRef.current.contains(event.target)) {
        setShowMemDrop(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  const [accActiveIdx, setAccActiveIdx] = useState(0);
  const [memActiveIdx, setMemActiveIdx] = useState(0);

  useEffect(() => {
    setAccActiveIdx(0);
  }, [accCode, accName]);

  useEffect(() => {
    setMemActiveIdx(0);
  }, [memCode, memName]);

  const handleAccCodeKeyDown = (e) => {
    if (showAccDrop && filteredAccs.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAccActiveIdx((prev) => Math.min(prev + 1, filteredAccs.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAccActiveIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredAccs[accActiveIdx];
        if (selected) {
          handleSelectAcc(selected);
          if (accNameRef.current) {
            accNameRef.current.focus();
          }
        }
      } else if (e.key === 'Escape') {
        setShowAccDrop(false);
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (accNameRef.current) {
          accNameRef.current.focus();
        }
      }
    }
  };

  const handleAccNameKeyDown = (e) => {
    if (showAccDrop && filteredAccs.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAccActiveIdx((prev) => Math.min(prev + 1, filteredAccs.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAccActiveIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredAccs[accActiveIdx];
        if (selected) {
          handleSelectAcc(selected);
          if (memCodeRef.current) {
            memCodeRef.current.focus();
          }
        }
      } else if (e.key === 'Escape') {
        setShowAccDrop(false);
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (memCodeRef.current) {
          memCodeRef.current.focus();
        }
      }
    }
  };

  const handleMemCodeKeyDown = (e) => {
    if (showMemDrop && filteredMems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMemActiveIdx((prev) => Math.min(prev + 1, filteredMems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMemActiveIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredMems[memActiveIdx];
        if (selected) {
          handleSelectMem(selected);
          if (memNameRef.current) {
            memNameRef.current.focus();
          }
        }
      } else if (e.key === 'Escape') {
        setShowMemDrop(false);
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (memNameRef.current) {
          memNameRef.current.focus();
        }
      }
    }
  };

  const handleMemNameKeyDown = (e) => {
    if (showMemDrop && filteredMems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMemActiveIdx((prev) => Math.min(prev + 1, filteredMems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMemActiveIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredMems[memActiveIdx];
        if (selected) {
          handleSelectMem(selected);
          fetchReportData();
        }
      } else if (e.key === 'Escape') {
        setShowMemDrop(false);
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        fetchReportData();
      }
    }
  };

  const handleKeyDown = (e, nextRef, submitFn) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      } else if (submitFn) {
        submitFn(e);
      }
    }
  };

  const handleInputChangeWithAutocomplete = (e, inputRef, list, getNameFn, setValue, setShowDrop) => {
    const typedVal = e.target.value;
    const inputType = e.nativeEvent?.inputType || '';

    setValue(typedVal);
    if (setShowDrop) setShowDrop(true);

    if (inputType.startsWith('delete') || inputType === 'historyUndo') {
      return;
    }

    if (!typedVal.trim()) return;

    const match = list[0];

    if (match) {
      const matchText = typeof getNameFn === 'function' ? getNameFn(match) : (match[getNameFn] || '');
      if (matchText.toLowerCase().startsWith(typedVal.toLowerCase())) {
        setValue(matchText);
        setTimeout(() => {
          const input = inputRef.current;
          if (input) {
            input.setSelectionRange(typedVal.length, matchText.length);
          }
        }, 0);
      }
    }
  };

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const response = await api.get('/company');
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
      const response = await api.get('/bardan-price');
      if (response.data.success && response.data.data) {
        setBardanPrice(parseFloat(response.data.data.price_per_bardan || 0));
      }
    } catch (error) {
      console.error('Failed to load bardan price', error);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [accRes, memRes, bankRes, seasonRes, itemRes] = await Promise.all([
        api.get(`/accounts/company/${company.id}`),
        api.get(`/members/company/${company.id}`),
        api.get('/banks'),
        api.get(`/seasons/company/${company.id}`),
        api.get('/items')
      ]);

      if (accRes.data.success) {
        const filteredAccounts = accRes.data.data.filter(a =>
          !a.account_name.toLowerCase().includes('brokerage') &&
          !a.account_name.toLowerCase().includes('labour') &&
          !a.account_name.toLowerCase().includes('rounding')
        );
        setAccounts(filteredAccounts);
      }

      if (memRes.data.success) {
        setMembers(memRes.data.data);
      }

      if (bankRes.data.success) setBanks(bankRes.data.data);

      if (seasonRes.data.success) {
        setSeasons(seasonRes.data.data.map(s => s.name));
      }

      if (itemRes.data.success) setItems(itemRes.data.data);

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
      const response = await api.get(`/sabhasad-ledger-summary`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          accountId,
          memberId,
          hideZeroBalance,
          village,
          bankName,
          season,
          itemId: accountId === 'all' || isDangar ? itemId : '',
          fromMemberCode,
          toMemberCode,
          dangarClass
        }
      });

      if (response.data.success) {
        // Group rows by member to show consolidated totals per sabhasad
        const raw = response.data.data || [];
        const groupedMap = {};
        const numericFields = ['opening_balance', 'debit', 'credit', 'balance', 'closing_balance', 'bardan_balance', 'bardan_self_jama', 'bardan_penalty_balance', 'net_quintal', 'amount', 'qty'];

        raw.forEach(r => {
          const key = r.member_id || r.member_code || (r.member_name || '_unknown_');
          if (!groupedMap[key]) {
            // clone row shallowly
            groupedMap[key] = { ...r };
            // ensure numeric fields are numbers
            numericFields.forEach(f => { groupedMap[key][f] = parseFloat(groupedMap[key][f] || 0); });
          } else {
            const g = groupedMap[key];
            // sum numeric fields
            numericFields.forEach(f => { g[f] = (parseFloat(g[f] || 0) + parseFloat(r[f] || 0)); });
            // prefer earliest non-empty textual fields
            g.member_code = g.member_code || r.member_code;
            g.member_name = g.member_name || r.member_name;
            g.member_name_gu = g.member_name_gu || r.member_name_gu;
            g.eng_name = g.eng_name || r.eng_name;
            g.village_name = g.village_name || r.village_name;
            g.account_name = g.account_name || r.account_name;
            g.account_name_gu = g.account_name_gu || r.account_name_gu;
          }
        });

        // Convert grouped map to array
        const grouped = Object.values(groupedMap).map(g => {
          numericFields.forEach(f => { g[f] = g[f] || 0; });
          return g;
        });

        setData(grouped);
        setTotals(response.data.totals);
        setBackendFlags({
          isPurchase: response.data.isPurchase,
          isSale: response.data.isSale,
          isBardan: response.data.isBardan,
          isDangar: response.data.isDangar,
          isTransactional: response.data.isTransactional
        });
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
      const response = await api.get(`/account-ledger`, {
        params: {
          memberId: mem.member_id,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          accountId: accountId !== 'all' ? accountId : undefined
        }
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

    const totalBardanBal = data.reduce((s, r) => s + parseFloat(r.bardan_balance || 0), 0);
    const totalBardanSelf = data.reduce((s, r) => s + parseFloat(r.bardan_self_jama || 0), 0);
    const totalBardanAmt = data.reduce((s, r) => s + (parseFloat(r.bardan_penalty_balance || r.bardan_balance || 0) * bardanPrice), 0);
    const totalBardanPenalty = data.reduce((s, r) => s + parseFloat(r.bardan_penalty_balance || r.bardan_balance || 0), 0);

    const rows = data.map((row, idx) => {
      let r = `<td style="text-align:center">${isGu ? toGujaratiDigits(String(idx + 1).padStart(3, '0')) : String(idx + 1).padStart(3, '0')}</td>`;
      if (isPurchase || isSale || isBardan || isTransactional) {
        let displayDebit = parseFloat(row.debit || 0);
        let displayCredit = parseFloat(row.credit || 0);
        if (isSale) {
          const isCash = (row.payment_type || '').toLowerCase().includes('cash');
          const amount = displayDebit || displayCredit;
          if (isCash) { displayDebit = 0; displayCredit = amount; }
          else { displayDebit = amount; displayCredit = 0; }
        }

        if (isBardan || isCash) {
          if (isBardan) {
            r += `
              <td>${row.member_code ? (isGu ? toGujaratiDigits(row.member_code) : row.member_code) : '-'}</td>
              <td><strong>${translateSystemText(displayMemberName(row) || '-')}</strong></td>
              <td>${translateSystemText(row.village_name || '-')}</td>
              <td style="text-align:right">${toLocaleSimple(row.opening_balance || 0)}</td>
              <td style="text-align:right">${parseFloat(row.debit || 0) > 0 ? toLocaleSimple(row.debit || 0) : '-'}</td>
              <td style="text-align:right">${parseFloat(row.credit || 0) > 0 ? toLocaleSimple(row.credit || 0) : '-'}</td>
              <td style="text-align:right">${parseFloat(row.self_credit || 0) > 0 ? toLocaleSimple(row.self_credit || 0) : '-'}</td>
              <td style="text-align:right; font-weight:bold; color:${parseFloat(row.balance || 0) > 0 ? '#dc2626' : '#18181b'}">${toLocaleSimple(Math.abs(parseFloat(row.balance || 0)))} ${parseFloat(row.balance || 0) >= 0 ? 'DR' : 'CR'}</td>
              <td style="text-align:right; font-weight:bold;">${fmtAmount((parseFloat(row.balance || 0) * bardanPrice), '₹')}</td>
            `;
          } else {
            r += `
              <td>${formatDisplayDate(row.entry_date)}</td>
              <td>
                ${row.member_name ? `<br><small style="color:#2563eb">${translateSystemText('Node')}: ${translateSystemText(displayMemberName(row))} [${row.member_id}]</small>` : ''}
              </td>
              <td style="text-align:right">${fmtAmount(displayDebit || 0, '₹')}</td>
              <td style="text-align:right">${fmtAmount(displayCredit || 0, '₹')}</td>
              <td style="text-align:right; font-weight:bold; color:${parseFloat(row.balance || 0) > 0 ? '#dc2626' : '#18181b'}">${fmtAmount(Math.abs(parseFloat(row.balance || 0)), '₹')} ${parseFloat(row.balance || 0) >= 0 ? 'C' : 'D'}</td>
            `;
          }
        } else {
          const balLabel = isSale ? (parseFloat(row.balance || 0) >= 0 ? 'CR' : 'DR') : (parseFloat(row.balance || 0) >= 0 ? 'DR' : 'CR');
          r += `
            <td>${formatDisplayDate(row.entry_date)}</td>
            <td>${row.member_code || '-'}</td>
            <td>${translateSystemText(displayMemberName(row) || '-')}</td>
            <td>${translateSystemText(getSafeDescription(row.description))}</td>
              <td style="text-align:right">${fmtAmount(displayDebit || 0, '₹')}</td>
              <td style="text-align:right">${fmtAmount(displayCredit || 0, '₹')}</td>
              <td style="text-align:right; font-weight:bold;">${toLocale(Math.abs(parseFloat(row.balance || 0)))} ${balLabel}</td>
          `;
        }
      } else if (isDangar) {
        r += `
          <td>${row.member_code}</td>
          <td>${translateSystemText(displayMemberName(row))}</td>
            <td>${formatDisplayDate(row.entry_date)}</td>
            <td style="text-align:right">${toLocale(row.rate || 0)}</td>
          <td>${translateSystemText(row.item_name)}</td>
          <td>${row.quality_class}</td>
          <td>${row.book_type}</td>
            <td style="text-align:right">${toFixed2(row.net_quintal || 0)} Qt</td>
            <td style="text-align:right">${toLocale(row.amount || 0)}</td>
        `;
      } else {
        r += `
          <td>${row.member_code || '-'}</td>
          <td style="font-weight:600">${translateSystemText(displayMemberName(row) || '-')}</td>
          <td>${translateSystemText(row.account_name_gu || row.account_name || '-')}</td>
            <td style="text-align:right; color: ${parseFloat(row.opening_balance) >= 0 ? '#059669' : '#dc2626'}">${parseFloat(row.opening_balance) >= 0 ? '+' : '-'}${toLocale(Math.abs(parseFloat(row.opening_balance)))}</td>
            <td style="text-align:center">${row.last_activity_date ? formatDisplayDate(row.last_activity_date) : '-'}</td>
            <td style="text-align:right">${toLocale(row.debit || 0)}</td>
            <td style="text-align:right">${toLocale(row.credit || 0)}</td>
            <td style="text-align:right; font-weight:bold;">${toLocale(Math.abs(parseFloat(row.closing_balance || 0)))} ${parseFloat(row.closing_balance || 0) >= 0 ? 'DR' : 'CR'}</td>
        `;
        if (!hideBardan) {
          r += `
              <td style="text-align:right">${toLocale(Math.abs(parseFloat(row.bardan_balance || 0)))} ${parseFloat(row.bardan_balance || 0) >= 0 ? 'DR' : 'CR'}</td>
              <td style="text-align:right">${toLocale(row.bardan_self_jama || 0)}</td>
              <td style="text-align:right">${fmtAmount(Math.abs((parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0)) * bardanPrice), '₹')} ${parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0) >= 0 ? 'DR' : 'CR'}</td>
          `;
        }
      }
      return `<tr>${r}</tr>`;
    });

    const thCols = isBardan ?
      `<th>${t('sabhasadLedgerSummary.srNo')}</th><th>${t('sabhasadLedgerSummary.code')}</th><th>${t('sabhasadLedgerSummary.memberName')}</th><th>${t('sabhasadLedgerSummary.village')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.opening')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.debit')} (+)</th><th style="text-align:right">${t('sabhasadLedgerSummary.credit')} (-)</th><th style="text-align:right">${t('sabhasadLedgerSummary.selfJama')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.balance')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.bardanAmt')}</th>` :
      isCash ?
        `<th>${t('sabhasadLedgerSummary.srNo')}</th><th>${t('sabhasadLedgerSummary.date')}</th><th>${t('sabhasadLedgerSummary.descriptionMember')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.debit')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.credit')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.balance')}</th>` :
        isPurchase || isSale || isTransactional ?
          `<th>${t('sabhasadLedgerSummary.srNo')}</th><th>${t('sabhasadLedgerSummary.date')}</th><th>${t('sabhasadLedgerSummary.code')}</th><th>${t('sabhasadLedgerSummary.memberName')}</th><th>${t('sabhasadLedgerSummary.description')}</th><th style="text-align:right">${isSale ? t('sabhasadLedgerSummary.creditSale') : t('sabhasadLedgerSummary.debit')}</th><th style="text-align:right">${isSale ? t('sabhasadLedgerSummary.cashSale') : t('sabhasadLedgerSummary.credit')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.balance')}</th>` :
          isDangar ?
            `<th>${t('sabhasadLedgerSummary.srNo')}</th><th>${t('sabhasadLedgerSummary.code')}</th><th>${t('sabhasadLedgerSummary.memberName')}</th><th>${t('sabhasadLedgerSummary.date')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.purchesRate')}</th><th>${t('sabhasadLedgerSummary.itemName')}</th><th>${t('sabhasadLedgerSummary.class')}</th><th>${t('sabhasadLedgerSummary.season')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.totalQty')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.totalRate')}</th>` :
            hideBardan ?
              `<th>${t('sabhasadLedgerSummary.srNo')}</th><th>${t('sabhasadLedgerSummary.code')}</th><th>${t('sabhasadLedgerSummary.memberName')}</th><th>${t('sabhasadLedgerSummary.accountName')}</th><th>${t('sabhasadLedgerSummary.opening')}</th><th>${t('sabhasadLedgerSummary.date')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.debit')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.credit')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.closing')}</th>` :
              `<th>${t('sabhasadLedgerSummary.srNo')}</th><th>${t('sabhasadLedgerSummary.code')}</th><th>${t('sabhasadLedgerSummary.memberName')}</th><th>${t('sabhasadLedgerSummary.accountName')}</th><th>${t('sabhasadLedgerSummary.opening')}</th><th>${t('sabhasadLedgerSummary.date')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.debit')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.credit')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.closing')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.bardanBal')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.selfJama')}</th><th style="text-align:right">${t('sabhasadLedgerSummary.bardanAmt')}</th>`;

    const tfootRow = isBardan ?
      `<td colspan="4" style="text-align:right; font-weight:bold;">REGISTRY TOTALS</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.opening_balance || 0).toLocaleString()}</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.debit || 0).toLocaleString()}</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.credit || 0).toLocaleString()}</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.self_credit || 0).toLocaleString()}</td>
       <td style="text-align:right; font-weight:bold;">${Math.abs(parseFloat(totals.balance || 0)).toLocaleString()} ${parseFloat(totals.balance || 0) >= 0 ? 'DR' : 'CR'}</td>
       <td style="text-align:right; font-weight:bold;">₹${(parseFloat(totals.balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` :
      isCash ?
        `<td colspan="3" style="text-align:right; font-weight:bold;">REGISTRY TOTALS</td>
       <td style="text-align:right; font-weight:bold;">₹${parseFloat(totals.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
       <td style="text-align:right; font-weight:bold;">₹${parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
       <td style="text-align:right; font-weight:bold;">₹${parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
       <td style="text-align:right; font-weight:bold;">₹${Math.abs(parseFloat(totals.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(totals.balance || 0) >= 0 ? 'C' : 'D'}</td>` :
        isPurchase || isSale || isTransactional ?
          `<td colspan="5" style="text-align:right; font-weight:bold;">REGISTRY TOTALS</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
       <td style="text-align:right; font-weight:bold;">${Math.abs(parseFloat(totals.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${isSale ? (parseFloat(totals.balance || 0) >= 0 ? 'CR' : 'DR') : (parseFloat(totals.balance || 0) >= 0 ? 'DR' : 'CR')}</td>` :
          isDangar ?
            `<td colspan="8" style="text-align:right; font-weight:bold;">GRAND TOTAL</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.qty || 0).toFixed(2)} Qt</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>` :
            hideBardan ?
              `<td colspan="6" style="text-align:right; font-weight:bold;">CONSOLIDATED TOTALS</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
       <td style="text-align:right; font-weight:bold;">${Math.abs(parseFloat(totals.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(totals.closing_balance || 0) >= 0 ? 'DR' : 'CR'}</td>` :
              `<td colspan="6" style="text-align:right; font-weight:bold;">CONSOLIDATED TOTALS</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
       <td style="text-align:right; font-weight:bold;">${parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
       <td style="text-align:right; font-weight:bold;">${Math.abs(parseFloat(totals.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(totals.closing_balance || 0) >= 0 ? 'DR' : 'CR'}</td>
       <td style="text-align:right; font-weight:bold;">${Math.abs(totalBardanBal).toLocaleString()} ${totalBardanBal >= 0 ? 'DR' : 'CR'}</td>
       <td style="text-align:right; font-weight:bold;">${totalBardanSelf.toLocaleString()}</td>
       <td style="text-align:right; font-weight:bold;">₹${Math.abs(totalBardanAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${totalBardanPenalty >= 0 ? 'DR' : 'CR'}</td>`;

    const reportTitle = t('sabhasadLedgerSummary.ledgerSummaryRegistry') || (isGu ? 'સભ્ય ખાતા સારાંશ' : 'Sabhasad Ledger Summary');
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const formattedDate = isGu ? `તારીખ: ${dateStr}` : `Date: ${dateStr}`;
    const fy = localStorage.getItem('financialYear') || '2026-27';
    const formattedFY = isGu ? `વર્ષ : ${fy}` : `FY: ${fy}`;
    const periodStr = `${formatDisplayDate(dateRange.startDate)} — ${formatDisplayDate(dateRange.endDate)}`;

    win.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&family=Outfit:wght@400;600;700&display=swap');
            @font-face { font-family:'Prompt'; src:url('/fonts/Prompt.ttf') format('truetype'); }
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family:'Outfit','Noto Sans Gujarati',Arial,sans-serif; padding:16px; background:#fff; color:#000; }
            .pdf-report-container { border:1.5px solid #000; overflow:hidden; background:#fff; }
            .pdf-header-company { border-bottom:1.5px solid #000; padding:12px; text-align:center; font-size:112px; font-weight:bold; font-family:'Prompt','Noto Sans Gujarati','Outfit',sans-serif; color:#000; }
            .pdf-header-title { border-bottom:1.5px solid #000; padding:12px; text-align:center; font-size:14px; font-weight:bold; font-family:'Noto Sans Gujarati','Outfit',sans-serif; color:#000; }
            .pdf-info-bar { border-bottom:1.5px solid #000; padding:12px 12px; display:flex; justify-content:space-between; align-items:center; background:#fff; }
            .pdf-table { width:100%; border-collapse:collapse; }
            .pdf-table th, .pdf-table td { border:1.5px solid #000 !important; padding:6px 12px; font-size:10px; color:#000; }
            .pdf-table th { font-weight:bold; background:#fff; border-top:none !important; }
            .pdf-table th:first-child, .pdf-table td:first-child { border-left:none !important; }
            .pdf-table th:last-child, .pdf-table td:last-child { border-right:none !important; }
            .pdf-table tfoot td { font-weight:bold; font-size:12px; border-bottom:none !important; }
            @media print { @page { size:A4 landscape; margin:10mm; } body { padding:0; } }
          </style>
        </head>
        <body>
          <div class="pdf-report-container">
            <div class="pdf-header-company">${cName}</div>
            <div class="pdf-header-title">${reportTitle}</div>
            <div class="pdf-info-bar">
              <div style="font-size:12px;font-weight:bold;color:#000;">${isGu ? 'સમયગાળો' : 'Period'}: ${periodStr}</div>
              <div style="font-size:12px;font-weight:bold;color:#000;display:flex;gap:16px;">
                <span>${formattedDate}</span><span>|</span><span>${formattedFY}</span>
              </div>
            </div>
            <table class="pdf-table">
              <thead><tr>${thCols}</tr></thead>
              <tbody>${rows.join('')}</tbody>
              <tfoot><tr>${tfootRow}</tr></tfoot>
            </table>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleExportPDF = async () => {
    if (data.length === 0) return;

    const periodStr = `${formatDisplayDate(dateRange.startDate)} — ${formatDisplayDate(dateRange.endDate)}`;
    const reportTitle = t('sabhasadLedgerSummary.ledgerSummaryRegistry') || 'Sabhasad Ledger Summary';
    const allRows = [...data, { _isTotals: true }];

    let columns = [];
    if (isBardan) {
      columns = [
        {
          header: t('sabhasadLedgerSummary.srNo'),
          align: 'center', width: '5%',
          render: (row, idx) => row._isTotals ? '' : (isGu ? toGujaratiDigits(String(idx + 1).padStart(3, '0')) : String(idx + 1).padStart(3, '0'))
        },
        {
          header: t('sabhasadLedgerSummary.code'),
          align: 'center', width: '8%',
          render: (row) => row._isTotals ? '' : (row.member_code ? (isGu ? toGujaratiDigits(row.member_code) : row.member_code) : '-')
        },
        {
          header: t('sabhasadLedgerSummary.memberName'),
          usePromptFont: true,
          render: (row) => row._isTotals ? `<strong style="float:right">REGISTRY TOTALS:</strong>` : `<strong>${displayMemberName(row) || '-'}</strong>`
        },
        {
          header: t('sabhasadLedgerSummary.village'),
          usePromptFont: true,
          render: (row) => row._isTotals ? '' : (row.village_name || '-')
        },
        {
          header: t('sabhasadLedgerSummary.opening'),
          align: 'right', width: '10%',
          render: (row) => row._isTotals ? `<strong>${toLocaleSimple(totals.opening_balance || 0)}</strong>` : toLocaleSimple(row.opening_balance || 0)
        },
        {
          header: t('sabhasadLedgerSummary.debit') + ' (+)',
          align: 'right', width: '10%',
          render: (row) => row._isTotals ? `<strong>${toLocaleSimple(totals.debit || 0)}</strong>` : (parseFloat(row.debit || 0) > 0 ? toLocaleSimple(row.debit || 0) : '—')
        },
        {
          header: t('sabhasadLedgerSummary.credit') + ' (-)',
          align: 'right', width: '10%',
          render: (row) => row._isTotals ? `<strong>${toLocaleSimple(totals.credit || 0)}</strong>` : (parseFloat(row.credit || 0) > 0 ? toLocaleSimple(row.credit || 0) : '—')
        },
        {
          header: t('sabhasadLedgerSummary.selfJama'),
          align: 'right', width: '10%',
          render: (row) => row._isTotals ? `<strong>${toLocaleSimple(totals.self_credit || 0)}</strong>` : (parseFloat(row.self_credit || 0) > 0 ? toLocaleSimple(row.self_credit || 0) : '—')
        },
        {
          header: t('sabhasadLedgerSummary.balance'),
          align: 'right', width: '11%',
          render: (row) => {
            if (row._isTotals) {
              const bal = parseFloat(totals.balance || 0);
              return `<strong>${toLocaleSimple(Math.abs(bal))} ${bal >= 0 ? 'DR' : 'CR'}</strong>`;
            }
            return `<strong>${toLocaleSimple(Math.abs(parseFloat(row.balance || 0)))} ${parseFloat(row.balance || 0) >= 0 ? 'DR' : 'CR'}</strong>`;
          }
        },
        {
          header: t('sabhasadLedgerSummary.bardanAmt'),
          align: 'right', width: '12%',
          render: (row) => {
            if (row._isTotals) {
              return `<strong>${fmtAmount((parseFloat(totals.balance || 0) * bardanPrice), '₹')}</strong>`;
            }
            return `<strong>${fmtAmount((parseFloat(row.balance || 0) * bardanPrice), '₹')}</strong>`;
          }
        }
      ];
    } else if (isCash) {
      columns = [
        {
          header: t('sabhasadLedgerSummary.srNo'),
          align: 'center', width: '6%',
          render: (row, idx) => row._isTotals ? '' : (isGu ? toGujaratiDigits(String(idx + 1).padStart(3, '0')) : String(idx + 1).padStart(3, '0'))
        },
        {
          header: t('sabhasadLedgerSummary.date'),
          align: 'center', width: '12%',
          render: (row) => row._isTotals ? '' : formatDisplayDate(row.entry_date)
        },
        {
          header: t('sabhasadLedgerSummary.descriptionMember'),
          usePromptFont: true,
          render: (row) => {
            if (row._isTotals) return `<strong style="float:right">REGISTRY TOTALS:</strong>`;
            return `<strong>${displayMemberName(row) || '-'}</strong>${row.member_id ? `<br/><small style="color:#2563eb">Node: ${displayMemberName(row)} [${row.member_id}]</small>` : ''}`;
          }
        },
        {
          header: t('sabhasadLedgerSummary.debit'),
          align: 'right', width: '15%',
          render: (row) => {
            if (row._isTotals) return `<strong>${fmtAmount(totals.debit || 0, '₹')}</strong>`;
            let displayDebit = parseFloat(row.debit || 0);
            return displayDebit > 0 ? fmtAmount(displayDebit, '₹') : '—';
          }
        },
        {
          header: t('sabhasadLedgerSummary.credit'),
          align: 'right', width: '15%',
          render: (row) => {
            if (row._isTotals) return `<strong>${fmtAmount(totals.credit || 0, '₹')}</strong>`;
            let displayCredit = parseFloat(row.credit || 0);
            return displayCredit > 0 ? fmtAmount(displayCredit, '₹') : '—';
          }
        },
        {
          header: t('sabhasadLedgerSummary.balance'),
          align: 'right', width: '16%',
          render: (row) => {
            if (row._isTotals) {
              const bal = parseFloat(totals.balance || 0);
              return `<strong>${fmtAmount(Math.abs(bal), '₹')} ${bal >= 0 ? 'C' : 'D'}</strong>`;
            }
            return `<strong>${fmtAmount(Math.abs(parseFloat(row.balance || 0)), '₹')} ${parseFloat(row.balance || 0) >= 0 ? 'C' : 'D'}</strong>`;
          }
        }
      ];
    } else if (isPurchase || isSale || isTransactional) {
      columns = [
        {
          header: t('sabhasadLedgerSummary.srNo'),
          align: 'center', width: '6%',
          render: (row, idx) => row._isTotals ? '' : (isGu ? toGujaratiDigits(String(idx + 1).padStart(3, '0')) : String(idx + 1).padStart(3, '0'))
        },
        {
          header: t('sabhasadLedgerSummary.date'),
          align: 'center', width: '12%',
          render: (row) => row._isTotals ? '' : formatDisplayDate(row.entry_date)
        },
        {
          header: t('sabhasadLedgerSummary.code'),
          align: 'center', width: '8%',
          render: (row) => row._isTotals ? '' : (row.member_code || '-')
        },
        {
          header: t('sabhasadLedgerSummary.memberName'),
          usePromptFont: true,
          render: (row) => row._isTotals ? `<strong style="float:right">REGISTRY TOTALS:</strong>` : `<strong>${displayMemberName(row) || '-'}</strong>`
        },
        {
          header: t('sabhasadLedgerSummary.description'),
          usePromptFont: true,
          render: (row) => row._isTotals ? '' : getSafeDescription(row.description)
        },
        {
          header: isSale ? t('sabhasadLedgerSummary.creditSale') : t('sabhasadLedgerSummary.debit'),
          align: 'right', width: '13%',
          render: (row) => {
            if (row._isTotals) return `<strong>${fmtAmount(totals.debit || 0, '₹')}</strong>`;
            let displayDebit = parseFloat(row.debit || 0);
            if (isSale) {
              const isCashRow = (row.payment_type || '').toLowerCase().includes('cash');
              if (isCashRow) displayDebit = 0;
            }
            return displayDebit > 0 ? fmtAmount(displayDebit, '₹') : '—';
          }
        },
        {
          header: isSale ? t('sabhasadLedgerSummary.cashSale') : t('sabhasadLedgerSummary.credit'),
          align: 'right', width: '13%',
          render: (row) => {
            if (row._isTotals) return `<strong>${fmtAmount(totals.credit || 0, '₹')}</strong>`;
            let displayCredit = parseFloat(row.credit || 0);
            if (isSale) {
              const isCashRow = (row.payment_type || '').toLowerCase().includes('cash');
              if (isCashRow) displayCredit = displayCredit || parseFloat(row.debit || 0);
            }
            return displayCredit > 0 ? fmtAmount(displayCredit, '₹') : '—';
          }
        },
        {
          header: t('sabhasadLedgerSummary.balance'),
          align: 'right', width: '14%',
          render: (row) => {
            const balLabel = isSale ? (parseFloat(row.balance || 0) >= 0 ? 'CR' : 'DR') : (parseFloat(row.balance || 0) >= 0 ? 'DR' : 'CR');
            if (row._isTotals) {
              const bal = parseFloat(totals.balance || 0);
              const totLabel = isSale ? (bal >= 0 ? 'CR' : 'DR') : (bal >= 0 ? 'DR' : 'CR');
              return `<strong>${toLocale(Math.abs(bal))} ${totLabel}</strong>`;
            }
            return `<strong>${toLocale(Math.abs(parseFloat(row.balance || 0)))} ${balLabel}</strong>`;
          }
        }
      ];
    } else if (isDangar) {
      columns = [
        {
          header: t('sabhasadLedgerSummary.srNo'),
          align: 'center', width: '5%',
          render: (row, idx) => row._isTotals ? '' : (isGu ? toGujaratiDigits(String(idx + 1).padStart(3, '0')) : String(idx + 1).padStart(3, '0'))
        },
        {
          header: t('sabhasadLedgerSummary.code'),
          align: 'center', width: '8%',
          render: (row) => row._isTotals ? '' : (row.member_code || '-')
        },
        {
          header: t('sabhasadLedgerSummary.memberName'),
          usePromptFont: true,
          render: (row) => row._isTotals ? `<strong style="float:right">GRAND TOTAL:</strong>` : `<strong>${displayMemberName(row) || '-'}</strong>`
        },
        {
          header: t('sabhasadLedgerSummary.date'),
          align: 'center', width: '11%',
          render: (row) => row._isTotals ? '' : formatDisplayDate(row.entry_date)
        },
        {
          header: t('sabhasadLedgerSummary.purchesRate'),
          align: 'right', width: '10%',
          render: (row) => row._isTotals ? '' : toLocale(row.rate || 0)
        },
        {
          header: t('sabhasadLedgerSummary.itemName'),
          usePromptFont: true,
          render: (row) => row._isTotals ? '' : (row.item_name || '-')
        },
        {
          header: t('sabhasadLedgerSummary.class'),
          align: 'center', width: '8%',
          render: (row) => row._isTotals ? '' : (row.quality_class || '-')
        },
        {
          header: t('sabhasadLedgerSummary.season'),
          align: 'center', width: '9%',
          render: (row) => row._isTotals ? '' : (row.book_type || '-')
        },
        {
          header: t('sabhasadLedgerSummary.totalQty'),
          align: 'right', width: '11%',
          render: (row) => {
            if (row._isTotals) return `<strong>${parseFloat(totals.qty || 0).toFixed(2)} Qt</strong>`;
            return `${toFixed2(row.net_quintal || 0)} Qt`;
          }
        },
        {
          header: t('sabhasadLedgerSummary.totalRate'),
          align: 'right', width: '12%',
          render: (row) => {
            if (row._isTotals) return `<strong>${toLocale(totals.amount || 0)}</strong>`;
            return toLocale(row.amount || 0);
          }
        }
      ];
    } else {
      // Standard / Default Accounts Summary
      columns = [
        {
          header: t('sabhasadLedgerSummary.srNo'),
          align: 'center', width: '4%',
          render: (row, idx) => row._isTotals ? '' : (isGu ? toGujaratiDigits(String(idx + 1).padStart(3, '0')) : String(idx + 1).padStart(3, '0'))
        },
        {
          header: t('sabhasadLedgerSummary.code'),
          align: 'center', width: '7%',
          render: (row) => row._isTotals ? '' : (row.member_code || '-')
        },
        {
          header: t('sabhasadLedgerSummary.memberName'),
          usePromptFont: true,
          render: (row) => row._isTotals ? `<strong style="float:right">CONSOLIDATED TOTALS:</strong>` : `<strong>${displayMemberName(row) || '-'}</strong>`
        },
        {
          header: t('sabhasadLedgerSummary.accountName'),
          usePromptFont: true,
          render: (row) => row._isTotals ? '' : (row.account_name_gu || row.account_name || '-')
        },
        {
          header: t('sabhasadLedgerSummary.opening'),
          align: 'right', width: '10%',
          render: (row) => {
            if (row._isTotals) return `<strong>${toLocale(totals.opening_balance || 0)}</strong>`;
            return `<span style="color:${parseFloat(row.opening_balance) >= 0 ? '#059669' : '#dc2626'}">${parseFloat(row.opening_balance) >= 0 ? '+' : '-'}${toLocale(Math.abs(parseFloat(row.opening_balance)))}</span>`;
          }
        },
        {
          header: t('sabhasadLedgerSummary.date'),
          align: 'center', width: '10%',
          render: (row) => row._isTotals ? '' : (row.last_activity_date ? formatDisplayDate(row.last_activity_date) : '-')
        },
        {
          header: t('sabhasadLedgerSummary.debit'),
          align: 'right', width: '10%',
          render: (row) => row._isTotals ? `<strong>${toLocale(totals.debit || 0)}</strong>` : toLocale(row.debit || 0)
        },
        {
          header: t('sabhasadLedgerSummary.credit'),
          align: 'right', width: '10%',
          render: (row) => row._isTotals ? `<strong>${toLocale(totals.credit || 0)}</strong>` : toLocale(row.credit || 0)
        },
        {
          header: t('sabhasadLedgerSummary.closing'),
          align: 'right', width: '11%',
          render: (row) => {
            if (row._isTotals) {
              return `<strong>${toLocale(Math.abs(parseFloat(totals.closing_balance || 0)))} ${parseFloat(totals.closing_balance || 0) >= 0 ? 'DR' : 'CR'}</strong>`;
            }
            return `<strong>${toLocale(Math.abs(parseFloat(row.closing_balance || 0)))} ${parseFloat(row.closing_balance || 0) >= 0 ? 'DR' : 'CR'}</strong>`;
          }
        },
        ...(!hideBardan ? [
          {
            header: t('sabhasadLedgerSummary.bardanBal'),
            align: 'right', width: '10%',
            render: (row) => {
              if (row._isTotals) return `<strong>${Math.abs(totalBardanBal).toLocaleString()} ${totalBardanBal >= 0 ? 'DR' : 'CR'}</strong>`;
              return `${toLocale(Math.abs(parseFloat(row.bardan_balance || 0)))} ${parseFloat(row.bardan_balance || 0) >= 0 ? 'DR' : 'CR'}`;
            }
          },
          {
            header: t('sabhasadLedgerSummary.selfJama'),
            align: 'right', width: '8%',
            render: (row) => {
              if (row._isTotals) return `<strong>${totalBardanSelf.toLocaleString()}</strong>`;
              return toLocale(row.bardan_self_jama || 0);
            }
          },
          {
            header: t('sabhasadLedgerSummary.bardanAmt'),
            align: 'right', width: '12%',
            render: (row) => {
              if (row._isTotals) return `<strong>₹${Math.abs(totalBardanAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${totalBardanPenalty >= 0 ? 'DR' : 'CR'}</strong>`;
              return `${fmtAmount(Math.abs((parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0)) * bardanPrice), '₹')} ${parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0) >= 0 ? 'DR' : 'CR'}`;
            }
          }
        ] : [])
      ];
    }

    await exportToPDF({
      title: reportTitle,
      columns,
      rows: allRows,
      isGu,
      orientation: 'landscape',
      metaInfo: [{ label: isGu ? 'સમયગાળો' : 'Period', value: periodStr }],
      filename: `Sabhasad_Ledger_${dateRange.startDate}_${dateRange.endDate}.pdf`
    });
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
    setVillage('');
    setBankName('');
    setSeason('');
    setItemId('');
    setFromMemberCode('');
    setToMemberCode('');
    setDangarClass('');
  };

  const handleSelectAcc = (acc) => {
    setAccountId(acc?.id || 'all');
    setAccCode(acc ? String(acc.id) : '');
    setAccName(acc ? displayAccountName(acc) : '');
    setShowAccDrop(false);
  };

  const handleSelectMem = (mem) => {
    setMemberId(mem?.id || 'all');
    setMemCode(mem ? String(mem.id) : '');
    setMemName(mem ? displayMemberName(mem) : '');
    setShowMemDrop(false);
  };

  // Translate input texts when language changes
  useEffect(() => {
    if (accountId !== 'all') {
      const activeAcc = accounts.find(a => a.id === parseInt(accountId));
      if (activeAcc) {
        setAccName(displayAccountName(activeAcc));
      }
    }
    if (memberId !== 'all') {
      const activeMem = members.find(m => m.id === parseInt(memberId));
      if (activeMem) {
        setMemName(displayMemberName(activeMem));
      }
    }
  }, [i18n.language, accounts, members, accountId, memberId]);

  useEffect(() => {
    if (accCode && accountId === 'all') {
      const match = accounts.find(a => String(a.id) === accCode || (a.account_code || '').toLowerCase() === accCode.toLowerCase());
      if (match) handleSelectAcc(match);
    } else if (!accCode && accountId !== 'all') {
      handleSelectAcc(null);
    }
  }, [accCode, accounts]);

  useEffect(() => {
    if (accName && accountId === 'all') {
      const match = accounts.find(a =>
        (a.account_name || '').toLowerCase() === accName.toLowerCase() ||
        (a.account_name_gu || '').toLowerCase() === accName.toLowerCase() ||
        (a.eng_name || '').toLowerCase() === accName.toLowerCase()
      );
      if (match) handleSelectAcc(match);
    }
  }, [accName, accounts]);

  useEffect(() => {
    if (memCode && memberId === 'all') {
      const match = members.find(m => String(m.id) === memCode || (m.member_code || '').toLowerCase() === memCode.toLowerCase());
      if (match) handleSelectMem(match);
    } else if (!memCode && memberId !== 'all') {
      handleSelectMem(null);
    }
  }, [memCode, members]);

  useEffect(() => {
    if (memName && memberId === 'all') {
      const match = members.find(m =>
        (m.member_name || '').toLowerCase() === memName.toLowerCase() ||
        (m.member_name_gu || '').toLowerCase() === memName.toLowerCase() ||
        (m.eng_name || '').toLowerCase() === memName.toLowerCase()
      );
      if (match) handleSelectMem(match);
    }
  }, [memName, members]);

  useEffect(() => {
    if (company?.id) {
      fetchReportData();
    }
  }, [dateRange.startDate, dateRange.endDate, accountId, memberId, hideZeroBalance, village, bankName, season, itemId, fromMemberCode, toMemberCode, dangarClass]);

  const filteredAccs = accounts.filter(a => {
    const nameQuery = accName ? accName.toLowerCase() : '';
    return !nameQuery ||
      (a.account_name || '').toLowerCase().includes(nameQuery) ||
      (a.account_name_gu || '').toLowerCase().includes(nameQuery) ||
      (a.eng_name || '').toLowerCase().includes(nameQuery);
  });

  const filteredMems = members.filter(m => {
    const nameQuery = memName ? memName.toLowerCase() : '';
    return !nameQuery ||
      (m.member_name || '').toLowerCase().includes(nameQuery) ||
      (m.member_name_gu || '').toLowerCase().includes(nameQuery) ||
      (m.eng_name || '').toLowerCase().includes(nameQuery);
  });

  if (loading || !company) return <Loading />;

  const selectedAcc = accounts.find(a => a.id === parseInt(accountId));
  const hasDangar = data.some(row =>
    row.account_name?.toLowerCase().includes('dangar') ||
    row.account_code === 'DS0001'
  );

  const isDangar = backendFlags.isDangar || (selectedAcc?.account_name || accName || '')?.toLowerCase().includes('dangar') || hasDangar;
  const isPurchase = backendFlags.isPurchase || (selectedAcc?.account_name || accName || '')?.toLowerCase().includes('purches') ||
    (selectedAcc?.account_name || accName || '')?.toLowerCase().includes('purchase') ||
    (selectedAcc?.account_name || accName || '')?.toLowerCase().includes('qrldi') ||
    (selectedAcc?.account_name || accName || '')?.toLowerCase().includes('\u0a96\u0ab0\u0ac0\u0aa6\u0ac0');
  const isInterest = selectedAcc?.account_code === 'IK0001' ||
    selectedAcc?.account_name?.toLowerCase().includes('interest khate') ||
    selectedAcc?.account_name?.toLowerCase().includes('vyaj');
  const isBrokerage = selectedAcc?.account_name?.toLowerCase().includes('brokerage');
  const isLabour = selectedAcc?.account_name?.toLowerCase().includes('labour');
  const isSale = backendFlags.isSale || (selectedAcc?.account_name || accName || '')?.toLowerCase().includes('sale') ||
    (selectedAcc?.account_name || accName || '')?.toLowerCase().includes('veca') ||
    (selectedAcc?.account_name || accName || '')?.toLowerCase().includes('\u0ab5\u0ac7\u0a9a\u0abe\u0aa3');
  const isBardan = backendFlags.isBardan || (selectedAcc?.account_name || accName || '')?.toLowerCase().includes('bardan system');
  const isTransactional = backendFlags.isTransactional || (!!accountId && !isSale && !isBardan);
  const isCash = data.some(r => (r.payment_type || '').toLowerCase().includes('cash'));

  const hideBardan = accountId !== 'all' &&
    !selectedAcc?.account_name?.toLowerCase().includes('dangar') &&
    !selectedAcc?.account_name?.toLowerCase().includes('bardan') &&
    !data.some(r => r.account_name?.toLowerCase().includes('dangar') || r.account_code === 'DS0001');

  // Calculating display balance values
  const totalBardanBal = data.reduce((s, r) => s + parseFloat(r.bardan_balance || 0), 0);
  const totalBardanSelf = data.reduce((s, r) => s + parseFloat(r.bardan_self_jama || 0), 0);
  const totalBardanAmt = data.reduce((s, r) => s + (parseFloat(r.bardan_penalty_balance || r.bardan_balance || 0) * bardanPrice), 0);
  const totalBardanPenalty = data.reduce((s, r) => s + parseFloat(r.bardan_penalty_balance || r.bardan_balance || 0), 0);

  // Check if any filters are currently active (different from default settings)
  const isDefaultStartDate = dateRange.startDate === new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const isDefaultEndDate = dateRange.endDate === new Date().toISOString().split('T')[0];
  const hasActiveFilters = accountId !== 'all' || memberId !== 'all' || village !== '' || bankName !== '' || season !== '' || itemId !== '' || hideZeroBalance || !isDefaultStartDate || !isDefaultEndDate;

  return (
    <div className="min-h-screen bg-slate-50 font-sans select-none text-slate-800 pb-8">
      <Toast message={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />



      <div className="max-w-[1600px] mx-auto px-4 py-4">

        {/* Polished Ledger Statement Registry Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col min-h-[600px] relative shadow-none">

          {/* Table Header Bar */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
            <div className="flex items-center gap-4">
              <span className={`text-sm font-extrabold text-slate-800 tracking-wider ${isGu ? 'normal-case' : 'uppercase'}`}>
                {memberId !== 'all' || accountId !== 'all' ? (
                  <span className="font-extrabold text-[#1d5f84]" style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}>
                    {formatBilingualText(
                      [
                        memberId !== 'all' ? memName : null,
                        accountId !== 'all' ? accName : null
                      ].filter(Boolean).join(' ➔ ')
                    )}
                  </span>
                ) : (
                  t('sabhasadLedgerSummary.ledgerRegistryList', 'Registry Transaction Records')
                )}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowFiltersDrawer(true)}
                className={`px-2.5 h-7 flex items-center gap-1.5 justify-center transition-all rounded-md cursor-pointer relative select-none shadow-sm text-sm font-semibold ${hasActiveFilters
                  ? 'bg-[#1d5f84] border border-[#1d5f84] text-white hover:bg-[#154662]'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
              >
                <Filter size={13} className={hasActiveFilters ? "text-white" : "text-slate-500"} />
                <span>{t('sabhasadLedgerSummary.filters', 'Filters')}</span>
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 border border-white"></span>
                  </span>
                )}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-2.5 h-7 flex items-center gap-1.5 justify-center transition-all rounded-md cursor-pointer relative select-none shadow-sm text-sm font-semibold bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
                >
                  <X size={13} className="text-rose-600" />
                  <span>{isGu ? 'ક્લિયર' : 'Clear'}</span>
                </button>
              )}
              <button
                onClick={handlePrint}
                title={t('sabhasadLedgerSummary.print', 'Print')}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <Printer size={13} className="text-slate-500" />
              </button>
              <button
                onClick={handleExportPDF}
                title={t('sabhasadLedgerSummary.pdf', 'PDF')}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <FileText size={13} className="text-slate-500" />
              </button>
              <button
                onClick={fetchReportData}
                title={t('sabhasadLedgerSummary.refreshRegistry', 'Refresh')}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <RefreshCcw size={13} className={`text-slate-500 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] relative">
            <table className="w-full text-left border-collapse select-none">
              <thead className="sticky top-0 bg-slate-50 z-30 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.srNo')}</th>
                  {isBardan ? (
                    <>
                      <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.code')}</th>
                      <th className="px-3 py-2 border-r border-slate-100 min-w-[200px]">{t('sabhasadLedgerSummary.memberName')}</th>
                      <th className="px-3 py-2 border-r border-slate-100 min-w-[100px]">{t('sabhasadLedgerSummary.village')}</th>
                      <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.opening')}</th>
                      <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.debit')} (+)</th>
                      <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.credit')} (-)</th>
                      <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.selfJama')}</th>
                      <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.balance')}</th>
                      <th className="px-3 py-2 text-right">{t('sabhasadLedgerSummary.bardanAmt')}</th>
                    </>
                  ) : (isSale || isTransactional) ? (
                    <>
                      <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.code')}</th>
                      <th className="px-3 py-2 border-r border-slate-100 min-w-[180px]">{t('sabhasadLedgerSummary.memberName')}</th>
                      <th className="px-3 py-2 border-r border-slate-100 min-w-[180px]">{t('sabhasadLedgerSummary.description')}</th>
                      <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.opening')}</th>
                      <th className="px-3 py-2 border-r border-slate-100 text-right">
                        {isTransactional ? t('sabhasadLedgerSummary.debit') : (isSale ? t('sabhasadLedgerSummary.creditSale') : t('sabhasadLedgerSummary.debit'))}
                      </th>
                      <th className="px-3 py-2 border-r border-slate-100 text-right">
                        {isTransactional ? t('sabhasadLedgerSummary.credit') : (isSale ? t('sabhasadLedgerSummary.cashSale') : t('sabhasadLedgerSummary.credit'))}
                      </th>
                      <th className="px-3 py-2 text-right">{t('sabhasadLedgerSummary.balance')}</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.code')}</th>
                      <th className="px-3 py-2 border-r border-slate-100 min-w-[220px]">{t('sabhasadLedgerSummary.memberName')}</th>
                      {isDangar ? (
                        <>
                          <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.opening')}</th>
                          <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.date')}</th>
                          <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.purchesRate')}</th>
                          <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.itemName')}</th>
                          <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.class')}</th>
                          <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.season')}</th>
                          <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.totalQty')}</th>
                          <th className="px-3 py-2 text-right">{t('sabhasadLedgerSummary.totalRate')}</th>
                        </>
                      ) : isInterest ? (
                        <>
                          <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.opening')}</th>
                          <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.accrualDate')}</th>
                          <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.interestRate')}</th>
                          <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.days')}</th>
                          <th className="px-3 py-2 border-r border-slate-100 min-w-[150px]">{t('sabhasadLedgerSummary.reference')}</th>
                          <th className="px-3 py-2 text-right">{t('sabhasadLedgerSummary.interestAmount')}</th>
                        </>
                      ) : (isBrokerage || isLabour) ? (
                        <>
                          <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.opening')}</th>
                          <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.date')}</th>
                          <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.invoiceNo')}</th>
                          <th className="px-3 py-2 border-r border-slate-100 min-w-[180px]">{t('sabhasadLedgerSummary.description')}</th>
                          <th className="px-3 py-2 text-right">
                            {isBrokerage ? t('sabhasadLedgerSummary.brokerageAmt').split(' ')[0] : t('sabhasadLedgerSummary.labourAmt').split(' ')[0]} Amt
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2 border-r border-slate-100 min-w-[180px]">{t('sabhasadLedgerSummary.accountName')}</th>
                          <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.opening')}</th>
                          <th className="px-3 py-2 border-r border-slate-100 text-center">{t('sabhasadLedgerSummary.date')}</th>
                          <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.debit')}</th>
                          <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.credit')}</th>
                          <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.closing')}</th>
                          {!hideBardan && (
                            <>
                              <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.bardanBal')}</th>
                              <th className="px-3 py-2 border-r border-slate-100 text-right">{t('sabhasadLedgerSummary.selfJama')}</th>
                              <th className="px-3 py-2 text-right">{t('sabhasadLedgerSummary.bardanAmt')}</th>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-sans text-sm">
                {syncing ? (
                  <tr>
                    <td colSpan="13" className="py-24 text-center">
                      <RefreshCcw size={28} className="animate-spin text-slate-350 mx-auto mb-2 text-slate-400" />
                      <p className="text-slate-400 font-bold uppercase text-[12px] tracking-widest italic">
                        {t('sabhasadLedgerSummary.synchronizingRegistry', 'Fetching Statement Data...')}
                      </p>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="py-24 text-center text-slate-400 font-bold text-sm tracking-wider bg-slate-50/20">
                      <Database size={32} className="mx-auto mb-2 opacity-40 text-[#1d5f84]" />
                      {t('sabhasadLedgerSummary.noSabhasadRecordsFound', 'No transaction ledger records found.')}
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.map((row, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                        {/* Serial number */}
                        <td className={`px-3 py-1.5 text-[10px] text-slate-400 border-r border-slate-100 font-medium ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                          {isGu ? toGujaratiDigits(String(idx + 1).padStart(3, '0')) : String(idx + 1).padStart(3, '0')}
                        </td>

                        {/* Code & Name (for summary lists) */}
                        {(!isSale && !isBardan && !isTransactional) && (
                          <td className={`px-3 py-1.5 text-[10px] text-[#1d5f84] font-bold border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                            {isGu ? toGujaratiDigits(row.member_code) : row.member_code}
                          </td>
                        )}

                        {(!isSale && !isBardan && !isTransactional) && (
                          <td className="px-3 py-1.5 border-r border-slate-100 leading-tight">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  onClick={() => row.member_id && openAudit(row)}
                                  className={`font-bold text-[12px] text-slate-800 ${isGu ? 'normal-case' : 'uppercase'} ${row.member_id ? 'hover:text-[#1d5f84] hover:underline cursor-pointer' : ''}`}
                                  style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}
                                >
                                  {displayMemberName(row)}
                                </span>
                                {row.member_id && (
                                  <button
                                    onClick={() => openAudit(row)}
                                    className="p-0.5 text-slate-355 hover:text-[#1d5f84] hover:bg-slate-105 hover:bg-slate-100 rounded transition cursor-pointer shrink-0"
                                    title="Audit Ledger"
                                  >
                                    <Activity size={10} />
                                  </button>
                                )}

                                {row.bank_name && (
                                  <span className="text-[12px] font-sans text-blue-500 font-medium px-1 bg-blue-50 rounded-sm">Bank: {row.bank_name}</span>
                                )}
                                {row.active_season && (
                                  <span className="text-[12px] font-sans text-amber-600 font-medium px-1 bg-amber-50 rounded-sm">Season: {row.active_season}</span>
                                )}
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Rendering dynamic columns */}
                        {(() => {
                          if (isSale || isBardan || isTransactional) {
                            let displayDebit = parseFloat(row.debit || 0);
                            let displayCredit = parseFloat(row.credit || 0);

                            if (isSale) {
                              const isCash = (row.payment_type || '').toLowerCase().includes('cash');
                              const amount = displayDebit || displayCredit;
                              if (isCash) { displayDebit = 0; displayCredit = amount; }
                              else { displayDebit = amount; displayCredit = 0; }
                            }

                            if (isBardan) {
                              return (
                                <>
                                  <td className={`px-3 py-1.5 text-[10px] text-[#1d5f84] font-bold border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                    {isGu ? toGujaratiDigits(row.member_code) : row.member_code}
                                  </td>
                                  <td className="px-3 py-1.5 border-r border-slate-100 leading-tight">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        onClick={() => row.member_id && openAudit(row)}
                                        className={`font-bold text-[12px] text-slate-800 ${isGu ? 'normal-case' : 'uppercase'} ${row.member_id ? 'hover:text-[#1d5f84] hover:underline cursor-pointer' : ''}`}
                                        style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}
                                      >
                                        {displayMemberName(row)}
                                      </span>
                                      {row.member_id && (
                                        <button
                                          onClick={() => openAudit(row)}
                                          className="p-0.5 text-slate-355 hover:text-[#1d5f84] hover:bg-slate-100 rounded transition cursor-pointer"
                                          title="Audit Ledger"
                                        >
                                          <Activity size={10} />
                                        </button>
                                      )}

                                    </div>
                                  </td>
                                  <td className="px-3 py-1.5 text-[10px] text-slate-600 border-r border-slate-100 truncate">{formatBilingualText(row.village_name || '-')}</td>
                                  <td className={`px-3 py-1.5 text-[12px] text-right text-slate-700 border-r border-slate-100 font-semibold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                    {isGu ? toGujaratiDigits(parseFloat(row.opening_balance || 0).toLocaleString()) : parseFloat(row.opening_balance || 0).toLocaleString()}
                                  </td>
                                  <td className={`px-3 py-1.5 text-[12px] text-right text-blue-600 border-r border-slate-100 font-semibold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                    {parseFloat(row.debit || 0) > 0 ? (isGu ? toGujaratiDigits(parseFloat(row.debit || 0).toLocaleString()) : parseFloat(row.debit || 0).toLocaleString()) : '—'}
                                  </td>
                                  <td className={`px-3 py-1.5 text-[12px] text-right text-emerald-600 border-r border-slate-100 font-semibold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                    {parseFloat(row.credit || 0) > 0 ? (isGu ? toGujaratiDigits(parseFloat(row.credit || 0).toLocaleString()) : parseFloat(row.credit || 0).toLocaleString()) : '—'}
                                  </td>
                                  <td className={`px-3 py-1.5 text-[12px] text-right text-slate-700 border-r border-slate-100 font-semibold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                    {row.self_credit > 0 ? (isGu ? toGujaratiDigits(row.self_credit.toLocaleString()) : row.self_credit.toLocaleString()) : '—'}
                                  </td>
                                  <td className={`px-3 py-1.5 text-[12px] text-right border-r border-slate-100 font-bold text-slate-800 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                    {isGu ? toGujaratiDigits(Math.abs(parseFloat(row.balance || 0)).toLocaleString()) : Math.abs(parseFloat(row.balance || 0)).toLocaleString()} {parseFloat(row.balance || 0) >= 0 ? 'DR' : 'CR'}
                                  </td>
                                  <td className={`px-3 py-1.5 text-[12px] text-right text-slate-800 font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                    ₹{isGu ? toGujaratiDigits((parseFloat(row.balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })) : (parseFloat(row.balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                </>
                              );
                            }

                            if (isTransactional) {
                              return (
                                <>
                                  <td className={`px-3 py-1.5 text-[10px] text-[#1d5f84] font-bold border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                    {isGu ? toGujaratiDigits(row.member_code || '-') : (row.member_code || '-')}
                                  </td>
                                  <td className="px-3 py-1.5 border-r border-slate-100 leading-tight">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        onClick={() => row.member_id && openAudit(row)}
                                        className={`font-bold text-[12px] text-slate-800 ${isGu ? 'normal-case' : 'uppercase'} ${row.member_id ? 'hover:text-[#1d5f84] hover:underline cursor-pointer' : ''}`}
                                        style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}
                                      >
                                        {displayMemberName(row) || '—'}
                                      </span>
                                      {row.member_id && (
                                        <button
                                          onClick={() => openAudit(row)}
                                          className="p-0.5 text-slate-355 hover:text-[#1d5f84] hover:bg-slate-100 rounded transition cursor-pointer"
                                          title="Audit Ledger"
                                        >
                                          <Activity size={10} />
                                        </button>
                                      )}

                                    </div>
                                  </td>
                                  <td className="px-3 py-1.5 text-[10px] text-slate-600 border-r border-slate-100 leading-tight uppercase font-semibold">
                                    {getSafeDescription(row.description) !== '—' ? formatBilingualText(row.description) : '—'}
                                  </td>
                                  <td className={`px-3 py-1.5 text-[12px] text-right text-slate-500 border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                    {idx === 0 ? (isGu ? `₹${toGujaratiDigits(parseFloat(totals.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${parseFloat(totals.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`) : '—'}
                                  </td>
                                  <td className={`px-3 py-1.5 text-[12px] text-right text-blue-600 border-r border-slate-100 font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                    {displayDebit > 0 ? (isGu ? `₹${toGujaratiDigits(displayDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${displayDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`) : '—'}
                                  </td>
                                  <td className={`px-3 py-1.5 text-[12px] text-right text-emerald-600 border-r border-slate-100 font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                    {displayCredit > 0 ? (isGu ? `₹${toGujaratiDigits(displayCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${displayCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`) : '—'}
                                  </td>
                                  <td className={`px-3 py-1.5 text-[12px] text-right font-bold text-slate-800 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                    ₹{isGu ? toGujaratiDigits(Math.abs(parseFloat(row.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })) : Math.abs(parseFloat(row.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {parseFloat(row.balance || 0) >= 0 ? 'C' : 'D'}
                                  </td>
                                </>
                              );
                            }

                            const balLabel = isSale ? (parseFloat(row.balance || 0) >= 0 ? 'CR' : 'DR') : (parseFloat(row.balance || 0) >= 0 ? 'DR' : 'CR');
                            return (
                              <>
                                <td className={`px-3 py-1.5 text-[10px] text-[#1d5f84] font-bold border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {isGu ? toGujaratiDigits(row.member_code || '-') : (row.member_code || '-')}
                                </td>
                                <td className="px-3 py-1.5 border-r border-slate-100 leading-tight">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      onClick={() => row.member_id && openAudit(row)}
                                      className={`font-bold text-[12px] text-slate-800 ${isGu ? 'normal-case' : 'uppercase'} ${row.member_id ? 'hover:text-[#1d5f84] hover:underline cursor-pointer' : ''}`}
                                      style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}
                                    >
                                      {displayMemberName(row) || '—'}
                                    </span>
                                    {row.member_id && (
                                      <button
                                        onClick={() => openAudit(row)}
                                        className="p-0.5 text-slate-355 hover:text-[#1d5f84] hover:bg-slate-100 rounded transition cursor-pointer"
                                        title="Audit Ledger"
                                      >
                                        <Activity size={10} />
                                      </button>
                                    )}

                                  </div>
                                </td>
                                <td className="px-3 py-1.5 text-[10px] text-slate-600 border-r border-slate-100 leading-tight uppercase font-semibold">{getSafeDescription(row.description) !== '—' ? formatBilingualText(row.description) : '—'}</td>
                                <td className={`px-3 py-1.5 text-[12px] text-right text-slate-500 border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {idx === 0 ? (isGu ? `₹${toGujaratiDigits(parseFloat(totals.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${parseFloat(totals.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`) : '—'}
                                </td>
                                <td className={`px-3 py-1.5 text-[12px] text-right text-blue-600 border-r border-slate-100 font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  ₹{isGu ? toGujaratiDigits(displayDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })) : displayDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className={`px-3 py-1.5 text-[12px] text-right text-emerald-600 border-r border-slate-100 font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  ₹{isGu ? toGujaratiDigits(displayCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })) : displayCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className={`px-3 py-1.5 text-[12px] text-right font-bold text-slate-800 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  ₹{isGu ? toGujaratiDigits(Math.abs(parseFloat(row.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })) : Math.abs(parseFloat(row.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {balLabel}
                                </td>
                              </>
                            );
                          }

                          if (isDangar) {
                            return (
                              <>
                                <td className={`px-3 py-1.5 text-[12px] text-right text-slate-500 border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {idx === 0 ? (isGu ? `₹${toGujaratiDigits(parseFloat(totals.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${parseFloat(totals.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`) : '—'}
                                </td>
                                <td className={`px-3 py-1.5 text-[10px] text-slate-600 border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {formatDisplayDate(row.entry_date)}
                                </td>
                                <td className={`px-3 py-1.5 text-[12px] text-right text-slate-700 border-r border-slate-100 font-semibold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  ₹{isGu ? toGujaratiDigits(parseFloat(row.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })) : parseFloat(row.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-1.5 text-[12px] text-slate-800 border-r border-slate-100 leading-tight font-medium">{formatBilingualText(row.item_name || t('sabhasadLedgerSummary.itemName'))}</td>
                                <td className={`px-3 py-1.5 text-[10px] text-slate-600 border-r border-slate-100 text-center ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {isGu ? toGujaratiDigits(row.quality_class || '1st') : (row.quality_class || '1st')}
                                </td>
                                <td className="px-3 py-1.5 text-[10px] text-slate-600 border-r border-slate-100 font-semibold">{row.book_type || 'Kharif'}</td>
                                <td className={`px-3 py-1.5 text-[12px] text-right text-slate-800 border-r border-slate-100 font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {isGu ? toGujaratiDigits(parseFloat(row.net_quintal || 0).toFixed(2)) : parseFloat(row.net_quintal || 0).toFixed(2)} <span className="text-[12px] opacity-60 font-sans ml-0.5">Qt</span>
                                </td>
                                <td className={`px-3 py-1.5 text-[12px] text-right text-slate-800 font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  ₹{isGu ? toGujaratiDigits(parseFloat(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })) : parseFloat(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </>
                            );
                          }

                          if (isInterest) {
                            return (
                              <>
                                <td className={`px-3 py-1.5 text-[12px] text-right font-bold text-slate-700 border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {parseFloat(row.opening_balance) >= 0 ? '+' : '-'}{isGu ? `₹${toGujaratiDigits(Math.abs(parseFloat(row.opening_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${Math.abs(parseFloat(row.opening_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                </td>
                                <td className={`px-3 py-1.5 text-[10px] text-slate-600 border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {formatDisplayDate(row.transaction_date)}
                                </td>
                                <td className={`px-3 py-1.5 text-[12px] text-right text-slate-700 border-r border-slate-100 font-semibold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {isGu ? toGujaratiDigits(parseFloat(row.interest_percent || 0).toFixed(2)) : parseFloat(row.interest_percent || 0).toFixed(2)} %
                                </td>
                                <td className={`px-3 py-1.5 text-[10px] text-slate-600 border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {isGu ? toGujaratiDigits(row.days || 0) : (row.days || 0)} {isGu ? 'દિવસ' : 'Days'}
                                </td>
                                <td className="px-3 py-1.5 text-[12px] text-slate-600 border-r border-slate-100 leading-tight font-medium">{formatBilingualText(getSafeDescription(row.description, 'Interest'))}</td>
                                <td className={`px-3 py-1.5 text-[12px] text-right text-slate-800 border-r border-slate-100 font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  ₹{isGu ? toGujaratiDigits(parseFloat(row.interest_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })) : parseFloat(row.interest_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </>
                            );
                          }

                          if (isBrokerage || isLabour) {
                            return (
                              <>
                                <td className={`px-3 py-1.5 text-[12px] text-right font-bold text-slate-700 border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {parseFloat(row.opening_balance) >= 0 ? '+' : '-'}{isGu ? `₹${toGujaratiDigits(Math.abs(parseFloat(row.opening_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${Math.abs(parseFloat(row.opening_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                </td>
                                <td className={`px-3 py-1.5 text-[10px] text-slate-600 border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {formatDisplayDate(row.entry_date)}
                                </td>
                                <td className={`px-3 py-1.5 text-[10px] text-slate-600 border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {isGu ? toGujaratiDigits(row.invoice_no || '—') : (row.invoice_no || '—')}
                                </td>
                                <td className="px-3 py-1.5 text-[12px] text-slate-650 border-r border-slate-100 leading-tight">{getSafeDescription(row.description) !== '—' ? formatBilingualText(row.description) : '—'}</td>
                                <td className={`px-3 py-1.5 text-[12px] text-right text-slate-800 border-r border-slate-100 font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  ₹{isGu ? toGujaratiDigits(parseFloat(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })) : parseFloat(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </>
                            );
                          }

                          // Default Consolidated Ledger Statement columns
                          return (
                            <>
                              <td className="px-3 py-1.5 text-[12px] text-slate-700 border-r border-slate-100 leading-tight font-medium">
                                {formatBilingualText(isGu ? (row.account_name_gu || row.account_name) : row.account_name)}
                              </td>
                              <td className={`px-3 py-1.5 text-[12px] text-right border-r border-slate-100 font-bold ${parseFloat(row.opening_balance) >= 0 ? 'text-emerald-600' : 'text-rose-600'} ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                {parseFloat(row.opening_balance) >= 0 ? '+' : '-'}{isGu ? `₹${toGujaratiDigits(Math.abs(parseFloat(row.opening_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${Math.abs(parseFloat(row.opening_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                              </td>
                              <td className={`px-3 py-1.5 text-[10px] text-slate-400 border-r border-slate-100 text-center ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                {row.last_activity_date ? formatDisplayDate(row.last_activity_date) : '—'}
                              </td>
                              <td className={`px-3 py-1.5 text-[12px] text-right text-blue-600 border-r border-slate-100 font-semibold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                {parseFloat(row.debit || 0) > 0 ? (isGu ? `₹${toGujaratiDigits(parseFloat(row.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${parseFloat(row.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`) : '—'}
                              </td>
                              <td className={`px-3 py-1.5 text-[12px] text-right text-emerald-600 border-r border-slate-100 font-semibold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                {parseFloat(row.credit || 0) > 0 ? (isGu ? `₹${toGujaratiDigits(parseFloat(row.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${parseFloat(row.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`) : '—'}
                              </td>
                              <td className={`px-3 py-1.5 text-[12px] text-right font-bold text-slate-800 border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                {isGu ? `₹${toGujaratiDigits(Math.abs(parseFloat(row.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${Math.abs(parseFloat(row.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                <span className="text-[12px] text-slate-400 ml-0.5 font-bold font-sans">
                                  {parseFloat(row.closing_balance || 0) >= 0 ? 'DR' : 'CR'}
                                </span>
                              </td>

                              {!hideBardan && (
                                <>
                                  <td className={`px-3 py-1.5 text-[12px] text-right border-r border-slate-100 font-medium text-slate-650 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                    {isGu ? toGujaratiDigits(Math.abs(parseFloat(row.bardan_balance || 0)).toLocaleString()) : Math.abs(parseFloat(row.bardan_balance || 0)).toLocaleString()} {parseFloat(row.bardan_balance || 0) >= 0 ? 'DR' : 'CR'}
                                  </td>
                                  <td className={`px-3 py-1.5 text-[12px] text-right border-r border-slate-100 text-slate-600 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                    {isGu ? toGujaratiDigits(parseFloat(row.bardan_self_jama || 0).toLocaleString()) : parseFloat(row.bardan_self_jama || 0).toLocaleString()}
                                  </td>
                                  <td className={`px-3 py-1.5 text-[12px] text-right font-bold text-slate-700 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                    {isGu ? `₹${toGujaratiDigits(Math.abs(parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${Math.abs(parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                    <span className="text-[12px] text-slate-400 ml-0.5 font-bold font-sans">
                                      {parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0) >= 0 ? 'DR' : 'CR'}
                                    </span>
                                  </td>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </tr>
                    ))}

                    {/* Grand totals footer row */}
                    <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wide border-t border-b border-slate-300 sticky bottom-0 z-20">
                      {(() => {
                        if (isBardan) {
                          return (
                            <>
                              <td colSpan="4" className="px-3 py-2 text-right font-black border-r border-slate-200 text-slate-700">{t('sabhasadLedgerSummary.registryTotals', 'Registry Totals')}:</td>
                              <td className={`px-3 py-2 text-right text-[12px] tracking-tighter text-[#1d5f84] font-bold border-r border-slate-200 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>{isGu ? toGujaratiDigits(parseFloat(totals.opening_balance || 0).toLocaleString()) : parseFloat(totals.opening_balance || 0).toLocaleString()}</td>
                              <td className={`px-3 py-2 text-right text-[12px] tracking-tighter text-[#1d5f84] font-bold border-r border-slate-200 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>{isGu ? toGujaratiDigits(parseFloat(totals.debit || 0).toLocaleString()) : parseFloat(totals.debit || 0).toLocaleString()}</td>
                              <td className={`px-3 py-2 text-right text-[12px] tracking-tighter text-[#1d5f84] font-bold border-r border-slate-200 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>{isGu ? toGujaratiDigits(parseFloat(totals.credit || 0).toLocaleString()) : parseFloat(totals.credit || 0).toLocaleString()}</td>
                              <td className={`px-3 py-2 text-right text-[12px] tracking-tighter text-[#1d5f84] font-bold border-r border-slate-200 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>{isGu ? toGujaratiDigits(parseFloat(totals.self_credit || 0).toLocaleString()) : parseFloat(totals.self_credit || 0).toLocaleString()}</td>
                              <td className={`px-3 py-2 text-right text-[12px] tracking-tighter text-[#1d5f84] font-bold border-r border-slate-200 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                {isGu ? toGujaratiDigits(Math.abs(parseFloat(totals.balance || 0)).toLocaleString()) : Math.abs(parseFloat(totals.balance || 0)).toLocaleString()} {parseFloat(totals.balance || 0) >= 0 ? 'DR' : 'CR'}
                              </td>
                              <td className={`px-3 py-2 text-right text-[12px] tracking-tighter text-[#1d5f84] font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                {isGu ? `₹${toGujaratiDigits((parseFloat(totals.balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${(parseFloat(totals.balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                              </td>
                            </>
                          );
                        }

                        if (isSale || isTransactional) {
                          let displayTotalDebit = parseFloat(totals.debit || 0);
                          let displayTotalCredit = parseFloat(totals.credit || 0);

                          if (isSale) {
                            displayTotalDebit = data.reduce((acc, r) => {
                              const isCashSale = (r.payment_type || '').toLowerCase().includes('cash');
                              return acc + (isCashSale ? 0 : (parseFloat(r.debit || 0) || parseFloat(r.credit || 0)));
                            }, 0);
                            displayTotalCredit = data.reduce((acc, r) => {
                              const isCashSale = (r.payment_type || '').toLowerCase().includes('cash');
                              return acc + (isCashSale ? (parseFloat(r.debit || 0) || parseFloat(r.credit || 0)) : 0);
                            }, 0);
                          }

                          return (
                            <>
                              <td colSpan="4" className="px-3 py-2 text-right font-black border-r border-slate-200 text-slate-700">{t('sabhasadLedgerSummary.registryTotals', 'Registry Totals')}:</td>
                              <td className={`px-3 py-2 text-right text-[12px] tracking-tighter text-[#1d5f84] font-bold border-r border-slate-200 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                {isGu ? `₹${toGujaratiDigits(parseFloat(totals.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${parseFloat(totals.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                              </td>
                              <td className={`px-3 py-2 text-right text-[12px] tracking-tighter text-[#1d5f84] font-bold border-r border-slate-200 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                {isGu ? `₹${toGujaratiDigits(displayTotalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${displayTotalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                              </td>
                              <td className={`px-3 py-2 text-right text-[12px] tracking-tighter text-[#1d5f84] font-bold border-r border-slate-200 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                {isGu ? `₹${toGujaratiDigits(displayTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${displayTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                              </td>
                              <td className={`px-3 py-2 text-right text-[12px] tracking-tighter text-[#1d5f84] font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                {isGu ? `₹${toGujaratiDigits(Math.abs(parseFloat(totals.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${Math.abs(parseFloat(totals.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} {
                                  parseFloat(totals.balance || 0) >= 0
                                    ? (isTransactional ? 'C' : (isSale ? 'CR' : 'DR'))
                                    : (isTransactional ? 'D' : (isSale ? 'DR' : 'CR'))
                                }
                              </td>
                            </>
                          );
                        }

                        if (isDangar) {
                          return (
                            <>
                              <td colSpan="7" className="px-3 py-2 text-right font-black border-r border-slate-200 text-slate-700">{t('sabhasadLedgerSummary.totals', 'Totals')}:</td>
                              <td className={`px-3 py-2 text-right text-[12px] tracking-tighter text-[#1d5f84] font-bold border-r border-slate-200 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                {isGu ? toGujaratiDigits(data.reduce((acc, r) => acc + parseFloat(r.net_quintal || 0), 0).toFixed(2)) : data.reduce((acc, r) => acc + parseFloat(r.net_quintal || 0), 0).toFixed(2)} <span className="text-[12px] font-sans">Qt</span>
                              </td>
                              <td className={`px-3 py-2 text-right text-[12px] tracking-tighter text-[#1d5f84] font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                {isGu ? `₹${toGujaratiDigits(data.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${data.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                              </td>
                            </>
                          );
                        }

                        if (isInterest) {
                          return (
                            <>
                              <td colSpan="6" className="px-3 py-2 text-right font-black border-r border-slate-200 text-slate-700">{t('sabhasadLedgerSummary.totals', 'Totals')}:</td>
                              <td className={`px-3 py-2 text-right text-[12px] tracking-tighter text-[#1d5f84] font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                {isGu ? `₹${toGujaratiDigits(data.reduce((acc, r) => acc + parseFloat(r.interest_amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${data.reduce((acc, r) => acc + parseFloat(r.interest_amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                              </td>
                            </>
                          );
                        }

                        if (isBrokerage || isLabour) {
                          return (
                            <>
                              <td colSpan="5" className="px-3 py-2 text-right font-black border-r border-slate-200 text-slate-700">{t('sabhasadLedgerSummary.totals', 'Totals')}:</td>
                              <td className={`px-3 py-2 text-right text-[12px] tracking-tighter text-[#1d5f84] font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                {isGu ? `₹${toGujaratiDigits(data.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${data.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                              </td>
                            </>
                          );
                        }

                        // Consolidated Default footer
                        return (
                          <>
                            <td colSpan="4" className="px-3 py-2 text-right font-black border-r border-slate-200 text-slate-700">{t('sabhasadLedgerSummary.consolidatedTotals', 'Consolidated Totals')}:</td>
                            <td className={`px-3 py-2 border-r border-slate-200 text-right text-[#1d5f84] font-bold text-[12px] ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>{isGu ? `₹${toGujaratiDigits(parseFloat(totals.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${parseFloat(totals.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</td>
                            <td className="px-3 py-2 border-r border-slate-200 font-sans"></td>
                            <td className={`px-3 py-2 text-right text-[#1d5f84] text-[12px] border-r border-slate-200 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>{isGu ? `₹${toGujaratiDigits(parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</td>
                            <td className={`px-3 py-2 text-right text-[#1d5f84] text-[12px] border-r border-slate-200 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>{isGu ? `₹${toGujaratiDigits(parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</td>
                            <td className={`px-3 py-2 text-right text-[#1d5f84] text-[12px] border-r border-slate-200 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                              {isGu ? `₹${toGujaratiDigits(Math.abs(parseFloat(totals.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${Math.abs(parseFloat(totals.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} {parseFloat(totals.closing_balance || 0) >= 0 ? 'DR' : 'CR'}
                            </td>
                            {!hideBardan && (
                              <>
                                <td className={`px-3 py-2 text-right text-[#1d5f84] text-[12px] border-r border-slate-200 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {isGu ? toGujaratiDigits(Math.abs(totalBardanBal).toLocaleString()) : Math.abs(totalBardanBal).toLocaleString()} {totalBardanBal >= 0 ? 'DR' : 'CR'}
                                </td>
                                <td className={`px-3 py-2 text-right text-[#1d5f84] text-[12px] border-r border-slate-200 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {isGu ? toGujaratiDigits(totalBardanSelf.toLocaleString()) : totalBardanSelf.toLocaleString()}
                                </td>
                                <td className={`px-3 py-2 text-right text-[#1d5f84] text-[12px] ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                                  {isGu ? `₹${toGujaratiDigits(Math.abs(totalBardanAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}` : `₹${Math.abs(totalBardanAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} {totalBardanPenalty >= 0 ? 'DR' : 'CR'}
                                </td>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modern Slide-Out Filters Drawer (WOW design with animation in & out) */}
      <div className={`fixed inset-0 z-[100] overflow-hidden ${showFiltersDrawer ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop Blur Overlay */}
        <div
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px] transition-opacity duration-300 ${showFiltersDrawer ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setShowFiltersDrawer(false)}
        />

        {/* Drawer Panel Container */}
        <div className={`fixed inset-y-0 right-0 max-w-full flex pl-10 transform transition-transform duration-300 ease-in-out ${showFiltersDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="w-screen max-w-sm bg-white border-l border-slate-200 flex flex-col shadow-none">

            {/* Drawer Title Bar */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 select-none">
                <Filter size={14} className="text-[#1d5f84]" />
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Filter Parameters
                </span>
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

              {/* Date range inputs */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {t('sabhasadLedgerSummary.dateRange', 'Date Range Period')}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 font-bold uppercase">From</span>
                    <input
                      ref={startDateRef}
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, endDateRef)}
                      className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-10 pr-2 py-1.5 text-sm text-slate-700 font-bold outline-none w-full ${isGu ? '' : 'font-mono'}`}
                      style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 font-bold uppercase">To</span>
                    <input
                      ref={endDateRef}
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, accCodeRef)}
                      className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-6 pr-2 py-1.5 text-sm text-slate-700 font-bold outline-none w-full ${isGu ? '' : 'font-mono'}`}
                      style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}
                    />
                  </div>
                </div>
              </div>

              {/* Account Nomenclature Search */}
              <div className="space-y-1.5 relative" ref={accDropRef}>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {t('sabhasadLedgerSummary.accountNomenclature', 'Account')}
                </span>
                <div className="flex gap-2">
                  <input
                    ref={accCodeRef}
                    type="text"
                    value={accCode}
                    onChange={(e) => { setAccCode(e.target.value); setShowAccDrop(false); }}
                    onFocus={() => { setShowAccDrop(false); setShowMemDrop(false); }}
                    onKeyDown={handleAccCodeKeyDown}
                    placeholder="ID"
                    className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-1 py-1.5 text-sm text-[#1d5f84] font-mono font-bold w-12 text-center outline-none"
                  />
                  <input
                    ref={accNameRef}
                    type="text"
                    value={accName}
                    onChange={(e) => handleInputChangeWithAutocomplete(e, accNameRef, filteredAccs, displayAccountName, setAccName, setShowAccDrop)}
                    onFocus={() => { setShowAccDrop(true); setShowMemDrop(false); }}
                    onKeyDown={handleAccNameKeyDown}
                    placeholder="Search account..."
                    className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-sm text-slate-700 font-bold flex-1 outline-none ${isGu ? 'normal-case' : 'uppercase font-mono'}`}
                    style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}
                  />
                </div>

                {showAccDrop && (
                  <div className="absolute top-[102%] left-0 right-0 bg-white border border-slate-200 rounded-md z-[110] mt-0.5 max-h-40 overflow-y-auto shadow-sm">
                    <div
                      onClick={() => handleSelectAcc(null)}
                      className="px-2.5 py-1 hover:bg-slate-50 cursor-pointer font-bold text-[12px] text-blue-600 border-b border-slate-100 uppercase flex items-center gap-1"
                    >
                      <Search size={10} />
                      <span>All Accounts</span>
                    </div>
                    {filteredAccs.map((a, idx) => (
                      <div
                        key={a.id}
                        onClick={() => handleSelectAcc(a)}
                        onMouseEnter={() => setAccActiveIdx(idx)}
                        className={`px-2.5 py-1 flex justify-between items-center cursor-pointer border-b border-slate-100 last:border-none ${accActiveIdx === idx ? 'bg-slate-50 text-[#1d5f84]' : 'hover:bg-slate-50'
                          }`}
                      >
                        <span className="text-[10px] font-bold truncate" translate="no" style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}>
                          {displayAccountName(a)}
                        </span>
                        <span className="text-[12px] font-mono text-slate-400 font-semibold shrink-0">#{a.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Member Search */}
              <div className="space-y-1.5 relative" ref={memDropRef}>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {t('sabhasadLedgerSummary.memberIdentity', 'Member')}
                </span>
                <div className="flex gap-2">
                  <input
                    ref={memCodeRef}
                    type="text"
                    value={memCode}
                    onChange={(e) => { setMemCode(e.target.value); setShowMemDrop(false); }}
                    onFocus={() => { setShowMemDrop(false); setShowAccDrop(false); }}
                    onKeyDown={handleMemCodeKeyDown}
                    placeholder="ID"
                    className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-1 py-1.5 text-sm text-[#1d5f84] font-mono font-bold w-12 text-center outline-none"
                  />
                  <input
                    ref={memNameRef}
                    type="text"
                    value={memName}
                    onChange={(e) => handleInputChangeWithAutocomplete(e, memNameRef, filteredMems, displayMemberName, setMemName, setShowMemDrop)}
                    onFocus={() => { setShowMemDrop(true); setShowAccDrop(false); }}
                    onKeyDown={handleMemNameKeyDown}
                    placeholder="Search member..."
                    className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-sm text-slate-700 font-bold flex-1 outline-none ${isGu ? 'normal-case' : 'uppercase font-mono'}`}
                    style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}
                  />
                </div>

                {showMemDrop && (
                  <div className="absolute top-[102%] left-0 right-0 bg-white border border-slate-200 rounded-md z-[110] mt-0.5 max-h-40 overflow-y-auto shadow-sm">
                    <div
                      onClick={() => handleSelectMem(null)}
                      className="px-2.5 py-1 hover:bg-slate-50 cursor-pointer font-bold text-[12px] text-blue-600 border-b border-slate-100 uppercase flex items-center gap-1"
                    >
                      <Search size={10} />
                      <span>All Members</span>
                    </div>
                    {filteredMems.map((m, idx) => (
                      <div
                        key={m.id}
                        onClick={() => handleSelectMem(m)}
                        onMouseEnter={() => setMemActiveIdx(idx)}
                        className={`px-2.5 py-1 flex justify-between items-center cursor-pointer border-b border-slate-100 last:border-none ${memActiveIdx === idx ? 'bg-slate-50 text-[#1d5f84]' : 'hover:bg-slate-50'
                          }`}
                      >
                        <span className="text-[10px] font-bold truncate" translate="no" style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}>
                          {displayMemberName(m)}
                        </span>
                        <span className="text-[12px] font-mono text-slate-400 font-semibold shrink-0">#{m.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Member Range */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Member Range (By Code)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 font-bold uppercase">From</span>
                    <input
                      type="number"
                      value={fromMemberCode}
                      onChange={(e) => setFromMemberCode(e.target.value)}
                      placeholder="Start Code"
                      className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-10 pr-2 py-1.5 text-sm text-slate-700 font-bold  outline-none w-full"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-slate-400 font-bold uppercase">To</span>
                    <input
                      type="number"
                      value={toMemberCode}
                      onChange={(e) => setToMemberCode(e.target.value)}
                      placeholder="End Code"
                      className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-6 pr-2 py-1.5 text-sm text-slate-700 font-bold  outline-none w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Class of Danger */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Class of Dangar
                </span>
                <select
                  value={dangarClass}
                  onChange={(e) => setDangarClass(e.target.value)}
                  className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 cursor-pointer outline-none w-full ${isGu ? '' : 'font-mono'}`}
                  style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}
                >
                  <option value="">{t('sabhasadLedgerSummary.allClasses', 'All Classes')}</option>
                  <option value="1st">{t('dangarRateMaster.table.class1', '1st Class')}</option>
                  <option value="2nd">{t('dangarRateMaster.table.class2', '2nd Class')}</option>
                  <option value="3rd">{t('dangarRateMaster.table.class3', '3rd Class')}</option>
                </select>
              </div>

              {/* Village selector */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {t('sabhasadLedgerSummary.villageFilter', 'Village')}
                </span>
                <select
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 cursor-pointer outline-none w-full ${isGu ? '' : 'font-mono'}`}
                  style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}
                >
                  <option value="">{t('sabhasadLedgerSummary.allVillages')}</option>
                  {[...new Set(members.map(m => m.village_name).filter(Boolean))].sort().map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Bank selector */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {t('sabhasadLedgerSummary.bankFilter', 'Bank')}
                </span>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 cursor-pointer outline-none w-full ${isGu ? '' : 'font-mono'}`}
                  style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}
                >
                  <option value="">All Banks</option>
                  {banks.map(b => (
                    <option key={b.id} value={b.bank_name}>{b.bank_name}</option>
                  ))}
                </select>
              </div>

              {/* Season selector */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {t('sabhasadLedgerSummary.seasonFilter', 'Crop Season')}
                </span>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 cursor-pointer outline-none w-full ${isGu ? '' : 'font-mono'}`}
                  style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}
                >
                  <option value="">All Seasons</option>
                  {seasons.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Item / Stock selector */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {t('sabhasadLedgerSummary.dangarName', 'Item Stock')}
                </span>
                <select
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 cursor-pointer outline-none w-full ${isGu ? '' : 'font-mono'}`}
                  style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}
                >
                  <option value="">{t('sabhasadLedgerSummary.allItems')}</option>
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{displayItemName(i)}</option>
                  ))}
                </select>
              </div>

              {/* Zero balance toggles */}
              <div className="flex items-center justify-between py-1 bg-white select-none">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Hide Zero Balances</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hideZeroBalance}
                    onChange={(e) => setHideZeroBalance(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1d5f84]"></div>
                </label>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => {
                  clearFilters();
                  setShowFiltersDrawer(false);
                }}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold rounded-md transition cursor-pointer uppercase tracking-wider"
              >
                Reset All
              </button>
              <button
                onClick={() => setShowFiltersDrawer(false)}
                className="flex-1 px-3 py-2 bg-[#1d5f84] hover:bg-[#154662] text-white text-sm font-bold rounded-md transition cursor-pointer uppercase tracking-wider"
              >
                View Statement
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Redesigned Audit Modal */}
      {showAuditModal && auditMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]">
          <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-lg shadow-none overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center select-none">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white border border-slate-200 text-[#1d5f84] rounded-md shrink-0">
                  <Activity size={16} />
                </div>
                <div>
                  <h2 className={`text-sm font-bold text-slate-800 tracking-tight ${isGu ? 'normal-case' : 'uppercase'}`} style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}>
                    {displayMemberName(auditMember)}
                    <span className={`text-[#1d5f84] ml-2 font-bold bg-blue-50 px-1 rounded-sm ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                      #{isGu ? toGujaratiDigits(auditMember.member_code) : auditMember.member_code}
                    </span>
                  </h2>
                  <p className={`text-[12px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                    {t('sabhasadLedgerSummary.auditStream', 'Transaction Ledger Audit Stream')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              {auditLoading ? (
                <div className="py-24 text-center">
                  <RefreshCcw className="animate-spin mx-auto text-[#1d5f84] mb-3" size={32} />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Decrypting Ledger Stream...</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left font-sans text-sm border-collapse">
                    <thead className={`bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[12px] tracking-wider`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                      <tr>
                        <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.date', 'Date')}</th>
                        <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.description', 'Description')}</th>
                        <th className="px-3 py-2 border-r border-slate-100">{t('sabhasadLedgerSummary.reference', 'Ref No')}</th>
                        <th className="px-3 py-2 text-right border-r border-slate-100">{t('sabhasadLedgerSummary.debit', 'Debit (Udhar)')}</th>
                        <th className="px-3 py-2 text-right border-r border-slate-100">{t('sabhasadLedgerSummary.credit', 'Credit (Jama)')}</th>
                        <th className="px-3 py-2 text-right border-r border-slate-100">{t('sabhasadLedgerSummary.selfJama', 'Self Jama')}</th>
                        <th className="px-3 py-2 text-right">{t('sabhasadLedgerSummary.runningPosition', 'Running Position')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-[12px]">
                      {auditTransactions.map((tx, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className={`px-3 py-2 text-slate-400 border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                            {formatDisplayDate(tx.transaction_date)}
                          </td>
                          <td className="px-3 py-2 text-slate-800 border-r border-slate-100 font-medium uppercase">
                            {formatBilingualText(tx.description)}
                          </td>
                          <td className={`px-3 py-2 text-slate-400 border-r border-slate-100 ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                            {isGu ? toGujaratiDigits(tx.reference_no || '—') : (tx.reference_no || '—')}
                          </td>
                          <td className={`px-3 py-2 text-right text-blue-600 border-r border-slate-100 font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                            {(parseFloat(tx.debit) || 0) > 0 ? fmtAmount(tx.debit, '₹') : '—'}
                          </td>
                          <td className={`px-3 py-2 text-right text-rose-600 border-r border-slate-100 font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                            {parseFloat(tx.company_credit || 0) > 0 ? fmtAmount(tx.company_credit, '₹') : '—'}
                          </td>
                          <td className={`px-3 py-2 text-right text-emerald-600 border-r border-slate-100 font-bold ${isGu ? '' : 'font-mono'}`} style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}>
                            {parseFloat(tx.self_credit || 0) > 0 ? (isGu ? toGujaratiDigits(parseFloat(tx.self_credit).toLocaleString('en-IN')) : parseFloat(tx.self_credit).toLocaleString('en-IN')) : '—'}
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-bold ${isGu ? 'text-slate-800' : 'font-mono text-slate-800'} ${parseFloat(tx.running_balance || 0) < 0 ? 'text-rose-600' : ''}`}
                            style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}
                          >
                            {fmtAmount(Math.abs(parseFloat(tx.running_balance || 0)), '₹')}
                            <span className="text-[12px] font-sans font-bold text-slate-400 ml-0.5">
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

            {/* Modal Footer */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className={`px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-sm font-bold transition rounded-md uppercase tracking-wide cursor-pointer`}
                style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}
              >
                {t('sabhasadLedgerSummary.closeAudit', 'Close Audit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
