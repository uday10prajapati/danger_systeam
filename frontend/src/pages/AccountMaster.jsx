import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const { t } = useTranslation();
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
    { value: 'all', label: 'All Accounts' },
    { value: 'customer', label: 'Customers' },
    { value: 'vendor', label: 'Vendors' },
    { value: 'supplier', label: 'Suppliers' },
    { value: 'bank', label: 'Banks' },
    { value: 'cash', label: 'Cash' },
    { value: 'assets', label: 'Assets' },
    { value: 'liabilities', label: 'Liabilities' },
    { value: 'capital', label: 'Capital' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'expense', label: 'Expense' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'sales', label: 'Sales' }
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
        setMessage({ type: 'error', text: 'No company found. Please create a company in Company Master.' });
      }
    } catch (error) {
      console.error('Failed to load company', error);
      setMessage({ type: 'error', text: 'Failed to load company context. Please check if backend is running.' });
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
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to load accounts.' });
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
    setMessage({ type: 'success', text: msg || 'Account saved successfully.' });
  };

  const handleStatusToggle = async (account) => {
    try {
      const endpoint = account.is_active ? 'deactivate' : 'activate';
      await api.post(`/accounts/${account.id}/${endpoint}`);
      setMessage({ type: 'success', text: `Account ${account.is_active ? 'deactivated' : 'activated'} successfully.` });
      loadAccounts();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update account status.' });
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
      setMessage({ type: 'success', text: 'Account deleted successfully.' });
      setDeleteModalOpen(false);
      setAccountToDelete(null);
      loadAccounts();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Delete failed.' });
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
      setBalanceModal({ isOpen: true, account, data: null, loading: false, error: 'Failed to load balance.' });
    }
  };

  const filteredAccounts = (Array.isArray(accounts) ? accounts : []).filter(acc => {
    const matchesSearch = searchQuery === '' || 
      acc.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.account_code?.toString().includes(searchQuery) ||
      acc.id?.toString().includes(searchQuery);
    
    const matchesBalanceType = balanceTypeFilter === 'all' || acc.balance_type === balanceTypeFilter;
    return matchesSearch && matchesBalanceType;
  });

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
    const cName = company ? (company.company_name || 'Company') : 'Company';
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    await addGujaratiFont(doc);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 32;
    const navy = [37, 99, 235], white = [255, 255, 255], gray = [100, 116, 139];
    const dark = [30, 41, 59], stripe = [241, 245, 249];

    const hdr = () => {
      doc.setFillColor(...navy); doc.rect(0, 0, W, 26, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
      doc.text(cName.toUpperCase(), M, 17);
      doc.setFontSize(7); doc.setTextColor(148, 163, 184);
      doc.text('ACCOUNT MASTER REGISTRY', W / 2, 17, { align: 'center' });
      doc.setFontSize(7); doc.setTextColor(239, 68, 68);
      doc.text('CONFIDENTIAL', W - M, 17, { align: 'right' });
    };

    const ftr = (pg, tot) => {
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4);
      doc.line(M, H - 18, W - M, H - 18);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text(cName + ' - Account Master', M, H - 9);
      doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' });
      doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' });
    };

    hdr();
    let y = 40;
    doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(14); doc.setTextColor(...navy);

    y += 15;
    
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...navy);
    doc.text('Account Master Registry', M, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gray);
    doc.text('Type: ' + (selectedType === 'all' ? 'All Accounts' : selectedType.toUpperCase()) +
      '   |   Generated: ' + new Date().toLocaleString('en-IN'), M, y + 13);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
    y += 28;

    const bodyRows = filteredAccounts.map(acc => [
      acc.account_name || '-',
      acc.account_code || String(acc.id),
      acc.p_code || '-',
      acc.account_type || '-',
      acc.is_active ? 'Active' : 'Inactive',
      parseFloat(acc.closing_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      acc.balance_type === 'credit' ? 'Jama (Cr)' : acc.balance_type === 'debit' ? 'Udhar (Dr)' : 'Zero'
    ]);

    const totalDebit = filteredAccounts.filter(a => a.balance_type === 'debit').reduce((s, a) => s + parseFloat(a.closing_balance || 0), 0);
    const totalCredit = filteredAccounts.filter(a => a.balance_type === 'credit').reduce((s, a) => s + parseFloat(a.closing_balance || 0), 0);

    autoTable(doc, {
      startY: y,
      head: [['Account Name', 'Code', 'P-Code', 'Type', 'Status', 'Closing Balance', 'Balance Type']],
      body: bodyRows,
      foot: [['', '', '', '', 'TOTALS', (totalDebit + totalCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 }), '']],
      styles: { font: 'NotoGujarati', fontSize: 7.5, cellPadding: [4, 5], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
      headStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'bold' },
      footStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: stripe },
      theme: 'grid',
      margin: { left: M, right: M },
      columnStyles: {
        5: { halign: 'right' },
        6: { halign: 'center' }
      },
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i = 1; i <= tot; i++) { doc.setPage(i); ftr(i, tot); }
    doc.save('Account_Master_' + new Date().toISOString().split('T')[0] + '.pdf');
  };

  const handleDownloadCSV = () => {
    const headers = ['Account Name', 'Code', 'P-Code', 'Type', 'Status', 'Closing Balance', 'Balance Type'];
    const rows = filteredAccounts.map(acc => [
      `"${acc.account_name}"`,
      `"${acc.account_code || acc.id}"`,
      `"${acc.p_code || ''}"`,
      `"${acc.account_type}"`,
      `"${acc.is_active ? 'Active' : 'Inactive'}"`,
      parseFloat(acc.closing_balance || 0).toFixed(2),
      acc.balance_type
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
        <h2 className="text-xl font-bold text-slate-800 mb-2">Company Context Missing</h2>
        <p className="text-slate-500 mb-6 text-center max-w-md">
          We couldn't load the company information. This usually happens if no company has been created yet or the connection to the server was lost.
        </p>
        <div className="flex gap-4">
          <button onClick={() => window.location.reload()} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCcw className="w-4 h-4 mr-2" /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none">
      
      {/* Toast Notification */}
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
              <Database size={20} className="text-zinc-600" />
              Account Registry Master
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">Management / Accounts</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
            >
              <FileText size={14} /> PDF
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm"
            >
              <Plus size={16} />
              ADD ACCOUNT
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Accounts</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{accounts.length}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Active Ledger</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{accounts.filter(a => a.is_active).length}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Asset Nodes</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{accounts.filter(a => a.account_type === 'assets').length}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Revenue Streams</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{accounts.filter(a => a.account_type === 'revenue').length}</span>
          </div>
        </div>

        {/* Dense Minimal Classic Account Registry Table */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Account List
              </span>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5">
                {filteredAccounts.length} RECORDS
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
                <Search size={16} className="text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search accounts..."
                  className="bg-transparent border-none outline-none text-xs text-zinc-800 placeholder:text-zinc-400 w-full md:w-48 font-mono"
                />
              </div>

              <div className="flex items-center p-0.5 bg-zinc-200 border border-zinc-300">
                {accountTypes.slice(0, 5).map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase transition select-none ${selectedType === type.value ? 'bg-white text-zinc-800 font-mono font-bold border border-zinc-300' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    {type.label}
                  </button>
                ))}
                <select 
                  className="bg-transparent border-none outline-none text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 cursor-pointer"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="all">MORE TYPES...</option>
                  {accountTypes.slice(5).map(type => (
                    <option key={type.value} value={type.value}>{type.label.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <select
                value={balanceTypeFilter}
                onChange={(e) => setBalanceTypeFilter(e.target.value)}
                className="bg-white border border-zinc-300 outline-none text-[10px] font-bold text-zinc-600 px-3 py-1.5 cursor-pointer uppercase tracking-widest"
              >
                <option value="all">BALANCE (ALL)</option>
                <option value="credit">JAMA (CR)</option>
                <option value="debit">UDHAR (DR)</option>
              </select>

              <button
                onClick={loadAccounts}
                className="p-1.5 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm"
                title="Refresh Registry"
              >
                <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-white">
            {loading && accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                <Loader className="animate-spin text-zinc-500" size={24} />
                <p className="text-xs font-mono">LOADING REGISTRY DATA...</p>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500">
                <FileText size={32} className="text-zinc-400" />
                <p className="text-xs font-mono">NO ACCOUNT RECORDS FOUND</p>
                <button 
                  onClick={handleCreateNew} 
                  className="text-white border border-blue-600 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold mt-2 transition select-none"
                >
                  INITIALIZE FIRST ACCOUNT
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse font-mono text-xs select-none">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">
                    <th className="px-4 py-2 border-r border-zinc-200">Account Name</th>
                    <th className="px-4 py-2 border-r border-zinc-200 w-28">Identity</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Classification</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">Closing Balance</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-center w-24">Status</th>
                    <th className="px-4 py-2 text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-2 border-r border-zinc-200 font-sans font-bold tracking-tight text-zinc-800 uppercase italic">
                        {acc.account_name}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200">
                        <div className="flex flex-col leading-tight">
                          {acc.p_code ? (
                            <span className="inline-flex bg-zinc-100 text-zinc-800 border border-zinc-300 font-bold text-[9px] px-1.5 py-0.5 w-fit">
                              {acc.p_code}
                            </span>
                          ) : (
                            <span className="inline-flex bg-zinc-100 text-zinc-700 font-bold text-[9px] px-1.5 py-0.5 border border-zinc-300 w-fit">
                              {acc.account_code || acc.id}
                            </span>
                          )}
                          {acc.p_code && <span className="text-[9px] text-zinc-400 mt-0.5">#{acc.account_code || acc.id}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200">
                        <div className="flex flex-col items-start gap-1">
                          <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-300 text-zinc-700 text-[9px] font-bold uppercase tracking-wider">
                            {acc.account_type}
                          </span>
                          {acc.is_subledger && (
                            <span className="px-1.5 py-0.5 bg-zinc-50 text-zinc-600 border border-zinc-200 text-[8px] font-bold uppercase">
                              Sub-Ledger
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-right font-bold text-zinc-800">
                        <div className="flex flex-col items-end">
                          <span>₹{(parseFloat(acc.closing_balance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          <span className={`text-[9px] font-bold uppercase mt-0.5 ${acc.balance_type === 'credit' ? 'text-blue-600' : acc.balance_type === 'debit' ? 'text-red-600' : 'text-zinc-400'}`}>
                            {acc.balance_type === 'credit' ? 'JAMA (CR)' : acc.balance_type === 'debit' ? 'UDHAR (DR)' : 'ZERO'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold border ${acc.is_active ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                          {acc.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handleShowBalance(acc)} 
                            className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm" 
                            title="Ledger Audit"
                          >
                            <Eye size={13} />
                          </button>
                          {!acc.is_system && (
                            <>
                              <button
                                onClick={() => handleEdit(acc)}
                                className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm"
                                title="Edit"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleStatusToggle(acc)}
                                className={`p-1 border border-zinc-300 bg-zinc-50 transition shadow-sm ${acc.is_active ? 'text-red-600 hover:bg-red-50 hover:border-red-300' : 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'}`}
                                title={acc.is_active ? 'Deactivate' : 'Activate'}
                              >
                                <Power size={13} />
                              </button>
                              <button
                                onClick={() => confirmDelete(acc)}
                                className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-red-50 hover:border-red-300 text-zinc-600 hover:text-red-700 transition shadow-sm"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                          {acc.is_system && (
                            <div className="p-1 bg-zinc-100 border border-zinc-200 text-zinc-400 cursor-not-allowed" title="System Protected">
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
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest leading-none">LEDGER AUDIT</h3>
              </div>
              <button onClick={() => setBalanceModal({ isOpen: false, account: null, data: null, loading: false })} className="p-1 text-zinc-400 hover:text-red-600 transition"><X size={18} /></button>
            </div>

            <div className="p-4 bg-white space-y-4">
              <div className="bg-zinc-50 p-3 border border-zinc-300">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Entity Name</p>
                <p className="text-sm font-bold text-zinc-800 font-sans uppercase tracking-tight italic">{balanceModal.account?.account_name}</p>
              </div>

              {balanceModal.loading ? (
                <div className="py-8 flex flex-col items-center gap-2 text-center text-zinc-400">
                  <RefreshCcw className="w-8 h-8 text-zinc-500 animate-spin" />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Aggregating Fiscal Context...</p>
                </div>
              ) : balanceModal.data ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white border border-zinc-300">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Opening Balance</span>
                    <span className="font-bold text-zinc-700">₹{balanceModal.data.openingBalance.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-50 border border-zinc-300">
                      <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-0.5">Total Udhar (Dr)</p>
                      <p className="text-base font-bold text-red-600">₹{balanceModal.data.totalDebit.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-zinc-50 border border-zinc-300">
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-0.5">Total Jama (Cr)</p>
                      <p className="text-base font-bold text-blue-600">₹{balanceModal.data.totalCredit.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-100 border border-zinc-300 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Synchronized Balance</span>
                    <span className="text-2xl font-bold text-zinc-800 italic">
                      ₹{balanceModal.data.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="DELETE ACCOUNT RECORD"
        message={`ARE YOU SURE YOU WANT TO DELETE THE ACCOUNT "${accountToDelete?.account_name?.toUpperCase() || ''}"? THIS ACTION CANNOT BE UNDONE.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
