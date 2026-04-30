import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
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
  const { t } = useTranslation();
  const [formData, setFormData] = useState(initialData || {
    account_code: '',
    p_code: '',
    account_name: '',
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

  const fetchNextCode = async (type) => {
    try {
      const response = await axios.get(`/api/accounts/next-id?type=${type}`, {
        headers: { 'x-company-id': companyId }
      });
      if (response.data.success) {
        setFormData(prev => ({ ...prev, account_code: response.data.nextId.toString() }));
      }
    } catch (err) {
      console.error("Failed to fetch next account code", err);
    }
  };

  const fetchNextPCode = async (type) => {
    try {
      const response = await axios.get(`/api/accounts/next-pcode?type=${type}`, {
        headers: { 'x-company-id': companyId }
      });
      if (response.data.success) {
        setFormData(prev => ({ ...prev, p_code: response.data.nextPCode }));
      }
    } catch (err) {
      console.error("Failed to fetch next account P-Code", err);
    }
  };

  const fetchNextId = async (type) => {
    try {
      const response = await axios.get(`/api/accounts/next-id?type=${type}`, {
        headers: { 'x-company-id': companyId }
      });
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
    { value: 'customer', label: 'Customer' },
    { value: 'vendor', label: 'Vendor' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'bank', label: 'Bank' },
    { value: 'cash', label: 'Cash' },
    { value: 'assets', label: 'Assets' },
    { value: 'liabilities', label: 'Liabilities' },
    { value: 'capital', label: 'Capital' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'expense', label: 'Expense' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'sales', label: 'Sales' }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'opening_balance' ? parseFloat(value) || 0 : value)
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage(null);

    const isDuplicate = existingAccounts.some(acc => 
      acc.account_name.toLowerCase().trim() === formData.account_name.toLowerCase().trim() && 
      acc.id !== initialData?.id
    );

    if (isDuplicate) {
      setMessage({ type: 'error', text: 'Account name already exists. Please use a unique name.' });
      return;
    }

    setLoading(true);

    try {
      const submitData = { company_id: companyId, ...formData };

      if (initialData?.id) {
        await axios.put(`/api/accounts/${initialData.id}`, formData);
        setMessage({ type: 'success', text: 'Account updated successfully.' });
      } else {
        await axios.post('/api/accounts', submitData);
        setMessage({ type: 'success', text: 'Account registered successfully.' });
      }
      setTimeout(() => onSuccess?.(), 1000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save account.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-0 overflow-hidden rounded-lg">
      <div className="bg-blue-600 px-8 py-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-white italic uppercase tracking-tight">
            {initialData?.id ? 'Edit Account' : 'Initialize Account'}
          </h2>
          <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-1">Configure ledger registry node</p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="p-2 text-white/50 hover:text-white transition-colors">
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
            
            {/* Left Column: Basic & Identity */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><User size={18} /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-1 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Code</label>
                  <input
                    type="text"
                    name="account_code"
                    value={formData.account_code || ''}
                    onChange={handleChange}
                    placeholder="000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs shadow-sm"
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">P-Code</label>
                  <input
                    type="text"
                    name="p_code"
                    value={formData.p_code || ''}
                    onChange={handleChange}
                    placeholder="P-000"
                    className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs shadow-sm"
                  />
                </div>
                <div className="col-span-3 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Account Name</label>
                  <input
                    type="text"
                    name="account_name"
                    value={formData.account_name || ''}
                    onChange={handleChange}
                    required
                    placeholder="Enter Ledger Name"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs italic shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Account Type</label>
                  <select
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs cursor-pointer uppercase tracking-widest"
                  >
                    {accountTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mobile Number</label>
                  <div className="relative">
                    <Smartphone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone || ''}
                      onChange={handleChange}
                      placeholder="10-digit Primary"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email / Handle</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleChange}
                    placeholder="finance@node.sh"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Advanced Logic</label>
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="is_subledger"
                      checked={formData.is_subledger}
                      onChange={handleChange}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                    />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${formData.is_subledger ? 'text-blue-600' : 'text-slate-400'}`}>Enable Sub-Ledger Registry</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Financial & Tax */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><TrendingUp size={18} /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Financial Configuration</h3>
              </div>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Opening Balance</label>
                    <div className="relative">
                      <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="number"
                        name="opening_balance"
                        value={formData.opening_balance}
                        onChange={handleChange}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 bg-blue-50/30 border border-blue-100 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-mono text-slate-700 font-bold text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Balance Type</label>
                    <select
                      name="opening_balance_type"
                      value={formData.opening_balance_type}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs uppercase tracking-widest cursor-pointer"
                    >
                      <option value="credit">Jama (Cr)</option>
                      <option value="debit">Udhar (Dr)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">GST Number</label>
                    <div className="relative">
                      <ShieldCheck size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="text"
                        name="gst_no"
                        value={formData.gst_no || ''}
                        onChange={handleChange}
                        placeholder="GSTIN String"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-mono text-slate-700 font-bold uppercase text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">TIN / PAN String</label>
                    <div className="relative">
                      <FileText size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="text"
                        name="tin_no"
                        value={formData.tin_no || ''}
                        onChange={handleChange}
                        placeholder="TIN Details"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-mono text-slate-700 font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mt-2 flex items-center gap-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100/20 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                  <div className="p-3 bg-white rounded-lg text-blue-600 shadow-sm border border-slate-100 relative z-10">
                    <Database size={20} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Shard ID</p>
                    <p className="text-xl font-black text-slate-800">#{initialData?.id || nextId || '...'}</p>
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
              {loading ? <Loader className="animate-spin" size={18} /> : <><Save size={18} /> {initialData?.id ? 'Update Ledger' : 'Register Account'}</>}
            </button>
            <button
              type="button"
              onClick={onCancel}
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
