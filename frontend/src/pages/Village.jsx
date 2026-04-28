import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import {
   Plus, AlertCircle, Edit2, Trash2, CheckCircle,
   MapPin, Search, Filter, Database, Shield,
   RefreshCw, Save, X, Download, FileText,
   Navigation, Building2, Globe
} from 'lucide-react';

export default function VillageMaster() {
   const { t } = useTranslation();
   const [villages, setVillages] = useState([]);
   const [loading, setLoading] = useState(false);
   const [searchQuery, setSearchQuery] = useState('');
   const [message, setMessage] = useState(null);
   const [showForm, setShowForm] = useState(false);
   const [isEditing, setIsEditing] = useState(false);

   const [formData, setFormData] = useState({
      id: null,
      villageCode: '',
      villageName: '',
      talukaName: '',
      districtName: '',
      noOfVillage: 0
   });

   useEffect(() => {
      loadVillages();
   }, []);

   const loadVillages = async () => {
      try {
         setLoading(true);
         const response = await api.get('/village');
         // Mapped to frontend keys if needed, or use directly
         // Based on my backend update, it returns snake_case
         const mapped = response.data.map(r => ({
            id: r.id,
            villageCode: r.village_code,
            villageName: r.village_name,
            talukaName: r.taluka_name,
            districtName: r.district_name,
            noOfVillage: r.no_of_villages
         }));
         setVillages(mapped);
      } catch (error) {
         setMessage({ type: 'error', text: 'Infrastructure sync failed. Registry unreachable.' });
      } finally {
         setLoading(false);
      }
   };

   const fetchNextCode = async () => {
      try {
         const res = await api.get('/village/last-code');
         const nextCode = (parseInt(res.data.lastCode) || 0) + 1;
         return nextCode.toString();
      } catch (e) {
         return '1';
      }
   };

   const handleEdit = (village) => {
      setFormData(village);
      setIsEditing(true);
      setShowForm(true);
   };

   const handleCreateNew = async () => {
      const nextCode = await fetchNextCode();
      setFormData({
         id: null,
         villageCode: nextCode,
         villageName: '',
         talukaName: '',
         districtName: '',
         noOfVillage: villages.length + 1
      });
      setIsEditing(false);
      setShowForm(true);
   };

   const handleSave = async (e) => {
      e.preventDefault();
      try {
         setLoading(true);
         if (isEditing) {
            await api.put(`/village/${formData.id}`, formData);
            setMessage({ type: 'success', text: 'Village node updated successfully.' });
         } else {
            await api.post('/village', formData);
            setMessage({ type: 'success', text: 'New village node registered in registry.' });
         }
         setShowForm(false);
         loadVillages();
         setTimeout(() => setMessage(null), 3000);
      } catch (error) {
         setMessage({ type: 'error', text: 'Sync error: Protocol violation detected.' });
      } finally {
         setLoading(false);
      }
   };

   const handleDelete = async (id) => {
      if (!window.confirm('Are you sure you want to decommission this village node?')) return;
      try {
         await api.delete(`/village/${id}`);
         setMessage({ type: 'success', text: 'Village node purged from registry.' });
         loadVillages();
         setTimeout(() => setMessage(null), 3000);
      } catch (error) {
         setMessage({ type: 'error', text: 'Operation failed: Node protection active.' });
      }
   };

   const filteredVillages = villages.filter(v =>
      v.villageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.villageCode.toString().includes(searchQuery)
   );

   if (showForm) {
      return (
         <div className="min-h-screen bg-[#F8FAFC] py-12 px-8 animate-in fade-in slide-in-from-bottom duration-500">
            <div className="max-w-xl mx-auto">
               <button
                  onClick={() => setShowForm(false)}
                  className="group mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-800 font-bold text-sm transition-colors"
               >
                  <div className="p-2 bg-white rounded-lg border border-slate-200 group-hover:border-slate-800 transition-all"><X size={16} /></div>
                  Back to Registry
               </button>

               <div className="bg-white rounded-lg border border-slate-100 shadow-xl p-10 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 blur-2xl"></div>

                  <div className="flex items-center gap-4 mb-10">
                     <div className="p-4 bg-blue-600 text-white rounded-lg shadow-lg">
                        {isEditing ? <Edit2 size={24} /> : <Plus size={24} />}
                     </div>
                     <div>
                        <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Update Village' : 'Register Village'}</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Village Node Profile</p>
                     </div>
                  </div>

                  <form onSubmit={handleSave} className="space-y-6">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Node Code</label>
                           <input
                              type="text"
                              value={formData.villageCode}
                              onChange={(e) => setFormData({ ...formData, villageCode: e.target.value })}
                              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm"
                              required
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Node Name</label>
                           <input
                              type="text"
                              value={formData.villageName}
                              onChange={(e) => setFormData({ ...formData, villageName: e.target.value })}
                              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm italic"
                              placeholder="Enter Nomenclature..."
                              required
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Taluka Cluster</label>
                           <input
                              type="text"
                              value={formData.talukaName}
                              onChange={(e) => setFormData({ ...formData, talukaName: e.target.value })}
                              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm"
                              placeholder="Taluka Region"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">District Sovereign</label>
                           <input
                              type="text"
                              value={formData.districtName}
                              onChange={(e) => setFormData({ ...formData, districtName: e.target.value })}
                              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm"
                              placeholder="District Zone"
                           />
                        </div>
                     </div>

                     <div className="pt-6">
                        <button
                           type="submit"
                           disabled={loading}
                           className="w-full py-4 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-300"
                        >
                           {loading ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                           {isEditing ? 'Synchronize Record' : 'Commit Registry'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
         <div className="max-w-[1400px] mx-auto px-8">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-6">
               <div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
                     <Shield size={12} />
                     <span>{t('modules.management')} / {t('modules.villageMaster')}</span>
                  </div>
                  <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Village Registry</h1>
               </div>
               <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="flex-1 md:flex-none flex items-center gap-3 bg-white rounded-lg px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
                     <Search size={18} className="text-slate-400 group-focus-within:text-blue-500" />
                     <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or code..."
                        className="bg-transparent border-none outline-none text-sm text-slate-600 w-full md:w-64 placeholder:text-slate-300 font-medium"
                     />
                  </div>
                  <button
                     onClick={handleCreateNew}
                     className="flex items-center gap-2 bg-blue-600 px-6 py-3.5 rounded-lg text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                  >
                     <Plus size={20} />
                     Register Node
                  </button>
               </div>
            </div>

            {/* Global Messages */}
            {message && (
               <div className={`mb-8 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top duration-300 shadow-sm border ${message.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  }`}>
                  {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                  <p className="text-sm font-bold">{message.text}</p>
               </div>
            )}

            {/* Info Shards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
               <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Village Nodes</p>
                     <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600"><MapPin size={18} /></div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">{villages.length}</h3>
               </div>
               <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Clusters</p>
                     <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600"><Navigation size={18} /></div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">{[...new Set(villages.map(v => v.talukaName))].length}</h3>
               </div>
               <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">District Zones</p>
                     <div className="p-2.5 bg-violet-50 rounded-lg text-violet-600"><Globe size={18} /></div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">{[...new Set(villages.map(v => v.districtName))].length}</h3>
               </div>
            </div>

            {/* Registry Table */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
               <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Database size={18} /></div>
                     <h2 className="text-lg font-bold text-slate-800">Operational Node Registry</h2>
                  </div>
                  <button
                     onClick={loadVillages}
                     className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                     <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                  </button>
               </div>

               <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left">
                     <thead className="bg-[#F8FAFC]">
                        <tr>
                           <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Sr No</th>
                           <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Village Name</th>
                           <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Village Code</th>
                           <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Taluka / Cluster</th>
                           <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">District</th>
                           <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Audit</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {loading && villages.length === 0 ? (
                           <tr>
                              <td colSpan="6" className="py-20 text-center">
                                 <div className="flex flex-col items-center gap-4">
                                    <RefreshCw className="animate-spin text-blue-200" size={32} />
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Querying Secure Registry...</p>
                                 </div>
                              </td>
                           </tr>
                        ) : filteredVillages.length === 0 ? (
                           <tr>
                              <td colSpan="6" className="py-20 text-center">
                                 <div className="w-20 h-20 bg-slate-50 rounded-lg flex items-center justify-center mx-auto mb-4 text-slate-200"><FileText size={32} /></div>
                                 <p className="text-slate-400 font-bold">No registry entries found.</p>
                                 <button onClick={handleCreateNew} className="text-blue-600 text-xs font-bold uppercase mt-4 hover:underline">Register New Node</button>
                              </td>
                           </tr>
                        ) : (
                           filteredVillages.map((v, idx) => (
                              <tr key={v.id} className="group hover:bg-blue-50/30 transition-all">
                                 <td className="px-6 py-6 text-center">
                                    <span className="text-xs font-black text-slate-300">{idx + 1}</span>
                                 </td>
                                 <td className="px-6 py-6">
                                    <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                          <Building2 size={18} />
                                       </div>
                                       <div>
                                          <p className="text-sm font-bold text-slate-700 tracking-tight group-hover:text-blue-700 transition-colors uppercase">{v.villageName}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-6 text-center">
                                    <span className="bg-slate-50 px-3 py-1 rounded-lg text-xs font-bold text-slate-500 border border-slate-100">
                                       {v.villageCode.toString().padStart(4, '0')}
                                    </span>
                                 </td>
                                 <td className="px-6 py-6">
                                    <p className="text-sm font-semibold text-slate-500">{v.talukaName || 'N/A'}</p>
                                 </td>
                                 <td className="px-6 py-6">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{v.districtName || 'LOCAL_ZONE'}</p>
                                 </td>
                                 <td className="px-10 py-6 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                       <button onClick={() => handleEdit(v)} className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 rounded-lg shadow-sm hover:shadow-lg transition-all"><Edit2 size={16} /></button>
                                       <button onClick={() => handleDelete(v.id)} className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-100 rounded-lg shadow-sm hover:shadow-lg transition-all"><Trash2 size={16} /></button>
                                    </div>
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      </div>
   );
}
