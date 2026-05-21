import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import {
  User, Building2, TrendingUp, Save, X, Loader,
  AlertCircle, CheckCircle, Database
} from 'lucide-react';

export default function AccountForm({ 
  companyId, 
  initialData = null, 
  onSuccess, 
  onCancel,
  existingAccounts = [] 
}) {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';

  const [formData, setFormData] = useState(initialData || {
    account_code: '',
    p_code: '',
    account_name: '',
    account_name_gu: '',
    account_type: 'customer',
    phone: '',
    email: '',
    gst_no: '',
    tin_no: '',
    opening_balance: 0,
    opening_balance_type: 'credit',
    is_subledger: false
  });
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [nextId, setNextId] = useState(null);

  // Focus Refs
  const accountCodeRef = useRef(null);
  const pCodeRef = useRef(null);
  const accountNameRef = useRef(null);
  const accountNameGURef = useRef(null);
  const accountTypeRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const openingBalanceRef = useRef(null);
  const openingBalanceTypeRef = useRef(null);
  const gstNoRef = useRef(null);
  const tinNoRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      const opBal = parseFloat(initialData.opening_balance || 0);
      setFormData({
        ...initialData,
        account_name_gu: initialData.account_name_gu || '',
        opening_balance: Math.abs(opBal),
        opening_balance_type: opBal < 0 ? 'credit' : 'debit',
        is_subledger: initialData.is_subledger === true || initialData.is_subledger === 1
      });
    } else {
      fetchNextCode(formData.account_type);
    }
  }, [initialData]);

  const fetchNextCode = async (type) => {
    try {
      const response = await api.get(`/accounts/next-id?type=${type}`);
      if (response.data.success) {
        setFormData(prev => ({ ...prev, account_code: response.data.nextId.toString() }));
      }
    } catch (err) {
      console.error("Failed to fetch next account code", err);
    }
  };

  const fetchNextPCode = async (type) => {
    try {
      const response = await api.get(`/accounts/next-pcode?type=${type}`);
      if (response.data.success) {
        setFormData(prev => ({ ...prev, p_code: response.data.nextPCode }));
      }
    } catch (err) {
      console.error("Failed to fetch next account P-Code", err);
    }
  };

  const fetchNextId = async (type) => {
    try {
      const response = await api.get(`/accounts/next-id?type=${type}`);
      if (response.data.success) {
        setNextId(response.data.nextId);
      }
    } catch (err) {
      console.error("Failed to fetch next ID", err);
    }
  };

  useEffect(() => {
    if (!initialData && formData.account_type) {
      fetchNextId(formData.account_type);
      fetchNextCode(formData.account_type);
      fetchNextPCode(formData.account_type);
    }
  }, [initialData, companyId, formData.account_type]);

  const accountTypes = [
    { value: 'customer', label: t('accountTypes.customer') },
    { value: 'vendor', label: t('accountTypes.vendor') },
    { value: 'supplier', label: t('accountTypes.supplier') },
    { value: 'bank', label: t('accountTypes.bank') },
    { value: 'cash', label: t('accountTypes.cash') },
    { value: 'assets', label: t('accountTypes.assets') },
    { value: 'liabilities', label: t('accountTypes.liabilities') },
    { value: 'capital', label: t('accountTypes.capital') },
    { value: 'revenue', label: t('accountTypes.revenue') },
    { value: 'expense', label: t('accountTypes.expense') },
    { value: 'purchase', label: t('accountTypes.purchase') },
    { value: 'sales', label: t('accountTypes.sales') }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'opening_balance' ? parseFloat(value) || 0 : value)
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleKeyDown = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      } else {
        handleSubmit(e);
      }
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrors({});
    setMessage(null);

    if (!formData.account_name || !formData.account_name.trim()) {
      setMessage({ type: 'error', text: t('accountMaster.errors.nameRequired') });
      return;
    }

    const isDuplicate = existingAccounts.some(acc => 
      acc.account_name.toLowerCase().trim() === formData.account_name.toLowerCase().trim() && 
      acc.id !== initialData?.id
    );

    if (isDuplicate) {
      setMessage({ type: 'error', text: t('accountMaster.errors.nameExists') });
      return;
    }

    setLoading(true);

    try {
      const submitData = { company_id: companyId, ...formData };

      if (initialData?.id) {
        await api.put(`/accounts/${initialData.id}`, submitData);
        onSuccess?.(t('accountMaster.messages.accountUpdatedSuccessfully'));
      } else {
        await api.post('/accounts', submitData);
        onSuccess?.(t('accountMaster.messages.accountRegisteredSuccessfully'));
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || t('accountMaster.errors.failedSave') });
    } finally {
      setLoading(false);
    }
  };

  const guDigits = {
    '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
    '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯'
  };

  const toGujaratiDigits = (value) => {
    if (i18n.language !== 'gu') return String(value ?? '');
    return String(value ?? '').replace(/[0-9]/g, (d) => guDigits[d] || d);
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-slate-200 shadow-xl flex flex-col font-mono text-xs select-none">
      
      {/* Title Bar */}
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center select-none">
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {initialData?.id ? t('accountForm.editTitle') : t('accountForm.initTitle')}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">{t('accountForm.subtitle')}</p>
        </div>
        {onCancel && (
          <button 
            onClick={onCancel} 
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition rounded-md cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Form Content */}
      <div className="p-5 flex-1 overflow-y-auto">
        {message && (
          <div className={`mb-4 p-2.5 border font-bold text-[11px] rounded-md flex items-center gap-2 shadow-sm ${
            message.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            {message.type === 'error' ? <AlertCircle size={14} className="shrink-0" /> : <CheckCircle size={14} className="shrink-0" />}
            <span className="uppercase leading-none tracking-wider">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Left Column: Basic & Identity */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1 border-b border-slate-100 pb-2">
                <User size={13} className="text-[#1d5f84]" />
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">{t('accountForm.basicInfo')}</h3>
              </div>
              
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('accountForm.code')}</label>
                  <input
                    ref={accountCodeRef}
                    type="text"
                    name="account_code"
                    value={formData.account_code || ''}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, pCodeRef)}
                    translate="no"
                    lang="en"
                    className={`w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none transition font-bold text-slate-500 cursor-not-allowed`}
                    disabled={true}
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('accountForm.pCode')}</label>
                  <input
                    ref={pCodeRef}
                    type="text"
                    name="p_code"
                    value={formData.p_code || ''}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, accountNameGURef)}
                    translate="no"
                    lang="en"
                    className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 force-en font-sans ${formData.is_system ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
                    disabled={formData.is_system}
                  />
                </div>
                <div className="col-span-3 flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 font-sans">{t('accountForm.accountNameGUJ')}</label>
                  <input
                    ref={accountNameGURef}
                    type="text"
                    name="account_name_gu"
                    value={formData.account_name_gu || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        account_name_gu: val,
                        // Automatically sync to English field (capitalized) if English is empty or matches previous Gujarati
                        account_name: (prev.account_name === prev.account_name_gu.toUpperCase() || !prev.account_name) ? val.toUpperCase() : prev.account_name
                      }));
                    }}
                    onKeyDown={(e) => handleKeyDown(e, accountNameRef)}
                    required={i18n.language === 'gu'}
                    placeholder={t('accountForm.enterLedgerNameGuj') || "ગુજરાતી નામ લખો"}
                    translate="no"
                    className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700`}
                    style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 font-sans">{t('accountForm.accountNameENG')} *</label>
                <input
                  ref={accountNameRef}
                  type="text"
                  name="account_name"
                  value={formData.account_name || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^ -~]/g, '').toUpperCase();
                    setFormData(prev => ({ 
                      ...prev, 
                      account_name: val,
                      account_name_gu: (prev.account_name_gu === prev.account_name || !prev.account_name_gu) ? val : prev.account_name_gu
                    }));
                  }}
                  onKeyDown={(e) => handleKeyDown(e, accountTypeRef)}
                  required
                  placeholder={t('accountForm.enterLedgerName') || "ENTER ENGLISH NAME"}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 force-en font-sans"
                  spellCheck="false"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('accountForm.accountType')}</label>
                  <select
                    ref={accountTypeRef}
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, phoneRef)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 cursor-pointer uppercase"
                  >
                    {accountTypes.map(type => (
                      <option key={type.value} value={type.value}>{t(`accountMaster.types.${type.value}`)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('accountForm.mobile')}</label>
                  <input
                    ref={phoneRef}
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, emailRef)}
                    placeholder={t('accountForm.mobilePlaceholder')}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 font-sans"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('accountForm.emailHandle')}</label>
                <input
                  ref={emailRef}
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, openingBalanceRef)}
                  placeholder={t('accountForm.emailPlaceholder')}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700"
                />
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('accountForm.advancedLogic')}</label>
                <div className="flex items-center gap-4 bg-slate-50 p-2.5 border border-slate-200 rounded-md">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="is_subledger"
                      checked={formData.is_subledger}
                      onChange={handleChange}
                      className="w-3.5 h-3.5 accent-[#1d5f84] cursor-pointer"
                    />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${formData.is_subledger ? 'text-slate-700' : 'text-slate-400'}`}>{t('accountForm.enableSubLedger')}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Financial & Tax */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1 border-b border-slate-100 pb-2">
                <TrendingUp size={13} className="text-[#1d5f84]" />
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">{t('accountForm.financialConfig')}</h3>
              </div>

              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('accountForm.openingBalance')}</label>
                    <input
                      ref={openingBalanceRef}
                      type="number"
                      name="opening_balance"
                      value={formData.opening_balance}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, openingBalanceTypeRef)}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-mono text-slate-700 font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('accountForm.balanceType')}</label>
                    <select
                      ref={openingBalanceTypeRef}
                      name="opening_balance_type"
                      value={formData.opening_balance_type}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, gstNoRef)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 uppercase tracking-wider cursor-pointer"
                    >
                      <option value="credit">{t('accountMaster.jamaCr')}</option>
                      <option value="debit">{t('accountMaster.udharDr')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase label-gst-gu notranslate" translate="no"></label>
                    <input
                      ref={gstNoRef}
                      type="text"
                      name="gst_no"
                      value={formData.gst_no || ''}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, tinNoRef)}
                      translate="no"
                      lang="en"
                      placeholder={t('accountForm.gstPlaceholder')}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-mono text-slate-700 font-bold uppercase force-en"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase label-tin-gu notranslate" translate="no"></label>
                    <input
                      ref={tinNoRef}
                      type="text"
                      name="tin_no"
                      value={formData.tin_no || ''}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, null)}
                      translate="no"
                      lang="en"
                      placeholder={t('accountForm.tinPlaceholder')}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-mono text-slate-700 font-bold force-en"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 border border-slate-200 rounded-md mt-1 flex items-center gap-3">
                  <div className="p-2 bg-white border border-slate-100 rounded-md text-slate-500">
                    <Database size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('accountForm.internalShardId')}</p>
                    <p className="text-base font-bold text-slate-800">#{initialData?.id || nextId || '...'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Modal Footer Actions */}
      <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex gap-2.5 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold transition rounded-md uppercase tracking-wide cursor-pointer"
        >
          {t('accountForm.cancel')}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-1.5 flex items-center gap-1.5 text-xs font-bold text-white bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] transition rounded-md uppercase tracking-wide cursor-pointer disabled:opacity-50"
        >
          {loading ? <Loader className="animate-spin" size={12} /> : <Save size={12} />}
          <span>{initialData?.id ? t('accountForm.update') : t('accountForm.save')}</span>
        </button>
      </div>
    </div>
  );
}
