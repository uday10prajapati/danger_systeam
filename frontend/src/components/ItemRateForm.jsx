import React, { useState, useEffect } from 'react';
import {
  X, AlertCircle, ShoppingBag, IndianRupee,
  Calendar, TrendingUp, Save, RefreshCcw,
  Target, ShieldCheck, Activity, Layers,
  ArrowRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

// Airy Label Component
const FormLabel = ({ children, icon: Icon, className = "" }) => (
  <div className={`flex items-center gap-2 mb-2 select-none ${className}`}>
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] whitespace-nowrap">
      {children}
    </label>
    {Icon && <Icon size={12} className="text-slate-300" />}
  </div>
);

// Airy Input Component
const FormInput = ({ className = "", error, ...props }) => (
  <div className="space-y-1.5 flex-1 group">
    <div className="relative">
      <input
        className={`w-full h-12 px-5 text-sm border ${error ? 'border-rose-400 bg-rose-50/30' : 'border-slate-100 bg-slate-50/50'} focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none focus:bg-white hover:bg-slate-50 transition-all rounded-lg font-bold text-slate-700 placeholder:text-slate-200 ${className}`}
        {...props}
      />
    </div>
    {error && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-2">{error}</p>}
  </div>
);

export default function ItemRateForm({ rate, items, company, onSubmit, onClose }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    item_id: '',
    purchase_rate: '',
    sale_rate: '',
    mrp: '',
    effective_from: new Date().toISOString().split('T')[0]
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (rate) {
      setFormData({
        item_id: rate.item_id,
        purchase_rate: rate.purchase_rate,
        sale_rate: rate.sale_rate,
        mrp: rate.mrp || '',
        effective_from: new Date(rate.effective_from).toISOString().split('T')[0]
      });
      const item = items.find(i => i.id === rate.item_id);
      setSelectedItem(item);
    }
  }, [rate, items]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'item_id') {
      const item = items.find(i => i.id === parseInt(value));
      setSelectedItem(item);
    }

    if (errors.length > 0) setErrors([]);
  };

  const validateForm = () => {
    const newErrors = [];
    if (!formData.item_id) newErrors.push("Core SKU designation required");
    if (!formData.purchase_rate || parseFloat(formData.purchase_rate) <= 0) newErrors.push("Procurement valuation invalid");
    if (!formData.sale_rate || parseFloat(formData.sale_rate) <= 0) newErrors.push("Release yield index required");
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        item_id: parseInt(formData.item_id),
        purchase_rate: parseFloat(formData.purchase_rate),
        sale_rate: parseFloat(formData.sale_rate),
        mrp: formData.mrp ? parseFloat(formData.mrp) : null,
        effective_from: formData.effective_from
      };
      await onSubmit(submitData);
    } catch (error) {
      const backendErrors = error.response?.data?.errors;
      if (Array.isArray(backendErrors)) {
        setErrors(backendErrors);
      } else {
        setErrors([error.response?.data?.message || error.response?.data?.error || "Registry synchronization failure"]);
      }
    } finally {
      setLoading(false);
    }
  };

  const margin = formData.purchase_rate && formData.sale_rate
    ? ((formData.sale_rate - formData.purchase_rate) / formData.purchase_rate * 100).toFixed(1)
    : '0.0';

  return (
    <div className="bg-white rounded-lg border border-slate-100 shadow-2xl p-12 overflow-hidden relative animate-in slide-in-from-bottom duration-500">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full -mr-32 -mt-32 blur-3xl shadow-inner"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {rate ? 'Modify Tariff Manifest' : 'Initialize Price Gradient'}
            </h2>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1 italic">Financial Shard Valuation Protocol</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={24} /></button>
        </div>

        {errors.length > 0 && (
          <div className="mb-8 p-5 bg-rose-50 border border-rose-100 rounded-lg flex gap-4 animate-in slide-in-from-top duration-300">
            <AlertCircle className="text-rose-500 shrink-0" size={20} />
            <ul className="text-[10px] font-black text-rose-700 uppercase tracking-widest space-y-1">
              {errors.map((err, i) => <li key={i}>• {err}</li>)}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">

          {/* Section 1: SKU Identification */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
              <div className="w-6 h-0.5 bg-blue-600"></div> Core Inventory Link
            </h3>
            <div className="relative group">
              <FormLabel icon={ShoppingBag}>Designated SKU Registry *</FormLabel>
              <div className="relative">
                <select
                  name="item_id"
                  value={formData.item_id}
                  onChange={handleChange}
                  disabled={loading || !!rate}
                  className="w-full h-12 px-5 text-sm border border-slate-100 bg-slate-50/50 focus:border-blue-500 focus:bg-white rounded-lg outline-none font-bold text-slate-700 appearance-none cursor-pointer hover:bg-slate-50 transition-all uppercase tracking-widest disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">SCAN OR SELECT SYSTEM ID...</option>
                  {items.filter(i => i.is_active === 1).map(item => (
                    <option key={item.id} value={item.id}>{item.item_name} ({item.item_code})</option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">▼</div>
              </div>
              {selectedItem && (
                <div className="mt-3 flex items-center gap-3 px-4 py-2 bg-[#F8FAFC] rounded-lg border border-slate-50">
                  <div className="p-1.5 bg-white rounded-lg shadow-sm text-blue-500"><Layers size={12} /></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Classification: {selectedItem.category} | Logged Unit: {selectedItem.unit}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Valuation Protocol */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
              <div className="w-6 h-0.5 bg-emerald-500"></div> Fiscal Valuation Gradients
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <FormLabel icon={IndianRupee}>Procurement Valuation *</FormLabel>
                <FormInput type="number" step="0.01" name="purchase_rate" value={formData.purchase_rate} onChange={handleChange} placeholder="0.00" className="text-right font-mono" />
              </div>
              <div>
                <FormLabel icon={Activity}>Target Release Yield *</FormLabel>
                <FormInput type="number" step="0.01" name="sale_rate" value={formData.sale_rate} onChange={handleChange} placeholder="0.00" className="text-right font-mono" />
              </div>
              <div>
                <FormLabel icon={ShieldCheck}>Market Ceiling (M.R.P.)</FormLabel>
                <FormInput type="number" step="0.01" name="mrp" value={formData.mrp} onChange={handleChange} placeholder="0.00" className="text-right font-mono" />
              </div>
              <div>
                <FormLabel icon={Calendar}>Timeline Activation *</FormLabel>
                <FormInput type="date" name="effective_from" value={formData.effective_from} onChange={handleChange} className="uppercase tracking-widest" />
              </div>
            </div>

            {/* Real-time ROI Analysis */}
            {formData.purchase_rate && formData.sale_rate && (
              <div className="mt-10 p-10 rounded-lg bg-slate-900 shadow-2xl shadow-slate-200 group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 text-slate-800 opacity-20 group-hover:rotate-45 transition-transform duration-700"><TrendingUp size={120} /></div>
                <div className="relative z-10 grid grid-cols-2 gap-10">
                  <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2 italic">Yield Gradient Index</p>
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-black text-white italic tracking-tighter">{margin}%</p>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${parseFloat(margin) > 20 ? 'bg-emerald-500' : 'bg-rose-500'} text-white mb-1 uppercase`}>
                        {parseFloat(margin) > 20 ? 'Optimal' : 'Low ROI'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right border-l border-slate-800 pl-10">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 italic">Net Profit per Shard</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">₹{(formData.sale_rate - formData.purchase_rate).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-black uppercase tracking-[0.2em] text-[10px] py-5 rounded-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-200"
            >
              {loading ? <RefreshCcw className="animate-spin" size={18} /> : <><Save size={18} /> Commit Tariff Manifest</>}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-12 py-5 bg-white border border-slate-100 text-slate-400 font-bold rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-all uppercase text-[10px] tracking-widest"
            >
              Abort
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
