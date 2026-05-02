import React, { useState, useEffect, useRef } from 'react';
import {
  X, Check, Activity, Package, QrCode,
  Building2, TrendingUp, IndianRupee, ShieldAlert,
  Tag, Layers, FileText, Briefcase, Calendar,
  ShieldCheck, Percent, HelpCircle, Save, RefreshCcw,
  Box, ArrowUpRight, ArrowDownLeft, Smartphone,
  CheckCircle, AlertCircle, Loader
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

export default function ItemForm({ item = null, company, onSubmit, onClose, existingItems = [] }) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [accounts, setAccounts] = useState([]);

  const [formData, setFormData] = useState({
    item_code: item?.item_code || '',
    p_code: item?.p_code || '',
    item_name: item?.item_name || '',
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
      const res = await axios.get('/api/items/next-code', {
        headers: { 'x-company-id': company.id }
      });
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
      const res = await axios.get(`/api/accounts/company/${company.id}`);
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
      setMessage({ type: 'error', text: 'Item Name is required.' });
      return;
    }

    const isDuplicate = existingItems.some(i => 
      i.item_name.toLowerCase().trim() === formData.item_name.toLowerCase().trim() && 
      i.id !== item?.id
    );

    if (isDuplicate) {
      setMessage({ type: 'error', text: 'Item name already exists. Please use a unique name.' });
      return;
    }

    setLoading(true);

    try {
      if (item?.id) {
        await axios.put(`/api/items/${item.id}`, formData, {
          headers: { 'x-company-id': company.id }
        });
        onSubmit?.('Item updated successfully.');
      } else {
        await axios.post('/api/items', formData, {
          headers: { 'x-company-id': company.id }
        });
        onSubmit?.('Item registered successfully.');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save item.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-0 overflow-hidden rounded-none border border-zinc-400 font-mono text-xs select-none animate-none">
      <div className="bg-zinc-100 px-5 py-3.5 border-b border-zinc-300 flex justify-between items-center select-none">
        <div>
          <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-tight">
            {item?.id ? 'EDIT ITEM' : 'ADD NEW ITEM'}
          </h2>
          <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5 tracking-wider">Configure inventory registry node</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-red-600 transition">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="p-5">
        {message && (
          <div className={`mb-4 p-3 border text-xs flex items-center gap-2 ${
            message.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}>
            {message.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
            <span className="font-bold uppercase leading-none">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Left Column: Basic Details */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1 border-b border-zinc-200 pb-1">
                <Package size={15} className="text-zinc-500" />
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest leading-none">Item Identity</h3>
              </div>
              
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Code</label>
                  <input
                    ref={itemCodeRef}
                    type="text"
                    name="item_code"
                    value={formData.item_code}
                    readOnly
                    onKeyDown={(e) => handleKeyDown(e, pCodeRef)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none font-bold text-zinc-600 text-xs cursor-not-allowed"
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">P-Code</label>
                  <input
                    ref={pCodeRef}
                    type="text"
                    name="p_code"
                    value={formData.p_code}
                    readOnly
                    onKeyDown={(e) => handleKeyDown(e, itemNameRef)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none font-bold text-zinc-600 text-xs cursor-not-allowed"
                  />
                </div>
                <div className="col-span-3 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Item Name</label>
                  <input
                    ref={itemNameRef}
                    type="text"
                    name="item_name"
                    value={formData.item_name}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, categoryRef)}
                    required
                    placeholder="ENTER ITEM NAME"
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-sans font-bold text-zinc-800 uppercase italic"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Category / Sector</label>
                  <input
                    ref={categoryRef}
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, unitRef)}
                    placeholder="E.G. RAW MATERIAL"
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-bold text-zinc-700"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Stock Unit</label>
                  <select
                    ref={unitRef}
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, purchaseCodeRef)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-bold text-zinc-700 cursor-pointer uppercase tracking-widest"
                  >
                    <option value="Nos">NOS</option>
                    <option value="Kg">KG</option>
                    <option value="Pcs">PCS</option>
                    <option value="Ltr">LTR</option>
                    <option value="Mtr">MTR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Purchase Code</label>
                  <input
                    ref={purchaseCodeRef}
                    type="text"
                    name="purchase_code"
                    value={formData.purchase_code}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, salesCodeRef)}
                    placeholder="1"
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-bold text-zinc-700 font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Sales Code</label>
                  <input
                    ref={salesCodeRef}
                    type="text"
                    name="sales_code"
                    value={formData.sales_code}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, purchaseAccountIdRef)}
                    placeholder="2"
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-bold text-zinc-700 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Purchase Book</label>
                  <select
                    ref={purchaseAccountIdRef}
                    name="purchase_account_id"
                    value={formData.purchase_account_id}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, salesAccountIdRef)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-bold text-zinc-700 uppercase tracking-tighter cursor-pointer"
                  >
                    <option value="">-- SELECT --</option>
                    {accounts.filter(a => a.account_type?.toLowerCase() === 'purchase').map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.account_name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Sales Book</label>
                  <select
                    ref={salesAccountIdRef}
                    name="sales_account_id"
                    value={formData.sales_account_id}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, purchasePriceRef)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-bold text-zinc-700 uppercase tracking-tighter cursor-pointer"
                  >
                    <option value="">-- SELECT --</option>
                    {accounts.filter(a => a.account_type?.toLowerCase() === 'sales').map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.account_name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column: Pricing & Stock */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1 border-b border-zinc-200 pb-1">
                <TrendingUp size={15} className="text-zinc-500" />
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest leading-none">Fiscal & Stock Control</h3>
              </div>

              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Purchase Price</label>
                    <input
                      ref={purchasePriceRef}
                      type="number"
                      name="purchase_price"
                      value={formData.purchase_price}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, salePriceRef)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-mono text-zinc-700 font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Sale Price</label>
                    <input
                      ref={salePriceRef}
                      type="number"
                      name="sale_price"
                      value={formData.sale_price}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, openingStockRef)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-mono text-zinc-700 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Opening Stock</label>
                    <input
                      ref={openingStockRef}
                      type="number"
                      name="opening_stock"
                      value={formData.opening_stock}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, minimumStockRef)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-mono text-zinc-700 font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Min. Stock Alert</label>
                    <input
                      ref={minimumStockRef}
                      type="number"
                      name="minimum_stock"
                      value={formData.minimum_stock}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, taxPercentageRef)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-mono text-zinc-700 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Tax Percentage (%)</label>
                    <input
                      ref={taxPercentageRef}
                      type="number"
                      name="tax_percentage"
                      value={formData.tax_percentage}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, hsnCodeRef)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-mono text-zinc-700 font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">HSN / SAC Code</label>
                    <input
                      ref={hsnCodeRef}
                      type="text"
                      name="hsn_code"
                      value={formData.hsn_code}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, null)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-mono text-zinc-700 font-bold uppercase"
                    />
                  </div>
                </div>

                <div className="bg-zinc-50 p-3 border border-zinc-300 mt-1 flex items-center gap-3">
                  <div className="p-2 bg-white border border-zinc-200 text-zinc-600">
                    <Layers size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Internal Shard ID</p>
                    <p className="text-base font-bold text-zinc-800">#{item?.id || '...'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-zinc-200 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition rounded-none uppercase text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold transition rounded-none uppercase flex items-center justify-center gap-2 text-xs"
            >
              {loading ? <Loader className="animate-spin" size={14} /> : <><Save size={14} /> {item?.id ? 'Update' : 'Save'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
