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
    <div className="min-h-screen bg-linear-to-br from-white via-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
            {t('userMaster.userMaster')}
          </h1>
          <p className="text-slate-600 mt-2">{t('userMaster.manageSystemUsers')}</p>
        </div>

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

        {/* Company Info Card */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-blue-700 font-semibold">{t('userMaster.company')}</p>
              <p className="text-lg font-bold text-blue-900">{company.company_name}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700 font-semibold">{t('userMaster.totalUsers')}</p>
              <p className="text-lg font-bold text-blue-900">{users.length}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700 font-semibold">{t('userMaster.activeUsers')}</p>
              <p className="text-lg font-bold text-green-600">{users.filter(u => u.is_active).length}</p>
            </div>
            <div>
              <p className="text-sm text-blue-700 font-semibold">{t('userMaster.inactiveUsers')}</p>
              <p className="text-lg font-bold text-orange-600">{users.filter(u => !u.is_active).length}</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t('userMaster.allUsers')}
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t('userMaster.activeOnly')}
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === 'inactive'
                  ? 'bg-orange-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {t('userMaster.inactiveOnly')}
            </button>
          </div>

          <button
            onClick={handleCreateUser}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('userMaster.addNewUser')}
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
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
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">{t('userMaster.username')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">{t('userMaster.email')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">{t('userMaster.role')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">{t('userMaster.status')}</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">{t('userMaster.createdDate')}</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">{t('userMaster.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{user.username}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                          user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {user.is_active ? t('userMaster.active') : t('userMaster.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditUser(user.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('userMaster.editUser')}
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeactivateUser(user.id, user.is_active)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.is_active
                                ? 'text-orange-600 hover:bg-orange-50'
                                : 'text-green-600 hover:bg-green-50'
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
