import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Bell, ChevronDown, Settings, LogOut, User as UserIcon,
  LayoutDashboard, Building2, Users, Users2, Package,
  DollarSign, ShoppingCart, TrendingUp, BarChart3, Book,
  RotateCcw, TrendingDown, BookOpen, BarChart2, FileText,
  MapPin, Database, ArrowLeftRight, MessageSquare, Shield, Menu, X, ChevronRight, ChevronLeft
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
    id: 'reports', label: 'modules.reports', icon: BarChart2, path: '/reports',
    children: [
      { id: 'ledger', label: 'modules.accountLedger', icon: BookOpen, path: '/ledger' },
      { id: 'sabhasad-ledger', label: 'modules.sabhasadLedger', icon: Users, path: '/sabhasad-ledger' },
      { id: 'bardan-report', label: 'modules.bardanReport', icon: Package, path: '/bardan-report' },
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

const SidebarGroup = ({ group, onNavigate, isCollapsed, expandedGroup, setExpandedGroup, onUncollapse }) => {
  const { t } = useTranslation()
  const location = useLocation()
  
  const isChildActive = group.children?.some(c => location.pathname === c.path)
  const active = !group.children && location.pathname === group.path
  const isOpen = expandedGroup === group.id || (isChildActive && expandedGroup === null);

  useEffect(() => {
    if (isChildActive && expandedGroup === null) {
      setExpandedGroup(group.id)
    }
  }, [isChildActive, expandedGroup, group.id, setExpandedGroup])

  if (!group.children) {
    return (
      <button
        onClick={() => {
          onNavigate(group.path);
          setExpandedGroup(group.id);
        }}
        className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold transition select-none tracking-wide ${
          active 
            ? 'bg-[#1d5f84] text-white shadow-sm rounded-md' 
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md'
        }`}
        title={isCollapsed ? t(group.label) : ''}
      >
        <group.icon size={16} className="shrink-0" />
        {!isCollapsed && <span className="truncate uppercase">{t(group.label)}</span>}
      </button>
    )
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => {
           if (group.path) onNavigate(group.path);
           if (isCollapsed) {
               if (onUncollapse) onUncollapse();
               if (!group.path) setExpandedGroup(group.id);
               return;
           }
           setExpandedGroup(isOpen ? null : group.id)
        }}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold transition select-none tracking-wide rounded-md ${
          isChildActive && !isOpen
            ? 'bg-slate-100 text-slate-900 shadow-sm border border-slate-200'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
        }`}
        title={isCollapsed ? t(group.label) : ''}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <group.icon size={16} className="shrink-0" />
          {!isCollapsed && <span className="truncate uppercase">{t(group.label)}</span>}
        </div>
        {!isCollapsed && (
          <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#1d5f84]' : 'text-slate-400'}`} />
        )}
      </button>

      {!isCollapsed && isOpen && (
        <div className="pl-7 pr-2 space-y-0.5 mt-1 animate-in slide-in-from-top-2 duration-200 overflow-hidden">
          {group.children.map(child => {
            const childActive = location.pathname === child.path
            return (
              <button
                key={child.id}
                onClick={() => onNavigate(child.path)}
                className={`w-full flex items-center gap-3 px-3 py-1.5 text-xs text-left transition select-none rounded-md ${
                  childActive
                    ? 'bg-blue-50 text-[#1d5f84] font-bold border border-blue-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-semibold border border-transparent'
                }`}
              >
                <child.icon size={14} className={`shrink-0 ${childActive ? 'text-[#1d5f84]' : 'text-slate-400'}`} />
                <span className="truncate">{t(child.label)}</span>
              </button>
            )
          })}
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
  const [expandedGroup, setExpandedGroup] = useState(null)
  const profileRef = useRef(null)

  // Use localStorage for sidebar state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved === 'true'
  })

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

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const newState = !prev
      localStorage.setItem('sidebarCollapsed', String(newState))
      if (newState) {
         setExpandedGroup(null);
      }
      return newState
    })
  }

  return (
    <aside className={`bg-white border-r border-slate-200 flex flex-col h-screen transition-all duration-300 z-40 relative select-none shadow-sm ${isCollapsed ? 'w-[72px]' : 'w-64'}`}>
       {/* Top brand & toggle */}
       <div className="h-14 flex items-center justify-between px-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => navigate('/dashboard')}>
             <div className="w-8 h-8 bg-[#1d5f84] flex items-center justify-center text-white font-mono text-sm font-bold rounded-md shrink-0 shadow-sm border border-[#154662]">
                DS
             </div>
             {!isCollapsed && (
                 <div className="flex flex-col">
                     <span className="font-extrabold text-sm text-slate-800 tracking-tight whitespace-nowrap">Danger Systeam</span>
                     <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">{backendStatus}</span>
                 </div>
             )}
          </div>
       </div>

       {/* Toggle button on the edge */}
       <button 
         onClick={toggleSidebar}
         className="absolute -right-3 top-4 bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:bg-slate-50 z-50 text-slate-500 hover:text-slate-800"
       >
         {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
       </button>

       {/* Nav Items */}
       <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 scrollbar-hide">
         {NAV_GROUPS.map(group => (
            <SidebarGroup 
              key={group.id} 
              group={group} 
              onNavigate={navigate} 
              isCollapsed={isCollapsed} 
              expandedGroup={expandedGroup}
              setExpandedGroup={setExpandedGroup}
              onUncollapse={() => setIsCollapsed(false)}
            />
         ))}
       </div>

       {/* Bottom Actions */}
       <div className="border-t border-slate-200 shrink-0 p-3 flex flex-col gap-2 bg-slate-50">
         {!isCollapsed && (
           <div className="bg-white border border-slate-200 rounded-md px-2 py-1.5 flex justify-center items-center shadow-sm">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
               {t('modules.financialYear')} {currentUser.financial_year || '2026-27'}
             </span>
           </div>
         )}
         
         <div className={`flex bg-white border border-slate-200 shadow-sm rounded-md p-0.5 notranslate ${isCollapsed ? 'flex-col gap-0.5' : 'flex-row gap-0.5'}`} translate="no">
            <button onClick={() => changeLanguage('en')} className={`flex-1 flex items-center justify-center px-2 py-1 text-[10px] font-bold transition rounded ${i18n.language === 'en' ? 'bg-[#1d5f84] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
              <CanvasLabel text="EN" />
            </button>
            <button onClick={() => changeLanguage('gu')} className={`flex-1 flex items-center justify-center px-2 py-1 text-[10px] font-bold transition rounded ${i18n.language === 'gu' ? 'bg-[#1d5f84] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
              <CanvasLabel text="GU" />
            </button>
         </div>

         <div ref={profileRef} className="relative mt-1">
            <button
               onClick={() => setShowProfile(o => !o)}
               className="w-full flex items-center justify-center gap-2 p-2 bg-white hover:bg-slate-100 transition border border-slate-200 shadow-sm rounded-md"
            >
               <div className="w-6 h-6 rounded-md bg-blue-50 text-[#1d5f84] flex items-center justify-center shrink-0 border border-blue-100">
                 <UserIcon size={14} />
               </div>
               {!isCollapsed && (
                 <>
                   <div className="flex-1 text-left truncate">
                      <p className="text-[11px] font-bold text-slate-700 truncate">{currentUser.full_name_gu || currentUser.username}</p>
                   </div>
                   <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${showProfile ? 'rotate-180' : ''}`} />
                 </>
               )}
            </button>

            {showProfile && (
               <div className={`absolute bottom-full mb-2 bg-white border border-slate-200 rounded-md shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100 font-sans z-50 ${isCollapsed ? 'left-0 w-48 origin-bottom-left' : 'right-0 w-full origin-bottom'}`}>
                  <div className="px-3 py-2 mb-1 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-800">{(currentUser.full_name_gu || currentUser.username || 'ADMIN')}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">{currentUser.role || 'ADMIN'}</p>
                  </div>
                  <button onClick={() => { localStorage.removeItem('user'); navigate('/login') }} className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 transition font-bold text-xs uppercase select-none">
                    <LogOut size={14} /> {t('modules.logout')}
                  </button>
               </div>
            )}
         </div>
       </div>
    </aside>
  )
}

export default Navbar
