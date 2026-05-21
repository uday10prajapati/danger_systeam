import React, { useState, useEffect } from 'react';
import {
  Database, Search, Filter, FileText, Plus,
  RefreshCcw, Box, X, Loader, Edit3, Calendar,
  MapPin, Shield, TrendingUp
} from 'lucide-react';
import api from '../api';
import { formatBilingualText } from '../utils/textUtils';
import { useTranslation } from 'react-i18next';
import Toast from '../components/Toast';
import Loading from '../components/Loading';
import { exportToPDF } from '../utils/pdfExporter';

const guDigits = {
  '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
  '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯'
};
const toGujaratiDigits = (num) => String(num || '').replace(/[0-9]/g, d => guDigits[d] || d);
const toEnglishDigits = (value) => String(value ?? '').replace(/[૦-૯]/g, d => '0123456789'['૦૧૨૩૪૫૬૭૮૯'.indexOf(d)] || d);
const fmtVal = (v) => (v === null || v === undefined || v === '') ? '—' : String(v);

export default function DangarMaster() {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';

  // Proper date formatter
  const formatDisplayDate = (value) => {
    if (!value) return '--';
    const dateStr = String(value).split(/[T ]/)[0]; // e.g. "2026-05-16"
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const formatted = `${day}/${month}/${year}`;
      if (isGu) {
        return formatted.replace(/[0-9]/g, d => guDigits[d] || d);
      }
      return formatted;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formatted = `${day}/${month}/${year}`;
    if (isGu) {
      return formatted.replace(/[0-9]/g, d => guDigits[d] || d);
    }
    return formatted;
  };

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [company, setCompany] = useState(null);
  const [message, setMessage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [season, setSeason] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');

  // Drawer
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  useEffect(() => { loadInitialData(); }, []);

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
      const params = { companyId: compId };
      if (dateRange.start && dateRange.end) {
        params.startDate = dateRange.start;
        params.endDate = dateRange.end;
      }
      if (season) params.season = season;
      const res = await api.get('/dangar-entry', { params });
      if (res.data.success) setEntries(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = () => {
    if (company?.id) fetchEntries(company.id);
    setShowFiltersDrawer(false);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setDateRange({ start: '', end: '' });
    setSeason('');
    setSelectedVillage('all');
    setSelectedClass('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = dateRange.start || dateRange.end || season || selectedVillage !== 'all' || selectedClass !== 'all';

  const handleExportPDF = async () => {
    const rows = filteredEntries;
    if (!rows.length) {
      setMessage({ type: 'error', text: t('dangarMaster.noRecords') });
      return;
    }

    const columns = [
      {
        header: isGu ? 'ક્રમ' : '#',
        align: 'center',
        width: '6%',
        render: (row, idx) => isGu ? toGujaratiDigits(idx + 1) : (idx + 1)
      },
      {
        header: isGu ? 'તારીખ' : 'Date',
        align: 'center',
        width: '12%',
        render: (row) => formatDisplayDate(row.entry_date)
      },
      {
        header: isGu ? 'સભ્ય' : 'Member',
        align: 'left',
        width: '24%',
        render: (row) => {
          const displayMemberName = isGu
            ? (row.member_name_gu || row.member_name || '')
            : (row.eng_name || row.member_name || '');
          const displayMemberCode = isGu
            ? toGujaratiDigits(row.member_code)
            : String(row.member_code || '');
          return `${displayMemberName} (${displayMemberCode})`;
        },
        usePromptFont: true
      },
      {
        header: isGu ? 'ગામ' : 'Village',
        align: 'left',
        width: '14%',
        render: (row) => isGu
          ? (row.village_name_gu || row.village_name || '—')
          : (row.village_eng_name || row.village_name || '—'),
        usePromptFont: true
      },
      {
        header: isGu ? 'વસ્તુ' : 'Item',
        align: 'left',
        width: '12%',
        render: (row) => isGu ? (row.item_name_gu || row.item_name || '') : (row.item_name || ''),
        usePromptFont: true
      },
      {
        header: isGu ? 'વર્ગ' : 'Class',
        align: 'center',
        width: '6%',
        render: (row) => isGu
          ? toGujaratiDigits(row.quality_class?.match(/\d+/)?.[0] || row.quality_class || '1')
          : (row.quality_class?.match(/\d+/)?.[0] || row.quality_class || '1')
      },
      {
        header: isGu ? 'નેટ ક્વિ.' : 'Net Qtl.',
        align: 'right',
        width: '8%',
        render: (row) => {
          const qtlVal = parseFloat(row.net_quintal) || 0;
          return isGu
            ? `${toGujaratiDigits(qtlVal.toFixed(2))} ${isGu ? 'ક્વિ.' : 'qtl'}`
            : `${qtlVal.toFixed(2)} qtl`;
        }
      },
      {
        header: isGu ? 'ભાવ' : 'Rate',
        align: 'right',
        width: '8%',
        render: (row) => {
          const rateVal = parseFloat(row.rate) || 0;
          return `₹${isGu ? toGujaratiDigits(rateVal.toFixed(2)) : rateVal.toFixed(2)}`;
        }
      },
      {
        header: isGu ? 'રકમ' : 'Amount',
        align: 'right',
        width: '10%',
        render: (row) => {
          const amtVal = parseFloat(row.amount) || 0;
          const formatted = amtVal.toLocaleString('en-IN', { minimumFractionDigits: 2 });
          return `₹${isGu ? toGujaratiDigits(formatted) : formatted}`;
        }
      }
    ];

    const displayTotalQtl = isGu ? toGujaratiDigits(totalQtl.toFixed(2)) : totalQtl.toFixed(2);
    const displayTotalAmt = isGu ? toGujaratiDigits(totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })) : totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const metaInfo = [
      {
        label: isGu ? 'કુલ એન્ટ્રીઝ' : 'Total Entries',
        value: isGu ? toGujaratiDigits(rows.length) : rows.length
      },
      {
        label: isGu ? 'કુલ ક્વિન્ટલ' : 'Total Net Qtl.',
        value: `${displayTotalQtl} ${isGu ? 'ક્વિ.' : 'qtl'}`
      },
      {
        label: isGu ? 'કુલ રકમ' : 'Total Amount',
        value: `₹${displayTotalAmt}`
      },
      {
        label: isGu ? 'ગામ ફિલ્ટર' : 'Village Filter',
        value: selectedVillage === 'all' ? (isGu ? 'બધા' : 'All') : selectedVillage
      }
    ];

    await exportToPDF({
      title: isGu ? 'ડાંગર રજીસ્ટ્રી' : 'Dangar Registry',
      columns,
      rows,
      isGu,
      metaInfo,
      filename: `Dangar_Registry_${new Date().toISOString().split('T')[0]}.pdf`,
      onStart: () => setLoading(true),
      onComplete: () => setLoading(false)
    });
  };

  const filteredEntries = entries.filter(e => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      e.member_name?.toLowerCase().includes(q) ||
      e.eng_name?.toLowerCase().includes(q) ||
      e.member_name_gu?.toLowerCase().includes(q) ||
      e.member_code?.toString().includes(q) ||
      toEnglishDigits(e.sr_no).toLowerCase().includes(q) ||
      e.vehicle_no?.toLowerCase().includes(q) ||
      e.item_name?.toLowerCase().includes(q) ||
      e.item_name_gu?.toLowerCase().includes(q) ||
      e.village_name?.toLowerCase().includes(q) ||
      e.village_eng_name?.toLowerCase().includes(q);
    const matchesVillage = selectedVillage === 'all' ||
      (isGu ? e.village_name === selectedVillage : (e.village_eng_name || e.village_name) === selectedVillage);
    const matchesClass = selectedClass === 'all' || e.quality_class === selectedClass;
    return matchesSearch && matchesVillage && matchesClass;
  });

  const villages = [...new Set(entries.map(e => {
    return isGu ? e.village_name : (e.village_eng_name || e.village_name);
  }).filter(Boolean))].sort();
  const classes = [...new Set(entries.map(e => e.quality_class).filter(Boolean))].sort();

  const totalQtl = filteredEntries.reduce((a, c) => a + parseFloat(c.net_quintal || 0), 0);
  const totalAmt = filteredEntries.reduce((a, c) => a + parseFloat(c.amount || 0), 0);

  const ITEMS_PER_PAGE = 12;
  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (loading && !company) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 select-none pb-12">

      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isGu ? 'કુલ એન્ટ્રીઝ' : 'Total Entries'}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{isGu ? toGujaratiDigits(entries.length) : fmtVal(entries.length)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{isGu ? 'ફિલ્ટર કરેલ' : 'Filtered'}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{isGu ? toGujaratiDigits(filteredEntries.length) : fmtVal(filteredEntries.length)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('dangarMaster.stats.totalNetVolume') || 'Net Quintal'}</span>
            <span className="text-[13px] font-bold font-mono text-slate-800 mt-1">
              {isGu ? toGujaratiDigits(totalQtl.toFixed(2)) : totalQtl.toFixed(2)} <span className="text-[10px] text-slate-400">{t('dangarMaster.table.unit')}</span>
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('dangarMaster.stats.totalAmount') || 'Total Amount'}</span>
            <span className="text-[13px] font-bold font-mono text-emerald-600 mt-1">
              ₹{isGu ? toGujaratiDigits(totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })) : totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Registry Table Wrapper */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none">

          {/* Table Control Header Bar */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-extrabold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>
                {t('dangarMaster.title') || 'Dangar Registry'}
              </span>
              <span className="bg-slate-200 text-slate-600 font-bold force-en text-[9px] px-1.5 py-0.5 rounded-sm">
                {isGu ? toGujaratiDigits(filteredEntries.length) : filteredEntries.length} {t('dangarMaster.records') || 'Records'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative flex items-center border border-slate-200 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] rounded-md bg-white px-2.5 py-1 transition-colors w-48 sm:w-64">
                <Search size={12} className="text-slate-400 mr-1.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder={t('dangarMaster.searchPlaceholder') || 'Search member, SR, village...'}
                  className="bg-transparent border-none outline-none text-xs text-slate-700 placeholder:text-slate-300 w-full font-semibold"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-0.5 text-slate-300 hover:text-slate-600 transition">
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* Add New */}
              <button
                onClick={() => window.location.hash = '#/dangar-entry'}
                className="h-7 flex items-center gap-1.5 px-2.5 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[11px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider"
              >
                <Plus size={13} />
                <span>{t('dangarMaster.addNew') || 'Add New'}</span>
              </button>

              {/* Filters Button */}
              <button
                onClick={() => setShowFiltersDrawer(true)}
                className={`h-7 flex items-center gap-1.5 px-2.5 border text-[11px] font-bold rounded-md transition cursor-pointer relative shadow-none ${hasActiveFilters
                  ? 'bg-blue-50 border-[#1d5f84] text-[#1d5f84]'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
              >
                <Filter size={13} className={hasActiveFilters ? 'text-[#1d5f84]' : 'text-slate-500'} />
                <span className="uppercase tracking-wider">{isGu ? 'ફિલ્ટર' : 'Filters'}</span>
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
                  </span>
                )}
              </button>

              {/* PDF */}
              <button
                onClick={handleExportPDF}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none"
                title={isGu ? 'પીડીએફ' : 'PDF Report'}
              >
                <FileText size={13} className="text-slate-500" />
              </button>

              {/* Refresh */}
              <button
                onClick={() => fetchEntries(company?.id)}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none"
                title={t('dangarMaster.refreshRegistry') || 'Refresh'}
              >
                <RefreshCcw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Active Filters Indicator Row */}
          {hasActiveFilters && (
            <div className="px-3.5 py-2 border-b border-slate-100 flex items-center gap-2 flex-wrap bg-blue-50/50">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{isGu ? 'સક્રિય ફિલ્ટર:' : 'Active:'}</span>
              {season && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 text-[9px] font-bold text-slate-600 px-2 py-0.5 rounded-md">
                  <Calendar size={8} /> {t(`dangarMaster.filters.${season}`) || season}
                  <button onClick={() => { setSeason(''); fetchEntries(company?.id); }} className="text-slate-400 hover:text-red-500 ml-0.5 cursor-pointer"><X size={8} /></button>
                </span>
              )}
              {selectedVillage !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 text-[9px] font-bold text-slate-600 px-2 py-0.5 rounded-md">
                  <MapPin size={8} /> {selectedVillage}
                  <button onClick={() => setSelectedVillage('all')} className="text-slate-400 hover:text-red-500 ml-0.5 cursor-pointer"><X size={8} /></button>
                </span>
              )}
              {selectedClass !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 text-[9px] font-bold text-slate-600 px-2 py-0.5 rounded-md">
                  <Shield size={8} /> {selectedClass}
                  <button onClick={() => setSelectedClass('all')} className="text-slate-400 hover:text-red-500 ml-0.5 cursor-pointer"><X size={8} /></button>
                </span>
              )}
              {(dateRange.start || dateRange.end) && (
                <span className="inline-flex items-center gap-1 bg-white border border-slate-200 text-[9px] font-bold text-slate-600 px-2 py-0.5 rounded-md">
                  <Calendar size={8} /> {formatDisplayDate(dateRange.start)} – {formatDisplayDate(dateRange.end)}
                  <button onClick={() => { setDateRange({ start: '', end: '' }); fetchEntries(company?.id); }} className="text-slate-400 hover:text-red-500 ml-0.5 cursor-pointer"><X size={8} /></button>
                </span>
              )}
              <button onClick={clearFilters} className="text-[9px] font-bold text-rose-500 hover:text-rose-700 uppercase tracking-wider cursor-pointer ml-auto">{isGu ? 'બધા ક્લિયર' : 'Clear All'}</button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto w-full" id="dangar-registry-table">
            {loading && entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2">
                <Loader className="animate-spin text-slate-400" size={24} />
                <p className="text-xs font-bold text-slate-400">{t('dangarMaster.loadingData')}</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-center p-4">
                <Box size={32} className="text-slate-300 opacity-30" />
                <p className="text-xs font-bold text-slate-400">{t('dangarMaster.noRecords')}</p>
                <button
                  onClick={() => window.location.hash = '#/dangar-entry'}
                  className="text-xs font-bold text-[#1d5f84] hover:text-[#154662] transition uppercase tracking-wider cursor-pointer"
                >
                  + {t('dangarMaster.addNew') || 'Add Entry'}
                </button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 border-collapse text-[11px]">
                <thead className="bg-slate-50 font-sans">
                  <tr>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-10">#</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('dangarMaster.table.date') || 'Date'}</th>
                    <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('dangarMaster.table.member') || 'Member'}</th>
                    <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('dangarMaster.table.village') || 'Village'}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('dangarMaster.table.refSr') || 'SR'}</th>
                    <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('dangarMaster.table.item') || 'Item'}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('dangarMaster.table.class') || 'Class'}</th>
                    <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('dangarMaster.table.netVolume') || 'Net Qtl.'}</th>
                    <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('dangarMaster.table.rate') || 'Rate'}</th>
                    <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('dangarMaster.table.amount') || 'Amount'}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 w-20">{isGu ? 'ક્રિયાઓ' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {paginatedEntries.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-3.5 py-2 text-center font-mono text-slate-500 border-r border-slate-100">{isGu ? toGujaratiDigits(startIndex + idx + 1) : (startIndex + idx + 1)}</td>
                      <td
                        className={`px-3.5 py-2 text-center text-slate-600 border-r border-slate-100 font-bold ${isGu ? '' : 'font-mono'}`}
                        style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif", fontSize: '13px' } : {}}
                      >
                        {formatDisplayDate(row.entry_date)}
                      </td>
                      <td className="px-3.5 py-2 border-r border-slate-100 leading-tight font-bold text-slate-800" style={{ fontFamily: "'Noto Sans Gujarati','NotoGujarati','Prompt',sans-serif" }}>
                        <div className="flex flex-col gap-0.5">
                          <span translate="no">
                            {isGu
                              ? formatBilingualText(row.member_name_gu || row.member_name || '—')
                              : (row.eng_name || row.member_name || '—')}
                          </span>
                          {row.member_code && <span className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase font-sans">
                            {t('memberMaster.code') || 'CODE'}: <span className={isGu ? 'font-prompt-sm' : 'force-en notranslate'} translate="no">{isGu ? toGujaratiDigits(row.member_code) : row.member_code}</span>
                          </span>}
                        </div>
                      </td>
                      <td
                        className={`px-3.5 py-2 text-slate-600 border-r border-slate-100 font-medium ${isGu ? '' : 'uppercase font-sans'}`}
                        style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}
                      >
                        {isGu ? (row.village_name_gu || row.village_name || '—') : (row.village_eng_name || row.village_name || row.village_name_gu || '—')}
                      </td>
                      <td className="px-3.5 py-2 text-center border-r border-slate-100">
                        <span className="font-mono font-bold text-[#1d5f84] text-[9px]">#{isGu ? toGujaratiDigits(toEnglishDigits(row.sr_no)) : toEnglishDigits(row.sr_no)}</span>
                      </td>
                      <td
                        className={`px-3.5 py-2 border-r border-slate-100 font-bold text-slate-700 ${isGu ? '' : 'uppercase font-sans'}`}
                        style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif" } : {}}
                      >
                        {isGu ? (row.item_name_gu || row.item_name) : (row.item_name || '—')}
                      </td>
                      <td className="px-3.5 py-2 text-center border-r border-slate-100">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border bg-slate-50 border-slate-200 text-slate-600 font-mono">
                          {isGu ? toGujaratiDigits(row.quality_class?.match(/\d+/)?.[0] || row.quality_class || '1') : (row.quality_class?.match(/\d+/)?.[0] || row.quality_class || '1')}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-800 border-r border-slate-100">
                        {isGu ? toGujaratiDigits(parseFloat(row.net_quintal).toFixed(2)) : parseFloat(row.net_quintal).toFixed(2)}
                        <span className="text-[9px] text-slate-400 ml-0.5">{isGu ? 'ક્વિ.' : 'qtl'}</span>
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-700 border-r border-slate-100">
                        ₹{isGu ? toGujaratiDigits(parseFloat(row.rate).toFixed(2)) : parseFloat(row.rate).toFixed(2)}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono font-bold text-emerald-600 border-r border-slate-100">
                        ₹{isGu ? toGujaratiDigits(parseFloat(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })) : parseFloat(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        <button
                          onClick={() => window.location.hash = `#/dangar-entry/${row.id}`}
                          className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                          title={isGu ? 'ફેરફાર' : 'Edit'}
                        >
                          <Edit3 size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Summary Footer */}
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={7} className="px-3.5 py-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200">
                      {isGu ? `કુલ (${toGujaratiDigits(filteredEntries.length)} નોંધો)` : `Total (${filteredEntries.length} records)`}
                    </td>
                    <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                      {isGu ? toGujaratiDigits(totalQtl.toFixed(2)) : totalQtl.toFixed(2)}
                    </td>
                    <td className="px-3.5 py-2 border-r border-slate-200"></td>
                    <td className="px-3.5 py-2 text-right font-mono font-bold text-emerald-700">
                      ₹{isGu ? toGujaratiDigits(totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })) : totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Pagination */}
          {filteredEntries.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                {isGu
                  ? `${toGujaratiDigits(startIndex + 1)}-${toGujaratiDigits(Math.min(startIndex + ITEMS_PER_PAGE, filteredEntries.length))} / ${toGujaratiDigits(filteredEntries.length)}`
                  : `${startIndex + 1}-${Math.min(startIndex + ITEMS_PER_PAGE, filteredEntries.length)} / ${filteredEntries.length}`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 transition text-[10px] font-extrabold text-slate-600 disabled:cursor-not-allowed cursor-pointer"
                >
                  Prev
                </button>
                <span className="text-xs font-bold text-slate-600 px-1.5">
                  {isGu
                    ? `${toGujaratiDigits(currentPage)} / ${toGujaratiDigits(totalPages)}`
                    : `${currentPage} / ${totalPages}`}
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

      {/* Slide-Out Filters Drawer */}
      <div className={`fixed inset-0 z-[100] overflow-hidden ${showFiltersDrawer ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px] transition-opacity duration-300 ${showFiltersDrawer ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setShowFiltersDrawer(false)}
        />
        {/* Drawer Panel */}
        <div className={`fixed inset-y-0 right-0 max-w-full flex pl-10 transform transition-transform duration-300 ease-in-out ${showFiltersDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="w-screen max-w-sm bg-white border-l border-slate-200 flex flex-col shadow-none">

            {/* Drawer Title Bar */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-[#1d5f84]" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  {isGu ? 'ફિલ્ટર પેરામીટર' : 'Filter Parameters'}
                </span>
              </div>
              <button
                onClick={() => setShowFiltersDrawer(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">

              {/* Date Range */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Calendar size={12} className="text-[#1d5f84]" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {t('dangarMaster.filters.dateFilter') || 'Date Range'}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">{isGu ? 'શરૂ' : 'From'}</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none text-xs font-bold text-slate-700 cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">{isGu ? 'અંત' : 'To'}</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none text-xs font-bold text-slate-700 cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={applyDateFilter}
                    className="w-full px-3 py-1.5 bg-[#1d5f84] hover:bg-[#154662] text-white text-[10px] font-bold rounded-md transition cursor-pointer uppercase tracking-wider"
                  >
                    {t('dangarMaster.filters.verifyRegistry') || 'Apply Date Filter'}
                  </button>
                </div>
              </div>

              {/* Season */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{isGu ? 'સીઝન' : 'Season'}</span>
                <select
                  value={season}
                  onChange={e => {
                    const s = e.target.value;
                    setSeason(s);
                    const params = { companyId: company?.id };
                    if (dateRange.start && dateRange.end) { params.startDate = dateRange.start; params.endDate = dateRange.end; }
                    if (s) params.season = s;
                    api.get('/dangar-entry', { params }).then(res => { if (res.data.success) setEntries(res.data.data); });
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="">{t('dangarMaster.filters.allSeasons') || 'All Seasons'}</option>
                  <option value="winter">{t('dangarMaster.filters.winter') || 'Winter'}</option>
                  <option value="summer">{t('dangarMaster.filters.summer') || 'Summer'}</option>
                </select>
              </div>

              {/* Village */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-[#1d5f84]" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('dangarMaster.filters.allVillages') || 'Village'}</span>
                </div>
                <select
                  value={selectedVillage}
                  onChange={e => { setSelectedVillage(e.target.value); setCurrentPage(1); }}
                  className={`w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none text-xs font-bold text-slate-700 cursor-pointer ${isGu ? 'font-prompt' : ''}`}
                >
                  <option value="all">{t('dangarMaster.filters.allVillages') || 'All Villages'}</option>
                  {villages.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              {/* Quality Class */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Shield size={12} className="text-[#1d5f84]" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('dangarMaster.filters.allClasses') || 'Quality Class'}</span>
                </div>
                <select
                  value={selectedClass}
                  onChange={e => { setSelectedClass(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="all">{t('dangarMaster.filters.allClasses') || 'All Classes'}</option>
                  {classes.map(c => (
                    <option key={c} value={c}>
                      {c === '1st' ? t('dangarMaster.filters.first') : c === '2nd' ? t('dangarMaster.filters.second') : c === '3rd' ? t('dangarMaster.filters.third') : c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => { clearFilters(); setShowFiltersDrawer(false); }}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-md transition cursor-pointer uppercase tracking-wider text-center"
              >
                {isGu ? 'ક્લિયર' : 'Reset All'}
              </button>
              <button
                onClick={() => setShowFiltersDrawer(false)}
                className="flex-1 px-3 py-2 bg-[#1d5f84] hover:bg-[#154662] text-white text-xs font-bold rounded-md transition cursor-pointer uppercase tracking-wider text-center"
              >
                {isGu ? 'ઠીક છે' : 'Apply Filters'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
