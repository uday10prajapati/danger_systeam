import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  Building2, User, Phone, Mail, FileText, 
  ShieldAlert, IndianRupee, Save, X, RefreshCcw,
  Layout, Database, Tag, ShieldCheck, Activity,
  Briefcase, TrendingUp, Hash
} from 'lucide-react';

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
  <div className="space-y-1.5 flex-1">
    <input
      className={`w-full h-12 px-5 text-sm border ${error ? 'border-rose-400 bg-rose-50/30' : 'border-slate-100 bg-slate-50/50'} focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none focus:bg-white hover:bg-slate-50 transition-all rounded-2xl font-bold text-slate-700 placeholder:text-slate-200 ${className}`}
      {...props}
    />
    {error && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-2">{error}</p>}
  </div>
);

export default function AccountForm({ companyId, initialData = null, onSuccess, onCancel }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(initialData || {
    account_code: '',
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


  React.useEffect(() => {
    if (!initialData) {
      axios.get('/api/accounts/last-code', { headers: { 'x-company-id': companyId } })
        .then(res => {
          if (res.data.success) {
            const nextCode = (parseInt(res.data.lastCode) || 0) + 1;
            setFormData(prev => ({ ...prev, account_code: nextCode.toString() }));
          }
        })
        .catch(err => console.error("Failed to fetch last account code", err));
    }
  }, [initialData, companyId]);

  const accountTypes = [
    { value: 'customer', label: t('accountMaster.customer'), icon: <User size={14}/>, color: 'blue' },
    { value: 'supplier', label: t('accountMaster.supplier'), icon: <Briefcase size={14}/>, color: 'indigo' },
    { value: 'bank', label: t('accountMaster.bank'), icon: <Database size={14}/>, color: 'sky' },
    { value: 'cash', label: t('accountMaster.cash'), icon: <IndianRupee size={14}/>, color: 'emerald' },
    { value: 'assets', label: t('accountMaster.assets'), icon: <TrendingUp size={14}/>, color: 'emerald' },
    { value: 'liabilities', label: t('accountMaster.liabilities'), icon: <ShieldAlert size={14}/>, color: 'rose' },
    { value: 'revenue', label: t('accountMaster.revenue'), icon: <Activity size={14}/>, color: 'amber' },
    { value: 'expense', label: t('accountMaster.expense'), icon: <ShieldAlert size={14}/>, color: 'orange' },
    { value: 'purchase', label: t('accountMaster.purchase', 'Purchase'), icon: <Briefcase size={14}/>, color: 'indigo' },
    { value: 'sales', label: t('accountMaster.sales', 'Sales'), icon: <TrendingUp size={14}/>, color: 'emerald' }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'opening_balance' ? parseFloat(value) || 0 : value)
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.account_name || formData.account_name.trim().length < 2) {
      newErrors.account_name = "Identity nomenclature required";
    }
    if (formData.phone && !/^[0-9\s\-\+\(\)]{7,20}$/.test(formData.phone)) {
      newErrors.phone = "Invalid protocol string";
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const submitData = { company_id: companyId, ...formData };
      

      if (initialData?.id) {
        await axios.put(`/api/accounts/${initialData.id}`, formData);
        setMessage({ type: 'success', text: 'Financial entity refined' });
      } else {
        await axios.post('/api/accounts', submitData);
        setMessage({ type: 'success', text: 'New fiscal ledger initialized' });
      }
      setTimeout(() => onSuccess?.(), 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Database synchronization failure' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-12 overflow-hidden relative animate-in slide-in-from-bottom duration-500">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      
      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-10">
          {initialData?.id ? 'Refine Ledger Identity' : 'Initialize Fiscal Node'}
          <span className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">Financial Shard Authorization</span>
        </h2>

        {message && (
          <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
            message.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
          }`}>
            <ShieldAlert size={20} />
            <p className="text-sm font-bold uppercase tracking-widest text-[10px]">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
          
          {/* Section 1: Entity Definition */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
              <div className="w-6 h-0.5 bg-indigo-600"></div> Profile context
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="col-span-1">
                <FormLabel icon={Hash}>Entity Code</FormLabel>
                <FormInput
                  name="account_code"
                  value={formData.account_code}
                  onChange={handleChange}
                  placeholder="000"
                  className="font-mono"
                />
              </div>

              <div className="col-span-2">
                <FormLabel icon={Building2}>{t('accountMaster.accountName')} *</FormLabel>
                <FormInput
                  name="account_name"
                  value={formData.account_name}
                  onChange={handleChange}
                  placeholder="e.g. Reliance Industries Ltd."
                  error={errors.account_name}
                />
              </div>

              <div>
                <FormLabel icon={Layout}>{t('accountMaster.accountType')} *</FormLabel>
                <div className="relative group">
                   <select
                     name="account_type"
                     value={formData.account_type}
                     onChange={handleChange}
                     disabled={initialData?.id}
                     className="w-full h-12 px-5 text-sm border border-slate-100 bg-slate-50/50 focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-bold text-slate-700 appearance-none cursor-pointer group-hover:bg-slate-50 transition-all uppercase tracking-widest"
                   >
                     {accountTypes.map(type => (
                       <option key={type.value} value={type.value}>{type.label}</option>
                     ))}
                   </select>
                   <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">▼</div>
                </div>
              </div>


              {!['bank', 'supplier', 'revenue', 'expense'].includes(formData.account_type) && (
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 self-end h-12">
                   <input
                     type="checkbox"
                     id="is_subledger"
                     name="is_subledger"
                     checked={formData.is_subledger}
                     onChange={handleChange}
                     className="w-5 h-5 rounded-lg border-slate-200 accent-indigo-600 cursor-pointer"
                   />
                   <label htmlFor="is_subledger" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer group-hover:text-slate-800">
                      Assign as Sub-Ledger Registry
                   </label>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Contact & Fiscal Details */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
              <div className="w-6 h-0.5 bg-emerald-500"></div> Contact & Fiscal Meta
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <FormLabel icon={Phone}>{t('accountMaster.phone')}</FormLabel>
                <FormInput name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 000 000 0000" error={errors.phone} />
              </div>
              <div>
                <FormLabel icon={Mail}>{t('accountMaster.email')}</FormLabel>
                <FormInput name="email" value={formData.email} onChange={handleChange} placeholder="finance@entity.sh" error={errors.email} />
              </div>
              <div>
                <FormLabel icon={ShieldCheck}>{t('accountMaster.gstNumber')}</FormLabel>
                <FormInput name="gst_no" value={formData.gst_no} onChange={handleChange} placeholder="GSTIN (24ABCDE...)" className="uppercase font-mono" />
              </div>
              <div>
                <FormLabel icon={FileText}>{t('accountMaster.tinNumber')}</FormLabel>
                <FormInput name="tin_no" value={formData.tin_no} onChange={handleChange} placeholder="TIN String" />
              </div>
            </div>
          </div>

          {/* Section 3: Value Context */}
          <div className="space-y-6">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-3">
              <div className="w-6 h-0.5 bg-amber-500"></div> Opening fiscal context
            </h3>
            <div className="bg-[#F8FAFC]/50 p-10 rounded-[2.5rem] border border-slate-100 flex items-center gap-8 group">
               <div className="p-4 bg-white rounded-3xl shadow-sm border border-slate-100 text-amber-500 group-hover:rotate-12 transition-transform duration-500">
                  <IndianRupee size={24} />
               </div>
               <div className="flex-1 flex gap-4">
                  <div className="flex-1">
                    <FormLabel>{t('accountMaster.openingBalance')}</FormLabel>
                    <FormInput type="number" name="opening_balance" value={formData.opening_balance} onChange={handleChange} className="text-right font-mono" />
                  </div>
                  <div className="w-40">
                    <FormLabel>Type</FormLabel>
                    <select
                      name="opening_balance_type"
                      value={formData.opening_balance_type}
                      onChange={handleChange}
                      className="w-full h-12 px-5 border border-slate-100 bg-white rounded-2xl outline-none font-bold text-slate-700 appearance-none uppercase text-[10px] tracking-widest"
                    >
                      <option value="credit">{t('accountMaster.jama')}</option>
                      <option value="debit">{t('accountMaster.udhar')}</option>
                    </select>
                  </div>
               </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
             <button
               type="submit"
               disabled={loading}
               className="flex-1 bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[10px] py-5 rounded-[2rem] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-300"
             >
               {loading ? <RefreshCcw className="animate-spin" size={18} /> : <><Save size={18} /> Commit Ledger Shard</>}
             </button>
             <button
               type="button"
               onClick={onCancel}
               className="px-12 py-5 bg-white border border-slate-100 text-slate-400 font-bold rounded-[2rem] hover:bg-slate-50 hover:text-slate-800 transition-all uppercase text-[10px] tracking-widest"
             >
                Abort
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
