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
         <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 font-sans select-none">
            <div className="text-center font-bold text-slate-400">
               <p className="text-sm mb-4 uppercase tracking-widest">Establishing Repository Bridge...</p>
               <SyncIcon className="animate-spin mx-auto text-blue-600" size={24} />
            </div>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 select-none pb-8">
         <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
               <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
                  <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('stockReport.liveInventory')}</span>
                  <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{formatNumber(totalValue.current)}</span>
               </div>
               <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
                  <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('stockReport.grossProcurement')}</span>
                  <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{formatNumber(totalValue.purchased)}</span>
               </div>
               <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
                  <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('stockReport.fulfilledSales')}</span>
                  <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{formatNumber(totalValue.sold)}</span>
               </div>
               <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
                  <span className="text-[12px] font-bold text-red-500 uppercase tracking-widest">{t('stockReport.criticalReorders')}</span>
                  <span className="text-[13px] font-bold font-sans text-red-700 mt-1">{lowStockData.length}</span>
               </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col min-h-[600px] relative shadow-none">
               <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
                  <div className="flex items-center gap-3">
                     <div className="flex items-baseline gap-2">
                        <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">{t('stockReport.audit')}</span>
                        <span className="bg-slate-200 text-slate-600 font-bold force-en text-[12px] px-1.5 py-0.5 rounded-sm">{filteredData.length} records</span>
                     </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                     <button onClick={fetchStockReport} title={t('common.sync')} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm">
                        <SyncIcon size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                     </button>
                  </div>
               </div>

               <div className="p-3.5 flex flex-col sm:flex-row sm:items-end gap-3 border-b border-slate-100 select-none">
                  <div className="flex-1 min-w-[280px]">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">{t('stockReport.nomenclature')}</label>
                     <div className="relative flex items-center border border-slate-200 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] rounded-md bg-white px-2.5 py-1 transition-colors w-full">
                        <Search size={12} className="text-slate-400 mr-1.5" />
                        <input
                           type="text"
                           placeholder={t('stockReport.nomenclature')}
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-300 w-full font-semibold"
                        />
                     </div>
                  </div>

                  <div className="w-full sm:w-[180px]">
                     <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">{t('stockReport.status')}</label>
                     <div className="relative flex items-center border border-slate-200 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] rounded-md bg-white px-2.5 py-1 transition-colors">
                        <Filter size={12} className="text-slate-400 mr-1.5" />
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-700 cursor-pointer py-0 uppercase w-full">
                           <option value="ALL">{t('common.all')}</option>
                           <option value="LOW">{t('stockReport.critical')}</option>
                           <option value="OK">{t('stockReport.optimal')}</option>
                        </select>
                     </div>
                  </div>

                  <button onClick={() => setFilterStatus('LOW')} className="h-7 flex items-center gap-1.5 px-2.5 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[12px] font-bold rounded-md transition shadow-sm cursor-pointer uppercase tracking-wider">
                     <AlertTriangle size={13} />
                     <span>{t('stockReport.executeAudit')}</span>
                  </button>
               </div>

               {lowStockData.length > 0 && (
                  <div className="mx-3.5 mt-3.5 bg-rose-50 border border-rose-200 rounded-md px-4 py-3 flex items-center justify-between gap-3">
                     <div className="flex items-center gap-3">
                        <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                        <div>
                           <h3 className="text-sm font-extrabold text-rose-700 uppercase tracking-widest">Critical Procurement Alert</h3>
                           <p className="text-[10px] font-bold text-rose-500 mt-0.5 uppercase tracking-wider">{lowStockData.length} items have breached reorder levels.</p>
                        </div>
                     </div>
                     <button onClick={() => setFilterStatus('LOW')} className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-100 text-rose-700 font-bold text-[10px] uppercase tracking-wider rounded-md transition">
                        Isolate Items
                     </button>
                  </div>
               )}

               <div className="px-3.5 py-3.5 flex-1 overflow-x-auto overflow-y-auto max-h-[600px]">
                  <table className="w-full text-left border-collapse select-none">
                     <thead className="sticky top-0 bg-slate-50 z-30 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                           <th className="px-3 py-2 border-r border-slate-100">{t('stockReport.nomenclature')}</th>
                           <th className="px-3 py-2 border-r border-slate-100">{t('stockReport.classification')}</th>
                           <th className="px-3 py-2 border-r border-slate-100 text-center">{t('stockReport.netProcured')}</th>
                           <th className="px-3 py-2 border-r border-slate-100 text-center">{t('stockReport.netSales')}</th>
                           <th className="px-3 py-2 border-r border-slate-100 text-center">{t('stockReport.livePosition')}</th>
                           <th className="px-3 py-2 border-r border-slate-100 text-center">{t('stockReport.threshold')}</th>
                           <th className="px-3 py-2 border-r border-slate-100 text-center">{t('stockReport.status')}</th>
                           <th className="px-3 py-2 text-center">{t('common.audit')}</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 font-sans text-sm">
                        {loading ? (
                           <tr>
                              <td colSpan="8" className="py-24 text-center">
                                 <SyncIcon className="animate-spin text-slate-400 mx-auto mb-2" size={24} />
                                 <p className="text-slate-400 font-bold uppercase text-[12px] tracking-widest italic">{t('saleReport.syncingStreams') || 'Fetching Statement Data...'}</p>
                              </td>
                           </tr>
                        ) : filteredData.length === 0 ? (
                           <tr>
                              <td colSpan="8" className="py-24 text-center text-slate-400 font-bold text-sm tracking-wider bg-slate-50/20">
                                 <Database size={32} className="mx-auto mb-2 opacity-40 text-[#1d5f84]" />
                                 {t('stockReport.noRecords') || 'No stock records found.'}
                              </td>
                           </tr>
                        ) : (
                           filteredData.map((item, idx) => (
                              <tr key={idx} className="group hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                                 <td className="px-3 py-1.5 border-r border-slate-100 leading-tight">
                                    <div className="flex flex-col gap-0.5">
                                       <span className="font-bold text-slate-800 text-[12px] uppercase tracking-tight">{item.item_name}</span>
                                       <span className="text-[12px] text-slate-400 font-mono">CODE: #{item.item_code}</span>
                                    </div>
                                 </td>
                                 <td className="px-3 py-1.5 border-r border-slate-100">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-bold uppercase tracking-wider border border-slate-200 bg-slate-50 text-slate-700">{item.category || 'N/A'}</span>
                                 </td>
                                 <td className="px-3 py-1.5 border-r border-slate-100 text-center font-mono font-bold text-slate-700">{formatNumber(item.total_purchased)}</td>
                                 <td className="px-3 py-1.5 border-r border-slate-100 text-center font-mono font-bold text-slate-500">{formatNumber(item.total_sold)}</td>
                                 <td className={`px-3 py-1.5 border-r border-slate-100 text-center font-bold font-mono text-sm ${item.stock_status === 'LOW' ? 'text-rose-600 font-black' : 'text-slate-800'}`}>{formatNumber(item.current_stock)}</td>
                                 <td className="px-3 py-1.5 border-r border-slate-100 text-center text-slate-500 font-bold font-mono">{formatNumber(item.reorder_level)}</td>
                                 <td className="px-3 py-1.5 border-r border-slate-100 text-center">
                                    <span className={`px-2 py-0.5 border text-[12px] font-bold uppercase tracking-wider rounded-md ${item.stock_status === 'LOW' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{item.stock_status === 'LOW' ? t('stockReport.critical') : t('stockReport.optimal')}</span>
                                 </td>
                                 <td className="px-3 py-1.5 text-center">
                                    <button onClick={() => { setSelectedItem(item); fetchItemHistory(item.id); }} className="p-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 text-slate-500 hover:text-[#1d5f84] transition cursor-pointer shadow-sm">
                                       <History size={12} />
                                    </button>
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>

               <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2.5 flex flex-col sm:flex-row justify-between items-center text-[12px] font-bold text-slate-400 uppercase tracking-wider gap-2 select-none">
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

            {/* History Modal */}
            {showHistory && selectedItem && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px] select-none">
                  <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-lg shadow-none overflow-hidden flex flex-col max-h-[85vh] z-10">

                     {/* Modal Header */}
                     <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center select-none">
                        <div className="flex items-center gap-2">
                           <div className="p-1.5 bg-white border border-slate-200 text-[#1d5f84] rounded-md shrink-0">
                              <History size={16} />
                           </div>
                           <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider leading-none">
                              {t('stockReport.auditHistory')}
                           </h3>
                        </div>
                        <button
                           onClick={() => setShowHistory(false)}
                           className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition cursor-pointer"
                        >
                           <X size={16} />
                        </button>
                     </div>

                     {/* Header Subtitle bar */}
                     <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-col font-mono text-sm text-slate-600">
                        <span className="font-bold text-slate-800 uppercase text-sm">{selectedItem.item_name}</span>
                        <span>SYSTEM IDENTIFIER: #{selectedItem.item_code}</span>
                     </div>

                     <div className="flex-1 overflow-y-auto p-4 bg-white">
                        {itemHistory.length === 0 ? (
                           <div className="py-16 text-center text-slate-400 uppercase tracking-widest font-mono text-sm">
                              <History size={32} className="mx-auto mb-2 text-slate-300" />
                              <p>No Audit History Logged</p>
                           </div>
                        ) : (
                           <div className="border border-slate-200 overflow-hidden shadow-sm rounded-md">
                              <table className="w-full text-left font-sans text-sm border-collapse">
                                 <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                    <tr>
                                       <th className="px-3 py-2 border-r border-slate-200">Epoch</th>
                                       <th className="px-3 py-2 border-r border-slate-200">Transaction Vector</th>
                                       <th className="px-3 py-2 border-r border-slate-200 text-center">Magnitude</th>
                                       <th className="px-3 py-2 text-right">Reference</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {itemHistory.map((h, i) => (
                                       <tr key={i} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-3 py-2 border-r border-slate-100 text-slate-400 font-mono">
                                             {new Date(h.transaction_date).toLocaleDateString('en-GB')}
                                          </td>
                                          <td className="px-3 py-2 border-r border-slate-100">
                                             <span className={`px-2 py-0.5 border text-[12px] font-bold uppercase tracking-wider rounded-md ${h.transaction_type.includes('IN') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                                {h.transaction_type}
                                             </span>
                                          </td>
                                          <td className={`px-3 py-2 border-r border-slate-100 text-center font-bold ${h.quantity_in ? 'text-emerald-700' : 'text-slate-800'}`}>
                                             {h.quantity_in ? `+${h.quantity_in}` : `-${h.quantity_out}`}
                                          </td>
                                          <td className="px-3 py-2 text-right text-slate-400 font-bold uppercase">
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
                     <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[12px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Snapshot Validated</span>
                        <button
                           onClick={() => setShowHistory(false)}
                           className="bg-[#1d5f84] hover:bg-[#154662] text-white text-sm font-bold px-3 py-1.5 rounded-md transition shadow-sm uppercase tracking-wider"
                        >Close Audit</button>
                     </div>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
}
