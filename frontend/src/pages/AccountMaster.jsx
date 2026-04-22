import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, AlertCircle, Edit2, Trash2, CheckCircle, XCircle, Eye, X, Download } from 'lucide-react';
import AccountForm from '../components/AccountForm';

export default function AccountMaster() {
  const { t } = useTranslation();
  const [company, setCompany] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [balanceTypeFilter, setBalanceTypeFilter] = useState('all'); // all, credit, debit, zero
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  
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
    { value: 'assets', label: t('accountMaster.assets') },
    { value: 'liabilities', label: t('accountMaster.liabilities') },
    { value: 'capital', label: t('accountMaster.capital') },
    { value: 'revenue', label: t('accountMaster.revenue') },
    { value: 'expense', label: t('accountMaster.expense') },
    { value: 'customer', label: t('accountMaster.customer') },
    { value: 'supplier', label: t('accountMaster.supplier') },
    { value: 'purchase', label: t('accountMaster.purchase', 'Purchase') },
    { value: 'sales', label: t('accountMaster.sales', 'Sales') },
    { value: 'cash', label: t('accountMaster.cash') },
    { value: 'bank', label: t('accountMaster.bank') }
  ];

  // Load company
  useEffect(() => {
    loadCompany();
  }, []);

  // Load accounts when company changes
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
      } else {
        setMessage({ type: 'error', text: t('accountMaster.noCompanyFound') });
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

  const handleTypeChange = (type) => {
    setSelectedType(type);
  };

  const handleCreateSuccess = () => {
    setShowForm(false);
    setEditingAccount(null);
    loadAccounts();
    setMessage({ type: 'success', text: t('accountMaster.accountSaved') });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleDeactivate = async (accountId) => {
    if (!window.confirm(t('accountMaster.confirmDeactivate'))) return;

    try {
      await axios.post(`/api/accounts/${accountId}/deactivate`);
      setMessage({ type: 'success', text: t('accountMaster.accountDeactivated') });
      loadAccounts();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || t('accountMaster.failedToDeactivate') });
    }
  };

  const handleActivate = async (accountId) => {
    try {
      await axios.post(`/api/accounts/${accountId}/activate`);
      setMessage({ type: 'success', text: t('accountMaster.accountActivated') });
      loadAccounts();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || t('accountMaster.failedToActivate') });
    }
  };

  const handleShowBalance = async (account) => {
    setBalanceModal({ isOpen: true, account, data: null, loading: true, error: null });
    
    try {
      const response = await axios.get(`/api/accounts/${account.id}/balance`);
      if (response.data.success) {
        setBalanceModal({ 
          isOpen: true, 
          account, 
          data: response.data.data, 
          loading: false, 
          error: null 
        });
      }
    } catch (error) {
      setBalanceModal({
        isOpen: true,
        account,
        data: null,
        loading: false,
        error: error.response?.data?.error || t('accountMaster.failedToLoadAccounts')
      });
    }
  };

  const accountsArray = Array.isArray(accounts) ? accounts : [];
  
  const filteredAccounts = accountsArray.filter(acc => {
    if (balanceTypeFilter === 'all') return true;
    return acc.balance_type === balanceTypeFilter;
  });

  const handleDownloadCSV = () => {
    const headers = [
      t('accountMaster.accountName') || 'Account Name',
      t('accountMaster.type') || 'Type',
      t('accountMaster.status') || 'Status',
      t('accountMaster.closingBalance') || 'Closing Balance',
      'Balance Type (Cr/Dr)'
    ];
    
    const rows = filteredAccounts.map(acc => [
      `"${acc.account_name.replace(/"/g, '""')}"`,
      `"${t(`accountMaster.${acc.account_type}`)}"`,
      `"${acc.is_active ? t('accountMaster.active') : t('accountMaster.inactive')}"`,
      parseFloat(acc.closing_balance || 0).toFixed(2),
      acc.balance_type === 'credit' ? t('accountMaster.jama') : acc.balance_type === 'debit' ? t('accountMaster.udhar') : 'Zero'
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Accounts_${balanceTypeFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // If no company, show error
  if (!company) {
    return (
      <div className="min-h-screen bg-linear-to-br from-white via-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{t('accountMaster.noCompanyFound')}</h2>
          <p className="text-slate-600 mb-6">{t('accountMaster.createCompanyFirst')}</p>
          
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/company'}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              {t('accountMaster.goToCompanySetup')}
            </button>
            <button
              onClick={loadCompany}
              className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
            >
              {t('accountMaster.refresh')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalAccounts = accountsArray.length;
  const activeAccounts = accountsArray.filter(a => a.is_active).length;
  const inactiveAccounts = accountsArray.filter(a => !a.is_active).length;
  const totalBalance = accountsArray.reduce((sum, a) => sum + (parseFloat(a.opening_balance) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header - Monochrome Style */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{t('accountMaster.accountMaster')}</h1>
            <p className="text-slate-500 font-medium">{t('accountMaster.manageAccounts')}</p>
          </div>
          <button
            onClick={() => {
              setEditingAccount(null);
              setShowForm(!showForm);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-slate-800 font-bold shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            {t('accountMaster.addNewAccount')}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex gap-3 ${
            message.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Statistics Cards - Sleek Grayscale */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-slate-900">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 leading-none">{t('accountMaster.company')}</p>
            <p className="text-lg font-black text-slate-900 truncate">{company.company_name}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-slate-600">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 leading-none">{t('accountMaster.totalAccounts')}</p>
            <p className="text-2xl font-black text-slate-900">{totalAccounts}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-slate-500">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 leading-none">{t('accountMaster.active')}</p>
            <p className="text-2xl font-black text-slate-900">{activeAccounts}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-slate-400">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 leading-none">{t('accountMaster.inactive')}</p>
            <p className="text-2xl font-black text-slate-700">{inactiveAccounts}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-slate-300">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 leading-none">{t('accountMaster.totalBalance')}</p>
            <p className="text-2xl font-black text-slate-900 italic">₹{totalBalance.toFixed(0)}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          {showForm && (
            <div className="lg:col-span-1">
              <AccountForm
                companyId={company.id}
                initialData={editingAccount}
                onSuccess={handleCreateSuccess}
                onCancel={() => {
                  setShowForm(false);
                  setEditingAccount(null);
                }}
              />
            </div>
          )}

          {/* Accounts List Section */}
          <div className={showForm ? 'lg:col-span-2' : 'lg:col-span-3'}>
            {/* Toolbar - Monochrome Tabs */}
            <div className="bg-white p-4 rounded-xl shadow-md border border-slate-100 space-y-4 mb-6">
              <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                  {/* Account Type Filter */}
                  <select
                    value={selectedType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="px-4 py-2 border-2 border-slate-50 bg-slate-50 rounded-lg text-slate-700 font-black text-xs uppercase tracking-widest focus:outline-none focus:border-black transition-all shadow-sm"
                  >
                    {accountTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>

                  {/* Balance Type Filter */}
                  <select
                    value={balanceTypeFilter}
                    onChange={(e) => setBalanceTypeFilter(e.target.value)}
                    className="px-4 py-2 border-2 border-slate-900 bg-black rounded-lg text-white font-black text-xs uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-500 shadow-lg"
                  >
                    <option value="all">All Balances (બધા)</option>
                    <option value="credit">Credit Balance / Jama (જમા)</option>
                    <option value="debit">Debit Balance / Udhar (ઉધાર)</option>
                    <option value="zero">Zero Balance (શૂન્ય)</option>
                  </select>
                  
                  <button
                    onClick={handleDownloadCSV}
                    className="px-4 py-2 bg-white border-2 border-slate-200 hover:border-slate-400 text-slate-900 font-black text-xs uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all"
                    title="Download CSV"
                  >
                    <Download className="w-4 h-4" />
                    CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Accounts Table - High Contrast Monochrome */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              {loading ? (
                <div className="p-24 text-center">
                  <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                  <p className="text-slate-600 font-black uppercase tracking-widest text-xs uppercase">{t('common.loading')}</p>
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div className="p-24 text-center">
                  <AlertCircle className="w-16 h-16 mx-auto text-slate-300 mb-6" />
                  <p className="text-slate-500 font-black uppercase tracking-widest text-xs">{t('accountMaster.noAccountsFound')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900 text-white text-left">
                      <tr>
                        <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">{t('accountMaster.accountName')}</th>
                        <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">{t('accountMaster.type')}</th>
                        <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">{t('accountMaster.closingBalance') || 'Closing Balance'}</th>
                        <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">{t('accountMaster.status')}</th>
                        <th className="px-6 py-4 font-black uppercase tracking-wider text-xs text-right">{t('accountMaster.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-900">
                      {filteredAccounts.map(account => (
                        <tr key={account.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 font-black tracking-tight text-sm uppercase">{account.account_name}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                              {t(`accountMaster.${account.account_type}`)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-black text-sm italic">₹{(parseFloat(account.closing_balance) || 0).toFixed(2)}</span>
                              <span className={`text-[9px] font-black uppercase tracking-widest leading-none mt-1 ${account.balance_type === 'credit' ? 'text-slate-900' : account.balance_type === 'debit' ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-300'}`}>
                                {account.balance_type === 'credit' ? `${t('accountMaster.jama')} (Cr)` : account.balance_type === 'debit' ? `${t('accountMaster.udhar')} (Dr)` : 'Zero'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${
                              account.is_active
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-400 border-slate-200 line-through'
                            }`}>
                              {account.is_active ? t('accountMaster.active') : t('accountMaster.inactive')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => handleShowBalance(account)}
                                className="p-2 text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-300 rounded-lg transition-all"
                                title={t('accountMaster.balanceDetails')}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(account)}
                                className="p-2 text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-300 rounded-lg transition-all"
                                title={t('accountMaster.edit')}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {account.is_active ? (
                                <button
                                  onClick={() => handleDeactivate(account.id)}
                                  className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 hover:border-zinc-200 border border-transparent rounded-lg transition-all"
                                  title={t('accountMaster.deactivate')}
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivate(account.id)}
                                  className="p-2 text-zinc-900 hover:bg-zinc-900 hover:text-white border border-transparent rounded-lg transition-all"
                                  title={t('accountMaster.activate')}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
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
        </div>

        {/* Tip Section - Monochrome Style */}
        <div className="bg-white p-6 rounded-xl border-l-4 border-slate-900 shadow-md">
          <div className="flex gap-4 items-start">
            <div className="bg-slate-900 text-white p-2 rounded-lg">💡</div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-900 mb-1">{t('accountMaster.tip')}</p>
              <p className="text-sm text-slate-600 font-medium">
                {t('accountMaster.accountTip')}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Balance Details Modal - Industrial Design */}
      {balanceModal.isOpen && balanceModal.account && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b-4 border-black bg-white">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-2">
                <Eye className="w-5 h-5" />
                {t('accountMaster.balanceDetails')}
              </h3>
              <button 
                onClick={() => setBalanceModal({ isOpen: false, account: null, data: null, loading: false, error: null })}
                className="text-slate-400 hover:text-black transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </div>
            
            <div className="p-8">
              <div className="mb-6 pb-4 border-b border-slate-100">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('accountMaster.accountName')}</p>
                <p className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{balanceModal.account.account_name}</p>
              </div>

              {balanceModal.loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : balanceModal.error ? (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{balanceModal.error}</p>
                </div>
              ) : balanceModal.data ? (
                <div className="space-y-4">
                  
                  {/* Opening Balance */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-36">{t('accountMaster.openingBalance')} :</span>
                    <div className="flex-1">
                       <input
                         type="text"
                         readOnly
                         value={balanceModal.data.openingBalance.toFixed(2)}
                         className="w-full px-4 py-3 outline-none text-right bg-slate-50 border-2 border-slate-100 rounded-lg text-slate-900 font-black italic shadow-inner"
                       />
                    </div>
                  </div>

                  {/* Total Debit */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-36">{t('accountMaster.totalDebit')} :</span>
                    <div className="flex-1">
                       <input
                         type="text"
                         readOnly
                         value={balanceModal.data.totalDebit.toFixed(2)}
                         className="w-full px-4 py-3 outline-none text-right bg-slate-50 border-2 border-slate-100 rounded-lg text-slate-600 font-black shadow-inner"
                       />
                    </div>
                  </div>

                  {/* Total Credit */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-36">{t('accountMaster.totalCredit')} :</span>
                    <div className="flex-1">
                       <input
                         type="text"
                         readOnly
                         value={balanceModal.data.totalCredit.toFixed(2)}
                         className="w-full px-4 py-3 outline-none text-right bg-slate-50 border-2 border-slate-100 rounded-lg text-slate-600 font-black shadow-inner"
                       />
                    </div>
                  </div>

                  {/* Closing Balance */}
                  <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-100">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest w-36">{t('accountMaster.closingBalance')} :</span>
                    <div className="flex-1">
                       <input
                         type="text"
                         readOnly
                         value={(balanceModal.data.openingBalance + balanceModal.data.totalCredit - balanceModal.data.totalDebit).toFixed(2)}
                         className="w-full px-4 py-3 outline-none text-right bg-black border-2 border-black rounded-lg text-white font-black text-lg italic shadow-xl"
                       />
                    </div>
                  </div>

                </div>
              ) : null}
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setBalanceModal({ isOpen: false, account: null, data: null, loading: false, error: null })}
                className="px-8 py-3 bg-black hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs rounded-lg transition-all active:scale-95 shadow-md"
               >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
