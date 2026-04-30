import React, { useState, useEffect } from 'react';
import {
   Plus, Search, Edit3, Trash2, Shield,
   Settings, CheckCircle, X, Loader,
   Layout, DollarSign, Calculator, ArrowRight,
   Info, AlertCircle, TrendingDown
} from 'lucide-react';
import api, { deductionMasterApi } from '../api';

export default function DeductionMaster() {
   const [data, setData] = useState([]);
   const [loading, setLoading] = useState(false);
   const [searchQuery, setSearchQuery] = useState('');
   const [accounts, setAccounts] = useState([]);
   const [showModal, setShowModal] = useState(false);
   const [editingId, setEditingId] = useState(null);
   const [formData, setFormData] = useState({
      name: '',
      type: 'fixed',
      default_value: 0,
      ledger_account_id: '',
      is_active: 1,
      auto_apply: 0,
      show_balance: 1,
      sort_order: 0
   });

   useEffect(() => {
      loadData();
      loadAccounts();
   }, []);

   const loadData = async () => {
      try {
         setLoading(true);
         const res = await deductionMasterApi.getMasters();
         if (res.data.success) {
            setData(res.data.data || []);
         }
      } catch (e) {
         console.error(e);
      } finally {
         setLoading(false);
      }
   };

   const loadAccounts = async () => {
      try {
         const res = await api.get('/accounts?type=ledger');
         if (res.data.success) {
            setAccounts(res.data.data || []);
         }
      } catch (e) {
         console.error(e);
      }
   };

   const handleEdit = (item) => {
      setEditingId(item.id);
      setFormData({
         name: item.name,
         type: item.type,
         default_value: item.default_value,
         ledger_account_id: item.ledger_account_id || '',
         is_active: item.is_active,
         auto_apply: item.auto_apply,
         show_balance: item.show_balance,
         sort_order: item.sort_order
      });
      setShowModal(true);
   };

   const handleDelete = async (id) => {
      if (!window.confirm('Decommission this accounting rule?')) return;
      try {
         setLoading(true);
         const res = await deductionMasterApi.deleteMaster(id);
         if (res.data.success) {
            loadData();
         }
      } catch (e) {
         console.error(e);
      } finally {
         setLoading(false);
      }
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      try {
         setLoading(true);
         const user = JSON.parse(localStorage.getItem('user') || '{}');
         const payload = {
            ...formData,
            id: editingId,
            company_id: user.company_id
         };
         const res = await deductionMasterApi.saveMaster(payload);
         if (res.data.success) {
            setShowModal(false);
            resetForm();
            loadData();
         }
      } catch (e) {
         console.error(e);
      } finally {
         setLoading(false);
      }
   };

   const resetForm = () => {
      setEditingId(null);
      setFormData({
         name: '',
         type: 'fixed',
         default_value: 0,
         ledger_account_id: '',
         is_active: 1,
         auto_apply: 0,
         show_balance: 1,
         sort_order: 0
      });
   };

   const filteredData = data.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.account_name?.toLowerCase().includes(searchQuery.toLowerCase())
   );

   return (
      <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
         <div className="max-w-[1400px] mx-auto px-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-4">
               <div>
                  <div className="flex items-center gap-2 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-1 italic">
                     <Shield size={12} />
                     <span>Accounting Infrastructure / Deduction Master</span>
                  </div>
                  <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic uppercase">Deduction Rules Registry</h1>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Configure automated fiscal extraction protocols</p>
               </div>

               <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-3 bg-white rounded-lg px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
                     <Search size={18} className="text-slate-400 group-focus-within:text-blue-600" />
                     <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search protocols..."
                        className="bg-transparent border-none outline-none text-sm text-slate-700 w-64 placeholder:text-slate-200 font-bold italic"
                     />
                  </div>
                  <button
                     onClick={() => { resetForm(); setShowModal(true); }}
                     className="bg-slate-900 px-6 py-3.5 rounded-lg text-xs font-black text-white hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center gap-2 uppercase tracking-widest"
                  >
                     <Plus size={18} />
                     Initialize New Protocol
                  </button>
               </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-600 rounded-lg p-8 mb-8 text-white relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 text-white/5 -mr-16 -mt-16 group-hover:scale-110 transition-transform"><Settings size={200} /></div>
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="space-y-4 max-w-2xl">
                     <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-widest italic">
                        <Info size={12} />
                        <span>System Protocol Information</span>
                     </div>
                     <h2 className="text-2xl font-black italic uppercase leading-tight">These rules define how deductions are automatically calculated and posted to the ledger.</h2>
                     <p className="text-blue-100 text-sm font-medium leading-relaxed opacity-80">
                        Configure percentage-based or fixed-value deductions that will be available in the Kapat Console and Dangar Entry modules. Each rule must be mapped to a valid ledger account for proper balancing.
                     </p>
                  </div>
                  <div className="flex gap-4 shrink-0">
                     <div className="bg-white/10 backdrop-blur-md px-6 py-5 rounded-lg border border-white/20 text-center min-w-[120px]">
                        <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1 italic">Active Nodes</p>
                        <p className="text-3xl font-black text-white italic tracking-tighter leading-none">{data.filter(d => d.is_active).length}</p>
                     </div>
                     <div className="bg-white/10 backdrop-blur-md px-6 py-5 rounded-lg border border-white/20 text-center min-w-[120px]">
                        <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1 italic">Auto-Apply</p>
                        <p className="text-3xl font-black text-white italic tracking-tighter leading-none">{data.filter(d => d.auto_apply).length}</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Table Registry */}
            <div className="bg-white rounded-lg border border-slate-100 shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
               <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-slate-800 shadow-xl border border-slate-100">
                        <TrendingDown size={24} />
                     </div>
                     <div>
                        <h2 className="text-lg font-black text-slate-800 italic uppercase">Protocol Index Matrix</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Master ledger mapping & logic distribution</p>
                     </div>
                  </div>
               </div>

               <div className="overflow-x-auto flex-1">
                  {loading && data.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center py-32 gap-4">
                        <Loader className="w-12 h-12 text-blue-100 animate-spin" />
                        <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Scanning Identity Shards...</p>
                     </div>
                  ) : filteredData.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center py-32 text-center gap-4">
                        <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-200">
                           <Layout size={48} />
                        </div>
                        <div className="space-y-2">
                           <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Registry Identity Null</p>
                           <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Initialization Required for Fiscal Integrity</p>
                        </div>
                        <button
                           onClick={() => setShowModal(true)}
                           className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                        >
                           <Plus size={14} /> Create First Protocol
                        </button>
                     </div>
                  ) : (
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-slate-900 border-b border-slate-800 italic text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <th className="px-10 py-6">Protocol Name</th>
                              <th className="px-10 py-6">Ledger Account Node</th>
                              <th className="px-10 py-6">Extraction Logic</th>
                              <th className="px-10 py-6 text-right">Default Value</th>
                              <th className="px-10 py-6 text-center">Status</th>
                              <th className="px-10 py-6 text-right">Ops</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {filteredData.map((item, idx) => (
                              <tr key={item.id} className="group hover:bg-slate-50 transition-all duration-300">
                                 <td className="px-10 py-6">
                                    <div className="flex items-center gap-4">
                                       <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black group-hover:scale-110 transition-all shadow-inner ${idx % 2 === 0 ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                          {item.name[0]}
                                       </div>
                                       <div>
                                          <p className="text-sm font-black text-slate-800 uppercase tracking-tight italic">{item.name}</p>
                                          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-0.5 font-mono italic">Node SR: #{item.sort_order}</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-10 py-6">
                                    <div className="flex items-center gap-2">
                                       <Layout size={14} className="text-slate-300" />
                                       <div>
                                          <p className="text-xs font-black text-slate-700 uppercase italic tracking-tight">{item.account_name || 'NULL_NODE'}</p>
                                          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">System Shard Mapping</p>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-10 py-6">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest italic border ${item.type === 'percentage' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                       item.type === 'per_unit' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                          'bg-slate-100 text-slate-600 border-slate-200'
                                       }`}>
                                       <Calculator size={10} />
                                       {item.type.replace('_', ' ')}
                                    </span>
                                 </td>
                                 <td className="px-10 py-6 text-right font-black text-slate-800 text-sm italic font-mono bg-slate-50/30 group-hover:bg-blue-50 transition-colors">
                                    {item.type === 'percentage' ? `${item.default_value}%` : `${item.default_value}`}
                                 </td>
                                 <td className="px-10 py-6">
                                    <div className="flex flex-col items-center gap-1.5">
                                       {item.is_active ?
                                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-100 flex items-center gap-1"><CheckCircle size={8} /> Active</span> :
                                          <span className="px-2.5 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-slate-200">Inactive</span>
                                       }
                                       {item.auto_apply ?
                                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest rounded-full border border-blue-100 italic">Auto-Apply</span> : null
                                       }
                                    </div>
                                 </td>
                                 <td className="px-10 py-6">
                                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                       <button onClick={() => handleEdit(item)} className="p-3 bg-white text-slate-400 hover:text-blue-600 rounded-lg border border-slate-100 shadow-sm hover:shadow-lg transition-all active:scale-90"><Edit3 size={16} /></button>
                                       <button onClick={() => handleDelete(item.id)} className="p-3 bg-white text-slate-400 hover:text-rose-600 rounded-lg border border-slate-100 shadow-sm hover:shadow-lg transition-all active:scale-90"><Trash2 size={16} /></button>
                                    </div>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  )}
               </div>

               <div className="p-8 bg-slate-900 border-t border-slate-800 flex justify-between items-center shrink-0">
                  <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] italic flex items-center gap-3">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                     Accounting Shards Synchronized
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 px-6 py-2.5 rounded-lg border border-white/5">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Node Integrity Stage</p>
                     <p className="text-xs font-black text-white italic tracking-tighter leading-none">V1.2 ALPHA RELAY</p>
                  </div>
               </div>
            </div>
         </div>

         {/* Modal - High Density Form */}
         {showModal && (
            <div className="fixed inset-0 z-[100] flex justify-center items-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
               <div className="absolute inset-0" onClick={() => setShowModal(false)} />
               <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in zoom-in-95 duration-300">

                  <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                           <Plus size={24} />
                        </div>
                        <div>
                           <h2 className="text-2xl font-black italic uppercase tracking-tight">Protocol Definition</h2>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Fiscal Logic Unit Setup</p>
                        </div>
                     </div>
                     <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"><X size={24} /></button>
                  </div>

                  <form onSubmit={handleSubmit} className="p-10 space-y-8 bg-slate-50/30 overflow-y-auto max-h-[70vh]">

                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Protocol Nomenclature</label>
                        <div className="relative group">
                           <Shield className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                           <input
                              required
                              type="text"
                              value={formData.name}
                              onChange={e => setFormData({ ...formData, name: e.target.value })}
                              className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all font-black italic text-sm text-slate-800 shadow-sm"
                              placeholder="E.G. MANDLI KAPAT, TRANSPORT FEE..."
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Extraction Logic Type</label>
                           <div className="relative group">
                              <Calculator className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                              <select
                                 className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all font-black italic text-sm text-slate-800 appearance-none shadow-sm cursor-pointer"
                                 value={formData.type}
                                 onChange={e => setFormData({ ...formData, type: e.target.value })}
                              >
                                 <option value="fixed">Fixed Global Value</option>
                                 <option value="per_unit">Per Measurement Unit (Qt)</option>
                                 <option value="percentage">Percentage (Fiscal %)</option>
                              </select>
                           </div>
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Default Value Vector</label>
                           <div className="relative group">
                              <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                              <input
                                 required
                                 type="number"
                                 step="0.01"
                                 value={formData.default_value}
                                 onChange={e => setFormData({ ...formData, default_value: e.target.value })}
                                 className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all font-black italic text-sm text-slate-800 shadow-sm font-mono"
                                 placeholder="0.00"
                              />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Target Ledger Account Node</label>
                        <div className="relative group">
                           <Layout className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                           <select
                              required
                              className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all font-black italic text-sm text-slate-800 appearance-none shadow-sm cursor-pointer"
                              value={formData.ledger_account_id}
                              onChange={e => setFormData({ ...formData, ledger_account_id: e.target.value })}
                           >
                              <option value="">Map to Structural Account...</option>
                              {accounts.map(acc => (
                                 <option key={acc.id} value={acc.id}>{acc.account_code ? `[${acc.account_code}] ` : ''}{acc.account_name}</option>
                              ))}
                           </select>
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4 bg-slate-100/50 p-6 rounded-lg border border-slate-200">
                        <div className="space-y-4">
                           <div className="flex items-center gap-3">
                              <input
                                 type="checkbox"
                                 id="is_active"
                                 className="w-5 h-5 rounded-lg accent-blue-600"
                                 checked={formData.is_active === 1}
                                 onChange={e => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                              />
                              <label htmlFor="is_active" className="text-xs font-black text-slate-700 uppercase italic cursor-pointer">Protocol Active Status</label>
                           </div>
                           <div className="flex items-center gap-3">
                              <input
                                 type="checkbox"
                                 id="auto_apply"
                                 className="w-5 h-5 rounded-lg accent-blue-600"
                                 checked={formData.auto_apply === 1}
                                 onChange={e => setFormData({ ...formData, auto_apply: e.target.checked ? 1 : 0 })}
                              />
                              <label htmlFor="auto_apply" className="text-xs font-black text-slate-700 uppercase italic cursor-pointer">Auto-Apply Calculation</label>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <div className="flex items-center gap-3">
                              <input
                                 type="checkbox"
                                 id="show_balance"
                                 className="w-5 h-5 rounded-lg accent-blue-600"
                                 checked={formData.show_balance === 1}
                                 onChange={e => setFormData({ ...formData, show_balance: e.target.checked ? 1 : 0 })}
                              />
                              <label htmlFor="show_balance" className="text-xs font-black text-slate-700 uppercase italic cursor-pointer">Expose Node Balance</label>
                           </div>
                           <div className="flex items-center gap-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Sort Protocol Index:</label>
                              <input
                                 type="number"
                                 value={formData.sort_order}
                                 onChange={e => setFormData({ ...formData, sort_order: e.target.value })}
                                 className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-800 outline-none font-mono"
                              />
                           </div>
                        </div>
                     </div>

                     <div className="flex gap-4 pt-4 border-t border-slate-200">
                        <button
                           type="button"
                           onClick={() => setShowModal(false)}
                           className="flex-1 py-4 bg-white text-slate-500 font-black text-xs uppercase tracking-widest rounded-lg border border-slate-200 hover:bg-slate-50 transition-all active:scale-95 italic"
                        >
                           Decline Setup
                        </button>
                        <button
                           type="submit"
                           disabled={loading}
                           className="flex-1 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-xl shadow-slate-200 hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                           {loading ? <Loader className="animate-spin" size={18} /> : (
                              <>
                                 Communicate Protocol <ArrowRight size={18} />
                              </>
                           )}
                        </button>
                     </div>

                  </form>
               </div>
            </div>
         )}

         {/* Warning Alert if no rules exist (floating micro-animation) */}
         {data.length === 0 && !loading && !showModal && (
            <div className="fixed bottom-10 right-10 z-[50] animate-bounce">
               <div className="bg-amber-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 border-2 border-amber-400">
                  <AlertCircle size={20} />
                  <div>
                     <p className="text-xs font-black uppercase tracking-widest leading-none">Master Empty</p>
                     <p className="text-[10px] font-medium opacity-80">Initialization required for Console</p>
                  </div>
                  <button onClick={() => setShowModal(true)} className="ml-2 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/40 transition-colors">
                     <Plus size={16} />
                  </button>
               </div>
            </div>
         )}
      </div>
   );
}
