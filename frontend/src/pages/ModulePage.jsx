import React from 'react'
import { useTranslation } from 'react-i18next'

const ModulePage = ({ title, description }) => {
  const { t } = useTranslation()
  
  return (
    <div className="min-h-screen bg-linear-to-br from-white via-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">{title}</h1>
          <p className="text-slate-600 mb-8">{description}</p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
            <p className="text-lg text-slate-700 font-semibold">{t('modulePage.comingSoon')}</p>
            <p className="text-sm text-slate-500 mt-2">{t('modulePage.thisModuleUnderDevelopment')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModulePage
