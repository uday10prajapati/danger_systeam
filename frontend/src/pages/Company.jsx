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
      console.error('Financial Year Error:', e);
      setErrors([e.response?.data?.error || e.message || 'Failed to save financial year']);
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
          <p className="text-xs mb-6 italic tracking-[0.4em]">Loading Company Profile...</p>
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

        {/* Page Header */}
        <PageHeader
          eyebrow="Configuration / Company"
          eyebrowIcon={<Briefcase size={12} className="text-blue-500" />}
          title={company ? company.company_name : "Company Setup"}
          subtitle="Configure your organization profile and financial years"
        >
          <div className="flex items-center gap-4">
            {!isEditing && company ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-blue-600 px-8 py-3 rounded-lg text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
              >
                <Edit3 size={16} /> {t('company.editProfile', 'Edit Profile')}
              </button>
            ) : (
              <>
                <button
                  onClick={() => company ? setIsEditing(false) : navigate('/dashboard')}
                  className="flex items-center gap-2 bg-white border border-slate-200 px-8 py-3 rounded-lg text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                >
                  <X size={16} /> {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById('company-form').requestSubmit()}
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 px-8 py-3 rounded-lg text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 disabled:bg-slate-200"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <>
                      <Save size={16} />
                      {company ? "Save Changes" : "Create Company"}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </PageHeader>

        {/* Alerts */}
        <div className="space-y-4">
          {success && (
            <div className="p-4 bg-white border-l-4 border-emerald-500 shadow-sm flex items-center gap-4 text-emerald-700 animate-in slide-in-from-top duration-300">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600"><CheckCircle size={18} /></div>
              <p className="text-sm font-bold">{t('company.saveSuccess', 'Settings saved successfully')}</p>
            </div>
          )}

          {errors.length > 0 && (
            <div className="p-6 bg-white border-l-4 border-rose-500 shadow-sm flex items-start gap-4 text-rose-700 animate-in slide-in-from-top duration-300">
              <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600 mt-1"><AlertCircle size={18} /></div>
              <div>
                <p className="text-sm font-bold mb-2">{t('company.pleaseFixErrors', 'Please correct the following errors:')}</p>
                <ul className="text-xs space-y-1 font-semibold list-disc list-inside">
                  {errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Profile View */}
        {company && !isEditing ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

            {/* Main Info */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
                <TableHeading
                  icon={<Building2 size={16} />}
                  iconColor="blue"
                  title="Company Details"
                />

                <div className="p-8">
                  <div className="flex flex-col md:flex-row items-center gap-8 mb-10 border-b border-slate-50 pb-10">
                    <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-200">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                      ) : (
                        <Building2 size={40} strokeWidth={1} />
                      )}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-3xl font-bold text-slate-800 uppercase tracking-tight">{company.company_name}</h2>
                      <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                          <Shield size={14} className="text-blue-600" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">GST: {company.gst_number || "NOT_SET"}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                          <Globe size={14} className="text-blue-600" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{company.currency}</span>
                        </div>
                        {company.company_account_no && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                            <CreditCard size={14} className="text-blue-600" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">A/C: {company.company_account_no}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Address</p>
                          <p className="text-sm font-semibold text-slate-600 leading-relaxed">{company.address || "No address provided"}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                          <Mail size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</p>
                          <p className="text-sm font-semibold text-slate-600">{company.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                          <Phone size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                          <p className="text-sm font-semibold text-slate-600">{company.phone}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                          <Calendar size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Financial Year</p>
                          <p className="text-sm font-semibold text-slate-600">
                            {new Date(company.financial_year_start).toLocaleDateString('en-GB')} - {new Date(company.financial_year_end).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Years */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
                <TableHeading
                  icon={<Calendar size={16} />}
                  iconColor="blue"
                  title="Financial Years"
                >
                  <button onClick={openYearForm} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all active:scale-95">
                    <Plus size={16} />
                  </button>
                </TableHeading>

                <div className="p-4 space-y-3">
                  {yearsLoading ? (
                    <div className="py-8 flex flex-col items-center gap-2">
                      <RefreshCw size={20} className="animate-spin text-blue-100" />
                      <p className="text-xs font-bold text-slate-300 italic">Loading years...</p>
                    </div>
                  ) : financialYears.length === 0 ? (
                    <div className="py-8 text-center text-slate-300 text-xs font-bold italic">No financial years found</div>
                  ) : (
                    financialYears.map(fy => (
                      <div key={fy.id} className="flex items-center justify-between p-4 bg-slate-50 border border-transparent rounded-lg hover:border-blue-200 transition-all group/year">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${fy.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <div>
                            <p className="text-xs font-bold text-slate-700">{fy.year_label}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                               {fy.start_date ? new Date(fy.start_date).toLocaleDateString('en-GB') : '—'} - {fy.end_date ? new Date(fy.end_date).toLocaleDateString('en-GB') : '—'}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => startEditYear(fy)} className="p-1.5 text-slate-300 hover:text-blue-600 rounded transition-all opacity-0 group-hover/year:opacity-100">
                          <Edit3 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* System Info */}
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
                <TableHeading
                  icon={<Lock size={16} />}
                  iconColor="blue"
                  title="System Status"
                />
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company ID</span>
                    <span className="text-xs font-bold text-slate-600">#{company.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <span className="text-[10px] font-bold uppercase">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Edit Form */
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
            <TableHeading
              icon={<Edit3 size={16} />}
              iconColor="blue"
              title={company ? "Edit Company Settings" : "New Company Setup"}
            />
            <form id="company-form" onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Basic Info */}
                <div className="md:col-span-4 flex items-center gap-3 mb-2">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Basic Information</h3>
                   <div className="flex-1 h-px bg-slate-50"></div>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="Enter company name"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                  />
                </div>

                <div className="md:col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">GST Number</label>
                  <input
                    type="text"
                    name="gst_number"
                    value={formData.gst_number}
                    onChange={handleChange}
                    placeholder="GSTIN..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm uppercase"
                  />
                </div>

                <div className="md:col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Account Number</label>
                  <input
                    type="text"
                    name="company_account_no"
                    value={formData.company_account_no || ''}
                    onChange={handleChange}
                    placeholder="Bank account..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                  />
                </div>

                {/* Contact Info */}
                <div className="md:col-span-4 flex items-center gap-3 mt-4 mb-2">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Contact Details</h3>
                   <div className="flex-1 h-px bg-slate-50"></div>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Company address"
                    rows="2"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm resize-none"
                  ></textarea>
                </div>

                <div className="md:col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Contact email"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                  />
                </div>

                <div className="md:col-span-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Phone number"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm"
                  />
                </div>

                {/* Settings */}
                <div className="md:col-span-4 flex items-center gap-3 mt-4 mb-2">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Settings</h3>
                   <div className="flex-1 h-px bg-slate-50"></div>
                </div>

                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Currency</label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-slate-700 text-sm cursor-pointer"
                  >
                    {currencyOptions.map(curr => <option key={curr} value={curr}>{curr}</option>)}
                  </select>
                </div>

                {/* Financial Years List */}
                <div className="md:col-span-4 flex items-center gap-3 mt-4 mb-2">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Financial Years</h3>
                   <div className="flex-1 h-px bg-slate-50"></div>
                </div>

                <div className="md:col-span-4">
                    <div className="space-y-4 bg-slate-50 p-6 rounded-lg border border-slate-100 mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Label</label>
                          <input
                            type="text"
                            value={newYear.label}
                            onChange={e => setNewYear({ ...newYear, label: e.target.value })}
                            placeholder="e.g. FY 2026-27"
                            className="w-full px-4 py-3 bg-white border border-slate-100 rounded-lg focus:border-blue-500 transition-all font-bold text-slate-700 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Start Date</label>
                          <input
                            type="date"
                            value={newYear.start}
                            onChange={e => setNewYear({ ...newYear, start: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-100 rounded-lg focus:border-blue-500 transition-all font-bold text-slate-700 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">End Date</label>
                          <input
                            type="date"
                            value={newYear.end}
                            onChange={e => setNewYear({ ...newYear, end: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-100 rounded-lg focus:border-blue-500 transition-all font-bold text-slate-700 text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3">
                        {editingYear && (
                          <button
                            type="button"
                            onClick={cancelYearEdit}
                            className="px-6 py-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 transition-all"
                          >
                            Cancel Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleAddYear}
                          className="px-8 py-2.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                          {editingYear ? <RefreshCw size={14} /> : <Plus size={14} />}
                          {editingYear ? 'Update Year' : 'Add Financial Year'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {financialYears.map(fy => (
                        <div
                          key={fy.id}
                          onClick={() => selectFinancialYear(fy)}
                          className={`p-4 bg-white border-2 rounded-lg flex items-center justify-between group/fy transition-all cursor-pointer ${String(selectedFinancialYearId) === String(fy.id) ? 'border-blue-600 shadow-md' : 'border-slate-50 hover:border-blue-200'}`}
                        >
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-700">{fy.year_label}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1">
                               {fy.start_date ? new Date(fy.start_date).toLocaleDateString('en-GB') : '—'} - {fy.end_date ? new Date(fy.end_date).toLocaleDateString('en-GB') : '—'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startEditYear(fy); }}
                            className="p-1.5 text-slate-200 group-hover/fy:text-blue-600 transition-all"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {selectedFinancialYearId && (
                      <div className="mt-6 p-4 bg-blue-600 rounded-lg shadow-md flex items-center justify-between animate-in zoom-in-95 duration-500">
                         <div className="flex items-center gap-3 text-white">
                            <Zap size={18} />
                            <p className="text-xs font-bold uppercase tracking-widest">Selected Financial Year Active</p>
                         </div>
                         <div className="text-[10px] font-black text-white uppercase bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
                            {formData.financial_year_start || '—'} → {formData.financial_year_end || '—'}
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
