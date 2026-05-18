import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import {
  Plus, Edit2, Trash2, Search,
  FileText, X, AlertCircle, CheckCircle,
  Hash, Activity, MessageSquare, Shield, RefreshCw, Loader,
  Save, Database
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Toast from '../components/Toast';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import Loading from '../components/Loading';

export default function NarrationMaster() {
  const { t, i18n } = useTranslation();
  const [narrations, setNarrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ narration_text: '', narration_text_gu: '', narration_code: '', narration_type: 'JV' });
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [narrationToDelete, setNarrationToDelete] = useState(null);

  // Focus Refs
  const narrationCodeRef = useRef(null);
  const narrationTypeRef = useRef(null);
  const narrationTextRef = useRef(null);

  useEffect(() => { fetchNarrations(); }, []);

  const fetchNarrations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/narrations');
      setNarrations(res.data.success ? res.data.data : []);
    } catch (err) {
      setNarrations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (n = null) => {
    if (n) {
      setEditingId(n.id);
      setFormData({ 
        narration_text: n.narration_text, 
        narration_text_gu: n.narration_text_gu || '',
        narration_code: n.narration_code || '',
        narration_type: n.narration_type || 'JV'
      });
    } else {
      setEditingId(null);
      setFormData({ narration_text: '', narration_text_gu: '', narration_code: '', narration_type: 'JV' });
    }
    setError(null);
    setShowModal(true);
  };

  const handleKeyDown = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      } else {
        handleSubmit(e);
      }
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.narration_text.trim()) return;

    const isDuplicate = narrations.some(n => 
      n.narration_text.toLowerCase().trim() === formData.narration_text.toLowerCase().trim() && 
      n.id !== editingId
    );

    if (isDuplicate) {
      setError(t('narrationMaster.errors.textExists'));
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/narrations/${editingId}`, formData);
        setMessage({ type: 'success', text: t('narrationMaster.messages.updated') });
      } else {
        await api.post('/narrations', formData);
        setMessage({ type: 'success', text: t('narrationMaster.messages.registered') });
      }
      setShowModal(false);
      fetchNarrations();
    } catch (err) {
      setError(err.response?.data?.error || t('narrationMaster.errors.failedSave'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (n) => {
    setNarrationToDelete(n);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!narrationToDelete) return;
    try {
      await api.delete(`/narrations/${narrationToDelete.id}`);
      setMessage({ type: 'success', text: t('narrationMaster.messages.deleted') });
      setDeleteModalOpen(false);
      setNarrationToDelete(null);
      fetchNarrations();
    } catch (err) {
      setMessage({ type: 'error', text: t('narrationMaster.errors.deleteFailed') });
    }
  };

  const filtered = narrations.filter(n =>
    n.narration_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (n.narration_text_gu && n.narration_text_gu.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (n.narration_code && n.narration_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (n.narration_type && n.narration_type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none animate-none">
      
      {/* Toast Notification */}
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
              <MessageSquare size={20} className="text-zinc-600" />
              <span className={i18n.language === 'gu' ? 'font-prompt' : ''}>{t('narrationMaster.title')}</span>
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5 tracking-wider">{t('narrationMaster.managementLedger')}</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none"
            >
              <Plus size={16} />
              {t('narrationMaster.addNarration')}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className={`text-[10px] font-mono text-zinc-500 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`}>{t('narrationMaster.registryNodes')}</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1 notranslate" translate="no">{narrations.length}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className={`text-[10px] font-mono text-zinc-500 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`}>{t('narrationMaster.codedEntities')}</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1 notranslate" translate="no">{narrations.filter(n => n.narration_code).length}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className={`text-[10px] font-mono text-zinc-500 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`}>{t('narrationMaster.activeFilter')}</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1 notranslate" translate="no">{filtered.length}</span>
          </div>
        </div>

        {/* Content Table Area */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3 select-none">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold text-zinc-700 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}>
                {t('narrationMaster.listTitle')}
              </span>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5">
                {filtered.length} {t('narrationMaster.records')}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
                <Search size={16} className="text-zinc-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('narrationMaster.searchPlaceholder')}
                  className="bg-transparent border-none outline-none text-xs text-zinc-800 placeholder:text-zinc-400 w-full md:w-48 font-mono"
                />
              </div>
              <button onClick={fetchNarrations} className="p-1.5 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm" title={t('narrationMaster.refreshRegistry')}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex-1 p-5 bg-white">
            {loading && narrations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                <Loader className="animate-spin text-zinc-500" size={24} />
                <p className="text-xs font-mono">{t('narrationMaster.loadingData')}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500 select-none">
                <MessageSquare size={32} className="text-zinc-400" />
                <p className="text-xs font-mono">{t('narrationMaster.noRecords')}</p>
                <button 
                  onClick={() => handleOpenModal()} 
                  className="text-white border border-blue-600 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold mt-2 transition"
                >
                  {t('narrationMaster.addFirstNarration')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 font-mono text-xs select-none">
                {filtered.map(n => (
                  <div key={n.id} className="bg-zinc-50 border border-zinc-300 p-4 flex flex-col justify-between gap-3 hover:bg-white hover:border-zinc-400 transition">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2">
                        <span className="inline-flex bg-zinc-200 text-zinc-800 border border-zinc-300 font-bold text-[9px] px-1.5 py-0.5 w-fit uppercase">
                          <Hash size={10} className="mr-0.5" /> {n.narration_code || t('narrationMaster.untitled')}
                        </span>
                        <span className={`inline-flex font-bold text-[9px] px-1.5 py-0.5 w-fit border uppercase notranslate ${
                          n.narration_type === 'Credit' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' :
                          n.narration_type === 'Debit' ? 'bg-red-50 border-red-200 text-red-600' :
                          'bg-zinc-100 border-zinc-300 text-zinc-700'
                        } ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`} translate="no">
                          {n.narration_type === 'Credit' ? t('narrationMaster.types.credit') : n.narration_type === 'Debit' ? t('narrationMaster.types.debit') : t('narrationMaster.types.jv')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenModal(n)}
                          className="p-1 border border-zinc-300 bg-white hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm"
                          title={t('narrationMaster.edit')}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => confirmDelete(n)}
                          className="p-1 border border-zinc-300 bg-white hover:bg-red-50 hover:border-red-300 text-zinc-600 hover:text-red-700 transition shadow-sm"
                          title={t('narrationMaster.delete')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <p className={`text-zinc-800 font-bold leading-relaxed tracking-tight ${i18n.language === 'gu' ? 'font-prompt' : 'font-sans'}`}>
                      "{n.narration_text_gu || n.narration_text}"
                    </p>
                    {n.narration_text_gu && (
                      <p className="text-zinc-400 text-[10px] uppercase tracking-widest mt-1 font-mono notranslate" translate="no">
                        {n.narration_text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-none">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-none" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-none border border-zinc-400 shadow-xl overflow-hidden font-mono text-xs select-none">
            <div className="bg-zinc-100 px-5 py-3.5 border-b border-zinc-300 flex justify-between items-center">
              <div>
                <h2 className={`text-sm font-bold text-zinc-800 uppercase tracking-tight ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}>
                  {editingId ? t('narrationMaster.editModalTitle') : t('narrationMaster.addModalTitle')}
                </h2>
                <p className={`text-[10px] font-bold text-zinc-500 uppercase mt-0.5 tracking-wider ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}>{t('narrationMaster.configureNode')}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 text-zinc-400 hover:text-red-600 transition">
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-800 text-[11px] font-bold uppercase flex items-center gap-2">
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-none">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className={`text-[10px] font-bold text-zinc-500 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`}>{t('narrationMaster.referenceCode')}</label>
                    <input
                      ref={narrationCodeRef}
                      type="text"
                      value={formData.narration_code}
                      onChange={e => setFormData({ ...formData, narration_code: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, narrationTypeRef)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-bold text-zinc-700 uppercase tracking-widest font-prompt"
                      placeholder="E.G. 1"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className={`text-[10px] font-bold text-zinc-500 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`}>{t('narrationMaster.narrationType')}</label>
                    <select
                      ref={narrationTypeRef}
                      value={formData.narration_type}
                      onChange={e => setFormData({ ...formData, narration_type: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, narrationTextRef)}
                      className={`w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-bold text-zinc-700 cursor-pointer uppercase tracking-widest ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}
                    >
                      <option value="Credit" className="notranslate" translate="no">{t('narrationMaster.types.credit')}</option>
                      <option value="Debit" className="notranslate" translate="no">{t('narrationMaster.types.debit')}</option>
                      <option value="JV" className="notranslate" translate="no">{t('narrationMaster.types.jv')}</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className={`text-[10px] font-bold text-zinc-500 notranslate ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`} translate="no">
                    {t('narrationMaster.narrationDescription')} (ENG)
                  </label>
                  <input
                    ref={narrationTextRef}
                    type="text"
                    value={formData.narration_text}
                    onChange={e => setFormData({ ...formData, narration_text: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-bold text-zinc-800 font-mono uppercase force-en notranslate"
                    placeholder="ENTER ENGLISH DESCRIPTION..."
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className={`text-[10px] font-bold text-zinc-500 notranslate ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`} translate="no">
                    {t('narrationMaster.narrationDescription')} (GUJ)
                  </label>
                  <input
                    type="text"
                    value={formData.narration_text_gu}
                    onChange={e => setFormData({ ...formData, narration_text_gu: e.target.value })}
                    className={`w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none outline-none focus:bg-white focus:border-zinc-600 transition font-bold text-zinc-800 ${i18n.language === 'gu' ? 'font-prompt' : 'font-sans'}`}
                    placeholder={t('narrationMaster.enterDescription')}
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-zinc-200 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition rounded-none uppercase text-xs"
                  >
                    {t('narrationMaster.cancel')}
                  </button>
              <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold transition rounded-none uppercase flex items-center justify-center gap-2 text-xs"
                  >
                    {submitting ? <Loader className="animate-spin" size={14} /> : <><Save size={14} /> {editingId ? t('narrationMaster.update') : t('narrationMaster.save')}</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title={t('narrationMaster.deleteTitle')}
        message={t('narrationMaster.deleteConfirm', { name: narrationToDelete?.narration_tex || '' })}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
