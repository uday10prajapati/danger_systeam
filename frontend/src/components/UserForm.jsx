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
    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-8">
      <h2 className="text-3xl font-black text-slate-900 mb-8 uppercase tracking-tighter italic border-b-4 border-black pb-2 inline-block">
        {userId ? t('userMaster.editUser') : t('userMaster.createUser')}
      </h2>

      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 shadow-sm border-l-4 ${
          message.type === 'error' 
            ? 'bg-white border-red-600 text-red-900' 
            : 'bg-white border-slate-900 text-slate-900'
        }`}>
          {message.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : (
            <CheckCircle className="w-5 h-5 text-slate-900" />
          )}
          <p className="font-bold uppercase text-xs tracking-widest leading-none">
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
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
            {t('userMaster.username')} *
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder={t('userMaster.enterUsername')}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all font-bold ${
              errors.username
                ? 'border-red-500 bg-red-50'
                : 'border-slate-100 bg-slate-50 focus:border-black focus:bg-white'
            }`}
            disabled={loading}
          />
          {errors.username && (
            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-red-600">{errors.username}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
            {t('userMaster.email')} *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder={t('userMaster.enterEmail')}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all font-bold ${
              errors.email
                ? 'border-red-500 bg-red-50'
                : 'border-slate-100 bg-slate-50 focus:border-black focus:bg-white'
            }`}
            disabled={loading}
          />
          {errors.email && (
            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
            {t('userMaster.password')} {!userId && '*'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={userId ? t('userMaster.leaveBlankToKeepCurrent') : t('userMaster.enterPassword')}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all font-bold pr-12 ${
                errors.password
                  ? 'border-red-500 bg-red-50'
                  : 'border-slate-100 bg-slate-50 focus:border-black focus:bg-white'
              }`}
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3.5 text-slate-400 hover:text-black transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-red-600">{errors.password}</p>
          )}
          {userId && (
            <p className="mt-2 text-[10px] font-bold text-slate-400 italic uppercase">{t('userMaster.leaveBlankToKeepCurrent')}</p>
          )}
        </div>

        {/* Role */}
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
            {t('userMaster.role')} *
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.5em_1.5em] ${
              errors.role
                ? 'border-red-500 bg-red-50'
                : 'border-slate-100 bg-slate-50 focus:border-black focus:bg-white'
            }`}
            disabled={loading}
          >
            <option value="cashier">{t('userMaster.cashier')}</option>
            <option value="manager">{t('userMaster.manager')}</option>
            <option value="hod">{t('userMaster.hod')}</option>
          </select>
          {errors.role && (
            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-red-600">{errors.role}</p>
          )}
          <p className="mt-2 text-[10px] font-bold text-slate-400 italic uppercase">
            {formData.role === 'hod' && t('userMaster.hodCanManageUsers')}
            {formData.role === 'manager' && t('userMaster.managerCanViewReports')}
            {formData.role === 'cashier' && t('userMaster.cashierCanProcessSales')}
          </p>
        </div>

        {/* Module Access */}
        <div className="space-y-4">
          <div className="flex justify-between items-end border-b-2 border-slate-100 pb-2">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-900">
              {t('userMaster.moduleAccess')} - {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}
            </label>
            <p className="text-[10px] font-bold text-slate-400 uppercase italic leading-none">{t('userMaster.selectModulesForRole')}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modules.map((module) => {
              const currentAccess = Array.isArray(formData.module_access) ? formData.module_access : Object.keys(formData.module_access || {}).filter(k => formData.module_access[k])
              const isChecked = currentAccess.includes(module.id)
              
              return (
                <div
                  key={module.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer group ${
                    isChecked
                      ? 'bg-slate-900 border-slate-900 shadow-lg'
                      : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'
                  }`}
                  onClick={() => handleModuleToggle(module.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-lg filter grayscale">{module.icon}</span>
                      <span className={`text-xs font-black uppercase tracking-wider transition-colors ${
                        isChecked ? 'text-white' : 'text-slate-700 group-hover:text-black'
                      }`}>
                        {t(`modules.${module.label}`)}
                      </span>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isChecked ? 'bg-white border-white' : 'bg-slate-50 border-slate-200'
                  }`}>
                    {isChecked && <div className="w-2.5 h-2.5 bg-black rounded-[2px]" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Active Status */}
        <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
          <input
            type="checkbox"
            id="is_active"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="w-5 h-5 rounded border-slate-300 text-black focus:ring-black cursor-pointer"
            disabled={loading}
          />
          <label htmlFor="is_active" className="text-xs font-black uppercase tracking-widest text-slate-900 cursor-pointer">
            {t('userMaster.userActive')}
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-6 border-t-2 border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-8 py-4 bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
          >
            {loading && <Loader className="w-5 h-5 animate-spin" />}
            {userId ? t('userMaster.updateUser') : t('userMaster.createUser')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-8 py-4 bg-white border-2 border-slate-100 hover:border-slate-300 text-slate-500 hover:text-black font-black uppercase tracking-widest rounded-xl transition-all"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default UserForm
