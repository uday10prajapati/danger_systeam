import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { 
  Plus, Search, Filter, Download, 
  Users, UserCheck, UserMinus, ShieldAlert,
  Edit3, Trash2, Power, ChevronRight,
  MoreVertical, Mail, Phone, MapPin,
  RefreshCcw, Building2, CreditCard, Percent,
  X, Shield, AlertCircle, CheckCircle, Loader
} from 'lucide-react'
import MemberForm from '../components/MemberForm'

export default function MemberMaster() {
  const { t } = useTranslation()
  const [company, setCompany] = useState(null)
  const [members, setMembers] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState(null)

  useEffect(() => { 
    loadCompany() 
  }, [])

  useEffect(() => { 
    if (company) loadMembers() 
  }, [company, statusFilter])

  const loadCompany = async () => {
    try {
      const response = await axios.get('/api/company')
      if (response.data.success && response.data.data) {
        setCompany(response.data.data)
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('memberMaster.failedToLoadCompany') })
    }
  }

  const loadMembers = async () => {
    try {
      setLoading(true)
      const url = statusFilter === 'all'
        ? `/api/members/company/${company.id}`
        : `/api/members/company/${company.id}?active=${statusFilter === 'active'}`
      const response = await axios.get(url)
      if (response.data.success) {
        setMembers(response.data.data || [])
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('memberMaster.failedToLoadMembers') })
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = members.filter(m => 
    m.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.member_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.phone?.includes(searchQuery)
  )

  const handleStatusToggle = async (member) => {
    try {
      const endpoint = member.is_active ? 'deactivate' : 'activate'
      const response = await axios.post(`/api/members/${member.id}/${endpoint}`)
      if (response.data.success) {
        setMessage({ type: 'success', text: t(`memberMaster.member${member.is_active ? 'Deactivated' : 'Activated'}`) })
        loadMembers()
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('memberMaster.failedToUpdateStatus') })
    }
  }

  const handleCreateMember = () => {
    setEditingMember(null)
    setShowForm(true)
  }

  const handleEditMember = (member) => {
    setEditingMember(member)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingMember(null)
    loadMembers()
  }

  if (!company && !loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-12 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-rose-100/50">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t('memberMaster.noCompanyFound', 'No Company Found')}</h1>
          <p className="text-slate-500 font-medium leading-relaxed">{t('memberMaster.createCompanyFirst', 'Please setup your company profile before managing the member ecosystem.')}</p>
          <div className="pt-4 flex flex-col gap-3">
            <button
              onClick={() => window.location.href = '/company'}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
            >
              Setup Company Profile
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
            onClick={() => { setShowForm(false); setEditingMember(null); }}
            className="group mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-800 font-bold text-sm transition-colors"
          >
            <div className="p-2 bg-white rounded-lg border border-slate-200 group-hover:border-slate-800 transition-all">
               <X size={16} />
            </div>
            {t('memberMaster.backToMembers', 'Back to Member Master')}
          </button>
          <MemberForm
            companyId={company.id}
            onSuccess={handleFormSuccess}
            editingMember={editingMember}
            onClose={() => { setShowForm(false); setEditingMember(null); }}
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
              <span>{t('modules.management', 'Management')} / {t('modules.memberMaster', 'Member Master')}</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('memberMaster.title', 'Member Ecosystem Registry')}</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-3 bg-white rounded-2xl px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
                <Search size={18} className="text-slate-400 group-focus-within:text-blue-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('memberMaster.searchPlaceholder', 'Search members...')} 
                  className="bg-transparent border-none outline-none text-sm text-slate-600 w-64 placeholder:text-slate-300 font-medium" 
                />
             </div>
             <button
               onClick={handleCreateMember}
               className="flex items-center gap-2 bg-blue-600 px-6 py-3.5 rounded-2xl text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
             >
               <Plus size={20} />
               {t('memberMaster.addNew', 'Register New Entity')}
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('memberMaster.totalMembers', 'Entity Count')}</p>
              <div className="p-2 bg-slate-50 rounded-xl text-slate-600"><Users size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{members.length}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-emerald-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('memberMaster.activeMembers', 'Active Node')}</p>
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><UserCheck size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{members.filter(m => m.is_active).length}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-rose-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('memberMaster.avgDiscount', 'Fiscal Incentive')}</p>
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><Percent size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">
               {(members.reduce((sum, m) => sum + (parseFloat(m.discount_percentage) || 0), 0) / (members.length || 1)).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
           <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                   <Users size={18} />
                 </div>
                 <h2 className="text-lg font-bold text-slate-800">{t('memberMaster.operationalList', 'Operational Entity Registry')}</h2>
              </div>
              <div className="flex items-center p-1 bg-slate-50 rounded-xl">
                {['all', 'active', 'inactive'].map((filt) => (
                  <button
                    key={filt}
                    onClick={() => setStatusFilter(filt)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                      statusFilter === filt ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {t(`memberMaster.${filt}Only`, filt)}
                  </button>
                ))}
              </div>
           </div>

           {loading ? (
             <div className="p-24 text-center">
               <Loader className="w-10 h-10 text-blue-100 animate-spin mx-auto mb-4" />
               <p className="text-slate-300 font-bold uppercase tracking-widest text-[10px]">{t('userMaster.loadingUsers', 'Synchronizing Ecosystem...')}</p>
             </div>
           ) : filteredMembers.length === 0 ? (
             <div className="p-24 text-center">
               <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
                 <UserMinus size={40} />
               </div>
               <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">{t('memberMaster.noMembers', 'No matched entities found')}</p>
               <button onClick={handleCreateMember} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all active:scale-95 shadow-xl">
                 Register First Entity
               </button>
             </div>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-[#F8FAFC]">
                     <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('memberMaster.memberName', 'Entity Identity')}</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('memberMaster.phone', 'Interface')}</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('memberMaster.discount', 'Fiscal')}</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('memberMaster.status', 'Protocol')}</th>
                     <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">{t('userMaster.actions', 'Ops')}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {filteredMembers.map((member) => (
                     <tr key={member.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                       <td className="px-8 py-6">
                         <div className="flex items-center gap-4">
                           <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-sm group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-blue-200 group-hover:shadow-lg">
                             {member.member_name[0]}
                           </div>
                           <div>
                             <p className="text-sm font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors capitalize">{member.member_name}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest inline-flex items-center gap-1">
                               <CreditCard size={10} /> {member.member_code}
                             </p>
                           </div>
                         </div>
                       </td>
                       <td className="px-8 py-6">
                         <div className="space-y-1">
                           <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                             <Phone size={12} className="text-slate-300" /> {member.phone || 'N/A'}
                           </p>
                           {member.email && (
                             <p className="text-[11px] font-medium text-slate-400 flex items-center gap-2">
                               <Mail size={12} className="text-slate-300" /> {member.email}
                             </p>
                           )}
                         </div>
                       </td>
                       <td className="px-8 py-6">
                         <div className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                           <Percent size={14} className="text-blue-500" />
                           <span className="text-sm font-black text-slate-800">{(parseFloat(member.discount_percentage) || 0).toFixed(1)}%</span>
                         </div>
                       </td>
                       <td className="px-8 py-6">
                         <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                           member.is_active ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
                         }`}>
                           <div className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                           {member.is_active ? t('memberMaster.active') : t('memberMaster.inactive')}
                         </span>
                       </td>
                       <td className="px-8 py-6">
                         <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                           <button onClick={() => handleEditMember(member)} className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-100 rounded-xl transition-all">
                             <Edit3 size={16} />
                           </button>
                           <button onClick={() => handleStatusToggle(member)} className={`p-2.5 bg-white border border-slate-100 rounded-xl transition-all ${member.is_active ? 'text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:shadow-lg hover:shadow-rose-100' : 'text-slate-400 hover:text-emerald-600 hover:border-emerald-100 hover:shadow-lg hover:shadow-emerald-100'}`}>
                             <Power size={16} />
                           </button>
                           <button className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-slate-800 rounded-xl transition-all">
                             <MoreVertical size={16} />
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
