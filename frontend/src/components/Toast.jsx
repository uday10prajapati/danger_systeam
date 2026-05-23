import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Toast({ message, onClose }) {
  const { i18n } = useTranslation();
  const isGu = i18n.language === 'gu';

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`fixed top-4 right-4 z-[110] flex items-center justify-between gap-3 p-3 bg-white border border-zinc-400 text-sm select-none animate-in fade-in slide-in-from-right-4 duration-150 rounded-none shadow-md min-w-[280px] max-w-sm ${isGu ? 'font-prompt-sm' : 'font-mono'}`}>
      <div className="flex items-center gap-2.5">
        {message.type === 'error' ? (
          <AlertCircle size={16} className="text-red-700 flex-shrink-0" />
        ) : (
          <CheckCircle size={16} className="text-emerald-700 flex-shrink-0" />
        )}
        <p className={`font-bold leading-snug tracking-wide ${isGu ? '' : 'uppercase'} ${message.type === 'error' ? 'text-red-800' : 'text-emerald-800'
          }`}>
          {message.text}
        </p>
      </div>
      <button
        onClick={onClose}
        className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition border border-transparent rounded-none"
      >
        <X size={14} />
      </button>
    </div>
  );
}
