import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { exportToPDF } from '../utils/pdfExporter';
import {
  Plus, Edit2, Trash2, Eye, X, Download, Database, Shield,
  Search, Loader, FileText, Power, RefreshCcw, Building2,
  ChevronLeft, ChevronRight, Calculator, PieChart, Info,
  CreditCard, Wallet, Copy, Check
} from 'lucide-react';
import AccountForm from '../components/AccountForm';
import Toast from '../components/Toast';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import Loading from '../components/Loading';
import api from '../api';
import { formatBilingualText } from '../utils/textUtils';

export default function AccountMaster() {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';

  const [company, setCompany] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [balTypeFilter, setBalTypeFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);

  // Account Detail Modal states
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('general');
  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const guDigits = {
    '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
    '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯'
  };

  const guLetters = {
    'અ': 'A', 'આ': 'AA', 'ઇ': 'I', 'ઈ': 'II', 'ઉ': 'U', 'ઊ': 'UU',
    'ઋ': 'R', 'એ': 'E', 'ઐ': 'AI', 'ઓ': 'O', 'ઔ': 'AU',
    'ક': 'K', 'ખ': 'KH', 'ગ': 'G', 'ઘ': 'GH', 'ઙ': 'NG',
    'ચ': 'CH', 'છ': 'CHH', 'જ': 'J', 'ઝ': 'JH', 'ઞ': 'NY',
    'ટ': 'T', 'ઠ': 'TH', 'ડ': 'D', 'ઢ': 'DH', 'ણ': 'N',
    'ત': 'T', 'થ': 'TH', 'દ': 'D', 'ધ': 'DH', 'ન': 'N',
    'પ': 'P', 'ફ': 'F', 'બ': 'B', 'ભ': 'BH', 'મ': 'M',
    'ય': 'Y', 'ર': 'R', 'લ': 'L', 'વ': 'V', 'શ': 'SH',
    'ષ': 'SH', 'સ': 'S', 'હ': 'H',
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
    '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
  };

  const toGujaratiDigits = (value) => {
    if (i18n.language !== 'gu') return String(value ?? '');
    return String(value ?? '').replace(/[0-9]/g, (d) => guDigits[d] || d);
  };
  const toEnglishDigits = (value) => String(value ?? '').replace(/[૦-૯]/g, (d) => '0123456789'['૦૧૨૩૪૫૬૭૪૯'.indexOf(d)] || d);
  const toEnglishText = (value) => String(value ?? '').split('').map(char => guLetters[char] || char).join('');

  const fmtVal = (val) => toGujaratiDigits(val);
  const fmtAmount = (val) => {
    const num = parseFloat(val) || 0;
    const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return toGujaratiDigits(formatted);
  };

  const displayAccountName = (acc) => {
    return isGu
      ? (acc.account_name_gu || acc.account_name || '')
      : (acc.account_name || acc.account_name_gu || '');
  };

  // Toggle to show/hide the Code (account_code) column in the accounts table
  const SHOW_CODE_COLUMN = false;

  const getAvatarGradient = (name) => {
    const s = name || 'A';
    const charCode = s.charCodeAt(0) || 0;
    const gradients = [
      'from-slate-500 to-slate-700',
      'from-sky-600 to-blue-700',
      'from-emerald-600 to-teal-700',
      'from-indigo-600 to-violet-700',
      'from-amber-600 to-orange-700',
      'from-rose-600 to-pink-700'
    ];
    return gradients[charCode % gradients.length];
  };

  const getInitials = (acc) => {
    if (!acc) return 'A';
    const name = displayAccountName(acc) || 'A';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleCopyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    if (company) loadAccounts();
  }, [company, selectedType]);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const r = await api.get('/company');
      if (r.data.success && r.data.data) setCompany(r.data.data);
      else setMessage({ type: 'error', text: t('accountMaster.errors.noCompany') });
    } catch {
      setMessage({ type: 'error', text: t('accountMaster.errors.failedLoadContext') });
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const url = selectedType === 'all' ? `/accounts/company/${company.id}` : `/accounts/company/${company.id}?type=${selectedType}`;
      const r = await api.get(url);
      if (r.data.success) setAccounts(r.data.data || []);
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.error || t('accountMaster.errors.failedLoadAccounts') });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setShowModal(true);
  };

  const handleCreateNew = () => {
    setEditingAccount(null);
    setShowModal(true);
  };

  const handleFormSuccess = (msg) => {
    setShowModal(false);
    setEditingAccount(null);
    loadAccounts();
    setMessage({ type: 'success', text: msg || t('accountMaster.messages.accountSaved') });
  };

  const handleStatusToggle = async (acc) => {
    try {
      await api.post(`/accounts/${acc.id}/${acc.is_active ? 'deactivate' : 'activate'}`);
      setMessage({ type: 'success', text: t('accountMaster.messages.statusUpdatedSuccessfully') });
      loadAccounts();
      if (selectedAccount && selectedAccount.id === acc.id) {
        setSelectedAccount(prev => ({ ...prev, is_active: !prev.is_active }));
      }
    } catch {
      setMessage({ type: 'error', text: t('accountMaster.errors.failedUpdateStatus') });
    }
  };

  const confirmDelete = (account) => {
    setAccountToDelete(account);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;
    try {
      setLoading(true);
      await api.delete(`/accounts/${accountToDelete.id}`);
      setMessage({ type: 'success', text: t('accountMaster.messages.accountDeletedSuccessfully') });
      setDeleteModalOpen(false);
      setAccountToDelete(null);
      setSelectedAccount(null);
      loadAccounts();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.error || t('accountMaster.errors.deleteFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = async (account) => {
    setSelectedAccount(account);
    setActiveDetailTab('general');
    setAuditData(null);
    if (!account) return;

    try {
      setAuditLoading(true);
      const response = await api.get(`/accounts/${account.id}/balance`);
      if (response.data.success) {
        setAuditData(response.data.data);
      }
    } catch (e) {
      console.error("Failed to load audit balance", e);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    const headers = [
      t('accountMaster.accountName'),
      t('accountMaster.identity'),
      t('accountMaster.accountType'),
      t('accountMaster.status'),
      t('accountMaster.closingBalance'),
      t('accountMaster.balanceType')
    ];
    const rows = filteredAccounts.map(acc => [
      `"${displayAccountName(acc)}"`,
      `"${toEnglishText(acc.account_code || acc.id)}"`,
      `"${t(`accountMaster.types.${acc.account_type}`)}"`,
      `"${acc.is_active ? t('accountMaster.active') : t('accountMaster.inactive')}"`,
      parseFloat(acc.closing_balance || 0).toFixed(2),
      `"${acc.balance_type === 'credit' ? t('accountMaster.jama') || 'Credit' : acc.balance_type === 'debit' ? t('accountMaster.udhar') || 'Debit' : t('accountMaster.zero')}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Accounts_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportPDF = async () => {
    const rows = filteredAccounts.length ? filteredAccounts : accounts;

    if (!rows.length) {
      setMessage({ type: 'error', text: t('accountMaster.noRecords') });
      return;
    }

    const rowsDebit = rows.filter(a => a.balance_type === 'debit').reduce((s, a) => s + parseFloat(a.closing_balance || 0), 0);
    const rowsCredit = rows.filter(a => a.balance_type === 'credit').reduce((s, a) => s + parseFloat(a.closing_balance || 0), 0);

    const columns = [
      {
        header: isGu ? 'ક્રમ' : '#',
        align: 'center',
        width: '8%',
        render: (row, idx) => isGu ? toGujaratiDigits(idx + 1) : (idx + 1)
      },
      {
        header: isGu ? 'ખાતાનું નામ' : 'Account Name',
        align: 'left',
        width: '35%',
        render: (row) => displayAccountName(row) || '',
        usePromptFont: true
      },
      {
        header: isGu ? 'ખાતા કોડ' : 'Account Code',
        align: 'center',
        width: '15%',
        render: (row) => isGu ? toGujaratiDigits(row.account_code || row.id || '') : (row.account_code || row.id || '')
      },
      {
        header: isGu ? 'હિસાબ પ્રકાર' : 'Account Type',
        align: 'left',
        width: '18%',
        render: (row) => t(`accountMaster.types.${row.account_type}`) || row.account_type || ''
      },
      {
        header: isGu ? 'સ્થિતિ' : 'Status',
        align: 'center',
        width: '10%',
        render: (row) => row.is_active ? (isGu ? 'સક્રિય' : 'Active') : (isGu ? 'નિષ્ક્રિય' : 'Inactive')
      },
      {
        header: isGu ? 'બંધ નાણું' : 'Closing Balance',
        align: 'right',
        width: '14%',
        render: (row) => {
          const bal = parseFloat(row.closing_balance) || 0;
          const type = row.balance_type === 'credit' ? (isGu ? ' જમા' : ' CR') : row.balance_type === 'debit' ? (isGu ? ' ઉધાર' : ' DR') : '';
          return `₹${fmtAmount(bal)}${type}`;
        }
      }
    ];

    const metaInfo = [
      {
        label: isGu ? 'કુલ ખાતાઓ' : 'Total Accounts',
        value: isGu ? toGujaratiDigits(rows.length) : rows.length
      },
      {
        label: isGu ? 'કુલ ઉધાર બાકી' : 'Total Debit',
        value: `₹${fmtAmount(rowsDebit)}`
      },
      {
        label: isGu ? 'કુલ જમા બાકી' : 'Total Credit',
        value: `₹${fmtAmount(rowsCredit)}`
      },
      {
        label: isGu ? 'ફિલ્ટર' : 'Filter',
        value: selectedType === 'all' ? (isGu ? 'બધા' : 'All') : selectedType
      }
    ];

    await exportToPDF({
      title: isGu ? 'ખાતા માસ્ટર' : 'Account Master',
      columns,
      rows,
      isGu,
      metaInfo,
      filename: `Account_Master_${new Date().toISOString().split('T')[0]}.pdf`,
      onStart: () => setLoading(true),
      onComplete: () => setLoading(false)
    });
  };

  const filteredAccounts = accounts.filter(acc => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' ||
      acc.account_name.toLowerCase().includes(q) ||
      (acc.account_name_gu && acc.account_name_gu.toLowerCase().includes(q)) ||
      acc.account_code?.toString().includes(q) ||
      acc.id?.toString().includes(q);

    const matchesType = selectedType === 'all' || acc.account_type === selectedType;
    const matchesBalanceType = balTypeFilter === 'all' || acc.balance_type === balTypeFilter;

    return matchesSearch && matchesType && matchesBalanceType;
  });

  const debitTotal = accounts.filter(a => a.balance_type === 'debit').reduce((s, a) => s + (parseFloat(a.closing_balance) || 0), 0);
  const creditTotal = accounts.filter(a => a.balance_type === 'credit').reduce((s, a) => s + (parseFloat(a.closing_balance) || 0), 0);

  if (loading && accounts.length === 0 && !company) return <Loading />;

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6">
        <div className="w-16 h-16 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 mb-6 shadow-sm">
          <Building2 size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">{t('accountMaster.errors.noCompany')}</h2>
        <p className="text-slate-500 mb-6 text-center max-w-md text-sm">
          {t('accountMaster.errors.companyDescription') || 'Please select a company to manage accounts.'}
        </p>
        <button onClick={() => window.location.reload()} className="flex items-center px-4 py-2 bg-[#1d5f84] hover:bg-[#154662] text-white rounded-md shadow-sm transition-colors text-sm font-bold uppercase tracking-widest">
          <RefreshCcw className="w-4 h-4 mr-2" /> {t('accountMaster.errors.retry')}
        </button>
      </div>
    );
  }

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredAccounts.length);
  const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 select-none pb-12">
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="px-4 py-4 max-w-[1600px] mx-auto space-y-4">
        {/* Global Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{isGu ? "કુલ ખાતાઓ" : "Total Accounts"}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{fmtVal(accounts.length)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{isGu ? "સક્રિય ખાતાઓ" : "Active Accounts"}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{fmtVal(accounts.filter(a => a.is_active).length)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-red-500 uppercase tracking-widest">{isGu ? "કુલ ઉધાર બાકી" : "Total Debit Balance"}</span>
            <span className="text-[13px] font-bold font-mono text-red-700 mt-1">₹{fmtAmount(debitTotal)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-blue-500 uppercase tracking-widest">{isGu ? "કુલ જમા બાકી" : "Total Credit Balance"}</span>
            <span className="text-[13px] font-bold font-mono text-blue-700 mt-1">₹{fmtAmount(creditTotal)}</span>
          </div>
        </div>

        {/* Minimal Classic Registry Directory Wrapper (Full Width) */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none">

          {/* Table Control Header Bar (First Line) */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-extrabold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>
                {t('accountMaster.title') || 'Account Master'}
              </span>
              <span className="bg-slate-200 text-slate-600 font-bold force-en text-[12px] px-1.5 py-0.5 rounded-sm">
                {fmtVal(filteredAccounts.length)} {t('accountMaster.records') || 'Records'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Bar */}
              <div className="relative flex items-center border border-slate-200 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] rounded-md bg-white px-2.5 py-1 transition-colors w-48 sm:w-64">
                <Search size={12} className="text-slate-400 mr-1.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t('accountMaster.searchPlaceholder') || "Search name or code..."}
                  className="bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-300 w-full font-semibold"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-0.5 text-slate-300 hover:text-slate-600 transition">
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* CSV Download Button */}
              <button
                onClick={handleDownloadCSV}
                title="Download CSV"
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <Download size={13} className="text-slate-500" />
              </button>

              {/* PDF Report Button */}
              <button
                onClick={handleExportPDF}
                title={t('common.pdf') || "PDF Report"}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <FileText size={13} className="text-slate-500" />
              </button>

              {/* Add Account Button */}
              <button
                onClick={handleCreateNew}
                className="h-7 flex items-center gap-1.5 px-2.5 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[12px] font-bold rounded-md transition shadow-sm cursor-pointer uppercase tracking-wider"
              >
                <Plus size={13} />
                <span>{t('accountMaster.addAccount') || "New Account"}</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={loadAccounts}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
                title={t('accountMaster.refreshRegistry') || 'Refresh'}
              >
                <RefreshCcw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Directory Filter Content Panel (Second Line) */}
          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 select-none">
            {/* Classification Type tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['all', 'customer', 'vendor', 'bank', 'cash', 'assets'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedType(type);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 text-sm font-bold rounded-md transition-all shrink-0 cursor-pointer border ${selectedType === type
                    ? 'bg-[#1d5f84] border-[#1d5f84] text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <span>{t(`accountMaster.types.${type}`)}</span>
                </button>
              ))}

              {/* More Types Dropdown inside tab list */}
              <div className="flex flex-col bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 min-w-[120px] justify-center h-[26px]">
                <select
                  className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-700 cursor-pointer py-0 uppercase tracking-wider"
                  value={['all', 'customer', 'vendor', 'bank', 'cash', 'assets'].includes(selectedType) ? 'more' : selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="more" disabled>{t('accountMaster.moreTypes') || 'More Types'}</option>
                  {['supplier', 'liabilities', 'capital', 'revenue', 'expense', 'purchase', 'sales'].map(type => (
                    <option key={type} value={type}>{t(`accountMaster.types.${type}`)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Side Filters: Balance Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-col bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 min-w-[120px]">
                <span className="text-[7px] text-slate-400 font-bold uppercase">{isGu ? "બેલેન્સ પ્રકાર" : "Balance Type"}</span>
                <select
                  value={balTypeFilter}
                  onChange={(e) => {
                    setBalTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-700 cursor-pointer py-0 uppercase"
                >
                  <option value="all">{t('accountMaster.balanceAll') || 'CR / DR (All)'}</option>
                  <option value="credit">{t('accountMaster.jamaCr') || 'Credit'}</option>
                  <option value="debit">{t('accountMaster.udharDr') || 'Debit'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Full Width Table Registry */}
          <div className="overflow-x-auto w-full">
            {paginatedAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-center p-4">
                <Database size={32} className="text-slate-300 opacity-30" />
                <p className="text-sm font-bold text-slate-400">{t('accountMaster.noRecords')}</p>
                <button
                  onClick={handleCreateNew}
                  className="text-sm font-bold text-blue-600 hover:text-blue-800 transition uppercase tracking-wider cursor-pointer"
                >
                  + {t('accountMaster.addAccount')}
                </button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 border-collapse text-[12px]">
                <thead className="bg-slate-50 font-sans">
                  <tr>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-12">#</th>
                    {SHOW_CODE_COLUMN && (
                      <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-20">{isGu ? "કોડ" : "Code"}</th>
                    )}
                    <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('accountMaster.accountName')}</th>
                    <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('accountMaster.classification')}</th>
                    <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-36">{t('accountMaster.closingBalance')}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-24">{t('accountMaster.status')}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 w-28">{t('accountMaster.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {paginatedAccounts.map((acc, idx) => {
                    const globalIdx = startIndex + idx + 1;
                    const bal = parseFloat(acc.closing_balance) || 0;
                    return (
                      <tr
                        key={acc.id}
                        className="hover:bg-slate-50/75 transition-colors cursor-pointer select-none"
                        onClick={() => handleSelectAccount(acc)}
                      >
                        <td className="px-3.5 py-2 text-center font-mono text-slate-500 border-r border-slate-100">{fmtVal(globalIdx)}</td>
                        {SHOW_CODE_COLUMN && (
                          <td className="px-3.5 py-2 text-center font-mono font-bold text-[#1d5f84] border-r border-slate-100">{fmtVal(acc.account_code || acc.id)}</td>
                        )}
                        <td className="px-3.5 py-2 border-r border-slate-100 font-bold text-slate-800" style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}>
                          {displayAccountName(acc) || '—'}
                        </td>
                        <td className="px-3.5 py-2 border-r border-slate-100 text-slate-655 font-medium">
                          <div className="flex flex-col items-start gap-1">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-sm text-[12px] font-bold uppercase tracking-widest border border-slate-200/50">
                              {t(`accountMaster.types.${acc.account_type}`)}
                            </span>
                            {acc.is_subledger && (
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-sm text-[12px] font-bold uppercase tracking-wider">
                                {isGu ? "પેટા ખાતું" : "Sub Ledger"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3.5 py-2 text-right border-r border-slate-100" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-end">
                            <span className={`font-mono text-[12px] ${isGu ? 'font-black' : 'font-bold'} text-slate-800`}>₹{fmtAmount(bal)}</span>
                            <span className={`text-[12px] font-bold uppercase tracking-widest mt-0.5 ${acc.balance_type === 'credit' ? 'text-blue-600' : acc.balance_type === 'debit' ? 'text-rose-600' : 'text-slate-400'}`}>
                              {acc.balance_type === 'credit' ? t('accountMaster.jamaCr') : acc.balance_type === 'debit' ? t('accountMaster.udharDr') : t('accountMaster.zero')}
                            </span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2 text-center border-r border-slate-100" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleStatusToggle(acc)}
                            className={`px-2.5 py-0.5 text-[12px] font-bold rounded-md border transition cursor-pointer ${acc.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                              }`}
                          >
                            {acc.is_active ? t('accountMaster.active') : t('accountMaster.inactive')}
                          </button>
                        </td>
                        <td className="px-3.5 py-2 text-center flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSelectAccount(acc)}
                            className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 hover:text-[#1d5f84] transition cursor-pointer"
                            title={t('accountMaster.table.audit') || "Details"}
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => handleEdit(acc)}
                            className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 hover:text-[#1d5f84] transition cursor-pointer"
                            title={t('accountMaster.edit') || "Edit"}
                          >
                            <Edit2 size={12} />
                          </button>
                          {!acc.is_system ? (
                            <>
                              <button
                                onClick={() => handleStatusToggle(acc)}
                                className={`p-1 border border-slate-200 rounded hover:bg-slate-50 transition cursor-pointer ${acc.is_active ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                                title={acc.is_active ? t('accountMaster.deactivate') : t('accountMaster.activate')}
                              >
                                <Power size={12} />
                              </button>
                              <button
                                onClick={() => confirmDelete(acc)}
                                className="p-1 border border-rose-100 rounded text-rose-600 bg-rose-50 hover:bg-rose-150 transition cursor-pointer"
                                title={t('accountMaster.delete') || "Delete"}
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          ) : (
                            <div className="p-1 border border-transparent text-slate-350" title={t('accountMaster.table.systemProtected') || "System Protected"}>
                              <Shield size={12} />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Directory Pagination Panel */}
          {filteredAccounts.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                {startIndex + 1}-{endIndex} / {filteredAccounts.length}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 transition text-[10px] font-extrabold text-slate-600 disabled:cursor-not-allowed cursor-pointer animate-duration-100"
                >
                  Prev
                </button>
                <span className="text-sm font-bold text-slate-600 px-1.5">
                  {fmtVal(currentPage)} / {fmtVal(totalPages)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 transition text-[10px] font-extrabold text-slate-600 disabled:cursor-not-allowed cursor-pointer animate-duration-100"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-150" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto z-10 scale-100 bg-white rounded-lg shadow-2xl border border-slate-200">
            <AccountForm
              companyId={company?.id}
              initialData={editingAccount}
              onSuccess={handleFormSuccess}
              onCancel={() => { setShowModal(false); setEditingAccount(null); }}
              existingAccounts={accounts}
            />
          </div>
        </div>
      )}

      {/* Modal for Account Details Console (Similar to MemberMaster) */}
      {selectedAccount && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-150" onClick={() => handleSelectAccount(null)} />
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-lg p-5 shadow-xl z-10 flex flex-col animate-in fade-in zoom-in-95 duration-150">

            {/* Close Button */}
            <button
              onClick={() => handleSelectAccount(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 transition cursor-pointer bg-slate-50 rounded-md hover:bg-slate-100 border border-slate-200/50"
              title="Close details"
            >
              <X size={14} />
            </button>

            {/* Profile Header */}
            <div className="border-b border-slate-100 pb-4 mb-4 mt-2">
              <div className="flex items-center gap-3">
                {/* Large Profile bubble */}
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getAvatarGradient(displayAccountName(selectedAccount) || selectedAccount.account_name)} text-white flex items-center justify-center text-sm font-black shrink-0 uppercase border border-slate-300/35 relative font-mono`}>
                  {getInitials(selectedAccount)}
                </div>

                <div className="text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      className="font-extrabold text-slate-800 text-base leading-tight"
                      style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}
                    >
                      {displayAccountName(selectedAccount)}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md text-[12px] font-bold tracking-wider uppercase border bg-slate-50 border-slate-200 text-slate-655">
                      {t(`accountMaster.types.${selectedAccount.account_type}`)}
                    </span>
                  </div>
                  {!isGu && (
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono mt-0.5">
                      {selectedAccount.account_name}
                    </p>
                  )}
                </div>
              </div>

              {/* Identification Badges */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-600 rounded-md">
                  <span className="text-[12px] text-slate-400 uppercase">{isGu ? "ખાતા કોડ" : "Account Code"}:</span>
                  <span className="font-mono text-[#1d5f84]">{fmtVal(selectedAccount.account_code || selectedAccount.id)}</span>
                </span>
                {selectedAccount.p_code && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-600 rounded-md">
                    <span className="text-[12px] text-slate-400 uppercase">P-Code:</span>
                    <span className="font-mono text-[#1d5f84]">{selectedAccount.p_code}</span>
                  </span>
                )}
                {selectedAccount.is_subledger && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md">
                    <span className="text-[12px] uppercase">{isGu ? "પેટા ખાતું" : "Sub Ledger"}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Detail Tabs */}
            <div className="flex border-b border-slate-100 mb-4 w-full shrink-0">
              {[
                { id: 'general', label: isGu ? "સામાન્ય વિગત" : "General Info", icon: Info },
                { id: 'financials', label: isGu ? "હિસાબી સિલક" : "Financial Audit", icon: Wallet },
                { id: 'tax_contact', label: isGu ? "ટેક્સ અને સંપર્ક" : "Tax & Contact", icon: CreditCard }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-[12px] font-bold transition relative border-b-2 cursor-pointer ${activeDetailTab === tab.id
                    ? 'text-[#1d5f84] border-[#1d5f84]'
                    : 'text-slate-400 hover:text-slate-800 border-transparent'
                    }`}
                >
                  <tab.icon size={12} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Details Content Container */}
            <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-1.5">

              {activeDetailTab === 'general' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? "ખાતાનું ગુજરાતી નામ" : "English Name"}</p>
                    <p
                      className={`text-sm font-bold text-slate-800 ${isGu ? '' : 'uppercase font-mono'}`}
                      style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}
                    >
                      {displayAccountName(selectedAccount) || '-'}
                    </p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? "ખાતા નંબર / કોડ" : "Account Code"}</p>
                    <p className="text-sm font-bold text-[#1d5f84] font-mono">{fmtVal(selectedAccount.account_code || selectedAccount.id)}</p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">P-Code</p>
                    <p className="text-sm font-bold text-slate-800 font-mono">{selectedAccount.p_code || '-'}</p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? "ખાતા પ્રકાર" : "Account Type"}</p>
                    <p className="text-sm font-bold text-slate-800 uppercase">{t(`accountMaster.types.${selectedAccount.account_type}`)}</p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? "ઇન્ટરનલ આઈડી" : "Shard ID"}</p>
                    <p className="text-sm font-bold text-slate-500 font-mono">#{selectedAccount.id}</p>
                  </div>
                </div>
              )}

              {activeDetailTab === 'financials' && (
                <div className="space-y-3 text-left">
                  {auditLoading ? (
                    <div className="py-8 flex flex-col items-center gap-2 text-center text-slate-400">
                      <Loader className="w-6 h-6 text-[#1d5f84] animate-spin" />
                      <p className="text-[12px] font-bold tracking-widest uppercase">{t('accountMaster.aggregatingFiscal') || 'Aggregating...'}</p>
                    </div>
                  ) : auditData ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                        <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{t('accountMaster.openingBalance') || 'Opening Balance'}</p>
                        <p className="text-sm font-bold text-slate-700 font-mono">₹{fmtAmount(auditData.openingBalance || 0)}</p>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                        <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">Closing Registry Balance</p>
                        <p className="text-sm font-black text-slate-800 font-mono">₹{fmtAmount(selectedAccount.closing_balance || 0)}</p>
                      </div>

                      <div className="bg-rose-50/50 border border-rose-100 p-3 rounded-md">
                        <p className="text-[12px] uppercase font-bold text-rose-500 tracking-wider mb-0.5">{t('accountMaster.totalUdhar') || 'Total Debit (Udhar)'}</p>
                        <p className="text-sm font-bold text-rose-700 font-mono">₹{fmtAmount(auditData.totalDebit || 0)}</p>
                      </div>

                      <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-md">
                        <p className="text-[12px] uppercase font-bold text-blue-500 tracking-wider mb-0.5">{t('accountMaster.totalJama') || 'Total Credit (Jama)'}</p>
                        <p className="text-sm font-bold text-blue-700 font-mono">₹{fmtAmount(auditData.totalCredit || 0)}</p>
                      </div>

                      <div className="bg-slate-100 border border-slate-200 p-3 rounded-md sm:col-span-2">
                        <p className="text-[12px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">{t('accountMaster.synchronizedBalance') || 'Synchronized Current Balance'}</p>
                        <p className="text-sm font-bold text-[#1d5f84] font-mono">₹{fmtAmount(auditData.currentBalance || 0)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400">
                      <p className="text-sm font-semibold">{isGu ? "સિલક વિગત લાવવામાં નિષ્ફળ" : "No balance summary data available"}</p>
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === 'tax_contact' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md sm:col-span-2 flex items-center justify-between gap-4">
                    <div className="text-left">
                      <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? "મોબાઈલ નંબર" : "Phone"}</p>
                      <p className="text-sm font-bold text-slate-800 font-mono">{selectedAccount.phone ? fmtVal(selectedAccount.phone) : '-'}</p>
                    </div>
                    {selectedAccount.phone && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyToClipboard(selectedAccount.phone, `acc-phone-${selectedAccount.id}`);
                        }}
                        className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 transition text-slate-500 rounded-md cursor-pointer"
                        title="Copy Phone"
                      >
                        {copiedId === `acc-phone-${selectedAccount.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md sm:col-span-2 flex items-center justify-between gap-4">
                    <div className="text-left">
                      <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? "ઈમેલ આઈડી" : "Email"}</p>
                      <p className="text-sm font-bold text-slate-800 font-mono truncate max-w-sm">{selectedAccount.email || '-'}</p>
                    </div>
                    {selectedAccount.email && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyToClipboard(selectedAccount.email, `acc-email-${selectedAccount.id}`);
                        }}
                        className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 transition text-slate-500 rounded-md cursor-pointer"
                        title="Copy Email"
                      >
                        {copiedId === `acc-email-${selectedAccount.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      </button>
                    )}
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">GST No</p>
                    <p className="text-sm font-bold text-slate-800 font-mono uppercase">{selectedAccount.gst_no || '-'}</p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">TIN No</p>
                    <p className="text-sm font-bold text-slate-800 font-mono uppercase">{selectedAccount.tin_no || '-'}</p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? "પેટા ખાતું સ્થિતિ" : "Sub Ledger Status"}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md border ${selectedAccount.is_subledger
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                      {selectedAccount.is_subledger ? (isGu ? "સક્રિય" : "Enabled") : (isGu ? "નિષ્ક્રિય" : "Disabled")}
                    </span>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? "ખાતા સ્થિતિ" : "Account Status"}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md border ${selectedAccount.is_active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                      {selectedAccount.is_active ? t('accountMaster.active') : t('accountMaster.inactive')}
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer Controls */}
            <div className="bg-slate-50 -mx-5 -mb-5 mt-5 px-5 py-3 border-t border-slate-200 flex gap-2 justify-end rounded-b-lg">
              {!selectedAccount.is_system && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusToggle(selectedAccount);
                  }}
                  className={`px-3 py-1.5 text-sm font-bold rounded-md border transition cursor-pointer ${selectedAccount.is_active
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                >
                  <span>{selectedAccount.is_active ? t('accountMaster.deactivate') : t('accountMaster.activate')}</span>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(selectedAccount);
                  handleSelectAccount(null);
                }}
                className="px-3 py-1.5 flex items-center gap-1 border border-slate-200 bg-white rounded-md text-sm font-bold text-slate-650 hover:bg-slate-50 transition cursor-pointer"
                title="Edit Account"
              >
                <Edit2 size={12} />
                <span>{t('accountMaster.edit') || "Edit"}</span>
              </button>
              {!selectedAccount.is_system && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDelete(selectedAccount);
                  }}
                  className="px-3 py-1.5 flex items-center gap-1 border border-rose-100 bg-rose-50 rounded-md text-sm font-bold text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                  title="Delete Account"
                >
                  <Trash2 size={12} />
                  <span>{t('accountMaster.delete') || "Delete"}</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title={t('accountMaster.deleteTitle')}
        message={t('accountMaster.deleteConfirm', { name: accountToDelete ? displayAccountName(accountToDelete) : '' })}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
