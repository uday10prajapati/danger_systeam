import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  Plus, AlertCircle, Edit2, Trash2, CheckCircle,
  XCircle, Eye, X, Download, Database, Shield,
  Search, Filter, Users, Scale, TrendingUp,
  Activity, ArrowRight, Loader, FileText, IndianRupee,
  MoreVertical, Power, QrCode, Hash, Layers
} from 'lucide-react';
import AccountForm from '../components/AccountForm';
import { useNavigate } from 'react-router-dom';

export default function AccountMaster() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [balanceTypeFilter, setBalanceTypeFilter] = useState('all'); // all, credit, debit, zero
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');

  // Balance Modal state
  const [balanceModal, setBalanceModal] = useState({
    isOpen: false,
    account: null,
    data: null,
    loading: false,
    error: null
  });

  const accountTypes = [
    { value: 'all', label: t('accountMaster.allTypes') },
    { value: 'customer', label: t('accountMaster.customer') },
    { value: 'vendor', label: t('accountMaster.vendor', 'Vendor') },
    { value: 'supplier', label: t('accountMaster.supplier') },
    { value: 'bank', label: t('accountMaster.bank') },
    { value: 'cash', label: t('accountMaster.cash') },
    { value: 'assets', label: t('accountMaster.assets') },
    { value: 'liabilities', label: t('accountMaster.liabilities') },
    { value: 'capital', label: t('accountMaster.capital') },
    { value: ' revenue', label: t('accountMaster.revenue') },
    { value: 'expense', label: t('accountMaster.expense') },
    { value: 'purchase', label: t('accountMaster.purchase', 'Purchase') },
    { value: 'sales', label: t('accountMaster.sales', 'Sales') }
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
      const response = await axios.get('/api/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('accountMaster.failedToLoadCompany') });
    }
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const url = selectedType === 'all'
        ? `/api/accounts/company/${company.id}`
        : `/api/accounts/company/${company.id}?type=${selectedType}`;

      const response = await axios.get(url);
      if (response.data.success) {
        setAccounts(response.data.data || []);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || t('accountMaster.failedToLoadAccounts') });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleCreateNew = () => {
    setEditingAccount(null);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAccount(null);
    loadAccounts();
    setMessage({ type: 'success', text: t('accountMaster.accountSaved') });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleStatusToggle = async (account) => {
    try {
      const endpoint = account.is_active ? 'deactivate' : 'activate';
      await axios.post(`/api/accounts/${account.id}/${endpoint}`);
      setMessage({ type: 'success', text: t(`accountMaster.account${account.is_active ? 'Deactivated' : 'Activated'}`) });
      loadAccounts();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: t('accountMaster.failedToUpdateStatus') });
    }
  };

  const handleShowBalance = async (account) => {
    setBalanceModal({ isOpen: true, account, data: null, loading: true, error: null });
    try {
      const response = await axios.get(`/api/accounts/${account.id}/balance`);
      if (response.data.success) {
        setBalanceModal({ isOpen: true, account, data: response.data.data, loading: false, error: null });
      }
    } catch (error) {
      setBalanceModal({ isOpen: true, account, data: null, loading: false, error: t('accountMaster.failedToLoadAccounts') });
    }
  };

  const filteredAccounts = (Array.isArray(accounts) ? accounts : []).filter(acc => {
    const matchesCode = searchCode === '' ||
      acc.account_code?.toString().includes(searchCode) ||
      acc.id?.toString().includes(searchCode);
    const matchesName = searchName === '' || acc.account_name.toLowerCase().includes(searchName.toLowerCase());
    const matchesBalanceType = balanceTypeFilter === 'all' || acc.balance_type === balanceTypeFilter;
    return matchesCode && matchesName && matchesBalanceType;
  });

  const handleDownloadCSV = () => {
    const headers = [t('accountMaster.accountName'), t('accountMaster.type'), t('accountMaster.status'), t('accountMaster.closingBalance'), 'Balance Type'];
    const rows = filteredAccounts.map(acc => [
      `"${acc.account_name}"`,
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

  if (!company && !loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="bg-white rounded-lg border border-slate-100 shadow-xl p-12 text-center max-w-md animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center mx-auto mb-6"><AlertCircle size={40} /></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('accountMaster.noCompanyFound', 'System Lock')}</h2>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">Financial identity registry is offline. Please initialize company profile context first.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/company')} className="w-full py-4 bg-blue-600 text-white font-bold rounded-lg shadow-lg transition-all active:scale-95">Go to Company Setup</button>
            <button onClick={loadCompany} className="w-full py-4 bg-slate-50 text-slate-600 font-bold rounded-lg hover:bg-slate-100 transition-all">Retry Synchronization</button>
          </div>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => { setShowForm(false); setEditingAccount(null); }}
            className="group mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-800 font-bold text-sm transition-colors"
          >
            <div className="p-2 bg-white rounded-lg border border-slate-200 group-hover:border-slate-800 transition-all"><X size={16} /></div>
            Back to Registry List
          </button>
          <AccountForm
            companyId={company.id}
            initialData={editingAccount}
            onSuccess={handleFormSuccess}
            onCancel={() => { setShowForm(false); setEditingAccount(null); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-6">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
              <Shield size={12} />
              <span>{t('modules.management', 'Management')} / Account Master</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Ledger Repository</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
                <Hash size={16} className="text-slate-300 group-focus-within:text-blue-500" />
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="ID"
                  className="bg-transparent border-none outline-none text-xs text-slate-600 w-16 placeholder:text-slate-300 font-bold font-mono"
                />
              </div>
              <div className="flex items-center gap-3 bg-white rounded-lg px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
                <Search size={18} className="text-slate-400 group-focus-within:text-blue-500" />
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Search nomenclature name..."
                  className="bg-transparent border-none outline-none text-sm text-slate-600 w-64 placeholder:text-slate-300 font-medium italic"
                />
              </div>
            </div>
            <button
              onClick={handleDownloadCSV}
              className="hidden lg:flex items-center gap-2 bg-white px-6 py-3.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 transition-all active:scale-95 shadow-sm"
            >
              <Download size={18} />
              Export
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 bg-blue-600 px-6 py-3.5 rounded-lg text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
            >
              <Plus size={20} />
              Initialize Ledger
            </button>
          </div>
        </div>

        {/* Global Messages */}
        {message && (
          <div className={`mb-8 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top duration-300 ${message.type === 'error' ? 'bg-rose-50 border border-rose-100 text-rose-700' : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
            }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <p className="text-sm font-bold">{message.text}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Accounts</p>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Users size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{accounts.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm group hover:border-emerald-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Online Nodes</p>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Activity size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{accounts.filter(a => a.is_active).length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm group hover:border-violet-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fiscal Assets</p>
              <div className="p-2 bg-violet-50 rounded-lg text-violet-600"><Scale size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{accounts.filter(a => a.account_type === 'assets').length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm group hover:border-amber-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenue Streams</p>
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600"><TrendingUp size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{accounts.filter(a => a.account_type === 'revenue').length}</p>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Database size={18} /></div>
              <h2 className="text-lg font-bold text-slate-800">Operational Registry</h2>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-1 rounded-lg">
              {accountTypes.slice(0, 4).map(type => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`px-5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${selectedType === type.value ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {type.label}
                </button>
              ))}
              <div className="w-px h-4 bg-slate-200 ml-2 mr-2"></div>
              <select
                value={balanceTypeFilter}
                onChange={(e) => setBalanceTypeFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-400 px-3 cursor-pointer uppercase tracking-widest"
              >
                <option value="all">Balance (All)</option>
                <option value="credit">Credit (Jama)</option>
                <option value="debit">Debit (Udhar)</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-24">
              <Loader className="w-12 h-12 text-blue-100 animate-spin mb-4" />
              <p className="text-slate-300 font-bold uppercase tracking-[0.2em] text-[10px]">Synchronizing Financial Shards...</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-24 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-lg flex items-center justify-center text-slate-200 mb-6"><FileText size={40} /></div>
              <h3 className="text-lg font-bold text-slate-400 mb-2">No matched accounts found</h3>
              <p className="text-slate-300 text-sm max-w-xs mx-auto mb-8 font-medium">Try adjusting your filters or initialize a new financial entity.</p>
              <button onClick={handleCreateNew} className="px-8 py-3.5 bg-slate-900 text-white rounded-lg font-bold text-sm shadow-xl hover:bg-black transition-all">Initialize First Ledger</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC]">
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Entity Nomenclature</th>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Classification</th>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Closing Balance</th>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Status</th>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAccounts.map(acc => (
                    <tr key={acc.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-lg transition-transform group-hover:scale-110 ${['customer', 'supplier'].includes(acc.account_type) ? 'bg-gradient-to-br from-indigo-500 to-blue-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                            }`}>
                            {acc.account_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors uppercase leading-none">{acc.account_name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                <Hash size={9} /> {acc.account_code} | ID #{acc.id}
                              </span>
                              <p className="text-[10px] font-medium text-slate-400 leading-none">{acc.email || 'NO_DIGITAL_HANDLE'}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex flex-col gap-1.5">
                          <span className={`inline-flex px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${['revenue', 'sales', 'customer'].includes(acc.account_type) ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                            {acc.account_type}
                          </span>
                          {acc.is_subledger ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-100 rounded-md text-[8px] font-black uppercase tracking-widest">
                              <Layers size={8} /> Sub-Ledger
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800 flex items-center gap-1 leading-none italic">
                            <IndianRupee size={12} className="text-slate-400" />
                            {(parseFloat(acc.closing_balance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest mt-1.5 ${acc.balance_type === 'credit' ? 'text-blue-600' : 'text-rose-600'}`}>
                            {acc.balance_type === 'credit' ? 'Jama (Cr)' : 'Udhar (Dr)'}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${acc.is_active ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${acc.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            {acc.is_active ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                          <button onClick={() => handleShowBalance(acc)} className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-lg rounded-lg transition-all"><Eye size={16} /></button>
                          {!acc.is_system && (
                            <>
                              <button onClick={() => handleEdit(acc)} className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-lg rounded-lg transition-all"><Edit2 size={16} /></button>
                              <button onClick={() => handleStatusToggle(acc)} className={`p-2.5 bg-white border border-slate-100 rounded-lg transition-all ${acc.is_active ? 'text-slate-400 hover:text-rose-600 hover:border-rose-100' : 'text-emerald-500 hover:border-emerald-100'}`}><Power size={16} /></button>
                            </>
                          )}
                          {acc.is_system && (
                            <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-300 rounded-lg cursor-not-allowed" title="System Protected Node">
                              <Shield size={16} />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Balance Modal - Airy SaaS Style */}
      {balanceModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-lg shadow-lg ring-4 ring-blue-500/5"><Eye size={20} /></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Financial Insights</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Balance Audit</p>
                </div>
              </div>
              <button onClick={() => setBalanceModal({ isOpen: false, account: null, data: null, loading: false })} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
            </div>

            <div className="p-10 space-y-8">
              <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entity Nomenclature</p>
                <p className="text-xl font-black text-slate-800 uppercase tracking-tight italic">{balanceModal.account?.account_name}</p>
              </div>

              {balanceModal.loading ? (
                <div className="py-12 flex flex-col items-center gap-4">
                  <Loader className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Aggregating Fiscal Data...</p>
                </div>
              ) : balanceModal.data ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-lg">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opening Context</span>
                    <span className="font-mono font-bold text-slate-700">₹{balanceModal.data.openingBalance.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-rose-50/30 border border-rose-100 rounded-lg">
                      <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1 italic">Total Udhar</p>
                      <p className="text-lg font-black text-rose-600">₹{balanceModal.data.totalDebit.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-lg">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 italic">Total Jama</p>
                      <p className="text-lg font-black text-emerald-600">₹{balanceModal.data.totalCredit.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-900 rounded-lg shadow-xl shadow-slate-200 flex flex-col gap-1 mt-4">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Current Synchronized Balance</span>
                    <span className="text-3xl font-black text-white italic">
                      ₹{(balanceModal.data.openingBalance + balanceModal.data.totalCredit - balanceModal.data.totalDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setBalanceModal({ isOpen: false, account: null, data: null, loading: false })} className="px-10 py-3.5 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg hover:bg-slate-100 transition-all uppercase text-[10px] tracking-widest">Close Audit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
