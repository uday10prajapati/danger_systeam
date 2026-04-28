import React, { useState, useEffect } from 'react';
import {
  Plus, Eye, Search, Printer, X, RefreshCcw,
  Calendar, User, FileText, ArrowRight,
  ShieldCheck, TrendingUp, ShoppingBag,
  Filter, ChevronRight, Layout, Activity,
  Database, Package, ShoppingCart
} from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import SaleReturnForm from '../components/SaleReturnForm';

export default function SaleReturn() {
  const { t } = useTranslation();
  const [returns, setReturns] = useState([]);
  const [filteredReturns, setFilteredReturns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [company, setCompany] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    if (company?.id) {
      fetchReturns();
    }
  }, [company, dateRange]);

  const loadCompany = async () => {
    try {
      const response = await axios.get('/api/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load company', error);
    }
  };

  const fetchReturns = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/sale-returns?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setReturns(response.data.data);
        applyFilters(response.data.data);
      }
    } catch (error) {
      console.error('Fetch returns error:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (returnsData = returns) => {
    const filtered = returnsData.filter(ret =>
      ret.return_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ret.customer_name && ret.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredReturns(filtered);
  };

  const viewReturnDetails = async (returnId) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/sale-returns/${returnId}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setSelectedReturn(response.data.data);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Get return details error:', error);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    fetchReturns();
  };

  const calculateStats = () => {
    const totalReturns = filteredReturns.length;
    const totalAmount = filteredReturns.reduce((sum, r) => sum + (parseFloat(r.total_return_amount) || 0), 0);
    const totalItems = filteredReturns.reduce((sum, r) => sum + (parseInt(r.item_count) || 0), 0);
    const uniqueCustomers = new Set(filteredReturns.map(r => r.customer_name)).size;

    return { totalReturns, totalAmount, totalItems, uniqueCustomers };
  };

  const stats = calculateStats();

  useEffect(() => {
    applyFilters();
  }, [searchTerm]);

  if (!company) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="text-center font-black uppercase tracking-widest text-slate-300">
          <p className="text-xs mb-6 italic tracking-[0.4em]">Initializing Core Ledger...</p>
          <div className="w-24 h-1 bg-slate-100 mx-auto overflow-hidden rounded-full relative">
            <div className="absolute top-0 left-0 w-1/2 h-full bg-blue-600 animate-[slide_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-8 animate-in fade-in duration-500">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setShowForm(false)}
            className="group mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-800 font-bold text-sm transition-colors"
          >
            <div className="p-2 bg-white rounded-lg border border-slate-200 group-hover:border-slate-800 transition-all">
              <X size={16} />
            </div>
            Back to Ledger Master
          </button>
          <SaleReturnForm
            onClose={() => setShowForm(false)}
            onSuccess={handleFormSuccess}
            company={company}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-8">

        {/* Header Section - Same as UserMaster */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-6">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
              <RefreshCcw size={12} />
              <span>{t('modules.inventory', 'Stock Control')} / Sale Return Registry</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Reversal Audit Ledger</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-white rounded-lg px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
              <Search size={18} className="text-slate-400 group-focus-within:text-blue-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Identify Return Shard..."
                className="bg-transparent border-none outline-none text-sm text-slate-600 w-64 placeholder:text-slate-300 font-medium"
              />
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 px-6 py-3.5 rounded-lg text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
            >
              <Plus size={20} />
              Issue Credit Note
            </button>
          </div>
        </div>

        {/* Stats Grid - Same as UserMaster */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Shards</p>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><FileText size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stats.totalReturns}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Value</p>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><TrendingUp size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">₹{stats.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Units Reverted</p>
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Package size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-indigo-600">{stats.totalItems}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm group hover:border-violet-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entities Effected</p>
              <div className="p-2 bg-violet-50 rounded-lg text-violet-600"><User size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-violet-600">{stats.uniqueCustomers}</p>
          </div>
        </div>

        {/* Action Bar / Filtering */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          <div className="p-8 pb-4 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Temporal Start</label>
                <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all" />
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Temporal End</label>
                <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all" />
              </div>
              <button onClick={fetchReturns} className="p-2.5 mt-4 bg-slate-900 text-white rounded-lg hover:bg-black transition-all active:scale-90 shadow-lg"><RefreshCcw size={16} /></button>
            </div>
            <div className="flex gap-1.5 p-1 bg-slate-50 rounded-lg border border-slate-100">
              <button className="px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all bg-white text-blue-600 shadow-sm">All Records</button>
              <button className="px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all text-slate-400 hover:text-slate-600">Pending Review</button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  {[
                    'Document ID', 'Party Identity', 'SKU Load', 'Reversal Value', 'Settlement', 'Audit Date', 'Action'
                  ].map((head) => (
                    <th key={head} className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-10 py-24 text-center">
                      <Loader className="animate-spin text-blue-100 mx-auto" size={40} />
                      <p className="mt-4 text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">Syncing Ledger Shards...</p>
                    </td>
                  </tr>
                ) : filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-10 py-24 text-center">
                      <Database className="text-slate-100 mx-auto" size={48} strokeWidth={1} />
                      <p className="mt-4 text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">No Reversal Records Logged</p>
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((ret) => (
                    <tr key={ret.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-10 py-6">
                        <span className="font-bold text-slate-800 text-sm">{ret.return_no}</span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px] uppercase">
                            {ret.customer_name ? ret.customer_name.charAt(0) : 'W'}
                          </div>
                          <span className="text-sm font-bold text-slate-600">{ret.customer_name || 'WALK-IN_ENTITY'}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span className="text-[10px] font-bold bg-slate-50 text-slate-400 px-3 py-1 rounded-lg border border-slate-100">
                          {ret.item_count} SKU
                        </span>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <span className="text-sm font-black text-slate-800 italic">
                          ₹{parseFloat(ret.total_return_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${ret.refund_type === 'cash' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                          {ret.refund_type}
                        </span>
                      </td>
                      <td className="px-10 py-6 text-[11px] font-bold text-slate-400 italic">
                        {new Date(ret.return_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-10 py-6">
                        <button
                          onClick={() => viewReturnDetails(ret.id)}
                          className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-600 rounded-lg transition-all shadow-sm opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                        >
                          <Eye size={16} />
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

      {/* Details View Modal - Refined Airy Design */}
      {showDetails && selectedReturn && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[150] p-8 animate-in fade-in duration-300">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-linear-to-r from-white to-blue-50/30">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                  Reversal Manifest
                  <span className="bg-blue-600 text-white text-[10px] px-3 py-1 rounded-full font-black tracking-widest shadow-lg shadow-blue-100">{selectedReturn.return_no}</span>
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Audit Log Shard Inspection</p>
              </div>
              <button onClick={() => setShowDetails(false)} className="w-12 h-12 bg-white border border-slate-100 text-slate-300 hover:text-rose-500 rounded-lg flex items-center justify-center transition-all hover:shadow-xl"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Audit Date', val: new Date(selectedReturn.return_date).toLocaleDateString('en-IN'), icon: <Calendar size={14} />, color: 'blue' },
                  { label: 'Settlement', val: selectedReturn.refund_type, icon: <Layout size={14} />, color: 'emerald' },
                  { label: 'Source Sale', val: `#${selectedReturn.sale_id}`, icon: <ShoppingCart size={14} />, color: 'amber' },
                  { label: 'Log Authority', val: selectedReturn.created_by_user || 'SYSTEM', icon: <User size={14} />, color: 'indigo' }
                ].map((item, i) => (
                  <div key={i} className="bg-slate-50 p-5 rounded-lg border border-slate-100 group hover:bg-white transition-all">
                    <div className={`p-2 bg-white text-${item.color}-600 rounded-lg mb-3 border border-slate-50 shadow-sm w-fit group-hover:scale-110 transition-transform`}>{item.icon}</div>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-sm font-bold text-slate-700 uppercase italic truncate">{item.val}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-blue-600"></div> Component Breakdown
                </h3>
                <div className="rounded-lg border border-slate-50 overflow-hidden shadow-inner">
                  <table className="w-full text-xs">
                    <thead className="bg-[#F8FAFC]">
                      <tr>
                        <th className="px-8 py-4 text-left font-bold text-slate-400 uppercase">Item Description</th>
                        <th className="px-8 py-4 text-center font-bold text-slate-400 uppercase">Qty</th>
                        <th className="px-8 py-4 text-right font-bold text-slate-400 uppercase">Total Shard</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedReturn.items?.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-3 font-bold text-slate-700 uppercase">{item.item_name}</td>
                          <td className="px-8 py-3 text-center"><span className="bg-slate-50 px-2 py-1 rounded-lg font-mono font-bold">{item.quantity}</span></td>
                          <td className="px-8 py-3 text-right font-black text-slate-800 italic">₹{parseFloat(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedReturn.notes && (
                <div className="bg-slate-50 p-8 rounded-lg border border-slate-100 relative group">
                  <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-2 italic">Notes / Manifesto</p>
                  <p className="text-sm font-bold text-slate-600 leading-relaxed italic">{selectedReturn.notes}</p>
                </div>
              )}

              <div className="bg-slate-900 p-10 rounded-lg text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:rotate-12 transition-transform duration-700"><TrendingUp size={150} /></div>
                <div className="flex justify-between items-end relative z-10">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.4em] italic mb-2 block">Refund Integrity Validated</span>
                    <p className="text-4xl font-bold tracking-tighter italic shadow-white/10 shadow-sm">₹{parseFloat(selectedReturn.refund_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 italic">Total Reversal Shard</p>
                    <p className="text-xl font-bold opacity-60 italic">₹{parseFloat(selectedReturn.total_return_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Loader = ({ className, size }) => (
  <RefreshCcw className={`animate-spin ${className}`} size={size} />
);
