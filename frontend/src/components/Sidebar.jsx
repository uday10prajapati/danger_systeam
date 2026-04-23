import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSidebar } from '../context/SidebarContext'
import {
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
  LayoutDashboard,
  ChevronRight,
  Settings,
  ChevronLeft,
  X,
  FileText,
} from 'lucide-react'

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { sidebarOpen, setSidebarOpen } = useSidebar()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const modules = [
    { title: t('modules.home'), isHeader: true },
    { id: 'dashboard', title: t('modules.dashboard'), icon: LayoutDashboard, path: '/dashboard' },
    
    { title: t('modules.management'), isHeader: true },
    { id: 'company', title: t('modules.company'), icon: Building2, path: '/company' },
    { id: 'users', title: t('modules.userMaster'), icon: Users, path: '/users' },
    { id: 'members', title: t('modules.memberMaster'), icon: Users2, path: '/members' },
    { id: 'items', title: t('modules.itemMaster'), icon: Package, path: '/items' },
    { id: 'accounts', title: t('modules.accountMaster'), icon: DollarSign, path: '/accounts' },
    
    { title: t('modules.business'), isHeader: true },
    { id: 'sales', title: t('modules.sale'), icon: ShoppingCart, path: '/sales' },
    { id: 'purchase', title: t('modules.purchase'), icon: TrendingUp, path: '/purchase' },
    { id: 'rates', title: t('modules.itemRate'), icon: BarChart3, path: '/rates' },
    { id: 'rojmel', title: t('modules.rojmel'), icon: Book, path: '/rojmel' },
    
    { title: t('modules.transactions'), isHeader: true },
    { id: 'sales-return', title: t('modules.saleReturn'), icon: RotateCcw, path: '/sales-return' },
    { id: 'purchase-return', title: t('modules.purchaseReturn'), icon: TrendingDown, path: '/purchase-return' },
    { id: 'barcode', title: t('modules.barcodeScanner'), icon: Barcode, path: '/barcode' },
    
    { title: t('modules.financials'), isHeader: true },
    { id: 'ledger-report', title: t('modules.ledgerAudit'), icon: BookOpen, path: '/ledger-report' },
    { id: 'profit-loss', title: t('modules.profitAndLoss'), icon: BarChart2, path: '/profit-loss' },
    { id: 'stock', title: t('modules.stockReport'), icon: Package, path: '/stock' },
    { id: 'purchase-report', title: t('modules.purchaseReport'), icon: FileText, path: '/purchase-report' },
    { id: 'sale-report', title: t('modules.saleReport'), icon: ShoppingCart, path: '/sale-report' },
  ]

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-white border border-slate-200 text-slate-900 p-2.5 rounded-xl shadow-lg"
        >
          {mobileMenuOpen ? <ChevronLeft size={20} /> : <LayoutDashboard size={20} />}
        </button>
      </div>

      {/* Sidebar Desktop */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white text-slate-600 transition-all duration-300 z-40 border-r border-slate-100 flex flex-col ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Brand Section */}
        <div className="h-20 flex items-center px-6 border-b border-slate-50 overflow-hidden">
           <div className="min-w-[40px] w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center font-black text-white text-xl">
              S
           </div>
           {sidebarOpen && (
              <div className="ml-3">
                 <h1 className="text-slate-900 font-extrabold text-sm tracking-tight leading-none uppercase">SuperStore</h1>
                 <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-1 uppercase">Enterprise</p>
              </div>
           )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 custom-scrollbar">
           {modules.map((m, idx) => {
              if (m.isHeader) {
                return sidebarOpen ? (
                  <div key={idx} className="mt-6 mb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                    {m.title}
                  </div>
                ) : (
                  <div key={idx} className="h-px bg-slate-100 my-4 mx-2" />
                )
              }

              const active = isActive(m.path)
              return (
                <button
                  key={m.id}
                  onClick={() => navigate(m.path)}
                  className={`relative w-full flex items-center group mb-0.5 p-3 rounded-xl transition-all duration-200 ${
                    active 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <m.icon className={`w-5 h-5 flex-shrink-0 transition-transform ${active ? 'text-blue-600 scale-110' : 'text-slate-400 group-hover:text-slate-900 group-hover:scale-110'}`} />
                  
                  {/* Expanded Label */}
                  {sidebarOpen && (
                    <span className={`ml-3 text-sm font-bold truncate transition-all duration-200 ${active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                      {m.title}
                    </span>
                  )}

                  {/* Active Indicator (Expanded) */}
                  {sidebarOpen && active && <div className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)]" />}

                  {/* Collapsed Tooltip (Premium Industrial Label) */}
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-x-2 group-hover:translate-x-0 shadow-2xl z-50 whitespace-nowrap border border-white/10 pointer-events-none">
                       {m.title}
                       {/* Tooltip Arrow */}
                       <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-b border-white/10" />
                    </div>
                  )}
                </button>
              )
           })}
        </div>

        {/* Bottom Section */}
        <div className="p-3 border-t border-slate-50 bg-slate-50/30">
           <button
             onClick={() => setSidebarOpen(!sidebarOpen)}
             className="w-full flex items-center p-3 rounded-xl hover:bg-white text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-100"
           >
              {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              {sidebarOpen && <span className="ml-3 text-[10px] font-black uppercase tracking-widest leading-none">{t('modules.hideMenu')}</span>}
           </button>
           
           <button
             onClick={handleLogout}
             className="mt-1 w-full flex items-center p-3 rounded-xl hover:bg-red-50 text-red-500 transition-all border border-transparent hover:border-red-100"
           >
              <LogOut size={18} />
              {sidebarOpen && <span className="ml-3 text-sm font-bold">{t('modules.logout')}</span>}
           </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 md:hidden transition-all"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div 
            className="w-72 h-full bg-white shadow-2xl relative flex flex-col p-4 animate-in slide-in-from-left duration-300"
            onClick={e => e.stopPropagation()}
          >
             {/* Mobile Header */}
             <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center font-black text-white text-xl">S</div>
                   <h1 className="text-slate-900 font-extrabold text-sm tracking-tight leading-none uppercase">SuperStore</h1>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 p-2 hover:bg-slate-50 rounded-lg"><X size={20}/></button>
             </div>
             
             {/* Nav List */}
             <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                {modules.map((m, idx) => {
                   if (m.isHeader) return <div key={idx} className="mt-5 mb-2 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.title}</div>
                   const active = isActive(m.path)
                   return (
                     <button
                       key={m.id}
                       onClick={() => { navigate(m.path); setMobileMenuOpen(false); }}
                       className={`w-full flex items-center p-3.5 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
                     >
                        <m.icon size={20} className={active ? 'text-white' : 'text-slate-400'} />
                        <span className="ml-3 font-bold text-sm tracking-wide">{m.title}</span>
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
