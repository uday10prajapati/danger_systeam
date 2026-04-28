import React, { useState, useEffect } from 'react';
import {
   Shield, Search, Plus, Save, RefreshCcw,
   AlertCircle, CheckCircle, Database, Calendar,
   TrendingUp, Scale, Box, Loader, Info, Edit3, X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';

export default function DangarRateMaster() {
   const { t } = useTranslation();
   const [companyId, setCompanyId] = useState(null);
   const [companyName, setCompanyName] = useState('');
   const [items, setItems] = useState([]);
   const [rates, setRates] = useState([]);
   const [loading, setLoading] = useState(true);
   const [message, setMessage] = useState(null);
   const [financialYear, setFinancialYear] = useState('2026-27');
   const [searchTerm, setSearchTerm] = useState('');
   const [isSaving, setIsSaving] = useState(false);

   // Season Modal State
   const [showSeasonModal, setShowSeasonModal] = useState(false);
   const [newSeason, setNewSeason] = useState({ name: '', season: 'Winter', year: '2026-27' });
   const [currentSeason, setCurrentSeason] = useState(null);

   // Edit states
   const [editingItemId, setEditingItemId] = useState(null);
   const [editRate, setEditRate] = useState('');
   const [editWinterRate, setEditWinterRate] = useState('');
   const [editSummerRate, setEditSummerRate] = useState('');

   useEffect(() => {
      loadInitialData();
   }, [financialYear]);

   const loadInitialData = async () => {
      try {
         setLoading(true);
         // Fetch only what we need from company (id + name)
         const companyRes = await api.get('/company');
         const comp = companyRes?.data?.data;

         if (!companyRes?.data?.success || !comp?.id) {
            const errorText = companyRes?.data?.error || companyRes?.data?.message || 'Company not found. Please create company first.';
            setCompanyId(null);
            setCompanyName('');
            setItems([]);
            setRates([]);
            setCurrentSeason(null);
            setMessage({ type: 'error', text: errorText });
            return;
         }

         setCompanyId(comp.id);
         setCompanyName(comp.company_name || '');

         // Load items, rates, and current season in parallel
         // Pass company header explicitly so the page works even if localStorage user.company_id is missing.
         const headers = { 'X-Company-Id': comp.id };
         const [itemsListRes, ratesRes, seasonsRes] = await Promise.all([
            api.get('/items', { headers }),
            api.get('/dangar-rates', { headers, params: { year: financialYear } }),
            api.get(`/seasons/company/${comp.id}`)
         ]);

         if (itemsListRes?.data?.success) {
            setItems(itemsListRes.data.data || []);
         } else {
            setItems([]);
         }

         if (ratesRes?.data?.success) {
            setRates(ratesRes.data.data || []);
         } else {
            setRates([]);
         }

         if (seasonsRes?.data?.success && (seasonsRes.data.data || []).length > 0) {
            setCurrentSeason(seasonsRes.data.data[0]); // Most recent
         } else {
            setCurrentSeason(null);
         }
      } catch (error) {
         console.error('Failed to load data:', error);
         setMessage({ type: 'error', text: 'Cloud infrastructure synchronization failure' });
      } finally {
         setLoading(false);
      }
   };

   const handleEdit = (item, rateObj) => {
      setEditingItemId(item.id);
      setEditRate(rateObj?.rate ?? '');
      setEditWinterRate(rateObj?.winter_rate ?? '');
      setEditSummerRate(rateObj?.summer_rate ?? '');
   };

   const handleSave = async (itemId) => {
      try {
         setIsSaving(true);
         const res = await api.post('/dangar-rates', {
            company_id: companyId,
            financial_year: financialYear,
            item_id: itemId,
            rate: parseFloat(editRate) || 0,
            winter_rate: parseFloat(editWinterRate) || 0,
            summer_rate: parseFloat(editSummerRate) || 0
         });

         if (res.data.success) {
            setMessage({ type: 'success', text: 'Rate configuration finalized' });
            setEditingItemId(null);
            loadInitialData();
            setTimeout(() => setMessage(null), 3000);
         }
      } catch (error) {
         setMessage({ type: 'error', text: 'Secure commit failed' });
      } finally {
         setIsSaving(false);
      }
   };

   const handleCreateSeason = async (e) => {
      e.preventDefault();
      try {
         setIsSaving(true);

         const payload = {
            company_id: companyId,
            name: newSeason.name,
            season_type: newSeason.season,
            financial_year: newSeason.year
         };

         const res = await api.post('/seasons', payload);

         if (res.data.success) {
            setMessage({ type: 'success', text: 'New season configuration registered successfully' });
            setShowSeasonModal(false);
            setNewSeason({ name: '', season: 'Winter', year: '2026-27' });
            // Optional: reload any data if seasons are displayed in the main UI
            loadInitialData();
         } else {
            throw new Error(res.data.error || 'Server rejection');
         }
      } catch (error) {
         console.error('Season creation error:', error);
         setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to initialize new season' });
      } finally {
         setIsSaving(false);
         setTimeout(() => setMessage(null), 4000);
      }
   };

   const filteredItems = items.filter(item =>
      (item.item_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.item_code || '').toLowerCase().includes(searchTerm.toLowerCase())
   );

   if (loading && !companyId) {
      return (
         <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-24">
            <Loader className="w-12 h-12 text-blue-100 animate-spin mb-4" />
            <p className="text-slate-300 font-bold uppercase tracking-[0.2em] text-[10px]">Authorizing Price Shards...</p>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
         <div className="max-w-[1600px] mx-auto px-8">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-6">
               <div>
                  <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Year Wise Dangar Rate</h1>
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-white rounded-lg px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
                     <Calendar size={18} className="text-slate-400" />
                     <select
                        value={financialYear}
                        onChange={(e) => setFinancialYear(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm text-slate-600 font-bold cursor-pointer"
                     >
                        <option value="2026-27">2026-27</option>
                        <option value="2025-26">2025-26</option>
                     </select>
                     <div className="w-px h-6 bg-slate-200"></div>
                     <button
                        onClick={() => setShowSeasonModal(true)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-xs uppercase tracking-widest pl-1 transition-colors"
                     >
                        <Plus size={16} /> New Season
                     </button>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 bg-white rounded-lg px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
                     <Search size={18} className="text-slate-400 group-focus-within:text-blue-500" />
                     <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search commodity nomenclature..."
                        className="bg-transparent border-none outline-none text-sm text-slate-600 w-64 placeholder:text-slate-300 font-medium"
                     />
                  </div>
               </div>
            </div>

            {/* Global Messages */}
            {message && (
               <div className={`mb-8 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top duration-300 ${message.type === 'error' ? 'bg-rose-50 border border-rose-100 text-rose-700' : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                  }`}>
                  {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                  <p className="text-sm font-bold">{message.text}</p>
               </div>
            )}

            {/* Content Table */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
               <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><TrendingUp size={18} /></div>
                     <h2 className="text-lg font-bold text-slate-800 italic">Tariff Matrix - Fiscal Period {financialYear}</h2>
                     <div className="group relative">
                        <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center cursor-help transition-all hover:bg-amber-600 hover:text-white">
                           <span className="text-[10px] font-black">!</span>
                        </div>
                        <div className="absolute left-0 top-full mt-2 w-56 p-3 bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 shadow-2xl border border-white/10 translate-y-2 group-hover:translate-y-0">
                           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500 mb-1">Standardization Protocol</p>
                           <p className="text-[10px] font-bold text-slate-300 italic leading-tight">Attention: All tariffs MUST be configured based on 100.00 Kgs (1 Quintal) baseline ONLY.</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="bg-[#F8FAFC]">
                           <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Commodity</th>
                           <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">SKU</th>
                           <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">1st Class (100kg)</th>
                           <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right bg-blue-50/30 font-black">2nd Class (100kg)</th>
                           <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right bg-emerald-50/30 font-black">3rd Class (100kg)</th>
                           <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Ops</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {filteredItems.map(item => {
                           const rateObj = rates.find(r => r.item_id === item.id);
                           const isEditing = editingItemId === item.id;

                           return (
                              <tr key={item.id} className="group hover:bg-blue-50/20 transition-all duration-300">
                                 <td className="px-10 py-6">
                                    <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                          <Box size={16} />
                                       </div>
                                       <div>
                                          <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{item.item_name}</p>
                                          <p className="text-[10px] font-medium text-slate-400 italic">Category: {item.category || 'N/A'}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-10 py-6 text-center font-mono text-[10px] font-black text-slate-400">
                                    {item.item_code}
                                 </td>
                                 <td className="px-6 py-6 text-right">
                                    {isEditing ? (
                                       <input
                                          type="number"
                                          value={editRate}
                                          onChange={(e) => setEditRate(e.target.value)}
                                          placeholder="0.00"
                                          className="w-24 h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                                       />
                                    ) : (
                                       <span className="text-sm font-black text-slate-800">
                                          {rateObj ? `₹${parseFloat(rateObj.rate).toFixed(2)}` : '0.00'}
                                       </span>
                                    )}
                                 </td>
                                 <td className="px-6 py-6 text-right bg-blue-50/10">
                                    {isEditing ? (
                                       <input
                                          type="number"
                                          value={editWinterRate}
                                          onChange={(e) => setEditWinterRate(e.target.value)}
                                          placeholder="0.00"
                                          className="w-24 h-10 px-3 bg-white border border-blue-200 rounded-lg text-right font-bold text-blue-700 outline-none focus:border-blue-500 transition-all shadow-sm"
                                       />
                                    ) : (
                                       <span className="text-sm font-black text-blue-600">
                                          {rateObj ? `₹${parseFloat(rateObj.winter_rate || 0).toFixed(2)}` : '0.00'}
                                       </span>
                                    )}
                                 </td>
                                 <td className="px-6 py-6 text-right bg-emerald-50/10">
                                    {isEditing ? (
                                       <input
                                          type="number"
                                          value={editSummerRate}
                                          onChange={(e) => setEditSummerRate(e.target.value)}
                                          placeholder="0.00"
                                          className="w-24 h-10 px-3 bg-white border border-emerald-200 rounded-lg text-right font-bold text-emerald-700 outline-none focus:border-emerald-500 transition-all shadow-sm"
                                       />
                                    ) : (
                                       <span className="text-sm font-black text-emerald-600">
                                          {rateObj ? `₹${parseFloat(rateObj.summer_rate || 0).toFixed(2)}` : '0.00'}
                                       </span>
                                    )}
                                 </td>

                                 <td className="px-10 py-6 text-right">
                                    {isEditing ? (
                                       <div className="flex items-center justify-end gap-2">
                                          <button
                                             onClick={() => handleSave(item.id)}
                                             disabled={isSaving}
                                             className="p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                                          >
                                             {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
                                          </button>
                                          <button
                                             onClick={() => setEditingItemId(null)}
                                             className="p-2.5 bg-slate-100 text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all"
                                          >
                                             <Plus className="rotate-45" size={16} />
                                          </button>
                                       </div>
                                    ) : (
                                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                          <button
                                             onClick={async () => {
                                                if (!window.confirm(`Sync all previous entries for ${item.item_name} with current master rates?`)) return;
                                                try {
                                                   setIsSaving(true);
                                                   const res = await api.post('/dangar-entry/recalculate', {
                                                      item_id: item.id,
                                                      financial_year: financialYear,
                                                      company_id: companyId
                                                   });
                                                   if (res.data.success) {
                                                      setMessage({ type: 'success', text: res.data.message });
                                                      setTimeout(() => setMessage(null), 3000);
                                                   }
                                                } catch (e) {
                                                   setMessage({ type: 'error', text: 'Synchronization engine error' });
                                                } finally {
                                                   setIsSaving(false);
                                                }
                                             }}
                                             disabled={isSaving}
                                             title="Recalculate earlier entries"
                                             className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-amber-600 hover:border-amber-100 hover:shadow-lg rounded-lg transition-all"
                                          >
                                             <RefreshCcw size={16} className={isSaving ? 'animate-spin' : ''} />
                                          </button>
                                          <button
                                             onClick={() => handleEdit(item, rateObj)}
                                             className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-lg rounded-lg"
                                          >
                                             <Edit3 size={16} />
                                          </button>
                                       </div>
                                    )}
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>

               {filteredItems.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center p-24 text-center">
                     <div className="w-20 h-20 bg-slate-50 rounded-lg flex items-center justify-center text-slate-200 mb-6"><Scale size={40} /></div>
                     <h3 className="text-lg font-bold text-slate-400 mb-2">Registry Void</h3>
                     <p className="text-slate-300 text-sm max-w-xs mx-auto mb-8 font-medium">Authorised items not found in current company sharding.</p>
                  </div>
               )}
            </div>
         </div>

         {/* Create Season Modal */}
         {showSeasonModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
               <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                  <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 text-white rounded-lg shadow-lg ring-4 ring-blue-500/5"><Calendar size={20} /></div>
                        <div>
                           <h3 className="text-xl font-bold text-slate-800">Initialize Season</h3>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Create Fiscal Parameter</p>
                        </div>
                     </div>
                     <button disabled={isSaving} onClick={() => setShowSeasonModal(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
                  </div>

                  <div className="px-10 py-6 bg-slate-50/50 border-b border-slate-50 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Last Active Registry</span>
                     </div>
                     <div className="text-right">
                        <p className="text-[11px] font-bold text-slate-700 leading-none mb-1">{currentSeason ? currentSeason.name : '-- No Registry Found --'}</p>
                        <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest leading-none">{currentSeason ? `${currentSeason.season_type} | ${currentSeason.financial_year}` : 'N/A'}</p>
                     </div>
                  </div>

                  <form onSubmit={handleCreateSeason} className="p-10 space-y-6">

                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity Name / Label</label>
                        <div className="relative group">
                           <Database size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                           <input
                              type="text"
                              required
                              value={newSeason.name}
                              onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                              placeholder="e.g. Winter Epoch 26"
                              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm italic"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Season Designation</label>
                           <select
                              required
                              value={newSeason.season}
                              onChange={(e) => setNewSeason({ ...newSeason, season: e.target.value })}
                              className="w-full px-5 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none font-bold text-slate-700 appearance-none uppercase text-xs tracking-wider"
                           >
                              <option value="Winter">Winter</option>
                              <option value="Summer">Summer</option>
                           </select>
                        </div>

                        <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fiscal Year</label>
                           <input
                              type="text"
                              required
                              value={newSeason.year}
                              onChange={(e) => setNewSeason({ ...newSeason, year: e.target.value })}
                              placeholder="2026-27"
                              className="w-full px-5 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm font-mono text-center"
                           />
                        </div>
                     </div>

                     <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full mt-4 flex items-center justify-center gap-3 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[10px] py-4 rounded-lg hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:bg-slate-300"
                     >
                        {isSaving ? <Loader className="animate-spin" size={16} /> : <><Save size={16} /> Register Configuration</>}
                     </button>
                  </form>
               </div>
            </div>
         )}

      </div>
   );
}
