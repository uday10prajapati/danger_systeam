import React, { useState, useEffect } from 'react';
import { Plus, AlertCircle, Search, Filter, CheckCircle, Calendar, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import PurchaseForm from '../components/PurchaseForm';

export default function Purchase() {
  const { t } = useTranslation();
  const [company, setCompany] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState(null);
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
        fetchPurchases(response.data.data.id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
    }
  };

  // Fetch purchases
  const fetchPurchases = async (companyId, startDate, endDate) => {
    try {
      setLoading(true);
      const start = startDate || dateRange.startDate;
      const end = endDate || dateRange.endDate;
      
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/purchases`, {
        params: {
          startDate: start,
          endDate: end
        },
        headers: { 'x-company-id': companyId }
      });
      
      if (res.data.success) {
        setPurchases(res.data.data);
        applyFilters(res.data.data, searchTerm);
      }
    } catch (err) {
      console.error('Fetch purchases error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply search filter
  const applyFilters = (purchasesToFilter, search) => {
    let filtered = purchasesToFilter;

    if (search) {
      filtered = filtered.filter(purchase =>
        purchase.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
        purchase.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
        purchase.account_code?.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredPurchases(filtered);
  };

  // Handle search
  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    applyFilters(purchases, term);
  };

  // Handle date range change
  const handleDateChange = (field, value) => {
    const newRange = { ...dateRange, [field]: value };
    setDateRange(newRange);
    if (company) {
      fetchPurchases(company.id, newRange.startDate, newRange.endDate);
    }
  };

  // View purchase details
  const viewPurchaseDetails = async (purchaseId) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/purchases/${purchaseId}`, {
        headers: { 'x-company-id': company.id }
      });
      if (res.data.success) {
        setSelectedPurchase(res.data.data);
        setShowDetails(true);
      }
    } catch (err) {
      console.error('Fetch purchase details error:', err);
    }
  };

  // Handle form completion
  const handleFormSubmit = (data) => {
    setShowForm(false);
    if (company) {
      fetchPurchases(company.id);
    }
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg mb-4">No company selected</p>
          <a
            href="/company"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Company Setup
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('purchase.purchase')}</h1>
            <p className="text-slate-600 mt-1">{company?.company_name}</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('purchase.createNewPurchase')}
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <PurchaseForm
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Purchase Details Modal */}
        {showDetails && selectedPurchase && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-4 border-b">
                <h2 className="text-2xl font-bold text-slate-900">
                  {t('purchase.purchaseNo')} {selectedPurchase.invoice_no}
                </h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-slate-500 hover:text-slate-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">{t('purchase.supplier')}</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {selectedPurchase.supplier_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">{t('purchase.invoiceDate')}</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {new Date(selectedPurchase.invoice_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">{t('purchase.createdBy')}</p>
                    <p className="text-slate-900">{selectedPurchase.created_by_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">{t('purchase.createdDate')}</p>
                    <p className="text-slate-900">
                      {new Date(selectedPurchase.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">{t('purchase.purchaseItems')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 px-3 font-semibold text-slate-700">{t('purchase.itemName')}</th>
                          <th className="text-center py-2 px-3 font-semibold text-slate-700">{t('purchase.qty')}</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700">{t('purchase.rate')}</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700">{t('purchase.amount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPurchase.items?.map((item) => (
                          <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-3">
                              <p className="font-medium text-slate-900">{item.item_name}</p>
                              <p className="text-xs text-slate-500">{item.item_code}</p>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {item.quantity} {item.unit_name}
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-slate-900">
                              ₹{parseFloat(item.purchase_rate).toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-indigo-600">
                              ₹{parseFloat(item.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Total */}
                  <div className="flex justify-end mt-4 pt-4 border-t border-slate-200">
                    <div className="w-64">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-700">{t('purchase.totalItems')}:</span>
                        <span className="font-medium">{selectedPurchase.items?.length || 0}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg font-bold text-indigo-600 bg-indigo-50 p-3 rounded-lg">
                        <span>{t('purchase.grandTotal')}:</span>
                        <span>₹{parseFloat(selectedPurchase.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedPurchase.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">{t('purchase.notes')}</h3>
                    <p className="text-slate-700 p-3 bg-slate-50 rounded-lg">
                      {selectedPurchase.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-slate-600 text-sm font-medium">{t('purchase.totalPurchases')}</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{purchases.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-slate-600 text-sm font-medium">{t('purchase.totalAmount')}</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ₹{purchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-slate-600 text-sm font-medium">{t('purchase.totalItems')}</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {purchases.reduce((sum, p) => sum + (p.item_count || 0), 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-slate-600 text-sm font-medium">Suppliers</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {new Set(purchases.map(p => p.supplier_account_id)).size}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={t('purchase.searchByInvoiceOrSupplier')}
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('purchase.fromDate')}</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('purchase.toDate')}</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Purchases Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-600">{t('common.loading')}</p>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <TrendingUp className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-600 text-lg">{t('purchase.noPurchasesFound')}</p>
              <p className="text-slate-500 text-sm mt-2">{t('purchase.createYourFirstPurchase')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-6 font-semibold text-slate-700">{t('purchase.invoiceNo')}</th>
                    <th className="text-left py-3 px-6 font-semibold text-slate-700">{t('purchase.supplier')}</th>
                    <th className="text-center py-3 px-6 font-semibold text-slate-700">{t('purchase.items')}</th>
                    <th className="text-right py-3 px-6 font-semibold text-slate-700">{t('purchase.amount')}</th>
                    <th className="text-center py-3 px-6 font-semibold text-slate-700">{t('purchase.invoiceDate')}</th>
                    <th className="text-center py-3 px-6 font-semibold text-slate-700">{t('common.update')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((purchase) => (
                    <tr key={purchase.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="py-3 px-6">
                        <p className="font-semibold text-slate-900">{purchase.invoice_no}</p>
                      </td>
                      <td className="py-3 px-6">
                        <p className="text-slate-700">{purchase.supplier_name}</p>
                        <p className="text-xs text-slate-500">{purchase.account_code}</p>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {purchase.item_count}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <p className="font-bold text-indigo-600">
                          ₹{parseFloat(purchase.total_amount).toFixed(2)}
                        </p>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span className="flex items-center justify-center gap-1 text-slate-600">
                          <Calendar className="w-4 h-4" />
                          {new Date(purchase.invoice_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <button
                          onClick={() => viewPurchaseDetails(purchase.id)}
                          className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                        >
                          {t('purchase.view')}
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
