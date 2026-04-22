import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Menu, X, Home, ArrowLeft, Globe, 
  Bell, Search, User, CheckCircle, 
  AlertCircle, ChevronDown, Settings,
  Activity, ShieldCheck, Mail, LogOut
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

function Navbar({ backendStatus }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { i18n, t } = useTranslation()
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const isHome = location.pathname === '/' || location.pathname === '/dashboard'

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
  }

  const currentUser = JSON.parse(localStorage.getItem('user')) || { username: 'Admin', role: 'Super Admin' }

  return (
    <nav className="h-16 bg-white border-b border-slate-100 sticky top-0 z-30 transition-all">
      <div className="h-full px-6 flex items-center justify-between">
        
        {/* Context-Aware Navigation */}
        <div className="flex items-center gap-6">
          {!isHome ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-slate-800 hover:text-blue-600 transition-colors font-bold text-sm group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Overview</span>
            </button>
          ) : (
            <div className="hidden lg:flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 w-80 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-50 transition-all">
               <Search className="w-4 h-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Search platform..." 
                 className="bg-transparent border-none outline-none text-xs text-slate-600 w-full font-bold placeholder:text-slate-300" 
               />
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-3 md:gap-5">
          
          {/* Status Badge */}
          <div className="hidden md:flex items-center gap-2 pr-4 border-r border-slate-100">
             <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                backendStatus === 'Connected' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
             }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'Connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {backendStatus}
             </div>
          </div>

          {/* Lang Selector */}
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
             <button 
               onClick={() => changeLanguage('en')}
               className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-tight transition-all ${i18n.language === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >EN</button>
             <button 
               onClick={() => changeLanguage('gu')}
               className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-tight transition-all ${i18n.language === 'gu' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >GU</button>
          </div>

          {/* Notifications */}
          <div className="relative">
             <button 
               onClick={() => setShowNotifications(!showNotifications)}
               className="p-2 text-slate-400 hover:text-slate-900 transition-colors relative"
             >
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
             </button>
             
             {showNotifications && (
               <div className="absolute right-0 mt-4 w-80 bg-white border border-slate-100 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">System Alerts</h4>
                  <div className="space-y-3">
                     {[
                       { icon: CheckCircle, title: 'Session Verified', text: 'Daily login successful.', time: 'Just now', color: 'text-emerald-500' },
                       { icon: AlertCircle, title: 'Stock Alert', text: '5 items are below reorder level.', time: '2h ago', color: 'text-rose-500' },
                     ].map((n, i) => (
                       <div key={i} className="flex gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer">
                          <n.icon size={16} className={n.color} />
                          <div>
                             <p className="text-xs font-bold text-slate-800">{n.title}</p>
                             <p className="text-[10px] text-slate-400 font-medium leading-tight">{n.text}</p>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
             )}
          </div>

          {/* User Profile */}
          <div className="relative">
             <button 
               onClick={() => setShowProfile(!showProfile)}
               className="flex items-center gap-2.5 p-1 group transition-all"
             >
                <div className="w-8 h-8 md:w-9 md:h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xs uppercase shadow-lg shadow-slate-200 group-hover:scale-105 transition-transform">
                   {currentUser.username[0]}
                </div>
                <div className="hidden sm:block text-left">
                   <p className="text-xs font-black text-slate-800 tracking-tight leading-none mb-0.5">{currentUser.username}</p>
                   <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{currentUser.role || 'Partner'}</p>
                </div>
                <ChevronDown size={14} className={`text-slate-300 transition-transform ${showProfile ? 'rotate-180' : ''}`} />
             </button>

             {showProfile && (
               <div className="absolute right-0 mt-4 w-60 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="px-3 py-2 border-b border-slate-50 mb-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Management Console</p>
                  </div>
                  <button className="w-full flex items-center gap-3 p-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all text-xs font-bold">
                     <User size={16} /> Business Profile
                  </button>
                  <button className="w-full flex items-center gap-3 p-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all text-xs font-bold">
                     <ShieldCheck size={16} /> Security Audit
                  </button>
                  <button className="w-full flex items-center gap-3 p-2.5 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all text-xs font-bold">
                     <Settings size={16} /> Environment Settings
                  </button>
                  <div className="h-px bg-slate-50 my-2"></div>
                  <button 
                    onClick={() => { localStorage.removeItem('user'); navigate('/login'); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all text-xs font-black uppercase tracking-widest"
                  >
                     Sign Out Console
                  </button>
               </div>
             )}
          </div>

        </div>
      </div>
    </nav>
  )
}

export default Navbar
