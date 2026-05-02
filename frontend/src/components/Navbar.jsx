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
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  if (!group.children) {
    const active = location.pathname === group.path
    return (
      <button
        onClick={() => onNavigate(group.path)}
        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition select-none uppercase tracking-wider rounded-none border ${active
            ? 'bg-blue-600 text-white border-blue-500 font-mono'
            : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 border-transparent'
          }`}
      >
        <group.icon size={13} />
        {group.label.toUpperCase()}
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
        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition select-none uppercase tracking-wider rounded-none border ${isChildActive || open
            ? 'bg-zinc-100 text-zinc-900 border-zinc-300 font-mono'
            : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 border-transparent'
          }`}
      >
        <group.icon size={13} />
        {group.label.toUpperCase()}
        <ChevronDown size={12} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 pt-0.5 z-50">
          <div className="w-48 bg-white border border-zinc-400 rounded-none shadow-md py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-left font-mono">
            {group.children.map(child => {
              const childActive = location.pathname === child.path
              return (
                <button
                  key={child.id}
                  onClick={() => { onNavigate(child.path); setOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition select-none ${childActive
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                >
                  <child.icon size={13} className={childActive ? 'text-white' : 'text-zinc-400'} />
                  {child.label.toUpperCase()}
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

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  return (
    <>
      <nav className="bg-white border-b border-zinc-300 sticky top-0 z-40 select-none font-sans text-zinc-900">
        {/* Top bar: brand + controls */}
        <div className="flex items-center justify-between px-6 h-12">
          {/* Brand */}
          <div className="flex items-center gap-3 flex-shrink-0 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="w-6 h-6 bg-zinc-800 flex items-center justify-center text-white font-mono text-xs font-bold border border-zinc-700 rounded-none shadow-sm">
              DS
            </div>
            <span className="text-zinc-800 font-bold text-sm tracking-tight hidden sm:block font-mono uppercase">Danger Systeam</span>
          </div>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-1 flex-1 justify-center px-4">
            {NAV_GROUPS.map(group => (
              <DropdownMenu key={group.id} group={group} onNavigate={navigate} />
            ))}
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-2 flex-shrink-0 font-mono text-xs">
            {/* Financial Year */}
            <div className="hidden sm:flex items-center bg-zinc-100 border border-zinc-300 px-2 py-1 select-none">
              <span className="text-[10px] font-bold text-zinc-600 uppercase">
                FY {currentUser.financial_year || '2026-27'}
              </span>
            </div>

            {/* Language */}
            <div className="flex bg-zinc-100 border border-zinc-300 p-0.5">
              <button
                onClick={() => changeLanguage('en')}
                className={`px-2 py-0.5 text-[10px] font-bold transition ${i18n.language === 'en' ? 'bg-white text-zinc-900 border border-zinc-300 font-mono' : 'text-zinc-400 hover:text-zinc-600'}`}
              >EN</button>
              <button
                onClick={() => changeLanguage('gu')}
                className={`px-2 py-0.5 text-[10px] font-bold transition ${i18n.language === 'gu' ? 'bg-white text-zinc-900 border border-zinc-300 font-mono' : 'text-zinc-400 hover:text-zinc-600'}`}
              >GU</button>
            </div>

            {/* User Profile */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setShowProfile(o => !o)}
                className="flex items-center gap-1.5 p-1 hover:bg-zinc-50 transition border border-transparent hover:border-zinc-300 rounded-none"
              >
                <span className="hidden lg:block text-xs font-bold text-zinc-700 uppercase">{currentUser.username}</span>
                <ChevronDown size={12} className={`text-zinc-400 transition-transform ${showProfile ? 'rotate-180' : ''}`} />
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-zinc-400 rounded-none shadow-md py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right font-mono">
                  <div className="px-3 py-1 mb-1 border-b border-zinc-200">
                    <p className="text-xs font-bold text-zinc-800">{currentUser.username.toUpperCase()}</p>
                    <p className="text-[9px] text-zinc-400 mt-0.5 uppercase tracking-tight">{currentUser.role || 'ADMIN'}</p>
                  </div>
                  <button onClick={() => { localStorage.removeItem('user'); navigate('/login') }} className="w-full flex items-center gap-2 px-3 py-1.5 text-red-700 hover:bg-red-50 transition font-bold text-xs uppercase select-none">
                    <LogOut size={13} /> Log Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="lg:hidden p-1.5 border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 transition rounded-none select-none"
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-12 bg-zinc-900/30 z-30" onClick={() => setMobileOpen(false)}>
          <div className="bg-white border-b border-zinc-300 p-3 space-y-2 font-mono text-xs select-none" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-2 py-1 mb-1 border-b border-zinc-200">
              <div className="flex bg-zinc-100 border border-zinc-300 px-2 py-1 select-none">
                <span className="text-[10px] font-bold text-zinc-600">
                  FY {currentUser.financial_year || '2026-27'}
                </span>
              </div>
              <div className="flex bg-zinc-100 p-0.5 border border-zinc-300">
                <button onClick={() => changeLanguage('en')} className={`px-2 py-0.5 text-[10px] font-bold transition ${i18n.language === 'en' ? 'bg-white text-zinc-800' : 'text-zinc-400'}`}>EN</button>
                <button onClick={() => changeLanguage('gu')} className={`px-2 py-0.5 text-[10px] font-bold transition ${i18n.language === 'gu' ? 'bg-white text-zinc-800' : 'text-zinc-400'}`}>GU</button>
              </div>
            </div>
            {NAV_GROUPS.map(group => {
              if (!group.children) {
                const active = location.pathname === group.path
                return (
                  <button
                    key={group.id}
                    onClick={() => navigate(group.path)}
                    className={`w-full flex items-center gap-2 px-3 py-2 transition ${active ? 'bg-blue-600 text-white font-bold' : 'text-zinc-700 hover:bg-zinc-50'}`}
                  >
                    <group.icon size={15} /> {group.label.toUpperCase()}
                  </button>
                )
              }
              return (
                <div key={group.id} className="pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 pb-1 border-b border-zinc-100 mb-1">{group.label}</p>
                  {group.children.map(child => {
                    const active = location.pathname === child.path
                    return (
                      <button
                        key={child.id}
                        onClick={() => navigate(child.path)}
                        className={`w-full flex items-center gap-2 px-5 py-1.5 transition ${active ? 'bg-blue-600 text-white font-bold' : 'text-zinc-600 hover:bg-zinc-50'}`}
                      >
                        <child.icon size={14} className={active ? 'text-white' : 'text-zinc-400'} />
                        {child.label.toUpperCase()}
                      </button>
                    )
                  })}
                </div>
              )
            })}
            <div className="h-px bg-zinc-200 my-1" />
            <button
              onClick={() => { localStorage.removeItem('user'); navigate('/login') }}
              className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 transition font-bold"
            >
              <LogOut size={15} /> LOG OUT
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar
