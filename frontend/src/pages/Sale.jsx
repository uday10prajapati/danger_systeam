import React, { useState, useEffect } from 'react';
import { Plus, Search, Eye, Printer } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import SaleForm from '../components/SaleForm';

export default function Sale() {
  const { t } = useTranslation();
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const company = JSON.parse(localStorage.getItem('company')) || {};

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );

      if (response.data.success) {
        setSales(response.data.data);
        applyFilters(response.data.data);
      }
    } catch (error) {
      console.error('Fetch sales error:', error);
    }
  };

  const applyFilters = (salesData = sales) => {
    const filtered = salesData.filter(sale =>
      sale.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customer_name && sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredSales(filtered);
  };

  const viewSaleDetails = async (saleId) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/sales/${saleId}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );

      if (response.data.success) {
        setSelectedSale(response.data.data);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Get sale details error:', error);
    }
  };

  const handleFormSubmit = (newSale) => {
    setShowForm(false);
    fetchSales();
  };

  const calculateStats = () => {
    const totalSales = filteredSales.length;
    const totalAmount = filteredSales.reduce((sum, s) => sum + (parseFloat(s.net_amount) || 0), 0);
    const totalItems = filteredSales.reduce((sum, s) => sum + (parseInt(s.item_count) || 0), 0);
    const uniqueCustomers = new Set(filteredSales.map(s => s.customer_name)).size;

    return { totalSales, totalAmount, totalItems, uniqueCustomers };
  };

  const stats = calculateStats();

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{t('sale.sale', 'Sale')}</h1>
          <p className="text-gray-600">{company.company_name}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
        >
          <Plus size={20} />
          {t('sale.createSale', 'Create Sale')}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-600">
          <p className="text-gray-600 text-sm">{t('sale.totalSales', 'Total Sales')}</p>
          <p className="text-3xl font-bold text-blue-600">{stats.totalSales}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-600">
          <p className="text-gray-600 text-sm">{t('sale.totalAmount', 'Total Amount')}</p>
          <p className="text-2xl font-bold text-green-600">₹{stats.totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-600">
          <p className="text-gray-600 text-sm">{t('sale.totalItems', 'Total Items')}</p>
          <p className="text-3xl font-bold text-orange-600">{stats.totalItems}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-600">
          <p className="text-gray-600 text-sm">{t('sale.uniqueCustomers', 'Unique Customers')}</p>
          <p className="text-3xl font-bold text-purple-600">{stats.uniqueCustomers}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-lg shadow-md flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('sale.searchInvoice', 'Search by invoice or customer...')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              applyFilters();
            }}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-600"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="px-4 py-2 border rounded-lg"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="px-4 py-2 border rounded-lg"
          />
          <button
            onClick={fetchSales}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            {t('sale.filter', 'Filter')}
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b-2 border-gray-300">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">#</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">{t('sale.customer', 'Customer')}</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">{t('sale.items', 'Items')}</th>
              <th className="px-6 py-3 text-right font-semibold text-gray-700">{t('sale.amount', 'Amount')}</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">{t('sale.payment', 'Payment')}</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-700">{t('sale.date', 'Date')}</th>
              <th className="px-6 py-3 text-center font-semibold text-gray-700">{t('sale.action', 'Action')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  {t('sale.noData', 'No sales found')}
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr key={sale.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold text-blue-600">{sale.invoice_no}</td>
                  <td className="px-6 py-4">{sale.customer_name}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {sale.item_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-green-600">₹{parseFloat(sale.net_amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded text-sm font-semibold ${
                      sale.payment_type === 'credit'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {sale.payment_type.charAt(0).toUpperCase() + sale.payment_type.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sale.invoice_date}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => viewSaleDetails(sale.id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                      title={t('sale.view', 'View')}
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

      {/* Sale Details Modal */}
      {showDetails && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b bg-linear-to-r from-blue-600 to-blue-700 text-white">
              <h3 className="text-xl font-bold">{selectedSale.invoice_no}</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-2xl hover:bg-blue-800 p-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">{t('sale.invoiceDate', 'Invoice Date')}</p>
                  <p className="font-semibold">{selectedSale.invoice_date}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">{t('sale.customer', 'Customer')}</p>
                  <p className="font-semibold">{selectedSale.customer_name}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">{t('sale.paymentType', 'Payment Type')}</p>
                  <p className="font-semibold capitalize">{selectedSale.payment_type}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">{t('sale.createdBy', 'Created By')}</p>
                  <p className="font-semibold">{selectedSale.created_by_user}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">{t('sale.items', 'Items')}</h4>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-center">Qty</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((item) => (
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
                  <span className="text-gray-600">{t('sale.subtotal', 'Subtotal')}</span>
                  <span className="font-semibold">₹{parseFloat(selectedSale.total_amount || 0).toFixed(2)}</span>
                </div>
                {parseFloat(selectedSale.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>{t('sale.discount', 'Discount')}</span>
                    <span className="font-semibold">-₹{parseFloat(selectedSale.discount_amount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-green-600 border-t pt-2">
                  <span>{t('sale.netAmount', 'Net Amount')}</span>
                  <span>₹{parseFloat(selectedSale.net_amount || 0).toFixed(2)}</span>
                </div>
              </div>

              {selectedSale.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600">{t('sale.notes', 'Notes')}</p>
                  <p className="text-gray-800">{selectedSale.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sale Form Modal */}
      {showForm && <SaleForm onSubmit={handleFormSubmit} onCancel={() => setShowForm(false)} />}
    </div>
  );
}
