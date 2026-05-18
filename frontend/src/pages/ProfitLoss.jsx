import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import {
   TrendingUp, TrendingDown, DollarSign, PieChart,
   ArrowUpRight, ArrowDownLeft, Calendar, FileText,
   Briefcase, ShoppingBag, CreditCard, ChevronRight,
   Info, RefreshCw, Printer, Download, Activity, Database,
   CheckCircle, ShieldCheck, Layout, Layers, RefreshCcw,
   Activity as ActivityIcon, CheckCircle2, X, ArrowRight
} from 'lucide-react';

export default function ProfitLoss() {
   const { t } = useTranslation();
   const [plData, setPlData] = useState(null);
   const [monthlyData, setMonthlyData] = useState([]);
   const [loading, setLoading] = useState(true);
   const [startDate, setStartDate] = useState('');
   const [endDate, setEndDate] = useState('');
   const [viewMode, setViewMode] = useState('summary'); // summary or monthly
   const [company, setCompany] = useState(null);

   useEffect(() => {
      loadCompany();
   }, []);

   const loadCompany = async () => {
      try {
         const response = await api.get('/company');
         if (response.data.success && response.data.data) {
            setCompany(response.data.data);
         }
      } catch (error) {
         console.error('Failed to load company', error);
      }
   };

   useEffect(() => {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
   }, []);

   useEffect(() => {
      if (!company?.id) {
         if (!loading) setLoading(false);
         return;
      }
      if (startDate && endDate) {
         fetchProfitLoss();
      }
   }, [startDate, endDate, company]);

   const fetchProfitLoss = async () => {
      try {
         setLoading(true);
         const response = await api.get('/profit-loss', {
            params: { startDate, endDate }
         });

         if (response.data.success) {
            setPlData(response.data.data);
         }
      } catch (error) {
         console.error('Error fetching P&L:', error);
      } finally {
         setLoading(false);
      }
   };

   const fetchMonthlyData = async () => {
      try {
         const year = new Date(startDate).getFullYear();
         const response = await api.get(`/profit-loss/monthly/${year}`);

         if (response.data.success) {
            setMonthlyData(response.data.data);
         }
      } catch (error) {
         console.error('Error fetching monthly P&L:', error);
      }
   };

   const formatCurrency = (value) => {
      if (!value && value !== 0) return '0.00';
      return parseFloat(value).toLocaleString('en-IN', {
         minimumFractionDigits: 2,
         maximumFractionDigits: 2,
      });
   };

   const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

   if (!company) {
      return (
         <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
            <div className="text-center font-black uppercase tracking-widest text-slate-300">
               <p className="text-xs mb-6 italic tracking-[0.4em]">{t('saleReport.establishingBridge')}</p>
               <div className="w-24 h-1 bg-slate-100 mx-auto overflow-hidden rounded-full relative">
                  <div className="absolute top-0 left-0 w-1/2 h-full bg-blue-600 animate-[slide_1.5s_infinite]"></div>
               </div>
            </div>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
         <div className="max-w-[1600px] mx-auto px-8">

            {/* Superior Header - Dashboard Style */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-8 gap-4 print:hidden">
               <div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
                     <PieChart size={12} />
                     <span>{t('profitLoss.eyebrow')}</span>
                  </div>
                  <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('profitLoss.dossier')}</h1>
               </div>

               <div className="flex flex-wrap items-center gap-4">
                  <div className="flex gap-1.5 p-1.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                     <button
                        onClick={() => setViewMode('summary')}
                        className={`px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'summary' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'
                           }`}
                     >{t('profitLoss.summary')}</button>
                     <button
                        onClick={() => { setViewMode('monthly'); fetchMonthlyData(); }}
                        className={`px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${viewMode === 'monthly' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'
                           }`}
                     >{t('profitLoss.heatmap')}</button>
                  </div>

                  <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm h-full">
                     <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all font-mono" />
                     <ArrowRight size={14} className="text-slate-200" />
                     <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all font-mono" />
                  </div>

                  <div className="flex gap-2">
                     <button className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-all shadow-sm active:scale-95">
                        <Printer size={18} />
                     </button>
                     <button onClick={fetchProfitLoss} className="p-3.5 bg-blue-600 text-white rounded-lg transition-all shadow-lg shadow-blue-100 active:scale-95">
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                     </button>
                  </div>
               </div>
            </div>

            {loading ? (
               <div className="flex flex-col items-center justify-center py-32 space-y-6">
                  <ActivityIcon className="animate-spin text-blue-100" size={60} />
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">{t('common.loading')}</p>
               </div>
            ) : (
               <div className="space-y-10 animate-in fade-in slide-in-from-bottom duration-700">

                  {/* High-Performance Outcome Shard */}
                  {plData && (
                     <div className={`relative overflow-hidden p-8 rounded-lg shadow-sm border border-slate-100 group transition-all ${plData.netProfit >= 0 ? 'bg-white' : 'bg-slate-900 border-slate-800'
                        }`}>
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/20 rounded-full -mr-48 -mt-48 blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-1000"></div>

                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                           <div className="text-center md:text-left space-y-3">
                              <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.3em] inline-flex items-center gap-2 border ${plData.netProfit >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-900/40 text-rose-400 border-rose-800'
                                 }`}>
                                 {plData.netProfit >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                 System Audit: {plData.netProfit >= 0 ? t('profitLoss.surplus') : t('profitLoss.deficit')}
                              </div>
                              <div>
                                 <span className={`text-lg font-bold italic mr-1 ${plData.netProfit >= 0 ? 'text-slate-200' : 'text-slate-600'}`}>₹</span>
                                 <h2 className={`text-5xl font-bold tracking-tighter italic inline-block ${plData.netProfit >= 0 ? 'text-slate-800' : 'text-white'}`}>
                                    {formatCurrency(plData.netProfit)}
                                 </h2>
                              </div>
                              <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest italic text-slate-400">
                                 {t('profitLoss.returnEfficiency')} <span className={`px-2 py-0.5 rounded-md ${plData.netProfit >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'}`}>{plData.profitMargin}% {t('profitLoss.yield')}</span>
                              </div>
                           </div>

                           <div className="text-center md:text-right space-y-1.5">
                              <div className={`w-14 h-14 rounded-lg flex items-center justify-center mx-auto md:ml-auto border border-white/10 ${plData.netProfit >= 0 ? 'bg-emerald-50 text-emerald-600 border-slate-100' : 'bg-rose-600 text-white border-rose-500'
                                 }`}>
                                 {plData.netProfit >= 0 ? <CheckCircle2 size={28} /> : <TrendingDown size={28} />}
                              </div>
                              <p className={`text-[9px] font-black uppercase tracking-[0.4em] ${plData.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-400 opacity-60'}`}>Consolidated Equity Impact</p>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Core Operational Matrix */}
                  {viewMode === 'summary' && plData && (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {/* Expenditure Deck */}
                        <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col group">
                           <div className="bg-slate-900 p-6 flex justify-between items-center relative overflow-hidden">
                              <div className="absolute inset-0 bg-linear-to-r from-rose-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                              <div className="relative z-10">
                                 <h3 className="text-white font-bold uppercase tracking-[0.5em] text-[10px] italic">{t('profitLoss.expenditure')}</h3>
                                 <p className="text-slate-500 text-[7px] font-bold uppercase tracking-widest mt-1">{t('saleReport.debitAlloc')}</p>
                              </div>
                              <TrendingDown size={20} className="text-rose-600/40 relative z-10" />
                           </div>

                           <div className="flex-1 divide-y divide-slate-50">
                              <div className="p-6 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                                 <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-slate-50 text-slate-400"><ShoppingBag size={16} /></div>
                                    <div>
                                       <p className="font-bold text-slate-800 text-base tracking-tight uppercase italic">{t('profitLoss.purchases')}</p>
                                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t('saleReport.inventoryValues')}</p>
                                    </div>
                                 </div>
                                 <p className="text-xl font-bold text-slate-800 italic">₹{formatCurrency(plData?.costOfGoodsSold?.netCostOfGoodsSold)}</p>
                              </div>

                              {plData.expenseAccounts?.map((acc, i) => (
                                 <div key={i} className="p-6 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                       <div className="p-2.5 rounded-lg bg-slate-50 text-slate-400"><CreditCard size={16} /></div>
                                       <div>
                                          <p className="font-bold text-slate-800 text-base tracking-tight uppercase italic">{acc.account_name}</p>
                                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t('profitLoss.indirectOverheads')}</p>
                                       </div>
                                    </div>
                                    <p className="text-xl font-bold text-slate-800 italic">₹{formatCurrency(acc.amount)}</p>
                                 </div>
                              ))}

                              {plData.netProfit > 0 && (
                                 <div className="mt-auto p-8 bg-emerald-600 text-white relative group/surplus overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 animate-pulse"></div>
                                    <div className="relative z-10 flex justify-between items-end">
                                       <div>
                                          <span className="text-[9px] font-black uppercase tracking-[0.4em] mb-1.5 block italic text-emerald-300">{t('saleReport.surplusProvision')}</span>
                                          <h4 className="text-2xl font-bold italic tracking-tighter uppercase">{t('profitLoss.netProfit')}</h4>
                                       </div>
                                       <p className="text-2xl font-bold italic tracking-tighter">₹{formatCurrency(plData.netProfit)}</p>
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>

                        {/* Income Deck */}
                        <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col group">
                           <div className="bg-slate-900 p-6 flex justify-between items-center relative overflow-hidden">
                              <div className="absolute inset-0 bg-linear-to-r from-emerald-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                              <div className="relative z-10">
                                 <h3 className="text-white font-bold uppercase tracking-[0.5em] text-[10px] italic">{t('profitLoss.revenue')}</h3>
                                 <p className="text-slate-500 text-[7px] font-bold uppercase tracking-widest mt-1">{t('saleReport.creditAlloc')}</p>
                              </div>
                              <TrendingUp size={20} className="text-emerald-600/40 relative z-10" />
                           </div>

                           <div className="flex-1 divide-y divide-slate-50">
                              <div className="p-6 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                                 <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-slate-50 text-slate-400"><TrendingUp size={16} /></div>
                                    <div>
                                       <p className="font-bold text-slate-800 text-base tracking-tight uppercase italic">{t('profitLoss.sales')}</p>
                                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t('saleReport.inwardsRevenue')}</p>
                                    </div>
                                 </div>
                                 <p className="text-xl font-bold text-slate-800 italic">₹{formatCurrency(plData?.revenue?.netSales)}</p>
                              </div>

                              {plData.incomeAccounts?.map((acc, i) => (
                                 <div key={i} className="p-6 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                       <div className="p-2.5 rounded-lg bg-slate-50 text-slate-400"><DollarSign size={16} /></div>
                                       <div>
                                          <p className="font-bold text-slate-800 text-base tracking-tight uppercase italic">{acc.account_name}</p>
                                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{t('profitLoss.secondaryInflow')}</p>
                                       </div>
                                    </div>
                                    <p className="text-xl font-bold text-slate-800 italic">₹{formatCurrency(acc.amount)}</p>
                                 </div>
                              ))}

                              {plData.netProfit < 0 && (
                                 <div className="mt-auto p-8 bg-rose-600 text-white relative group/deficit overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 animate-pulse"></div>
                                    <div className="relative z-10 flex justify-between items-end">
                                       <div>
                                          <span className="text-[9px] font-black uppercase tracking-[0.4em] mb-1.5 block italic text-rose-300">{t('saleReport.equityDeficit')}</span>
                                          <h4 className="text-2xl font-bold italic tracking-tighter uppercase">{t('profitLoss.netLoss')}</h4>
                                       </div>
                                       <p className="text-2xl font-bold italic tracking-tighter">₹{formatCurrency(Math.abs(plData.netProfit))}</p>
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Verification Deck */}
                  {plData && (
                     <div className="bg-slate-900 p-3 rounded-lg flex flex-col md:flex-row shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-linear-to-r from-blue-600/5 to-transparent"></div>
                        <div className="flex-1 p-6 md:border-r border-white/5 flex justify-between items-center group">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] italic">{t('profitLoss.aggregateExpenditure')}</span>
                           <p className="text-2xl font-bold text-white italic tracking-tighter">
                              ₹{formatCurrency(Math.max(
                                 (plData?.revenue?.netSales || 0) + (plData.incomeAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0),
                                 (plData?.costOfGoodsSold?.netCostOfGoodsSold || 0) + (plData.expenseAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0)
                              ))}
                           </p>
                        </div>
                        <div className="flex-1 p-6 flex justify-between items-center group">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] italic">{t('profitLoss.aggregateRevenue')}</span>
                           <p className="text-2xl font-bold text-white italic tracking-tighter">
                              ₹{formatCurrency(Math.max(
                                 (plData?.revenue?.netSales || 0) + (plData.incomeAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0),
                                 (plData?.costOfGoodsSold?.netCostOfGoodsSold || 0) + (plData.expenseAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0)
                              ))}
                           </p>
                        </div>
                     </div>
                  )}

                  {/* Timeline Matrix */}
                  {viewMode === 'monthly' && (
                     <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-700">
                        <div className="p-10 border-b border-slate-50 bg-[#F8FAFC]/50 backdrop-blur-sm relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full -mr-48 -mt-48 blur-3xl opacity-50"></div>
                           <div className="relative z-10">
                              <h2 className="text-2xl font-bold text-slate-800 tracking-tight italic uppercase">{t('profitLoss.heatmap')}</h2>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1 italic">Chronological Efficiency Mapping</p>
                           </div>
                        </div>

                        <div className="p-10 overflow-x-auto scroller-airy min-h-[500px]">
                           <table className="w-full text-left">
                              <thead className="bg-[#F8FAFC]">
                                 <tr className="uppercase text-[10px] font-bold text-slate-400 tracking-widest italic">
                                    <th className="px-10 py-5">{t('common.date')}</th>
                                    <th className="px-10 py-5 text-right">{t('profitLoss.revenueShard')}</th>
                                    <th className="px-10 py-5 text-right">{t('profitLoss.costExposure')}</th>
                                    <th className="px-10 py-5 text-right">{t('profitLoss.resultantYield')}</th>
                                    <th className="px-10 py-5 text-right">{t('profitLoss.intensity')}</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                 {monthlyData.length > 0 ? (
                                    monthlyData.map((m, i) => {
                                       const yieldRate = m.netSales > 0 ? ((m.grossProfit / m.netSales) * 100).toFixed(1) : '0.0';
                                       return (
                                          <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                             <td className="px-10 py-6">
                                                <div className="flex items-center gap-4">
                                                   <span className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-[11px] font-bold text-white shadow-lg">{(i + 1).toString().padStart(2, '0')}</span>
                                                   <p className="text-lg font-bold text-slate-800 uppercase italic tracking-tighter">{monthNames[m.month - 1]}</p>
                                                </div>
                                             </td>
                                             <td className="px-10 py-6 text-right font-bold text-slate-500 font-mono italic">₹{formatCurrency(m.netSales)}</td>
                                             <td className="px-10 py-6 text-right font-bold text-slate-300 font-mono italic">₹{formatCurrency(m.netCOGS)}</td>
                                             <td className="px-10 py-6 text-right">
                                                <span className={`px-5 py-2.5 rounded-lg italic font-bold text-lg tracking-tighter ${m.grossProfit >= 0 ? 'bg-white text-slate-800 border-2 border-slate-800 shadow-sm' : 'bg-rose-50 text-rose-600 border border-rose-100 italic'}`}>
                                                   ₹{formatCurrency(m.grossProfit)}
                                                </span>
                                             </td>
                                             <td className="px-10 py-6 text-right">
                                                <div className="flex flex-col items-end gap-2">
                                                   <span className="text-[10px] font-bold text-slate-400 italic">{yieldRate}% Yield</span>
                                                   <div className="w-32 h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                                      <div className={`h-full transition-all duration-1000 ${parseFloat(yieldRate) > 15 ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 'bg-slate-300'}`} style={{ width: `${Math.min(100, Math.max(0, parseFloat(yieldRate) * 3))}%` }}></div>
                                                   </div>
                                                </div>
                                             </td>
                                          </tr>
                                       )
                                    })
                                 ) : (
                                    <tr>
                                       <td colSpan="5" className="py-32 text-center opacity-10">
                                          <Layers size={80} strokeWidth={1} className="mx-auto mb-6" />
                                          <p className="text-sm font-bold uppercase tracking-[0.4em] italic">No Timeline Vectors Detected</p>
                                       </td>
                                    </tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  )}

                  {/* Performance Indicators Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-10">
                     {[
                        { label: t('profitLoss.operatingMargin'), val: `${plData?.profitMargin}%`, icon: <ActivityIcon size={20} />, color: 'blue' },
                        { label: t('profitLoss.expenseAbsorption'), val: `${((plData?.operatingExpenses / (plData?.revenue?.netSales || 1)) * 100).toFixed(1)}%`, icon: <CreditCard size={20} />, color: 'indigo' },
                        { label: t('profitLoss.fiscalHealth'), val: plData?.netProfit >= 0 ? 'Optimal Surplus' : 'Risk Warning', icon: <ShieldCheck size={20} />, color: plData?.netProfit >= 0 ? 'emerald' : 'rose' }
                     ].map((stat, i) => (
                        <div key={i} className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm group hover:border-slate-200 transition-all flex justify-between items-center">
                           <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 italic">{stat.label}</p>
                              <h5 className={`text-3xl font-bold tracking-tighter italic ${stat.color === 'rose' ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>{stat.val}</h5>
                           </div>
                           <div className={`p-4 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                        </div>
                     ))}
                  </div>

               </div>
            )}

            {/* Global Registry Footer */}
            <div className="max-w-[1600px] mx-auto mt-12 flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase tracking-[0.5em] italic">
               <div className="flex items-center gap-4">
                  <span className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg shadow-sm border border-slate-50"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Audit Mode: Active</span>
                  <span className="flex items-center gap-2"><Layout size={12} /> Repository: Synchronized</span>
               </div>
               <div>System Chrono: {new Date().toISOString()}</div>
            </div>

         </div>

         <style dangerouslySetInnerHTML={{
            __html: `
          .scroller-airy::-webkit-scrollbar { width: 4px; }
          .scroller-airy::-webkit-scrollbar-track { background: transparent; }
          .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
      </div>
   );
}
