import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Plus, AlertCircle, Edit2, Trash2, CheckCircle,
  MapPin, Search, RefreshCw, Save, X, Loader, FileText, Download
} from 'lucide-react';
import Toast from '../components/Toast';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import Loading from '../components/Loading';

export default function VillageMaster() {
  const { t, i18n } = useTranslation();
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState(null);
  const [modalMessage, setModalMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Delete Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [villageToDelete, setVillageToDelete] = useState(null);

  const [formData, setFormData] = useState({
    id: null,
    villageCode: '',
    villageName: '',
    talukaName: '',
    districtName: '',
    engName: '',
    noOfVillage: 0
  });

  const villageCodeRef = useRef(null);
  const villageNameRef = useRef(null);
  const talukaNameRef = useRef(null);
  const districtNameRef = useRef(null);
  const engNameRef = useRef(null);

  const guDigits = {
    '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
    '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯'
  };

  const toGujaratiDigits = (value) => String(value ?? '').replace(/[0-9]/g, (d) => guDigits[d] || d);

  useEffect(() => { loadVillages(); }, []);

  const loadVillages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/village');
      const mapped = response.data.map(r => ({
        id: r.id,
        villageCode: r.village_code,
        villageName: r.village_name,
        talukaName: r.taluka_name,
        districtName: r.district_name,
        engName: r.eng_name || '',
        noOfVillage: r.no_of_villages
      }));
      setVillages(mapped);
    } catch {
      setMessage({ type: 'error', text: t('villageMaster.loadFailed') });
    } finally {
      setLoading(false);
    }
  };

  const fetchNextCode = async () => {
    try {
      const res = await api.get('/village/last-code');
      return ((parseInt(res.data.lastCode) || 0) + 1).toString();
    } catch { return '1'; }
  };

  const handleEdit = (village) => {
    setFormData(village);
    setIsEditing(true);
    setModalMessage(null);
    setShowModal(true);
    setTimeout(() => {
      if (villageCodeRef.current) villageCodeRef.current.focus();
    }, 100);
  };

  const handleCreateNew = async () => {
    const nextCode = await fetchNextCode();
    setFormData({ 
      id: null, 
      villageCode: nextCode, 
      villageName: '', 
      talukaName: '', 
      districtName: '', 
      engName: '',
      noOfVillage: villages.length + 1 
    });
    setIsEditing(false);
    setModalMessage(null);
    setShowModal(true);
    setTimeout(() => {
      if (villageNameRef.current) villageNameRef.current.focus();
    }, 100);
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!formData.villageName || !formData.villageName.trim()) {
      setModalMessage({ type: 'error', text: t('villageMaster.nameRequired') });
      return;
    }
    
    const isDuplicate = villages.some(v => 
      v.villageName.toLowerCase().trim() === formData.villageName.toLowerCase().trim() && 
      v.id !== formData.id
    );

    if (isDuplicate) {
      setModalMessage({ type: 'error', text: t('villageMaster.alreadyExists') });
      return;
    }

    try {
      setLoading(true);
      if (isEditing) {
        await api.put(`/village/${formData.id}`, formData);
        setMessage({ type: 'success', text: t('villageMaster.updateSuccess') });
      } else {
        await api.post('/village', formData);
        setMessage({ type: 'success', text: t('villageMaster.registerSuccess') });
      }
      setShowModal(false);
      loadVillages();
    } catch {
      setModalMessage({ type: 'error', text: t('villageMaster.saveFailed') });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (village) => {
    setVillageToDelete(village);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!villageToDelete) return;
    try {
      setLoading(true);
      await api.delete(`/village/${villageToDelete.id}`);
      setMessage({ type: 'success', text: t('villageMaster.deleteSuccess') });
      setDeleteModalOpen(false);
      setVillageToDelete(null);
      loadVillages();
    } catch {
      setMessage({ type: 'error', text: t('villageMaster.deleteFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e, nextFieldRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextFieldRef && nextFieldRef.current) {
        nextFieldRef.current.focus();
      } else {
        handleSave(e);
      }
    }
  };

  const filteredVillages = villages.filter(v =>
    v.villageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.villageCode.toString().includes(searchQuery) ||
    (v.talukaName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportPDF = async () => {
    const rows = filteredVillages.length ? filteredVillages : villages;
    if (!rows.length) {
      setMessage({ type: 'error', text: t('villageMaster.noRecords') });
      return;
    }

    const company = JSON.parse(localStorage.getItem('company') || '{}');
    const cName = company.company_name_gu || company.company_name || 'Company';
    const reportTitle = 'ગામ રજીસ્ટ્રી માસ્ટર';

    const tempWrap = document.createElement('div');
    tempWrap.style.position = 'fixed';
    tempWrap.style.left = '-10000px';
    tempWrap.style.top = '0';
    tempWrap.style.width = '1100px';
    tempWrap.style.background = '#fff';
    tempWrap.style.color = '#111827';
    tempWrap.style.fontFamily = '"NotoGujarati", "Noto Sans Gujarati", Arial, sans-serif';
    tempWrap.style.padding = '24px';

    const tableRows = rows.map((v, idx) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${toGujaratiDigits(idx + 1)}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${toGujaratiDigits(String(v.villageCode || '').padStart(4, '0'))}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-family: 'Prompt', monospace;">${v.villageName || ''}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-family: 'Prompt', monospace;">${v.talukaName || ''}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-family: 'Prompt', monospace;">${v.districtName || ''}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${toGujaratiDigits(v.noOfVillage ?? '')}</td>
      </tr>
    `).join('');

    tempWrap.innerHTML = `
      <div style="border:1px solid #cbd5e1;">
        <div style="background:#2563eb;color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:18px;font-weight:700;">${cName}</div>
          <div style="font-size:12px;font-weight:700;">${reportTitle}</div>
        </div>
        <div style="padding:18px;">
          <div style="font-size:22px;font-weight:700;color:#1f2937;margin-bottom:6px;">${reportTitle}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:16px;">કુલ નોંધાયેલા ગામો: ${toGujaratiDigits(rows.length)} | શોધ: ${searchQuery || 'બધા'}</div>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px 10px;border:1px solid #d1d5db;">ક્રમ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">ગામનો કોડ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">ગામનું નામ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">તાલુકાનું નામ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">જિલ્લાનું નામ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">ગામોની સંખ્યા</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(tempWrap);

    // Wait for fonts to render properly
    await new Promise(resolve => setTimeout(resolve, 200));

    const canvas = await html2canvas(tempWrap, { 
      scale: 3, 
      backgroundColor: '#ffffff', 
      useCORS: true,
      allowTaint: false,
      logging: false,
      fontEmbedCSS: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&display=swap'
    });
    document.body.removeChild(tempWrap);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 24;
    const imgW = pageW - margin * 2;
    const pageHpx = ((pageH - margin * 2) * canvas.width) / imgW;

    let y = 0;
    let pageIndex = 0;
    while (y < canvas.height) {
      const sliceHeight = Math.min(pageHpx, canvas.height - y);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      const imgData = pageCanvas.toDataURL('image/png');
      const imgH = (sliceHeight * imgW) / canvas.width;

      if (pageIndex > 0) doc.addPage();
      doc.addImage(imgData, 'PNG', margin, margin, imgW, imgH);

      y += sliceHeight;
      pageIndex += 1;
    }

    doc.save('Village_Master_Report.pdf');
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 animate-in fade-in duration-300">
      
      {/* Toast message component */}
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1400px] mx-auto bg-white border border-zinc-300 shadow-sm p-5 space-y-6">
        
        {/* Top title and actions header - Minimal Accounting Style */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 select-none ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
              <MapPin size={24} className="text-zinc-600" />
              {t('villageMaster.title')}
            </h1>
            <p className="text-sm font-mono text-zinc-500 mt-0.5 uppercase tracking-wider select-none">{t('villageMaster.masterDataVillages')}</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-700 text-sm font-bold px-4 py-2 rounded-none transition shadow-sm select-none"
            >
              <FileText size={16} />
              <Download size={14} />
              {t('common.pdf')}
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-sm font-bold px-4 py-2 rounded-none transition shadow-sm select-none"
            >
              <Plus size={16} />
              {t('villageMaster.newVillage')}
            </button>
          </div>
        </div>

        {/* Dense Minimalist Accounting Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-sm font-sans text-zinc-500 ">{t('villageMaster.totalVillages')}</span>
            <span className="text-2xl font-bold font-sans text-zinc-800 mt-1">{toGujaratiDigits(villages.length)}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-sm font-sans text-zinc-500 ">{t('villageMaster.totalTalukas')}</span>
            <span className="text-2xl font-bold font-sans text-zinc-800 mt-1">
              {toGujaratiDigits([...new Set(villages.map(v => v.talukaName).filter(Boolean))].length)}
            </span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-sm font-sans text-zinc-500 ">{t('villageMaster.totalDistricts')}</span>
            <span className="text-2xl font-bold font-sans text-zinc-800 mt-1">
              {toGujaratiDigits([...new Set(villages.map(v => v.districtName).filter(Boolean))].length)}
            </span>
          </div>
        </div>

        {/* Minimal Classic Registry Table */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3 select-none">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-700   select-none">
                {t('villageMaster.registryList')}
              </span>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-sm px-2 py-0.5 select-none">
                {filteredVillages.length} {t('villageMaster.records')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
                <Search size={16} className="text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('villageMaster.searchPlaceholder')}
                  className="bg-transparent border-none outline-none text-sm text-zinc-800 placeholder:text-zinc-400 w-full md:w-48 font-mono"
                />
              </div>
              <button
                onClick={loadVillages}
                className="p-1.5 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm"
                title={t('villageMaster.refresh')}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-white">
            {loading && villages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                <Loader className="animate-spin text-zinc-500" size={24} />
                <p className="text-sm font-mono">{t('villageMaster.loading')}</p>
              </div>
            ) : filteredVillages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500">
                <MapPin size={32} className="text-zinc-400" />
                <p className="text-sm font-mono">{t('villageMaster.noRecords')}</p>
                <button 
                  onClick={handleCreateNew} 
                  className="text-white border border-blue-600 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-sm font-bold select-none mt-2 transition"
                >
                  {t('villageMaster.addFirst')}
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse select-none">
                <thead>
                  <tr className={`bg-zinc-50 border-b border-zinc-300 text-zinc-600 text-base ${i18n.language === 'gu' ? 'font-prompt' : 'font-mono'}`}>
                    <th className="px-4 py-3 border-r border-zinc-200 w-16 text-center">#</th>
                    <th className="px-4 py-3 border-r border-zinc-200">
                      {t('villageMaster.villageName')} <span className="text-[10px] font-sans opacity-70">({i18n.language === 'gu' ? 'ગુજ' : 'Guj'})</span>
                    </th>
                    <th className="px-4 py-3 border-r border-zinc-200 w-32 text-center">{t('villageMaster.villageCode')}</th>
                    <th className="px-4 py-3 border-r border-zinc-200">{t('villageMaster.talukaName')}</th>
                    <th className="px-4 py-3 border-r border-zinc-200">{t('villageMaster.districtName')}</th>
                    <th className="px-4 py-3 text-center w-32">{t('villageMaster.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredVillages.map((v, idx) => (
                    <tr key={v.id} className="hover:bg-zinc-50/60 font-mono text-base transition-colors">
                      <td className="px-4 py-3 border-r border-zinc-200 text-center text-zinc-500 font-bold">
                        {toGujaratiDigits(idx + 1)}
                      </td>
                      <td className={`px-4 py-3 border-r border-zinc-200 font-black text-zinc-900 ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
                        {i18n.language === 'en' ? (v.engName || v.villageName) : v.villageName}
                      </td>
                      <td className={`px-4 py-3 border-r border-zinc-200 font-black text-center text-zinc-800 ${i18n.language === 'gu' ? 'font-prompt' : 'font-sans'}`}>
                        {toGujaratiDigits(v.villageCode.toString().padStart(4, '0'))}
                      </td>
                      <td className={`px-4 py-3 border-r border-zinc-200 text-zinc-700 font-bold ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
                        {v.talukaName ? v.talukaName : '—'}
                      </td>
                      <td className={`px-4 py-3 border-r border-zinc-200 text-zinc-700 font-bold ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
                        {v.districtName ? v.districtName : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(v)}
                            className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm"
                            title={t('villageMaster.edit')}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => confirmDelete(v)}
                            className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-red-50 hover:border-red-300 text-zinc-600 hover:text-red-700 transition shadow-sm"
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

      {/* Classic Accounting Form Modal - No Roundings, Solid Gray/White Palette */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-none" 
            onClick={() => !loading && setShowModal(false)}
          ></div>
          
          <div className="bg-white border border-zinc-400 rounded-none w-full max-w-md shadow-lg relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-5 py-3.5 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                {isEditing ? <Edit2 size={16} className="text-zinc-600" /> : <Plus size={16} className="text-zinc-600" />}
                <h2 className="text-sm font-bold tracking-tight text-zinc-800 uppercase font-mono">
                  {isEditing ? t('villageMaster.editRecord') : t('villageMaster.registerNew')}
                </h2>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-1 text-zinc-400 hover:text-red-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 font-mono text-sm">
              {/* Modal local validation message */}
              {modalMessage && (
                <div className={`p-2 border text-sm font-mono select-none mb-1 ${
                  modalMessage.type === 'error'
                    ? 'bg-red-50 border-red-300 text-red-800'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}>
                  <div className="flex items-center gap-2">
                    {modalMessage.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                    <p className="uppercase leading-none">{modalMessage.text}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className={`block font-bold text-zinc-500 uppercase ${i18n.language === 'gu' ? 'text-xs font-prompt' : 'text-[10px]'}`}>{t('villageMaster.villageCode')}</label>
                  <input
                    ref={villageCodeRef}
                    type="text"
                    value={formData.villageCode}
                    onChange={(e) => setFormData({ ...formData, villageCode: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, villageNameRef)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`block font-bold text-zinc-500 uppercase ${i18n.language === 'gu' ? 'text-xs font-prompt' : 'text-[10px]'}`}>
                    {t('villageMaster.villageName')} <span className="text-[10px] font-sans lowercase opacity-70">({i18n.language === 'gu' ? 'ગુજ' : 'Guj'})</span>
                  </label>
                  <input
                    ref={villageNameRef}
                    type="text"
                    value={formData.villageName}
                    onChange={(e) => setFormData({ ...formData, villageName: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, engNameRef)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-sans font-bold text-zinc-800"
                    placeholder={t('villageMaster.enterVillageName')}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`block font-bold text-zinc-500 uppercase ${i18n.language === 'gu' ? 'text-xs font-prompt' : 'text-[10px]'}`}>{t('villageMaster.villageNameEn')}</label>
                  <input
                    ref={engNameRef}
                    type="text"
                    value={formData.engName}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^ -~]/g, '').toUpperCase();
                      setFormData({ ...formData, engName: val });
                    }}
                    onKeyDown={(e) => handleKeyDown(e, talukaNameRef)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800 uppercase force-en font-sans"
                    placeholder={t('villageMaster.enterVillageNameEn')}
                    lang="en"
                    spellCheck="false"
                    translate="no"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={`block font-bold text-zinc-500 uppercase ${i18n.language === 'gu' ? 'text-xs font-prompt' : 'text-[10px]'}`}>{t('villageMaster.taluka')}</label>
                  <input
                    ref={talukaNameRef}
                    type="text"
                    value={formData.talukaName || ''}
                    onChange={(e) => setFormData({ ...formData, talukaName: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, districtNameRef)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition text-zinc-700"
                    placeholder={t('villageMaster.taluka')}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={`block font-bold text-zinc-500 uppercase ${i18n.language === 'gu' ? 'text-xs font-prompt' : 'text-[10px]'}`}>{t('villageMaster.district')}</label>
                  <input
                    ref={districtNameRef}
                    type="text"
                    value={formData.districtName || ''}
                    onChange={(e) => setFormData({ ...formData, districtName: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, null)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition text-zinc-700"
                    placeholder={t('villageMaster.district')}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex gap-2 justify-end border-t border-zinc-200 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold tracking-tight select-none rounded-none transition"
                >
                  {t('villageMaster.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold tracking-tight select-none rounded-none transition shadow-sm flex items-center justify-center gap-1 disabled:opacity-60"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={14} />
                  ) : isEditing ? (
                    <Save size={14} />
                  ) : (
                    <Save size={14} />
                  )}
                  {isEditing ? t('villageMaster.update') : t('villageMaster.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title={t('villageMaster.deleteConfirmTitle')}
        message={`${t('villageMaster.deleteConfirmMessage')} "${villageToDelete?.villageNam || ''}"${t('villageMaster.deleteConfirmSuffix')}`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
