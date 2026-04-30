import React, { useState, useEffect } from 'react'
import {
  Building2, Phone, Mail, MapPin,
  Calendar, Database, Activity, CheckCircle,
  AlertCircle, Edit3, ArrowLeft, ChevronRight,
  Globe, Shield, Save, X, Trash2, RefreshCw, Plus, CreditCard,
  Briefcase, Lock, Zap
} from 'lucide-react'
import api from '../api'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import TableHeading from '../components/TableHeading'

function CompanySetup() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    company_name: '',
    address: '',
    phone: '',
    email: '',
    gst_number: '',
    company_account_no: '',
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
  const [selectedFinancialYearId, setSelectedFinancialYearId] = useState(null)
  const [newYear, setNewYear] = useState({ label: '', start: '', end: '' })
  const [editingYear, setEditingYear] = useState(null)
  const [yearsLoading, setYearsLoading] = useState(false)

  useEffect(() => {
    fetchCompany()
  }, [])

  const fetchCompany = async () => {
    try {
      setLoading(true)
      const response = await api.get('/company')
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

      if (companyData?.id) {
        try {
          const existingUserRaw = localStorage.getItem('user')
          const existingUser = existingUserRaw ? JSON.parse(existingUserRaw) : {}
          const nextUser = { ...(existingUser || {}), company_id: companyData.id }
          localStorage.setItem('user', JSON.stringify(nextUser))
        } catch (storageErr) {
          console.warn('Failed to sync company_id to localStorage:', storageErr)
        }
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Failed to load company:', error)
      }
      setCompany(null)
    } finally {
      setLoading(false)
    }
  }

  const openYearForm = () => {
    if (errors.length > 0) setErrors([])
    setIsEditing(true)
    setEditingYear(null)
    setNewYear({ label: '', start: '', end: '' })
  }

  const isTempFinancialYear = (fy) => String(fy?.id || '').startsWith('tmp-')
  const toInputDate = (value) => (value ? new Date(value).toISOString().split('T')[0] : '')

  const selectFinancialYear = (fy) => {
    if (!fy) return
    setSelectedFinancialYearId(fy.id)
    setFormData(prev => ({
      ...prev,
      financial_year_start: toInputDate(fy.start_date),
      financial_year_end: toInputDate(fy.end_date)
    }))
  }

  const handleAddYear = async (e) => {
    e.preventDefault();
    try {
      if (editingYear) {
        await api.put(`/financial-years/${editingYear.id}`, {
          yearLabel: newYear.label,
          startDate: newYear.start,
          endDate: newYear.end,
          is_active: editingYear.is_active
        });
      } else {
        await api.post(`/financial-years`, {
          companyId: company.id,
          yearLabel: newYear.label,
          startDate: newYear.start,
          endDate: newYear.end
        });
      }
      setSuccess(true);
      setIsEditing(false);
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
    const formattedStart = fy.start_date ? new Date(fy.start_date).toISOString().split('T')[0] : '';
    const formattedEnd = fy.end_date ? new Date(fy.end_date).toISOString().split('T')[0] : '';

    setNewYear({
      label: fy.year_label || '',
      start: formattedStart,
      end: formattedEnd
    });
    setEditingYear(fy);
    setIsEditing(true);
  }

  const cancelYearEdit = () => {
    setEditingYear(null)
    setNewYear({ label: '', start: '', end: '' })
  }

  const fetchFinancialYears = async (companyId) => {
    try {
      setYearsLoading(true);
      const res = await api.get(`/financial-years/${companyId}`);
      if (res.data.success && Array.isArray(res.data.data)) {
        setFinancialYears(res.data.data);
      } else if (Array.isArray(res.data)) {
        setFinancialYears(res.data);
      } else {
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

  useEffect(() => {
    if (financialYears.length === 0) {
      setSelectedFinancialYearId(null)
      return
    }

    const selected = financialYears.find(fy => String(fy.id) === String(selectedFinancialYearId))
    if (selected) {
      setFormData(prev => ({
        ...prev,
        financial_year_start: toInputDate(selected.start_date),
        financial_year_end: toInputDate(selected.end_date)
      }))
      return
    }

    const first = financialYears[0]
    setSelectedFinancialYearId(first.id)
    setFormData(prev => ({
      ...prev,
      financial_year_start: toInputDate(first.start_date),
      financial_year_end: toInputDate(first.end_date)
    }))
  }, [financialYears])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors.length > 0) setErrors([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!company && financialYears.length !== 1) {
      setErrors(['Please add exactly one financial year before creating company.'])
      return
    }

    if (financialYears.length > 0 && !selectedFinancialYearId) {
      setErrors(['Please select financial year before saving.'])
      return
    }

    setLoading(true)
    setErrors([])

    try {
      const selectedFinancialYear = financialYears.find(fy => String(fy.id) === String(selectedFinancialYearId))
      const payload = selectedFinancialYear
        ? {
          ...formData,
          financial_year_start: toInputDate(selectedFinancialYear.start_date),
          financial_year_end: toInputDate(selectedFinancialYear.end_date)
        }
        : formData

      const pendingFinancialYears = financialYears.filter(fy => isTempFinancialYear(fy))
      let response
      if (company && isEditing) {
        response = await api.put(`/company/${company.id}`, formData)
      } else {
        response = await api.post(`/company`, formData)
      }

      if (response.data.success) {
        let activeCompanyId = company?.id || response.data?.data?.id || null
        if (!activeCompanyId) {
          try {
            const companyRes = await api.get(`/company`)
            activeCompanyId = companyRes.data?.data?.id || null
          } catch (companyErr) {
            console.error('Unable to resolve company id after save:', companyErr)
          }
        }

        if (activeCompanyId) {
          try {
            const existingUserRaw = localStorage.getItem('user')
            const existingUser = existingUserRaw ? JSON.parse(existingUserRaw) : {}
            const nextUser = { ...(existingUser || {}), company_id: activeCompanyId }
            localStorage.setItem('user', JSON.stringify(nextUser))
          } catch (storageErr) {
            console.warn('Failed to persist company_id to localStorage:', storageErr)
          }
        }

        if (pendingFinancialYears.length > 0 && activeCompanyId) {
          for (const fy of pendingFinancialYears) {
            await api.post(`/financial-years`, {
              companyId: activeCompanyId,
              yearLabel: fy.year_label,
              startDate: fy.start_date || '',
              endDate: fy.end_date || ''
            })
          }
        }

        setSuccess(true)
        setCompany(response.data.data)
        setIsEditing(false)
        setTimeout(() => setSuccess(false), 3000)
        await fetchCompany()
        if (activeCompanyId) {
          await fetchFinancialYears(activeCompanyId)
        }
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
        <div className="text-center font-black uppercase tracking-widest text-slate-300">
          <p className="text-xs mb-6 italic tracking-[0.4em]">Calibrating Organization Shards...</p>
          <div className="w-24 h-1 bg-slate-100 mx-auto overflow-hidden rounded-full relative">
            <div className="absolute top-0 left-0 w-1/2 h-full bg-blue-600 animate-[slide_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 font-sans animate-in fade-in duration-700">
      <div className="max-w-[1700px] mx-auto px-8">

        {/* Standard Page Header */}
        <PageHeader
          eyebrow="Configuration / Enterprise"
          eyebrowIcon={<Briefcase size={12} className="text-blue-500" />}
          title={company ? company.company_name : "Organizational Nucleus"}
          subtitle="Configure your institutional parameters and fiscal connectivity"
        >
          <div className="flex items-center gap-3">
            {!isEditing && company ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-blue-600 px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
              >
                <Edit3 size={16} /> {t('company.editProfile', 'Edit Profile')}
              </button>
            ) : (
              <>
                <button
                  onClick={() => company ? setIsEditing(false) : navigate('/dashboard')}
                  className="flex items-center gap-2 bg-white border border-slate-200 px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                >
                  <X size={16} /> {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById('company-form').requestSubmit()}
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 disabled:bg-slate-200"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <>
                      <Save size={16} />
                      {company ? "Commit Update" : "Initialize Shard"}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </PageHeader>

        {/* Global Alerts Container */}
        <div className="space-y-4">
          {success && (
            <div className="p-4 bg-white border-l-4 border-emerald-500 shadow-sm flex items-center gap-4 text-emerald-700 animate-in slide-in-from-top duration-300">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600"><CheckCircle size={18} /></div>
              <p className="text-[11px] font-black uppercase tracking-widest leading-none">{t('company.saveSuccess', 'Sync Successful: Parameters Persisted')}</p>
            </div>
          )}

          {errors.length > 0 && (
            <div className="p-6 bg-white border-l-4 border-rose-500 shadow-sm flex items-start gap-4 text-rose-700 animate-in slide-in-from-top duration-300">
              <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600 mt-1"><AlertCircle size={18} /></div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest mb-2 leading-none">{t('company.pleaseFixErrors', 'Protocol Breach: Fix Required')}</p>
                <ul className="text-[10px] space-y-1 font-bold opacity-80 uppercase tracking-tight list-disc list-inside">
                  {errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Dual Pane Interface */}
        {company && !isEditing ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

            {/* Principal Identity Pane */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/10 rounded-full -mr-48 -mt-48 blur-[100px] transition-transform duration-1000 group-hover:scale-110"></div>

                <TableHeading
                  icon={<Building2 size={18} />}
                  iconColor="blue"
                  title="Institutional Identity Shard"
                  subtitle="Verified organizational metadata and legal registry"
                />

                <div className="p-10 relative z-10">
                  <div className="flex flex-col md:flex-row items-center gap-8 mb-12 border-b border-slate-50 pb-12">
                    <div className="w-32 h-32 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-200 shadow-xl shadow-slate-100/50 relative overflow-hidden group/logo">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt="Logo" className="w-full h-full object-contain p-4 transition-transform group-hover/logo:scale-110" />
                      ) : (
                        <Building2 size={56} strokeWidth={1} className="transition-transform group-hover/logo:scale-110" />
                      )}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{company.company_name}</h2>
                      <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-6">
                        <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 shadow-sm">
                          <Shield size={14} className="text-blue-600" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{company.gst_number || "NO_GST_REGISTERED"}</span>
                        </div>
                        <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 shadow-sm">
                          <Globe size={14} className="text-blue-600" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{company.currency} CORE</span>
                        </div>
                        {company.company_account_no && (
                          <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 shadow-sm">
                            <CreditCard size={14} className="text-blue-600" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">A/C: {company.company_account_no}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div className="flex gap-5 group/item">
                        <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all shadow-sm">
                          <MapPin size={22} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 italic">Headquarters Location</p>
                          <p className="text-sm font-bold text-slate-700 leading-relaxed max-w-xs">{company.address || "Location Shard Not Defined"}</p>
                        </div>
                      </div>
                      <div className="flex gap-5 group/item">
                        <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all shadow-sm">
                          <Mail size={22} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 italic">Communication Gateway</p>
                          <p className="text-sm font-bold text-slate-700">{company.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="flex gap-5 group/item">
                        <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all shadow-sm">
                          <Phone size={22} />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 italic">Operational Hotline</p>
                          <p className="text-sm font-bold text-slate-700">{company.phone}</p>
                        </div>
                      </div>
                      <div className="flex gap-5 group/item">
                        <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all shadow-sm">
                          <Calendar size={22} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 italic">Active Fiscal Epoch</p>
                            <button onClick={openYearForm} className="text-[8px] font-black text-blue-600 uppercase tracking-widest hover:underline">Manage</button>
                          </div>
                          <p className="text-sm font-bold text-slate-700">
                            {new Date(company.financial_year_start).toLocaleDateString('en-GB')} — {new Date(company.financial_year_end).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


            </div>

            {/* Auxiliary Metadata Pane */}
            <div className="lg:col-span-4 space-y-4">
              {/* Fiscal Cycle Shards */}
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
                <TableHeading
                  icon={<Calendar size={18} />}
                  iconColor="blue"
                  title="Fiscal Epoch Registry"
                  subtitle="Historical and active cycles"
                >
                  <button onClick={openYearForm} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95">
                    <Plus size={16} />
                  </button>
                </TableHeading>

                <div className="p-6 space-y-4">
                  {yearsLoading ? (
                    <div className="py-12 flex flex-col items-center gap-3">
                      <RefreshCw size={24} className="animate-spin text-blue-100" />
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Querying Registry...</p>
                    </div>
                  ) : financialYears.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] italic">No Epochs Detected</p>
                    </div>
                  ) : (
                    financialYears.map(fy => (
                      <div key={fy.id} className="flex items-center justify-between p-5 bg-white border border-slate-50 rounded-xl hover:border-blue-200 transition-all group/year shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 group-hover/year:bg-blue-600 group-hover/year:text-white transition-all">
                            <Calendar size={16} />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-700 tracking-widest uppercase">{fy.year_label}</span>
                            <div className={`mt-1.5 flex items-center gap-1.5`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${fy.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                              <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${fy.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {fy.is_active ? 'ACTIVE_EPOCH' : 'ARCHIVED'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => startEditYear(fy)} className="p-2 text-slate-200 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover/year:opacity-100">
                          <Edit3 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Secure Systems Metadata */}
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden relative group/meta">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
                <TableHeading
                  icon={<Lock size={18} />}
                  iconColor="blue"
                  title="System Metadata"
                  subtitle="Operational integrity parameters"
                />
                <div className="p-10 space-y-8">
                  <div className="flex items-center justify-between group/row">
                    <div className="flex items-center gap-3">
                      <Activity size={14} className="text-slate-300 group-hover/row:text-blue-600 transition-colors" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registry_ID</span>
                    </div>
                    <span className="text-[11px] font-black font-mono text-slate-900 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">#{company.id}</span>
                  </div>
                  <div className="flex items-center justify-between group/row">
                    <div className="flex items-center gap-3">
                      <Shield size={14} className="text-slate-300 group-hover/row:text-emerald-600 transition-colors" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Shard</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">ENCRYPTED_AES</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between group/row">
                    <div className="flex items-center gap-3">
                      <RefreshCw size={14} className="text-slate-300 group-hover/row:text-blue-600 transition-colors" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sync Epoch</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">{new Date().toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Redesigned Edit / Creation Canvas */
          <div className="bg-white rounded-lg border border-slate-100 shadow-xl shadow-blue-50/10 overflow-hidden animate-in slide-in-from-bottom duration-500 w-full">
            <TableHeading
              icon={<Edit3 size={16} />}
              iconColor="blue"
              title={company ? "Edit Organizational Parameters" : "Institutional Initialization"}
              subtitle="Modify core identity and fiscal connectivity protocols"
            />
            <form id="company-form" onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
                
                {/* Identity & Financial Registry */}
                <div className="md:col-span-4 flex items-center gap-4 mb-1">
                   <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shadow-sm"><Building2 size={14} /></div>
                   <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Identity & Financial Registry</h3>
                   <div className="flex-1 h-px bg-slate-100"></div>
                </div>

                <div className="md:col-span-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Organization Nomenclature</label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={16} />
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      placeholder="e.g. Danger Systeam Private Ltd"
                      className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all font-black text-slate-700 text-sm uppercase italic"
                    />
                  </div>
                </div>

                <div className="md:col-span-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">GST Registration Shard</label>
                  <div className="relative group">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={16} />
                    <input
                      type="text"
                      name="gst_number"
                      value={formData.gst_number}
                      onChange={handleChange}
                      placeholder="GSTIN Number..."
                      className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all font-black text-slate-700 text-sm uppercase"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Institutional Liquidity Node (Bank A/C)</label>
                  <div className="relative group">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={16} />
                    <input
                      type="text"
                      name="company_account_no"
                      value={formData.company_account_no || ''}
                      onChange={handleChange}
                      placeholder="Organization Account Number..."
                      className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all font-black text-slate-700 text-sm"
                    />
                  </div>
                </div>

                {/* Institutional Reach */}
                <div className="md:col-span-4 flex items-center gap-4 mt-5 mb-1">
                   <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shadow-sm"><MapPin size={14} /></div>
                   <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Institutional Reach</h3>
                   <div className="flex-1 h-px bg-slate-100"></div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Physical Headquarters Address</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-4 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={16} />
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Detailed Physical nomenclature..."
                      rows="2"
                      className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-50 transition-all font-black text-slate-700 text-sm resize-none uppercase italic"
                    ></textarea>
                  </div>
                </div>

                <div className="md:col-span-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Communication Gateway (Email)</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={16} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="admin@organization.com"
                      className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-50 transition-all font-black text-slate-700 text-sm italic"
                    />
                  </div>
                </div>

                <div className="md:col-span-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operational Hotline (Phone)</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-600 transition-colors" size={16} />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Direct Contact Shard..."
                      className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-50 transition-all font-black text-slate-700 text-sm"
                    />
                  </div>
                </div>

                {/* Fiscal Infrastructure */}
                <div className="md:col-span-4 flex items-center gap-4 mt-5 mb-1">
                   <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 shadow-sm"><Database size={14} /></div>
                   <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Fiscal Infrastructure</h3>
                   <div className="flex-1 h-px bg-slate-100"></div>
                </div>

                <div className="md:col-span-4 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Settlement Currency Node</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-6 py-3.5 bg-slate-50 border-none rounded-xl focus:bg-white focus:ring-4 focus:ring-amber-50 outline-none transition-all font-black text-slate-700 text-sm cursor-pointer appearance-none uppercase"
                  >
                    {currencyOptions.map(curr => <option key={curr} value={curr}>{curr} - International Standard</option>)}
                  </select>
                </div>

                {/* Fiscal Epoch Registry */}
                <div className="md:col-span-4 flex items-center gap-4 mt-5 mb-1">
                   <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 shadow-sm"><Calendar size={14} /></div>
                   <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Fiscal Epoch Registry</h3>
                   <div className="flex-1 h-px bg-slate-100"></div>
                </div>

                <div className="md:col-span-4">
                    <div className="space-y-6 bg-slate-50/50 p-8 rounded-xl border border-slate-100 mb-10">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Cycle Nomenclature</label>
                          <input
                            type="text"
                            value={newYear.label}
                            onChange={e => setNewYear({ ...newYear, label: e.target.value })}
                            placeholder="e.g. FY 2026-27 (Temporal Shard ID)"
                            className="w-full px-5 py-4 bg-white border border-slate-100 rounded-lg focus:ring-4 focus:ring-blue-50 transition-all font-black text-slate-700 text-sm uppercase italic"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Epoch Commencement (Start)</label>
                          <input
                            type="date"
                            value={newYear.start}
                            onChange={e => setNewYear({ ...newYear, start: e.target.value })}
                            className="w-full px-5 py-4 bg-white border border-slate-100 rounded-lg focus:ring-4 focus:ring-blue-50 transition-all font-black text-slate-700 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Epoch Termination (End)</label>
                          <input
                            type="date"
                            value={newYear.end}
                            onChange={e => setNewYear({ ...newYear, end: e.target.value })}
                            className="w-full px-5 py-4 bg-white border border-slate-100 rounded-lg focus:ring-4 focus:ring-blue-50 transition-all font-black text-slate-700 text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100/50">
                        {editingYear && (
                          <button
                            type="button"
                            onClick={cancelYearEdit}
                            className="px-8 py-3 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-95"
                          >
                            Abort Configuration
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleAddYear}
                          className="px-10 py-3 bg-white border border-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-3 active:scale-95 shadow-sm"
                        >
                          {editingYear ? <RefreshCw size={14} /> : <Plus size={14} />}
                          {editingYear ? 'Commit Node Update' : 'Register Temporal Epoch'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {financialYears.map(fy => (
                        <div
                          key={fy.id}
                          onClick={() => selectFinancialYear(fy)}
                          className={`p-5 bg-white border-2 rounded-xl flex items-center justify-between group/fy transition-all cursor-pointer ${String(selectedFinancialYearId) === String(fy.id) ? 'border-blue-600 shadow-xl shadow-blue-50/20' : 'border-slate-50 hover:border-blue-200'}`}
                        >
                          <div className="flex-1">
                            <p className="text-xs font-black text-slate-900 uppercase tracking-widest italic">{fy.year_label}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-2">
                               <Calendar size={10} />
                               {fy.start_date ? new Date(fy.start_date).toLocaleDateString('en-GB') : 'VOID'} - {fy.end_date ? new Date(fy.end_date).toLocaleDateString('en-GB') : 'VOID'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startEditYear(fy); }}
                            className="p-2 text-slate-100 group-hover/fy:text-blue-600 group-hover/fy:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {(formData.financial_year_start || formData.financial_year_end) && (
                      <div className="mt-10 p-5 bg-blue-600 rounded-xl shadow-xl shadow-blue-100 flex items-center justify-between animate-in zoom-in-95 duration-500">
                         <div className="flex items-center gap-4 text-white">
                            <Zap size={18} className="animate-pulse" />
                            <div>
                               <span className="text-[10px] font-black uppercase tracking-[0.2em] block">Active Shard Synchronized</span>
                               <span className="text-[8px] font-bold uppercase text-blue-100">Temporal connectivity established for current session</span>
                            </div>
                         </div>
                         <div className="text-[11px] font-black text-white uppercase italic tracking-tighter bg-white/10 px-4 py-2 rounded-lg border border-white/20">
                            {formData.financial_year_start || 'VOID'} <span className="mx-2 text-blue-300">→</span> {formData.financial_year_end || 'VOID'}
                         </div>
                      </div>
                    )}
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default CompanySetup
