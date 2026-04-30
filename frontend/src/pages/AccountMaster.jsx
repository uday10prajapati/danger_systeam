import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  Plus, AlertCircle, Edit2, Trash2, CheckCircle,
  XCircle, Eye, X, Download, Database, Shield,
  Search, Filter, Users, Scale, TrendingUp,
  Activity, ArrowRight, Loader, FileText, IndianRupee,
  MoreVertical, Power, QrCode, Hash, Layers,
  RefreshCcw, Building2, Globe
} from 'lucide-react';
import AccountForm from '../components/AccountForm';
import { useNavigate } from 'react-router-dom';
import TableHeading from '../components/TableHeading';
import PageHeader from '../components/PageHeader';

export default function AccountMaster() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [balanceTypeFilter, setBalanceTypeFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      const response = await axios.get('/api/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load company context.' });
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

  const handleFormSuccess = () => {
    setShowModal(false);
    setEditingAccount(null);
    loadAccounts();
    setMessage({ type: 'success', text: 'Account saved successfully.' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleStatusToggle = async (account) => {
    try {
      const endpoint = account.is_active ? 'deactivate' : 'activate';
      await axios.post(`/api/accounts/${account.id}/${endpoint}`);
      setMessage({ type: 'success', text: `Account ${account.is_active ? 'deactivated' : 'activated'} successfully.` });
      loadAccounts();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update account status.' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    try {
      await axios.delete(`/api/accounts/${id}`);
      setMessage({ type: 'success', text: 'Account deleted successfully.' });
      loadAccounts();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Delete failed.' });
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

  if (!company && !loading) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
        <Loader className="animate-spin text-blue-500" size={40} />
        <p className="font-bold text-slate-400 uppercase tracking-widest">Loading Account Data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-6">

        <PageHeader
          eyebrow="Management / Accounts"
          eyebrowIcon={<Shield size={12} />}
          title="Account Master"
          subtitle="Manage ledger accounts and financial nodes"
        >
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-slate-200 shadow-sm focus-within:border-blue-500 transition-all group">
              <Search size={16} className="text-slate-400 group-focus-within:text-blue-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search accounts..."
                className="bg-transparent border-none outline-none text-xs text-slate-600 w-48 placeholder:text-slate-300 font-bold"
              />
            </div>
            <button
              onClick={handleDownloadCSV}
              className="hidden lg:flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 transition-all active:scale-95 shadow-sm"
            >
              <Download size={16} /> Export
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 bg-blue-600 px-6 py-2.5 rounded-lg text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-95"
            >
              <Plus size={16} /> Add Account
            </button>
          </div>
        </PageHeader>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top duration-300 border-l-4 ${
            message.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'
          }`}>
            {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span className="text-xs font-bold uppercase tracking-wider">{message.text}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Accounts', val: accounts.length, icon: <Users size={18} />, color: 'blue' },
            { label: 'Active Ledger', val: accounts.filter(a => a.is_active).length, icon: <Activity size={18} />, color: 'emerald' },
            { label: 'Asset Nodes', val: accounts.filter(a => a.account_type === 'assets').length, icon: <Scale size={18} />, color: 'violet' },
            { label: 'Revenue Streams', val: accounts.filter(a => a.account_type === 'revenue').length, icon: <TrendingUp size={18} />, color: 'amber' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-100 transition-all">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <div className={`p-2 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg group-hover:scale-110 transition-transform`}>{stat.icon}</div>
              </div>
              <p className="text-xl font-black text-slate-800">{stat.val}</p>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6 min-h-[500px] flex flex-col">
          <TableHeading
            icon={<Database size={18} />}
            iconColor="blue"
            title="Account Registry"
            subtitle={`Total ${filteredAccounts.length} records in this view`}
          >
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 overflow-x-auto no-scrollbar">
              {accountTypes.slice(0, 5).map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${selectedType === type.value ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {type.label}
                </button>
              ))}
              <select 
                className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 cursor-pointer"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">More Types...</option>
                {accountTypes.slice(5).map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="w-px h-5 bg-slate-200 hidden md:block" />
            <select
              value={balanceTypeFilter}
              onChange={(e) => setBalanceTypeFilter(e.target.value)}
              className="bg-white border border-slate-200 outline-none text-[10px] font-bold text-slate-500 px-3 py-2 rounded-lg cursor-pointer uppercase tracking-widest"
            >
              <option value="all">Balance (All)</option>
              <option value="credit">Jama (Cr)</option>
              <option value="debit">Udhar (Dr)</option>
            </select>
          </TableHeading>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-32">
              <RefreshCcw size={48} className="animate-spin text-blue-100 mb-6" />
              <p className="text-slate-300 font-bold uppercase tracking-widest text-[10px] italic">Synchronizing Registry...</p>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-32 text-center">
              <FileText size={48} className="text-slate-200 mb-6" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-10 italic">No matching accounts found</p>
              <button onClick={handleCreateNew} className="px-10 py-3 bg-blue-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-95">
                Initialize First Account
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto scroller-airy">
              <table className="w-full text-left">
                <thead className="bg-[#F8FAFC]">
                  <tr className="uppercase tracking-widest font-black text-slate-400 text-[10px]">
                    <th className="px-6 py-5 border-r border-slate-50/50">Account Node</th>
                    <th className="px-6 py-5 border-r border-slate-50/50">Identity / P-Code</th>
                    <th className="px-6 py-5 border-r border-slate-50/50">Type / Classification</th>
                    <th className="px-6 py-5 border-r border-slate-50/50 text-right">Closing Balance</th>
                    <th className="px-6 py-5 border-r border-slate-50/50 text-center">Status</th>
                    <th className="px-6 py-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAccounts.map((acc) => (
                    <tr key={acc.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-sm transition-all group-hover:scale-110 ${
                            ['customer', 'supplier', 'revenue'].includes(acc.account_type) ? 'bg-blue-600' : 'bg-slate-400'
                          }`}>
                            {acc.account_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight italic">{acc.account_name}</p>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                <Hash size={10} /> {acc.account_code || acc.id}
                              </span>
                              {acc.email && <span className="text-[10px] font-bold text-slate-300 truncate max-w-[120px]">{acc.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 border-r border-slate-50/50">
                        <div className="flex flex-col gap-2">
                          {acc.p_code ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 rounded text-[9px] font-black text-white uppercase tracking-[0.15em] shadow-sm shadow-blue-100 w-fit">
                              {acc.p_code}
                            </span>
                          ) : (
                             <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-400 uppercase tracking-widest w-fit">
                                <Hash size={10} /> {acc.account_code || acc.id}
                             </span>
                          )}
                          {acc.p_code && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-400 uppercase tracking-widest w-fit">
                              <Hash size={10} /> {acc.account_code || acc.id}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 border-r border-slate-50/50">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                            ['revenue', 'sales', 'customer'].includes(acc.account_type) ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {acc.account_type}
                          </span>
                          {acc.is_subledger ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-100 rounded text-[8px] font-black uppercase tracking-widest">
                              <Layers size={8} /> Sub-Ledger
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-black text-slate-800 flex items-center gap-1 leading-none italic">
                            <IndianRupee size={12} className="text-slate-400" />
                            {(parseFloat(acc.closing_balance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest mt-1.5 ${acc.balance_type === 'credit' ? 'text-blue-600' : acc.balance_type === 'debit' ? 'text-rose-600' : 'text-slate-300'}`}>
                            {acc.balance_type === 'credit' ? 'Jama (Cr)' : acc.balance_type === 'debit' ? 'Udhar (Dr)' : 'Zero Balance'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border shadow-sm ${acc.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-400 border-rose-100'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${acc.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
                            {acc.is_active ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleShowBalance(acc)} className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all shadow-sm active:scale-95" title="View Audit">
                            <Eye size={16} />
                          </button>
                          {!acc.is_system && (
                            <>
                              <button onClick={() => handleEdit(acc)} className="p-2.5 bg-white border border-slate-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleStatusToggle(acc)} className={`p-2.5 bg-white border border-slate-100 rounded-lg shadow-sm transition-all active:scale-95 ${acc.is_active ? 'text-rose-500 hover:bg-rose-600 hover:text-white' : 'text-emerald-500 hover:bg-emerald-600 hover:text-white'}`}>
                                <Power size={16} />
                              </button>
                              <button onClick={() => handleDelete(acc.id)} className="p-2.5 bg-white border border-slate-100 text-rose-500 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95">
                                <Trash2 size={16} />
                              </button>
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

      {/* Account Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto scroller-airy">
            <AccountForm
              companyId={company.id}
              initialData={editingAccount}
              onSuccess={handleFormSuccess}
              onCancel={() => { setShowModal(false); setEditingAccount(null); }}
              existingAccounts={accounts}
            />
          </div>
        </div>
      )}

      {/* Balance Audit Modal */}
      {balanceModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-blue-600">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 text-white rounded-lg backdrop-blur-md shadow-lg"><Eye size={20} /></div>
                <div>
                  <h3 className="text-xl font-bold text-white uppercase italic tracking-tight">Ledger Audit</h3>
                  <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mt-0.5">Real-time Fiscal Insights</p>
                </div>
              </div>
              <button onClick={() => setBalanceModal({ isOpen: false, account: null, data: null, loading: false })} className="p-2 text-white/50 hover:text-white transition-colors"><X size={24} /></button>
            </div>

            <div className="p-10 space-y-8">
              <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entity Name</p>
                <p className="text-xl font-black text-slate-800 uppercase tracking-tight italic">{balanceModal.account?.account_name}</p>
              </div>

              {balanceModal.loading ? (
                <div className="py-12 flex flex-col items-center gap-4 text-center">
                  <RefreshCcw className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Aggregating Fiscal Context...</p>
                </div>
              ) : balanceModal.data ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opening Context</span>
                    <span className="font-mono font-bold text-slate-700">₹{balanceModal.data.openingBalance.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-lg">
                      <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1 italic">Total Udhar (Dr)</p>
                      <p className="text-lg font-black text-rose-600">₹{balanceModal.data.totalDebit.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 italic">Total Jama (Cr)</p>
                      <p className="text-lg font-black text-emerald-600">₹{balanceModal.data.totalCredit.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-900 rounded-lg shadow-xl shadow-slate-200 flex flex-col gap-1 mt-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest relative z-10">Synchronized Balance</span>
                    <span className="text-3xl font-black text-white italic relative z-10">
                      ₹{balanceModal.data.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setBalanceModal({ isOpen: false, account: null, data: null, loading: false })} className="px-10 py-3 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg hover:bg-slate-100 transition-all uppercase text-[10px] tracking-widest active:scale-95 shadow-sm">Close Audit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
