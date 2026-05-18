import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import {
  Building2, User, Phone, Mail, FileText,
  ShieldAlert, IndianRupee, Save, X, RefreshCcw,
  Layout, Database, Tag, ShieldCheck, Activity,
  Briefcase, TrendingUp, Hash, Layers, Globe,
  CheckCircle, AlertCircle, Smartphone, Loader
} from 'lucide-react';

export default function AccountForm({ 
  companyId, 
  initialData = null, 
  onSuccess, 
  onCancel,
  existingAccounts = [] 
}) {
  const { t, i18n } = useTranslation();
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

  return (
    <div className="bg-white p-0 overflow-hidden border border-zinc-400 font-mono text-xs select-none rounded-none animate-none">
      <div className="bg-zinc-100 px-5 py-3.5 border-b border-zinc-300 flex justify-between items-center select-none animate-none">
        <div>
          <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-tight">
            {initialData?.id ? t('accountForm.editTitle') : t('accountForm.initTitle')}
          </h2>
          <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5 tracking-wider">{t('accountForm.subtitle')}</p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="p-1 text-zinc-400 hover:text-red-600 transition">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="p-5 animate-none">
        {message && (
          <div className={`mb-4 p-3 border text-xs flex items-center gap-2 animate-none ${
            message.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}>
            {message.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
            <span className="font-bold uppercase leading-none">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Left Column: Basic & Identity */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1 border-b border-zinc-200 pb-1">
                <User size={15} className="text-zinc-500" />
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest leading-none">{t('accountForm.basicInfo')}</h3>
              </div>
              
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">{t('accountForm.code')}</label>
                  <input
                    ref={accountCodeRef}
                    type="text"
                    name="account_code"
                    value={formData.account_code || ''}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, pCodeRef)}
                    translate="no"
                    lang="en"
                    className={`w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none transition font-bold text-zinc-800 force-en notranslate ${formData.is_system ? 'opacity-50 cursor-not-allowed bg-zinc-100' : 'focus:bg-white focus:border-zinc-600'}`}
                    disabled={formData.is_system}
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">{t('accountForm.pCode')}</label>
                  <input
                    ref={pCodeRef}
                    type="text"
                    name="p_code"
                    value={formData.p_code || ''}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, accountNameRef)}
                    translate="no"
                    lang="en"
                    className={`w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none transition font-bold text-zinc-800 force-en notranslate ${formData.is_system ? 'opacity-50 cursor-not-allowed bg-zinc-100' : 'focus:bg-white focus:border-zinc-600'}`}
                    disabled={formData.is_system}
                  />
                </div>
                <div className="col-span-3 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-sans">{t('accountForm.accountNameENG')} *</label>
                  <input
                    ref={accountNameRef}
                    type="text"
                    name="account_name"
                    value={formData.account_name || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setFormData(prev => ({ 
                        ...prev, 
                        account_name: val,
                        // Automatically sync to Gujarati field if it's currently empty or was previously synced
                        account_name_gu: (prev.account_name_gu === prev.account_name || !prev.account_name_gu) ? val : prev.account_name_gu
                      }));
                    }}
                    onKeyDown={(e) => handleKeyDown(e, accountNameGURef)}
                    required
                    placeholder={t('accountForm.enterLedgerName')}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800 force-en notranslate"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1 mb-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-sans">{t('accountForm.accountNameGUJ')}</label>
                <input
                  ref={accountNameGURef}
                  type="text"
                  name="account_name_gu"
                  value={formData.account_name_gu || ''}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, accountTypeRef)}
                  required={i18n.language === 'gu'}
                  placeholder={t('accountForm.enterLedgerNameGuj')}
                  translate="no"
                  className={`w-full px-2.5 py-1.5 bg-zinc-50 border rounded-none outline-none transition font-bold text-zinc-800 ${i18n.language === 'gu' && !formData.account_name_gu ? 'border-orange-400 bg-orange-50' : 'border-zinc-300 focus:bg-white focus:border-zinc-600'}`}
                  style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-sans">{t('accountForm.accountType')}</label>
                  <select
                    ref={accountTypeRef}
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, phoneRef)}
                    className={`w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none transition font-bold text-zinc-700 cursor-pointer uppercase tracking-widest ${formData.is_system ? 'opacity-50 cursor-not-allowed bg-zinc-100' : 'focus:bg-white focus:border-zinc-600'}`}
                    disabled={formData.is_system}
                  >
                    {accountTypes.map(type => (
                      <option key={type.value} value={type.value}>{t(`accountMaster.types.${type.value}`)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase font-sans">{t('accountForm.mobile')}</label>
                  <input
                    ref={phoneRef}
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, emailRef)}
                    placeholder={t('accountForm.mobilePlaceholder')}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-700 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-sans">{t('accountForm.emailHandle')}</label>
                <input
                  ref={emailRef}
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, openingBalanceRef)}
                  placeholder={t('accountForm.emailPlaceholder')}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-700"
                />
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase font-sans">{t('accountForm.advancedLogic')}</label>
                <div className="flex items-center gap-4 bg-zinc-50 p-2 border border-zinc-300">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="is_subledger"
                      checked={formData.is_subledger}
                      onChange={handleChange}
                      className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                    />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${formData.is_subledger ? 'text-zinc-800' : 'text-zinc-400'}`}>{t('accountForm.enableSubLedger')}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Financial & Tax */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1 border-b border-zinc-200 pb-1">
                <TrendingUp size={15} className="text-zinc-500" />
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest leading-none">{t('accountForm.financialConfig')}</h3>
              </div>

              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase font-sans">{t('accountForm.openingBalance')}</label>
                    <input
                      ref={openingBalanceRef}
                      type="number"
                      name="opening_balance"
                      value={formData.opening_balance}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, openingBalanceTypeRef)}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-mono text-zinc-700 font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">{t('accountForm.balanceType')}</label>
                    <select
                      ref={openingBalanceTypeRef}
                      name="opening_balance_type"
                      value={formData.opening_balance_type}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, gstNoRef)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-700 uppercase tracking-widest cursor-pointer"
                    >
                      <option value="credit">{t('accountMaster.jamaCr')}</option>
                      <option value="debit">{t('accountMaster.udharDr')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase label-gst-gu notranslate" translate="no"></label>
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
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-mono text-zinc-700 font-bold uppercase force-en notranslate"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase label-tin-gu notranslate" translate="no"></label>
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
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-mono text-zinc-700 font-bold force-en notranslate"
                    />
                  </div>
                </div>

                <div className="bg-zinc-50 p-3 border border-zinc-300 mt-1 flex items-center gap-3">
                  <div className="p-2 bg-white border border-zinc-200 text-zinc-600">
                    <Database size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('accountForm.internalShardId')}</p>
                    <p className="text-base font-bold text-zinc-800">#{initialData?.id || nextId || '...'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-zinc-200 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition rounded-none uppercase text-xs"
            >
              {t('accountForm.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold transition rounded-none uppercase flex items-center justify-center gap-2 text-xs"
            >
              {loading ? <Loader className="animate-spin" size={14} /> : <><Save size={14} /> {initialData?.id ? t('accountForm.update') : t('accountForm.save')}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
