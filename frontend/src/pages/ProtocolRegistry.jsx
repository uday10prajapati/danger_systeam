import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  Shield, Search, Download, Filter,
  ArrowRight, FileText, Activity, Hash,
  Database, Scale, TrendingUp, Users,
  CheckCircle, AlertCircle, Loader, Eye,
  Calendar, Layers, BookOpen, Fingerprint,
  X, UserCheck
} from 'lucide-react';

export default function ProtocolRegistry() {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [stats, setStats] = useState({
    totalNodes: 0,
    dangarProtocols: 0,
    bardanProtocols: 0,
    activeAudit: 0
  });

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [auditData, setAuditData] = useState({ dangar: [], bardan: [], ledger: [] });
  const [auditLoading, setAuditLoading] = useState(false);

  const [company, setCompany] = useState(null);

  useEffect(() => {
    fetchProtocolData();
  }, [company]);

  const fetchProtocolData = async () => {
    try {
      setLoading(true);

      // 1. Ensure Company Context
      let currentCompany = company;
      if (!currentCompany) {
        const compRes = await axios.get('/api/company');
        if (compRes.data.success && compRes.data.data) {
          currentCompany = compRes.data.data;
          setCompany(currentCompany);
        } else {
          throw new Error("Company context lost");
        }
      }

      // 2. Fetch Registry
      const response = await axios.get(`/api/accounts/company/${currentCompany.id}`);
      if (response.data.success) {
        const sorted = (response.data.data || []).sort((a, b) => {
          return (a.account_code || '').localeCompare(b.account_code || '');
        });
        setData(sorted);

        // Calculate metrics
        const nodes = sorted.length;
        const dangar = sorted.filter(a => (a.account_code || '').startsWith('D') || a.account_type === 'purchase').length;
        const bardan = sorted.filter(a => (a.account_code || '').startsWith('B') || a.account_type === 'liabilities').length;

        setStats({
          totalNodes: nodes,
          dangarProtocols: dangar,
          bardanProtocols: bardan,
          activeAudit: nodes
        });
      }
    } catch (error) {
      console.error('Protocol Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const [auditQuery, setAuditQuery] = useState('');
  const [auditQueryMemberCode, setAuditQueryMemberCode] = useState('');
  const [auditQueryName, setAuditQueryName] = useState('');
  const [showCodeSuggestions, setShowCodeSuggestions] = useState(false);
  const [showMemberCodeSuggestions, setShowMemberCodeSuggestions] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // Temporal State for Audit Shards
  const [auditDateRange, setAuditDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const fetchAudit = async (account, queryStr = '') => {
    try {
      if (!queryStr && !selectedAccount) {
        setSelectedAccount(account);
        setAuditQuery('');
        setAuditQueryName('');
      }
      setAuditLoading(true);

      const activeAccount = account || selectedAccount;
      const activeQuery = queryStr || auditQuery || auditQueryName;

      let url = `/api/accounts/${activeAccount.id}/audit?startDate=${auditDateRange.startDate}&endDate=${auditDateRange.endDate}`;
      if (activeQuery) {
        url += `&memberQuery=${activeQuery}`;
      }

      const response = await axios.get(url);
      if (response.data.success) {
        setAuditData(response.data.data);
      }
    } catch (error) {
      console.error('Audit Fetch Error:', error);
    } finally {
      setAuditLoading(false);
    }
  };

  const selectSuggestedMember = (account) => {
    setAuditQuery(account.account_code || '');
    setAuditQueryName(account.account_name || '');
    setShowCodeSuggestions(false);
    setShowNameSuggestions(false);

    // Explicitly pass account.account_code to fetchAudit since state might not update instantly
    fetchAudit(selectedAccount, account.account_code);
  };

  const handleAuditSearchCode = (e) => {
    if (e.key === 'Enter') {
      fetchAudit(selectedAccount, auditQuery);
      setShowCodeSuggestions(false);
    }
  };

  const handleAuditSearchMemberCode = (e) => {
    if (e.key === 'Enter') {
      fetchAudit(selectedAccount, auditQueryMemberCode);
    }
  };

  const handleAuditSearchName = (e) => {
    if (e.key === 'Enter') {
      fetchAudit(selectedAccount, auditQueryName);
      setShowNameSuggestions(false);
    }
  };

  const filteredData = data.filter(item =>
    item.is_system === 1 &&
    (item.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.account_code || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const codeSuggestions = data.filter(item =>
    item.account_code &&
    item.is_subledger === 1 && !item.is_system &&
    item.account_code.toLowerCase().includes(auditQuery.toLowerCase())
  ).slice(0, 10);

  const mCodeSuggestions = data.filter(item =>
    item.member_code &&
    item.is_subledger === 1 &&
    item.member_code.toString().includes(auditQueryMemberCode.toLowerCase())
  ).slice(0, 10);

  const nameSuggestions = data.filter(item =>
    item.account_name &&
    item.is_subledger === 1 && !item.is_system &&
    item.account_name.toLowerCase().includes(auditQueryName.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-6">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
              <Fingerprint size={12} />
              <span>{t('modules.management', 'Management')} / Protocol Audit</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Identity Registry (P-Codes)</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-white rounded-lg px-5 py-3 border border-slate-100 shadow-sm focus-within:border-indigo-500 transition-all group">
              <Search size={18} className="text-slate-400 group-focus-within:text-indigo-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by P-Code or Nomenclature..."
                className="bg-transparent border-none outline-none text-sm text-slate-600 w-80 placeholder:text-slate-300 font-medium"
              />
            </div>
            <button
              className="bg-indigo-600 px-6 py-3.5 rounded-lg text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center gap-2"
              onClick={fetchProtocolData}
            >
              <Activity size={18} />
              Sync Ledger
            </button>
          </div>
        </div>

        {/* Protocol Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total Protocol Nodes</p>
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Fingerprint size={16} /></div>
            </div>
            <p className="text-2xl font-black text-slate-800 italic uppercase">{stats.totalNodes.toString().padStart(3, '0')}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Dangar Identities (D)</p>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Database size={16} /></div>
            </div>
            <p className="text-2xl font-black text-blue-600 italic uppercase">{stats.dangarProtocols.toString().padStart(3, '0')}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm group hover:border-rose-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Bardan Identities (B)</p>
              <div className="p-2 bg-rose-50 rounded-lg text-rose-600"><Layers size={16} /></div>
            </div>
            <p className="text-2xl font-black text-rose-600 italic uppercase">{stats.bardanProtocols.toString().padStart(3, '0')}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm group hover:border-emerald-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Synchronization Integrity</p>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle size={16} /></div>
            </div>
            <p className="text-2xl font-black text-emerald-600 italic uppercase">100%</p>
          </div>
        </div>

        {/* Main Protocol Table Wise View */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden min-h-[600px] flex flex-col">
          <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-100"><Scale size={20} /></div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight italic">Protocol Index Registry</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Identity Mapping Shards</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-32">
                <Loader className="w-12 h-12 text-indigo-100 animate-spin mb-6" />
                <p className="text-slate-300 font-bold uppercase tracking-[0.3em] text-[10px]">Scanning Identity Shards...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-32 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-lg flex items-center justify-center text-slate-200 mb-6"><Activity size={40} /></div>
                <h3 className="text-xl font-bold text-slate-400 mb-2 italic">Null Identity Match</h3>
                <p className="text-slate-300 text-sm max-w-xs mx-auto font-medium">No protocol identifiers discovered for this search spectrum.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse border-spacing-0">
                <thead>
                  <tr className="bg-[#F8FAFC]">
                    <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Structural ID (P-Code)</th>
                    <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Entity Nomenclature</th>
                    <th className="px-10 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Audit Trail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredData.map((item, idx) => (
                    <tr key={item.id} className="group hover:bg-slate-50 transition-all">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-lg transition-transform group-hover:scale-110 ${idx % 2 === 0 ? 'bg-gradient-to-br from-indigo-500 to-indigo-700' : 'bg-gradient-to-br from-slate-600 to-slate-800'}`}>
                            {item.account_code || 'N/A'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-700 italic tracking-widest mb-1 group-hover:text-indigo-600 transition-colors uppercase leading-none">{item.account_code || 'PROTO-NONE'}</p>
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">Identity Node</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <p className="text-sm font-black text-slate-800 group-hover:text-indigo-600 transition-colors uppercase leading-none italic">{item.account_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest leading-none">Member Registry</p>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <button
                          onClick={() => fetchAudit(item)}
                          className="p-3.5 bg-white border border-slate-100 text-slate-300 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-xl rounded-lg transition-all"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-8 border-t border-slate-50 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] italic">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Protocol Matrix Synchronized
            </div>
            <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest italic">Protocol Identity V1.0</p>
          </div>
        </div>

        {/* Industrial Audit Detail Modal (Kapat Entry Style) */}
        {selectedAccount && (
          <div className="fixed inset-0 z-[100] flex justify-center items-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedAccount(null)} />
            <div className="relative w-full max-w-4xl bg-white shadow-2xl flex flex-col border-2 border-slate-400 rounded-sm overflow-hidden" style={{ maxHeight: '90vh' }}>

              {/* Title bar - Blue Gradient */}
              <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white px-3 py-2 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-blue-100" />
                  <span className="text-[11px] font-black tracking-widest uppercase italic">Identity Audit Terminal - {selectedAccount.account_code}</span>
                </div>
                <button onClick={() => setSelectedAccount(null)} className="w-6 h-6 bg-white/20 hover:bg-red-500 flex items-center justify-center rounded-sm text-xs font-black transition-colors">✕</button>
              </div>

              {/* Modal Header - Command Bar (Kapat Style) */}
              <div className="bg-slate-100 border-b-2 border-slate-300 px-3 py-2 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 shadow-sm">
                      <span className="text-[9px] font-black text-slate-400 uppercase">From</span>
                      <input
                        type="date"
                        value={auditDateRange.startDate}
                        onChange={e => setAuditDateRange(p => ({ ...p, startDate: e.target.value }))}
                        onBlur={() => fetchAudit()}
                        className="bg-transparent border-none text-[10px] font-bold text-slate-800 outline-none w-20"
                      />
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 shadow-sm">
                      <span className="text-[9px] font-black text-slate-400 uppercase">To</span>
                      <input
                        type="date"
                        value={auditDateRange.endDate}
                        onChange={e => setAuditDateRange(p => ({ ...p, endDate: e.target.value }))}
                        onBlur={() => fetchAudit()}
                        className="bg-transparent border-none text-[10px] font-bold text-slate-800 outline-none w-20"
                      />
                    </div>
                  </div>

                  <div className="w-px h-6 bg-slate-300 mx-1"></div>

                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="relative w-24 shrink-0">
                      <input
                        type="text"
                        value={auditQuery}
                        onFocus={() => setShowCodeSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowCodeSuggestions(false), 200)}
                        onChange={(e) => setAuditQuery(e.target.value)}
                        onKeyDown={handleAuditSearchCode}
                        className="w-full bg-white border border-slate-300 rounded-sm px-2 h-7 text-xs font-black text-slate-800 outline-none focus:border-blue-600 transition-all uppercase italic text-center"
                        placeholder="P-CODE"
                      />
                      {showCodeSuggestions && codeSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 w-72 bg-white border-2 border-slate-400 mt-1 shadow-2xl z-[110] rounded-sm overflow-hidden">
                          {codeSuggestions.map(s => (
                            <div
                              key={s.id}
                              onMouseDown={() => selectSuggestedMember(s)}
                              className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-slate-100 last:border-none flex justify-between"
                            >
                              <span className="text-[10px] font-black italic">{s.account_code}</span>
                              <span className="text-[10px] font-bold uppercase truncate max-w-[150px]">{s.account_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative w-20 shrink-0">
                      <input
                        type="text"
                        value={auditQueryMemberCode}
                        onFocus={() => setShowMemberCodeSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowMemberCodeSuggestions(false), 200)}
                        onChange={(e) => setAuditQueryMemberCode(e.target.value)}
                        onKeyDown={handleAuditSearchMemberCode}
                        className="w-full bg-white border border-slate-300 rounded-sm px-2 h-7 text-xs font-black text-slate-800 outline-none focus:border-blue-600 transition-all uppercase italic text-center"
                        placeholder="M-CODE"
                      />
                      {showMemberCodeSuggestions && mCodeSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 w-72 bg-white border-2 border-slate-400 mt-1 shadow-2xl z-[110] rounded-sm overflow-hidden">
                          {mCodeSuggestions.map(s => (
                            <div
                              key={s.id}
                              onMouseDown={() => {
                                setAuditQueryMemberCode(s.member_code);
                                selectSuggestedMember(s);
                              }}
                              className="px-3 py-2 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-slate-100 last:border-none flex justify-between"
                            >
                              <span className="text-[10px] font-black italic">#{s.member_code}</span>
                              <span className="text-[10px] font-bold uppercase truncate max-w-[150px]">{s.account_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        value={auditQueryName}
                        onFocus={() => setShowNameSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                        onChange={(e) => setAuditQueryName(e.target.value)}
                        onKeyDown={handleAuditSearchName}
                        className="w-full bg-white border border-slate-300 rounded-sm px-3 h-7 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 transition-all uppercase italic"
                        placeholder="SEARCH IDENTITY..."
                      />
                      {showNameSuggestions && nameSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 w-full bg-white border-2 border-slate-400 mt-1 shadow-2xl z-[110] rounded-sm overflow-hidden">
                          {nameSuggestions.map(s => (
                            <div
                              key={s.id}
                              onMouseDown={() => selectSuggestedMember(s)}
                              className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-slate-100 last:border-none flex justify-between items-center"
                            >
                              <span className="text-[10px] font-black uppercase italic">{s.account_name}</span>
                              <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-100">{s.account_code}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {auditData.resolvedMember && (
                    <div className="flex items-center gap-2 pl-3 border-l border-slate-300 animate-in slide-in-from-left-2 duration-300 shrink-0">
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-[8px] font-black text-blue-500 uppercase italic">Sabhasad Identity</span>
                        <span className="text-[10px] font-black text-slate-800 uppercase italic truncate max-w-[140px]">{auditData.resolvedMember.member_name}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats Metrics (Right Aligned) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex flex-col items-end px-2 py-0.5 bg-blue-600 border border-blue-700 rounded-sm shadow-sm min-w-[70px]">
                    <span className="text-blue-100 text-[8px] font-black uppercase leading-none mb-0.5 tracking-tighter italic">D-Shards</span>
                    <span className="text-white text-[11px] font-black leading-none italic">{auditData.dangar.length}</span>
                  </div>
                  <div className="flex flex-col items-end px-2 py-0.5 bg-rose-600 border border-rose-700 rounded-sm shadow-sm min-w-[70px]">
                    <span className="text-rose-100 text-[8px] font-black uppercase leading-none mb-0.5 tracking-tighter italic">B-Shards</span>
                    <span className="text-white text-[11px] font-black leading-none italic">{auditData.bardan.length}</span>
                  </div>
                </div>
              </div>

              {/* Modal Content - Scrollable Registry Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6 custom-scrollbar" style={{ minHeight: 0 }}>
                {auditLoading ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Aggregating Intelligence Shards...</p>
                  </div>
                ) : (
                  <>
                    {/* Stats & Identity Row */}
                    <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-sm">
                      <div className="flex items-center gap-6">
                        <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-blue-600 shadow-sm shrink-0"><Search size={18} /></div>
                        <div className="flex gap-8">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Structural ID</p>
                            <p className="text-[11px] font-black text-slate-900 uppercase italic">
                              #{auditData.resolvedMember?.member_code || auditQuery || auditQueryMemberCode || 'IDENT_NODE'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Sabhasad Nomenclature</p>
                            <p className="text-[11px] font-black text-slate-900 uppercase italic">
                              {auditData.resolvedMember?.member_name || auditQueryName || 'SUBJECT_IDENTITY_RESOLVED'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {(selectedAccount.account_code === 'SYS-DANGAR' || selectedAccount.account_code.includes('DS')) && (
                          <div className="text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Dangar Frequency</p>
                            <p className="text-lg font-black text-blue-600 italic leading-none truncate">{auditData.dangar.length.toString().padStart(2, '0')}</p>
                          </div>
                        )}
                        {(selectedAccount.account_code === 'SYS-BARDAN' || selectedAccount.account_code.includes('BS')) && (
                          <div className="text-right border-l pl-6 border-slate-200">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Bardan Frequency</p>
                            <p className="text-lg font-black text-rose-600 italic leading-none truncate">{auditData.bardan.length.toString().padStart(2, '0')}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Transaction Shard Master Tables */}
                    <div className="space-y-6">
                      {/* Dangar Shard Table */}
                      {(selectedAccount.account_code === 'SYS-DANGAR' || selectedAccount.account_code.includes('DS')) && (
                        <div className="border border-slate-200 rounded-sm overflow-hidden">
                          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 italic">
                              <Database size={12} /> Dangar Protocol Registry (D)
                            </span>
                            <span className="text-[10px] font-black text-slate-300 italic uppercase">Traceable Node</span>
                          </div>
                          {auditData.dangar.length === 0 ? (
                            <div className="p-12 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest bg-white">Null Shards Discovered</div>
                          ) : (
                            <table className="w-full text-left">
                              <thead className="bg-[#F8FAFC] border-b border-slate-200">
                                <tr>
                                  <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic border-r border-slate-100">Code</th>
                                  <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic border-r border-slate-100">Item Nomenclature</th>
                                  <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic border-r border-slate-100">Member Name</th>
                                  <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic border-r border-slate-100">Quantity</th>
                                  <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic text-right">Audit Sum</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {auditData.dangar.map((entry, idx) => (
                                  <tr key={entry.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-5 py-3 font-black text-slate-900 italic text-[11px] border-r border-slate-50">
                                      D{String(idx + 1).padStart(5, '0')}
                                    </td>
                                    <td className="px-5 py-3 font-bold text-slate-600 uppercase text-[10px] border-r border-slate-50">{entry.item_name}</td>
                                    <td className="px-5 py-3 font-bold text-slate-800 uppercase text-[11px] italic border-r border-slate-50">{entry.member_name || '---'}</td>
                                    <td className="px-5 py-3 font-bold text-slate-400 uppercase text-[10px] border-r border-slate-50">{entry.net_quintal} Qtl</td>
                                    <td className="px-5 py-3 text-right font-black text-blue-600 text-[11px] group-hover:scale-105 transition-transform">₹{parseFloat(entry.amount).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}

                      {/* Bardan Shard Table */}
                      {(selectedAccount.account_code === 'SYS-BARDAN' || selectedAccount.account_code.includes('BS')) && (
                        <div className="border border-slate-200 rounded-sm overflow-hidden">
                          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2 italic">
                              <Layers size={12} /> Bardan Protocol Registry (B)
                            </span>
                            <span className="text-[10px] font-black text-slate-300 italic uppercase">Linked Asset Node</span>
                          </div>
                          {auditData.bardan.length === 0 ? (
                            <div className="p-12 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest bg-white">Null Shards Discovered</div>
                          ) : (
                            <table className="w-full text-left">
                              <thead className="bg-[#F8FAFC] border-b border-slate-200">
                                <tr>
                                  <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic border-r border-slate-100">Code</th>
                                  <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic border-r border-slate-100">Logic Type</th>
                                  <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic border-r border-slate-100">Registration Name</th>
                                  <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic border-r border-slate-100">Volume</th>
                                  <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {auditData.bardan.map((entry, idx) => (
                                  <tr key={entry.id} className="hover:bg-rose-50/30 transition-colors group">
                                    <td className="px-5 py-3 font-black text-slate-900 italic text-[11px] border-r border-slate-50">
                                      B{String(idx + 1).padStart(4, '0')}
                                    </td>
                                    <td className="px-5 py-3 font-bold text-slate-600 uppercase text-[10px] border-r border-slate-50">{entry.book_type}</td>
                                    <td className="px-5 py-3 font-bold text-slate-800 uppercase text-[11px] italic border-r border-slate-50">{entry.name || '---'}</td>
                                    <td className="px-5 py-3 font-bold text-slate-400 uppercase text-[10px] border-r border-slate-50">{entry.qty} Bags</td>
                                    <td className="px-5 py-3 text-right">
                                      <span className="px-2 py-0.5 bg-slate-800 text-white rounded-sm font-black italic text-[9px] uppercase tracking-tighter shadow-sm">{entry.option_type}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}

                      {/* Generic Sub-Ledger Shard Table */}
                      {selectedAccount.is_subledger && !selectedAccount.account_code.includes('DS') && !selectedAccount.account_code.includes('BS') && (
                        <div className="border border-slate-200 rounded-sm overflow-hidden mt-6">
                          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 italic">
                              <Layers size={12} /> Sub-Ledger Shard Table (Generic)
                            </span>
                            <span className="text-[10px] font-black text-slate-300 italic uppercase">Account Movements</span>
                          </div>
                          {auditData.ledger.length === 0 ? (
                            <div className="p-12 text-center text-slate-300 text-[10px] font-bold uppercase tracking-widest bg-white">Null Ledger Shards Discovered</div>
                          ) : (
                            <table className="w-full text-left">
                              <thead className="bg-[#F8FAFC] border-b border-slate-200">
                                <tr>
                                  <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic border-r border-slate-100">Date/ID</th>
                                  <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest italic border-r border-slate-100">Ref / Narration</th>
                                  <th className="px-5 py-3 text-[9px] font-black text-emerald-600 uppercase tracking-widest italic border-r border-slate-100 text-right">Jama (Cr)</th>
                                  <th className="px-5 py-3 text-[9px] font-black text-rose-600 uppercase tracking-widest italic text-right">Udhar (Dr)</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {auditData.ledger.map((entry) => (
                                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-5 py-3 font-black text-slate-400 italic text-[9px] border-r border-slate-50">
                                      {new Date(entry.entry_date || entry.created_at).toLocaleDateString()}
                                      <span className="block text-[8px] font-normal text-slate-300 tracking-tighter">#SN-{entry.id}</span>
                                    </td>
                                    <td className="px-5 py-3 font-bold text-slate-600 uppercase text-[10px] border-r border-slate-50">
                                      {entry.narration || 'LEDGER_ENTRY'}
                                      <span className="block text-[8px] font-black text-slate-300 tracking-widest mt-0.5">{entry.voucher_id || 'VOC-NONE'}</span>
                                    </td>
                                    <td className="px-5 py-3 text-right font-black text-emerald-600 text-[11px] border-r border-slate-50">
                                      {parseFloat(entry.credit_amount || entry.credit || 0) > 0 ? `₹${parseFloat(entry.credit_amount || entry.credit || 0).toLocaleString()}` : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-right font-black text-rose-600 text-[11px]">
                                      {parseFloat(entry.debit_amount || entry.debit || 0) > 0 ? `₹${parseFloat(entry.debit_amount || entry.debit || 0).toLocaleString()}` : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer - Actions */}
              <div className="p-4 bg-slate-100 border-t-2 border-slate-300 flex justify-end gap-2 shrink-0">
                <button
                  onClick={() => setSelectedAccount(null)}
                  className="px-10 py-2.5 bg-white border border-slate-400 text-[10px] font-black text-slate-600 hover:bg-slate-200 rounded-sm transition-all uppercase italic tracking-[0.1em]"
                >
                  Close Terminal
                </button>
              </div>
            </div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f5f9; border-radius: 10px; }
      `}} />
      </div>
    </div>
  );
}
