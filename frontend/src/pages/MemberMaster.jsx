import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, Users, UserCheck,
  UserMinus, Edit3, Trash2, Power,
  ChevronRight, Phone, MapPin,
  RefreshCcw, Building2, CreditCard,
  X, Shield, AlertCircle, CheckCircle,
  Loader, Globe, Hash
} from 'lucide-react'
import api, { sabhasadMasterApi } from '../api'
import MemberForm from '../components/MemberForm'

export default function MemberMaster() {
  const [members, setMembers] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [company, setCompany] = useState(null)

  useEffect(() => {
    loadCompany()
  }, [])

  useEffect(() => {
    if (company) loadMembers()
  }, [company])

  const loadCompany = async () => {
    try {
      const response = await api.get('/company')
      if (response.data.success && response.data.data) {
        setCompany(response.data.data)
      }
    } catch (error) {
      console.error('Failed to load company', error)
    }
  }

  const loadMembers = async () => {
    try {
      setLoading(true)
      const response = await sabhasadMasterApi.getAllSabhasad()
      if (response.data.success) {
        setMembers(response.data.data || [])
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to synchronize ecosystem registry' })
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = (members || []).filter(m => {
    const matchesSearch =
      m.member_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.member_code?.toString().includes(searchQuery) ||
      m.phone?.includes(searchQuery) ||
      m.village_name?.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'active') return matchesSearch && m.is_active === 1;
    if (statusFilter === 'inactive') return matchesSearch && m.is_active === 0;
    return matchesSearch;
  })

  const handleStatusToggle = async (member) => {
    try {
      const updatedMember = { ...member, is_active: member.is_active ? 0 : 1 };
      // Map to frontend expected names for the update call
      const payload = {
        sabhasadCode: member.member_code,
        sabhasadName: member.member_name,
        phoneNo: member.phone,
        villageCode: member.village_code,
        villageName: member.village_name,
        fullAcNumber: member.full_ac_number,
        bankName: member.bank_name,
        branchName: member.branch_name,
        accountType: member.account_type,
        addressNo: member.address_no,
        engName: member.eng_name,
        nominalMember: member.nominal_member,
        is_active: updatedMember.is_active === 1
      };

      await sabhasadMasterApi.updateSabhasad(member.id, payload);
      setMessage({ type: 'success', text: `Node ${member.is_active ? 'archived' : 'activated'} successfully` })
      loadMembers()
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Status synchronization failed' })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to decommission this entity?')) return;
    try {
      await sabhasadMasterApi.deleteSabhasad(id);
      setMessage({ type: 'success', text: 'Entity decommissioned' });
      loadMembers();
    } catch (error) {
      if (error.response?.status === 404) {
        setMessage({ type: 'success', text: 'Entity already decommissioned' });
        loadMembers();
        return;
      }
      setMessage({ type: 'error', text: 'Operation failed' });
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
    return <div className="p-20 text-center font-black text-slate-300 uppercase tracking-widest animate-pulse">Initializing Data Layers...</div>
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => { setShowForm(false); setEditingMember(null); }}
            className="group mb-8 flex items-center gap-3 text-slate-400 hover:text-slate-800 font-black text-[10px] uppercase tracking-widest transition-all"
          >
            <div className="p-2 bg-white rounded-lg border border-slate-100 group-hover:border-slate-800 transition-all shadow-sm">
              <X size={14} />
            </div>
            Exit Registry Form
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
      <div className="max-w-[1600px] mx-auto px-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
              <Shield size={12} />
              <span>Management / Member Master</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Sabhasad Master</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-white rounded-lg px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
              <Search size={18} className="text-slate-400 group-focus-within:text-blue-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, code or village..."
                className="bg-transparent border-none outline-none text-sm text-slate-600 w-64 placeholder:text-slate-300 font-medium"
              />
            </div>
            <button
              onClick={handleCreateMember}
              className="flex items-center gap-2 bg-blue-600 px-6 py-3.5 rounded-lg text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
            >
              <Plus size={20} />
              Add Member
            </button>
          </div>
        </div>

        {/* Global Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
            message.type === 'error' ? 'bg-rose-50 border border-rose-100 text-rose-700' : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
          }`}>
            {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span className="text-sm font-bold">{message.text}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Organization</p>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Building2 size={16} /></div>
            </div>
            <p className="text-lg font-bold text-slate-800 truncate">{company.company_name}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Members</p>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><UserCheck size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{members.filter(m => m.is_active).length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inactive</p>
              <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><UserMinus size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-rose-600">{members.filter(m => !m.is_active).length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Members</p>
              <div className="p-2 bg-slate-50 rounded-lg text-slate-600"><Globe size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{members.length}</p>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-slate-800 font-bold text-sm">
              <Users size={16} className="text-slate-400" />
              Member List
              <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black">{filteredMembers.length}</span>
            </div>
            <div className="flex items-center p-1 bg-slate-50 rounded-lg border border-slate-100 gap-1">
              {['all', 'active', 'inactive'].map((filt) => (
                <button
                  key={filt}
                  onClick={() => setStatusFilter(filt)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${statusFilter === filt ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {filt}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-32 text-center">
              <div className="w-20 h-20 border-8 border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-8 shadow-inner" />
              <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] italic">Synchronizing Global States...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-32 text-center">
              <div className="w-24 h-24 bg-slate-50 flex items-center justify-center rounded-lg mx-auto mb-8 border border-slate-100 text-slate-200 scale-110">
                <UserMinus size={48} />
              </div>
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs mb-10 italic italic">No matching identity discovered</p>
              <button onClick={handleCreateMember} className="px-12 py-5 bg-blue-600 text-white rounded-lg font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95">
                Register Initial Point
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    {['Member', 'Village / Address', 'Bank Details', 'Status', 'Actions'].map((h, i) => (
                      <th key={h} className={`px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-800 font-black text-base group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                            {member.member_name ? member.member_name[0] : '#'}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{member.member_name}</p>
                            <div className="flex items-center gap-3">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                <Hash size={10} /> {member.member_code}
                              </span>
                              <span className="text-[11px] font-bold text-slate-400 italic">{member.eng_name || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                            <Globe size={14} className="text-blue-400" />
                            {member.village_name || 'Unassigned'}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <MapPin size={12} className="text-slate-300" />
                            {member.address_no || 'No Address Node'}
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 rounded-lg text-amber-600 border border-amber-100 shadow-sm">
                              <Building2 size={14} />
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-slate-800 leading-none mb-1">{member.bank_name || 'No Vault Linked'}</p>
                              <p className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">{member.full_ac_number || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all border shadow-sm ${member.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-400 border-rose-100'
                          }`}>
                          <div className={`w-2 h-2 rounded-full ${member.is_active ? 'bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20' : 'bg-rose-400'}`} />
                          {member.is_active ? 'Online' : 'Archived'}
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-10 group-hover:translate-x-0 duration-500">
                          <button onClick={() => handleEditMember(member)} className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-100 rounded-lg transition-all active:scale-90">
                            <Edit3 size={18} />
                          </button>
                          <button onClick={() => handleStatusToggle(member)} className={`p-3.5 bg-white border border-slate-100 rounded-lg transition-all active:scale-90 shadow-sm ${member.is_active ? 'text-slate-400 hover:text-rose-500 hover:border-rose-200' : 'text-slate-400 hover:text-emerald-500 hover:border-emerald-200'}`}>
                            <Power size={18} />
                          </button>
                          <button onClick={() => handleDelete(member.id)} className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-200 rounded-lg transition-all active:scale-90">
                            <Trash2 size={18} />
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
