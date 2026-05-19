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
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-8 font-mono">
        <div className="text-center font-bold text-zinc-400">
          <p className="text-xs mb-4 uppercase tracking-widest">Initializing Core Ledger...</p>
          <RefreshCcw className="animate-spin mx-auto text-blue-600" size={24} />
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-zinc-100 p-6 text-zinc-900 select-none animate-none font-bold">
        <div className="max-w-4xl mx-auto bg-white border border-zinc-300 p-6 space-y-6 shadow-sm rounded-none">
          <button
            onClick={() => setShowForm(false)}
            className="group mb-4 flex items-center gap-2 text-zinc-500 hover:text-zinc-800 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            <div className="p-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 transition shadow-sm rounded-none">
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
    <div className="min-h-screen bg-zinc-100 p-6 text-zinc-900 select-none animate-none font-bold">
      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6 shadow-sm rounded-none">

        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className={`text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 select-none ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
              <RefreshCcw size={20} className="text-zinc-600" />
              {t('saleReturnMaster.title')}
            </h1>
            <p className="text-[10px] font-mono text-zinc-500 mt-0.5 uppercase tracking-wider select-none">{t('saleReturnMaster.eyebrow')}</p>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none"
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
            <div key={i} className="bg-zinc-50 border border-zinc-300 p-4 shadow-sm flex items-center justify-between rounded-none">
              <div>
                <span className="text-[10px] font-sans text-zinc-500 uppercase tracking-wider">{shard.label}</span>
                <span className="text-xl font-bold text-zinc-800 mt-1 block font-mono">{shard.val}</span>
              </div>
              <div className="w-10 h-10 border border-zinc-200 bg-white text-zinc-600 flex items-center justify-center rounded-none shrink-0">
                {shard.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div className="bg-zinc-50 p-4 border border-zinc-300 flex flex-wrap items-end gap-4 rounded-none">
          <div className="flex-1 min-w-[280px]">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 block">{t('saleReturnForm.sourceManifest')}</label>
            <div className="relative group">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-600 transition-colors" />
              <input
                type="text"
                placeholder={t('saleReturnMaster.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-none focus:border-zinc-500 outline-none transition font-bold text-xs font-prompt"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-2 border border-zinc-300 rounded-none">
            <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="bg-transparent border-none outline-none text-xs font-bold text-zinc-600 focus:text-zinc-900 transition-all font-mono" />
            <ArrowRight size={14} className="text-zinc-300" />
            <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="bg-transparent border-none outline-none text-xs font-bold text-zinc-600 focus:text-zinc-900 transition-all font-mono" />
          </div>

          <button onClick={fetchReturns} className="bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-700 text-xs font-bold px-4 py-2.5 rounded-none transition shadow-sm flex items-center gap-1.5">
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            {t('saleReturnMaster.syncManifest')}
          </button>
        </div>

        {/* List Registry */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px] rounded-none">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3 select-none">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-700 select-none">
                {t('saleReturnMaster.registryTitle')}
              </span>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-xs px-2 py-0.5 select-none">
                {filteredReturns.length} {t('saleReturnMaster.registrySubtitle')}
              </span>
            </div>
            <button className="p-1 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-zinc-800 transition shadow-sm"><Download size={14} /></button>
          </div>

          <div className="flex-1 overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse select-none">
              <thead>
                <tr className={`bg-zinc-50 border-b border-zinc-300 text-zinc-600 text-xs font-bold uppercase tracking-wider`}>
                  <th className="px-4 py-3 border-r border-zinc-200">{t('saleReturnMaster.table.documentId')}</th>
                  <th className="px-4 py-3 border-r border-zinc-200">{t('saleReturnMaster.table.partyIdentity')}</th>
                  <th className="px-4 py-3 border-r border-zinc-200 text-center">{t('saleReturnMaster.table.skuLoad')}</th>
                  <th className="px-4 py-3 border-r border-zinc-200 text-right">{t('saleReturnMaster.table.reversalValue')}</th>
                  <th className="px-4 py-3 border-r border-zinc-200 text-center">{t('saleReturnMaster.table.settlement')}</th>
                  <th className="px-4 py-3 border-r border-zinc-200 text-center">{t('saleReturnMaster.table.auditDate')}</th>
                  <th className="px-4 py-3 text-center">{t('saleReturnMaster.table.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-24 text-center">
                      <RefreshCcw className="animate-spin mx-auto mb-2 text-zinc-400" size={24} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{t('saleReturnMaster.loadingData')}</p>
                    </td>
                  </tr>
                ) : filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-24 text-center">
                      <Database className="text-zinc-300 mx-auto mb-2" size={32} />
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('saleReturnMaster.noRecords')}</p>
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((ret, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/60 font-mono text-base transition-colors">
                      <td className="px-4 py-3 border-r border-zinc-200 text-zinc-900 font-bold">
                        #{ret.return_no}
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-200 font-black text-zinc-900">
                        <div className="flex flex-col">
                          <span className={`text-zinc-800 ${i18n.language === 'gu' ? 'font-prompt text-sm' : ''}`}>{ret.customer_name || 'WALK-IN_ENTITY'}</span>
                          <span className="text-[9px] text-zinc-400 font-mono tracking-wider">ID: {ret.member_code || 'GENERIC'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-200 text-center text-zinc-600 font-bold">
                        {ret.item_count}
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-200 text-right font-black text-zinc-900 force-en">
                        ₹{parseFloat(ret.total_return_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-200 text-center">
                        <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${ret.refund_type === 'cash' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-blue-50 text-blue-700 border-blue-300'}`}>
                          {ret.refund_type === 'cash' ? t('saleForm.cash') : t('saleForm.credit')}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-200 text-center text-zinc-500 font-bold">
                        {new Date(ret.return_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => viewReturnDetails(ret.id)}
                          className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm"
                        >
                          <Eye size={13} />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 backdrop-blur-none p-4 select-none">
          <div className="bg-white border border-zinc-400 rounded-none w-full max-w-2xl shadow-lg relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <RefreshCcw size={15} className="text-zinc-600" />
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider leading-none">
                  {t('saleReturnMaster.details.inspection')}
                </h3>
              </div>
              <div className="flex gap-2">
                <button className="p-1 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-600 transition shadow-sm"><Printer size={13} /></button>
                <button onClick={() => setShowDetails(false)} className="p-1 border border-zinc-300 bg-white hover:bg-red-50 hover:border-red-300 text-zinc-600 hover:text-red-700 transition shadow-sm"><X size={13} /></button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 p-3 border border-zinc-200 font-mono text-xs">
                <div>
                  <span className="block text-[9px] text-zinc-400 uppercase tracking-wider">{t('saleReturnMaster.details.identityVector')}</span>
                  <span className={`font-bold text-zinc-800 uppercase ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>{selectedReturn.customer_name}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-zinc-400 uppercase tracking-wider">{t('saleReturnMaster.details.auditDate')}</span>
                  <span className="font-bold text-zinc-800">{new Date(selectedReturn.return_date).toLocaleDateString('en-GB')}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-zinc-400 uppercase tracking-wider">{t('saleReturnMaster.details.sourceSale')}</span>
                  <span className="font-bold text-zinc-800">#{selectedReturn.sale_id}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-zinc-400 uppercase tracking-wider">{t('saleReturnMaster.details.settlement')}</span>
                  <span className="font-bold text-zinc-800">{selectedReturn.refund_type === 'cash' ? t('saleForm.cash') : t('saleForm.credit')}</span>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">{t('saleReturnMaster.details.reversalPayload')}</h4>
                <div className="border border-zinc-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead className="bg-zinc-50 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                      <tr>
                        <th className="px-3 py-2 border-r border-zinc-200">{t('saleReturnMaster.details.inventoryNode')}</th>
                        <th className="px-3 py-2 border-r border-zinc-200 text-center">{t('saleReturnMaster.details.qty')}</th>
                        <th className="px-3 py-2 text-right">{t('saleReturnMaster.details.yieldReversal')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 text-zinc-700">
                      {(selectedReturn.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50">
                          <td className="px-3 py-2 border-r border-zinc-200 font-prompt font-bold">{item.item_name}</td>
                          <td className="px-3 py-2 border-r border-zinc-200 text-center">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">₹{parseFloat(item.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-zinc-950 p-4 rounded-none text-white shadow-md flex justify-between items-center font-mono">
                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider">{t('saleReturnMaster.details.fiscalRefundAggregate')}</span>
                  <span className="text-base font-bold block uppercase">{t('saleReturnMaster.details.netReversal')}</span>
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
        .scroller-airy::-webkit-scrollbar-thumb:hover { background: #3b82f6; }
      `}} />
    </div>
  );
}
