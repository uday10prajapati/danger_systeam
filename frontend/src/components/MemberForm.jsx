import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { 
  X, User, MapPin, Phone, 
  Mail, Percent, CreditCard, Save,
  AlertCircle, CheckCircle, Loader, ShieldCheck,
  Building2, FileText
} from 'lucide-react'

export default function MemberForm({ 
  companyId, 
  onSuccess, 
  editingMember = null, 
  onClose 
}) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [errors, setErrors] = useState({})
  
  const [formData, setFormData] = useState({
    member_name: '',
    member_address: '',
    member_gst_no: '',
    phone: '',
    email: '',
    discount_percentage: 0,
    member_code: null,
    is_active: true
  })

  useEffect(() => {
    if (editingMember) {
      setFormData({
        member_name: editingMember.member_name,
        member_address: editingMember.member_address || '',
        member_gst_no: editingMember.member_gst_no || '',
        phone: editingMember.phone || '',
        email: editingMember.email || '',
        discount_percentage: editingMember.discount_percentage || 0,
        member_code: editingMember.member_code,
        is_active: editingMember.is_active === 1 || editingMember.is_active === true
      })
    }
  }, [editingMember])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'discount_percentage' ? parseFloat(value) || 0 : value)
    }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setErrors({})
    
    try {
      setLoading(true)
      const url = editingMember ? `/api/members/${editingMember.id}` : '/api/members'
      const method = editingMember ? 'put' : 'post'
      const headers = { 'x-company-id': companyId }

      const payload = { ...formData }
      if (!editingMember) payload.company_id = companyId

      const response = await axios({ method, url, data: payload, headers })

      if (response.data.success) {
        setMessage({ type: 'success', text: t('memberMaster.memberSaved') })
        setTimeout(() => onSuccess(), 1500)
      }
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors)
      else setMessage({ type: 'error', text: err.response?.data?.error || t('memberMaster.failedToSave') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {editingMember ? t('memberMaster.editMember', 'Refine Entity') : t('memberMaster.newMember', 'Register Entity')}
          </h2>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all">
              <X size={24} />
            </button>
          )}
        </div>

        {message && (
          <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
            message.type === 'error' ? 'bg-rose-50 border border-rose-100 text-rose-700' : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
          }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <p className="text-sm font-bold">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Identity Section */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-6 h-0.5 bg-blue-600"></div> Identity & Registry
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 ml-1">Entity Name *</label>
              <div className="relative group">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="text"
                  name="member_name"
                  value={formData.member_name}
                  onChange={handleChange}
                  placeholder="Full Legal Name"
                  className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border ${errors.member_name ? 'border-rose-400' : 'border-slate-200'} focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">Registry Code</label>
                <div className="relative">
                  <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={formData.member_code || 'AUTOGEN'}
                    disabled
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-100 border border-slate-100 text-slate-400 rounded-2xl font-bold text-sm cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">GST Identification</label>
                <div className="relative group">
                  <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    name="member_gst_no"
                    value={formData.member_gst_no}
                    onChange={handleChange}
                    placeholder="GSTRN (Optional)"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-6 h-0.5 bg-emerald-500"></div> Communication Protocol
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 ml-1">Physical Address</label>
              <div className="relative group">
                <MapPin size={18} className="absolute left-4 top-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                <textarea
                  name="member_address"
                  value={formData.member_address}
                  onChange={handleChange}
                  placeholder="Complete Logistics Route"
                  rows="3"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">Interface Phone</label>
                <div className="relative group">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Primary Node"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">Digital Handle</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="eMail Address"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fiscal Section */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-6 h-0.5 bg-amber-500"></div> Fiscal Incentives
            </h3>
            
            <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-2 text-amber-200"><ShieldCheck size={40} /></div>
               <label className="block text-xs font-bold text-amber-600 uppercase tracking-widest mb-4">Baseline Discount Tier</label>
               <div className="flex items-center gap-4 relative z-10">
                 <div className="relative flex-1 group">
                    <Percent size={24} className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-500" />
                    <input
                      type="number"
                      name="discount_percentage"
                      value={formData.discount_percentage}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full pl-14 pr-6 py-4 bg-white border border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-2xl outline-none transition-all font-black text-2xl text-slate-800"
                    />
                 </div>
               </div>
               <p className="mt-4 text-[10px] font-bold text-amber-600/60 uppercase tracking-tighter italic">Applied automatically during terminal checkout transactions</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
             <input
               type="checkbox"
               id="is_active"
               name="is_active"
               checked={formData.is_active}
               onChange={handleChange}
               className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
             />
             <label htmlFor="is_active" className="text-xs font-bold text-slate-600 cursor-pointer">
               {t('memberMaster.memberActive', 'Entity is currently operational and authorized for system entry')}
             </label>
          </div>

          <div className="flex gap-4 pt-4">
             <button
               type="submit"
               disabled={loading}
               className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-300"
             >
               {loading ? <Loader className="animate-spin" size={20} /> : <><Save size={20} /> {editingMember ? 'Commit Changes' : 'Initialize Identity'}</>}
             </button>
             <button
               type="button"
               onClick={onClose}
               className="px-8 py-4 bg-white border border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 hover:text-slate-800 transition-all"
             >
               {t('common.cancel', 'Abort')}
             </button>
          </div>
        </form>
      </div>
    </div>
  )
}
