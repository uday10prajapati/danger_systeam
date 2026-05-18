import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api'
import {
  AlertCircle, CheckCircle, Loader,
  Eye, EyeOff, Save, X, User,
  Mail, Lock, ShieldCheck,
  Building2, Database, ShoppingCart,
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
    full_name_gu: '',
    email: '',
    password: '',
    role: 'cashier',
    is_active: true,
    module_access: []
  })

  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const roleRef = useRef(null)

  const handleKeyDown = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (nextRef && nextRef.current) {
        nextRef.current.focus()
      } else {
        handleSubmit(e)
      }
    }
  }

  const toApiRole = (role) => (role === 'hod' ? 'admin' : role)
  const fromApiRole = (role) => (role === 'admin' ? 'hod' : role)

  const modules = [
    { id: 'company', label: 'company', icon: <Building2 size={14} />, color: 'blue' },
    { id: 'users', label: 'userMaster', icon: <User size={14} />, color: 'indigo' },
    { id: 'accounts', label: 'accountMaster', icon: <Database size={14} />, color: 'emerald' },
    { id: 'members', label: 'memberMaster', icon: <ShieldCheck size={14} />, color: 'violet' },
    { id: 'items', label: 'itemMaster', icon: <Package size={14} />, color: 'amber' },
    { id: 'rates', label: 'itemRate', icon: <BarChart3 size={14} />, color: 'orange' },
    { id: 'sales', label: 'sale', icon: <ShoppingCart size={14} />, color: 'pink' },
    { id: 'sales-return', label: 'saleReturn', icon: <RefreshCcw size={14} />, color: 'rose' },
    { id: 'purchase', label: 'purchase', icon: <TrendingUp size={14} />, color: 'cyan' },
    { id: 'purchase-return', label: 'purchaseReturn', icon: <RefreshCcw size={14} />, color: 'teal' },
    { id: 'barcode', label: 'barcodeScanner', icon: <QrCode size={14} />, color: 'slate' },
    { id: 'cashbook', label: 'cashBook', icon: <BookOpen size={14} />, color: 'sky' },
    { id: 'ledger', label: 'accountLedger', icon: <FileText size={14} />, color: 'blue' },
    { id: 'profit-loss', label: 'profitAndLoss', icon: <PieChart size={14} />, color: 'emerald' },
    { id: 'stock', label: 'stockReport', icon: <Activity size={14} />, color: 'amber' },
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
      const response = await api.get(`/users/${userId}`)
      if (response.data.success) {
        const user = response.data.data
        setFormData({
          company_id: user.company_id,
          username: user.username,
          full_name_gu: user.full_name_gu || '',
          email: user.email,
          password: '',
          role: fromApiRole(user.role),
          is_active: !!user.is_active,
          module_access: (Array.isArray(user.module_access) && user.module_access.length > 0) 
            ? user.module_access 
            : (defaultModuleAccess[fromApiRole(user.role)] || [])
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
      const endpoint = userId ? `/users/${userId}` : '/users'
      const method = userId ? 'put' : 'post'
      const submitData = { ...formData }
      submitData.role = toApiRole(submitData.role)

      let resolvedCompanyId = Number(submitData.company_id || company_id)
      if (!Number.isInteger(resolvedCompanyId) || resolvedCompanyId <= 0) {
        try {
          const companyRes = await api.get('/company')
          resolvedCompanyId = Number(companyRes?.data?.data?.id)
        } catch (companyErr) {
          resolvedCompanyId = NaN
        }
      }

      if (!Number.isInteger(resolvedCompanyId) || resolvedCompanyId <= 0) {
        setMessage({ type: 'error', text: t('userMaster.companyReqBeforeUser') })
        setLoading(false)
        return
      }

      submitData.company_id = resolvedCompanyId

      if (userId && !submitData.password) delete submitData.password

      const response = await api({ method, url: endpoint, data: submitData })
      if (response.data.success) {
        setMessage({ type: 'success', text: userId ? t('userMaster.userUpdated') : t('userMaster.userCreated') })
        setTimeout(() => {
          onSuccess?.()
        }, 1500)
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
        setMessage({ type: 'error', text: t('userMaster.validationError') })
      } else {
        setMessage({ type: 'error', text: error.response?.data?.error || t('userMaster.failedToSaveUser') })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6 select-none font-sans">
      
      {message && (
        <div className={`p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2`}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <p className="font-bold">{message.text}</p>
        </div>
      )}

      {/* Identity Details */}
      <div className="space-y-4">
        <SectionLabel>{t('userMaster.identityProfile')}</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModalField label={t('userMaster.usernameLabel')} required error={errors.username}>
            <div className="relative">
              <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                onKeyDown={e => handleKeyDown(e, emailRef)}
                placeholder={t('userMaster.enterUsername')}
                className={inputCls + ' pl-9 force-en'}
                autoFocus
              />
            </div>
          </ModalField>

          <ModalField label={t('userMaster.fullNameGU') || 'વપરાશકર્તાનું નામ (ગુજરાતી)'}>
            <div className="relative">
              <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                name="full_name_gu"
                value={formData.full_name_gu}
                onChange={handleChange}
                onKeyDown={e => handleKeyDown(e, emailRef)}
                placeholder={t('userMaster.enterFullNameGU') || 'ગુજરાતીમાં નામ દાખલ કરો'}
                className={inputCls + ' pl-9 font-sans'}
              />
            </div>
          </ModalField>

          <ModalField label={t('userMaster.identityLabel')} required error={errors.email}>
            <div className="relative">
              <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                ref={emailRef}
                type="text"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onKeyDown={e => handleKeyDown(e, passwordRef)}
                placeholder={t('userMaster.identityPlaceholder')}
                className={inputCls + ' pl-9 force-en'}
              />
            </div>
          </ModalField>

          <ModalField label={userId ? t('userMaster.updatePassword') : t('userMaster.securePassword')} required={!userId} error={errors.password}>
            <div className="relative">
              <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onKeyDown={e => handleKeyDown(e, roleRef)}
                placeholder={userId ? t('userMaster.passwordPlaceholder') : '********'}
                className={inputCls + ' pl-9 pr-9 force-en'}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </ModalField>

          <ModalField label={t('userMaster.accessRole')} required>
            <div className="relative">
              <ShieldCheck size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <select
                ref={roleRef}
                name="role"
                value={formData.role}
                onChange={handleChange}
                onKeyDown={e => handleKeyDown(e, null)}
                className={inputCls + ' pl-9 cursor-pointer appearance-none'}
              >
                <option value="cashier">{t('userMaster.roleCashier')}</option>
                <option value="manager">{t('userMaster.roleManager')}</option>
                <option value="hod">{t('userMaster.roleAdmin')}</option>
              </select>
            </div>
          </ModalField>
        </div>
      </div>

      {/* Module Privileges */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionLabel>{t('userMaster.modulePrivileges')}</SectionLabel>
          <span className="text-[10px] font-bold text-zinc-400 italic">{t('userMaster.preset')}: {formData.role}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {modules.map((module) => {
            const isSelected = formData.module_access.includes(module.id)
            return (
              <button
                key={module.id}
                type="button"
                onClick={() => handleModuleToggle(module.id)}
                className={`flex items-center gap-2 p-2 border transition-all text-left ${
                  isSelected
                    ? `bg-blue-50 border-blue-200`
                    : 'bg-zinc-50 border-zinc-200 hover:border-zinc-400 opacity-60 grayscale'
                }`}
              >
                <div className={`p-1.5 border ${isSelected ? `bg-white text-blue-600 border-blue-100` : 'bg-white text-zinc-400 border-zinc-100'}`}>
                  {module.icon}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-tighter truncate ${isSelected ? 'text-zinc-800' : 'text-zinc-400'}`}>
                  {t(`modules.${module.label}`)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-zinc-50 border border-zinc-200">
        <input
          type="checkbox"
          id="is_active"
          name="is_active"
          checked={formData.is_active}
          onChange={handleChange}
          className="w-4 h-4 rounded-none border-zinc-300 text-blue-600 cursor-pointer"
        />
        <label htmlFor="is_active" className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest cursor-pointer">
          {t('userMaster.accountOperational')}
        </label>
      </div>

      <div className="flex gap-3 pt-4 border-t border-zinc-200 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition rounded-none uppercase text-xs"
        >
          {t('userMaster.abort')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold transition rounded-none uppercase flex items-center justify-center gap-2 text-xs disabled:opacity-50"
        >
          {loading ? <Loader className="animate-spin" size={14} /> : <Save size={14} />}
          {userId ? t('userMaster.commitChanges') : t('userMaster.initUser')}
        </button>
      </div>
    </form>
  )
}

const inputCls = 'w-full px-3 py-2 bg-white border border-zinc-300 rounded-none focus:border-zinc-600 outline-none transition font-prompt text-zinc-700 font-bold text-xs'

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-zinc-200" />
    </div>
  )
}

function ModalField({ label, children, required, error }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[9px] text-red-500 font-bold uppercase">{error}</p>}
    </div>
  )
}

export default UserForm
