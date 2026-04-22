import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Building2, Phone, Mail, MapPin, Calendar, ShoppingCart, Database, Activity, ChevronRight, X } from 'lucide-react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const API_URL = `${import.meta.env.VITE_API_URL}/api`

function CompanySetup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    company_name: '',
    address: '',
    phone: '',
    email: '',
    gst_number: '',
    financial_year_start: '',
    financial_year_end: '',
    currency: 'INR',
    logo_url: ''
  })

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState([])
  const [success, setSuccess] = useState(false)
  const [company, setCompany] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  // Fetch existing company on load
  useEffect(() => {
    fetchCompany()
  }, [])

  const fetchCompany = async () => {
    try {
      const response = await axios.get(`${API_URL}/company`)
      const companyData = response.data.data
      
      const formattedData = {
        ...companyData,
        financial_year_start: companyData.financial_year_start 
          ? new Date(companyData.financial_year_start).toISOString().split('T')[0]
          : '',
        financial_year_end: companyData.financial_year_end 
          ? new Date(companyData.financial_year_end).toISOString().split('T')[0]
          : ''
      }
      
      setCompany(companyData)
      setFormData(formattedData)
      setIsEditing(false)
    } catch (error) {
      console.log(t('company.companyNotFound'))
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors.length > 0) {
      setErrors([])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors([])
    setSuccess(false)

    try {
      let response
      
      if (company && !isEditing) {
        setIsEditing(true)
        setLoading(false)
        return
      }

      if (company && isEditing) {
        response = await axios.put(`${API_URL}/company/${company.id}`, formData)
      } else {
        response = await axios.post(`${API_URL}/company`, formData)
      }

      if (response.data.success) {
        setSuccess(true)
        setCompany(response.data.data)
        setIsEditing(false)
        setTimeout(() => setSuccess(false), 3000)
        setTimeout(fetchCompany, 1000)
      } else {
        setErrors([response.data.error || 'Failed to save company'])
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      } else if (error.response?.data?.error) {
        setErrors([error.response.data.error])
      } else {
        setErrors([t('company.failedToSaveCompany')])
      }
    } finally {
      setLoading(false)
    }
  }

  const currencyOptions = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD']

  if (loading && !company) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center font-black uppercase tracking-widest text-slate-400">
          <Database className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-pulse" />
          <p className="text-lg mb-4 italic">Initializing Enterprise Context...</p>
          <div className="w-16 h-1 bg-slate-200 mx-auto overflow-hidden rounded-full">
             <div className="w-full h-full bg-black animate-[slide_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-[1000px] mx-auto space-y-8">
        
        {/* Header - Industrial Monochrome */}
        <div className="flex justify-between items-end border-b-4 border-black pb-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{t('company.companySetup', 'Enterprise Profile')}</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">CORE ORGANIZATION ARCHITECTURE REGISTRY</p>
          </div>
          <Building2 size={32} className="text-slate-200" strokeWidth={1} />
        </div>

        {/* Success / Error Banners - High Contrast */}
        {success && (
          <div className="bg-black text-white p-6 rounded-2xl shadow-2xl border-l-8 border-white animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-4">
               <div className="bg-white p-2 rounded-full text-black">
                  <CheckCircle size={20} strokeWidth={3} />
               </div>
               <div>
                  <p className="font-black uppercase tracking-widest text-xs">{t('company.success', 'Transaction Verified')}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Enterprise parameters successfully rewritten to secure buffer.</p>
               </div>
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 text-red-900 p-6 rounded-2xl shadow-lg border-l-8 border-red-900">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-900 shrink-0 mt-0.5" strokeWidth={3} />
              <div className="flex-1">
                <p className="font-black uppercase tracking-widest text-xs mb-3 italic">Critical Integration Fault Detected</p>
                <ul className="text-[10px] font-bold uppercase tracking-widest space-y-1 opacity-80">
                  {errors.map((error, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-red-900 rounded-full"></div> {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Main Interface Content */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          
          {/* Active Company Status Card - Professional Dossier Style */}
          {company && !isEditing && (
            <div className="bg-white rounded-[2.5rem] shadow-2xl border-4 border-black overflow-hidden group">
              <div className="bg-slate-900 p-8 border-b-2 border-black flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-full bg-white/5 skew-x-12 translate-x-10"></div>
                <div className="relative z-10">
                  <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic mb-1">Authenticated Entity</h2>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">{company.company_name}</h3>
                </div>
                <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700 relative z-10">
                   <Activity size={24} className="text-white animate-pulse" strokeWidth={2} />
                </div>
              </div>
              
              <div className="p-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div>
                      <p className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-1 italic">Electronic Correspondence</p>
                      <p className="text-lg font-black text-slate-900 tracking-tight font-mono">{company.email}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-1 italic">Telecommunications Vector</p>
                      <p className="text-lg font-black text-slate-900 tracking-tight font-mono">{company.phone}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-1 italic">Tax Identity Manifest</p>
                      <p className="text-lg font-black text-slate-900 tracking-tighter uppercase">{company.gst_number || 'NOT_DECLARED'}</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <p className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-1 italic">Base Functional Currency</p>
                      <p className="text-lg font-black text-slate-900 tracking-widest uppercase italic underline decoration-slate-100 underline-offset-8">{company.currency}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-1 italic">Primary Location Protocol</p>
                      <p className="text-xs font-bold text-slate-600 leading-relaxed uppercase pr-8">{company.address || 'LOC_UNDETERMINED'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-black uppercase text-[9px] tracking-widest mb-1 italic">Active Fiscal Cycle</p>
                      <p className="text-lg font-black text-black font-mono tracking-tighter">
                        {new Date(company.financial_year_start).toLocaleDateString('en-GB')} — {new Date(company.financial_year_end).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex gap-4 border-t-2 border-slate-50 pt-10">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 px-8 py-4 bg-black text-white rounded-2xl hover:bg-slate-800 transition-all font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95"
                  >
                    Modify Parameters
                  </button>
                  <button
                    onClick={() => navigate('/items')}
                    className="flex-3 px-8 py-4 bg-slate-100 text-slate-900 rounded-2xl hover:bg-slate-200 transition-all font-black uppercase tracking-widest text-[10px] border-2 border-slate-200 flex items-center justify-center gap-3 active:scale-95"
                  >
                    <ShoppingCart className="w-4 h-4" strokeWidth={3} />
                    Item Master Access
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Setup / Configuration Form - Heavy Industrial Design */}
          {(!company || isEditing) && (
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 p-8 border-b-2 border-black flex justify-between items-center">
                 <div>
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic mb-1">Configuration Required</h2>
                    <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic">{company && isEditing ? 'Update Manifest' : 'Initialize Entity'}</h3>
                 </div>
                 {isEditing && (
                    <button 
                       onClick={() => setIsEditing(false)} 
                       className="bg-slate-800 hover:bg-red-600 text-white p-2 rounded-xl transition-all"
                    >
                       <X size={20} strokeWidth={3} />
                    </button>
                 )}
              </div>

              <form onSubmit={handleSubmit} className="p-12 space-y-10">
                
                {/* Section: Core Identity */}
                <div className="space-y-6">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-4">
                      <div className="w-8 h-0.5 bg-slate-100"></div> LEGAL NOMENCLATURE
                   </h4>
                   <div className="grid grid-cols-1 gap-6">
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-4 text-slate-200 group-focus-within:text-black transition-colors" size={20} strokeWidth={3} />
                        <input
                          type="text"
                          name="company_name"
                          value={formData.company_name}
                          onChange={handleChange}
                          placeholder="ENTER FULL LEGAL BUSINESS REGISTERED NAME..."
                          className="w-full pl-14 pr-4 py-4 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-black transition-all bg-slate-50 font-black uppercase text-xs h-14"
                          disabled={loading}
                        />
                      </div>
                      <div className="relative group">
                        <MapPin className="absolute left-4 top-4 text-slate-200 group-focus-within:text-black transition-colors" size={20} strokeWidth={3} />
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          placeholder="CORE PHYSICAL DISPATCH ADDRESS..."
                          rows="3"
                          className="w-full pl-14 pr-4 py-4 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-black transition-all bg-slate-50 font-bold uppercase text-[11px] h-28 resize-none"
                          disabled={loading}
                        />
                      </div>
                   </div>
                </div>

                {/* Section: Communications */}
                <div className="space-y-6">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-4">
                      <div className="w-8 h-0.5 bg-slate-100"></div> COMMUNICATION VECTOR
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="relative group">
                        <Phone className="absolute left-4 top-4 text-slate-200 group-focus-within:text-black transition-colors" size={20} strokeWidth={3} />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="TELECOM VECTOR ID"
                          className="w-full pl-14 pr-4 py-4 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-black transition-all bg-slate-50 font-black text-xs h-14 font-mono"
                          disabled={loading}
                        />
                      </div>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-4 text-slate-200 group-focus-within:text-black transition-colors" size={20} strokeWidth={3} />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="SYSTEM MAIL GATEWAY"
                          className="w-full pl-14 pr-4 py-4 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-black transition-all bg-slate-50 font-black text-xs h-14"
                          disabled={loading}
                        />
                      </div>
                   </div>
                </div>

                {/* Section: Fiscal Parameters */}
                <div className="space-y-6">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-4">
                      <div className="w-8 h-0.5 bg-slate-100"></div> FISCAL & CURRENCY LOGIC
                   </h4>
                   <div className="grid grid-cols-1 gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                         <div className="md:col-span-8 relative group">
                            <Database className="absolute left-4 top-4 text-slate-200 group-focus-within:text-black transition-colors" size={20} strokeWidth={3} />
                            <input
                              type="text"
                              name="gst_number"
                              value={formData.gst_number}
                              onChange={handleChange}
                              placeholder="GST SYSTEM UNIQUE IDENTIFIER..."
                              className="w-full pl-14 pr-4 py-4 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-black transition-all bg-slate-50 font-black uppercase text-xs h-14"
                              disabled={loading}
                            />
                         </div>
                         <div className="md:col-span-4">
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                                className="w-full px-4 py-4 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-black transition-all bg-white font-black uppercase text-xs h-14 cursor-pointer"
                                disabled={loading}
                              >
                                {currencyOptions.map(curr => (
                                  <option key={curr} value={curr}>{curr} (ISO-4217)</option>
                                ))}
                              </select>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 border-dashed">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">FISCAL CYCLE ALPHA</p>
                          <div className="relative">
                             <Calendar className="absolute left-3 top-3.5 text-slate-300" size={16} />
                             <input
                              type="date"
                              name="financial_year_start"
                              value={formData.financial_year_start}
                              onChange={handleChange}
                              className="w-full pl-10 pr-4 py-3 border-2 border-white rounded-xl focus:outline-none focus:border-black transition-all bg-white font-black text-xs uppercase h-12"
                              disabled={loading}
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">FISCAL CYCLE OMEGA</p>
                          <div className="relative">
                             <Calendar className="absolute left-3 top-3.5 text-slate-300" size={16} />
                             <input
                              type="date"
                              name="financial_year_end"
                              value={formData.financial_year_end}
                              onChange={handleChange}
                              className="w-full pl-10 pr-4 py-3 border-2 border-white rounded-xl focus:outline-none focus:border-black transition-all bg-white font-black text-xs uppercase h-12"
                              disabled={loading}
                            />
                          </div>
                        </div>
                      </div>
                   </div>
                </div>

                {/* Final Submission Block */}
                <div className="pt-10 flex flex-col gap-4">
                   <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs transition-all shadow-2xl scale-100 active:scale-95 ${
                      loading
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-4 border-slate-100'
                        : 'bg-black text-white hover:bg-slate-800 border-4 border-black'
                    }`}
                  >
                    {loading ? 'SYNCHRONIZING RELEASES...' : company && isEditing ? 'COMMIT UPDATED MANIFEST' : 'INITIALIZE ENTERPRISE DOMAIN'}
                  </button>

                  {company && isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false)
                        setFormData(company)
                      }}
                      className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] text-slate-300 bg-slate-50 hover:bg-slate-100 hover:text-red-700 transition-all border-2 border-slate-100"
                    >
                      ABORT REDEPLOYMENT
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Automated System Manifesto */}
          <div className="bg-slate-900 border-4 border-black rounded-[2.5rem] p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10">
               <h4 className="text-white font-black uppercase tracking-[0.3em] text-xs mb-6 flex items-center gap-4 italic font-bold leading-relaxed">
                  <div className="w-6 h-1 bg-white"></div> SYSTEM ARCHITECTURE NOTE
               </h4>
               <p className="text-slate-500 font-bold uppercase tracking-[0.1em] text-[10px] space-y-4 max-w-2xl leading-loose">
                 Synchronizing this registry will define the global context for all financial transacts, invoice header data, and tax accumulation logic. Ensure the fiscal cycle boundaries are calibrated precisely to avoid ledger fragmentation. Base currency parameters are immutable after the first verified transaction block is committed to the main ledger.
               </p>
               <div className="mt-8 flex gap-6">
                  <div className="flex flex-col">
                     <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Protocol</span>
                     <span className="text-[10px] font-black text-white uppercase italic">Industrial Monochrome V2.1</span>
                  </div>
                  <div className="flex flex-col border-l border-slate-800 pl-6">
                     <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Security</span>
                     <span className="text-[10px] font-black text-white uppercase italic">Active AES-256 Buffer</span>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Professional Registry Summary Footer */}
        <div className="flex justify-between items-center text-slate-400 font-black uppercase tracking-widest text-[8px] italic pt-12 pb-10 border-t border-slate-200">
           <div className="flex items-center gap-4">
              <span>MANIFEST_ID: {company?.id || 'NULL_SET'}</span>
              <div className="w-1 h-1 bg-slate-100 rounded-full"></div>
              <span>REGISTRY_AUTH: VERIFIED_CORE</span>
           </div>
           <div>SYSTEM_CHRONO: {new Date().toISOString()}</div>
        </div>
      </div>
    </div>
  )
}

export default CompanySetup
