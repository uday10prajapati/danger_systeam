import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Printer, Save, 
  Search, X, RefreshCcw, Calendar, 
  AlertCircle, CheckCircle, History, 
  Package, User, FileText, ChevronRight,
  Database, Info, Layout
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { jamaBardanEntryApi, sabhasadMasterApi } from '../api';

const JamaBardanEntry = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    id: null,
    bookType: 'Combo1',
    pavtiNo: '',
    date: new Date().toISOString().split('T')[0],
    memNominal: '',
    code: '',
    name: '',
    qty: '',
    option: 'Combo1',
    remark: '',
    dayQty: '',
    totalQty: ''
  });

  const [gridRows, setGridRows] = useState(Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [members, setMembers] = useState([]);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersRes, historyRes] = await Promise.all([
        sabhasadMasterApi.getAllSabhasad(),
        jamaBardanEntryApi.getAllEntries()
      ]);

      if (membersRes.data.success) setMembers(membersRes.data.data || membersRes.data);
      else if (Array.isArray(membersRes.data)) setMembers(membersRes.data);

      if (historyRes.data.success) setHistory(historyRes.data.data);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setMessage({ type: 'error', text: 'Synchronization failure' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'code') {
      const member = members.find(m => m.member_code === value);
      if (member) setFormData(prev => ({ ...prev, name: member.member_name }));
    }
    if (name === 'name') {
      const member = members.find(m => m.member_name === value);
      if (member) setFormData(prev => ({ ...prev, code: member.member_code }));
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.date) {
      setMessage({ type: 'error', text: 'Validation failure: Identity and Date required' });
      return;
    }

    try {
      setLoading(true);
      const res = formData.id 
        ? await jamaBardanEntryApi.updateEntry(formData.id, { ...formData, gridRows })
        : await jamaBardanEntryApi.createEntry({ ...formData, gridRows });

      if (res.data.success) {
        setMessage({ type: 'success', text: formData.id ? 'Entry updated successfully' : 'Entry committed to registry' });
        if (!formData.id) resetForm();
        loadData();
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error) {
       console.error('Save error:', error);
       setMessage({ type: 'error', text: 'Operational failure during commit' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Decommission this transaction node?')) return;
    try {
      setLoading(true);
      const res = await jamaBardanEntryApi.deleteEntry(id);
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Node decommissioned' });
        loadData();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Decommission failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (entryId) => {
    try {
      setLoading(true);
      const res = await jamaBardanEntryApi.getEntryById(entryId);
      if (res.data.success) {
        const entry = res.data.data;
        setFormData({
          id: entry.id,
          bookType: entry.book_type,
          pavtiNo: entry.pavti_no,
          date: entry.entry_date ? new Date(entry.entry_date).toISOString().split('T')[0] : '',
          memNominal: entry.mem_nominal,
          code: entry.code,
          name: entry.name,
          qty: entry.qty,
          option: entry.option_type,
          remark: entry.remark,
          dayQty: entry.day_qty,
          totalQty: entry.total_qty
        });
        setGridRows(entry.gridRows || Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
        setShowHistory(false);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load manifest details' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      bookType: 'Combo1',
      pavtiNo: '',
      date: new Date().toISOString().split('T')[0],
      memNominal: '',
      code: '',
      name: '',
      qty: '',
      option: 'Combo1',
      remark: '',
      dayQty: '',
      totalQty: ''
    });
    setGridRows(Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
  };

  const handlePrint = () => {
     window.print();
  };

  if (showHistory) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in slide-in-from-right duration-500">
        <div className="max-w-[1500px] mx-auto px-8">
           <div className="flex justify-between items-center py-10">
              <div>
                 <h1 className="text-3xl font-black text-emerald-500 tracking-tight italic uppercase">Jama Bardan History</h1>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">Jama Gunny Bag Registry Manifest</p>
              </div>
              <button 
                onClick={() => setShowHistory(false)}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
              >
                <X size={16} /> Exit History
              </button>
           </div>

           <div className="bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white shadow-2xl overflow-hidden">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 italic text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <th className="px-10 py-6">Identity</th>
                       <th className="px-10 py-6">Date & Pavti</th>
                       <th className="px-10 py-6 text-right">Quantity</th>
                       <th className="px-10 py-6 text-right">Operations</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {history.map((row) => (
                      <tr key={row.id} className="group hover:bg-white transition-all">
                         <td className="px-10 py-6">
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight italic">{row.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 tracking-widest">CODE: {row.code}</p>
                         </td>
                         <td className="px-10 py-6">
                            <p className="text-sm font-bold text-slate-600 font-mono italic">{new Date(row.entry_date).toLocaleDateString()}</p>
                            <p className="text-[10px] font-bold text-emerald-500 uppercase italic"># {row.pavti_no || 'N/A'}</p>
                         </td>
                         <td className="px-10 py-6 text-right">
                             <p className="text-2xl font-black text-slate-800 italic">{row.qty}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Bags Recorded</p>
                         </td>
                         <td className="px-10 py-6">
                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                               <button onClick={() => handleEdit(row.id)} className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"><ChevronRight size={16}/></button>
                               <button onClick={() => handleDelete(row.id)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"><Trash2 size={16}/></button>
                            </div>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1500px] mx-auto px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-10 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1 italic">
              <Package size={12} />
              <span>Asset Management / Jama Vector</span>
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none italic uppercase">
              {t('jamaBardanEntry.title', 'Jama Bardan Entry')}
            </h1>
          </div>
          
          <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-6 py-4 rounded-3xl border border-white shadow-sm">
             <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                <History size={20} />
             </div>
             <div onClick={() => setShowHistory(true)} className="text-left cursor-pointer group">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 group-hover:text-emerald-500 transition-colors">{t('dangarEntry.dataShow')}</p>
                <p className="text-xs font-black text-slate-800 uppercase tracking-tight underline decoration-emerald-500/30">View Registry Logs</p>
             </div>
          </div>
        </div>

        {/* Messaging */}
        {message && (
          <div className={`mb-8 p-5 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top duration-300 border-l-[6px] ${
            message.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'
          }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <span className="text-sm font-black italic tracking-tight uppercase tracking-widest">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Main Form (Left) */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] border border-white shadow-2xl space-y-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12 -mr-10 -mt-10 select-none pointer-events-none">
                  <Package size={240} />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('bardanEntry.book_type')}</label>
                    <select 
                      name="bookType"
                      className="w-full px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-black italic text-sm text-slate-700 appearance-none shadow-inner uppercase"
                      value={formData.bookType}
                      onChange={handleChange}
                    >
                      <option>Combo1</option>
                      <option>Combo2</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('bardanEntry.pavti_no')}</label>
                    <input 
                      name="pavtiNo"
                      className="w-full px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-black text-sm text-slate-700 shadow-inner italic"
                      placeholder="ENTER PVT NO."
                      value={formData.pavtiNo}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('bardanEntry.date')}</label>
                    <input 
                      type="date"
                      name="date"
                      className="w-full px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-black italic text-sm text-slate-700 shadow-inner"
                      value={formData.date}
                      onChange={handleChange}
                    />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('bardanEntry.code')}</label>
                    <div className="relative group">
                       <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                       <select 
                         name="code"
                         className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-black text-sm text-slate-700 appearance-none shadow-inner uppercase italic"
                         value={formData.code}
                         onChange={handleChange}
                       >
                         <option value="">IDENTITY NODE...</option>
                         {members.map(m => <option key={m.id} value={m.member_code}>{m.member_code}</option>)}
                       </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('bardanEntry.name')}</label>
                    <div className="relative group">
                       <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                       <select 
                         name="name"
                         className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-black text-sm text-slate-700 appearance-none shadow-inner uppercase italic"
                         value={formData.name}
                         onChange={handleChange}
                       >
                         <option value="">NAME REFERENCE...</option>
                         {members.map(m => <option key={m.id} value={m.member_name}>{m.member_name}</option>)}
                       </select>
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('bardanEntry.qty')}</label>
                     <div className="relative group">
                        <Package className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                        <input 
                          type="number"
                          name="qty"
                          className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-black text-sm text-slate-700 shadow-inner italic"
                          placeholder="0.00"
                          value={formData.qty}
                          onChange={handleChange}
                        />
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('bardanEntry.mem_nominal')}</label>
                     <select 
                       name="memNominal"
                       className="w-full px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-black italic text-sm text-slate-700 shadow-inner appearance-none uppercase"
                       value={formData.memNominal}
                       onChange={handleChange}
                     >
                       <option value="">SELECT...</option>
                       <option value="Member">Sabhasad</option>
                       <option value="Nominal">Nominal</option>
                     </select>
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('bardanEntry.remark')}</label>
                  <div className="relative group">
                     <Info className="absolute left-5 top-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                     <textarea 
                       name="remark"
                       className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:border-emerald-500 outline-none transition-all font-black text-sm text-slate-700 min-h-[100px] shadow-inner font-mono italic"
                       placeholder="ADDITIONAL CONTEXT..."
                       value={formData.remark}
                       onChange={handleChange}
                     />
                  </div>
               </div>
            </div>
          </div>

          {/* Right Panel (Grid) */}
          <div className="lg:col-span-4 space-y-8">
             <div className="bg-white/90 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-2xl flex flex-col h-[600px]">
                <div className="flex items-center gap-4 mb-6">
                   <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl shadow-inner">
                      <Layout size={20} />
                   </div>
                   <div>
                      <h3 className="text-base font-black text-slate-800 leading-none italic uppercase">{t('bardanEntry.item_details')}</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Multi-vector Matrix</p>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scroller space-y-3 mb-6">
                   <table className="w-full text-xs">
                      <thead>
                        <tr className="italic text-[9px] font-black text-slate-400 uppercase tracking-widest">
                           <th className="py-3 text-center w-8">#</th>
                           <th className="py-3 px-2 text-left">COL 1</th>
                           <th className="py-3 px-2 text-left">COL 2</th>
                           <th className="py-3 px-2 text-left">COL 3</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gridRows.map((row, i) => (
                          <tr key={i} className="group">
                             <td className="text-center font-black text-slate-200 italic">{i + 1}</td>
                             <td className="px-1 py-1">
                                <input 
                                  className="w-full bg-slate-50 border-none rounded-xl px-3 py-2.5 font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                                  value={row.col1}
                                  onChange={(e) => {
                                    const r = [...gridRows]; r[i].col1 = e.target.value; setGridRows(r);
                                  }}
                                />
                             </td>
                             <td className="px-1 py-1">
                                <input 
                                  className="w-full bg-slate-50 border-none rounded-xl px-3 py-2.5 font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                                  value={row.col2}
                                  onChange={(e) => {
                                    const r = [...gridRows]; r[i].col2 = e.target.value; setGridRows(r);
                                  }}
                                />
                             </td>
                             <td className="px-1 py-1">
                                <input 
                                  className="w-full bg-slate-50 border-none rounded-xl px-3 py-2.5 font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                                  value={row.col3}
                                  onChange={(e) => {
                                    const r = [...gridRows]; r[i].col3 = e.target.value; setGridRows(r);
                                  }}
                                />
                             </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-100">
                   <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase italic">{t('bardanEntry.day_qty')}</p>
                      <input 
                        type="number"
                        name="dayQty"
                        className="w-24 text-right bg-slate-50 rounded-xl px-3 py-2 font-black text-slate-700"
                        value={formData.dayQty}
                        onChange={handleChange}
                      />
                   </div>
                   <div className="flex justify-between items-center text-emerald-500">
                      <p className="text-[10px] font-black uppercase italic">{t('bardanEntry.total_qty')}</p>
                      <input 
                        type="number"
                        name="totalQty"
                        className="w-32 text-right bg-emerald-50/50 border border-emerald-100 rounded-xl px-3 py-3 text-2xl font-black italic tracking-tighter"
                        value={formData.totalQty}
                        onChange={handleChange}
                      />
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Commands */}
        <div className="mt-12 bg-white/40 backdrop-blur-md p-6 rounded-[3rem] border border-white shadow-xl flex flex-wrap justify-center gap-5">
           {[
             { label: 'Display History', icon: History, color: 'slate', action: () => setShowHistory(true), sub: 'Registry logs' },
             { label: 'Initialize New', icon: Plus, color: 'blue', action: resetForm, sub: 'Reset command' },
             { label: 'Commit Entry', icon: Save, color: 'emerald', action: handleSave, sub: 'Commit to DB' },
             { label: 'Physical Print', icon: Printer, color: 'slate', action: handlePrint, sub: 'Generate slip' },
             { label: 'Abort State', icon: X, color: 'slate', action: resetForm, sub: 'Clear form' },
           ].map((btn, i) => (
             <button
               key={i}
               onClick={btn.action}
               className={`flex items-center gap-4 px-10 py-5 rounded-[1.5rem] tracking-widest transition-all shadow-xl active:scale-95 border-b-4 relative group overflow-hidden ${
                 btn.color === 'emerald' ? 'bg-emerald-500 text-white border-emerald-700 hover:bg-emerald-600' :
                 btn.color === 'blue' ? 'bg-blue-600 text-white border-blue-800 hover:bg-blue-700' :
                 'bg-white text-slate-800 border-slate-100 hover:bg-slate-50'
               }`}
             >
                <div className="absolute inset-0 bg-white/10 translate-y-20 group-hover:translate-y-0 transition-transform duration-300"></div>
                <btn.icon size={20} className="relative z-10" />
                <div className="text-left relative z-10">
                   <p className="text-[10px] font-black uppercase leading-none">{btn.label}</p>
                   <p className="text-[8px] font-black uppercase opacity-60 mt-1">{btn.sub}</p>
                </div>
             </button>
           ))}
        </div>

      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scroller::-webkit-scrollbar { width: 4px; }
        .custom-scroller::-webkit-scrollbar-track { background: transparent; }
        .custom-scroller::-webkit-scrollbar-thumb { background: #d1fae5; border-radius: 10px; }
        .custom-scroller:hover::-webkit-scrollbar-thumb { background: #10b981; }
      `}} />
    </div>
  );
};

export default JamaBardanEntry;
