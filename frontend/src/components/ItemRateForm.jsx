import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

export default function ItemRateForm({ rate, items, company, onSubmit, onClose }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    item_id: '',
    purchase_rate: '',
    sale_rate: '',
    mrp: '',
    effective_from: new Date().toISOString().split('T')[0]
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (rate) {
      setFormData({
        item_id: rate.item_id,
        purchase_rate: rate.purchase_rate,
        sale_rate: rate.sale_rate,
        mrp: rate.mrp || '',
        effective_from: new Date(rate.effective_from).toISOString().split('T')[0]
      });
      const item = items.find(i => i.id === rate.item_id);
      setSelectedItem(item);
    }
  }, [rate, items]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors.length > 0) {
      setErrors([]);
    }

    // Update selected item when item_id changes
    if (name === 'item_id') {
      const item = items.find(i => i.id === parseInt(value));
      setSelectedItem(item);
    }
  };

  const validateForm = () => {
    const newErrors = [];

    if (!formData.item_id) {
      newErrors.push(t('itemRate.itemRequired'));
    }
    if (!formData.purchase_rate || parseFloat(formData.purchase_rate) <= 0) {
      newErrors.push(t('itemRate.purchaseRateRequired'));
    }
    if (!formData.sale_rate || parseFloat(formData.sale_rate) <= 0) {
      newErrors.push(t('itemRate.saleRateRequired'));
    }
    if (parseFloat(formData.sale_rate) < parseFloat(formData.purchase_rate)) {
      newErrors.push(t('itemRate.saleRateMustBeGreaterThanPurchaseRate'));
    }
    if (formData.mrp && parseFloat(formData.mrp) < parseFloat(formData.sale_rate)) {
      newErrors.push(t('itemRate.mrpMustBeGreaterThanOrEqualSaleRate'));
    }
    if (!formData.effective_from) {
      newErrors.push(t('itemRate.effectiveDateRequired'));
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        item_id: parseInt(formData.item_id),
        purchase_rate: parseFloat(formData.purchase_rate),
        sale_rate: parseFloat(formData.sale_rate),
        mrp: formData.mrp ? parseFloat(formData.mrp) : null,
        effective_from: formData.effective_from
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Submit error:', error);
      setErrors([error.response?.data?.message || t('itemRate.failedToSaveRate')]);
    } finally {
      setLoading(false);
    }
  };

  const activeRateForItem = selectedItem ? 
    Math.max(...items
      .filter(i => i.id === selectedItem.id)
      .map(i => i.sale_rate || 0), 0) : 0;

  const margin = formData.purchase_rate && formData.sale_rate 
    ? ((formData.sale_rate - formData.purchase_rate) / formData.purchase_rate * 100).toFixed(2)
    : '0.00';

  return (
    <form onSubmit={handleSubmit} className="divide-y divide-slate-200">
      {/* Header */}
      <div className="flex justify-between items-center p-6 bg-slate-50 border-b border-slate-200 sticky top-0">
        <h2 className="text-xl font-bold text-slate-900">
          {rate ? t('itemRate.editRate') : t('itemRate.createNewRate')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-700 text-2xl"
        >
          ×
        </button>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="p-6 bg-red-50 border-b border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 mb-2">{t('itemRate.pleaseFixErrors')}</p>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Form Body */}
      <div className="p-6 space-y-6">
        {/* Item Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t('itemRate.selectItem')} *
          </label>
          <select
            name="item_id"
            value={formData.item_id}
            onChange={handleChange}
            disabled={loading || !!rate}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
          >
            <option value="">{t('itemRate.selectItemPlaceholder')}</option>
            {items
              .filter(i => i.is_active === 1)
              .map(item => (
                <option key={item.id} value={item.id}>
                  {item.item_name} ({item.item_code})
                </option>
              ))}
          </select>
          {selectedItem && (
            <p className="text-xs text-slate-500 mt-1">
              Unit: {selectedItem.unit} | Category: {selectedItem.category}
            </p>
          )}
        </div>

        {/* Purchase Rate */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t('itemRate.purchaseRate')} *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-600 font-medium">₹</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="purchase_rate"
              value={formData.purchase_rate}
              onChange={handleChange}
              placeholder="0.00"
              disabled={loading}
              className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{t('itemRate.purchaseRateHelp')}</p>
        </div>

        {/* Sale Rate */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t('itemRate.saleRate')} *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-600 font-medium">₹</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="sale_rate"
              value={formData.sale_rate}
              onChange={handleChange}
              placeholder="0.00"
              disabled={loading}
              className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{t('itemRate.saleRateHelp')}</p>
        </div>

        {/* MRP */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t('itemRate.mrp')}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-600 font-medium">₹</span>
            <input
              type="number"
              step="0.01"
              min="0"
              name="mrp"
              value={formData.mrp}
              onChange={handleChange}
              placeholder="0.00 (Optional)"
              disabled={loading}
              className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{t('itemRate.mrpHelp')}</p>
        </div>

        {/* Effective From Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t('itemRate.effectiveFrom')} *
          </label>
          <input
            type="date"
            name="effective_from"
            value={formData.effective_from}
            onChange={handleChange}
            disabled={loading}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
          />
          <p className="text-xs text-slate-500 mt-1">{t('itemRate.effectiveFromHelp')}</p>
        </div>

        {/* Margin and Summary */}
        {formData.purchase_rate && formData.sale_rate && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-indigo-600 font-medium">{t('itemRate.profitMargin')}</p>
                <p className="text-xl font-bold text-indigo-900">{margin}%</p>
              </div>
              <div>
                <p className="text-indigo-600 font-medium">{t('itemRate.profitPerUnit')}</p>
                <p className="text-xl font-bold text-indigo-900">
                  ₹{(formData.sale_rate - formData.purchase_rate).toFixed(2)}
                </p>
              </div>
            </div>
            {parseFloat(margin) < 15 && (
              <p className="text-xs text-yellow-700 mt-3 bg-yellow-50 p-2 rounded">
                ⚠️ {t('itemRate.lowMarginWarning')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 bg-slate-50 flex gap-3 justify-end sticky bottom-0">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${
            loading
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {loading ? t('itemRate.saving') : (rate ? t('itemRate.updateRate') : t('itemRate.createRate'))}
        </button>
      </div>
    </form>
  );
}
