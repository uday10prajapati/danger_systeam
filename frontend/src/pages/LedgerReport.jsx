import React, { useState, useEffect } from 'react';
import {
  Search, FileText, Printer, Database,
  Calendar, ChevronRight, Activity,
  RefreshCcw, ShieldCheck, Download,
  TrendingDown, TrendingUp, DollarSign,
  User, Layout, ChevronDown, CheckCircle2,
  X, Filter, Hash
} from 'lucide-react';
import api from '../api';
import { useTranslation } from 'react-i18next';
import { formatBilingualText, translateSystemText } from '../utils/textUtils';

export default function LedgerReport() {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';

  // Helper function to detect if text contains Gujarati characters
  const containsGujarati = (text) => {
    if (!text) return false;
    return /[\u0A80-\u0AFF]/.test(text);
  };

  // Smart name selection: use appropriate field based on language
  const getDisplayName = (account, isGujarati) => {
    if (isGujarati) {
      // For Gujarati mode: use account_name_gu if available, fallback to account_name
      return account.account_name_gu || account.account_name;
    } else {
      // For English mode: use account_name if it's English, fallback to account_name_gu
      return account.account_name || account.account_name_gu;
    }
  };

  // Smart member name selection
  const getMemberDisplayName = (member, isGujarati) => {
    if (isGujarati) {
      if (member.member_name_gu) return member.member_name_gu;
      if (containsGujarati(member.member_name)) return member.member_name;
      return member.member_name;
    } else {
      if (member.eng_name && !containsGujarati(member.eng_name)) return member.eng_name;
      if (!containsGujarati(member.member_name)) return member.member_name;
      return member.member_name;
    }
  };

  // States
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);
  const [accountName, setAccountName] = useState('');

  // Filter States
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [accountId, setAccountId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [printSubAmount, setPrintSubAmount] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [members, setMembers] = useState([]);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  // Account Selector search states
  const [accountCodeSearch, setAccountCodeSearch] = useState('');
  const [accountNameSearch, setAccountNameSearch] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  // Member Selector search states
  const [memberCodeSearch, setMemberCodeSearch] = useState('');
  const [memberNameSearch, setMemberNameSearch] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  // Refs for click outside
  const accountDropdownRef = React.useRef(null);
  const memberDropdownRef = React.useRef(null);

  // Keyboard navigation & Active selection index states
  const [accountActiveIdx, setAccountActiveIdx] = useState(0);
  const [memberActiveIdx, setMemberActiveIdx] = useState(0);

  // Refs for navigation & elements
  const startDateRef = React.useRef(null);
  const endDateRef = React.useRef(null);
  const accountCodeRef = React.useRef(null);
  const accountNameRef = React.useRef(null);
  const memberCodeRef = React.useRef(null);
  const memberNameRef = React.useRef(null);

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
    }
  }, [company]);

  const fetchDropdownData = async () => {
    try {
      const [accRes, memRes] = await Promise.all([
        api.get(`/accounts/company/${company.id}`),
        api.get(`/members/company/${company.id}`)
      ]);
      if (accRes.data.success) {
        setAccounts(accRes.data.data);
        if (accRes.data.data.length > 0) {
          handleSelectAccount(accRes.data.data[0]);
        } else {
          setAccountId('ALL');
          setAccountCodeSearch('');
          setAccountNameSearch(t('sabhasadLedgerSummary.allAccounts'));
        }
      }
      if (memRes.data.success) {
        setMembers(memRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load dropdown data', error);
    }
  };

  const handleSelectAccount = (acc) => {
    setAccountId(acc ? acc.id : 'ALL');
    setAccountCodeSearch(acc ? String(acc.id) : '');
    setAccountNameSearch(acc ? (i18n.language === 'gu' ? (acc.account_name_gu || translateSystemText(acc.account_name)) : acc.account_name) : t('sabhasadLedgerSummary.allAccounts'));
    setShowAccountDropdown(false);
  };

  const handleClearAccount = () => {
    handleSelectAccount(null);
  };

  const handleSelectMember = (mem) => {
    setMemberId(mem ? mem.id : '');
    setMemberCodeSearch(mem ? String(mem.member_code || mem.id) : '');
    setMemberNameSearch(mem ? (i18n.language === 'gu' ? (mem.member_name) : (mem.eng_name || mem.member_name)) : '');
    setShowMemberDropdown(false);
  };

  const handleClearMember = () => {
    handleSelectMember(null);
  };

  // Filter accounts based on dual-field search
  const filteredAccounts = accounts.filter(acc => {
    const codeMatch = accountCodeSearch ? String(acc.id).includes(accountCodeSearch) : true;
    const nameQuery = accountNameSearch && accountNameSearch !== t('sabhasadLedgerSummary.allAccounts') ? accountNameSearch.toLowerCase() : '';
    const nameMatch = !nameQuery ||
      (acc.account_name || '').toLowerCase().includes(nameQuery) ||
      (acc.account_name_gu || '').toLowerCase().includes(nameQuery) ||
      (acc.eng_name || '').toLowerCase().includes(nameQuery);
    return codeMatch && nameMatch;
  });

  // Filter members based on dual-field search
  const filteredMembers = members.filter(mem => {
    const codeMatch = memberCodeSearch ? String(mem.member_code || mem.id).includes(memberCodeSearch) : true;
    const nameQuery = memberNameSearch && memberNameSearch !== t('sabhasadLedgerSummary.allMembers') ? memberNameSearch.toLowerCase() : '';
    const nameMatch = !nameQuery ||
      (mem.member_name || '').toLowerCase().includes(nameQuery) ||
      (mem.member_name_gu || '').toLowerCase().includes(nameQuery) ||
      (mem.eng_name || '').toLowerCase().includes(nameQuery);
    return codeMatch && nameMatch;
  });

  // Reset active dropdown selection index on search input change
  useEffect(() => {
    setAccountActiveIdx(0);
  }, [accountCodeSearch, accountNameSearch]);

  useEffect(() => {
    setMemberActiveIdx(0);
  }, [memberCodeSearch, memberNameSearch]);

  // Automated Identity Synthesis: Auto-select account on exact Code match
  useEffect(() => {
    if (accountCodeSearch && accountId === 'ALL') {
      const exactMatch = accounts.find(acc => String(acc.id) === accountCodeSearch);
      if (exactMatch) {
        handleSelectAccount(exactMatch);
      }
    } else if (!accountCodeSearch && accountId !== 'ALL') {
      handleSelectAccount(null);
    }
  }, [accountCodeSearch, accounts]);

  useEffect(() => {
    if (accountNameSearch && accountId === 'ALL') {
      const match = accounts.find(acc => 
        (acc.account_name || '').toLowerCase() === accountNameSearch.toLowerCase() ||
        (acc.account_name_gu || '').toLowerCase() === accountNameSearch.toLowerCase() ||
        (acc.eng_name || '').toLowerCase() === accountNameSearch.toLowerCase()
      );
      if (match) handleSelectAccount(match);
    }
  }, [accountNameSearch, accounts]);

  // Automated Identity Synthesis: Auto-select member on exact Code match
  useEffect(() => {
    if (memberCodeSearch && !memberId) {
      const exactMatch = members.find(mem => String(mem.member_code || mem.id) === memberCodeSearch);
      if (exactMatch) {
        handleSelectMember(exactMatch);
      }
    } else if (!memberCodeSearch && !memberNameSearch && memberId) {
      handleSelectMember(null);
    }
  }, [memberCodeSearch, memberNameSearch, members]);

  useEffect(() => {
    if (memberNameSearch && !memberId) {
      const match = members.find(mem => 
        (mem.member_name || '').toLowerCase() === memberNameSearch.toLowerCase() ||
        (mem.member_name_gu || '').toLowerCase() === memberNameSearch.toLowerCase() ||
        (mem.eng_name || '').toLowerCase() === memberNameSearch.toLowerCase()
      );
      if (match) handleSelectMember(match);
    }
  }, [memberNameSearch, members]);

  // Handle dropdowns outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(event.target)) {
        setShowAccountDropdown(false);
      }
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target)) {
        setShowMemberDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAccountCodeKeyDown = (e) => {
    if (showAccountDropdown && filteredAccounts.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAccountActiveIdx((prev) => Math.min(prev + 1, filteredAccounts.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAccountActiveIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredAccounts[accountActiveIdx];
        if (selected) {
          handleSelectAccount(selected);
          if (accountNameRef.current) {
            accountNameRef.current.focus();
          }
        }
      } else if (e.key === 'Escape') {
        setShowAccountDropdown(false);
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (accountNameRef.current) {
          accountNameRef.current.focus();
        }
      }
    }
  };

  const handleAccountNameKeyDown = (e) => {
    if (showAccountDropdown && filteredAccounts.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAccountActiveIdx((prev) => Math.min(prev + 1, filteredAccounts.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAccountActiveIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredAccounts[accountActiveIdx];
        if (selected) {
          handleSelectAccount(selected);
          if (memberCodeRef.current) {
            memberCodeRef.current.focus();
          }
        }
      } else if (e.key === 'Escape') {
        setShowAccountDropdown(false);
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (memberCodeRef.current) {
          memberCodeRef.current.focus();
        }
      }
    }
  };

  const handleMemberCodeKeyDown = (e) => {
    if (showMemberDropdown && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMemberActiveIdx((prev) => Math.min(prev + 1, filteredMembers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMemberActiveIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredMembers[memberActiveIdx];
        if (selected) {
          handleSelectMember(selected);
          if (memberNameRef.current) {
            memberNameRef.current.focus();
          }
        }
      } else if (e.key === 'Escape') {
        setShowMemberDropdown(false);
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (memberNameRef.current) {
          memberNameRef.current.focus();
        }
      }
    }
  };

  const handleMemberNameKeyDown = (e) => {
    if (showMemberDropdown && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMemberActiveIdx((prev) => Math.min(prev + 1, filteredMembers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMemberActiveIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredMembers[memberActiveIdx];
        if (selected) {
          handleSelectMember(selected);
          fetchReportData();
        }
      } else if (e.key === 'Escape') {
        setShowMemberDropdown(false);
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

  const handleInputChangeWithAutocomplete = (e, inputRef, list, nameKey, setValue, setShowDrop, resetIdFn, currentId, allVal) => {
    const typedVal = e.target.value;
    const inputType = e.nativeEvent?.inputType || '';

    setValue(typedVal);
    if (setShowDrop) setShowDrop(true);
    if (!typedVal.trim() && currentId !== allVal) {
      resetIdFn(allVal);
    }

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

  const clearFilters = () => {
    handleSelectAccount(null);
    handleSelectMember(null);
    setDateRange({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
    setPrintSubAmount(false);
    setShowAccountNumber(false);
  };

  useEffect(() => {
    if (company?.id && (accountId || memberId) && dateRange.startDate && dateRange.endDate) {
      fetchReportData();
    }
  }, [accountId, memberId, dateRange.startDate, dateRange.endDate, company]);

  const fetchReportData = async () => {
    if (!company?.id) return;
    const targetAccountId = accountId || 'ALL';

    // Resolve member id from typed code/name if not explicitly selected
    let resolvedMemberId = memberId || '';
    if (!resolvedMemberId && (memberCodeSearch || memberNameSearch)) {
      const codeQuery = memberCodeSearch.trim();
      const nameQuery = memberNameSearch.trim().toLowerCase();
      const exactCode = codeQuery ? members.find(mem => String(mem.member_code || mem.id) === codeQuery) : null;
      const exactName = nameQuery ? members.find(mem =>
        (mem.member_name || '').toLowerCase() === nameQuery ||
        (mem.member_name_gu || '').toLowerCase() === nameQuery ||
        (mem.eng_name || '').toLowerCase() === nameQuery
      ) : null;
      const partialName = !exactName && nameQuery ? members.find(mem =>
        (mem.member_name || '').toLowerCase().includes(nameQuery) ||
        (mem.member_name_gu || '').toLowerCase().includes(nameQuery) ||
        (mem.eng_name || '').toLowerCase().includes(nameQuery)
      ) : null;

      const resolved = exactCode || exactName || partialName;
      if (resolved) {
        resolvedMemberId = resolved.id;
        setMemberId(resolved.id);
        setMemberCodeSearch(String(resolved.member_code || resolved.id));
        setMemberNameSearch(i18n.language === 'gu' ? (resolved.member_name || '') : (resolved.eng_name || resolved.member_name || ''));
      }
    }

    setLoading(true);
    try {
      const response = await api.get(`/ledger-report/account/${targetAccountId}`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          memberId: resolvedMemberId || undefined
        }
      });

      if (response.data.success) {
        setData(response.data.data);
        setTotals(response.data.totals);
        setAccountName(response.data.account_name);
      }
    } catch (error) {
      console.error('Fetch report error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatBalance = (balance) => {
    const val = parseFloat(balance);
    if (isNaN(val)) return '';
    const absVal = Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    if (val < 0) return `${absVal} C`;
    if (val > 0) return `${absVal} D`;
    return '0.00';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  };

    if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 font-mono">
        <div className="text-center font-bold text-slate-400">
          <p className="text-xs mb-4 uppercase tracking-widest">{t('ledgerReport.loading')}</p>
          <RefreshCcw className="animate-spin mx-auto text-[#1d5f84]" size={24} />
        </div>
      </div>
    );
  }

  const isDefaultStartDate = dateRange.startDate === new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const isDefaultEndDate = dateRange.endDate === new Date().toISOString().split('T')[0];
  const hasActiveFilters = accountId !== 'ALL' || memberId !== '' || !isDefaultStartDate || !isDefaultEndDate || printSubAmount || showAccountNumber;

  return (
    <div className="min-h-screen bg-slate-50 font-sans select-none text-slate-800 pb-8">
      <div className="max-w-[1600px] mx-auto px-4 py-4">

        {/* Polished Ledger Statement Registry Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col min-h-[600px] relative shadow-none">
          
          {/* Table Header Bar */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none print:hidden">
            <div className="flex items-center gap-4">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                {accountId !== 'ALL' || memberId ? (
                  <span className="font-extrabold text-[#1d5f84]">
                    {formatBilingualText(
                      [
                        accountId !== 'ALL' ? accountNameSearch : null,
                        memberId ? memberNameSearch : null
                      ].filter(Boolean).join(' ➔ ')
                    )}
                  </span>
                ) : (
                  t('sabhasadLedgerSummary.ledgerRegistryList') || "CONSOLIDATED LEDGER REGISTRY"
                )}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowFiltersDrawer(true)}
                className={`px-2.5 h-7 flex items-center gap-1.5 justify-center transition-all rounded-md cursor-pointer relative select-none shadow-sm text-xs font-semibold ${hasActiveFilters
                    ? 'bg-[#1d5f84] border border-[#1d5f84] text-white hover:bg-[#154662]'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
              >
                <Filter size={13} className={hasActiveFilters ? "text-white" : "text-slate-500"} />
                <span>{t('sabhasadLedgerSummary.filters') || "Filters"}</span>
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
                  className="px-2.5 h-7 flex items-center gap-1.5 justify-center transition-all rounded-md cursor-pointer relative select-none shadow-sm text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
                >
                  <X size={13} className="text-rose-600" />
                  <span>{i18n.language === 'gu' ? 'ક્લિયર' : 'Clear'}</span>
                </button>
              )}
              <button
                onClick={handlePrint}
                title={t('sabhasadLedgerSummary.print') || "Print"}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <Printer size={13} className="text-slate-500" />
              </button>
              <button
                onClick={fetchReportData}
                title={t('sabhasadLedgerSummary.refreshRegistry') || "Refresh"}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <RefreshCcw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-white custom-scrollbar border-t border-slate-200">
            <table className="w-full text-left font-sans text-xs border-collapse select-none">
              <thead className="sticky top-0 z-20 shadow-sm">
                <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <th className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{t('ledgerReport.postEpoch')}</th>
                  <th className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{t('ledgerReport.manifestShard')}</th>
                  <th className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{t('ledgerReport.particulars')}</th>
                  <th className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap">{t('ledgerReport.openingBalance') || 'Opening'}</th>
                  <th className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap">{t('ledgerReport.debit')}</th>
                  <th className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap">{t('ledgerReport.credit')}</th>
                  <th className="px-3 py-2 text-right whitespace-nowrap">{t('ledgerReport.runningPosition')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-24 text-center">
                      <RefreshCcw className="animate-spin text-slate-400 mx-auto mb-2" size={24} />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('ledgerReport.syncing')}</p>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-24 text-center">
                      <Database className="text-slate-300 mx-auto mb-2" size={32} />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Transaction Nodes Detected</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-1.5 border-r border-slate-100 text-[10px] text-slate-600 font-mono">{formatDate(row.transaction_date)}</td>
                        <td className="px-3 py-1.5 border-r border-slate-100 text-[10px] text-slate-600 font-mono">{row.reference_no}</td>
                        <td className="px-3 py-1.5 border-r border-slate-100 text-[11px] text-slate-700 font-medium leading-tight">{isGu ? formatBilingualText(row.description_gu || row.narration_text_gu || row.description || '') : (row.description_en || row.description || row.narration_text || row.eng_name || '—')}</td>
                        <td className="px-3 py-1.5 border-r border-slate-100 text-[11px] text-right font-mono font-semibold text-slate-500">
                          {parseFloat(row.opening_balance || 0) !== 0 ? `₹${parseFloat(row.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-3 py-1.5 border-r border-slate-100 text-[11px] text-right font-mono font-semibold text-blue-600">{parseFloat(row.debit || 0) > 0 ? `₹${parseFloat(row.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                        <td className="px-3 py-1.5 border-r border-slate-100 text-[11px] text-right font-mono font-semibold text-emerald-600">{parseFloat(row.credit || 0) > 0 ? `₹${parseFloat(row.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                        <td className="px-3 py-1.5 text-right text-[11px] font-mono font-bold text-slate-800">{formatBalance(row.running_balance)}</td>
                      </tr>
                    ))}
                    {/* Consolidated Total Shard */}
                    <tr className="bg-slate-100 border-t border-slate-200">
                      <td colSpan="4" className="px-3 py-2 text-[11px] font-black uppercase text-slate-700 text-right border-r border-slate-200">{t('ledgerReport.aggregateIntegrity') || "Total Balance"}:</td>
                      <td className="px-3 py-2 text-right text-[11px] font-mono font-bold text-[#1d5f84] border-r border-slate-200">₹{parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-right text-[11px] font-mono font-bold text-[#1d5f84] border-r border-slate-200">₹{parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-right opacity-60 text-[10px] tracking-widest uppercase font-sans text-[#1d5f84]">End_of_Window</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-slate-100 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row justify-between items-center text-[9px] font-mono text-slate-400 uppercase tracking-wider gap-2 select-none print:hidden">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[#1d5f84] rounded-full"></div> System Status: Verified</span>
              <span>Shards: {data.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{company?.company_name} / Registry Auth</span>
              <span>ID: {new Date().getTime().toString(36).toUpperCase()}</span>
            </div>
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
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  {isGu ? 'ફિલ્ટર પરિમાણો' : 'Filter Parameters'}
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
                  {t('sabhasadLedgerSummary.dateRange') || "Date Range Period"}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold uppercase">{isGu ? 'થી' : 'From'}</span>
                    <input
                      ref={startDateRef}
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                      onKeyDown={(e) => { if(e.key === 'Enter') endDateRef.current?.focus(); }}
                      className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-10 pr-2 py-1.5 text-xs text-slate-700 font-bold font-mono outline-none w-full"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold uppercase">{isGu ? 'સુધી' : 'To'}</span>
                    <input
                      ref={endDateRef}
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                      onKeyDown={(e) => { if(e.key === 'Enter') accountCodeRef.current?.focus(); }}
                      className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-6 pr-2 py-1.5 text-xs text-slate-700 font-bold font-mono outline-none w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Account Nomenclature Search */}
              <div className="space-y-1.5 relative" ref={accountDropdownRef}>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {t('sabhasadLedgerSummary.accountNomenclature') || "Account"}
                </span>
                <div className="flex gap-2">
                  <input
                    ref={accountCodeRef}
                    type="text"
                    value={accountCodeSearch}
                    onChange={(e) => { setAccountCodeSearch(e.target.value); setShowAccountDropdown(true); }}
                    onFocus={() => { setShowAccountDropdown(true); setShowMemberDropdown(false); }}
                    onKeyDown={handleAccountCodeKeyDown}
                    placeholder={isGu ? 'આઈડી' : 'ID'}
                    className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-1 py-1.5 text-xs text-[#1d5f84] font-mono font-bold w-12 text-center outline-none"
                  />
                  <input
                    ref={accountNameRef}
                    type="text"
                    value={accountNameSearch}
                    onChange={(e) => handleInputChangeWithAutocomplete(e, accountNameRef, filteredAccounts, 'account_name', setAccountNameSearch, setShowAccountDropdown, setAccountId, accountId, 'ALL')}
                    onFocus={() => { setShowAccountDropdown(true); setShowMemberDropdown(false); }}
                    onKeyDown={handleAccountNameKeyDown}
                    placeholder={t('sabhasadLedgerSummary.accountNomenclature') || "Account Name"}
                    className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-xs text-slate-700 font-bold flex-1 uppercase outline-none ${i18n.language === 'gu' ? 'font-prompt' : 'font-mono'}`}
                  />
                </div>

                {showAccountDropdown && filteredAccounts.length > 0 && (
                  <div className="absolute top-[102%] left-0 right-0 bg-white border border-slate-200 rounded-md z-[110] mt-0.5 max-h-40 overflow-y-auto shadow-sm">
                    <div
                      onClick={() => handleSelectAccount(null)}
                      className="px-2.5 py-1 hover:bg-slate-50 cursor-pointer font-bold text-[9px] text-blue-600 border-b border-slate-100 uppercase flex items-center gap-1"
                    >
                      <Search size={10} />
                      <span>{t('sabhasadLedgerSummary.allAccounts')}</span>
                    </div>
                    {filteredAccounts.map((a, idx) => (
                      <div
                        key={a.id}
                        onClick={() => handleSelectAccount(a)}
                        onMouseEnter={() => setAccountActiveIdx(idx)}
                        className={`px-2.5 py-1 flex justify-between items-center cursor-pointer border-b border-slate-100 last:border-none ${accountActiveIdx === idx ? 'bg-slate-50 text-[#1d5f84]' : 'hover:bg-slate-50'}`}
                      >
                        <span className="text-[10px] font-bold truncate">
                          {getDisplayName(a, isGu)}
                        </span>
                        <span className="text-[8px] font-mono text-slate-400 font-semibold shrink-0">#{a.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Member Search */}
              <div className="space-y-1.5 relative" ref={memberDropdownRef}>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {t('sabhasadLedgerSummary.memberIdentity') || "Member"}
                </span>
                <div className="flex gap-2">
                  <input
                    ref={memberCodeRef}
                    type="text"
                    value={memberCodeSearch}
                    onChange={(e) => { setMemberCodeSearch(e.target.value); setShowMemberDropdown(true); }}
                    onFocus={() => { setShowMemberDropdown(true); setShowAccountDropdown(false); }}
                    onKeyDown={handleMemberCodeKeyDown}
                    placeholder={isGu ? 'આઈડી' : 'ID'}
                    className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-1 py-1.5 text-xs text-[#1d5f84] font-mono font-bold w-12 text-center outline-none"
                  />
                  <input
                    ref={memberNameRef}
                    type="text"
                    value={memberNameSearch}
                    onChange={(e) => handleInputChangeWithAutocomplete(e, memberNameRef, filteredMembers, 'member_name', setMemberNameSearch, setShowMemberDropdown, setMemberId, memberId, '')}
                    onFocus={() => { setShowMemberDropdown(true); setShowAccountDropdown(false); }}
                    onKeyDown={handleMemberNameKeyDown}
                    placeholder={t('sabhasadLedgerSummary.nameSearch') || "Member Name"}
                    className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-xs text-slate-700 font-bold flex-1 uppercase outline-none ${i18n.language === 'gu' ? 'font-prompt' : 'font-mono'}`}
                  />
                </div>

                {showMemberDropdown && filteredMembers.length > 0 && (
                  <div className="absolute top-[102%] left-0 right-0 bg-white border border-slate-200 rounded-md z-[110] mt-0.5 max-h-40 overflow-y-auto shadow-sm">
                    <div
                      onClick={() => handleSelectMember(null)}
                      className="px-2.5 py-1 hover:bg-slate-50 cursor-pointer font-bold text-[9px] text-blue-600 border-b border-slate-100 uppercase flex items-center gap-1"
                    >
                      <Search size={10} />
                      <span>{t('sabhasadLedgerSummary.allMembers')}</span>
                    </div>
                    {filteredMembers.map((m, idx) => (
                      <div
                        key={m.id}
                        onClick={() => handleSelectMember(m)}
                        onMouseEnter={() => setMemberActiveIdx(idx)}
                        className={`px-2.5 py-1 flex justify-between items-center cursor-pointer border-b border-slate-100 last:border-none ${memberActiveIdx === idx ? 'bg-slate-50 text-[#1d5f84]' : 'hover:bg-slate-50'}`}
                      >
                        <span className="text-[10px] font-bold truncate">
                          {getMemberDisplayName(m, isGu)}
                        </span>
                        <span className="text-[8px] font-mono text-slate-400 font-semibold shrink-0">#{m.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Extra toggles */}
              <div className="flex items-center justify-between py-1 bg-white select-none pt-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sub-Amounts</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printSubAmount}
                    onChange={(e) => setPrintSubAmount(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1d5f84]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between py-1 bg-white select-none">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Registry ID</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAccountNumber}
                    onChange={(e) => setShowAccountNumber(e.target.checked)}
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
                className="flex-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-md transition cursor-pointer uppercase tracking-wider"
              >
                {isGu ? 'રીસેટ કરો' : 'Reset All'}
              </button>
              <button
                onClick={() => {
                  fetchReportData();
                  setShowFiltersDrawer(false);
                }}
                className="flex-1 px-3 py-2 bg-[#1d5f84] hover:bg-[#154662] text-white text-xs font-bold rounded-md transition cursor-pointer uppercase tracking-wider"
              >
                {isGu ? 'વિવરણ જુઓ' : 'View Statement'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { margin: 1.5cm; size: auto; }
          body { background-color: white !important; margin: 0; padding: 0; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .bg-\\[\\#1d5f84\\] { background-color: #000000 !important; color: white !important; }
          .bg-slate-100, .bg-slate-50 { background-color: #f8fafc !important; }
          .rounded-lg, .rounded-none { border-radius: 0 !important; border: none !important; box-shadow: none !important; }
          table { width: 100%; border-collapse: collapse; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; }
          th, td { border-bottom: 1px solid #e2e8f0 !important; padding: 8px 10px !important; }
          tr { page-break-inside: avoid; }
        }
      `}} />
    </div>
  );
}
