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

   const handlePrint = () => {
      window.print();
   };

   const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

   if (!company) {
      return (
         <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-8 font-mono">
            <div className="text-center font-bold text-zinc-400">
               <p className="text-xs mb-4 uppercase tracking-widest">{t('saleReport.establishingBridge')}</p>
               <RefreshCcw className="animate-spin mx-auto text-blue-600" size={24} />
            </div>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-zinc-100 p-6 text-zinc-900 select-none animate-none font-bold">
         <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6 shadow-sm rounded-none">

            {/* Top Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4 print:hidden">
               <div>
                  <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 select-none">
                     <PieChart size={20} className="text-zinc-600" />
                     {t('profitLoss.dossier')}
                  </h1>
                  <p className="text-[10px] font-mono text-zinc-500 mt-0.5 uppercase tracking-wider select-none">{t('profitLoss.eyebrow')}</p>
               </div>

               <div className="flex flex-wrap items-center gap-3">
                  <div className="flex bg-zinc-100 p-1 border border-zinc-300 rounded-none">
                     <button
                        onClick={() => setViewMode('summary')}
                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-none ${viewMode === 'summary' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
                     >{t('profitLoss.summary')}</button>
                     <button
                        onClick={() => { setViewMode('monthly'); fetchMonthlyData(); }}
                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-none ${viewMode === 'monthly' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
                     >{t('profitLoss.heatmap')}</button>
                  </div>

                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-zinc-300 rounded-none">
                     <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold text-zinc-600 focus:text-zinc-900 transition-all font-mono" />
                     <ArrowRight size={14} className="text-zinc-300" />
                     <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold text-zinc-600 focus:text-zinc-900 transition-all font-mono" />
                  </div>

                  <div className="flex gap-1.5">
                     <button onClick={handlePrint} className="p-2 bg-white border border-zinc-300 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition shadow-sm rounded-none">
                        <Printer size={15} />
                     </button>
                     <button onClick={fetchProfitLoss} className="p-2 bg-blue-600 border border-blue-500 text-white hover:bg-blue-700 transition shadow-sm rounded-none">
                        <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} />
                     </button>
                  </div>
               </div>
            </div>

            {loading ? (
               <div className="flex flex-col items-center justify-center py-24 space-y-3">
                  <RefreshCcw className="animate-spin text-zinc-400" size={32} />
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('common.loading')}</p>
               </div>
            ) : (
               <div className="space-y-6">

                  {/* Summary Outcome Shard */}
                  {plData && (
                     <div className="bg-zinc-50 border border-zinc-300 p-6 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-none select-none shadow-sm">
                        <div className="text-center sm:text-left space-y-2">
                           <div className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${plData.netProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-red-50 text-red-700 border-red-300'}`}>
                              {plData.netProfit >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              System Audit: {plData.netProfit >= 0 ? t('profitLoss.surplus') : t('profitLoss.deficit')}
                           </div>
                           <div className="flex items-baseline justify-center sm:justify-start gap-1">
                              <span className="text-sm font-bold text-zinc-400">₹</span>
                              <span className="text-3xl font-mono font-bold text-zinc-900 leading-none">{formatCurrency(plData.netProfit)}</span>
                           </div>
                           <div className="text-[10px] font-sans text-zinc-500 uppercase tracking-wider">
                              {t('profitLoss.returnEfficiency')} <span className={`px-1.5 py-0.5 font-mono font-bold ${plData.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{plData.profitMargin}% {t('profitLoss.yield')}</span>
                           </div>
                        </div>

                        <div className="text-center sm:text-right shrink-0">
                           <div className="w-12 h-12 border border-zinc-300 bg-white text-zinc-700 flex items-center justify-center rounded-none shadow-sm font-mono font-black text-sm uppercase">
                              P&L
                           </div>
                           <p className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider mt-1.5">Consolidated Impact</p>
                        </div>
                     </div>
                  )}

                  {/* Core Operational Matrix */}
                  {viewMode === 'summary' && plData && (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Expenditures Deck */}
                        <div className="border border-zinc-300 bg-white rounded-none shadow-sm flex flex-col">
                           <div className="bg-zinc-800 text-white px-4 py-3 flex justify-between items-center rounded-none font-bold uppercase text-xs">
                              <div>
                                 <span className="block">{t('profitLoss.expenditure')}</span>
                                 <span className="text-[8px] text-zinc-400 font-mono tracking-wider">{t('saleReport.debitAlloc')}</span>
                              </div>
                              <TrendingDown size={16} className="text-red-400" />
                           </div>

                           <div className="flex-1 divide-y divide-zinc-200">
                              <div className="p-4 flex justify-between items-center hover:bg-zinc-50 transition-colors">
                                 <div>
                                    <p className="font-bold text-zinc-800 text-sm uppercase font-prompt">{t('profitLoss.purchases')}</p>
                                    <p className="text-[8px] font-mono text-zinc-400 uppercase tracking-wider">{t('saleReport.inventoryValues')}</p>
                                 </div>
                                 <p className="text-base font-bold font-mono text-zinc-900">₹{formatCurrency(plData?.costOfGoodsSold?.netCostOfGoodsSold)}</p>
                              </div>

                              {plData.expenseAccounts?.map((acc, i) => (
                                 <div key={i} className="p-4 flex justify-between items-center hover:bg-zinc-50 transition-colors">
                                    <div>
                                       <p className="font-bold text-zinc-800 text-sm uppercase font-prompt">{acc.account_name}</p>
                                       <p className="text-[8px] font-mono text-zinc-400 uppercase tracking-wider">{t('profitLoss.indirectOverheads')}</p>
                                    </div>
                                    <p className="text-base font-bold font-mono text-zinc-900">₹{formatCurrency(acc.amount)}</p>
                                 </div>
                              ))}

                              {plData.netProfit > 0 && (
                                 <div className="p-4 bg-emerald-950 text-white flex justify-between items-center rounded-none font-mono mt-auto border-t border-zinc-300">
                                    <div>
                                       <span className="text-[9px] text-emerald-400 uppercase tracking-wider">{t('saleReport.surplusProvision')}</span>
                                       <span className="text-sm font-bold block uppercase">{t('profitLoss.netProfit')}</span>
                                    </div>
                                    <span className="text-lg font-bold text-emerald-400">₹{formatCurrency(plData.netProfit)}</span>
                                 </div>
                              )}
                           </div>
                        </div>

                        {/* Income Deck */}
                        <div className="border border-zinc-300 bg-white rounded-none shadow-sm flex flex-col">
                           <div className="bg-zinc-800 text-white px-4 py-3 flex justify-between items-center rounded-none font-bold uppercase text-xs">
                              <div>
                                 <span className="block">{t('profitLoss.revenue')}</span>
                                 <span className="text-[8px] text-zinc-400 font-mono tracking-wider">{t('saleReport.creditAlloc')}</span>
                              </div>
                              <TrendingUp size={16} className="text-emerald-400" />
                           </div>

                           <div className="flex-1 divide-y divide-zinc-200">
                              <div className="p-4 flex justify-between items-center hover:bg-zinc-50 transition-colors">
                                 <div>
                                    <p className="font-bold text-zinc-800 text-sm uppercase font-prompt">{t('profitLoss.sales')}</p>
                                    <p className="text-[8px] font-mono text-zinc-400 uppercase tracking-wider">{t('saleReport.inwardsRevenue')}</p>
                                 </div>
                                 <p className="text-base font-bold font-mono text-zinc-900">₹{formatCurrency(plData?.revenue?.netSales)}</p>
                              </div>

                              {plData.incomeAccounts?.map((acc, i) => (
                                 <div key={i} className="p-4 flex justify-between items-center hover:bg-zinc-50 transition-colors">
                                    <div>
                                       <p className="font-bold text-zinc-800 text-sm uppercase font-prompt">{acc.account_name}</p>
                                       <p className="text-[8px] font-mono text-zinc-400 uppercase tracking-wider">{t('profitLoss.secondaryInflow')}</p>
                                    </div>
                                    <p className="text-base font-bold font-mono text-zinc-900">₹{formatCurrency(acc.amount)}</p>
                                 </div>
                              ))}

                              {plData.netProfit < 0 && (
                                 <div className="p-4 bg-red-950 text-white flex justify-between items-center rounded-none font-mono mt-auto border-t border-zinc-300">
                                    <div>
                                       <span className="text-[9px] text-red-400 uppercase tracking-wider">{t('saleReport.equityDeficit')}</span>
                                       <span className="text-sm font-bold block uppercase">{t('profitLoss.netLoss')}</span>
                                    </div>
                                    <span className="text-lg font-bold text-red-400">₹{formatCurrency(Math.abs(plData.netProfit))}</span>
                                 </div>
                              )}
                           </div>
                        </div>

                     </div>
                  )}

                  {/* Verification Deck */}
                  {plData && (
                     <div className="bg-zinc-900 p-1 border border-zinc-800 rounded-none flex flex-col md:flex-row shadow-sm text-white font-mono text-xs">
                        <div className="flex-1 p-4 border-b md:border-b-0 md:border-r border-zinc-800 flex justify-between items-center">
                           <span className="text-zinc-500 uppercase tracking-wider">{t('profitLoss.aggregateExpenditure')}</span>
                           <span className="text-base font-bold text-zinc-200">
                              ₹{formatCurrency(Math.max(
                                 (plData?.revenue?.netSales || 0) + (plData.incomeAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0),
                                 (plData?.costOfGoodsSold?.netCostOfGoodsSold || 0) + (plData.expenseAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0)
                              ))}
                           </span>
                        </div>
                        <div className="flex-1 p-4 flex justify-between items-center">
                           <span className="text-zinc-500 uppercase tracking-wider">{t('profitLoss.aggregateRevenue')}</span>
                           <span className="text-base font-bold text-zinc-200">
                              ₹{formatCurrency(Math.max(
                                 (plData?.revenue?.netSales || 0) + (plData.incomeAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0),
                                 (plData?.costOfGoodsSold?.netCostOfGoodsSold || 0) + (plData.expenseAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0)
                              ))}
                           </span>
                        </div>
                     </div>
                  )}

                  {/* Timeline Matrix */}
                  {viewMode === 'monthly' && (
                     <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px] rounded-none">
                        <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3 select-none">
                           <div>
                              <span className="text-sm font-bold text-zinc-700 select-none">
                                 {t('profitLoss.heatmap')}
                              </span>
                              <span className="ml-2 bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-xs px-2 py-0.5 select-none">
                                 Monthly Timeline Vectors
                              </span>
                           </div>
                        </div>

                        <div className="flex-1 overflow-x-auto bg-white">
                           <table className="w-full text-left border-collapse select-none">
                              <thead>
                                 <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600 text-xs font-bold uppercase tracking-wider">
                                    <th className="px-4 py-3 border-r border-zinc-200">{t('common.date')}</th>
                                    <th className="px-4 py-3 border-r border-zinc-200 text-right">{t('profitLoss.revenueShard')}</th>
                                    <th className="px-4 py-3 border-r border-zinc-200 text-right">{t('profitLoss.costExposure')}</th>
                                    <th className="px-4 py-3 border-r border-zinc-200 text-right">{t('profitLoss.resultantYield')}</th>
                                    <th className="px-4 py-3 text-right">{t('profitLoss.intensity')}</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200 font-mono text-xs">
                                 {monthlyData.length > 0 ? (
                                    monthlyData.map((m, i) => {
                                       const yieldRate = m.netSales > 0 ? ((m.grossProfit / m.netSales) * 100).toFixed(1) : '0.0';
                                       return (
                                          <tr key={i} className="hover:bg-zinc-50/50">
                                             <td className="px-4 py-3 border-r border-zinc-200">
                                                <div className="flex items-center gap-3">
                                                   <span className="w-7 h-7 bg-zinc-800 text-white flex items-center justify-center font-bold">{(i + 1).toString().padStart(2, '0')}</span>
                                                   <span className="font-bold text-zinc-800 uppercase">{monthNames[m.month - 1]}</span>
                                                </div>
                                             </td>
                                             <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-zinc-600">₹{formatCurrency(m.netSales)}</td>
                                             <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-zinc-400">₹{formatCurrency(m.netCOGS)}</td>
                                             <td className="px-4 py-3 border-r border-zinc-200 text-right">
                                                <span className={`px-2 py-0.5 border text-xs font-bold ${m.grossProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-red-50 text-red-700 border-red-300'}`}>
                                                   ₹{formatCurrency(m.grossProfit)}
                                                </span>
                                             </td>
                                             <td className="px-4 py-3 text-right">
                                                <div className="flex flex-col items-end gap-1 font-sans">
                                                   <span className="text-[10px] font-bold text-zinc-500 font-mono">{yieldRate}% Yield</span>
                                                   <div className="w-24 h-2 bg-zinc-100 border border-zinc-300 rounded-none overflow-hidden">
                                                      <div className={`h-full ${parseFloat(yieldRate) > 15 ? 'bg-emerald-500' : 'bg-zinc-400'}`} style={{ width: `${Math.min(100, Math.max(0, parseFloat(yieldRate) * 3))}%` }}></div>
                                                   </div>
                                                </div>
                                             </td>
                                          </tr>
                                       )
                                    })
                                 ) : (
                                    <tr>
                                       <td colSpan="5" className="py-24 text-center">
                                          <Layers size={32} className="mx-auto mb-2 text-zinc-300" />
                                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">No Timeline Vectors Detected</p>
                                       </td>
                                    </tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  )}

                  {/* Performance Indicators Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     {[
                        { label: t('profitLoss.operatingMargin'), val: `${plData?.profitMargin}%`, icon: <ActivityIcon size={16} /> },
                        { label: t('profitLoss.expenseAbsorption'), val: `${((plData?.operatingExpenses / (plData?.revenue?.netSales || 1)) * 100).toFixed(1)}%`, icon: <CreditCard size={16} /> },
                        { label: t('profitLoss.fiscalHealth'), val: plData?.netProfit >= 0 ? 'Optimal Surplus' : 'Risk Warning', icon: <ShieldCheck size={16} /> }
                     ].map((stat, i) => (
                        <div key={i} className="bg-zinc-50 border border-zinc-300 p-4 shadow-sm flex items-center justify-between rounded-none">
                           <div>
                              <span className="text-[10px] font-sans text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                              <span className={`text-lg font-bold mt-1 block ${i === 2 && plData?.netProfit < 0 ? 'text-red-700 animate-pulse' : 'text-zinc-800'}`}>{stat.val}</span>
                           </div>
                           <div className="w-10 h-10 border border-zinc-200 bg-white text-zinc-600 flex items-center justify-center rounded-none shrink-0">
                              {stat.icon}
                           </div>
                        </div>
                     ))}
                  </div>

               </div>
            )}

            {/* Global Registry Footer */}
            <div className="border-t border-zinc-200 pt-4 flex flex-col sm:flex-row justify-between items-center text-[9px] font-mono text-zinc-400 uppercase tracking-wider gap-2 select-none print:hidden">
               <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-blue-600"></div> Audit Mode: Active</span>
                  <span>Repository: Synchronized</span>
               </div>
               <div>Chrono: {new Date().toISOString()}</div>
            </div>

         </div>
      </div>
   );
}
