import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { exportToPDF } from '../utils/pdfExporter';
import { toISTDateInput } from '../utils/dateUtils';
import {
  Plus, Edit3, Trash2, MapPin, Search,
  RefreshCcw, Download, FileText, Loader,
  X, AlertCircle, Save
} from 'lucide-react';
import Toast from '../components/Toast';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import Loading from '../components/Loading';
import api from '../api';

export default function VillageMaster() {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';

  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [villageToDelete, setVillageToDelete] = useState(null);

  const [form, setForm] = useState({ id: null, villageCode: '', villageName: '', talukaName: '', districtName: '', engName: '', noOfVillage: 0 });

  const codeRef = useRef(null);
  const nameRef = useRef(null);
  const engRef = useRef(null);
  const talukaRef = useRef(null);
  const districtRef = useRef(null);

  const GU = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
  const toGu = v => String(v ?? '').replace(/[0-9]/g, d => GU[d] || d);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await api.get('/village');
      setVillages(r.data.map(x => ({
        id: x.id, villageCode: x.village_code, villageName: x.village_name,
        talukaName: x.taluka_name, districtName: x.district_name,
        engName: x.eng_name || '', noOfVillage: x.no_of_villages
      })));
    } catch { setMessage({ type: 'error', text: t('villageMaster.loadFailed') }); }
    finally { setLoading(false); }
  };

  const nextCode = async () => {
    try { const r = await api.get('/village/last-code'); return ((parseInt(r.data.lastCode) || 0) + 1).toString(); }
    catch { return '1'; }
  };

  const openCreate = async () => {
    const c = await nextCode();
    setForm({ id: null, villageCode: c, villageName: '', talukaName: '', districtName: '', engName: '', noOfVillage: villages.length + 1 });
    setIsEditing(false); setModalMessage(null); setShowPanel(true);
    setTimeout(() => nameRef.current?.focus(), 130);
  };

  const openEdit = v => {
    setForm(v); setIsEditing(true); setModalMessage(null); setShowPanel(true);
    setTimeout(() => nameRef.current?.focus(), 130);
  };

  const save = async e => {
    e?.preventDefault();
    if (!form.villageName?.trim()) { setModalMessage({ type: 'error', text: t('villageMaster.nameRequired') }); return; }
    if (villages.some(v => v.villageName.toLowerCase().trim() === form.villageName.toLowerCase().trim() && v.id !== form.id)) {
      setModalMessage({ type: 'error', text: t('villageMaster.alreadyExists') }); return;
    }
    try {
      setLoading(true);
      if (isEditing) { await api.put(`/village/${form.id}`, form); setMessage({ type: 'success', text: t('villageMaster.updateSuccess') }); }
      else { await api.post('/village', form); setMessage({ type: 'success', text: t('villageMaster.registerSuccess') }); }
      setShowPanel(false); load();
    } catch { setModalMessage({ type: 'error', text: t('villageMaster.saveFailed') }); }
    finally { setLoading(false); }
  };

  const del = async () => {
    if (!villageToDelete) return;
    try {
      setLoading(true);
      await api.delete(`/village/${villageToDelete.id}`);
      setMessage({ type: 'success', text: t('villageMaster.deleteSuccess') });
      setDeleteModalOpen(false); setVillageToDelete(null); load();
    } catch { setMessage({ type: 'error', text: t('villageMaster.deleteFailed') }); }
    finally { setLoading(false); }
  };

  const onKey = (e, next) => { if (e.key === 'Enter') { e.preventDefault(); next ? next.current?.focus() : save(e); } };

  const filtered = villages.filter(v =>
    v.villageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.villageCode.toString().includes(searchQuery) ||
    (v.talukaName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTalukas = [...new Set(villages.map(v => v.talukaName).filter(Boolean))].length;
  const totalDistricts = [...new Set(villages.map(v => v.districtName).filter(Boolean))].length;

  const exportPDF = async () => {
    if (!filtered.length && !villages.length) {
      setMessage({ type: 'error', text: t('villageMaster.noRecords') });
      return;
    }

    const rows = filtered.length ? filtered : villages;

    const columns = [
      {
        header: isGu ? 'ક્રમ' : '#',
        align: 'center',
        width: '8%',
        render: (row, idx) => isGu ? toGu(idx + 1) : (idx + 1)
      },
      {
        header: isGu ? 'કોડ' : 'Code',
        align: 'center',
        width: '12%',
        render: (row) => isGu ? toGu(String(row.villageCode).padStart(4, '0')) : String(row.villageCode).padStart(4, '0')
      },
      {
        header: isGu ? 'ગામ' : 'Village Name',
        align: 'left',
        width: '30%',
        render: (row) => isGu ? row.villageName : (row.engName || row.villageName),
        usePromptFont: isGu
      },
      {
        header: isGu ? 'તાલુકો' : 'Taluka',
        align: 'left',
        width: '25%',
        render: (row) => row.talukaName || '—',
        usePromptFont: isGu
      },
      {
        header: isGu ? 'જિલ્લો' : 'District',
        align: 'left',
        width: '25%',
        render: (row) => row.districtName || '—',
        usePromptFont: isGu
      }
    ];

    const metaInfo = [];

    await exportToPDF({
      title: isGu ? 'ગામ રજીસ્ટ્રી' : 'Village Master',
      columns,
      rows,
      isGu,
      metaInfo,
      filename: `Village_Master_${toISTDateInput()}.pdf`,
      onStart: () => setLoading(true),
      onComplete: () => setLoading(false)
    });
  };

  if (loading && !villages.length) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans select-none text-slate-800 pb-8">
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">

        {/* Minimalist Stats Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('villageMaster.totalVillages')}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{toGu(villages.length)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('villageMaster.totalTalukas')}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{toGu(totalTalukas)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('villageMaster.totalDistricts')}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{toGu(totalDistricts)}</span>
          </div>
        </div>

        {/* Minimal Classic Registry Table Wrapper */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col min-h-[500px] relative shadow-none">

          {/* Table Control Header Bar */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
            <div className="flex items-center gap-3">

              <div className="flex items-baseline gap-2">
                <span className={`text-sm font-extrabold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>
                  {t('villageMaster.title')}
                </span>
                <span className="bg-slate-200 text-slate-655 text-slate-600 font-bold force-en text-[12px] px-1.5 py-0.5 rounded-sm">
                  {filtered.length} {t('villageMaster.records')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 border border-slate-200 rounded-md bg-white px-2.5 h-7 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] w-full md:w-auto transition-all">
                <Search size={13} className="text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('villageMaster.searchPlaceholder')}
                  className="bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400 w-full md:w-48 font-sans font-medium"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="cursor-pointer text-slate-300 hover:text-slate-600 transition">
                    <X size={12} />
                  </button>
                )}
              </div>
              <button
                onClick={openCreate}
                className="h-7 flex items-center gap-1.5 px-2.5 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[12px] font-bold rounded-md transition shadow-sm cursor-pointer uppercase tracking-wider"
              >
                <Plus size={13} />
                <span>{t('villageMaster.newVillage')}</span>
              </button>
              <button
                onClick={exportPDF}
                title={t('common.pdf')}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <FileText size={13} className="text-slate-500" />
              </button>
              <button
                onClick={load}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
                title={t('villageMaster.refresh') || "Refresh"}
              >
                <RefreshCcw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table Data Registry */}
          <div className="flex-1 overflow-x-auto bg-white scroller-airy">
            {loading && villages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
                <Loader className="animate-spin text-[#1d5f84]" size={24} />
                <p className="text-[10px] font-mono tracking-widest uppercase">{t('villageMaster.loading')}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
                <MapPin size={32} className="text-slate-300" />
                <p className="text-[10px] font-mono tracking-widest uppercase">{t('villageMaster.noRecords')}</p>
                <button
                  onClick={openCreate}
                  className="text-[#1d5f84] hover:text-[#154662] underline text-[10px] font-bold mt-1 transition cursor-pointer"
                >
                  {t('villageMaster.addFirst')}
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse select-none">
                <thead className="sticky top-0 z-20 shadow-sm">
                  <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500 font-sans text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-4 py-2 border-r border-slate-200 w-16 text-center whitespace-nowrap">#</th>
                    <th className="px-4 py-2 border-r border-slate-200 whitespace-nowrap">
                      {t('villageMaster.villageName')} <span className="text-[12px] font-sans opacity-70">({isGu ? 'ગુજ' : 'Guj'})</span>
                    </th>
                    <th className="px-4 py-2 border-r border-slate-200 w-32 text-center whitespace-nowrap">{t('villageMaster.villageCode')}</th>
                    <th className="px-4 py-2 border-r border-slate-200 whitespace-nowrap">{t('villageMaster.talukaName')}</th>
                    <th className="px-4 py-2 border-r border-slate-200 whitespace-nowrap">{t('villageMaster.districtName')}</th>
                    <th className="px-4 py-2 text-center w-32 whitespace-nowrap">{t('villageMaster.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[12px]">
                  {filtered.map((v, idx) => (
                    <tr key={v.id} className="hover:bg-slate-50 font-mono transition-colors text-slate-700">
                      <td className="px-4 py-2.5 border-r border-slate-100 text-center font-bold text-slate-400">
                        {toGu(idx + 1)}
                      </td>
                      <td className={`px-4 py-2.5 border-r border-slate-100 font-bold text-slate-800 ${isGu ? 'font-prompt' : ''}`}>
                        {isGu ? v.villageName : (v.engName || v.villageName)}
                      </td>
                      <td className="px-4 py-2.5 border-r border-slate-100 font-bold text-center text-slate-800 font-sans">
                        {toGu(String(v.villageCode).padStart(4, '0'))}
                      </td>
                      <td className={`px-4 py-2.5 border-r border-slate-100 font-bold text-slate-700 ${isGu ? 'font-prompt' : ''}`}>
                        {v.talukaName ? v.talukaName : '—'}
                      </td>
                      <td className={`px-4 py-2.5 border-r border-slate-100 font-bold text-slate-700 ${isGu ? 'font-prompt' : ''}`}>
                        {v.districtName ? v.districtName : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEdit(v)}
                            className="p-1 text-slate-400 hover:text-[#1d5f84] transition rounded-md cursor-pointer"
                            title={t('villageMaster.edit')}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => { setVillageToDelete(v); setDeleteModalOpen(true); }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition rounded-md cursor-pointer"
                            title={t('villageMaster.delete')}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modern Centered Forms Modal */}
      <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden ${showPanel ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop Blur Overlay */}
        <div
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px] transition-opacity duration-300 ${showPanel ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => !loading && setShowPanel(false)}
        />

        {/* Modal Panel Container */}
        <div className={`relative bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-xl max-w-sm w-full transform transition-all duration-300 ease-in-out ${showPanel ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>

          {/* Modal Title Bar */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 select-none">
              <div className="p-1 bg-white border border-slate-200 text-[#1d5f84] rounded-md shadow-sm">
                {isEditing ? <Edit3 size={14} /> : <Plus size={14} />}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {isEditing ? t('villageMaster.editRecord') : t('villageMaster.registerNew')}
                </span>
                <h3 className={`text-sm font-bold text-slate-800 ${isGu ? 'font-prompt' : ''}`}>
                  {isEditing ? (isGu ? form.villageName : form.engName || form.villageName) : t('villageMaster.newVillage')}
                </h3>
              </div>
            </div>
            <button
              onClick={() => setShowPanel(false)}
              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition rounded-md"
            >
              <X size={15} />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={save} className="p-4 space-y-4 font-mono text-sm">
            {modalMessage && (
              <div className={`p-2 border font-bold text-[12px] rounded-md flex items-center gap-2 shadow-sm ${modalMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                <AlertCircle size={14} className="shrink-0" />
                <p className="uppercase leading-none tracking-wider">{modalMessage.text}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-500 uppercase tracking-wide">{t('villageMaster.villageCode')}</label>
              <input
                ref={codeRef}
                type="text"
                value={form.villageCode || ''}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none font-bold text-slate-500 cursor-not-allowed"
                readOnly
                tabIndex={-1}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-500 uppercase tracking-wide">
                {t('villageMaster.villageName')} <span className="text-[12px] font-sans lowercase opacity-70">({isGu ? 'ગુજ' : 'Guj'})</span>
              </label>
              <input
                ref={nameRef}
                type="text"
                value={form.villageName || ''}
                onChange={e => setForm({ ...form, villageName: e.target.value })}
                onKeyDown={e => onKey(e, engRef)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-sans font-bold text-slate-700"
                placeholder={t('villageMaster.enterVillageName')}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-slate-500 uppercase tracking-wide">{t('villageMaster.villageNameEn')}</label>
              <input
                ref={engRef}
                type="text"
                value={form.engName || ''}
                onChange={e => setForm({ ...form, engName: e.target.value.replace(/[^ -~]/g, '').toUpperCase() })}
                onKeyDown={e => onKey(e, talukaRef)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 uppercase force-en font-sans"
                placeholder={t('villageMaster.enterVillageNameEn')}
                lang="en"
                spellCheck="false"
                translate="no"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 uppercase tracking-wide">{t('villageMaster.taluka')}</label>
                <input
                  ref={talukaRef}
                  type="text"
                  value={form.talukaName || ''}
                  onChange={e => setForm({ ...form, talukaName: e.target.value })}
                  onKeyDown={e => onKey(e, districtRef)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700"
                  placeholder={t('villageMaster.taluka')}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-500 uppercase tracking-wide">{t('villageMaster.district')}</label>
                <input
                  ref={districtRef}
                  type="text"
                  value={form.districtName || ''}
                  onChange={e => setForm({ ...form, districtName: e.target.value })}
                  onKeyDown={e => onKey(e, null)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700"
                  placeholder={t('villageMaster.district')}
                />
              </div>
            </div>
          </form>

          {/* Modal Footer Actions */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex gap-2.5 justify-end">
            <button
              type="button"
              onClick={() => setShowPanel(false)}
              className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-sm font-bold transition rounded-md uppercase tracking-wide cursor-pointer"
            >
              {t('villageMaster.cancel')}
            </button>
            <button
              type="submit"
              onClick={save}
              disabled={loading}
              className="px-4 py-1.5 flex items-center gap-1.5 text-sm font-bold text-white bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] transition rounded-md uppercase tracking-wide cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader size={12} className="animate-spin" /> : <Save size={12} />}
              <span>{isEditing ? t('villageMaster.update') : t('villageMaster.save')}</span>
            </button>
          </div>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title={t('villageMaster.deleteConfirmTitle')}
        message={`${t('villageMaster.deleteConfirmMessage')} "${villageToDelete?.villageName || ''}"${t('villageMaster.deleteConfirmSuffix')}`}
        onConfirm={del}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
