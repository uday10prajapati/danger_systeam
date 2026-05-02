import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSidebar } from '../context/SidebarContext'
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
  Barcode,
  BookOpen,
  BarChart2,
  FileText,
  LogOut,
  X,
  HelpCircle,
  Settings,
  User as UserIcon,
  MapPin,
  ChevronDown,
  ChevronRight,
  Database,
  ArrowLeftRight,
  MessageSquare,
  Shield,
} from 'lucide-react'

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { sidebarOpen, setSidebarOpen } = useSidebar()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const [openMenus, setOpenMenus] = useState(['master'])

  const menuItems = [
    { id: 'dashboard', title: t('modules.dashboard'), icon: LayoutDashboard, path: '/dashboard' },
    { id: 'company', title: t('modules.company'), icon: Building2, path: '/company' },
    { id: 'users', title: t('modules.userMaster'), icon: Users, path: '/users' },
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
    { id: 'sales', title: t('modules.sale'), icon: ShoppingCart, path: '/sales' },
    { id: 'rates', title: t('modules.itemRate'), icon: BarChart3, path: '/rates' },
    { id: 'rojmel', title: t('modules.rojmel'), icon: Book, path: '/rojmel' },
    { id: 'sales-return', title: t('modules.saleReturn'), icon: RotateCcw, path: '/sales-return' },
    { id: 'ledger', title: t('modules.accountLedger'), icon: BookOpen, path: '/ledger' },
    { id: 'sabhasad-ledger', title: t('modules.sabhasadLedger'), icon: Users, path: '/sabhasad-ledger' },
    { id: 'ledger-report', title: t('modules.ledgerAudit'), icon: FileText, path: '/ledger-report' },
    { id: 'profit-loss', title: t('modules.profitAndLoss'), icon: BarChart2, path: '/profit-loss' },
    { id: 'stock', title: t('modules.stockReport'), icon: Package, path: '/stock' },
    { id: 'sale-report', title: t('modules.saleReport'), icon: ShoppingCart, path: '/sale-report' },
  ]

  const isActive = (path) => location.pathname === path

  useEffect(() => {
    menuItems.forEach(item => {
      if (item.children && item.children.some(child => isActive(child.path))) {
        if (!openMenus.includes(item.id)) {
          setOpenMenus(prev => [...prev, item.id])
        }
      }
    })
  }, [location.pathname])

  const toggleMenu = (id) => {
    setOpenMenus(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="md:hidden fixed top-3 left-3 z-50 select-none">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-white border border-zinc-300 text-zinc-800 p-2 rounded-none shadow-sm font-mono text-xs font-bold"
        >
          {mobileMenuOpen ? <X size={16} /> : <LayoutDashboard size={16} />}
        </button>
      </div>

      {/* Sidebar Desktop */}
      <aside
        className="fixed left-0 top-0 h-screen bg-zinc-50 text-zinc-700 z-40 border-r border-zinc-300 flex flex-col w-64 select-none font-sans"
      >
        {/* Brand Section */}
        <div className="h-12 flex items-center px-4 overflow-hidden border-b border-zinc-300 bg-white">
          <div className="flex items-center gap-3" onClick={() => navigate('/dashboard')}>
            <div className="w-5 h-5 bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono text-xs font-bold text-white rounded-none">
              DS
            </div>
            <h1 className="text-zinc-800 font-bold text-sm tracking-tight font-mono uppercase">
              Danger Systeam
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-3 px-2 custom-scrollbar font-mono text-xs">
          <div className="space-y-0.5">
            {menuItems.map((item) => {
              if (item.children) {
                const isOpen = openMenus.includes(item.id)
                const isChildActive = item.children.some(child => isActive(child.path))

                return (
                  <div key={item.id} className="space-y-0.5">
                    <button
                      onClick={() => toggleMenu(item.id)}
                      className={`w-full flex items-center justify-between group p-2 transition font-bold uppercase tracking-wider rounded-none ${isChildActive ? 'bg-zinc-200 text-zinc-900 border border-zinc-300' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                        }`}
                    >
                      <div className="flex items-center">
                        <item.icon className={`w-4 h-4 flex-shrink-0 ${isChildActive ? 'text-zinc-900' : 'text-zinc-400'}`} />
                        <span className="ml-2 text-[10px] tracking-wide truncate">{item.title.toUpperCase()}</span>
                      </div>
                      {isOpen ? <ChevronDown size={14} className="text-zinc-400" /> : <ChevronRight size={14} className="text-zinc-400" />}
                    </button>

                    {isOpen && (
                      <div className="ml-3 pl-3 border-l border-zinc-300 space-y-0.5 mt-0.5">
                        {item.children.map((child) => {
                          const childActive = isActive(child.path)
                          return (
                            <button
                              key={child.id}
                              onClick={() => navigate(child.path)}
                              className={`w-full flex items-center group p-1.5 transition select-none rounded-none uppercase font-bold text-[10px] tracking-wide ${childActive
                                ? 'bg-blue-600 text-white border border-blue-500 font-mono'
                                : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                                }`}
                            >
                              <child.icon className={`w-3.5 h-3.5 flex-shrink-0 ${childActive ? 'text-white' : 'text-zinc-400'}`} />
                              <span className="ml-2 truncate">{child.title.toUpperCase()}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              const active = isActive(item.path)
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center group p-2 transition relative rounded-none font-bold uppercase tracking-wide border select-none ${active
                    ? 'bg-blue-600 text-white border-blue-500 font-mono font-bold'
                    : 'hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 border-transparent'
                    }`}
                >
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-zinc-400'}`} />
                  <span className="ml-2 text-[10px] tracking-wide truncate">
                    {item.title.toUpperCase()}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-2 border-t border-zinc-300 bg-white font-mono text-xs">
          <button
            onClick={handleLogout}
            className="w-full flex items-center p-2 hover:bg-red-50 text-red-700 hover:text-red-800 transition rounded-none font-bold select-none uppercase tracking-wider"
          >
            <LogOut size={14} />
            <span className="ml-2 text-[10px] tracking-wide font-mono">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-zinc-900/40 z-50 md:hidden transition-all select-none"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-64 h-full bg-white relative flex flex-col p-3 border-r border-zinc-400 font-mono text-xs"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono text-xs font-bold text-white rounded-none">
                  DS
                </div>
                <h1 className="text-zinc-800 font-bold text-sm tracking-tight">DANGER SYSTEAM</h1>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-400 p-1 hover:bg-zinc-50 border border-transparent hover:border-zinc-300"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-0.5">
              {menuItems.map((item) => {
                if (item.children) {
                  const isOpen = openMenus.includes(item.id)
                  const isChildActive = item.children.some(child => isActive(child.path))

                  return (
                    <div key={item.id} className="space-y-0.5">
                      <button
                        onClick={() => toggleMenu(item.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-none transition font-bold uppercase ${isChildActive ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50'
                          }`}
                      >
                        <div className="flex items-center">
                          <item.icon size={16} className={isChildActive ? 'text-zinc-800' : 'text-zinc-400'} />
                          <span className="ml-2 text-[10px] tracking-wide">{item.title.toUpperCase()}</span>
                        </div>
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>

                      {isOpen && (
                        <div className="ml-3 pl-3 border-l border-zinc-300 space-y-0.5">
                          {item.children.map((child) => {
                            const active = isActive(child.path)
                            return (
                              <button
                                key={child.id}
                                onClick={() => { navigate(child.path); setMobileMenuOpen(false); }}
                                className={`w-full flex items-center p-2 rounded-none transition uppercase tracking-wide font-bold text-[10px] ${active ? 'bg-blue-600 text-white' : 'text-zinc-600 hover:bg-zinc-50'
                                  }`}
                              >
                                <child.icon size={14} className="mr-2" />
                                <span className="truncate">{child.title.toUpperCase()}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                const active = isActive(item.path)
                return (
                  <button
                    key={item.id}
                    onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center p-2 rounded-none transition font-bold uppercase tracking-wide ${active ? 'bg-blue-600 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
                  >
                    <item.icon size={16} className="mr-2" />
                    <span className="text-[10px] tracking-wide">{item.title.toUpperCase()}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 0; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #d4d4d8; }
      `}} />
    </>
  )
}

export default Sidebar
