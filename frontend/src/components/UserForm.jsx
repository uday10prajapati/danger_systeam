import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import {
  AlertCircle, CheckCircle, Loader,
  Eye, EyeOff, Save, X, User,
  Mail, Lock, ShieldCheck, Settings,
  Building2, Layout, Database, ShoppingCart,
  Package, BarChart3, TrendingUp, RefreshCcw,
  QrCode, BookOpen, FileText, PieChart, Activity
} from 'lucide-react'

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
    module_access: []
  })

  const toApiRole = (role) => (role === 'hod' ? 'admin' : role)
  const fromApiRole = (role) => (role === 'admin' ? 'hod' : role)

  const modules = [
    { id: 'company', label: 'company', icon: <Building2 size={16} />, color: 'blue' },
    { id: 'users', label: 'userMaster', icon: <User size={16} />, color: 'indigo' },
    { id: 'accounts', label: 'accountMaster', icon: <Database size={16} />, color: 'emerald' },
    { id: 'members', label: 'memberMaster', icon: <ShieldCheck size={16} />, color: 'violet' },
    { id: 'items', label: 'itemMaster', icon: <Package size={16} />, color: 'amber' },
    { id: 'rates', label: 'itemRate', icon: <BarChart3 size={16} />, color: 'orange' },
    { id: 'sales', label: 'sale', icon: <ShoppingCart size={16} />, color: 'pink' },
    { id: 'sales-return', label: 'saleReturn', icon: <RefreshCcw size={16} />, color: 'rose' },
    { id: 'purchase', label: 'purchase', icon: <TrendingUp size={16} />, color: 'cyan' },
    { id: 'purchase-return', label: 'purchaseReturn', icon: <RefreshCcw size={16} />, color: 'teal' },
    { id: 'barcode', label: 'barcodeScanner', icon: <QrCode size={16} />, color: 'slate' },
    { id: 'cashbook', label: 'cashBook', icon: <BookOpen size={16} />, color: 'sky' },
    { id: 'ledger', label: 'accountLedger', icon: <FileText size={16} />, color: 'blue' },
    { id: 'profit-loss', label: 'profitAndLoss', icon: <PieChart size={16} />, color: 'emerald' },
    { id: 'stock', label: 'stockReport', icon: <Activity size={16} />, color: 'amber' },
  ]

  const defaultModuleAccess = {
    cashier: ['sales', 'sales-return', 'cashbook', 'ledger', 'barcode'],
    manager: ['company', 'members', 'items', 'rates', 'sales', 'sales-return', 'purchase', 'purchase-return', 'cashbook', 'ledger', 'profit-loss', 'stock'],
    hod: ['company', 'users', 'accounts', 'members', 'items', 'rates', 'sales', 'sales-return', 'purchase', 'purchase-return', 'barcode', 'cashbook', 'ledger', 'profit-loss', 'stock']
  }

  useEffect(() => {
    if (userId) {
      loadUser()
    } else {
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
          role: fromApiRole(user.role),
          is_active: user.is_active,
          module_access: Array.isArray(user.module_access) ? user.module_access : []
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
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
  }

  const handleModuleToggle = (moduleId) => {
    setFormData(prev => {
      const isChecked = prev.module_access.includes(moduleId)
      return {
        ...prev,
        module_access: isChecked
          ? prev.module_access.filter(id => id !== moduleId)
          : [...prev.module_access, moduleId]
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
      const submitData = { ...formData }
      submitData.role = toApiRole(submitData.role)

      let resolvedCompanyId = Number(submitData.company_id || company_id)
      if (!Number.isInteger(resolvedCompanyId) || resolvedCompanyId <= 0) {
        try {
          const companyRes = await axios.get('/api/company')
          resolvedCompanyId = Number(companyRes?.data?.data?.id)
        } catch (companyErr) {
          resolvedCompanyId = NaN
        }
      }

      if (!Number.isInteger(resolvedCompanyId) || resolvedCompanyId <= 0) {
        setMessage({ type: 'error', text: 'Company setup is required before creating a user.' })
        setLoading(false)
        return
      }

      submitData.company_id = resolvedCompanyId

      if (userId && !submitData.password) delete submitData.password

      const response = await axios({ method, url: endpoint, data: submitData })
      if (response.data.success) {
        setMessage({ type: 'success', text: userId ? t('userMaster.userUpdatedSuccessfully') : t('userMaster.userCreatedSuccessfully') })
        setTimeout(() => onSuccess?.(), 1500)
      }
    } catch (error) {
      if (error.response?.data?.errors) setErrors(error.response.data.errors)
      else setMessage({ type: 'error', text: error.response?.data?.error || t('userMaster.failedToSaveUser') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-100 shadow-xl p-10 animate-in slide-in-from-bottom duration-500 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>

      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-8">
          {userId ? t('userMaster.editUser', 'Refine User Identity') : t('userMaster.createUser', 'Initialize New Identity')}
        </h2>

        {message && (
          <div className={`mb-8 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top duration-300 ${message.type === 'error' ? 'bg-rose-50 border border-rose-100 text-rose-700' : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
            }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <p className="text-sm font-bold">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">

          {/* Section 1: Identity Info */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-6 h-0.5 bg-blue-600"></div> Profile Context
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">{t('userMaster.username', 'Public Name')} *</label>
                <div className="relative group">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="e.g. alex_stone"
                    className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border ${errors.username ? 'border-rose-400' : 'border-slate-200'} focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm`}
                  />
                </div>
                {errors.username && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.username}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">{t('userMaster.email', 'Digital Handle')} *</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="alex@organization.com"
                    className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border ${errors.email ? 'border-rose-400' : 'border-slate-200'} focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm`}
                  />
                </div>
                {errors.email && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">{t('userMaster.password', 'Secure Access')} {!userId && '*'}</label>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={userId ? t('userMaster.leaveBlankToKeepCurrent', 'Keep current key') : '********'}
                    className={`w-full pl-12 pr-12 py-3.5 bg-slate-50 border ${errors.password ? 'border-rose-400' : 'border-slate-200'} focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="text-[10px] text-rose-500 font-bold ml-1">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">{t('userMaster.role', 'Access Tier')} *</label>
                <div className="relative group">
                  <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm appearance-none cursor-pointer"
                  >
                    <option value="cashier">{t('userMaster.cashier', 'Cashier (Standard)')}</option>
                    <option value="manager">{t('userMaster.manager', 'Manager (Analytic)')}</option>
                    <option value="hod">{t('userMaster.hod', 'Admin (HOD)')}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Module Access Grid */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-emerald-500"></div> System Privileges
              </div>
              <span className="italic normal-case text-[10px] font-medium opacity-60">Tuned for {formData.role} role</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {modules.map((module) => {
                const isSelected = formData.module_access.includes(module.id)
                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => handleModuleToggle(module.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${isSelected
                      ? `bg-${module.color}-50 border-${module.color}-200 shadow-sm ring-1 ring-${module.color}-100`
                      : 'bg-white border-slate-100 hover:border-slate-300'
                      }`}
                  >
                    <div className={`p-2 rounded-lg border ${isSelected ? `bg-white text-${module.color}-600 border-${module.color}-100` : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                      {module.icon}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-tight ${isSelected ? 'text-slate-800' : 'text-slate-400'}`}>
                      {t(`modules.${module.label}`)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="is_active" className="text-xs font-bold text-slate-600 cursor-pointer">
              {t('userMaster.userActive', 'Identity is currently operational and authorized for system entry')}
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-300"
            >
              {loading ? <Loader className="animate-spin" size={20} /> : <><Save size={20} /> {userId ? 'Commit Changes' : 'Initialize Identity'}</>}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-8 py-4 bg-white border border-slate-200 text-slate-500 font-bold rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-all"
            >
              {t('common.cancel', 'Abort')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserForm
