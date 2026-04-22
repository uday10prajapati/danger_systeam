import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle, Search, Filter, Calendar, TrendingDown, X, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import PurchaseReturnForm from '../components/PurchaseReturnForm';

export default function PurchaseReturn() {
  const { t } = useTranslation();
  const [company, setCompany] = useState(null);
  const [returns, setReturns] = useState([]);
  const [filteredReturns, setFilteredReturns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);
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
        fetchReturns(response.data.data.id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  // Fetch purchase returns
  const fetchReturns = async (companyId, startDate, endDate) => {
    try {
      setLoading(true);
      const start = startDate || dateRange.startDate;
      const end = endDate || dateRange.endDate;
      
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/purchase-returns`, {
        params: {
          startDate: start,
          endDate: end
        },
        headers: { 'x-company-id': companyId }
      });
      
      if (res.data.success) {
        setReturns(res.data.data);
        applyFilters(res.data.data, searchTerm);
      }
    } catch (err) {
      console.error('Fetch returns error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply search filter
  const applyFilters = (returnsToFilter, search) => {
    let filtered = returnsToFilter;

    if (search) {
      filtered = filtered.filter(ret =>
        ret.purchase_id.toString().includes(search) ||
        ret.supplier_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredReturns(filtered);
  };

  // Handle search
  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    applyFilters(returns, term);
  };

  // Handle date range change
  const handleDateChange = (field, value) => {
    const newRange = { ...dateRange, [field]: value };
    setDateRange(newRange);
    if (company) {
      fetchReturns(company.id, newRange.startDate, newRange.endDate);
    }
  };

  // View return details
  const viewReturnDetails = async (returnId) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/purchase-returns/${returnId}`, {
        headers: { 'x-company-id': company.id }
      });
      if (res.data.success) {
        setSelectedReturn(res.data.data);
        setShowDetails(true);
      }
    } catch (err) {
      console.error('Fetch return details error:', err);
    }
  };

  // Handle form submission
  const handleFormSubmit = async (formData) => {
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/purchase-returns`, formData, {
        headers: {
          'x-company-id': company.id,
          'x-user-id': JSON.parse(localStorage.getItem('user'))?.id || 1
        }
      });

      if (res.data.success) {
        setShowForm(false);
        fetchReturns(company.id);
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        throw err;
      }
      throw new Error(err.response?.data?.message || 'Failed to create return');
    }
  };

  if (!company?.id) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center font-black uppercase tracking-widest text-slate-400">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-lg mb-4 italic">Establishing secure connection...</p>
          <div className="w-16 h-1 bg-slate-200 mx-auto overflow-hidden rounded-full">
             <div className="w-full h-full bg-black animate-[slide_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header - Industrial Monochrome */}
        <div className="flex justify-between items-end border-b-4 border-black pb-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{t('purchaseReturn.purchaseReturn')}</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">{company?.company_name} / PROCUREMENT REVERSAL</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-lg hover:bg-slate-800 font-black shadow-2xl transition-all active:scale-95 uppercase tracking-widest text-xs"
          >
            <Plus size={18} strokeWidth={3} />
            {t('purchaseReturn.createNewReturn')}
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] max-w-4xl w-full max-h-[90vh] overflow-hidden border border-slate-700 flex flex-col">
              <PurchaseReturnForm
                company={company}
                onSubmit={handleFormSubmit}
                onClose={() => setShowForm(false)}
              />
            </div>
          </div>
        )}

        {/* Return Details Modal */}
        {showDetails && selectedReturn && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in zoom-in-95 duration-200">
            <div className="bg-white rounded-2xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-700">
              
              {/* Header */}
              <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase italic">
                    {t('purchaseReturn.returnNo')} #{selectedReturn.id}
                  </h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Debit Memo Detail</p>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                   className="bg-slate-800 hover:bg-red-600 text-white p-2 rounded-xl transition-all active:scale-90"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Header Info Grid */}
                <div className="grid grid-cols-2 gap-8 py-6 px-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                  <div>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{t('purchaseReturn.supplier')}</p>
                    <p className="font-black text-slate-900 text-sm">{selectedReturn.supplier_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{t('purchaseReturn.returnDate')}</p>
                    <p className="font-black text-slate-900 text-sm">
                      {new Date(selectedReturn.return_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{t('purchaseReturn.originalInvoice')}</p>
                    <p className="font-black text-slate-900 text-sm uppercase italic">{selectedReturn.original_invoice_no || 'MANUAL_ENTRY'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{t('purchaseReturn.createdBy')}</p>
                    <p className="font-black text-slate-900 text-sm uppercase">{selectedReturn.created_by_name || 'SYSTEM_AUTH'}</p>
                  </div>
                </div>

                {/* Items Table Detail */}
                <div>
                   <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-4 text-slate-900 flex items-center gap-2">
                      <div className="w-4 h-1 bg-black"></div>
                      {t('purchaseReturn.returnItems')} Pipeline
                   </h3>
                  <div className="rounded-xl border-2 border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-[9px] text-slate-500">{t('purchaseReturn.itemName')}</th>
                          <th className="px-4 py-3 text-center font-black uppercase tracking-widest text-[9px] text-slate-500">{t('purchaseReturn.returnQty')}</th>
                          <th className="px-4 py-3 text-right font-black uppercase tracking-widest text-[9px] text-slate-500">{t('purchaseReturn.rate')}</th>
                          <th className="px-4 py-3 text-right font-black uppercase tracking-widest text-[9px] text-slate-500">{t('purchaseReturn.amount')}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-50">
                        {selectedReturn.items?.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-black text-slate-900 uppercase">{item.item_name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">CODE: {item.item_code}</p>
                            </td>
                            <td className="px-4 py-3 text-center font-mono font-black">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-500">
                              ₹{parseFloat(item.purchase_rate).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-black text-slate-900 h-10 flex items-center justify-end">
                              <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shadow-sm">₹{parseFloat(item.amount).toFixed(2)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* High Contrast Totals */}
                  <div className="mt-8 space-y-3 bg-slate-900 p-8 rounded-2xl text-white shadow-2xl relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                     <div className="flex justify-between items-center opacity-60 text-[10px] font-black uppercase tracking-widest">
                        <span>Items Processed</span>
                        <span className="font-mono">{selectedReturn.items?.length || 0} SKU</span>
                     </div>
                     <div className="flex justify-between item-center text-3xl font-black border-t border-slate-800 pt-6 mt-4 tracking-tighter">
                        <span className="uppercase italic tracking-tight">{t('purchaseReturn.totalReturnAmount')}</span>
                        <span className="text-white drop-shadow-lg">₹{parseFloat(selectedReturn.total_return_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                     </div>
                  </div>
                </div>

                {/* Audit Notes */}
                {selectedReturn.notes && (
                  <div className="bg-slate-100 p-4 border-l-4 border-slate-900 rounded-r-xl group">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-black transition-colors">{t('purchaseReturn.notes')}</h3>
                    <p className="text-slate-800 font-bold uppercase text-[11px] leading-relaxed italic">
                      {selectedReturn.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards - Sleek Grayscale */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-900 group hover:bg-slate-900 transition-all duration-300">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">{t('purchaseReturn.totalReturns')}</p>
            <p className="text-4xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white uppercase italic">{returns.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-500 group hover:bg-slate-800 transition-all duration-300">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">{t('purchaseReturn.totalReturnAmount')}</p>
            <p className="text-3xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white underline decoration-slate-200 underline-offset-4">
              ₹{returns.reduce((sum, r) => sum + parseFloat(r.total_return_amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-400 group hover:bg-slate-700 transition-all duration-300">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">{t('purchaseReturn.totalItems')}</p>
            <p className="text-4xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white">
              {returns.reduce((sum, r) => sum + (r.item_count || 0), 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-300 group hover:bg-slate-600 transition-all duration-300">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">{t('purchaseReturn.uniqueSuppliers')}</p>
            <p className="text-4xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white">
              {new Set(returns.map(r => r.supplier_account_id)).size}
            </p>
          </div>
        </div>

        {/* Search and Filter Ribbon */}
        <div className="bg-white p-4 rounded-xl shadow-md border border-slate-100 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px]">
             <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Global Registry Search</span>
            <div className="relative group">
              <Search className="absolute left-4 top-3 text-slate-300 group-focus-within:text-black transition-colors" size={18} />
              <input
                type="text"
                placeholder={t('purchaseReturn.searchBySupplier')}
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-12 pr-4 py-2.5 border-2 border-slate-100 rounded-lg focus:outline-none focus:border-black transition-all bg-slate-50 font-black uppercase text-xs"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div>
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 uppercase tracking-widest">{t('purchaseReturn.fromDate')}</span>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="px-4 py-2 border-2 border-slate-100 rounded-lg focus:border-black transition-all font-black text-xs uppercase bg-white cursor-pointer"
              />
            </div>
            <div>
               <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 uppercase tracking-widest">{t('purchaseReturn.toDate')}</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="px-4 py-2 border-2 border-slate-100 rounded-lg focus:border-black transition-all font-black text-xs uppercase bg-white cursor-pointer"
              />
            </div>
            <button 
               onClick={() => fetchReturns(company.id)}
               className="px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-black font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg h-[41px]"
            >
               {t('common.filter', 'Execute')}
            </button>
          </div>
        </div>

        {/* Returns Data Table */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
          {loading ? (
             <div className="flex flex-col items-center justify-center h-64 font-black uppercase tracking-[0.3em] text-slate-300 italic animate-pulse">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-black rounded-full animate-spin mb-4"></div>
                ANALYZING ARCHIVES...
             </div>
          ) : filteredReturns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 bg-slate-50/50">
              <TrendingDown className="w-16 h-16 text-slate-200 mb-4" />
               <p className="text-slate-400 font-black uppercase tracking-widest text-sm">{t('purchaseReturn.noReturnsFound')}</p>
              <p className="text-slate-300 font-bold uppercase tracking-widest text-[9px] mt-2 italic">{t('purchaseReturn.createYourFirstReturn')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900 text-white font-black uppercase tracking-widest text-[10px]">
                  <tr>
                    <th className="text-left py-4 px-6">Doc Id</th>
                    <th className="text-left py-4 px-6">Supplier Entity</th>
                    <th className="text-center py-4 px-6">SKUs</th>
                    <th className="text-right py-4 px-6">Return Val</th>
                    <th className="text-center py-4 px-6">Post Date</th>
                    <th className="text-center py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReturns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-4 px-6">
                        <p className="font-black text-slate-900 text-sm tracking-tighter italic">#{ret.id}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-slate-700 font-black uppercase text-xs tracking-tight">{ret.supplier_name}</p>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="bg-slate-100 text-slate-900 px-3 py-1 rounded-full text-[10px] font-black border border-slate-200 uppercase">
                          {ret.item_count} ITEMS
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <p className="font-black text-slate-900 text-sm italic">
                          ₹{parseFloat(ret.total_return_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="flex items-center justify-center gap-1.5 text-slate-500 font-mono text-[11px] font-bold">
                          <Calendar className="w-3 h-3" />
                          {new Date(ret.return_date).toLocaleDateString('en-GB')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => viewReturnDetails(ret.id)}
                           className="p-2.5 text-slate-900 hover:bg-black hover:text-white rounded-lg transition-all border border-slate-200 group-hover:border-black active:scale-90"
                        >
                           <Eye size={18} strokeWidth={2.5} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
