import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DeleteConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  const { t, i18n } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-none" 
        onClick={onCancel}
      ></div>
      
      <div className={`bg-white border border-zinc-400 rounded-none w-full max-w-sm shadow-lg relative z-10 overflow-hidden flex flex-col select-none ${i18n.language === 'gu' ? 'font-prompt' : 'font-mono text-xs'}`}>
        <div className="px-4 py-2.5 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-red-700" />
            <h3 className={`text-xs font-bold text-zinc-800 uppercase tracking-wider leading-none ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
              {title || t('common.confirmDelete')}
            </h3>
          </div>
          <button 
            onClick={onCancel} 
            className="p-0.5 text-zinc-400 hover:text-red-600 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 bg-white flex flex-col gap-3">
          <p className={`text-zinc-700 ${i18n.language === 'gu' ? 'font-prompt text-sm' : 'font-sans text-xs'}`}>
            {message || t('common.deleteConfirmDefault')}
          </p>
          
          <div className="flex gap-2 justify-end border-t border-zinc-100 pt-3 mt-1">
            <button
              onClick={onCancel}
              className={`px-3.5 py-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition select-none rounded-none text-xs ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-1.5 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold transition select-none rounded-none text-xs ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
