import React, { useState, useEffect } from 'react';
import { Plus, Eye, Search, Printer, X } from 'lucide-react';
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

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    if (company?.id) {
      fetchReturns();
    }
  }, [company]);

  const loadCompany = async () => {
    try {
      const response = await axios.get('/api/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      } else {
        setCompany(null);
      }
    } catch (error) {
      setCompany(null);
    }
  };

  const fetchReturns = async () => {
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

  const handleFormSubmit = () => {
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

  if (!company || !company.id) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center font-black uppercase tracking-widest text-slate-400">
          <p className="text-lg mb-4 italic">Establishing secure connection...</p>
          <div className="w-16 h-1 bg-slate-200 mx-auto overflow-hidden">
             <div className="w-full h-full bg-black animate-[slide_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-900 font-sans">
      {/* Header - Industrial Monochrome */}
      <div className="flex justify-between items-end border-b-4 border-black pb-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{t('saleReturn.title', 'Sale Returns')}</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">{company.company_name} / INVENTORY REVERSAL</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-lg hover:bg-slate-800 font-black shadow-2xl transition-all active:scale-95 uppercase tracking-widest text-xs"
        >
          <Plus size={18} strokeWidth={3} />
          {t('saleReturn.create', 'Issue Credit Note')}
        </button>
      </div>

      {/* Stats Cards - Sleek Grayscale */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-900 group hover:bg-slate-900 transition-all duration-300">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">{t('saleReturn.totalReturns', 'Total Returns')}</p>
          <p className="text-4xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white">{stats.totalReturns}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-500 group hover:bg-slate-800 transition-all duration-300">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">{t('saleReturn.totalAmount', 'Return Value')}</p>
          <p className="text-3xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white">₹{stats.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-400 group hover:bg-slate-700 transition-all duration-300">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">{t('saleReturn.totalItems', 'Returned Qty')}</p>
          <p className="text-4xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white">{stats.totalItems}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-300 group hover:bg-slate-600 transition-all duration-300">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">{t('saleReturn.uniqueCustomers', 'Parties')}</p>
          <p className="text-4xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white">{stats.uniqueCustomers}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-slate-100 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[250px]">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Filter Records</span>
          <div className="relative group">
            <Search className="absolute left-4 top-3 text-slate-300 group-focus-within:text-black transition-colors" size={18} />
            <input
              type="text"
              placeholder="SEARCH BY RETURN NO OR PARTY..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 border-2 border-slate-100 rounded-lg focus:outline-none focus:border-black transition-all bg-slate-50 font-black uppercase text-xs"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">From</span>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-4 py-2 border-2 border-slate-100 rounded-lg focus:border-black transition-all font-black text-xs uppercase bg-white cursor-pointer"
            />
          </div>
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">To</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-4 py-2 border-2 border-slate-100 rounded-lg focus:border-black transition-all font-black text-xs uppercase bg-white cursor-pointer"
            />
          </div>
          <button
            onClick={fetchReturns}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-black font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg h-[41px]"
          >
            {t('common.filter', 'Execute')}
          </button>
        </div>
      </div>

      {/* Returns Table - High Contrast Industrial */}
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Doc #</th>
                <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Party Name</th>
                <th className="px-6 py-4 text-center font-black uppercase tracking-widest text-[10px]">Items</th>
                <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px]">Total Value</th>
                <th className="px-6 py-4 text-center font-black uppercase tracking-widest text-[10px]">Mechanism</th>
                <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Post Date</th>
                <th className="px-6 py-4 text-center font-black uppercase tracking-widest text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-slate-400 font-black uppercase tracking-[0.3em] text-xs italic">
                    NO RETURN ENTRIES DETECTED
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-black text-slate-900 text-sm tracking-tighter">{ret.return_no}</td>
                    <td className="px-6 py-4 text-slate-700 font-bold uppercase text-xs">{ret.customer_name || 'WALK-IN'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-slate-100 text-slate-900 px-3 py-1 rounded-full text-[10px] font-black border border-slate-200 uppercase">
                        {ret.item_count} SKU
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900 text-sm italic">
                      ₹{parseFloat(ret.total_return_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest border-2 ${
                        ret.refund_type === 'cash' 
                          ? 'bg-white text-slate-900 border-slate-900' 
                          : 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      }`}>
                        {ret.refund_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-[11px] font-bold">
                      {new Date(ret.return_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => viewReturnDetails(ret.id)}
                        className="p-2.5 text-slate-900 hover:bg-black hover:text-white rounded-lg transition-all border border-slate-200 group-hover:border-black active:scale-90"
                      >
                        <Eye size={18} strokeWidth={2.5} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed View Modal */}
      {showDetails && selectedReturn && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-700">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase italic">Credit Note: {selectedReturn.return_no}</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Inventory Reversal Detail</p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="bg-slate-800 hover:bg-red-600 text-white p-2 rounded-xl transition-all active:scale-90"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8 py-6 px-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Return Date</p>
                  <p className="font-black text-slate-900 text-sm">{new Date(selectedReturn.return_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Entity / Party</p>
                  <p className="font-black text-slate-900 text-sm uppercase">{selectedReturn.customer_name || 'WALK-IN CUSTOMER'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Settlement</p>
                  <p className="font-black text-slate-900 text-sm uppercase italic">{selectedReturn.refund_type} REVERSAL</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Audit / User</p>
                  <p className="font-black text-slate-900 text-sm uppercase">{selectedReturn.created_by_user || 'SYSTEM_AUTH'}</p>
                </div>
              </div>

              {selectedReturn.notes && (
                <div className="bg-slate-100 p-4 border-l-4 border-slate-900 rounded-r-xl group">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-black transition-colors">Manifesto / Notes</p>
                  <p className="text-slate-800 font-bold uppercase text-[11px] leading-relaxed italic">{selectedReturn.notes}</p>
                </div>
              )}

              {/* Items Detail */}
              <div>
                <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-4 text-slate-900 flex items-center gap-2">
                   <div className="w-4 h-1 bg-black"></div>
                   Returned Items Pipeline
                </h3>
                <div className="rounded-xl border-2 border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-[9px] text-slate-500">Nomenclature</th>
                        <th className="px-4 py-3 text-center font-black uppercase tracking-widest text-[9px] text-slate-500">Qty</th>
                        <th className="px-4 py-3 text-right font-black uppercase tracking-widest text-[9px] text-slate-500">Rate</th>
                        <th className="px-4 py-3 text-right font-black uppercase tracking-widest text-[9px] text-slate-500">Value</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                      {selectedReturn.items?.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-black text-slate-900 uppercase">{item.item_name}</td>
                          <td className="px-4 py-3 text-center font-mono font-black">{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-500">₹{parseFloat(item.sale_rate || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-mono font-black text-slate-900 h-10 flex items-center justify-end">
                             <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shadow-sm">₹{parseFloat(item.amount || 0).toFixed(2)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* High Contrast Totals */}
              <div className="space-y-3 bg-slate-900 p-8 rounded-2xl text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                <div className="flex justify-between items-center opacity-60 text-[10px] font-black uppercase tracking-widest">
                  <span>Gross Reversal Value</span>
                  <span className="font-mono">₹{parseFloat(selectedReturn.total_return_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between item-center text-3xl font-black border-t border-slate-800 pt-6 mt-4 tracking-tighter">
                  <span className="uppercase italic tracking-tight italic">Net Refund</span>
                  <span className="text-white drop-shadow-lg">₹{parseFloat(selectedReturn.refund_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest mt-4">
                   <span>Mechanism: {selectedReturn.refund_type}</span>
                   <span className="italic opacity-30 italic">Certified Transaction</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <SaleReturnForm onClose={() => setShowForm(false)} onSuccess={handleFormSubmit} />
      )}
    </div>
  );
}
