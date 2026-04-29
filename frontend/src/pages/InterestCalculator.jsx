import React, { useState, useEffect } from 'react';
import { Calculator, Calendar, Download, RefreshCcw, TrendingUp, DollarSign, Users, ChevronRight, AlertCircle, Search } from 'lucide-react';
import api from '../api';

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
         // Fetch all ledger entries that have an interest_percent > 0
         // We will do a generic fetch from the account_ledger directly
         const response = await api.get('/account-ledger/interest-calculations', {
            params: { date: calculationDate }
         });

         if (response.data.success) {
            // Process exact dates on the frontend
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

   // Recalculate totals whenever results or global parameters change
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
      
      // If the row has consolidated entries, calculate yield for each sub-entry separately
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
         // Apply the global rate to the database so reports match the simulator
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
         alert('Failed to settle interest. Check console for details.');
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
      <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
         {/* Top Decoration */}
         <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-400 z-10" />

         <div className="flex-1 overflow-auto custom-scrollbar">
            <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">

               {/* Header Section */}
               <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                  <div>
                     <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center border border-blue-200">
                           <Calculator className="w-5 h-5 text-blue-600" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Interest Simulator</h1>
                     </div>
                     <p className="text-sm font-medium text-slate-500 max-w-xl">
                        Dynamic computation engine for real-time interest accrual on outstanding principal balances.
                     </p>
                  </div>

                     <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 px-3 py-1">
                           <DollarSign className="w-4 h-4 text-blue-500" />
                           <div className="flex flex-col">
                              <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Global Rate (%)</label>
                              <input
                                 type="number"
                                 step="0.01"
                                 placeholder="e.g. 2.00"
                                 value={globalRate}
                                 onChange={handleGlobalRateChange}
                                 className="text-sm font-bold text-blue-600 bg-transparent border-none p-0 focus:ring-0 outline-none w-20"
                              />
                           </div>
                        </div>
                        <div className="w-px h-8 bg-slate-100" />
                        <div className="flex items-center gap-3 px-3 py-1">
                           <Calendar className="w-4 h-4 text-slate-400" />
                           <div className="flex flex-col">
                              <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Rate Type</label>
                              <select
                                 value={globalRateType}
                                 onChange={(e) => setGlobalRateType(e.target.value)}
                                 className="text-sm font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-28"
                              >
                                 <option value="per_month">Per Month</option>
                                 <option value="per_year">Per Year</option>
                                 <option value="per_day">Per Day</option>
                              </select>
                           </div>
                        </div>
                        <div className="w-px h-8 bg-slate-100" />
                        <div className="flex items-center gap-3 px-3 py-1">
                           <Calendar className="w-4 h-4 text-slate-400" />
                           <div className="flex flex-col">
                              <label className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Epoch Target</label>
                              <input
                                 type="date"
                                 value={calculationDate}
                                 onChange={(e) => setCalculationDate(e.target.value)}
                                 className="text-sm font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-32"
                              />
                           </div>
                        </div>
                        <div className="w-px h-8 bg-slate-100" />
                        <button
                           onClick={handleCompute}
                           disabled={loading || !results.length}
                           className={`h-10 px-4 rounded-lg flex items-center gap-2 font-bold text-sm transition-all border shrink-0 ${
                              isComputed 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200'
                           }`}
                        >
                           <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                           {isComputed ? 'RE-COMPUTE' : 'COMPUTE'}
                        </button>
                  </div>
               </div>

               {/* Stat Cards */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between overflow-hidden relative shadow-sm">
                     <div className="absolute -right-6 -top-6 text-slate-50 opacity-50">
                        <Users className="w-32 h-32" />
                     </div>
                     <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                           <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                              <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                           </div>
                           <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase">Total Active Principal</h3>
                        </div>
                        <div className="flex items-end gap-2">
                           <span className="text-3xl font-black tracking-tight text-slate-800">
                              ₹{stats.totalPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                           </span>
                        </div>
                     </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl border border-blue-600 p-6 flex flex-col justify-between overflow-hidden relative shadow-md">
                     <div className="absolute -right-6 -top-6 text-blue-400 opacity-30">
                        <Calculator className="w-32 h-32" />
                     </div>
                     <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                           <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                              <TrendingUp className="w-3.5 h-3.5 text-white" />
                           </div>
                           <h3 className="text-xs font-black tracking-widest text-blue-100 uppercase">Total Accrued Interest</h3>
                        </div>
                        <div className="flex items-end gap-2">
                           <span className="text-3xl font-black tracking-tight text-white">
                              ₹{stats.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Results Table */}
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                     <h3 className="text-xs font-black tracking-widest text-slate-500 uppercase">Calculation Matrix</h3>
                     <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                           <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                           <input
                              type="text"
                              placeholder="Search member, code, or ref..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-300"
                           />
                        </div>
                        <button className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 flex items-center gap-1 shrink-0">
                           <Download className="w-3 h-3" />
                           Export Log
                        </button>
                     </div>
                  </div>

                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="border-b border-slate-100">
                              <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Entity</th>
                              <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Reference</th>
                              <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Given (₹)</th>
                              <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Credit (₹)</th>
                              <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Principal (₹)</th>
                              <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Elapsed Days</th>
                              <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Rate (%)</th>
                              <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Yield (₹)</th>
                              <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total (₹)</th>
                           </tr>
                        </thead>
                        <tbody>
                           {loading ? (
                              <tr>
                                 <td colSpan="9" className="py-12 text-center">
                                    <RefreshCcw className="w-6 h-6 text-slate-300 animate-spin mx-auto mb-3" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Crunching Numbers...</p>
                                 </td>
                              </tr>
                           ) : filteredResults.length === 0 ? (
                              <tr>
                                 <td colSpan="9" className="py-12 text-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                                       <AlertCircle className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                       {searchQuery ? "No matching entries found" : "No Active Interest Nodes Found"}
                                    </p>
                                 </td>
                              </tr>
                           ) : (
                              filteredResults.map((row, idx) => (
                                 <React.Fragment key={row.member_id || idx}>
                                 <tr 
                                    className={`border-b border-slate-50 transition-colors cursor-pointer ${expandedRows.has(row.member_id) ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}`}
                                    onClick={() => row.entry_count > 1 && toggleRow(row.member_id)}
                                 >
                                    <td className="py-4 px-6">
                                       <div className="flex flex-col">
                                          <div className="flex items-center gap-2">
                                             {row.entry_count > 1 && (
                                                <ChevronRight size={14} className={`text-slate-400 transition-transform ${expandedRows.has(row.member_id) ? 'rotate-90' : ''}`} />
                                             )}
                                             <span className="text-xs font-black text-slate-800">{row.member_name}</span>
                                             {row.entry_count > 1 && (
                                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-black border border-slate-200">
                                                   {row.entry_count} nodes
                                                </span>
                                             )}
                                          </div>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">[{row.member_code}]</span>
                                       </div>
                                    </td>
                                    <td className="py-4 px-6">
                                       <div className="flex flex-col">
                                          <span className="text-xs font-bold text-slate-600">{row.description}</span>
                                          <span className="text-[10px] font-mono text-slate-400 italic">{new Date(row.transaction_date).toLocaleDateString()} • {row.reference_no}</span>
                                       </div>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                       <span className="text-sm font-bold text-rose-600">
                                          {parseFloat(row.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                       </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                       <span className="text-sm font-bold text-emerald-600">
                                          {parseFloat(row.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                       </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                       <span className="text-sm font-bold text-slate-800">
                                          {parseFloat(row.principal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                       </span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                       <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                          {row.elapsedDays} <span className="text-[8px] opacity-60 ml-0.5 uppercase tracking-tighter">Days</span>
                                       </span>
                                    </td>
                                    <td className="py-4 px-6 text-center font-bold text-slate-600 text-xs">
                                       {isComputed ? `${parseFloat(globalRate) || row.interest_percent}%` : '-'}
                                    </td>
                                    <td className="py-4 px-6 text-right font-black text-blue-600 text-sm">
                                       ₹{calculateYield(row)}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                       <span className="text-base font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded">
                                          ₹{(parseFloat(row.principal) + parseFloat(calculateYield(row))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                       </span>
                                    </td>
                                 </tr>

                                 {/* Sub-Rows for expanded grouped entries */}
                                 {expandedRows.has(row.member_id) && row.entries && row.entries.map((entry, eIdx) => (
                                    <tr key={`${row.member_id}-sub-${eIdx}`} className="bg-slate-50/30 border-b border-slate-100/50">
                                       <td className="py-3 px-6 pl-12">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">Node {eIdx + 1}</span>
                                       </td>
                                       <td className="py-3 px-6">
                                          <div className="flex flex-col">
                                             <span className="text-[11px] font-medium text-slate-500">{entry.description}</span>
                                             <span className="text-[9px] font-mono text-slate-400">{new Date(entry.transaction_date).toLocaleDateString()} • {entry.reference_no}</span>
                                          </div>
                                       </td>
                                       <td className="py-3 px-6 text-right">
                                          <span className="text-xs text-rose-400">₹{parseFloat(entry.debit || 0).toFixed(2)}</span>
                                       </td>
                                       <td className="py-3 px-6 text-right">
                                          <span className="text-xs text-emerald-400">₹{parseFloat(entry.credit || 0).toFixed(2)}</span>
                                       </td>
                                       <td className="py-3 px-6 text-right font-bold text-slate-500">
                                          ₹{parseFloat(entry.principal).toFixed(2)}
                                       </td>
                                       <td className="py-3 px-6 text-center text-[10px] text-slate-400">
                                          {entry.elapsedDays} d
                                        </td>
                                       <td className="py-3 px-6 text-center text-[10px] text-slate-400 italic">
                                          {isComputed ? `${parseFloat(globalRate) || entry.interest_percent}%` : '-'}
                                       </td>
                                       <td className="py-3 px-6 text-right font-bold text-blue-400 text-xs">
                                          ₹{isComputed ? (() => {
                                             const r = parseFloat(globalRate) || parseFloat(entry.interest_percent) || 0;
                                             const d = parseInt(entry.elapsedDays) || 0;
                                             let m = 0;
                                             if (globalRateType === 'per_day') m = d;
                                             else if (globalRateType === 'per_month') m = d / 30.0;
                                             else if (globalRateType === 'per_year') m = d / 365.0;
                                             return (parseFloat(entry.principal) * (r / 100) * m).toFixed(2);
                                          })() : '0.00'}
                                       </td>
                                       <td className="py-3 px-6 text-right">
                                          <span className="text-[11px] font-black text-emerald-600/60">
                                             ₹{isComputed ? (parseFloat(entry.principal) + parseFloat((() => {
                                                const r = parseFloat(globalRate) || parseFloat(entry.interest_percent) || 0;
                                                const d = parseInt(entry.elapsedDays) || 0;
                                                let m = 0;
                                                if (globalRateType === 'per_day') m = d;
                                                else if (globalRateType === 'per_month') m = d / 30.0;
                                                else if (globalRateType === 'per_year') m = d / 365.0;
                                                return (parseFloat(entry.principal) * (r / 100) * m).toFixed(2);
                                             })())).toFixed(2) : parseFloat(entry.principal).toFixed(2)}
                                          </span>
                                       </td>
                                    </tr>
                                 ))}
                                 </React.Fragment>
                              ))
                           )}
                        </tbody>
                        {filteredResults.length > 0 && (
                           <tfoot className="bg-slate-50/80 border-t-2 border-slate-200">
                              <tr className="font-black text-slate-800">
                                 <td colSpan="2" className="py-4 px-6 text-[10px] uppercase tracking-widest text-slate-400">Total Matrix Aggregation</td>
                                 <td className="py-4 px-6 text-right text-rose-600 text-sm">
                                    ₹{filteredResults.reduce((s, r) => s + parseFloat(r.debit || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                 </td>
                                 <td className="py-4 px-6 text-right text-emerald-600 text-sm">
                                    ₹{filteredResults.reduce((s, r) => s + parseFloat(r.credit || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                 </td>
                                 <td className="py-4 px-6 text-right text-slate-800 text-sm font-black">
                                    ₹{filteredResults.reduce((s, r) => s + parseFloat(r.principal || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                 </td>
                                 <td className="py-4 px-6"></td>
                                 <td className="py-4 px-6"></td>
                                 <td className="py-4 px-6 text-right text-blue-600 text-sm font-black">
                                    ₹{isComputed ? filteredResults.reduce((s, r) => s + parseFloat(calculateYield(r)), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                                 </td>
                                 <td className="py-4 px-6 text-right text-emerald-700 text-base font-black">
                                    ₹{filteredResults.reduce((s, r) => s + (parseFloat(r.principal) + (isComputed ? parseFloat(calculateYield(r)) : 0)), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                 </td>
                              </tr>
                           </tfoot>
                        )}
                     </table>
                  </div>
               </div>
            </div>
         </div>

      {settleModalRow && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="bg-slate-900 p-6 flex justify-between items-center">
                  <div>
                     <h2 className="text-xl font-black text-white uppercase italic tracking-widest">Settle Account</h2>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{settleModalRow.member_name} [{settleModalRow.member_code}]</p>
                  </div>
                  <button onClick={() => setSettleModalRow(null)} className="text-slate-400 hover:text-white transition-colors">
                     <AlertCircle className="w-6 h-6 rotate-45" />
                  </button>
               </div>
               
               <form onSubmit={handleSettleSubmit} className="p-6 space-y-6">
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                     <button
                        type="button"
                        onClick={() => setSettleType('Credit')}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-all ${settleType === 'Credit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                        Receive (Credit)
                     </button>
                     <button
                        type="button"
                        onClick={() => setSettleType('Debit')}
                        className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-all ${settleType === 'Debit' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                        Give (Debit)
                     </button>
                  </div>

                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount (₹)</label>
                     <input
                        type="number"
                        step="0.01"
                        required
                        value={settleAmount}
                        onChange={(e) => setSettleAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-lg text-lg font-black text-slate-800 focus:border-blue-500 focus:ring-0 outline-none transition-colors"
                     />
                  </div>

                  <div className="flex gap-3 pt-2">
                     <button type="button" onClick={() => setSettleModalRow(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-black text-xs uppercase tracking-widest transition-colors">
                        Cancel
                     </button>
                     <button type="submit" className="flex-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-xs uppercase tracking-widest shadow-lg transition-colors flex items-center justify-center gap-2">
                        Confirm Transaction
                        <ChevronRight className="w-4 h-4" />
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
      </div>
   );
}
