import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { AlertCircle, CheckCircle, Loader, Eye, EyeOff } from 'lucide-react'

const UserForm = ({ userId = null, onSuccess, onCancel, company_id }) => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState(null)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    company_id: company_id || null,
    username: '',
    email: '',
    password: '',
    role: 'cashier',
    is_active: true
  })

  // Load user data if editing
  useEffect(() => {
    if (userId) {
      loadUser()
    }
  }, [userId])

  const loadUser = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/users/${userId}`)
      if (response.data.success) {
        const user = response.data.data
        setFormData({
          company_id: user.company_id,
          username: user.username,
          email: user.email,
          password: '',
          role: user.role,
          is_active: user.is_active
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || t('userMaster.failedToLoadUser')
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setErrors({})

    try {
      setLoading(true)

      const endpoint = userId ? `/api/users/${userId}` : '/api/users'
      const method = userId ? 'put' : 'post'
      
      // Don't send empty password for updates
      const submitData = { ...formData }
      if (userId && !submitData.password) {
        delete submitData.password
      }

      const response = await axios({
        method,
        url: endpoint,
        data: submitData
      })

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: userId ? t('userMaster.userUpdatedSuccessfully') : t('userMaster.userCreatedSuccessfully')
        })
        setTimeout(() => {
          onSuccess?.()
        }, 1500)
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      } else {
        setMessage({
          type: 'error',
          text: error.response?.data?.error || t('userMaster.failedToSaveUser')
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">
        {userId ? t('userMaster.editUser') : t('userMaster.createUser')}
      </h2>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'error' 
            ? 'bg-red-50 border border-red-200' 
            : 'bg-green-50 border border-green-200'
        }`}>
          {message.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
          <p className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info (Read-only if editing) */}
        {userId ? (
          <div className="bg-slate-50 p-4 rounded border border-slate-200">
            <p className="text-sm text-slate-600">{t('userMaster.company')}</p>
            <p className="text-lg font-semibold text-slate-900">{company_id}</p>
          </div>
        ) : null}

        {/* Username */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {t('userMaster.username')} *
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder={t('userMaster.enterUsername')}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.username
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
            }`}
            disabled={loading}
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">{errors.username}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {t('userMaster.email')} *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={t('userMaster.enterEmail')}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.email
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
            }`}
            disabled={loading}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {t('userMaster.password')} {!userId && '*'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={userId ? t('userMaster.leaveBlankToKeepCurrent') : t('userMaster.enterPassword')}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 pr-10 ${
                errors.password
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-300 focus:ring-blue-500'
              }`}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-600 hover:text-slate-900"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
          {userId && (
            <p className="mt-1 text-xs text-slate-600">{t('userMaster.leaveBlankToKeepCurrent')}</p>
          )}
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {t('userMaster.role')} *
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.role
                ? 'border-red-500 focus:ring-red-500'
                : 'border-slate-300 focus:ring-blue-500'
            }`}
            disabled={loading}
          >
            <option value="cashier">{t('userMaster.cashier')}</option>
            <option value="manager">{t('userMaster.manager')}</option>
            <option value="admin">{t('userMaster.admin')}</option>
          </select>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role}</p>
          )}
          <p className="mt-1 text-xs text-slate-600">
            {formData.role === 'admin' && t('userMaster.adminCanManageUsers')}
            {formData.role === 'manager' && t('userMaster.managerCanViewReports')}
            {formData.role === 'cashier' && t('userMaster.cashierCanProcessSales')}
          </p>
        </div>

        {/* Active Status */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_active"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <label htmlFor="is_active" className="text-sm font-semibold text-slate-700">
            {t('userMaster.userActive')}
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-6 border-t border-slate-200">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader className="w-5 h-5 animate-spin" />}
            {userId ? t('userMaster.updateUser') : t('userMaster.createUser')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-6 py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-900 font-semibold rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default UserForm
