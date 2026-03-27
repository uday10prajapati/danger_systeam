import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Building2, Phone, Mail, MapPin, Calendar, ShoppingCart } from 'lucide-react'
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
      
      // Format dates for input type="date" (YYYY-MM-DD format)
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
      // Company not yet created
      console.log(t('company.companyNotFound'))
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear errors when user starts typing
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

      console.log('Submitting company data:', formData)

      if (company && isEditing) {
        // Update company
        console.log('Updating company with ID:', company.id)
        response = await axios.put(`${API_URL}/company/${company.id}`, formData)
      } else {
        // Create company
        console.log('Creating new company')
        response = await axios.post(`${API_URL}/company`, formData)
      }

      console.log('API Response:', response.data)

      if (response.data.success) {
        setSuccess(true)
        setCompany(response.data.data)
        setIsEditing(false)
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000)
        
        // Refetch company to get updated data from database
        setTimeout(fetchCompany, 1000)
      } else {
        setErrors([response.data.error || 'Failed to save company'])
      }
    } catch (error) {
      console.error('Company submission error:', error)
      
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      } else if (error.response?.data?.error) {
        setErrors([error.response.data.error])
      } else if (error.message) {
        setErrors([`Error: ${error.message}`])
      } else {
        setErrors([t('company.failedToSaveCompany')])
      }
    } finally {
      setLoading(false)
    }
  }

  const currencyOptions = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD']

  return (
    <div className="min-h-screen bg-linear-to-br from-white via-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">{t('company.companySetup')}</h1>
          </div>
          <p className="text-slate-600">
            {company && !isEditing 
              ? t('company.companyConfigured')
              : t('company.setupCompanyDetails')}
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">{t('company.success')}</p>
              <p className="text-sm text-green-700">{company ? t('company.companyUpdatedSuccessfully') : t('company.companyCreatedSuccessfully')}</p>
            </div>
          </div>
        )}

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900 mb-2">{t('company.pleaseFixErrors')}</p>
                <ul className="text-sm text-red-700 space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Company Status Card */}
        {company && !isEditing && (
          <div className="mb-6 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {t('company.currentCompanyInformation')}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-600 font-medium">{t('company.companyName')}</p>
                <p className="text-slate-900 mt-1">{company.company_name}</p>
              </div>
              <div>
                <p className="text-slate-600 font-medium">{t('company.email')}</p>
                <p className="text-slate-900 mt-1">{company.email}</p>
              </div>
              <div>
                <p className="text-slate-600 font-medium">{t('company.phone')}</p>
                <p className="text-slate-900 mt-1">{company.phone}</p>
              </div>
              <div>
                <p className="text-slate-600 font-medium">{t('company.gstNumber')}</p>
                <p className="text-slate-900 mt-1">{company.gst_number || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-slate-600 font-medium">{t('company.currency')}</p>
                <p className="text-slate-900 mt-1">{company.currency}</p>
              </div>
              <div>
                <p className="text-slate-600 font-medium">{t('company.financialYearStart')}</p>
                <p className="text-slate-900 mt-1">
                  {new Date(company.financial_year_start).toLocaleDateString()} - {new Date(company.financial_year_end).toLocaleDateString()}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {t('company.editCompanyInformation')}
            </button>

            <button
              onClick={() => navigate('/items')}
              className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Go to Item Master
            </button>
          </div>
        )}

        {/* Form */}
        {(!company || isEditing) && (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6">
              {company && isEditing ? t('company.updateCompany') : t('company.createCompany')}
            </h2>

            {/* Company Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('company.companyNameRequired')}
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder={t('company.enterCompanyLegalName')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-1">{t('company.thisWillBeUnique')}</p>
            </div>

            {/* Address */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('company.addressRequired')}
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder={t('company.enterFullBusinessAddress')}
                rows="3"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={loading}
              />
            </div>

            {/* Phone and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  {t('company.phoneRequired')}
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={t('company.10to15Digits')}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  {t('company.emailRequired')}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('company.companyEmail')}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>

            {/* GST Number */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('company.gstNumber')}
              </label>
              <input
                type="text"
                name="gst_number"
                value={formData.gst_number}
                onChange={handleChange}
                placeholder={t('company.15CharacterGST')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-1">{t('company.exampleGST')}</p>
            </div>

            {/* Financial Year */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {t('company.financialYearStart')}
                </label>
                <input
                  type="date"
                  name="financial_year_start"
                  value={formData.financial_year_start}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <p className="text-xs text-slate-500 mt-1">{t('company.usuallyApril1st')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {t('company.financialYearEnd')}
                </label>
                <input
                  type="date"
                  name="financial_year_end"
                  value={formData.financial_year_end}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <p className="text-xs text-slate-500 mt-1">{t('company.usuallyMarch31st')}</p>
              </div>
            </div>

            {/* Currency */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('company.currency')}
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                {currencyOptions.map(curr => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 rounded-lg font-medium transition-colors ${
                loading
                  ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {loading ? t('company.saving') : company && isEditing ? t('company.updateCompany') : t('company.createCompany')}
            </button>

            {company && isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setFormData(company)
                }}
                className="w-full mt-2 py-2 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {t('company.cancel')}
              </button>
            )}
          </form>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">💡 {t('company.tip')}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default CompanySetup
