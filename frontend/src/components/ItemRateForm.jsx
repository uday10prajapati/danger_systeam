import React, { useState, useEffect, useRef } from 'react';
import { X, Save, RefreshCcw, Layers, Loader } from 'lucide-react';

export default function ItemRateForm({ rate, items, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    item_id: '',
    purchase_rate: '',
    sale_rate: '',
    mrp: '',
    effective_from: new Date().toISOString().split('T')[0]
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rate) {
      setFormData({
        item_id: rate.item_id,
        purchase_rate: rate.purchase_rate,
        sale_rate: rate.sale_rate,
        mrp: rate.mrp || '',
        effective_from: new Date(rate.effective_from).toISOString().split('T')[0]
      });
    }
  }, [rate]);

  const itemIdRef = useRef(null);
  const purchaseRateRef = useRef(null);
  const saleRateRef = useRef(null);
  const mrpRef = useRef(null);
  const effectiveFromRef = useRef(null);

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

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    if (e && e.preventDefault) e.preventDefault();
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

  return (
    <div className="bg-white p-0 overflow-hidden border border-zinc-400 font-mono text-xs select-none rounded-none animate-none">
      {/* Modal Header */}
      <div className="bg-zinc-100 px-5 py-3.5 border-b border-zinc-300 flex justify-between items-center select-none animate-none">
        <div>
          <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-tight">
            {rate ? 'EDIT TARIFF RECORD' : 'ADD TARIFF RECORD'}
          </h2>
          <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5 tracking-wider">Configure price logic</p>
        </div>
        <button onClick={onClose} className="p-1 text-zinc-400 hover:text-red-600 transition">
          <X size={18} />
        </button>
      </div>

      {/* Modal Body */}
      <div className="p-5 overflow-y-auto space-y-4 animate-none">
        {errors.length > 0 && (
          <div className="p-3 border border-red-300 bg-red-50 text-red-800 space-y-0.5">
            {errors.map((err, i) => (
              <p key={i} className="text-[10px] font-bold font-mono uppercase tracking-widest leading-normal">
                • {err}
              </p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Item / SKU *
            </label>
            <select
              ref={itemIdRef}
              name="item_id"
              value={formData.item_id}
              onChange={handleChange}
              onKeyDown={(e) => handleKeyDown(e, purchaseRateRef)}
              disabled={loading || !!rate}
              className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800 uppercase disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              <option value="">-- SELECT SKU --</option>
              {items.filter(i => i.is_active === 1).map(item => (
                <option key={item.id} value={item.id}>
                  {item.item_name} ({item.item_code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Procurement Rate *
              </label>
              <input
                ref={purchaseRateRef}
                type="number"
                step="0.01"
                name="purchase_rate"
                value={formData.purchase_rate}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, saleRateRef)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Release Rate *
              </label>
              <input
                ref={saleRateRef}
                type="number"
                step="0.01"
                name="sale_rate"
                value={formData.sale_rate}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, mrpRef)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Market Ceiling (MRP)
              </label>
              <input
                ref={mrpRef}
                type="number"
                step="0.01"
                name="mrp"
                value={formData.mrp}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, effectiveFromRef)}
                placeholder="0.00"
                className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Activation Date *
              </label>
              <input
                ref={effectiveFromRef}
                type="date"
                name="effective_from"
                value={formData.effective_from}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, null)}
                className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-zinc-200 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition rounded-none uppercase text-[10px] tracking-widest shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold transition rounded-none uppercase flex items-center justify-center gap-2 text-[10px] tracking-widest shadow-sm"
          >
            {loading ? <Loader className="animate-spin" size={14} /> : <><Save size={14} /> {rate ? 'Update' : 'Save'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
