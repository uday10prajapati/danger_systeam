import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, AlertCircle, Search, Filter,
  CheckCircle, XCircle, TrendingUp, Calendar,
  Activity, Database, History, ChevronRight, X,
  Shield, Download, IndianRupee, Tag, Layers,
  ArrowRight, MoreVertical, Power, Loader, RefreshCcw,
  Box, Scale, Info
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import ItemRateForm from '../components/ItemRateForm';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';

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

  if (!company) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="text-center font-black uppercase tracking-widest text-slate-300">
          <p className="text-xs mb-6 italic tracking-[0.4em]">Initialising Tariff Vectors...</p>
          <div className="w-24 h-1 bg-slate-100 mx-auto overflow-hidden rounded-full relative">
            <div className="absolute top-0 left-0 w-1/2 h-full bg-blue-600 animate-[slide_1.5s_infinite]"></div>
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
            <div className="p-2 bg-white rounded-lg border border-slate-200 group-hover:border-slate-800 transition-all"><X size={16} /></div>
            Back to Tariff Manifest
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

        <PageHeader
          eyebrow="Management / Tariff Registry"
          eyebrowIcon={<Shield size={12} />}
          title="Price Gradient Master"
          subtitle="Real-time procurement and sale yield configuration"
        >
          <button
            onClick={() => { setEditingRate(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-blue-600 px-6 py-3.5 rounded-lg text-xs font-black text-white uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            <Plus size={18} />
            Initialize Tariff
          </button>
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Global Tariffs', val: rates.length, icon: <Layers size={20} />, color: 'blue' },
            { label: 'Verified Nodes', val: rateEntries.filter(r => Number(r.is_active) === 1).length, icon: <CheckCircle size={20} />, color: 'emerald' },
            { label: 'Active Inventory', val: new Set(rates.filter(r => r.is_active === 1).map(r => r.item_id)).size, icon: <Box size={20} />, color: 'indigo' },
            { label: 'Audit Frequency', val: 'NOD-7', icon: <Activity size={20} />, color: 'slate' }
          ].map((segment, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4 group">
              <div className={`w-12 h-12 bg-${segment.color}-50 text-${segment.color}-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0`}>
                {segment.icon}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{segment.label}</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">{segment.val}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm mb-4 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[350px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Nomenclature Search Vector</label>
            <div className="relative group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="SEARCH BY SKU, BARCODE OR NOMENCLATURE ID..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-bold uppercase text-[11px] tracking-widest"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-lg border border-slate-200 shadow-sm">
            {['active', 'inactive', 'all'].map(status => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedStatus === status ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>

          <button onClick={() => fetchRates(company.id)} className="bg-blue-600 text-white px-8 py-3.5 rounded-lg font-bold uppercase tracking-widest text-[11px] hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center gap-2">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Sync Vectors
          </button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          <TableHeading
            icon={<Scale size={18} />}
            iconColor="blue"
            title="Tariff Manifest"
            subtitle="Consolidated yield gradients for inventory nodes"
            count={filteredRates.length}
          >
            <button className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Download size={18} /></button>
          </TableHeading>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                  <th className="px-8 py-5">Nomenclature</th>
                  <th className="px-8 py-5">System ID</th>
                  <th className="px-8 py-5 text-right">Yield Index</th>
                  <th className="px-8 py-5 text-center">Timeline</th>
                  <th className="px-8 py-5 text-center">Audit Status</th>
                  <th className="px-8 py-5 text-center">Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-32 text-center">
                      <RefreshCcw className="animate-spin mx-auto mb-4 text-blue-500" size={40} />
                      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-300 italic">Synchronizing Tariff Streams...</p>
                    </td>
                  </tr>
                ) : filteredRates.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-32 text-center">
                      <Tag className="text-slate-100 mx-auto mb-4" size={60} strokeWidth={1} />
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">Zero Tariff Nodes Isolated</p>
                    </td>
                  </tr>
                ) : (
                  filteredRates.map((rate, idx) => (
                    <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-black text-sm group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                            {(rate.item_name || '?')[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 uppercase italic tracking-tight leading-none mb-1">{rate.item_name}</p>
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{rate.is_pending_rate ? 'PENDING_CONFIG' : `INWARD: ₹${parseFloat(rate.purchase_rate || 0).toFixed(2)}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-black text-slate-800 font-mono italic uppercase tracking-tighter">{rate.item_code}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-base font-black text-slate-900 italic">₹{parseFloat(rate.sale_rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Yield: {parseFloat(rate.purchase_rate || 0) > 0 ? ((parseFloat(rate.sale_rate || 0) - parseFloat(rate.purchase_rate || 0)) / parseFloat(rate.purchase_rate || 0) * 100).toFixed(1) : '0'}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center font-mono text-slate-400 text-xs italic">{new Date(rate.effective_from).toLocaleDateString('en-GB')}</td>
                      <td className="px-8 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2 border ${rate.is_pending_rate ? 'bg-amber-50 text-amber-600 border-amber-100' : (rate.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100')}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${rate.is_pending_rate ? 'bg-amber-600 animate-pulse' : (rate.is_active ? 'bg-emerald-600' : 'bg-rose-600')}`}></div>
                          {rate.is_pending_rate ? 'Pending' : (rate.is_active ? 'Verified' : 'Redacted')}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          {!rate.is_pending_rate && (
                            <button onClick={() => fetchPriceHistory(rate.item_id)} className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm">
                              <History size={16} />
                            </button>
                          )}
                          <button onClick={() => handleEdit(rate)} className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm active:scale-95">
                            <Edit2 size={16} />
                          </button>
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

      {showHistory && priceHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden border border-white animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-8 flex justify-between items-center relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/10 rounded-full -mr-24 -mt-24"></div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-white"><History size={24} /></div>
                <div>
                  <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Chronological Audit</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">HISTORICAL PRICE GRADIENTS</p>
                </div>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-2.5 bg-white/10 hover:bg-rose-500/20 text-white rounded-lg transition-all relative z-10"><X size={20} /></button>
            </div>

            <div className="p-8 overflow-y-auto scroller-airy flex-1 space-y-4">
              {priceHistory.map((h, i) => (
                <div key={i} className="bg-slate-50 p-6 rounded-lg border border-slate-100 hover:bg-white hover:border-indigo-200 transition-all group">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                    <span className="text-xs font-black text-slate-900 uppercase italic font-mono tracking-tighter">{new Date(h.effective_from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg ${h.status === 'Active' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-300 border border-slate-100'}`}>{h.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Release Yield</p>
                      <p className="text-lg font-black text-slate-900 italic">₹{parseFloat(h.sale_rate).toFixed(2)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Inward Value</p>
                      <p className="text-sm font-bold text-slate-500 italic">₹{parseFloat(h.purchase_rate).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-end">
              <button onClick={() => setShowHistory(false)} className="px-8 py-3 bg-blue-600 text-white rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl active:scale-95">Close Audit</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .scroller-airy::-webkit-scrollbar { width: 4px; }
        .scroller-airy::-webkit-scrollbar-track { background: transparent; }
        .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .scroller-airy:hover::-webkit-scrollbar-thumb { background: #3b82f6; }
      `}} />
    </div>
  );
}
