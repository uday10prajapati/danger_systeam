import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, Search, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react';
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

  const company = JSON.parse(localStorage.getItem('company')) || {};

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      // Fetch items with basic info
      const itemsResponse = await axios.get(
        `http://localhost:5000/api/items/company/${company.id}?active=true`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );

      // Fetch stock report to get current_stock
      const stockResponse = await axios.get(
        `http://localhost:5000/api/stock-report`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );

      if (itemsResponse.data.success && stockResponse.data.success) {
        const items = itemsResponse.data.data || [];
        const stockData = stockResponse.data.data || [];
        
        // Create a map of stock info by item_id for quick lookup
        const stockMap = {};
        stockData.forEach(stock => {
          stockMap[stock.id] = stock.current_stock || 0;
        });

        // Merge stock data into items
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
    // Add to scanned items list
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
    setSuccessMessage(`✓ ${item.item_name} scanned successfully`);
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

  if (!company.id) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-gray-600 text-lg mb-4">Company information not found</p>
          <p className="text-gray-500">Please log in again</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Barcode Scanner</h1>
          <p className="text-gray-600">Scan and manage product barcodes</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Total Items</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.total}</p>
              </div>
              <BarChart3 className="text-blue-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">With Barcode</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.withBarcode}</p>
              </div>
              <CheckCircle className="text-green-500" size={40} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Without Barcode</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{stats.withoutBarcode}</p>
              </div>
              <AlertCircle className="text-orange-500" size={40} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('scan')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition ${
                activeTab === 'scan'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Live Scanner
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition ${
                activeTab === 'manage'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Manage Barcodes
            </button>
          </div>

          {/* Scanner Tab */}
          {activeTab === 'scan' && (
            <div className="p-6">
              {/* Messages */}
              {successMessage && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
                  <CheckCircle size={20} />
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
                  <AlertCircle size={20} />
                  {errorMessage}
                </div>
              )}

              {/* Barcode Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Scanner Input (Auto-focus)
                </label>
                <BarcodeScanner
                  companyId={company.id}
                  onScanSuccess={handleScanSuccess}
                  onScanError={handleScanError}
                  autoFocus={true}
                  placeholder="Ready to scan... Scan barcode or enter code + Press Enter"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Tip: Connect a barcode scanner or manually type barcode + Enter
                </p>
              </div>

              {/* Scanned Items List */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    Scanned Items ({scannedItems.length})
                  </h2>
                  <div className="flex gap-2">
                    {scannedItems.length > 0 && (
                      <>
                        <button
                          onClick={exportScannedData}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition"
                        >
                          Export CSV
                        </button>
                        <button
                          onClick={clearScannedItems}
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {scannedItems.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No items scanned yet</p>
                    <p className="text-gray-400 text-sm mt-2">Start scanning to see items here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Code</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Barcode</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Stock</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Rate</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scannedItems.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-3 px-4 font-semibold text-gray-800">{item.item_code}</td>
                            <td className="py-3 px-4 text-gray-700">{item.item_name}</td>
                            <td className="py-3 px-4 text-gray-600 font-mono text-sm">{item.barcode}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                item.current_stock > 0 
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {item.current_stock}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-gray-800">
                              ₹{parseFloat(item.sale_rate || 0).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-600 text-sm">{item.timestamp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manage Tab */}
          {activeTab === 'manage' && (
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Search Items</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by item code or name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-orange-900 mb-3">Items Without Barcode</h3>
                <p className="text-sm text-orange-700 mb-4">
                  {itemsWithoutBarcode.length} item(s) don't have barcodes assigned
                </p>

                {itemsWithoutBarcode.length === 0 ? (
                  <p className="text-green-700 text-sm">✓ All items have barcodes!</p>
                ) : (
                  <div className="space-y-2">
                    {itemsWithoutBarcode
                      .filter(item =>
                        item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded border border-orange-200">
                          <div>
                            <p className="font-semibold text-gray-800">{item.item_code}</p>
                            <p className="text-sm text-gray-600">{item.item_name}</p>
                          </div>
                          <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-semibold transition">
                            Add Barcode
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* All Items with Barcodes Table */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">All Items ({allItems.length})</h3>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full bg-white">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Item Code</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Item Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Barcode</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Category</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allItems.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-gray-500">
                            No items found
                          </td>
                        </tr>
                      ) : (
                        allItems
                          .filter(item =>
                            item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (item.barcode && item.barcode.includes(searchTerm))
                          )
                          .map((item) => (
                            <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-gray-800">{item.item_code}</td>
                              <td className="py-3 px-4 text-gray-700">{item.item_name}</td>
                              <td className="py-3 px-4 font-mono text-sm bg-gray-50 p-2 rounded border border-gray-200">{item.barcode || '—'}</td>
                              <td className="py-3 px-4 text-center text-gray-600 text-sm">{item.category || '—'}</td>
                              <td className="py-3 px-4 text-right font-semibold text-gray-800">{item.current_stock || 0}</td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h3 className="font-semibold text-blue-900 mb-2">Barcode Management</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>✓ Barcodes must be unique across the system</li>
                  <li>✓ Each item can have only one active barcode</li>
                  <li>✓ Barcode format: UPC-A, UPC-E, EAN-13, Code128, etc.</li>
                  <li>✓ Use barcode scanner in Sale → Create Sale for POS operations</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
