import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addGujaratiFont, addPromptFont } from '../utils/pdfFonts';
import React, { useState, useEffect } from 'react';
import {
  Search, Download, Filter, FileText,
  Database, RefreshCcw, Layout, Users,
  TrendingUp, TrendingDown, ShieldCheck,
  Printer, X, Hash, User, Activity, Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import api from '../api';
import { formatBilingualText, translateSystemText } from '../utils/textUtils';

export default function SabhasadLedgerSummary() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({ opening_balance: 0, debit: 0, credit: 0, closing_balance: 0 });
  const [loading, setLoading] = useState(true);
  const [backendFlags, setBackendFlags] = useState({});
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
  const [village, setVillage] = useState('');
  const [bankName, setBankName] = useState('');
  const [season, setSeason] = useState('');
  const [itemId, setItemId] = useState('');
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

  const handleInputChangeWithAutocomplete = (e, inputRef, list, nameKey, setValue, setShowDrop) => {
    const typedVal = e.target.value;
    const inputType = e.nativeEvent?.inputType || '';

    setValue(typedVal);
    if (setShowDrop) setShowDrop(true);

    if (inputType.startsWith('delete') || inputType === 'historyUndo') {
      return;
    }

    if (!typedVal.trim()) return;

    // Autocomplete using the exact first item highlighted in the dropdown list
    const match = list[0];

    if (match) {
      const rawText = match[nameKey] || '';
      const matchText = i18n.language === 'gu' ? translateSystemText(rawText) : rawText;
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
          itemId: accountId === 'all' || isDangar ? itemId : ''
        }
      });

      if (response.data.success) {
        setData(response.data.data);
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
      let r = `<td style="text-align:center">${String(idx + 1).padStart(3, '0')}</td>`;
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
              <td>${row.member_code || '-'}</td>
              <td><strong>${translateSystemText(row.member_name || '-')}</strong></td>
              <td>${translateSystemText(row.village_name || '-')}</td>
              <td style="text-align:right">${parseFloat(row.opening_balance || 0).toLocaleString()}</td>
              <td style="text-align:right">${parseFloat(row.debit || 0) > 0 ? parseFloat(row.debit || 0).toLocaleString() : '-'}</td>
              <td style="text-align:right">${parseFloat(row.credit || 0) > 0 ? parseFloat(row.credit || 0).toLocaleString() : '-'}</td>
              <td style="text-align:right">${parseFloat(row.self_credit || 0) > 0 ? parseFloat(row.self_credit || 0).toLocaleString() : '-'}</td>
              <td style="text-align:right; font-weight:bold; color:${parseFloat(row.balance || 0) > 0 ? '#dc2626' : '#18181b'}">${Math.abs(parseFloat(row.balance || 0)).toLocaleString()} ${parseFloat(row.balance || 0) >= 0 ? 'DR' : 'CR'}</td>
              <td style="text-align:right; font-weight:bold;">₹${(parseFloat(row.balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            `;
          } else {
            r += `
              <td>${new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
              <td>
                ${row.member_name ? `<br><small style="color:#2563eb">${translateSystemText('Node')}: ${translateSystemText(row.member_name)} [${row.member_id}]</small>` : ''}
              </td>
              <td style="text-align:right">₹${parseFloat(displayDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="text-align:right">₹${parseFloat(displayCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td style="text-align:right; font-weight:bold; color:${parseFloat(row.balance || 0) > 0 ? '#dc2626' : '#18181b'}">₹${Math.abs(parseFloat(row.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(row.balance || 0) >= 0 ? 'C' : 'D'}</td>
            `;
          }
        } else {
          const balLabel = isSale ? (parseFloat(row.balance || 0) >= 0 ? 'CR' : 'DR') : (parseFloat(row.balance || 0) >= 0 ? 'DR' : 'CR');
          r += `
            <td>${new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
            <td>${row.member_code || '-'}</td>
            <td>${translateSystemText(row.member_name || '-')}</td>
            <td>${translateSystemText(row.description)}</td>
            <td style="text-align:right">${displayDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="text-align:right">${displayCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="text-align:right; font-weight:bold;">${Math.abs(parseFloat(row.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${balLabel}</td>
          `;
        }
      } else if (isDangar) {
        r += `
          <td>${row.member_code}</td>
          <td>${translateSystemText(row.member_name)}</td>
          <td>${new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
          <td style="text-align:right">${parseFloat(row.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td>${translateSystemText(row.item_name)}</td>
          <td>${row.quality_class}</td>
          <td>${row.book_type}</td>
          <td style="text-align:right">${parseFloat(row.net_quintal || 0).toFixed(2)} Qt</td>
          <td style="text-align:right">${parseFloat(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        `;
      } else {
        r += `
          <td>${row.member_code || '-'}</td>
          <td style="font-weight:600">${translateSystemText(row.member_name || '-')}</td>
          <td>${translateSystemText(row.account_name_gu || row.account_name || '-')}</td>
          <td style="text-align:right; color: ${parseFloat(row.opening_balance) >= 0 ? '#059669' : '#dc2626'}">${parseFloat(row.opening_balance) >= 0 ? '+' : '-'}${Math.abs(parseFloat(row.opening_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
            <h1>${cName}</h1>
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

  const handleExportPDF = async () => {
    if (data.length === 0) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

    const totalBardanBal = data.reduce((s, r) => s + parseFloat(r.bardan_balance || 0), 0);
    const totalBardanSelf = data.reduce((s, r) => s + parseFloat(r.bardan_self_jama || 0), 0);
    const totalBardanAmt = data.reduce((s, r) => s + (parseFloat(r.bardan_penalty_balance || r.bardan_balance || 0) * bardanPrice), 0);
    const totalBardanPenalty = data.reduce((s, r) => s + parseFloat(r.bardan_penalty_balance || r.bardan_balance || 0), 0);

    await addGujaratiFont(doc);
    await addPromptFont(doc);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 32;
    const navy = [37, 99, 235], white = [255, 255, 255], gray = [100, 116, 139], dark = [30, 41, 59], stripe = [241, 245, 249];
    const cName = company ? (company.company_name || 'Company') : 'Company';

    const hdr = () => {
      doc.setFillColor(...navy); doc.rect(0, 0, W, 28, 'F');
      doc.setFont('NotoGujarati', 'bold'); doc.setFontSize(10); doc.setTextColor(...white);
      doc.text(cName, M, 18);
      doc.setFontSize(7.5); doc.setTextColor(191, 219, 254);
      doc.text(t('sabhasadLedgerSummary.ledgerSummaryRegistry'), W / 2, 18, { align: 'center' });
      doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
      doc.text('AUDIT CERTIFIED', W - M, 18, { align: 'right' });
    };

    const ftr = (pg, tot) => {
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4);
      doc.line(M, H - 18, W - M, H - 18);
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text(cName + ' - Sabhasad Ledger Registry', M, H - 9);
      doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' });
      doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' });
    };

    hdr();
    let y = 62;
    doc.setFont('NotoGujarati', 'bold'); doc.setFontSize(16); doc.setTextColor(...navy);
    doc.text(t('sabhasadLedgerSummary.ledgerSummaryRegistry'), M, y);
    doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text('PERIOD: ' + dateRange.startDate + ' to ' + dateRange.endDate, M, y + 13);
    doc.text('GENERATED: ' + new Date().toLocaleString('en-IN'), W - M, y + 13, { align: 'right' });
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
    y += 32;

    const head = isBardan ?
      [[t('sabhasadLedgerSummary.srNo'), t('sabhasadLedgerSummary.code'), t('sabhasadLedgerSummary.memberName'), t('sabhasadLedgerSummary.village'), t('sabhasadLedgerSummary.opening'), t('sabhasadLedgerSummary.debit'), t('sabhasadLedgerSummary.credit'), t('sabhasadLedgerSummary.selfJama'), t('sabhasadLedgerSummary.balance'), t('sabhasadLedgerSummary.bardanAmt')]] :
      isCash ?
        [[t('sabhasadLedgerSummary.srNo'), t('sabhasadLedgerSummary.date'), t('sabhasadLedgerSummary.village'), t('sabhasadLedgerSummary.descriptionMember'), t('sabhasadLedgerSummary.debit'), t('sabhasadLedgerSummary.credit'), t('sabhasadLedgerSummary.balance')]] :
        isPurchase || isSale || isTransactional ?
          [[t('sabhasadLedgerSummary.srNo'), t('sabhasadLedgerSummary.date'), t('sabhasadLedgerSummary.code'), t('sabhasadLedgerSummary.memberName'), t('sabhasadLedgerSummary.village'), t('sabhasadLedgerSummary.description'), isSale ? t('sabhasadLedgerSummary.creditSale') : t('sabhasadLedgerSummary.debit'), isSale ? t('sabhasadLedgerSummary.cashSale') : t('sabhasadLedgerSummary.credit'), t('sabhasadLedgerSummary.balance')]] :
          isDangar ?
            [[t('sabhasadLedgerSummary.srNo'), t('sabhasadLedgerSummary.code'), t('sabhasadLedgerSummary.memberName'), t('sabhasadLedgerSummary.village'), t('sabhasadLedgerSummary.date'), t('sabhasadLedgerSummary.purchesRate'), t('sabhasadLedgerSummary.itemName'), t('sabhasadLedgerSummary.class'), t('sabhasadLedgerSummary.season'), t('sabhasadLedgerSummary.totalQty'), t('sabhasadLedgerSummary.totalRate')]] :
            hideBardan ?
              [[t('sabhasadLedgerSummary.srNo'), t('sabhasadLedgerSummary.code'), t('sabhasadLedgerSummary.memberName'), t('sabhasadLedgerSummary.village'), t('sabhasadLedgerSummary.accountName'), t('sabhasadLedgerSummary.opening'), t('sabhasadLedgerSummary.date'), t('sabhasadLedgerSummary.debit'), t('sabhasadLedgerSummary.credit'), t('sabhasadLedgerSummary.closing')]] :
              [[t('sabhasadLedgerSummary.srNo'), t('sabhasadLedgerSummary.code'), t('sabhasadLedgerSummary.memberName'), t('sabhasadLedgerSummary.village'), t('sabhasadLedgerSummary.accountName'), t('sabhasadLedgerSummary.opening'), t('sabhasadLedgerSummary.date'), t('sabhasadLedgerSummary.debit'), t('sabhasadLedgerSummary.credit'), t('sabhasadLedgerSummary.closing'), t('sabhasadLedgerSummary.bardanBal'), t('sabhasadLedgerSummary.selfJama'), t('sabhasadLedgerSummary.bardanAmt')]];

    const body = data.map((row, i) => {
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
            return [
              String(i + 1).padStart(3, '0'),
              row.member_code || '-',
              translateSystemText(row.member_name || '-'),
              translateSystemText(row.village_name || '-'),
              parseFloat(row.opening_balance || 0).toLocaleString(),
              parseFloat(row.debit || 0) > 0 ? parseFloat(row.debit || 0).toLocaleString() : '-',
              parseFloat(row.credit || 0) > 0 ? parseFloat(row.credit || 0).toLocaleString() : '-',
              parseFloat(row.self_credit || 0) > 0 ? parseFloat(row.self_credit || 0).toLocaleString() : '-',
              Math.abs(parseFloat(row.balance || 0)).toLocaleString() + ' ' + (parseFloat(row.balance || 0) >= 0 ? 'DR' : 'CR'),
              '₹' + (parseFloat(row.balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })
            ];
          } else {
            return [
              String(i + 1).padStart(3, '0'),
              new Date(row.entry_date).toLocaleDateString('en-GB'),
              translateSystemText(row.village_name || '-'),
              row.member_name
                ? `${translateSystemText(row.description || '-')}\n${translateSystemText('Node')}: ${translateSystemText(row.member_name)} [${row.member_id}]`
                : translateSystemText(row.description || '-'),
              '₹' + parseFloat(displayDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
              '₹' + parseFloat(displayCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
              '₹' + Math.abs(parseFloat(row.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' ' + (parseFloat(row.balance || 0) >= 0 ? 'C' : 'D')
            ];
          }
        }

        return [
          String(i + 1).padStart(3, '0'),
          new Date(row.entry_date).toLocaleDateString('en-GB'),
          row.member_code || '-',
          translateSystemText(row.member_name || '-'),
          translateSystemText(row.village_name || '-'),
          translateSystemText(row.description || '-'),
          displayDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
          displayCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
          Math.abs(parseFloat(row.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' ' + (isSale ? (parseFloat(row.balance || 0) >= 0 ? 'CR' : 'DR') : (parseFloat(row.balance || 0) >= 0 ? 'DR' : 'CR'))
        ];
      }
      if (isDangar) return [
        String(i + 1).padStart(3, '0'),
        row.member_code,
        translateSystemText(row.member_name),
        translateSystemText(row.village_name || '-'),
        new Date(row.entry_date).toLocaleDateString('en-GB'),
        parseFloat(row.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        translateSystemText(row.item_name),
        row.quality_class,
        row.book_type,
        parseFloat(row.net_quintal || 0).toFixed(2),
        parseFloat(row.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
      ];

      const base = [
        String(i + 1).padStart(3, '0'),
        row.member_code || '-',
        translateSystemText(row.member_name || '-'),
        translateSystemText(row.village_name || '-'),
        translateSystemText(row.account_name_gu || row.account_name || '-'),
        (parseFloat(row.opening_balance) >= 0 ? '+' : '-') + Math.abs(parseFloat(row.opening_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
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

    const foot = isBardan ?
      [['', '', '', t('sabhasadLedgerSummary.totals'), parseFloat(totals.opening_balance || 0).toLocaleString(), parseFloat(totals.debit || 0).toLocaleString(), parseFloat(totals.credit || 0).toLocaleString(), parseFloat(totals.self_credit || 0).toLocaleString(), Math.abs(parseFloat(totals.balance || 0)).toLocaleString() + ' ' + (parseFloat(totals.balance || 0) >= 0 ? 'DR' : 'CR'), '₹' + (parseFloat(totals.balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })]] :
      isCash ?
        [['', '', '', t('sabhasadLedgerSummary.totals'), '₹' + parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), '₹' + parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), '₹' + Math.abs(parseFloat(totals.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' ' + (parseFloat(totals.balance || 0) >= 0 ? 'C' : 'D')]] :
        isPurchase || isSale || isTransactional ?
          [['', '', '', '', '', t('sabhasadLedgerSummary.totals'), parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), Math.abs(parseFloat(totals.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' ' + (isSale ? (parseFloat(totals.balance || 0) >= 0 ? 'CR' : 'DR') : (parseFloat(totals.balance || 0) >= 0 ? 'DR' : 'CR'))]] :
          isDangar ?
            [['', '', '', '', '', '', '', '', t('sabhasadLedgerSummary.totals'), parseFloat(totals.qty || 0).toFixed(2), parseFloat(totals.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })]] :
            hideBardan ?
              [['', '', '', '', t('sabhasadLedgerSummary.totals'), parseFloat(totals.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), '', parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), Math.abs(parseFloat(totals.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' ' + (parseFloat(totals.closing_balance || 0) >= 0 ? 'DR' : 'CR')]] :
              [['', '', '', '', t('sabhasadLedgerSummary.totals'), parseFloat(totals.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), '', parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), Math.abs(parseFloat(totals.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' ' + (parseFloat(totals.closing_balance || 0) >= 0 ? 'DR' : 'CR'), Math.abs(totalBardanBal).toLocaleString() + ' ' + (totalBardanBal >= 0 ? 'DR' : 'CR'), totalBardanSelf.toLocaleString(), '₹' + Math.abs(totalBardanAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' ' + (totalBardanPenalty >= 0 ? 'DR' : 'CR')]];

    autoTable(doc, {
      startY: y,
      head: head,
      body: body,
      foot: foot,
      didParseCell: (data) => {
        const text = data.cell.text.join(' ');
        if (!text) return;

        // Use NotoGujarati for Unicode characters
        if (/[\u0A80-\u0AFF]/.test(text)) {
          data.cell.styles.font = 'NotoGujarati';
          return;
        }

        // Use Prompt font for legacy-mapped Gujarati (lowercase text)
        if (/[a-z]/.test(text)) {
          data.cell.styles.font = 'Prompt';
        } else {
          // Use standard Helvetica for numbers, codes, and uppercase text
          data.cell.styles.font = 'helvetica';
        }
      },
      theme: 'grid',
      styles: { font: 'NotoGujarati', fontSize: 6.5, cellPadding: [3, 4], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'bold', fontSize: 6.5 },
      footStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'bold', fontSize: 6.5 },
      alternateRowStyles: { fillColor: stripe },
      margin: { left: M, right: M },
      columnStyles: isBardan ? {
        0: { cellWidth: 20 }, // Sr
        1: { cellWidth: 35 }, // Code
        2: { cellWidth: 90 }, // Name
        3: { cellWidth: 55 }, // Village
        4: { halign: 'right', cellWidth: 45 }, // Opening
        5: { halign: 'right', cellWidth: 45 }, // Debit
        6: { halign: 'right', cellWidth: 45 }, // Credit
        7: { halign: 'right', cellWidth: 45 }, // Self Jama
        8: { halign: 'right', fontStyle: 'bold', cellWidth: 55 }, // Balance
        9: { halign: 'right', cellWidth: 55 }, // Bardan Amt
      } : isPurchase || isSale ? {
        0: { cellWidth: 15 }, // Sr
        1: { cellWidth: 40 }, // Date
        2: { cellWidth: 25 }, // Code
        3: { cellWidth: 70 }, // Name
        4: { cellWidth: 'auto' }, // Desc
        5: { halign: 'right', cellWidth: 45 }, // Debit
        6: { halign: 'right', cellWidth: 45 }, // Credit
        7: { halign: 'right', fontStyle: 'bold', cellWidth: 55 }, // Balance
      } : isDangar ? {
        0: { cellWidth: 20 }, // Sr
        1: { cellWidth: 30 }, // Code
        2: { cellWidth: 100 }, // Name
        3: { cellWidth: 50 }, // Date
        4: { halign: 'right', cellWidth: 40 }, // Rate
        5: { cellWidth: 60 }, // Item
        8: { halign: 'right', cellWidth: 40 }, // Qty
        9: { halign: 'right', fontStyle: 'bold', cellWidth: 60 }, // Total
      } : {
        0: { cellWidth: 20 }, // Sr
        1: { cellWidth: 25 }, // Code
        2: { cellWidth: 'auto' }, // Member Name
        3: { cellWidth: 70 }, // Account
        4: { cellWidth: 45 }, // Opening
        5: { cellWidth: 45 }, // Date
        6: { halign: 'right', cellWidth: 50 }, // Debit
        7: { halign: 'right', cellWidth: 50 }, // Credit
        8: { halign: 'right', fontStyle: 'bold', cellWidth: 55 }, // Closing
        9: { halign: 'right', cellWidth: 45 }, // Bardan Bal
        10: { halign: 'right', cellWidth: 40 }, // Self Jama
        11: { halign: 'right', cellWidth: 55 }, // Bardan Amt
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
    setVillage('');
    setBankName('');
    setSeason('');
    setItemId('');
  };

  const handleSelectAcc = (acc) => {
    setAccountId(acc?.id || 'all');
    setAccCode(acc ? String(acc.id) : '');
    setAccName(acc ? (i18n.language === 'gu' ? (acc.account_name_gu || translateSystemText(acc.account_name)) : acc.account_name) : '');
    setShowAccDrop(false);
  };

  const handleSelectMem = (mem) => {
    setMemberId(mem?.id || 'all');
    setMemCode(mem ? String(mem.id) : '');
    setMemName(mem ? (i18n.language === 'gu' ? mem.member_name : (mem.eng_name || mem.member_name)) : '');
    setShowMemDrop(false);
  };

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
  }, [dateRange.startDate, dateRange.endDate, accountId, memberId, hideZeroBalance, village, bankName, season, itemId]);

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

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans select-none text-zinc-900">
      <Toast message={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />

      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-4 space-y-4">

       

        {/* Compact, Unified Filter Console */}
        <div className="bg-zinc-50 border border-zinc-300 p-2.5 space-y-2">
          {/* Row 1: Core parameters */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">

            {/* Date Range */}
            <div className="lg:col-span-3 flex items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-500 min-w-[30px]">{t('sabhasadLedgerSummary.startDate').split(' ')[0]}</span>
              <input ref={startDateRef} type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} onKeyDown={e => handleKeyDown(e, endDateRef)} className="flex-1 px-1.5 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-[10px] text-zinc-700" />
              <span className="text-[10px] font-bold text-zinc-500">-</span>
              <input ref={endDateRef} type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} onKeyDown={e => handleKeyDown(e, accCodeRef)} className="flex-1 px-1.5 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-[10px] text-zinc-700" />
            </div>

            {/* Account */}
            <div className="lg:col-span-3 flex items-center gap-1 relative">
              <span className="text-[10px] font-bold text-zinc-500 min-w-[45px]">{t('sabhasadLedgerSummary.accountNomenclature').split(' ')[0]}</span>
              <div className="flex flex-1 gap-1">
                <div className="w-16 relative">
                  <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input ref={accCodeRef} type="text" value={accCode} onChange={(e) => { setAccCode(e.target.value); setShowAccDrop(false); }} onFocus={() => { setShowAccDrop(false); setShowMemDrop(false); }} onKeyDown={handleAccCodeKeyDown} placeholder="ID" className="w-full pl-5 pr-1 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-[10px] text-zinc-700" />
                </div>
                <div className="flex-1 relative">
                  <User size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input ref={accNameRef} type="text" value={accName} onChange={(e) => handleInputChangeWithAutocomplete(e, accNameRef, filteredAccs, 'account_name', setAccName, setShowAccDrop)} onFocus={() => { setShowAccDrop(true); setShowMemDrop(false); }} onKeyDown={handleAccNameKeyDown} placeholder={t('sabhasadLedgerSummary.accountNomenclature')} className={`w-full pl-6 pr-1.5 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-bold text-[10px] text-zinc-700 uppercase ${i18n.language === 'gu' ? 'font-prompt text-sm' : 'font-mono'}`} />
                  {showAccDrop && (
                    <div className="absolute top-[26px] left-0 right-0 bg-white border border-zinc-300 shadow-xl rounded-none z-[100] overflow-hidden w-full">
                      <div className="max-h-48 overflow-y-auto">
                        <div onClick={() => handleSelectAcc(null)} className="px-3 py-1.5 hover:bg-zinc-50 cursor-pointer font-bold text-[8px] text-blue-600 border-b border-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
                          <Search size={10} className="text-blue-500" />
                          <span>{t('sabhasadLedgerSummary.allAccounts')}</span>
                        </div>
                        {filteredAccs.map((a, idx) => (
                          <div key={a.id} onClick={() => handleSelectAcc(a)} onMouseEnter={() => setAccActiveIdx(idx)} className={`px-3 py-1.5 flex justify-between items-center cursor-pointer border-b border-zinc-100 last:border-none group ${accActiveIdx === idx ? 'bg-blue-50 text-blue-700' : 'hover:bg-blue-50'}`}>
                            <div className="flex items-center gap-1.5 truncate">
                              <Search size={10} className={`transition-colors ${accActiveIdx === idx ? 'text-blue-600' : 'text-zinc-400'}`} />
                              <span className={`text-[11px] font-bold transition-colors ${accActiveIdx === idx ? 'text-blue-700' : 'text-zinc-700 group-hover:text-blue-600'}`}>{formatBilingualText(i18n.language === 'gu' ? (a.account_name_gu || a.account_name) : a.account_name)}</span>
                            </div>
                            <span className="text-[10px] font-sans text-zinc-400 shrink-0">#{a.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Member Search */}
            <div className="lg:col-span-4 flex items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-500 min-w-[45px]">{t('sabhasadLedgerSummary.memberIdentity').split(' ')[0]}</span>
              <div className="flex flex-1 gap-1">
                <div className="w-16 relative">
                  <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input ref={memCodeRef} type="text" value={memCode} onChange={(e) => { setMemCode(e.target.value); setShowMemDrop(false); }} onFocus={() => { setShowMemDrop(false); setShowAccDrop(false); }} onKeyDown={handleMemCodeKeyDown} placeholder="ID" className="w-full pl-5 pr-1 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-[10px] text-zinc-700" />
                </div>
                <div className="flex-1 relative">
                  <User size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input ref={memNameRef} type="text" value={memName} onChange={(e) => handleInputChangeWithAutocomplete(e, memNameRef, filteredMems, 'member_name', setMemName, setShowMemDrop)} onFocus={() => { setShowMemDrop(true); setShowAccDrop(false); }} onKeyDown={handleMemNameKeyDown} placeholder={t('sabhasadLedgerSummary.nameSearch')} className={`w-full pl-6 pr-1.5 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-bold text-[10px] text-zinc-700 uppercase ${i18n.language === 'gu' ? 'font-prompt text-sm' : 'font-mono'}`} />
                  {showMemDrop && (
                    <div className="absolute top-[26px] left-0 right-0 bg-white border border-zinc-300 shadow-xl rounded-none z-[100] overflow-hidden w-full">
                      <div className="max-h-48 overflow-y-auto">
                        <div onClick={() => handleSelectMem(null)} className="px-3 py-1.5 hover:bg-zinc-50 cursor-pointer font-bold text-[8px] text-blue-600 border-b border-zinc-200 uppercase tracking-widest flex items-center gap-1.5">
                          <Search size={10} className="text-blue-500" />
                          <span>{t('sabhasadLedgerSummary.allMembers')}</span>
                        </div>
                        {filteredMems.map((m, idx) => (
                          <div key={m.id} onClick={() => handleSelectMem(m)} onMouseEnter={() => setMemActiveIdx(idx)} className={`px-3 py-1.5 flex justify-between items-center cursor-pointer border-b border-zinc-100 last:border-none group ${memActiveIdx === idx ? 'bg-blue-50 text-blue-700' : 'hover:bg-blue-50'}`}>
                            <div className="flex items-center gap-1.5 truncate">
                              <Search size={10} className={`transition-colors ${memActiveIdx === idx ? 'text-blue-600' : 'text-zinc-400'}`} />
                              <span className={`text-[11px] font-bold transition-colors ${memActiveIdx === idx ? 'text-blue-700' : 'text-zinc-700 group-hover:text-blue-600'}`}>{formatBilingualText(i18n.language === 'gu' ? m.member_name : (m.eng_name || m.member_name))}</span>
                            </div>
                            <span className="text-[10px] font-sans text-zinc-400 shrink-0">#{m.id}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Zero Balance Checkbox */}
            <div className="lg:col-span-2 flex items-center justify-end">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={hideZeroBalance} onChange={(e) => setHideZeroBalance(e.target.checked)} className="w-3.5 h-3.5 text-blue-600 border-zinc-300 rounded-none focus:ring-0 focus:ring-offset-0" />
                <span className="text-[10px] font-bold text-zinc-550">{t('sabhasadLedgerSummary.hideZeroBal')}</span>
              </label>
            </div>

          </div>

          {/* Row 2: Secondary Dropdown Filters */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 border-t border-zinc-200 pt-2">

            {/* Village */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-500 min-w-[35px]">{t('sabhasadLedgerSummary.villageFilter').split(' ')[0]}</span>
              <select
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className={`flex-1 px-1.5 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-bold text-[10px] text-zinc-700 uppercase ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
              >
                <option value="">{t('sabhasadLedgerSummary.allVillages')}</option>
                {[...new Set(members.map(m => m.village_name).filter(Boolean))].sort().map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* Bank */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-500 min-w-[30px]">{t('sabhasadLedgerSummary.bankFilter').split(' ')[0]}</span>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="flex-1 px-1.5 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-bold text-[10px] text-zinc-700 uppercase font-sans"
                style={{ fontFamily: 'sans-serif' }}
              >
                <option value="">{t('sabhasadLedgerSummary.allBanks')}</option>
                {banks.map(b => (
                  <option key={b.id} value={b.bank_name}>{b.bank_name}</option>
                ))}
              </select>
            </div>

            {/* Season */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-500 min-w-[35px]">{t('sabhasadLedgerSummary.seasonFilter').split(' ')[0]}</span>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="flex-1 px-1.5 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-bold text-[10px] text-zinc-700 uppercase font-sans"
                style={{ fontFamily: 'sans-serif' }}
              >
                <option value="">{t('sabhasadLedgerSummary.allSeasons')}</option>
                {seasons.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Item / Dangar */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-500 min-w-[35px]">{t('sabhasadLedgerSummary.dangarName').split(' ')[0]}</span>
              <select
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                className={`flex-1 px-1.5 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-bold text-[10px] text-zinc-700 uppercase ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
              >
                <option value="">{t('sabhasadLedgerSummary.allItems')}</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>{i.item_name}</option>
                ))}
              </select>
            </div>

            {/* Clear Button */}
            <div className="flex items-center justify-end col-span-2 md:col-span-1">
              <button
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-1 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-600 text-[10px] font-bold px-2 py-1 rounded-none transition cursor-pointer select-none uppercase whitespace-nowrap"
              >
                <X size={12} /> {t('sabhasadLedgerSummary.clear')}
              </button>
            </div>

          </div>
        </div>



        {/* Ledger Registry Module */}
        <div className="bg-white border border-zinc-300 shadow-sm overflow-hidden flex flex-col min-h-[600px] relative">
          <div className="px-3 py-1.5 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-2 select-none">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-800 select-none uppercase tracking-wide">
                {memberId !== 'all' || accountId !== 'all' ? (
                  <span className=" font-black">
                    {formatBilingualText(
                      [
                        memberId !== 'all' ? memName : null,
                        accountId !== 'all' ? accName : null
                      ].filter(Boolean).join(' - ')
                    )}
                  </span>
                ) : (
                  t('sabhasadLedgerSummary.ledgerRegistryList')
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="p-1 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm select-none rounded-none" title={t('sabhasadLedgerSummary.print')}><Printer size={12} /></button>
              <button onClick={handleExportPDF} className="p-1 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm select-none rounded-none" title={t('sabhasadLedgerSummary.pdf')}><FileText size={12} /></button>
              <button onClick={fetchReportData} className="p-1 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm" title={t('sabhasadLedgerSummary.refreshRegistry')}><RefreshCcw size={12} className={syncing ? 'animate-spin' : ''} /></button>
            </div>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] scroller-airy relative">
            <table className="w-full text-left border-collapse select-none">
              <thead className="sticky top-0 bg-zinc-100 z-30 shadow-[0_1px_0_0_rgba(209,213,219,1)]">
                <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-700 font-sans text-[10px]">
                  <th className="px-2 py-1 font-bold border-r border-zinc-200">{t('sabhasadLedgerSummary.srNo')}</th>
                  {isBardan ? (
                    <>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200">{t('sabhasadLedgerSummary.code')}</th>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200 min-w-[180px]">{t('sabhasadLedgerSummary.memberName')}</th>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200 min-w-[80px]">{t('sabhasadLedgerSummary.village')}</th>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.opening')}</th>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.debit')} (+)</th>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.credit')} (-)</th>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.selfJama')}</th>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.balance')}</th>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.bardanAmt')}</th>
                    </>
                  ) : (isSale || isTransactional) ? (
                    <>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200">{t('sabhasadLedgerSummary.date')}</th>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200 min-w-[150px]">{t('sabhasadLedgerSummary.memberName')}</th>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200 min-w-[150px]">{t('sabhasadLedgerSummary.description')}</th>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.opening')}</th>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{isTransactional ? t('sabhasadLedgerSummary.debit') : (isSale ? t('sabhasadLedgerSummary.creditSale') : t('sabhasadLedgerSummary.debit'))}</th>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{isTransactional ? t('sabhasadLedgerSummary.credit') : (isSale ? t('sabhasadLedgerSummary.cashSale') : t('sabhasadLedgerSummary.credit'))}</th>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.balance')}</th>
                    </>
                  ) : (
                    <>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200">{t('sabhasadLedgerSummary.code')}</th>
                      <th className="px-2 py-1 font-bold border-r border-zinc-200 min-w-[200px]">{t('sabhasadLedgerSummary.memberName')}</th>
                      {isDangar ? (
                        <>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200">{t('sabhasadLedgerSummary.opening')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200">{t('sabhasadLedgerSummary.date')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.purchesRate')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200">{t('sabhasadLedgerSummary.itemName')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200">{t('sabhasadLedgerSummary.class')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200">{t('sabhasadLedgerSummary.season')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.totalQty')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.totalRate')}</th>
                        </>
                      ) : isInterest ? (
                        <>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.opening')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200">{t('sabhasadLedgerSummary.accrualDate')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.interestRate')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200">{t('sabhasadLedgerSummary.days')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200 min-w-[150px]">{t('sabhasadLedgerSummary.reference')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.interestAmount')}</th>
                        </>
                      ) : (isBrokerage || isLabour) ? (
                        <>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.opening')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200">{t('sabhasadLedgerSummary.date')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200">{t('sabhasadLedgerSummary.invoiceNo')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200 min-w-[150px]">{t('sabhasadLedgerSummary.description')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{isBrokerage ? t('sabhasadLedgerSummary.brokerageAmt').split(' ')[0] : t('sabhasadLedgerSummary.labourAmt').split(' ')[0]} Amt</th>
                        </>
                      ) : (
                        <>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200 min-w-[150px]">{t('sabhasadLedgerSummary.accountName')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.opening')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200">{t('sabhasadLedgerSummary.date')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.debit')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.credit')}</th>
                          <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.closing')}</th>
                          {!hideBardan && (
                            <>
                              <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.bardanBal')}</th>
                              <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.selfJama')}</th>
                              <th className="px-2 py-1 font-bold border-r border-zinc-200 text-right">{t('sabhasadLedgerSummary.bardanAmt')}</th>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {syncing ? (
                  <tr><td colSpan="11" className="py-24 text-center"><RefreshCcw size={32} className="animate-spin text-zinc-350 mx-auto mb-3" /><p className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest italic">{t('sabhasadLedgerSummary.synchronizingRegistry')}</p></td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan="11" className="py-24 text-center text-zinc-350 font-bold text-xs tracking-[0.3em] bg-zinc-50/30"><Database size={40} className="mx-auto mb-3 opacity-50" strokeWidth={1.5} />{t('sabhasadLedgerSummary.noSabhasadRecordsFound')}</td></tr>
                ) : (
                  <>
                    {data.map((row, idx) => (
                      <tr key={idx} className="group hover:bg-zinc-50 border-b border-zinc-150 transition-all duration-150">
                        <td className="px-2 py-0.5 text-[10px] text-zinc-400 border-r border-zinc-100 font-mono">{String(idx + 1).padStart(3, '0')}</td>
                        {(!isSale && !isBardan && !isTransactional) && <td className="px-2 py-0.5 text-[10px] text-blue-600 font-bold border-r border-zinc-100 font-mono">{row.member_code}</td>}
                        {(!isSale && !isBardan && !isTransactional) && (
                          <td className="px-2 py-0.5 border-r border-zinc-100 leading-tight">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="font-bold text-[11px] text-zinc-800 uppercase">{formatBilingualText(row.member_name)}</span>
                                {row.eng_name && <span className="text-[9px] font-sans text-zinc-400 font-normal">({row.eng_name})</span>}
                                {row.bank_name && <span className="text-[9px] font-sans text-blue-500 font-medium">Bank: {row.bank_name}</span>}
                                {row.active_season && <span className="text-[9px] font-sans text-amber-500 font-medium">Season: {row.active_season}</span>}
                              </div>
                            </div>
                          </td>
                        )}
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
                              return <>
                                <td className="px-2 py-0.5 text-[10px] text-blue-600 font-bold border-r border-zinc-100 font-mono">{row.member_code}</td>
                                <td className="px-2 py-0.5 border-r border-zinc-100 leading-tight">
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-baseline gap-1.5 flex-wrap">
                                      <span className="font-bold text-[11px] text-zinc-800 uppercase">{formatBilingualText(row.member_name)}</span>
                                      {row.eng_name && <span className="text-[10px] font-sans text-zinc-400 font-normal">({row.eng_name})</span>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 font-sans min-w-[80px]">{formatBilingualText(row.village_name || '-')}</td>
                                <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">
                                  {parseFloat(row.opening_balance || 0).toLocaleString()}
                                </td>
                                <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">{parseFloat(row.debit || 0) > 0 ? parseFloat(row.debit || 0).toLocaleString() : '-'}</td>
                                <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">{parseFloat(row.credit || 0) > 0 ? parseFloat(row.credit || 0).toLocaleString() : '-'}</td>
                                <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">{row.self_credit > 0 ? row.self_credit.toLocaleString() : '-'}</td>
                                <td className="px-2 py-0.5 text-[10px] text-right font-bold border-r border-zinc-100 font-mono text-zinc-800">
                                  {Math.abs(parseFloat(row.balance || 0)).toLocaleString()} {parseFloat(row.balance || 0) >= 0 ? 'DR' : 'CR'}
                                </td>
                                <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">₹{(parseFloat(row.balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              </>;
                            }

                            if (isTransactional) {
                              return <>
                                <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 font-mono">{new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
                                <td className="px-2 py-0.5 border-r border-zinc-100 leading-tight">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-bold text-[11px] text-zinc-800 uppercase">{row.member_name ? formatBilingualText(row.member_name) : '-'}</span>
                                    {row.eng_name && <span className="text-[10px] font-sans text-zinc-400 font-normal">({row.eng_name})</span>}
                                  </div>
                                </td>
                                <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 leading-tight uppercase font-mono font-medium">
                                  {row.description ? formatBilingualText(row.description) : '-'}
                                </td>
                                <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">
                                  {idx === 0 ? `₹${parseFloat(totals.opening_balance || 0).toLocaleString('en-IN')}` : '—'}
                                </td>
                                <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">{displayDebit > 0 ? `₹${displayDebit.toLocaleString('en-IN')}` : '-'}</td>
                                <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">{displayCredit > 0 ? `₹${displayCredit.toLocaleString('en-IN')}` : '-'}</td>
                                <td className="px-2 py-0.5 text-[10px] text-right font-bold border-r border-zinc-100 font-mono text-zinc-800">
                                  ₹{Math.abs(parseFloat(row.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {parseFloat(row.balance || 0) >= 0 ? 'C' : 'D'}
                                </td>
                              </>;
                            }

                            const isCR = isSale ? parseFloat(row.balance || 0) >= 0 : parseFloat(row.balance || 0) < 0;
                            const balLabel = isSale ? (parseFloat(row.balance || 0) >= 0 ? 'CR' : 'DR') : (parseFloat(row.balance || 0) >= 0 ? 'DR' : 'CR');
                            return <>
                              <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 font-mono">{new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
                              <td className="px-2 py-0.5 border-r border-zinc-100 leading-tight">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-bold text-[11px] text-zinc-800 uppercase">{row.member_name ? formatBilingualText(row.member_name) : '-'}</span>
                                  {row.eng_name && <span className="text-[10px] font-sans text-zinc-400 font-normal">({row.eng_name})</span>}
                                </div>
                              </td>
                              <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 leading-tight uppercase font-mono font-medium">{row.description ? formatBilingualText(row.description) : '-'}</td>
                              <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">{idx === 0 ? `₹${parseFloat(totals.opening_balance || 0).toLocaleString('en-IN')}` : '—'}</td>
                              <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">₹{displayDebit.toLocaleString('en-IN')}</td>
                              <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">₹{displayCredit.toLocaleString('en-IN')}</td>
                              <td className="px-2 py-0.5 text-[10px] text-right font-bold border-r border-zinc-100 font-mono text-zinc-800">₹{Math.abs(parseFloat(row.balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {balLabel}</td>
                            </>;
                          }
                          if (isDangar) return <>
                            <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">{idx === 0 ? `₹${parseFloat(totals.opening_balance || 0).toLocaleString('en-IN')}` : '—'}</td>
                            <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 font-mono">{new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
                            <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">₹{parseFloat(row.rate || 0).toLocaleString('en-IN')}</td>
                            <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 leading-tight">{formatBilingualText(row.item_name || t('sabhasadLedgerSummary.itemName'))}</td>
                            <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 font-mono">{row.quality_class || '1st'}</td>
                            <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 font-mono">{row.book_type || t('sabhasadLedgerSummary.season')}</td>
                            <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">{parseFloat(row.net_quintal || 0).toFixed(2)} <span className="text-[10px] opacity-50 font-sans ml-0.5">Qt</span></td>
                            <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">₹{parseFloat(row.amount || 0).toLocaleString('en-IN')}</td>
                          </>;
                          if (isInterest) return <>
                            <td className="px-2 py-0.5 text-[10px] text-right font-bold border-r border-zinc-100 font-mono text-zinc-800">{parseFloat(row.opening_balance) >= 0 ? '+' : '-'}₹{Math.abs(parseFloat(row.opening_balance)).toLocaleString('en-IN')}</td>
                            <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 font-mono">{new Date(row.transaction_date).toLocaleDateString('en-GB')}</td>
                            <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">{parseFloat(row.interest_percent || 0).toFixed(2)} %</td>
                            <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 font-mono">{row.days || 0} Days</td>
                            <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 leading-tight">{formatBilingualText(row.description || 'Interest')}</td>
                            <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">₹{parseFloat(row.interest_amount || 0).toLocaleString('en-IN')}</td>
                          </>;
                          if (isBrokerage || isLabour) return <>
                            <td className="px-2 py-0.5 text-[10px] text-right font-bold border-r border-zinc-100 font-mono text-zinc-800">{parseFloat(row.opening_balance) >= 0 ? '+' : '-'}₹{Math.abs(parseFloat(row.opening_balance)).toLocaleString('en-IN')}</td>
                            <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 font-mono">{new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
                            <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 font-mono">{row.invoice_no}</td>
                            <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 leading-tight">{formatBilingualText(row.description)}</td>
                            <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">₹{parseFloat(row.amount || 0).toLocaleString('en-IN')}</td>
                          </>;
                          return <>
                            <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 leading-tight">{formatBilingualText(i18n.language === 'gu' ? (row.account_name_gu || row.account_name) : row.account_name)}</td>
                            <td className="px-2 py-0.5 text-[10px] text-right font-bold border-r border-zinc-100 font-mono text-zinc-800">{parseFloat(row.opening_balance) >= 0 ? '+' : '-'}₹{Math.abs(parseFloat(row.opening_balance)).toLocaleString('en-IN')}</td>
                            <td className="px-2 py-0.5 text-[10px] text-zinc-800 border-r border-zinc-100 font-mono">{row.last_activity_date ? new Date(row.last_activity_date).toLocaleDateString('en-GB') : '-'}</td>
                            <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">₹{parseFloat(row.debit || 0).toLocaleString('en-IN')}</td>
                            <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">₹{parseFloat(row.credit || 0).toLocaleString('en-IN')}</td>
                            <td className="px-2 py-0.5 text-[10px] text-right font-bold border-r border-zinc-100 font-mono text-zinc-800">₹{Math.abs(parseFloat(row.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {parseFloat(row.closing_balance || 0) >= 0 ? 'DR' : 'CR'}</td>
                            {!hideBardan && (
                              <>
                                <td className="px-2 py-0.5 text-[10px] text-right font-bold border-r border-zinc-100 font-mono text-zinc-800">{Math.abs(parseFloat(row.bardan_balance || 0)).toLocaleString()} {parseFloat(row.bardan_balance || 0) >= 0 ? 'DR' : 'CR'}</td>
                                <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">{parseFloat(row.bardan_self_jama || 0).toLocaleString()}</td>
                                <td className="px-2 py-0.5 text-[10px] text-right font-bold text-zinc-800 border-r border-zinc-100 font-mono">₹{Math.abs(parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0) >= 0 ? 'DR' : 'CR'}</td>
                              </>
                            )}
                          </>;
                        })()}
                      </tr>
                    ))}
                    <tr className="bg-zinc-200 font-bold text-blue-700 uppercase text-[10px] tracking-widest border-t-2 border-zinc-300 sticky bottom-0 z-20 shadow-[0_-1px_0_0_rgba(209,213,219,1)]">
                      {(() => {
                        if (isBardan) {
                          return <>
                            <td colSpan="4" className="px-2 py-0.5 text-right font-bold">{t('sabhasadLedgerSummary.registryTotals')}:</td>
                            <td className="px-2 py-0.5 text-right text-[10px] font-mono tracking-tighter text-blue-700">{parseFloat(totals.opening_balance || 0).toLocaleString()}</td>
                            <td className="px-2 py-0.5 text-right text-[10px] font-mono tracking-tighter text-blue-700">{parseFloat(totals.debit || 0).toLocaleString()}</td>
                            <td className="px-2 py-0.5 text-right text-[10px] font-mono tracking-tighter text-blue-700">{parseFloat(totals.credit || 0).toLocaleString()}</td>
                            <td className="px-2 py-0.5 text-right text-[10px] font-mono tracking-tighter text-blue-700">{parseFloat(totals.self_credit || 0).toLocaleString()}</td>
                            <td className="px-2 py-0.5 text-right text-[10px] font-mono tracking-tighter text-blue-700">{Math.abs(parseFloat(totals.balance || 0)).toLocaleString()} {parseFloat(totals.balance || 0) >= 0 ? 'DR' : 'CR'}</td>
                            <td className="px-2 py-0.5 text-right text-[10px] font-mono tracking-tighter text-blue-700">₹{(parseFloat(totals.balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </>;
                        }

                        if (isSale || isTransactional) {
                          let displayTotalDebit = parseFloat(totals.debit || 0);
                          let displayTotalCredit = parseFloat(totals.credit || 0);

                          if (isSale) {
                            // Calculate totals based on displayed columns for consistency
                            displayTotalDebit = data.reduce((acc, r) => {
                              const isCashSale = (r.payment_type || '').toLowerCase().includes('cash');
                              return acc + (isCashSale ? 0 : (parseFloat(r.debit || 0) || parseFloat(r.credit || 0)));
                            }, 0);
                            displayTotalCredit = data.reduce((acc, r) => {
                              const isCashSale = (r.payment_type || '').toLowerCase().includes('cash');
                              return acc + (isCashSale ? (parseFloat(r.debit || 0) || parseFloat(r.credit || 0)) : 0);
                            }, 0);
                          }

                          return <>
                            <td colSpan="4" className="px-2 py-0.5 text-right font-bold">{t('sabhasadLedgerSummary.registryTotals')}:</td>
                            <td className="px-2 py-0.5 text-right text-[10px] font-mono tracking-tighter text-blue-700">₹{parseFloat(totals.opening_balance || 0).toLocaleString('en-IN')}</td>
                            <td className="px-2 py-0.5 text-right text-[10px] font-mono tracking-tighter text-blue-700">₹{displayTotalDebit.toLocaleString('en-IN')}</td>
                            <td className="px-2 py-0.5 text-right text-[10px] font-mono tracking-tighter text-blue-700">₹{displayTotalCredit.toLocaleString('en-IN')}</td>
                            <td className="px-2 py-0.5 text-right text-[10px] font-mono tracking-tighter text-blue-700">₹{Math.abs(parseFloat(totals.balance || 0)).toLocaleString('en-IN')} {parseFloat(totals.balance || 0) >= 0 ? (isTransactional ? 'C' : (isSale ? 'CR' : 'DR')) : (isTransactional ? 'D' : (isSale ? 'DR' : 'CR'))}</td>
                          </>;
                        }
                        if (isDangar) return <>
                          <td colSpan="9" className="px-2 py-0.5 text-right font-bold uppercase">{t('sabhasadLedgerSummary.totals')}</td>
                          <td className="px-2 py-0.5 text-right text-[10px] font-mono tracking-tighter text-blue-700">{data.reduce((acc, r) => acc + parseFloat(r.net_quintal || 0), 0).toFixed(2)} <span className="text-[9px] opacity-75 ml-0.5">Qt</span></td>
                          <td className="px-2 py-0.5 text-right text-[10px] font-mono tracking-tighter text-blue-700">₹{data.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0).toLocaleString('en-IN')}</td>
                        </>;
                        if (isInterest) return <>
                          <td colSpan="8" className="px-2 py-0.5 text-right font-bold uppercase">{t('sabhasadLedgerSummary.totals')}</td>
                          <td className="px-2 py-0.5 text-right text-[10px] font-mono tracking-tighter text-blue-700">₹{data.reduce((acc, r) => acc + parseFloat(r.interest_amount || 0), 0).toLocaleString('en-IN')}</td>
                        </>;
                        if (isBrokerage || isLabour) return <>
                          <td colSpan="7" className="px-2 py-0.5 text-right font-bold uppercase">{t('sabhasadLedgerSummary.totals')}</td>
                          <td className="px-2 py-0.5 text-right text-[10px] font-mono tracking-tighter text-blue-700">₹{data.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0).toLocaleString('en-IN')}</td>
                        </>;
                        return <>
                          <td colSpan="4" className="px-2 py-0.5 text-right font-bold uppercase">{t('sabhasadLedgerSummary.consolidatedTotals')}</td>
                          <td className="px-2 py-0.5 border-r border-zinc-300 font-mono text-right text-blue-700 text-[10px]">₹{parseFloat(totals.opening_balance || 0).toLocaleString('en-IN')}</td>
                          <td className="px-2 py-0.5 border-r border-zinc-300 font-sans"></td>
                          <td className="px-2 py-0.5 text-right text-blue-700 font-mono text-[10px]">₹{parseFloat(totals.debit || 0).toLocaleString('en-IN')}</td>
                          <td className="px-2 py-0.5 text-right text-blue-700 font-mono text-[10px]">₹{parseFloat(totals.credit || 0).toLocaleString('en-IN')}</td>
                          <td className="px-2 py-0.5 text-right text-blue-700 font-mono text-[10px]">₹{Math.abs(parseFloat(totals.closing_balance || 0)).toLocaleString('en-IN')} {parseFloat(totals.closing_balance || 0) >= 0 ? 'DR' : 'CR'}</td>
                          {!hideBardan && <>
                            <td className="px-2 py-0.5 text-right text-blue-700 font-mono text-[10px]">{Math.abs(data.reduce((s, r) => s + parseFloat(r.bardan_balance || 0), 0)).toLocaleString()} {data.reduce((s, r) => s + parseFloat(r.bardan_balance || 0), 0) >= 0 ? 'DR' : 'CR'}</td>
                            <td className="px-2 py-0.5 text-right text-blue-700 font-mono text-[10px]">{data.reduce((s, r) => s + parseFloat(r.bardan_self_jama || 0), 0).toLocaleString()}</td>
                            <td className="px-2 py-0.5 text-right text-blue-700 font-mono text-[10px]">₹{Math.abs(data.reduce((s, r) => s + (parseFloat(r.bardan_penalty_balance || r.bardan_balance || 0) * bardanPrice), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {data.reduce((s, r) => s + parseFloat(r.bardan_penalty_balance || r.bardan_balance || 0), 0) >= 0 ? 'DR' : 'CR'}</td>
                          </>}
                        </>;
                      })()}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAuditModal && auditMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAuditModal(false)} />
          <div className="relative w-full max-w-6xl bg-white border border-zinc-400 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] rounded-none">
            <div className="bg-zinc-100 px-5 py-3.5 border-b border-zinc-300 flex justify-between items-center select-none">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white border border-zinc-200 text-blue-600"><Activity size={18} /></div>
                <div>
                  <h2 className="text-[12px] font-bold text-zinc-800 uppercase tracking-tight">{formatBilingualText(auditMember.member_name)}<span className="text-blue-600 ml-2 font-sans">#{auditMember.member_code}</span></h2>
                  <p className="text-[9px] font-bold text-zinc-500 uppercase mt-0.5 tracking-wider">Audit Protocol Activation</p>
                </div>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="p-1 text-zinc-400 hover:text-red-600 transition"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scroller-airy bg-white">
              {auditLoading ? (
                <div className="py-32 text-center"><RefreshCcw className="animate-spin mx-auto text-blue-500 mb-4" size={40} /><p className="text-sm font-bold text-zinc-400 uppercase tracking-widest italic">Decrypting Ledger Stream...</p></div>
              ) : (
                <div className="border border-zinc-300 overflow-hidden">
                  <table className="w-full text-left font-mono text-sm border-collapse">
                    <thead className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">
                      <tr><th className="px-4 py-3 border-r border-zinc-200 ">{t('sabhasadLedgerSummary.date')}</th><th className="px-4 py-3 border-r border-zinc-200 ">{t('sabhasadLedgerSummary.description')}</th><th className="px-4 py-3 border-r border-zinc-200 ">{t('sabhasadLedgerSummary.reference')}</th><th className="px-4 py-3 text-right border-r border-zinc-200 ">{t('sabhasadLedgerSummary.debit')}</th><th className="px-4 py-3 text-right border-r border-zinc-200 ">{t('sabhasadLedgerSummary.credit')}</th><th className="px-4 py-3 text-right border-r border-zinc-200 ">{t('sabhasadLedgerSummary.selfJama')}</th><th className="px-4 py-3 text-right ">Running</th></tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-bold uppercase">
                      {auditTransactions.map((tx, i) => (
                        <tr key={i} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-3 text-zinc-400 border-r border-zinc-100 ">{new Date(tx.transaction_date).toLocaleDateString('en-GB')}</td>
                          <td className="px-4 py-3 text-zinc-800 border-r border-zinc-100">{formatBilingualText(tx.description)}</td>
                          <td className="px-4 py-3 text-zinc-400 border-r border-zinc-100">{tx.reference_no}</td>
                          <td className="px-4 py-3 text-right text-blue-600 border-r border-zinc-100 font-sans">₹{(parseFloat(tx.debit) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right text-red-600 border-r border-zinc-100 font-sans">{parseFloat(tx.company_credit || 0) > 0 ? `₹${parseFloat(tx.company_credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 border-r border-zinc-100 font-sans">{parseFloat(tx.self_credit || 0) > 0 ? parseFloat(tx.self_credit).toLocaleString() : '—'}</td>
                          <td className={`px-4 py-3 text-right font-black font-mono ${parseFloat(tx.running_balance || 0) >= 0 ? 'text-zinc-800' : 'text-red-600'}`}>₹{Math.abs(parseFloat(tx.running_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}<span className="text-sm ml-1 opacity-50 not- font-sans">{parseFloat(tx.running_balance || 0) >= 0 ? 'DR' : 'CR'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-5 py-3.5 bg-zinc-100 border-t border-zinc-300 flex justify-end"><button onClick={() => setShowAuditModal(false)} className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition rounded-none uppercase text-sm">Close Audit</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
