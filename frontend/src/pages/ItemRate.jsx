import React, { useState, useEffect } from 'react';
import { Plus, Edit2, AlertCircle, Search, Filter, CheckCircle, XCircle, TrendingUp, Calendar, Activity, Database, History, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import ItemRateForm from '../components/ItemRateForm';

export default function ItemRate() {
  const { t } = useTranslation();
  const [company, setCompany] = useState(null);
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
        setRates(res.data.data);
        applyFilters(res.data.data, searchTerm, selectedStatus);
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
        setItems(res.data.data);
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
        rate.item_name.toLowerCase().includes(search.toLowerCase()) ||
        rate.item_code.toLowerCase().includes(search.toLowerCase()) ||
        (rate.barcode && rate.barcode.includes(search))
      );
    }

    if (status === 'active') {
      filtered = filtered.filter(rate => rate.is_active === 1);
    } else if (status === 'inactive') {
      filtered = filtered.filter(rate => rate.is_active === 0);
    }

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
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center font-sans">
        <div className="text-center p-12 bg-white rounded-2xl shadow-2xl max-w-md border-4 border-black">
          <Database className="w-16 h-16 text-slate-900 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter italic">Identity Verification Required</h2>
          <p className="text-slate-500 mb-8 font-bold uppercase tracking-widest text-[10px]">Active company context not detected in secure session buffer.</p>
          <button
            onClick={() => window.location.href = '/company'}
            className="px-10 py-4 bg-black text-white rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl active:scale-95"
          >
            {t('common.goToCompanySetup')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header - Industrial Monochrome */}
        <div className="flex justify-between items-end border-b-4 border-black pb-4 print:hidden">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{t('itemRate.title', 'Price Control Panel')}</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">{company?.company_name} / RATE CONFIGURATION REGISTRY</p>
          </div>
          <button
            onClick={() => {
              setEditingRate(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-lg hover:bg-slate-800 font-black shadow-2xl transition-all active:scale-95 uppercase tracking-widest text-xs"
          >
            <Plus className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
            {t('itemRate.addRate', 'Initialize New Tariff')}
          </button>
        </div>

        {/* Stats Cards - Sharp Grayscale */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-900 group hover:bg-slate-900 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">Global Tariff Count</p>
                <p className="text-4xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white underline decoration-slate-100 decoration-4 underline-offset-8">
                  {rates.length}
                </p>
              </div>
              <Activity size={24} className="text-slate-200 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-500 group hover:bg-slate-800 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">Verified Active Rates</p>
                <p className="text-4xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white">
                  {rates.filter(r => r.is_active === 1).length}
                </p>
              </div>
              <CheckCircle size={24} className="text-slate-200 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-300 group hover:bg-slate-700 transition-all duration-300">
             <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">Monetized Nomenclature</p>
                <p className="text-4xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white italic">
                  {new Set(rates.filter(r => r.is_active === 1).map(r => r.item_id)).size}
                </p>
              </div>
              <TrendingUp size={24} className="text-slate-200 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        {/* Global Toolbar - Unified Grayscale */}
        <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[350px]">
             <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nomenclature / Barcode Search</span>
            <div className="relative group">
              <Search className="absolute left-4 top-3 text-slate-300 group-focus-within:text-black transition-colors" size={18} strokeWidth={3} />
              <input
                type="text"
                placeholder="SEARCH BY ITEM NAME, CODE OR SYSTEM BARCODE..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-12 pr-4 py-2.5 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-black transition-all bg-slate-50 font-black uppercase text-xs h-11"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
             <span className="self-center text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Audit Vector:</span>
            {['all', 'active', 'inactive'].map(status => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedStatus === status
                    ? 'bg-black text-white shadow-lg'
                    : 'bg-slate-50 text-slate-400 hover:text-black border-2 border-slate-100'
                }`}
              >
                {t(`itemRate.${status}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Rates Ledger Grid - High Contrast Industrial */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96">
               <div className="w-12 h-12 border-4 border-slate-100 border-t-black rounded-full animate-spin mb-4"></div>
               <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">Processing Tariff Stream...</p>
            </div>
          ) : filteredRates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 opacity-40">
              <TrendingUp className="w-20 h-20 text-slate-100 mb-6" strokeWidth={1} />
              <p className="font-black text-slate-300 uppercase tracking-[0.4em] italic text-sm">{t('itemRate.noRates', 'No Tariff Data Logged')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest italic">
                  <tr>
                    <th className="px-6 py-5 text-left border-r border-slate-800">{t('itemRate.itemName', 'Nomenclature')}</th>
                    <th className="px-6 py-5 text-left border-r border-slate-800">{t('itemRate.itemCode', 'System ID')}</th>
                    <th className="px-6 py-5 text-right border-r border-slate-800 italic">Procure Rate</th>
                    <th className="px-6 py-5 text-right border-r border-slate-800 bg-black">Final Yield</th>
                    <th className="px-6 py-5 text-center border-r border-slate-800">Margin Gradient</th>
                    <th className="px-6 py-5 text-right border-r border-slate-800">M.R.P. Cap</th>
                    <th className="px-6 py-5 text-center border-r border-slate-800">Effective Timeline</th>
                    <th className="px-6 py-5 text-center border-r border-slate-800">Audit Status</th>
                    <th className="px-6 py-5 text-center">{t('common.actions', 'Control')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRates.map(rate => {
                    const margin = rate.purchase_rate > 0 ? ((rate.sale_rate - rate.purchase_rate) / rate.purchase_rate * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={rate.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 font-black text-slate-900 uppercase tracking-tight">{rate.item_name}</td>
                        <td className="px-6 py-4 text-[10px] text-slate-400 font-black uppercase tracking-widest font-mono">{rate.item_code}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-400 italic">₹{parseFloat(rate.purchase_rate).toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-black text-[13px] bg-slate-50 group-hover:bg-slate-100 transition-colors italic">₹{parseFloat(rate.sale_rate).toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border-2 ${
                            parseFloat(margin) > 30 ? 'bg-black text-white border-black' :
                            parseFloat(margin) > 15 ? 'bg-slate-100 text-slate-900 border-slate-200' :
                            'bg-white text-slate-400 border-slate-100'
                          }`}>
                            {margin}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-400 font-bold opacity-50">₹{rate.mrp ? parseFloat(rate.mrp).toFixed(2) : '-'}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="flex items-center justify-center gap-1.5 font-mono font-bold text-slate-500 text-[10px]">
                            <Calendar className="w-3.5 h-3.5 opacity-40 shrink-0" />
                            {new Date(rate.effective_from).toLocaleDateString('en-GB')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {rate.is_active ? (
                            <div className="flex items-center justify-center gap-1 text-[9px] font-black text-black uppercase tracking-widest underline decoration-black decoration-2 underline-offset-4">
                              <CheckCircle className="w-3 h-3" />
                              <span>{t('itemRate.active', 'Verified')}</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1 text-[9px] font-black text-slate-300 uppercase tracking-widest">
                              <XCircle className="w-3 h-3" />
                              <span>{t('itemRate.inactive', 'Redacted')}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                           <div className="flex items-center justify-center gap-2">
                             <button
                                onClick={() => fetchPriceHistory(rate.item_id)}
                                className="p-2 bg-slate-100 hover:bg-black hover:text-white rounded-lg transition-all active:scale-90 border border-slate-200"
                                title="Price History"
                              >
                                <History size={16} strokeWidth={2.5} />
                              </button>
                              <button
                                onClick={() => handleEdit(rate)}
                                className="p-2 bg-slate-100 hover:bg-black hover:text-white rounded-lg transition-all active:scale-90 border border-slate-200"
                                title="Edit Rate"
                              >
                                <Edit2 size={16} strokeWidth={2.5} />
                              </button>
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal - Industrial Control Interface */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-2xl max-h-screen overflow-hidden flex flex-col border border-slate-700">
             <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase italic">{editingRate ? 'Modify Tariff Manifest' : 'Initialize New Tariff'}</h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Registry Injection Pipeline</p>
                </div>
                <button 
                  onClick={() => { setShowForm(false); setEditingRate(null); }} 
                  className="bg-slate-800 hover:bg-red-600 text-white p-2 rounded-xl transition-all active:scale-90"
                >
                  <X size={20} strokeWidth={3} />
                </button>
             </div>
             <div className="overflow-y-auto flex-1 bg-white p-2">
              <ItemRateForm
                rate={editingRate}
                items={items}
                company={company}
                onSubmit={handleFormSubmit}
                onClose={() => {
                  setShowForm(false);
                  setEditingRate(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Price History Modal - Industrial Audit View */}
      {showHistory && priceHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-700">
            <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 z-10">
               <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase italic">Chronological Tariff Audit</h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Historical Pricing Vectors</p>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="bg-slate-800 hover:bg-red-600 text-white p-2 rounded-xl transition-all active:scale-90"
                >
                  <X size={20} strokeWidth={3} />
                </button>
            </div>
            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              {priceHistory.map((history, idx) => (
                <div key={idx} className="group relative bg-white hover:bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 hover:border-black transition-all">
                  <div className="flex justify-between items-center mb-6">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-900 rounded-lg text-white">
                           <Calendar size={18} strokeWidth={3} />
                        </div>
                        <span className="font-black text-slate-900 uppercase italic tracking-tighter text-lg">
                           {new Date(history.effective_from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                     </div>
                     <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-md border-2 ${
                        history.status === 'Active' 
                          ? 'bg-black text-white border-black' 
                          : 'bg-white text-slate-300 border-slate-100'
                     }`}>
                        {history.status}
                     </span>
                  </div>
                  <div className="grid grid-cols-3 gap-8">
                    <div>
                      <p className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-1">Procuration</p>
                      <p className="text-xl font-black italic tracking-tighter text-slate-500 font-mono">₹{parseFloat(history.purchase_rate).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-1">Yield Release</p>
                      <p className="text-xl font-black italic tracking-tighter text-slate-900 font-mono">₹{parseFloat(history.sale_rate).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-1">Margin Index</p>
                      <p className={`text-xl font-black italic tracking-tighter font-mono ${parseFloat(history.sale_rate) > parseFloat(history.purchase_rate) ? 'text-black' : 'text-red-700'}`}>
                        {history.purchase_rate > 0 ? ((history.sale_rate - history.purchase_rate) / history.purchase_rate * 100).toFixed(1) : '0.0'}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 bg-slate-900 border-t border-black flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 font-black uppercase text-[9px] tracking-widest">
                 <div className="w-2 h-2 bg-slate-700 rounded-full animate-pulse"></div>
                 Historical dataset verified
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="px-10 py-3 bg-white text-black rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-50 transition-all active:scale-95 shadow-xl"
              >
                Terminate Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Registry Summary Footer */}
      <div className="flex justify-between items-center text-slate-400 font-black uppercase tracking-widest text-[9px] border-t-2 border-slate-100 pt-6 mt-12 pb-10">
        <p className="italic underline decoration-slate-200 underline-offset-8 uppercase tracking-[0.3em] opacity-60">TARIFF RECORD SCAN COMPLETE: {filteredRates.length} NODES ISOLATED</p>
        <div className="flex gap-4">
           <span>SYS_AUTH_ID: {company?.id}</span>
           <span className="text-slate-200">•</span>
           <span>TIMESTAMP: {new Date().toISOString()}</span>
        </div>
      </div>

    </div>
  );
}
