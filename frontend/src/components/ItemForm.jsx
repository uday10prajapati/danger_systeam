import React, { useState, useEffect } from 'react';
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
    item_name: item?.item_name || '',
    category: item?.category || '',
    unit: item?.unit || 'Nos',
    barcode: item?.barcode || '',
    purchase_price: item?.purchase_price || 0,
    sale_price: item?.sale_price || 0,
    opening_stock: item?.opening_stock || 0,
    minimum_stock: item?.minimum_stock || 0,
    tax_percentage: item?.tax_percentage || 5.00,
    hsn_code: item?.hsn_code || '21069099',
    purchase_account_id: item?.purchase_account_id || '',
    sales_account_id: item?.sales_account_id || '',
    is_active: item?.is_active ?? 1
  });

  useEffect(() => {
    if (company?.id) {
      fetchAccounts();
    }
  }, [company]);

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
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    // Duplicate Check
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
        setMessage({ type: 'success', text: 'Item updated successfully.' });
      } else {
        await axios.post('/api/items', formData, {
          headers: { 'x-company-id': company.id }
        });
        setMessage({ type: 'success', text: 'Item registered successfully.' });
      }
      setTimeout(() => onSubmit(), 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save item.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-0 overflow-hidden rounded-lg">
      <div className="bg-blue-600 px-8 py-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-white italic uppercase tracking-tight">
            {item?.id ? 'Edit Item' : 'Add New Item'}
          </h2>
          <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-1">Configure inventory registry node</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="p-8">
        {message && (
          <div className={`mb-8 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top duration-300 border-l-4 ${
            message.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'
          }`}>
            {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span className="text-[11px] font-bold uppercase tracking-wider">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column: Basic Details */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Package size={18} /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Item Identity</h3>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Code</label>
                  <input
                    type="text"
                    name="item_code"
                    value={formData.item_code}
                    onChange={handleChange}
                    placeholder="000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs shadow-sm"
                  />
                </div>
                <div className="col-span-3 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Item Name</label>
                  <input
                    type="text"
                    name="item_name"
                    value={formData.item_name}
                    onChange={handleChange}
                    required
                    placeholder="Enter Item Name"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs italic shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category / Sector</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="e.g. Raw Material"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Stock Unit</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs cursor-pointer uppercase tracking-widest"
                  >
                    <option value="Nos">Nos</option>
                    <option value="Kg">Kg</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Ltr">Ltr</option>
                    <option value="Mtr">Mtr</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Optical Barcode</label>
                <div className="relative">
                  <QrCode size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    placeholder="Scan or Enter Barcode"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Purchase Book</label>
                  <select
                    name="purchase_account_id"
                    value={formData.purchase_account_id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-[10px] uppercase tracking-tighter"
                  >
                    <option value="">-- SELECT --</option>
                    {accounts.filter(a => a.account_type === 'purchase').map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Sales Book</label>
                  <select
                    name="sales_account_id"
                    value={formData.sales_account_id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-[10px] uppercase tracking-tighter"
                  >
                    <option value="">-- SELECT --</option>
                    {accounts.filter(a => a.account_type === 'sales').map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.account_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column: Pricing & Stock */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><TrendingUp size={18} /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Fiscal & Stock Control</h3>
              </div>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Purchase Price</label>
                    <div className="relative">
                      <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="number"
                        name="purchase_price"
                        value={formData.purchase_price}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 bg-blue-50/30 border border-blue-100 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-mono text-slate-700 font-bold text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Sale Price</label>
                    <div className="relative">
                      <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="number"
                        name="sale_price"
                        value={formData.sale_price}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 bg-emerald-50/30 border border-emerald-100 rounded-lg outline-none focus:bg-white focus:border-emerald-500 transition-all font-mono text-slate-700 font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Opening Stock</label>
                    <div className="relative">
                      <Box size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="number"
                        name="opening_stock"
                        value={formData.opening_stock}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-mono text-slate-700 font-bold text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Min. Stock Alert</label>
                    <div className="relative">
                      <ShieldAlert size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-300" />
                      <input
                        type="number"
                        name="minimum_stock"
                        value={formData.minimum_stock}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 bg-rose-50/30 border border-rose-100 rounded-lg outline-none focus:bg-white focus:border-rose-500 transition-all font-mono text-slate-700 font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tax Percentage (%)</label>
                    <div className="relative">
                      <Percent size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="number"
                        name="tax_percentage"
                        value={formData.tax_percentage}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-mono text-slate-700 font-bold text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">HSN / SAC Code</label>
                    <div className="relative">
                      <ShieldCheck size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="text"
                        name="hsn_code"
                        value={formData.hsn_code}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-mono text-slate-700 font-bold uppercase text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 mt-2 flex items-center gap-4">
                  <div className="p-3 bg-white rounded-lg text-blue-600 shadow-sm border border-slate-100">
                    <Layers size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Shard ID</p>
                    <p className="text-xl font-black text-slate-800">#{item?.id || '...'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="flex-3 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader className="animate-spin" size={18} /> : <><Save size={18} /> {item?.id ? 'Update Item' : 'Save Item'}</>}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-10 py-3 bg-slate-100 text-slate-500 font-bold rounded-lg hover:bg-slate-200 transition-all text-[10px] uppercase tracking-widest active:scale-95"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
