import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import {
  Plus, Edit3, Trash2, Power,
  Loader, AlertCircle, CheckCircle,
  Users, UserCheck, UserMinus, Shield,
  Search, Filter, ChevronRight, X,
  Building2, Command, RefreshCw, Activity, ShieldCheck
} from 'lucide-react'
import UserForm from '../components/UserForm'
import Toast from '../components/Toast'
import Loading from '../components/Loading'

function UserMaster() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [company, setCompany] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const displayCompanyName = (comp) => {
    if (!comp) return ''
    return i18n.language === 'gu'
      ? (comp.company_name_gu || comp.company_name || '')
      : (comp.company_name || comp.company_name_gu || '')
  }

  const displayUserName = (user) => {
    if (!user) return ''
    return i18n.language === 'gu'
      ? (user.full_name_gu || user.username || '')
      : (user.username || user.full_name_gu || '')
  }

  const displayUserIdentity = (user) => {
    if (!user) return ''
    return i18n.language === 'gu'
      ? (user.username || user.email || '')
      : (user.email || user.username || '')
  }

  const displayRole = (role) => {
    if (role === 'admin' || role === 'hod') return t('userMaster.roleAdmin')
    if (role === 'manager') return t('userMaster.roleManager')
    return t('userMaster.roleCashier')
  }

  useEffect(() => {
    loadCompany()
  }, [])

  useEffect(() => {
    if (company?.id) {
      loadUsers()
    }
  }, [company])

  const loadCompany = async () => {
    try {
      const response = await api.get('/company')
      if (response.data.success && response.data.data) {
        setCompany(response.data.data)
      } else {
        setToast({ type: 'error', text: t('userMaster.noCompanyFound') })
      }
    } catch (error) {
      setToast({
        type: 'error',
        text: error.response?.data?.error || t('userMaster.failedToLoadCompany')
      })
    }
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/users/company/${company.id}`)
      if (response.data.success) {
        setUsers(response.data.data)
      }
    } catch (error) {
      setToast({
        type: 'error',
        text: error.response?.data?.error || t('userMaster.failedToLoadUsers')
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = () => {
    setEditingUserId(null)
    setShowModal(true)
  }

  const handleEditUser = (userId) => {
    setEditingUserId(userId)
    setShowModal(true)
  }

  const handleFormSuccess = () => {
    setShowModal(false)
    setEditingUserId(null)
    setToast({
      type: 'success',
      text: editingUserId ? t('userMaster.userUpdatedSuccessfully') : t('userMaster.userCreatedSuccessfully')
    })
    loadUsers()
  }

  const handleDeactivateUser = async (userId, currentStatus) => {
    if (!window.confirm(t('userMaster.confirmDeactivate'))) return

    try {
      setLoading(true)
      const endpoint = currentStatus ? '/users/' + userId + '/deactivate' : '/users/' + userId + '/activate'
      const response = await api.post(endpoint)

      if (response.data.success) {
        setToast({
          type: 'success',
          text: currentStatus ? t('userMaster.userDeactivated') : t('userMaster.userActivated')
        })
        loadUsers()
      }
    } catch (error) {
      setToast({
        type: 'error',
        text: error.response?.data?.error || t('userMaster.failedToUpdateUser')
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === 'all' || (filter === 'active' ? user.is_active : !user.is_active)
    const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name_gu && user.full_name_gu.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesFilter && matchesSearch
  })

  if (loading && users.length === 0) return <Loading />

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 font-sans">
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-10 text-center max-w-md">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center text-amber-500 mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">{t('userMaster.companyRequired')}</h2>
          <p className="text-slate-500 text-sm font-mono uppercase leading-relaxed mb-8">
            {t('userMaster.companyRequiredDesc')}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/company')}
              className="w-full py-2.5 bg-[#1d5f84] hover:bg-[#154662] text-white font-bold text-sm uppercase tracking-widest transition rounded-md shadow-sm"
            >
              {t('userMaster.setupOrg')}
            </button>
            <button
              onClick={loadCompany}
              className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-sm uppercase tracking-widest transition rounded-md"
            >
              {t('userMaster.refreshSystem')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-8 select-none">
      <Toast message={toast?.text ? toast : null} type={toast?.type} onClose={() => setToast(null)} />
      {loading && users.length > 0 && <Loading />}

      <div className="max-w-[1600px] mx-auto px-4 py-4">

        {/* Main Application Area */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col relative shadow-none">

          {/* Unified Header Bar */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <span className="text-sm font-extrabold text-[#1d5f84] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={14} className="text-[#1d5f84]" />
                {t('userMaster.title')}
              </span>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider hidden md:block">
                {t('userMaster.subtitle')}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCreateUser}
                className="h-7 flex items-center gap-1.5 px-3 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[12px] font-bold rounded-md transition shadow-sm cursor-pointer uppercase tracking-wider"
              >
                <Plus size={13} />
                {t('userMaster.newUser')}
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 flex-1 space-y-4">
            {/* Dense Minimalist Accounting Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between">
                <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('userMaster.orgProfile')}</span>
                <span className={`text-[13px] font-bold text-slate-800 mt-1 truncate ${i18n.language === 'gu' ? 'font-prompt' : 'font-sans uppercase'}`}>
                  {displayCompanyName(company)}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between">
                <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('userMaster.totalUsers')}</span>
                <span className="text-base font-bold font-sans text-slate-800 mt-1">{users.length}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between">
                <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('userMaster.activeNodes')}</span>
                <span className="text-base font-bold font-sans text-emerald-600 mt-1">
                  {users.filter(u => u.is_active).length}
                </span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between">
                <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('userMaster.inactiveNodes')}</span>
                <span className="text-base font-bold font-sans text-rose-600 mt-1">
                  {users.filter(u => !u.is_active).length}
                </span>
              </div>
            </div>

            {/* Registry Table Section */}
            <div className="border border-slate-200 bg-white rounded-lg flex flex-col min-h-[450px] overflow-hidden shadow-sm">

              {/* Action Bar */}
              <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1 bg-slate-200/50 p-0.5 rounded-md">
                    {[
                      { id: 'all', label: t('userMaster.all') },
                      { id: 'active', label: t('userMaster.active') },
                      { id: 'inactive', label: t('userMaster.inactive') }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`px-3 py-1 text-[10px] font-bold uppercase transition-all rounded-sm cursor-pointer ${filter === tab.id
                          ? 'bg-white text-[#1d5f84] shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <span className="bg-slate-200 text-slate-600 font-bold force-en text-[12px] px-1.5 py-0.5 rounded-sm">
                    {filteredUsers.length} {t('userMaster.records')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 border border-slate-200 rounded-md bg-white px-2.5 py-1.5 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] w-full md:w-64 transition-all">
                    <Search size={13} className="text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('userMaster.searchPlaceholder')}
                      className="bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400 w-full font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Table Body */}
              <div className="flex-1 overflow-x-auto bg-white scroller-airy">
                {filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
                    <Users size={32} strokeWidth={1} className="text-slate-300" />
                    <p className="text-[10px] font-mono uppercase tracking-widest">{t('userMaster.noMatchingRecords')}</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-20 shadow-sm">
                      <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500 font-sans text-[10px] font-bold uppercase tracking-wider">
                        <th className="px-4 py-2 border-r border-slate-200 w-12 text-center whitespace-nowrap">#</th>
                        <th className="px-4 py-2 border-r border-slate-200 whitespace-nowrap">{t('userMaster.username')}</th>
                        <th className="px-4 py-2 border-r border-slate-200 whitespace-nowrap">{t('userMaster.identity')}</th>
                        <th className="px-4 py-2 border-r border-slate-200 w-24 text-center whitespace-nowrap">{t('userMaster.role')}</th>
                        <th className="px-4 py-2 border-r border-slate-200 w-28 text-center whitespace-nowrap">{t('userMaster.status')}</th>
                        <th className="px-4 py-2 border-r border-slate-200 w-32 text-center whitespace-nowrap">{t('userMaster.joinedDate')}</th>
                        <th className="px-4 py-2 text-center w-24 whitespace-nowrap">{t('userMaster.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[12px]">
                      {filteredUsers.map((user, i) => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors text-slate-700">
                          <td className="px-4 py-2.5 border-r border-slate-100 text-center font-bold text-slate-400 font-mono">
                            {String(i + 1).padStart(3, '0')}
                          </td>
                          <td className="px-4 py-2.5 border-r border-slate-100">
                            <div className="flex flex-col">
                              <span className={`font-bold text-slate-800 ${i18n.language === 'gu' ? 'font-prompt' : 'font-sans uppercase'}`}>
                                {displayUserName(user)}
                              </span>
                              <span className="text-[12px] text-slate-400 force-en font-mono">@{user.username}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 border-r border-slate-100 text-slate-500 font-bold">
                            <span className={i18n.language === 'gu' ? 'font-prompt' : 'font-sans'}>
                              {displayUserIdentity(user)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 border-r border-slate-100 text-center">
                            <span className={`px-2 py-0.5 rounded-sm text-[12px] font-bold uppercase tracking-widest ${user.role === 'admin' || user.role === 'hod'
                              ? 'bg-indigo-50 text-indigo-700'
                              : user.role === 'manager'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                              }`}>
                              {displayRole(user.role)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 border-r border-slate-100 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {user.is_active ? (
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 text-[12px] font-bold tracking-widest uppercase`}>
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {t('userMaster.statusActive')}
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded-sm bg-slate-100 text-slate-500 text-[12px] font-bold tracking-widest uppercase`}>
                                  {t('userMaster.statusOffline')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 border-r border-slate-100 text-center text-slate-500 font-bold force-en">
                            {new Date(user.created_at).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditUser(user.id)}
                                className="p-1 text-slate-400 hover:text-[#1d5f84] transition rounded-md cursor-pointer"
                                title={t('userMaster.editUser')}
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeactivateUser(user.id, user.is_active)}
                                className={`p-1 transition rounded-md cursor-pointer ${user.is_active
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-emerald-500 hover:bg-emerald-50'
                                  }`}
                                title={user.is_active ? t('userMaster.deactivate') : t('userMaster.activate')}
                              >
                                <Power size={13} />
                              </button>
                            </div>
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
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px] transition-opacity" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-4xl bg-white border border-slate-200 shadow-2xl rounded-lg overflow-hidden flex flex-col max-h-[95vh]">

            {/* Modal Header */}
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-white border border-slate-200 text-[#1d5f84] rounded-md shadow-sm">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    {editingUserId ? t('userMaster.editConfig') : t('userMaster.createIdentity')}
                  </h2>
                  <p className="text-[12px] font-bold text-slate-400 uppercase mt-0.5 tracking-widest">
                    {t('userMaster.privilegesSubtitle')}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white scroller-airy">
              <UserForm
                userId={editingUserId}
                company_id={company.id}
                onSuccess={handleFormSuccess}
                onCancel={() => { setShowModal(false); setEditingUserId(null); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMaster
