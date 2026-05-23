import React, { useState, useEffect } from 'react'
import {
  Plus, Search, Users, UserCheck,
  UserMinus, Edit3, Trash2, Power,
  ChevronRight, ChevronLeft, Phone, MapPin,
  RefreshCcw, Building2, CreditCard,
  X, Shield, AlertCircle, CheckCircle,
  Loader, Globe, Hash, FileText, Wallet,
  Info, Copy, Check, Filter
} from 'lucide-react'
import { exportToPDF } from '../utils/pdfExporter'
import api, { sabhasadMasterApi } from '../api'
import MemberForm from '../components/MemberForm'
import Toast from '../components/Toast'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import Loading from '../components/Loading'
import { useTranslation } from 'react-i18next'

const labels = {
  en: {
    classAll: 'All Classes',
    classRegular: 'Regular',
    classNominal: 'Nominal',
    nominalBadge: 'Nominal',
    regularBadge: 'Regular',
    selectMember: 'Select a Sabhasad',
    selectMemberDesc: 'Choose a member from the directory list on the left to inspect their registry details, bank accounts, and Bardan records.',
    backToList: 'Back to List',
    memberCode: 'Member Code',
    pCode: 'P-Code',
    tabGeneral: 'Identity',
    tabBank: 'Banking',
    tabBardan: 'Bardan',
    gujaratiName: 'Name (Gujarati)',
    englishName: 'Name (English)',
    phone: 'Phone Number',
    village: 'Village',
    address: 'Address',
    bank: 'Bank Name',
    branch: 'Branch Name',
    accountNo: 'Account Number',
    ifsc: 'IFSC Code',
    classification: 'Classification',
    bardanOpeningBalance: 'Bardan Opening Balance',
    status: 'Status',
    bardanOpening: 'Bardan Opening',
    memberInfo: 'Member Info',
    villageAddress: 'Village & Address',
    bankDetails: 'Bank Details',
    actions: 'Actions',
    filterTitle: 'Filter Parameters',
    statusFilter: 'Status Filter',
    villageFilter: 'Village Filter',
    bankFilter: 'Bank Filter',
    allStatus: 'All Status',
    allVillages: 'All Villages',
    allBanks: 'All Banks',
    active: 'Active',
    inactive: 'Inactive',
    clearFilters: 'Clear Filters',
    resetAll: 'Reset All',
    applyFilters: 'Apply Filters',
    filtersActive: 'Filters Active'
  },
  gu: {
    classAll: 'બધા વર્ગ',
    classRegular: 'નિયમિત',
    classNominal: 'નામૂર',
    nominalBadge: 'નામૂર',
    regularBadge: 'નિયમિત',
    selectMember: 'સભાસદ પસંદ કરો',
    selectMemberDesc: 'તેમની રજિસ્ટ્રી વિગતો, બેંક ખાતા અને બારદાન રેકોર્ડ્સ તપાસવા માટે ડાબી બાજુની સૂચિમાંથી સભ્ય પસંદ કરો.',
    backToList: 'સૂચિ પર પાછા જાઓ',
    memberCode: 'સભ્ય કોડ',
    pCode: 'પી-કોડ',
    tabGeneral: 'ઓળખ',
    tabBank: 'બેંકિંગ',
    tabBardan: 'બારદાન',
    gujaratiName: 'નામ (ગુજરાતી)',
    englishName: 'નામ (અંગ્રેજી)',
    phone: 'ફોન નંબર',
    village: 'ગામ',
    address: 'સરનામું',
    bank: 'બેંક નામ',
    branch: 'શાખાનું નામ',
    accountNo: 'ખાતા નંબર',
    ifsc: 'આઈ.એફ.એસ.સી કોડ',
    classification: 'વર્ગીકરણ',
    bardanOpeningBalance: 'બારદાન શરૂઆતનું બેલેન્સ',
    status: 'સ્થિતિ',
    bardanOpening: 'બારદાન શરૂઆત',
    memberInfo: 'સભ્ય માહિતી',
    villageAddress: 'ગામ અને સરનામું',
    bankDetails: 'બેંક વિગતો',
    actions: 'ક્રિયાઓ',
    filterTitle: 'ફિલ્ટર વિગતો',
    statusFilter: 'સ્થિતિ ફિલ્ટર',
    villageFilter: 'ગામ ફિલ્ટર',
    bankFilter: 'બેંક ફિલ્ટર',
    allStatus: 'બધી સ્થિતિ',
    allVillages: 'બધા ગામો',
    allBanks: 'બધી બેંક',
    active: 'સક્રિય',
    inactive: 'નિષ્ક્રિય',
    clearFilters: 'ફિલ્ટર સાફ કરો',
    resetAll: 'બધું રીસેટ કરો',
    applyFilters: 'ફિલ્ટર લાગુ કરો',
    filtersActive: 'ફિલ્ટર સક્રિય છે'
  }
}

const getAvatarGradient = (name) => {
  const hash = Array.from(name || '').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'from-slate-400 to-slate-500',
    'from-zinc-400 to-zinc-500',
    'from-neutral-400 to-neutral-500',
    'from-gray-400 to-gray-500',
    'from-slate-500 to-zinc-600',
    'from-zinc-500 to-slate-600'
  ];
  return gradients[hash % gradients.length];
};

const getInitials = (member, isGu) => {
  const name = isGu
    ? (member.member_name_gu || member.member_name || member.eng_name || '')
    : (member.eng_name || member.member_name || member.member_name_gu || '');
  if (!name) return 'M';
  return name.trim().charAt(0).toUpperCase();
};

// Bank names translation mapping
const bankTranslations = {
  'BDHI': 'બીધીધી',
  'BDHI Bank': 'બીધીધી બેંક',
  'SBI': 'એસ.બી.આઈ.',
  'State Bank of India': 'ભારતીય સ્ટેટ બેંક',
  'HDFC': 'એચ.ડી.એફ.સી.',
  'HDFC Bank': 'એચ.ડી.એફ.સી. બેંક',
  'ICICI': 'આઈ.સી.આઈ.સી.આઈ.',
  'ICICI Bank': 'આઈ.સી.આઈ.સી.આઈ. બેંક',
  'Axis': 'ધરા',
  'Axis Bank': 'ધરા બેંક',
  'IDBI': 'આઈ.ડી.બી.આઈ.',
  'IDBI Bank': 'આઈ.ડી.બી.આઈ. બેંક',
  'BOI': 'બી.ઓ.આઈ.',
  'Bank of India': 'ભારતીય બેંક',
  'Union': 'સંઘ',
  'Union Bank': 'સંઘ બેંક',
  'Central': 'કેન્દ્રીય',
  'Central Bank': 'કેન્દ્રીય બેંક',
  'Dena': 'દેણા',
  'Dena Bank': 'દેણા બેંક',
  'Punjab': 'પંજાબ',
  'Punjab National Bank': 'પંજાબ નેશનલ બેંક'
};

const getDisplayBankName = (bankName, isGu) => {
  if (!bankName) return '';
  return isGu ? (bankTranslations[bankName] || bankName) : bankName;
};

export default function MemberMaster() {
  const { t, i18n } = useTranslation()
  const isGu = i18n.language === 'gu'
  const l = labels[isGu ? 'gu' : 'en']

  const [members, setMembers] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [villageFilter, setVillageFilter] = useState('all')
  const [bankFilter, setBankFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [company, setCompany] = useState(null)

  // Detail panel states
  const [selectedMemberId, setSelectedMemberId] = useState(null)
  const [activeDetailTab, setActiveDetailTab] = useState('general') // 'general', 'bank', 'bardan'
  const [mobileShowDetail, setMobileShowDetail] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false)

  const hasActiveFilters = statusFilter !== 'all' || villageFilter !== 'all' || bankFilter !== 'all'

  const clearFilters = () => {
    setStatusFilter('all')
    setVillageFilter('all')
    setBankFilter('all')
    setCurrentPage(1)
  }

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, villageFilter, bankFilter, classFilter])

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
      m.member_name_gu?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.eng_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.member_code?.toString().includes(searchQuery) ||
      m.p_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone?.includes(searchQuery) ||
      m.village_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.village_name_gu?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.village_name_en?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && m.is_active === 1) ||
      (statusFilter === 'inactive' && m.is_active === 0)

    const matchesVillage = villageFilter === 'all' || String(m.village_code || '') === String(villageFilter)
    const matchesBank = bankFilter === 'all' || m.bank_name === bankFilter

    const isNominal = m.nominal_member === 'true' || m.nominal_member === true || m.nominal_member === 1
    const matchesClass = classFilter === 'all' ||
      (classFilter === 'regular' && !isNominal) ||
      (classFilter === 'nominal' && isNominal)

    return matchesSearch && matchesStatus && matchesVillage && matchesBank && matchesClass
  })

  const uniqueVillages = Array.from(
    new Map(
      (members || [])
        .filter(m => m.village_code)
        .map(m => [String(m.village_code), { code: String(m.village_code), name: displayVillageName(m) || m.village_name || '' }])
    ).values()
  ).filter(v => v.name).sort((a, b) => a.name.localeCompare(b.name))
  const uniqueBanks = [...new Set((members || []).map(m => m.bank_name).filter(Boolean))].sort()

  const selectedMember = members.find(m => m.id === selectedMemberId)

  const handleSelectMember = (id) => {
    setSelectedMemberId(id)
    setMobileShowDetail(true)
    setTimeout(() => {
      document.getElementById('member-details-anchor')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleCopyToClipboard = (text, id) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const fmtVal = (val) => {
    return isGu ? toGujaratiDigits(val) : val
  }

  function displayMemberName(member) {
    return isGu
      ? (member.member_name_gu || member.member_name || member.eng_name || '')
      : (member.eng_name || member.member_name || member.member_name_gu || '')
  }

  function displayVillageName(member) {
    return isGu
      ? (member.village_name_gu || member.village_name || member.village_name_en || '')
      : (member.village_name_en || member.village_name || member.village_name_gu || '')
  }

  const fmtBardan = (val) => {
    const num = parseFloat(val) || 0
    const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return isGu ? toGujaratiDigits(formatted) : formatted
  }

  // Stats Calculations
  const statTotalMembers = members.length
  const statActiveMembers = members.filter(m => m.is_active === 1).length
  const statNominalMembers = members.filter(m => m.nominal_member === 'true' || m.nominal_member === true || m.nominal_member === 1).length
  const statRegularMembers = statTotalMembers - statNominalMembers
  const statBardanOpening = members.reduce((sum, m) => sum + (parseFloat(m.bardan_opening) || 0), 0)

  const handleStatusToggle = async (member) => {
    try {
      const updatedMember = { ...member, is_active: member.is_active ? 0 : 1 }
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
      }

      await sabhasadMasterApi.updateSabhasad(member.id, payload)
      setMessage({ type: 'success', text: member.is_active ? t('memberMaster.userDeactivated') : t('memberMaster.userActivated') })
      loadMembers()
    } catch (error) {
      setMessage({ type: 'error', text: t('memberMaster.statusUpdateFailed') })
    }
  }

  const confirmDelete = (member) => {
    setMemberToDelete(member)
    setDeleteModalOpen(true)
  }

  const handleDelete = async () => {
    if (!memberToDelete) return
    try {
      setLoading(true)
      await sabhasadMasterApi.deleteSabhasad(memberToDelete.id)
      setMessage({ type: 'success', text: t('memberMaster.memberSaved') })
      setDeleteModalOpen(false)

      if (selectedMemberId === memberToDelete.id) {
        setSelectedMemberId(null)
        setMobileShowDetail(false)
      }

      setMemberToDelete(null)
      loadMembers()
    } catch (error) {
      if (error.response?.status === 404) {
        setMessage({ type: 'success', text: t('memberMaster.memberAlreadyDeleted') })
        loadMembers()
        return
      }
      setMessage({ type: 'error', text: t('memberMaster.deleteFailed') })
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
  }

  const toGujaratiDigits = (value) => String(value ?? '').replace(/[0-9]/g, (d) => guDigits[d] || d)

  const handleExportPDF = async () => {
    const rows = filteredMembers.length ? filteredMembers : members

    if (!rows.length) {
      setMessage({ type: 'error', text: t('memberMaster.noRecords') })
      return
    }

    const columns = [
      {
        header: isGu ? 'ક્રમ' : '#',
        align: 'center',
        width: '6%',
        render: (row, idx) => isGu ? toGujaratiDigits(idx + 1) : (idx + 1)
      },
      {
        header: isGu ? 'સભ્યનું નામ' : 'Member Name',
        align: 'left',
        width: '28%',
        render: (row) => displayMemberName(row) || '',
        usePromptFont: isGu
      },
      {
        header: isGu ? 'કોડ' : 'Code',
        align: 'center',
        width: '10%',
        render: (row) => isGu ? toGujaratiDigits(String(row.member_code || '').padStart(4, '0')) : String(row.member_code || '').padStart(4, '0')
      },
      {
        header: isGu ? 'ગામ' : 'Village',
        align: 'left',
        width: '18%',
        render: (row) => displayVillageName(row) || '',
        usePromptFont: isGu
      },
      {
        header: isGu ? 'સરનામું' : 'Address',
        align: 'left',
        width: '14%',
        render: (row) => row.address_no || '',
        usePromptFont: isGu
      },
      {
        header: 'Bank',
        align: 'left',
        width: '14%',
        render: (row) => getDisplayBankName(row.bank_name, isGu) || ''
      },
      {
        header: isGu ? 'સ્થિતિ' : 'Status',
        align: 'center',
        width: '10%',
        render: (row) => row.is_active ? (isGu ? 'સક્રિય' : 'Active') : (isGu ? 'નિષ્ક્રિય' : 'Inactive')
      }
    ]

    const metaInfo = [
      {
        label: isGu ? 'કુલ સભ્યો' : 'Total Members',
        value: isGu ? toGujaratiDigits(rows.length) : rows.length
      },
      {
        label: isGu ? 'સ્થિતિ' : 'Status',
        value: statusFilter === 'all'
          ? (isGu ? 'બધા' : 'All')
          : (statusFilter === 'active' ? (isGu ? 'સક્રિય' : 'Active') : (isGu ? 'નિષ્ક્રિય' : 'Inactive'))
      }
    ]

    await exportToPDF({
      title: isGu ? 'સભ્યતા માસ્ટર' : 'Member Master',
      columns,
      rows,
      isGu,
      metaInfo,
      filename: `Member_Master_${new Date().toISOString().split('T')[0]}.pdf`,
      onStart: () => setLoading(true),
      onComplete: () => setLoading(false)
    })
  }

  if (loading || !company) {
    return <Loading />
  }

  const ITEMS_PER_PAGE = 10
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE) || 1
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredMembers.length)
  const paginatedMembers = filteredMembers.slice(startIndex, endIndex)

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 select-none pb-12">

      {/* Toast Component */}
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">

        {/* Minimalist Stats Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{isGu ? "કુલ સભાસદો" : "Total Members"}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{toGujaratiDigits(statTotalMembers)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{isGu ? "નિયમિત સભાસદો" : "Regular Members"}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{toGujaratiDigits(statRegularMembers)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{isGu ? "નામંજૂર સભાસદો" : "Nominal Members"}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{toGujaratiDigits(statNominalMembers)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{isGu ? "કુલ બારદાન ઓપનિંગ" : "Total Bardan Opening"}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1 font-mono">{fmtBardan(statBardanOpening)}</span>
          </div>
        </div>

        {/* Minimal Classic Registry Directory Wrapper (Full Width) */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none">

          {/* Table Control Header Bar */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-extrabold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>
                {t('memberMaster.title')}
              </span>
              <span className="bg-slate-200 text-slate-600 font-bold force-en text-[12px] px-1.5 py-0.5 rounded-sm">
                {filteredMembers.length} {t('villageMaster.records') || "Records"}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Bar */}
              <div className="relative flex items-center border border-slate-200 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] rounded-md bg-white px-2.5 py-1 transition-colors w-48 sm:w-64">
                <Search size={12} className="text-slate-400 mr-1.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder={t('memberMaster.searchPlaceholder') || "Search name or code..."}
                  className="bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-300 w-full font-semibold"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-0.5 text-slate-300 hover:text-slate-600 transition">
                    <X size={10} />
                  </button>
                )}
              </div>

              <button
                onClick={handleCreateMember}
                className="h-7 flex items-center gap-1.5 px-2.5 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[12px] font-bold rounded-md transition shadow-sm cursor-pointer uppercase tracking-wider"
              >
                <Plus size={13} />
                <span>{t('memberMaster.addMember') || "New Member"}</span>
              </button>
              <button
                onClick={() => setShowFiltersDrawer(true)}
                className={`h-7 flex items-center gap-1.5 px-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer relative shadow-sm ${hasActiveFilters ? 'bg-blue-50 border-blue-200 text-[#1d5f84]' : ''
                  }`}
                title={t('sabhasadLedgerSummary.filters') || "Filters"}
              >
                <Filter size={13} className={hasActiveFilters ? "text-[#1d5f84]" : "text-slate-500"} />
                <span className="text-[12px] font-bold uppercase tracking-wider">{t('sabhasadLedgerSummary.filters') || "Filters"}</span>
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
                  </span>
                )}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="h-7 flex items-center gap-1.5 px-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
                  title={l.clearFilters}
                >
                  <X size={13} className="text-slate-500" />
                  <span className="text-[12px] font-bold uppercase tracking-wider">{l.clearFilters}</span>
                </button>
              )}
              <button
                onClick={handleExportPDF}
                title={t('common.pdf') || "PDF Report"}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <FileText size={13} className="text-slate-500" />
              </button>

              <button
                onClick={loadMembers}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
                title="Refresh"
              >
                <RefreshCcw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Directory Filter Content Panel */}
          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100">
            {/* Classification Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'all', label: l.classAll, count: statTotalMembers },
                { id: 'regular', label: l.classRegular, count: statRegularMembers },
                { id: 'nominal', label: l.classNominal, count: statNominalMembers }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setClassFilter(tab.id)
                    setCurrentPage(1)
                  }}
                  className={`px-2.5 py-1 text-sm font-bold rounded-md transition-all shrink-0 cursor-pointer border ${classFilter === tab.id
                    ? 'bg-[#1d5f84] border-[#1d5f84] text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <span>{tab.label}</span>
                  <span className={`ml-1 text-[12px] px-1.5 py-0.2 rounded-md font-bold font-mono ${classFilter === tab.id ? 'bg-[#154662] text-slate-200' : 'bg-slate-100 text-slate-500'
                    }`}>
                    {fmtVal(tab.count)}
                  </span>
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  {l.filtersActive}
                </span>
              </div>
            )}
          </div>

          {/* Full Width Table Registry */}
          <div className="overflow-x-auto w-full">
            {filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-center p-4">
                <UserMinus size={32} className="text-slate-300" />
                <p className="text-sm font-bold text-slate-400">{t('memberMaster.noMembers')}</p>
                <button
                  onClick={handleCreateMember}
                  className="text-sm font-bold text-blue-600 hover:text-blue-800 transition uppercase tracking-wider cursor-pointer"
                >
                  + {t('memberMaster.addMember')}
                </button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 border-collapse text-[12px]">
                <thead className="bg-slate-50 font-sans">
                  <tr>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-12">#</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-16">{isGu ? "કોડ" : "Code"}</th>
                    <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{isGu ? "સભાસદનું નામ" : "Member Name"}</th>
                    <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{isGu ? "ગામ" : "Village"}</th>
                    <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{isGu ? "ફોન" : "Phone"}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-24">{isGu ? "વર્ગીકરણ" : "Classification"}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-24">{isGu ? "સ્થિતિ" : "Status"}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 w-28">{isGu ? "ક્રિયાઓ" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {paginatedMembers.map((member, idx) => {
                    const isNominal = member.nominal_member === 'true' || member.nominal_member === true || member.nominal_member === 1;
                    const globalIdx = startIndex + idx + 1;
                    return (
                      <tr
                        key={member.id}
                        className="hover:bg-slate-50/75 transition-colors cursor-pointer select-none"
                        onClick={() => handleSelectMember(member.id)}
                      >
                        <td className="px-3.5 py-2 text-center font-mono text-slate-500 border-r border-slate-100">{fmtVal(globalIdx)}</td>
                        <td className="px-3.5 py-2 text-center font-mono font-bold text-[#1d5f84] border-r border-slate-100">{fmtVal(member.member_code)}</td>
                        <td className="px-3.5 py-2 border-r border-slate-100 font-bold text-slate-800" style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}>
                          <div className="flex flex-col">
                            <span>{displayMemberName(member) || '—'}</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2 border-r border-slate-100 text-slate-600 font-medium" style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}>{displayVillageName(member) || '—'}</td>
                        <td className="px-3.5 py-2 border-r border-slate-100 font-mono font-bold text-slate-600">{member.phone ? fmtVal(member.phone) : '—'}</td>
                        <td className="px-3.5 py-2 text-center border-r border-slate-100">
                          <span className={`text-[12px] font-bold px-1.5 py-0.5 rounded-md border ${isNominal
                            ? 'bg-amber-50 border-amber-100 text-amber-600'
                            : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                            }`}>
                            {isNominal ? l.nominalBadge : l.regularBadge}
                          </span>
                        </td>
                        <td className="px-3.5 py-2 text-center border-r border-slate-100" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleStatusToggle(member)}
                            className={`px-2 py-0.5 text-[12px] font-bold rounded-md border transition cursor-pointer ${member.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              }`}
                          >
                            {member.is_active ? t('memberMaster.active') : t('memberMaster.inactive')}
                          </button>
                        </td>
                        <td className="px-3.5 py-2 text-center flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSelectMember(member.id)}
                            className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            title={t('common.details') || "Details"}
                          >
                            <Info size={11} />
                          </button>
                          <button
                            onClick={() => handleEditMember(member)}
                            className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            title={t('common.edit') || "Edit"}
                          >
                            <Edit3 size={11} />
                          </button>
                          <button
                            onClick={() => confirmDelete(member)}
                            className="p-1 border border-rose-100 rounded text-rose-600 bg-rose-50 hover:bg-rose-150 transition cursor-pointer"
                            title={t('common.delete') || "Delete"}
                          >
                            <Trash2 size={11} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Directory Pagination Panel */}
          {filteredMembers.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                {startIndex + 1}-{endIndex} / {filteredMembers.length}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 transition text-[10px] font-extrabold text-slate-600 disabled:cursor-not-allowed cursor-pointer"
                >
                  Prev
                </button>
                <span className="text-sm font-bold text-slate-600 px-1.5">
                  {fmtVal(currentPage)} / {fmtVal(totalPages)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 transition text-[10px] font-extrabold text-slate-600 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal for Member Details Console */}
        {selectedMemberId && selectedMember && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-150" onClick={() => setSelectedMemberId(null)} />
            <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-lg p-5 shadow-xl z-10 flex flex-col animate-in fade-in zoom-in-95 duration-150">

              {/* Close Button */}
              <button
                onClick={() => setSelectedMemberId(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 transition cursor-pointer bg-slate-50 rounded-md hover:bg-slate-100 border border-slate-200/50"
                title="Close details"
              >
                <X size={14} />
              </button>

              {/* Profile Header */}
              <div className="border-b border-slate-100 pb-4 mb-4 mt-2">
                <div className="flex items-center gap-3">
                  {/* Large Profile bubble */}
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getAvatarGradient(displayMemberName(selectedMember) || selectedMember.eng_name || selectedMember.member_name)} text-white flex items-center justify-center text-sm font-black shrink-0 uppercase border border-slate-300/35 relative`}>
                    {getInitials(selectedMember, isGu)}
                  </div>

                  <div className="text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        className="font-extrabold text-slate-800 text-base leading-tight"
                        style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}
                      >
                        {displayMemberName(selectedMember)}
                      </h2>
                      <span className={`px-2 py-0.5 rounded-md text-[12px] font-bold tracking-wider uppercase border ${(selectedMember.nominal_member === 'true' || selectedMember.nominal_member === true || selectedMember.nominal_member === 1)
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        }`}>
                        {(selectedMember.nominal_member === 'true' || selectedMember.nominal_member === true || selectedMember.nominal_member === 1)
                          ? l.nominalBadge
                          : l.regularBadge
                        }
                      </span>
                    </div>
                    {!isGu && (
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono mt-0.5">
                        {selectedMember.eng_name || '-'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Identification Badges */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-600 rounded-md">
                    <span className="text-[12px] text-slate-400 uppercase">{l.memberCode}:</span>
                    <span className="font-mono text-[#1d5f84]">{fmtVal(selectedMember.member_code)}</span>
                  </span>
                  {selectedMember.p_code && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-600 rounded-md">
                      <span className="text-[12px] text-slate-400 uppercase">{l.pCode}:</span>
                      <span className="font-mono text-[#1d5f84]">{selectedMember.p_code}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Console Tab Header */}
              <div className="flex border-b border-slate-100 mb-4 w-full shrink-0">
                {[
                  { id: 'general', label: l.tabGeneral, icon: Info },
                  { id: 'bank', label: l.tabBank, icon: CreditCard },
                  { id: 'bardan', label: l.tabBardan, icon: Wallet }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDetailTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1 py-2 text-[12px] font-bold transition relative border-b-2 cursor-pointer ${activeDetailTab === tab.id
                      ? 'text-[#1d5f84] border-[#1d5f84]'
                      : 'text-slate-400 hover:text-slate-800 border-transparent'
                      }`}
                  >
                    <tab.icon size={12} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Console Tab Content */}
              <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-1.5">

                {activeDetailTab === 'general' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                      <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? l.gujaratiName : l.englishName}</p>
                      <p
                        className={`text-sm font-bold text-slate-800 ${isGu ? '' : 'uppercase font-mono'}`}
                        style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}
                      >
                        {displayMemberName(selectedMember) || '-'}
                      </p>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                      <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{l.memberCode}</p>
                      <p className="text-sm font-bold text-[#1d5f84] font-mono">{fmtVal(selectedMember.member_code)}</p>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                      <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{l.pCode}</p>
                      <p className="text-sm font-bold text-slate-800 font-mono text-[#1d5f84]">{selectedMember.p_code || '-'}</p>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md sm:col-span-2 flex items-center justify-between gap-4">
                      <div className="text-left">
                        <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{l.phone}</p>
                        <p className="text-sm font-bold text-slate-800 font-mono">{selectedMember.phone ? fmtVal(selectedMember.phone) : '-'}</p>
                      </div>
                      {selectedMember.phone && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyToClipboard(selectedMember.phone, `split-phone-${selectedMember.id}`)
                          }}
                          className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 transition text-slate-500 rounded-md cursor-pointer"
                          title="Copy Phone"
                        >
                          {copiedId === `split-phone-${selectedMember.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        </button>
                      )}
                    </div>

                    <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                      <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{l.village}</p>
                      <p className="text-sm font-bold text-slate-800">
                        {displayVillageName(selectedMember) || '-'} {selectedMember.village_code ? `(${fmtVal(selectedMember.village_code)})` : ''}
                      </p>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md sm:col-span-2">
                      <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{l.address}</p>
                      <p className="text-sm font-medium text-slate-700 leading-relaxed text-left">{selectedMember.address_no || '-'}</p>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'bank' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md sm:col-span-2">
                      <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{l.bank}</p>
                      <p className={`text-sm font-bold text-slate-800 ${isGu ? 'font-prompt' : 'uppercase'}`}>{getDisplayBankName(selectedMember.bank_name, isGu) || '-'}</p>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                      <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{l.branch}</p>
                      <p className="text-sm font-bold text-slate-800">{selectedMember.branch_name || '-'}</p>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                      <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{t('memberForm.accountType') || "Account Type"}</p>
                      <p className="text-sm font-bold text-slate-800">{selectedMember.account_type || '-'}</p>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md sm:col-span-2 flex items-center justify-between gap-4">
                      <div className="text-left">
                        <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{l.accountNo}</p>
                        <p className="text-sm font-bold text-slate-800 font-mono">{selectedMember.full_ac_number || '-'}</p>
                      </div>
                      {selectedMember.full_ac_number && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyToClipboard(selectedMember.full_ac_number, `split-ac-${selectedMember.id}`)
                          }}
                          className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 transition text-slate-500 rounded-md cursor-pointer"
                          title="Copy Account Number"
                        >
                          {copiedId === `split-ac-${selectedMember.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        </button>
                      )}
                    </div>

                    <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md sm:col-span-2">
                      <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{l.ifsc}</p>
                      <p className="text-sm font-bold text-slate-800 font-mono uppercase">{selectedMember.ifsc_code || '-'}</p>
                    </div>
                  </div>
                )}

                {activeDetailTab === 'bardan' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                      <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{l.classification}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md border ${(selectedMember.nominal_member === 'true' || selectedMember.nominal_member === true || selectedMember.nominal_member === 1)
                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}>
                        {(selectedMember.nominal_member === 'true' || selectedMember.nominal_member === true || selectedMember.nominal_member === 1)
                          ? l.nominalBadge
                          : l.regularBadge
                        }
                      </span>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                      <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{l.bardanOpeningBalance}</p>
                      <p className="text-sm font-black text-slate-800 font-mono">{fmtBardan(selectedMember.bardan_opening)}</p>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                      <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{l.status}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md ${selectedMember.is_active
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                        }`}>
                        {selectedMember.is_active ? t('memberMaster.active') : t('memberMaster.inactive')}
                      </span>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer Controls */}
              <div className="bg-slate-50 -mx-5 -mb-5 mt-5 px-5 py-3 border-t border-slate-200 flex gap-2 justify-end rounded-b-lg">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStatusToggle(selectedMember)
                  }}
                  className={`px-3 py-1.5 text-sm font-bold rounded-md border transition cursor-pointer ${selectedMember.is_active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    }`}
                >
                  <span>{selectedMember.is_active ? t('memberMaster.active') : t('memberMaster.inactive')}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditMember(selectedMember)
                    setSelectedMemberId(null)
                  }}
                  className="px-3 py-1.5 flex items-center gap-1 border border-slate-200 bg-white rounded-md text-sm font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  title="Edit Member"
                >
                  <Edit3 size={12} />
                  <span>{t('common.edit') || "Edit"}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    confirmDelete(selectedMember)
                    setSelectedMemberId(null)
                  }}
                  className="px-3 py-1.5 flex items-center gap-1 border border-rose-100 bg-rose-50 rounded-md text-sm font-bold text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                  title="Delete Member"
                >
                  <Trash2 size={12} />
                  <span>{t('common.delete') || "Delete"}</span>
                </button>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Modal for Member Form */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-150" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto z-10 scale-100 transition-all duration-150">
            <MemberForm
              companyId={company?.id}
              onSuccess={(msg) => {
                setMessage({ type: 'success', text: msg || t('memberMaster.memberSaved') })
                handleFormSuccess()
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
        message={t('memberMaster.deleteConfirm', { name: memberToDelete ? displayMemberName(memberToDelete) : '' })}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* Modern Slide-Out Filters Drawer (WOW design with animation in & out) */}
      <div className={`fixed inset-0 z-[100] overflow-hidden ${showFiltersDrawer ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop Blur Overlay */}
        <div
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px] transition-opacity duration-300 ${showFiltersDrawer ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setShowFiltersDrawer(false)}
        />

        {/* Drawer Panel Container */}
        <div className={`fixed inset-y-0 right-0 max-w-full flex pl-10 transform transition-transform duration-300 ease-in-out ${showFiltersDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="w-screen max-w-sm bg-white border-l border-slate-200 flex flex-col shadow-none">

            {/* Drawer Title Bar */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 select-none">
                <Filter size={14} className="text-[#1d5f84]" />
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  {l.filterTitle}
                </span>
              </div>
              <button
                onClick={() => setShowFiltersDrawer(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Status Selector */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {l.statusFilter}
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 cursor-pointer outline-none w-full"
                >
                  <option value="all">{l.allStatus}</option>
                  <option value="active">{l.active}</option>
                  <option value="inactive">{l.inactive}</option>
                </select>
              </div>

              {/* Village selector */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {l.villageFilter}
                </span>
                <select
                  value={villageFilter}
                  onChange={(e) => {
                    setVillageFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 cursor-pointer outline-none w-full ${isGu ? 'font-prompt' : ''}`}
                >
                  <option value="all">{l.allVillages}</option>
                  {uniqueVillages.map(v => (
                    <option key={v.code} value={v.code}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Bank selector */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {l.bankFilter}
                </span>
                <select
                  value={bankFilter}
                  onChange={(e) => {
                    setBankFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 cursor-pointer outline-none w-full force-en font-sans"
                >
                  <option value="all" className="force-en font-sans" lang="en">All Banks</option>
                  {uniqueBanks.map(b => (
                    <option key={b} value={b} className="force-en font-sans" lang="en">{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => {
                  clearFilters();
                  setShowFiltersDrawer(false);
                }}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold rounded-md transition cursor-pointer uppercase tracking-wider text-center"
              >
                {l.resetAll}
              </button>
              <button
                onClick={() => setShowFiltersDrawer(false)}
                className="flex-1 px-3 py-2 bg-[#1d5f84] hover:bg-[#154662] text-white text-sm font-bold rounded-md transition cursor-pointer uppercase tracking-wider text-center"
              >
                {l.applyFilters}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

