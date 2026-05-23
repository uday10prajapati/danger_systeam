import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import {
  Plus, Edit2, Trash2, Search,
  FileText, X, AlertCircle, CheckCircle,
  Hash, MessageSquare, RefreshCcw, Loader,
  Save
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Toast from '../components/Toast';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import Loading from '../components/Loading';

const TYPE_TABS = [
  { id: 'all', labelEn: 'All', labelGu: 'બધા' },
  { id: 'Credit', labelEn: 'Credit', labelGu: 'જમા' },
  { id: 'Debit', labelEn: 'Debit', labelGu: 'ઉધાર' },
  { id: 'JV', labelEn: 'JV', labelGu: 'અન્ય' },
];

const fmtVal = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
};

export default function NarrationMaster() {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';
  const [narrations, setNarrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ narration_text: '', narration_text_gu: '', narration_code: '', narration_type: 'JV' });
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [narrationToDelete, setNarrationToDelete] = useState(null);

  // Focus Refs
  const narrationCodeRef = useRef(null);
  const narrationTypeRef = useRef(null);
  const narrationTextRef = useRef(null);
  const narrationTextGURef = useRef(null);

  useEffect(() => { fetchNarrations(); }, []);

  const getNextNarrationCode = () => {
    const maxCode = narrations.reduce((max, n) => {
      const parsed = Number.parseInt(String(n.narration_code || '').replace(/\D/g, ''), 10);
      return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
    }, 0);
    return String(maxCode + 1);
  };

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
      setFormData({ narration_text: '', narration_text_gu: '', narration_code: getNextNarrationCode(), narration_type: 'JV' });
    }
    setError(null);
    setShowModal(true);
    setTimeout(() => {
      narrationCodeRef.current?.focus();
    }, 150);
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

  const handleTypeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      narrationTextGURef.current?.focus();
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const types = ['Credit', 'Debit', 'JV'];
      const currentIndex = types.indexOf(formData.narration_type);
      const nextIndex = e.key === 'ArrowRight'
        ? (currentIndex + 1) % types.length
        : (currentIndex - 1 + types.length) % types.length;
      setFormData(prev => ({ ...prev, narration_type: types[nextIndex] }));
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

  const filtered = narrations.filter(n => {
    const matchesSearch =
      n.narration_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.narration_text_gu && n.narration_text_gu.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (n.narration_code && n.narration_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (n.narration_type && n.narration_type.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || n.narration_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getTypeBadge = (type) => {
    if (type === 'Credit') return 'bg-emerald-50 border-emerald-100 text-emerald-700';
    if (type === 'Debit') return 'bg-rose-50 border-rose-100 text-rose-700';
    return 'bg-slate-50 border-slate-200 text-slate-600';
  };

  const getTypeLabel = (type) => {
    if (type === 'Credit') return t('narrationMaster.types.credit');
    if (type === 'Debit') return t('narrationMaster.types.debit');
    return t('narrationMaster.types.jv');
  };

  const displayNarrationText = (n) => {
    const text = isGu ? n?.narration_text_gu : n?.narration_text;
    return text && String(text).trim() ? text : '—';
  };

  if (loading && narrations.length === 0) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 select-none pb-12">

      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('narrationMaster.registryNodes') || 'Total Narrations'}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{fmtVal(narrations.length)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{isGu ? 'જમા' : 'Credit'}</span>
            <span className="text-[13px] font-bold font-sans text-emerald-700 mt-1">{fmtVal(narrations.filter(n => n.narration_type === 'Credit').length)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{isGu ? 'ઉધાર' : 'Debit'}</span>
            <span className="text-[13px] font-bold font-sans text-rose-600 mt-1">{fmtVal(narrations.filter(n => n.narration_type === 'Debit').length)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('narrationMaster.codedEntities') || 'With Code'}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{fmtVal(narrations.filter(n => n.narration_code).length)}</span>
          </div>
        </div>

        {/* Registry Table Wrapper */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none">

          {/* Table Control Header Bar */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-extrabold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>
                {t('narrationMaster.title') || 'Narration Master'}
              </span>
              <span className="bg-slate-200 text-slate-600 font-bold force-en text-[12px] px-1.5 py-0.5 rounded-sm">
                {filtered.length} {t('narrationMaster.records') || 'Records'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Bar */}
              <div className="relative flex items-center border border-slate-200 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] rounded-md bg-white px-2.5 py-1 transition-colors w-48 sm:w-64">
                <Search size={12} className="text-slate-400 mr-1.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder={t('narrationMaster.searchPlaceholder') || 'Search narrations...'}
                  className="bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-300 w-full font-semibold"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="p-0.5 text-slate-300 hover:text-slate-600 transition">
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* Add Button */}
              <button
                onClick={() => handleOpenModal()}
                className="h-7 flex items-center gap-1.5 px-2.5 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[12px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider"
              >
                <Plus size={13} />
                <span>{t('narrationMaster.addNarration') || 'Add Narration'}</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={fetchNarrations}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none"
                title={t('narrationMaster.refreshRegistry') || 'Refresh'}
              >
                <RefreshCcw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Type Filter Tabs */}
          <div className="px-3.5 py-2.5 flex items-center gap-1.5 border-b border-slate-100 select-none">
            {TYPE_TABS.map(tab => {
              const count = tab.id === 'all' ? narrations.length : narrations.filter(n => n.narration_type === tab.id).length;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setTypeFilter(tab.id); setCurrentPage(1); }}
                  className={`h-7 flex items-center gap-1.5 px-2.5 text-[12px] font-bold rounded-md transition-all shrink-0 cursor-pointer border ${typeFilter === tab.id
                    ? 'bg-[#1d5f84] border-[#1d5f84] text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
                    }`}
                >
                  <span>{isGu ? tab.labelGu : tab.labelEn}</span>
                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded-sm leading-none ${typeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Table */}
          <div className="overflow-x-auto w-full">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-center p-4">
                <MessageSquare size={32} className="text-slate-300 opacity-30" />
                <p className="text-sm font-bold text-slate-400">{t('narrationMaster.noRecords')}</p>
                <button
                  onClick={() => handleOpenModal()}
                  className="text-sm font-bold text-[#1d5f84] hover:text-[#154662] transition uppercase tracking-wider cursor-pointer"
                >
                  + {t('narrationMaster.addFirstNarration') || 'Add First Narration'}
                </button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 border-collapse text-[12px]">
                <thead className="bg-slate-50 font-sans">
                  <tr>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-10">#</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-16">{isGu ? 'કોડ' : 'Code'}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-24">{isGu ? 'પ્રકાર' : 'Type'}</th>
                    <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{isGu ? 'વર્ણન' : 'Narration Text'}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 w-24">{isGu ? 'ક્રિયાઓ' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {paginatedItems.map((n, idx) => (
                    <tr key={n.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-3.5 py-2 text-center font-mono text-slate-500 border-r border-slate-100">{fmtVal(startIndex + idx + 1)}</td>
                      <td className="px-3.5 py-2 text-center border-r border-slate-100">
                        <span className="inline-flex items-center gap-0.5 bg-slate-50 text-[#1d5f84] border border-slate-200 font-bold text-[12px] px-1.5 py-0.5 rounded-md font-mono">
                          <Hash size={8} className="opacity-60" />{n.narration_code || '—'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-center border-r border-slate-100">
                        <span className={`text-[12px] font-bold px-1.5 py-0.5 rounded-md border uppercase ${getTypeBadge(n.narration_type)}`}>
                          {getTypeLabel(n.narration_type)}
                        </span>
                      </td>
                      <td className={`px-3.5 py-2 border-r border-slate-100 font-bold ${isGu ? 'text-slate-800' : 'text-slate-600 font-mono text-[10px] uppercase'}`} style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}>
                        {displayNarrationText(n)}
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenModal(n)}
                            className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            title={t('narrationMaster.edit')}
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={() => confirmDelete(n)}
                            className="p-1 border border-rose-100 rounded text-rose-500 bg-rose-50 hover:bg-rose-100 transition cursor-pointer"
                            title={t('narrationMaster.delete')}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} / {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 transition text-[10px] font-extrabold text-slate-600 disabled:cursor-not-allowed cursor-pointer"
                >
                  Prev
                </button>
                <span className="text-sm font-bold text-slate-600 px-1.5">
                  {fmtVal(currentPage)} / {fmtVal(totalPages)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 transition text-[10px] font-extrabold text-slate-600 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px] transition-opacity duration-150" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden text-sm select-none z-10">

            {/* Modal Header */}
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className={`text-sm font-bold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>
                  {editingId ? t('narrationMaster.editModalTitle') : t('narrationMaster.addModalTitle')}
                </h2>
                <p className="text-[12px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">{t('narrationMaster.configureNode')}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition rounded-md cursor-pointer">
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4">
              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-[12px] font-bold uppercase flex items-center gap-2 rounded-md">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-bold text-slate-400 uppercase font-sans">{t('narrationMaster.referenceCode') || 'Code'}</label>
                    <input
                      ref={narrationCodeRef}
                      type="text"
                      value={formData.narration_code}
                      readOnly
                      tabIndex={-1}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none transition font-bold text-slate-500 cursor-not-allowed uppercase force-en font-sans"
                      placeholder="E.G. 1"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[12px] font-bold text-slate-400 uppercase font-sans">{t('narrationMaster.narrationType') || 'Type'}</label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-md border border-slate-100">
                      {['Credit', 'Debit', 'JV'].map(type => (
                        <button
                          key={type}
                          ref={formData.narration_type === type ? narrationTypeRef : null}
                          type="button"
                          onClick={() => setFormData({ ...formData, narration_type: type })}
                          onKeyDown={handleTypeKeyDown}
                          className={`py-1 flex items-center justify-center text-[12px] font-bold transition rounded border cursor-pointer uppercase tracking-wider ${formData.narration_type === type
                            ? 'bg-[#1d5f84] border-[#1d5f84] text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                            }`}
                        >
                          {type === 'Credit' ? (isGu ? 'જમા' : 'Credit') : type === 'Debit' ? (isGu ? 'ઉધાર' : 'Debit') : (isGu ? 'અન્ય' : 'JV')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-slate-400 uppercase font-sans">
                    {t('narrationMaster.narrationDescription') || 'Description'} (GUJ)
                  </label>
                  <input
                    ref={narrationTextGURef}
                    type="text"
                    value={formData.narration_text_gu}
                    onChange={e => setFormData({ ...formData, narration_text_gu: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, narrationTextRef)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-800"
                    style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}
                    placeholder="ગુજરાતીમાં વર્ણન લખો..."
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-bold text-slate-400 uppercase font-sans">
                    {t('narrationMaster.narrationDescription') || 'Description'} (ENG)
                  </label>
                  <input
                    ref={narrationTextRef}
                    type="text"
                    value={formData.narration_text}
                    onChange={e => setFormData({ ...formData, narration_text: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, null)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-800 force-en font-sans"
                    placeholder="ENTER ENGLISH DESCRIPTION..."
                    required
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-sm font-bold transition rounded-md uppercase tracking-wide cursor-pointer"
              >
                {t('narrationMaster.cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-1.5 flex items-center gap-1.5 text-sm font-bold text-white bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] transition rounded-md uppercase tracking-wide cursor-pointer disabled:opacity-50"
              >
                {submitting ? <Loader className="animate-spin" size={12} /> : <Save size={12} />}
                <span>{editingId ? t('narrationMaster.update') : t('narrationMaster.save')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title={t('narrationMaster.deleteTitle')}
        message={t('narrationMaster.deleteConfirm', { name: narrationToDelete ? displayNarrationText(narrationToDelete) : '' })}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
