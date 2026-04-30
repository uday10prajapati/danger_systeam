import React, { useState, useEffect } from 'react';
import {
  Plus, AlertCircle, Search, Filter, CheckCircle, Calendar,
  TrendingUp, X, Activity, Database, ShoppingCart,
  ChevronRight, Printer, Download, Layout, Package,
  ArrowRight, ShieldCheck, Box, RefreshCcw, FileText,
  Truck, Info
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import PurchaseForm from '../components/PurchaseForm';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';

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

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    applyFilters(purchases, term);
  };

  const handleDateChange = (field, value) => {
    const newRange = { ...dateRange, [field]: value };
    setDateRange(newRange);
    if (company) {
      fetchPurchases(company.id, newRange.startDate, newRange.endDate);
    }
  };

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

  const handleFormSubmit = (data) => {
    setShowForm(false);
    if (company) {
      fetchPurchases(company.id);
    }
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="text-center font-black uppercase tracking-widest text-slate-300">
          <p className="text-xs mb-6 italic tracking-[0.4em]">Initialising Procurement Bridge...</p>
          <div className="w-24 h-1 bg-slate-100 mx-auto overflow-hidden rounded-full relative">
            <div className="absolute top-0 left-0 w-1/2 h-full bg-blue-600 animate-[slide_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-8">

        <PageHeader
          eyebrow="Procurement Core / Live Inward Registry"
          eyebrowIcon={<Truck size={12} />}
          title="Inward Command Center"
          subtitle="Real-time inward monitoring and supplier settlement"
        >
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 px-6 py-3.5 rounded-lg text-xs font-black text-white uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            <Plus size={18} />
            Initialize Inward
          </button>
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 mt-8">
          {[
            { label: 'Manifest Count', val: purchases.length, icon: <FileText size={20} />, color: 'blue' },
            { label: 'Gross Inward Value', val: `₹${purchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: <TrendingUp size={20} />, color: 'emerald' },
            { label: 'Nomenclature Density', val: purchases.reduce((sum, p) => sum + (p.item_count || 0), 0), icon: <Package size={20} />, color: 'indigo' },
            { label: 'Verified Suppliers', val: new Set(purchases.map(p => p.supplier_account_id)).size, icon: <Layout size={20} />, color: 'slate' }
          ].map((shard, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4 group">
              <div className={`w-12 h-12 bg-${shard.color}-50 text-${shard.color}-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shrink-0`}>
                {shard.icon}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{shard.label}</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">{shard.val}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm mb-6 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[350px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Manifest Isolation Search</label>
            <div className="relative group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="ISOLATE MANIFEST BY INVOICE, SUPPLIER OR ACCOUNT CODE..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-bold uppercase text-[11px] tracking-widest"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <input type="date" value={dateRange.startDate} onChange={(e) => handleDateChange('startDate', e.target.value)} className="bg-transparent border-none outline-none px-4 py-2 text-xs font-bold text-slate-600 focus:text-blue-600 transition-all font-mono" />
            <ArrowRight size={14} className="text-slate-200" />
            <input type="date" value={dateRange.endDate} onChange={(e) => handleDateChange('endDate', e.target.value)} className="bg-transparent border-none outline-none px-4 py-2 text-xs font-bold text-slate-600 focus:text-blue-600 transition-all font-mono" />
          </div>

          <button onClick={() => fetchPurchases(company.id)} className="bg-blue-600 text-white px-8 py-3.5 rounded-lg font-bold uppercase tracking-widest text-[11px] hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center gap-2">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Sync Registry
          </button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          <TableHeading
            icon={<Database size={18} />}
            iconColor="indigo"
            title="Consolidated Inward Registry"
            subtitle="Audit-ready procurement document manifest"
            count={filteredPurchases.length}
          >
            <button className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Download size={18}/></button>
          </TableHeading>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                  <th className="px-8 py-5">Manifest ID</th>
                  <th className="px-8 py-5">Source Entity</th>
                  <th className="px-8 py-5 text-center">Density</th>
                  <th className="px-8 py-5 text-right">Net Yield</th>
                  <th className="px-8 py-5 text-center">Commit Date</th>
                  <th className="px-8 py-5 text-center">Isolation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-32 text-center">
                      <RefreshCcw className="animate-spin mx-auto mb-4 text-blue-500" size={40} />
                      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-300 italic">Synchronizing Data Stream...</p>
                    </td>
                  </tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-32 text-center">
                      <Layout className="text-slate-100 mx-auto mb-4" size={60} strokeWidth={1} />
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">Zero Manifests Isolated</p>
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase, idx) => (
                    <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <span className="text-sm font-bold text-slate-800 italic tracking-tight font-mono">#{purchase.invoice_no}</span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-bold text-slate-800 uppercase italic tracking-tight leading-none mb-1">{purchase.supplier_name}</p>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest font-mono">ACCOUNT: {purchase.account_code || 'UNTAGGED'}</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest">{purchase.item_count} NODES</span>
                      </td>
                      <td className="px-8 py-6 text-right font-black text-slate-900 italic text-base">₹{parseFloat(purchase.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-8 py-6 text-center">
                        <div className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-400 italic">
                          <Calendar size={12} />
                          {new Date(purchase.invoice_date).toLocaleDateString('en-GB')}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button onClick={() => viewPurchaseDetails(purchase.id)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-black uppercase tracking-widest text-[9px] hover:bg-blue-700 transition-all active:scale-95 shadow-md flex items-center gap-2 mx-auto">
                          Details <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showDetails && selectedPurchase && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden border border-white animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-blue-600 p-8 flex justify-between items-center relative overflow-hidden shrink-0">
               <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full -mr-24 -mt-24"></div>
               <div className="relative z-10 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-white"><Database size={24} /></div>
                  <div>
                    <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Nomenclature Inward</h2>
                    <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-1 italic">MANIFEST NODE: #{selectedPurchase.invoice_no}</p>
                  </div>
               </div>
               <div className="flex gap-2 relative z-10">
                  <button className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"><Printer size={20}/></button>
                  <button onClick={() => setShowDetails(false)} className="p-2.5 bg-white/10 hover:bg-rose-500/20 text-white rounded-lg transition-all"><X size={20}/></button>
               </div>
            </div>

            <div className="p-8 overflow-y-auto scroller-airy flex-1">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-6 rounded-lg border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Source Entity</p>
                    <p className="text-sm font-black text-slate-800 uppercase italic">{selectedPurchase.supplier_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Timeline Node</p>
                    <p className="text-sm font-black text-slate-800 uppercase italic">{new Date(selectedPurchase.invoice_date).toLocaleDateString('en-GB')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Authorized Agent</p>
                    <p className="text-sm font-black text-slate-800 uppercase italic">{selectedPurchase.created_by_name || 'SYSTEM_CORE'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Account Mapping</p>
                    <p className="text-sm font-black text-slate-800 uppercase italic">{selectedPurchase.supplier_account_id}</p>
                  </div>
               </div>

               <div className="mb-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-4">
                    <div className="w-8 h-0.5 bg-slate-200"></div> Nomenclature Payload
                  </h4>
                  <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest italic border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4">Inbound Node</th>
                          <th className="px-6 py-4 text-center">Density</th>
                          <th className="px-6 py-4 text-right">Inward Rate</th>
                          <th className="px-6 py-4 text-right">Net Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700 uppercase italic">
                        {(selectedPurchase.items || []).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="leading-none mb-1">{item.item_name}</p>
                              <p className="text-[8px] font-bold text-slate-300 font-mono">#{item.item_code}</p>
                            </td>
                            <td className="px-6 py-4 text-center">{item.quantity} {item.unit_name}</td>
                            <td className="px-6 py-4 text-right font-mono">₹{parseFloat(item.purchase_rate).toFixed(2)}</td>
                            <td className="px-6 py-4 text-right font-mono">₹{parseFloat(item.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>

               <div className="flex flex-col items-end mt-12 space-y-4">
                  <div className="bg-blue-600 p-8 rounded-lg text-white shadow-xl relative overflow-hidden w-full md:w-96 border-4 border-white">
                     <div className="absolute inset-0 bg-linear-to-br from-blue-600/10 to-transparent"></div>
                     <div className="flex justify-between items-end relative z-10">
                        <div>
                           <p className="text-[10px] font-bold text-blue-100 uppercase tracking-[0.4em] mb-3 italic">Fiscal Net Inward</p>
                           <h5 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Gross Posted</h5>
                        </div>
                        <p className="text-4xl font-black italic font-mono tracking-tighter">₹{parseFloat(selectedPurchase.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <PurchaseForm
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
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
