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

// This component renders text as an image using HTML5 Canvas.
// This is 100% immune to Google Translate because translators cannot "read" canvas pixels.
const CanvasLabel = ({ text }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      canvas.width = 24 * dpr;
      canvas.height = 14 * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, 24, 14);
      ctx.font = 'bold 10px ui-monospace, monospace';
      ctx.fillStyle = 'currentColor';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 12, 8);
    }
  }, [text]);
  return <canvas ref={canvasRef} style={{ width: '24px', height: '14px', display: 'block' }} className="notranslate" />;
};

const NAV_GROUPS = [
  {
    id: 'dashboard', label: 'modules.dashboard', icon: LayoutDashboard,
    path: '/dashboard'
  },
  {
    id: 'master', label: 'modules.master', icon: Database,
    children: [
      { id: 'village', label: 'modules.villageMaster', icon: MapPin, path: '/village' },
      { id: 'members', label: 'modules.memberMaster', icon: Users2, path: '/members' },
      { id: 'accounts', label: 'modules.accountMaster', icon: DollarSign, path: '/accounts' },
      { id: 'items', label: 'modules.itemMaster', icon: Package, path: '/items' },
      { id: 'narrations', label: 'modules.narrationMaster', icon: MessageSquare, path: '/narrations' },
      { id: 'dangar-master', label: 'modules.dangarMaster', icon: Shield, path: '/dangar-master' },
    ]
  },
  {
    id: 'dangar', label: 'modules.dangar', icon: TrendingDown,
    children: [
      { id: 'dangar-entry', label: 'modules.dangarEntry', icon: Database, path: '/dangar-entry' },
      { id: 'dangar-rates', label: 'modules.yearlyRateMaster', icon: TrendingUp, path: '/dangar-rates' },
      { id: 'kapat', label: 'modules.kapatConsole', icon: TrendingDown, path: '/kapat' },
      { id: 'bardan-portfolio', label: 'modules.bardanPortfolio', icon: ArrowLeftRight, path: '/bardan-portfolio' },
      { id: 'interest-calculator', label: 'modules.interestCalculator', icon: DollarSign, path: '/interest-calculator' },
      { id: 'dangar-payment-report', label: 'modules.paymentReport', icon: FileText, path: '/dangar-payment-report' },
    ]
  },
  {
    id: 'transactions', label: 'modules.transactions', icon: ShoppingCart,
    children: [
      { id: 'sales', label: 'modules.sale', icon: ShoppingCart, path: '/sales' },
      { id: 'sales-return', label: 'modules.saleReturn', icon: RotateCcw, path: '/sales-return' },
      { id: 'rates', label: 'modules.itemRate', icon: BarChart3, path: '/rates' },
      { id: 'rojmel', label: 'modules.rojmel', icon: Book, path: '/rojmel' },
    ]
  },
  {
    id: 'reports', label: 'modules.reports', icon: BarChart2,
    children: [
      { id: 'ledger', label: 'modules.accountLedger', icon: BookOpen, path: '/ledger' },
      { id: 'sabhasad-ledger', label: 'modules.sabhasadLedger', icon: Users, path: '/sabhasad-ledger' },
      { id: 'ledger-report', label: 'modules.ledgerAudit', icon: FileText, path: '/ledger-report' },
      { id: 'profit-loss', label: 'modules.profitAndLoss', icon: BarChart2, path: '/profit-loss' },
      { id: 'stock', label: 'modules.stockReport', icon: Package, path: '/stock' },
      { id: 'sale-report', label: 'modules.saleReport', icon: ShoppingCart, path: '/sale-report' },
    ]
  },
  {
    id: 'settings', label: 'modules.settings', icon: Settings,
    children: [
      { id: 'company', label: 'modules.company', icon: Building2, path: '/company' },
      { id: 'users', label: 'modules.userMaster', icon: Users, path: '/users' },
      { id: 'backup', label: 'modules.database', icon: Database, path: '/settings' },
    ]
  }
]

function DropdownMenu({ group, onNavigate }) {
  const { t } = useTranslation()
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
        {t(group.label)}
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
        {t(group.label)}
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
                  {t(child.label)}
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
    document.documentElement.lang = lng;
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
                {t('modules.financialYear')} {currentUser.financial_year || '2026-27'}
              </span>
            </div>

            {/* Language */}
            <div className="flex bg-zinc-100 border border-zinc-300 p-0.5 notranslate" translate="no">
              <button
                onClick={() => changeLanguage('en')}
                className={`flex items-center justify-center px-2 py-0.5 text-[10px] font-bold transition ${i18n.language === 'en' ? 'bg-white text-zinc-900 border border-zinc-300 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                <CanvasLabel text="EN" />
              </button>
              <button
                onClick={() => changeLanguage('gu')}
                className={`flex items-center justify-center px-2 py-0.5 text-[10px] font-bold transition ${i18n.language === 'gu' ? 'bg-white text-zinc-900 border border-zinc-300 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                <CanvasLabel text="GU" />
              </button>
            </div>

            {/* User Profile */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setShowProfile(o => !o)}
                className="flex items-center gap-1.5 p-1 hover:bg-zinc-50 transition border border-transparent hover:border-zinc-300 rounded-none"
              >
                <span className="hidden lg:block text-xs font-bold text-zinc-700 font-prompt-sm">{currentUser.full_name_gu || currentUser.username}</span>
                <ChevronDown size={12} className={`text-zinc-400 transition-transform ${showProfile ? 'rotate-180' : ''}`} />
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-zinc-400 rounded-none shadow-md py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right font-mono">
                  <div className="px-3 py-1 mb-1 border-b border-zinc-200">
                    <p className="text-xs font-bold text-zinc-800 font-prompt-sm">{(currentUser.full_name_gu || currentUser.username || 'ADMIN')}</p>
                    <p className="text-[9px] text-zinc-400 mt-0.5 uppercase tracking-tight force-en">{currentUser.role || 'ADMIN'}</p>
                  </div>
                  <button onClick={() => { localStorage.removeItem('user'); navigate('/login') }} className="w-full flex items-center gap-2 px-3 py-1.5 text-red-700 hover:bg-red-50 transition font-bold text-xs uppercase select-none">
                    <LogOut size={13} /> {t('modules.logout')}
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
                  {t('modules.financialYear')} {currentUser.financial_year || '2026-27'}
                </span>
              </div>
              <div className="flex bg-zinc-100 p-0.5 border border-zinc-300 notranslate" translate="no">
                <button onClick={() => changeLanguage('en')} className={`flex items-center justify-center px-2 py-0.5 text-[10px] font-bold transition ${i18n.language === 'en' ? 'bg-white text-zinc-800' : 'text-zinc-400'}`}>
                  <CanvasLabel text="EN" />
                </button>
                <button onClick={() => changeLanguage('gu')} className={`flex items-center justify-center px-2 py-0.5 text-[10px] font-bold transition ${i18n.language === 'gu' ? 'bg-white text-zinc-800' : 'text-zinc-400'}`}>
                  <CanvasLabel text="GU" />
                </button>
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
                    <group.icon size={15} /> {t(group.label)}
                  </button>
                )
              }
              return (
                <div key={group.id} className="pt-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 pb-1 border-b border-zinc-100 mb-1">{t(group.label)}</p>
                  {group.children.map(child => {
                    const active = location.pathname === child.path
                    return (
                      <button
                        key={child.id}
                        onClick={() => navigate(child.path)}
                        className={`w-full flex items-center gap-2 px-5 py-1.5 transition ${active ? 'bg-blue-600 text-white font-bold' : 'text-zinc-600 hover:bg-zinc-50'}`}
                      >
                        <child.icon size={14} className={active ? 'text-white' : 'text-zinc-400'} />
                        {t(child.label)}
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
              <LogOut size={15} /> {t('modules.logout')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar
