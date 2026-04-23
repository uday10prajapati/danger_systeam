import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart, 
  ArrowUpRight, ArrowDownLeft, Calendar, FileText,
  Briefcase, ShoppingBag, CreditCard, ChevronRight,
  Info, RefreshCw, Printer, Download, Activity, Database, CheckCircle
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

  // Set default dates (current month)
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (!company?.id) {
      setLoading(false);
      return;
    }
    if (startDate && endDate) {
      fetchProfitLoss();
    }
  }, [startDate, endDate, company]);

  const fetchProfitLoss = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/profit-loss`, {
        params: { startDate, endDate },
        headers: { 'x-company-id': company.id, 'x-user-id': 1 }
      });

      if (response.data.success) {
        setPlData(response.data.data);
      } else {
        setPlData(null);
      }
    } catch (error) {
      console.error('Error fetching P&L:', error);
      setPlData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      const year = new Date(startDate).getFullYear();
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/profit-loss/monthly/${year}`, {
        headers: { 'x-company-id': company.id, 'x-user-id': 1 }
      });

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

  if (loading) {
     return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center font-black uppercase tracking-widest text-slate-400">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-pulse" />
          <p className="text-lg mb-4 italic">Aggregating Fiscal Results...</p>
          <div className="w-16 h-1 bg-slate-200 mx-auto overflow-hidden rounded-full">
             <div className="w-full h-full bg-black animate-[slide_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!company?.id) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 font-sans">
        <div className="text-center p-12 bg-white rounded-2xl shadow-2xl max-w-md border-4 border-black">
           <div className="bg-slate-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Database className="text-white" size={32} />
           </div>
           <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter italic">Registry Error</h2>
           <p className="text-slate-500 mb-8 font-bold uppercase tracking-widest text-[10px]">Active company context not detected in secure session buffer.</p>
           <button onClick={() => window.location.reload()} className="bg-black text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all flex items-center gap-3 mx-auto shadow-xl active:scale-95">
              <RefreshCw size={18} strokeWidth={3} /> Re-Initialize Session
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header - Industrial Monochrome */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b-4 border-black pb-4 print:hidden">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
               Profit & Loss Audit
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">{company.company_name} / FISCAL PERFORMANCE DOSSIER</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
             <div className="flex bg-slate-100 p-1.5 rounded-xl border-2 border-slate-200">
                <button 
                  onClick={() => setViewMode('summary')}
                  className={`px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all ${
                    viewMode === 'summary' 
                      ? 'bg-black text-white shadow-xl' 
                      : 'text-slate-400 hover:text-black'
                  }`}
                >Global Summary</button>
                <button 
                  onClick={() => { setViewMode('monthly'); fetchMonthlyData(); }}
                  className={`px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all ${
                    viewMode === 'monthly' 
                      ? 'bg-black text-white shadow-xl' 
                      : 'text-slate-400 hover:text-black'
                  }`}
                >Monthly Heatmap</button>
             </div>
             
             <div className="flex items-center gap-2 bg-white p-1 rounded-xl border-2 border-slate-100 shadow-sm">
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border-2 border-transparent focus:border-black outline-none font-black text-[10px] uppercase text-slate-600 transition-all cursor-pointer"
                />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                <input 
                   type="date"
                   value={endDate}
                   onChange={(e) => setEndDate(e.target.value)}
                   className="px-3 py-1.5 rounded-lg border-2 border-transparent focus:border-black outline-none font-black text-[10px] uppercase text-slate-600 transition-all cursor-pointer"
                />
             </div>
             
             <div className="flex gap-2">
                <button className="p-2.5 bg-white hover:bg-slate-100 text-slate-400 hover:text-black rounded-xl transition-all border-2 border-slate-100 shadow-sm active:scale-90">
                   <Printer size={18} strokeWidth={2.5} />
                </button>
                <button className="p-2.5 bg-white hover:bg-slate-100 text-slate-400 hover:text-black rounded-xl transition-all border-2 border-slate-100 shadow-sm active:scale-90">
                   <Download size={18} strokeWidth={2.5} />
                </button>
             </div>
          </div>
        </div>

        {viewMode === 'summary' && !plData && (
           <div className="bg-white rounded-[2.5rem] p-32 text-center border-4 border-dashed border-slate-100 animate-pulse">
              <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                 <FileText className="text-slate-200" size={48} strokeWidth={1} />
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] max-w-sm mx-auto mt-4 leading-relaxed">System buffer contains no financial descriptors for the isolated chronological window.</p>
            </div>
        )}

        {viewMode === 'summary' && plData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* High-Impact Result Card */}
            <div className={`relative overflow-hidden p-10 rounded-[2.5rem] shadow-2xl border-l-[1.5rem] transition-all group ${
              plData.netProfit >= 0 ? 'bg-white border-green-600' : 'bg-slate-900 border-red-600'
            }`}>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="text-center md:text-left">
                  <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-4 border-2 ${
                    plData.netProfit >= 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-900/30 text-red-400 border-red-900'
                  }`}>
                    {plData.netProfit >= 0 ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
                    AUDIT OUTCOME: {plData.netProfit >= 0 ? 'SURPLUS' : 'DEFICIT'}
                  </span>
                  <h2 className={`text-7xl font-black tracking-tighter italic ${plData.netProfit >= 0 ? 'text-black' : 'text-white'}`}>
                    <span className="text-2xl not-italic opacity-30 mr-2">₹</span>
                    {formatCurrency(plData.netProfit)}
                  </h2>
                  <div className="flex items-center gap-4 mt-6">
                    <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${plData.netProfit >= 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                      Return Efficiency:
                    </p>
                    <span className={`px-4 py-1 rounded-lg text-xs font-black italic tracking-tighter ${
                      plData.netProfit >= 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {plData.profitMargin}% Yield
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center md:items-end gap-2">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 ${
                    plData.netProfit >= 0 ? 'border-green-100 text-green-600' : 'border-red-900/30 text-red-600'
                  }`}>
                    {plData.netProfit >= 0 ? <TrendingUp size={48} strokeWidth={2.5} /> : <TrendingDown size={48} strokeWidth={2.5} />}
                  </div>
                  <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${plData.netProfit >= 0 ? 'text-green-600/50' : 'text-red-600/50'}`}>
                    {plData.netProfit >= 0 ? 'Consolidated Profit' : 'Consolidated Loss'}
                  </p>
                </div>
              </div>
              
              {/* Abstract decorative background */}
              <div className={`absolute -right-20 -bottom-20 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000 ${
                plData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {plData.netProfit >= 0 ? <TrendingUp size={400} /> : <TrendingDown size={400} />}
              </div>
            </div>

            {/* Two-Column Profit & Loss Account */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-4 border-black rounded-[3rem] overflow-hidden shadow-2xl bg-white">
              
              {/* LEFT SIDE: EXPENSES / DEBIT */}
              <div className="border-b-4 lg:border-b-0 lg:border-r-4 border-black flex flex-col bg-slate-50/30">
                <div className="bg-slate-900 p-8 border-b-4 border-black text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                  <h3 className="text-white font-black uppercase tracking-[0.6em] italic text-sm">Expenditure Registry</h3>
                  <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest mt-1">Debit Allocations (ઉધાર બાજુ)</p>
                </div>

                <div className="flex-1 divide-y-2 divide-slate-100">
                  {/* Purchase Header */}
                  <div className="p-8 flex justify-between items-center hover:bg-white transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <ShoppingBag size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 uppercase italic tracking-tighter text-lg">Net Purchases</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inventory Inflow Value</p>
                      </div>
                    </div>
                    <span className="text-2xl font-black font-mono tracking-tighter">₹{formatCurrency(plData.costOfGoodsSold.netCostOfGoodsSold)}</span>
                  </div>

                  {/* Individual Expense Accounts */}
                  {plData.expenseAccounts && plData.expenseAccounts.length > 0 ? (
                    plData.expenseAccounts.map((acc, idx) => (
                      <div key={idx} className="p-8 flex justify-between items-center hover:bg-white transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-2xl bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                            <CreditCard size={20} />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 uppercase italic tracking-tighter text-lg">{acc.account_name}</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Operational Overhead</p>
                          </div>
                        </div>
                        <span className="text-2xl font-black font-mono tracking-tighter">₹{formatCurrency(acc.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center opacity-20 italic font-black text-slate-300 uppercase tracking-widest text-xs">
                      No Additional Overheads Detected
                    </div>
                  )}

                  {/* Spacer to push balanced items to bottom */}
                  <div className="flex-grow min-h-[100px]"></div>

                  {/* Balancing Item: NET PROFIT (If positive, it balances the expense side) */}
                  {plData.netProfit > 0 && (
                     <div className="p-10 bg-green-600 text-white flex justify-between items-end relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 animate-pulse"></div>
                        <div className="relative z-10">
                           <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 text-green-200">System Surplus</p>
                           <h4 className="text-4xl font-black uppercase italic tracking-tighter">Net Profit</h4>
                        </div>
                        <div className="relative z-10 text-right">
                           <p className="text-[9px] font-bold uppercase tracking-widest text-green-200 mb-1">C/O to Balance Sheet</p>
                           <span className="text-4xl font-black font-mono tracking-tighter">₹{formatCurrency(plData.netProfit)}</span>
                        </div>
                     </div>
                  )}
                </div>
              </div>

              {/* RIGHT SIDE: INCOME / CREDIT */}
              <div className="flex flex-col bg-white">
                <div className="bg-slate-900 p-8 border-b-4 border-black text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                  <h3 className="text-white font-black uppercase tracking-[0.6em] italic text-sm">Income Registry</h3>
                  <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest mt-1">Credit Allocations (જમા બાજુ)</p>
                </div>

                <div className="flex-1 divide-y-2 divide-slate-100 flex flex-col">
                  {/* Sales Header */}
                  <div className="p-8 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-slate-900 text-white group-hover:bg-black transition-all">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 uppercase italic tracking-tighter text-lg">Net Sales</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Revenue Outflow Value</p>
                      </div>
                    </div>
                    <span className="text-2xl font-black font-mono tracking-tighter">₹{formatCurrency(plData.revenue.netSales)}</span>
                  </div>

                  {/* Individual Revenue Accounts */}
                  {plData.incomeAccounts && plData.incomeAccounts.length > 0 ? (
                    plData.incomeAccounts.map((acc, idx) => (
                      <div key={idx} className="p-8 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-2xl bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                            <DollarSign size={20} />
                          </div>
                          <div>
                            <h4 className="font-black text-slate-900 uppercase italic tracking-tighter text-lg">{acc.account_name}</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Indirect Revenue</p>
                          </div>
                        </div>
                        <span className="text-2xl font-black font-mono tracking-tighter">₹{formatCurrency(acc.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center opacity-20 italic font-black text-slate-300 uppercase tracking-widest text-xs">
                      No Secondary Revenue Streams
                    </div>
                  )}

                  {/* Spacer to push balanced items to bottom */}
                  <div className="flex-grow min-h-[100px]"></div>

                  {/* Balancing Item: NET LOSS (If negative, it balances the income side) */}
                  {plData.netProfit < 0 && (
                     <div className="p-10 bg-red-600 text-white flex justify-between items-end relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 animate-pulse"></div>
                        <div className="relative z-10">
                           <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 text-red-200">System Deficit</p>
                           <h4 className="text-4xl font-black uppercase italic tracking-tighter">Net Loss</h4>
                        </div>
                        <div className="relative z-10 text-right">
                           <p className="text-[9px] font-bold uppercase tracking-widest text-red-200 mb-1">Impact on Capital</p>
                           <span className="text-4xl font-black font-mono tracking-tighter">₹{formatCurrency(Math.abs(plData.netProfit))}</span>
                        </div>
                     </div>
                  )}
                </div>
              </div>
            </div>

            {/* Verification Line - Industrial Totals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-x-4 border-b-4 border-black rounded-b-[3rem] overflow-hidden -mt-8 bg-black group">
               <div className="p-6 border-r-2 border-slate-800 flex justify-between items-center group-hover:bg-slate-900 transition-colors">
                  <span className="text-white font-black uppercase tracking-[0.5em] text-[10px]">TOTAL EXPENDITURE</span>
                  <span className="text-white text-3xl font-black font-mono italic tracking-tighter">
                     ₹{formatCurrency(Math.max(
                        plData.revenue.netSales + (plData.incomeAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0),
                        plData.costOfGoodsSold.netCostOfGoodsSold + (plData.expenseAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0)
                     ))}
                  </span>
               </div>
               <div className="p-6 flex justify-between items-center group-hover:bg-slate-900 transition-colors">
                  <span className="text-white font-black uppercase tracking-[0.5em] text-[10px]">TOTAL REVENUE</span>
                  <span className="text-white text-3xl font-black font-mono italic tracking-tighter">
                  ₹{formatCurrency(Math.max(
                        plData.revenue.netSales + (plData.incomeAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0),
                        plData.costOfGoodsSold.netCostOfGoodsSold + (plData.expenseAccounts?.reduce((sum, a) => sum + parseFloat(a.amount), 0) || 0)
                     ))}
                  </span>
               </div>
            </div>

            {/* Performance Indicators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
               <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-xl group hover:border-black transition-all">
                  <p className="text-slate-400 font-black uppercase tracking-widest text-[9px] mb-2">Operating Margin</p>
                  <div className="flex items-end justify-between">
                     <h5 className="text-4xl font-black italic tracking-tighter">{plData.profitMargin}%</h5>
                     <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-black" style={{ width: `${Math.min(100, Math.max(0, plData.profitMargin))}%` }}></div>
                     </div>
                  </div>
               </div>
               <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-xl group hover:border-black transition-all">
                  <p className="text-slate-400 font-black uppercase tracking-widest text-[9px] mb-2">Expense Absorption</p>
                  <div className="flex items-end justify-between">
                     <h5 className="text-4xl font-black italic tracking-tighter">{((plData.operatingExpenses / (plData.revenue.netSales || 1)) * 100).toFixed(1)}%</h5>
                     <CreditCard className="text-slate-200 group-hover:text-black transition-colors" size={32} />
                  </div>
               </div>
               <div className={`p-8 rounded-3xl border-2 shadow-xl flex items-center justify-between transition-all ${
                  plData.netProfit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
               }`}>
                  <div>
                     <p className="text-slate-400 font-black uppercase tracking-widest text-[9px] mb-1">Fiscal Health</p>
                     <h5 className={`text-2xl font-black italic tracking-tighter ${plData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {plData.netProfit >= 0 ? 'Optimal Surplus' : 'Deficit Risk'}
                     </h5>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${plData.netProfit >= 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                     <CheckCircle size={24} />
                  </div>
               </div>
            </div>
          </div>
        )}

        {viewMode === 'monthly' && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border-4 border-black overflow-hidden">
            <div className="bg-slate-900 p-8 border-b-4 border-black flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Fiscal Timeline Intensity</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">Chronological Performance Distribution Mapping</p>
              </div>
              <button 
                onClick={fetchMonthlyData}
                className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-100 transition-all shadow-xl active:scale-95"
                >
                <RefreshCw size={18} strokeWidth={3} /> Sync Time Vector
              </button>
            </div>

            <div className="p-10 pt-6">
              {monthlyData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b-2 border-slate-200">
                        <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Time Segment</th>
                        <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 text-right">Net Revenue (+)</th>
                        <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 text-right">Direct Costs (-)</th>
                        <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 text-right">Resultant Balance</th>
                        <th className="py-5 px-8 text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 text-right">Efficiency Gradient</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {monthlyData.map((month, idx) => {
                        const margin = month.netSales > 0 ? ((month.grossProfit / month.netSales) * 100).toFixed(1) : '0.0';
                        return (
                        <tr key={idx} className="group hover:bg-slate-50 transition-all border-b border-slate-100 last:border-0 font-black">
                          <td className="py-6 px-8 text-slate-900 italic text-lg tracking-tighter">
                             <div className="flex items-center gap-6">
                                <span className="w-10 h-10 rounded-xl bg-black border-2 border-slate-800 flex items-center justify-center text-xs text-white font-mono group-hover:scale-110 transition-transform">
                                   {(idx + 1).toString().padStart(2, '0')}
                                </span>
                                {monthNames[month.month - 1]}
                             </div>
                          </td>
                          <td className="py-6 px-8 text-right text-slate-500 font-mono text-base italic">₹{formatCurrency(month.netSales)}</td>
                          <td className="py-6 px-8 text-right text-slate-300 font-mono text-base italic">₹{formatCurrency(month.netCOGS)}</td>
                          <td className="py-6 px-8 text-right">
                             <span className={`px-4 py-2 rounded-xl italic tracking-tighter text-lg ${month.grossProfit >= 0 ? 'bg-white text-black border-2 border-black shadow-lg font-black' : 'bg-red-900/10 text-red-900 border-2 border-red-900 shadow-sm'}`}>
                                ₹{formatCurrency(month.grossProfit)}
                             </span>
                          </td>
                          <td className="py-6 px-8 text-right min-w-[200px]">
                             <div className="flex flex-col items-end gap-2">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{margin}% Yield</div>
                                <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-200">
                                   <div 
                                     className={`h-full rounded-full transition-all duration-1000 ${parseFloat(margin) > 20 ? 'bg-black shadow-[0_0_10px_rgba(0,0,0,0.5)]' : parseFloat(margin) > 0 ? 'bg-slate-400' : 'bg-red-500'}`} 
                                     style={{ width: `${Math.min(100, parseFloat(margin) * 2)}%` }} 
                                   />
                                </div>
                             </div>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-white border-4 border-dashed border-slate-100 rounded-[2.5rem] p-32 text-center opacity-40">
                   <p className="text-slate-300 font-black uppercase tracking-[0.4em] italic">No Timeline Data Synchronized</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

       {/* Global Footer Descriptors */}
       <div className="max-w-[1600px] mx-auto mt-12 pb-10 flex justify-between items-center text-slate-300 font-black uppercase tracking-[0.5em] text-[8px] italic">
          <div className="flex items-center gap-4">
             <span>AUDIT_MODE: INDUSTRIAL_MONOCHROME</span>
             <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
             <span>SECURE_ENCRYPTION_ACTIVE</span>
          </div>
          <div>TIMESTAMP_SYSLOG: {new Date().toISOString()}</div>
       </div>

    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatShortCurrency(value) {
  if (!value) return '0';
  const val = parseFloat(value);
  if (val >= 10000000) return (val / 10000000).toFixed(2) + ' Cr';
  if (val >= 100000) return (val / 100000).toFixed(2) + ' L';
  if (val >= 1000) return (val / 1000).toFixed(1) + ' K';
  return val.toFixed(0);
}
