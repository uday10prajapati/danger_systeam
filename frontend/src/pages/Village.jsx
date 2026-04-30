import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import {
  Plus, AlertCircle, Edit2, Trash2, CheckCircle,
  MapPin, Search, Shield, RefreshCw, Save, X,
  Navigation, Globe, Building2, Loader, Filter
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';

export default function VillageMaster() {
  const { t } = useTranslation();
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    id: null,
    villageCode: '',
    villageName: '',
    talukaName: '',
    districtName: '',
    noOfVillage: 0
  });

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
    setShowModal(true);
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
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Validation: Check for duplicate name
    const isDuplicate = villages.some(v => 
      v.villageName.toLowerCase().trim() === formData.villageName.toLowerCase().trim() && 
      v.id !== formData.id
    );

    if (isDuplicate) {
      setMessage({ type: 'error', text: 'Village name already exists. Please use a unique name.' });
      setTimeout(() => setMessage(null), 3000);
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
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Save failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this village?')) return;
    try {
      await api.delete(`/village/${id}`);
      setMessage({ type: 'success', text: 'Village deleted.' });
      loadVillages();
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Delete failed.' });
    }
  };

  const filteredVillages = villages.filter(v =>
    v.villageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.villageCode.toString().includes(searchQuery) ||
    (v.talukaName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-8">

        {/* Page Header */}
        <PageHeader
          eyebrow="Management / Village Master"
          eyebrowIcon={<Shield size={12} />}
          title="Village Registry"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white rounded-lg px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
              <Search size={18} className="text-slate-400 group-focus-within:text-blue-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search villages..."
                className="bg-transparent border-none outline-none text-sm text-slate-600 w-56 placeholder:text-slate-300 font-medium"
              />
            </div>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 bg-blue-600 px-6 py-3.5 rounded-lg text-xs font-black text-white uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
            >
              <Plus size={18} />
              Add Village
            </button>
          </div>
        </PageHeader>

        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top duration-300 ${message.type === 'error'
            ? 'bg-rose-50 border border-rose-100 text-rose-700'
            : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
            }`}>
            {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <p className="text-sm font-bold">{message.text}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Villages</p>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><MapPin size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{villages.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Talukas</p>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Navigation size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{[...new Set(villages.map(v => v.talukaName).filter(Boolean))].length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Districts</p>
              <div className="p-2 bg-violet-50 rounded-lg text-violet-600"><Globe size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-violet-600">{[...new Set(villages.map(v => v.districtName).filter(Boolean))].length}</p>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          <TableHeading
            icon={<MapPin size={16} />}
            iconColor="blue"
            title="Village List"
            count={filteredVillages.length}
          >
            <button
              onClick={loadVillages}
              className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </TableHeading>

          <div className="flex-1 overflow-x-auto">
            {loading && villages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
                <Loader className="animate-spin" size={32} />
                <p className="text-sm font-bold italic">Loading villages...</p>
              </div>
            ) : filteredVillages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-300">
                <MapPin size={48} strokeWidth={1} />
                <p className="text-sm font-bold italic">No villages found</p>
                <button onClick={handleCreateNew} className="text-blue-600 text-xs font-bold uppercase hover:underline">Register First Village</button>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-16 text-center">#</th>
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Village</th>
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Taluka</th>
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">District</th>
                    <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredVillages.map((v, idx) => (
                    <tr key={v.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5 text-center">
                        <span className="text-xs font-black text-slate-300">{idx + 1}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <Building2 size={18} />
                          </div>
                          <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{v.villageName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="bg-white px-3 py-1 rounded-lg text-xs font-bold text-slate-500 border border-slate-100">
                          {v.villageCode.toString().padStart(4, '0')}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-semibold text-slate-500">{v.talukaName || '—'}</p>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{v.districtName || '—'}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          <button
                            onClick={() => handleEdit(v)}
                            className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-lg shadow-sm transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(v.id)}
                            className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 rounded-lg shadow-sm transition-all"
                          >
                            <Trash2 size={16} />
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

      {/* Village Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => !loading && setShowModal(false)}
          ></div>
          
          <div className="bg-white rounded-lg w-full max-w-xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-100">
                    {isEditing ? <Edit2 size={20} /> : <Plus size={20} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Edit Village' : 'Register Village'}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Village Master</p>
                  </div>
               </div>
               <button onClick={() => setShowModal(false)} className="p-2 text-slate-300 hover:text-rose-500 transition-all">
                 <X size={20} />
               </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Village Code</label>
                  <input
                    type="text"
                    value={formData.villageCode}
                    onChange={(e) => setFormData({ ...formData, villageCode: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Village Name</label>
                  <input
                    type="text"
                    value={formData.villageName}
                    onChange={(e) => setFormData({ ...formData, villageName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm"
                    placeholder="Enter village name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Taluka</label>
                  <input
                    type="text"
                    value={formData.talukaName}
                    onChange={(e) => setFormData({ ...formData, talukaName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-semibold text-slate-700 text-sm"
                    placeholder="Taluka name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">District</label>
                  <input
                    type="text"
                    value={formData.districtName}
                    onChange={(e) => setFormData({ ...formData, districtName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-semibold text-slate-700 text-sm"
                    placeholder="District name"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-500 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : isEditing ? (
                    <Edit2 size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  {isEditing ? 'Save Changes' : 'Register Village'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

