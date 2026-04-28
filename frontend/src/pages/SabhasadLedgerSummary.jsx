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

  // Filters
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [accountId, setAccountId] = useState('all');
  const [memberId, setMemberId] = useState('all');
  const [hideZeroBalance, setHideZeroBalance] = useState(false);

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
    }
  }, [company]);

  const fetchDropdownData = async () => {
    try {
      const accRes = await axios.get(`/api/accounts/company/${company.id}`, {
        headers: { 'x-company-id': company.id }
      });
      if (accRes.data.success) {
        setAccounts(accRes.data.data);
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

  const filteredAccs = accounts.filter(a =>
    a.is_subledger &&
    (accCode ? String(a.id).includes(accCode) : true) &&
    (accName ? a.account_name.toLowerCase().includes(accName.toLowerCase()) : true)
  );

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

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 font-sans animate-in fade-in duration-700">
      <div className="max-w-[1700px] mx-auto px-8">

        {/* Superior Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-10 gap-8 print:hidden">
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
              className="px-8 py-3.5 bg-white border border-slate-100 text-slate-600 rounded-3xl hover:text-indigo-600 hover:border-indigo-100 transition-all font-black uppercase text-[10px] tracking-widest shadow-sm active:scale-95 flex items-center gap-2"
            >
              <Printer size={16} /> Audit Print
            </button>
            <button
              onClick={fetchReportData}
              className="px-10 py-3.5 bg-indigo-600 text-white rounded-3xl hover:bg-indigo-700 transition-all font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 active:scale-95 flex items-center gap-2"
            >
              <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> Sync Report
            </button>
          </div>
        </div>

        {/* Intelligence Control Shard - Modern Dual Field Search */}
        <div className="bg-white p-8 md:p-10 rounded-[3.5rem] border border-slate-50 shadow-sm mb-10 print:hidden relative">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">

            {/* Temporal Selection - col-span-3 */}
            <div className="md:col-span-3 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">Start Epoch</span>
                <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100/50 transition-all font-mono text-[10px] font-black text-slate-700" />
              </div>
              <div className="space-y-2">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">End Epoch</span>
                <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="w-full px-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100/50 transition-all font-mono text-[10px] font-black text-slate-700" />
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
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100/50 transition-all font-black text-[10px] uppercase italic text-slate-700"
                />
              </div>

              {showAccDrop && (
                <div className="absolute top-[85px] left-0 right-0 bg-white/95 backdrop-blur-xl border border-indigo-50 shadow-2xl rounded-3xl overflow-hidden z-[100] animate-in zoom-in-95">
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
                    className="w-full pl-10 pr-2 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100/50 transition-all font-black text-[10px] text-slate-700"
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
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-indigo-100/50 transition-all font-black text-[10px] uppercase text-slate-700"
                  />
                </div>
              </div>

              {showMemDrop && (
                <div className="absolute top-[85px] left-0 right-0 bg-white/95 backdrop-blur-xl border border-indigo-50 shadow-2xl rounded-3xl overflow-hidden z-[100] animate-in zoom-in-95">
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
                <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all shadow-sm ${hideZeroBalance ? 'bg-indigo-600 border-indigo-600 ring-4 ring-indigo-50' : 'bg-white border-slate-100 hover:border-indigo-100'}`}>
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
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm relative group hover:border-indigo-100 transition-all">
              <div className="flex justify-between items-start mb-6">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl group-hover:scale-110 transition-transform`}>{stat.icon}</div>
              </div>
              <p className={`text-2xl font-bold tracking-tighter ${stat.special ? 'text-emerald-600' : 'text-slate-800'}`}>
                ₹{parseFloat(stat.val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                  <th className="px-10 py-6 min-w-[200px] border-r border-slate-50/50">Nomenclature Account</th>
                  <th className="px-10 py-6 text-right border-r border-slate-50/50">Open Pos</th>
                  <th className="px-10 py-6 text-right text-indigo-500 border-r border-slate-50/50">Debit (+)</th>
                  <th className="px-10 py-6 text-right text-amber-500 border-r border-slate-50/50">Credit (-)</th>
                  <th className="px-10 py-6 text-right">Close Pos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-32 text-center">
                      <RefreshCcw size={48} className="animate-spin text-indigo-100 mx-auto mb-6" />
                      <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest italic">Decrypting Member Registry Shards...</p>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-32 text-center text-slate-200 font-black uppercase text-[10px] tracking-[0.4em] italic bg-slate-50/30">
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
                        <td className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{row.account_name}</td>
                        <td className="px-10 py-5 text-right font-bold text-slate-400 italic">₹{parseFloat(row.opening_balance).toLocaleString('en-IN')}</td>
                        <td className="px-10 py-5 text-right font-black text-indigo-600 italic">₹{parseFloat(row.debit).toLocaleString('en-IN')}</td>
                        <td className="px-10 py-5 text-right font-black text-amber-500 italic">₹{parseFloat(row.credit).toLocaleString('en-IN')}</td>
                        <td className={`px-10 py-5 text-right font-black text-sm italic underline underline-offset-8 decoration-4 ${parseFloat(row.closing_balance) >= 0 ? 'text-emerald-600 decoration-emerald-50' : 'text-rose-600 decoration-rose-50'
                          }`}>
                          ₹{parseFloat(row.closing_balance).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 text-white font-black italic">
                      <td colSpan="4" className="px-10 py-8 text-xs tracking-[0.4em] uppercase text-indigo-400">Master Integrity Summary</td>
                      <td className="px-10 py-8 text-right text-lg tracking-tighter text-slate-400">₹{parseFloat(totals.opening_balance).toLocaleString('en-IN')}</td>
                      <td className="px-10 py-8 text-right text-lg tracking-tighter text-indigo-400">₹{parseFloat(totals.debit).toLocaleString('en-IN')}</td>
                      <td className="px-10 py-8 text-right text-lg tracking-tighter text-amber-400">₹{parseFloat(totals.credit).toLocaleString('en-IN')}</td>
                      <td className="px-10 py-8 text-right text-lg tracking-tighter text-emerald-400">₹{parseFloat(totals.closing_balance).toLocaleString('en-IN')}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-auto p-12 bg-slate-50/50 flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em] italic border-t border-slate-50">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 px-3 py-1 bg-white rounded-2xl shadow-sm"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div> SHARDS: {data.length}</span>
            </div>
            <div className="flex items-center gap-4">
              <span>SYSTEM_DATE: {new Date().toLocaleDateString()}</span>
              <div className="w-px h-3 bg-slate-200"></div>
              <span>CRC_VERIFIED</span>
            </div>
          </div>
        </div>
      </div>

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
