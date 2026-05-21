import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, RefreshCcw, Filter, Package, X,
  Eye, Scale, Hash, Calendar, User, MapPin
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import { formatBilingualText } from '../utils/textUtils';

const fmtDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB');
};

const fmtNum = (value, digits = 2) => {
  const n = parseFloat(value || 0);
  return n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

export default function BardanReport() {
  const { i18n } = useTranslation();
  const isGu = i18n.language === 'gu';

  const [company, setCompany] = useState(null);
  const [members, setMembers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ entries: 0, bardan: 0, weight: 0, net_quintal: 0, amount: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [memberId, setMemberId] = useState('all');
  const [memCode, setMemCode] = useState('');
  const [memName, setMemName] = useState('');
  const [showMemDrop, setShowMemDrop] = useState(false);
  const [village, setVillage] = useState('');
  const [bankName, setBankName] = useState('');
  const [season, setSeason] = useState('');
  const [dangarClass, setDangarClass] = useState('');
  const [fromMemberCode, setFromMemberCode] = useState('');
  const [toMemberCode, setToMemberCode] = useState('');
  const [hideZeroBardan, setHideZeroBardan] = useState(false);

  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const memCodeRef = useRef(null);
  const memNameRef = useRef(null);

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    if (company?.id) {
      fetchDropdowns();
      fetchReportData();
    }
  }, [company]);

  const displayMemberName = (member) => {
    if (!member) return '';
    return isGu
      ? (member.member_name_gu || member.member_name || member.eng_name || '')
      : (member.eng_name || member.member_name || member.member_name_gu || '');
  };

  const displayRowMemberName = (row) => {
    if (!row) return '';
    return isGu
      ? (row.member_name_gu || row.member_name || row.eng_name || '')
      : (row.eng_name || row.member_name || row.member_name_gu || '');
  };

  const displayItemName = (row) => {
    if (!row) return '';
    return isGu
      ? (row.item_name_gu || row.item_name || '')
      : (row.item_name || row.item_name_gu || '');
  };

  const loadCompany = async () => {
    try {
      const res = await api.get('/company');
      if (res.data.success) setCompany(res.data.data);
    } catch (error) {
      setToast({ type: 'error', text: 'Failed to load company context.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [memberRes, seasonRes] = await Promise.all([
        api.get(`/members/company/${company.id}`),
        api.get(`/seasons/company/${company.id}`)
      ]);
      if (memberRes.data.success) setMembers(memberRes.data.data || []);
      if (seasonRes.data.success) setSeasons((seasonRes.data.data || []).map(s => s.name));
    } catch (error) {
      console.error('Bardan report dropdown error:', error);
    }
  };

  const fetchReportData = async () => {
    if (!company?.id) return;
    setSyncing(true);
    try {
      const res = await api.get('/bardan-report', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          memberId,
          village,
          bankName,
          season,
          dangarClass,
          fromMemberCode,
          toMemberCode
        }
      });
      if (res.data.success) {
        setRows(res.data.data || []);
        setTotals(res.data.totals || {});
      }
    } catch (error) {
      console.error('Bardan report fetch error:', error);
      setToast({ type: 'error', text: 'Failed to load Bardan report.' });
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  const filteredMembers = useMemo(() => {
    const code = memCode.toLowerCase();
    const name = memName.toLowerCase();
    return members.filter(m => {
      const display = displayMemberName(m).toLowerCase();
      return (!code || String(m.member_code || '').toLowerCase().includes(code) || String(m.id).includes(code)) &&
        (!name || display.includes(name) || (m.member_name || '').toLowerCase().includes(name) || (m.eng_name || '').toLowerCase().includes(name));
    }).slice(0, 50);
  }, [members, memCode, memName, isGu]);

  const visibleRows = useMemo(() => {
    return hideZeroBardan ? rows.filter(row => parseFloat(row.returned_bags || 0) > 0) : rows;
  }, [rows, hideZeroBardan]);

  const uniqueVillages = useMemo(() => {
    return [...new Set(members.map(m => m.village_name).filter(Boolean))].sort();
  }, [members]);

  const uniqueBanks = useMemo(() => {
    return [...new Set(members.map(m => m.bank_name).filter(Boolean))].sort();
  }, [members]);

  const handleSelectMember = (member) => {
    if (!member) {
      setMemberId('all');
      setMemCode('');
      setMemName('');
      setShowMemDrop(false);
      return;
    }
    setMemberId(member.id);
    setMemCode(String(member.member_code || member.id));
    setMemName(displayMemberName(member));
    setShowMemDrop(false);
  };

  const clearFilters = () => {
    setDateRange({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
    setMemberId('all');
    setMemCode('');
    setMemName('');
    setVillage('');
    setBankName('');
    setSeason('');
    setDangarClass('');
    setFromMemberCode('');
    setToMemberCode('');
    setHideZeroBardan(false);
  };

  const isDefaultStartDate = dateRange.startDate === new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const isDefaultEndDate = dateRange.endDate === new Date().toISOString().split('T')[0];
  const hasActiveFilters = memberId !== 'all' || village !== '' || bankName !== '' || season !== '' || dangarClass !== '' || fromMemberCode !== '' || toMemberCode !== '' || hideZeroBardan || !isDefaultStartDate || !isDefaultEndDate;

  const handleKeyDown = (e, nextRef, submit = false) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (nextRef?.current) nextRef.current.focus();
    if (submit) fetchReportData();
  };

  // Auto-refresh when filters change (debounced)
  const autoFetchTimer = useRef(null);
  useEffect(() => {
    if (!company?.id) return;
    if (autoFetchTimer.current) clearTimeout(autoFetchTimer.current);
    autoFetchTimer.current = setTimeout(() => {
      fetchReportData();
    }, 300);
    return () => {
      if (autoFetchTimer.current) clearTimeout(autoFetchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, village, bankName, season, dangarClass, fromMemberCode, toMemberCode, hideZeroBardan, dateRange.startDate, dateRange.endDate]);

  const weightRows = (selectedEntry?.weights || []).filter(w => parseFloat(w.weight || 0) > 0);

  if (loading && !company) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 select-none pb-12">
      <Toast message={toast} onClose={() => setToast(null)} />

      <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Entries</span>
            <span className="text-[13px] font-bold text-slate-800 mt-1">{visibleRows.length}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Jama Bardan</span>
            <span className="text-[13px] font-bold text-[#1d5f84] mt-1">{fmtNum(visibleRows.reduce((s, r) => s + parseFloat(r.returned_bags || 0), 0), 0)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Weight</span>
            <span className="text-[13px] font-bold text-slate-800 mt-1">{fmtNum(visibleRows.reduce((s, r) => s + parseFloat(r.total_kg || 0), 0), 2)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Net Quintal</span>
            <span className="text-[13px] font-bold text-emerald-700 mt-1">{fmtNum(visibleRows.reduce((s, r) => s + parseFloat(r.net_quintal || 0), 0), 2)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none">
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-extrabold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>
                Bardan Report
              </span>
              <span className="bg-slate-200 text-slate-600 font-bold force-en text-[9px] px-1.5 py-0.5 rounded-sm">
                {visibleRows.length} Records
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowFiltersDrawer(true)}
                className="h-7 flex items-center gap-1.5 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold rounded-md transition cursor-pointer uppercase tracking-wider"
              >
                <Filter size={13} />
                Filters
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="h-7 flex items-center gap-1.5 px-2.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 text-[11px] font-bold rounded-md transition cursor-pointer uppercase tracking-wider"
                >
                  <X size={13} />
                  {isGu ? 'ક્લિયર' : 'Clear'}
                </button>
              )}
              <button
                onClick={fetchReportData}
                className="h-7 flex items-center gap-1.5 px-2.5 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[11px] font-bold rounded-md transition cursor-pointer uppercase tracking-wider"
              >
                <RefreshCcw size={13} className={syncing ? 'animate-spin' : ''} />
                Sync
              </button>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-slate-200 border-collapse text-[11px]">
              <thead className="bg-slate-50 font-sans">
                <tr>
                  <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-16">Bill</th>
                  <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">Member</th>
                  <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">Item</th>
                  <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">Date</th>
                  <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">Class</th>
                  <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">Bardan</th>
                  <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">Weight</th>
                  <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 w-16">View</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {syncing ? (
                  <tr>
                    <td colSpan="8" className="py-20 text-center">
                      <RefreshCcw className="animate-spin mx-auto mb-4 text-slate-400" size={24} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading Bardan report...</p>
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-20 text-center">
                      <Package className="text-slate-300 mx-auto mb-4" size={40} strokeWidth={1} />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Bardan report records found</p>
                    </td>
                  </tr>
                ) : visibleRows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/75 transition-colors cursor-pointer" onClick={() => setSelectedEntry(row)}>
                    <td className="px-3.5 py-2 text-center font-mono text-[#1d5f84] font-bold border-r border-slate-100">#{row.sr_no}</td>
                    <td className="px-3.5 py-2 border-r border-slate-100">
                      <div className="flex flex-col">
                        <span className={`font-bold text-slate-800 ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>
                          {isGu ? formatBilingualText(displayRowMemberName(row)) : displayRowMemberName(row)}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">CODE: {row.member_code || '-'}</span>
                      </div>
                    </td>
                    <td className={`px-3.5 py-2 border-r border-slate-100 font-bold text-slate-700 ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>
                      {isGu ? formatBilingualText(displayItemName(row)) : displayItemName(row)}
                    </td>
                    <td className="px-3.5 py-2 text-center border-r border-slate-100 font-mono text-slate-600">{fmtDate(row.entry_date)}</td>
                    <td className="px-3.5 py-2 text-center border-r border-slate-100">
                      <span className="px-1.5 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-600 text-[9px] font-bold uppercase">{row.quality_class || '-'}</span>
                    </td>
                    <td className="px-3.5 py-2 text-right border-r border-slate-100 font-mono font-bold text-[#1d5f84]">{fmtNum(row.returned_bags, 0)}</td>
                    <td className="px-3.5 py-2 text-right border-r border-slate-100 font-mono font-bold text-slate-800">{fmtNum(row.total_kg, 2)}</td>
                    <td className="px-3.5 py-2 text-center">
                      <button className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 hover:text-[#1d5f84] transition cursor-pointer">
                        <Eye size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={`fixed inset-0 z-[100] overflow-hidden ${showFiltersDrawer ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px] transition-opacity duration-300 ${showFiltersDrawer ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setShowFiltersDrawer(false)}
        />
        <div className={`fixed inset-y-0 right-0 max-w-full flex pl-10 transform transition-transform duration-300 ease-in-out ${showFiltersDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="w-screen max-w-sm bg-white border-l border-slate-200 flex flex-col shadow-none">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-[#1d5f84]" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Bardan Filters</span>
              </div>
              <button onClick={() => setShowFiltersDrawer(false)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Start Date</span>
                  <input ref={startDateRef} type="date" value={dateRange.startDate} onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })} onKeyDown={e => handleKeyDown(e, endDateRef)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 outline-none w-full" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">End Date</span>
                  <input ref={endDateRef} type="date" value={dateRange.endDate} onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })} onKeyDown={e => handleKeyDown(e, memCodeRef)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 outline-none w-full" />
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Member</span>
                <div className="flex gap-2">
                  <input ref={memCodeRef} type="text" value={memCode} onChange={e => { setMemCode(e.target.value); setShowMemDrop(true); }} onFocus={() => setShowMemDrop(true)} onKeyDown={e => handleKeyDown(e, memNameRef)} placeholder="Code" className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-2 py-1.5 text-xs text-[#1d5f84] font-mono font-bold w-16 text-center outline-none" />
                  <input ref={memNameRef} type="text" value={memName} onChange={e => { setMemName(e.target.value); setShowMemDrop(true); }} onFocus={() => setShowMemDrop(true)} onKeyDown={e => handleKeyDown(e, null, true)} placeholder="Search member..." className={`bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-xs text-slate-700 font-bold flex-1 outline-none ${isGu ? 'font-prompt' : 'font-sans uppercase'}`} />
                </div>
                {showMemDrop && (
                  <div className="absolute top-[102%] left-0 right-0 bg-white border border-slate-200 rounded-md z-[110] mt-0.5 max-h-40 overflow-y-auto shadow-sm">
                    <div onClick={() => handleSelectMember(null)} className="px-2.5 py-1 hover:bg-slate-50 cursor-pointer font-bold text-[9px] text-[#1d5f84] border-b border-slate-100 uppercase flex items-center gap-1">
                      <Search size={10} />
                      <span>All Members</span>
                    </div>
                    {filteredMembers.map(member => (
                      <div key={member.id} onClick={() => handleSelectMember(member)} className="px-2.5 py-1 flex justify-between items-center cursor-pointer border-b border-slate-100 last:border-none hover:bg-slate-50">
                        <span className={`text-[10px] font-bold truncate ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>
                          {isGu ? formatBilingualText(displayMemberName(member)) : displayMemberName(member)}
                        </span>
                        <span className="text-[8px] font-mono text-slate-400 font-semibold shrink-0">#{member.member_code || member.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">From Code</span>
                  <input type="text" value={fromMemberCode} onChange={e => setFromMemberCode(e.target.value)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 outline-none w-full" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">To Code</span>
                  <input type="text" value={toMemberCode} onChange={e => setToMemberCode(e.target.value)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 outline-none w-full" />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Class of Dangar</span>
                <select value={dangarClass} onChange={e => setDangarClass(e.target.value)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 outline-none w-full">
                  <option value="">All Classes</option>
                  <option value="1st">1st</option>
                  <option value="2nd">2nd</option>
                  <option value="3rd">3rd</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Village</span>
                <select value={village} onChange={e => setVillage(e.target.value)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 outline-none w-full">
                  <option value="">All Villages</option>
                  {uniqueVillages.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bank</span>
                <select value={bankName} onChange={e => setBankName(e.target.value)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 outline-none w-full">
                  <option value="">All Banks</option>
                  {uniqueBanks.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Season</span>
                <select value={season} onChange={e => setSeason(e.target.value)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-xs font-bold text-slate-700 outline-none w-full">
                  <option value="">All Seasons</option>
                  {seasons.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between py-1 bg-white">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Hide Zero Bardan</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={hideZeroBardan} onChange={e => setHideZeroBardan(e.target.checked)} className="sr-only peer" />
                  <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1d5f84]"></div>
                </label>
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button onClick={clearFilters} className="flex-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-md transition cursor-pointer uppercase tracking-wider">Reset</button>
              <button onClick={() => { setShowFiltersDrawer(false); fetchReportData(); }} className="flex-1 px-3 py-2 bg-[#1d5f84] hover:bg-[#154662] text-white text-xs font-bold rounded-md transition cursor-pointer uppercase tracking-wider">View Report</button>
            </div>
          </div>
        </div>
      </div>

      {selectedEntry && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px]" onClick={() => setSelectedEntry(null)} />
          <div className="relative w-full max-w-3xl bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className={`text-xs font-bold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>
                  {isGu ? formatBilingualText(displayRowMemberName(selectedEntry)) : displayRowMemberName(selectedEntry)}
                </h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">Bardan weight register for bill #{selectedEntry.sr_no}</p>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition rounded-md cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto bg-white space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-wider"><Hash size={11} /> Code</div>
                  <p className="mt-1 text-xs font-mono font-bold text-[#1d5f84]">{selectedEntry.member_code || '-'}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-wider"><Calendar size={11} /> Date</div>
                  <p className="mt-1 text-xs font-mono font-bold text-slate-800">{fmtDate(selectedEntry.entry_date)}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-wider"><Package size={11} /> Jama</div>
                  <p className="mt-1 text-xs font-mono font-bold text-[#1d5f84]">{fmtNum(selectedEntry.jama_qty || selectedEntry.returned_bags, 0)} Bardan</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold uppercase tracking-wider"><Scale size={11} /> Weight</div>
                  <p className="mt-1 text-xs font-mono font-bold text-slate-800">{fmtNum(selectedEntry.total_kg, 2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                <div className="flex items-center gap-2 text-slate-600 font-bold"><User size={13} className="text-slate-400" /> {isGu ? formatBilingualText(displayItemName(selectedEntry)) : displayItemName(selectedEntry)}</div>
                <div className="flex items-center gap-2 text-slate-600 font-bold"><MapPin size={13} className="text-slate-400" /> {selectedEntry.village_name || '-'}</div>
                <div className="flex items-center gap-2 text-slate-600 font-bold"><Hash size={13} className="text-slate-400" /> Class {selectedEntry.quality_class || '-'}</div>
              </div>

              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 text-left border-r border-slate-200">Bardan No</th>
                      <th className="px-3 py-2 text-right">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {weightRows.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="px-3 py-8 text-center text-slate-400 font-bold uppercase tracking-wider">No weights recorded</td>
                      </tr>
                    ) : weightRows.map((weight, idx) => (
                      <tr key={weight.id || idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 border-r border-slate-100 font-bold text-slate-800 uppercase">Bardan {weight.sr_no || idx + 1}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-[#1d5f84]">{fmtNum(weight.weight, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
