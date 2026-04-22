import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { AlertTriangle, TrendingDown, Package, Plus, Search, Filter, RefreshCcw, X, History, ChevronRight } from 'lucide-react';

// Format numbers with thousand separators
const formatNumber = (num) => {
  if (!num && num !== 0) return '-';
  return parseFloat(num).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};


export default function StockReport() {
  const { t } = useTranslation();
  const [stockData, setStockData] = useState([]);
  const [lowStockData, setLowStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, LOW, OK
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemHistory, setItemHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    if (company?.id) {
      fetchStockReport();
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


  const fetchStockReport = async () => {
    if (!company?.id) return;
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/stock-report`, {
        headers: { 'x-company-id': company.id, 'x-user-id': 1 }
      });
      if (response.data.success) {
        setStockData(response.data.data);
        // Fetch low stock items
        const lowResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/stock-report/low-stock`, {
          headers: { 'x-company-id': company.id, 'x-user-id': 1 }
        });
        setLowStockData(lowResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching stock report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchItemHistory = async (itemId) => {
    if (!company?.id) return;
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/stock-report/item/${itemId}`, {
        headers: { 'x-company-id': company.id, 'x-user-id': 1 }
      });
      if (response.data.success) {
        setItemHistory(response.data.data);
        setShowHistory(true);
      }
    } catch (error) {
      console.error('Error fetching item history:', error);
    }
  };

  const filteredData = stockData.filter(item => {
    const matchesSearch = 
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'LOW') {
      return matchesSearch && item.stock_status === 'LOW';
    } else if (filterStatus === 'OK') {
      return matchesSearch && item.stock_status === 'OK';
    }
    return matchesSearch;
  });

  // Summary cards use ALL data, not filtered
  const totalValue = {
    purchased: stockData.reduce((sum, item) => sum + parseFloat(item.total_purchased || 0), 0),
    sold: stockData.reduce((sum, item) => sum + parseFloat(item.total_sold || 0), 0),
    current: stockData.reduce((sum, item) => sum + parseFloat(item.current_stock || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center font-black uppercase tracking-widest text-slate-400">
          <Package className="w-12 h-12 text-slate-200 mx-auto mb-4 animate-bounce" strokeWidth={1} />
          <p className="text-lg italic">Auditing Physical Assets...</p>
          <div className="w-16 h-1 bg-slate-200 mx-auto overflow-hidden rounded-full mt-4">
             <div className="w-full h-full bg-black animate-[slide_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!company || !company.id) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-slate-900 font-black uppercase tracking-widest text-lg">Identity Verification Required</p>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Company association not detected in local context</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header - Industrial Monochrome */}
        <div className="flex justify-between items-end border-b-4 border-black pb-4 print:hidden">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{t('stockReport.title', 'Stock Report')}</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">{company.company_name} / REAL-TIME REPOSITORY AUDIT</p>
          </div>
          <button
            onClick={fetchStockReport}
            className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-lg hover:bg-slate-800 font-black shadow-2xl transition-all active:scale-95 uppercase tracking-widest text-xs"
          >
            <RefreshCcw size={18} strokeWidth={3} className={loading ? 'animate-spin' : ''} />
            {t('common.refresh', 'Sync Inventory')}
          </button>
        </div>

        {/* Stats Cards - Sharp Grayscale */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-900 group hover:bg-slate-900 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">Live Inventory Qty</p>
                <p className="text-4xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white underline decoration-slate-100 decoration-4 underline-offset-8">
                  {formatNumber(totalValue.current)}
                </p>
              </div>
              <Package size={24} className="text-slate-200 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-500 group hover:bg-slate-800 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">Gross Procurement</p>
                <p className="text-3xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white">
                   <span className="text-slate-400 mr-2 opacity-50">+</span>{formatNumber(totalValue.purchased)}
                </p>
              </div>
              <Plus size={24} className="text-slate-200 group-hover:text-white transition-colors" strokeWidth={3} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-400 group hover:bg-slate-700 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">Fulfilled Sales</p>
                <p className="text-3xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white">
                   <span className="text-slate-300 mr-2 opacity-50">-</span>{formatNumber(totalValue.sold)}
                </p>
              </div>
              <TrendingDown size={24} className="text-slate-200 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-red-600 group hover:bg-red-900 transition-all duration-300">
            <div className="flex justify-between items-start relative overflow-hidden">
               <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-full -mr-8 -mt-8 group-hover:scale-[3] transition-transform duration-700"></div>
              <div className="relative z-10">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-red-300">Critical Reorder Levels</p>
                <p className="text-4xl font-black text-red-600 mt-1 tracking-tighter group-hover:text-white italic">
                  {lowStockData.length}
                </p>
              </div>
              <AlertTriangle size={24} className="text-red-200 group-hover:text-white transition-colors relative z-10" />
            </div>
          </div>
        </div>

        {/* Global Toolbar - Unified Grayscale */}
        <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[300px]">
             <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Global Nomenclature Search</span>
            <div className="relative group">
              <Search className="absolute left-4 top-3 text-slate-300 group-focus-within:text-black transition-colors" size={18} strokeWidth={3} />
              <input
                type="text"
                placeholder="SEARCH BY ITEM CODE OR NOMENCLATURE..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-black transition-all bg-slate-50 font-black uppercase text-xs h-11"
              />
            </div>
          </div>
          
          <div className="min-w-[200px]">
             <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Supply Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-black transition-all bg-white font-black uppercase text-xs h-11 cursor-pointer"
            >
              <option value="ALL">ALL REPOSITORY ITEMS</option>
              <option value="LOW">LOW STOCK ONLY</option>
              <option value="OK">HEALTHY STOCK LEVELS</option>
            </select>
          </div>

          <button
            onClick={fetchStockReport}
            className="px-8 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-black font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg h-11"
          >
            {t('common.execute', 'Analyze Report')}
          </button>
        </div>

        {/* Low Stock Alert Banner - Industrial Warning */}
        {lowStockData.length > 0 && (
          <div className="bg-slate-900 border-l-8 border-red-600 p-6 rounded-2xl shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full translate-x-12 -translate-y-12 blur-2xl"></div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="p-3 bg-red-600 rounded-xl text-white shadow-lg animate-pulse">
                 <AlertTriangle size={24} strokeWidth={3} />
              </div>
              <div className="flex-1">
                <p className="font-black text-white uppercase tracking-widest text-sm italic">
                  Critical Procurement Alert: {lowStockData.length} items breached reorder threshold
                </p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                  Required replenishment volume: <span className="text-red-500 underline decoration-red-900 underline-offset-4">{formatNumber(lowStockData.reduce((sum, item) => sum + item.reorder_quantity, 0))} units</span> detected across repository
                </p>
              </div>
              <button 
                 onClick={() => setFilterStatus('LOW')}
                 className="bg-white text-black px-6 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all border border-black shadow-xl"
              >
                 Isolate Threats
              </button>
            </div>
          </div>
        )}

        {/* Stock Detail Grid - High Contrast Industrial */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest italic">
                <tr>
                  <th className="px-6 py-5 text-left border-r border-slate-800">Doc. Code</th>
                  <th className="px-6 py-5 text-left border-r border-slate-800">Nomenclature</th>
                  <th className="px-6 py-5 text-left border-r border-slate-800">Class</th>
                  <th className="px-6 py-5 text-center border-r border-slate-800">Procured (+)</th>
                  <th className="px-6 py-5 text-center border-r border-slate-800">Dispatched (-)</th>
                  <th className="px-6 py-5 text-center border-r border-slate-800">Returns</th>
                  <th className="px-6 py-5 text-center border-r border-slate-800 bg-black">Live Stock</th>
                  <th className="px-6 py-5 text-center border-r border-slate-800">Threshold</th>
                  <th className="px-6 py-5 text-center border-r border-slate-800">Status Vector</th>
                  <th className="px-6 py-5 text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-24 text-center text-slate-300 font-black uppercase tracking-[0.4em] italic">
                      NO REPOSITORY DATA DETECTED
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-black text-slate-400 tracking-tighter uppercase">{item.item_code}</td>
                      <td className="px-6 py-4 font-black text-slate-900 uppercase tracking-tight">{item.item_name}</td>
                      <td className="px-6 py-4 text-[10px] text-slate-400 font-black uppercase tracking-widest">{item.category || 'N/A'}</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-800">+{formatNumber(item.total_purchased)}</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-400 italic">-{formatNumber(item.total_sold)}</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-300">{formatNumber(item.total_sale_returned)}</td>
                      <td className={`px-6 py-4 text-center font-black text-[13px] bg-slate-50 group-hover:bg-slate-100 transition-colors ${item.stock_status === 'LOW' ? 'text-red-700 underline decoration-red-200 underline-offset-4' : 'text-black'}`}>
                        {formatNumber(item.current_stock)}
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-slate-400 font-bold opacity-50">{formatNumber(item.reorder_level)}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border-2 ${
                            item.stock_status === 'LOW'
                              ? 'bg-red-50 text-red-800 border-red-800 shadow-sm animate-pulse'
                              : 'bg-white text-slate-900 border-slate-900'
                          }`}
                        >
                          {item.stock_status === 'LOW' ? 'INSUFFICIENT' : 'SUFFICIENT'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            fetchItemHistory(item.id);
                          }}
                          className="flex items-center gap-1.5 mx-auto p-2 bg-slate-100 hover:bg-black hover:text-white rounded-lg transition-all active:scale-90 border border-slate-200"
                        >
                           <History size={16} strokeWidth={2.5} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Registry Summary Footer */}
        <div className="flex justify-between items-center text-slate-400 font-black uppercase tracking-widest text-[9px] border-t-2 border-slate-100 pt-6">
          <p className="italic underline decoration-slate-200 underline-offset-8">REPOSITORY SCAN COMPLETE: {filteredData.length} OF {stockData.length} NOMENCLATURES ISOLATED</p>
          <div className="flex gap-4">
             <span>SYS_AUTH_ID: {company.id}</span>
             <span className="text-slate-200">•</span>
             <span>TIMESTAMP: {new Date().toISOString()}</span>
          </div>
        </div>
      </div>

      {/* Audit History Modal - High Contrast Industrial Control */}
      {showHistory && selectedItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-700">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase italic">Inventory Audit Logs</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Nomenclature Tracking: {selectedItem.item_code}</p>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="bg-slate-800 hover:bg-red-600 text-white p-2 rounded-xl transition-all active:scale-90"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center gap-4 group">
               <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-200 scale-100 group-hover:scale-105 transition-transform duration-500">
                  <Package className="text-slate-900" size={32} strokeWidth={1} />
               </div>
               <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">{selectedItem.item_name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">CURRENT POS: <span className="text-black ml-1">{formatNumber(selectedItem.current_stock)} UNITS</span></p>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 pt-4">
              {itemHistory.length === 0 ? (
                <div className="text-center py-20 text-slate-300 font-black uppercase tracking-widest text-sm italic">NO TRANSACTION DATA LOGGED</div>
              ) : (
                <div className="rounded-xl border-2 border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 uppercase tracking-widest font-black text-slate-400 text-[9px]">
                      <tr>
                        <th className="px-4 py-3 text-left">Timeline</th>
                        <th className="px-4 py-3 text-left">Vector</th>
                        <th className="px-4 py-3 text-center">In (+)</th>
                        <th className="px-4 py-3 text-center">Out (-)</th>
                        <th className="px-4 py-3 text-right">Manifest ID</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-50">
                      {itemHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-500">
                            {new Date(record.transaction_date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.1em] border ${
                                record.transaction_type === 'PURCHASE_IN'
                                  ? 'bg-white text-slate-900 border-slate-900'
                                  : record.transaction_type === 'SALE_OUT'
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}
                            >
                              {record.transaction_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-900 font-black italic">
                            {record.quantity_in ? formatNumber(record.quantity_in) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-400 font-bold">
                            {record.quantity_out ? formatNumber(record.quantity_out) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-300 font-black uppercase italic text-[10px]">
                            {record.reference_no}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-slate-900 border-t border-black flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 font-black uppercase text-[9px] tracking-widest">
                 <div className="w-2 h-2 bg-slate-700 rounded-full animate-ping"></div>
                 Real-time audit active
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="px-10 py-3 bg-white text-black rounded-xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-50 transition-all active:scale-95 shadow-xl"
              >
                Deactivate Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
