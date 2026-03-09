import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, Home, ArrowLeft, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function Navbar({ backendStatus }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { i18n, t } = useTranslation()

  const isHome = location.pathname === '/'

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
  }

  return (
    <nav className="bg-white text-slate-900 shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-linear-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">SS</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{t('navbar.superstore')}</h1>
              <p className="text-xs text-slate-500">{t('navbar.managementSystem')}</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {!isHome && (
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-700"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('navbar.backToDashboard')}</span>
              </button>
            )}
            
            {/* Language Switcher */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
              <Globe className="w-4 h-4 text-slate-600" />
              <button
                onClick={() => changeLanguage('en')}
                className={`px-3 py-1 rounded transition-colors ${
                  i18n.language === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                EN
              </button>
              <span className="text-slate-400">|</span>
              <button
                onClick={() => changeLanguage('gu')}
                className={`px-3 py-1 rounded transition-colors ${
                  i18n.language === 'gu'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                GU
              </button>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg border border-slate-200">
              <div className={`w-2 h-2 rounded-full ${backendStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-slate-600">{backendStatus}</span>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-slate-200 space-y-2">
            {!isHome && (
              <button
                onClick={() => {
                  navigate('/')
                  setMobileMenuOpen(false)
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors text-left text-slate-700"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t('navbar.backToDashboard')}</span>
              </button>
            )}
            
            {/* Mobile Language Switcher */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
              <Globe className="w-4 h-4 text-slate-600" />
              <button
                onClick={() => {
                  changeLanguage('en')
                  setMobileMenuOpen(false)
                }}
                className={`px-3 py-1 rounded transition-colors text-sm ${
                  i18n.language === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                EN
              </button>
              <span className="text-slate-400">|</span>
              <button
                onClick={() => {
                  changeLanguage('gu')
                  setMobileMenuOpen(false)
                }}
                className={`px-3 py-1 rounded transition-colors text-sm ${
                  i18n.language === 'gu'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                GU
              </button>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg border border-slate-200">
              <div className={`w-2 h-2 rounded-full ${backendStatus === 'Connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-slate-600">{backendStatus}</span>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
