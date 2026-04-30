import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
   AlertTriangle, TrendingDown, Package, Plus, Search, Filter,
   X, History, ChevronRight, Database, ShieldCheck,
   CheckCircle2, TrendingUp, Layers, Box, Info, Layout,
   RefreshCcw as SyncIcon, ArrowRight
} from 'lucide-react';

// Format numbers with thousand separators
const formatNumber = (num) => {
   if (!num && num !== 0) return '-';
   return parseFloat(num).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
   });
};


export default function StockReport() {
   const { t } = useTranslation();
   const [stockData, setStockData] = useState([]);
   const [lowStockData, setLowStockData] = useState([]);
   const [loading, setLoading] = useState(true);
   const [searchTerm, setSearchTerm] = useState('');
   const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, LOW, OK
   const [selectedItem, setSelectedItem] = useState(null);
   const [itemHistory, setItemHistory] = useState([]);
   const [showHistory, setShowHistory] = useState(false);
   const [company, setCompany] = useState(null);

   useEffect(() => {
      loadCompany();
   }, []);

   useEffect(() => {
      if (company?.id) {
         fetchStockReport();
      }
   }, [company]);

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


   const fetchStockReport = async () => {
      if (!company?.id) return;
      try {
         setLoading(true);
         const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/stock-report`, {
            headers: { 'x-company-id': company.id, 'x-user-id': 1 }
         });
         if (response.data.success) {
            setStockData(response.data.data);
            // Fetch low stock items
            const lowResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/stock-report/low-stock`, {
               headers: { 'x-company-id': company.id, 'x-user-id': 1 }
            });
            setLowStockData(lowResponse.data.data);
         }
      } catch (error) {
         console.error('Error fetching stock report:', error);
      } finally {
         setLoading(false);
      }
   };

   const fetchItemHistory = async (itemId) => {
      if (!company?.id) return;
      try {
         const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/stock-report/item/${itemId}`, {
            headers: { 'x-company-id': company.id, 'x-user-id': 1 }
         });
         if (response.data.success) {
            setItemHistory(response.data.data);
            setShowHistory(true);
         }
      } catch (error) {
         console.error('Error fetching item history:', error);
      }
   };

   const filteredData = stockData.filter(item => {
      const matchesSearch =
         item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
         item.item_name.toLowerCase().includes(searchTerm.toLowerCase());

      if (filterStatus === 'LOW') {
         return matchesSearch && item.stock_status === 'LOW';
      } else if (filterStatus === 'OK') {
         return matchesSearch && item.stock_status === 'OK';
      }
      return matchesSearch;
   });

   const totalValue = {
      purchased: stockData.reduce((sum, item) => sum + parseFloat(item.total_purchased || 0), 0),
      sold: stockData.reduce((sum, item) => sum + parseFloat(item.total_sold || 0), 0),
      current: stockData.reduce((sum, item) => sum + parseFloat(item.current_stock || 0), 0),
   };

   if (!company) {
      return (
         <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
            <div className="text-center font-black uppercase tracking-widest text-slate-300">
               <p className="text-xs mb-6 italic tracking-[0.4em]">Establishing Repository Bridge...</p>
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-4 print:hidden">
               <div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
                     <Package size={12} />
                     <span>Inventory Core / Live Stock Registry</span>
                  </div>
                  <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Repository Audit</h1>
               </div>
               <div className="flex items-center gap-4">
                  <button
                     onClick={fetchStockReport}
                     className="flex items-center gap-2 bg-blue-600 px-8 py-3.5 rounded-lg text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                  >
                     <SyncIcon size={18} className={loading ? 'animate-spin' : ''} />
                     Re-Sync Inventory
                  </button>
               </div>
            </div>

            {/* Dynamic Metric Grid - Compact Airy Modules */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 print:hidden">
               {[
                  { label: 'Live Inventory Qty', val: formatNumber(totalValue.current), icon: <Package size={18} />, color: 'blue' },
                  { label: 'Gross Procurement', val: formatNumber(totalValue.purchased), icon: <Plus size={18} />, color: 'emerald' },
                  { label: 'Fulfilled Sales', val: formatNumber(totalValue.sold), icon: <TrendingDown size={18} />, color: 'indigo' },
                  { label: 'Critical Reorders', val: lowStockData.length, icon: <AlertTriangle size={18} />, color: 'rose' }
               ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm group hover:border-slate-200 transition-all">
                     <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{stat.label}</p>
                        <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                     </div>
                     <p className={`text-4xl font-bold text-slate-800 tracking-tighter ${i === 3 && stat.val > 0 ? 'text-rose-600 animate-pulse' : ''}`}>{stat.val}</p>
                  </div>
               ))}
            </div>

            {/* Global Toolbar - Controller Console */}
            <div className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm mb-10 print:hidden flex flex-wrap items-end gap-4">
               <div className="flex-1 min-w-[350px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 italic">Nomenclature Vector Search</span>
                  <div className="relative group">
                     <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                     <input
                        type="text"
                        placeholder="SEARCH BY ITEM CODE OR NOMENCLATURE..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-bold uppercase text-[11px] tracking-widest"
                     />
                  </div>
               </div>

               <div className="w-full lg:w-[300px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 italic">Repository Status Filter</span>
                  <div className="relative group">
                     <Filter size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                     <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full pl-14 pr-10 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-bold uppercase text-[11px] tracking-widest appearance-none cursor-pointer"
                     >
                        <option value="ALL">ALL REPOSITORY ITEMS</option>
                        <option value="LOW">INSUFFICIENT STOCK ONLY</option>
                        <option value="OK">HEALTHY STOCK LEVELS</option>
                     </select>
                     <ChevronRight size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none rotate-90" />
                  </div>
               </div>

               <button
                  onClick={fetchStockReport}
                  className="bg-slate-900 text-white px-10 py-4 rounded-lg font-bold uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-xl active:scale-95 h-[52px]"
               >Execute Audit</button>
            </div>

            {/* Procurement Alert Manifest */}
            {lowStockData.length > 0 && (
               <div className="bg-rose-600 p-6 rounded-lg mb-10 flex items-center justify-between text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-1000"></div>
                  <div className="flex items-center gap-4 relative z-10">
                     <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center animate-pulse"><AlertTriangle size={28} /></div>
                     <div>
                        <h3 className="text-xl font-bold tracking-tight italic uppercase">Critical Procurement Alert</h3>
                        <p className="text-[10px] font-bold text-rose-100 uppercase tracking-widest italic opacity-80">
                           {lowStockData.length} NOMENCLATURES BREACHED REORDER THRESHOLD
                        </p>
                     </div>
                  </div>
                  <button
                     onClick={() => setFilterStatus('LOW')}
                     className="px-8 py-3 bg-white text-rose-600 rounded-lg font-bold uppercase text-[10px] tracking-widest shadow-lg hover:bg-slate-50 transition-all active:scale-95 relative z-10"
                  >Isolate Vulnerabilities</button>
               </div>
            )}

            {/* Global Stock Registry Manifest */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[600px] relative">

               <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-50">
                  <div className="flex items-center gap-3">
                     <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] italic">Consolidated Asset Manifest</p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Inventory Density: {filteredData.length} Nodes</p>
               </div>

               <div className="flex-1 overflow-x-auto px-4 pb-12 scroller-airy">
                  <table className="w-full text-left">
                     <thead className="bg-[#F8FAFC]">
                        <tr className="uppercase text-[10px] font-bold text-slate-400 tracking-widest italic">
                           <th className="px-8 py-5">Nomenclature Node</th>
                           <th className="px-8 py-5">Classification</th>
                           <th className="px-8 py-5 text-center">Net Procured (+)</th>
                           <th className="px-8 py-5 text-center">Net Sales (-)</th>
                           <th className="px-8 py-5 text-center bg-slate-50/50">Live Postion</th>
                           <th className="px-8 py-5 text-center">Threshold</th>
                           <th className="px-8 py-5 text-center">Status Index</th>
                           <th className="px-8 py-5 text-center">Audit</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {loading ? (
                           <tr>
                              <td colSpan="8" className="py-32 text-center">
                                 <SyncIcon className="animate-spin text-blue-100 mx-auto" size={50} />
                                 <p className="mt-4 text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">Synchronizing Repository Streams...</p>
                              </td>
                           </tr>
                        ) : filteredData.length === 0 ? (
                           <tr>
                              <td colSpan="8" className="py-32 text-center">
                                 <Box className="text-slate-100 mx-auto" size={70} strokeWidth={1} />
                                 <p className="mt-4 text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">No Repository Nodes Isolated</p>
                              </td>
                           </tr>
                        ) : (
                           filteredData.map((item, idx) => (
                              <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                 <td className="px-8 py-6">
                                    <div>
                                       <p className="text-sm font-bold text-slate-800 uppercase italic tracking-tight">{item.item_name}</p>
                                       <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest font-mono">#{item.item_code}</p>
                                    </div>
                                 </td>
                                 <td className="px-8 py-6">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg">{item.category || 'N/A'}</span>
                                 </td>
                                 <td className="px-8 py-6 text-center font-bold text-slate-500 font-mono text-sm leading-none">+{formatNumber(item.total_purchased)}</td>
                                 <td className="px-8 py-6 text-center font-bold text-slate-400 font-mono text-sm leading-none italic">-{formatNumber(item.total_sold)}</td>
                                 <td className={`px-8 py-6 text-center font-bold font-mono text-base ${item.stock_status === 'LOW' ? 'text-rose-600 underline underline-offset-4 decoration-rose-100' : 'text-slate-800'}`}>
                                    {formatNumber(item.current_stock)}
                                 </td>
                                 <td className="px-8 py-6 text-center text-slate-300 font-bold text-xs">{formatNumber(item.reorder_level)}</td>
                                 <td className="px-8 py-6 text-center">
                                    <div className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest inline-flex items-center gap-2 border ${item.stock_status === 'LOW' ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                       }`}>
                                       <div className={`w-1.5 h-1.5 rounded-full ${item.stock_status === 'LOW' ? 'bg-rose-600' : 'bg-emerald-600'}`}></div>
                                       {item.stock_status === 'LOW' ? 'CRITICAL' : 'OPTIMAL'}
                                    </div>
                                 </td>
                                 <td className="px-8 py-6 text-center">
                                    <button
                                       onClick={() => {
                                          setSelectedItem(item);
                                          fetchItemHistory(item.id);
                                       }}
                                       className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm mx-auto active:scale-90"
                                    >
                                       <History size={18} />
                                    </button>
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>

               {/* Dashboard Insight Footer */}
               <div className="mt-auto p-10 border-t border-slate-50 bg-[#F8FAFC]/30 flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">
                  <div className="flex items-center gap-4">
                     <span className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg shadow-sm border border-slate-50"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Audit Status: Verified</span>
                     <span className="flex items-center gap-2"><Layout size={12} /> Nodes Scanning: {stockData.length}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                     <span>SYS_MD5: {new Date().getTime().toString(16).toUpperCase()}</span>
                     <div className="w-px h-3 bg-slate-200"></div>
                     <span>REF: {company.id}</span>
                  </div>
               </div>
            </div>
         </div>

         {/* History Audit Modal - Premium Glassmorphic */}
         {showHistory && selectedItem && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8 z-[1000] animate-in fade-in duration-300">
               <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-500 relative">

                  {/* Modal Header Manifest */}
                  <div className="bg-slate-900 p-10 flex justify-between items-center relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32"></div>
                     <div className="relative z-10 flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center text-white"><History size={32} /></div>
                        <div>
                           <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">Nomenclature Audit Log</h2>
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">
                              Vector Path: {selectedItem.item_name} / #{selectedItem.item_code}
                           </p>
                        </div>
                     </div>
                     <button
                        onClick={() => setShowHistory(false)}
                        className="relative z-10 bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all active:scale-95"
                     >
                        <X size={20} />
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 scroller-airy">
                     {itemHistory.length === 0 ? (
                        <div className="py-20 text-center opacity-10">
                           <History size={60} strokeWidth={1} className="mx-auto mb-4" />
                           <p className="text-sm font-bold uppercase tracking-[0.4em] italic">No Audit History Logged</p>
                        </div>
                     ) : (
                        <table className="w-full text-left">
                           <thead className="bg-[#F8FAFC]">
                              <tr className="uppercase text-[9px] font-bold text-slate-400 tracking-widest italic border-b border-slate-100">
                                 <th className="px-6 py-4">Epoch</th>
                                 <th className="px-6 py-4">Transaction Vector</th>
                                 <th className="px-6 py-4 text-center">Magnitude</th>
                                 <th className="px-6 py-4 text-right">Reference</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50 text-xs">
                              {itemHistory.map((h, i) => (
                                 <tr key={i} className="group hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-slate-400 font-mono italic">
                                       {new Date(h.transaction_date).toLocaleDateString('en-GB')}
                                    </td>
                                    <td className="px-6 py-4">
                                       <span className={`px-3 py-1 rounded-lg font-bold text-[9px] uppercase tracking-widest border ${h.transaction_type.includes('IN') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-700 border-slate-100'
                                          }`}>
                                          {h.transaction_type}
                                       </span>
                                    </td>
                                    <td className={`px-6 py-4 text-center font-bold text-sm italic ${h.quantity_in ? 'text-emerald-600' : 'text-slate-800'}`}>
                                       {h.quantity_in ? `+${h.quantity_in}` : `-${h.quantity_out}`}
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-400 font-bold uppercase italic opacity-60">
                                       {h.reference_no}
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     )}
                  </div>

                  {/* Modal Action Console */}
                  <div className="p-10 border-t border-slate-50 bg-[#F8FAFC]/50 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">
                     <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                        Live Snapshot Verified
                     </div>
                     <button
                        onClick={() => setShowHistory(false)}
                        className="bg-slate-900 text-white px-10 py-3 rounded-lg shadow-xl hover:bg-black transition-all active:scale-95"
                     >Close Audit Window</button>
                  </div>
               </div>
            </div>
         )}

         <style dangerouslySetInnerHTML={{
            __html: `
        .scroller-airy::-webkit-scrollbar { width: 4px; }
        .scroller-airy::-webkit-scrollbar-track { background: transparent; }
        .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
      </div>
   );
}
