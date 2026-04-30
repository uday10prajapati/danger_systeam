import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Plus, Edit2, Trash2, Search,
  FileText, X, AlertCircle, CheckCircle,
  Hash, Activity, MessageSquare, Shield, RefreshCw, Loader
} from 'lucide-react';

export default function NarrationMaster() {
  const [narrations, setNarrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ narration_text: '', narration_code: '' });
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.narration_text.trim()) return;
    try {
      if (editingId) {
        await api.put(`/narrations/${editingId}`, formData);
        setMessage({ type: 'success', text: 'Narration updated.' });
      } else {
        await api.post('/narrations', formData);
        setMessage({ type: 'success', text: 'Narration added.' });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ narration_text: '', narration_code: '' });
      setError(null);
      fetchNarrations();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save narration.');
    }
  };

  const handleEdit = (n) => {
    setEditingId(n.id);
    setFormData({ narration_text: n.narration_text, narration_code: n.narration_code || '' });
    setError(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this narration?')) return;
    try {
      await api.delete(`/narrations/${id}`);
      setMessage({ type: 'success', text: 'Narration deleted.' });
      fetchNarrations();
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Delete failed.' });
    }
  };

  const filtered = narrations.filter(n =>
    n.narration_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (n.narration_code && n.narration_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
              <Shield size={12} />
              <span>Management / Narration Master</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Narration Master</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-white rounded-lg px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
              <Search size={18} className="text-slate-400 group-focus-within:text-blue-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search narrations..."
                className="bg-transparent border-none outline-none text-sm text-slate-600 w-56 placeholder:text-slate-300 font-medium"
              />
            </div>
            <button
              onClick={() => { setShowForm(true); setEditingId(null); setFormData({ narration_text: '', narration_code: '' }); setError(null); }}
              className="flex items-center gap-2 bg-blue-600 px-6 py-3.5 rounded-lg text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
            >
              <Plus size={20} />
              Add Narration
            </button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
            message.type === 'error' ? 'bg-rose-50 border border-rose-100 text-rose-700' : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
          }`}>
            {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <p className="text-sm font-bold">{message.text}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Narrations</p>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><MessageSquare size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{narrations.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">With Code</p>
              <div className="p-2 bg-violet-50 rounded-lg text-violet-600"><Hash size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-violet-600">{narrations.filter(n => n.narration_code).length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Showing</p>
              <div className="p-2 bg-slate-50 rounded-lg text-slate-500"><FileText size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{filtered.length}</p>
          </div>
        </div>

        {/* Card Grid */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <MessageSquare size={16} className="text-slate-400" />
              Narration List
              <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black">{filtered.length}</span>
            </div>
            <button onClick={fetchNarrations} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
                <Loader className="animate-spin" size={28} />
                <p className="text-sm font-bold italic">Loading narrations...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-300">
                <MessageSquare size={40} strokeWidth={1} />
                <p className="text-sm font-bold italic">No narrations found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(n => (
                  <div key={n.id} className="bg-slate-50 border border-slate-100 rounded-lg p-5 hover:border-blue-200 hover:bg-white transition-all group shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <Hash size={10} /> {n.narration_code || 'UNC'}
                      </span>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(n)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-all shadow-sm">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(n.id)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 rounded-lg transition-all shadow-sm">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 leading-relaxed">"{n.narration_text}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-lg"><MessageSquare size={18} /></div>
                <div>
                  <h2 className="font-bold text-slate-800">{editingId ? 'Edit Narration' : 'New Narration'}</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Narration Master</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-800 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-rose-50 text-rose-600 p-3 rounded-lg flex items-center gap-2 border border-rose-100">
                  <AlertCircle size={16} />
                  <span className="text-sm font-bold">{error}</span>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Code</label>
                <input
                  type="text"
                  value={formData.narration_code}
                  onChange={e => setFormData({ ...formData, narration_code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm uppercase"
                  placeholder="e.g. PN-01"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Narration Text</label>
                <textarea
                  rows={4}
                  value={formData.narration_text}
                  onChange={e => setFormData({ ...formData, narration_text: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-medium text-slate-700 text-sm resize-none"
                  placeholder="e.g. BEING AMOUNT TRANSFERRED..."
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-lg font-bold text-sm hover:bg-slate-100 transition-all">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95">
                  {editingId ? 'Save Changes' : 'Add Narration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
