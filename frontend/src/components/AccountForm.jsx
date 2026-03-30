import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function AccountForm({ companyId, initialData = null, onSuccess, onCancel }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(initialData || {
    account_name: '',
    account_type: 'customer',
    phone: '',
    email: '',
    gst_no: '',
    tin_no: '',
    opening_balance: 0
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const accountTypes = [
    { value: 'assets', label: t('accountMaster.assets') },
    { value: 'liabilities', label: t('accountMaster.liabilities') },
    { value: 'capital', label: t('accountMaster.capital') },
    { value: 'revenue', label: t('accountMaster.revenue') },
    { value: 'expense', label: t('accountMaster.expense') },
    { value: 'customer', label: t('accountMaster.customer') },
    { value: 'supplier', label: t('accountMaster.supplier') },
    { value: 'cash', label: t('accountMaster.cash') },
    { value: 'bank', label: t('accountMaster.bank') }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'opening_balance' ? parseFloat(value) || 0 : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.account_name || formData.account_name.trim().length < 2) {
      newErrors.account_name = t('accountMaster.accountNameRequired');
    }

    if (!formData.account_type) {
      newErrors.account_type = t('accountMaster.accountTypeRequired');
    }

    if (formData.phone && !/^[0-9\s\-\+\(\)]{7,20}$/.test(formData.phone)) {
      newErrors.phone = t('accountMaster.invalidPhone');
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('accountMaster.invalidEmail');
    }

    if (formData.gst_no && !/^[0-9A-Z]{15}$/.test(formData.gst_no.trim())) {
      newErrors.gst_no = t('accountMaster.invalidGST');
    }

    if (formData.tin_no && !/^[0-9]{11}$/.test(formData.tin_no.trim())) {
      newErrors.tin_no = t('accountMaster.invalidTIN');
    }

    if (formData.opening_balance < 0) {
      newErrors.opening_balance = t('accountMaster.openingBalanceNonNegative');
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const submitData = {
        company_id: companyId,
        ...formData
      };

      if (initialData?.id) {
        // Update account
        await axios.put(`/api/accounts/${initialData.id}`, formData);
        setMessage({ type: 'success', text: t('accountMaster.accountUpdatedSuccess') });
      } else {
        // Create account
        await axios.post('/api/accounts', submitData);
        setMessage({ type: 'success', text: t('accountMaster.accountCreatedSuccess') });
        setFormData({
          account_name: '',
          account_type: 'customer',
          phone: '',
          email: '',
          gst_no: '',
          tin_no: '',
          opening_balance: 0
        });
      }

      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || t('accountMaster.failedToSaveAccount')
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        {initialData?.id ? t('accountMaster.editAccount') : t('accountMaster.createAccount')}
      </h3>

      {message && (
        <div className={`mb-4 p-3 rounded-lg flex gap-2 ${
          message.type === 'error' 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('accountMaster.accountName')} *
          </label>
          <input
            type="text"
            name="account_name"
            value={formData.account_name}
            onChange={handleChange}
            placeholder={t('accountMaster.accountNamePlaceholder')}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.account_name ? 'border-red-500' : 'border-slate-300'
            }`}
            disabled={loading}
          />
          {errors.account_name && (
            <p className="mt-1 text-sm text-red-600">{errors.account_name}</p>
          )}
        </div>

        {/* Account Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('accountMaster.accountType')} *
          </label>
          <select
            name="account_type"
            value={formData.account_type}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.account_type ? 'border-red-500' : 'border-slate-300'
            }`}
            disabled={loading || initialData?.id}
          >
            {accountTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.account_type && (
            <p className="mt-1 text-sm text-red-600">{errors.account_type}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('accountMaster.phone')}
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder={t('accountMaster.phonePlaceholder')}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.phone ? 'border-red-500' : 'border-slate-300'
            }`}
            disabled={loading}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('accountMaster.email')}
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={t('accountMaster.emailPlaceholder')}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-slate-300'
            }`}
            disabled={loading}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* GST Number */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('accountMaster.gstNumber')} {t('accountMaster.optional')}
          </label>
          <input
            type="text"
            name="gst_no"
            value={formData.gst_no}
            onChange={handleChange}
            placeholder="15-digit GSTIN (e.g., 27AABCT1234A1Z5)"
            maxLength="15"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
              errors.gst_no ? 'border-red-500' : 'border-slate-300'
            }`}
            disabled={loading}
          />
          {errors.gst_no && (
            <p className="mt-1 text-sm text-red-600">{errors.gst_no}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">15 alphanumeric characters</p>
        </div>

        {/* TIN Number */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('accountMaster.tinNumber')} {t('accountMaster.optional')} {t('accountMaster.legacy')}
          </label>
          <input
            type="text"
            name="tin_no"
            value={formData.tin_no}
            onChange={handleChange}
            placeholder="11-digit TIN (Legacy taxation number)"
            maxLength="11"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.tin_no ? 'border-red-500' : 'border-slate-300'
            }`}
            disabled={loading}
          />
          {errors.tin_no && (
            <p className="mt-1 text-sm text-red-600">{errors.tin_no}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">11 digits only</p>
        </div>

        {/* Opening Balance */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('accountMaster.openingBalance')}
          </label>
          <input
            type="number"
            name="opening_balance"
            value={formData.opening_balance}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.opening_balance ? 'border-red-500' : 'border-slate-300'
            }`}
            disabled={loading}
          />
          {errors.opening_balance && (
            <p className="mt-1 text-sm text-red-600">{errors.opening_balance}</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
          >
            {loading ? t('accountMaster.saving') : t('accountMaster.save')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors"
          >
            {t('accountMaster.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
