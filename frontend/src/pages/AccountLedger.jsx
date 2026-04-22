import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, X, ChevronRight, Printer, FileText, Database, Activity } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export default function AccountLedger() {
  const { t } = useTranslation();
  const [view, setView] = useState('ledger'); // 'ledger' or 'trial-balance'
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [trialBalance, setTrialBalance] = useState([]);
  const [totals, setTotals] = useState({ total_debit: 0, total_credit: 0, difference: 0 });
  const [accountBalance, setAccountBalance] = useState({ total_debit: 0, total_credit: 0, running_balance: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [company, setCompany] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const response = await axios.get('/api/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      } else {
        setCompany(null);
      }
    } catch (error) {
      setCompany(null);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchAccounts();
      if (view === 'trial-balance') {
        fetchTrialBalance();
      }
    }
  }, [view, company]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/accounts/company/${company.id}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.data) {
        setAccounts(response.data.data);
      }
    } catch (err) {
      console.error('Fetch accounts error:', err);
    }
  };

  const fetchAccountLedger = async (accountId) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/account-ledger/account/${accountId}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setLedgerEntries(response.data.data);
      }
    } catch (err) {
      console.error('Fetch ledger error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountBalance = async (accountId) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/account-ledger/balance/${accountId}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setAccountBalance(response.data.data);
      }
    } catch (err) {
      console.error('Fetch balance error:', err);
    }
  };

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/account-ledger/trial-balance`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setTrialBalance(response.data.data);
        setTotals(response.data.totals);
      }
    } catch (err) {
      console.error('Fetch trial balance error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = async (account) => {
    setSelectedAccount(account);
    setView('ledger');
    await Promise.all([
      fetchAccountLedger(account.id),
      fetchAccountBalance(account.id)
    ]);
  };

  const filteredAccounts = accounts.filter(acc =>
    acc.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.account_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDateChange = () => {
    if (selectedAccount) {
      fetchAccountLedger(selectedAccount.id);
    }
  };

  const handleViewDetails = () => {
    if (!selectedAccount || ledgerEntries.length === 0) {
      alert('No data to display');
      return;
    }
    setShowDetailsModal(true);
  };

  const handlePrint = () => {
    if (!selectedAccount || ledgerEntries.length === 0) {
      alert('No data to print');
      return;
    }
    setShowPrintModal(true);
  };

  const handlePrintPage = () => {
    window.print();
  };

  if (!company?.id) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center font-black uppercase tracking-widest text-slate-400">
          <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-lg mb-4 italic">Synchronizing Ledger Records...</p>
          <div className="w-16 h-1 bg-slate-200 mx-auto overflow-hidden rounded-full">
             <div className="w-full h-full bg-black animate-[slide_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-900 font-sans">
      
      {/* Header - Industrial Monochrome */}
      <div className="flex justify-between items-end border-b-4 border-black pb-4 print:hidden">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{t('accountLedger.title', 'Account Ledger')}</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">{company.company_name} / CONSOLIDATED REGISTRY</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-xl border-2 border-slate-200">
          <button
            onClick={() => setView('ledger')}
            className={`px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all ${
              view === 'ledger'
                ? 'bg-black text-white shadow-xl'
                : 'text-slate-400 hover:text-black'
            }`}
          >
            Transaction View
          </button>
          <button
            onClick={() => { setView('trial-balance'); fetchTrialBalance(); }}
            className={`px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all ${
              view === 'trial-balance'
                ? 'bg-black text-white shadow-xl'
                : 'text-slate-400 hover:text-black'
            }`}
          >
            Trial Summary
          </button>
        </div>
      </div>

      {/* Account Ledger View */}
      {view === 'ledger' && (
        <div className="space-y-6">
          <div className="grid grid-cols-12 gap-6 print:block">
            
            {/* Account Selector - High Density */}
            <div className="col-span-12 lg:col-span-3 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[700px] print:hidden">
              <div className="bg-slate-900 p-4 border-b border-black">
                 <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic flex items-center gap-2">
                    <div className="w-4 h-1 bg-white"></div>
                    Entity Selection
                 </h2>
              </div>
              <div className="p-4 border-b border-slate-100">
                <div className="relative group">
                   <Search className="absolute left-3 top-3 text-slate-300 group-focus-within:text-black transition-colors" size={16} strokeWidth={3} />
                   <input
                    type="text"
                    placeholder="FILTER ENTITIES..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-black transition-all bg-slate-50 font-black uppercase text-[10px]"
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
                {filteredAccounts.length === 0 ? (
                  <div className="text-center py-16 text-slate-300 font-bold uppercase tracking-widest text-[9px] italic">NO RECORDS FOUND</div>
                ) : (
                  filteredAccounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleSelectAccount(account)}
                      className={`w-full text-left p-4 transition-all group relative ${
                        selectedAccount?.id === account.id
                          ? 'bg-slate-50'
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      {selectedAccount?.id === account.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black"></div>
                      )}
                      <div className={`text-[11px] font-black uppercase tracking-tight ${selectedAccount?.id === account.id ? 'text-black' : 'text-slate-600'}`}>{account.account_name}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{account.account_type}</div>
                      <ChevronRight size={14} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all ${selectedAccount?.id === account.id ? 'text-black opacity-100 translate-x-0' : 'text-slate-200 opacity-0 -translate-x-2'}`} />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Main Ledger Core */}
            <div className="col-span-12 lg:col-span-9 space-y-6 print:w-full">
              {selectedAccount ? (
                <>
                  {/* Ledger Statistics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border-l-8 border-slate-900 group hover:bg-slate-900 transition-all duration-300">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">Gross Debit Accumulation</p>
                      <p className="text-3xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white">
                        ₹{parseFloat(accountBalance.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg border-l-8 border-slate-500 group hover:bg-slate-800 transition-all duration-300">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">Gross Credit Accumulation</p>
                      <p className="text-3xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white">
                        ₹{parseFloat(accountBalance.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className={`bg-white p-6 rounded-2xl shadow-lg border-l-8 group transition-all duration-300 relative overflow-hidden ${
                      parseFloat(accountBalance.running_balance) >= 0 ? 'border-black hover:bg-black' : 'border-red-600 hover:bg-red-900'
                    }`}>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500 relative z-10">Net Balance Position</p>
                      <p className={`text-3xl font-black mt-1 tracking-tighter group-hover:text-white relative z-10 ${
                        parseFloat(accountBalance.running_balance) >= 0 ? 'text-slate-900' : 'text-red-600'
                      }`}>
                        ₹{parseFloat(accountBalance.running_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Filter Toolbar & Summary Action Bar */}
                  <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-100 flex flex-wrap gap-4 items-end print:hidden">
                    <div className="flex gap-4 flex-1">
                       <div className="flex-1">
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">START DATE</span>
                          <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            onBlur={handleDateChange}
                            className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl outline-none focus:border-black transition-all bg-slate-50 font-black text-xs h-11"
                          />
                       </div>
                       <div className="flex-1">
                          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">END DATE</span>
                          <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            onBlur={handleDateChange}
                            className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl outline-none focus:border-black transition-all bg-slate-50 font-black text-xs h-11"
                          />
                       </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleViewDetails()}
                        className="px-6 py-3 bg-slate-100 text-slate-900 border-2 border-slate-200 rounded-xl hover:bg-slate-200 font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2"
                      >
                        <FileText size={16} strokeWidth={3} /> {t('accountLedger.fullDetail', 'Dossier')}
                      </button>
                      <button
                        onClick={() => handlePrint()}
                        className="px-8 py-3 bg-black text-white rounded-xl hover:bg-slate-800 font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 shadow-2xl active:scale-95"
                      >
                        <Printer size={16} strokeWidth={3} /> {t('common.print', 'Print Report')}
                      </button>
                    </div>
                  </div>

                  {/* Master Ledger Grid */}
                  <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 print:shadow-none print:border-black">
                     <div className="bg-slate-900 text-white p-4 flex justify-between items-center border-b-2 border-black">
                        <div>
                           <h2 className="text-xl font-black tracking-tighter uppercase italic">{selectedAccount.account_name}</h2>
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{selectedAccount.account_type} Registry</p>
                        </div>
                        <span className="bg-slate-800 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-700">Official Record</span>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px] text-slate-400">Date</th>
                              <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px] text-slate-400">Ref ID</th>
                              <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px] text-slate-400">Description</th>
                              <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px] text-slate-400">Debit (+)</th>
                              <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px] text-slate-400">Credit (-)</th>
                              <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px] text-slate-400">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {loading ? (
                              <tr>
                                <td colSpan="6" className="px-6 py-24 text-center">
                                   <div className="w-12 h-12 border-4 border-slate-100 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
                                   <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">Processing Pipeline...</p>
                                </td>
                              </tr>
                            ) : ledgerEntries.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="px-6 py-24 text-center text-slate-300 font-bold uppercase tracking-[0.3em] text-[10px] italic">NO ENTRIES DETECTED FOR SELECTED PERIOD</td>
                              </tr>
                            ) : (
                              ledgerEntries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                                  <td className="px-6 py-4 font-mono font-bold text-slate-500 text-[11px]">
                                    {new Date(entry.transaction_date).toLocaleDateString('en-GB')}
                                  </td>
                                  <td className="px-6 py-4 text-[10px] text-slate-400 font-black uppercase tracking-widest">{entry.reference_no}</td>
                                  <td className="px-6 py-4 font-black text-slate-900 text-xs uppercase tracking-tight italic">{entry.description}</td>
                                  <td className="px-6 py-4 text-right">
                                    {parseFloat(entry.debit || 0) > 0 ? (
                                      <span className="text-slate-900 font-black italic text-sm">₹{parseFloat(entry.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    ) : (
                                      <span className="text-slate-100">•</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    {parseFloat(entry.credit || 0) > 0 ? (
                                      <span className="text-slate-400 font-bold text-sm">₹{parseFloat(entry.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    ) : (
                                      <span className="text-slate-100">•</span>
                                    )}
                                  </td>
                                  <td className={`px-6 py-4 text-right font-black text-sm italic ${
                                    parseFloat(entry.running_balance) >= 0 ? 'text-black' : 'text-red-700 underline decoration-red-100 underline-offset-4'
                                  }`}>
                                    ₹{parseFloat(entry.running_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                     </div>
                  </div>
                </>
              ) : (
                <div className="h-[600px] bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center border-4 border-dashed border-slate-100 opacity-60">
                   <Activity className="w-24 h-24 text-slate-100 mb-6" />
                   <p className="font-black text-slate-300 uppercase tracking-[0.4em] italic text-sm">Awaiting Entity Selection</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trial Balance View - Industrial Layout */}
      {view === 'trial-balance' && (
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
          <div className="bg-slate-900 p-6 border-b-2 border-black flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Institutional Trial Balance</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Global Settlement Overview</p>
            </div>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-xl hover:bg-slate-100 font-black uppercase tracking-widest text-[10px] transition-all shadow-xl active:scale-95">
              <Download size={16} strokeWidth={3} />
              Export Data
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px] text-slate-400">Account nomenclature</th>
                  <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px] text-slate-400">Class</th>
                  <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px] text-slate-400">Debit Vol (+)</th>
                  <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px] text-slate-400">Credit Vol (-)</th>
                  <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px] text-slate-400">Net Exposure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-24 text-center">
                       <div className="w-10 h-10 border-4 border-slate-100 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
                       <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">Processing Master Ledger...</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {trialBalance.map((account) => (
                      <tr key={account.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 text-slate-900 font-black uppercase text-xs tracking-tight">{account.account_name}</td>
                        <td className="px-6 py-4 text-[9px] text-slate-400 font-black uppercase tracking-widest">{account.account_type}</td>
                        <td className="px-6 py-4 text-right font-black text-slate-900 text-sm italic">
                          ₹{parseFloat(account.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-400 text-sm">
                          ₹{parseFloat(account.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`px-6 py-4 text-right font-black text-sm italic ${
                          parseFloat(account.balance) >= 0 ? 'text-black' : 'text-red-700 underline decoration-red-100 underline-offset-4'
                        }`}>
                          ₹{parseFloat(account.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    {/* Trial Balance Footer - Extra Bold */}
                    <tr className="bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] border-t-4 border-black">
                      <td colSpan="2" className="px-6 py-6 italic text-sm tracking-tight text-slate-400 underline decoration-slate-800 underline-offset-8">Consolidated Totals</td>
                      <td className="px-6 py-6 text-right text-[16px] tracking-tighter">
                        ₹{parseFloat(totals.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-6 text-right text-[16px] tracking-tighter text-slate-500">
                        ₹{parseFloat(totals.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`px-6 py-6 text-right text-sm ${
                        totals.difference < 0.01 ? 'text-white italic tracking-widest' : 'text-red-500'
                      }`}>
                        {totals.difference < 0.01 ? '✓ LEDGER BALANCE VERIFIED' : `DISCREPANCY: ₹${totals.difference.toFixed(2)}`}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details/Audit Modal - Full Industrial Control */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-700">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase italic">{selectedAccount?.account_name}</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Full Transaction Audit Dossier</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="bg-slate-800 hover:bg-red-600 text-white p-2 rounded-xl transition-all active:scale-90"
              >
                <X size={24} strokeWidth={3} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              
              {/* Account Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner">
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Entity Architecture</p>
                    <p className="font-black text-slate-900 text-sm uppercase">{selectedAccount?.account_type}</p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner">
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Primary Telecom</p>
                    <p className="font-black text-slate-900 text-sm font-mono tracking-tight">{selectedAccount?.phone || 'NOT_CONNECTED'}</p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner">
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Verified Mail</p>
                    <p className="font-black text-slate-900 text-sm tracking-tight truncate uppercase">{selectedAccount?.email || 'N/A'}</p>
                 </div>
              </div>

              {/* Transactions Record Table */}
              <div>
                <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-4 text-slate-900 flex items-center gap-2">
                   <div className="w-4 h-1 bg-black"></div>
                   Historical Ledger Pipeline
                </h3>
                <div className="rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-widest font-black text-slate-400">
                      <tr>
                        <th className="px-6 py-4 text-left">Registry Date</th>
                        <th className="px-6 py-4 text-left">Doc Reference</th>
                        <th className="px-6 py-4 text-left">Nomenclature</th>
                        <th className="px-6 py-4 text-right">Debit (+)</th>
                        <th className="px-6 py-4 text-right">Credit (-)</th>
                        <th className="px-6 py-4 text-right">Position</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                      {ledgerEntries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-slate-500">{new Date(entry.transaction_date).toLocaleDateString('en-GB')}</td>
                          <td className="px-6 py-4 font-black uppercase italic text-slate-300">{entry.reference_no}</td>
                          <td className="px-6 py-4 font-black uppercase text-slate-900 tracking-tight">{entry.description}</td>
                          <td className="px-6 py-4 text-right">
                            {parseFloat(entry.debit || 0) > 0 ? (
                               <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-mono font-black text-slate-900 italic">₹{parseFloat(entry.debit).toFixed(2)}</span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 text-right">
                             {parseFloat(entry.credit || 0) > 0 ? (
                               <span className="font-mono font-bold text-slate-400 italic">₹{parseFloat(entry.credit).toFixed(2)}</span>
                             ) : '-'}
                          </td>
                          <td className={`px-6 py-4 text-right font-mono font-black italic ${
                            parseFloat(entry.running_balance) >= 0 ? 'text-black' : 'text-red-700 underline decoration-red-100 decoration-2'
                          }`}>
                            ₹{parseFloat(entry.running_balance || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer Action Zone */}
            <div className="bg-slate-900 p-6 border-t border-black flex justify-between items-center rounded-b-2xl shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.4)]">
                 <div className="flex gap-2">
                    <button
                      onClick={handlePrintPage}
                      className="px-8 py-3 bg-white text-black rounded-xl hover:bg-slate-100 font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 shadow-xl active:scale-95"
                    >
                      <Printer size={16} strokeWidth={3} /> Print Core Modal
                    </button>
                    <button className="px-6 py-3 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl hover:text-white font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2">
                       <Download size={16} strokeWidth={3} /> Data Stream
                    </button>
                 </div>
                 <button
                   onClick={() => setShowDetailsModal(false)}
                   className="px-8 py-3 bg-red-900 text-white rounded-xl hover:bg-red-800 font-black uppercase tracking-widest text-[10px] transition-all"
                 >
                   Deactivate View
                 </button>
            </div>
          </div>
        </div>
      )}

      {/* Print View Container - Optimized for Physical Monochrome Printing */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-[0_35px_60px_-15px_rgba(0,0,0,1)] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-700">
            <div className="bg-slate-900 text-white p-6 sticky top-0 flex justify-between items-center border-b border-black">
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase italic">Print Deployment</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Target Account: {selectedAccount?.account_name}</p>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                 className="bg-slate-800 hover:bg-red-600 text-white p-2 rounded-xl transition-all"
              >
                <X size={24} strokeWidth={3} />
              </button>
            </div>

            <div className="p-12 overflow-y-auto bg-white flex-1" id="printable-area">
              <div className="text-center border-b-8 border-black pb-8 mb-10">
                <h1 className="text-5xl font-black text-black tracking-tighter italic uppercase">{company.company_name}</h1>
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.5em] mt-2">Certified Account Statement</p>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-10">
                <div>
                   <h2 className="text-3xl font-black text-black tracking-tight uppercase italic mb-2">{selectedAccount?.account_name}</h2>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Registry Class: {selectedAccount?.account_type}</p>
                   <div className="space-y-1 font-mono text-[10px] font-bold text-slate-400 uppercase">
                      <p>Telecom: {selectedAccount?.phone || 'NOT_CONNECTED'}</p>
                      <p>Mail: {selectedAccount?.email || 'N/A'}</p>
                   </div>
                </div>
                <div className="text-right flex flex-col justify-end">
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">Audit Timestamp</p>
                   <p className="text-xs font-black text-black font-mono tracking-tighter">{new Date().toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-12">
                <div className="border-4 border-black p-6 rounded-2xl bg-black text-white text-center shadow-xl">
                   <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-2">GROSS DEBIT</p>
                   <p className="text-3xl font-black tracking-tighter italic">₹{parseFloat(accountBalance.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="border-4 border-slate-200 p-6 rounded-2xl text-center">
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">GROSS CREDIT</p>
                   <p className="text-3xl font-black text-slate-400 tracking-tighter italic">₹{parseFloat(accountBalance.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className={`border-4 p-6 rounded-2xl text-center ${
                   parseFloat(accountBalance.running_balance) >= 0 ? 'border-black bg-slate-50' : 'border-red-600'
                }`}>
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">SETTLEMENT NET</p>
                   <p className={`text-3xl font-black tracking-tighter italic ${
                      parseFloat(accountBalance.running_balance) >= 0 ? 'text-black' : 'text-red-700'
                   }`}>
                      ₹{Math.abs(parseFloat(accountBalance.running_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span className="text-[10px] block mt-1 tracking-widest uppercase opacity-40">{parseFloat(accountBalance.running_balance) >= 0 ? '(DUE)' : '(ADVANCE)'}</span>
                   </p>
                </div>
              </div>

              <table className="w-full text-[11px] border-collapse mb-10">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase tracking-widest font-black">
                    <th className="p-4 text-left border-black">Timeline</th>
                    <th className="p-4 text-left border-black">Doc Ref</th>
                    <th className="p-4 text-left border-black">Nomenclature</th>
                    <th className="p-4 text-right border-black">Debit (₹)</th>
                    <th className="p-4 text-right border-black">Credit (₹)</th>
                    <th className="p-4 text-right border-black">Position (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100">
                  {ledgerEntries.map((entry, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="p-4 font-mono font-bold text-slate-500">{new Date(entry.transaction_date).toLocaleDateString('en-GB')}</td>
                      <td className="p-4 font-black italic text-slate-300 uppercase">{entry.reference_no}</td>
                      <td className="p-4 font-black text-black uppercase tracking-tight">{entry.description}</td>
                      <td className="p-4 text-right font-black italic text-black">
                        {parseFloat(entry.debit || 0) > 0 ? parseFloat(entry.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-400">
                        {parseFloat(entry.credit || 0) > 0 ? parseFloat(entry.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className={`p-4 text-right font-black italic text-sm ${
                        parseFloat(entry.running_balance) >= 0 ? 'text-black' : 'text-red-700 underline decoration-red-100 decoration-4'
                      }`}>
                        {parseFloat(entry.running_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-center font-black text-[10px] text-slate-200 uppercase tracking-[0.6em] mt-16 pt-10 border-t-2 border-slate-50 italic">
                End of Fiscal Document — Verification Required for Settlements
              </div>
            </div>

            <div className="bg-slate-900 p-8 border-t border-black flex justify-between items-center">
              <button
                onClick={handlePrintPage}
                className="px-12 py-4 bg-white text-black hover:bg-slate-100 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl transition-all active:scale-95 flex items-center gap-3"
              >
                <Printer size={20} strokeWidth={3} /> Execute Print
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-8 py-4 bg-red-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
              >
                Abort Deployment
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Dynamic Master Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 1cm; size: auto; }
          body { background-color: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          #printable-area { width: 100% !important; padding: 0 !important; }
          .bg-slate-900, .bg-black { background-color: #000 !important; color: #fff !important; }
          .bg-slate-50, .bg-slate-100, .bg-slate-200 { background-color: #f1f5f9 !important; }
          .border-slate-100, .border-slate-200, .border-slate-300, .border-slate-400, .border-slate-800 { border-color: #ddd !important; }
          .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; }
        }
      `}} />
    </div>
  );
}
