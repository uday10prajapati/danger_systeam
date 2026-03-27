import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { AlertTriangle, TrendingDown, Package, Plus } from 'lucide-react';

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

  const company = JSON.parse(localStorage.getItem('company')) || {};

  useEffect(() => {
    if (!company.id) {
      console.error('Company ID not found in localStorage');
      setLoading(false);
      return;
    }
    fetchStockReport();
  }, []);

  const fetchStockReport = async () => {
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
      alert('Failed to load stock report');
    } finally {
      setLoading(false);
    }
  };

  const fetchItemHistory = async (itemId) => {
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
      alert('Failed to load item history');
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
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-liar-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Stock Report</h1>
          <p className="text-gray-600">Real-time inventory overview</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">CURRENT STOCK</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {formatNumber(totalValue.current)}
                </p>
              </div>
              <Package className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">TOTAL PURCHASED</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {formatNumber(totalValue.purchased)}
                </p>
              </div>
              <Plus className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">TOTAL SOLD</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {formatNumber(totalValue.sold)}
                </p>
              </div>
              <TrendingDown className="text-red-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">LOW STOCK ITEMS</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  {lowStockData.length}
                </p>
              </div>
              <AlertTriangle className="text-orange-500" size={32} />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by item code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Items</option>
              <option value="LOW">Low Stock Only</option>
              <option value="OK">In Stock</option>
            </select>

            <button
              onClick={fetchStockReport}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              Refresh Report
            </button>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockData.length > 0 && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-8 rounded">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-orange-500" size={24} />
              <div>
                <p className="font-semibold text-orange-800">
                  {lowStockData.length} item(s) need reordering
                </p>
                <p className="text-sm text-orange-700">
                  Total reorder quantity: {formatNumber(lowStockData.reduce((sum, item) => sum + item.reorder_quantity, 0))} units
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stock Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Item Code
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Purchased
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Sold
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Returned
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Reorder Level
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                      No items found
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                        {item.item_code}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {item.item_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.category || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-green-600 font-semibold">
                        +{formatNumber(item.total_purchased)}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-red-600 font-semibold">
                        -{formatNumber(item.total_sold)}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-blue-600 font-semibold">
                        +{formatNumber(item.total_sale_returned)}
                      </td>
                      <td className="px-6 py-4 text-sm text-center font-bold text-gray-800">
                        {formatNumber(item.current_stock)}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-600">
                        {formatNumber(item.reorder_level)}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            item.stock_status === 'LOW'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {item.stock_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            fetchItemHistory(item.id);
                          }}
                          className="text-blue-500 hover:text-blue-700 font-semibold transition"
                        >
                          View History
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-6 text-gray-600 text-sm">
          <p>Showing {filteredData.length} of {stockData.length} items</p>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Stock History</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 mt-2">
                {selectedItem.item_code} - {selectedItem.item_name}
              </p>
            </div>

            <div className="p-6">
              {itemHistory.length === 0 ? (
                <p className="text-gray-500">No transaction history found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Type</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-700">Qty In</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-700">Qty Out</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-700">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemHistory.map((record) => (
                        <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-2">
                            {new Date(record.transaction_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                record.transaction_type === 'PURCHASE_IN'
                                  ? 'bg-green-100 text-green-800'
                                  : record.transaction_type === 'SALE_OUT'
                                  ? 'bg-red-100 text-red-800'
                                  : record.transaction_type === 'SALE_RETURN'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}
                            >
                              {record.transaction_type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center text-green-600 font-semibold">
                            {record.quantity_in ? formatNumber(record.quantity_in) : '-'}
                          </td>
                          <td className="px-4 py-2 text-center text-red-600 font-semibold">
                            {record.quantity_out ? formatNumber(record.quantity_out) : '-'}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-600">
                            {record.reference_no}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowHistory(false)}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
