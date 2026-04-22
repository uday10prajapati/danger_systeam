import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart, 
  ArrowUpRight, ArrowDownLeft, Calendar, FileText,
  Briefcase, ShoppingBag, CreditCard, ChevronRight,
  Info, RefreshCw, Printer, Download, Activity, Database
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

        {viewMode === 'summary' && !plData ? (
           <div className="bg-white rounded-[2.5rem] p-32 text-center border-4 border-dashed border-slate-100 opacity-60">
              <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                 <FileText className="text-slate-200" size={48} strokeWidth={1} />
              </div>
              <h3 className="text-2xl font-black text-slate-300 uppercase tracking-[0.3em] italic">Zero Transaction Density</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] max-w-sm mx-auto mt-4 leading-relaxed">System buffer contains no financial descriptors for the isolated chronological window.</p>
           </div>
        ) : viewMode === 'summary' && plData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Primary Profit Indicator - Industrial Hero Card */}
            <div className="lg:col-span-12">
               <div className={`relative overflow-hidden p-10 rounded-[2.5rem] shadow-2xl border-l-[1rem] transition-all group ${plData.netProfit >= 0 ? 'bg-white border-black' : 'bg-slate-900 border-red-700'}`}>
                  <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-12">
                     <div className="text-center lg:text-left flex-1">
                        <span className={`inline-flex items-center gap-2 px-4 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] mb-4 border-2 ${plData.netProfit >= 0 ? 'bg-white text-black border-black' : 'bg-red-800 text-white border-red-900'}`}>
                           {plData.netProfit >= 0 ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
                           Settlement Outcome: {plData.netProfit >= 0 ? 'Surplus' : 'Deficit'}
                        </span>
                        <h2 className={`text-7xl font-black tracking-tighter flex items-center gap-2 italic ${plData.netProfit >= 0 ? 'text-black' : 'text-white'}`}>
                           <span className={`text-2xl not-italic ${plData.netProfit >= 0 ? 'text-slate-300 font-black' : 'text-red-900'}`}>₹</span>
                           {formatCurrency(plData.netProfit)}
                        </h2>
                        <div className="flex items-center gap-4 mt-4">
                           <p className={`text-[11px] font-black uppercase tracking-widest ${plData.netProfit >= 0 ? 'text-slate-400' : 'text-slate-500'}`}>
                              Efficiency Index: 
                           </p>
                           <span className={`px-3 py-1 rounded-md text-xs font-black italic tracking-tighter ${plData.netProfit >= 0 ? 'bg-slate-100 text-black border border-black' : 'bg-red-900 text-white'}`}>
                              {plData.profitMargin}% Margin Yield
                           </span>
                        </div>
                     </div>

                     <div className={`grid grid-cols-3 gap-10 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-slate-100/10 pt-10 lg:pt-0 lg:pl-16 ${plData.netProfit >= 0 ? 'text-black' : 'text-slate-500'}`}>
                        <div className="text-center lg:text-right">
                           <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-40">Gross Positioning</p>
                           <p className="text-2xl font-black italic tracking-tight">₹{formatShortCurrency(plData.grossProfit)}</p>
                        </div>
                        <div className="text-center lg:text-right">
                           <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-40">Op. Overhead</p>
                           <p className="text-2xl font-black italic tracking-tight">₹{formatShortCurrency(plData.operatingExpenses)}</p>
                        </div>
                        <div className="text-center lg:text-right">
                           <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-40">Audit Revenue</p>
                           <p className={`text-2xl font-black italic tracking-tight ${plData.netProfit >= 0 ? 'text-slate-900' : 'text-white'}`}>₹{formatShortCurrency(plData.revenue.netSales)}</p>
                        </div>
                     </div>
                  </div>
                  {/* Decorative high-contrast background elements */}
                  <div className={`absolute -right-16 -bottom-16 opacity-[0.03] pointer-events-none transition-all duration-1000 group-hover:scale-110 ${plData.netProfit >= 0 ? 'text-black' : 'text-white'}`}>
                     {plData.netProfit >= 0 ? <ArrowUpRight size={400} strokeWidth={4} /> : <ArrowDownLeft size={400} strokeWidth={4} />}
                  </div>
               </div>
            </div>

            {/* Trading Account Structure - Industrial Grids */}
            <div className="lg:col-span-12 xl:col-span-6 space-y-8">
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-8 py-5 border-b-2 border-black flex justify-between items-center">
                  <h3 className="font-black text-white uppercase tracking-[0.2em] italic text-xs flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                    Direct Trading Audit
                  </h3>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-700 px-3 py-1 rounded-lg">Operational Inflow</span>
                </div>
                
                <div className="p-10 space-y-10">
                  {/* Revenue Part - Sleek Monochrome */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-slate-900 border-b border-slate-100 pb-2">
                      <TrendingUp size={16} strokeWidth={3} />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em]">Gross Revenue Streams</span>
                    </div>
                    <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 space-y-4 shadow-inner">
                       <div className="flex justify-between items-center group">
                          <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest group-hover:text-black transition-colors">Nominal Sales Volume</span>
                          <span className="text-slate-900 font-black font-mono">₹{formatCurrency(plData.revenue.totalSalesRevenue)}</span>
                       </div>
                       <div className="flex justify-between items-center group">
                          <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 group-hover:text-red-600 transition-colors">
                             <div className="w-4 h-0.5 bg-red-600/20"></div> Returns & Cancellations
                          </span>
                          <span className="font-black text-red-700 italic font-mono">- ₹{formatCurrency(plData.revenue.salesReturns)}</span>
                       </div>
                       <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                          <span className="text-black font-black text-xs uppercase tracking-widest">Net Revenue Aggregation</span>
                          <span className="text-slate-900 font-black text-2xl tracking-tighter italic">₹{formatCurrency(plData.revenue.netSales)}</span>
                       </div>
                    </div>
                  </div>

                  {/* COGS Part - Sleek Monochrome */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-slate-500 border-b border-slate-100 pb-2">
                      <TrendingDown size={16} strokeWidth={3} />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em]">Direct Inventory Costs</span>
                    </div>
                    <div className="bg-white border-2 border-slate-50 rounded-2xl p-6 space-y-4 shadow-sm italic">
                       <div className="flex justify-between items-center group">
                          <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest group-hover:text-black transition-colors">Procurement Volume</span>
                          <span className="text-slate-500 font-black font-mono">₹{formatCurrency(plData.costOfGoodsSold.purchaseCost)}</span>
                       </div>
                       <div className="flex justify-between items-center group">
                          <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 group-hover:text-black transition-colors">
                             <div className="w-4 h-0.5 bg-slate-200"></div> Recovery & Rebates
                          </span>
                          <span className="font-black text-slate-400 font-mono">- ₹{formatCurrency(plData.costOfGoodsSold.purchaseReturns)}</span>
                       </div>
                       <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-slate-400 font-black text-xs uppercase tracking-widest italic opacity-50 underline decoration-slate-200 underline-offset-4">Cost Basis Output</span>
                          <span className="text-slate-500 font-black text-2xl tracking-tighter opacity-80 decoration-slate-100 underline decoration-8 underline-offset-[-2px]">₹{formatCurrency(plData.costOfGoodsSold.netCostOfGoodsSold)}</span>
                       </div>
                    </div>
                  </div>
                  
                  {/* Gross Profit Summary Ribbon */}
                  <div className="bg-black rounded-2xl p-6 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.3)] flex justify-between items-center text-white relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-24 h-full bg-white/5 skew-x-12 translate-x-12 group-hover:translate-x-0 transition-transform duration-700"></div>
                     <div className="flex items-center gap-4 relative z-10">
                        <div className="bg-white/10 p-2.5 rounded-xl border border-white/20">
                           <DollarSign size={24} strokeWidth={3} />
                        </div>
                        <div>
                           <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Consolidated Result</p>
                           <p className="text-2xl font-black uppercase italic tracking-tighter">Gross Trading Profit</p>
                        </div>
                     </div>
                     <span className="text-3xl font-black italic tracking-tighter relative z-10 transition-transform group-hover:translate-x-[-10px] duration-500">₹{formatCurrency(plData.grossProfit)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Operating Results - Heavy Industrial Grid */}
            <div className="lg:col-span-12 xl:col-span-6 space-y-8">
              <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl border-4 border-black overflow-hidden h-full flex flex-col">
                <div className="px-8 py-5 border-b-2 border-black flex justify-between items-center bg-black">
                  <h3 className="font-black text-white uppercase tracking-[0.2em] italic text-xs flex items-center gap-3">
                    <Activity size={18} className="text-slate-500" strokeWidth={3} />
                    Indirect Performance Matrix
                  </h3>
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest border border-slate-800 px-3 py-1 rounded-lg">Overhead Load</span>
                </div>
                
                <div className="p-10 flex-1 flex flex-col space-y-12">
                  {/* Expenses Heavy Visualizer */}
                  <div className="space-y-6">
                     <div className="flex justify-between items-end border-b-2 border-slate-800 pb-4">
                        <div className="flex items-center gap-3 text-slate-500">
                           <CreditCard size={18} strokeWidth={3} />
                           <span className="text-[11px] font-black uppercase tracking-[0.3em]">Indirect Expenditure Capture</span>
                        </div>
                        <span className="text-3xl font-black text-white italic tracking-tighter">₹{formatCurrency(plData.operatingExpenses)}</span>
                     </div>
                     
                     {/* Heavy Industrial Progress Bars */}
                     <div className="space-y-6">
                        <div className="space-y-2">
                           <div className="flex justify-between text-[10px] font-black text-slate-500 px-1 uppercase tracking-widest">
                              <span>Overhead Absorption Index</span>
                              <span className={plData.operatingExpenses > plData.grossProfit ? 'text-red-600' : 'text-white'}>
                                 {((plData.operatingExpenses / (plData.grossProfit || 1)) * 100).toFixed(1)}% Usage
                              </span>
                           </div>
                           <div className="w-full h-4 bg-black rounded-lg overflow-hidden flex border border-slate-800 p-1">
                              <div 
                                className={`h-full rounded transition-all duration-1000 shadow-xl ${plData.operatingExpenses > plData.grossProfit ? 'bg-red-700 animate-pulse' : 'bg-slate-600'}`} 
                                style={{ width: `${Math.min(100, (plData.operatingExpenses / (plData.grossProfit || 1)) * 100)}%` }}
                              />
                           </div>
                        </div>

                        {/* Heavy Industrial System Memo */}
                        <div className="bg-black/50 rounded-2xl p-8 border-2 border-slate-800 mt-6 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-1000"></div>
                           <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] leading-relaxed relative z-10 italic">
                             <span className="text-white block mb-2 not-italic">AUTOMATED LEDGER ANALYSIS:</span>
                             Total overhead encapsulates all indirect disbursements captured from global account registries flagged with "Administrative" or "Establishment" cost tags. This includes verified salary disbursements, rent utilities, and ancillary overheads processed within the current isolation window.
                           </p>
                        </div>
                     </div>
                  </div>

                  {/* Ultimate Bottom Line Section */}
                  <div className="mt-auto space-y-6">
                     <div className="flex items-center gap-3 text-slate-600 border-b border-slate-800 pb-2">
                        <ArrowUpRight size={18} strokeWidth={3} />
                        <span className="text-[11px] font-black uppercase tracking-[0.3em]">Final Settlement Status</span>
                     </div>
                     <div className={`p-10 rounded-[2.5rem] flex flex-col items-center justify-center border-4 text-center transition-all group ${
                        plData.netProfit >= 0 ? 'bg-white border-white' : 'bg-black border-red-900 border-dashed'
                     }`}>
                        <p className={`text-[11px] font-black uppercase tracking-[0.5em] mb-2 ${plData.netProfit >= 0 ? 'text-slate-400' : 'text-red-800'}`}>
                           Audited Position
                        </p>
                        <h4 className={`text-5xl font-black mb-2 italic tracking-tighter uppercase transition-transform group-hover:scale-110 duration-500 ${
                           plData.netProfit >= 0 ? 'text-black' : 'text-red-700'
                        }`}>
                           {plData.netProfit >= 0 ? 'Net Surplus' : 'Net Deficit'}
                        </h4>
                        <div className={`text-2xl font-black font-mono italic ${
                           plData.netProfit >= 0 ? 'text-slate-400' : 'text-white underline decoration-red-900 decoration-8 underline-offset-8'
                        }`}>
                           ₹{formatCurrency(plData.netProfit)}
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Componentization Visualizer */}
            {plData.salesByType && plData.salesByType.length > 0 && (
               <div className="lg:col-span-12">
                  <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
                     <div className="bg-slate-50 px-10 py-6 border-b border-slate-200 flex justify-between items-center">
                        <div>
                           <h3 className="font-black text-slate-900 text-2xl tracking-tighter uppercase italic">Registry Componentization</h3>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Transaction Methodology Distribution</p>
                        </div>
                        <div className="bg-white px-6 py-2 rounded-xl border border-slate-200 font-black uppercase text-[10px] tracking-widest text-black shadow-sm italic">
                           Live Data Stream Active
                        </div>
                     </div>
                     <div className="p-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                           {plData.salesByType.map((sale, idx) => (
                              <div key={idx} className="group relative bg-white hover:bg-black p-8 rounded-[2rem] border-2 border-slate-50 hover:border-black transition-all hover:shadow-2xl hover:translate-y-[-5px]">
                                 <div className="flex justify-between items-start mb-8">
                                    <div className="p-3 rounded-2xl bg-slate-100 group-hover:bg-white/10 group-hover:text-white transition-colors border border-slate-200 group-hover:border-white/20 shadow-inner">
                                       {sale.payment_type === 'cash' ? <CreditCard size={24} strokeWidth={2.5} /> : <FileText size={24} strokeWidth={2.5} />}
                                    </div>
                                    <div className="text-right">
                                       <span className="text-[10px] font-black text-slate-300 uppercase group-hover:text-slate-600 block">Batch Vol.</span>
                                       <span className="text-xs font-black text-slate-900 group-hover:text-white font-mono">{sale.transaction_count} TX</span>
                                    </div>
                                 </div>
                                 <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500 mb-1">{sale.payment_type} PROTOCOL</h4>
                                 <p className="text-3xl font-black text-slate-900 group-hover:text-white tracking-tighter italic font-mono transition-transform group-hover:translate-x-2 duration-300">₹{formatCurrency(sale.amount)}</p>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            )}
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
}
