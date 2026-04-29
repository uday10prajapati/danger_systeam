import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Building2,
  Users,
  Users2,
  Package,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  Book,
  RotateCcw,
  TrendingDown,
  BookOpen,
  BarChart2,
  FileText,
  LogOut,
  X,
  Settings,
  User as UserIcon,
  MapPin,
  ChevronDown,
  Database,
  ArrowLeftRight,
  MessageSquare,
  Shield,
  Menu,
  Bell,
  Globe
} from 'lucide-react'

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const dropdownRef = useRef(null)
  const profileRef = useRef(null)

  const currentUser = JSON.parse(localStorage.getItem('user')) || {
    username: 'Admin',
    email: 'admin@csms.local',
    role: 'Super Admin'
  }

  const menuItems = [
    { id: 'dashboard', title: t('modules.dashboard'), icon: LayoutDashboard, path: '/dashboard' },
    { id: 'company', title: t('modules.company'), icon: Building2, path: '/company' },
    {
      id: 'master',
      title: t('modules.master'),
      icon: Database,
      children: [
        { id: 'village', title: t('modules.villageMaster'), icon: MapPin, path: '/village' },
        { id: 'members', title: t('modules.memberMaster'), icon: Users2, path: '/members' },
        { id: 'accounts', title: t('modules.accountMaster'), icon: DollarSign, path: '/accounts' },
        { id: 'items', title: t('modules.itemMaster'), icon: Package, path: '/items' },
        { id: 'dangar-rates', title: 'Yearly Rate Master', icon: TrendingUp, path: '/dangar-rates' },
        { id: 'kapat', title: 'Kapat Console', icon: TrendingDown, path: '/kapat' },
        { id: 'interest-calculator', title: 'Interest Calculator', icon: DollarSign, path: '/interest-calculator' },
        { id: 'dangar-entry', title: t('modules.dangarEntry'), icon: Database, path: '/dangar-entry' },
        { id: 'bardan-portfolio', title: 'Bardan Portfolio', icon: ArrowLeftRight, path: '/bardan-portfolio' },
        { id: 'narrations', title: 'Narration Master', icon: MessageSquare, path: '/narrations' },
        { id: 'dangar-payment-report', title: 'Dangar Payment Report', icon: FileText, path: '/dangar-payment-report' },
        { id: 'dangar-master', title: 'Dangar Master', icon: Shield, path: '/dangar-master' },
      ]
    },
    { 
      id: 'ledger-group', 
      title: 'Ledgers', 
      icon: BookOpen, 
      children: [
        { id: 'ledger', title: t('modules.accountLedger'), icon: BookOpen, path: '/ledger' },
        { id: 'sabhasad-ledger', title: t('modules.sabhasadLedger'), icon: Users, path: '/sabhasad-ledger' },
        { id: 'rojmel', title: t('modules.rojmel'), icon: Book, path: '/rojmel' },
      ]
    },
    { 
      id: 'reports', 
      title: 'Reports', 
      icon: BarChart2, 
      children: [
        { id: 'ledger-report', title: t('modules.ledgerAudit'), icon: FileText, path: '/ledger-report' },
        { id: 'profit-loss', title: t('modules.profitAndLoss'), icon: BarChart2, path: '/profit-loss' },
        { id: 'stock', title: t('modules.stockReport'), icon: Package, path: '/stock' },
        { id: 'sale-report', title: t('modules.saleReport'), icon: ShoppingCart, path: '/sale-report' },
      ]
    }
  ]

  const isActive = (path) => location.pathname === path

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null)
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 shadow-sm transition-all duration-300">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3 sm:gap-4 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <div className="grid grid-cols-2 gap-0.5">
              <div className="w-1.5 h-1.5 bg-white rounded-full opacity-40"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              <div className="w-1.5 h-1.5 bg-white rounded-full opacity-60"></div>
            </div>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-slate-900 font-bold text-lg tracking-tight leading-none uppercase">Danger Systeam</h1>
            <p className="text-[10px] text-slate-400 font-black mt-0.5 tracking-widest uppercase italic">Inventory Intelligence</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex items-center gap-1">
          {menuItems.map((item) => {
            const hasChildren = !!item.children
            const active = isActive(item.path) || (item.children && item.children.some(c => isActive(c.path)))

            return (
              <div key={item.id} className="relative" ref={item.id === activeDropdown ? dropdownRef : null}>
                <button
                  onMouseEnter={() => hasChildren && setActiveDropdown(item.id)}
                  onClick={() => !hasChildren && navigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    active 
                      ? 'bg-blue-600/5 text-blue-600' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <item.icon size={18} className={active ? 'text-blue-600' : 'text-slate-400'} />
                  <span>{item.title}</span>
                  {hasChildren && <ChevronDown size={14} className={`transition-transform duration-200 ${activeDropdown === item.id ? 'rotate-180' : ''}`} />}
                </button>

                {/* Dropdown Menu */}
                {hasChildren && activeDropdown === item.id && (
                  <div 
                    className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200/60 rounded-2xl shadow-2xl shadow-blue-100/20 p-2 animate-in fade-in slide-in-from-top-2 duration-200"
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <div className="grid grid-cols-1 gap-1 max-h-[70vh] overflow-y-auto scroller-airy">
                      {item.children.map((child) => {
                        const childActive = isActive(child.path)
                        return (
                          <button
                            key={child.id}
                            onClick={() => { navigate(child.path); setActiveDropdown(null); }}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left ${
                              childActive 
                                ? 'bg-blue-50 text-blue-600 font-bold' 
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg ${childActive ? 'bg-white shadow-sm' : 'bg-slate-50 group-hover:bg-white'}`}>
                              <child.icon size={16} />
                            </div>
                            <span className="text-xs font-medium">{child.title}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Action Bar */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Financial Year Badge - Desktop */}
          <div className="hidden lg:flex flex-col items-end mr-2">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Fiscal Year</span>
            <span className="text-xs font-bold text-blue-600 mt-1">{currentUser.financial_year || '2026-27'}</span>
          </div>

          {/* Language Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => changeLanguage('en')}
              className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${i18n.language === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >EN</button>
            <button
              onClick={() => changeLanguage('gu')}
              className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${i18n.language === 'gu' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >GU</button>
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-white shadow-sm bg-blue-100 ring-1 ring-slate-100">
                <img
                  src={`https://ui-avatars.com/api/?name=${currentUser.username}&background=2563eb&color=fff&bold=true`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showProfile ? 'rotate-180' : ''}`} />
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-3 w-64 bg-white border border-slate-200/60 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right shadow-blue-100/20">
                <div className="px-4 py-3 border-b border-slate-50 mb-1">
                  <p className="text-sm font-bold text-slate-900">{currentUser.username}</p>
                  <p className="text-[11px] text-slate-400 font-medium truncate">{currentUser.email || 'admin@csms.local'}</p>
                </div>
                <button className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all text-xs font-bold">
                  <UserIcon size={18} className="text-slate-400" /> My Profile
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all text-xs font-bold">
                  <Settings size={18} className="text-slate-400" /> Preferences
                </button>
                <div className="h-px bg-slate-50 my-1 mx-2"></div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all text-xs font-bold"
                >
                  <LogOut size={18} /> Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="xl:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-xl"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] xl:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-0 right-0 w-[300px] h-full bg-white shadow-2xl flex flex-col p-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-slate-900 uppercase">Navigation</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto scroller-airy space-y-2">
              {menuItems.map((item) => {
                const hasChildren = !!item.children
                const active = isActive(item.path) || (item.children && item.children.some(c => isActive(c.path)))
                const isOpen = activeDropdown === item.id

                return (
                  <div key={item.id} className="space-y-1">
                    <button
                      onClick={() => hasChildren ? setActiveDropdown(isOpen ? null : item.id) : navigate(item.path)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                        active ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={20} className={active ? 'text-blue-600' : 'text-slate-400'} />
                        <span className="font-bold text-sm">{item.title}</span>
                      </div>
                      {hasChildren && <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                    </button>

                    {hasChildren && isOpen && (
                      <div className="ml-6 pl-4 border-l-2 border-slate-100 space-y-1 mt-1">
                        {item.children.map((child) => (
                          <button
                            key={child.id}
                            onClick={() => { navigate(child.path); setMobileMenuOpen(false); }}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium ${
                              isActive(child.path) ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            <child.icon size={16} />
                            <span>{child.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="pt-6 border-t border-slate-100 mt-6">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-4 rounded-xl text-rose-500 hover:bg-rose-50 font-bold"
              >
                <LogOut size={20} /> Logout System
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .scroller-airy::-webkit-scrollbar { width: 4px; }
        .scroller-airy::-webkit-scrollbar-track { background: transparent; }
        .scroller-airy::-webkit-scrollbar-thumb { background: #f1f5f9; border-radius: 10px; }
        .scroller-airy:hover::-webkit-scrollbar-thumb { background: #e2e8f0; }
      `}} />
    </header>
  )
}

export default Navbar
