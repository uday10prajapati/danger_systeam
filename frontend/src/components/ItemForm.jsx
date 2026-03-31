import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

// Traditional Layout Label Component
const FormLabel = ({ children, className = "" }) => (
  <label className={`text-sm font-semibold text-slate-800 tracking-tight whitespace-nowrap text-right pr-2 select-none ${className}`}>
    {children}
  </label>
);

// Traditional Input field
const FormInput = ({ className = "", ...props }) => (
  <input 
    className={`w-full px-2 py-1 text-sm border border-blue-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:bg-[#CFE2F3] text-slate-800 disabled:font-bold ${className}`} 
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
    purchase_price: item?.purchase_price || 0, // This represents Purchase Rate
    sale_price: item?.sale_price || 0, // This represents Sales Rate
  });

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch Accounts to populate Purchase Account and Sales Account
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
    
    // Auto-uppercase item_code and barcode
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
          sgst_percent: parseFloat(existingItem.sgst_percent) || (parseFloat(existingItem.tax_percentage) > 0 ? parseFloat(existingItem.tax_percentage)/2 : 2.50),
          cgst_percent: parseFloat(existingItem.cgst_percent) || (parseFloat(existingItem.tax_percentage) > 0 ? parseFloat(existingItem.tax_percentage)/2 : 2.50),
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

      // Automatically calculate Opening Stock Value if Opening Stock or Rate changes
      if (name === 'opening_stock' || name === 'purchase_price') {
        const qty = name === 'opening_stock' ? parseFloat(value || 0) : parseFloat(newData.opening_stock || 0);
        const rate = name === 'purchase_price' ? parseFloat(value || 0) : parseFloat(newData.purchase_price || 0);
        newData.opening_stock_value = (qty * rate).toFixed(2);
      }

      // Automatically set CGST same as SGST
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
        // Update
        await axios.put(`${import.meta.env.VITE_API_URL}/api/items/${currentItem.id}`, formData, {
          headers: { 'x-company-id': company.id }
        });
      } else {
        // Create
        await axios.post(`${import.meta.env.VITE_API_URL}/api/items`, formData, {
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

  // Field Name Mapping based on Language
  const fieldKeys = {
    itemName: isGuj ? 'item_name_gu' : 'item_name',
    desc: isGuj ? 'desc_gu' : 'desc_en',
    unit: isGuj ? 'unit_gu' : 'unit'
  };



  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 overflow-auto">
      {/* Container mimics standard VB / WinForms Application Window */}
      <div className="bg-[#f0f0f0] border-2 border-[#1E3A8A] rounded shadow-2xl m-4 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col font-sans">
        
        {/* Title Bar */}
        <div className="bg-[#1E3A8A] text-white px-3 py-1 flex justify-between items-center select-none cursor-move">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide">
              {currentItem ? t('itemMaster.editItem') || 'Edit Item Master' : t('itemMaster.createItem') || 'Add Item Master'}
            </span>
          </div>
          <button onClick={onClose} className="hover:bg-red-500 rounded p-[2px] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-100 border-b border-red-300 text-red-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          
          {/* TOP GRID (Rows 1-6) */}
          <div className="grid grid-cols-[140px_1fr_120px_1fr] items-center gap-x-2 gap-y-[10px] mb-6">
            
            {/* ROW 1: Item Code & AutoStock */}
            <FormLabel>{t('itemMaster.itemCode') || 'Item Code'} :</FormLabel>
            <div className="col-span-1">
              <FormInput 
                name="item_code" 
                value={formData.item_code} 
                onChange={handleChange} 
                required 
                disabled={!!item}
                list="item-codes-list"
                autoComplete="off"
                className="w-40 font-bold bg-[#A3C7FF] border-[#6ea5ff]" // Mimic screenshot blue bg
              />
              <datalist id="item-codes-list">
                {itemsList.map((i) => (
                  <option key={i.id} value={i.item_code}>
                    {i.item_name}
                  </option>
                ))}
              </datalist>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input 
                type="checkbox" 
                name="consider_in_autostock" 
                checked={formData.consider_in_autostock === 1} 
                onChange={handleChange} 
                className="w-3.5 h-3.5 border-slate-400"
              />
              <span className="text-sm font-semibold text-slate-800 select-none">Consider in AutoStock process ?</span>
            </div>

            {/* ROW 2: Item Name */}
            <FormLabel>{t('itemMaster.itemName') || 'Item Name'} :</FormLabel>
            <div className="col-span-3">
              <FormInput 
                name={fieldKeys.itemName} 
                value={formData[fieldKeys.itemName]} 
                onChange={handleChange} 
                required 
              />
            </div>

            {/* ROW 3: Description */}
            <FormLabel>{t('itemMaster.description') || 'Description'} :</FormLabel>
            <div className="col-span-3">
              <FormInput 
                name={fieldKeys.desc} 
                value={formData[fieldKeys.desc]} 
                onChange={handleChange} 
              />
            </div>

            {/* ROW 4: Unit */}
            <FormLabel>{t('itemMaster.unit') || 'Unit'} :</FormLabel>
            <div className="col-span-1 flex items-center">
              <input 
                name={fieldKeys.unit} 
                value={formData[fieldKeys.unit]} 
                onChange={handleChange} 
                className="w-24 px-2 py-1 text-sm border border-blue-300 bg-white"
              />
              <select 
                onChange={(e) => setFormData(p => ({ ...p, [fieldKeys.unit]: e.target.value }))}
                value={formData[fieldKeys.unit]} 
                className="w-6 px-0 py-1 border border-l-0 border-blue-300 bg-slate-200"
              >
                <option value="Nos">Nos</option>
                <option value="નંગ">નંગ</option>
                <option value="Kg">Kg</option>
                <option value="Pcs">Pcs</option>
                <option value="Ltr">Ltr</option>
              </select>
            </div>
            <div className="col-span-2"></div> {/* Spacing */}

            {/* ROW 5: Purchase Account */}
            <FormLabel>Purchase Account :</FormLabel>
            <div className="col-span-3 flex items-center gap-1">
              <FormInput 
                type="text" 
                value={formData.purchase_account_id}
                onChange={(e) => setFormData(p => ({ ...p, purchase_account_id: e.target.value }))}
                className="w-16 text-center bg-white"
              />
              <select 
                name="purchase_account_id" 
                value={formData.purchase_account_id} 
                onChange={handleChange}
                className="flex-1 px-2 py-1 text-sm border border-blue-300 bg-white"
              >
                <option value="">-- {t('itemMaster.selectAccount') || 'Select Account'} --</option>
                {accounts.filter(a => a.account_type === 'purchase').map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                ))}
              </select>
            </div>

            {/* ROW 6: Sales Account */}
            <FormLabel>Sales Account :</FormLabel>
            <div className="col-span-3 flex items-center gap-1">
              <FormInput 
                type="text" 
                value={formData.sales_account_id}
                onChange={(e) => setFormData(p => ({ ...p, sales_account_id: e.target.value }))}
                className="w-16 text-center bg-white"
              />
              <select 
                name="sales_account_id" 
                value={formData.sales_account_id} 
                onChange={handleChange}
                className="flex-1 px-2 py-1 text-sm border border-blue-300 bg-white"
              >
                <option value="">-- {t('itemMaster.selectAccount') || 'Select Account'} --</option>
                {accounts.filter(a => a.account_type === 'sales').map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                ))}
              </select>
            </div>
          </div>


          {/* STOCK INFORMATION GROUP BOX */}
          <div className="relative border border-slate-400 p-4 mt-8 pb-5">
            <div className="absolute -top-3 left-2 bg-[#f0f0f0] px-2 flex items-center gap-4">
              <span className="text-sm font-semibold text-[#1E3A8A]">Stock Information</span>
              <label className="flex items-center gap-1 text-sm font-semibold text-slate-800 cursor-pointer">
                <input 
                  type="checkbox" 
                  name="do_auto_stock_in_sales" 
                  checked={formData.do_auto_stock_in_sales === 1}
                  onChange={handleChange}
                  className="w-3.5 h-3.5"
                /> 
                <span>Do Auto Stock In Sales</span>
              </label>
            </div>

            {/* INNER GRID */}
            <div className="grid grid-cols-[140px_100px_140px_100px] gap-x-6 gap-y-[10px] items-center justify-center mt-2">
              
              {/* Op Stock */}
              <FormLabel>Opening Stock :</FormLabel>
              <FormInput type="number" step="0.001" name="opening_stock" value={formData.opening_stock} onChange={handleChange} className="text-right" />
              
              {/* Purchase Rate */}
              <FormLabel>Purchase Rate :</FormLabel>
              <FormInput type="number" step="0.01" name="purchase_price" value={formData.purchase_price} onChange={handleChange} className="text-right" />

              {/* Sales Rate */}
              <FormLabel className="text-blue-800">Sales Rate :</FormLabel>
              <FormInput type="number" step="0.01" name="sale_price" value={formData.sale_price} onChange={handleChange} className="text-right font-bold text-blue-900 border-blue-400" />

              {/* Inward */}
              <FormLabel>Inward :</FormLabel>
              <FormInput disabled value={parseFloat(formData.inward || 0).toFixed(3)} className="text-right text-slate-700 bg-[#CFE2F3] font-bold" />
              
              {/* Op Stock Value */}
              <FormLabel>Opening Stock Value :</FormLabel>
              <FormInput disabled value={formData.opening_stock_value} className="text-right bg-slate-100" />

              {/* Outward */}
              <FormLabel>Outward :</FormLabel>
              <FormInput disabled value={parseFloat(formData.outward || 0).toFixed(3)} className="text-right text-slate-700 bg-[#CFE2F3] font-bold" />
              
              {/* Min Stock */}
              <FormLabel>Minimum Stock :</FormLabel>
              <FormInput type="number" step="0.001" name="minimum_stock" value={formData.minimum_stock} onChange={handleChange} className="text-right" />

              {/* Closing Stock */}
              <FormLabel>Closing Stock :</FormLabel>
              <FormInput disabled value={(parseFloat(formData.opening_stock || 0) + parseFloat(formData.inward || 0) - parseFloat(formData.outward || 0)).toFixed(3)} className="text-right text-slate-700 bg-[#CFE2F3] font-bold" />
              
              {/* Loss / Kg */}
              <FormLabel>Loss Per Kg :</FormLabel>
              <FormInput type="number" step="0.001" name="loss_per_kg" value={formData.loss_per_kg} onChange={handleChange} className="text-right" />
            </div>

            {/* BOTTOM Inner grid (Dates and Taxes) */}
            <div className="grid grid-cols-[140px_100px_140px_100px] gap-x-6 gap-y-[10px] items-center justify-center mt-6">
              <FormLabel>Effective Date :</FormLabel>
              <div className="flex">
                <FormInput type="date" name="effective_date" value={formData.effective_date} onChange={handleChange} className="w-[100px] text-xs" />
              </div>

              <FormLabel>HSN Code :</FormLabel>
              <FormInput name="hsn_code" value={formData.hsn_code} onChange={handleChange} />

              <FormLabel>SGST % :</FormLabel>
              <FormInput type="number" step="0.01" name="sgst_percent" value={formData.sgst_percent} onChange={handleChange} className="text-right" />

              <FormLabel>CGST % :</FormLabel>
              <FormInput type="number" step="0.01" name="cgst_percent" value={formData.cgst_percent} onChange={handleChange} className="text-right" />

              <FormLabel>IGST % :</FormLabel>
              <FormInput type="number" step="0.01" name="igst_percent" value={formData.igst_percent} onChange={handleChange} className="text-right" />

              <FormLabel>Cess % :</FormLabel>
              <FormInput type="number" step="0.01" name="cess_percent" value={formData.cess_percent} onChange={handleChange} className="text-right" />
            </div>
          </div>

        </form>

        {/* Action Buttons */}
        <div className="bg-[#e0e0e0] border-t border-slate-300 px-4 py-3 flex justify-end gap-3 rounded-b">
          <button 
            type="submit" 
            onClick={handleSubmit}
            disabled={loading}
            className="w-24 px-4 py-1 bg-slate-200 border border-slate-400 hover:bg-white hover:border-slate-500 shadow-sm text-sm font-semibold rounded disabled:opacity-50"
          >
            {loading ? '...' : 'Ok'}
          </button>
          <button 
            type="button" 
            onClick={onClose}
            className="w-24 px-4 py-1 bg-slate-200 border border-slate-400 hover:bg-white hover:border-slate-500 shadow-sm text-sm font-semibold rounded"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
