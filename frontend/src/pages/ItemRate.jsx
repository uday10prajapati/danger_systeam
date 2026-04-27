import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, AlertCircle, Search, Filter,
  CheckCircle, XCircle, TrendingUp, Calendar,
  Activity, Database, History, ChevronRight, X,
  Shield, Download, IndianRupee, Tag, Layers,
  ArrowRight, MoreVertical, Power, Loader,
  Box, Scale
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import ItemRateForm from '../components/ItemRateForm';
import { useNavigate } from 'react-router-dom';

export default function ItemRate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [rateEntries, setRateEntries] = useState([]);
  const [rates, setRates] = useState([]);
  const [filteredRates, setFilteredRates] = useState([]);
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [priceHistory, setPriceHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadCompany();
  }, []);

  const mergeRatesWithItems = (rateRows = [], itemRows = []) => {
    const validRateRows = Array.isArray(rateRows) ? rateRows : [];
    const validItems = Array.isArray(itemRows) ? itemRows : [];
    const existingItemIds = new Set(validRateRows.map(r => Number(r.item_id)));

    const pendingRows = validItems
      .filter(item => Number(item.is_active) === 1 && !existingItemIds.has(Number(item.id)))
      .map(item => ({
        id: `pending-${item.id}`,
        company_id: item.company_id,
        item_id: item.id,
        item_name: item.item_name,
        item_code: item.item_code,
        barcode: item.barcode,
        purchase_rate: item.purchase_price || 0,
        sale_rate: item.sale_price || 0,
        mrp: null,
        effective_from: item.updated_at || item.created_at || new Date().toISOString(),
        is_active: 1,
        is_pending_rate: 1,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

    return [...validRateRows, ...pendingRows];
  };

  const loadCompany = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/company');
      if (res.data.success && res.data.data) {
        setCompany(res.data.data);
        fetchRates(res.data.data.id);
        fetchItems(res.data.data.id);
      }
    } catch (err) {
      console.error('Fetch company error:', err);
      setLoading(false);
    }
  };

  const fetchRates = async (companyId) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/item-rates/company/${companyId}`, {
        headers: { 'x-company-id': companyId }
      });
      if (res.data.success) {
        const fetchedRates = res.data.data || [];
        setRateEntries(fetchedRates);
        const mergedRates = mergeRatesWithItems(fetchedRates, items);
        setRates(mergedRates);
        applyFilters(mergedRates, searchTerm, selectedStatus);
      }
    } catch (err) {
      console.error('Fetch rates error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (companyId) => {
    try {
      const res = await axios.get(`/api/items/company/${companyId}`, {
        headers: { 'x-company-id': companyId }
      });
      if (res.data.success) {
        const fetchedItems = res.data.data || [];
        setItems(fetchedItems);
        const mergedRates = mergeRatesWithItems(rateEntries, fetchedItems);
        setRates(mergedRates);
        applyFilters(mergedRates, searchTerm, selectedStatus);
      }
    } catch (err) {
      console.error('Fetch items error:', err);
    }
  };

  const fetchPriceHistory = async (itemId) => {
    try {
      const res = await axios.get(`/api/item-rates/history/${itemId}`, {
        headers: { 'x-company-id': company.id }
      });
      if (res.data.success) {
        setPriceHistory(res.data.data);
        setShowHistory(true);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    }
  };

  const applyFilters = (ratesToFilter, search, status) => {
    let filtered = ratesToFilter;
    if (search) {
      filtered = filtered.filter(rate =>
        (rate.item_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (rate.item_code || '').toLowerCase().includes(search.toLowerCase()) ||
        (rate.barcode && String(rate.barcode).includes(search))
      );
    }
    if (status === 'active') filtered = filtered.filter(rate => Number(rate.is_active) === 1 || Number(rate.is_pending_rate) === 1);
    else if (status === 'inactive') filtered = filtered.filter(rate => Number(rate.is_active) === 0 && Number(rate.is_pending_rate) !== 1);
    setFilteredRates(filtered);
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    applyFilters(rates, term, selectedStatus);
  };

  const handleStatusFilter = (status) => {
    setSelectedStatus(status);
    applyFilters(rates, searchTerm, status);
  };

  const handleEdit = (rate) => {
    if (rate.is_pending_rate) {
      setEditingRate(null);
      setShowForm(true);
      return;
    }
    setEditingRate(rate);
    setShowForm(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingRate) {
        await axios.put(`/api/item-rates/${editingRate.id}`, formData, {
          headers: { 'x-company-id': company.id }
        });
      } else {
        await axios.post('/api/item-rates', formData, {
          headers: { 'x-company-id': company.id }
        });
      }
      setShowForm(false);
      setEditingRate(null);
      fetchRates(company.id);
    } catch (err) {
      console.error('Form submit error:', err);
    }
  };

  if (!company && !loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-12 text-center max-w-md animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6"><Database size={40} /></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Registry Offline</h2>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">The price configuration sharding is unauthorized. Please initialize company context.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/company')} className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 text-sm uppercase tracking-widest leading-none">Setup Company Profile</button>
            <button onClick={loadCompany} className="w-full py-4 bg-slate-50 text-slate-600 font-bold rounded-2xl transition-all text-sm uppercase tracking-widest leading-none">Retry Auth</button>
          </div>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => { setShowForm(false); setEditingRate(null); }}
            className="group mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-800 font-bold text-sm transition-colors"
          >
            <div className="p-2 bg-white rounded-2xl border border-slate-200 group-hover:border-slate-800 transition-all"><X size={16} /></div>
            Back to Tariff Registry
          </button>
          <ItemRateForm
            rate={editingRate}
            items={items}
            company={company}
            onSubmit={handleFormSubmit}
            onClose={() => { setShowForm(false); setEditingRate(null); }}
          />
        </div>
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
              <span>{t('modules.management', 'Management')} / Tariff Registry</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('itemRate.title', 'Price Gradients')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-white rounded-2xl px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
              <Search size={18} className="text-slate-400 group-focus-within:text-blue-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search by SKU, Barcode or ID..."
                className="bg-transparent border-none outline-none text-sm text-slate-600 w-64 placeholder:text-slate-300 font-medium"
              />
            </div>
            <button
              onClick={() => { setEditingRate(null); setShowForm(true); }}
              className="flex items-center gap-2 bg-blue-600 px-6 py-3.5 rounded-2xl text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
            >
              <Plus size={20} />
              Initialize Tariff
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Tariffs</p>
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Layers size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{rates.length}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-emerald-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified Nodes</p>
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><CheckCircle size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{rateEntries.filter(r => Number(r.is_active) === 1).length}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-violet-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Inventory</p>
              <div className="p-2 bg-violet-50 rounded-xl text-violet-600"><Box size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{new Set(rates.filter(r => r.is_active === 1).map(r => r.item_id)).size}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-amber-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update Frequency</p>
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><Activity size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">NOD-7</p>
          </div>
        </div>

        {/* Registry Card */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Scale size={18} /></div>
              <h2 className="text-lg font-bold text-slate-800">Tariff Manifest Registry</h2>
            </div>
            <div className="flex items-center p-1 bg-slate-50 rounded-xl">
              {['active', 'inactive', 'all'].map(status => (
                <button
                  key={status}
                  onClick={() => handleStatusFilter(status)}
                  className={`px-5 py-1.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${selectedStatus === status ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-24 text-center">
              <Loader className="w-12 h-12 text-blue-100 animate-spin mb-4" />
              <p className="text-slate-300 font-bold uppercase tracking-[0.2em] text-[10px]">Processing Gradient Shards...</p>
            </div>
          ) : filteredRates.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-24 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-6"><TrendingUp size={40} /></div>
              <h3 className="text-lg font-bold text-slate-400 mb-2">Zero datasets isolated</h3>
              <p className="text-slate-300 text-sm max-w-xs mx-auto mb-8 font-medium">Verify your search context or initialize a new tariff record.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F8FAFC]">
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Nomenclature</th>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">System ID</th>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Yield Index</th>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Timeline</th>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Audit Status</th>
                    <th className="px-10 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRates.map(rate => (
                    <tr key={rate.id} className="group hover:bg-blue-50/20 transition-all duration-300">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-sm group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                            {(rate.item_name || '?')[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors uppercase">{rate.item_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{rate.is_pending_rate ? 'Pending rate setup' : `Procurement: ₹${parseFloat(rate.purchase_rate || 0).toFixed(2)}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <span className="text-[10px] font-black text-slate-600 font-mono tracking-tighter italic uppercase">{rate.item_code}</span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-black text-slate-800 italic">₹{parseFloat(rate.sale_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Margin: {parseFloat(rate.purchase_rate || 0) > 0 ? ((parseFloat(rate.sale_rate || 0) - parseFloat(rate.purchase_rate || 0)) / parseFloat(rate.purchase_rate || 0) * 100).toFixed(1) : '0'}%</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span className="text-[10px] font-bold text-slate-400 font-mono italic">{new Date(rate.effective_from).toLocaleDateString('en-GB')}</span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${rate.is_pending_rate ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-100' : (rate.is_active ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100')
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${rate.is_pending_rate ? 'bg-amber-500 animate-pulse' : (rate.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500')}`} />
                            {rate.is_pending_rate ? 'Pending' : (rate.is_active ? 'Verified' : 'Redacted')}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                          {!rate.is_pending_rate && <button onClick={() => fetchPriceHistory(rate.item_id)} className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-lg rounded-xl transition-all"><History size={16} /></button>}
                          <button onClick={() => handleEdit(rate)} className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-lg rounded-xl transition-all"><Edit2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* History Modal - Airy Style */}
      {showHistory && priceHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg ring-4 ring-indigo-500/5"><History size={20} /></div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Chronological Audit</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Historical Ledger Gradients</p>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-8 max-h-[500px] overflow-y-auto space-y-4">
              {priceHistory.map((h, i) => (
                <div key={i} className="group relative bg-[#F8FAFC] p-6 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-tighter italic">{new Date(h.effective_from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-2xl ${h.status === 'Active' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-300 border border-slate-100'}`}>{h.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Release Yield</p>
                      <p className="text-lg font-black text-slate-900">₹{parseFloat(h.sale_rate).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Procurement</p>
                      <p className="text-sm font-bold text-slate-500">₹{parseFloat(h.purchase_rate).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setShowHistory(false)} className="px-10 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all uppercase text-[10px] tracking-[0.2em] shadow-xl">Close Audit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
