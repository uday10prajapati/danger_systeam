import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Bell, Search, ChevronDown,
  Settings, Mail, LogOut, User as UserIcon
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

function Navbar({ backendStatus }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { i18n, t } = useTranslation()
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const currentUser = JSON.parse(localStorage.getItem('user')) || {
    username: 'Admin',
    email: 'admin@csms.local',
    role: 'Super Admin'
  }

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
  }

  return (
    <nav className="h-20 bg-white/80 backdrop-blur-md sticky top-0 z-30 transition-all px-8 flex items-center justify-between border-b border-transparent">

      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-5 py-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all border border-slate-100">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search something here....."
            className="bg-transparent border-none outline-none text-sm text-slate-600 w-full placeholder:text-slate-400 font-medium"
          />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-6 ml-6">

        {/* Financial Year Badge */}
        <div className="flex bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">{currentUser.financial_year || '2026-27'}</span>
        </div>

        {/* Language Selector */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => changeLanguage('en')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${i18n.language === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >EN</button>
          <button
            onClick={() => changeLanguage('gu')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${i18n.language === 'gu' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >GU</button>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-blue-600 rounded-full transition-all relative"
          >
            <Bell size={22} />
            <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-4 w-80 bg-white border border-slate-100 rounded-lg shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200 shadow-blue-100/20">
              <h4 className="text-sm font-bold text-slate-800 mb-4 px-2">Notifications</h4>
              <div className="space-y-1">
                {[
                  { title: 'New Order Received', text: 'Order #412 has been placed.', time: '2 mins ago', unread: true },
                  { title: 'Low Stock Alert', text: 'Apples are below threshold.', time: '1h ago', unread: false },
                ].map((n, i) => (
                  <div key={i} className={`flex gap-3 p-3 rounded-lg transition-colors cursor-pointer ${n.unread ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${n.unread ? 'bg-blue-600' : 'bg-transparent'}`} />
                    <div>
                      <p className="text-xs font-bold text-slate-800">{n.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{n.text}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
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
            className="flex items-center gap-3 p-1 rounded-full hover:bg-slate-50 transition-all"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
              <img
                src={`https://ui-avatars.com/api/?name=${currentUser.username}&background=0D8ABC&color=fff`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-bold text-slate-900 leading-none">{currentUser.username}</p>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">{currentUser.email || 'Admin'}</p>
            </div>
            <ArrowDown size={14} className="text-slate-400 ml-1" />
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-4 w-64 bg-white border border-slate-100 rounded-lg shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right shadow-blue-100/20">
              <button className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-600 hover:bg-slate-50 transition-all text-xs font-bold">
                <UserIcon size={18} /> Profile Details
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-600 hover:bg-slate-50 transition-all text-xs font-bold">
                <Settings size={18} /> Settings
              </button>
              <div className="h-px bg-slate-50 my-1 mx-2"></div>
              <button
                onClick={() => { localStorage.removeItem('user'); navigate('/login'); }}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-rose-500 hover:bg-rose-50 transition-all text-xs font-bold"
              >
                <LogOut size={18} /> Log Out
              </button>
            </div>
          )}
        </div>

      </div>
    </nav>
  )
}

// Simple ArrowDown component since I removed ChevronDown earlier
const ArrowDown = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export default Navbar
