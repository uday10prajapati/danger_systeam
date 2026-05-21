import React, { useState } from 'react';
import { Database, RotateCcw, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const BackupRestoreManager = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    const handleBackup = async () => {
        if (!window.electron) {
            setStatus({ type: 'error', message: 'Backup is only available in the Desktop App. Please launch the .exe version.' });
            return;
        }
        try {
            setLoading(true);
            setStatus({ type: 'info', message: t('settings.creatingBackup') });
            
            const result = await window.electron.backupDB();
            
            if (result.success) {
                setStatus({ type: 'success', message: result.message });
            } else {
                setStatus({ type: 'error', message: result.message });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to trigger backup: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        if (!window.electron) {
            setStatus({ type: 'error', message: 'Restore is only available in the Desktop App. Please launch the .exe version.' });
            return;
        }
        if (!window.confirm(t('settings.restoreWarning') + " Proceed?")) {
            return;
        }

        try {
            setLoading(true);
            setStatus({ type: 'info', message: t('settings.restoringBackup') });
            
            const result = await window.electron.restoreDB();
            
            if (result.success) {
                setStatus({ type: 'success', message: result.message });
            } else {
                setStatus({ type: 'error', message: result.message });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to trigger restore: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none font-sans select-none">
            {/* Header Control Bar */}
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="text-slate-500" size={14} />
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        {t('settings.database')}
                    </span>
                    <span className="bg-slate-200 text-slate-600 font-bold force-en text-[9px] px-1.5 py-0.5 rounded-sm">
                        Professional Maintenance
                    </span>
                </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50">
                {/* Backup Card */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between group hover:border-[#1d5f84] transition-colors shadow-none">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-[#1d5f84]">
                            <Database size={16} />
                            <h3 className="font-bold text-[11px] uppercase tracking-wider text-slate-800">{t('settings.backup')}</h3>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mb-4">
                            {t('settings.backupDesc')}
                        </p>
                    </div>
                    <button
                        onClick={handleBackup}
                        disabled={loading}
                        className="h-8 flex items-center justify-center gap-1.5 bg-[#1d5f84] hover:bg-[#154662] disabled:bg-slate-300 disabled:border-slate-300 border border-[#1d5f84] text-white text-[11px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider w-full"
                    >
                        {loading ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />}
                        {t('settings.createBackup')}
                    </button>
                </div>

                {/* Restore Card */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between group hover:border-rose-400 transition-colors shadow-none">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-rose-600">
                            <RotateCcw size={16} />
                            <h3 className="font-bold text-[11px] uppercase tracking-wider text-slate-800">{t('settings.restore')}</h3>
                        </div>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed mb-4">
                            {t('settings.restoreDesc')}
                            <span className="text-rose-500 font-bold block mt-1"> {t('settings.restoreWarning')}</span>
                        </p>
                    </div>
                    <button
                        onClick={handleRestore}
                        disabled={loading}
                        className="h-8 flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:border-slate-300 border border-rose-600 text-white text-[11px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider w-full"
                    >
                        {loading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                        {t('settings.restoreLatest')}
                    </button>
                </div>
            </div>

            {/* Status Messages */}
            {status && (
                <div className={`flex items-start gap-3 px-4 py-3 border-t text-[11px] font-bold uppercase tracking-wider ${
                    status.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 
                    status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                    'bg-slate-50 border-slate-200 text-[#1d5f84]'
                }`}>
                    {status.type === 'error' ? <AlertTriangle size={14} className="shrink-0 mt-0.5" /> : 
                     status.type === 'success' ? <ShieldCheck size={14} className="shrink-0 mt-0.5" /> : 
                     <Loader2 size={14} className="shrink-0 mt-0.5 animate-spin" />}
                    <div className="flex-1">
                        <p className="text-[9px] font-extrabold uppercase tracking-widest opacity-70 mb-0.5">{status.type === 'info' ? 'Processing' : status.type}</p>
                        <p className="font-sans normal-case text-xs">{status.message}</p>
                    </div>
                    <button onClick={() => setStatus(null)} className="opacity-50 hover:opacity-100 transition cursor-pointer p-1">
                        <Database size={12} className="rotate-45" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default BackupRestoreManager;
