import React, { useState, useEffect } from 'react';
import {
  Plus, Eye, Search, Printer, X, RefreshCcw,
  Calendar, User, FileText, ArrowRight,
  ShieldCheck, TrendingUp, ShoppingBag,
  Filter, ChevronRight, Layout, Activity,
  Database, Package, ShoppingCart, Info, Download
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SaleReturnForm from '../components/SaleReturnForm';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';
import api from '../api';

export default function SaleReturn() {
  const { t, i18n } = useTranslation();
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
      const response = await api.get('/company');
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
      const response = await api.get('/sale-returns', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });
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
      const response = await api.get(`/sale-returns/${returnId}`);
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 font-mono">
        <div className="text-center font-bold text-slate-400">
          <p className="text-xs mb-4 uppercase tracking-widest">Initializing Core Ledger...</p>
          <RefreshCcw className="animate-spin mx-auto text-[#1d5f84]" size={24} />
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 text-slate-900 select-none animate-none font-bold">
        <div className="max-w-5xl mx-auto bg-white border border-slate-200 p-6 space-y-6 shadow-sm rounded-lg">
          <button
            onClick={() => setShowForm(false)}
            className="group mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            <div className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-sm rounded-md">
              <X size={14} />
            </div>
            {t('saleReturnForm.backToManifest')}
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
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 select-none animate-none font-bold">
      <div className="max-w-[1500px] mx-auto bg-white border border-slate-200 p-5 space-y-6 shadow-sm rounded-lg">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 gap-4">
          <div>
            <h1 className={`text-xl font-extrabold tracking-tight text-slate-800 flex items-center gap-2 select-none ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
              <RefreshCcw size={20} className="text-[#1d5f84]" />
              {t('saleReturnMaster.title')}
            </h1>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5 uppercase tracking-wider select-none">{t('saleReturnMaster.eyebrow')}</p>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-[#1d5f84] hover:bg-[#154662] text-white text-xs font-bold px-4 py-2 rounded-md transition shadow-sm select-none"
          >
            <Plus size={15} />
            {t('saleReturnMaster.issueCreditNote')}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 select-none">
          {[
            { label: t('saleReturnMaster.stats.totalReturns'), val: stats.totalReturns, icon: <FileText size={16} /> },
            { label: t('saleReturnMaster.stats.aggregateValue'), val: `₹${stats.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: <TrendingUp size={16} /> },
            { label: t('saleReturnMaster.stats.unitsReverted'), val: stats.totalItems, icon: <Package size={16} /> },
            { label: t('saleReturnMaster.stats.entitiesEffected'), val: stats.uniqueCustomers, icon: <User size={16} /> }
          ].map((shard, i) => (
            <div key={i} className="bg-white border border-slate-200 p-4 shadow-sm flex items-center justify-between rounded-lg">
              <div>
                <span className="text-[10px] font-sans text-slate-500 uppercase tracking-wider">{shard.label}</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block font-mono">{shard.val}</span>
              </div>
              <div className="w-10 h-10 border border-slate-100 bg-slate-50 text-slate-500 flex items-center justify-center rounded-md shrink-0">
                {shard.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-4 border border-slate-200 flex flex-wrap items-end gap-4 rounded-lg shadow-sm">
          <div className="flex-1 min-w-[280px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{t('saleReturnForm.sourceManifest')}</label>
            <div className="relative group">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1d5f84] transition-colors" />
              <input
                type="text"
                placeholder={t('saleReturnMaster.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-xs font-prompt"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-300 rounded-md focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] transition-all">
            <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 focus:text-slate-900 transition-all font-mono" />
            <ArrowRight size={14} className="text-slate-300" />
            <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 focus:text-slate-900 transition-all font-mono" />
          </div>

          <button onClick={fetchReturns} className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-md transition shadow-sm flex items-center gap-1.5">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            {t('saleReturnMaster.syncManifest')}
          </button>
        </div>

        {/* List Registry */}
        <div className="border border-slate-200 bg-white flex flex-col min-h-[450px] rounded-lg overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3 select-none">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-700 select-none">
                {t('saleReturnMaster.registryTitle')}
              </span>
              <span className="bg-slate-200 border border-slate-300 text-slate-700 font-sans text-xs px-2 py-0.5 rounded-md select-none">
                {filteredReturns.length} {t('saleReturnMaster.registrySubtitle')}
              </span>
            </div>
            <button className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition shadow-sm"><Download size={14} /></button>
          </div>

          <div className="flex-1 overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse select-none">
              <thead>
                <tr className={`bg-white border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-widest`}>
                  <th className="px-4 py-3 border-r border-slate-200">{t('saleReturnMaster.table.documentId')}</th>
                  <th className="px-4 py-3 border-r border-slate-200">{t('saleReturnMaster.table.partyIdentity')}</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-center">{t('saleReturnMaster.table.skuLoad')}</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-right">{t('saleReturnMaster.table.reversalValue')}</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-center">{t('saleReturnMaster.table.settlement')}</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-center">{t('saleReturnMaster.table.auditDate')}</th>
                  <th className="px-4 py-3 text-center">{t('saleReturnMaster.table.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-24 text-center">
                      <RefreshCcw className="animate-spin mx-auto mb-3 text-slate-300" size={28} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('saleReturnMaster.loadingData')}</p>
                    </td>
                  </tr>
                ) : filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-24 text-center">
                      <Database className="text-slate-300 mx-auto mb-3" size={32} />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('saleReturnMaster.noRecords')}</p>
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((ret, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/75 font-mono text-sm transition-colors text-slate-700">
                      <td className="px-4 py-3 border-r border-slate-200 font-bold">
                        #{ret.return_no}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-200">
                        <div className="flex flex-col">
                          <span className={`text-slate-800 font-bold ${i18n.language === 'gu' ? 'font-prompt text-[13px]' : 'text-xs'}`}>{ret.customer_name || 'WALK-IN_ENTITY'}</span>
                          <span className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">ID: {ret.member_code || 'GENERIC'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-r border-slate-200 text-center font-bold">
                        {ret.item_count}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-200 text-right font-black text-slate-900 force-en">
                        ₹{parseFloat(ret.total_return_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 border-r border-slate-200 text-center">
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${ret.refund_type === 'cash' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {ret.refund_type === 'cash' ? t('saleForm.cash') : t('saleForm.credit')}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-r border-slate-200 text-center text-slate-500 font-bold text-xs">
                        {new Date(ret.return_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => viewReturnDetails(ret.id)}
                          className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition shadow-sm"
                        >
                          <Eye size={14} />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 select-none">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <RefreshCcw size={16} className="text-[#1d5f84]" />
                <h3 className="text-[13px] font-extrabold text-slate-800 uppercase tracking-wider leading-none">
                  {t('saleReturnMaster.details.inspection')}
                </h3>
              </div>
              <div className="flex gap-2">
                <button className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 transition shadow-sm"><Printer size={14} /></button>
                <button onClick={() => setShowDetails(false)} className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-600 transition shadow-sm"><X size={14} /></button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-white">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-lg font-mono text-xs shadow-sm">
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase tracking-widest mb-1">{t('saleReturnMaster.details.identityVector')}</span>
                  <span className={`font-bold text-slate-800 uppercase ${i18n.language === 'gu' ? 'font-prompt text-[13px]' : ''}`}>{selectedReturn.customer_name}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase tracking-widest mb-1">{t('saleReturnMaster.details.auditDate')}</span>
                  <span className="font-bold text-slate-800">{new Date(selectedReturn.return_date).toLocaleDateString('en-GB')}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase tracking-widest mb-1">{t('saleReturnMaster.details.sourceSale')}</span>
                  <span className="font-bold text-slate-800">#{selectedReturn.sale_id}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 uppercase tracking-widest mb-1">{t('saleReturnMaster.details.settlement')}</span>
                  <span className="font-bold text-slate-800">{selectedReturn.refund_type === 'cash' ? t('saleForm.cash') : t('saleForm.credit')}</span>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 ml-1">{t('saleReturnMaster.details.reversalPayload')}</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 border-r border-slate-200">{t('saleReturnMaster.details.inventoryNode')}</th>
                        <th className="px-4 py-2.5 border-r border-slate-200 text-center">{t('saleReturnMaster.details.qty')}</th>
                        <th className="px-4 py-2.5 text-right">{t('saleReturnMaster.details.yieldReversal')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                      {(selectedReturn.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 border-r border-slate-200 font-prompt font-bold">{item.item_name}</td>
                          <td className="px-4 py-2.5 border-r border-slate-200 text-center">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right">₹{parseFloat(item.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-800 p-5 rounded-lg text-white shadow-md flex justify-between items-center font-mono">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest">{t('saleReturnMaster.details.fiscalRefundAggregate')}</span>
                  <span className="text-sm font-bold block uppercase mt-0.5">{t('saleReturnMaster.details.netReversal')}</span>
                </div>
                <span className="text-2xl font-bold tracking-tight text-emerald-400">₹{parseFloat(selectedReturn.refund_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
        .scroller-airy::-webkit-scrollbar-thumb:hover { background: #1d5f84; }
      `}} />
    </div>
  );
}
