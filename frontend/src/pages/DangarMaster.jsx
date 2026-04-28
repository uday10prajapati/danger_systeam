import React, { useState, useEffect } from 'react';
import {
  Database, Search, Filter, Download,
  Eye, RefreshCcw, Layout, FileText,
  Calendar, User, Box, Shield,
  CheckCircle, Loader, Info
} from 'lucide-react';
import api from '../api';
import { useTranslation } from 'react-i18next';

export default function DangarMaster() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [company, setCompany] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [season, setSeason] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const companyRes = await api.get('/company');
      if (companyRes.data.success) {
        setCompany(companyRes.data.data);
        fetchEntries(companyRes.data.data.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async (compId) => {
    try {
      setLoading(true);
      const params = {};
      if (dateRange.start && dateRange.end) {
        params.startDate = dateRange.start;
        params.endDate = dateRange.end;
      }
      if (season) {
        params.season = season;
      }
      const res = await api.get('/dangar-entry', { params: { companyId: compId, ...params } });
      if (res.data.success) {
        setEntries(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter(e =>
    e.member_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.member_code?.toString().includes(searchQuery) ||
    e.sr_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.vehicle_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.item_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-1 italic">
              <Shield size={12} />
              <span>{t('modules.management', 'Management')} / Dangar Entry Master</span>
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic uppercase">Dangar Entry Registry</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Permanent Transaction Archive (Default View)</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-white rounded-lg px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
              <Search size={18} className="text-slate-400 group-focus-within:text-blue-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Member, SR, Vehicle..."
                className="bg-transparent border-none outline-none text-sm text-slate-700 w-64 placeholder:text-slate-300 font-bold italic"
              />
            </div>
            <button
              onClick={() => fetchEntries(company?.id)}
              className="p-3.5 bg-white text-slate-400 hover:text-blue-600 rounded-lg border border-slate-100 shadow-sm transition-all active:scale-95"
            >
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Dynamic Filters */}
        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-lg border border-slate-100 shadow-sm mb-8 flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-3">
            <Calendar className="text-slate-300" size={18} />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Range Protocol:</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100 shadow-inner">
            <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-transparent border-none outline-none text-[11px] font-black text-slate-600 uppercase mono" />
            <span className="text-slate-300 font-black">/</span>
            <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-transparent border-none outline-none text-[11px] font-black text-slate-600 uppercase mono" />
          </div>
          <button onClick={() => fetchEntries(company?.id)} className="px-6 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95">Verify Registry</button>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100 shadow-inner">
            {['', 'Winter', 'Summer'].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSeason(s);
                  // Trigger fetch immediately on season change for better UX
                  const params = { companyId: company?.id };
                  if (dateRange.start && dateRange.end) {
                    params.startDate = dateRange.start;
                    params.endDate = dateRange.end;
                  }
                  if (s) params.season = s;
                  api.get('/dangar-entry', { params }).then(res => {
                    if (res.data.success) setEntries(res.data.data);
                  });
                }}
                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${season === s
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-100 italic'
                  : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                {s || 'All Seasons'}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-6">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Registry Volume</p>
              <p className="text-lg font-black text-slate-800 italic leading-none">{filteredEntries.length} Records</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 border border-emerald-100">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>

        {/* Registry Table */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-slate-800 shadow-xl border border-slate-100">
                <Database size={24} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 italic uppercase">Permanent Transaction Node Archive</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Immutable Operation Logs (Security Level Alpha)</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            {loading ? (
              <div className="h-[400px] flex flex-col items-center justify-center gap-4">
                <Loader className="w-12 h-12 text-blue-100 animate-spin" />
                <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Processing Master Registry Feed...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="h-[400px] flex flex-col items-center justify-center gap-6">
                <div className="w-24 h-24 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-200">
                  <Box size={48} />
                </div>
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Registry is empty for this vector</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 italic text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-6">Identity Vector</th>
                    <th className="px-8 py-6">Ref. SR</th>
                    <th className="px-8 py-6">Resource Descriptor</th>
                    <th className="px-8 py-6 text-right">Net Volume</th>
                    <th className="px-8 py-6 text-right">Unit Rate</th>
                    <th className="px-8 py-6 text-right">Fiscal Value</th>
                    <th className="px-8 py-6">Vehicle / Remark</th>
                    <th className="px-8 py-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {filteredEntries.map((row) => (
                    <tr key={row.id} className="group hover:bg-slate-50 transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                            {row.member_name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight italic">{row.member_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 font-mono italic">#{row.member_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-blue-600 font-black text-sm italic tracking-tight font-mono">#{row.sr_no}</span>
                        <p className="text-[9px] font-black text-slate-300 uppercase italic leading-none mt-1">{new Date(row.entry_date).toLocaleDateString()}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-black text-slate-700 uppercase italic tracking-tight">{row.item_name}</p>
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{row.book_type}</p>
                      </td>
                      <td className="px-8 py-6 text-right font-black text-slate-800 text-sm italic font-mono">
                        {parseFloat(row.net_quintal).toFixed(2)} <span className="text-[10px] text-slate-300 uppercase ml-0.5">Qt</span>
                      </td>
                      <td className="px-8 py-6 text-right font-black text-blue-600 text-sm italic font-mono">
                        ₹{parseFloat(row.rate).toFixed(2)}
                      </td>
                      <td className="px-8 py-6 text-right font-black text-emerald-600 text-lg italic tracking-tighter font-mono bg-emerald-50/30">
                        ₹{parseFloat(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          {row.vehicle_no && (
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest italic bg-slate-100 px-2 py-0.5 rounded-lg w-fit">
                              <Layout size={10} /> {row.vehicle_no}
                            </div>
                          )}
                          <p className="text-[10px] font-medium text-slate-400 italic line-clamp-1 truncate w-48 font-mono">{row.remark || 'No metadata attached'}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-center">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-100 animate-pulse">Committed</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-8 bg-slate-900 border-t border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Registry Aggregate (Total Net)</p>
                <p className="text-2xl font-black text-white italic tracking-tighter leading-none">
                  {filteredEntries.reduce((acc, curr) => acc + parseFloat(curr.net_quintal || 0), 0).toFixed(2)} <span className="text-xs">Qt</span>
                </p>
              </div>
              <div className="flex flex-col bg-white/5 px-8 py-3 rounded-lg border border-white/5">
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1 italic">Fiscal Exposure (Sum)</p>
                <p className="text-2xl font-black text-emerald-400 italic tracking-tighter leading-none font-mono">
                  ₹{filteredEntries.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all border border-white/5 active:scale-95">
                <Download size={14} /> Export Feed
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
