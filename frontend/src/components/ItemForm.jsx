import React, { useState, useEffect } from 'react';
import {
  X, Check, Activity, Package, QrCode,
  Building2, TrendingUp, IndianRupee, ShieldAlert,
  Tag, Layers, FileText, Briefcase, Calendar,
  ShieldCheck, Percent, HelpCircle, Save, RefreshCcw,
  Box, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

// Airy Label Component - Premium Typography with Icon support
const FormLabel = ({ children, icon: Icon, className = "" }) => (
  <div className={`flex items-center justify-end gap-2 pr-3 select-none ${className}`}>
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] whitespace-nowrap text-right uppercase">
      {children}
    </label>
    {Icon && <Icon size={12} className="text-slate-300" />}
  </div>
);

// Airy Input Component - Ultra Soft Style
const FormInput = ({ className = "", ...props }) => (
  <input
    className={`w-full h-10 px-4 text-[11px] border border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none bg-slate-50/50 hover:bg-slate-50 disabled:bg-slate-100/50 text-slate-800 disabled:text-slate-400 font-bold transition-all rounded-2xl ${className}`}
    {...props}
  />
);

export default function ItemForm({ item = null, company, onSubmit, onClose }) {
  const { t, i18n } = useTranslation();
  const isGuj = i18n.language === 'gu';

  const [currentItem, setCurrentItem] = useState(item);
  const [itemsList, setItemsList] = useState([]);
  const [formData, setFormData] = useState({
    item_code: item?.item_code || '',
    consider_in_autostock: item?.consider_in_autostock || 0,
    item_name: item?.item_name || '',
    item_name_gu: item?.item_name_gu || '',
    desc_en: item?.desc_en || '',
    desc_gu: item?.desc_gu || '',
    unit: item?.unit || 'Nos',
    unit_gu: item?.unit_gu || 'નંગ',
    barcode: item?.barcode || '',
    category: item?.category || '',
    purchase_account_id: item?.purchase_account_id || '',
    sales_account_id: item?.sales_account_id || '',
    do_auto_stock_in_sales: item?.do_auto_stock_in_sales || 0,
    opening_stock: item?.opening_stock || 0.000,
    inward: item?.inward || 0.000,
    outward: item?.outward || 0.000,
    opening_stock_value: item?.opening_stock_value || 0.00,
    minimum_stock: item?.minimum_stock || 0.000,
    loss_per_kg: item?.loss_per_kg || 0.000,
    effective_date: item?.effective_date ? item.effective_date.split('T')[0] : new Date().toISOString().split('T')[0],
    sgst_percent: item?.sgst_percent !== undefined && item?.sgst_percent !== null ? parseFloat(item.sgst_percent) : 2.50,
    cgst_percent: item?.cgst_percent !== undefined && item?.cgst_percent !== null ? parseFloat(item.cgst_percent) : 2.50,
    igst_percent: item?.igst_percent !== undefined && item?.igst_percent !== null ? parseFloat(item.igst_percent) : 0.00,
    cess_percent: item?.cess_percent !== undefined && item?.cess_percent !== null ? parseFloat(item.cess_percent) : 0.00,
    hsn_code: item?.hsn_code || '21069099',
    tax_percentage: item?.tax_percentage || 5.00,
    reorder_level: item?.reorder_level || 0,
    purchase_price: item?.purchase_price || 0,
    sale_price: item?.sale_price || 0,
  });

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (company?.id) {
      fetchAccounts();
      fetchItems();
    }
  }, [company]);

  const fetchItems = async () => {
    try {
      const res = await axios.get(`/api/items/company/${company.id}`);
      if (res.data.success) {
        setItemsList(res.data.data);
      }
    } catch (err) {
      console.error('Fetch items error:', err);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await axios.get(`/api/accounts/company/${company.id}`);
      if (res.data.success) {
        setAccounts(res.data.data);
      }
    } catch (err) {
      console.error('Fetch accounts error:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = value;

    if (name === 'item_code' || name === 'barcode') {
      finalValue = value.toUpperCase();
    }

    if (name === 'item_code' && !item) {
      const existingItem = itemsList.find(i => i.item_code.toUpperCase() === finalValue);
      if (existingItem) {
        setCurrentItem(existingItem);
        const finalBarcode = existingItem.barcode || Math.floor(100000 + Math.random() * 900000).toString();

        setFormData({
          item_code: existingItem.item_code || '',
          consider_in_autostock: existingItem.consider_in_autostock || 0,
          item_name: existingItem.item_name || '',
          item_name_gu: existingItem.item_name_gu || '',
          desc_en: existingItem.desc_en || '',
          desc_gu: existingItem.desc_gu || '',
          unit: existingItem.unit || 'Nos',
          unit_gu: existingItem.unit_gu || 'નંગ',
          barcode: finalBarcode,
          category: existingItem.category || '',
          purchase_account_id: existingItem.purchase_account_id || '',
          sales_account_id: existingItem.sales_account_id || '',
          do_auto_stock_in_sales: existingItem.do_auto_stock_in_sales || 0,
          opening_stock: existingItem.opening_stock || 0.000,
          inward: existingItem.inward || 0.000,
          outward: existingItem.outward || 0.000,
          opening_stock_value: existingItem.opening_stock_value || 0.00,
          minimum_stock: existingItem.minimum_stock || 0.000,
          loss_per_kg: existingItem.loss_per_kg || 0.000,
          effective_date: existingItem.effective_date ? existingItem.effective_date.split('T')[0] : new Date().toISOString().split('T')[0],
          sgst_percent: parseFloat(existingItem.sgst_percent) || 2.50,
          cgst_percent: parseFloat(existingItem.cgst_percent) || 2.50,
          igst_percent: parseFloat(existingItem.igst_percent) || 0.00,
          cess_percent: parseFloat(existingItem.cess_percent) || 0.00,
          hsn_code: existingItem.hsn_code || '21069099',
          tax_percentage: existingItem.tax_percentage || 0,
          reorder_level: existingItem.reorder_level || 0,
          purchase_price: existingItem.purchase_price || 0,
          sale_price: existingItem.sale_price || 0,
          inward: (parseFloat(existingItem.inward || 0)).toFixed(3),
          outward: (parseFloat(existingItem.outward || 0)).toFixed(3),
        });
        return;
      } else {
        setCurrentItem(null);
        if (finalValue && !formData.barcode) {
          const autoBarcode = Math.floor(100000 + Math.random() * 900000).toString();
          setFormData(prev => ({ ...prev, item_code: finalValue, barcode: autoBarcode }));
          return;
        }
      }
    }

    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? (checked ? 1 : 0) :
          ['opening_stock', 'opening_stock_value', 'minimum_stock', 'loss_per_kg', 'sgst_percent', 'cgst_percent', 'igst_percent', 'cess_percent', 'purchase_price', 'sale_price', 'tax_percentage'].includes(name)
            ? (value === '' ? '' : parseFloat(value))
            : finalValue
      };

      if (name === 'opening_stock' || name === 'purchase_price') {
        const qty = name === 'opening_stock' ? parseFloat(value || 0) : parseFloat(newData.opening_stock || 0);
        const rate = name === 'purchase_price' ? parseFloat(value || 0) : parseFloat(newData.purchase_price || 0);
        newData.opening_stock_value = (qty * rate).toFixed(2);
      }

      if (name === 'sgst_percent') {
        newData.cgst_percent = newData.sgst_percent;
      }

      if (name === 'sgst_percent' || name === 'cgst_percent' || name === 'igst_percent') {
        newData.tax_percentage = (parseFloat(newData.sgst_percent || 0) + parseFloat(newData.cgst_percent || 0) + parseFloat(newData.igst_percent || 0)).toFixed(2);
      }

      return newData;
    });
  };

  const handleGenerateBarcode = () => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setFormData(prev => ({ ...prev, barcode: newCode }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (currentItem) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/items/${currentItem.id}`, formData, {
          headers: { 'x-company-id': company.id }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/items`, formData, {
          headers: { 'x-company-id': company.id }
        });
      }
      onSubmit();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Error saving item');
    } finally {
      setLoading(false);
    }
  };

  const fieldKeys = {
    itemName: isGuj ? 'item_name_gu' : 'item_name',
    desc: isGuj ? 'desc_gu' : 'desc_en',
    unit: isGuj ? 'unit_gu' : 'unit'
  };

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl p-12 overflow-hidden relative animate-in slide-in-from-bottom duration-500">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
              <Package size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                {currentItem ? t('itemMaster.editItem', 'Refine Nomenclature') : t('itemMaster.createItem', 'Initialize Object')}
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Inventory Registry node</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-2xl transition-all active:scale-90 border border-slate-100">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-black uppercase tracking-widest rounded-2xl animate-pulse flex items-center gap-3">
            <ShieldAlert size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">

          {/* Section 1: Registry Profile */}
          <div className="space-y-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
              <div className="w-6 h-0.5 bg-blue-600"></div> Registry Context
            </h3>

            <div className="grid grid-cols-[160px_1fr_160px_1fr] items-center gap-x-4 gap-y-[20px]">
              {/* ITEM CODE */}
              <FormLabel icon={QrCode}>{t('itemMaster.itemCode') || 'Item Code'} :</FormLabel>
              <div className="flex gap-2">
                <FormInput
                  name="item_code"
                  value={formData.item_code}
                  onChange={handleChange}
                  required
                  disabled={!!item}
                  className="bg-blue-50/30 border-blue-100 text-blue-700 italic flex-1"
                />
                {!item && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextCode = itemsList.length > 0 ? (Math.max(...itemsList.map(i => parseInt(i.item_code) || 0)) + 1).toString() : "1";
                      const nextBarcode = Math.floor(100000 + Math.random() * 900000).toString();
                      setFormData(prev => ({ ...prev, item_code: nextCode, barcode: nextBarcode }));
                    }}
                    className="px-4 h-10 bg-slate-900 text-white text-[9px] font-black uppercase rounded-2xl hover:bg-blue-600 transition-all shadow-md active:scale-95"
                  >
                    Auto
                  </button>
                )}
              </div>

              {/* AUTOSTOCK & BARCODE */}
              <div className="col-span-2 flex items-center justify-between pl-6 h-10">
                <div className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="consider_in_autostock"
                    id="consider_in_autostock"
                    checked={formData.consider_in_autostock === 1}
                    onChange={handleChange}
                    className="w-5 h-5 border-2 border-slate-200 rounded-2xl accent-blue-600 cursor-pointer"
                  />
                  <label htmlFor="consider_in_autostock" className="text-[10px] font-black text-slate-400 group-hover:text-blue-600 uppercase tracking-widest cursor-pointer transition-colors">AutoStock Process?</label>
                </div>

                <div className="flex items-center gap-4">
                  <FormLabel icon={Tag} className="!pr-0">Barcode :</FormLabel>
                  <div className="flex bg-slate-50 border border-slate-100 p-0.5 rounded-2xl">
                    <input
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleChange}
                      placeholder="6-DIGIT"
                      className="w-24 h-8 px-4 text-[11px] bg-transparent outline-none font-mono font-black text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="h-8 px-3 bg-white text-slate-600 text-[9px] font-black uppercase rounded-xl border border-slate-100 hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                    >
                      Gen
                    </button>
                  </div>
                </div>
              </div>

              {/* ITEM NAME */}
              <FormLabel icon={Package}>{t('itemMaster.itemName') || 'Item Name'} :</FormLabel>
              <div className="col-span-3">
                <FormInput
                  name={fieldKeys.itemName}
                  value={formData[fieldKeys.itemName]}
                  onChange={handleChange}
                  required
                  placeholder="Object Nomenclature"
                />
              </div>

              {/* DESCRIPTION */}
              <FormLabel icon={FileText}>{t('itemMaster.description') || 'Description'} :</FormLabel>
              <div className="col-span-3">
                <FormInput
                  name={fieldKeys.desc}
                  value={formData[fieldKeys.desc]}
                  onChange={handleChange}
                  className="italic font-medium border-dashed bg-transparent"
                  placeholder="Additional metadata..."
                />
              </div>

              {/* UNIT */}
              <FormLabel icon={Layers}>{t('itemMaster.unit') || 'Unit'} :</FormLabel>
              <div className="col-span-1 flex h-10">
                <input
                  name={fieldKeys.unit}
                  value={formData[fieldKeys.unit]}
                  onChange={handleChange}
                  className="flex-1 px-4 text-[11px] border border-slate-100 border-r-0 rounded-l-2xl outline-none font-black uppercase bg-slate-50/50 text-slate-700"
                />
                <select
                  onChange={(e) => setFormData(p => ({ ...p, [fieldKeys.unit]: e.target.value }))}
                  value={formData[fieldKeys.unit]}
                  className="w-12 border border-slate-100 border-l-0 bg-slate-50/50 rounded-r-2xl outline-none p-1 text-xs cursor-pointer hover:bg-white transition-all"
                >
                  <option value="Nos">Nos</option>
                  <option value="નંગ">નંગ</option>
                  <option value="Kg">Kg</option>
                  <option value="Pcs">Pcs</option>
                  <option value="Ltr">Ltr</option>
                </select>
              </div>
              <div className="col-span-2"></div>

              {/* PURCHASE BOOK */}
              <FormLabel icon={Briefcase}>Purchase Book :</FormLabel>
              <div className="col-span-3 flex gap-2">
                <FormInput
                  type="text"
                  value={formData.purchase_account_id}
                  onChange={(e) => setFormData(p => ({ ...p, purchase_account_id: e.target.value }))}
                  className="w-24 text-center bg-violet-50/50 border-violet-100 text-violet-700 font-black"
                  placeholder="ID"
                />
                <select
                  name="purchase_account_id"
                  value={formData.purchase_account_id}
                  onChange={handleChange}
                  className="flex-1 h-10 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold uppercase outline-none focus:border-blue-500 bg-slate-50/50 hover:bg-white"
                >
                  <option value="">-- SELECT PURCHASE ACCOUNT --</option>
                  {accounts.filter(a => a.account_type === 'purchase').map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                  ))}
                </select>
              </div>

              {/* SALES BOOK */}
              <FormLabel icon={TrendingUp}>Sales Book :</FormLabel>
              <div className="col-span-3 flex gap-2">
                <FormInput
                  type="text"
                  value={formData.sales_account_id}
                  onChange={(e) => setFormData(p => ({ ...p, sales_account_id: e.target.value }))}
                  className="w-24 text-center bg-emerald-50/50 border-emerald-100 text-emerald-700 font-black"
                  placeholder="ID"
                />
                <select
                  name="sales_account_id"
                  value={formData.sales_account_id}
                  onChange={handleChange}
                  className="flex-1 h-10 border border-slate-100 rounded-2xl px-4 text-[11px] font-bold uppercase outline-none focus:border-blue-500 bg-slate-50/50 hover:bg-white"
                >
                  <option value="">-- SELECT SALES ACCOUNT --</option>
                  {accounts.filter(a => a.account_type === 'sales').map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Stock Orchestration */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
                <div className="w-6 h-0.5 bg-amber-500"></div> Stock Ledger control
              </h3>
              <label className="flex items-center gap-2 cursor-pointer group pr-4">
                <input
                  type="checkbox"
                  name="do_auto_stock_in_sales"
                  id="do_auto_stock_in_sales"
                  checked={formData.do_auto_stock_in_sales === 1}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-slate-200 accent-amber-500 cursor-pointer"
                />
                <span className="text-[10px] font-black text-slate-400 group-hover:text-amber-600 uppercase tracking-widest transition-colors">Auto-Stock Registry</span>
              </label>
            </div>

            <div className="p-10 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] scale-[4] text-slate-900 group-hover:opacity-[0.05] transition-all duration-700">
                <Activity />
              </div>

              <div className="grid grid-cols-[160px_120px_160px_120px] gap-x-12 gap-y-[20px] items-center justify-center relative z-10">
                <FormLabel icon={Box}>Opening Stock :</FormLabel>
                <FormInput type="number" step="0.001" name="opening_stock" value={formData.opening_stock} onChange={handleChange} className="text-right font-mono" />

                <FormLabel icon={IndianRupee}>Purchase Rate :</FormLabel>
                <FormInput type="number" step="0.01" name="purchase_price" value={formData.purchase_price} onChange={handleChange} className="text-right font-mono text-blue-600" />

                <FormLabel icon={TrendingUp} className="text-slate-800">Standard Sale :</FormLabel>
                <FormInput type="number" step="0.01" name="sale_price" value={formData.sale_price} onChange={handleChange} className="text-right font-mono bg-white border-blue-500/20 text-rose-600 shadow-lg shadow-rose-100/20 ring-4 ring-rose-500/5" />

                <FormLabel icon={ArrowDownLeft}>Inward (Total) :</FormLabel>
                <div className="relative">
                  <FormInput
                    disabled
                    value={(parseFloat(formData.opening_stock || 0) + parseFloat(formData.inward || 0)).toFixed(3)}
                    className="text-right bg-blue-50/50 border-blue-100 text-blue-800"
                  />
                  <span className="absolute -top-3 right-0 text-[7px] font-black text-blue-400 uppercase tracking-tighter">Gross Inflow</span>
                </div>

                <FormLabel icon={IndianRupee}>Op Stock Val :</FormLabel>
                <FormInput disabled value={formData.opening_stock_value} className="text-right bg-slate-100/50 text-slate-400" />

                <FormLabel icon={ArrowUpRight}>Outward (Total) :</FormLabel>
                <div className="relative">
                  <FormInput
                    disabled
                    value={parseFloat(formData.outward || 0).toFixed(3)}
                    className="text-right bg-slate-200/30 text-slate-400"
                  />
                  <span className="absolute -top-3 right-0 text-[7px] font-black text-slate-400 uppercase tracking-tighter">Total Dispatch</span>
                </div>

                <FormLabel icon={ShieldAlert}>Critical Min :</FormLabel>
                <FormInput type="number" step="0.001" name="minimum_stock" value={formData.minimum_stock} onChange={handleChange} className="text-right font-mono text-amber-600" />

                <FormLabel icon={Activity}>Closing Bal :</FormLabel>
                <FormInput disabled value={(parseFloat(formData.opening_stock || 0) + parseFloat(formData.inward || 0) - parseFloat(formData.outward || 0)).toFixed(3)} className="text-right bg-slate-900 text-white border-none shadow-xl shadow-slate-200 ring-4 ring-slate-900/10" />
              </div>
            </div>
          </div>

          {/* Section 3: Statutory Compliance */}
          <div className="space-y-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
              <div className="w-6 h-0.5 bg-emerald-500"></div> Statutory Protocol
            </h3>

            <div className="grid grid-cols-[160px_120px_160px_120px] gap-x-12 gap-y-[20px] items-center justify-center">
              <FormLabel icon={Calendar}>Effective At :</FormLabel>
              <FormInput type="date" name="effective_date" value={formData.effective_date} onChange={handleChange} className="text-slate-500 font-mono text-[10px]" />

              <FormLabel icon={ShieldAlert}>HSN / SAC :</FormLabel>
              <FormInput name="hsn_code" value={formData.hsn_code} onChange={handleChange} className="text-center font-black bg-emerald-50/20 border-emerald-100" />

              <FormLabel icon={Percent}>SGST % :</FormLabel>
              <FormInput type="number" step="0.01" name="sgst_percent" value={formData.sgst_percent} onChange={handleChange} className="text-right font-mono" />

              <FormLabel icon={Percent}>CGST % :</FormLabel>
              <FormInput type="number" step="0.01" name="cgst_percent" value={formData.cgst_percent} onChange={handleChange} className="text-right font-mono" />

              <FormLabel icon={Percent}>IGST % :</FormLabel>
              <FormInput type="number" step="0.01" name="igst_percent" value={formData.igst_percent} onChange={handleChange} className="text-right font-mono" />

              <FormLabel icon={Percent}>Cess Amount :</FormLabel>
              <FormInput type="number" step="0.01" name="cess_percent" value={formData.cess_percent} onChange={handleChange} className="text-right font-mono text-slate-300" />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-6 flex gap-5 border-t border-slate-50">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-slate-900 text-white font-black uppercase tracking-[0.2em] py-5 rounded-[2rem] hover:bg-blue-600 transition-all shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-300"
            >
              {loading ? <RefreshCcw className="animate-spin" size={20} /> : <><Save size={20} /> {currentItem ? 'Commit Changes' : 'Initialize Object'}</>}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-12 py-5 bg-white border border-slate-100 text-slate-400 font-black uppercase tracking-[0.2em] rounded-[2rem] hover:bg-slate-50 hover:text-slate-800 transition-all active:scale-95"
            >
              Abort
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
