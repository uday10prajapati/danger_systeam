import React, { useState, useEffect } from 'react';
import { Plus, Edit2, AlertCircle, Search, Filter, CheckCircle, XCircle, DollarSign, Database, Activity, Package, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ItemForm from '../components/ItemForm';

export default function ItemMaster() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/company');
      if (res.data.success && res.data.data) {
        setCompany(res.data.data);
        fetchItems(res.data.data.id);
        fetchCategories(res.data.data.id);
      }
    } catch (err) {
      console.error('Fetch company error:', err);
      setLoading(false);
    }
  };

  const fetchItems = async (companyId) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/items/company/${companyId}`);
      if (res.data.success) {
        setItems(res.data.data);
        applyFilters(res.data.data, searchTerm, selectedCategory, selectedStatus);
      }
    } catch (err) {
      console.error('Fetch items error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (companyId) => {
    try {
      const res = await axios.get(`/api/items/categories/${companyId}`);
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  };

  const applyFilters = (itemsToFilter, search, category, status) => {
    let filtered = itemsToFilter;

    if (search) {
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(search.toLowerCase()) ||
        item.item_code.toLowerCase().includes(search.toLowerCase()) ||
        item.barcode.includes(search)
      );
    }

    if (category !== 'all') {
      filtered = filtered.filter(item => item.category === category);
    }

    if (status === 'active') {
      filtered = filtered.filter(item => item.is_active === 1);
    } else if (status === 'inactive') {
      filtered = filtered.filter(item => item.is_active === 0);
    }

    setFilteredItems(filtered);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    applyFilters(items, value, selectedCategory, selectedStatus);
  };

  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    applyFilters(items, searchTerm, category, selectedStatus);
  };

  const handleStatusFilter = (status) => {
    setSelectedStatus(status);
    applyFilters(items, searchTerm, selectedCategory, status);
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setEditingItem(null);
    if (company?.id) {
      fetchItems(company.id);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleActivate = async (item) => {
    try {
      await axios.post(`/api/items/${item.id}/activate`, {}, {
        headers: { 'x-company-id': company.id }
      });
      fetchItems(company.id);
    } catch (err) {
      console.error('Activate error:', err);
    }
  };

  const handleDeactivate = async (item) => {
    try {
      await axios.post(`/api/items/${item.id}/deactivate`, {}, {
        headers: { 'x-company-id': company.id }
      });
      fetchItems(company.id);
    } catch (err) {
      console.error('Deactivate error:', err);
    }
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center p-12 bg-white rounded-3xl shadow-2xl border-4 border-black max-w-md w-full">
          <AlertCircle className="w-16 h-16 text-slate-900 mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter italic">Identity Failure</h2>
          <p className="text-slate-500 mb-8 font-bold uppercase tracking-widest text-[10px]">Active company context not detected in secure session buffer.</p>
          <button 
            onClick={() => navigate('/company')}
            className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
          >
            Re-Initialize Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header - Industrial Monochrome */}
        <div className="flex justify-between items-end border-b-4 border-black pb-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{t('itemMaster.title', 'Nomenclature Registry')}</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">{company?.company_name} / OBJECT MASTER CONTROL</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/rates')}
              className="px-6 py-3 bg-white border-4 border-black text-black rounded-2xl hover:bg-slate-50 font-black uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95 flex items-center gap-3"
            >
              <DollarSign className="w-5 h-5" strokeWidth={3} />
              Set Price Gradients
            </button>
            <button
              onClick={() => { setEditingItem(null); setShowForm(true); }}
              className="flex items-center gap-3 px-8 py-3 bg-black text-white rounded-2xl hover:bg-slate-800 font-black uppercase tracking-widest text-xs shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all active:scale-95 border-2 border-black"
            >
              <Plus className="w-5 h-5" strokeWidth={3} />
              {t('itemMaster.addItem', 'Initialize Object')}
            </button>
          </div>
        </div>

        {/* Statistics Cards - Sleek Grayscale */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-900 group hover:bg-slate-900 transition-all duration-300">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest group-hover:text-slate-500 leading-none italic">{t('itemMaster.totalItems', 'Density Count')}</p>
            <p className="text-4xl font-black text-slate-900 mt-2 tracking-tighter group-hover:text-white transition-colors underline decoration-slate-100 decoration-4 underline-offset-8">{items.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-600 group hover:bg-slate-800 transition-all duration-300">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest group-hover:text-slate-500 leading-none italic">{t('itemMaster.activeItems', 'Active Streams')}</p>
            <p className="text-4xl font-black text-slate-900 mt-2 tracking-tighter group-hover:text-white transition-colors italic">{items.filter(i => i.is_active === 1).length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-400 group hover:bg-slate-700 transition-all duration-300">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest group-hover:text-slate-500 leading-none italic">{t('itemMaster.categories', 'Sector Isolation')}</p>
            <p className="text-4xl font-black text-slate-900 mt-2 tracking-tighter group-hover:text-white transition-colors italic">{categories.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-200 group hover:bg-slate-600 transition-all duration-300">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest group-hover:text-slate-500 leading-none italic">{t('itemMaster.inactiveItems', 'Offline Nodes')}</p>
            <p className="text-4xl font-black text-slate-700 mt-2 tracking-tighter group-hover:text-white transition-colors italic">{items.filter(i => i.is_active === 0).length}</p>
          </div>
        </div>

        {/* Filters - Industrial Control Zone */}
        <div className="bg-white p-6 rounded-[2rem] shadow-2xl border-2 border-slate-200 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 pointer-events-none opacity-50 shadow-inner"></div>
          
          <div className="relative group z-10">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-black transition-colors" strokeWidth={3} />
            <input
              type="text"
              placeholder={t('itemMaster.searchByName', 'ISOLATE OBJECT BY NAME, CODE OR BARCODE IDENTITY...')}
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-14 pr-6 py-4 border-2 border-slate-100 bg-slate-50 rounded-2xl outline-none focus:border-black focus:bg-white transition-all font-black uppercase text-xs h-14 shadow-inner"
            />
          </div>

          <div className="flex flex-wrap items-center gap-8 border-t-2 border-slate-50 pt-6">
            <div className="flex items-center gap-4">
              <Filter className="w-4 h-4 text-slate-900" strokeWidth={3}/>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">STATE_FILTER:</span>
            </div>
            <div className="flex bg-slate-50 p-1 rounded-xl shadow-inner border border-slate-100">
              {['all', 'active', 'inactive'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusFilter(status)}
                  className={`px-6 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${
                    selectedStatus === status
                      ? 'bg-black text-white shadow-xl italic'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t(`common.${status}`, status)}
                </button>
              ))}
            </div>

            {categories.length > 0 && (
              <div className="flex items-center gap-6 ml-auto pl-8 border-l-2 border-slate-50">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">SECTOR:</span>
                <div className="flex gap-2 max-w-[400px] overflow-x-auto scroller-industrial pb-1">
                  {['all', ...categories].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategoryFilter(cat)}
                      className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${
                        selectedCategory === cat
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-white text-slate-400 border border-slate-100 hover:border-black'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Registry Table - Professional Monochrome */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-100 overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-96 opacity-40">
               <Activity className="w-16 h-16 text-slate-900 mx-auto mb-6 animate-pulse" strokeWidth={1} />
               <p className="text-slate-500 font-black uppercase tracking-[0.4em] italic text-xs">SYNCHRONIZING OBJECT NODES...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-96 opacity-20">
              <Database className="w-24 h-24 mx-auto text-slate-200 mb-6" strokeWidth={1} />
              <p className="text-slate-500 font-black uppercase tracking-[0.5em] text-xs">ZERO DATA DENSITY DETECTED</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] italic border-b-4 border-black">
                    <th className="px-8 py-6 text-left border-r border-slate-800">{t('itemMaster.itemName', 'Descriptor')}</th>
                    <th className="px-8 py-6 text-left border-r border-slate-800">{t('itemMaster.itemCode', 'Object ID')}</th>
                    <th className="px-8 py-6 text-left border-r border-slate-800">{t('itemMaster.barcode', 'Optical ID')}</th>
                    <th className="px-8 py-6 text-left border-r border-slate-800">{t('itemMaster.unit', 'Format')}</th>
                    <th className="px-8 py-6 text-right border-r border-slate-800">{t('itemMaster.tax', 'Tariff %')}</th>
                    <th className="px-8 py-6 text-center border-r border-slate-800">{t('itemMaster.status', 'State')}</th>
                    <th className="px-8 py-6 text-right">{t('common.actions', 'Audit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-5 border-r border-slate-50">
                        <p className="font-black text-slate-900 uppercase tracking-tight text-[12px] group-hover:italic transition-all">{item.item_name}</p>
                        <p className="text-[9px] font-black text-slate-300 tracking-[0.2em] uppercase mt-0.5">{item.category || 'NO_CATEGORY'}</p>
                      </td>
                      <td className="px-8 py-5 border-r border-slate-50">
                        <span className="px-3 py-1 rounded-md text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200 shadow-inner">
                          {item.item_code}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-[10px] text-slate-400 font-mono italic border-r border-slate-50">{item.barcode || 'UNASSIGNED'}</td>
                      <td className="px-8 py-5 text-[10px] font-black text-slate-900 uppercase italic border-r border-slate-50">{item.unit}</td>
                      <td className="px-8 py-5 text-right font-black italic text-slate-900 text-xs border-r border-slate-50">
                        {(parseFloat(item.tax_percentage) || 0).toFixed(2)}%
                      </td>
                      <td className="px-8 py-5 text-center border-r border-slate-50">
                        <span className={`inline-flex px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${
                          item.is_active
                            ? 'bg-slate-900 text-white border-black shadow-lg italic'
                            : 'bg-white text-slate-300 border-slate-100 italic'
                        }`}>
                          {item.is_active ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-3 opacity-100 md:opacity-20 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => handleEdit(item)}
                            className="bg-black text-white p-2.5 rounded-xl transition-all active:scale-90 hover:shadow-xl shadow-black/20"
                            title={t('common.edit')}
                          >
                            <Edit2 size={16} strokeWidth={3} />
                          </button>
                          {item.is_active ? (
                            <button
                              onClick={() => handleDeactivate(item)}
                              className="bg-slate-100 text-slate-400 p-2.5 rounded-xl transition-all hover:bg-black hover:text-white"
                              title={t('itemMaster.deactivate')}
                            >
                              <XCircle size={16} strokeWidth={3} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(item)}
                              className="bg-slate-900 text-white p-2.5 rounded-xl transition-all animate-pulse"
                              title={t('itemMaster.activate')}
                            >
                              <CheckCircle size={16} strokeWidth={3} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Global Registry Summary Footer */}
        <div className="flex justify-between items-center text-slate-400 font-black uppercase tracking-widest text-[8px] italic pt-12 pb-10 border-t-2 border-slate-100">
           <div className="flex items-center gap-4">
              <span>MANIFEST_ID: {company?.id || 'NULL'}</span>
              <div className="w-1 h-1 bg-slate-100 rounded-full"></div>
              <span>REGISTRY_AUTH: VERIFIED_CORE</span>
              <div className="w-1 h-1 bg-slate-100 rounded-full"></div>
              <span className="opacity-60 text-[7px] tracking-[0.4em]">OBJECT_LOG_ENABLED</span>
           </div>
           <div>SYSTEM_CHRONO: {new Date().toISOString()}</div>
        </div>

      </div>

      {/* Form Modal Registration - HIGH FIDELITY */}
      {showForm && (
        <ItemForm
          item={editingItem}
          company={company}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Global CSS for Industrial Feel */}
      <style dangerouslySetInnerHTML={{__html: `
        .scroller-industrial::-webkit-scrollbar { width: 6px; height: 6px; }
        .scroller-industrial::-webkit-scrollbar-track { background: #f8fafc; }
        .scroller-industrial::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .scroller-industrial::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}
