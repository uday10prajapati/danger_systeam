import React, { useState, useEffect } from 'react';
import {
  Search, Download, Filter, FileText,
  Database, RefreshCcw, Layout, Users,
  TrendingUp, TrendingDown, ShieldCheck,
  Printer, X, Hash, User, Activity
} from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

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

  const handlePrint = () => {
    window.print();
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="text-center font-black uppercase tracking-widest text-slate-300">
          <p className="text-xs mb-6 italic tracking-[0.4em]">Establishing Sabhasad Connectivity...</p>
          <div className="w-24 h-1 bg-slate-100 mx-auto overflow-hidden rounded-full relative">
            <div className="absolute top-0 left-0 w-1/2 h-full bg-indigo-600 animate-[slide_1.5s_infinite]"></div>
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-10 gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1 italic">
              <Users size={12} className="text-indigo-500" />
              <span>Entity Analysis / Sabhasad Ledger Summary</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Member <span className="text-indigo-600 italic">Balance Shard</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handlePrint}
              className="px-8 py-3.5 bg-white border border-slate-100 text-slate-600 rounded-lg hover:text-indigo-600 hover:border-indigo-100 transition-all font-black uppercase text-[10px] tracking-widest shadow-sm active:scale-95 flex items-center gap-2"
            >
              <Printer size={16} /> Audit Print
            </button>
            <button
              onClick={fetchReportData}
              className="px-10 py-3.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 active:scale-95 flex items-center gap-2"
            >
              <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> Sync Report
            </button>
          </div>
        </div>

        {/* Intelligence Control Shard - Modern Dual Field Search */}
        <div className="bg-white p-8 md:p-10 rounded-lg border border-slate-50 shadow-sm mb-10 print:hidden relative">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

            {/* Temporal Selection - col-span-3 */}
            <div className="md:col-span-3 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">Start Epoch</span>
                <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-lg outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100/50 transition-all font-mono text-[10px] font-black text-slate-700" />
              </div>
              <div className="space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">End Epoch</span>
                <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-lg outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100/50 transition-all font-mono text-[10px] font-black text-slate-700" />
              </div>
            </div>

            {/* Account Search Shard - col-span-3 */}
            <div className="md:col-span-3 relative space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Nomenclature Registry</span>
                <span className="text-[8px] font-black text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">Sub-Ledger Only</span>
              </div>
              <div className="relative group">
                <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="text"
                  value={accCode}
                  onChange={(e) => { setAccCode(e.target.value); setShowAccDrop(true); }}
                  onFocus={() => { setShowAccDrop(true); setShowMemDrop(false); }}
                  placeholder="ACC_ID"
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-none rounded-lg outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100/50 transition-all font-black text-[10px] uppercase italic text-slate-700"
                />
              </div>

              {showAccDrop && (
                <div className="absolute top-[85px] left-0 right-0 bg-white/95 backdrop-blur-xl border border-indigo-50 shadow-2xl rounded-lg overflow-hidden z-[100] animate-in zoom-in-95">
                  <div className="p-3 bg-slate-50/50 flex justify-between items-center border-b border-slate-50"><span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Account Registry Match</span><X size={12} className="cursor-pointer text-slate-300 hover:text-rose-500" onClick={() => setShowAccDrop(false)} /></div>
                  <div className="max-h-48 overflow-y-auto">
                    <div onClick={() => handleSelectAcc(null)} className="px-6 py-3.5 hover:bg-slate-50 cursor-pointer font-black text-[10px] text-indigo-600 italic uppercase">-- ALL_REGISTRY_ACCOUNTS --</div>
                    {filteredAccs.map(a => (
                      <div key={a.id} onClick={() => handleSelectAcc(a)} className="px-6 py-3.5 hover:bg-indigo-50/50 flex justify-between items-center cursor-pointer border-b border-slate-50 last:border-none group">
                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-indigo-600 uppercase transition-colors">{a.account_name}</span>
                        <span className="text-[9px] font-black text-slate-200 group-hover:text-indigo-400">#{a.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Member Search Shard - col-span-4 */}
            <div className="md:col-span-4 relative space-y-2">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">Sabhasad Identity Nomenclature</span>
              <div className="flex gap-2">
                <div className="w-28 relative group">
                  <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600" />
                  <input
                    type="text"
                    value={memCode}
                    onChange={(e) => { setMemCode(e.target.value); setShowMemDrop(true); }}
                    onFocus={() => { setShowMemDrop(true); setShowAccDrop(false); }}
                    placeholder="ID"
                    className="w-full pl-10 pr-2 py-3.5 bg-slate-50 border-none rounded-lg outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100/50 transition-all font-black text-[10px] text-slate-700"
                  />
                </div>
                <div className="flex-1 relative group">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600" />
                  <input
                    type="text"
                    value={memName}
                    onChange={(e) => { setMemName(e.target.value); setShowMemDrop(true); }}
                    onFocus={() => { setShowMemDrop(true); setShowAccDrop(false); }}
                    placeholder="SEARCH_IDENTITY..."
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-none rounded-lg outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100/50 transition-all font-black text-[10px] uppercase text-slate-700"
                  />
                </div>
              </div>

              {showMemDrop && (
                <div className="absolute top-[85px] left-0 right-0 bg-white/95 backdrop-blur-xl border border-indigo-50 shadow-2xl rounded-lg overflow-hidden z-[100] animate-in zoom-in-95">
                  <div className="p-3 bg-slate-50/50 flex justify-between items-center border-b border-slate-50"><span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Sabhasad Registry Match</span><X size={12} className="cursor-pointer text-slate-300 hover:text-rose-500" onClick={() => setShowMemDrop(false)} /></div>
                  <div className="max-h-56 overflow-y-auto">
                    <div onClick={() => handleSelectMem(null)} className="px-6 py-3.5 hover:bg-slate-50 cursor-pointer font-black text-[10px] text-indigo-600 italic uppercase">-- ALL_REGISTERED_MEMBERS --</div>
                    {filteredMems.map(m => (
                      <div key={m.id} onClick={() => handleSelectMem(m)} className="px-6 py-3.5 hover:bg-indigo-50/50 flex justify-between items-center cursor-pointer border-b border-slate-50 last:border-none group">
                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-indigo-600 uppercase transition-colors">{m.member_name}</span>
                        <span className="text-[9px] font-black text-slate-200 group-hover:text-indigo-400">#{m.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Suppress Zero - col-span-2 */}
            <div className="md:col-span-2 flex items-center h-[52px] xl:pl-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm ${hideZeroBalance ? 'bg-indigo-600 border-indigo-600 ring-4 ring-indigo-50' : 'bg-white border-slate-100 hover:border-indigo-100'}`}>
                  <input type="checkbox" checked={hideZeroBalance} onChange={(e) => setHideZeroBalance(e.target.checked)} className="hidden" />
                  {hideZeroBalance && <Activity size={14} className="text-white" strokeWidth={3} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors italic leading-none">Suppress</span>
                  <span className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em] group-hover:text-slate-500 transition-colors leading-none mt-1">Zero Balance</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Dynamic Metric Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 print:hidden">
          {[
            { label: 'Baseline Exposure (Opening)', val: totals.opening_balance, icon: <Layout size={18} />, color: 'blue' },
            { label: 'Aggregate Debit Node', val: totals.debit, icon: <TrendingUp size={18} />, color: 'indigo' },
            { label: 'Aggregate Credit Node', val: totals.credit, icon: <TrendingDown size={18} />, color: 'amber' },
            { label: 'Net Liquidity Position', val: totals.closing_balance, icon: <ShieldCheck size={18} />, color: 'emerald', special: true }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-lg border border-slate-50 shadow-sm relative group hover:border-indigo-100 transition-all">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg group-hover:scale-110 transition-transform`}>{stat.icon}</div>
              </div>
              <p className={`text-2xl font-bold tracking-tighter ${stat.special ? 'text-emerald-600' : 'text-slate-800'}`}>
                {(i === 0 || i === 3) 
                  ? `₹${Math.abs(stat.val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(stat.val || 0) >= 0 ? 'C' : 'D'}`
                  : `₹${parseFloat(stat.val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
              </p>
            </div>
          ))}
        </div>

        {/* Operational Canvas */}
        <div className="bg-white rounded-[4rem] border border-slate-50 shadow-sm overflow-hidden flex flex-col min-h-[600px] relative">
          <div className="p-10 border-b border-slate-50 text-center relative overflow-hidden bg-[#F8FAFC]/30">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 opacity-20"></div>
            <div className="relative z-10 space-y-3">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] italic">Sabhasad Ledger Report Manifesto</p>
              <h2 className="text-4xl font-bold text-slate-900 tracking-tighter uppercase italic">{company.company_name}</h2>
              <div className="h-1 w-24 bg-indigo-600/20 mx-auto rounded-full"></div>
            </div>
          </div>

          <div className="overflow-x-auto scroller-airy">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC]">
                <tr className="uppercase tracking-widest font-black text-slate-400 text-[10px]">
                  <th className="px-10 py-6 border-r border-slate-50/50">Epoch_ID</th>
                  <th className="px-10 py-6 border-r border-slate-50/50">Code</th>
                  <th className="px-10 py-6 min-w-[250px] border-r border-slate-50/50">Sabhasad Nomenclature</th>

                  {(() => {
                    if (isDangar) {
                      return (
                        <>
                          <th className="px-10 py-6 text-indigo-500 border-r border-slate-50/50 italic">Date</th>
                          <th className="px-10 py-6 text-right text-indigo-500 border-r border-slate-50/50 italic">Purches Rate</th>
                          <th className="px-10 py-6 text-indigo-500 border-r border-slate-50/50 italic">Item Name</th>
                          <th className="px-10 py-6 text-indigo-500 border-r border-slate-50/50 italic">Danger Class</th>
                          <th className="px-10 py-6 text-indigo-500 border-r border-slate-50/50 italic">Bought Season</th>
                          <th className="px-10 py-6 text-right text-indigo-500 border-r border-slate-50/50 italic uppercase">Total Qty (Qt)</th>
                          <th className="px-10 py-6 text-right text-emerald-500 border-r border-slate-50/50 italic uppercase">Total Rate</th>
                        </>
                      );
                    }
                    if (isInterest) {
                      return (
                        <>
                          <th className="px-10 py-6 text-indigo-500 border-r border-slate-50/50 italic">Accrual Date</th>
                          <th className="px-10 py-6 text-right text-indigo-500 border-r border-slate-50/50 italic">Interest Rate (%)</th>
                          <th className="px-10 py-6 text-indigo-500 border-r border-slate-50/50 italic">Days</th>
                          <th className="px-10 py-6 min-w-[200px] border-r border-slate-50/50 italic">Reference Transaction</th>
                          <th className="px-10 py-6 text-right text-emerald-500 border-r border-slate-50/50 italic uppercase">Interest Amount</th>
                        </>
                      );
                    }
                    if (isBrokerage) {
                      return (
                        <>
                          <th className="px-10 py-6 text-indigo-500 border-r border-slate-50/50 italic">Date</th>
                          <th className="px-10 py-6 text-indigo-500 border-r border-slate-50/50 italic">Invoice No</th>
                          <th className="px-10 py-6 min-w-[200px] border-r border-slate-50/50 italic">Description</th>
                          <th className="px-10 py-6 text-right text-emerald-500 border-r border-slate-50/50 italic uppercase">Brokerage Amount</th>
                        </>
                      );
                    }
                    if (isLabour) {
                      return (
                        <>
                          <th className="px-10 py-6 text-indigo-500 border-r border-slate-50/50 italic">Date</th>
                          <th className="px-10 py-6 text-indigo-500 border-r border-slate-50/50 italic">Invoice No</th>
                          <th className="px-10 py-6 min-w-[200px] border-r border-slate-50/50 italic">Description</th>
                          <th className="px-10 py-6 text-right text-emerald-500 border-r border-slate-50/50 italic uppercase">Labour Amount</th>
                        </>
                      );
                    }
                    return (
                      <>
                        <th className="px-10 py-6 min-w-[200px] border-r border-slate-50/50">Nomenclature Account</th>
                        <th className="px-10 py-6 text-indigo-500 border-r border-slate-50/50 italic">Date</th>
                        <th className="px-10 py-6 text-right text-indigo-500 border-r border-slate-50/50">Debit (+)</th>
                        <th className="px-10 py-6 text-right text-amber-500 border-r border-slate-50/50">Credit (-)</th>
                        <th className="px-10 py-6 text-right border-r border-slate-50/50">Close Pos</th>
                        {!hideBardan && (
                          <>
                            <th className="px-10 py-6 text-right border-r border-slate-50/50 text-indigo-400">Bardan Bal</th>
                            <th className="px-10 py-6 text-right border-r border-slate-50/50 text-emerald-400">Self Jama</th>
                            <th className="px-10 py-6 text-right border-r border-slate-50/50 text-blue-400">Bardan Amt</th>
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
                      <RefreshCcw size={48} className="animate-spin text-indigo-100 mx-auto mb-6" />
                      <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest italic">Decrypting Member Registry Shards...</p>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-32 text-center text-slate-200 font-black uppercase text-[10px] tracking-[0.4em] italic bg-slate-50/30">
                      <Database size={56} className="mx-auto mb-4 opacity-50" strokeWidth={1} />
                      Void Detection: No Entities Found
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.map((row, idx) => (
                      <tr key={idx} className="group hover:bg-indigo-50/30 transition-all duration-300">
                        <td className="px-10 py-5 text-[11px] font-bold text-slate-300 font-mono tracking-tighter">{String(idx + 1).padStart(3, '0')}</td>
                        <td className="px-10 py-5 text-[11px] font-black text-indigo-400 group-hover:text-indigo-600 transition-colors italic">{row.member_code}</td>
                        <td className="px-10 py-5 text-sm font-bold text-slate-800 uppercase italic tracking-tight">{row.member_name}</td>

                        {(() => {
                          if (isDangar) {
                            return (
                              <>
                                <td className="px-10 py-5 text-[10px] font-bold text-slate-400 border-r border-slate-50/50 italic">{new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
                                <td className="px-10 py-5 text-right font-bold text-indigo-600">₹{parseFloat(row.rate || 0).toLocaleString('en-IN')}</td>
                                <td className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase italic tracking-widest">{row.item_name || 'Generic Dangar'}</td>
                                <td className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{row.quality_class || '1st'}</td>
                                <td className="px-10 py-5 text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em]">{row.book_type || 'Season'}</td>
                                <td className="px-10 py-5 text-right font-black text-indigo-600 italic underline underline-offset-8 decoration-indigo-100 decoration-2">{parseFloat(row.net_quintal || 0).toFixed(2)} <span className="text-[8px] opacity-50 not-italic ml-1">Qt</span></td>
                                <td className="px-10 py-5 text-right font-black text-emerald-600 text-sm italic">₹{parseFloat(row.amount || 0).toLocaleString('en-IN')} C</td>
                              </>
                            );
                          }
                          if (isInterest) {
                            return (
                              <>
                                <td className="px-10 py-5 text-[10px] font-bold text-slate-400 border-r border-slate-50/50 italic">{new Date(row.transaction_date).toLocaleDateString('en-GB')}</td>
                                <td className="px-10 py-5 text-right font-bold text-indigo-600">{parseFloat(row.interest_percent || 0).toFixed(2)} %</td>
                                <td className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase italic tracking-widest">{row.days || 0} Days</td>
                                <td className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-tight">{row.description || 'Interest Accrual'}</td>
                                <td className="px-10 py-5 text-right font-black text-emerald-600 text-sm italic">₹{parseFloat(row.interest_amount || 0).toLocaleString('en-IN')} D</td>
                              </>
                            );
                          }
                          if (isBrokerage) {
                            return (
                              <>
                                <td className="px-10 py-5 text-[10px] font-bold text-slate-400 border-r border-slate-50/50 italic">{new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
                                <td className="px-10 py-5 text-[10px] font-black text-indigo-400 italic tracking-tight">{row.invoice_no}</td>
                                <td className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-tight">{row.description}</td>
                                <td className="px-10 py-5 text-right font-black text-emerald-600 text-sm italic">₹{parseFloat(row.amount || 0).toLocaleString('en-IN')} D</td>
                              </>
                            );
                          }
                          if (isLabour) {
                            return (
                              <>
                                <td className="px-10 py-5 text-[10px] font-bold text-slate-400 border-r border-slate-50/50 italic">{new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
                                <td className="px-10 py-5 text-[10px] font-black text-indigo-400 italic tracking-tight">{row.invoice_no}</td>
                                <td className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-tight">{row.description}</td>
                                <td className="px-10 py-5 text-right font-black text-emerald-600 text-sm italic">₹{parseFloat(row.amount || 0).toLocaleString('en-IN')} D</td>
                              </>
                            );
                          }
                          return (
                            <>
                              <td className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{row.account_name}</td>
                              <td className="px-10 py-5 text-[10px] font-bold text-slate-400 border-r border-slate-50/50 italic">
                                {row.last_activity_date ? new Date(row.last_activity_date).toLocaleDateString('en-GB') : '-'}
                              </td>
                              <td className="px-10 py-5 text-right font-black text-indigo-600 italic">₹{parseFloat(row.debit || 0).toLocaleString('en-IN')}</td>
                              <td className="px-10 py-5 text-right font-black text-amber-500 italic">₹{parseFloat(row.credit || 0).toLocaleString('en-IN')}</td>
                              <td className={`px-10 py-5 text-right font-black text-sm italic underline underline-offset-8 decoration-4 ${parseFloat(row.closing_balance || 0) >= 0 ? 'text-emerald-600 decoration-emerald-50' : 'text-rose-600 decoration-rose-50'
                                }`}>
                                ₹{Math.abs(parseFloat(row.closing_balance || 0)).toLocaleString('en-IN')} {parseFloat(row.closing_balance || 0) >= 0 ? 'C' : 'D'}
                              </td>
                              {!hideBardan && (
                                <>
                                  <td className={`px-10 py-5 text-right font-black text-sm italic ${parseFloat(row.bardan_balance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {Math.abs(parseFloat(row.bardan_balance || 0)).toLocaleString()} {parseFloat(row.bardan_balance || 0) >= 0 ? 'D' : 'C'}
                                  </td>
                                  <td className="px-10 py-5 text-right font-black text-sm italic text-emerald-500">
                                    {parseFloat(row.bardan_self_jama || 0).toLocaleString()}
                                  </td>
                                  <td className="px-10 py-5 text-right font-black text-sm italic text-blue-600">
                                    ₹{Math.abs(parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {parseFloat(row.bardan_penalty_balance || row.bardan_balance || 0) >= 0 ? 'D' : 'C'}
                                  </td>
                                </>
                              )}
                            </>
                          );
                        })()}
                        <td className="px-10 py-5 text-center">
                          <button
                            onClick={() => openAudit(row)}
                            className="p-3 bg-white border border-slate-100 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm group-hover:scale-110 active:scale-95"
                          >
                            <Activity size={16} strokeWidth={3} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 text-white font-black italic">
                      <td colSpan="4" className="px-10 py-8 text-xs tracking-[0.4em] uppercase text-indigo-400 font-black">Master Integrity Summary</td>

                      {(() => {
                        if (isDangar) {
                          return (
                            <>
                              <td className="px-10 py-8 text-right text-slate-500 font-mono italic text-[10px] tracking-widest uppercase">Registry Aggregates</td>
                              <td colSpan="2" className="px-10 py-8 text-right text-lg tracking-tighter text-indigo-400 border-r border-slate-700/50">
                                {data.reduce((acc, r) => acc + parseFloat(r.net_quintal || 0), 0).toFixed(2)} <span className="text-xs opacity-50 ml-1">Qt</span>
                              </td>
                              <td colSpan="1" className="px-10 py-8 text-right text-lg tracking-tighter text-emerald-400">
                                ₹{data.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0).toLocaleString('en-IN')}
                              </td>
                            </>
                          );
                        }
                        if (isInterest) {
                          return (
                            <>
                              <td className="px-10 py-8 text-right text-slate-500 font-mono italic text-[10px] tracking-widest uppercase">Interest Aggregates</td>
                              <td colSpan="3" className="px-10 py-8 text-right text-lg tracking-tighter text-emerald-400 font-black italic">
                                ₹{data.reduce((acc, r) => acc + parseFloat(r.interest_amount || 0), 0).toLocaleString('en-IN')}
                              </td>
                            </>
                          );
                        }
                        if (isBrokerage) {
                          return (
                            <>
                              <td className="px-10 py-8 text-right text-slate-500 font-mono italic text-[10px] tracking-widest uppercase">Brokerage Aggregates</td>
                              <td colSpan="3" className="px-10 py-8 text-right text-lg tracking-tighter text-emerald-400 font-black italic">
                                ₹{data.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0).toLocaleString('en-IN')}
                              </td>
                            </>
                          );
                        }
                        if (isLabour) {
                          return (
                            <>
                              <td className="px-10 py-8 text-right text-slate-500 font-mono italic text-[10px] tracking-widest uppercase">Labour Aggregates</td>
                              <td colSpan="3" className="px-10 py-8 text-right text-lg tracking-tighter text-emerald-400 font-black italic">
                                ₹{data.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0).toLocaleString('en-IN')}
                              </td>
                            </>
                          );
                        }
                        return (
                          <>
                            <td className="px-10 py-8 border-r border-slate-700/50"></td>
                            <td className="px-10 py-8 text-right text-lg tracking-tighter text-indigo-400">₹{parseFloat(totals.debit || 0).toLocaleString('en-IN')}</td>
                            <td className="px-10 py-8 text-right text-lg tracking-tighter text-amber-400">₹{parseFloat(totals.credit || 0).toLocaleString('en-IN')}</td>
                            <td className="px-10 py-8 text-right text-lg tracking-tighter text-emerald-400">₹{Math.abs(parseFloat(totals.closing_balance || 0)).toLocaleString('en-IN')} {parseFloat(totals.closing_balance || 0) >= 0 ? 'C' : 'D'}</td>
                            {!hideBardan && (
                              <>
                                <td className="px-10 py-8 text-right text-lg tracking-tighter text-rose-400">
                                  {Math.abs(data.reduce((s, r) => s + parseFloat(r.bardan_balance || 0), 0)).toLocaleString()} {data.reduce((s, r) => s + parseFloat(r.bardan_balance || 0), 0) >= 0 ? 'D' : 'C'}
                                </td>
                                <td className="px-10 py-8 text-right text-lg tracking-tighter text-emerald-400">
                                  {data.reduce((s, r) => s + parseFloat(r.bardan_self_jama || 0), 0).toLocaleString()}
                                </td>
                                <td className="px-10 py-8 text-right text-lg tracking-tighter text-blue-400">
                                  ₹{Math.abs(data.reduce((s, r) => s + (parseFloat(r.bardan_penalty_balance || r.bardan_balance || 0) * bardanPrice), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {data.reduce((s, r) => s + parseFloat(r.bardan_penalty_balance || r.bardan_balance || 0), 0) >= 0 ? 'D' : 'C'}
                                </td>
                              </>
                            )}
                          </>
                        );
                      })()}
                      <td></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-auto p-12 bg-slate-50/50 flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em] italic border-t border-slate-50">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg shadow-sm"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div> SHARDS: {data.length}</span>
            </div>
            <div className="flex items-center gap-4">
              <span>SYSTEM_DATE: {new Date().toLocaleDateString()}</span>
              <div className="w-px h-3 bg-slate-200"></div>
              <span>CRC_VERIFIED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Detailed Modal */}
      {showAuditModal && auditMember && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 text-white p-8 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-3 text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 italic">
                  <Activity size={12} /> Detailed Transaction Analysis
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tight">{auditMember.member_name} <span className="text-slate-500 ml-2">#{auditMember.member_code}</span></h2>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-rose-600 rounded-2xl transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 max-h-[70vh] overflow-y-auto scroller-airy bg-slate-50/50">
              {auditLoading ? (
                <div className="py-20 text-center"><RefreshCcw className="animate-spin mx-auto text-indigo-200 mb-4" size={40} /><p className="font-black uppercase text-[10px] tracking-widest text-slate-300">Retrieving Ledger Shards...</p></div>
              ) : auditTransactions.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200"><p className="font-black uppercase text-[10px] tracking-widest text-slate-300">No Transactions Identified in this Period</p></div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
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
                    <tbody className="divide-y divide-slate-50 font-bold text-xs uppercase">
                      {auditTransactions.map((tx, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-slate-400 font-mono italic">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-slate-800 tracking-tight">{tx.description}</td>
                          <td className="px-6 py-4 text-slate-300 text-[10px]">{tx.reference_no}</td>
                          <td className="px-6 py-4 text-right text-indigo-600 font-black">₹{(parseFloat(tx.debit) || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right text-amber-500 font-black">{parseFloat(tx.company_credit || 0) > 0 ? `₹${parseFloat(tx.company_credit).toLocaleString()}` : '—'}</td>
                          <td className="px-6 py-4 text-right text-emerald-500 font-black">{parseFloat(tx.self_credit || 0) > 0 ? parseFloat(tx.self_credit).toLocaleString() : '—'}</td>
                          <td className={`px-6 py-4 text-right font-black italic ${parseFloat(tx.running_balance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                            ₹{Math.abs(parseFloat(tx.running_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            <span className="text-[8px] ml-1 opacity-50 uppercase not-italic">
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
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
              <button onClick={() => setShowAuditModal(false)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-slate-200">Close Audit Shard</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page { margin: 1cm; size: landscape; }
          body { background: white; margin: 0; padding: 0; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .bg-slate-900 { background: #000 !important; color: #fff !important; }
          table { width: 100%; border-collapse: collapse; font-family: monospace !important; border: 1px solid #000; }
          th, td { border: 1px solid #000 !important; font-size: 9px; padding: 4px !important; }
          .text-indigo-600, .text-emerald-600, .text-rose-600, .text-amber-500 { color: #000 !important; }
        }
        .scroller-airy::-webkit-scrollbar { width: 4px; }
        .scroller-airy::-webkit-scrollbar-track { background: transparent; }
        .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
    </div>
  );
}
