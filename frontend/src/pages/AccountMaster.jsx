import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Plus, AlertCircle, Edit2, Trash2, CheckCircle,
  XCircle, Eye, X, Download, Database, Shield,
  Search, Filter, Users, Scale, TrendingUp,
  Activity, ArrowRight, Loader, FileText, IndianRupee,
  MoreVertical, Power, QrCode, Hash, Layers,
  RefreshCcw, Building2, Globe, Printer
} from 'lucide-react';
import AccountForm from '../components/AccountForm';
import Toast from '../components/Toast';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import Loading from '../components/Loading';
import api from '../api';

export default function AccountMaster() {
  const { t, i18n } = useTranslation();
  const [company, setCompany] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [balanceTypeFilter, setBalanceTypeFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);

  // Balance Modal state
  const [balanceModal, setBalanceModal] = useState({
    isOpen: false,
    account: null,
    data: null,
    loading: false,
    error: null
  });

  const accountTypes = [
    { value: 'all', label: t('accountMaster.types.all') },
    { value: 'customer', label: t('accountMaster.types.customer') },
    { value: 'vendor', label: t('accountMaster.types.vendor') },
    { value: 'supplier', label: t('accountMaster.types.supplier') },
    { value: 'bank', label: t('accountMaster.types.bank') },
    { value: 'cash', label: t('accountMaster.types.cash') },
    { value: 'assets', label: t('accountMaster.types.assets') },
    { value: 'liabilities', label: t('accountMaster.types.liabilities') },
    { value: 'capital', label: t('accountMaster.types.capital') },
    { value: 'revenue', label: t('accountMaster.types.revenue') },
    { value: 'expense', label: t('accountMaster.types.expense') },
    { value: 'purchase', label: t('accountMaster.types.purchase') },
    { value: 'sales', label: t('accountMaster.types.sales') }
  ];

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    if (company) {
      loadAccounts();
    }
  }, [company, selectedType]);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const response = await api.get('/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      } else {
        setMessage({ type: 'error', text: t('accountMaster.errors.noCompany') });
      }
    } catch (error) {
      console.error('Failed to load company', error);
      setMessage({ type: 'error', text: t('accountMaster.errors.failedLoadContext') });
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const url = selectedType === 'all'
        ? `/accounts/company/${company.id}`
        : `/accounts/company/${company.id}?type=${selectedType}`;

      const response = await api.get(url);
      if (response.data.success) {
        setAccounts(response.data.data || []);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || t('accountMaster.errors.failedLoadAccounts') });
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

  const handleStatusToggle = async (account) => {
    try {
      const endpoint = account.is_active ? 'deactivate' : 'activate';
      await api.post(`/accounts/${account.id}/${endpoint}`);
      setMessage({ type: 'success', text: t('accountMaster.messages.statusUpdatedSuccessfully') });
      loadAccounts();
    } catch (error) {
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
      loadAccounts();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || t('accountMaster.errors.deleteFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleShowBalance = async (account) => {
    setBalanceModal({ isOpen: true, account, data: null, loading: true, error: null });
    try {
      const response = await api.get(`/accounts/${account.id}/balance`);
      if (response.data.success) {
        setBalanceModal({ isOpen: true, account, data: response.data.data, loading: false, error: null });
      }
    } catch (error) {
      setBalanceModal({ isOpen: true, account, data: null, loading: false, error: t('accountMaster.errors.failedLoadBalance') });
    }
  };

  const filteredAccounts = (Array.isArray(accounts) ? accounts : []).filter(acc => {
    const matchesSearch = searchQuery === '' ||
      acc.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.account_name_gu && acc.account_name_gu.toLowerCase().includes(searchQuery.toLowerCase())) ||
      acc.account_code?.toString().includes(searchQuery) ||
      acc.id?.toString().includes(searchQuery);

    const matchesBalanceType = balanceTypeFilter === 'all' || acc.balance_type === balanceTypeFilter;
    return matchesSearch && matchesBalanceType;
  });

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

  const toGujaratiDigits = (value) => String(value ?? '').replace(/[0-9]/g, (d) => guDigits[d] || d);
  const toEnglishDigits = (value) => String(value ?? '').replace(/[૦-૯]/g, (d) => '0123456789'['૦૧૨૩૪૫૬૭૪૯'.indexOf(d)] || d);
  const toEnglishText = (value) => String(value ?? '').split('').map(char => guLetters[char] || char).join('');

  const handleExportPDF = async () => {
    setLoading(true);

    const cName = company ? (company.company_name || 'Company') : 'Company';
    const reportTitle = 'ખાતા માસ્ટર';
    const rows = filteredAccounts.length ? filteredAccounts : accounts;

    if (!rows.length) {
      setMessage({ type: 'error', text: t('accountMaster.noRecords') });
      return;
    }

    const totalDebit = rows.filter(a => a.balance_type === 'debit').reduce((s, a) => s + parseFloat(a.closing_balance || 0), 0);
    const totalCredit = rows.filter(a => a.balance_type === 'credit').reduce((s, a) => s + parseFloat(a.closing_balance || 0), 0);

    const tempWrap = document.createElement('div');
    tempWrap.style.position = 'fixed';
    tempWrap.style.left = '-10000px';
    tempWrap.style.top = '0';
    tempWrap.style.width = '1400px';
    tempWrap.style.background = '#fff';
    tempWrap.style.color = '#111827';
    tempWrap.style.fontFamily = '"NotoGujarati", "Noto Sans Gujarati", Arial, sans-serif';
    tempWrap.style.padding = '24px';

    const tableRows = rows.map((acc, idx) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${toGujaratiDigits(idx + 1)}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-family: 'Prompt', monospace;">${acc.account_name || ''}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${toGujaratiDigits(acc.account_code || acc.id || '')}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;">${t(`accountMaster.types.${acc.account_type}`) || acc.account_type || ''}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${acc.is_active ? 'સક્રિય' : 'નિષ્ક્રિય'}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:right;">${toGujaratiDigits(parseFloat(acc.closing_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${acc.balance_type === 'credit' ? 'જમા' : acc.balance_type === 'debit' ? 'ઉધાર' : 'શૂન્ય'}</td>
      </tr>
    `).join('');

    tempWrap.innerHTML = `
      <div style="border:1px solid #cbd5e1;">
        <div style="background:#2563eb;color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:18px;font-weight:700;">${cName}</div>
          <div style="font-size:12px;font-weight:700;">${reportTitle}</div>
        </div>
        <div style="padding:18px;">
          <div style="font-size:22px;font-weight:700;color:#1f2937;margin-bottom:6px;">${reportTitle}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:16px;">કુલ ખાતાઓ: ${toGujaratiDigits(rows.length)} | ફિલ્ટર: ${selectedType === 'all' ? 'બધા' : selectedType}</div>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px 10px;border:1px solid #d1d5db;">ક્રમ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">ખાતાનું નામ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">ખાતા કોડ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">હિસાબ પ્રકાર</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">સ્થિતિ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;text-align:right;">બંધ નાણું</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">ડીબીટ/જમા</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot>
              <tr style="background:#f3f4f6;font-weight:700;">
                <td colspan="5" style="padding:8px 10px;border:1px solid #d1d5db;text-align:right;">કુલ જોડ:</td>
                <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:right;">${toGujaratiDigits((totalDebit + totalCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</td>
                <td style="padding:8px 10px;border:1px solid #d1d5db;"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(tempWrap);

    await new Promise(resolve => setTimeout(resolve, 200));

    const canvas = await html2canvas(tempWrap, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      fontEmbedCSS: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&display=swap'
    });
    document.body.removeChild(tempWrap);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 24;
    const imgW = pageW - margin * 2;
    const pageHpx = ((pageH - margin * 2) * canvas.width) / imgW;

    let y = 0;
    let pageIndex = 0;
    while (y < canvas.height) {
      const sliceHeight = Math.min(pageHpx, canvas.height - y);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      const imgData = pageCanvas.toDataURL('image/png');
      const imgH = (sliceHeight * imgW) / canvas.width;

      if (pageIndex > 0) doc.addPage();
      doc.addImage(imgData, 'PNG', margin, margin, imgW, imgH);

      y += sliceHeight;
      pageIndex += 1;
    }

    doc.save(`Account_Master_${new Date().toISOString().split('T')[0]}.pdf`);
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
      `"${acc.account_name}"`,
      `"${toEnglishText(acc.account_code || acc.id)}"`,
      `"${t(`accountMaster.types.${acc.account_type}`)}"`,
      `"${acc.is_active ? t('accountMaster.active') : t('accountMaster.inactive')}"`,
      parseFloat(acc.closing_balance || 0).toFixed(2),
      `"${acc.balance_type === 'credit' ? t('accountMaster.jama') : acc.balance_type === 'debit' ? t('accountMaster.udhar') : t('accountMaster.zero')}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Accounts_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return <Loading />;
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6">
        <Building2 className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">{t('accountMaster.errors.noCompany')}</h2>
        <p className="text-slate-500 mb-6 text-center max-w-md">
          {t('accountMaster.errors.companyDescription')}
        </p>
        <div className="flex gap-4">
          <button onClick={() => window.location.reload()} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCcw className="w-4 h-4 mr-2" /> {t('accountMaster.errors.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none notranslate" translate="no">

      {/* Toast Notification */}
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
              <Database size={24} className="text-zinc-600" />
              {t('accountMaster.title')}
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">{t('accountMaster.managementAccounts')}</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
            >
              <Download size={14} /> {t('accountMaster.downloadCSV')}
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
            >
              <FileText size={14} /> {t('common.pdf')}
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm"
            >
              <Plus size={16} />
              {t('accountMaster.addAccount')}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">{t('accountMaster.totalAccounts')}</span>
            <span className="text-2xl font-bold font-sans text-zinc-800 mt-1">{accounts.length}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">{t('accountMaster.activeLedger')}</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{accounts.filter(a => a.is_active).length}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">{t('accountMaster.assetNodes')}</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{accounts.filter(a => a.account_type === 'assets').length}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">{t('accountMaster.revenueStreams')}</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{accounts.filter(a => a.account_type === 'revenue').length}</span>
          </div>
        </div>

        {/* Dense Minimal Classic Account Registry Table */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                {t('accountMaster.listTitle')}
              </span>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5">
                {filteredAccounts.length} {t('accountMaster.records')}
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
                <Search size={16} className="text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('accountMaster.searchPlaceholder')}
                  translate="no"
                  className={`bg-transparent border-none outline-none text-xs text-zinc-800 placeholder:text-zinc-400 w-full md:w-48 ${i18n.language === 'gu' ? 'font-prompt' : 'font-sans'}`}
                />
              </div>

              <div className="flex items-center p-0.5 bg-zinc-200 border border-zinc-300">
                {accountTypes.slice(0, 5).map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase transition select-none ${selectedType === type.value ? 'bg-white text-zinc-800 font-mono font-bold border border-zinc-300' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    {t(`accountMaster.types.${type.value}`)}
                  </button>
                ))}
                <select
                  className="bg-transparent border-none outline-none text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 cursor-pointer"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="all">{t('accountMaster.moreTypes')}</option>
                  {accountTypes.slice(5).map(type => (
                    <option key={type.value} value={type.value}>{t(`accountMaster.types.${type.value}`)}</option>
                  ))}
                </select>
              </div>

              <select
                value={balanceTypeFilter}
                onChange={(e) => setBalanceTypeFilter(e.target.value)}
                className="bg-white border border-zinc-300 outline-none text-[10px] font-bold text-zinc-600 px-3 py-1.5 cursor-pointer uppercase tracking-widest"
              >
                <option value="all">{t('accountMaster.balanceAll')}</option>
                <option value="credit">{t('accountMaster.jamaCr')}</option>
                <option value="debit">{t('accountMaster.udharDr')}</option>
              </select>

              <button
                onClick={loadAccounts}
                className="p-1.5 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm"
                title={t('accountMaster.refreshRegistry')}
              >
                <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-white">
            {loading && accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                <Loader className="animate-spin text-zinc-500" size={24} />
                <p className="text-xs font-mono">{t('accountMaster.loadingData')}</p>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500">
                <FileText size={32} className="text-zinc-400" />
                <p className="text-xs font-mono">{t('accountMaster.noRecords')}</p>
                <button
                  onClick={handleCreateNew}
                  className="text-white border border-blue-600 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold mt-2 transition select-none"
                >
                  {t('accountMaster.initializeFirst')}
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse select-none">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">
                    <th className="px-4 py-2 border-r border-zinc-200">{t('accountMaster.accountName')}</th>
                    <th className="px-4 py-2 border-r border-zinc-200 w-28">{t('accountMaster.identity')}</th>
                    <th className="px-4 py-2 border-r border-zinc-200">{t('accountMaster.classification')}</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">{t('accountMaster.closingBalance')}</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-center w-24">{t('accountMaster.status')}</th>
                    <th className="px-4 py-2 text-center w-28">{t('accountMaster.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td 
                          className={`px-4 py-2 border-r border-zinc-200 font-bold tracking-tight text-zinc-800 ${i18n.language === 'gu' ? 'font-prompt text-base' : 'text-sm'}`}
                          translate="no"
                        >
                          {i18n.language === 'en' ? (acc.account_name || acc.account_name_gu) : (acc.account_name_gu || acc.account_name)}
                        </td>
                      <td className="px-4 py-2 border-r border-zinc-200">
                        <div className="flex flex-col leading-tight">
                          <span
                            className="inline-flex bg-zinc-100 text-zinc-800 border border-zinc-300 font-bold text-[9px] px-1.5 py-0.5 w-fit dynamic-en"
                            style={{ '--en-text': `"${acc.account_code || acc.id || ''}"` }}
                            translate="no"
                          ></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200">
                        <div className="flex flex-col items-start gap-1">
                          <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-300 text-zinc-700 text-[9px] font-bold uppercase tracking-wider">
                            {t(`accountMaster.types.${acc.account_type}`)}
                          </span>
                          {acc.is_subledger && (
                            <span className="px-1.5 py-0.5 bg-zinc-50 text-zinc-600 border border-zinc-200 text-[8px] font-bold uppercase">
                              {t('accountMaster.subLedger')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-right font-bold text-zinc-800">
                        <div className="flex flex-col items-end">
                          <span>₹{(parseFloat(acc.closing_balance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          <span className={`text-[9px] font-bold uppercase mt-0.5 ${acc.balance_type === 'credit' ? 'text-blue-600' : acc.balance_type === 'debit' ? 'text-red-600' : 'text-zinc-400'}`}>
                            {acc.balance_type === 'credit' ? t('accountMaster.jamaCr') : acc.balance_type === 'debit' ? t('accountMaster.udharDr') : t('accountMaster.zero')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold border ${acc.is_active ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                          {acc.is_active ? t('accountMaster.active') : t('accountMaster.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleShowBalance(acc)}
                            className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm"
                            title={t('accountMaster.table.audit')}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleEdit(acc)}
                            className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm"
                            title={t('accountMaster.edit')}
                          >
                            <Edit2 size={13} />
                          </button>
                          {!acc.is_system && (
                            <>
                              <button
                                onClick={() => handleStatusToggle(acc)}
                                className={`p-1 border border-zinc-300 bg-zinc-50 transition shadow-sm ${acc.is_active ? 'text-red-600 hover:bg-red-50 hover:border-red-300' : 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'}`}
                                title={acc.is_active ? t('accountMaster.deactivate') : t('accountMaster.activate')}
                              >
                                <Power size={13} />
                              </button>
                              <button
                                onClick={() => confirmDelete(acc)}
                                className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-red-50 hover:border-red-300 text-zinc-600 hover:text-red-700 transition shadow-sm"
                                title={t('accountMaster.delete')}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                          {acc.is_system && (
                            <div className="p-1 bg-zinc-100 border border-zinc-200 text-zinc-400 cursor-not-allowed" title={t('accountMaster.table.systemProtected')}>
                              <Shield size={13} />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Account Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-none" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto bg-white rounded-none border border-zinc-400 shadow-xl">
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

      {/* Ledger Audit Balance Modal */}
      {balanceModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-none" onClick={() => setBalanceModal({ isOpen: false, account: null, data: null, loading: false })} />
          <div className="relative w-full max-w-md bg-white rounded-none border border-zinc-400 shadow-xl overflow-hidden flex flex-col font-mono text-xs select-none">
            <div className="p-4 border-b border-zinc-300 bg-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-zinc-600" />
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest leading-none">{t('accountMaster.ledgerAudit')}</h3>
              </div>
              <button onClick={() => setBalanceModal({ isOpen: false, account: null, data: null, loading: false })} className="p-1 text-zinc-400 hover:text-red-600 transition"><X size={18} /></button>
            </div>

            <div className="p-4 bg-white space-y-4">
              <div className="bg-zinc-50 p-3 border border-zinc-300">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">{t('accountMaster.entityName')}</p>
                <p className="text-sm font-bold text-zinc-800 font-sans uppercase tracking-tight italic">{balanceModal.account?.account_name}</p>
              </div>

              {balanceModal.loading ? (
                <div className="py-8 flex flex-col items-center gap-2 text-center text-zinc-400">
                  <RefreshCcw className="w-8 h-8 text-zinc-500 animate-spin" />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('accountMaster.aggregatingFiscal')}</p>
                </div>
              ) : balanceModal.data ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white border border-zinc-300">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">{t('accountMaster.openingBalance')}</span>
                    <span className="font-bold text-zinc-700">₹{Number(balanceModal.data.openingBalance || 0).toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-50 border border-zinc-300">
                      <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-0.5">{t('accountMaster.totalUdhar')}</p>
                      <p className="text-base font-bold text-red-600">₹{Number(balanceModal.data.totalDebit || 0).toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-zinc-50 border border-zinc-300">
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-0.5">{t('accountMaster.totalJama')}</p>
                      <p className="text-base font-bold text-blue-600">₹{Number(balanceModal.data.totalCredit || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-100 border border-zinc-300 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('accountMaster.synchronizedBalance')}</span>
                    <span className="text-2xl font-bold text-zinc-800 italic">
                      ₹{Number(balanceModal.data.currentBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex justify-end">
              <button
                onClick={() => setBalanceModal({ isOpen: false, account: null, data: null, loading: false })}
                className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold uppercase transition rounded-none text-xs"
              >
                {t('accountMaster.closeAudit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title={t('accountMaster.deleteTitle')}
        message={t('accountMaster.deleteConfirm', { name: accountToDelete?.account_name || '' })}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
