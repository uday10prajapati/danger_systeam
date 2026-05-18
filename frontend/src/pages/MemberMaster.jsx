import React, { useState, useEffect } from 'react'
import {
  Plus, Search, Users, UserCheck,
  UserMinus, Edit3, Trash2, Power,
  ChevronRight, Phone, MapPin,
  RefreshCcw, Building2, CreditCard,
  X, Shield, AlertCircle, CheckCircle,
  Loader, Globe, Hash, FileText
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

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans text-zinc-900 select-none">
      
      {/* Toast Component */}
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">
        
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4 select-none">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
              <Users size={24} className="text-zinc-600" />
              {t('memberMaster.title')}
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">{t('memberMaster.managementMembers')}</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
            >
              <FileText size={14} /> {t('common.pdf')}
            </button>
            
            <button
              onClick={handleCreateMember}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none"
            >
              <Plus size={16} />
              {t('memberMaster.addMember')}
            </button>
          </div>
        </div>

        {/* Dense Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">{t('memberMaster.activeMembers')}</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{toGujaratiDigits(members.filter(m => m.is_active).length)}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">{t('memberMaster.inactive')}</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{toGujaratiDigits(members.filter(m => !m.is_active).length)}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">{t('memberMaster.totalMembers')}</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{toGujaratiDigits(members.length)}</span>
          </div>
        </div>

        {/* Table List Section */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3 select-none">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                {t('memberMaster.listTitle')}
              </span>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5">
                {filteredMembers.length} {t('memberMaster.records')}
              </span>
            </div>
            
            <div className="flex items-center flex-wrap gap-3">
              <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
                <Search size={16} className="text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('memberMaster.searchPlaceholder')}
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
                    {t(`memberMaster.${filt}`)}
                  </button>
                ))}
              </div>

              <select
                value={villageFilter}
                onChange={(e) => setVillageFilter(e.target.value)}
                className={`bg-white border border-zinc-300 px-2 py-1.5 outline-none focus:border-zinc-500 min-w-[120px] ${i18n.language === 'gu' ? 'font-prompt text-xs' : 'text-[10px] font-bold uppercase'}`}
              >
                <option value="all">{t('memberMaster.allVillages')}</option>
                {uniqueVillages.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>

              <select
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                className="bg-white border border-zinc-300 px-2 py-1.5 text-[10px] font-bold uppercase outline-none focus:border-zinc-500 min-w-[120px] force-en font-sans"
              >
                <option value="all">{t('memberMaster.allBanks')}</option>
                {uniqueBanks.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <button
                onClick={loadMembers}
                className="p-1.5 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm"
                title={t('memberMaster.refreshRegistry')}
              >
                <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-white">
            {loading && members.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                <Loader className="animate-spin text-zinc-500" size={24} />
                <p className="text-xs font-mono">{t('memberMaster.loadingData')}</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500 select-none">
                <UserMinus size={32} className="text-zinc-400" />
                <p className="text-xs font-mono">{t('memberMaster.noMembers')}</p>
                <button 
                  onClick={handleCreateMember} 
                  className="text-white border border-blue-600 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold mt-2 transition"
                >
                  {t('memberMaster.registerFirst')}
                </button>
              </div>
            ) : (
              <table className={`w-full text-left border-collapse select-none text-sm ${i18n.language === 'gu' ? 'font-sans' : 'font-mono'}`}>
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">
                    <th className="px-4 py-3 border-r border-zinc-200">{t('memberMaster.memberInfo')}</th>
                    <th className="px-4 py-3 border-r border-zinc-200">{t('memberMaster.villageAddress')}</th>
                    <th className="px-4 py-3 border-r border-zinc-200">{t('memberMaster.bankDetails')}</th>
                    <th className="px-4 py-3 border-r border-zinc-200 text-center w-24">{t('memberMaster.status')}</th>
                    <th className="px-4 py-3 text-center w-28">{t('memberMaster.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3 border-r border-zinc-200">
                        <div className="flex flex-col">
                          <p className={`text-base font-bold text-zinc-900 leading-normal ${i18n.language === 'gu' ? 'font-prompt' : 'uppercase italic'}`}>
                            {i18n.language === 'en' ? (member.eng_name || member.member_name) : (member.member_name_gu || member.member_name)}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {member.p_code ? (
                              <span 
                                className="inline-flex items-center bg-zinc-100 text-zinc-800 font-bold text-[9px] px-1.5 py-0.5 border border-zinc-300 dynamic-en"
                                style={{ '--en-text': `"${member.p_code}"` }}
                                translate="no"
                              ></span>
                            ) : (
                              <span 
                                className="inline-flex items-center bg-zinc-100 text-zinc-700 font-bold text-[9px] px-1.5 py-0.5 border border-zinc-300 dynamic-en"
                                style={{ '--en-text': `"${member.member_code}"` }}
                                translate="no"
                              ></span>
                            )}
                            {member.p_code && (
                              <span 
                                className="text-[9px] text-zinc-400 dynamic-en"
                                style={{ '--en-text': `"#${member.member_code}"` }}
                                translate="no"
                              ></span>
                            )}
                            <span className="text-[10px] text-zinc-400 italic force-en notranslate" translate="no">{member.eng_name || '-'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-zinc-700 font-bold">
                            <MapPin size={12} className="text-zinc-500" />
                            {member.village_name || t('memberMaster.unassigned')}
                          </div>
                          <div className="text-[10px] font-bold text-zinc-400 leading-none">
                            {member.address_no || t('memberMaster.noAddress')}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 notranslate google-notranslate force-en" translate="no">
                        <div className="flex flex-col">
                          <span 
                            className="text-[10px] font-bold text-zinc-700 uppercase tracking-tight leading-none mb-0.5 dynamic-en" 
                            style={{ '--en-text': `"${member.bank_name || 'N/A'}"` }}
                            translate="no"
                          ></span>
                          <span 
                            className="text-[10px] font-bold text-zinc-400 dynamic-en" 
                            style={{ '--en-text': `"${member.full_ac_number || 'N/A'}"` }}
                            translate="no"
                          ></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold border ${member.is_active ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                           {member.is_active ? t('memberMaster.active') : t('memberMaster.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditMember(member)}
                            className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm"
                            title={t('memberMaster.edit')}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleStatusToggle(member)}
                            className={`p-1 border border-zinc-300 bg-zinc-50 transition shadow-sm ${member.is_active ? 'text-red-600 hover:bg-red-50 hover:border-red-300' : 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'}`}
                            title={member.is_active ? t('memberMaster.deactivate') : t('memberMaster.activate')}
                          >
                            <Power size={13} />
                          </button>
                          <button
                            onClick={() => confirmDelete(member)}
                            className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-red-50 hover:border-red-300 text-zinc-600 hover:red-700 transition shadow-sm"
                            title={t('memberMaster.delete')}
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
