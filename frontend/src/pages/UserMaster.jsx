import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { 
  Plus, Edit3, Trash2, Power, 
  Loader, AlertCircle, CheckCircle,
  Users, UserCheck, UserMinus, Shield,
  Search, Filter, ChevronRight, X,
  Building2, Command
} from 'lucide-react'
import UserForm from '../components/UserForm'

function UserMaster() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [company, setCompany] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [message, setMessage] = useState(null)
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
      const response = await axios.get('/api/company')
      if (response.data.success && response.data.data) {
        setCompany(response.data.data)
      } else {
        setMessage({ type: 'error', text: t('userMaster.noCompanyFound') })
      }
    } catch (error) {
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

  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === 'all' || (filter === 'active' ? user.is_active : !user.is_active)
    const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (!company) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl p-12 text-center max-w-md animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('userMaster.noCompanyFound', 'No Company Found')}</h2>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">
            {t('userMaster.createCompanyFirst', 'Please set up your organization profile before managing team members.')}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/company')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95"
            >
              {t('company.goToCompanySetup', 'Go to Company Setup')}
            </button>
            <button
              onClick={loadCompany}
              className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl transition-all"
            >
              {t('userMaster.refresh', 'Refresh System')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => { setShowForm(false); setEditingUserId(null); }}
            className="group mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-800 font-bold text-sm transition-colors"
          >
            <div className="p-2 bg-white rounded-lg border border-slate-200 group-hover:border-slate-800 transition-all">
               <X size={16} />
            </div>
            {t('userMaster.backToUsers', 'Back to User Master')}
          </button>
          <UserForm
            userId={editingUserId}
            company_id={company.id}
            onSuccess={handleFormSuccess}
            onCancel={() => { setShowForm(false); setEditingUserId(null); }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-6">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
              <Shield size={12} />
              <span>{t('modules.management', 'Management')} / {t('userMaster.userMaster', 'User Master')}</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('userMaster.userMaster', 'System User Repository')}</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-3 bg-white rounded-2xl px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
                <Search size={18} className="text-slate-400 group-focus-within:text-blue-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('dashboard.search', 'Search users...')} 
                  className="bg-transparent border-none outline-none text-sm text-slate-600 w-64 placeholder:text-slate-300 font-medium" 
                />
             </div>
             <button
               onClick={handleCreateUser}
               className="flex items-center gap-2 bg-blue-600 px-6 py-3.5 rounded-2xl text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
             >
               <Plus size={20} />
               {t('userMaster.createUser', 'Add New User')}
             </button>
          </div>
        </div>

        {/* Global Messages */}
        {message && (
          <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
            message.type === 'error' ? 'bg-rose-50 border border-rose-100 text-rose-700' : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
          }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <p className="text-sm font-bold">{message.text}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('userMaster.company', 'Organization')}</p>
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Building2 size={16} /></div>
            </div>
            <p className="text-lg font-bold text-slate-800 truncate">{company.company_name}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('userMaster.totalUsers', 'User Count')}</p>
              <div className="p-2 bg-slate-50 rounded-xl text-slate-600"><Users size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{users.length}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-emerald-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('userMaster.activeUsers', 'Active Node')}</p>
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><UserCheck size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{users.filter(u => u.is_active).length}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-rose-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('userMaster.inactiveUsers', 'Offline')}</p>
              <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><UserMinus size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-rose-600">{users.filter(u => !u.is_active).length}</p>
          </div>
        </div>

        {/* User Table Card */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex gap-1.5 p-1 bg-slate-50 rounded-2xl border border-slate-100">
              {[
                { id: 'all', label: t('userMaster.allUsers', 'Operational List') },
                { id: 'active', label: t('userMaster.activeOnly', 'Active Only') },
                { id: 'inactive', label: t('userMaster.inactiveOnly', 'Restricted') }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                    filter === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
               <button className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-800 transition-all"><Filter size={18} /></button>
               <button className="flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-widest hover:underline">
                 <Command size={14} /> Bulk Actions
               </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                <Loader className="animate-spin" size={32} />
                <p className="text-sm font-bold italic">{t('common.loading', 'Synchronizing users...')}</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-300">
                <Users size={48} strokeWidth={1} />
                <p className="text-sm font-bold italic">{t('userMaster.noUsersFound', 'No users matches your criteria')}</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    {[
                      t('userMaster.username', 'User Profile'), 
                      t('userMaster.role', 'Access Tier'), 
                      t('userMaster.status', 'System Status'), 
                      t('userMaster.createdDate', 'Established'), 
                      t('userMaster.actions', 'Operations')
                    ].map((head) => (
                      <th key={head} className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm bg-linear-to-br transition-transform group-hover:scale-110 ${
                            user.is_active ? 'from-blue-500 to-indigo-600' : 'from-slate-400 to-slate-500'
                          }`}>
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{user.username}</p>
                            <p className="text-[11px] font-medium text-slate-400 mt-0.5">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                          user.role === 'hod' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                          user.role === 'manager' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-2">
                           <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                           <span className={`text-[10px] font-bold uppercase tracking-widest ${user.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {user.is_active ? t('userMaster.active', 'Operational') : t('userMaster.inactive', 'Offline')}
                           </span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-[11px] font-bold text-slate-400 italic">
                        {new Date(user.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <button
                            onClick={() => handleEditUser(user.id)}
                            className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-600 rounded-xl transition-all shadow-sm"
                            title={t('userMaster.editUser')}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeactivateUser(user.id, user.is_active)}
                            className={`p-2.5 bg-white border border-slate-200 rounded-xl transition-all shadow-sm ${
                              user.is_active ? 'text-slate-400 hover:text-rose-600 hover:border-rose-600' : 'text-emerald-500 hover:bg-emerald-50 border-emerald-200'
                            }`}
                          >
                            <Power size={16} />
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
  )
}

export default UserMaster
