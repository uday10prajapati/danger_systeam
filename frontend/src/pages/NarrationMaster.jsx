import React, { useState, useEffect } from 'react';
import api from '../api';
import {
   Plus, Edit2, Trash2, Search,
   FileText, Check, X, AlertCircle,
   Hash, Clock, Activity, MessageSquare
} from 'lucide-react';

export default function NarrationMaster() {
   const [narrations, setNarrations] = useState([]);
   const [loading, setLoading] = useState(true);
   const [searchTerm, setSearchTerm] = useState('');
   const [showForm, setShowForm] = useState(false);
   const [editingId, setEditingId] = useState(null);
   const [formData, setFormData] = useState({ narration_text: '', narration_code: '' });
   const [error, setError] = useState(null);

   useEffect(() => {
      fetchNarrations();
   }, []);

   const fetchNarrations = async () => {
      setLoading(true);
      try {
         const res = await api.get('/narrations');
         setNarrations(res.data.success ? res.data.data : []);
      } catch (err) {
         console.error('Error fetching narrations:', err);
         setNarrations([]);
      } finally {
         setLoading(false);
      }
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      if (!formData.narration_text.trim()) return;

      try {
         if (editingId) {
            await api.put(`/narrations/${editingId}`, formData);
         } else {
            await api.post('/narrations', formData);
         }
         setShowForm(false);
         setEditingId(null);
         setFormData({ narration_text: '', narration_code: '' });
         fetchNarrations();
      } catch (err) {
         setError(err.response?.data?.error || 'Failed to save narration.');
      }
   };

   const handleEdit = (n) => {
      setEditingId(n.id);
      setFormData({ narration_text: n.narration_text, narration_code: n.narration_code || '' });
      setShowForm(true);
   };

   const handleDelete = async (id) => {
      if (!window.confirm('Delete this narration?')) return;
      try {
         await api.delete(`/narrations/${id}`);
         fetchNarrations();
      } catch (err) {
         console.error(err);
      }
   };

   const filtered = narrations.filter(n =>
      n.narration_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.narration_code && n.narration_code.toLowerCase().includes(searchTerm.toLowerCase()))
   );

   return (
      <div className="p-8 scroller-airy overflow-y-auto h-[calc(100vh-80px)]">

         {/* Header Shard */}
         <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <MessageSquare size={24} />
               </div>
               <div>
                  <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Narration Master</h1>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5 italic">Transaction Note Repository</p>
               </div>
            </div>
            <button
               onClick={() => { setShowForm(true); setEditingId(null); setFormData({ narration_text: '', narration_code: '' }); }}
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
               <Plus size={18} /> New Narration
            </button>
         </div>

         <div className="grid grid-cols-12 gap-8">

            {/* Main List - Now Full Width */}
            <div className="col-span-12 space-y-4 text-slate-800">

               {loading ? (
                  <div className="h-64 flex flex-col items-center justify-center bg-white rounded-lg border-2 border-dashed border-slate-100 italic text-slate-300">
                     <Activity className="animate-spin mb-4" />
                     <span className="text-[10px] font-black uppercase tracking-[0.3em]">Synchronizing Repository...</span>
                  </div>
               ) : filtered.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center bg-white rounded-lg border-2 border-dashed border-slate-100 italic text-slate-300 text-slate-800">
                     <MessageSquare size={48} strokeWidth={1} className="mb-4 opacity-20" />
                     <span className="text-[10px] font-black uppercase tracking-[0.3em]">Repository Empty</span>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                     {filtered.map(n => (
                        <div key={n.id} className="bg-white p-5 rounded-lg border border-slate-50 hover:border-indigo-100 transition-all shadow-sm group">
                           <div className="flex justify-between items-start">
                              <div className="flex gap-4">
                                 <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-indigo-50/20 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <FileText size={20} />
                                 </div>
                                 <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                       <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded inline-flex items-center gap-1.5 uppercase tracking-widest">
                                          <Hash size={10} /> {n.narration_code || 'UNC'}
                                       </span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-800 leading-relaxed pr-12">
                                       "{n.narration_text}"
                                    </p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => handleEdit(n)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><Edit2 size={14} /></button>
                                 <button onClick={() => handleDelete(n.id)} className="p-2.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {/* Entry Modal */}
         {showForm && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-500 text-slate-800">
                  <div className="bg-slate-900 p-6 px-8 flex justify-between items-center relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                     <h2 className="text-white font-bold text-lg italic uppercase tracking-wider relative z-10 pr-10">
                        {editingId ? 'Refactor Narration' : 'New Narration Node'}
                     </h2>
                     <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white relative z-10 transition-colors">
                        <X size={24} />
                     </button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-8 space-y-6">
                     {error && (
                        <div className="bg-rose-50 text-rose-500 p-4 rounded-lg flex items-center gap-3 border border-rose-100 animate-pulse">
                           <AlertCircle size={18} />
                           <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
                        </div>
                     )}
                     <div className="grid grid-cols-1 gap-6">
                        <div>
                           <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2 block italic">Alpha Code</label>
                           <input
                              type="text"
                              value={formData.narration_code}
                              onChange={e => setFormData({ ...formData, narration_code: e.target.value.toUpperCase() })}
                              className="w-full bg-[#F8FAFC] border border-slate-100 rounded-lg p-3 text-xs font-black text-slate-700 outline-none focus:border-indigo-200 transition-all uppercase placeholder:italic"
                              placeholder="e.g. PN-01"
                           />
                        </div>
                        <div>
                           <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2 block italic">Narration String</label>
                           <textarea
                              rows={4}
                              value={formData.narration_text}
                              onChange={e => setFormData({ ...formData, narration_text: e.target.value })}
                              className="w-full bg-[#F8FAFC] border border-slate-50 rounded-lg p-5 text-sm font-bold text-slate-700 focus:bg-white focus:border-indigo-200 outline-none transition-all resize-none shadow-inner italic"
                              placeholder="e.g. BEING AMOUNT TRANSFERRED..."
                              required
                           />
                        </div>
                     </div>
                     <div className="flex gap-4 pt-4">
                        <button
                           type="button"
                           onClick={() => setShowForm(false)}
                           className="flex-1 bg-slate-50 text-slate-400 py-4 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-95"
                        >
                           Abort
                        </button>
                        <button
                           type="submit"
                           className="flex-1 bg-indigo-600 text-white py-4 rounded-lg font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                        >
                           {editingId ? 'Update Identity' : 'Commit Node'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         <style dangerouslySetInnerHTML={{
            __html: `
        .scroller-airy::-webkit-scrollbar { width: 4px; }
        .scroller-airy::-webkit-scrollbar-track { background: transparent; }
        .scroller-airy::-webkit-scrollbar-thumb { background: #f1f5f9; border-radius: 10px; }
        .scroller-airy:hover::-webkit-scrollbar-thumb { background: #e2e8f0; }
      `}} />
      </div>
   );
}
