import React, { useState, useEffect, useRef } from 'react';
import {
  X, Save, AlertCircle, CheckCircle, Loader, Package, TrendingUp, Layers
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';

export default function ItemForm({ item = null, company, onSubmit, onClose, existingItems = [] }) {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [accounts, setAccounts] = useState([]);

  const [formData, setFormData] = useState({
    item_code: item?.item_code || '',
    p_code: item?.p_code || '',
    item_name: item?.item_name || '',
    item_name_gu: item?.item_name_gu || '',
    category: item?.category || '',
    unit: item?.unit || 'Nos',
    purchase_price: item?.purchase_price || 0,
    sale_price: item?.sale_price || 0,
    opening_stock: item?.opening_stock || 0,
    minimum_stock: item?.minimum_stock || 0,
    tax_percentage: item?.tax_percentage || 5.00,
    hsn_code: item?.hsn_code || '21069099',
    purchase_account_id: item?.purchase_account_id || '',
    sales_account_id: item?.sales_account_id || '',
    purchase_code: '',
    sales_code: '',
    is_active: item?.is_active ?? 1
  });

  // Focus Refs
  const itemCodeRef = useRef(null);
  const pCodeRef = useRef(null);
  const itemNameGuRef = useRef(null);
  const itemNameRef = useRef(null);
  const categoryRef = useRef(null);
  const unitRef = useRef(null);
  const purchaseCodeRef = useRef(null);
  const salesCodeRef = useRef(null);
  const purchaseAccountIdRef = useRef(null);
  const salesAccountIdRef = useRef(null);
  const purchasePriceRef = useRef(null);
  const salePriceRef = useRef(null);
  const openingStockRef = useRef(null);
  const minimumStockRef = useRef(null);
  const taxPercentageRef = useRef(null);
  const hsnCodeRef = useRef(null);

  useEffect(() => {
    if (company?.id) {
      fetchAccounts();
      if (!item) {
        fetchNextItemCode();
      }
    }
  }, [company, item]);

  const fetchNextItemCode = async () => {
    try {
      const res = await api.get('/items/next-code');
      if (res.data.success) {
        setFormData(prev => ({ 
          ...prev, 
          item_code: res.data.nextCode,
          p_code: res.data.nextPCode 
        }));
      }
    } catch (err) {
      console.error('Fetch next item code error:', err);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get(`/accounts/company/${company.id}`);
      if (res.data.success) {
        setAccounts(res.data.data);
        if (item) {
          const pAcc = res.data.data.find(a => a.id === item.purchase_account_id);
          const sAcc = res.data.data.find(a => a.id === item.sales_account_id);
          setFormData(prev => ({
            ...prev,
            purchase_code: pAcc?.account_code || '',
            sales_code: sAcc?.account_code || ''
          }));
        }
      }
    } catch (err) {
      console.error('Fetch accounts error:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'purchase_code' || name === 'sales_code') {
      const accountType = name === 'purchase_code' ? 'purchase' : 'sales';
      const targetIdField = name === 'purchase_code' ? 'purchase_account_id' : 'sales_account_id';
      const cleanValue = value.trim();
      
      const foundAccount = accounts.find(a => 
        a.account_type?.toLowerCase() === accountType && 
        (String(a.account_code) === cleanValue || String(a.p_code) === cleanValue)
      );
      
      setFormData(prev => ({
        ...prev,
        [name]: value,
        [targetIdField]: foundAccount ? foundAccount.id : (value === '' ? '' : prev[targetIdField])
      }));
      return;
    }

    if (name === 'purchase_account_id' || name === 'sales_account_id') {
      const codeField = name === 'purchase_account_id' ? 'purchase_code' : 'sales_code';
      const foundAccount = accounts.find(a => a.id === parseInt(value));
      setFormData(prev => ({
        ...prev,
        [name]: value,
        [codeField]: foundAccount ? foundAccount.account_code : ''
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    }));
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
    setMessage(null);

    if (!formData.item_name || !formData.item_name.trim()) {
      setMessage({ type: 'error', text: t('itemForm.errors.nameRequired') });
      return;
    }

    const isDuplicate = existingItems.some(i => 
      i.item_name.toLowerCase().trim() === formData.item_name.toLowerCase().trim() && 
      i.id !== item?.id
    );

    if (isDuplicate) {
      setMessage({ type: 'error', text: t('itemForm.errors.nameExists') });
      return;
    }

    setLoading(true);

    try {
      if (item?.id) {
        await api.put(`/items/${item.id}`, formData);
        onSubmit?.(t('itemMaster.messages.itemUpdatedSuccessfully'));
      } else {
        await api.post('/items', formData);
        onSubmit?.(t('itemMaster.messages.itemRegisteredSuccessfully'));
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || t('itemForm.errors.failedSave') });
    } finally {
      setLoading(false);
    }
  };

  const categoryList = [...new Set(existingItems.map(i => i.category).filter(Boolean))];

  return (
    <div className={`bg-white rounded-lg overflow-hidden border border-slate-200 shadow-xl flex flex-col text-xs select-none ${isGu ? 'font-sans' : 'font-mono'}`}>
      
      {/* Title Bar */}
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center select-none">
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {item?.id ? t('itemForm.editTitle') : t('itemForm.initTitle')}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">{t('itemForm.subtitle')}</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
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
            message.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-[#1d5f84]'
          }`}>
            {message.type === 'error' ? <AlertCircle size={14} className="shrink-0" /> : <CheckCircle size={14} className="shrink-0" />}
            <span className="uppercase leading-none tracking-wider">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Left Column: Basic Details */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1 border-b border-slate-100 pb-2">
                <Package size={13} className="text-[#1d5f84]" />
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">{t('itemForm.itemIdentity')}</h3>
              </div>
              
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('itemForm.code')}</label>
                  <input
                    ref={itemCodeRef}
                    type="text"
                    name="item_code"
                    value={formData.item_code}
                    readOnly
                    translate="no"
                    lang="en"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none font-bold text-slate-500 cursor-not-allowed force-en notranslate font-sans"
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('itemForm.pCode')}</label>
                  <input
                    ref={pCodeRef}
                    type="text"
                    name="p_code"
                    value={formData.p_code}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, itemNameGuRef)}
                    translate="no"
                    lang="en"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 force-en font-sans"
                  />
                </div>
                <div className="col-span-3 flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 font-sans">{t('itemForm.itemNameGU')}</label>
                  <input
                    ref={itemNameGuRef}
                    type="text"
                    name="item_name_gu"
                    value={formData.item_name_gu}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, itemNameRef)}
                    required
                    placeholder="ગુજરાતીમાં નામ લખો"
                    translate="no"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700"
                    style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('itemForm.itemName')}</label>
                <input
                  ref={itemNameRef}
                  type="text"
                  name="item_name"
                  value={formData.item_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({ 
                      ...prev, 
                      item_name: val
                    }));
                  }}
                  onKeyDown={(e) => handleKeyDown(e, categoryRef)}
                  required
                  placeholder={t('itemForm.enterItemName')}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 force-en font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('itemForm.categorySector')}</label>
                  <input
                    ref={categoryRef}
                    type="text"
                    name="category"
                    list="category-list"
                    value={formData.category}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, unitRef)}
                    placeholder={t('itemForm.categoryPlaceholder') || "E.G. RAW MATERIAL"}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 force-en font-sans"
                  />
                  <datalist id="category-list">
                    {categoryList.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('itemForm.stockUnit')}</label>
                  <select
                    ref={unitRef}
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, purchaseCodeRef)}
                    className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 cursor-pointer uppercase tracking-widest ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
                  >
                    <option value="Nos">{t('units.Nos')}</option>
                    <option value="Kg">{t('units.Kg')}</option>
                    <option value="Pcs">{t('units.Pcs')}</option>
                    <option value="Ltr">{t('units.Ltr')}</option>
                    <option value="Mtr">{t('units.Mtr')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('itemForm.purchaseCode')}</label>
                  <input
                    ref={purchaseCodeRef}
                    type="text"
                    name="purchase_code"
                    value={formData.purchase_code}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, salesCodeRef)}
                    placeholder="1"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 font-sans force-en"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('itemForm.salesCode')}</label>
                  <input
                    ref={salesCodeRef}
                    type="text"
                    name="sales_code"
                    value={formData.sales_code}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, purchaseAccountIdRef)}
                    placeholder="2"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 font-sans force-en"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('itemForm.purchaseBook')}</label>
                  <select
                    ref={purchaseAccountIdRef}
                    name="purchase_account_id"
                    value={formData.purchase_account_id}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, salesAccountIdRef)}
                    className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 uppercase tracking-tighter cursor-pointer ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
                  >
                    <option value="">{t('itemForm.select')}</option>
                    {accounts.filter(a => a.account_type?.toLowerCase() === 'purchase').map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {i18n.language === 'en' ? acc.account_name : acc.account_name_gu}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('itemForm.salesBook')}</label>
                  <select
                    ref={salesAccountIdRef}
                    name="sales_account_id"
                    value={formData.sales_account_id}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, purchasePriceRef)}
                    className={`w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 uppercase tracking-tighter cursor-pointer ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
                  >
                    <option value="">{t('itemForm.select')}</option>
                    {accounts.filter(a => a.account_type?.toLowerCase() === 'sales').map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {i18n.language === 'en' ? acc.account_name : acc.account_name_gu}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column: Pricing & Stock */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1 border-b border-slate-100 pb-2">
                <TrendingUp size={13} className="text-[#1d5f84]" />
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">{t('itemForm.fiscalStockControl')}</h3>
              </div>

              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('itemForm.purchasePrice')}</label>
                    <input
                      ref={purchasePriceRef}
                      type="number"
                      name="purchase_price"
                      value={formData.purchase_price}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, salePriceRef)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-sans text-slate-700 font-bold force-en font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('itemForm.salePrice')}</label>
                    <input
                      ref={salePriceRef}
                      type="number"
                      name="sale_price"
                      value={formData.sale_price}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, openingStockRef)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-sans text-slate-700 font-bold force-en font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('itemForm.openingStock')}</label>
                    <input
                      ref={openingStockRef}
                      type="number"
                      name="opening_stock"
                      value={formData.opening_stock}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, minimumStockRef)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-sans text-slate-700 font-bold force-en font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('itemForm.minStockAlert')}</label>
                    <input
                      ref={minimumStockRef}
                      type="number"
                      name="minimum_stock"
                      value={formData.minimum_stock}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, taxPercentageRef)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-sans text-slate-700 font-bold force-en font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">
                      {t('itemForm.taxPercentage')} <span className="opacity-60 font-sans font-normal">(%)</span>
                    </label>
                    <input
                      ref={taxPercentageRef}
                      type="number"
                      name="tax_percentage"
                      value={formData.tax_percentage}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, hsnCodeRef)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-sans text-slate-700 font-bold force-en font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('itemForm.hsnSacCode')}</label>
                    <input
                      ref={hsnCodeRef}
                      type="text"
                      name="hsn_code"
                      value={formData.hsn_code}
                      onChange={handleChange}
                      translate="no"
                      lang="en"
                      onKeyDown={(e) => handleKeyDown(e, null)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-sans text-slate-700 font-bold uppercase force-en"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1 pt-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('memberForm.registryStatus') || "STATUS"}</label>
                  <div className="flex items-center gap-4 bg-slate-50 p-2.5 border border-slate-200 rounded-md">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked ? 1 : 0 }))}
                        className="w-3.5 h-3.5 cursor-pointer accent-[#1d5f84]"
                      />
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${formData.is_active ? 'text-slate-700' : 'text-slate-400'}`}>
                        {t('itemMaster.active') || "Active"}
                      </span>
                    </label>
                  </div>
                </div>

                {item?.id && (
                  <div className="bg-slate-50 p-3 border border-slate-100 rounded-md mt-1 flex items-center gap-3">
                    <div className="p-2 bg-white border border-slate-200 text-[#1d5f84] rounded-md shadow-sm">
                      <Layers size={16} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('itemForm.internalShardId') || "Internal Shard ID"}</p>
                      <p className="text-sm font-bold text-slate-700">#{item.id}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Modal Footer Actions */}
      <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex gap-2.5 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold transition rounded-md uppercase tracking-wide cursor-pointer"
        >
          {t('itemForm.cancel') || "Cancel"}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-1.5 flex items-center gap-1.5 text-xs font-bold text-white bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] transition rounded-md uppercase tracking-wide cursor-pointer disabled:opacity-50"
        >
          {loading ? <Loader className="animate-spin" size={12} /> : <Save size={12} />}
          <span>{item?.id ? t('itemForm.update') || "Update" : t('itemForm.save') || "Save"}</span>
        </button>
      </div>
    </div>
  );
}
