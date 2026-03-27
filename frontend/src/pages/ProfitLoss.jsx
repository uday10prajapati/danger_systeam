import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';

export default function ProfitLoss() {
  const { t } = useTranslation();
  const [plData, setPlData] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState('summary'); // summary or monthly

  const company = JSON.parse(localStorage.getItem('company')) || {};

  // Set default dates (current month)
  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (!company.id) {
      setLoading(false);
      return;
    }
    if (startDate && endDate) {
      fetchProfitLoss();
    }
  }, [startDate, endDate]);

  const fetchProfitLoss = async () => {
    try {
      setLoading(true);
      console.log('Fetching P&L for:', company.id, startDate, endDate);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/profit-loss`, {
        params: { startDate, endDate },
        headers: { 'x-company-id': company.id, 'x-user-id': 1 }
      });

      console.log('P&L Response:', response.data);
      if (response.data.success) {
        setPlData(response.data.data);
      } else {
        console.error('P&L fetch failed:', response.data);
        setPlData(null);
      }
    } catch (error) {
      console.error('Error fetching P&L:', error);
      alert('Failed to load Profit & Loss data: ' + error.message);
      setPlData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      const year = new Date(startDate).getFullYear();
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/profit-loss/monthly/${year}`, {
        headers: { 'x-company-id': company.id, 'x-user-id': 1 }
      });

      if (response.data.success) {
        setMonthlyData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching monthly P&L:', error);
    }
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return parseFloat(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Profit & Loss Account</h1>
          <p className="text-gray-600">Financial performance overview</p>
        </div>

        {/* View Mode Selector */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex gap-4 items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                viewMode === 'summary'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => {
                setViewMode('monthly');
                fetchMonthlyData();
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                viewMode === 'monthly'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Monthly
            </button>
          </div>

          <div className="flex-1">
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'summary' && !plData && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No transaction data available for the selected period</p>
            <p className="text-gray-500 text-sm mt-2">Try selecting a different date range with sales or purchase transactions</p>
          </div>
        )}

        {viewMode === 'summary' && plData && (
          <>
            {/* Summary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Net Sales</p>
                    <p className="text-2xl font-bold text-green-600 mt-2">
                      ₹{formatCurrency(plData.revenue.netSales)}
                    </p>
                  </div>
                  <TrendingUp className="text-green-500" size={32} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">COGS</p>
                    <p className="text-2xl font-bold text-orange-600 mt-2">
                      ₹{formatCurrency(plData.costOfGoodsSold.netCostOfGoodsSold)}
                    </p>
                  </div>
                  <DollarSign className="text-orange-500" size={32} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Gross Profit</p>
                    <p className="text-2xl font-bold text-blue-600 mt-2">
                      ₹{formatCurrency(plData.grossProfit)}
                    </p>
                  </div>
                  <PieChart className="text-blue-500" size={32} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold">Net Profit</p>
                    <p
                      className={`text-2xl font-bold mt-2 ${
                        plData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      ₹{formatCurrency(plData.netProfit)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Margin: {plData.profitMargin}%</p>
                  </div>
                  <TrendingDown className={plData.netProfit >= 0 ? 'text-green-500' : 'text-red-500'} size={32} />
                </div>
              </div>
            </div>

            {/* P&L Statement */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Profit & Loss Statement
                <span className="text-sm font-normal text-gray-500 ml-4">
                  {startDate} to {endDate}
                </span>
              </h2>

              <div className="space-y-6">
                {/* Revenue Section */}
                <div className="border-b-2 pb-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Revenue</h3>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sales Revenue</span>
                      <span className="font-semibold text-gray-800">
                        ₹{formatCurrency(plData.revenue.totalSalesRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span className="text-gray-600">Less: Sales Returns</span>
                      <span className="font-semibold">₹({formatCurrency(plData.revenue.salesReturns)})</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2 font-bold text-green-600">
                      <span>Net Sales Revenue</span>
                      <span>₹{formatCurrency(plData.revenue.netSales)}</span>
                    </div>
                  </div>
                </div>

                {/* Cost of Goods Sold Section */}
                <div className="border-b-2 pb-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Cost of Goods Sold</h3>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Purchase Cost</span>
                      <span className="font-semibold text-gray-800">
                        ₹{formatCurrency(plData.costOfGoodsSold.purchaseCost)}
                      </span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span className="text-gray-600">Less: Purchase Returns</span>
                      <span className="font-semibold">₹({formatCurrency(plData.costOfGoodsSold.purchaseReturns)})</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2 font-bold text-orange-600">
                      <span>Net Cost of Goods Sold</span>
                      <span>₹{formatCurrency(plData.costOfGoodsSold.netCostOfGoodsSold)}</span>
                    </div>
                  </div>
                </div>

                {/* Gross Profit Section */}
                <div className="border-b-2 pb-4 bg-blue-50 p-4 rounded">
                  <div className="flex justify-between font-bold text-lg text-blue-700">
                    <span>Gross Profit</span>
                    <span>₹{formatCurrency(plData.grossProfit)}</span>
                  </div>
                </div>

                {/* Operating Expenses */}
                <div className="border-b-2 pb-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Operating Expenses</h3>
                  <div className="ml-4">
                    <div className="flex justify-between text-red-600">
                      <span className="text-gray-600">Total Operating Expenses</span>
                      <span className="font-semibold">₹({formatCurrency(plData.operatingExpenses)})</span>
                    </div>
                  </div>
                </div>

                {/* Net Profit Section */}
                <div className={`p-4 rounded-lg ${plData.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div
                    className={`flex justify-between font-bold text-xl ${
                      plData.netProfit >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    <span>{plData.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</span>
                    <span>₹{formatCurrency(plData.netProfit)}</span>
                  </div>
                  <div className={`text-sm mt-2 ${plData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Profit Margin: {plData.profitMargin}%
                  </div>
                </div>

                {/* Sales Summary by Type */}
                {plData.salesByType && plData.salesByType.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Sales Summary by Type</h3>
                    <div className="space-y-2 ml-4">
                      {plData.salesByType.map((sale, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="text-gray-600 capitalize">
                            {sale.payment_type} Sales ({sale.transaction_count} transactions)
                          </span>
                          <span className="font-semibold text-gray-800">
                            ₹{formatCurrency(sale.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {viewMode === 'monthly' && monthlyData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Monthly Profit & Loss Analysis</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Net Sales</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">COGS</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Gross Profit</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((month, idx) => (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold text-gray-700">{monthNames[month.month - 1]}</td>
                      <td className="text-right py-3 px-4 text-gray-800">₹{formatCurrency(month.netSales)}</td>
                      <td className="text-right py-3 px-4 text-gray-800">₹{formatCurrency(month.netCOGS)}</td>
                      <td className="text-right py-3 px-4 font-semibold text-green-600">
                        ₹{formatCurrency(month.grossProfit)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {month.netSales > 0
                          ? ((month.grossProfit / month.netSales) * 100).toFixed(2)
                          : '0'}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'monthly' && monthlyData.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No transaction data available for the selected period</p>
          </div>
        )}
      </div>
    </div>
  );
}
