import React, { useState, useEffect } from 'react'
import {
  Plus, Search, Users, UserCheck,
  UserMinus, Edit3, Trash2, Power,
  ChevronRight, Phone, MapPin,
  RefreshCcw, Building2, CreditCard,
  X, Shield, AlertCircle, CheckCircle,
  Loader, Globe, Hash, FileText, Wallet
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas';
import api, { sabhasadMasterApi } from '../api'
import MemberForm from '../components/MemberForm'
import Toast from '../components/Toast'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import Loading from '../components/Loading'
import { useTranslation } from 'react-i18next'

export default function MemberMaster() {
  const { t, i18n } = useTranslation()
  const [members, setMembers] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [villageFilter, setVillageFilter] = useState('all')
  const [bankFilter, setBankFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [company, setCompany] = useState(null)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, villageFilter, bankFilter]);

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
      setMessage({ type: 'error', text: t('memberMaster.failedToLoadMembers') })
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

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && m.is_active === 1) || 
      (statusFilter === 'inactive' && m.is_active === 0);

    const matchesVillage = villageFilter === 'all' || m.village_name === villageFilter;
    const matchesBank = bankFilter === 'all' || m.bank_name === bankFilter;

    return matchesSearch && matchesStatus && matchesVillage && matchesBank;
  })

  const uniqueVillages = [...new Set((members || []).map(m => m.village_name).filter(Boolean))].sort();
  const uniqueBanks = [...new Set((members || []).map(m => m.bank_name).filter(Boolean))].sort();

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
      setMessage({ type: 'success', text: member.is_active ? t('memberMaster.userDeactivated') : t('memberMaster.userActivated') })
      loadMembers()
    } catch (error) {
      setMessage({ type: 'error', text: t('memberMaster.statusUpdateFailed') })
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
      setMessage({ type: 'success', text: t('memberMaster.memberSaved') });
      setDeleteModalOpen(false);
      setMemberToDelete(null);
      loadMembers();
    } catch (error) {
      if (error.response?.status === 404) {
        setMessage({ type: 'success', text: t('memberMaster.memberAlreadyDeleted') });
        loadMembers();
        return;
      }
      setMessage({ type: 'error', text: t('memberMaster.deleteFailed') });
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

  const guDigits = {
    '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
    '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯'
  };

  const toGujaratiDigits = (value) => String(value ?? '').replace(/[0-9]/g, (d) => guDigits[d] || d);

  const handleExportPDF = async () => {
    setLoading(true);

    const cName = company ? (company.company_name || t('common.organization')) : t('common.organization');
    const reportTitle = 'સભ્યતા માસ્ટર';
    const rows = filteredMembers.length ? filteredMembers : members;

    if (!rows.length) {
      setMessage({ type: 'error', text: t('memberMaster.noRecords') });
      return;
    }

    const tempWrap = document.createElement('div');
    tempWrap.style.position = 'fixed';
    tempWrap.style.left = '-10000px';
    tempWrap.style.top = '0';
    tempWrap.style.width = '1200px';
    tempWrap.style.background = '#fff';
    tempWrap.style.color = '#111827';
    tempWrap.style.fontFamily = '"NotoGujarati", "Noto Sans Gujarati", Arial, sans-serif';
    tempWrap.style.padding = '24px';

    const tableRows = rows.map((m, idx) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${toGujaratiDigits(idx + 1)}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-family: 'Prompt', monospace;">${m.member_name || ''}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${toGujaratiDigits(String(m.member_code || '').padStart(4, '0'))}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-family: 'Prompt', monospace;">${m.village_name || ''}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-family: 'Prompt', monospace;">${m.address_no || ''}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-family: Arial, sans-serif !important;">${m.bank_name || ''}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${m.is_active ? 'સક્રિય' : 'નિષ્ક્રિય'}</td>
      </tr>
    `).join('');

    tempWrap.innerHTML = `
      <div style="border:1px solid #cbd5e1;">
        <div style="background:#2563eb;color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:18px;font-weight:700;">${cName}</div>
          <div style="font-size:12px;font-weight:700;">${reportTitle}</div>
        </div>
        <div style="padding:18px;">
          <div style="font-size:22px;font-weight:700;color:#1f2937;margin-bottom:6px;">${reportTitle}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:16px;">કુલ સભ્યો: ${toGujaratiDigits(rows.length)} | ફિલ્ટર: ${statusFilter === 'all' ? 'બધા' : (statusFilter === 'active' ? 'સક્રિય' : 'નિષ્ક્રિય')}</div>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px 10px;border:1px solid #d1d5db;">ક્રમ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">સભ્યનું નામ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">કોડ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">ગામ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">સરનામું</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">બેંક</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">સ્થિતિ</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(tempWrap);

    // Wait for fonts to render properly
    await new Promise(resolve => setTimeout(resolve, 200));

    const canvas = await html2canvas(tempWrap, { 
      scale: 3, 
      backgroundColor: '#ffffff', 
      useCORS: true,
      allowTaint: false,
      logging: false,
      fontEmbedCSS: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&display=swap'
    });
    document.body.removeChild(tempWrap);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 24;
    const imgW = pageW - margin * 2;
    const pageHpx = ((pageH - margin * 2) * canvas.width) / imgW;

    let y = 0;
    let pageIndex = 0;
    while (y < canvas.height) {
      const sliceHeight = Math.min(pageHpx, canvas.height - y);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      const imgData = pageCanvas.toDataURL('image/png');
      const imgH = (sliceHeight * imgW) / canvas.width;

      if (pageIndex > 0) doc.addPage();
      doc.addImage(imgData, 'PNG', margin, margin, imgW, imgH);

      y += sliceHeight;
      pageIndex += 1;
    }

    doc.save(`Member_Master_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading || !company) {
    return <Loading />;
  }

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredMembers.length);
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 select-none pb-12">
      
      {/* Toast Component */}
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="w-full">
        {/* Mock Global Search Header (Optional, mimicking the image top bar) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3 text-gray-400">
            <Search size={18} />
            <span className="text-sm font-medium">{t('memberMaster.searchPlaceholder') || 'Search'}</span>
          </div>
          <div className="flex items-center gap-4 text-gray-500">
            <button><Wallet size={20} /></button>
            <button className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-blue-600 font-bold border border-slate-200">
              <Users size={16} />
            </button>
          </div>
        </div>

        {/* Page Title */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className={`text-xl font-bold text-gray-900 ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
            {t('memberMaster.title')}
          </h1>
        </div>

        <div className="px-6 py-6 space-y-6 max-w-[1500px]">
          
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 border border-gray-200 rounded px-3 py-2 bg-white">
              <Wallet size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-500">{t('memberMaster.totalMembers')}:</span>
              <span className="text-sm font-bold text-yellow-500">{toGujaratiDigits(members.length)}</span>
            </div>
            
            <button
              onClick={handleCreateMember}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded shadow-sm transition tracking-wide uppercase"
            >
              <Plus size={14} />
              {t('memberMaster.addMember')}
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative border border-gray-200 rounded bg-white px-3 py-1.5 flex items-center text-sm font-medium text-gray-600">
                <span className="text-gray-400 mr-2">{t('memberMaster.status') || 'Status'}:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent border-none outline-none cursor-pointer appearance-none pr-4 text-gray-700 font-bold"
                >
                  <option value="all">{t('memberMaster.all') || 'All'}</option>
                  <option value="active">{t('memberMaster.active') || 'Active'}</option>
                  <option value="inactive">{t('memberMaster.inactive') || 'Inactive'}</option>
                </select>
              </div>

              <div className="relative border border-gray-200 rounded bg-white px-3 py-1.5 flex items-center text-sm font-medium text-gray-600">
                <span className="text-gray-400 mr-2">{t('memberMaster.village') || 'Village'}:</span>
                <select
                  value={villageFilter}
                  onChange={(e) => setVillageFilter(e.target.value)}
                  className="bg-transparent border-none outline-none cursor-pointer appearance-none pr-4 text-gray-700 font-bold"
                >
                  <option value="all">{t('memberMaster.allVillages')}</option>
                  {uniqueVillages.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex items-center border border-gray-200 rounded bg-white px-3 py-1.5 w-full sm:w-64">
                <Search size={14} className="text-gray-400 mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('memberMaster.searchPlaceholder')}
                  className="bg-transparent border-none outline-none text-sm text-gray-800 placeholder:text-gray-400 w-full font-medium"
                />
              </div>
              
              <div className="relative border border-gray-200 rounded bg-white px-3 py-1.5 flex items-center text-sm font-medium text-gray-600">
                <span className="text-gray-400 mr-2">{t('memberMaster.bank') || 'Bank'}:</span>
                <select
                  value={bankFilter}
                  onChange={(e) => setBankFilter(e.target.value)}
                  className="bg-transparent border-none outline-none cursor-pointer appearance-none pr-4 text-gray-700 font-bold"
                >
                  <option value="all">{t('memberMaster.allBanks')}</option>
                  {uniqueBanks.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="border border-gray-200 rounded overflow-hidden bg-white">
            {loading && members.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-400">
                <Loader className="animate-spin text-gray-400" size={24} />
                <p className="text-sm">{t('memberMaster.loadingData')}</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-500">
                <UserMinus size={32} className="text-gray-300" />
                <p className="text-sm font-medium">{t('memberMaster.noMembers')}</p>
              </div>
            ) : (
              <table className={`w-full text-left border-collapse ${i18n.language === 'gu' ? 'font-sans text-xs' : 'text-sm'}`}>
                <thead>
                  <tr className="bg-white border-b border-gray-200 text-gray-500 font-medium text-xs">
                    <th className="px-5 py-4 font-semibold">{t('memberMaster.memberInfo')}</th>
                    <th className="px-5 py-4 font-semibold">{t('memberMaster.villageAddress')}</th>
                    <th className="px-5 py-4 font-semibold">{t('memberMaster.bankDetails')}</th>
                    <th className="px-5 py-4 font-semibold w-28">{t('memberMaster.status')}</th>
                    <th className="px-5 py-4 font-semibold text-center w-28">{t('memberMaster.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedMembers.map((member) => (
                    <tr key={member.id} className="bg-white hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className={`font-medium text-gray-800 text-[13px] ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
                            {i18n.language === 'en' ? (member.eng_name || member.member_name) : (member.member_name_gu || member.member_name)}
                          </span>
                          <span className="text-xs text-gray-500 mt-0.5 dynamic-en" style={{ '--en-text': `"${member.p_code || member.member_code}"` }} translate="no"></span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-[13px] text-gray-700">{member.village_name || '-'}</span>
                          {member.address_no && (
                            <span className="text-xs text-gray-500 mt-0.5">{member.address_no}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-[13px] text-gray-700 dynamic-en" style={{ '--en-text': `"${member.bank_name || '-'}"` }} translate="no"></span>
                          <span className="text-xs text-gray-500 mt-0.5 font-mono dynamic-en" style={{ '--en-text': `"${member.full_ac_number || '-'}"` }} translate="no"></span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold text-white ${member.is_active ? 'bg-teal-500' : 'bg-yellow-500'}`}>
                          {member.is_active ? t('memberMaster.active') : t('memberMaster.inactive')}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-3 text-gray-400">
                          <button onClick={() => handleEditMember(member)} className="hover:text-blue-600 transition" title={t('memberMaster.edit')}><Edit3 size={15} /></button>
                          <button onClick={() => handleStatusToggle(member)} className={`hover:text-blue-600 transition`} title={member.is_active ? t('memberMaster.deactivate') : t('memberMaster.activate')}><Power size={15} /></button>
                          <button onClick={() => confirmDelete(member)} className="hover:text-red-500 transition" title={t('memberMaster.delete')}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination */}
          {!loading && filteredMembers.length > 0 && (
            <div className="flex items-center justify-between py-2 text-sm text-gray-500">
              <div>
                {i18n.language === 'gu' ? (
                  <span>{toGujaratiDigits(startIndex + 1)} થી {toGujaratiDigits(endIndex)} (કુલ {toGujaratiDigits(filteredMembers.length)})</span>
                ) : (
                  <span>Showing {startIndex + 1}-{endIndex} of {filteredMembers.length} records</span>
                )}
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-2">...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`px-3 py-1.5 border rounded transition ${currentPage === p ? 'bg-blue-600 border-blue-600 text-white font-bold' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                        >
                          {toGujaratiDigits(p)}
                        </button>
                      </React.Fragment>
                    );
                  })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal for Member Form */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-none" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto bg-white rounded-md border border-slate-300 shadow-xl">
            <MemberForm
              companyId={company?.id}
              onSuccess={(msg) => {
                setMessage({ type: 'success', text: msg || t('memberMaster.memberSaved') });
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
          title={t('memberMaster.deleteTitle')}
          message={t('memberMaster.deleteConfirm', { name: memberToDelete?.member_name || '' })}
          onConfirm={handleDelete}
          onCancel={() => setDeleteModalOpen(false)}
        />
    </div>
  )
}
