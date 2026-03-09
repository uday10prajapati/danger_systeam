import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import GSTSelector from './GSTSelector';

export default function ItemForm({ item = null, company, onSubmit, onClose }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    item_name: item?.item_name || '',
    item_code: item?.item_code || '',
    barcode: item?.barcode || '',
    category: item?.category || '',
    unit: item?.unit || 'pcs',
    tax_percentage: item?.tax_percentage || 0,
    reorder_level: item?.reorder_level || 0,
    sale_price: item?.sale_price || 0,
    purchase_price: item?.purchase_price || 0,
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gstData, setGstData] = useState(null);

  useEffect(() => {
    if (company?.id) {
      fetchCategories();
    }
  }, [company]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`/api/items/categories/${company.id}`);
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    
    // Auto-uppercase item_code and barcode (must be uppercase only)
    if (name === 'item_code' || name === 'barcode') {
      finalValue = value.toUpperCase();
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: name === 'tax_percentage' || name === 'reorder_level' ? (value ? parseFloat(value) : 0) : finalValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (item) {
        // Update - Cannot change item_code or barcode
        const updateData = {
          item_name: formData.item_name,
          category: formData.category,
          unit: formData.unit,
          tax_percentage: formData.tax_percentage,
          reorder_level: formData.reorder_level,
        };
        await axios.put(`http://localhost:5000/api/items/${item.id}`, updateData, {
          headers: { 'x-company-id': company.id }
        });
      } else {
        // Create
        await axios.post('http://localhost:5000/api/items', formData, {
          headers: { 'x-company-id': company.id }
        });
      }
      onSubmit();
    } catch (err) {
      console.error('ItemForm save error:', err.response?.data);
      setError(err.response?.data?.error || err.response?.data?.message || 'Error saving item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          {item ? t('itemMaster.editItem') : t('itemMaster.createItem')}
        </h3>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('itemMaster.itemName')} *
            </label>
            <input
              type="text"
              name="item_name"
              value={formData.item_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t('itemMaster.enterItemName')}
            />
          </div>

          {/* Item Code (SKU) - Read-only on edit */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('itemMaster.itemCode')} (SKU) *
            </label>
            <input
              type="text"
              name="item_code"
              value={formData.item_code}
              onChange={handleChange}
              required
              disabled={!!item}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              placeholder={t('itemMaster.enterItemCode')}
            />
          </div>

          {/* Barcode - Read-only on edit */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('itemMaster.barcode')} *
            </label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              required
              disabled={!!item}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              placeholder={t('itemMaster.enterBarcode')}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('itemMaster.category')}
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              list="category-list"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t('itemMaster.enterCategory')}
            />
            <datalist id="category-list">
              {categories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('itemMaster.unit')} *
            </label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select Unit --</option>
              <optgroup label="Weight">
                <option value="kg">Kilogram (kg)</option>
                <option value="gm">Gram (gm)</option>
              </optgroup>
              <optgroup label="Volume">
                <option value="liter">Liter (liter)</option>
                <option value="ml">Milliliter (ml)</option>
              </optgroup>
              <optgroup label="Count">
                <option value="unit">Unit</option>
                <option value="number">Number</option>
              </optgroup>
              <optgroup label="Packaging">
                <option value="box">Box</option>
                <option value="dozen">Dozen</option>
              </optgroup>
            </select>
          </div>

          {/* Price Fields */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              💰 Sale Price (₹) *
            </label>
            <input
              type="number"
              name="sale_price"
              value={formData.sale_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter selling price"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              📦 Purchase Price (₹)
            </label>
            <input
              type="number"
              name="purchase_price"
              value={formData.purchase_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter cost price (optional)"
            />
          </div>

          {/* Reorder Level */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              🛍️ {t('itemMaster.taxPercentage')} - Select GST Rate (%)
            </label>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {[0, 5, 12, 18, 28].map(gst => (
                <button
                  key={gst}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, tax_percentage: gst }))}
                  className={`px-3 py-2 rounded-lg font-semibold transition ${
                    formData.tax_percentage === gst
                      ? 'bg-indigo-600 text-white border-2 border-indigo-700'
                      : 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:border-indigo-500'
                  }`}
                >
                  {gst}%
                </button>
              ))}
            </div>
            <input
              type="number"
              name="tax_percentage"
              value={formData.tax_percentage}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.01"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Or enter custom tax percentage"
            />
          </div>

          {/* GST Breakdown Preview - Always visible */}
          <div className="col-span-2 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
            <h4 className="font-bold text-gray-800 mb-3 text-lg">
              📊 GST Breakdown (Selected: {formData.tax_percentage}%)
            </h4>
            <GSTSelector
              amount={100}
              isIntraState={true}
              showBreakdown={true}
              onGSTChange={(data) => setGstData(data)}
            />
            <div className="mt-4 p-3 bg-white rounded border border-blue-100">
              <p className="text-sm font-semibold text-gray-700">💡 How this works:</p>
              <ul className="text-xs text-gray-600 mt-2 space-y-1">
                <li>• <strong>Intra-State Sale:</strong> CGST {formData.tax_percentage / 2}% + SGST {formData.tax_percentage / 2}%</li>
                <li>• <strong>Inter-State Sale:</strong> IGST {formData.tax_percentage}%</li>
                <li>• <strong>Example:</strong> On ₹100 sale @ {formData.tax_percentage}%, tax = ₹{formData.tax_percentage}</li>
              </ul>
            </div>
          </div>

          {/* Reorder Level */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('itemMaster.reorderLevel')}
            </label>
            <input
              type="number"
              name="reorder_level"
              value={formData.reorder_level}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? t('common.saving') : (item ? t('common.update') : t('common.create'))}
          </button>
        </div>
      </form>
    </div>
  );
}
