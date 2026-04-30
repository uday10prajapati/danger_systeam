import React, { useState, useEffect } from 'react';
import {
  Calculator, Calendar, Download, RefreshCcw, TrendingUp, DollarSign,
  Users, ChevronRight, AlertCircle, Search, Info, History, Database,
  Plus, X, Save, TrendingDown, Layout
} from 'lucide-react';
import api from '../api';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';

export default function InterestCalculator() {
  const [loading, setLoading] = useState(false);
  const [calculationDate, setCalculationDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ totalPrincipal: 0, totalInterest: 0 });
  const [globalRate, setGlobalRate] = useState('');
  const [globalRateType, setGlobalRateType] = useState('per_month');
  const [settleModalRow, setSettleModalRow] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleType, setSettleType] = useState('Credit');
  const [searchQuery, setSearchQuery] = useState('');
  const [isComputed, setIsComputed] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (memberId) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(memberId)) newSet.delete(memberId);
    else newSet.add(memberId);
    setExpandedRows(newSet);
  };

  const fetchCalculations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/account-ledger/interest-calculations', {
        params: { date: calculationDate }
      });

      if (response.data.success) {
        const initialData = response.data.data.map(row => {
          const start = new Date(row.transaction_date);
          const end = new Date(calculationDate);
          const diffTime = end - start;
          const elapsedDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

          return {
            ...row,
            elapsedDays: elapsedDays
          };
        });
        setResults(initialData);
        setIsComputed(false);
      }
    } catch (error) {
      console.error('Error fetching interest calculations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const totals = results.reduce((acc, curr) => {
      const interest = isComputed ? (parseFloat(calculateYield(curr)) || 0) : 0;
      const principal = parseFloat(curr.principal || 0);

      return {
        totalPrincipal: acc.totalPrincipal + principal,
        totalInterest: acc.totalInterest + interest
      };
    }, { totalPrincipal: 0, totalInterest: 0 });

    setStats(totals);
  }, [results, globalRate, globalRateType, isComputed]);

  const calculateYield = (row) => {
    if (!isComputed) return '0.00';
    const r = parseFloat(globalRate) || parseFloat(row.interest_percent) || 0;

    if (row.entries && row.entries.length > 0) {
      const totalYield = row.entries.reduce((acc, entry) => {
        const p = parseFloat(entry.principal);
        const d = parseInt(entry.elapsedDays) || 0;
        let m = 0;
        if (globalRateType === 'per_day') m = d;
        else if (globalRateType === 'per_month') m = d / 30.0;
        else if (globalRateType === 'per_year') m = d / 365.0;
        return acc + (p * (r / 100) * m);
      }, 0);
      return totalYield.toFixed(2);
    }

    const days = parseInt(row.elapsedDays) || 0;
    let multiplier = 0;
    if (globalRateType === 'per_day') multiplier = days;
    else if (globalRateType === 'per_month') multiplier = days / 30.0;
    else if (globalRateType === 'per_year') multiplier = days / 365.0;

    const yieldAmt = (parseFloat(row.principal) * (r / 100) * multiplier);
    return isNaN(yieldAmt) ? '0.00' : yieldAmt.toFixed(2);
  };

  const handleCompute = async () => {
    try {
      setLoading(true);
      if (globalRate && results.length > 0) {
        await api.post('/account-ledger/bulk-apply-interest', {
          globalRate: parseFloat(globalRate),
          asOfDate: calculationDate,
          rateType: globalRateType
        });
      }
      setIsComputed(true);
    } catch (error) {
      console.error('Error applying interest to DB:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalRateChange = (e) => {
    setGlobalRate(e.target.value);
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!settleModalRow || !settleAmount) return;
    try {
      const cashIn = settleType === 'Credit' ? parseFloat(settleAmount) : 0;
      const cashOut = settleType === 'Debit' ? parseFloat(settleAmount) : 0;

      const response = await api.post('/cash-book/manual', {
        transaction_date: calculationDate,
        description: `Interest Settlement / Adjustment for ${settleModalRow.member_name}`,
        cash_in: cashIn,
        cash_out: cashOut,
        notes: `Calculated Yield Reference: ${calculateYield(settleModalRow)}`,
        member_id: settleModalRow.member_id
      }, {
        headers: { 'x-user-id': 1 }
      });

      if (response.data.success) {
        setSettleModalRow(null);
        setSettleAmount('');
        fetchCalculations();
      }
    } catch (error) {
      console.error('Error settling interest:', error);
    }
  };

  useEffect(() => {
    fetchCalculations();
  }, [calculationDate]);

  const filteredResults = results.filter(row =>
    (row.member_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (row.member_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (row.reference_no || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12">
      <div className="max-w-[1600px] mx-auto px-8">

        <PageHeader
          eyebrow="Financial Analytics / Computation"
          eyebrowIcon={<Database size={12} />}
          title="Interest Simulator"
          subtitle="Dynamic computation engine for real-time interest accrual"
        >
          <div className="flex items-center gap-4 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 px-3">
              <DollarSign className="w-4 h-4 text-blue-500" />
              <div className="flex flex-col">
                <label className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="2.00"
                  value={globalRate}
                  onChange={handleGlobalRateChange}
                  className="text-xs font-bold text-blue-600 bg-transparent border-none p-0 focus:ring-0 outline-none w-16"
                />
              </div>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="flex items-center gap-3 px-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div className="flex flex-col">
                <label className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">Period</label>
                <select
                  value={globalRateType}
                  onChange={(e) => setGlobalRateType(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-24 appearance-none"
                >
                  <option value="per_month">Per Month</option>
                  <option value="per_year">Per Year</option>
                  <option value="per_day">Per Day</option>
                </select>
              </div>
            </div>
            <div className="w-px h-8 bg-slate-100" />
            <div className="flex items-center gap-3 px-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div className="flex flex-col">
                <label className="text-[9px] font-bold tracking-widest text-slate-400 uppercase">Target Date</label>
                <input
                  type="date"
                  value={calculationDate}
                  onChange={(e) => setCalculationDate(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-28"
                />
              </div>
            </div>
            <button
              onClick={handleCompute}
              disabled={loading || !results.length}
              className={`ml-2 px-5 py-2.5 rounded-lg flex items-center gap-2 font-bold text-xs transition-all shadow-sm ${isComputed
                ? 'bg-emerald-600 text-white shadow-emerald-100'
                : 'bg-blue-600 text-white shadow-blue-100'
                } active:scale-[0.98] disabled:opacity-50`}
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {isComputed ? 'RE-COMPUTE' : 'COMPUTE'}
            </button>
          </div>
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 text-slate-50 opacity-[0.03]">
              <Users size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Principal</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">₹{stats.totalPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border-2 border-blue-600 shadow-lg shadow-blue-50 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 text-blue-600 opacity-[0.03]">
              <TrendingUp size={120} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Accrued Interest</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">₹{stats.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <TableHeading
            icon={<Layout size={18} />}
            iconColor="blue"
            title="Calculation Matrix"
            subtitle="Real-time interest accrual ledger"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search identity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none transition-all w-64 placeholder:text-slate-300"
                />
              </div>
              <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2">
                <Download size={14} /> Export Manifest
              </button>
            </div>
          </TableHeading>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="py-5 px-6">Entity</th>
                  <th className="py-5 px-6">Reference</th>
                  <th className="py-5 px-6 text-right">Debit</th>
                  <th className="py-5 px-6 text-right">Credit</th>
                  <th className="py-5 px-6 text-right">Principal</th>
                  <th className="py-5 px-6 text-center">Days</th>
                  <th className="py-5 px-6 text-center">Rate</th>
                  <th className="py-5 px-6 text-right">Yield</th>
                  <th className="py-5 px-6 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-20 text-center">
                      <RefreshCcw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Processing Computation...</p>
                    </td>
                  </tr>
                ) : filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-20 text-center">
                      <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No matching financial nodes</p>
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((row, idx) => (
                    <React.Fragment key={row.member_id || idx}>
                      <tr
                        className={`group hover:bg-slate-50/50 transition-all cursor-pointer ${expandedRows.has(row.member_id) ? 'bg-blue-50/30' : ''}`}
                        onClick={() => row.entry_count > 1 && toggleRow(row.member_id)}
                      >
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-3">
                            {row.entry_count > 1 && (
                              <ChevronRight size={14} className={`text-slate-400 transition-transform ${expandedRows.has(row.member_id) ? 'rotate-90' : ''}`} />
                            )}
                            <div>
                              <p className="text-sm font-bold text-slate-800 tracking-tight">{row.member_name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CODE: {row.member_code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          <p className="text-xs font-bold text-slate-600 truncate max-w-[200px]">{row.description}</p>
                          <p className="text-[10px] font-mono text-slate-400"># {row.reference_no}</p>
                        </td>
                        <td className="py-5 px-6 text-right">
                          <span className="text-sm font-bold text-rose-600">₹{parseFloat(row.debit || 0).toLocaleString('en-IN')}</span>
                        </td>
                        <td className="py-5 px-6 text-right">
                          <span className="text-sm font-bold text-emerald-600">₹{parseFloat(row.credit || 0).toLocaleString('en-IN')}</span>
                        </td>
                        <td className="py-5 px-6 text-right">
                          <span className="text-sm font-bold text-slate-800">₹{parseFloat(row.principal).toLocaleString('en-IN')}</span>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                            {row.elapsedDays} D
                          </span>
                        </td>
                        <td className="py-5 px-6 text-center text-xs font-bold text-slate-600">
                          {isComputed ? `${parseFloat(globalRate) || row.interest_percent}%` : '—'}
                        </td>
                        <td className="py-5 px-6 text-right font-black text-blue-600 text-sm">
                          ₹{calculateYield(row)}
                        </td>
                        <td className="py-5 px-6 text-right">
                          <span className="text-sm font-black text-slate-900 bg-blue-50 px-3 py-1.5 rounded-lg">
                            ₹{(parseFloat(row.principal) + parseFloat(calculateYield(row))).toLocaleString('en-IN')}
                          </span>
                        </td>
                      </tr>
                      {expandedRows.has(row.member_id) && row.entries && row.entries.map((entry, eIdx) => (
                        <tr key={`${row.member_id}-sub-${eIdx}`} className="bg-slate-50/30 border-t border-slate-100">
                          <td className="py-3 px-6 pl-14">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Node {eIdx + 1}</p>
                          </td>
                          <td className="py-3 px-6">
                            <p className="text-[11px] font-bold text-slate-500 truncate max-w-[200px]">{entry.description}</p>
                            <p className="text-[9px] font-mono text-slate-400"># {entry.reference_no}</p>
                          </td>
                          <td className="py-3 px-6 text-right text-xs text-rose-400">₹{parseFloat(entry.debit || 0).toFixed(2)}</td>
                          <td className="py-3 px-6 text-right text-xs text-emerald-400">₹{parseFloat(entry.credit || 0).toFixed(2)}</td>
                          <td className="py-3 px-6 text-right text-xs font-bold text-slate-500">₹{parseFloat(entry.principal).toFixed(2)}</td>
                          <td className="py-3 px-6 text-center text-[10px] text-slate-400">{entry.elapsedDays} d</td>
                          <td className="py-3 px-6 text-center text-[10px] text-slate-400">—</td>
                          <td className="py-3 px-6 text-right font-bold text-blue-400 text-xs">₹{isComputed ? calculateYield(entry) : '0.00'}</td>
                          <td className="py-3 px-6 text-right font-bold text-slate-400 text-xs">₹{parseFloat(entry.principal).toFixed(2)}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {settleModalRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-white animate-in zoom-in-95 duration-200">
            <div className="bg-blue-600 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Settle Account</h2>
                <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-1">{settleModalRow.member_name} [{settleModalRow.member_code}]</p>
              </div>
              <button onClick={() => setSettleModalRow(null)} className="p-2 text-white/50 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSettleSubmit} className="p-8 space-y-6">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSettleType('Credit')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${settleType === 'Credit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                >
                  Receive (Credit)
                </button>
                <button
                  type="button"
                  onClick={() => setSettleType('Debit')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${settleType === 'Debit' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
                >
                  Give (Debit)
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Settle Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-2xl font-black text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition-all tracking-tighter"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setSettleModalRow(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">Cancel</button>
                <button type="submit" className="flex-2 py-4 bg-blue-600 text-white rounded-lg font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">Confirm Settlement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
