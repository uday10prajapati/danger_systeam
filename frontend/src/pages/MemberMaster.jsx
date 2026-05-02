import React, { useState, useEffect } from 'react'
import {
  Plus, Search, Users, UserCheck,
  UserMinus, Edit3, Trash2, Power,
  ChevronRight, Phone, MapPin,
  RefreshCcw, Building2, CreditCard,
  X, Shield, AlertCircle, CheckCircle,
  Loader, Globe, Hash, FileText
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import api, { sabhasadMasterApi } from '../api'
import MemberForm from '../components/MemberForm'
import Toast from '../components/Toast'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import Loading from '../components/Loading'

export default function MemberMaster() {
  const [members, setMembers] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [company, setCompany] = useState(null)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

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
    } catch (error) {
      setMessage({ type: 'error', text: 'Status update failed.' })
    }
  }

  const confirmDelete = (member) => {
    setMemberToDelete(member);
    setDeleteModalOpen(true);
  }

  const handleDelete = async () => {
    if (!memberToDelete) return;
    try {
      setLoading(true)
      await sabhasadMasterApi.deleteSabhasad(memberToDelete.id);
      setMessage({ type: 'success', text: 'Member deleted successfully.' });
      setDeleteModalOpen(false);
      setMemberToDelete(null);
      loadMembers();
    } catch (error) {
      if (error.response?.status === 404) {
        setMessage({ type: 'success', text: 'Member already deleted.' });
        loadMembers();
        return;
      }
      setMessage({ type: 'error', text: 'Delete failed.' });
    } finally {
      setLoading(false)
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

  const addGujaratiFont = async (doc) => {
    try {
      const res = await fetch('/fonts/NotoSansGujarati-Regular.ttf')
      const blob = await res.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1]
          doc.addFileToVFS('NotoSansGujarati.ttf', base64)
          doc.addFont('NotoSansGujarati.ttf', 'NotoGujarati', 'normal')
          resolve()
        }
        reader.readAsDataURL(blob)
      })
    } catch (e) {
      console.warn('Could not load Gujarati font', e)
    }
  }

  const handleExportPDF = async () => {
    const cName = company ? (company.company_name || 'Company') : 'Company'
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    await addGujaratiFont(doc)
    const W = doc.internal.pageSize.getWidth()
    const H = doc.internal.pageSize.getHeight()
    const M = 32
    const navy = [37, 99, 235], white = [255, 255, 255], gray = [100, 116, 139];
    const dark = [30, 41, 59], stripe = [241, 245, 249];

    const hdr = () => {
      doc.setFillColor(...navy); doc.rect(0, 0, W, 26, 'F');
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
      doc.text(cName.toUpperCase(), M, 17);
      doc.setFontSize(7); doc.setTextColor(191, 219, 254);
      doc.text('SABHASAD MASTER REGISTRY', W / 2, 17, { align: 'center' });
      doc.setFontSize(7); doc.setTextColor(239, 68, 68);
      doc.text('CONFIDENTIAL', W - M, 17, { align: 'right' });
    };

    const ftr = (pg, tot) => {
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4);
      doc.line(M, H - 18, W - M, H - 18);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text(cName + ' - Member Master', M, H - 9);
      doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' });
      doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' });
    };

    hdr();
    let y = 60;

    doc.setFont('NotoGujarati', 'bold'); doc.setFontSize(14); doc.setTextColor(...navy);
    doc.text('Sabhasad Master Registry', M, y);
    doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gray);
    doc.text('Filter: ' + (statusFilter === 'all' ? 'All Members' : statusFilter.toUpperCase()) +
      '   |   Generated: ' + new Date().toLocaleString('en-IN'), M, y + 13);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
    y += 28;

    const bodyRows = filteredMembers.map(m => [
      m.member_name || '-',
      m.p_code || m.member_code || '-',
      m.village_name || '-',
      m.address_no || '-',
      m.bank_name || '-',
      m.is_active ? 'Active' : 'Inactive'
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Member Name', 'Code', 'Village', 'Address', 'Bank', 'Status']],
      body: bodyRows,
      foot: [['', '', '', '', 'TOTAL MEMBERS', filteredMembers.length + ' Nodes']],
      styles: { font: 'NotoGujarati', fontSize: 7.5, cellPadding: [4, 5], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
      headStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'bold' },
      footStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: stripe },
      theme: 'grid',
      margin: { left: M, right: M }
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i = 1; i <= tot; i++) { doc.setPage(i); ftr(i, tot); }
    doc.save('Member_Master_' + new Date().toISOString().split('T')[0] + '.pdf');
  };

  if (loading || !company) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans text-zinc-900 select-none">
      
      {/* Toast Component */}
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">
        
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4 select-none">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
              <Users size={20} className="text-zinc-600" />
              Sabhasad Master Registry
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">Management / Members</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
            >
              <FileText size={14} /> PDF
            </button>
            
            <button
              onClick={handleCreateMember}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none"
            >
              <Plus size={16} />
              ADD MEMBER
            </button>
          </div>
        </div>

        {/* Dense Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Organization</span>
            <span className="text-base font-bold font-mono text-zinc-800 mt-1 uppercase truncate">{company?.company_name || 'N/A'}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Active Members</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{members.filter(m => m.is_active).length}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Inactive</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{members.filter(m => !m.is_active).length}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Members</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{members.length}</span>
          </div>
        </div>

        {/* Table List Section */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3 select-none">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Sabhasad List
              </span>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5">
                {filteredMembers.length} RECORDS
              </span>
            </div>
            
            <div className="flex items-center flex-wrap gap-3">
              <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
                <Search size={16} className="text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, code or village..."
                  className="bg-transparent border-none outline-none text-xs text-zinc-800 placeholder:text-zinc-400 w-full md:w-48 font-mono"
                />
              </div>
              <div className="flex items-center p-0.5 bg-zinc-200 border border-zinc-300">
                {['all', 'active', 'inactive'].map((filt) => (
                  <button
                    key={filt}
                    onClick={() => setStatusFilter(filt)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase transition select-none ${statusFilter === filt ? 'bg-white text-zinc-800 font-mono font-bold border border-zinc-300' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    {filt}
                  </button>
                ))}
              </div>
              <button
                onClick={loadMembers}
                className="p-1.5 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm"
                title="Refresh Registry"
              >
                <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-white">
            {loading && members.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                <Loader className="animate-spin text-zinc-500" size={24} />
                <p className="text-xs font-mono">LOADING REGISTRY DATA...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500 select-none">
                <UserMinus size={32} className="text-zinc-400" />
                <p className="text-xs font-mono">NO MEMBERS REGISTERED</p>
                <button 
                  onClick={handleCreateMember} 
                  className="text-white border border-blue-600 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold mt-2 transition"
                >
                  REGISTER FIRST MEMBER
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse select-none font-mono text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">
                    <th className="px-4 py-2 border-r border-zinc-200">Member Info</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Village / Address</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Bank Details</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-center w-24">Status</th>
                    <th className="px-4 py-2 text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-2 border-r border-zinc-200">
                        <div className="flex flex-col">
                          <p className="text-xs font-bold text-zinc-800 font-sans uppercase tracking-tight italic">
                            {member.member_name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {member.p_code ? (
                              <span className="inline-flex items-center bg-zinc-100 text-zinc-800 font-bold text-[9px] px-1.5 py-0.5 border border-zinc-300">
                                {member.p_code}
                              </span>
                            ) : (
                              <span className="inline-flex items-center bg-zinc-100 text-zinc-700 font-bold text-[9px] px-1.5 py-0.5 border border-zinc-300">
                                {member.member_code}
                              </span>
                            )}
                            {member.p_code && (
                              <span className="text-[9px] text-zinc-400">#{member.member_code}</span>
                            )}
                            <span className="text-[10px] text-zinc-400 font-sans italic">{member.eng_name || '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-zinc-700 font-sans font-bold uppercase">
                            <MapPin size={12} className="text-zinc-500" />
                            {member.village_name || 'Unassigned'}
                          </div>
                          <div className="text-[10px] font-bold text-zinc-400 uppercase leading-none">
                            {member.address_no || 'NO ADDRESS'}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200">
                        <div className="flex flex-col">
                          <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-tight leading-none mb-0.5">{member.bank_name || 'NO BANK'}</p>
                          <p className="text-[10px] font-bold text-zinc-400">{member.full_ac_number || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold border ${member.is_active ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                          {member.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditMember(member)}
                            className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm"
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleStatusToggle(member)}
                            className={`p-1 border border-zinc-300 bg-zinc-50 transition shadow-sm ${member.is_active ? 'text-red-600 hover:bg-red-50 hover:border-red-300' : 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'}`}
                            title={member.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <Power size={13} />
                          </button>
                          <button
                            onClick={() => confirmDelete(member)}
                            className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-red-50 hover:border-red-300 text-zinc-600 hover:text-red-700 transition shadow-sm"
                            title="Delete"
                          >
                            <Trash2 size={13} />
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

      {/* Modal for Member Form */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-none" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto bg-white rounded-none border border-zinc-400 shadow-xl">
            <MemberForm
              companyId={company?.id}
              onSuccess={(msg) => {
                setMessage({ type: 'success', text: msg || 'Member saved successfully.' });
                handleFormSuccess();
              }}
              editingMember={editingMember}
              onClose={() => setShowModal(false)}
              existingMembers={members}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="DELETE MEMBER RECORD"
        message={`ARE YOU SURE YOU WANT TO DELETE "${memberToDelete?.member_name?.toUpperCase() || ''}"? THIS ACTION CANNOT BE UNDONE.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  )
}
