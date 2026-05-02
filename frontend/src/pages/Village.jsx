import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import {
  Plus, AlertCircle, Edit2, Trash2, CheckCircle,
  MapPin, Search, RefreshCw, Save, X, Loader
} from 'lucide-react';
import Toast from '../components/Toast';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import Loading from '../components/Loading';

export default function VillageMaster() {
  const { t } = useTranslation();
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
    noOfVillage: 0
  });

  const villageCodeRef = useRef(null);
  const villageNameRef = useRef(null);
  const talukaNameRef = useRef(null);
  const districtNameRef = useRef(null);

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
        noOfVillage: r.no_of_villages
      }));
      setVillages(mapped);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load villages.' });
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
      setModalMessage({ type: 'error', text: 'Village name is required.' });
      return;
    }
    
    const isDuplicate = villages.some(v => 
      v.villageName.toLowerCase().trim() === formData.villageName.toLowerCase().trim() && 
      v.id !== formData.id
    );

    if (isDuplicate) {
      setModalMessage({ type: 'error', text: 'Village name already exists. Please use a unique name.' });
      return;
    }

    try {
      setLoading(true);
      if (isEditing) {
        await api.put(`/village/${formData.id}`, formData);
        setMessage({ type: 'success', text: 'Village updated successfully.' });
      } else {
        await api.post('/village', formData);
        setMessage({ type: 'success', text: 'Village registered successfully.' });
      }
      setShowModal(false);
      loadVillages();
    } catch {
      setModalMessage({ type: 'error', text: 'Save failed. Please try again.' });
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
      setMessage({ type: 'success', text: 'Village deleted successfully.' });
      setDeleteModalOpen(false);
      setVillageToDelete(null);
      loadVillages();
    } catch {
      setMessage({ type: 'error', text: 'Delete failed.' });
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
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 select-none">
              <MapPin size={20} className="text-zinc-600" />
              Village Registry Master
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider select-none">Master Data / Villages</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none"
            >
              <Plus size={16} />
              NEW VILLAGE
            </button>
          </div>
        </div>

        {/* Dense Minimalist Accounting Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Registered Villages</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{villages.length}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Talukas</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">
              {[...new Set(villages.map(v => v.talukaName).filter(Boolean))].length}
            </span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Districts</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">
              {[...new Set(villages.map(v => v.districtName).filter(Boolean))].length}
            </span>
          </div>
        </div>

        {/* Minimal Classic Registry Table */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3 select-none">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider select-none">
                Village Registry List
              </span>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5 select-none">
                {filteredVillages.length} RECORDS
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
                <Search size={16} className="text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or code..."
                  className="bg-transparent border-none outline-none text-xs text-zinc-800 placeholder:text-zinc-400 w-full md:w-48 font-mono"
                />
              </div>
              <button
                onClick={loadVillages}
                className="p-1.5 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm"
                title="Refresh Registry"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-white">
            {loading && villages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                <Loader className="animate-spin text-zinc-500" size={24} />
                <p className="text-xs font-mono">LOADING REGISTRY DATA...</p>
              </div>
            ) : filteredVillages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500">
                <MapPin size={32} className="text-zinc-400" />
                <p className="text-xs font-mono">NO VILLAGE RECORDS FOUND</p>
                <button 
                  onClick={handleCreateNew} 
                  className="text-white border border-blue-600 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold select-none mt-2 transition"
                >
                  ADD FIRST VILLAGE
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse select-none">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600 font-mono text-xs">
                    <th className="px-4 py-2 border-r border-zinc-200 w-12 text-center">#</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Village Name</th>
                    <th className="px-4 py-2 border-r border-zinc-200 w-28 text-center">Village Code</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Taluka Name</th>
                    <th className="px-4 py-2 border-r border-zinc-200">District Name</th>
                    <th className="px-4 py-2 text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredVillages.map((v, idx) => (
                    <tr key={v.id} className="hover:bg-zinc-50/60 font-mono text-xs transition-colors">
                      <td className="px-4 py-2 border-r border-zinc-200 text-center text-zinc-400">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 font-sans font-bold tracking-tight text-zinc-800 uppercase">
                        {v.villageName}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 font-mono font-bold text-center text-zinc-700 tracking-wider">
                        {v.villageCode.toString().padStart(4, '0')}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-zinc-600">
                        {v.talukaName ? v.talukaName.toUpperCase() : '—'}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-zinc-600">
                        {v.districtName ? v.districtName.toUpperCase() : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(v)}
                            className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => confirmDelete(v)}
                            className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-red-50 hover:border-red-300 text-zinc-600 hover:text-red-700 transition shadow-sm"
                            title="Delete"
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
                  {isEditing ? 'EDIT VILLAGE RECORD' : 'REGISTER NEW VILLAGE'}
                </h2>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-1 text-zinc-400 hover:text-red-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 font-mono text-xs">
              {/* Modal local validation message */}
              {modalMessage && (
                <div className={`p-2 border text-xs font-mono select-none mb-1 ${
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
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase">Village Code</label>
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
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase">Village Name</label>
                  <input
                    ref={villageNameRef}
                    type="text"
                    value={formData.villageName}
                    onChange={(e) => setFormData({ ...formData, villageName: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, talukaNameRef)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-sans font-bold text-zinc-800"
                    placeholder="ENTER VILLAGE NAME"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase">Taluka</label>
                  <input
                    ref={talukaNameRef}
                    type="text"
                    value={formData.talukaName || ''}
                    onChange={(e) => setFormData({ ...formData, talukaName: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, districtNameRef)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition text-zinc-700"
                    placeholder="TALUKA"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase">District</label>
                  <input
                    ref={districtNameRef}
                    type="text"
                    value={formData.districtName || ''}
                    onChange={(e) => setFormData({ ...formData, districtName: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, null)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition text-zinc-700"
                    placeholder="DISTRICT"
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
                  CANCEL
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
                  {isEditing ? 'UPDATE' : 'SAVE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title="DELETE VILLAGE RECORD"
        message={`ARE YOU SURE YOU WANT TO DELETE THE VILLAGE RECORD FOR "${villageToDelete?.villageName?.toUpperCase() || ''}"? THIS ACTION CANNOT BE UNDONE.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
