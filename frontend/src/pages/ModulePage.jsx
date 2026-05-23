import React from 'react'
import { useTranslation } from 'react-i18next'
import { Construction, Activity, Database, ChevronRight } from 'lucide-react'

const ModulePage = ({ title, description }) => {
   const { t } = useTranslation()

   return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 p-6 md:p-12">
         <div className="max-w-[1000px] mx-auto space-y-8">

            {/* Header - Industrial Monochrome */}
            <div className="flex justify-between items-end border-b-4 border-black pb-4">
               <div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{title}</h1>
                  <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">SYSTEM MODULE INTERFACE / ACCESS_CODE_PENDING</p>
               </div>
               <Construction size={32} className="text-slate-200" strokeWidth={1} />
            </div>

            {/* Development Banner - High Contrast Industrial */}
            <div className="bg-white rounded-lg shadow-2xl border-4 border-black overflow-hidden relative group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 border border-slate-100 group-hover:scale-110 transition-transform duration-1000"></div>

               <div className="p-12 relative z-10 flex flex-col items-center text-center">
                  <div className="p-6 bg-slate-900 rounded-lg text-white shadow-2xl mb-8 border border-slate-800 rotate-3 group-hover:rotate-0 transition-transform">
                     <Activity size={48} strokeWidth={1} className="animate-pulse" />
                  </div>

                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic mb-4">{t('modulePage.comingSoon', 'Module Redeployment Active')}</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] max-w-md mx-auto mb-10 leading-relaxed italic">
                     {description || t('modulePage.thisModuleUnderDevelopment', 'This architectural segment is currently undergoing structural refactoring and data normalization.')}
                  </p>

                  <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                     <div className="p-4 bg-slate-50 rounded-lg border-2 border-slate-100 text-left">
                        <span className="text-[12px] font-black text-slate-300 uppercase tracking-widest block mb-1">State</span>
                        <span className="text-[10px] font-black text-slate-900 uppercase italic">In_Progress</span>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-lg border-2 border-slate-100 text-left">
                        <span className="text-[12px] font-black text-slate-300 uppercase tracking-widest block mb-1">Authorization</span>
                        <span className="text-[10px] font-black text-slate-900 uppercase italic">Admin_Only</span>
                     </div>
                  </div>
               </div>

               {/* Industrial Footer Warning */}
               <div className="bg-black py-4 px-8 flex justify-between items-center group-hover:bg-slate-900 transition-colors">
                  <div className="flex gap-4 items-center">
                     <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                     <span className="text-[12px] font-black text-white uppercase tracking-[0.4em]">Construct Node V2.0</span>
                  </div>
                  <ChevronRight className="text-white opacity-20" size={20} strokeWidth={3} />
               </div>
            </div>

            {/* Global Registry Summary Footer */}
            <div className="flex justify-between items-center text-slate-400 font-black uppercase tracking-widest text-[12px] italic pt-12 pb-10 border-t border-slate-200">
               <div className="flex items-center gap-4">
                  <span>MANIFEST_ID: MOD_PENDING</span>
                  <div className="w-1 h-1 bg-slate-100 rounded-full"></div>
                  <span>REGISTRY_AUTH: VERIFIED_CORE</span>
               </div>
               <div>SYSTEM_CHRONO: {new Date().toISOString()}</div>
            </div>
         </div>
      </div>
   )
}

export default ModulePage
