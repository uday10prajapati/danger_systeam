import React, { useState, useEffect } from 'react'
import { 
  Building2, Phone, Mail, MapPin, 
  Calendar, Database, Activity, CheckCircle, 
  AlertCircle, Edit3, ArrowLeft, ChevronRight, 
  Globe, Shield, Save, X, Trash2, RefreshCw, Plus
} from 'lucide-react'
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
  const [financialYears, setFinancialYears] = useState([])
  const [showYearForm, setShowYearForm] = useState(false)
  const [newYear, setNewYear] = useState({ label: '', start: '', end: '' })
  const [editingYear, setEditingYear] = useState(null)
  const [yearsLoading, setYearsLoading] = useState(false)

  useEffect(() => {
    fetchCompany()
  }, [])

  const fetchCompany = async () => {
    try {
      setLoading(true)
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
      console.log('Company not found')
    } finally {
      setLoading(false)
    }
  }

  const handleAddYear = async (e) => {
     e.preventDefault();
     try {
        if (editingYear) {
           await axios.put(`${API_URL}/financial-years/${editingYear.id}`, {
              yearLabel: newYear.label,
              startDate: newYear.start,
              endDate: newYear.end,
              is_active: editingYear.is_active
           });
        } else {
           await axios.post(`${API_URL}/financial-years`, {
              companyId: company.id,
              yearLabel: newYear.label,
              startDate: newYear.start,
              endDate: newYear.end
           });
        }
        setSuccess(true);
        setShowYearForm(false);
        setNewYear({ label: '', start: '', end: '' });
        setEditingYear(null);
        fetchFinancialYears(company.id);
        setTimeout(() => setSuccess(false), 3000);
     } catch (e) {
        console.error('Fiscal Cycle Error:', e);
        setErrors([e.response?.data?.error || e.message || 'Failed to register fiscal cycle']);
     }
  }

  const startEditYear = (fy) => {
     // Safeguard against null dates from DB
     const formattedStart = fy.start_date ? new Date(fy.start_date).toISOString().split('T')[0] : '';
     const formattedEnd = fy.end_date ? new Date(fy.end_date).toISOString().split('T')[0] : '';
     
     setNewYear({
        label: fy.year_label || '',
        start: formattedStart,
        end: formattedEnd
     });
     setEditingYear(fy);
     setShowYearForm(true);
  }

  const fetchFinancialYears = async (companyId) => {
     try {
        setYearsLoading(true);
        const res = await axios.get(`${API_URL}/financial-years/${companyId}`);
        // Ensure we only set state if the response is an array
        if (Array.isArray(res.data)) {
           setFinancialYears(res.data);
        } else {
           console.warn('API returned non-array data:', res.data);
           setFinancialYears([]);
        }
     } catch (e) {
        console.error('Failed to fetch years', e);
        setFinancialYears([]);
     } finally {
        setYearsLoading(false);
     }
  }

  useEffect(() => {
     if (company) fetchFinancialYears(company.id);
  }, [company]);

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors.length > 0) setErrors([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrors([])

    try {
      let response
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
        fetchCompany()
      }
    } catch (error) {
      setErrors(error.response?.data?.errors || [error.response?.data?.error || 'Failed to save settings'])
    } finally {
      setLoading(false)
    }
  }

  const currencyOptions = ['INR', 'USD', 'EUR', 'GBP', 'JPY']

  if (loading && !company) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#F8FAFC]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1200px] mx-auto px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
              <Building2 size={12} />
              <span>{t('company.settingsOrganization', 'Settings / Organization')}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t('company.organizationProfile', 'Organization Profile')}</h1>
          </div>
          <div className="flex items-center gap-3">
             {!isEditing && company ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 bg-blue-600 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                >
                  <Edit3 size={18} /> {t('company.editProfile', 'Edit Profile')}
                </button>
             ) : (
                <button 
                  onClick={() => company ? setIsEditing(false) : navigate('/dashboard')}
                  className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <X size={18} /> {t('common.cancel', 'Cancel')}
                </button>
             )}
          </div>
        </div>

        {/* Status Alerts */}
        {success && (
          <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 animate-in slide-in-from-top duration-300">
            <CheckCircle size={20} />
            <p className="text-sm font-bold text-emerald-800">{t('company.saveSuccess', 'Changes saved successfully!')}</p>
          </div>
        )}

        {errors.length > 0 && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700 animate-in slide-in-from-top duration-300">
            <AlertCircle size={20} className="mt-0.5" />
            <div>
              <p className="text-sm font-bold text-rose-800 mb-1">{t('company.pleaseFixErrors', 'Please fix the following errors:')}</p>
              <ul className="text-xs space-y-1 list-disc list-inside opacity-90 font-medium">
                {errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* View Mode */}
        {company && !isEditing ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Info Card */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/20 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                
                <div className="flex flex-col md:flex-row items-center gap-8 mb-10 relative z-10 text-center md:text-left">
                  <div className="w-24 h-24 bg-slate-50 border-2 border-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt="Logo" className="w-full h-full object-contain p-4" />
                    ) : (
                      <Building2 size={40} strokeWidth={1.5} />
                    )}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{company.company_name}</h2>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3">
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <Shield size={14} className="text-blue-500" /> {company.gst_number || t('company.noGst', 'No GST Number')}
                      </span>
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        <Globe size={14} className="text-emerald-500" /> {company.currency} ({t('company.operationalCurrency', 'Operational Currency')})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 relative z-10">
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:text-blue-500 transition-colors h-fit">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('company.headquarters', 'Headquarters')}</p>
                        <p className="text-sm font-bold text-slate-600 leading-relaxed max-w-xs">{company.address || t('company.addressNotListed', 'Address not listed')}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:text-blue-500 transition-colors h-fit">
                        <Mail size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('company.emailGateway', 'Email Gateway')}</p>
                        <p className="text-sm font-bold text-slate-600">{company.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:text-blue-500 transition-colors h-fit">
                        <Phone size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('company.directContact', 'Direct Contact')}</p>
                        <p className="text-sm font-bold text-slate-600">{company.phone}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 group-hover:text-blue-500 transition-colors h-fit">
                        <Calendar size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('company.fiscalYear', 'Fiscal Year')}</p>
                           <button 
                             onClick={() => setShowYearForm(true)} 
                             className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 px-2 py-0.5 rounded-lg transition-all"
                           >
                              Manage
                           </button>
                        </div>
                        <p className="text-sm font-bold text-slate-600">
                          {new Date(company.financial_year_start).toLocaleDateString()} — {new Date(company.financial_year_end).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-slate-800">{t('company.quickNavigation', 'Quick Navigation')}</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center justify-between p-5 bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 rounded-[1.5rem] transition-all group/it shadow-none hover:shadow-sm"
                  >
                    <div className="flex items-center gap-4 text-left">
                       <div className="p-3 bg-white text-slate-400 group-hover/it:text-blue-600 rounded-xl shadow-sm transition-colors"><Activity size={18}/></div>
                       <div>
                          <p className="text-sm font-bold text-slate-800">{t('company.overviewDashboard', 'Overview Dashboard')}</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">{t('company.controlCenter', 'Control center and insights')}</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover/it:translate-x-1 transition-all" />
                  </button>
                  <button 
                    onClick={() => navigate('/items')}
                    className="flex items-center justify-between p-5 bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 rounded-[1.5rem] transition-all group/it shadow-none hover:shadow-sm"
                  >
                    <div className="flex items-center gap-4 text-left">
                       <div className="p-3 bg-white text-slate-400 group-hover/it:text-emerald-600 rounded-xl shadow-sm transition-colors"><Database size={18}/></div>
                       <div>
                          <p className="text-sm font-bold text-slate-800">{t('modules.itemMaster', 'Item Master')}</p>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">{t('company.manageProducts', 'Manage products and stock')}</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover/it:translate-x-1 transition-all" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar Details */}
            <div className="space-y-8">
               {/* Fiscal Registry Card */}
               <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-lg font-bold text-slate-800 italic">Fiscal Registry</h3>
                     <button 
                        onClick={() => setShowYearForm(true)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                     >
                        <Plus size={16} />
                     </button>
                  </div>
                  <div className="space-y-4">
                     {yearsLoading ? (
                        <div className="py-10 flex flex-col items-center gap-3">
                           <RefreshCw size={24} className="animate-spin text-blue-200" />
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Querying Nodes...</p>
                        </div>
                     ) : financialYears.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6 font-medium italic">No fiscal cycles registered.</p>
                     ) : (
                        financialYears.map(fy => (
                           <div key={fy.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-100 transition-all group">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-300 group-hover:text-blue-500 shadow-sm transition-all"><Calendar size={14} /></div>
                                 <span className="text-sm font-black text-slate-700 tracking-tight">{fy.year_label}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <button 
                                   onClick={() => startEditYear(fy)}
                                   className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                 >
                                    <Edit3 size={12} />
                                 </button>
                                 <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${fy.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {fy.is_active ? 'Active' : 'Archived'}
                                 </span>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>

               {/* System Status Card */}
               <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3 italic">
                    <div className="w-4 h-0.5 bg-blue-500"></div> {t('company.systemStatus')}
                  </h4>
                  <div className="space-y-6 relative z-10">
                     <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-300">Registry ID</span>
                        <span className="text-xs font-mono font-bold bg-white/10 px-2 py-1 rounded tracking-tighter">#{company.id}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-300">Encryption</span>
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5"><Shield size={12}/> Active</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-300">Last Sync</span>
                        <span className="text-xs font-bold text-white uppercase">{new Date().toLocaleDateString('en-GB')}</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Year Creation Modal/Portal */}
            {showYearForm && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                  <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                     <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-slate-800">
                           <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg"><Calendar size={20} /></div>
                           <h3 className="text-xl font-bold tracking-tight">{editingYear ? 'Modify Fiscal Cycle' : 'Initialize Fiscal Cycle'}</h3>
                        </div>
                        <button onClick={() => { setShowYearForm(false); setEditingYear(null); setNewYear({label:'', start:'', end:''}); }} className="text-slate-300 hover:text-rose-500 transition-colors"><X size={24} /></button>
                     </div>
                     <form onSubmit={handleAddYear} className="p-10 space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cycle Label</label>
                           <input 
                              type="text" 
                              value={newYear.label}
                              onChange={e => setNewYear({...newYear, label: e.target.value})}
                              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-sm italic"
                              placeholder="e.g. 2026-27"
                              required
                           />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start Threshold</label>
                              <input 
                                 type="date"
                                 value={newYear.start}
                                 onChange={e => setNewYear({...newYear, start: e.target.value})}
                                 className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 text-xs"
                              />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">End Threshold</label>
                              <input 
                                 type="date"
                                 value={newYear.end}
                                 onChange={e => setNewYear({...newYear, end: e.target.value})}
                                 className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-slate-700 text-xs"
                              />
                           </div>
                        </div>
                        <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl shadow-slate-100 flex items-center justify-center gap-3 mt-4">
                           <Database size={18} /> {editingYear ? 'Commit Changes' : 'Register Fiscal Node'}
                        </button>
                     </form>
                  </div>
               </div>
            )}
          </div>
        ) : (
          /* Edit / Creation Form */
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 animate-in slide-in-from-bottom duration-500">
             <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Core Identity */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div> {t('company.coreIdentity', 'Core Identity')}
                  </h3>
                </div>

                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 ml-1">{t('company.companyLegalName', 'Company legal Name')}</label>
                   <div className="relative group">
                     <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                     <input
                       type="text"
                       name="company_name"
                       value={formData.company_name}
                       onChange={handleChange}
                       placeholder="e.g. Danger Systeam Pvt Ltd"
                       className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm"
                     />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 ml-1">{t('company.gstRegistrationNumber', 'GST Registration Number')}</label>
                   <div className="relative group">
                     <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                     <input
                       type="text"
                       name="gst_number"
                       value={formData.gst_number}
                       onChange={handleChange}
                       placeholder="GSTIN Number"
                       className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm"
                     />
                   </div>
                </div>

                {/* Contact Interface */}
                <div className="md:col-span-2 pt-4">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div> {t('company.contactInterface', 'Contact Interface')}
                  </h3>
                </div>

                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 ml-1">{t('company.email', 'Email Address')}</label>
                   <div className="relative group">
                     <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                     <input
                       type="email"
                       name="email"
                       value={formData.email}
                       onChange={handleChange}
                       placeholder="billing@superstore.com"
                       className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm"
                     />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500 ml-1">{t('company.phone', 'Phone Number')}</label>
                   <div className="relative group">
                     <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                     <input
                       type="tel"
                       name="phone"
                       value={formData.phone}
                       onChange={handleChange}
                       placeholder="+91 00000 00000"
                       className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm"
                     />
                   </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                   <label className="text-xs font-bold text-slate-500 ml-1">{t('company.physicalOfficeAddress', 'Physical Office Address')}</label>
                   <div className="relative group">
                     <MapPin className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                     <textarea
                       name="address"
                       value={formData.address}
                       onChange={handleChange}
                       placeholder="Street address, City, Pincode"
                       rows="3"
                       className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm resize-none"
                     ></textarea>
                   </div>
                </div>

                {/* Fiscal Settings */}
                <div className="md:col-span-2 pt-4">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div> {t('company.fiscalSettings', 'Fiscal Settings')}
                  </h3>
                </div>

                <div className="md:col-span-2 space-y-2 mb-4">
                  <label className="text-xs font-bold text-slate-500 ml-1">{t('company.operationalCurrency', 'Operational Currency')}</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm appearance-none cursor-pointer"
                  >
                    {currencyOptions.map(curr => <option key={curr} value={curr}>{curr} - International Standard</option>)}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Calendar size={18} /></div>
                        <div>
                           <p className="text-xs font-bold text-slate-700">Financial Cycle Registry</p>
                           <p className="text-[10px] text-slate-400 font-medium">Manage multiple fiscal nodes for this organization.</p>
                        </div>
                     </div>
                     <button 
                        type="button"
                        onClick={() => { setEditingYear(null); setNewYear({label:'', start:'', end:''}); setShowYearForm(true); }}
                        className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm"
                     >
                        <Plus size={14} /> Add Year
                     </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                     {financialYears.map(fy => (
                        <div key={fy.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-blue-200 transition-all shadow-sm">
                           <div>
                              <p className="text-xs font-black text-slate-800">{fy.year_label}</p>
                              <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                                 {fy.start_date ? new Date(fy.start_date).toLocaleDateString() : 'N/A'} - {fy.end_date ? new Date(fy.end_date).toLocaleDateString() : 'N/A'}
                              </p>
                           </div>
                           <button 
                              type="button"
                              onClick={() => startEditYear(fy)}
                              className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                           >
                              <Edit3 size={14} />
                           </button>
                        </div>
                     ))}
                  </div>
                </div>

                {/* Form Progress Action */}
                <div className="md:col-span-2 pt-8 flex gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-[2rem] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-300"
                  >
                    {loading ? (
                       <RefreshCw className="animate-spin" size={20} />
                    ) : (
                       <>
                         <Save size={20} /> 
                         {company ? t('company.updateOrganization', 'Update Organization') : t('company.saveAndContinue', 'Save & Continue')}
                       </>
                    )}
                  </button>
                </div>
             </form>
          </div>
        )}

      </div>
    </div>
  )
}

export default CompanySetup
