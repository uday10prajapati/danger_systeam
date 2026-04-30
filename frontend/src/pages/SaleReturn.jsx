import React, { useState, useEffect } from 'react';
import {
  Plus, Eye, Search, Printer, X, RefreshCcw,
  Calendar, User, FileText, ArrowRight,
  ShieldCheck, TrendingUp, ShoppingBag,
  Filter, ChevronRight, Layout, Activity,
  Database, Package, ShoppingCart, Info, Download
} from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import SaleReturnForm from '../components/SaleReturnForm';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';

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
            Back to Return Manifest
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

        <PageHeader
          eyebrow="Stock Control / Live Reversal Manifest"
          eyebrowIcon={<RefreshCcw size={12} />}
          title="Return Audit Ledger"
          subtitle="Consolidated yield reversal and credit registry"
        >
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 px-6 py-3.5 rounded-lg text-xs font-black text-white uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            <Plus size={18} />
            Issue Credit Note
          </button>
        </PageHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Total Returns', val: stats.totalReturns, icon: <FileText size={20} />, color: 'blue' },
            { label: 'Aggregate Value', val: `₹${stats.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: <TrendingUp size={20} />, color: 'emerald' },
            { label: 'Units Reverted', val: stats.totalItems, icon: <Package size={20} />, color: 'indigo' },
            { label: 'Entities Effected', val: stats.uniqueCustomers, icon: <User size={20} />, color: 'slate' }
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

        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm mb-4 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[350px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">Record Search Isolation</label>
            <div className="relative group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="text"
                placeholder="SEARCH BY RETURN ID OR CUSTOMER..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-bold uppercase text-[11px] tracking-widest"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="bg-transparent border-none outline-none px-4 py-2 text-xs font-bold text-slate-600 focus:text-blue-600 transition-all font-mono" />
            <ArrowRight size={14} className="text-slate-200" />
            <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="bg-transparent border-none outline-none px-4 py-2 text-xs font-bold text-slate-600 focus:text-blue-600 transition-all font-mono" />
          </div>

          <button onClick={fetchReturns} className="bg-blue-600 text-white px-8 py-3.5 rounded-lg font-bold uppercase tracking-widest text-[11px] hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center gap-2">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Sync Manifest
          </button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
          <TableHeading
            icon={<RefreshCcw size={18} />}
            iconColor="rose"
            title="Reversal Registry"
            subtitle="Consolidated list of all returned nomenclature vectors"
            count={filteredReturns.length}
          >
            <button className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Download size={18} /></button>
          </TableHeading>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                  <th className="px-8 py-5">Document ID</th>
                  <th className="px-8 py-5">Party Identity</th>
                  <th className="px-8 py-5 text-center">SKU Load</th>
                  <th className="px-8 py-5 text-right">Reversal Value</th>
                  <th className="px-8 py-5 text-center">Settlement</th>
                  <th className="px-8 py-5 text-center">Audit Date</th>
                  <th className="px-8 py-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-32 text-center">
                      <RefreshCcw className="animate-spin mx-auto mb-4 text-rose-500" size={40} />
                      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-300 italic">Synchronizing Data Stream...</p>
                    </td>
                  </tr>
                ) : filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-32 text-center">
                      <Database className="text-slate-100 mx-auto mb-4" size={60} strokeWidth={1} />
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">Zero Reversal Nodes Isolated</p>
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((ret, idx) => (
                    <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <span className="text-sm font-bold text-slate-800 italic tracking-tight font-mono">#{ret.return_no}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px] uppercase">
                            {ret.customer_name ? ret.customer_name.charAt(0) : 'W'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 uppercase italic tracking-tight leading-none mb-1">{ret.customer_name || 'WALK-IN_ENTITY'}</p>
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest font-mono">ID: {ret.member_code || 'GENERIC'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ret.item_count} SKU</span>
                      </td>
                      <td className="px-8 py-6 text-right font-black text-slate-900 italic text-base">₹{parseFloat(ret.total_return_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-8 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2 border ${ret.refund_type === 'cash' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${ret.refund_type === 'cash' ? 'bg-emerald-600' : 'bg-blue-600'}`}></div>
                          {ret.refund_type}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center font-mono text-slate-400 text-xs italic">{new Date(ret.return_date).toLocaleDateString('en-GB')}</td>
                      <td className="px-8 py-6 text-center">
                        <button onClick={() => viewReturnDetails(ret.id)} className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm mx-auto active:scale-95">
                          <Eye size={18} />
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

      {showDetails && selectedReturn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden border border-white animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-blue-600 p-8 flex justify-between items-center relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-48 h-48 bg-rose-600/10 rounded-full -mr-24 -mt-24"></div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center text-white"><RefreshCcw size={24} /></div>
                <div>
                  <h2 className="text-xl font-black text-white italic uppercase tracking-tight">Reversal Inspection</h2>
                  <p className="text-[10px] font-bold text-slate-100 uppercase tracking-widest mt-1 italic">RETURN NODE: #{selectedReturn.return_no}</p>
                </div>
              </div>
              <div className="flex gap-2 relative z-10">
                <button className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"><Printer size={20} /></button>
                <button onClick={() => setShowDetails(false)} className="p-2.5 bg-white/10 hover:bg-rose-500/20 text-white rounded-lg transition-all"><X size={20} /></button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto scroller-airy flex-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-6 rounded-lg border border-slate-100">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Identity Vector</p>
                  <p className="text-sm font-black text-slate-800 uppercase italic">{selectedReturn.customer_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Audit Date</p>
                  <p className="text-sm font-black text-slate-800 uppercase italic">{new Date(selectedReturn.return_date).toLocaleDateString('en-GB')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Source Sale</p>
                  <p className="text-sm font-black text-slate-800 uppercase italic">#{selectedReturn.sale_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Settlement</p>
                  <p className="text-sm font-black text-slate-800 uppercase italic">{selectedReturn.refund_type}</p>
                </div>
              </div>

              <div className="mb-8">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-4">
                  <div className="w-8 h-0.5 bg-slate-200"></div> Reversal Payload
                </h4>
                <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest italic border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4">Inventory Node</th>
                        <th className="px-6 py-4 text-center">Qty</th>
                        <th className="px-6 py-4 text-right">Yield Reversal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700 uppercase italic">
                      {(selectedReturn.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">{item.item_name}</td>
                          <td className="px-6 py-4 text-center">{item.quantity}</td>
                          <td className="px-6 py-4 text-right font-mono">₹{parseFloat(item.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-blue-600 p-8 rounded-lg text-white shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-rose-600/10 to-transparent"></div>
                <div className="flex justify-between items-end relative z-10">
                  <div>
                    <p className="text-[10px] font-bold text-blue-100 uppercase tracking-[0.4em] mb-3 italic">Fiscal Refund Aggregate</p>
                    <h5 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Net Reversal</h5>
                  </div>
                  <p className="text-4xl font-black italic font-mono tracking-tighter">₹{parseFloat(selectedReturn.refund_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
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
