import React, { useState, useEffect } from 'react';
import { Plus, Eye, Search, Printer } from 'lucide-react';
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
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const company = JSON.parse(localStorage.getItem('company')) || {};

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/sale-returns?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
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
        `http://localhost:5000/api/sale-returns/${returnId}`,
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

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Sale Returns</h1>
          <p className="text-gray-600">{company.company_name}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold"
        >
          <Plus size={20} />
          Create Return
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-600">
          <p className="text-gray-600 text-sm font-medium">Total Returns</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.totalReturns}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-600">
          <p className="text-gray-600 text-sm font-medium">Total Return Amount</p>
          <p className="text-2xl font-bold text-red-600 mt-2">₹{parseFloat(stats.totalAmount).toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-600">
          <p className="text-gray-600 text-sm font-medium">Items Returned</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.totalItems}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-600">
          <p className="text-gray-600 text-sm font-medium">Unique Customers</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.uniqueCustomers}</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Search by return no or customer</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">From Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              onBlur={() => fetchReturns()}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">To Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              onBlur={() => fetchReturns()}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">#</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Customer</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Items</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Amount</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Type</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Date</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredReturns.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  No returns found
                </td>
              </tr>
            ) : (
              filteredReturns.map((ret) => (
                <tr key={ret.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-semibold text-gray-700">{ret.return_no}</td>
                  <td className="px-6 py-3 text-gray-700">{ret.customer_name}</td>
                  <td className="px-6 py-3 text-center text-gray-700">{ret.item_count}</td>
                  <td className="px-6 py-3 text-right font-semibold text-red-600">
                    ₹{parseFloat(ret.total_return_amount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      ret.refund_type === 'cash' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {ret.refund_type === 'cash' ? 'Cash' : 'Credit'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-700">
                    {new Date(ret.return_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => viewReturnDetails(ret.id)}
                      className="text-orange-600 hover:text-orange-800 font-semibold flex items-center gap-1 mx-auto"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {showDetails && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-linear-to-r from-orange-600 to-orange-700 text-white p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Return Details: {selectedReturn.return_no}</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-white hover:bg-orange-500 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Return Date</p>
                  <p className="font-semibold">{new Date(selectedReturn.return_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-semibold">{selectedReturn.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Refund Type</p>
                  <p className="font-semibold">{selectedReturn.refund_type === 'cash' ? 'Cash Refund' : 'Credit to Account'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created By</p>
                  <p className="font-semibold">{selectedReturn.created_by_user || 'N/A'}</p>
                </div>
              </div>

              {selectedReturn.notes && (
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm font-semibold text-blue-900">Notes</p>
                  <p className="text-blue-800">{selectedReturn.notes}</p>
                </div>
              )}

              {/* Items Table */}
              <div>
                <h3 className="font-semibold mb-3">Returned Items</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReturn.items?.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="px-3 py-2">{item.item_name}</td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">₹{parseFloat(item.sale_rate || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-semibold">₹{parseFloat(item.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2 text-right">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Return:</span>
                  <span className="font-semibold">₹{parseFloat(selectedReturn.total_return_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-red-600 border-t pt-2">
                  <span>Refund Amount:</span>
                  <span>₹{parseFloat(selectedReturn.refund_amount || 0).toFixed(2)}</span>
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
