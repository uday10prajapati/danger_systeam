import React, { useState, useEffect } from 'react';
import { Plus, Edit2, AlertCircle, Search, Filter, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import ItemForm from '../components/ItemForm';

export default function ItemMaster() {
  const { t } = useTranslation();
  const [company, setCompany] = useState(null);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const companyData = localStorage.getItem('company');
    if (companyData) {
      const parsedCompany = JSON.parse(companyData);
      setCompany(parsedCompany);
      fetchItems(parsedCompany.id);
      fetchCategories(parsedCompany.id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchItems = async (companyId) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/items/company/${companyId}`);
      if (res.data.success) {
        setItems(res.data.data);
        applyFilters(res.data.data, searchTerm, selectedCategory, selectedStatus);
      }
    } catch (err) {
      console.error('Fetch items error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (companyId) => {
    try {
      const res = await axios.get(`/api/items/categories/${companyId}`);
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  };

  const applyFilters = (itemsToFilter, search, category, status) => {
    let filtered = itemsToFilter;

    if (search) {
      filtered = filtered.filter(item =>
        item.item_name.toLowerCase().includes(search.toLowerCase()) ||
        item.item_code.toLowerCase().includes(search.toLowerCase()) ||
        item.barcode.includes(search)
      );
    }

    if (category !== 'all') {
      filtered = filtered.filter(item => item.category === category);
    }

    if (status === 'active') {
      filtered = filtered.filter(item => item.is_active === 1);
    } else if (status === 'inactive') {
      filtered = filtered.filter(item => item.is_active === 0);
    }

    setFilteredItems(filtered);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    applyFilters(items, value, selectedCategory, selectedStatus);
  };

  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    applyFilters(items, searchTerm, category, selectedStatus);
  };

  const handleStatusFilter = (status) => {
    setSelectedStatus(status);
    applyFilters(items, searchTerm, selectedCategory, status);
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    setEditingItem(null);
    if (company?.id) {
      fetchItems(company.id);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleActivate = async (item) => {
    try {
      await axios.post(`/api/items/${item.id}/activate`, {}, {
        headers: { 'x-company-id': company.id }
      });
      fetchItems(company.id);
    } catch (err) {
      console.error('Activate error:', err);
    }
  };

  const handleDeactivate = async (item) => {
    try {
      await axios.post(`/api/items/${item.id}/deactivate`, {}, {
        headers: { 'x-company-id': company.id }
      });
      fetchItems(company.id);
    } catch (err) {
      console.error('Deactivate error:', err);
    }
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center space-y-6">
          <AlertCircle className="w-16 h-16 text-slate-400 mx-auto" />
          <div>
            <p className="text-slate-600 font-medium mb-2">{t('itemMaster.noCompanyFound')}</p>
            <p className="text-slate-500 text-sm mb-4">Please go to Company page and select a company first</p>
            <a 
              href="http://localhost:5174/company" 
              className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Go to Company Setup
            </a>
          </div>
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
            <h1 className="text-3xl font-bold text-slate-900">{t('itemMaster.title')}</h1>
            <p className="text-slate-600 mt-1">{company?.company_name}</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/rates"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <DollarSign className="w-5 h-5" />
              Set Item Rates
            </a>
            <button
              onClick={() => {
                setEditingItem(null);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('itemMaster.addItem')}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-slate-600 text-sm font-medium">{t('itemMaster.totalItems')}</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{items.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-slate-600 text-sm font-medium">{t('itemMaster.activeItems')}</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{items.filter(i => i.is_active === 1).length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-slate-600 text-sm font-medium">{t('itemMaster.categories')}</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{categories.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-slate-600 text-sm font-medium">{t('itemMaster.inactiveItems')}</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{items.filter(i => i.is_active === 0).length}</p>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
              <ItemForm
                item={editingItem}
                company={company}
                onSubmit={handleFormSubmit}
                onClose={() => {
                  setShowForm(false);
                  setEditingItem(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={t('itemMaster.searchByName')}
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">{t('itemMaster.status')}:</span>
              </div>
              <button
                onClick={() => handleStatusFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  selectedStatus === 'all'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t('common.all')}
              </button>
              <button
                onClick={() => handleStatusFilter('active')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  selectedStatus === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t('itemMaster.active')}
              </button>
              <button
                onClick={() => handleStatusFilter('inactive')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  selectedStatus === 'inactive'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t('itemMaster.inactive')}
              </button>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-slate-700">{t('itemMaster.category')}:</span>
                <button
                  onClick={() => handleCategoryFilter('all')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t('common.all')}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      selectedCategory === cat
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-600">{t('common.loading')}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-600">{t('itemMaster.noItems')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">{t('itemMaster.itemName')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">{t('itemMaster.itemCode')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">{t('itemMaster.barcode')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">{t('itemMaster.category')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">{t('itemMaster.unit')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">{t('itemMaster.tax')} (%)</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">{t('itemMaster.status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.item_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <span className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-mono">
                          {item.item_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-mono">{item.barcode}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.category || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.unit}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{(parseFloat(item.tax_percentage) || 0).toFixed(2)}%</td>
                      <td className="px-6 py-4 text-sm">
                        {item.is_active ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span>{t('itemMaster.active')}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span>{t('itemMaster.inactive')}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm space-y-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="block w-full px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded text-xs font-medium flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          {t('common.edit')}
                        </button>
                        {item.is_active ? (
                          <button
                            onClick={() => handleDeactivate(item)}
                            className="block w-full px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs font-medium"
                          >
                            {t('itemMaster.deactivate')}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(item)}
                            className="block w-full px-2 py-1 text-green-600 hover:bg-green-50 rounded text-xs font-medium"
                          >
                            {t('itemMaster.activate')}
                          </button>
                        )}
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
