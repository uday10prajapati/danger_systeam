import React, { useState, useEffect } from 'react'
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
import PageHeader from '../components/PageHeader'
import TableHeading from '../components/TableHeading'

export default function MemberMaster() {
  const [members, setMembers] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [showModal, setShowModal] = useState(false)
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
      setMessage({ type: 'error', text: 'Failed to load members.' })
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
        p_code: member.p_code,
        is_active: updatedMember.is_active === 1
      };

      await sabhasadMasterApi.updateSabhasad(member.id, payload);
      setMessage({ type: 'success', text: `Member ${member.is_active ? 'deactivated' : 'activated'} successfully` })
      loadMembers()
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Status update failed.' })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    try {
      await sabhasadMasterApi.deleteSabhasad(id);
      setMessage({ type: 'success', text: 'Member deleted.' });
      loadMembers();
    } catch (error) {
      if (error.response?.status === 404) {
        setMessage({ type: 'success', text: 'Member already deleted.' });
        loadMembers();
        return;
      }
      setMessage({ type: 'error', text: 'Delete failed.' });
    }
  }

  const handleCreateMember = () => {
    setEditingMember(null)
    setShowModal(true)
  }

  const handleEditMember = (member) => {
    setEditingMember(member)
    setShowModal(true)
  }

  const handleFormSuccess = () => {
    setShowModal(false)
    setEditingMember(null)
    loadMembers()
  }

  if (!company && !loading) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
        <Loader className="animate-spin text-blue-500" size={40} />
        <p className="font-bold text-slate-400 uppercase tracking-widest">Loading Member Data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-6">

        <PageHeader
          eyebrow="Management / Members"
          eyebrowIcon={<Shield size={12} />}
          title="Sabhasad Master"
          subtitle="Manage member profiles and bank settings"
        >
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-slate-200 shadow-sm focus-within:border-blue-500 transition-all group">
              <Search size={16} className="text-slate-400 group-focus-within:text-blue-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="bg-transparent border-none outline-none text-xs text-slate-600 w-48 placeholder:text-slate-300 font-bold"
              />
            </div>
            <button
              onClick={handleCreateMember}
              className="flex items-center gap-2 bg-blue-600 px-6 py-2.5 rounded-lg text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-95"
            >
              <Plus size={16} /> Add Member
            </button>
          </div>
        </PageHeader>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top duration-300 border-l-4 ${
            message.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'
          }`}>
            {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span className="text-xs font-bold uppercase tracking-wider">{message.text}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Organization', val: company.company_name, icon: <Building2 size={18} />, color: 'blue' },
            { label: 'Active Members', val: members.filter(m => m.is_active).length, icon: <UserCheck size={18} />, color: 'emerald' },
            { label: 'Inactive', val: members.filter(m => !m.is_active).length, icon: <UserMinus size={18} />, color: 'rose' },
            { label: 'Total Members', val: members.length, icon: <Globe size={18} />, color: 'slate' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-100 transition-all">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <div className={`p-2 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg group-hover:scale-110 transition-transform`}>{stat.icon}</div>
              </div>
              <p className={`text-xl font-black truncate ${i === 1 ? 'text-emerald-600' : i === 2 ? 'text-rose-600' : 'text-slate-800'}`}>{stat.val}</p>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
          <TableHeading
            icon={<Users size={18} />}
            iconColor="blue"
            title="Member List"
            subtitle={`Total ${filteredMembers.length} records found`}
          >
            <div className="flex items-center p-1 bg-slate-50 rounded-lg border border-slate-200 gap-1">
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
          </TableHeading>

          {loading ? (
            <div className="p-32 text-center">
              <RefreshCcw size={48} className="animate-spin text-blue-100 mx-auto mb-6" />
              <p className="text-slate-300 font-bold uppercase tracking-widest text-[10px] italic">Updating Registry...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-32 text-center">
              <UserMinus size={48} className="text-slate-200 mx-auto mb-6" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-10 italic">No matching members found</p>
              <button onClick={handleCreateMember} className="px-10 py-3 bg-blue-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-95">
                Register New Member
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto scroller-airy">
              <table className="w-full text-left">
                <thead className="bg-[#F8FAFC]">
                  <tr className="uppercase tracking-widest font-black text-slate-400 text-[10px]">
                    <th className="px-6 py-5 border-r border-slate-50/50">Member</th>
                    <th className="px-6 py-5 border-r border-slate-50/50">Village / Address</th>
                    <th className="px-6 py-5 border-r border-slate-50/50">Bank Details</th>
                    <th className="px-6 py-5 border-r border-slate-50/50">Status</th>
                    <th className="px-6 py-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-800 font-black text-base group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                            {member.member_name ? member.member_name[0] : '#'}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight italic">{member.member_name}</p>
                            <div className="flex items-center gap-2">
                              {member.p_code ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 rounded text-[10px] font-black text-white uppercase tracking-[0.15em] shadow-sm shadow-blue-100">
                                  {member.p_code}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                  <Hash size={10} /> {member.member_code}
                                </span>
                              )}
                              {member.p_code && (
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                                  #{member.member_code}
                                </span>
                              )}
                              <span className="text-[11px] font-bold text-slate-400 italic ml-1">{member.eng_name || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 italic">
                            <Globe size={14} className="text-blue-400" />
                            {member.village_name || 'Unassigned'}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <MapPin size={12} className="text-slate-300" />
                            {member.address_no || 'No Address'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-50 rounded-lg text-amber-600 border border-amber-100 shadow-sm">
                            <Building2 size={14} />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-800 leading-none mb-1 uppercase tracking-tight">{member.bank_name || 'No Bank'}</p>
                            <p className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">{member.full_ac_number || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border shadow-sm ${member.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-400 border-rose-100'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
                          {member.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEditMember(member)} className="p-2.5 bg-white border border-slate-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleStatusToggle(member)} className={`p-2.5 bg-white border border-slate-100 rounded-lg shadow-sm transition-all active:scale-95 ${member.is_active ? 'text-rose-500 hover:bg-rose-600 hover:text-white' : 'text-emerald-500 hover:bg-emerald-600 hover:text-white'}`}>
                            <Power size={16} />
                          </button>
                          <button onClick={() => handleDelete(member.id)} className="p-2.5 bg-white border border-slate-100 text-rose-500 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95">
                            <Trash2 size={16} />
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

      {/* Modal for Member Form */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-5xl max-h-[95vh] overflow-y-auto scroller-airy bg-white rounded-lg shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200">
            <MemberForm
              companyId={company.id}
              onSuccess={handleFormSuccess}
              editingMember={editingMember}
              onClose={() => setShowModal(false)}
              existingMembers={members} // Pass for duplicate check
            />
          </div>
        </div>
      )}
    </div>
  )
}
