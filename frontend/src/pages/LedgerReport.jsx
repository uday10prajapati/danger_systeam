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
    } else if (!memberCodeSearch && memberId) {
      handleSelectMember(null);
    }
  }, [memberCodeSearch, members]);

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
    if (currentId !== allVal) {
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

    setLoading(true);
    try {
      const response = await api.get(`/ledger-report/account/${targetAccountId}`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          memberId: memberId || undefined
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
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-8 font-mono">
        <div className="text-center font-bold text-zinc-400">
          <p className="text-xs mb-4 uppercase tracking-widest">{t('ledgerReport.loading')}</p>
          <RefreshCcw className="animate-spin mx-auto text-blue-600" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 text-zinc-900 select-none animate-none font-bold">
      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6 shadow-sm rounded-none">

        {/* Compact, Unified Filter Console */}
        <div className="bg-zinc-50 border border-zinc-300 p-2.5 space-y-2 print:hidden">
          {/* Row 1: Core parameters */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">

            {/* Date Range */}
            <div className="lg:col-span-3 flex items-center gap-1">
              <span className="text-[10px] font-bold text-zinc-550 min-w-[30px]">{t('sabhasadLedgerSummary.startDate').split(' ')[0]}</span>
              <input 
                ref={startDateRef} 
                type="date" 
                value={dateRange.startDate} 
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} 
                onKeyDown={e => handleKeyDown(e, endDateRef)} 
                className="flex-1 px-1.5 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-[10px] text-zinc-700" 
              />
              <span className="text-[10px] font-bold text-zinc-550">-</span>
              <input 
                ref={endDateRef} 
                type="date" 
                value={dateRange.endDate} 
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} 
                onKeyDown={e => handleKeyDown(e, accountCodeRef)} 
                className="flex-1 px-1.5 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-[10px] text-zinc-700" 
              />
            </div>

            {/* Account Selector */}
            <div className="lg:col-span-4 flex items-center gap-1 relative" ref={accountDropdownRef}>
              <span className="text-[10px] font-bold text-zinc-550 min-w-[45px]">{t('sabhasadLedgerSummary.accountNomenclature').split(' ')[0]}</span>
              <div className="flex flex-1 gap-1">
                <div className="w-16 relative">
                  <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input 
                    ref={accountCodeRef} 
                    type="text" 
                    value={accountCodeSearch} 
                    onChange={(e) => { setAccountCodeSearch(e.target.value); setShowAccountDropdown(true); }} 
                    onFocus={() => { setShowAccountDropdown(true); setShowMemberDropdown(false); }} 
                    onKeyDown={handleAccountCodeKeyDown} 
                    placeholder="ID" 
                    className="w-full pl-5 pr-1 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-[10px] text-zinc-700" 
                  />
                </div>
                <div className="flex-1 relative">
                  <User size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input 
                    ref={accountNameRef} 
                    type="text" 
                    value={accountNameSearch} 
                    onChange={(e) => handleInputChangeWithAutocomplete(e, accountNameRef, filteredAccounts, 'account_name', setAccountNameSearch, setShowAccountDropdown, setAccountId, accountId, 'ALL')} 
                    onFocus={() => { setShowAccountDropdown(true); setShowMemberDropdown(false); }} 
                    onKeyDown={handleAccountNameKeyDown} 
                    placeholder={t('sabhasadLedgerSummary.accountNomenclature')} 
                    className={`w-full pl-6 pr-1.5 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-bold text-[10px] text-zinc-700 uppercase ${i18n.language === 'gu' ? 'font-prompt text-sm' : 'font-mono'}`} 
                  />
                  {showAccountDropdown && filteredAccounts.length > 0 && (
                    <div className="absolute top-[26px] left-0 right-0 bg-white border border-zinc-300 shadow-xl rounded-none z-[100] overflow-hidden w-full">
                      <div className="max-h-48 overflow-y-auto font-sans">
                        <div 
                          onClick={() => handleSelectAccount(null)} 
                          className="px-3 py-1.5 hover:bg-zinc-50 cursor-pointer font-bold text-[8px] text-blue-600 border-b border-zinc-200 uppercase tracking-widest flex items-center gap-1.5"
                        >
                          <Search size={10} className="text-blue-500" />
                          <span>{t('sabhasadLedgerSummary.allAccounts')}</span>
                        </div>
                        {filteredAccounts.map((a, idx) => (
                          <div 
                            key={a.id} 
                            onClick={() => handleSelectAccount(a)} 
                            onMouseEnter={() => setAccountActiveIdx(idx)} 
                            className={`px-3 py-1.5 flex justify-between items-center cursor-pointer border-b border-zinc-100 last:border-none group ${accountActiveIdx === idx ? 'bg-blue-50 text-blue-700' : 'hover:bg-blue-50'}`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <Search size={10} className={`transition-colors ${accountActiveIdx === idx ? 'text-blue-600' : 'text-zinc-400'}`} />
                              <span className={`text-[11px] font-bold transition-colors ${accountActiveIdx === idx ? 'text-blue-700' : 'text-zinc-700 group-hover:text-blue-600'}`}>{formatBilingualText(i18n.language === 'gu' ? (a.account_name_gu || a.account_name) : a.account_name)}</span>
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

            {/* Member Selector */}
            <div className="lg:col-span-5 flex items-center gap-1 relative" ref={memberDropdownRef}>
              <span className="text-[10px] font-bold text-zinc-550 min-w-[45px]">{t('sabhasadLedgerSummary.memberIdentity').split(' ')[0]}</span>
              <div className="flex flex-1 gap-1">
                <div className="w-16 relative">
                  <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input 
                    ref={memberCodeRef} 
                    type="text" 
                    value={memberCodeSearch} 
                    onChange={(e) => { setMemberCodeSearch(e.target.value); setShowMemberDropdown(true); }} 
                    onFocus={() => { setShowMemberDropdown(true); setShowAccountDropdown(false); }} 
                    onKeyDown={handleMemberCodeKeyDown} 
                    placeholder="ID" 
                    className="w-full pl-5 pr-1 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-[10px] text-zinc-700" 
                  />
                </div>
                <div className="flex-1 relative">
                  <User size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input 
                    ref={memberNameRef} 
                    type="text" 
                    value={memberNameSearch} 
                    onChange={(e) => handleInputChangeWithAutocomplete(e, memberNameRef, filteredMembers, 'member_name', setMemberNameSearch, setShowMemberDropdown, setMemberId, memberId, '')} 
                    onFocus={() => { setShowMemberDropdown(true); setShowAccountDropdown(false); }} 
                    onKeyDown={handleMemberNameKeyDown} 
                    placeholder={t('sabhasadLedgerSummary.nameSearch')} 
                    className={`w-full pl-6 pr-1.5 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-bold text-[10px] text-zinc-700 uppercase ${i18n.language === 'gu' ? 'font-prompt text-sm' : 'font-mono'}`} 
                  />
                  {showMemberDropdown && filteredMembers.length > 0 && (
                    <div className="absolute top-[26px] left-0 right-0 bg-white border border-zinc-300 shadow-xl rounded-none z-[100] overflow-hidden w-full">
                      <div className="max-h-48 overflow-y-auto font-sans">
                        <div 
                          onClick={() => handleSelectMember(null)} 
                          className="px-3 py-1.5 hover:bg-zinc-50 cursor-pointer font-bold text-[8px] text-blue-600 border-b border-zinc-200 uppercase tracking-widest flex items-center gap-1.5"
                        >
                          <Search size={10} className="text-blue-500" />
                          <span>{t('sabhasadLedgerSummary.allMembers')}</span>
                        </div>
                        {filteredMembers.map((m, idx) => (
                          <div 
                            key={m.id} 
                            onClick={() => handleSelectMember(m)} 
                            onMouseEnter={() => setMemberActiveIdx(idx)} 
                            className={`px-3 py-1.5 flex justify-between items-center cursor-pointer border-b border-zinc-100 last:border-none group ${memberActiveIdx === idx ? 'bg-blue-50 text-blue-700' : 'hover:bg-blue-50'}`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <Search size={10} className={`transition-colors ${memberActiveIdx === idx ? 'text-blue-600' : 'text-zinc-400'}`} />
                              <span className={`text-[11px] font-bold transition-colors ${memberActiveIdx === idx ? 'text-blue-700' : 'text-zinc-700 group-hover:text-blue-600'}`}>{formatBilingualText(i18n.language === 'gu' ? m.member_name : (m.eng_name || m.member_name))}</span>
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

          </div>

          {/* Row 2: Secondary options & Clear */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-2">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={printSubAmount} 
                  onChange={e => setPrintSubAmount(e.target.checked)} 
                  className="w-3.5 h-3.5 text-blue-600 border-zinc-300 rounded-none focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[10px] font-bold text-zinc-550">SUB-AMOUNTS</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={showAccountNumber} 
                  onChange={e => setShowAccountNumber(e.target.checked)} 
                  className="w-3.5 h-3.5 text-blue-600 border-zinc-300 rounded-none focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[10px] font-bold text-zinc-550">REGISTRY ID</span>
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={clearFilters}
                className="flex items-center justify-center gap-1 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-600 text-[10px] font-bold px-3 py-1 rounded-none transition cursor-pointer select-none uppercase whitespace-nowrap"
              >
                <X size={12} /> {t('sabhasadLedgerSummary.clear')}
              </button>
            </div>
          </div>
        </div>
        {/* Audit Canvas */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[500px] rounded-none">

          {/* Header Bar */}
          <div className="px-3 py-1.5 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-2 select-none print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                {accountId !== 'ALL' || memberId ? (
                  <span className="font-black">
                    {formatBilingualText(
                      [
                        accountId !== 'ALL' ? accountNameSearch : null,
                        memberId ? memberNameSearch : null
                      ].filter(Boolean).join(' - ')
                    )}
                  </span>
                ) : (
                  'CONSOLIDATED LEDGER REGISTRY'
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handlePrint} className="p-1 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm select-none rounded-none cursor-pointer" title={t('common.printStatement')}><Printer size={12} /></button>
              <button onClick={fetchReportData} className="p-1 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm cursor-pointer" title="Synchronize"><RefreshCcw size={12} className={loading ? 'animate-spin' : ''} /></button>
            </div>
          </div>
          


          <div className="flex-1 overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse select-none font-mono text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600 text-xs font-bold uppercase tracking-wider">
                  <th className="px-4 py-3 border-r border-zinc-200 w-[110px]">{t('ledgerReport.postEpoch')}</th>
                  <th className="px-4 py-3 border-r border-zinc-200 w-[140px]">{t('ledgerReport.manifestShard')}</th>
                  <th className="px-4 py-3 border-r border-zinc-200">{t('ledgerReport.particulars')}</th>
                  <th className="px-4 py-3 border-r border-zinc-200 text-right w-[130px]">{t('ledgerReport.credit')}</th>
                  <th className="px-4 py-3 border-r border-zinc-200 text-right w-[130px]">{t('ledgerReport.debit')}</th>
                  <th className="px-4 py-3 text-right w-[150px]">{t('ledgerReport.runningPosition')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-700">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-24 text-center">
                      <RefreshCcw className="animate-spin text-zinc-400 mx-auto mb-2" size={24} />
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('ledgerReport.syncing')}</p>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-24 text-center">
                      <Database className="text-zinc-300 mx-auto mb-2" size={32} />
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No Transaction Nodes Detected</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-4 py-2.5 border-r border-zinc-200 text-[10px] text-zinc-400">{formatDate(row.transaction_date)}</td>
                        <td className="px-4 py-2.5 border-r border-zinc-200 font-bold text-zinc-400">{row.reference_no}</td>
                        <td className="px-4 py-2.5 border-r border-zinc-200 font-bold text-zinc-700 font-prompt">{row.description}</td>
                        <td className="px-4 py-2.5 border-r border-zinc-200 text-right font-bold text-zinc-400">₹{parseFloat(row.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-2.5 border-r border-zinc-200 text-right font-bold text-zinc-900">₹{parseFloat(row.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-zinc-800">{formatBalance(row.running_balance)}</td>
                      </tr>
                    ))}
                    {/* Consolidated Total Shard */}
                    <tr className="bg-zinc-850 text-white font-bold border-t-4 border-zinc-300">
                      <td colSpan="3" className="px-4 py-4 text-xs tracking-wider uppercase">{t('ledgerReport.aggregateIntegrity')}</td>
                      <td className="px-4 py-4 text-right text-sm font-bold">₹{parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4 text-right text-sm font-bold">₹{parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-4 text-right opacity-40 text-[10px] tracking-widest uppercase">End_of_Window</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-zinc-100 border-t border-zinc-300 px-4 py-3 flex flex-col sm:flex-row justify-between items-center text-[9px] font-mono text-zinc-400 uppercase tracking-wider gap-2 select-none">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-blue-600"></div> System Status: Verified</span>
              <span>Shards: {data.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{company?.company_name} / Registry Auth</span>
              <span>ID: {new Date().getTime().toString(36)}</span>
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
          .bg-zinc-850 { background-color: #000000 !important; color: white !important; }
          .bg-zinc-100, .bg-zinc-50 { background-color: #f4f4f5 !important; }
          .rounded-lg, .rounded-none { border-radius: 0 !important; border: none !important; box-shadow: none !important; }
          table { width: 100%; border-collapse: collapse; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; }
          th, td { border-bottom: 1px solid #e4e4e7 !important; padding: 8px 10px !important; }
          tr { page-break-inside: avoid; }
        }
      `}} />
    </div>
  );
}
