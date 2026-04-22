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
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showBalanceDetails, setShowBalanceDetails] = useState(false);

  const accountTypes = [
    { value: 'assets', label: t('accountMaster.assets') },
    { value: 'liabilities', label: t('accountMaster.liabilities') },
    { value: 'capital', label: t('accountMaster.capital') },
    { value: 'revenue', label: t('accountMaster.revenue') },
    { value: 'expense', label: t('accountMaster.expense') },
    { value: 'customer', label: t('accountMaster.customer') },
    { value: 'supplier', label: t('accountMaster.supplier') },
    { value: 'purchase', label: t('accountMaster.purchase', 'Purchase') },
    { value: 'sales', label: t('accountMaster.sales', 'Sales') },
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
    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-8">
      <h3 className="text-2xl font-black text-slate-900 mb-8 border-b-4 border-black pb-2 uppercase tracking-tighter italic">
        {initialData?.id ? t('accountMaster.editAccount') : t('accountMaster.createAccount')}
      </h3>

      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 shadow-sm border-l-4 ${
          message.type === 'error' 
            ? 'bg-white border-red-600 text-red-900' 
            : 'bg-white border-slate-900 text-slate-900'
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold uppercase text-xs tracking-widest leading-none">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Name */}
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
            {t('accountMaster.accountName')} *
          </label>
          <input
            type="text"
            name="account_name"
            value={formData.account_name}
            onChange={handleChange}
            placeholder={t('accountMaster.accountNamePlaceholder')}
            className={`w-full px-4 py-3 border-2 rounded-lg bg-slate-50 outline-none focus:border-black focus:bg-white transition-all font-bold ${
              errors.account_name ? 'border-red-500' : 'border-slate-100'
            }`}
            disabled={loading}
          />
          {errors.account_name && (
            <p className="mt-2 text-[10px] font-bold text-red-600 uppercase tracking-widest">{errors.account_name}</p>
          )}
        </div>

        {/* Account Type */}
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
            {t('accountMaster.accountType')} *
          </label>
          <select
            name="account_type"
            value={formData.account_type}
            onChange={handleChange}
            className={`w-full px-4 py-3 border-2 rounded-lg bg-slate-50 outline-none focus:border-black focus:bg-white transition-all font-black text-xs uppercase tracking-widest ${
              errors.account_type ? 'border-red-500' : 'border-slate-100'
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
            <p className="mt-2 text-[10px] font-bold text-red-600 uppercase tracking-widest">{errors.account_type}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Phone */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              {t('accountMaster.phone')}
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Primary Phone"
              className={`w-full px-4 py-3 border-2 rounded-lg bg-slate-50 outline-none focus:border-black focus:bg-white transition-all font-bold ${
                errors.phone ? 'border-red-500' : 'border-slate-100'
              }`}
              disabled={loading}
            />
            {errors.phone && (
              <p className="mt-2 text-[10px] font-bold text-red-600 uppercase tracking-widest">{errors.phone}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              {t('accountMaster.email')}
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Contact Email"
              className={`w-full px-4 py-3 border-2 rounded-lg bg-slate-50 outline-none focus:border-black focus:bg-white transition-all font-bold ${
                errors.email ? 'border-red-500' : 'border-slate-100'
              }`}
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-2 text-[10px] font-bold text-red-600 uppercase tracking-widest">{errors.email}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* GST Number */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              {t('accountMaster.gstNumber')}
            </label>
            <input
              type="text"
              name="gst_no"
              value={formData.gst_no}
              onChange={handleChange}
              placeholder="GSTIN (Optional)"
              maxLength="15"
              className={`w-full px-4 py-3 border-2 rounded-lg bg-slate-50 outline-none focus:border-black focus:bg-white transition-all font-bold uppercase ${
                errors.gst_no ? 'border-red-500' : 'border-slate-100'
              }`}
              disabled={loading}
            />
            {errors.gst_no && (
              <p className="mt-2 text-[10px] font-bold text-red-600 uppercase tracking-widest">{errors.gst_no}</p>
            )}
          </div>

          {/* TIN Number */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              {t('accountMaster.tinNumber')}
            </label>
            <input
              type="text"
              name="tin_no"
              value={formData.tin_no}
              onChange={handleChange}
              placeholder="TIN (Optional)"
              maxLength="11"
              className={`w-full px-4 py-3 border-2 rounded-lg bg-slate-50 outline-none focus:border-black focus:bg-white transition-all font-bold ${
                errors.tin_no ? 'border-red-500' : 'border-slate-100'
              }`}
              disabled={loading}
            />
            {errors.tin_no && (
              <p className="mt-2 text-[10px] font-bold text-red-600 uppercase tracking-widest">{errors.tin_no}</p>
            )}
          </div>
        </div>

        {/* Balance Details Tray */}
        <div className="pt-2">
           <button 
             type="button" 
             onClick={() => setShowBalanceDetails(!showBalanceDetails)}
             className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-slate-900 border-2 border-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-lg transition-all active:scale-95 shadow-md"
           >
             {showBalanceDetails ? '▼' : '▶'} {t('accountMaster.balanceDetails')}
           </button>
        </div>

        {showBalanceDetails && (
          <div className="bg-slate-50 p-6 rounded-xl border-2 border-slate-900 space-y-6 shadow-inner animate-in slide-in-from-top-2 duration-200 mt-4">
             <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <span className="text-xs font-black text-slate-900 uppercase tracking-widest italic leading-none">Ledger Registry Control</span>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={formData.is_subledger || false} 
                    onChange={(e) => setFormData(p => ({...p, is_subledger: e.target.checked}))}
                    className="w-4 h-4 accent-black border-2 border-slate-900 rounded"
                  />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-black">{t('accountMaster.isSubLedger')}</span>
                </label>
             </div>
             
             <div className="space-y-4">
                {/* Opening Balance */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest w-36">{t('accountMaster.openingBalance')} :</span>
                  <div className="flex-1 flex border-2 border-slate-100 rounded-lg bg-white overflow-hidden focus-within:border-black transition-all">
                     <input
                       type="number"
                       name="opening_balance"
                       value={formData.opening_balance}
                       onChange={handleChange}
                       className="w-full px-4 py-3 outline-none text-right font-black italic text-slate-900"
                       disabled={loading}
                     />
                     <select 
                       className="bg-slate-100 border-l-2 border-slate-100 px-4 py-3 outline-none text-[10px] font-black text-slate-900 uppercase tracking-widest cursor-pointer hover:bg-slate-200 transition-colors"
                       value={formData.opening_balance_type || 'credit'}
                       onChange={(e) => setFormData(p => ({...p, opening_balance_type: e.target.value}))}
                     >
                        <option value="credit">{t('accountMaster.jama')}</option>
                        <option value="debit">{t('accountMaster.udhar')}</option>
                     </select>
                  </div>
                </div>

                {/* Closing Balance (Read-only Industrial) */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest w-36 italic">{t('accountMaster.closingBalance')} :</span>
                  <div className="flex-1">
                     <input
                       type="text"
                       value="0.00"
                       readOnly
                       className="w-full px-4 py-3 outline-none text-right bg-black text-white rounded-lg font-black italic shadow-lg cursor-not-allowed"
                     />
                  </div>
                </div>
             </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-4 pt-6 border-t border-slate-50">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-6 py-4 bg-white border-2 border-slate-200 hover:border-slate-900 text-slate-600 hover:text-slate-900 font-black uppercase tracking-widest text-xs rounded-xl transition-all active:scale-95 shadow-sm"
          >
            {t('accountMaster.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-4 bg-black border-2 border-black hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('accountMaster.saving')}
              </>
            ) : (
              t('accountMaster.save')
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
