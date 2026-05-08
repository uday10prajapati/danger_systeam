import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import {
   Plus, Search, AlertCircle, CheckCircle2,
   Database, Activity, ScanLine, X,
   Download, Trash2, ShieldCheck, Layout,
   Layers, Package, ChevronRight, Barcode,
   RotateCcw, History, FileText, CheckCircle
} from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';

export default function BarcodeScannerPage() {
   const { t } = useTranslation();
   const [scannedItems, setScannedItems] = useState([]);
   const [itemsWithoutBarcode, setItemsWithoutBarcode] = useState([]);
   const [allItems, setAllItems] = useState([]);
   const [loading, setLoading] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');
   const [successMessage, setSuccessMessage] = useState('');
   const [errorMessage, setErrorMessage] = useState('');
   const [stats, setStats] = useState({ total: 0, withBarcode: 0, withoutBarcode: 0 });
   const [activeTab, setActiveTab] = useState('scan'); // scan or manage
   const [company, setCompany] = useState(null);

   useEffect(() => {
      loadCompany();
   }, []);

   useEffect(() => {
      if (company?.id) {
         fetchStats();
      }
   }, [company]);

   const loadCompany = async () => {
      try {
         const response = await api.get('/company');
         if (response.data.success && response.data.data) {
            setCompany(response.data.data);
         }
      } catch (error) {
         console.error('Company load error', error);
      }
   };

   const fetchStats = async () => {
      try {
         setLoading(true);
         const [itemsResponse, stockResponse] = await Promise.all([
            api.get(`/items/company/${company.id}?active=true`),
            api.get('/stock-report')
         ]);

         if (itemsResponse.data.success && stockResponse.data.success) {
            const items = itemsResponse.data.data || [];
            const stockData = stockResponse.data.data || [];

            const stockMap = {};
            stockData.forEach(stock => {
               stockMap[stock.id] = stock.current_stock || 0;
            });

            const itemsWithStock = items.map(item => ({
               ...item,
               current_stock: stockMap[item.id] !== undefined ? stockMap[item.id] : 0
            }));

            const withBarcode = itemsWithStock.filter(item => item.barcode).length;
            const withoutBarcode = itemsWithStock.length - withBarcode;

            setStats({
               total: itemsWithStock.length,
               withBarcode,
               withoutBarcode
            });

            setAllItems(itemsWithStock);
            setItemsWithoutBarcode(itemsWithStock.filter(item => !item.barcode));
         }
      } catch (error) {
         console.error('Fetch items error:', error);
      } finally {
         setLoading(false);
      }
   };

   const handleScanSuccess = (item) => {
      const newScannedItem = {
         id: item.id,
         item_code: item.item_code,
         item_name: item.item_name,
         barcode: item.barcode,
         current_stock: item.current_stock,
         sale_rate: item.sale_rate,
         timestamp: new Date().toLocaleTimeString()
      };

      setScannedItems([newScannedItem, ...scannedItems]);
      setSuccessMessage(`✓ ${item.item_name} isolation complete`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setErrorMessage('');
   };

   const handleScanError = (error) => {
      setErrorMessage(`✗ ${error}`);
      setTimeout(() => setErrorMessage(''), 3000);
      setSuccessMessage('');
   };

   const clearScannedItems = () => {
      setScannedItems([]);
   };

   const exportScannedData = () => {
      const csv = [
         ['Item Code', 'Item Name', 'Barcode', 'Stock', 'Rate', 'Timestamp'],
         ...scannedItems.map(item => [
            item.item_code,
            item.item_name,
            item.barcode,
            item.current_stock,
            item.sale_rate,
            item.timestamp
         ])
      ]
         .map(row => row.join(','))
         .join('\n');

      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
      element.setAttribute('download', `scanned_items_${Date.now()}.csv`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
   };

   if (!company) {
      return (
         <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
            <div className="text-center font-black uppercase tracking-widest text-slate-300">
               <p className="text-xs mb-6 italic tracking-[0.4em]">Initializing Optical Registry...</p>
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

            {/* Superior Header - UserMaster Style */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-4">
               <div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
                     <ScanLine size={12} />
                     <span>Inventory Core / Optical Registry Control</span>
                  </div>
                  <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Barcode Command Deck</h1>
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex gap-1.5 p-1.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                     <button
                        onClick={() => setActiveTab('scan')}
                        className={`px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'scan' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'
                           }`}
                     >
                        Live Scanner
                     </button>
                     <button
                        onClick={() => setActiveTab('manage')}
                        className={`px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'manage' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600'
                           }`}
                     >
                        Manifest Control
                     </button>
                  </div>
               </div>
            </div>

            {/* Dynamic Metric Grid - UserMaster Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
               <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
                  <div className="flex justify-between items-start mb-4">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total SKU Registry</p>
                     <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform"><Database size={18} /></div>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 tracking-tighter">{stats.total}</p>
                  <div className="mt-3 flex items-center gap-2 text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">
                     <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Core Database Density
                  </div>
               </div>

               <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm group hover:border-emerald-200 transition-all">
                  <div className="flex justify-between items-start mb-4">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monitized Shards</p>
                     <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform"><CheckCircle size={18} /></div>
                  </div>
                  <p className="text-2xl font-bold text-slate-800 tracking-tighter">{stats.withBarcode}</p>
                  <div className="mt-3 flex items-center gap-2 text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Verified Optical Patterns
                  </div>
               </div>

               <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm group hover:border-rose-200 transition-all">
                  <div className="flex justify-between items-start mb-4">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unassigned Vectors</p>
                     <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg group-hover:scale-110 transition-transform"><AlertCircle size={18} /></div>
                  </div>
                  <p className="text-2xl font-bold text-rose-600 tracking-tighter italic">{stats.withoutBarcode}</p>
                  <div className="mt-3 flex items-center gap-2 text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">
                     <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div> Awaiting Pattern Injection
                  </div>
               </div>
            </div>

            {/* Core Component Canvas */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[650px] relative">

               {/* Status Overlay Banners */}
               {(successMessage || errorMessage) && (
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4">
                     <div className={`p-4 rounded-lg shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-500 ${successMessage ? 'bg-blue-600 text-white' : 'bg-rose-600 text-white'
                        }`}>
                        {successMessage ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <p className="text-[10px] font-black uppercase tracking-widest">{successMessage || errorMessage}</p>
                        <button onClick={() => { setSuccessMessage(''); setErrorMessage(''); }} className="ml-auto opacity-40 hover:opacity-100"><X size={14} /></button>
                     </div>
                  </div>
               )}

               {activeTab === 'scan' ? (
                  <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom duration-700">
                     {/* Scanner Interaction Deck */}
                     <div className="p-8 border-b border-slate-50 bg-[#F8FAFC]/50 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/50 rounded-full -mr-48 -mt-48 blur-3xl opacity-50"></div>

                        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
                           <div>
                              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.4em] mb-2 block italic">Live Sensory Input Deck</span>
                              <h2 className="text-2xl font-bold text-slate-800 tracking-tight italic">Initialize Optical Stream</h2>
                           </div>

                           <div className="relative group">
                              <div className="absolute -inset-1 bg-linear-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-20 group-focus-within:opacity-40 transition duration-500"></div>
                              <div className="relative">
                                 <BarcodeScanner
                                    companyId={company.id}
                                    onScanSuccess={handleScanSuccess}
                                    onScanError={handleScanError}
                                    autoFocus={true}
                                    placeholder="READY TO PROCESS OPTICAL PATTERNS..."
                                    className="w-full h-16 bg-white border border-slate-200 rounded-lg px-8 text-lg font-bold italic tracking-tight uppercase focus:border-blue-500 transition-all outline-none shadow-sm placeholder:text-slate-200"
                                 />
                              </div>
                           </div>

                           <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                              <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div> Stream Status: Active</div>
                              <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                              <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-blue-500" /> Verified Integrity Layer</div>
                           </div>
                        </div>
                     </div>

                     {/* Scan History Ledger */}
                     <div className="flex-1 p-10 space-y-8 overflow-y-auto scroller-airy">
                        <div className="flex items-center justify-between">
                           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3 italic">
                              <div className="w-10 h-0.5 bg-blue-600"></div> Recent Isolation Sequence <span className="text-slate-300 font-mono">[{scannedItems.length}]</span>
                           </h3>
                           {scannedItems.length > 0 && (
                              <div className="flex gap-3">
                                 <button onClick={exportScannedData} className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:border-blue-600 transition-all shadow-sm">
                                    <Download size={14} /> Export Manifest
                                 </button>
                                 <button onClick={clearScannedItems} className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-100 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-600 hover:border-rose-600 transition-all shadow-sm">
                                    <Trash2 size={14} /> Flush Buffer
                                 </button>
                              </div>
                           )}
                        </div>

                        {scannedItems.length === 0 ? (
                           <div className="flex flex-col items-center justify-center py-32 opacity-10 grayscale group hover:opacity-30 transition-opacity">
                              <Layers size={100} strokeWidth={1} className="mb-6 group-hover:rotate-12 transition-transform duration-1000" />
                              <p className="text-sm font-bold uppercase tracking-[0.4em] italic">Awaiting Primary Object Shards</p>
                           </div>
                        ) : (
                           <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                 <thead className="bg-[#F8FAFC]">
                                    <tr>
                                       {['Registry Code', 'Nomenclature', 'Optical Shard', 'Pool Stk', 'Net Value', 'Temporal Index'].map(h => (
                                          <th key={h} className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                                       ))}
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50">
                                    {scannedItems.map((item, idx) => (
                                       <tr key={idx} className="group hover:bg-slate-50/50 transition-colors animate-in slide-in-from-right duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                                          <td className="px-8 py-5 font-bold text-slate-800 text-xs italic tracking-tighter">#{item.item_code}</td>
                                          <td className="px-8 py-5 font-bold text-slate-600 text-sm">{item.item_name}</td>
                                          <td className="px-8 py-5"><span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-mono font-bold rounded-lg tracking-widest">{item.barcode}</span></td>
                                          <td className="px-8 py-5 text-center">
                                             <span className={`text-[10px] font-bold px-3 py-1 rounded-lg border ${item.current_stock > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                {item.current_stock} UNTs
                                             </span>
                                          </td>
                                          <td className="px-8 py-5 text-right font-black text-slate-800 italic">₹{parseFloat(item.sale_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                          <td className="px-8 py-5 text-right text-[10px] font-bold text-slate-300 italic">{item.timestamp}</td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        )}
                     </div>
                  </div>
               ) : (
                  <div className="p-10 space-y-10 animate-in fade-in slide-in-from-bottom duration-700">
                     {/* Advanced Search Strip */}
                     <div className="flex flex-wrap items-end justify-between gap-4">
                        <div className="flex-1 max-w-2xl">
                           <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-2 px-1 italic">Registry Manifest Lookup</span>
                           <div className="relative group">
                              <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                              <input
                                 type="text"
                                 value={searchTerm}
                                 onChange={(e) => setSearchTerm(e.target.value)}
                                 placeholder="ISOLATE SHARD BY NOMENCLATURE OR UNIQUE ID..."
                                 className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-bold uppercase text-[11px] tracking-widest placeholder:text-slate-200 shadow-sm"
                              />
                           </div>
                        </div>
                        <div className="flex gap-2 p-1 bg-slate-50 rounded-lg border border-slate-100">
                           <button className="px-5 py-2.5 bg-white text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm">Comprehensive List</button>
                           <button className="px-5 py-2.5 text-slate-400 hover:text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">Awaiting Identity</button>
                        </div>
                     </div>

                     {/* Shard Repository Table */}
                     <div className="space-y-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3 italic">
                           <div className="w-10 h-0.5 bg-indigo-600"></div> Total Object Repository <span className="text-slate-300 font-mono">[{allItems.length}]</span>
                        </h3>
                        <div className="overflow-x-auto rounded-lg border border-slate-50 shadow-inner">
                           <table className="w-full text-left">
                              <thead className="bg-[#F8FAFC]">
                                 <tr>
                                    {['System ID', 'Nomenclature', 'Pattern Manifest', 'Metric Classification', 'Pool Yield'].map(h => (
                                       <th key={h} className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                 {allItems
                                    .filter(item =>
                                       item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       (item.barcode && item.barcode.includes(searchTerm))
                                    )
                                    .map((item, idx) => (
                                       <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                          <td className="px-10 py-6 font-bold text-slate-400 text-[11px] tracking-widest">#{item.item_code}</td>
                                          <td className="px-10 py-6">
                                             <p className="font-bold text-slate-800 text-sm uppercase italic tracking-tight">{item.item_name}</p>
                                          </td>
                                          <td className="px-10 py-6">
                                             <div className={`px-4 py-2 rounded-lg border font-mono text-[11px] font-bold w-fit ${item.barcode ? 'bg-slate-900 text-white border-slate-800 tracking-[0.2em]' : 'bg-slate-50 text-slate-300 border-slate-100 italic'
                                                }`}>
                                                {item.barcode || 'NULL_PATTERN'}
                                             </div>
                                          </td>
                                          <td className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{item.category || 'GENERAL_STOCK'}</td>
                                          <td className="px-10 py-6 text-right font-black text-slate-800 italic">₹{parseFloat(item.sale_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                       </tr>
                                    ))
                                 }
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
               )}

               {/* Unified Awareness Footer */}
               <div className="mt-auto p-8 border-t border-slate-50 bg-[#F8FAFC]/30 flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">
                  <div className="flex items-center gap-4">
                     <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Sensory Bridge: Verified</span>
                     <span className="flex items-center gap-2"><ShieldCheck size={12} /> Protocol: 802.11X-SEC</span>
                  </div>
                  <div>Index System Chrono: {new Date().toLocaleTimeString()}</div>
               </div>
            </div>
         </div>

         <style dangerouslySetInnerHTML={{
            __html: `
          .scroller-airy::-webkit-scrollbar { width: 4px; }
          .scroller-airy::-webkit-scrollbar-track { background: transparent; }
          .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
          .scroller-airy::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
      </div>
   );
}
