import React from 'react';
import { Settings as SettingsIcon, Database, Shield, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BackupRestoreManager from '../components/BackupRestoreManager';

const Settings = () => {
  const { t } = useTranslation();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-100 rounded-lg">
            <SettingsIcon className="text-zinc-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-800 tracking-tight">{t('settings.title')}</h1>
            <p className="text-sm text-zinc-500">{t('settings.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Database Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-700">
            <Database size={20} />
            <h2 className="font-bold text-lg">{t('settings.database')}</h2>
          </div>
          <BackupRestoreManager />
        </section>

        {/* System Info Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-zinc-300 p-6 rounded-sm shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Monitor size={20} className="text-blue-600" />
              <h3 className="font-bold text-zinc-800 uppercase tracking-wider text-sm">{t('settings.appInfo')}</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <span className="text-zinc-500">{t('settings.version')}</span>
                <span className="font-mono font-bold text-zinc-800">1.0.1 (Pro)</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 pb-2">
                <span className="text-zinc-500">{t('settings.platform')}</span>
                <span className="font-bold text-zinc-800 uppercase">Windows Desktop</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">{t('settings.dbEngine')}</span>
                <span className="font-bold text-zinc-800">PostgreSQL 16+</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-300 p-6 rounded-sm shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Shield size={20} className="text-emerald-600" />
              <h3 className="font-bold text-zinc-800 uppercase tracking-wider text-sm">{t('settings.security')}</h3>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed mb-4">
              {t('settings.securityDesc')}
            </p>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                {t('settings.encConn')}
              </span>
              <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-widest border border-blue-100">
                {t('settings.rbac')}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
