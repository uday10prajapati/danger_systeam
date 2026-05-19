import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
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
         const response = await api.get('/company');
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
         const response = await api.get('/stock-report');
         if (response.data.success) {
            setStockData(response.data.data);
            // Fetch low stock items
            const lowResponse = await api.get('/stock-report/low-stock');
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
         const response = await api.get(`/stock-report/item/${itemId}`);
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
         <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-8 font-mono">
            <div className="text-center font-bold text-zinc-400">
               <p className="text-xs mb-4 uppercase tracking-widest">Establishing Repository Bridge...</p>
               <SyncIcon className="animate-spin mx-auto text-blue-600" size={24} />
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
                     <Package size={20} className="text-zinc-600" />
                     {t('stockReport.audit')}
                  </h1>
                  <p className="text-[10px] font-mono text-zinc-500 mt-0.5 uppercase tracking-wider select-none">{t('stockReport.eyebrow')}</p>
               </div>
               
               <button
                  onClick={fetchStockReport}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none"
               >
                  <SyncIcon size={14} className={loading ? 'animate-spin' : ''} />
                  {t('common.sync')}
               </button>
            </div>

            {/* Metric Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 select-none">
               {[
                  { label: t('stockReport.liveInventory'), val: formatNumber(totalValue.current), icon: <Package size={16} /> },
                  { label: t('stockReport.grossProcurement'), val: formatNumber(totalValue.purchased), icon: <Plus size={16} /> },
                  { label: t('stockReport.fulfilledSales'), val: formatNumber(totalValue.sold), icon: <TrendingDown size={16} /> },
                  { label: t('stockReport.criticalReorders'), val: lowStockData.length, icon: <AlertTriangle size={16} /> }
               ].map((stat, i) => (
                  <div key={i} className="bg-zinc-50 border border-zinc-300 p-4 shadow-sm flex items-center justify-between rounded-none">
                     <div>
                        <span className="text-[10px] font-sans text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                        <span className={`text-xl font-bold mt-1 block font-mono ${i === 3 && stat.val > 0 ? 'text-red-700 animate-pulse' : 'text-zinc-800'}`}>{stat.val}</span>
                     </div>
                     <div className="w-10 h-10 border border-zinc-200 bg-white text-zinc-600 flex items-center justify-center rounded-none shrink-0">
                        {stat.icon}
                     </div>
                  </div>
               ))}
            </div>

            {/* Controller Toolbar */}
            <div className="bg-zinc-50 p-4 border border-zinc-300 flex flex-wrap items-end gap-4 rounded-none">
               <div className="flex-1 min-w-[280px]">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">{t('stockReport.nomenclature')}</label>
                  <div className="relative group">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-600 transition-colors" />
                     <input
                        type="text"
                        placeholder={t("stockReport.nomenclature")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-none focus:border-zinc-500 outline-none transition font-bold text-xs"
                     />
                  </div>
               </div>

               <div className="w-full sm:w-[220px]">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">{t('stockReport.status')}</label>
                  <div className="relative group">
                     <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-600 transition-colors" />
                     <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white border border-zinc-300 rounded-none focus:border-zinc-500 outline-none transition font-bold text-xs appearance-none cursor-pointer"
                     >
                        <option value="ALL">{t("common.all")}</option>
                        <option value="LOW">{t("stockReport.critical")}</option>
                        <option value="OK">{t("stockReport.optimal")}</option>
                     </select>
                     <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none rotate-90" />
                  </div>
               </div>

               <button
                  onClick={fetchStockReport}
                  className="bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-700 text-xs font-bold px-4 py-2.5 rounded-none transition shadow-sm uppercase tracking-wider"
               >{t('stockReport.executeAudit')}</button>
            </div>

            {/* Procurement Alert Manifest */}
            {lowStockData.length > 0 && (
               <div className="bg-red-50 p-4 border border-red-300 rounded-none flex items-center justify-between text-red-800 shadow-sm">
                  <div className="flex items-center gap-3">
                     <AlertTriangle size={18} className="text-red-700 shrink-0" />
                     <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide">Critical Procurement Alert</h3>
                        <p className="text-[10px] font-mono text-red-600 mt-0.5 uppercase tracking-wider">
                           {lowStockData.length} items have breached their reorder threshold positions.
                        </p>
                     </div>
                  </div>
                  <button
                     onClick={() => setFilterStatus('LOW')}
                     className="px-3 py-1.5 bg-red-100 hover:bg-red-200 border border-red-300 text-red-800 font-bold uppercase text-[10px] tracking-wider rounded-none transition"
                  >Isolate Items</button>
               </div>
            )}

            {/* Stock Registry Grid */}
            <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px] rounded-none">
               <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3 select-none">
                  <div className="flex items-center gap-2">
                     <span className="text-sm font-bold text-zinc-700 select-none">
                        Asset Manifest
                     </span>
                     <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-xs px-2 py-0.5 select-none">
                        {filteredData.length} active nodes
                     </span>
                  </div>
               </div>

               <div className="flex-1 overflow-x-auto bg-white">
                  <table className="w-full text-left border-collapse select-none">
                     <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600 text-xs font-bold uppercase tracking-wider">
                           <th className="px-4 py-3 border-r border-zinc-200">{t('stockReport.nomenclature')}</th>
                           <th className="px-4 py-3 border-r border-zinc-200">{t('stockReport.classification')}</th>
                           <th className="px-4 py-3 border-r border-zinc-200 text-center">{t('stockReport.netProcured')}</th>
                           <th className="px-4 py-3 border-r border-zinc-200 text-center">{t('stockReport.netSales')}</th>
                           <th className="px-4 py-3 border-r border-zinc-200 text-center">{t('stockReport.livePosition')}</th>
                           <th className="px-4 py-3 border-r border-zinc-200 text-center">{t('stockReport.threshold')}</th>
                           <th className="px-4 py-3 border-r border-zinc-200 text-center">{t('stockReport.status')}</th>
                           <th className="px-4 py-3 text-center">{t('common.audit')}</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-200">
                        {loading ? (
                           <tr>
                              <td colSpan="8" className="py-24 text-center">
                                 <SyncIcon className="animate-spin text-zinc-400 mx-auto mb-2" size={24} />
                                 <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('saleReport.syncingStreams')}</p>
                              </td>
                           </tr>
                        ) : filteredData.length === 0 ? (
                           <tr>
                              <td colSpan="8" className="py-24 text-center">
                                 <Box className="text-zinc-300 mx-auto mb-2" size={32} />
                                 <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No Repository Nodes Isolated</p>
                              </td>
                           </tr>
                        ) : (
                           filteredData.map((item, idx) => (
                              <tr key={idx} className="hover:bg-zinc-50/60 font-mono text-xs transition-colors">
                                 <td className="px-4 py-3 border-r border-zinc-200">
                                    <div className="flex flex-col">
                                       <span className="font-bold text-zinc-800 text-sm uppercase tracking-tight font-prompt">{item.item_name}</span>
                                       <span className="text-[9px] text-zinc-400 font-mono">CODE: #{item.item_code}</span>
                                    </div>
                                 </td>
                                 <td className="px-4 py-3 border-r border-zinc-200">
                                    <span className="bg-zinc-100 border border-zinc-300 text-zinc-700 font-sans text-[10px] px-2 py-0.5 select-none">{item.category || 'N/A'}</span>
                                 </td>
                                 <td className="px-4 py-3 border-r border-zinc-200 text-center font-bold text-zinc-600 font-mono">+{formatNumber(item.total_purchased)}</td>
                                 <td className="px-4 py-3 border-r border-zinc-200 text-center font-bold text-zinc-400 font-mono">-{formatNumber(item.total_sold)}</td>
                                 <td className={`px-4 py-3 border-r border-zinc-200 text-center font-bold font-mono text-sm ${item.stock_status === 'LOW' ? 'text-red-600 font-black' : 'text-zinc-800'}`}>
                                    {formatNumber(item.current_stock)}
                                 </td>
                                 <td className="px-4 py-3 border-r border-zinc-200 text-center text-zinc-500 font-bold">{formatNumber(item.reorder_level)}</td>
                                 <td className="px-4 py-3 border-r border-zinc-200 text-center">
                                    <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${item.stock_status === 'LOW' ? 'bg-red-50 text-red-700 border-red-300' : 'bg-emerald-50 text-emerald-700 border-emerald-300'}`}>
                                       {item.stock_status === 'LOW' ? t('stockReport.critical') : t('stockReport.optimal')}
                                    </span>
                                 </td>
                                 <td className="px-4 py-2 text-center">
                                    <button
                                       onClick={() => {
                                          setSelectedItem(item);
                                          fetchItemHistory(item.id);
                                       }}
                                       className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm"
                                    >
                                       <History size={13} />
                                    </button>
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>

               {/* Insight Footer */}
               <div className="bg-zinc-100 border-t border-zinc-300 px-4 py-3 flex flex-col sm:flex-row justify-between items-center text-[9px] font-mono text-zinc-400 uppercase tracking-wider gap-2 select-none">
                  <div className="flex items-center gap-3">
                     <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-blue-600"></div> System Status: Verified</span>
                     <span>Total Nodes: {stockData.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span>MD5: {new Date().getTime().toString(16)}</span>
                     <span>REF: {company.id}</span>
                  </div>
               </div>
            </div>
         </div>

         {/* History Modal */}
         {showHistory && selectedItem && (
            <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-none flex items-center justify-center p-4 z-[1000] select-none">
               <div className="bg-white border border-zinc-400 rounded-none w-full max-w-2xl shadow-lg relative z-10 overflow-hidden flex flex-col max-h-[85vh]">

                  {/* Modal Header */}
                  <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between shrink-0">
                     <div className="flex items-center gap-2">
                        <History size={15} className="text-zinc-600" />
                        <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider leading-none">
                           {t('stockReport.auditHistory')}
                        </h3>
                     </div>
                     <button
                        onClick={() => setShowHistory(false)}
                        className="p-1 border border-zinc-300 bg-white hover:bg-red-50 hover:border-red-300 text-zinc-600 hover:text-red-700 transition shadow-sm rounded-none"
                     >
                        <X size={13} />
                     </button>
                  </div>

                  {/* Header Subtitle bar */}
                  <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 flex flex-col font-mono text-xs text-zinc-600">
                     <span className="font-bold text-zinc-800 font-prompt uppercase text-sm">{selectedItem.item_name}</span>
                     <span>SYSTEM IDENTIFIER: #{selectedItem.item_code}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 bg-white">
                     {itemHistory.length === 0 ? (
                        <div className="py-16 text-center text-zinc-400 uppercase tracking-widest font-mono text-xs">
                           <History size={32} className="mx-auto mb-2 text-zinc-300" />
                           <p>No Audit History Logged</p>
                        </div>
                     ) : (
                        <div className="border border-zinc-200 overflow-hidden shadow-sm">
                           <table className="w-full text-left font-mono text-xs border-collapse">
                              <thead className="bg-zinc-50 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                                 <tr>
                                    <th className="px-3 py-2 border-r border-zinc-200">Epoch</th>
                                    <th className="px-3 py-2 border-r border-zinc-200">Transaction Vector</th>
                                    <th className="px-3 py-2 border-r border-zinc-200 text-center">Magnitude</th>
                                    <th className="px-3 py-2 text-right">Reference</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200 text-zinc-700">
                                 {itemHistory.map((h, i) => (
                                    <tr key={i} className="hover:bg-zinc-50/50">
                                       <td className="px-3 py-2 border-r border-zinc-200 text-zinc-400 font-mono">
                                          {new Date(h.transaction_date).toLocaleDateString('en-GB')}
                                       </td>
                                       <td className="px-3 py-2 border-r border-zinc-200">
                                          <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wider ${h.transaction_type.includes('IN') ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-zinc-50 text-zinc-700 border-zinc-300'}`}>
                                             {h.transaction_type}
                                          </span>
                                       </td>
                                       <td className={`px-3 py-2 border-r border-zinc-200 text-center font-bold ${h.quantity_in ? 'text-emerald-700' : 'text-zinc-800'}`}>
                                          {h.quantity_in ? `+${h.quantity_in}` : `-${h.quantity_out}`}
                                       </td>
                                       <td className="px-3 py-2 text-right text-zinc-400 font-bold uppercase">
                                          {h.reference_no}
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     )}
                  </div>

                  {/* Modal Action Console */}
                  <div className="px-4 py-3 bg-zinc-100 border-t border-zinc-300 flex justify-between items-center text-[9px] font-mono text-zinc-400 uppercase tracking-wider shrink-0">
                     <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Snapshot Validated</span>
                     <button
                        onClick={() => setShowHistory(false)}
                        className="bg-zinc-800 hover:bg-zinc-950 text-white text-xs font-bold px-3 py-1.5 rounded-none transition shadow-sm uppercase tracking-wider"
                     >Close Audit</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
