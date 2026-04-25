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
  ArrowLeftRight
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
        { id: 'dangar-entry', title: t('modules.dangarEntry'), icon: Database, path: '/dangar-entry' },
        { id: 'bardan-portfolio', title: 'Bardan Portfolio', icon: ArrowLeftRight, path: '/bardan-portfolio' },
      ]
    },
    { id: 'sales', title: t('modules.sale'), icon: ShoppingCart, path: '/sales' },
    { id: 'purchase', title: t('modules.purchase'), icon: TrendingUp, path: '/purchase' },
    { id: 'rates', title: t('modules.itemRate'), icon: BarChart3, path: '/rates' },
    { id: 'rojmel', title: t('modules.rojmel'), icon: Book, path: '/rojmel' },
    { id: 'sales-return', title: t('modules.saleReturn'), icon: RotateCcw, path: '/sales-return' },
    { id: 'purchase-return', title: t('modules.purchaseReturn'), icon: TrendingDown, path: '/purchase-return' },
    // { id: 'barcode', title: t('modules.barcodeScanner'), icon: Barcode, path: '/barcode' },
    { id: 'ledger', title: t('modules.accountLedger'), icon: BookOpen, path: '/ledger' },
    { id: 'sabhasad-ledger', title: t('modules.sabhasadLedger'), icon: Users, path: '/sabhasad-ledger' },
    { id: 'ledger-report', title: t('modules.ledgerAudit'), icon: FileText, path: '/ledger-report' },
    { id: 'profit-loss', title: t('modules.profitAndLoss'), icon: BarChart2, path: '/profit-loss' },
    { id: 'stock', title: t('modules.stockReport'), icon: Package, path: '/stock' },
    { id: 'purchase-report', title: t('modules.purchaseReport'), icon: FileText, path: '/purchase-report' },
    { id: 'sale-report', title: t('modules.saleReport'), icon: ShoppingCart, path: '/sale-report' },
  ]

  const isActive = (path) => location.pathname === path

  // Auto-expand menus if a child is active
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
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-white border border-slate-200 text-slate-900 p-2.5 rounded-xl shadow-lg"
        >
          {mobileMenuOpen ? <X size={20} /> : <LayoutDashboard size={20} />}
        </button>
      </div>

      {/* Sidebar Desktop */}
      <aside
        className="fixed left-0 top-0 h-screen bg-white text-slate-600 z-40 border-r border-slate-100 flex flex-col w-64"
      >
        {/* Brand Section */}
        <div className="h-20 flex items-center px-6 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-[32px] w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-1.5 h-1.5 bg-white rounded-full opacity-40"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full transition-all"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-white rounded-full opacity-60"></div>
              </div>
            </div>
            <h1 className="text-slate-900 font-bold text-xl tracking-tight transition-opacity duration-300">
              Danger Systeam
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-4 px-3 custom-scrollbar">
          <div className="space-y-1">
            {menuItems.map((item) => {
              if (item.children) {
                const isOpen = openMenus.includes(item.id)
                const isChildActive = item.children.some(child => isActive(child.path))

                return (
                  <div key={item.id} className="space-y-1">
                    <button
                      onClick={() => toggleMenu(item.id)}
                      className={`w-full flex items-center justify-between group p-3 rounded-xl transition-all duration-200 ${
                        isChildActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center">
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${isChildActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-900'}`} />
                        <span className="ml-3 text-sm font-medium truncate">{item.title}</span>
                      </div>
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    
                    {isOpen && (
                      <div className="ml-4 pl-4 border-l border-slate-100 space-y-1 mt-1">
                        {item.children.map((child) => {
                          const childActive = isActive(child.path)
                          return (
                            <button
                              key={child.id}
                              onClick={() => navigate(child.path)}
                              className={`w-full flex items-center group p-2.5 rounded-lg transition-all duration-200 ${
                                childActive 
                                  ? 'bg-blue-50 text-blue-600 font-semibold' 
                                  : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              <child.icon className={`w-4 h-4 flex-shrink-0 ${childActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-900'}`} />
                              <span className="ml-3 text-xs font-medium truncate">{child.title}</span>
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
                  className={`w-full flex items-center group p-3 rounded-xl transition-all duration-200 relative ${
                    active 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {/* Active Indicator Bar */}
                  {active && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-600 rounded-r-full" />
                  )}
                  
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-900 transition-colors'}`} />
                  
                  <span className={`ml-3 text-sm font-medium truncate ${active ? 'font-semibold' : ''}`}>
                    {item.title}
                  </span>

                </button>
              )
            })}
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-3 border-t border-slate-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center p-3 rounded-xl hover:bg-red-50 text-slate-500 hover:text-red-500 transition-all"
          >
            <LogOut size={18} />
            <span className="ml-3 text-sm font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 md:hidden transition-all"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="w-72 h-full bg-white shadow-2xl relative flex flex-col p-4 animate-in slide-in-from-left duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-0.5">
                    <div className="w-1.5 h-1.5 bg-white rounded-full opacity-40"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full opacity-60"></div>
                  </div>
                </div>
                <h1 className="text-slate-900 font-bold text-xl">Danger Systeam</h1>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 p-2 hover:bg-slate-50 rounded-lg"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1">
              {menuItems.map((item) => {
                if (item.children) {
                  const isOpen = openMenus.includes(item.id)
                  const isChildActive = item.children.some(child => isActive(child.path))

                  return (
                    <div key={item.id} className="space-y-1">
                      <button
                        onClick={() => toggleMenu(item.id)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all ${
                          isChildActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <item.icon size={20} className={isChildActive ? 'text-blue-600' : 'text-slate-400'} />
                          <span className="ml-3 font-semibold text-sm">{item.title}</span>
                        </div>
                        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>

                      {isOpen && (
                        <div className="ml-4 pl-4 border-l-2 border-slate-100 space-y-1">
                          {item.children.map((child) => {
                            const active = isActive(child.path)
                            return (
                              <button
                                key={child.id}
                                onClick={() => { navigate(child.path); setMobileMenuOpen(false); }}
                                className={`w-full flex items-center p-3 rounded-lg transition-all ${
                                  active ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
                                }`}
                              >
                                <child.icon size={18} />
                                <span className="ml-3 font-medium text-sm">{child.title}</span>
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
                    className={`w-full flex items-center p-3.5 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <item.icon size={20} />
                    <span className="ml-3 font-semibold text-sm">{item.title}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #e2e8f0; }
      `}} />
    </>
  )
}

export default Sidebar
