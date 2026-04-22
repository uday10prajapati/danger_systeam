import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, Search, AlertCircle, CheckCircle, BarChart3, Database, Activity, LayoutGrid, ScanLine, X, Download, Trash2, DatabaseZap } from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';

export default function BarcodeScannerPage() {
  const { t } = useTranslation();
  const [scannedItems, setScannedItems] = useState([]);
  const [itemsWithoutBarcode, setItemsWithoutBarcode] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [stats, setStats] = useState({ total: 0, withBarcode: 0, withoutBarcode: 0 });
  const [activeTab, setActiveTab] = useState('scan'); // scan or manage
  const [company, setCompany] = useState(null);

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    if (company?.id) {
      fetchStats();
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

  const fetchStats = async () => {
    try {
      setLoading(true);
      const itemsResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/items/company/${company.id}?active=true`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );

      const stockResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/stock-report`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );

      if (itemsResponse.data.success && stockResponse.data.success) {
        const items = itemsResponse.data.data || [];
        const stockData = stockResponse.data.data || [];
        
        const stockMap = {};
        stockData.forEach(stock => {
          stockMap[stock.id] = stock.current_stock || 0;
        });

        const itemsWithStock = items.map(item => ({
          ...item,
          current_stock: stockMap[item.id] !== undefined ? stockMap[item.id] : 0
        }));

        const withBarcode = itemsWithStock.filter(item => item.barcode).length;
        const withoutBarcode = itemsWithStock.length - withBarcode;

        setStats({
          total: itemsWithStock.length,
          withBarcode,
          withoutBarcode
        });

        setAllItems(itemsWithStock);
        setItemsWithoutBarcode(itemsWithStock.filter(item => !item.barcode));
      }
    } catch (error) {
      console.error('Fetch items error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = (item) => {
    const newScannedItem = {
      id: item.id,
      item_code: item.item_code,
      item_name: item.item_name,
      barcode: item.barcode,
      current_stock: item.current_stock,
      sale_rate: item.sale_rate,
      timestamp: new Date().toLocaleTimeString()
    };

    setScannedItems([newScannedItem, ...scannedItems]);
    setSuccessMessage(`✓ ${item.item_name} isolation complete`);
    setTimeout(() => setSuccessMessage(''), 3000);
    setErrorMessage('');
  };

  const handleScanError = (error) => {
    setErrorMessage(`✗ ${error}`);
    setTimeout(() => setErrorMessage(''), 3000);
    setSuccessMessage('');
  };

  const clearScannedItems = () => {
    setScannedItems([]);
  };

  const exportScannedData = () => {
    const csv = [
      ['Item Code', 'Item Name', 'Barcode', 'Stock', 'Rate', 'Timestamp'],
      ...scannedItems.map(item => [
        item.item_code,
        item.item_name,
        item.barcode,
        item.current_stock,
        item.sale_rate,
        item.timestamp
      ])
    ]
      .map(row => row.join(','))
      .join('\n');

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `scanned_items_${Date.now()}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!company?.id) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 font-sans">
        <div className="text-center p-12 bg-white rounded-2xl shadow-2xl max-w-md border-4 border-black">
          <DatabaseZap className="w-16 h-16 text-slate-900 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter italic">Identity Failure</h2>
          <p className="text-slate-500 mb-8 font-bold uppercase tracking-widest text-[10px]">Active company context not detected in secure session buffer.</p>
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
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Barcode Control Interface</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">{company.company_name} / REAL-TIME NOMENCLATURE SCANNER</p>
          </div>
          <ScanLine size={32} className="text-slate-200" strokeWidth={1} />
        </div>

        {/* Stats Cards - Sharp Grayscale */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-900 group hover:bg-slate-900 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">Repository Density</p>
                <p className="text-4xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white underline decoration-slate-100 decoration-4 underline-offset-8">
                  {stats.total}
                </p>
              </div>
              <Database size={24} className="text-slate-200 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-500 group hover:bg-slate-800 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">Monitized Vectors</p>
                <p className="text-4xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white">
                  {stats.withBarcode}
                </p>
              </div>
              <CheckCircle size={24} className="text-slate-200 group-hover:text-white transition-colors" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-red-600 group hover:bg-red-900 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-red-300">Unassigned NOMENCLATURE</p>
                <p className="text-4xl font-black text-red-600 mt-1 tracking-tighter group-hover:text-white italic">
                  {stats.withoutBarcode}
                </p>
              </div>
              <AlertCircle size={24} className="text-red-200 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        {/* Tab Interface - Unified Industrial */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
          <div className="flex bg-slate-100 p-2 border-b-2 border-slate-200">
            <button
              onClick={() => setActiveTab('scan')}
              className={`flex-1 py-4 px-6 text-center font-black uppercase tracking-widest text-[10px] transition-all rounded-2xl ${
                activeTab === 'scan'
                  ? 'bg-black text-white shadow-xl italic'
                  : 'text-slate-400 hover:text-black hover:bg-white/50'
              }`}
            >
              Live Registry Injection
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`flex-1 py-4 px-6 text-center font-black uppercase tracking-widest text-[10px] transition-all rounded-2xl ${
                activeTab === 'manage'
                  ? 'bg-black text-white shadow-xl italic'
                  : 'text-slate-400 hover:text-black hover:bg-white/50'
              }`}
            >
              Repository Manifest Control
            </button>
          </div>

          {/* Scanner Tab Content */}
          {activeTab === 'scan' && (
            <div className="p-10 space-y-10">
              {/* Message Banners */}
              <div className="flex flex-col gap-4">
                 {successMessage && (
                  <div className="p-4 bg-black text-white rounded-xl border-l-[1rem] border-white font-black uppercase tracking-widest text-[10px] flex items-center gap-3 animate-in fade-in duration-300">
                    <CheckCircle size={18} strokeWidth={3} />
                    {successMessage}
                  </div>
                )}
                {errorMessage && (
                  <div className="p-4 bg-red-900 text-white rounded-xl border-l-[1rem] border-red-500 font-black uppercase tracking-widest text-[10px] flex items-center gap-3 animate-in fade-in duration-300">
                    <AlertCircle size={18} strokeWidth={3} />
                    {errorMessage}
                  </div>
                )}
              </div>

              {/* Heavy Scanner Input Module */}
              <div className="bg-slate-50 border-4 border-slate-100 p-10 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-200/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-4 mb-6 relative z-10 italic">
                   <ScanLine size={16} strokeWidth={3} /> SENSORY INPUT FIELD
                </h4>
                
                <div className="relative z-10">
                  <BarcodeScanner
                    companyId={company.id}
                    onScanSuccess={handleScanSuccess}
                    onScanError={handleScanError}
                    autoFocus={true}
                    placeholder="AWAITING SYSTEM SCAN OR MANUAL OVERRIDE..."
                    className="w-full h-20 bg-white border-2 border-slate-200 rounded-3xl px-8 text-xl font-black italic tracking-tighter uppercase focus:border-black transition-all outline-none shadow-inner"
                  />
                  <div className="mt-6 flex items-center gap-4 text-slate-400 font-bold uppercase tracking-widest text-[9px] italic">
                     <div className="w-2 h-2 bg-slate-900 rounded-full animate-ping"></div>
                     Optical injection buffer ready for processing
                  </div>
                </div>
              </div>

              {/* Scanned Items Record - Industrial Grid */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">
                    Isolation Stream <span className="text-slate-300 ml-2">[{scannedItems.length} OBJECTS]</span>
                  </h2>
                  <div className="flex gap-3">
                    {scannedItems.length > 0 && (
                      <>
                        <button
                          onClick={exportScannedData}
                          className="px-6 py-2.5 bg-slate-100 hover:bg-black hover:text-white text-black rounded-xl font-black uppercase tracking-widest text-[10px] transition-all border-2 border-slate-200 shadow-sm flex items-center gap-2"
                        >
                          <Download size={14} strokeWidth={3} /> Export Manifest
                        </button>
                        <button
                          onClick={clearScannedItems}
                          className="px-6 py-2.5 bg-white hover:bg-red-600 hover:text-white text-slate-400 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all border-2 border-slate-100 shadow-sm flex items-center gap-2"
                        >
                          <Trash2 size={14} strokeWidth={3} /> Flush Buffer
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {scannedItems.length === 0 ? (
                  <div className="text-center py-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl opacity-40">
                    <DatabaseZap className="w-16 h-16 text-slate-200 mx-auto mb-6" strokeWidth={1} />
                    <p className="font-black text-slate-300 uppercase tracking-[0.4em] italic text-xs">Awaiting Primary Optical Stream</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-xl">
                    <table className="w-full">
                      <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest italic">
                        <tr>
                          <th className="px-6 py-5 text-left border-r border-slate-800">Doc. Code</th>
                          <th className="px-6 py-5 text-left border-r border-slate-800">Nomenclature</th>
                          <th className="px-6 py-5 text-left border-r border-slate-800">Optical Pattern</th>
                          <th className="px-6 py-5 text-center border-r border-slate-800">Inventory Pool</th>
                          <th className="px-6 py-5 text-right border-r border-slate-800">Final Yield</th>
                          <th className="px-6 py-5 text-right">Time Hash</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {scannedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4 font-black text-slate-400 tracking-tighter uppercase">{item.item_code}</td>
                            <td className="px-6 py-4 font-black text-slate-900 uppercase tracking-tight">{item.item_name}</td>
                            <td className="px-6 py-4 text-[10px] text-slate-400 font-mono font-bold tracking-widest italic">{item.barcode}</td>
                            <td className="px-6 py-4 text-center">
                              <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase border-2 ${
                                item.current_stock > 0 
                                  ? 'bg-white text-black border-black'
                                  : 'bg-red-50 text-red-800 border-red-800 animate-pulse'
                              }`}>
                                {item.current_stock}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-[13px] bg-slate-50 group-hover:bg-slate-100 transition-colors italic">
                              ₹{parseFloat(item.sale_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-300 text-[10px]">{item.timestamp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manage Tab Content */}
          {activeTab === 'manage' && (
            <div className="p-10 space-y-10">
              {/* Search Toolbar */}
              <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-2xl">
                 <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Global Registry Search</span>
                 <div className="relative group">
                    <Search className="absolute left-4 top-3 text-slate-300 group-focus-within:text-black transition-colors" size={18} strokeWidth={3} />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="ISOLATE OBJECTS BY NOMENCLATURE OR UNIQUE ID..."
                      className="w-full pl-12 pr-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-black transition-all font-black uppercase text-xs h-12"
                    />
                 </div>
              </div>

              {/* Critical Attention Module */}
              <div className="bg-red-50 border-2 border-red-100 rounded-[2rem] p-10 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                 <div className="relative z-10">
                    <div className="flex items-center gap-6 mb-8 pb-6 border-b border-red-100">
                      <div className="p-4 bg-red-900 rounded-2xl text-white shadow-xl animate-pulse">
                         <AlertCircle size={24} strokeWidth={3} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-red-900 uppercase italic tracking-tighter">Manifest Fault Detect</h3>
                        <p className="text-[10px] font-bold text-red-700/60 uppercase tracking-widest mt-1">
                          {itemsWithoutBarcode.length} Object(s) missing unique optical pattern association
                        </p>
                      </div>
                    </div>

                    {itemsWithoutBarcode.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {itemsWithoutBarcode
                          .filter(item =>
                            item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-red-100 group hover:bg-white hover:border-red-900 transition-all">
                              <div>
                                <p className="text-[9px] font-black text-red-900/40 uppercase tracking-widest mb-0.5">{item.item_code}</p>
                                <p className="text-xs font-black text-slate-900 uppercase tracking-tight group-hover:italic">{item.item_name}</p>
                              </div>
                              <button className="p-2 bg-red-900 text-white rounded-lg hover:bg-black transition-all active:scale-90 shadow-lg">
                                <Plus size={16} strokeWidth={3} />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                 </div>
              </div>

              {/* Total Registry View */}
              <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic border-b-2 border-slate-100 pb-4">
                  Full Nomenclature Repository <span className="text-slate-300 ml-2">[{allItems.length} ALL_TIME]</span>
                </h3>
                <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-xl">
                  <table className="w-full">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest italic border-b-2 border-slate-100">
                      <tr>
                        <th className="px-6 py-5 text-left border-r border-slate-100">System ID</th>
                        <th className="px-6 py-5 text-left border-r border-slate-100">Nomenclature</th>
                        <th className="px-6 py-5 text-left border-r border-slate-100">Pattern Manifest</th>
                        <th className="px-6 py-5 text-center border-r border-slate-100">Classification</th>
                        <th className="px-6 py-5 text-right">Pool Stk.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {allItems
                        .filter(item =>
                          item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.barcode && item.barcode.includes(searchTerm))
                        )
                        .map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4 border-r border-slate-50 font-black text-slate-400 uppercase tracking-widest text-[10px]">{item.item_code}</td>
                            <td className="px-6 py-4 border-r border-slate-50 font-black text-slate-900 uppercase tracking-tight group-hover:italic">{item.item_name}</td>
                            <td className="px-6 py-4 border-r border-slate-50">
                               <span className={`px-3 py-1 rounded-md font-mono text-[10px] font-bold border ${item.barcode ? 'bg-slate-900 text-white border-black' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                                  {item.barcode || 'PATTERN_NULL'}
                               </span>
                            </td>
                            <td className="px-6 py-4 text-center border-r border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.category || 'N/A'}</td>
                            <td className="px-6 py-4 text-right font-black text-slate-900 italic font-mono">₹{item.current_stock || 0}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global Registry Summary Footer */}
        <div className="flex justify-between items-center text-slate-400 font-black uppercase tracking-widest text-[8px] italic pt-12 pb-10 border-t border-slate-200">
           <div className="flex items-center gap-4">
              <span>SCANNER_MODE: OPTICAL_V3_ISOLATION</span>
              <div className="w-1 h-1 bg-slate-100 rounded-full"></div>
              <span>REGISTRY_AUTH: VERIFIED_CORE</span>
           </div>
           <div>SYSTEM_CHRONO: {new Date().toISOString()}</div>
        </div>

      </div>
    </div>
  );
}
