import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSidebar } from '../context/SidebarContext'
import {
  Menu,
  X,
  Building2,
  Users,
  DollarSign,
  Users2,
  Package,
  BarChart3,
  ShoppingCart,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Barcode,
  Book,
  BookOpen,
  BarChart2,
  LogOut,
} from 'lucide-react'

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { sidebarOpen, setSidebarOpen } = useSidebar()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const modules = [
    {
      id: 'company',
      title: t('modules.company'),
      icon: Building2,
      path: '/company',
    },
    {
      id: 'users',
      title: t('modules.userMaster'),
      icon: Users,
      path: '/users',
    },
    {
      id: 'accounts',
      title: t('modules.accountMaster'),
      icon: DollarSign,
      path: '/accounts',
    },
    {
      id: 'members',
      title: t('modules.memberMaster'),
      icon: Users2,
      path: '/members',
    },
    {
      id: 'items',
      title: t('modules.itemMaster'),
      icon: Package,
      path: '/items',
    },
    {
      id: 'rates',
      title: t('modules.itemRate'),
      icon: BarChart3,
      path: '/rates',
    },
    {
      id: 'sales',
      title: t('modules.sale'),
      icon: ShoppingCart,
      path: '/sales',
    },
    {
      id: 'sales-return',
      title: t('modules.saleReturn'),
      icon: RotateCcw,
      path: '/sales-return',
    },
    {
      id: 'purchase',
      title: t('modules.purchase'),
      icon: TrendingUp,
      path: '/purchase',
    },
    {
      id: 'purchase-return',
      title: t('modules.purchaseReturn'),
      icon: TrendingDown,
      path: '/purchase-return',
    },
    {
      id: 'barcode',
      title: t('modules.barcodeScanner'),
      icon: Barcode,
      path: '/barcode',
    },
    {
      id: 'cashbook',
      title: t('modules.cashBook'),
      icon: Book,
      path: '/cashbook',
    },
    {
      id: 'ledger',
      title: t('modules.accountLedger'),
      icon: BookOpen,
      path: '/ledger',
    },
    {
      id: 'ledger-report',
      title: 'Ledger Report', // Use plain string or missing translation for now
      icon: BookOpen,
      path: '/ledger-report',
    },
    {
      id: 'rojmel',
      title: 'Rojmel (રોજમેળ)',
      icon: BookOpen,
      path: '/rojmel',
    },
    {
      id: 'sabhasad-ledger',
      title: t('modules.sabhasadLedger'),
      icon: BookOpen,
      path: '/sabhasad-ledger',
    },
    {
      id: 'profit-loss',
      title: t('modules.profitAndLoss'),
      icon: BarChart2,
      path: '/profit-loss',
    },
    {
      id: 'stock',
      title: t('modules.stockReport'),
      icon: Package,
      path: '/stock',
    },
  ]

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('rememberUsername')
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <>
      {/* Mobile Menu Button in Sidebar (shown on mobile) */}
      <div className="md:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 rounded-full shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all active:shadow-md"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 pt-20 h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 flex-col transition-all duration-300 z-40 border-r border-slate-200 shadow-sm ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-20 -right-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white p-1 rounded-full hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {/* Modules List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {modules.map((module) => (
            <button
              key={module.id}
              onClick={() => navigate(module.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
                isActive(module.path)
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm hover:shadow-md'
                  : 'text-slate-700 hover:bg-slate-200 active:bg-slate-300'
              }`}
              title={module.title}
            >
              <module.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-semibold">{module.title}</span>}
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="border-t border-slate-200 p-3 space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 active:bg-red-100 transition-all font-semibold"
            title="Logout"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-semibold">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="fixed left-0 top-0 pt-20 h-screen w-64 bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900 flex flex-col overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modules List */}
            <nav className="flex-1 px-3 py-4 space-y-2">
              {modules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => {
                    navigate(module.path)
                    setMobileMenuOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
                    isActive(module.path)
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-200 active:bg-slate-300'
                  }`}
                >
                  <module.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-semibold">{module.title}</span>
                </button>
              ))}
            </nav>

            {/* Logout Button */}
            <div className="border-t border-slate-200 p-3 space-y-2">
              <button
                onClick={() => {
                  handleLogout()
                  setMobileMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 active:bg-red-100 transition-all font-semibold"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-semibold">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
