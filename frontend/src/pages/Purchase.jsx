import React, { useState, useEffect } from 'react';
import {
   Plus, AlertCircle, Search, Filter, CheckCircle, Calendar,
   TrendingUp, X, Activity, Database, ShoppingCart,
   ChevronRight, Printer, Download, Layout, Package,
   ArrowRight, ShieldCheck, Box, RefreshCcw, FileText,
   Truck
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import PurchaseForm from '../components/PurchaseForm';

export default function Purchase() {
   const { t } = useTranslation();
   const [company, setCompany] = useState(null);
   const [purchases, setPurchases] = useState([]);
   const [filteredPurchases, setFilteredPurchases] = useState([]);
   const [showForm, setShowForm] = useState(false);
   const [loading, setLoading] = useState(true);
   const [searchTerm, setSearchTerm] = useState('');
   const [selectedPurchase, setSelectedPurchase] = useState(null);
   const [showDetails, setShowDetails] = useState(false);
   const [dateRange, setDateRange] = useState({
      startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
   });

   // Load company
   useEffect(() => {
      loadCompany();
   }, []);

   const loadCompany = async () => {
      try {
         const response = await axios.get('/api/company');
         if (response.data.success && response.data.data) {
            setCompany(response.data.data);
            fetchPurchases(response.data.data.id);
         } else {
            setLoading(false);
         }
      } catch (error) {
         setLoading(false);
      }
   };

   // Fetch purchases
   const fetchPurchases = async (companyId, startDate, endDate) => {
      try {
         setLoading(true);
         const start = startDate || dateRange.startDate;
         const end = endDate || dateRange.endDate;

         const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/purchases`, {
            params: {
               startDate: start,
               endDate: end
            },
            headers: { 'x-company-id': companyId }
         });

         if (res.data.success) {
            setPurchases(res.data.data);
            applyFilters(res.data.data, searchTerm);
         }
      } catch (err) {
         console.error('Fetch purchases error:', err);
      } finally {
         setLoading(false);
      }
   };

   // Apply search filter
   const applyFilters = (purchasesToFilter, search) => {
      let filtered = purchasesToFilter;

      if (search) {
         filtered = filtered.filter(purchase =>
            purchase.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
            purchase.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
            purchase.account_code?.toLowerCase().includes(search.toLowerCase())
         );
      }

      setFilteredPurchases(filtered);
   };

   // Handle search
   const handleSearch = (e) => {
      const term = e.target.value;
      setSearchTerm(term);
      applyFilters(purchases, term);
   };

   // Handle date range change
   const handleDateChange = (field, value) => {
      const newRange = { ...dateRange, [field]: value };
      setDateRange(newRange);
      if (company) {
         fetchPurchases(company.id, newRange.startDate, newRange.endDate);
      }
   };

   // View purchase details
   const viewPurchaseDetails = async (purchaseId) => {
      try {
         const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/purchases/${purchaseId}`, {
            headers: { 'x-company-id': company.id }
         });
         if (res.data.success) {
            setSelectedPurchase(res.data.data);
            setShowDetails(true);
         }
      } catch (err) {
         console.error('Fetch purchase details error:', err);
      }
   };

   // Handle form completion
   const handleFormSubmit = (data) => {
      setShowForm(false);
      if (company) {
         fetchPurchases(company.id);
      }
   };

   if (!company && !loading) {
      return (
         <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8 text-center font-black uppercase tracking-widest text-slate-300 italic">
            Identity Integrity Error: Company Context Missing
         </div>
      );
   }

   if (!company) {
      return (
         <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
            <div className="text-center font-black uppercase tracking-widest text-slate-300">
               <p className="text-xs mb-6 italic tracking-[0.4em]">Initialising Procurement Bridge...</p>
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-6 print:hidden">
               <div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
                     <Truck size={12} />
                     <span>Procurement Core / Live Inward Registry</span>
                  </div>
                  <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Inward Command Center</h1>
               </div>
               <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 bg-indigo-600 px-8 py-3.5 rounded-lg text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
               >
                  <Plus size={20} />
                  {t('purchase.createNewPurchase', 'Initialize Inward')}
               </button>
            </div>

            {/* Procurement Metric Grid - Compact Airy Shards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 print:hidden">
               {[
                  { label: 'Manifest Count', val: purchases.length, icon: <FileText size={18} />, color: 'blue' },
                  { label: 'Gross Inward Value', val: `₹${purchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: <TrendingUp size={18} />, color: 'emerald' },
                  { label: 'Nomenclature Density', val: purchases.reduce((sum, p) => sum + (p.item_count || 0), 0), icon: <Package size={18} />, color: 'indigo' },
                  { label: 'Verified Suppliers', val: new Set(purchases.map(p => p.supplier_account_id)).size, icon: <Layout size={18} />, color: 'slate' }
               ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm group hover:border-slate-200 transition-all">
                     <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{stat.label}</p>
                        <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                     </div>
                     <p className="text-4xl font-bold text-slate-800 tracking-tighter">{stat.val}</p>
                  </div>
               ))}
            </div>

            {/* Command Deck Toolbar */}
            <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm mb-10 print:hidden flex flex-wrap items-end gap-6">
               <div className="flex-1 min-w-[350px]">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 italic">Manifest Isolation Search</span>
                  <div className="relative group">
                     <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                     <input
                        type="text"
                        placeholder={t('purchase.searchByInvoiceOrSupplier', 'ISOLATE MANIFEST BY INVOICE, SUPPLIER OR ACCOUNT CODE...')}
                        value={searchTerm}
                        onChange={handleSearch}
                        className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-bold uppercase text-[11px] tracking-widest"
                     />
                  </div>
               </div>

               <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm h-full">
                  <input type="date" value={dateRange.startDate} onChange={(e) => handleDateChange('startDate', e.target.value)} className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all font-mono" />
                  <ArrowRight size={14} className="text-slate-200" />
                  <input type="date" value={dateRange.endDate} onChange={(e) => handleDateChange('endDate', e.target.value)} className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all font-mono" />
               </div>

               <button onClick={() => fetchPurchases(company.id)} className="bg-slate-900 text-white px-10 py-4 rounded-lg font-bold uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-xl active:scale-95 h-[52px]">Sync Registry</button>
            </div>

            {/* Procurement Registry Manifest */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[600px] relative">

               <div className="px-8 py-5 border-b border-slate-50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] italic">Consolidated Inward registry</p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Density: {filteredPurchases.length} Documents</p>
               </div>

               <div className="flex-1 overflow-x-auto px-4 pb-12 scroller-airy">
                  <table className="w-full text-left">
                     <thead className="bg-[#F8FAFC]">
                        <tr className="uppercase text-[10px] font-bold text-slate-400 tracking-widest italic">
                           <th className="px-8 py-5">{t('purchase.invoiceNo', 'Manifest ID')}</th>
                           <th className="px-8 py-5">{t('purchase.supplier', 'Source Entity')}</th>
                           <th className="px-8 py-5 text-center">{t('purchase.items', 'Density')}</th>
                           <th className="px-8 py-5 text-right">{t('purchase.amount', 'Net Yield')}</th>
                           <th className="px-8 py-5 text-center">{t('purchase.invoiceDate', 'Commit Date')}</th>
                           <th className="px-8 py-5 text-center">{t('purchase.view', 'Isolation')}</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {loading ? (
                           <tr>
                              <td colSpan="6" className="py-32 text-center text-slate-200">
                                 <RefreshCcw className="animate-spin mx-auto mb-4" size={50} />
                                 <p className="text-[10px] font-bold uppercase tracking-[0.4em] italic">Building Secure Inward Stream...</p>
                              </td>
                           </tr>
                        ) : filteredPurchases.length === 0 ? (
                           <tr>
                              <td colSpan="6" className="py-32 text-center">
                                 <Layout className="text-slate-100 mx-auto" size={70} strokeWidth={1} />
                                 <p className="mt-4 text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">Zero Manifests Isolated</p>
                              </td>
                           </tr>
                        ) : (
                           filteredPurchases.map((purchase, idx) => (
                              <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                 <td className="px-8 py-6">
                                    <span className="text-sm font-bold text-slate-800 uppercase italic tracking-tight font-mono">#{purchase.invoice_no}</span>
                                 </td>
                                 <td className="px-8 py-6 border-r border-slate-50/50">
                                    <p className="text-sm font-bold text-slate-800 uppercase italic tracking-tight">{purchase.supplier_name}</p>
                                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest font-mono">ACCOUNT: {purchase.account_code || 'UNTAGGED'}</p>
                                 </td>
                                 <td className="px-8 py-6 text-center">
                                    <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest">{purchase.item_count} NODES</span>
                                 </td>
                                 <td className="px-8 py-6 text-right font-bold text-slate-800 italic text-base">₹{parseFloat(purchase.total_amount).toLocaleString('en-IN')}</td>
                                 <td className="px-8 py-6 text-center">
                                    <div className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-400 italic">
                                       <Calendar size={12} />
                                       {new Date(purchase.invoice_date).toLocaleDateString('en-GB')}
                                    </div>
                                 </td>
                                 <td className="px-8 py-6 text-center text-xs">
                                    <button onClick={() => viewPurchaseDetails(purchase.id)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold uppercase tracking-widest text-[9px] hover:bg-black transition-all active:scale-90 shadow-md flex items-center gap-2 mx-auto">
                                       Details <ChevronRight size={14} />
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
                  <div className="flex items-center gap-6">
                     <span className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg shadow-sm border border-slate-50"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Audit Status: Verified</span>
                     <span className="flex items-center gap-2"><Layout size={12} /> Manifest Density: {purchases.length}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                     <span>SYS_SHA: {new Date().getTime().toString(16).toUpperCase()}</span>
                     <div className="w-px h-3 bg-slate-200"></div>
                     <span>REF: {company.id}</span>
                  </div>
               </div>
            </div>
         </div>

         {/* Audit Detail Modal - Premium Glassmorphic */}
         {showDetails && selectedPurchase && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8 z-[1000] animate-in fade-in duration-300">
               <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-500 relative">

                  {/* Modal Header Shard */}
                  <div className="bg-slate-900 p-10 flex justify-between items-center relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full -mr-32 -mt-32"></div>
                     <div className="relative z-10 flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center text-white"><Database size={32} /></div>
                        <div>
                           <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">Nomenclature Inward Log</h2>
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">
                              Vector Path: #{selectedPurchase.invoice_no} / {selectedPurchase.supplier_name}
                           </p>
                        </div>
                     </div>
                     <div className="flex gap-3 relative z-10">
                        <button className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-lg transition-all active:scale-95"><Printer size={20} /></button>
                        <button onClick={() => setShowDetails(false)} className="bg-white/10 hover:bg-red-500/20 text-white p-3 rounded-lg transition-all active:scale-95"><X size={20} /></button>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-10 scroller-airy">
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 bg-[#F8FAFC]/50 p-8 rounded-lg border border-slate-100">
                        <div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 italic">Timeline Node</p>
                           <p className="text-sm font-bold text-slate-800 italic uppercase">{new Date(selectedPurchase.invoice_date).toLocaleDateString('en-GB')}</p>
                        </div>
                        <div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 italic">Source Entity</p>
                           <p className="text-sm font-bold text-slate-800 italic uppercase">{selectedPurchase.supplier_name}</p>
                        </div>
                        <div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 italic">Authorized Agent</p>
                           <p className="text-sm font-bold text-slate-800 italic uppercase">{selectedPurchase.created_by_name || 'SYSTEM_CORE'}</p>
                        </div>
                        <div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 italic">Account Mapping</p>
                           <p className="text-sm font-bold text-slate-800 italic uppercase">{selectedPurchase.supplier_account_id}</ p>
                        </div>
                     </div>

                     <div className="mb-10">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-4">
                           <div className="w-8 h-0.5 bg-slate-200"></div> Nomenclature Payload
                        </h4>
                        <div className="bg-white rounded-lg border border-slate-100 overflow-hidden shadow-sm">
                           <table className="w-full text-left">
                              <thead className="bg-[#F8FAFC]">
                                 <tr className="uppercase text-[9px] font-bold text-slate-400 tracking-widest italic border-b border-slate-100">
                                    <th className="px-6 py-4">Inbound Node</th>
                                    <th className="px-6 py-4 text-center">Density</th>
                                    <th className="px-6 py-4 text-right">Inward Rate</th>
                                    <th className="px-6 py-4 text-right">Net Value</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 text-xs">
                                 {(selectedPurchase.items || []).map((item, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                       <td className="px-6 py-4">
                                          <p className="font-bold text-slate-800 uppercase italic tracking-tight leading-none mb-1">{item.item_name}</p>
                                          <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest font-mono">#{item.item_code}</p>
                                       </td>
                                       <td className="px-6 py-4 text-center font-bold text-slate-800 italic">{item.quantity} {item.unit_name}</td>
                                       <td className="px-6 py-4 text-right font-bold text-slate-800 font-mono italic">₹{parseFloat(item.purchase_rate).toFixed(2)}</td>
                                       <td className="px-8 py-5 text-right font-bold text-slate-900 italic font-mono bg-white/50">₹{parseFloat(item.amount).toFixed(2)}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>

                     <div className="flex flex-col items-end mt-12 space-y-4">
                        <div className="flex justify-between w-64 border-b border-slate-100 pb-2">
                           <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Base Value</span>
                           <span className="text-sm font-black italic text-slate-500">₹{(parseFloat(selectedPurchase.total_amount) * 0.82).toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-900 p-10 rounded-lg text-white shadow-2xl relative overflow-hidden w-full md:w-96 border-4 border-white">
                           <div className="absolute inset-0 bg-linear-to-r from-indigo-600/10 to-transparent"></div>
                           <div className="flex justify-between items-end relative z-10">
                              <div>
                                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mb-4 italic">Fiscal Net Inward</p>
                                 <h5 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Gross Posted</h5>
                              </div>
                              <div className="text-right">
                                 <p className="text-4xl font-black italic font-mono tracking-tighter">₹{parseFloat(selectedPurchase.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Purchase Form Modal */}
         {showForm && (
            <PurchaseForm
               onSubmit={handleFormSubmit}
               onCancel={() => setShowForm(false)}
            />
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
