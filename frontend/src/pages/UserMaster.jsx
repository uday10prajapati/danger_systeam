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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [company, setCompany] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

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
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (loading && users.length === 0) return <Loading />

  if (!company) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-8 font-sans">
        <div className="bg-white border border-zinc-300 shadow-xl p-10 text-center max-w-md">
          <div className="w-16 h-16 bg-zinc-50 border border-zinc-200 flex items-center justify-center text-amber-500 mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-lg font-bold text-zinc-800 uppercase tracking-tight mb-2">Company Required</h2>
          <p className="text-zinc-500 text-xs font-mono uppercase leading-relaxed mb-8">
            Organization profile setup is mandatory before managing team members.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/company')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest transition shadow-sm"
            >
              Setup Organization
            </button>
            <button
              onClick={loadCompany}
              className="w-full py-3 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-600 font-bold text-xs uppercase tracking-widest transition"
            >
              Refresh System
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none">
      <Toast message={toast?.text ? toast : null} type={toast?.type} onClose={() => setToast(null)} />
      {loading && users.length > 0 && <Loading />}

      <div className="max-w-[1400px] mx-auto bg-white border border-zinc-300 shadow-sm p-5 space-y-6">
        
        {/* Top title and actions header - Minimal Accounting Style */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 select-none">
              <ShieldCheck size={20} className="text-zinc-600" />
              Access Control Registry
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider select-none">System Administration / User Management</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleCreateUser}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none"
            >
              <Plus size={16} />
              NEW USER
            </button>
          </div>
        </div>

        {/* Dense Minimalist Accounting Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Organization Profile</span>
            <span className="text-base font-bold font-mono text-zinc-800 mt-1 truncate">{company.company_name}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Total System Users</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{users.length}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Active Nodes</span>
            <span className="text-2xl font-bold font-mono text-emerald-600 mt-1">
              {users.filter(u => u.is_active).length}
            </span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Offline/Inactive</span>
            <span className="text-2xl font-bold font-mono text-rose-600 mt-1">
              {users.filter(u => !u.is_active).length}
            </span>
          </div>
        </div>

        {/* Registry Table Section */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
          
          {/* Action Bar */}
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-white border border-zinc-300 p-0.5">
                {[
                  { id: 'all', label: 'ALL' },
                  { id: 'active', label: 'ACTIVE' },
                  { id: 'inactive', label: 'INACTIVE' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                      filter === tab.id 
                        ? 'bg-zinc-800 text-white' 
                        : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-1 uppercase">
                {filteredUsers.length} Records
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-64">
                <Search size={14} className="text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username or identity..."
                  className="bg-transparent border-none outline-none text-xs text-zinc-800 placeholder:text-zinc-400 w-full font-mono"
                />
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-x-auto bg-white">
            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                <Users size={32} strokeWidth={1} className="text-zinc-300" />
                <p className="text-xs font-mono uppercase tracking-widest">No matching user records</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600 font-mono text-xs">
                    <th className="px-4 py-2 border-r border-zinc-200 w-12 text-center">#</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Username</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Identity</th>
                    <th className="px-4 py-2 border-r border-zinc-200 w-24 text-center">Role</th>
                    <th className="px-4 py-2 border-r border-zinc-200 w-28 text-center">Status</th>
                    <th className="px-4 py-2 border-r border-zinc-200 w-32 text-center">Joined Date</th>
                    <th className="px-4 py-2 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
                  {filteredUsers.map((user, i) => (
                    <tr key={user.id} className="hover:bg-zinc-50 group transition-colors">
                      <td className="px-4 py-3 border-r border-zinc-100 text-center text-zinc-400">
                        {String(i + 1).padStart(3, '0')}
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-100 font-bold text-zinc-800">
                        {user.username}
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-100 text-zinc-500">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-100 text-center">
                        <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase ${
                          user.role === 'admin' || user.role === 'hod'
                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                            : user.role === 'manager'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-100 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className={`font-bold uppercase text-[9px] ${user.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {user.is_active ? 'Active' : 'Offline'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-100 text-center text-zinc-500">
                        {new Date(user.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditUser(user.id)}
                            className="p-1.5 border border-zinc-200 bg-white text-zinc-400 hover:text-blue-600 hover:border-blue-300 transition shadow-xs"
                            title="Edit User"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeactivateUser(user.id, user.is_active)}
                            className={`p-1.5 border border-zinc-200 bg-white transition shadow-xs ${
                              user.is_active 
                                ? 'text-zinc-400 hover:text-rose-600 hover:border-rose-300' 
                                : 'text-emerald-500 hover:bg-emerald-50 border-emerald-200'
                            }`}
                            title={user.is_active ? 'Deactivate' : 'Activate'}
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-4xl bg-white border border-zinc-400 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            
            {/* Modal Header */}
            <div className="bg-zinc-100 px-5 py-3.5 border-b border-zinc-300 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white border border-zinc-200 text-blue-600">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-tight">
                    {editingUserId ? 'Edit User Configuration' : 'Create New System Identity'}
                  </h2>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5 tracking-wider">
                    Access Control & Module Privileges
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 text-zinc-400 hover:text-red-600 transition">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white">
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
