import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Plus, Edit2, Trash2, Search,
  FileText, X, AlertCircle, CheckCircle,
  Hash, Activity, MessageSquare, Shield, RefreshCw, Loader,
  Save, Database
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';

export default function NarrationMaster() {
  const { t } = useTranslation();
  const [narrations, setNarrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ narration_text: '', narration_code: '', narration_type: 'JV' });
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
        narration_code: n.narration_code || '',
        narration_type: n.narration_type || 'JV'
      });
    } else {
      setEditingId(null);
      setFormData({ narration_text: '', narration_code: '', narration_type: 'JV' });
    }
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.narration_text.trim()) return;

    // Client-side duplicate check
    const isDuplicate = narrations.some(n => 
      n.narration_text.toLowerCase().trim() === formData.narration_text.toLowerCase().trim() && 
      n.id !== editingId
    );

    if (isDuplicate) {
      setError('Narration text already exists. Please use a unique description.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/narrations/${editingId}`, formData);
        setMessage({ type: 'success', text: 'Narration updated successfully.' });
      } else {
        await api.post('/narrations', formData);
        setMessage({ type: 'success', text: 'Narration registered successfully.' });
      }
      setShowModal(false);
      fetchNarrations();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save narration context.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this narration node?')) return;
    try {
      await api.delete(`/narrations/${id}`);
      setMessage({ type: 'success', text: 'Narration deleted successfully.' });
      fetchNarrations();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Delete operation failed.' });
    }
  };

  const filtered = narrations.filter(n =>
    n.narration_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (n.narration_code && n.narration_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (n.narration_type && n.narration_type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700 font-sans">
      <div className="max-w-[1600px] mx-auto px-8">

        {/* Page Header */}
        <PageHeader
          eyebrow="Management / Ledger Registry"
          eyebrowIcon={<Shield size={12} className="text-blue-500" />}
          title="Narration Master"
          subtitle="Define reusable ledger descriptions for accounting clarity"
        >
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-slate-200 shadow-sm focus-within:border-blue-500 transition-all group">
              <Search size={16} className="text-slate-400 group-focus-within:text-blue-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search descriptions..."
                className="bg-transparent border-none outline-none text-xs text-slate-600 w-48 placeholder:text-slate-300 font-bold"
              />
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-blue-600 px-6 py-2.5 rounded-lg text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-95"
            >
              <Plus size={16} /> Add Narration
            </button>
          </div>
        </PageHeader>

        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top duration-300 border-l-4 shadow-sm ${
            message.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'
          }`}>
            {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span className="text-xs font-bold uppercase tracking-wider">{message.text}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Registry Nodes', val: narrations.length, icon: <MessageSquare size={18} />, color: 'blue' },
            { label: 'Coded Entities', val: narrations.filter(n => n.narration_code).length, icon: <Hash size={18} />, color: 'violet' },
            { label: 'System Health', val: 'Online', icon: <Activity size={18} />, color: 'emerald' },
            { label: 'Active Filter', val: filtered.length, icon: <FileText size={18} />, color: 'slate' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-100 transition-all">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <div className={`p-2 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg group-hover:scale-110 transition-transform`}>{stat.icon}</div>
              </div>
              <p className="text-xl font-black text-slate-800">{stat.val}</p>
            </div>
          ))}
        </div>

        {/* Content Table Area */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
          <TableHeading
            icon={<MessageSquare size={18} />}
            iconColor="blue"
            title="Narration Registry"
            subtitle={`Total ${filtered.length} accounting descriptions registered`}
          >
            <button onClick={fetchNarrations} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-transparent hover:border-blue-100">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </TableHeading>

          <div className="flex-1 p-8">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center h-full p-20">
                <Loader size={48} className="animate-spin text-blue-100 mb-6" />
                <p className="text-slate-300 font-bold uppercase tracking-widest text-[10px] italic">Synchronizing Ledger Narrations...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center h-full p-20 text-center">
                <Database size={48} className="text-slate-200 mb-6" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-10 italic">No matched descriptions found</p>
                <button onClick={() => handleOpenModal()} className="px-10 py-3 bg-blue-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-95">
                  Authorize First Narration
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map(n => (
                  <div key={n.id} className="bg-white border border-slate-100 rounded-lg p-6 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-50/50 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/20 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
                    
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="flex gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded text-[10px] font-black text-slate-400 uppercase tracking-widest italic group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                          <Hash size={10} /> {n.narration_code || 'UNTITLED'}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 border rounded text-[10px] font-black uppercase tracking-widest italic transition-colors ${
                          n.narration_type === 'Credit' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          n.narration_type === 'Debit' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {n.narration_type || 'JV'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <button onClick={() => handleOpenModal(n)} className="p-2 bg-white border border-slate-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(n.id)} className="p-2 bg-white border border-slate-100 text-rose-500 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors relative z-10">
                      "{n.narration_text}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern Modal Workflow */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg border border-slate-100 animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="bg-blue-600 px-8 py-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white italic uppercase tracking-tight">
                  {editingId ? 'Edit Narration' : 'Add New Narration'}
                </h2>
                <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-1">Configure registry node</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              {error && (
                <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-[11px] font-bold uppercase tracking-wider rounded flex items-center gap-3">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Reference Code</label>
                    <div className="relative">
                      <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="text"
                        value={formData.narration_code}
                        onChange={e => setFormData({ ...formData, narration_code: e.target.value.toUpperCase() })}
                        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-sm uppercase tracking-widest shadow-sm"
                        placeholder="e.g. 1"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Narration Type</label>
                    <select
                      value={formData.narration_type}
                      onChange={e => setFormData({ ...formData, narration_type: e.target.value })}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-sm shadow-sm"
                    >
                      <option value="Credit">Credit</option>
                      <option value="Debit">Debit</option>
                      <option value="JV">JV (All others)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Narration Description</label>
                  <textarea
                    rows={4}
                    value={formData.narration_text}
                    onChange={e => setFormData({ ...formData, narration_text: e.target.value })}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-sm resize-none italic shadow-sm"
                    placeholder="Enter ledger description..."
                    required
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-50 mt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-3 bg-blue-600 text-white font-bold py-3.5 rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? <Loader className="animate-spin" size={18} /> : <><Save size={18} /> {editingId ? 'Update Narration' : 'Save Narration'}</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-10 py-3.5 bg-slate-100 text-slate-500 font-bold rounded-lg hover:bg-slate-200 transition-all text-[10px] uppercase tracking-widest active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
