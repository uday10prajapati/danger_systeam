import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { Plus, Edit2, Trash2, Power, Loader, AlertCircle, CheckCircle } from 'lucide-react'
import UserForm from '../components/UserForm'

function UserMaster() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [company, setCompany] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [message, setMessage] = useState(null)
  const [filter, setFilter] = useState('all') // all, active, inactive

  // Load company and users on mount
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
      const response = await axios.get('/api/company')
      console.log('Company fetch response:', response.data)
      
      if (response.data.success && response.data.data) {
        console.log('Company loaded:', response.data.data)
        setCompany(response.data.data)
      } else {
        console.log('No company data in response')
        setMessage({
          type: 'error',
          text: t('userMaster.noCompanyFound')
        })
      }
    } catch (error) {
      console.error('Company fetch error:', error.message, error.response?.data)
      setMessage({
        type: 'error',
        text: error.response?.data?.error || t('userMaster.failedToLoadCompany')
      })
    }
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/users/company/${company.id}`)
      if (response.data.success) {
        setUsers(response.data.data)
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || t('userMaster.failedToLoadUsers')
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = () => {
    setEditingUserId(null)
    setShowForm(true)
  }

  const handleEditUser = (userId) => {
    setEditingUserId(userId)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingUserId(null)
    setMessage({
      type: 'success',
      text: editingUserId ? t('userMaster.userUpdatedSuccessfully') : t('userMaster.userCreatedSuccessfully')
    })
    setTimeout(() => setMessage(null), 3000)
    loadUsers()
  }

  const handleDeactivateUser = async (userId, currentStatus) => {
    if (!window.confirm(t('userMaster.confirmDeactivate'))) return

    try {
      setLoading(true)
      const endpoint = currentStatus ? '/api/users/' + userId + '/deactivate' : '/api/users/' + userId + '/activate'
      const response = await axios.post(endpoint)

      if (response.data.success) {
        setMessage({
          type: 'success',
          text: currentStatus ? t('userMaster.userDeactivated') : t('userMaster.userActivated')
        })
        setTimeout(() => setMessage(null), 3000)
        loadUsers()
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || t('userMaster.failedToUpdateUser')
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter users based on active/inactive status
  const filteredUsers = users.filter(user => {
    if (filter === 'active') return user.is_active
    if (filter === 'inactive') return !user.is_active
    return true
  })

  if (!company) {
    return (
      <div className="min-h-screen bg-linear-to-br from-white via-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{t('userMaster.noCompanyFound')}</h2>
          <p className="text-slate-600 mb-6">{t('userMaster.createCompanyFirst')}</p>
          
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/company'}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Go to Company Setup
            </button>
            <button
              onClick={loadCompany}
              className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-linear-to-br from-white via-slate-50 to-slate-100 p-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => {
              setShowForm(false)
              setEditingUserId(null)
            }}
            className="mb-6 text-blue-600 hover:text-blue-700 font-semibold"
          >
            ← {t('userMaster.backToUsers')}
          </button>
          <UserForm
            userId={editingUserId}
            company_id={company.id}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowForm(false)
              setEditingUserId(null)
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header - Monochrome Style */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{t('userMaster.userMaster')}</h1>
            <p className="text-slate-500 font-medium">{t('userMaster.manageSystemUsers')}</p>
          </div>
          <button
            onClick={handleCreateUser}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-slate-800 font-bold shadow-lg transition-all active:scale-95 disabled:bg-slate-400"
          >
            <Plus className="w-5 h-5" />
            {t('userMaster.addNewUser')}
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 shadow-sm border-l-4 ${
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

        {/* Stats Cards - Sleek Grayscale */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-slate-900">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{t('userMaster.company')}</p>
            <p className="text-xl font-black text-slate-900 truncate">{company.company_name}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-slate-500">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{t('userMaster.totalUsers')}</p>
            <p className="text-3xl font-black text-slate-900">{users.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-slate-400">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{t('userMaster.activeUsers')}</p>
            <p className="text-3xl font-black text-slate-900">{users.filter(u => u.is_active).length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-slate-300">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{t('userMaster.inactiveUsers')}</p>
            <p className="text-3xl font-black text-slate-700">{users.filter(u => !u.is_active).length}</p>
          </div>
        </div>

        {/* Toolbar - Monochrome Tabs */}
        <div className="bg-white p-4 rounded-xl shadow-md border border-slate-100 flex justify-start gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
              filter === 'all'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {t('userMaster.allUsers')}
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-6 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
              filter === 'active'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {t('userMaster.activeOnly')}
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-6 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
              filter === 'inactive'
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {t('userMaster.inactiveOnly')}
          </button>
        </div>

        {/* Users Table - High Contrast Monochrome */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader className="w-8 h-8 animate-spin mx-auto text-slate-900 mb-4" />
              <p className="text-slate-600">{t('userMaster.loadingUsers')}</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600">{t('userMaster.noUsersFound')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900 text-white text-left">
                  <tr>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">{t('userMaster.username')}</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">{t('userMaster.email')}</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">{t('userMaster.role')}</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">{t('userMaster.status')}</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">{t('userMaster.createdDate')}</th>
                    <th className="px-6 py-4 font-black uppercase tracking-wider text-xs text-right">{t('userMaster.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-black text-slate-900 tracking-tight">{user.username}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${
                          user.role === 'admin' ? 'bg-slate-900 text-white border-slate-900' :
                          user.role === 'manager' ? 'bg-white text-slate-900 border-slate-300' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${
                          user.is_active
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white text-slate-400 border-slate-200 line-through'
                        }`}>
                          {user.is_active ? t('userMaster.active') : t('userMaster.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm font-bold italic">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditUser(user.id)}
                            className="p-2 text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-300 rounded-lg transition-all"
                            title={t('userMaster.editUser')}
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeactivateUser(user.id, user.is_active)}
                            className={`p-2 rounded-lg transition-all border border-transparent ${
                              user.is_active
                                ? 'text-zinc-400 hover:text-black hover:bg-zinc-100 hover:border-zinc-200'
                                : 'text-zinc-900 hover:bg-zinc-900 hover:text-white'
                            }`}
                            title={user.is_active ? t('userMaster.deactivateUser') : t('userMaster.activateUser')}
                          >
                            <Power className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserMaster
