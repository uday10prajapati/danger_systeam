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
        <div className="bg-white border border-zinc-300 p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-200 pb-4">
                <ShieldCheck className="text-zinc-600" size={24} />
                <div>
                    <h2 className="text-lg font-bold text-zinc-800 tracking-tight">{t('settings.database')}</h2>
                    <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">Professional Maintenance Module</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backup Card */}
                <div className="bg-zinc-50 border border-zinc-200 p-5 flex flex-col justify-between group hover:border-blue-300 transition-colors">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-zinc-700">
                            <Database size={18} />
                            <h3 className="font-bold text-sm uppercase tracking-wide">{t('settings.backup')}</h3>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                            {t('settings.backupDesc')}
                        </p>
                    </div>
                    <button
                        onClick={handleBackup}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-900 disabled:bg-zinc-400 text-white text-xs font-bold py-2.5 px-4 transition shadow-sm select-none"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                        {t('settings.createBackup')}
                    </button>
                </div>

                {/* Restore Card */}
                <div className="bg-zinc-50 border border-zinc-200 p-5 flex flex-col justify-between group hover:border-rose-300 transition-colors">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-rose-600">
                            <RotateCcw size={18} />
                            <h3 className="font-bold text-sm uppercase tracking-wide">{t('settings.restore')}</h3>
                        </div>
                        <p className="text-xs text-zinc-500 leading-relaxed mb-4">
                            {t('settings.restoreDesc')}
                            <span className="text-rose-500 font-bold block mt-1"> {t('settings.restoreWarning')}</span>
                        </p>
                    </div>
                    <button
                        onClick={handleRestore}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-zinc-400 text-white text-xs font-bold py-2.5 px-4 transition shadow-sm select-none"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                        {t('settings.restoreLatest')}
                    </button>
                </div>
            </div>

            {/* Status Messages */}
            {status && (
                <div className={`flex items-start gap-3 p-4 border ${
                    status.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 
                    status.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                    'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                    {status.type === 'error' ? <AlertTriangle size={18} className="shrink-0 mt-0.5" /> : 
                     status.type === 'success' ? <ShieldCheck size={18} className="shrink-0 mt-0.5" /> : 
                     <Loader2 size={18} className="shrink-0 mt-0.5 animate-spin" />}
                    <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-widest">{status.type === 'info' ? 'Processing' : status.type}</p>
                        <p className="text-sm mt-1">{status.message}</p>
                    </div>
                    <button onClick={() => setStatus(null)} className="text-zinc-400 hover:text-zinc-600">
                        <Database size={14} className="rotate-45" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default BackupRestoreManager;
