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
  const { t } = useTranslation()

  const [company, setCompany] = useState(null)
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
        setToast({ type: 'success', text: 'Company settings updated.' })
      } else {
        await api.post('/company', companyForm)
        setToast({ type: 'success', text: 'Company created successfully.' })
      }
      setShowCompanyModal(false)
      fetchCompany()
    } catch (err) {
      setFormErrors(err.response?.data?.errors || [err.response?.data?.error || 'Save failed.'])
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
        setToast({ type: 'success', text: 'Financial year updated.' })
      } else {
        await api.post('/financial-years', {
          companyId: company.id,
          yearLabel: yearForm.label,
          startDate: yearForm.start,
          endDate: yearForm.end
        })
        setToast({ type: 'success', text: 'Financial year added.' })
      }
      setShowYearModal(false)
      fetchFinancialYears(company.id)
    } catch (err) {
      setToast({ type: 'error', text: err.response?.data?.error || 'Failed to save financial year.' })
    } finally {
      setYearSaving(false)
    }
  }

  const currencyOptions = ['INR', 'USD', 'EUR', 'GBP', 'JPY']

  if (loading) return <Loading />

  const activeYear = financialYears.find(fy => fy.is_active)

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none">
      <Toast message={toast} onClose={() => setToast(null)} />
      {(saving || yearSaving) && <Loading />}

      <div className="max-w-[1400px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
              <Building2 size={20} className="text-zinc-600" />
              Company Settings
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">
              Configuration / Organization Profile
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchCompany}
              className="p-2 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-500 transition"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
            {company ? (
              <button
                onClick={openCompanyModal}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm"
              >
                <Edit3 size={14} /> EDIT COMPANY
              </button>
            ) : (
              <button
                onClick={openCompanyModal}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm"
              >
                <Plus size={14} /> SETUP COMPANY
              </button>
            )}
          </div>
        </div>

        {/* No company state */}
        {!company && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-zinc-400 border border-dashed border-zinc-300 bg-zinc-50">
            <Building2 size={48} strokeWidth={1} className="text-zinc-300" />
            <p className="text-xs font-mono uppercase tracking-widest">No company configured</p>
            <button
              onClick={openCompanyModal}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2 transition"
            >
              INITIALIZE COMPANY
            </button>
          </div>
        )}

        {company && (
          <>
            {/* Stat cards — Village style */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Company Name</span>
                <span className="text-base font-bold font-mono text-zinc-800 mt-1 truncate">{company.company_name}</span>
              </div>
              <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">GST Number</span>
                <span className="text-base font-bold font-mono text-zinc-800 mt-1">{company.gst_number || '—'}</span>
              </div>
              <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Active Financial Year</span>
                <span className="text-base font-bold font-mono text-blue-600 mt-1">
                  {activeYear?.year_label || '—'}
                </span>
              </div>
              <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Currency</span>
                <span className="text-base font-bold font-mono text-zinc-800 mt-1">{company.currency || 'INR'}</span>
              </div>
            </div>

            {/* Company Details + Financial Years — two column */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* Left: Company Details Card */}
              <div className="lg:col-span-7 border border-zinc-300 bg-zinc-50 flex flex-col">
                <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-blue-600" />
                    <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Company Profile</span>
                  </div>
                  <button onClick={openCompanyModal} className="p-1 text-zinc-400 hover:text-blue-600 transition" title="Edit">
                    <Edit3 size={14} />
                  </button>
                </div>

                <div className="p-5 bg-white flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field icon={<Building2 size={16} />} label="Company Name" value={company.company_name} />
                    <Field icon={<Shield size={16} />} label="GST Number" value={company.gst_number || '—'} />
                    <Field icon={<MapPin size={16} />} label="Address" value={company.address || '—'} />
                    <Field icon={<Phone size={16} />} label="Phone" value={company.phone || '—'} />
                    <Field icon={<Mail size={16} />} label="Email" value={company.email || '—'} />
                    <Field icon={<CreditCard size={16} />} label="Bank Account No." value={company.company_account_no || '—'} />
                    <Field icon={<Globe size={16} />} label="Currency" value={company.currency} />
                    <Field
                      icon={<Calendar size={16} />}
                      label="Financial Year"
                      value={
                        company.financial_year_start && company.financial_year_end
                          ? `${new Date(company.financial_year_start).toLocaleDateString('en-GB')} – ${new Date(company.financial_year_end).toLocaleDateString('en-GB')}`
                          : '—'
                      }
                    />
                  </div>

                  {/* System status */}
                  <div className="mt-5 pt-4 border-t border-zinc-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Database size={12} />
                      <span className="text-[10px] font-mono uppercase">Company ID: #{company.id}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-mono uppercase font-bold">Active</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Financial Years */}
              <div className="lg:col-span-5 border border-zinc-300 bg-zinc-50 flex flex-col">
                <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-blue-600" />
                    <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Financial Years</span>
                    <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5">
                      {financialYears.length} RECORDS
                    </span>
                  </div>
                  <button
                    onClick={openNewYearModal}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 transition"
                  >
                    <Plus size={12} /> ADD
                  </button>
                </div>

                <div className="flex-1 bg-white overflow-y-auto">
                  {yearsLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader size={20} className="animate-spin text-blue-500" />
                    </div>
                  ) : financialYears.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-zinc-400">
                      <Calendar size={32} strokeWidth={1} className="text-zinc-300" />
                      <p className="text-xs font-mono">NO FINANCIAL YEARS FOUND</p>
                      <button onClick={openNewYearModal} className="text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-bold mt-1 transition">
                        ADD FIRST YEAR
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs font-mono">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[10px]">
                          <th className="px-4 py-2 border-r border-zinc-200">Label</th>
                          <th className="px-4 py-2 border-r border-zinc-200">Period</th>
                          <th className="px-4 py-2 border-r border-zinc-200 text-center">Status</th>
                          <th className="px-4 py-2 text-center">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {financialYears.map(fy => (
                          <tr key={fy.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-4 py-3 font-bold text-zinc-800 border-r border-zinc-100">{fy.year_label}</td>
                            <td className="px-4 py-3 text-zinc-500 border-r border-zinc-100 text-[10px]">
                              {fy.start_date ? new Date(fy.start_date).toLocaleDateString('en-GB') : '—'}
                              {' – '}
                              {fy.end_date ? new Date(fy.end_date).toLocaleDateString('en-GB') : '—'}
                            </td>
                            <td className="px-4 py-3 border-r border-zinc-100 text-center">
                              {fy.is_active ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-bold uppercase">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                                </span>
                              ) : (
                                <span className="text-zinc-400 text-[10px] uppercase">Inactive</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => openEditYearModal(fy)}
                                className="p-1 text-zinc-400 hover:text-blue-600 transition"
                                title="Edit Year"
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
          </>
        )}
      </div>

      {/* ── Company Edit Modal ── */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCompanyModal(false)} />
          <div className="relative w-full max-w-2xl bg-white border border-zinc-400 shadow-2xl rounded-none overflow-hidden flex flex-col max-h-[90vh]">

            <div className="bg-zinc-100 px-5 py-3.5 border-b border-zinc-300 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white border border-zinc-200 text-blue-600">
                  <Building2 size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-tight">
                    {company ? 'Edit Company Settings' : 'Initialize Company'}
                  </h2>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5 tracking-wider">
                    Configure organization profile
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCompanyModal(false)} className="p-1 text-zinc-400 hover:text-red-600 transition">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {formErrors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-800 text-xs flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <ul className="list-disc list-inside space-y-1">
                    {formErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              <form id="company-modal-form" onSubmit={handleCompanySubmit} className="space-y-4">

                <SectionLabel>Basic Information</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ModalField label="Company Name" required>
                    <input type="text" value={companyForm.company_name || ''} 
                      onChange={e => setCompanyForm(p => ({ ...p, company_name: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, gstRef)}
                      placeholder="Enter company name" className={inputCls} autoFocus />
                  </ModalField>
                  <ModalField label="GST Number">
                    <input ref={gstRef} type="text" value={companyForm.gst_number || ''} 
                      onChange={e => setCompanyForm(p => ({ ...p, gst_number: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, bankRef)}
                      placeholder="GSTIN..." className={inputCls + ' uppercase'} />
                  </ModalField>
                  <ModalField label="Bank Account Number">
                    <input ref={bankRef} type="text" value={companyForm.company_account_no || ''} 
                      onChange={e => setCompanyForm(p => ({ ...p, company_account_no: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, currencyRef)}
                      placeholder="Bank account no." className={inputCls} />
                  </ModalField>
                  <ModalField label="Currency">
                    <select ref={currencyRef} value={companyForm.currency || 'INR'} 
                      onChange={e => setCompanyForm(p => ({ ...p, currency: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, addressRef)}
                      className={inputCls}>
                      {currencyOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </ModalField>
                </div>

                <SectionLabel>Contact Details</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ModalField label="Address" className="md:col-span-2">
                    <textarea ref={addressRef} value={companyForm.address || ''} 
                      onChange={e => setCompanyForm(p => ({ ...p, address: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, emailRef)}
                      placeholder="Company address" rows={2} className={inputCls + ' resize-none'} />
                  </ModalField>
                  <ModalField label="Email">
                    <input ref={emailRef} type="email" value={companyForm.email || ''} 
                      onChange={e => setCompanyForm(p => ({ ...p, email: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, phoneRef)}
                      placeholder="Contact email" className={inputCls} />
                  </ModalField>
                  <ModalField label="Phone">
                    <input ref={phoneRef} type="tel" value={companyForm.phone || ''} 
                      onChange={e => setCompanyForm(p => ({ ...p, phone: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, fyStartRef)}
                      placeholder="Phone number" className={inputCls} />
                  </ModalField>
                </div>

                <SectionLabel>Financial Year Details</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
                  <ModalField label="Financial Year Start" required>
                    <input ref={fyStartRef} type="date" value={companyForm.financial_year_start || ''} 
                      onChange={e => setCompanyForm(p => ({ ...p, financial_year_start: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, fyEndRef)}
                      className={inputCls} />
                  </ModalField>
                  <ModalField label="Financial Year End" required>
                    <input ref={fyEndRef} type="date" value={companyForm.financial_year_end || ''} 
                      onChange={e => setCompanyForm(p => ({ ...p, financial_year_end: e.target.value }))}
                      onKeyDown={e => handleKeyDown(e, null, handleCompanySubmit)}
                      className={inputCls} />
                  </ModalField>
                </div>

                <div className="pt-4 border-t border-zinc-200 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowCompanyModal(false)}
                    className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition rounded-none uppercase text-xs">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold transition rounded-none uppercase text-xs flex items-center gap-2 disabled:opacity-50">
                    {saving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />}
                    {company ? 'Save Changes' : 'Create Company'}
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
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowYearModal(false)} />
          <div className="relative w-full max-w-md bg-white border border-zinc-400 shadow-2xl rounded-none overflow-hidden flex flex-col">

            <div className="bg-zinc-100 px-5 py-3.5 border-b border-zinc-300 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white border border-zinc-200 text-blue-600">
                  <Calendar size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-tight">
                    {editingYear ? 'Edit Financial Year' : 'Add Financial Year'}
                  </h2>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5 tracking-wider">Fiscal period configuration</p>
                </div>
              </div>
              <button onClick={() => setShowYearModal(false)} className="p-1 text-zinc-400 hover:text-red-600 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleYearSubmit} className="p-5 space-y-4">
              <ModalField label="Year Label" required>
                <input type="text" value={yearForm.label} onChange={e => setYearForm(p => ({ ...p, label: e.target.value }))}
                  onKeyDown={e => handleKeyDown(e, yearStartRef)}
                  placeholder="e.g. FY 2026-27" className={inputCls} autoFocus />
              </ModalField>
              <div className="grid grid-cols-2 gap-4">
                <ModalField label="Start Date" required>
                  <input ref={yearStartRef} type="date" value={yearForm.start} 
                    onChange={e => setYearForm(p => ({ ...p, start: e.target.value }))}
                    onKeyDown={e => handleKeyDown(e, yearEndRef)}
                    className={inputCls} />
                </ModalField>
                <ModalField label="End Date" required>
                  <input ref={yearEndRef} type="date" value={yearForm.end} 
                    onChange={e => setYearForm(p => ({ ...p, end: e.target.value }))}
                    onKeyDown={e => handleKeyDown(e, null, handleYearSubmit)}
                    className={inputCls} />
                </ModalField>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-zinc-200">
                <button type="button" onClick={() => setShowYearModal(false)}
                  className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition rounded-none uppercase text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={yearSaving}
                  className="px-5 py-2 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold transition rounded-none uppercase text-xs flex items-center gap-2 disabled:opacity-50">
                  {yearSaving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />}
                  {editingYear ? 'Update Year' : 'Add Year'}
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

const inputCls = 'w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-mono text-zinc-700 font-bold text-xs'

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{children}</span>
      <div className="flex-1 h-px bg-zinc-200" />
    </div>
  )
}

function ModalField({ label, children, required, className }) {
  return (
    <div className={`space-y-1 ${className || ''}`}>
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function Field({ icon, label, value }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-400 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-zinc-700 font-mono mt-0.5">{value}</p>
      </div>
    </div>
  )
}

export default CompanySetup
