import React, { useState, useEffect } from 'react';
import {
  Search, Download, Filter, FileText,
  Database, RefreshCcw, Layout, Users,
  TrendingUp, TrendingDown, ShieldCheck,
  Printer, X, Hash, User, Activity, Clock
} from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';

export default function SabhasadLedgerSummary() {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({ opening_balance: 0, debit: 0, credit: 0, closing_balance: 0 });
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);
  const [bardanPrice, setBardanPrice] = useState(0);

  // Filters
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [accountId, setAccountId] = useState('all');
  const [memberId, setMemberId] = useState('all');
  const [hideZeroBalance, setHideZeroBalance] = useState(false);

  // Audit Modal States
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditMember, setAuditMember] = useState(null);
  const [auditTransactions, setAuditTransactions] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Search/Auto-Fetch States
  const [accCode, setAccCode] = useState('');
  const [accName, setAccName] = useState('');
  const [showAccDrop, setShowAccDrop] = useState(false);

  const [memCode, setMemCode] = useState('');
  const [memName, setMemName] = useState('');
  const [showMemDrop, setShowMemDrop] = useState(false);

  // Dropdown lists
  const [accounts, setAccounts] = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const response = await axios.get('/api/company');
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
      fetchBardanPrice();
    }
  }, [company]);

  const fetchBardanPrice = async () => {
    try {
      const response = await axios.get('/api/bardan-price', {
        headers: { 'x-company-id': company.id }
      });
      if (response.data.success && response.data.data) {
        setBardanPrice(parseFloat(response.data.data.price_per_bardan || 0));
      }
    } catch (error) {
      console.error('Failed to load bardan price', error);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const accRes = await axios.get(`/api/accounts/company/${company.id}`, {
        headers: { 'x-company-id': company.id }
      });
      if (accRes.data.success) {
        const filteredAccounts = accRes.data.data.filter(a =>
          !a.account_name.toLowerCase().includes('brokerage') &&
          !a.account_name.toLowerCase().includes('labour') &&
          !a.account_name.toLowerCase().includes('rounding')
        );
        setAccounts(filteredAccounts);
      }

      const memRes = await axios.get(`/api/members/company/${company.id}`, {
        headers: { 'x-company-id': company.id }
      });
      if (memRes.data.success) {
        setMembers(memRes.data.data);
      }

      fetchReportData();
    } catch (error) {
      console.error('Failed to load dropdowns', error);
    }
  };

  const fetchReportData = async () => {
    if (!company?.id) return;

    setLoading(true);
    try {
      const response = await axios.get(`/api/sabhasad-ledger-summary`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          accountId,
          memberId,
          hideZeroBalance
        },
        headers: { 'x-company-id': company.id }
      });

      if (response.data.success) {
        setData(response.data.data);
        setTotals(response.data.totals);
      }
    } catch (error) {
      console.error('Fetch report error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAudit = async (mem) => {
    setAuditMember(mem);
    setShowAuditModal(true);
    setAuditLoading(true);
    try {
      const response = await axios.get(`/api/account-ledger`, {
        params: {
          memberId: mem.member_id,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          accountId: accountId !== 'all' ? accountId : undefined
        },
        headers: { 'x-company-id': company.id }
      });
      if (response.data.success) {
        setAuditTransactions(response.data.data);
      }
    } catch (error) {
      console.error('Audit fetch error:', error);
    } finally {
      setAuditLoading(false);
    }
  };

  const clearFilters = () => {
    setAccountId('all');
    setAccCode('');
    setAccName('');
    setMemberId('all');
    setMemCode('');
    setMemName('');
    setHideZeroBalance(false);
    setDateRange({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
  };

  // Selection Handlers
  const handleSelectAcc = (acc) => {
    setAccountId(acc?.id || 'all');
    setAccCode(acc ? String(acc.id) : '');
    setAccName(acc ? acc.account_name : 'ALL ACCOUNTS');
    setShowAccDrop(false);
  };

  const handleSelectMem = (mem) => {
    setMemberId(mem?.id || 'all');
    setMemCode(mem ? String(mem.id) : '');
    setMemName(mem ? mem.member_name : 'ALL MEMBERS');
    setShowMemDrop(false);
  };

  // Auto-Fetch Effects
  useEffect(() => {
    if (accCode && accountId === 'all') {
      const match = accounts.find(a => String(a.id) === accCode && a.is_subledger);
      if (match) handleSelectAcc(match);
    } else if (!accCode && accountId !== 'all') {
      handleSelectAcc(null);
    }
  }, [accCode]);

  useEffect(() => {
    if (memCode && memberId === 'all') {
      const match = members.find(m => String(m.id) === memCode);
      if (match) handleSelectMem(match);
    } else if (!memCode && memberId !== 'all') {
      handleSelectMem(null);
    }
  }, [memCode]);

  useEffect(() => {
    if (company?.id) {
      fetchReportData();
    }
  }, [dateRange.startDate, dateRange.endDate, accountId, memberId, hideZeroBalance]);

  const systemAccountNames = [
    'Brokerage Khate', 'Dangar Purchase', 'Dangar Sale',
    'Bardan System', 'Dangar System', 'Interest Khate',
    'Labour Khate', 'Rounding Khate'
  ];

  const filteredAccs = accounts.filter(a => {
    const isSystemAcc = systemAccountNames.some(name =>
      a.account_name.toLowerCase().includes(name.toLowerCase())
    );

    return (a.is_subledger || isSystemAcc) &&
      (accCode ? String(a.id).includes(accCode) : true) &&
      (accName ? a.account_name.toLowerCase().includes(accName.toLowerCase()) : true);
  });

  const filteredMems = members.filter(m =>
    (memCode ? String(m.id).includes(memCode) : true) &&
    (memName ? m.member_name.toLowerCase().includes(memName.toLowerCase()) : true)
  );



  if (!company) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="text-center font-black uppercase tracking-widest text-slate-300">
          <p className="text-xs mb-6 italic tracking-[0.4em]">Establishing Sabhasad Connectivity...</p>
          <div className="w-24 h-1 bg-slate-100 mx-auto overflow-hidden rounded-full relative">
            <div className="absolute top-0 left-0 w-1/2 h-full bg-blue-600 animate-[slide_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  const selectedAcc = accounts.find(a => a.id === parseInt(accountId));
  const isDangar = selectedAcc?.account_code === 'DS0001' ||
    selectedAcc?.account_name?.toLowerCase().includes('dangar system') ||
    accName?.toLowerCase().includes('dangar system');

  const isInterest = selectedAcc?.account_code === 'IK0001' ||
    selectedAcc?.account_name?.toLowerCase().includes('interest khate') ||
    accName?.toLowerCase().includes('interest khate');

  const isBrokerage = selectedAcc?.account_name?.toLowerCase().includes('brokerage') ||
    accName?.toLowerCase().includes('brokerage');

  const isLabour = selectedAcc?.account_name?.toLowerCase().includes('labour') ||
    accName?.toLowerCase().includes('labour');

  const hideBardan = selectedAcc?.account_name?.toLowerCase().includes('member adv') ||
    selectedAcc?.account_name?.toLowerCase().includes('subledger member') ||
    accName?.toLowerCase().includes('member adv') ||
    accName?.toLowerCase().includes('subledger member');

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 font-sans animate-in fade-in duration-700">
      <div className="max-w-[1700px] mx-auto px-8">

        {/* Superior Header */}
        <PageHeader
          eyebrow="Entity Analysis / Sabhasad Ledger Summary"
          eyebrowIcon={<Users size={12} className="text-blue-500" />}
          title="Member Balance Manifest"
          subtitle={`Audit connectivity established for ${company.company_name}`}
        >

          <div className="flex items-center gap-3">
            <button
              onClick={clearFilters}
              className="px-8 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-all font-black uppercase text-[10px] tracking-widest active:scale-95 flex items-center gap-2"
            >
              <X size={16} /> Clear Filter
            </button>
            <button
              onClick={fetchReportData}
              className="px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100 active:scale-95 flex items-center gap-2"
            >
              <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> Sync Report
            </button>
          </div>
        </PageHeader>

        {/* Intelligence Control Console - Modern Dual Field Search */}
        <div className="bg-white p-6 md:p-8 rounded-lg border border-slate-50 shadow-sm mb-4 print:hidden relative mt-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Temporal Selection - col-span-3 */}
            <div className="md:col-span-3 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">Start Epoch</span>
                <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-none rounded-lg outline-none focus:bg-white focus:ring-4 focus:ring-blue-100/50 transition-all font-mono text-[10px] font-black text-slate-700" />
              </div>
              <div className="space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">End Epoch</span>
                <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-none rounded-lg outline-none focus:bg-white focus:ring-4 focus:ring-blue-100/50 transition-all font-mono text-[10px] font-black text-slate-700" />
              </div>
            </div>

            {/* Account Search Isolation - col-span-3 */}
            <div className="md:col-span-3 relative space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Nomenclature Registry</span>
                <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Sub-Ledger Only</span>
              </div>
              <div className="relative group">
                <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="text"
                  value={accCode}
                  onChange={(e) => { setAccCode(e.target.value); setShowAccDrop(true); }}
                  onFocus={() => { setShowAccDrop(true); setShowMemDrop(false); }}
                  placeholder="ACC_ID"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-lg outline-none focus:bg-white focus:ring-4 focus:ring-blue-100/50 transition-all font-black text-[10px] uppercase italic text-slate-700"
                />
              </div>

              {showAccDrop && (
                <div className="absolute top-[75px] left-0 right-0 bg-white/95 backdrop-blur-xl border border-blue-50 shadow-2xl rounded-lg overflow-hidden z-[100] animate-in zoom-in-95">
                  <div className="p-3 bg-slate-50/50 flex justify-between items-center border-b border-slate-50"><span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Account Registry Match</span><X size={12} className="cursor-pointer text-slate-300 hover:text-rose-500" onClick={() => setShowAccDrop(false)} /></div>
                  <div className="max-h-48 overflow-y-auto">
                    <div onClick={() => handleSelectAcc(null)} className="px-6 py-3 hover:bg-slate-50 cursor-pointer font-black text-[10px] text-blue-600 italic uppercase">-- ALL_REGISTRY_ACCOUNTS --</div>
                    {filteredAccs.map(a => (
                      <div key={a.id} onClick={() => handleSelectAcc(a)} className="px-6 py-3 hover:bg-blue-50/50 flex justify-between items-center cursor-pointer border-b border-slate-50 last:border-none group">
                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-600 uppercase transition-colors">{a.account_name}</span>
                        <span className="text-[9px] font-black text-slate-200 group-hover:text-blue-400">#{a.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Member Search Isolation - col-span-4 */}
            <div className="md:col-span-4 relative space-y-2">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">Sabhasad Identity Nomenclature</span>
              <div className="flex gap-2">
                <div className="w-28 relative group">
                  <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600" />
                  <input
                    type="text"
                    value={memCode}
                    onChange={(e) => { setMemCode(e.target.value); setShowMemDrop(true); }}
                    onFocus={() => { setShowMemDrop(true); setShowAccDrop(false); }}
                    placeholder="ID"
                    className="w-full pl-10 pr-2 py-3 bg-slate-50 border-none rounded-lg outline-none focus:bg-white focus:ring-4 focus:ring-blue-100/50 transition-all font-black text-[10px] text-slate-700"
                  />
                </div>
                <div className="flex-1 relative group">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600" />
                  <input
                    type="text"
                    value={memName}
                    onChange={(e) => { setMemName(e.target.value); setShowMemDrop(true); }}
                    onFocus={() => { setShowMemDrop(true); setShowAccDrop(false); }}
                    placeholder="SEARCH_IDENTITY..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-lg outline-none focus:bg-white focus:ring-4 focus:ring-blue-100/50 transition-all font-black text-[10px] uppercase text-slate-700"
                  />
                </div>
              </div>

              {showMemDrop && (
                <div className="absolute top-[75px] left-0 right-0 bg-white/95 backdrop-blur-xl border border-blue-50 shadow-2xl rounded-lg overflow-hidden z-[100] animate-in zoom-in-95">
                  <div className="p-3 bg-slate-50/50 flex justify-between items-center border-b border-slate-50"><span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Sabhasad Registry Match</span><X size={12} className="cursor-pointer text-slate-300 hover:text-rose-500" onClick={() => setShowMemDrop(false)} /></div>
                  <div className="max-h-56 overflow-y-auto">
                    <div onClick={() => handleSelectMem(null)} className="px-6 py-3 hover:bg-slate-50 cursor-pointer font-black text-[10px] text-blue-600 italic uppercase">-- ALL_REGISTERED_MEMBERS --</div>
                    {filteredMems.map(m => (
                      <div key={m.id} onClick={() => handleSelectMem(m)} className="px-6 py-3 hover:bg-blue-50/50 flex justify-between items-center cursor-pointer border-b border-slate-50 last:border-none group">
                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-600 uppercase transition-colors">{m.member_name}</span>
                        <span className="text-[9px] font-black text-slate-200 group-hover:text-blue-400">#{m.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Suppress Zero - col-span-2 */}
            <div className="md:col-span-2 flex items-center h-[52px] xl:pl-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm ${hideZeroBalance ? 'bg-blue-600 border-blue-600 ring-4 ring-blue-50' : 'bg-white border-slate-100 hover:border-blue-100'}`}>
                  <input type="checkbox" checked={hideZeroBalance} onChange={(e) => setHideZeroBalance(e.target.checked)} className="hidden" />
                  {hideZeroBalance && <Activity size={14} className="text-white" strokeWidth={3} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors italic leading-none">Suppress</span>
                  <span className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em] group-hover:text-slate-500 transition-colors leading-none mt-1">Zero Balance</span>
                </div>
              </label>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setMemCode('');
                  setMemName('');
                  setMemberId('all');
                  setAccountId('all');
                  setAccCode('');
                  setAccName('');
                  setHideZeroBalance(false);
                  setDateRange({
                    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0]
                  });
                }}
                className="h-[52px] bg-white border border-slate-100 text-slate-400 hover:text-rose-600 px-6 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center gap-3"
              >
                <X size={16} /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Summary Metric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 print:hidden">
          {[
            { label: 'Opening Balance', val: totals.opening_balance, icon: <Layout size={18} />, color: 'blue' },
            { label: 'Total Debit (+)', val: totals.debit, icon: <TrendingUp size={18} />, color: 'blue' },
            { label: 'Total Credit (-)', val: totals.credit, icon: <TrendingDown size={18} />, color: 'blue' },
            { label: 'Closing Balance', val: totals.closing_balance, icon: <ShieldCheck size={18} />, color: 'emerald', special: true }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-slate-50 shadow-sm relative group hover:border-blue-100 transition-all">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <div className={`p-2 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg group-hover:scale-110 transition-transform`}>{stat.icon}</div>
              </div>
              <p className={`text-xl font-bold tracking-tight ${stat.special ? 'text-emerald-600' : 'text-slate-800'}`}>
                {(i === 0 || i === 3) 
                  ? `₹${Math.abs(stat.val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(stat.val || 0) >= 0 ? 'D' : 'C'}`
                  : `₹${parseFloat(stat.val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              </p>
            </div>
          ))}
        </div>

        {/* Ledger Registry */}
        <div className="bg-white rounded-lg border border-slate-50 shadow-sm overflow-hidden flex flex-col min-h-[600px] relative">
          <TableHeading
            icon={<Database size={18} />}
            iconColor="blue"
            title="Member Ledger Summary"
            subtitle={company.company_name}
          />

          <div className="overflow-x-auto scroller-airy">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 text-[11px] font-semibold">
                  <th className="px-6 py-4 border-r border-slate-100">Sr No</th>
                  <th className="px-6 py-4 border-r border-slate-100">Code</th>
                  <th className="px-6 py-4 min-w-[200px] border-r border-slate-100">Member Name</th>

                  {(() => {
                    if (isDangar) {
                      return (
                        <>
                          <th className="px-6 py-4 border-r border-slate-100">Date</th>
                          <th className="px-6 py-4 text-right border-r border-slate-100">Purches Rate</th>
                          <th className="px-6 py-4 border-r border-slate-100">Item Name</th>
                          <th className="px-6 py-4 border-r border-slate-100">Class</th>
                          <th className="px-6 py-4 border-r border-slate-100">Season</th>
                          <th className="px-6 py-4 text-right border-r border-slate-100">Total Qty (Qt)</th>
                          <th className="px-6 py-4 text-right border-r border-slate-100">Total Rate</th>
                        </>
                      );
                    }
                    if (isInterest) {
                      return (
                        <>
                          <th className="px-6 py-4 border-r border-slate-100">Accrual Date</th>
                          <th className="px-6 py-4 text-right border-r border-slate-100">Interest Rate (%)</th>
                          <th className="px-6 py-4 border-r border-slate-100">Days</th>
                          <th className="px-6 py-4 min-w-[200px] border-r border-slate-100">Reference</th>
                          <th className="px-6 py-4 text-right border-r border-slate-100">Interest Amount</th>
                        </>
                      );
                    }
                    if (isBrokerage) {
                      return (
                        <>
                          <th className="px-10 py-6 text-blue-500 border-r border-slate-50/50 italic">Date</th>
                          <th className="px-10 py-6 text-blue-500 border-r border-slate-50/50 italic">Invoice No</th>
                          <th className="px-10 py-6 min-w-[200px] border-r border-slate-50/50 italic">Description</th>
                          <th className="px-10 py-6 text-right text-emerald-500 border-r border-slate-50/50 italic uppercase">Brokerage Amount</th>
                        </>
                      );
                    }
                    if (isLabour) {
                      return (
                        <>
                          <th className="px-10 py-6 text-blue-500 border-r border-slate-50/50 italic">Date</th>
                          <th className="px-10 py-6 text-blue-500 border-r border-slate-50/50 italic">Invoice No</th>
                          <th className="px-10 py-6 min-w-[200px] border-r border-slate-50/50 italic">Description</th>
                          <th className="px-10 py-6 text-right text-emerald-500 border-r border-slate-50/50 italic uppercase">Labour Amount</th>
                        </>
                      );
                    }
                    return (
                      <>
                        <th className="px-6 py-4 min-w-[150px] border-r border-slate-100">Account Name</th>
                        <th className="px-6 py-4 border-r border-slate-100">Date</th>
                        <th className="px-6 py-4 text-right border-r border-slate-100">Debit (+)</th>
                        <th className="px-6 py-4 text-right border-r border-slate-100">Credit (-)</th>
                        <th className="px-6 py-4 text-right border-r border-slate-100">Closing</th>
                        {!hideBardan && (
                          <>
                            <th className="px-6 py-4 text-right border-r border-slate-100">Bardan Bal</th>
                            <th className="px-6 py-4 text-right border-r border-slate-100">Self Jama</th>
                            <th className="px-6 py-4 text-right border-r border-slate-100">Bardan Amt</th>
                          </>
                        )}
                      </>
                    );
                  })()}
                  <th className="px-10 py-6 text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-32 text-center">
                      <RefreshCcw size={48} className="animate-spin text-blue-100 mx-auto mb-6" />
                      <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest italic">Loading Ledger Entries...</p>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-32 text-center text-slate-200 font-black uppercase text-[10px] tracking-[0.4em] italic bg-slate-50/30">
                      <Database size={56} className="mx-auto mb-4 opacity-50" strokeWidth={1} />
                      No Records Found
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-[12px] text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-6 py-4 text-[12px] font-semibold text-blue-600">{row.member_code}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">{row.member_name}</td>

                        {(() => {
                          if (isDangar) {
                            return (
                              <>
                                <td className="px-6 py-4 text-[12px] text-slate-500">{new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
                                <td className="px-6 py-4 text-right text-sm font-semibold text-blue-600">₹{parseFloat(row.rate || 0).toLocaleString('en-IN')}</td>
                                <td className="px-6 py-4 text-[12px] text-slate-500 uppercase">{row.item_name || 'Item'}</td>
                                <td className="px-6 py-4 text-[12px] text-slate-500 uppercase">{row.quality_class || '1st'}</td>
                                <td className="px-6 py-4 text-[12px] font-semibold text-amber-600 uppercase">{row.book_type || 'Season'}</td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-indigo-600">{parseFloat(row.net_quintal || 0).toFixed(2)} <span className="text-[10px] font-normal opacity-50 ml-1">Qt</span></td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">₹{parseFloat(row.amount || 0).toLocaleString('en-IN')} C</td>
                              </>
                            );
                          }
                          if (isInterest) {
                            return (
                              <>
                                <td className="px-6 py-4 text-[12px] text-slate-500">{new Date(row.transaction_date).toLocaleDateString('en-GB')}</td>
                                <td className="px-6 py-4 text-right text-sm font-semibold text-blue-600">{parseFloat(row.interest_percent || 0).toFixed(2)} %</td>
                                <td className="px-6 py-4 text-[12px] text-slate-500">{row.days || 0} Days</td>
                                <td className="px-6 py-4 text-[12px] text-slate-500 uppercase">{row.description || 'Interest'}</td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">₹{parseFloat(row.interest_amount || 0).toLocaleString('en-IN')} D</td>
                              </>
                            );
                          }
                          if (isBrokerage) {
                            return (
                              <>
                                <td className="px-6 py-4 text-[12px] text-slate-500">{new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
                                <td className="px-6 py-4 text-[12px] font-semibold text-blue-600">{row.invoice_no}</td>
                                <td className="px-6 py-4 text-[12px] text-slate-500 uppercase">{row.description}</td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">₹{parseFloat(row.amount || 0).toLocaleString('en-IN')} D</td>
                              </>
                            );
                          }
                          if (isLabour) {
                            return (
                              <>
                                <td className="px-6 py-4 text-[12px] text-slate-500">{new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
                                <td className="px-6 py-4 text-[12px] font-semibold text-blue-600">{row.invoice_no}</td>
                                <td className="px-6 py-4 text-[12px] text-slate-500 uppercase">{row.description}</td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">₹{parseFloat(row.amount || 0).toLocaleString('en-IN')} D</td>
                              </>
                            );
                          }
                          return (
                            <>
                              <td className="px-6 py-4 text-[12px] text-slate-500">{row.account_name}</td>
                              <td className="px-6 py-4 text-[12px] text-slate-500">
                                {row.last_activity_date ? new Date(row.last_activity_date).toLocaleDateString('en-GB') : '-'}
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-medium text-slate-700">₹{parseFloat(row.debit || 0).toLocaleString('en-IN')}</td>
                              <td className="px-6 py-4 text-right text-sm font-medium text-slate-700">₹{parseFloat(row.credit || 0).toLocaleString('en-IN')}</td>
                              <td className={`px-6 py-4 text-right text-sm font-bold ${parseFloat(row.closing_balance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                ₹{Math.abs(parseFloat(row.closing_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {parseFloat(row.closing_balance || 0) >= 0 ? 'D' : 'C'}
                              </td>
                              {!hideBardan && (
                                <>
                                  <td className={`px-6 py-4 text-right text-sm font-semibold ${parseFloat(row.bardan_balance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {Math.abs(parseFloat(row.bardan_balance || 0)).toLocaleString()} {parseFloat(row.bardan_balance || 0) >= 0 ? 'D' : 'C'}
                                  </td>
                                  <td className="px-6 py-4 text-right text-sm font-semibold text-emerald-600">
                                    {parseFloat(row.bardan_self_jama || 0).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 text-right text-sm font-semibold text-blue-600">
                                    ₹{Math.abs(parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0) >= 0 ? 'D' : 'C'}
                                  </td>
                                </>
                              )}
                            </>
                          );
                        })()}
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => openAudit(row)}
                            className="p-2 bg-slate-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                          >
                            <Activity size={16} strokeWidth={2} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 border-t border-slate-200 text-slate-900 font-bold">
                      {(() => {
                        if (isDangar) {
                          return (
                            <>
                              <td colSpan="8" className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                                Grand Total Summary
                              </td>
                              <td className="px-6 py-6 text-right text-base font-bold text-blue-600">
                                {data.reduce((acc, r) => acc + parseFloat(r.net_quintal || 0), 0).toFixed(2)} <span className="text-xs font-normal opacity-50 ml-1">Qt</span>
                              </td>
                              <td className="px-6 py-6 text-right text-base font-bold text-emerald-600">
                                ₹{data.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0).toLocaleString('en-IN')}
                              </td>
                            </>
                          );
                        }
                        if (isInterest) {
                          return (
                            <>
                              <td colSpan="7" className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                                Grand Total Summary
                              </td>
                              <td className="px-6 py-6 text-right text-base font-bold text-emerald-600">
                                ₹{data.reduce((acc, r) => acc + parseFloat(r.interest_amount || 0), 0).toLocaleString('en-IN')}
                              </td>
                            </>
                          );
                        }
                        if (isBrokerage || isLabour) {
                          return (
                            <>
                              <td colSpan="6" className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                                Grand Total Summary
                              </td>
                              <td className="px-6 py-6 text-right text-base font-bold text-emerald-600">
                                ₹{data.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0).toLocaleString('en-IN')}
                              </td>
                            </>
                          );
                        }
                        return (
                          <>
                            <td colSpan="5" className="px-6 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                              Grand Total Summary
                            </td>
                            <td className="px-6 py-6 text-right text-base font-bold text-blue-600">₹{parseFloat(totals.debit || 0).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-6 text-right text-base font-bold text-slate-700">₹{parseFloat(totals.credit || 0).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-6 text-right text-base font-bold text-emerald-600">₹{Math.abs(parseFloat(totals.closing_balance || 0)).toLocaleString('en-IN')} {parseFloat(totals.closing_balance || 0) >= 0 ? 'D' : 'C'}</td>
                            {!hideBardan && (
                              <>
                                <td className="px-6 py-6 text-right text-base font-bold text-rose-600">
                                  {Math.abs(data.reduce((s, r) => s + parseFloat(r.bardan_balance || 0), 0)).toLocaleString()} {data.reduce((s, r) => s + parseFloat(r.bardan_balance || 0), 0) >= 0 ? 'D' : 'C'}
                                </td>
                                <td className="px-6 py-6 text-right text-base font-bold text-emerald-600">
                                  {data.reduce((s, r) => s + parseFloat(r.bardan_self_jama || 0), 0).toLocaleString()}
                                </td>
                                <td className="px-6 py-6 text-right text-base font-bold text-blue-600">
                                  ₹{Math.abs(data.reduce((s, r) => s + (parseFloat(r.bardan_penalty_balance || r.bardan_balance || 0) * bardanPrice), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {data.reduce((s, r) => s + parseFloat(r.bardan_penalty_balance || r.bardan_balance || 0), 0) >= 0 ? 'D' : 'C'}
                                </td>
                              </>
                            )}
                          </>
                        );
                      })()}
                      <td className="px-6 py-6"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detailed Transaction Analysis Modal */}
      {showAuditModal && auditMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowAuditModal(false)} />
          
          <div className="relative w-full max-w-6xl bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-slate-200">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-100">
                  <Activity size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-900 leading-none">
                    {auditMember.member_name} 
                    <span className="text-blue-600 ml-3 font-mono not-italic text-lg">#{auditMember.member_code}</span>
                  </h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 italic">Detailed Transaction Analysis • System Audit</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAuditModal(false)} 
                className="p-2 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 scroller-airy bg-white">
              {auditLoading ? (
                <div className="py-32 text-center space-y-4">
                  <RefreshCcw className="animate-spin mx-auto text-blue-500" size={40} strokeWidth={1} />
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Loading Ledger Transactions...</p>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold">
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Description</th>
                        <th className="px-6 py-4">Reference</th>
                        <th className="px-6 py-4 text-right">Debit (+)</th>
                        <th className="px-6 py-4 text-right">Credit (-)</th>
                        <th className="px-6 py-4 text-right">Self Jama</th>
                        <th className="px-6 py-4 text-right">Running</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {auditTransactions.map((tx, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-slate-500 font-mono">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-slate-700">{tx.description}</td>
                          <td className="px-6 py-4 text-slate-400 text-[10px]">{tx.reference_no}</td>
                          <td className="px-6 py-4 text-right text-indigo-600 font-semibold">₹{(parseFloat(tx.debit) || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right text-slate-600 font-semibold">{parseFloat(tx.company_credit || 0) > 0 ? `₹${parseFloat(tx.company_credit).toLocaleString()}` : '—'}</td>
                          <td className="px-6 py-4 text-right text-emerald-600 font-semibold">{parseFloat(tx.self_credit || 0) > 0 ? parseFloat(tx.self_credit).toLocaleString() : '—'}</td>
                          <td className={`px-6 py-4 text-right font-bold ${parseFloat(tx.running_balance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ₹{Math.abs(parseFloat(tx.running_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            <span className="text-[9px] ml-1 opacity-50 uppercase font-normal">
                              {parseFloat(tx.running_balance || 0) >= 0 ? 'C' : 'D'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 bg-[#F8FAFC] border-t border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Status: Verified</span>
              </div>
              <button 
                onClick={() => setShowAuditModal(false)} 
                className="px-8 py-3 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold uppercase text-[10px] tracking-widest hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
