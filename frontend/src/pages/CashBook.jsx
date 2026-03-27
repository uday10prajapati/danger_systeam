import React, { useState, useEffect } from 'react';
import { Plus, Search, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export default function CashBook() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [balance, setBalance] = useState({ total_cash_in: 0, total_cash_out: 0, current_balance: 0 });
  const [dailySummary, setDailySummary] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    cash_in: 0,
    cash_out: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const company = JSON.parse(localStorage.getItem('company')) || {};

  useEffect(() => {
    fetchCashBook();
    fetchBalance();
  }, []);

  const fetchCashBook = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/cash-book?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setEntries(response.data.data);
        applyFilters(response.data.data);
        fetchDailySummary();
      }
    } catch (err) {
      setError('Failed to fetch cash book');
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/cash-book/balance/current`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setBalance(response.data.data);
      }
    } catch (err) {
      console.error('Fetch balance error:', err);
    }
  };

  const fetchDailySummary = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/cash-book/summary/daily?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setDailySummary(response.data.data);
      }
    } catch (err) {
      console.error('Fetch daily summary error:', err);
    }
  };

  const applyFilters = (entriesData = entries) => {
    const filtered = entriesData.filter(entry =>
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reference_no.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEntries(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (!formData.description) {
        setError('Description is required');
        setLoading(false);
        return;
      }

      if (formData.cash_in === 0 && formData.cash_out === 0) {
        setError('Enter cash in or cash out amount');
        setLoading(false);
        return;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/cash-book/manual`,
        {
          transaction_date: formData.transaction_date,
          description: formData.description,
          cash_in: parseFloat(formData.cash_in) || 0,
          cash_out: parseFloat(formData.cash_out) || 0,
          notes: formData.notes
        },
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );

      if (response.data.success) {
        setSuccess('Cash entry added successfully!');
        setFormData({
          transaction_date: new Date().toISOString().split('T')[0],
          description: '',
          cash_in: 0,
          cash_out: 0,
          notes: ''
        });
        setTimeout(() => {
          setShowForm(false);
          fetchCashBook();
          fetchBalance();
          setSuccess('');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add entry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [searchTerm]);

  const handleDateChange = () => {
    fetchCashBook();
    fetchBalance();
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Cash Book</h1>
          <p className="text-gray-600">{company.company_name}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
        >
          <Plus size={20} />
          Add Manual Entry
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-600">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-sm font-medium">Cash In</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                ₹{parseFloat(balance.total_cash_in || 0).toFixed(2)}
              </p>
            </div>
            <TrendingUp className="text-green-600" size={28} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-600">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-sm font-medium">Cash Out</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                ₹{parseFloat(balance.total_cash_out || 0).toFixed(2)}
              </p>
            </div>
            <TrendingDown className="text-red-600" size={28} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-600">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-sm font-medium">Current Balance</p>
              <p className={`text-3xl font-bold mt-2 ${
                parseFloat(balance.current_balance) >= 0 ? 'text-blue-600' : 'text-red-600'
              }`}>
                ₹{parseFloat(balance.current_balance || 0).toFixed(2)}
              </p>
            </div>
            <DollarSign className="text-blue-600" size={28} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-600">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Entries</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{filteredEntries.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Summary */}
      {dailySummary.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-bold mb-4">Daily Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-right">Cash In</th>
                  <th className="px-4 py-2 text-right">Cash Out</th>
                  <th className="px-4 py-2 text-right">Net</th>
                  <th className="px-4 py-2 text-center">Txns</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dailySummary.map((day) => (
                  <tr key={day.transaction_date} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{new Date(day.transaction_date).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-right text-green-600 font-semibold">
                      ₹{parseFloat(day.daily_in || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600 font-semibold">
                      ₹{parseFloat(day.daily_out || 0).toFixed(2)}
                    </td>
                    <td className={`px-4 py-2 text-right font-bold ${
                      parseFloat(day.daily_net) >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      ₹{parseFloat(day.daily_net || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-center">{day.transaction_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by description or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">From Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              onBlur={handleDateChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">To Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              onBlur={handleDateChange}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
      </div>

      {/* Cash Book Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Date</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Description</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Reference</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">Type</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Cash In</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Cash Out</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  No cash entries found
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-700">
                    {new Date(entry.transaction_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-gray-700">{entry.description}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{entry.reference_no}</td>
                  <td className="px-6 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      entry.reference_type === 'sale' ? 'bg-green-100 text-green-800' :
                      entry.reference_type === 'sale_return' ? 'bg-red-100 text-red-800' :
                      entry.reference_type === 'expense' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {entry.reference_type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-green-600 font-semibold">
                    {parseFloat(entry.cash_in || 0) > 0 ? `₹${parseFloat(entry.cash_in).toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-3 text-right text-red-600 font-semibold">
                    {parseFloat(entry.cash_out || 0) > 0 ? `₹${parseFloat(entry.cash_out).toFixed(2)}` : '-'}
                  </td>
                  <td className={`px-6 py-3 text-right font-bold ${
                    parseFloat(entry.net_amount) >= 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    ₹{parseFloat(entry.net_amount || 0).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Manual Entry Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="bg-linear-to-r from-green-600 to-green-700 text-white p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Add Manual Entry</h2>
              <button onClick={() => setShowForm(false)} className="text-white hover:bg-green-500 p-1 rounded">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-green-100 text-green-700 rounded">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2">Date</label>
                <input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <input
                  type="text"
                  placeholder="e.g., Office supplies, Rent payment"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Cash In</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cash_in}
                    onChange={(e) => setFormData({ ...formData, cash_in: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Cash Out</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cash_out}
                    onChange={(e) => setFormData({ ...formData, cash_out: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
