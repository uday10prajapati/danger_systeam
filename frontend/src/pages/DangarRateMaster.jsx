import React, { useState, useEffect } from 'react';
import { 
  Shield, Search, Plus, Save, RefreshCcw, 
  AlertCircle, CheckCircle, Database, Calendar,
  TrendingUp, Scale, Box, Loader, Info, Edit3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';

export default function DangarRateMaster() {
  const { t } = useTranslation();
  const [company, setCompany] = useState(null);
  const [items, setItems] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [financialYear, setFinancialYear] = useState('2026-27');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edit states
  const [editingItemId, setEditingItemId] = useState(null);
  const [editRate, setEditRate] = useState('');
  const [editWinterRate, setEditWinterRate] = useState('');
  const [editSummerRate, setEditSummerRate] = useState('');
  const [editBardan, setEditBardan] = useState('');

  useEffect(() => {
    loadInitialData();
  }, [financialYear]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const companyRes = await api.get('/company');
      if (companyRes.data.success) {
        const comp = companyRes.data.data;
        setCompany(comp);
        
        // Load items and rates in parallel
        const [itemsListRes, ratesRes] = await Promise.all([
          api.get('/items'),
          api.get(`/dangar-rates/company/${comp.id}?year=${financialYear}`)
        ]);

        if (itemsListRes.data.success) {
          setItems(itemsListRes.data.data || []);
        }
        if (ratesRes.data.success) {
          setRates(ratesRes.data.data || []);
        }
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
    setEditBardan(rateObj?.bardan_deduction_rate ?? '');
  };

  const handleSave = async (itemId) => {
    try {
      setIsSaving(true);
      const res = await api.post('/dangar-rates', {
        company_id: company.id,
        financial_year: financialYear,
        item_id: itemId,
        rate: parseFloat(editRate) || 0,
        winter_rate: parseFloat(editWinterRate) || 0,
        summer_rate: parseFloat(editSummerRate) || 0,
        bardan_deduction_rate: parseFloat(editBardan) || 0
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

  const filteredItems = items.filter(item => 
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !company) {
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
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
              <Shield size={12} />
              <span>{t('modules.management', 'Management')} / Tariff Configuration</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Year Wise Dangar Rate</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-3 bg-white rounded-2xl px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
                <Calendar size={18} className="text-slate-400" />
                <select 
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-slate-600 font-bold cursor-pointer"
                >
                   <option value="2026-27">2026-27</option>
                   <option value="2025-26">2025-26</option>
                </select>
             </div>
             <div className="hidden sm:flex items-center gap-3 bg-white rounded-2xl px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
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
          <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
            message.type === 'error' ? 'bg-rose-50 border border-rose-100 text-rose-700' : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
          }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <p className="text-sm font-bold">{message.text}</p>
          </div>
        )}

        {/* Content Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
           <div className="p-8 border-b border-slate-50 flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><TrendingUp size={18} /></div>
              <h2 className="text-lg font-bold text-slate-800 italic">Tariff Matrix - Fiscal Period {financialYear}</h2>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-[#F8FAFC]">
                       <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Commodity</th>
                       <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">SKU</th>
                       <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Std Rate (₹)</th>
                       <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right bg-blue-50/30">Winter (₹)</th>
                       <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right bg-emerald-50/30">Summer (₹)</th>
                       <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Bardan (₹)</th>
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
                                   <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
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
                                     className="w-24 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-right font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
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
                                     className="w-24 h-10 px-3 bg-white border border-blue-200 rounded-xl text-right font-bold text-blue-700 outline-none focus:border-blue-500 transition-all shadow-sm"
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
                                     className="w-24 h-10 px-3 bg-white border border-emerald-200 rounded-xl text-right font-bold text-emerald-700 outline-none focus:border-emerald-500 transition-all shadow-sm"
                                   />
                                ) : (
                                   <span className="text-sm font-black text-emerald-600">
                                      {rateObj ? `₹${parseFloat(rateObj.summer_rate || 0).toFixed(2)}` : '0.00'}
                                   </span>
                                )}
                             </td>
                             <td className="px-6 py-6 text-right">
                                {isEditing ? (
                                   <input 
                                     type="number"
                                     value={editBardan}
                                     onChange={(e) => setEditBardan(e.target.value)}
                                     placeholder="0.00"
                                     className="w-24 h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-right font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                                   />
                                ) : (
                                   <span className="text-sm font-bold text-slate-400 italic">
                                      {rateObj ? `₹${parseFloat(rateObj.bardan_deduction_rate).toFixed(2)}` : '0.00'}
                                   </span>
                                )}
                             </td>
                             <td className="px-10 py-6 text-right">
                                {isEditing ? (
                                   <div className="flex items-center justify-end gap-2">
                                      <button 
                                        onClick={() => handleSave(item.id)}
                                        disabled={isSaving}
                                        className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                                      >
                                         {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
                                      </button>
                                      <button 
                                        onClick={() => setEditingItemId(null)}
                                        className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all"
                                      >
                                         <Plus className="rotate-45" size={16} />
                                      </button>
                                   </div>
                                ) : (
                                   <button 
                                     onClick={() => handleEdit(item, rateObj)}
                                     className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-lg rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0"
                                   >
                                      <Edit3 size={16} />
                                   </button>
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
                 <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-6"><Scale size={40} /></div>
                 <h3 className="text-lg font-bold text-slate-400 mb-2">Registry Void</h3>
                 <p className="text-slate-300 text-sm max-w-xs mx-auto mb-8 font-medium">Authorised items not found in current company sharding.</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
