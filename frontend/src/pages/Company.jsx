import React, { useState, useEffect, useRef } from 'react'
import {
  Building2, Phone, Mail, MapPin,
  Calendar, CheckCircle, AlertCircle, Edit3,
  Globe, Shield, Save, X, RefreshCw, Plus, CreditCard,
  Loader, Activity, Database, Zap
} from 'lucide-react'
import api from '../api'
import { useTranslation } from 'react-i18next'
import Toast from '../components/Toast'
import Loading from '../components/Loading'

function CompanySetup() {
  const { t, i18n } = useTranslation()

  const [company, setCompany] = useState(null)
  const displayCompanyName = (comp) => {
    if (!comp) return ''
    return i18n.language === 'gu'
      ? (comp.company_name_gu || comp.company_name || '')
      : (comp.company_name || comp.company_name_gu || '')
  }

  const translateServerMessage = (message) => {
    if (!message || i18n.language !== 'gu') return message

    const text = String(message)
    const lower = text.toLowerCase()

    if (/company name.*required/.test(lower)) return 'કંપનીનું નામ આવશ્યક છે.'
    if (/gst.*required/.test(lower)) return 'GST નંબર આવશ્યક છે.'
    if (/email.*required/.test(lower)) return 'ઈમેલ આવશ્યક છે.'
    if (/phone.*required/.test(lower)) return 'ફોન આવશ્યક છે.'
    if (/address.*required/.test(lower)) return 'સરનામું આવશ્યક છે.'
    if (/failed to save company/.test(lower)) return 'કંપની સાચવવામાં નિષ્ફળ. કૃપા કરીને ફરી પ્રયાસ કરો.'
    if (/failed to load company/.test(lower)) return 'કંપની લોડ કરવામાં નિષ્ફળ.'
    if (/company not found/.test(lower)) return 'કંપની મળી નથી.'
    if (/validation/.test(lower)) return 'કૃપા કરીને નીચેની ભૂલો સુધારો.'

    return text
  }
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [financialYears, setFinancialYears] = useState([])
  const [yearsLoading, setYearsLoading] = useState(false)

  // Company edit modal
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [companyForm, setCompanyForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState([])

  // Financial year modal
  const [showYearModal, setShowYearModal] = useState(false)
  const [yearForm, setYearForm] = useState({ label: '', start: '', end: '' })
  const [editingYear, setEditingYear] = useState(null)
  const [yearSaving, setYearSaving] = useState(false)

  // Refs for Company Form
  const gstRef = useRef(null)
  const bankRef = useRef(null)
  const currencyRef = useRef(null)
  const addressRef = useRef(null)
  const emailRef = useRef(null)
  const phoneRef = useRef(null)
  const fyStartRef = useRef(null)
  const fyEndRef = useRef(null)

  // Refs for Year Form
  const yearStartRef = useRef(null)
  const yearEndRef = useRef(null)

  const handleKeyDown = (e, nextRef, submitFn) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (nextRef && nextRef.current) {
        nextRef.current.focus()
      } else if (submitFn) {
        submitFn(e)
      }
    }
  }

  const toInputDate = (value) =>
    value ? new Date(value).toISOString().split('T')[0] : ''

  useEffect(() => { fetchCompany() }, [])

  const fetchCompany = async () => {
    try {
      setLoading(true)
      const res = await api.get('/company')
      const data = res.data.data
      setCompany(data)
      if (data?.id) {
        fetchFinancialYears(data.id)
        try {
          const u = JSON.parse(localStorage.getItem('user') || '{}')
          localStorage.setItem('user', JSON.stringify({ ...u, company_id: data.id }))
        } catch {}
      }
    } catch (e) {
      if (e.response?.status !== 404) console.error(e)
      setCompany(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchFinancialYears = async (companyId) => {
    try {
      setYearsLoading(true)
      const res = await api.get(`/financial-years/${companyId}`)
      const data = res.data.success ? res.data.data : res.data
      setFinancialYears(Array.isArray(data) ? data : [])
    } catch {
      setFinancialYears([])
    } finally {
      setYearsLoading(false)
    }
  }

  // ── Company Modal ──
  const openCompanyModal = () => {
    setCompanyForm({
      company_name: company?.company_name || '',
      company_name_gu: company?.company_name_gu || '',
      address: company?.address || '',
      phone: company?.phone || '',
      email: company?.email || '',
      gst_number: company?.gst_number || '',
      company_account_no: company?.company_account_no || '',
      currency: company?.currency || 'INR',
      logo_url: company?.logo_url || '',
      financial_year_start: toInputDate(company?.financial_year_start) || '',
      financial_year_end: toInputDate(company?.financial_year_end) || ''
    })
    setFormErrors([])
    setShowCompanyModal(true)
  }

  const handleCompanySubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setFormErrors([])
    try {
      if (company) {
        await api.put(`/company/${company.id}`, companyForm)
        setToast({ type: 'success', text: t('company.updateSuccess') })
      } else {
        await api.post('/company', companyForm)
        setToast({ type: 'success', text: t('company.createSuccess') })
      }
      setShowCompanyModal(false)
      fetchCompany()
    } catch (err) {
      const apiErrors = err.response?.data?.errors
      const normalizedErrors = Array.isArray(apiErrors)
        ? apiErrors
        : apiErrors && typeof apiErrors === 'object'
          ? Object.values(apiErrors).flat()
          : []

      setFormErrors(
        normalizedErrors.length > 0
          ? normalizedErrors.map(translateServerMessage)
          : [translateServerMessage(err.response?.data?.error || t('company.saveFailed'))]
      )
    } finally {
      setSaving(false)
    }
  }

  // ── Year Modal ──
  const openNewYearModal = () => {
    setEditingYear(null)
    setYearForm({ label: '', start: '', end: '' })
    setShowYearModal(true)
  }

  const openEditYearModal = (fy) => {
    setEditingYear(fy)
    setYearForm({
      label: fy.year_label || '',
      start: toInputDate(fy.start_date),
      end: toInputDate(fy.end_date)
    })
    setShowYearModal(true)
  }

  const handleYearSubmit = async (e) => {
    e.preventDefault()
    setYearSaving(true)
    try {
      if (editingYear) {
        await api.put(`/financial-years/${editingYear.id}`, {
          yearLabel: yearForm.label,
          startDate: yearForm.start,
          endDate: yearForm.end,
          is_active: editingYear.is_active
        })
        setToast({ type: 'success', text: t('company.fyUpdateSuccess') })
      } else {
        await api.post('/financial-years', {
          companyId: company.id,
          yearLabel: yearForm.label,
          startDate: yearForm.start,
          endDate: yearForm.end
        })
        setToast({ type: 'success', text: t('company.fyAddSuccess') })
      }
      setShowYearModal(false)
      fetchFinancialYears(company.id)
    } catch (err) {
      setToast({ type: 'error', text: translateServerMessage(err.response?.data?.error || t('company.fySaveFailed')) })
    } finally {
      setYearSaving(false)
    }
  }

  const currencyOptions = ['INR', 'USD', 'EUR', 'GBP', 'JPY']

  if (loading) return <Loading />

  const activeYear = financialYears.find(fy => fy.is_active)

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-8 select-none">
      <Toast message={toast} onClose={() => setToast(null)} />
      {(saving || yearSaving) && <Loading />}

      <div className="max-w-[1600px] mx-auto px-4 py-4">
        
        {/* Main Container */}
        <div className="bg-white border border-slate-200 rounded-lg flex flex-col relative shadow-none overflow-hidden">
          
          {/* Unified Header Bar */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
            <div className="flex items-center gap-4">
              <span className="text-xs font-extrabold text-[#1d5f84] uppercase tracking-wider flex items-center gap-2">
                <Building2 size={14} className="text-[#1d5f84]" />
                {t('company.title')}
              </span>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider hidden md:block">
                {t('company.configProfile')}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={fetchCompany}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
                title={t('company.refresh')}
              >
                <RefreshCw size={13} className="text-slate-500" />
              </button>
              {company ? (
                <button
                  onClick={openCompanyModal}
                  className="h-7 flex items-center gap-1.5 px-3 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[11px] font-bold rounded-md transition shadow-sm cursor-pointer uppercase tracking-wider"
                >
                  <Edit3 size={13} /> {t('company.editCompany')}
                </button>
              ) : (
                <button
                  onClick={openCompanyModal}
                  className="h-7 flex items-center gap-1.5 px-3 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[11px] font-bold rounded-md transition shadow-sm cursor-pointer uppercase tracking-wider"
                >
                  <Plus size={13} /> {t('company.setupCompany')}
                </button>
              )}
            </div>
          </div>

          <div className="p-4 bg-slate-50 flex-1">
            {/* No company state */}
            {!company && (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400 border border-dashed border-slate-300 bg-white rounded-lg">
                <Building2 size={48} strokeWidth={1} className="text-slate-300" />
                <p className="text-xs font-mono uppercase tracking-widest">{t('company.noCompany')}</p>
                <button
                  onClick={openCompanyModal}
                  className="bg-[#1d5f84] hover:bg-[#154662] text-white text-xs font-bold px-6 py-2 rounded-md transition cursor-pointer"
                >
                  {t('company.initializeCompany')}
                </button>
              </div>
            )}

            {company && (
              <div className="space-y-4">
                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm flex flex-col justify-between">
                    <span className={`text-[9px] font-bold text-slate-400 tracking-widest ${t('company.companyName').match(/[a-z]/i) ? 'uppercase' : 'font-sans'}`}>{t('company.companyName')}</span>
                    <span className={`text-[13px] font-bold text-slate-800 mt-1 truncate ${i18n.language === 'gu' ? 'font-prompt' : 'font-sans'}`}>{displayCompanyName(company)}</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm flex flex-col justify-between">
                    <span className={`text-[9px] font-bold text-slate-400 tracking-widest ${t('company.gstNumber').match(/[a-z]/i) ? 'uppercase' : 'font-sans'}`}>{t('company.gstNumber')}</span>
                    <span className="text-[13px] font-bold force-en notranslate text-slate-800 mt-1" translate="no">{company.gst_number || '—'}</span>
                  </div>
                  <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm flex flex-col justify-between">
                    <span className={`text-[9px] font-bold text-slate-400 tracking-widest ${t('company.activeFinancialYear').match(/[a-z]/i) ? 'uppercase' : 'font-sans'}`}>{t('company.activeFinancialYear')}</span>
                    <span className="text-[13px] font-bold font-sans text-[#1d5f84] mt-1">
                      {activeYear?.year_label || '—'}
                    </span>
                  </div>
                  <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm flex flex-col justify-between">
                    <span className={`text-[9px] font-bold text-slate-400 tracking-widest ${t('company.currency').match(/[a-z]/i) ? 'uppercase' : 'font-sans'}`}>{t('company.currency')}</span>
                    <span className="text-[13px] font-bold force-en notranslate text-slate-800 mt-1" translate="no">{company.currency || 'INR'}</span>
                  </div>
                </div>

                {/* Company Details + Financial Years — two column */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                  {/* Left: Company Details Card */}
                  <div className="lg:col-span-7 border border-slate-200 bg-white rounded-lg flex flex-col overflow-hidden shadow-sm">
                    <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-[#1d5f84]" />
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('company.companyProfile')}</span>
                      </div>
                      <button onClick={openCompanyModal} className="p-1 text-slate-400 hover:text-[#1d5f84] transition rounded-md cursor-pointer" title={t('company.edit')}>
                        <Edit3 size={14} />
                      </button>
                    </div>

                    <div className="p-4 bg-white flex-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field icon={<Building2 size={14} />} label={t('company.companyName')} value={displayCompanyName(company)} isGujarati={i18n.language === 'gu'} />
                        <Field icon={<Shield size={14} />} label={t('company.gstNumber')} value={company.gst_number || '—'} />
                        <Field icon={<MapPin size={14} />} label={t('company.address')} value={company.address || '—'} />
                        <Field icon={<Phone size={14} />} label={t('company.phone')} value={company.phone || '—'} />
                        <Field icon={<Mail size={14} />} label={t('company.email')} value={company.email || '—'} />
                        <Field icon={<CreditCard size={14} />} label={t('company.bankAccountNo')} value={company.company_account_no || '—'} />
                        <Field icon={<Globe size={14} />} label={t('company.currency')} value={company.currency} />
                        <Field
                          icon={<Calendar size={14} />}
                          label={t('company.financialYear')}
                          value={
                            company.financial_year_start && company.financial_year_end
                              ? `${new Date(company.financial_year_start).toLocaleDateString('en-GB')} – ${new Date(company.financial_year_end).toLocaleDateString('en-GB')}`
                              : '—'
                          }
                        />
                      </div>

                      {/* System status */}
                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Database size={12} />
                          <span className="text-[9px] force-en font-bold uppercase tracking-widest">ID: #{company.id}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${t('company.active').match(/[a-z]/i) ? 'uppercase' : 'font-sans'}`}>{t('company.active')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Financial Years */}
                  <div className="lg:col-span-5 border border-slate-200 bg-white rounded-lg flex flex-col overflow-hidden shadow-sm">
                    <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-[#1d5f84]" />
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('company.financialYears')}</span>
                        <span className={`bg-slate-200 text-slate-600 force-en text-[9px] font-bold px-1.5 py-0.5 rounded-sm`}>
                          {financialYears.length} {t('company.records')}
                        </span>
                      </div>
                      <button
                        onClick={openNewYearModal}
                        className="flex items-center gap-1 bg-[#1d5f84] hover:bg-[#154662] text-white text-[10px] font-bold px-2 py-1 transition rounded-md cursor-pointer"
                      >
                        <Plus size={12} /> {t('company.add')}
                      </button>
                    </div>

                    <div className="flex-1 overflow-x-auto bg-white scroller-airy">
                      {yearsLoading ? (
                        <div className="flex items-center justify-center py-16">
                          <Loader size={20} className="animate-spin text-[#1d5f84]" />
                        </div>
                      ) : financialYears.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                          <Calendar size={32} strokeWidth={1} className="text-slate-300" />
                          <p className="text-[10px] font-mono tracking-widest uppercase">{t('company.noYears')}</p>
                          <button onClick={openNewYearModal} className="text-[#1d5f84] hover:text-[#154662] underline text-[10px] font-bold mt-1 transition cursor-pointer">
                            {t('company.addFirstYear')}
                          </button>
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse select-none">
                          <thead className="sticky top-0 z-20 shadow-sm">
                            <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                              <th className={`px-4 py-2 border-r border-slate-200 whitespace-nowrap ${t('company.label').match(/[a-z]/i) ? 'uppercase' : 'font-sans'}`}>{t('company.label')}</th>
                              <th className={`px-4 py-2 border-r border-slate-200 whitespace-nowrap ${t('company.period').match(/[a-z]/i) ? 'uppercase' : 'font-sans'}`}>{t('company.period')}</th>
                              <th className={`px-4 py-2 border-r border-slate-200 text-center whitespace-nowrap ${t('company.status').match(/[a-z]/i) ? 'uppercase' : 'font-sans'}`}>{t('company.status')}</th>
                              <th className={`px-4 py-2 text-center whitespace-nowrap ${t('company.edit').match(/[a-z]/i) ? 'uppercase' : 'font-sans'}`}>{t('company.edit')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {financialYears.map(fy => (
                              <tr key={fy.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5 font-bold text-[11px] border-r border-slate-100 font-sans">{fy.year_label}</td>
                                <td className="px-4 py-2.5 text-slate-500 border-r border-slate-100 text-[11px] force-en font-mono font-bold whitespace-nowrap">
                                  {fy.start_date ? new Date(fy.start_date).toLocaleDateString('en-GB') : '—'}
                                  {' – '}
                                  {fy.end_date ? new Date(fy.end_date).toLocaleDateString('en-GB') : '—'}
                                </td>
                                <td className="px-4 py-2.5 border-r border-slate-100 text-center">
                                  {fy.is_active ? (
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 text-[9px] font-bold tracking-widest ${t('company.active').match(/[a-z]/i) ? 'uppercase' : 'font-sans'}`}>
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {t('company.active')}
                                    </span>
                                  ) : (
                                    <span className={`px-2 py-0.5 rounded-sm bg-slate-100 text-slate-500 text-[9px] tracking-widest ${t('company.inactive').match(/[a-z]/i) ? 'uppercase' : 'font-sans'}`}>{t('company.inactive')}</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <button
                                    onClick={() => openEditYearModal(fy)}
                                    className="p-1 text-slate-400 hover:text-[#1d5f84] transition rounded-md cursor-pointer"
                                    title={t('company.editYear')}
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Company Edit Modal ── */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px] transition-opacity" onClick={() => setShowCompanyModal(false)} />
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-lg overflow-hidden flex flex-col max-h-[90vh]">

            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white border border-slate-200 text-[#1d5f84] rounded-md shadow-sm">
                  <Building2 size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    {company ? t('company.editSettings') : t('company.initCompany')}
                  </h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">
                    {t('company.configOrgProfile')}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCompanyModal(false)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 scroller-airy">
              {formErrors.length > 0 && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-800 text-[11px] flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <ul className="list-disc list-inside space-y-1 font-bold">
                    {formErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              <form id="company-modal-form" onSubmit={handleCompanySubmit} className="space-y-4">

                {/* Basic Info Group */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-[#1d5f84] uppercase tracking-widest border-b border-slate-100 pb-1">Basic Identity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Company Name (English)</label>
                      <div className="relative">
                        <Building2 className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
                        <input
                          type="text"
                          value={companyForm.company_name}
                          onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 text-xs"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Company Name (Gujarati)</label>
                      <div className="relative">
                        <Building2 className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
                        <input
                          type="text"
                          value={companyForm.company_name_gu}
                          onChange={(e) => setCompanyForm({ ...companyForm, company_name_gu: e.target.value })}
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-prompt font-bold text-slate-700 text-xs"
                          placeholder="દા.ત. ડાંગર સિસ્ટમ"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ModalField label={t('company.gstNumber')}>
                    <input ref={gstRef} type="text" value={companyForm.gst_number || ''} 
                      onChange={e => setCompanyForm(p => ({ ...p, gst_number: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, bankRef)}
                      placeholder={t('company.gstNumber') + "..."} className={inputCls + ' force-en'} />
                  </ModalField>
                  <ModalField label={t('company.bankAccountNo')}>
                    <input ref={bankRef} type="text" value={companyForm.company_account_no || ''} 
                      onChange={e => setCompanyForm(p => ({ ...p, company_account_no: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, currencyRef)}
                      placeholder={t('company.bankAccountNo')} className={inputCls + ' force-en'} />
                  </ModalField>
                  <ModalField label={t('company.currency')}>
                    <select ref={currencyRef} value={companyForm.currency || 'INR'} 
                      onChange={e => setCompanyForm(p => ({ ...p, currency: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, addressRef)}
                      className={inputCls + ' force-en'}>
                      {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </ModalField>
                </div>

                <SectionLabel>{t('company.contactDetails')}</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ModalField label={t('company.address')} className="md:col-span-2">
                    <textarea ref={addressRef} value={companyForm.address || ''} 
                      onChange={e => setCompanyForm(p => ({ ...p, address: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, emailRef)}
                      placeholder={t('company.enterAddress')} rows={2} className={inputCls + ' resize-none'} />
                  </ModalField>
                  <ModalField label={t('company.email')}>
                    <input ref={emailRef} type="email" value={companyForm.email || ''} 
                      onChange={e => setCompanyForm(p => ({ ...p, email: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, phoneRef)}
                      placeholder={t('company.enterEmail')} className={inputCls + ' force-en'} />
                  </ModalField>
                  <ModalField label={t('company.phone')}>
                    <input ref={phoneRef} type="tel" value={companyForm.phone || ''} 
                      onChange={e => setCompanyForm(p => ({ ...p, phone: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, fyStartRef)}
                      placeholder={t('company.enterPhone')} className={inputCls + ' force-en'} />
                  </ModalField>
                </div>

                <SectionLabel>{t('company.fyDetails')}</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                  <ModalField label={t('company.fyStart')} required>
                    <input ref={fyStartRef} type="date" value={companyForm.financial_year_start || ''} 
                      onChange={e => setCompanyForm(p => ({ ...p, financial_year_start: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, fyEndRef)}
                      className={inputCls + ' force-en'} />
                  </ModalField>
                  <ModalField label={t('company.fyEnd')} required>
                    <input ref={fyEndRef} type="date" value={companyForm.financial_year_end || ''} 
                      onChange={e => setCompanyForm(p => ({ ...p, financial_year_end: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, null, handleCompanySubmit)}
                      className={inputCls + ' force-en'} />
                  </ModalField>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                  <button type="button" onClick={() => setShowCompanyModal(false)}
                    className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold transition rounded-md uppercase text-[10px] tracking-wider cursor-pointer shadow-sm">
                    {t('company.cancel')}
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-4 py-1.5 bg-[#1d5f84] hover:bg-[#154662] text-white font-bold transition rounded-md uppercase text-[10px] tracking-wider flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm">
                    {saving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />}
                    {company ? t('company.saveChanges') : t('company.createCompany')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Financial Year Modal ── */}
      {showYearModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px] transition-opacity" onClick={() => setShowYearModal(false)} />
          <div className="relative w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-lg overflow-hidden flex flex-col">

            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white border border-slate-200 text-[#1d5f84] rounded-md shadow-sm">
                  <Calendar size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    {editingYear ? t('company.editFy') : t('company.addFy')}
                  </h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">{t('company.fiscalPeriodConfig')}</p>
                </div>
              </div>
              <button onClick={() => setShowYearModal(false)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleYearSubmit} className="p-5 space-y-4">
              <ModalField label={t('company.yearLabel')} required>
                <input type="text" value={yearForm.label} onChange={e => setYearForm(p => ({ ...p, label: e.target.value }))}
                  onKeyDown={e => handleKeyDown(e, yearStartRef)}
                  placeholder={t('company.fyPlaceholder')} className={inputCls} autoFocus />
              </ModalField>
              <div className="grid grid-cols-2 gap-4">
                <ModalField label={t('company.startDate')} required>
                  <input ref={yearStartRef} type="date" value={yearForm.start} 
                    onChange={e => setYearForm(p => ({ ...p, start: e.target.value }))}
                    onKeyDown={e => handleKeyDown(e, yearEndRef)}
                    className={inputCls + ' force-en'} />
                </ModalField>
                <ModalField label={t('company.endDate')} required>
                  <input ref={yearEndRef} type="date" value={yearForm.end} 
                    onChange={e => setYearForm(p => ({ ...p, end: e.target.value }))}
                    onKeyDown={e => handleKeyDown(e, null, handleYearSubmit)}
                    className={inputCls + ' force-en'} />
                </ModalField>
              </div>

              <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-100 mt-2">
                <button type="button" onClick={() => setShowYearModal(false)}
                  className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold transition rounded-md uppercase text-[10px] tracking-wider cursor-pointer shadow-sm">
                  {t('company.cancel')}
                </button>
                <button type="submit" disabled={yearSaving}
                  className="px-4 py-1.5 bg-[#1d5f84] hover:bg-[#154662] text-white font-bold transition rounded-md uppercase text-[10px] tracking-wider flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm">
                  {yearSaving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />}
                  {editingYear ? t('company.updateYear') : t('company.addYear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ──

const inputCls = 'w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-prompt text-slate-700 font-bold text-xs shadow-sm'

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[9px] font-bold uppercase tracking-widest text-[#1d5f84]">{children}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  )
}

function ModalField({ label, children, required, className }) {
  return (
    <div className={`space-y-1.5 ${className || ''}`}>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Field({ icon, label, value, isGujarati }) {
  const labelLower = String(label).toLowerCase();
  const isTechnical = labelLower.includes('email') || 
                      labelLower.includes('gst') || 
                      labelLower.includes('phone') || 
                      labelLower.includes('bank') || 
                      String(value).includes('@') ||
                      label.includes('ઈમેલ') || // Email
                      label.includes('જીએસટી') || // GST
                      label.includes('ફોન') || // Phone
                      label.includes('બેંક'); // Bank
  const isGujaratiLabel = label.match(/[^\x00-\x7F]/);

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center text-[#1d5f84] shrink-0 shadow-sm">
        {icon}
      </div>
      <div>
        <p className={`text-[9px] font-bold text-slate-400 tracking-widest ${isGujaratiLabel ? 'font-sans' : 'uppercase'}`}>{label}</p>
        <p 
          className={`text-[13px] font-bold text-slate-700 mt-0.5 ${isTechnical ? 'force-en notranslate' : (isGujarati ? 'font-prompt' : 'font-sans uppercase')}`}
          translate={isTechnical ? "no" : "yes"}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

export default CompanySetup
