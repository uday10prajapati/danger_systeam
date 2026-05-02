import React, { useState, useEffect, useRef } from 'react';
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

  // Focus Refs
  const accountCodeRef = useRef(null);
  const pCodeRef = useRef(null);
  const accountNameRef = useRef(null);
  const accountTypeRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const openingBalanceRef = useRef(null);
  const openingBalanceTypeRef = useRef(null);
  const gstNoRef = useRef(null);
  const tinNoRef = useRef(null);

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
      setMessage({ type: 'error', text: 'Account name is required.' });
      return;
    }

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
        onSuccess?.('Account updated successfully.');
      } else {
        await axios.post('/api/accounts', submitData);
        onSuccess?.('Account registered successfully.');
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save account.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-0 overflow-hidden border border-zinc-400 font-mono text-xs select-none rounded-none animate-none">
      <div className="bg-zinc-100 px-5 py-3.5 border-b border-zinc-300 flex justify-between items-center select-none animate-none">
        <div>
          <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-tight">
            {initialData?.id ? 'EDIT ACCOUNT' : 'INITIALIZE ACCOUNT'}
          </h2>
          <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5 tracking-wider">Configure ledger registry node</p>
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
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest leading-none">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Code</label>
                  <input
                    ref={accountCodeRef}
                    type="text"
                    name="account_code"
                    value={formData.account_code || ''}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, pCodeRef)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800"
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">P-Code</label>
                  <input
                    ref={pCodeRef}
                    type="text"
                    name="p_code"
                    value={formData.p_code || ''}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, accountNameRef)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800"
                  />
                </div>
                <div className="col-span-3 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Account Name</label>
                  <input
                    ref={accountNameRef}
                    type="text"
                    name="account_name"
                    value={formData.account_name || ''}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, accountTypeRef)}
                    required
                    placeholder="ENTER LEDGER NAME"
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-sans font-bold text-zinc-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Account Type</label>
                  <select
                    ref={accountTypeRef}
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, phoneRef)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-700 cursor-pointer uppercase tracking-widest"
                  >
                    {accountTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Mobile Number</label>
                  <input
                    ref={phoneRef}
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, emailRef)}
                    placeholder="10-DIGIT PRIMARY"
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-700 font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Email / Handle</label>
                <input
                  ref={emailRef}
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, openingBalanceRef)}
                  placeholder="FINANCE@NODE.SH"
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-700"
                />
              </div>

              <div className="flex flex-col gap-1 pt-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Advanced Logic</label>
                <div className="flex items-center gap-4 bg-zinc-50 p-2 border border-zinc-300">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="is_subledger"
                      checked={formData.is_subledger}
                      onChange={handleChange}
                      className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                    />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${formData.is_subledger ? 'text-zinc-800' : 'text-zinc-400'}`}>Enable Sub-Ledger Registry</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Financial & Tax */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1 border-b border-zinc-200 pb-1">
                <TrendingUp size={15} className="text-zinc-500" />
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest leading-none">Financial Configuration</h3>
              </div>

              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Opening Balance</label>
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
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Balance Type</label>
                    <select
                      ref={openingBalanceTypeRef}
                      name="opening_balance_type"
                      value={formData.opening_balance_type}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, gstNoRef)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-700 uppercase tracking-widest cursor-pointer"
                    >
                      <option value="credit">Jama (Cr)</option>
                      <option value="debit">Udhar (Dr)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">GST Number</label>
                    <input
                      ref={gstNoRef}
                      type="text"
                      name="gst_no"
                      value={formData.gst_no || ''}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, tinNoRef)}
                      placeholder="GSTIN STRING"
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-mono text-zinc-700 font-bold uppercase"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">TIN / PAN String</label>
                    <input
                      ref={tinNoRef}
                      type="text"
                      name="tin_no"
                      value={formData.tin_no || ''}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, null)}
                      placeholder="TIN DETAILS"
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-mono text-zinc-700 font-bold"
                    />
                  </div>
                </div>

                <div className="bg-zinc-50 p-3 border border-zinc-300 mt-1 flex items-center gap-3">
                  <div className="p-2 bg-white border border-zinc-200 text-zinc-600">
                    <Database size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Internal Shard ID</p>
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold transition rounded-none uppercase flex items-center justify-center gap-2 text-xs"
            >
              {loading ? <Loader className="animate-spin" size={14} /> : <><Save size={14} /> {initialData?.id ? 'Update' : 'Save'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
