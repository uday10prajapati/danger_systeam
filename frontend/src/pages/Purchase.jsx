import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle, Search, Filter, CheckCircle, Calendar, TrendingUp, X, Activity, Database, ShoppingCart, ChevronRight, Printer, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import PurchaseForm from '../components/PurchaseForm';

export default function Purchase() {
  const { t } = useTranslation();
  const [company, setCompany] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Load company
  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const response = await axios.get('/api/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
        fetchPurchases(response.data.data.id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  // Fetch purchases
  const fetchPurchases = async (companyId, startDate, endDate) => {
    try {
      setLoading(true);
      const start = startDate || dateRange.startDate;
      const end = endDate || dateRange.endDate;
      
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/purchases`, {
        params: {
          startDate: start,
          endDate: end
        },
        headers: { 'x-company-id': companyId }
      });
      
      if (res.data.success) {
        setPurchases(res.data.data);
        applyFilters(res.data.data, searchTerm);
      }
    } catch (err) {
      console.error('Fetch purchases error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply search filter
  const applyFilters = (purchasesToFilter, search) => {
    let filtered = purchasesToFilter;

    if (search) {
      filtered = filtered.filter(purchase =>
        purchase.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
        purchase.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
        purchase.account_code?.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredPurchases(filtered);
  };

  // Handle search
  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    applyFilters(purchases, term);
  };

  // Handle date range change
  const handleDateChange = (field, value) => {
    const newRange = { ...dateRange, [field]: value };
    setDateRange(newRange);
    if (company) {
      fetchPurchases(company.id, newRange.startDate, newRange.endDate);
    }
  };

  // View purchase details
  const viewPurchaseDetails = async (purchaseId) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/purchases/${purchaseId}`, {
        headers: { 'x-company-id': company.id }
      });
      if (res.data.success) {
        setSelectedPurchase(res.data.data);
        setShowDetails(true);
      }
    } catch (err) {
      console.error('Fetch purchase details error:', err);
    }
  };

  // Handle form completion
  const handleFormSubmit = (data) => {
    setShowForm(false);
    if (company) {
      fetchPurchases(company.id);
    }
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="text-center p-12 bg-white rounded-2xl shadow-2xl border-4 border-black font-sans">
          <AlertCircle className="w-16 h-16 text-slate-900 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter italic">Identity Failure</h2>
          <p className="text-slate-500 mb-8 font-bold uppercase tracking-widest text-[10px]">Active company context not detected in secure session buffer.</p>
          <button
            onClick={() => window.location.href = '/company'}
            className="px-8 py-3 bg-black text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all active:scale-95"
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
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{t('purchase.purchase', 'Procurement Registry')}</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">{company?.company_name} / INWARD LOGISTICS STREAM</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-3 px-8 py-3 bg-black text-white rounded-2xl hover:bg-slate-800 font-black uppercase tracking-widest text-xs shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all active:scale-95 border-2 border-black"
          >
            <Plus className="w-5 h-5" strokeWidth={3} />
            {t('purchase.createNewPurchase', 'Initialize Inward')}
          </button>
        </div>

        {/* Statistics Cards - Sharp Industrial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-900 group hover:bg-slate-900 transition-all duration-300">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest group-hover:text-slate-500 leading-none italic">{t('purchase.totalPurchases', 'Manifest Count')}</p>
            <p className="text-4xl font-black text-slate-900 mt-2 tracking-tighter group-hover:text-white underline decoration-slate-100 decoration-4 underline-offset-8 transition-colors">{purchases.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-600 group hover:bg-slate-800 transition-all duration-300">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest group-hover:text-slate-500 leading-none italic">{t('purchase.totalAmount', 'Gross Inward Value')}</p>
            <p className="text-4xl font-black text-slate-900 mt-2 italic tracking-tighter group-hover:text-white transition-colors">
              ₹{purchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-400 group hover:bg-slate-700 transition-all duration-300">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest group-hover:text-slate-500 leading-none italic">{t('purchase.totalItems', 'Nomenclature Density')}</p>
            <p className="text-4xl font-black text-slate-900 mt-2 italic tracking-tighter group-hover:text-white transition-colors">
              {purchases.reduce((sum, p) => sum + (p.item_count || 0), 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-200 group hover:bg-slate-600 transition-all duration-300">
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest group-hover:text-slate-500 leading-none italic">Verified Suppliers</p>
            <p className="text-4xl font-black text-slate-700 mt-2 italic tracking-tighter group-hover:text-white transition-colors">
              {new Set(purchases.map(p => p.supplier_account_id)).size}
            </p>
          </div>
        </div>

        {/* Filters - High Density Industrial Control */}
        <div className="bg-white p-6 rounded-[2rem] shadow-2xl border-2 border-slate-200 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 pointer-events-none opacity-50 shadow-inner"></div>
          
          <div className="relative group z-10">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-black transition-colors" strokeWidth={3} />
            <input
              type="text"
              placeholder={t('purchase.searchByInvoiceOrSupplier', 'ISOLATE MANIFEST BY INVOICE, SUPPLIER OR ACCOUNT CODE...')}
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-14 pr-6 py-4 border-2 border-slate-100 bg-slate-50 rounded-2xl outline-none focus:border-black focus:bg-white transition-all font-black uppercase text-xs h-14 shadow-inner"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end border-t-2 border-slate-50 pt-8 z-10 relative">
            <div className="relative group">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 italic">FISCAL START POINT</span>
              <div className="relative">
                <Calendar className="absolute left-4 top-3.5 text-slate-200 group-focus-within:text-black transition-colors" size={16} strokeWidth={3} />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-xl outline-none focus:border-black focus:bg-white transition-all font-black text-xs h-12 uppercase"
                />
              </div>
            </div>
            <div className="relative group">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 italic">FISCAL END POINT</span>
              <div className="relative">
                <Calendar className="absolute left-4 top-3.5 text-slate-200 group-focus-within:text-black transition-colors" size={16} strokeWidth={3} />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-xl outline-none focus:border-black focus:bg-white transition-all font-black text-xs h-12 uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Global Registry Feed - Professional Monochrome Table */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border-2 border-slate-100 overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-96 opacity-40">
               <Activity className="w-16 h-16 text-slate-900 mx-auto mb-6 animate-pulse" strokeWidth={1} />
               <p className="text-slate-500 font-black uppercase tracking-[0.4em] italic text-xs">SYNCHRONIZING REPOSITORY LOGS...</p>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-96 opacity-20">
              <Database className="w-24 h-24 mx-auto text-slate-200 mb-6" strokeWidth={1} />
              <p className="text-slate-500 font-black uppercase tracking-[0.5em] text-xs">ZERO DATA DENSITY DETECTED</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] italic border-b-4 border-black">
                    <th className="px-8 py-6 text-left border-r border-slate-800">{t('purchase.invoiceNo', 'Manifest ID')}</th>
                    <th className="px-8 py-6 text-left border-r border-slate-800">{t('purchase.supplier', 'Source Entity')}</th>
                    <th className="px-8 py-6 text-center border-r border-slate-800">{t('purchase.items', 'Density')}</th>
                    <th className="px-8 py-6 text-right border-r border-slate-800">{t('purchase.amount', 'Net Yield')}</th>
                    <th className="px-8 py-6 text-center border-r border-slate-800">{t('purchase.invoiceDate', 'Commit Date')}</th>
                    <th className="px-8 py-6 text-center">{t('purchase.view', 'Isolation')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-5 font-black tracking-tighter text-[11px] uppercase text-slate-900 group-hover:underline underline-offset-4 decoration-slate-200">
                        {purchase.invoice_no}
                      </td>
                      <td className="px-8 py-5 border-r border-slate-50">
                        <p className="font-black text-slate-900 uppercase tracking-tight text-[11px]">{purchase.supplier_name}</p>
                        <p className="text-[9px] font-black text-slate-300 tracking-[0.2em] uppercase mt-0.5">{purchase.account_code || 'UNRECOGNIZED_ENTITY'}</p>
                      </td>
                      <td className="px-8 py-5 text-center border-r border-slate-50">
                        <span className="px-3 py-1 rounded-md text-[9px] font-black uppercase border-2 border-slate-100 bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                          {purchase.item_count} NODES
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right font-black italic text-slate-900 text-sm border-r border-slate-50 group-hover:translate-x-[-4px] transition-transform">
                        ₹{parseFloat(purchase.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-8 py-5 text-center border-r border-slate-50">
                        <span className="inline-flex items-center gap-2 font-black text-slate-400 text-[10px] italic">
                          <Calendar className="w-3 h-3" strokeWidth={3} />
                          {new Date(purchase.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <button
                          onClick={() => viewPurchaseDetails(purchase.id)}
                          className="px-6 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest bg-black text-white hover:bg-slate-800 transition-all active:scale-90 shadow-md flex items-center gap-2 mx-auto"
                        >
                          Details <ChevronRight size={14} strokeWidth={3} />
                        </button>
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
              <span className="opacity-60 text-[7px] tracking-[0.4em]">PROCUREMENT_LOG_ENABLED</span>
           </div>
           <div>SYSTEM_CHRONO: {new Date().toISOString()}</div>
        </div>

      </div>

      {/* Form Modal Registration */}
      {showForm && (
        <PurchaseForm
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Audit Modal - Isolation Grid */}
      {showDetails && selectedPurchase && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] max-w-4xl w-full max-h-[90vh] overflow-hidden border-4 border-black relative">
            
            <div className="bg-slate-900 border-b-4 border-black p-8 flex justify-between items-center sticky top-0 z-10">
               <div>
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1 italic">Isolation Detail</h2>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">Manifest #{selectedPurchase.invoice_no}</h3>
               </div>
               <button onClick={() => setShowDetails(false)} className="bg-white hover:bg-red-600 hover:text-white text-black p-3 rounded-2xl transition-all shadow-2xl active:scale-90">
                  <X size={24} strokeWidth={3} />
               </button>
            </div>

            <div className="p-12 overflow-y-auto max-h-[calc(90vh-140px)] space-y-12 scroller-industrial">
                {/* Dossier Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-b-2 border-slate-100 pb-12">
                   <div className="space-y-6">
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic leading-none">Entity Source</p>
                         <p className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedPurchase.supplier_name}</p>
                         <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">ID: {selectedPurchase.supplier_account_id}</p>
                      </div>
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic leading-none">Authorization Source</p>
                         <p className="text-sm font-black text-slate-600 uppercase tracking-tight italic flex items-center gap-2">
                           <Activity size={14} strokeWidth={3} /> {selectedPurchase.created_by_name || 'SYSTEM_CORE'}
                         </p>
                      </div>
                   </div>
                   <div className="space-y-6 md:text-right">
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic leading-none">Temporal Node</p>
                         <p className="text-2xl font-black text-slate-900 uppercase italic font-mono tracking-tighter">
                           {new Date(selectedPurchase.invoice_date).toLocaleDateString('en-GB')}
                         </p>
                      </div>
                      <div className="flex gap-4 justify-end">
                         <button className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:bg-black hover:text-white transition-all shadow-sm"><Printer size={20} strokeWidth={2.5}/></button>
                         <button className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:bg-black hover:text-white transition-all shadow-sm"><Download size={20} strokeWidth={2.5}/></button>
                      </div>
                   </div>
                </div>

                {/* Object Feed */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                     <div className="w-8 h-0.5 bg-slate-100"></div> NOMENCLATURE BREAKDOWN
                  </h4>
                  <div className="bg-slate-50 rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-inner">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-white border-b-2 border-slate-100 text-slate-400 font-black uppercase tracking-widest text-[8px]">
                          <th className="px-8 py-5 text-left uppercase">Object Identifier</th>
                          <th className="px-8 py-5 text-center uppercase">Density</th>
                          <th className="px-8 py-5 text-right uppercase">Tariff</th>
                          <th className="px-8 py-5 text-right uppercase">Yield</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedPurchase.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-white transition-colors">
                            <td className="px-8 py-5">
                              <p className="font-black text-slate-900 uppercase tracking-tight">{item.item_name}</p>
                              <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{item.item_code}</p>
                            </td>
                            <td className="px-8 py-5 text-center font-black text-slate-400 uppercase italic">
                              {item.quantity} <span className="text-[9px] opacity-40 ml-1">{item.unit_name}</span>
                            </td>
                            <td className="px-8 py-5 text-right font-black text-slate-900 italic font-mono">
                              ₹{parseFloat(item.purchase_rate).toFixed(2)}
                            </td>
                            <td className="px-8 py-5 text-right font-black text-slate-900 italic font-mono bg-white/50">
                              ₹{parseFloat(item.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Final Yield Consolidation */}
                  <div className="flex flex-col items-end mt-12 space-y-4">
                     <div className="flex justify-between w-64 border-b border-slate-100 pb-2">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Base Value</span>
                        <span className="text-sm font-black italic text-slate-500">₹{(parseFloat(selectedPurchase.total_amount) * 0.82).toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between w-64 border-b border-slate-100 pb-2">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Aggregate Tax (18%)</span>
                        <span className="text-sm font-black italic text-slate-500">₹{(parseFloat(selectedPurchase.total_amount) * 0.18).toFixed(2)}</span>
                     </div>
                     <div className="bg-black text-white p-8 rounded-[2rem] w-full md:w-80 shadow-[0_30px_60px_rgba(0,0,0,0.3)] border-4 border-white translate-x-4 rotate-[-1deg]">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2 italic">Gross Posted Liquid Value</p>
                        <p className="text-5xl font-black italic font-mono tracking-tighter">₹{parseFloat(selectedPurchase.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                     </div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Industrial Feel */}
      <style dangerouslySetInnerHTML={{__html: `
        .scroller-industrial::-webkit-scrollbar { width: 6px; }
        .scroller-industrial::-webkit-scrollbar-track { background: #f8fafc; }
        .scroller-industrial::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .scroller-industrial::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}
