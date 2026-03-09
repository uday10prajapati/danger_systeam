import React, { useState, useEffect } from 'react';
import { Plus, Edit2, AlertCircle, Search, Filter, CheckCircle, XCircle, TrendingUp, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import ItemRateForm from '../components/ItemRateForm';

export default function ItemRate() {
  const { t } = useTranslation();
  const [company, setCompany] = useState(null);
  const [rates, setRates] = useState([]);
  const [filteredRates, setFilteredRates] = useState([]);
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [priceHistory, setPriceHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const companyData = localStorage.getItem('company');
    if (companyData) {
      const parsedCompany = JSON.parse(companyData);
      setCompany(parsedCompany);
      fetchRates(parsedCompany.id);
      fetchItems(parsedCompany.id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchRates = async (companyId) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/item-rates/company/${companyId}`, {
        headers: { 'x-company-id': companyId }
      });
      if (res.data.success) {
        setRates(res.data.data);
        applyFilters(res.data.data, searchTerm, selectedStatus);
      }
    } catch (err) {
      console.error('Fetch rates error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (companyId) => {
    try {
      const res = await axios.get(`/api/items/company/${companyId}`, {
        headers: { 'x-company-id': companyId }
      });
      if (res.data.success) {
        setItems(res.data.data);
      }
    } catch (err) {
      console.error('Fetch items error:', err);
    }
  };

  const fetchPriceHistory = async (itemId) => {
    try {
      const res = await axios.get(`/api/item-rates/history/${itemId}`, {
        headers: { 'x-company-id': company.id }
      });
      if (res.data.success) {
        setPriceHistory(res.data.data);
        setShowHistory(true);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    }
  };

  const applyFilters = (ratesToFilter, search, status) => {
    let filtered = ratesToFilter;

    if (search) {
      filtered = filtered.filter(rate =>
        rate.item_name.toLowerCase().includes(search.toLowerCase()) ||
        rate.item_code.toLowerCase().includes(search.toLowerCase()) ||
        rate.barcode.includes(search)
      );
    }

    if (status === 'active') {
      filtered = filtered.filter(rate => rate.is_active === 1);
    } else if (status === 'inactive') {
      filtered = filtered.filter(rate => rate.is_active === 0);
    }

    setFilteredRates(filtered);
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    applyFilters(rates, term, selectedStatus);
  };

  const handleStatusFilter = (status) => {
    setSelectedStatus(status);
    applyFilters(rates, searchTerm, status);
  };

  const handleEdit = (rate) => {
    setEditingRate(rate);
    setShowForm(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingRate) {
        // Update existing rate
        await axios.put(`/api/item-rates/${editingRate.id}`, formData, {
          headers: { 'x-company-id': company.id }
        });
      } else {
        // Create new rate
        await axios.post('/api/item-rates', formData, {
          headers: { 'x-company-id': company.id }
        });
      }
      setShowForm(false);
      setEditingRate(null);
      fetchRates(company.id);
    } catch (err) {
      console.error('Form submit error:', err);
    }
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg mb-4">{t('itemRate.noCompanyFound')}</p>
          <a
            href="/company"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('common.goToCompanySetup')}
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
            <h1 className="text-3xl font-bold text-slate-900">{t('itemRate.title')}</h1>
            <p className="text-slate-600 mt-1">{company?.company_name}</p>
          </div>
          <button
            onClick={() => {
              setEditingRate(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('itemRate.addRate')}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-slate-600 text-sm font-medium">{t('itemRate.totalRates')}</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{rates.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-slate-600 text-sm font-medium">{t('itemRate.activeRates')}</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{rates.filter(r => r.is_active === 1).length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-slate-600 text-sm font-medium">{t('itemRate.itemsWithPricing')}</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{new Set(rates.filter(r => r.is_active === 1).map(r => r.item_id)).size}</p>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <ItemRateForm
                rate={editingRate}
                items={items}
                company={company}
                onSubmit={handleFormSubmit}
                onClose={() => {
                  setShowForm(false);
                  setEditingRate(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Price History Modal */}
        {showHistory && priceHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
                <h2 className="text-xl font-bold text-slate-900">{t('itemRate.priceHistory')}</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-slate-500 hover:text-slate-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {priceHistory.map((history, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-slate-900">
                          {new Date(history.effective_from).toLocaleDateString()}
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          history.status === 'Active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {history.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-600">Purchase Rate</p>
                          <p className="text-slate-900 font-semibold">₹{parseFloat(history.purchase_rate).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Sale Rate</p>
                          <p className="text-slate-900 font-semibold">₹{parseFloat(history.sale_rate).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Margin</p>
                          <p className="text-slate-900 font-semibold">
                            {((history.sale_rate - history.purchase_rate) / history.purchase_rate * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={t('itemRate.searchByItemNameCodeOrBarcode')}
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-slate-700">{t('itemRate.status')}:</span>
            {['all', 'active', 'inactive'].map(status => (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  selectedStatus === status
                    ? status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : status === 'inactive'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t(`itemRate.${status}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Rates Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-600">{t('common.loading')}</p>
            </div>
          ) : filteredRates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <TrendingUp className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-600 text-lg">{t('itemRate.noRates')}</p>
              <p className="text-slate-500 text-sm mt-2">{t('itemRate.createFirstItemRate')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">{t('itemRate.itemName')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">{t('itemRate.itemCode')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">{t('itemRate.purchaseRate')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">{t('itemRate.saleRate')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">{t('itemRate.margin')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">{t('itemRate.mrp')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">{t('itemRate.effectiveFrom')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">{t('itemRate.status')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRates.map(rate => {
                    const margin = ((rate.sale_rate - rate.purchase_rate) / rate.purchase_rate * 100).toFixed(1);
                    return (
                      <tr key={rate.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-900 font-medium">{rate.item_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">{rate.item_code}</td>
                        <td className="px-6 py-4 text-sm text-slate-900 font-semibold">₹{parseFloat(rate.purchase_rate).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-slate-900 font-semibold">₹{parseFloat(rate.sale_rate).toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            parseFloat(margin) > 30 ? 'bg-green-100 text-green-700' :
                            parseFloat(margin) > 15 ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {margin}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">₹{rate.mrp ? parseFloat(rate.mrp).toFixed(2) : '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(rate.effective_from).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {rate.is_active ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span>{t('itemRate.active')}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-600">
                              <XCircle className="w-4 h-4" />
                              <span>{t('itemRate.inactive')}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm space-y-1">
                          <button
                            onClick={() => fetchPriceHistory(rate.item_id)}
                            className="block w-full px-2 py-1 text-blue-600 hover:bg-blue-50 rounded text-xs font-medium"
                          >
                            {t('itemRate.history')}
                          </button>
                          <button
                            onClick={() => handleEdit(rate)}
                            className="block w-full px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded text-xs font-medium flex items-center justify-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            {t('common.edit')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
