import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Bell, ChevronDown, Settings, LogOut, User as UserIcon,
  LayoutDashboard, Building2, Users, Users2, Package,
  DollarSign, ShoppingCart, TrendingUp, BarChart3, Book,
  RotateCcw, TrendingDown, BookOpen, BarChart2, FileText,
  MapPin, Database, ArrowLeftRight, MessageSquare, Shield, Menu, X
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

const NAV_GROUPS = [
  {
    id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard,
    path: '/dashboard'
  },
  {
    id: 'master', label: 'Master', icon: Database,
    children: [
      { id: 'village', label: 'Village Master', icon: MapPin, path: '/village' },
      { id: 'members', label: 'Member Master', icon: Users2, path: '/members' },
      { id: 'accounts', label: 'Account Master', icon: DollarSign, path: '/accounts' },
      { id: 'items', label: 'Item Master', icon: Package, path: '/items' },
      { id: 'narrations', label: 'Narration Master', icon: MessageSquare, path: '/narrations' },
      { id: 'dangar-master', label: 'Dangar Master', icon: Shield, path: '/dangar-master' },
    ]
  },
  {
    id: 'dangar', label: 'Dangar', icon: TrendingDown,
    children: [
      { id: 'dangar-entry', label: 'Dangar Entry', icon: Database, path: '/dangar-entry' },
      { id: 'dangar-rates', label: 'Yearly Rate Master', icon: TrendingUp, path: '/dangar-rates' },
      { id: 'kapat', label: 'Kapat Console', icon: TrendingDown, path: '/kapat' },
      { id: 'bardan-portfolio', label: 'Bardan Portfolio', icon: ArrowLeftRight, path: '/bardan-portfolio' },
      // { id: 'jama-bardan', label: 'Jama Bardan Entry', icon: Book, path: '/jama-bardan-entry' },
      { id: 'interest-calculator', label: 'Interest Calculator', icon: DollarSign, path: '/interest-calculator' },
      { id: 'dangar-payment-report', label: 'Payment Report', icon: FileText, path: '/dangar-payment-report' },
    ]
  },
  {
    id: 'transactions', label: 'Transactions', icon: ShoppingCart,
    children: [
      { id: 'sales', label: 'Sales', icon: ShoppingCart, path: '/sales' },
      { id: 'sales-return', label: 'Sale Return', icon: RotateCcw, path: '/sales-return' },
      { id: 'rates', label: 'Item Rate', icon: BarChart3, path: '/rates' },
      { id: 'rojmel', label: 'Rojmel', icon: Book, path: '/rojmel' },
    ]
  },
  {
    id: 'reports', label: 'Reports', icon: BarChart2,
    children: [
      { id: 'ledger', label: 'Account Ledger', icon: BookOpen, path: '/ledger' },
      { id: 'sabhasad-ledger', label: 'Sabhasad Ledger', icon: Users, path: '/sabhasad-ledger' },
      { id: 'ledger-report', label: 'Ledger Audit', icon: FileText, path: '/ledger-report' },
      { id: 'profit-loss', label: 'Profit & Loss', icon: BarChart2, path: '/profit-loss' },
      { id: 'stock', label: 'Stock Report', icon: Package, path: '/stock' },
      { id: 'sale-report', label: 'Sale Report', icon: ShoppingCart, path: '/sale-report' },
    ]
  },
  {
    id: 'settings', label: 'Settings', icon: Settings,
    children: [
      { id: 'company', label: 'Company', icon: Building2, path: '/company' },
      { id: 'users', label: 'User Master', icon: Users, path: '/users' },
    ]
  }
]

function DropdownMenu({ group, onNavigate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()
  const closeTimer = useRef(null)

  const isChildActive = group.children?.some(c => location.pathname === c.path)

  const handleMouseEnter = () => {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }

  const handleMouseLeave = () => {
    // Small delay so the user can move mouse into the dropdown
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  if (!group.children) {
    const active = location.pathname === group.path
    return (
      <button
        onClick={() => onNavigate(group.path)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${active
            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
      >
        <group.icon size={16} />
        {group.label}
      </button>
    )
  }

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isChildActive || open
            ? 'bg-blue-50 text-blue-600'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
      >
        <group.icon size={16} />
        {group.label}
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 pt-1 z-50">
          <div className="w-52 bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/60 py-1.5 animate-in fade-in zoom-in-95 duration-150 origin-top-left">
            {group.children.map(child => {
              const childActive = location.pathname === child.path
              return (
                <button
                  key={child.id}
                  onClick={() => { onNavigate(child.path); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${childActive
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <child.icon size={15} className={childActive ? 'text-blue-500' : 'text-slate-400'} />
                  {child.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Navbar({ backendStatus }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { i18n, t } = useTranslation()
  const [showProfile, setShowProfile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const profileRef = useRef(null)

  const currentUser = JSON.parse(localStorage.getItem('user')) || {
    username: 'Admin',
    email: 'admin@csms.local',
    role: 'Super Admin'
  }

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
  }

  useEffect(() => {
    const handler = (e) => { if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close mobile on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  return (
    <>
      <nav className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        {/* Top bar: brand + controls */}
        <div className="flex items-center justify-between px-6 h-14">
          {/* Brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-200">
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-1.5 h-1.5 bg-white rounded-full opacity-50" />
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                <div className="w-1.5 h-1.5 bg-white rounded-full opacity-60" />
              </div>
            </div>
            <span className="text-slate-900 font-bold text-lg tracking-tight hidden sm:block">Danger Systeam</span>
          </div>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center px-4">
            {NAV_GROUPS.map(group => (
              <DropdownMenu key={group.id} group={group} onNavigate={navigate} />
            ))}
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Financial Year */}
            <div className="hidden sm:flex items-center bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">
                {currentUser.financial_year || '2026-27'}
              </span>
            </div>

            {/* Language */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => changeLanguage('en')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${i18n.language === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >EN</button>
              <button
                onClick={() => changeLanguage('gu')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${i18n.language === 'gu' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >GU</button>
            </div>

            {/* User Profile */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setShowProfile(o => !o)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-50 transition-all"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
                  <img
                    src={`https://ui-avatars.com/api/?name=${currentUser.username}&background=0D8ABC&color=fff`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="hidden lg:block text-sm font-semibold text-slate-800">{currentUser.username}</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${showProfile ? 'rotate-180' : ''}`} />
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-3 w-56 bg-white border border-slate-100 rounded-xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                  <div className="px-3 py-2 mb-1">
                    <p className="text-xs font-bold text-slate-800">{currentUser.username}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{currentUser.email || 'Admin'}</p>
                  </div>
                  <div className="h-px bg-slate-100 mb-1" />
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-all text-xs font-semibold">
                    <UserIcon size={15} /> Profile Details
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-all text-xs font-semibold">
                    <Settings size={15} /> Settings
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    onClick={() => { localStorage.removeItem('user'); navigate('/login') }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-all text-xs font-semibold"
                  >
                    <LogOut size={15} /> Log Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-all"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-14 bg-slate-900/30 backdrop-blur-sm z-30" onClick={() => setMobileOpen(false)}>
          <div className="bg-white border-b border-slate-100 shadow-xl p-4 space-y-1" onClick={e => e.stopPropagation()}>
            {/* Financial Year on mobile */}
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="flex bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">
                  {currentUser.financial_year || '2026-27'}
                </span>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button onClick={() => changeLanguage('en')} className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${i18n.language === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>EN</button>
                <button onClick={() => changeLanguage('gu')} className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${i18n.language === 'gu' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>GU</button>
              </div>
            </div>
            {NAV_GROUPS.map(group => {
              if (!group.children) {
                const active = location.pathname === group.path
                return (
                  <button
                    key={group.id}
                    onClick={() => navigate(group.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <group.icon size={18} /> {group.label}
                  </button>
                )
              }
              return (
                <div key={group.id}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 pt-3 pb-1">{group.label}</p>
                  {group.children.map(child => {
                    const active = location.pathname === child.path
                    return (
                      <button
                        key={child.id}
                        onClick={() => navigate(child.path)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <child.icon size={16} className={active ? 'text-blue-500' : 'text-slate-400'} />
                        {child.label}
                      </button>
                    )
                  })}
                </div>
              )
            })}
            <div className="h-px bg-slate-100 my-2" />
            <button
              onClick={() => { localStorage.removeItem('user'); navigate('/login') }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-50 transition-all"
            >
              <LogOut size={18} /> Log Out
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar
