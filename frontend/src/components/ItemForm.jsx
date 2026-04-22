import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

// Traditional Layout Label Component
const FormLabel = ({ children, className = "" }) => (
  <label className={`text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap text-right pr-2 select-none ${className}`}>
    {children}
  </label>
);

// Traditional Input field
const FormInput = ({ className = "", ...props }) => (
  <input 
    className={`w-full h-8 px-3 text-[11px] border border-slate-300 focus:border-black focus:outline-none bg-white disabled:bg-slate-100 text-slate-900 disabled:text-slate-400 font-bold transition-all rounded ${className}`} 
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
    effective_date: item?.effective_date || new Date().toISOString().split('T')[0],
    sgst_percent: item?.sgst_percent !== undefined && item?.sgst_percent !== null ? parseFloat(item.sgst_percent) : 2.50,
    cgst_percent: item?.cgst_percent !== undefined && item?.cgst_percent !== null ? parseFloat(item.cgst_percent) : 2.50,
    igst_percent: item?.igst_percent !== undefined && item?.igst_percent !== null ? parseFloat(item.igst_percent) : 0.00,
    cess_percent: item?.cess_percent !== undefined && item?.cess_percent !== null ? parseFloat(item.cess_percent) : 0.00,
    hsn_code: item?.hsn_code || '21069099',
    tax_percentage: item?.tax_percentage || 0,
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
        setFormData({
          item_code: existingItem.item_code || '',
          consider_in_autostock: existingItem.consider_in_autostock || 0,
          item_name: existingItem.item_name || '',
          item_name_gu: existingItem.item_name_gu || '',
          desc_en: existingItem.desc_en || '',
          desc_gu: existingItem.desc_gu || '',
          unit: existingItem.unit || 'Nos',
          unit_gu: existingItem.unit_gu || 'નંગ',
          barcode: existingItem.barcode || '',
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
        });
        return;
      } else {
        setCurrentItem(null);
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

      return newData;
    });
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[130] p-4 select-none">
      <div className="bg-slate-200 border-2 border-slate-900 w-full max-w-4xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col font-sans relative rounded-lg overflow-hidden max-h-[95vh]">
        
        {/* Title Bar Ribbon */}
        <div className="bg-black text-white px-4 py-2.5 flex justify-between items-center cursor-move">
          <div className="font-black text-[12px] uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-white rounded-sm rotate-45"></div>
            {currentItem ? t('itemMaster.editItem') || 'Edit Item Master' : t('itemMaster.createItem') || 'Add Item Master'}
          </div>
          <button onClick={onClose} className="hover:bg-red-600 p-1 rounded transition-all active:scale-90">
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        {error && (
          <div className="px-5 py-2 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 bg-white">
          
          {/* Main Form Fields */}
          <div className="grid grid-cols-[160px_1fr_160px_1fr] items-center gap-x-4 gap-y-[12px] mb-8">
            
            {/* ROW: Item Code & AutoStock */}
            <FormLabel>{t('itemMaster.itemCode') || 'Item Code'} :</FormLabel>
            <div className="col-span-1">
              <FormInput 
                name="item_code" 
                value={formData.item_code} 
                onChange={handleChange} 
                required 
                disabled={!!item}
                className="w-44 font-black bg-slate-50 border-slate-900 border-2" 
              />
              <datalist id="item-codes-list">
                {itemsList.map((i) => (
                  <option key={i.id} value={i.item_code}>{i.item_name}</option>
                ))}
              </datalist>
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <input 
                type="checkbox" 
                name="consider_in_autostock" 
                checked={formData.consider_in_autostock === 1} 
                onChange={handleChange} 
                className="w-4 h-4 border-2 border-slate-900 rounded accent-black"
              />
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">AutoStock Process ?</span>
            </div>

            {/* ROW: Item Name */}
            <FormLabel>{t('itemMaster.itemName') || 'Item Name'} :</FormLabel>
            <div className="col-span-3">
              <FormInput 
                name={fieldKeys.itemName} 
                value={formData[fieldKeys.itemName]} 
                onChange={handleChange} 
                required 
                className="font-black"
              />
            </div>

            {/* ROW: Description */}
            <FormLabel>{t('itemMaster.description') || 'Description'} :</FormLabel>
            <div className="col-span-3">
              <FormInput 
                name={fieldKeys.desc} 
                value={formData[fieldKeys.desc]} 
                onChange={handleChange} 
                className="italic font-medium"
              />
            </div>

            {/* ROW: Unit */}
            <FormLabel>{t('itemMaster.unit') || 'Unit'} :</FormLabel>
            <div className="col-span-1 flex h-8">
              <input 
                name={fieldKeys.unit} 
                value={formData[fieldKeys.unit]} 
                onChange={handleChange} 
                className="flex-1 px-3 text-[11px] border border-slate-300 rounded-l outline-none font-black uppercase bg-white border-r-0"
              />
              <select 
                onChange={(e) => setFormData(p => ({ ...p, [fieldKeys.unit]: e.target.value }))}
                value={formData[fieldKeys.unit]} 
                className="w-8 border border-slate-300 bg-slate-100 rounded-r border-l-0 outline-none p-1 text-xs cursor-pointer hover:bg-slate-200"
              >
                <option value="Nos">Nos</option>
                <option value="નંગ">નંગ</option>
                <option value="Kg">Kg</option>
                <option value="Pcs">Pcs</option>
                <option value="Ltr">Ltr</option>
              </select>
            </div>
            <div className="col-span-2 h-8"></div>

            {/* ROW: Accounts */}
            <FormLabel>Purchase Book :</FormLabel>
            <div className="col-span-3 flex gap-2">
              <FormInput 
                type="text" 
                value={formData.purchase_account_id}
                onChange={(e) => setFormData(p => ({ ...p, purchase_account_id: e.target.value }))}
                className="w-16 text-center bg-slate-50 font-black"
              />
              <select 
                name="purchase_account_id" 
                value={formData.purchase_account_id} 
                onChange={handleChange}
                className="flex-1 h-8 border border-slate-300 rounded px-3 text-[11px] font-black uppercase outline-none focus:border-black transition-all"
              >
                <option value="">-- SELECT PURCHASE ACCOUNT --</option>
                {accounts.filter(a => a.account_type === 'purchase').map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                ))}
              </select>
            </div>

            <FormLabel>Sales Book :</FormLabel>
            <div className="col-span-3 flex gap-2">
              <FormInput 
                type="text" 
                value={formData.sales_account_id}
                onChange={(e) => setFormData(p => ({ ...p, sales_account_id: e.target.value }))}
                className="w-16 text-center bg-slate-50 font-black"
              />
              <select 
                name="sales_account_id" 
                value={formData.sales_account_id} 
                onChange={handleChange}
                className="flex-1 h-8 border border-slate-300 rounded px-3 text-[11px] font-black uppercase outline-none focus:border-black transition-all"
              >
                <option value="">-- SELECT SALES ACCOUNT --</option>
                {accounts.filter(a => a.account_type === 'sales').map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Group: Stock Information */}
          <div className="relative border-2 border-slate-900 p-6 pt-8 rounded-lg mt-10">
            <div className="absolute -top-4 left-4 bg-white px-4 flex items-center gap-6">
              <span className="text-[11px] font-black text-black uppercase tracking-[0.2em] italic">Stock Ledger Control</span>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  name="do_auto_stock_in_sales" 
                  checked={formData.do_auto_stock_in_sales === 1}
                  onChange={handleChange}
                  className="w-4 h-4 accent-black"
                /> 
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-black">Auto-Stock Registry</span>
              </label>
            </div>

            <div className="grid grid-cols-[160px_100px_160px_100px] gap-x-8 gap-y-[14px] items-center justify-center">
              <FormLabel>Opening Stock :</FormLabel>
              <FormInput type="number" step="0.001" name="opening_stock" value={formData.opening_stock} onChange={handleChange} className="text-right font-mono text-xs" />
              
              <FormLabel>Purchase Rate :</FormLabel>
              <FormInput type="number" step="0.01" name="purchase_price" value={formData.purchase_price} onChange={handleChange} className="text-right font-mono text-xs" />

              <FormLabel className="text-black">Standard Sale :</FormLabel>
              <FormInput type="number" step="0.01" name="sale_price" value={formData.sale_price} onChange={handleChange} className="text-right font-mono bg-yellow-50/50 border-slate-900 border-2 text-xs" />

              <FormLabel>Inward (Total) :</FormLabel>
              <FormInput disabled value={parseFloat(formData.inward || 0).toFixed(3)} className="text-right bg-slate-100 font-mono text-xs" />
              
              <FormLabel>Op Stock Val :</FormLabel>
              <FormInput disabled value={formData.opening_stock_value} className="text-right bg-slate-50 font-mono text-xs" />

              <FormLabel>Outward (Total) :</FormLabel>
              <FormInput disabled value={parseFloat(formData.outward || 0).toFixed(3)} className="text-right bg-slate-100 font-mono text-xs" />
              
              <FormLabel>Critical Min :</FormLabel>
              <FormInput type="number" step="0.001" name="minimum_stock" value={formData.minimum_stock} onChange={handleChange} className="text-right font-mono text-xs" />

              <FormLabel>Closing Bal :</FormLabel>
              <FormInput disabled value={(parseFloat(formData.opening_stock || 0) + parseFloat(formData.inward || 0) - parseFloat(formData.outward || 0)).toFixed(3)} className="text-right bg-slate-900 text-white font-mono text-xs shadow-xl" />
            </div>

            {/* Statutory Details */}
            <div className="grid grid-cols-[160px_100px_160px_100px] gap-x-8 gap-y-[14px] items-center justify-center mt-8 pt-6 border-t border-slate-200">
              <FormLabel>Effective At :</FormLabel>
              <FormInput type="date" name="effective_date" value={formData.effective_date} onChange={handleChange} className="font-mono text-[10px]" />

              <FormLabel>HSN / SAC :</FormLabel>
              <FormInput name="hsn_code" value={formData.hsn_code} onChange={handleChange} className="font-black text-center" />

              <FormLabel>SGST % :</FormLabel>
              <FormInput type="number" step="0.01" name="sgst_percent" value={formData.sgst_percent} onChange={handleChange} className="text-right font-mono" />

              <FormLabel>CGST % :</FormLabel>
              <FormInput type="number" step="0.01" name="cgst_percent" value={formData.cgst_percent} onChange={handleChange} className="text-right font-mono" />

              <FormLabel>IGST % :</FormLabel>
              <FormInput type="number" step="0.01" name="igst_percent" value={formData.igst_percent} onChange={handleChange} className="text-right font-mono" />

              <FormLabel>Cess Amount :</FormLabel>
              <FormInput type="number" step="0.01" name="cess_percent" value={formData.cess_percent} onChange={handleChange} className="text-right font-mono" />
            </div>
          </div>
        </form>

        {/* Action Footer */}
        <div className="bg-slate-200 border-t border-slate-300 px-6 py-4 flex justify-end gap-4 shadow-inner">
          <button 
            type="button" 
            onClick={onClose}
            className="px-8 h-10 border border-slate-300 bg-white text-slate-600 text-[11px] font-black uppercase tracking-widest rounded hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            onClick={handleSubmit}
            disabled={loading}
            className="px-10 h-10 bg-black text-white text-[11px] font-black uppercase tracking-widest rounded hover:bg-slate-800 transition-all active:scale-95 shadow-lg flex items-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={14} />}
            Confirm & Save Item
          </button>
        </div>

      </div>
    </div>
  );
}
