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
    is_active: true,
    module_access: {} // Store module access permissions
  })

  // Available modules for role-based access
  const modules = [
    { id: 'company', label: 'company', icon: '🏢' },
    { id: 'users', label: 'userMaster', icon: '👥' },
    { id: 'accounts', label: 'accountMaster', icon: '💳' },
    { id: 'members', label: 'memberMaster', icon: '👤' },
    { id: 'items', label: 'itemMaster', icon: '📦' },
    { id: 'rates', label: 'itemRate', icon: '💰' },
    { id: 'sales', label: 'sale', icon: '🛒' },
    { id: 'sales-return', label: 'saleReturn', icon: '↩️' },
    { id: 'purchase', label: 'purchase', icon: '📥' },
    { id: 'purchase-return', label: 'purchaseReturn', icon: '↩️' },
    { id: 'barcode', label: 'barcodeScanner', icon: '📱' },
    { id: 'cashbook', label: 'cashBook', icon: '📖' },
    { id: 'ledger', label: 'accountLedger', icon: '📋' },
    { id: 'profit-loss', label: 'profitAndLoss', icon: '📊' },
    { id: 'stock', label: 'stockReport', icon: '📈' },
  ]

  // Default module access for each role
  const defaultModuleAccess = {
    cashier: ['sales', 'sales-return', 'cashbook', 'ledger', 'barcode'],
    manager: ['company', 'members', 'items', 'rates', 'sales', 'sales-return', 'purchase', 'purchase-return', 'cashbook', 'ledger', 'profit-loss', 'stock'],
    hod: ['company', 'users', 'accounts', 'members', 'items', 'rates', 'sales', 'sales-return', 'purchase', 'purchase-return', 'barcode', 'cashbook', 'ledger', 'profit-loss', 'stock']
  }

  // Load user data if editing
  useEffect(() => {
    if (userId) {
      loadUser()
    } else {
      // Set default module access for new user
      setFormData(prev => ({
        ...prev,
        module_access: defaultModuleAccess[prev.role]
      }))
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
          is_active: user.is_active,
          module_access: user.module_access || defaultModuleAccess[user.role] || []
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
    
    // When role changes, update module access to default
    if (name === 'role') {
      setFormData(prev => ({
        ...prev,
        role: value,
        module_access: defaultModuleAccess[value]
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }))
    }
  }

  // Handle module checkbox toggle
  const handleModuleToggle = (moduleId) => {
    setFormData(prev => {
      const currentAccess = Array.isArray(prev.module_access) ? prev.module_access : Object.keys(prev.module_access || {}).filter(k => prev.module_access[k])
      const isChecked = currentAccess.includes(moduleId)
      
      if (isChecked) {
        return {
          ...prev,
          module_access: currentAccess.filter(id => id !== moduleId)
        }
      } else {
        return {
          ...prev,
          module_access: [...currentAccess, moduleId]
        }
      }
    })
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
            <option value="hod">{t('userMaster.hod')}</option>
          </select>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role}</p>
          )}
          <p className="mt-1 text-xs text-slate-600">
            {formData.role === 'hod' && t('userMaster.hodCanManageUsers')}
            {formData.role === 'manager' && t('userMaster.managerCanViewReports')}
            {formData.role === 'cashier' && t('userMaster.cashierCanProcessSales')}
          </p>
        </div>

        {/* Module Access */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-4">
            {t('userMaster.moduleAccess')} - {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
          </label>
          <p className="text-xs text-slate-600 mb-4">{t('userMaster.selectModulesForRole')}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => {
              const currentAccess = Array.isArray(formData.module_access) ? formData.module_access : Object.keys(formData.module_access || {}).filter(k => formData.module_access[k])
              const isChecked = currentAccess.includes(module.id)
              
              return (
                <div
                  key={module.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-blue-50 border-blue-500 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => handleModuleToggle(module.id)}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleModuleToggle(module.id)}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    disabled={loading}
                  />
                  <div className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{module.icon}</span>
                      <span className="text-sm font-semibold text-slate-700">{t(`modules.${module.label}`)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
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
