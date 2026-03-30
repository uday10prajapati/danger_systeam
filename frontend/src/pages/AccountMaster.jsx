import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, AlertCircle, Edit2, Trash2, CheckCircle, XCircle, Eye, X } from 'lucide-react';
import AccountForm from '../components/AccountForm';

export default function AccountMaster() {
  const { t } = useTranslation();
  const [company, setCompany] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
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

  // Calculate statistics
  const accountsArray = Array.isArray(accounts) ? accounts : [];
  const totalAccounts = accountsArray.length;
  const activeAccounts = accountsArray.filter(a => a.is_active).length;
  const inactiveAccounts = accountsArray.filter(a => !a.is_active).length;
  const totalBalance = accountsArray.reduce((sum, a) => sum + (parseFloat(a.opening_balance) || 0), 0);

  return (
    <div className="min-h-screen bg-linear-to-br from-white via-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">👤</span>
            </div>
            <h1 className="text-4xl font-bold text-slate-900">{t('accountMaster.accountMaster')}</h1>
          </div>
          <p className="text-slate-600">{t('accountMaster.manageAccounts')}</p>
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

        {/* Company Info Card */}
        <div className="bg-linear-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-slate-600">{t('accountMaster.company')}</p>
              <p className="text-xl font-bold text-blue-600">{company.company_name}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">{t('accountMaster.totalAccounts')}</p>
              <p className="text-xl font-bold text-blue-600">{totalAccounts}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">{t('accountMaster.active')}</p>
              <p className="text-xl font-bold text-green-600">{activeAccounts}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">{t('accountMaster.inactive')}</p>
              <p className="text-xl font-bold text-red-600">{inactiveAccounts}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">{t('accountMaster.totalBalance')}</p>
              <p className="text-xl font-bold text-indigo-600">₹{totalBalance.toFixed(2)}</p>
            </div>
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
            {/* Filter and Actions */}
            <div className="mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {accountTypes.map(type => (
                  <button
                    key={type.value}
                    onClick={() => handleTypeChange(type.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedType === type.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => {
                  setEditingAccount(null);
                  setShowForm(!showForm);
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                {t('accountMaster.addNewAccount')}
              </button>
            </div>

            {/* Accounts Table */}
            <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
              {accounts.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600">{t('accountMaster.noAccountsFound')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">{t('accountMaster.accountName')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">{t('accountMaster.type')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">{t('accountMaster.openingBalance')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">{t('accountMaster.status')}</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">{t('accountMaster.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map(account => (
                        <tr key={account.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{account.account_name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                              {t(`accountMaster.${account.account_type}`)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            ₹{(parseFloat(account.opening_balance) || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {account.is_active ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span>{t('accountMaster.active')}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600">
                                <XCircle className="w-4 h-4" />
                                <span>{t('accountMaster.inactive')}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right flex gap-2 justify-end">
                            <button
                              onClick={() => handleShowBalance(account)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title={t('accountMaster.balanceDetails')}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(account)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={t('accountMaster.edit')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {account.is_active ? (
                              <button
                                onClick={() => handleDeactivate(account.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title={t('accountMaster.deactivate')}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(account.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title={t('accountMaster.activate')}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
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

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-sm text-blue-900">
            <strong>💡 {t('accountMaster.tip')}:</strong> {t('accountMaster.accountTip')}
          </p>
        </div>
      </div>
      {/* Balance Details Modal */}
      {balanceModal.isOpen && balanceModal.account && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600" />
                {t('accountMaster.balanceDetails')}
              </h3>
              <button 
                onClick={() => setBalanceModal({ isOpen: false, account: null, data: null, loading: false, error: null })}
                className="text-slate-400 hover:bg-slate-200 hover:text-slate-600 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6">
              <div className="mb-6 pb-4 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-500">{t('accountMaster.accountName')}</p>
                <p className="text-xl font-bold text-slate-900">{balanceModal.account.account_name}</p>
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
                    <span className="text-sm font-medium text-slate-600 w-36">{t('accountMaster.openingBalance')} :</span>
                    <div className="flex-1">
                       <input
                         type="text"
                         readOnly
                         value={balanceModal.data.openingBalance.toFixed(2)}
                         className="w-full px-3 py-2 outline-none text-right bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold shadow-inner"
                       />
                    </div>
                  </div>

                  {/* Total Debit */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-slate-600 w-36">{t('accountMaster.totalDebit')} :</span>
                    <div className="flex-1">
                       <input
                         type="text"
                         readOnly
                         value={balanceModal.data.totalDebit.toFixed(2)}
                         className="w-full px-3 py-2 outline-none text-right bg-[#e4efff] border border-blue-200 rounded-lg text-blue-900 font-medium shadow-inner"
                       />
                    </div>
                  </div>

                  {/* Total Credit */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-slate-600 w-36">{t('accountMaster.totalCredit')} :</span>
                    <div className="flex-1">
                       <input
                         type="text"
                         readOnly
                         value={balanceModal.data.totalCredit.toFixed(2)}
                         className="w-full px-3 py-2 outline-none text-right bg-[#e4efff] border border-blue-200 rounded-lg text-blue-900 font-medium shadow-inner"
                       />
                    </div>
                  </div>

                  {/* Closing Balance */}
                  <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
                    <span className="text-sm font-bold text-slate-800 w-36">{t('accountMaster.closingBalance')} :</span>
                    <div className="flex-1">
                       <input
                         type="text"
                         readOnly
                         value={(balanceModal.data.openingBalance + balanceModal.data.totalCredit - balanceModal.data.totalDebit).toFixed(2)}
                         className="w-full px-3 py-2 outline-none text-right bg-[#c2d7f8] border border-blue-300 rounded-lg text-blue-900 font-bold shadow-inner"
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
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors"
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
