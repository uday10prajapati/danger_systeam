import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { exportToPDF, toGujaratiDigits } from '../utils/pdfExporter';
import {
   TrendingUp, TrendingDown, DollarSign, PieChart,
   ArrowUpRight, ArrowDownLeft, Calendar, FileText,
   Briefcase, ShoppingBag, CreditCard, ChevronRight,
   Info, RefreshCw, Printer, Download, Activity, Database,
   CheckCircle, ShieldCheck, Layout, Layers, RefreshCcw,
   Activity as ActivityIcon, CheckCircle2, X, ArrowRight, Filter
} from 'lucide-react';

export default function ProfitLoss() {
   const { t, i18n } = useTranslation();
   const [plData, setPlData] = useState(null);
   const [monthlyData, setMonthlyData] = useState([]);
   const [loading, setLoading] = useState(true);
   const [startDate, setStartDate] = useState('');
   const [endDate, setEndDate] = useState('');
   const [viewMode, setViewMode] = useState('summary'); // summary or monthly
   const [company, setCompany] = useState(null);
   const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

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

    const handleExportPDF = async () => {
       if (viewMode === 'summary') {
          if (!plData) return;
          const isGu = i18n.language === 'gu';
          
          const fmtNum = (value, digits = 2) => {
             const n = parseFloat(value || 0);
             const formatted = n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
             return isGu ? toGujaratiDigits(formatted) : formatted;
          };

          const expItems = [];
          expItems.push({ name: isGu ? 'ખરીદી (વેચેલ માલની પડતર)' : 'Purchases (COGS)', amount: plData?.costOfGoodsSold?.netCostOfGoodsSold || 0 });
          if (plData.expenseAccounts) {
             plData.expenseAccounts.forEach(acc => {
                expItems.push({ name: isGu ? (acc.account_name_gu || acc.account_name) : acc.account_name, amount: acc.amount });
             });
          }
          if (plData.netProfit > 0) {
             expItems.push({ name: isGu ? 'ચોખ્ખો નફો' : 'Net Profit', amount: plData.netProfit, expIsTotal: true });
          }

          const incItems = [];
          incItems.push({ name: isGu ? 'વેચાણ' : 'Sales', amount: plData?.revenue?.netSales || 0 });
          if (plData.incomeAccounts) {
             plData.incomeAccounts.forEach(acc => {
                incItems.push({ name: isGu ? (acc.account_name_gu || acc.account_name) : acc.account_name, amount: acc.amount });
             });
          }
          if (plData.netProfit < 0) {
             incItems.push({ name: isGu ? 'ચોખ્ખી ખોટ' : 'Net Loss', amount: Math.abs(plData.netProfit), incIsTotal: true });
          }

          const pdfRows = [];
          const maxLen = Math.max(expItems.length, incItems.length);
          for (let i = 0; i < maxLen; i++) {
             const exp = expItems[i] || { name: '', amount: null };
             const inc = incItems[i] || { name: '', amount: null };
             pdfRows.push({
                expName: exp.name,
                expAmount: exp.amount,
                expIsTotal: exp.expIsTotal,
                incName: inc.name,
                incAmount: inc.amount,
                incIsTotal: inc.incIsTotal
             });
          }

          const totalVal = Math.max(
             (plData?.revenue?.netSales || 0) + (plData.incomeAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0),
             (plData?.costOfGoodsSold?.netCostOfGoodsSold || 0) + (plData.expenseAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0)
          );

          pdfRows.push({
             _isTotals: true,
             expName: isGu ? 'સરવાળો' : 'Total',
             expAmount: totalVal,
             incName: isGu ? 'સરવાળો' : 'Total',
             incAmount: totalVal
          });

          const columns = [
             {
                header: isGu ? 'ખર્ચ વિગત (ઉધાર)' : 'Expenditure (Debit)',
                align: 'left',
                width: '35%',
                render: (row) => row.expIsTotal || row._isTotals ? `<strong style="font-family: 'Prompt', sans-serif;">${row.expName}</strong>` : row.expName
             },
             {
                header: isGu ? 'રકમ' : 'Amount',
                align: 'right',
                width: '15%',
                render: (row) => {
                   if (row.expAmount === null || row.expAmount === undefined) return '';
                   const val = parseFloat(row.expAmount);
                   return row.expIsTotal || row._isTotals ? `<strong style="font-family: 'Prompt', sans-serif;">₹${fmtNum(val)}</strong>` : `₹${fmtNum(val)}`;
                }
             },
             {
                header: isGu ? 'આવક વિગત (જમા)' : 'Income (Credit)',
                align: 'left',
                width: '35%',
                render: (row) => row.incIsTotal || row._isTotals ? `<strong style="font-family: 'Prompt', sans-serif;">${row.incName}</strong>` : row.incName
             },
             {
                header: isGu ? 'રકમ' : 'Amount',
                align: 'right',
                width: '15%',
                render: (row) => {
                   if (row.incAmount === null || row.incAmount === undefined) return '';
                   const val = parseFloat(row.incAmount);
                   return row.incIsTotal || row._isTotals ? `<strong style="font-family: 'Prompt', sans-serif;">₹${fmtNum(val)}</strong>` : `₹${fmtNum(val)}`;
                }
             }
          ];

          const periodStr = `${startDate} — ${endDate}`;

          await exportToPDF({
             title: isGu ? 'નફા-નુકસાન અહેવાલ' : 'Profit & Loss Statement',
             columns,
             rows: pdfRows,
             isGu,
             metaInfo: [
                { label: isGu ? 'સમયગાળો' : 'Period', value: isGu ? toGujaratiDigits(periodStr) : periodStr }
             ],
             filename: `${isGu ? 'નફા_નુકસાન_અહેવાલ' : 'Profit_Loss_Report'}_${startDate}_${endDate}.pdf`
          });
       } else {
          if (monthlyData.length === 0) return;
          const isGu = i18n.language === 'gu';
          
          const fmtNum = (value, digits = 2) => {
             const n = parseFloat(value || 0);
             const formatted = n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
             return isGu ? toGujaratiDigits(formatted) : formatted;
          };

          const monthNamesGu = ['જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન', 'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'];
          const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

          const columns = [
             {
                header: isGu ? 'માસ' : 'Month',
                align: 'left',
                width: '25%',
                render: (row) => isGu ? monthNamesGu[row.month - 1] : monthNamesEn[row.month - 1]
             },
             {
                header: isGu ? 'આવક' : 'Revenue',
                align: 'right',
                width: '20%',
                render: (row) => `₹${fmtNum(row.netSales)}`
             },
             {
                header: isGu ? 'પડતર' : 'Cost of Goods Sold (COGS)',
                align: 'right',
                width: '20%',
                render: (row) => `₹${fmtNum(row.netCOGS)}`
             },
             {
                header: isGu ? 'ચોખ્ખો નફો' : 'Gross Profit',
                align: 'right',
                width: '20%',
                render: (row) => `₹${fmtNum(row.grossProfit)}`
             },
             {
                header: isGu ? 'નફાની ટકાવારી' : 'Yield',
                align: 'right',
                width: '15%',
                render: (row) => {
                   const yieldRate = row.netSales > 0 ? ((row.grossProfit / row.netSales) * 100).toFixed(1) : '0.0';
                   return isGu ? `${toGujaratiDigits(yieldRate)}%` : `${yieldRate}%`;
                }
             }
          ];

          await exportToPDF({
             title: isGu ? 'માસિક નફા-નુકસાન અહેવાલ' : 'Monthly Profit & Loss Heatmap',
             columns,
             rows: monthlyData,
             isGu,
             metaInfo: [
                { label: isGu ? 'વર્ષ' : 'Year', value: isGu ? toGujaratiDigits(new Date(startDate).getFullYear()) : new Date(startDate).getFullYear() }
             ],
             filename: `${isGu ? 'માસિક_નફા_નુકસાન' : 'Monthly_Profit_Loss'}_${new Date(startDate).getFullYear()}.pdf`
          });
       }
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

   const hasActiveFilters = startDate !== new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0] || endDate !== new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

   return (
      <div className="min-h-screen bg-slate-50 font-sans select-none text-slate-800 pb-8">
         <div className="max-w-[1600px] mx-auto px-4 py-4">
            
            {/* Main Application Area */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col relative shadow-none">
               
               {/* Unified Header Bar */}
               <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none print:hidden">
                  <div className="flex items-center gap-4">
                     <span className="text-xs font-extrabold text-[#1d5f84] uppercase tracking-wider flex items-center gap-2">
                        <PieChart size={14} className="text-[#1d5f84]" />
                        {t('profitLoss.dossier')}
                     </span>

                     <div className="flex items-center bg-white border border-slate-200 rounded-md overflow-hidden h-7 shadow-sm">
                        <button
                           onClick={() => setViewMode('summary')}
                           className={`px-3 h-full text-[10px] font-bold uppercase tracking-wider transition-colors ${viewMode === 'summary' ? 'bg-[#1d5f84] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                           {t('profitLoss.summary')}
                        </button>
                        <button
                           onClick={() => { setViewMode('monthly'); fetchMonthlyData(); }}
                           className={`px-3 h-full text-[10px] font-bold uppercase tracking-wider transition-colors ${viewMode === 'monthly' ? 'bg-[#1d5f84] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                           {t('profitLoss.heatmap')}
                        </button>
                     </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5">
                     <button
                        onClick={() => setShowFiltersDrawer(true)}
                        className={`px-2.5 h-7 flex items-center gap-1.5 justify-center transition-all rounded-md cursor-pointer relative select-none shadow-sm text-xs font-semibold ${hasActiveFilters
                              ? 'bg-[#1d5f84] border border-[#1d5f84] text-white hover:bg-[#154662]'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                           }`}
                     >
                        <Filter size={13} className={hasActiveFilters ? "text-white" : "text-slate-500"} />
                        <span>{t('sabhasadLedgerSummary.filters') || "Filters"}</span>
                        {hasActiveFilters && (
                           <span className="absolute -top-1 -right-1 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 border border-white"></span>
                           </span>
                        )}
                     </button>
                     <button
                        onClick={handlePrint}
                        title={t('accountLedger.print') || "Print"}
                        className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
                     >
                        <Printer size={13} className="text-slate-500" />
                     </button>
                     <button
                        onClick={handleExportPDF}
                        title={i18n.language === 'gu' ? 'પીડીએફ ડાઉનલોડ' : 'Download PDF'}
                        className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
                     >
                        <FileText size={13} className="text-slate-500" />
                     </button>
                     <button
                        onClick={fetchProfitLoss}
                        title="Refresh"
                        className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
                     >
                        <RefreshCcw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                     </button>
                  </div>
               </div>

               <div className="flex-1 min-h-[500px] p-4 bg-slate-50">
                  {loading ? (
                     <div className="flex flex-col items-center justify-center py-24 space-y-3">
                        <RefreshCcw className="animate-spin text-slate-400" size={32} />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.loading')}</p>
                     </div>
                  ) : (
                     <div className="space-y-4">
                        {/* Summary Outcome Shard */}
                        {plData && (
                           <div className="bg-white border border-slate-200 p-5 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-lg shadow-sm">
                              <div className="text-center sm:text-left space-y-2">
                                 <div className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 rounded-md ${plData.netProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                    {plData.netProfit >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    System Audit: {plData.netProfit >= 0 ? t('profitLoss.surplus') : t('profitLoss.deficit')}
                                 </div>
                                 <div className="flex items-baseline justify-center sm:justify-start gap-1">
                                    <span className="text-sm font-bold text-slate-400">₹</span>
                                    <span className="text-3xl font-mono font-bold text-slate-800 leading-none">{formatCurrency(plData.netProfit)}</span>
                                 </div>
                                 <div className="text-[10px] font-sans text-slate-500 uppercase tracking-wider">
                                    {t('profitLoss.returnEfficiency')} <span className={`px-1.5 py-0.5 font-mono font-bold rounded-sm ${plData.netProfit >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>{plData.profitMargin}% {t('profitLoss.yield')}</span>
                                 </div>
                              </div>

                              <div className="text-center sm:text-right shrink-0">
                                 <div className="w-12 h-12 border border-slate-200 bg-slate-50 text-slate-500 flex items-center justify-center rounded-lg shadow-sm font-mono font-black text-sm uppercase">
                                    P&L
                                 </div>
                                 <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mt-1.5">Consolidated Impact</p>
                              </div>
                           </div>
                        )}

                        {/* Core Operational Matrix */}
                        {viewMode === 'summary' && plData && (
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {/* Expenditures Deck */}
                              <div className="border border-slate-200 bg-white rounded-lg shadow-sm flex flex-col overflow-hidden">
                                 <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex justify-between items-center text-slate-700 font-bold uppercase text-xs">
                                    <div>
                                       <span className="block">{t('profitLoss.expenditure')}</span>
                                       <span className="text-[9px] text-slate-400 font-mono tracking-wider">{t('saleReport.debitAlloc')}</span>
                                    </div>
                                    <TrendingDown size={16} className="text-rose-500" />
                                 </div>

                                 <div className="flex-1 divide-y divide-slate-100">
                                    <div className="p-3.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                       <div>
                                          <p className="font-bold text-slate-700 text-[11px] uppercase">{t('profitLoss.purchases')}</p>
                                          <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{t('saleReport.inventoryValues')}</p>
                                       </div>
                                       <p className="text-[13px] font-bold font-mono text-slate-800">₹{formatCurrency(plData?.costOfGoodsSold?.netCostOfGoodsSold)}</p>
                                    </div>

                                    {plData.expenseAccounts?.map((acc, i) => (
                                       <div key={i} className="p-3.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                          <div>
                                             <p className="font-bold text-slate-700 text-[11px] uppercase">{acc.account_name}</p>
                                             <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{t('profitLoss.indirectOverheads')}</p>
                                          </div>
                                          <p className="text-[13px] font-bold font-mono text-slate-800">₹{formatCurrency(acc.amount)}</p>
                                       </div>
                                    ))}

                                    {plData.netProfit > 0 && (
                                       <div className="p-3.5 bg-emerald-50 text-emerald-800 flex justify-between items-center font-mono mt-auto border-t border-emerald-100">
                                          <div>
                                             <span className="text-[9px] text-emerald-500 uppercase tracking-wider">{t('saleReport.surplusProvision')}</span>
                                             <span className="text-xs font-bold block uppercase">{t('profitLoss.netProfit')}</span>
                                          </div>
                                          <span className="text-sm font-black text-emerald-600">₹{formatCurrency(plData.netProfit)}</span>
                                       </div>
                                    )}
                                 </div>
                              </div>

                              {/* Income Deck */}
                              <div className="border border-slate-200 bg-white rounded-lg shadow-sm flex flex-col overflow-hidden">
                                 <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex justify-between items-center text-slate-700 font-bold uppercase text-xs">
                                    <div>
                                       <span className="block">{t('profitLoss.revenue')}</span>
                                       <span className="text-[9px] text-slate-400 font-mono tracking-wider">{t('saleReport.creditAlloc')}</span>
                                    </div>
                                    <TrendingUp size={16} className="text-emerald-500" />
                                 </div>

                                 <div className="flex-1 divide-y divide-slate-100">
                                    <div className="p-3.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                       <div>
                                          <p className="font-bold text-slate-700 text-[11px] uppercase">{t('profitLoss.sales')}</p>
                                          <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{t('saleReport.inwardsRevenue')}</p>
                                       </div>
                                       <p className="text-[13px] font-bold font-mono text-slate-800">₹{formatCurrency(plData?.revenue?.netSales)}</p>
                                    </div>

                                    {plData.incomeAccounts?.map((acc, i) => (
                                       <div key={i} className="p-3.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                          <div>
                                             <p className="font-bold text-slate-700 text-[11px] uppercase">{acc.account_name}</p>
                                             <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{t('profitLoss.secondaryInflow')}</p>
                                          </div>
                                          <p className="text-[13px] font-bold font-mono text-slate-800">₹{formatCurrency(acc.amount)}</p>
                                       </div>
                                    ))}

                                    {plData.netProfit < 0 && (
                                       <div className="p-3.5 bg-rose-50 text-rose-800 flex justify-between items-center font-mono mt-auto border-t border-rose-100">
                                          <div>
                                             <span className="text-[9px] text-rose-500 uppercase tracking-wider">{t('saleReport.equityDeficit')}</span>
                                             <span className="text-xs font-bold block uppercase">{t('profitLoss.netLoss')}</span>
                                          </div>
                                          <span className="text-sm font-black text-rose-600">₹{formatCurrency(Math.abs(plData.netProfit))}</span>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        )}

                        {/* Verification Deck */}
                        {viewMode === 'summary' && plData && (
                           <div className="bg-[#1d5f84] p-[1px] border border-[#154662] rounded-lg flex flex-col md:flex-row shadow-sm text-white font-mono text-[11px]">
                              <div className="flex-1 px-4 py-2 border-b md:border-b-0 md:border-r border-[#154662] flex justify-between items-center">
                                 <span className="text-blue-200 uppercase tracking-wider font-bold">{t('profitLoss.aggregateExpenditure')}</span>
                                 <span className="text-sm font-black text-white">
                                    ₹{formatCurrency(Math.max(
                                       (plData?.revenue?.netSales || 0) + (plData.incomeAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0),
                                       (plData?.costOfGoodsSold?.netCostOfGoodsSold || 0) + (plData.expenseAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0)
                                    ))}
                                 </span>
                              </div>
                              <div className="flex-1 px-4 py-2 flex justify-between items-center">
                                 <span className="text-blue-200 uppercase tracking-wider font-bold">{t('profitLoss.aggregateRevenue')}</span>
                                 <span className="text-sm font-black text-white">
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
                           <div className="border border-slate-200 bg-white flex flex-col min-h-[450px] rounded-lg shadow-sm overflow-hidden">
                              <div className="flex-1 overflow-x-auto scroller-airy bg-white">
                                 <table className="w-full text-left border-collapse select-none">
                                    <thead className="sticky top-0 z-20 shadow-sm">
                                       <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                                          <th className="px-4 py-2 border-r border-slate-200 whitespace-nowrap">{t('common.date')}</th>
                                          <th className="px-4 py-2 border-r border-slate-200 text-right whitespace-nowrap">{t('profitLoss.revenueShard')}</th>
                                          <th className="px-4 py-2 border-r border-slate-200 text-right whitespace-nowrap">{t('profitLoss.costExposure')}</th>
                                          <th className="px-4 py-2 border-r border-slate-200 text-right whitespace-nowrap">{t('profitLoss.resultantYield')}</th>
                                          <th className="px-4 py-2 text-right whitespace-nowrap">{t('profitLoss.intensity')}</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                       {monthlyData.length > 0 ? (
                                          monthlyData.map((m, i) => {
                                             const yieldRate = m.netSales > 0 ? ((m.grossProfit / m.netSales) * 100).toFixed(1) : '0.0';
                                             return (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                   <td className="px-4 py-2.5 border-r border-slate-100 text-[11px] font-mono">
                                                      <div className="flex items-center gap-3">
                                                         <span className="w-6 h-6 bg-slate-100 border border-slate-200 text-slate-600 rounded flex items-center justify-center font-bold text-[10px]">{(i + 1).toString().padStart(2, '0')}</span>
                                                         <span className="font-bold text-slate-800 uppercase">{monthNames[m.month - 1]}</span>
                                                      </div>
                                                   </td>
                                                   <td className="px-4 py-2.5 border-r border-slate-100 text-right text-[11px] font-mono font-bold text-slate-700">₹{formatCurrency(m.netSales)}</td>
                                                   <td className="px-4 py-2.5 border-r border-slate-100 text-right text-[11px] font-mono font-bold text-slate-500">₹{formatCurrency(m.netCOGS)}</td>
                                                   <td className="px-4 py-2.5 border-r border-slate-100 text-right">
                                                      <span className={`px-2 py-0.5 rounded-sm border text-[10px] font-bold font-mono ${m.grossProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                                         ₹{formatCurrency(m.grossProfit)}
                                                      </span>
                                                   </td>
                                                   <td className="px-4 py-2.5 text-right">
                                                      <div className="flex flex-col items-end gap-1 font-sans">
                                                         <span className="text-[10px] font-bold text-slate-500 font-mono">{yieldRate}% Yield</span>
                                                         <div className="w-24 h-1.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
                                                            <div className={`h-full ${parseFloat(yieldRate) > 15 ? 'bg-emerald-500' : 'bg-[#1d5f84]'}`} style={{ width: `${Math.min(100, Math.max(0, parseFloat(yieldRate) * 3))}%` }}></div>
                                                         </div>
                                                      </div>
                                                   </td>
                                                </tr>
                                             )
                                          })
                                       ) : (
                                          <tr>
                                             <td colSpan="5" className="py-24 text-center">
                                                <Layers size={32} className="mx-auto mb-2 text-slate-300" />
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No Timeline Vectors Detected</p>
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
                              <div key={i} className="bg-white border border-slate-200 p-3 shadow-sm flex items-center justify-between rounded-lg">
                                 <div>
                                    <span className="text-[9px] font-sans text-slate-400 uppercase tracking-wider">{stat.label}</span>
                                    <span className={`text-[13px] font-bold block ${i === 2 && plData?.netProfit < 0 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>{stat.val}</span>
                                 </div>
                                 <div className="w-8 h-8 border border-slate-100 bg-slate-50 text-slate-400 flex items-center justify-center rounded-md shrink-0">
                                    {stat.icon}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>

               {/* Footer */}
               <div className="bg-slate-100 border-t border-slate-200 px-4 py-3 flex justify-between items-center text-[9px] font-mono text-slate-400 uppercase tracking-wider select-none print:hidden">
                  <div className="flex items-center gap-3">
                     <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[#1d5f84] rounded-full"></div> System Status: Verified</span>
                  </div>
                  <div>
                     <span>{company?.company_name} / Registry Auth</span>
                  </div>
               </div>
            </div>
         </div>

         {/* Modern Slide-Out Filters Drawer (WOW design with animation in & out) */}
         <div className={`fixed inset-0 z-[100] overflow-hidden ${showFiltersDrawer ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px] transition-opacity duration-300 ${showFiltersDrawer ? 'opacity-100' : 'opacity-0'}`} onClick={() => setShowFiltersDrawer(false)} />

            <div className={`fixed inset-y-0 right-0 max-w-full flex pl-10 transform transition-transform duration-300 ease-in-out ${showFiltersDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
               <div className="w-screen max-w-sm bg-white border-l border-slate-200 flex flex-col shadow-none">
                  
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                     <div className="flex items-center gap-2 select-none">
                        <Filter size={14} className="text-[#1d5f84]" />
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Filter Parameters</span>
                     </div>
                     <button onClick={() => setShowFiltersDrawer(false)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer">
                        <X size={15} />
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     <div className="space-y-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('sabhasadLedgerSummary.dateRange') || "Date Range Period"}</span>
                        <div className="grid grid-cols-2 gap-2">
                           <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold uppercase">From</span>
                              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-10 pr-2 py-1.5 text-xs text-slate-700 font-bold font-mono outline-none w-full" />
                           </div>
                           <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold uppercase">To</span>
                              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-10 pr-2 py-1.5 text-xs text-slate-700 font-bold font-mono outline-none w-full" />
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-200">
                     <button onClick={() => {
                        const today = new Date();
                        setStartDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
                        setEndDate(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]);
                     }} className="w-full flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs py-2 rounded-md transition cursor-pointer shadow-sm uppercase tracking-wider">
                        <X size={14} /> {t('accountLedger.clear') || "Reset Parameters"}
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
