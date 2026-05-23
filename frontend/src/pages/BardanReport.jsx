import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, RefreshCcw, Filter, Package, X,
  Eye, Scale, Hash, Calendar, User, MapPin, FileText, Printer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import Loading from '../components/Loading';
import Toast from '../components/Toast';
import { formatBilingualText } from '../utils/textUtils';
import { exportToPDF } from '../utils/pdfExporter';

const GU_DIGITS = {
  '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
  '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯'
};

const toGujaratiDigits = (value) =>
  String(value ?? '').replace(/[0-9]/g, (d) => GU_DIGITS[d] || d);

const fmtDate = (value, isGu = false) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const formatted = d.toLocaleDateString('en-GB');
  return isGu ? toGujaratiDigits(formatted) : formatted;
};

const fmtNum = (value, digits = 2, isGu = false) => {
  const n = parseFloat(value || 0);
  const formatted = n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return isGu ? toGujaratiDigits(formatted) : formatted;
};

export default function BardanReport() {
  const { i18n } = useTranslation();
  const isGu = i18n.language === 'gu';

  const labels = isGu ? {
    title: 'બારદાન રીપોર્ટ',
    totalEntries: 'કુલ એન્ટ્રીઓ',
    jamaBardan: 'જમા બારદાન',
    totalWeight: 'કુલ વજન',
    netQuintal: 'નેટ ક્વિન્ટલ',
    records: 'રેકોર્ડ્સ',
    filters: 'ફિલ્ટર્સ',
    clear: 'ક્લિયર',
    sync: 'સિંક',
    bill: 'બિલ',
    member: 'સભાસદ',
    item: 'આઈટમ',
    date: 'તારીખ',
    class: 'વર્ગ',
    bardan: 'બારદાન',
    weight: 'વજન',
    view: 'જુઓ',
    noRecords: 'કોઈ બારદાન રિપોર્ટ રેકોર્ડ મળ્યા નથી',
    loading: 'બારદાન રિપોર્ટ લોડ થઈ રહ્યો છે...',
    filterTitle: 'બારદાન ફિલ્ટર્સ',
    startDate: 'શરૂઆતની તારીખ',
    endDate: 'અંતિમ તારીખ',
    memberCode: 'કોડ',
    memberSearchPlaceholder: 'સભાસદ શોધો...',
    allMembers: 'બધા સભાસદો',
    fromCode: 'કોડથી',
    toCode: 'કોડ સુધી',
    classOfDangar: 'ડાંગરનો વર્ગ',
    allClasses: 'બધા વર્ગ',
    village: 'ગામ',
    allVillages: 'બધા ગામ',
    bank: 'બેંક',
    allBanks: 'બધી બેંક',
    season: 'સીઝન',
    allSeasons: 'બધી સીઝન',
    hideZeroBardan: 'શૂન્ય બારદાન છુપાવો',
    reset: 'રીસેટ',
    viewReport: 'રિપોર્ટ જુઓ',
    bardanWeightRegister: 'બારદાન વજન રજીસ્ટર',
    weightsNotRecorded: 'કોઈ વજન રેકોર્ડ કરેલ નથી',
    bardanNo: 'બારદાન નં',
    period: 'સમયગાળો',
    dateLabel: 'તારીખ',
    fyLabel: 'વર્ષ',
    totals: 'કુલ:',
    print: 'પ્રિન્ટ',
    downloadPdf: 'પીડીએફ ડાઉનલોડ'
  } : {
    title: 'Bardan Report',
    totalEntries: 'Total Entries',
    jamaBardan: 'Jama Bardan',
    totalWeight: 'Total Weight',
    netQuintal: 'Net Quintal',
    records: 'Records',
    filters: 'Filters',
    clear: 'Clear',
    sync: 'Sync',
    bill: 'Bill',
    member: 'Member',
    item: 'Item',
    date: 'Date',
    class: 'Class',
    bardan: 'Bardan',
    weight: 'Weight',
    view: 'View',
    noRecords: 'No Bardan report records found',
    loading: 'Loading Bardan report...',
    filterTitle: 'Bardan Filters',
    startDate: 'Start Date',
    endDate: 'End Date',
    memberCode: 'Code',
    memberSearchPlaceholder: 'Search member...',
    allMembers: 'All Members',
    fromCode: 'From Code',
    toCode: 'To Code',
    classOfDangar: 'Class of Dangar',
    allClasses: 'All Classes',
    village: 'Village',
    allVillages: 'All Villages',
    bank: 'Bank',
    allBanks: 'All Banks',
    season: 'Season',
    allSeasons: 'All Seasons',
    hideZeroBardan: 'Hide Zero Bardan',
    reset: 'Reset',
    viewReport: 'View Report',
    bardanWeightRegister: 'Bardan weight register',
    weightsNotRecorded: 'No weights recorded',
    bardanNo: 'Bardan No',
    period: 'Period',
    dateLabel: 'Date',
    fyLabel: 'FY',
    totals: 'TOTALS:',
    print: 'Print',
    downloadPdf: 'Download PDF'
  };

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

  const handleExportPDF = async () => {
    if (visibleRows.length === 0) {
      setToast({ type: 'error', text: 'No data to export.' });
      return;
    }
    const periodStr = `${dateRange.startDate} — ${dateRange.endDate}`;
    const totalBardan = visibleRows.reduce((s, r) => s + parseFloat(r.returned_bags || 0), 0);
    const totalWeight = visibleRows.reduce((s, r) => s + parseFloat(r.total_kg || 0), 0);
    const totalQty = visibleRows.reduce((s, r) => s + parseFloat(r.net_quintal || 0), 0);

    const allRows = [
      ...visibleRows,
      { _isTotals: true, returned_bags: totalBardan, total_kg: totalWeight, net_quintal: totalQty }
    ];

    await exportToPDF({
      title: labels.title,
      columns: [
        {
          header: labels.bill, align: 'center', width: '7%',
          render: (row) => row._isTotals ? '' : `<strong>#${isGu ? toGujaratiDigits(row.sr_no) : (row.sr_no || '-')}</strong>`
        },
        {
          header: labels.member, align: 'left', width: '27%', usePromptFont: true,
          render: (row) => {
            if (row._isTotals) return `<strong style="float:right">${labels.totals}</strong>`;
            const name = isGu ? (row.member_name_gu || row.member_name || row.eng_name || '-') : (row.eng_name || row.member_name || '-');
            const codeFormatted = row.member_code ? (isGu ? `કોડ: ${toGujaratiDigits(row.member_code)}` : `CODE: ${row.member_code}`) : '';
            return `<strong>${name}</strong><br/><small style="color:#64748b">${codeFormatted}</small>`;
          }
        },
        {
          header: labels.item, align: 'left', width: '18%', usePromptFont: true,
          render: (row) => {
            if (row._isTotals) return '';
            return isGu ? (row.item_name_gu || row.item_name || '-') : (row.item_name || '-');
          }
        },
        {
          header: labels.date, align: 'center', width: '10%',
          render: (row) => row._isTotals ? '' : fmtDate(row.entry_date, isGu)
        },
        {
          header: labels.class, align: 'center', width: '7%',
          render: (row) => row._isTotals ? '' : (row.quality_class || '-')
        },
        {
          header: labels.bardan, align: 'right', width: '10%',
          render: (row) => `<strong>${fmtNum(row.returned_bags, 0, isGu)}</strong>`
        },
        {
          header: labels.weight, align: 'right', width: '11%',
          render: (row) => `<strong>${fmtNum(row.total_kg, 2, isGu)}</strong>`
        },
        {
          header: labels.netQuintal, align: 'right', width: '10%',
          render: (row) => `<strong>${fmtNum(row.net_quintal, 2, isGu)}</strong>`
        }
      ],
      rows: allRows,
      isGu,
      metaInfo: [{ label: labels.period, value: isGu ? toGujaratiDigits(periodStr) : periodStr }],
      filename: `${isGu ? 'બારદાન_રીપોર્ટ' : 'Bardan_Report'}_${dateRange.startDate}_${dateRange.endDate}.pdf`
    });
  };

  const handlePrint = () => {
    if (visibleRows.length === 0) {
      setToast({ type: 'error', text: 'No data to print.' });
      return;
    }
    const cName = isGu ? (company?.company_name_gu || company?.company_name || 'કંપની') : (company?.company_name || 'Company');
    const fy = localStorage.getItem('financialYear') || '2026-27';
    const formattedFy = isGu ? toGujaratiDigits(fy) : fy;
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const formattedDate = isGu ? toGujaratiDigits(dateStr) : dateStr;
    const periodStr = `${dateRange.startDate} — ${dateRange.endDate}`;
    const formattedPeriod = isGu ? toGujaratiDigits(periodStr) : periodStr;

    const totalBardan = visibleRows.reduce((s, r) => s + parseFloat(r.returned_bags || 0), 0);
    const totalWeight = visibleRows.reduce((s, r) => s + parseFloat(r.total_kg || 0), 0);
    const totalQty = visibleRows.reduce((s, r) => s + parseFloat(r.net_quintal || 0), 0);

    const rowsHtml = visibleRows.map((row) => {
      const name = isGu ? (row.member_name_gu || row.member_name || row.eng_name || '-') : (row.eng_name || row.member_name || '-');
      const item = isGu ? (row.item_name_gu || row.item_name || '-') : (row.item_name || '-');
      const billNo = isGu ? toGujaratiDigits(row.sr_no) : row.sr_no;
      const memCodeFormatted = row.member_code ? (isGu ? `કોડ: ${toGujaratiDigits(row.member_code)}` : `CODE: ${row.member_code}`) : '';
      return `<tr>
        <td style="border:1.5px solid #000;padding:5px 12px;text-align:center;font-size:10px"><strong>#${billNo}</strong></td>
        <td style="border:1.5px solid #000;padding:5px 12px;font-size:10px"><strong>${name}</strong><br/><small style="color:#64748b">${memCodeFormatted}</small></td>
        <td style="border:1.5px solid #000;padding:5px 12px;font-size:10px">${item}</td>
        <td style="border:1.5px solid #000;padding:5px 12px;text-align:center;font-size:10px">${fmtDate(row.entry_date, isGu)}</td>
        <td style="border:1.5px solid #000;padding:5px 12px;text-align:center;font-size:10px">${row.quality_class || '-'}</td>
        <td style="border:1.5px solid #000;padding:5px 12px;text-align:right;font-size:10px"><strong>${fmtNum(row.returned_bags, 0, isGu)}</strong></td>
        <td style="border:1.5px solid #000;padding:5px 12px;text-align:right;font-size:10px"><strong>${fmtNum(row.total_kg, 2, isGu)}</strong></td>
        <td style="border:1.5px solid #000;padding:5px 12px;text-align:right;font-size:10px"><strong>${fmtNum(row.net_quintal, 2, isGu)}</strong></td>
      </tr>`;
    }).join('');

    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.write(`<html><head>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&family=Outfit:wght@400;600;700&display=swap');
        @font-face {
          font-family: 'Prompt';
          src: url('/fonts/Prompt.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        @page{size:A4 landscape;margin:10mm}
        body{margin:0;padding:16px;font-family:${isGu ? `'Prompt', 'Noto Sans Gujarati', sans-serif` : 'Arial,sans-serif'}}
      </style>
    </head><body>
      <div style="border:1.5px solid #000;overflow:hidden;">
        <div style="border-bottom:1.5px solid #000;padding:12px;text-align:center;font-size:112px;font-weight:bold">${cName}</div>
        <div style="border-bottom:1.5px solid #000;padding:12px;text-align:center;font-size:14px;font-weight:bold">${labels.title}</div>
        <div style="border-bottom:1.5px solid #000;padding:12px 12px;display:flex;justify-content:space-between;font-size:12px;font-weight:bold">
          <span>${labels.period}: ${formattedPeriod}</span>
          <span style="display:flex;gap:16px"><span>${labels.dateLabel}: ${formattedDate}</span><span>|</span><span>${labels.fyLabel}: ${formattedFy}</span></span>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="border:1.5px solid #000;padding:6px 12px;font-size:10px;background:#fff">${labels.bill} #</th>
            <th style="border:1.5px solid #000;padding:6px 12px;font-size:10px;background:#fff">${labels.member}</th>
            <th style="border:1.5px solid #000;padding:6px 12px;font-size:10px;background:#fff">${labels.item}</th>
            <th style="border:1.5px solid #000;padding:6px 12px;font-size:10px;background:#fff;text-align:center">${labels.date}</th>
            <th style="border:1.5px solid #000;padding:6px 12px;font-size:10px;background:#fff;text-align:center">${labels.class}</th>
            <th style="border:1.5px solid #000;padding:6px 12px;font-size:10px;background:#fff;text-align:right">${labels.bardan}</th>
            <th style="border:1.5px solid #000;padding:6px 12px;font-size:10px;background:#fff;text-align:right">${labels.weight} (kg)</th>
            <th style="border:1.5px solid #000;padding:6px 12px;font-size:10px;background:#fff;text-align:right">${labels.netQuintal}</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot><tr>
            <td colspan="5" style="border:1.5px solid #000;padding:6px 12px;font-size:12px;font-weight:bold;text-align:right">${labels.totals}</td>
            <td style="border:1.5px solid #000;padding:6px 12px;font-size:12px;font-weight:bold;text-align:right">${fmtNum(totalBardan, 0, isGu)}</td>
            <td style="border:1.5px solid #000;padding:6px 12px;font-size:12px;font-weight:bold;text-align:right">${fmtNum(totalWeight, 2, isGu)}</td>
            <td style="border:1.5px solid #000;padding:6px 12px;font-size:12px;font-weight:bold;text-align:right">${fmtNum(totalQty, 2, isGu)}</td>
          </tr></tfoot>
        </table>
      </div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
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
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{labels.totalEntries}</span>
            <span className="text-[13px] font-bold text-slate-800 mt-1">{isGu ? toGujaratiDigits(visibleRows.length) : visibleRows.length}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{labels.jamaBardan}</span>
            <span className="text-[13px] font-bold text-[#1d5f84] mt-1">{fmtNum(visibleRows.reduce((s, r) => s + parseFloat(r.returned_bags || 0), 0), 0, isGu)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{labels.totalWeight}</span>
            <span className="text-[13px] font-bold text-slate-800 mt-1">{fmtNum(visibleRows.reduce((s, r) => s + parseFloat(r.total_kg || 0), 0), 2, isGu)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{labels.netQuintal}</span>
            <span className="text-[13px] font-bold text-emerald-700 mt-1">{fmtNum(visibleRows.reduce((s, r) => s + parseFloat(r.net_quintal || 0), 0), 2, isGu)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none">
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-extrabold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>
                {labels.title}
              </span>
              <span className="bg-slate-200 text-slate-600 font-bold force-en text-[12px] px-1.5 py-0.5 rounded-sm">
                {isGu ? `${toGujaratiDigits(visibleRows.length)} ${labels.records}` : `${visibleRows.length} Records`}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowFiltersDrawer(true)}
                className="h-7 flex items-center gap-1.5 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[12px] font-bold rounded-md transition cursor-pointer uppercase tracking-wider"
              >
                <Filter size={13} />
                {labels.filters}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="h-7 flex items-center gap-1.5 px-2.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 text-[12px] font-bold rounded-md transition cursor-pointer uppercase tracking-wider"
                >
                  <X size={13} />
                  {labels.clear}
                </button>
              )}
              <button
                onClick={handlePrint}
                className="h-7 flex items-center gap-1.5 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[12px] font-bold rounded-md transition cursor-pointer uppercase tracking-wider shadow-sm"
              >
                <Printer size={13} className="text-slate-500" />
                {labels.print}
              </button>
              <button
                onClick={handleExportPDF}
                title={labels.downloadPdf}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <FileText size={13} className="text-slate-500" />
              </button>
              <button
                onClick={fetchReportData}
                className="h-7 flex items-center gap-1.5 px-2.5 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[12px] font-bold rounded-md transition cursor-pointer uppercase tracking-wider"
              >
                <RefreshCcw size={13} className={syncing ? 'animate-spin' : ''} />
                {labels.sync}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-slate-200 border-collapse text-[12px]">
              <thead className="bg-slate-50 font-sans">
                <tr>
                  <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-16">{labels.bill}</th>
                  <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{labels.member}</th>
                  <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{labels.item}</th>
                  <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{labels.date}</th>
                  <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{labels.class}</th>
                  <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{labels.bardan}</th>
                  <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{labels.weight} (kg)</th>
                  <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 w-16">{labels.view}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {syncing ? (
                  <tr>
                    <td colSpan="8" className="py-20 text-center">
                      <RefreshCcw className="animate-spin mx-auto mb-4 text-slate-400" size={24} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{labels.loading}</p>
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-20 text-center">
                      <Package className="text-slate-300 mx-auto mb-4" size={40} strokeWidth={1} />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{labels.noRecords}</p>
                    </td>
                  </tr>
                ) : visibleRows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/75 transition-colors cursor-pointer" onClick={() => setSelectedEntry(row)}>
                    <td className="px-3.5 py-2 text-center font-mono text-[#1d5f84] font-bold border-r border-slate-100">#{isGu ? toGujaratiDigits(row.sr_no) : row.sr_no}</td>
                    <td className="px-3.5 py-2 border-r border-slate-100">
                      <div className="flex flex-col">
                        <span className={`font-bold text-slate-800 ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>
                          {isGu ? formatBilingualText(displayRowMemberName(row)) : displayRowMemberName(row)}
                        </span>
                        <span className="text-[12px] font-mono text-slate-400">{isGu ? `કોડ: ${toGujaratiDigits(row.member_code || '-')}` : `CODE: ${row.member_code || '-'}`}</span>
                      </div>
                    </td>
                    <td className={`px-3.5 py-2 border-r border-slate-100 font-bold text-slate-700 ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>
                      {isGu ? formatBilingualText(displayItemName(row)) : displayItemName(row)}
                    </td>
                    <td className="px-3.5 py-2 text-center border-r border-slate-100 font-mono text-slate-600">{fmtDate(row.entry_date, isGu)}</td>
                    <td className="px-3.5 py-2 text-center border-r border-slate-100">
                      <span className="px-1.5 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-600 text-[12px] font-bold uppercase">{row.quality_class || '-'}</span>
                    </td>
                    <td className="px-3.5 py-2 text-right border-r border-slate-100 font-mono font-bold text-[#1d5f84]">{fmtNum(row.returned_bags, 0, isGu)}</td>
                    <td className="px-3.5 py-2 text-right border-r border-slate-100 font-mono font-bold text-slate-800">{fmtNum(row.total_kg, 2, isGu)}</td>
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
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">{labels.filterTitle}</span>
              </div>
              <button onClick={() => setShowFiltersDrawer(false)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{labels.startDate}</span>
                  <input ref={startDateRef} type="date" value={dateRange.startDate} onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })} onKeyDown={e => handleKeyDown(e, endDateRef)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 outline-none w-full" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{labels.endDate}</span>
                  <input ref={endDateRef} type="date" value={dateRange.endDate} onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })} onKeyDown={e => handleKeyDown(e, memCodeRef)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 outline-none w-full" />
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{labels.member}</span>
                <div className="flex gap-2">
                  <input ref={memCodeRef} type="text" value={memCode} onChange={e => { setMemCode(e.target.value); setShowMemDrop(true); }} onFocus={() => setShowMemDrop(true)} onKeyDown={e => handleKeyDown(e, memNameRef)} placeholder={labels.memberCode} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-2 py-1.5 text-sm text-[#1d5f84] font-mono font-bold w-16 text-center outline-none" />
                  <input ref={memNameRef} type="text" value={memName} onChange={e => { setMemName(e.target.value); setShowMemDrop(true); }} onFocus={() => setShowMemDrop(true)} onKeyDown={e => handleKeyDown(e, null, true)} placeholder={labels.memberSearchPlaceholder} className={`bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-sm text-slate-700 font-bold flex-1 outline-none ${isGu ? 'font-prompt' : 'font-sans uppercase'}`} />
                </div>
                {showMemDrop && (
                  <div className="absolute top-[102%] left-0 right-0 bg-white border border-slate-200 rounded-md z-[110] mt-0.5 max-h-40 overflow-y-auto shadow-sm">
                    <div onClick={() => handleSelectMember(null)} className="px-2.5 py-1 hover:bg-slate-50 cursor-pointer font-bold text-[12px] text-[#1d5f84] border-b border-slate-100 uppercase flex items-center gap-1">
                      <Search size={10} />
                      <span>{labels.allMembers}</span>
                    </div>
                    {filteredMembers.map(member => (
                      <div key={member.id} onClick={() => handleSelectMember(member)} className="px-2.5 py-1 flex justify-between items-center cursor-pointer border-b border-slate-100 last:border-none hover:bg-slate-50">
                        <span className={`text-[10px] font-bold truncate ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>
                          {isGu ? formatBilingualText(displayMemberName(member)) : displayMemberName(member)}
                        </span>
                        <span className="text-[12px] font-mono text-slate-400 font-semibold shrink-0">#{isGu ? toGujaratiDigits(member.member_code || member.id) : (member.member_code || member.id)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{labels.fromCode}</span>
                  <input type="text" value={fromMemberCode} onChange={e => setFromMemberCode(e.target.value)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 outline-none w-full" />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{labels.toCode}</span>
                  <input type="text" value={toMemberCode} onChange={e => setToMemberCode(e.target.value)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 outline-none w-full" />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{labels.classOfDangar}</span>
                <select value={dangarClass} onChange={e => setDangarClass(e.target.value)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 outline-none w-full">
                  <option value="">{labels.allClasses}</option>
                  <option value="1st">1st</option>
                  <option value="2nd">2nd</option>
                  <option value="3rd">3rd</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{labels.village}</span>
                <select value={village} onChange={e => setVillage(e.target.value)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 outline-none w-full">
                  <option value="">{labels.allVillages}</option>
                  {uniqueVillages.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{labels.bank}</span>
                <select value={bankName} onChange={e => setBankName(e.target.value)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 outline-none w-full">
                  <option value="">{labels.allBanks}</option>
                  {uniqueBanks.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{labels.season}</span>
                <select value={season} onChange={e => setSeason(e.target.value)} className="bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-sm font-bold text-slate-700 outline-none w-full">
                  <option value="">{labels.allSeasons}</option>
                  {seasons.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between py-1 bg-white">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{labels.hideZeroBardan}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={hideZeroBardan} onChange={e => setHideZeroBardan(e.target.checked)} className="sr-only peer" />
                  <div className="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#1d5f84]"></div>
                </label>
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button onClick={clearFilters} className="flex-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-bold rounded-md transition cursor-pointer uppercase tracking-wider">{labels.reset}</button>
              <button onClick={() => { setShowFiltersDrawer(false); fetchReportData(); }} className="flex-1 px-3 py-2 bg-[#1d5f84] hover:bg-[#154662] text-white text-sm font-bold rounded-md transition cursor-pointer uppercase tracking-wider">{labels.viewReport}</button>
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
                <h2 className={`text-sm font-bold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>
                  {isGu ? formatBilingualText(displayRowMemberName(selectedEntry)) : displayRowMemberName(selectedEntry)}
                </h2>
                <p className="text-[12px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">
                  {isGu ? `બિલ #${toGujaratiDigits(selectedEntry.sr_no)} માટે બારદાન વજન રજીસ્ટર` : `Bardan weight register for bill #${selectedEntry.sr_no}`}
                </p>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition rounded-md cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto bg-white space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[12px] font-bold uppercase tracking-wider"><Hash size={11} /> {isGu ? 'કોડ' : 'Code'}</div>
                  <p className="mt-1 text-sm font-mono font-bold text-[#1d5f84]">{isGu ? toGujaratiDigits(selectedEntry.member_code || '-') : (selectedEntry.member_code || '-')}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[12px] font-bold uppercase tracking-wider"><Calendar size={11} /> {isGu ? 'તારીખ' : 'Date'}</div>
                  <p className="mt-1 text-sm font-mono font-bold text-slate-800">{fmtDate(selectedEntry.entry_date, isGu)}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[12px] font-bold uppercase tracking-wider"><Package size={11} /> {isGu ? 'જમા' : 'Jama'}</div>
                  <p className="mt-1 text-sm font-mono font-bold text-[#1d5f84]">{fmtNum(selectedEntry.jama_qty || selectedEntry.returned_bags, 0, isGu)} {isGu ? 'બારદાન' : 'Bardan'}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[12px] font-bold uppercase tracking-wider"><Scale size={11} /> {labels.weight}</div>
                  <p className="mt-1 text-sm font-mono font-bold text-slate-800">{fmtNum(selectedEntry.total_kg, 2, isGu)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
                <div className="flex items-center gap-2 text-slate-600 font-bold"><User size={13} className="text-slate-400" /> {isGu ? formatBilingualText(displayItemName(selectedEntry)) : displayItemName(selectedEntry)}</div>
                <div className="flex items-center gap-2 text-slate-600 font-bold"><MapPin size={13} className="text-slate-400" /> {selectedEntry.village_name || '-'}</div>
                <div className="flex items-center gap-2 text-slate-600 font-bold"><Hash size={13} className="text-slate-400" /> {isGu ? `વર્ગ ${selectedEntry.quality_class || '-'}` : `Class ${selectedEntry.quality_class || '-'}`}</div>
              </div>

              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-[12px]">
                  <thead className="bg-slate-50 text-[12px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 text-left border-r border-slate-200">{labels.bardanNo}</th>
                      <th className="px-3 py-2 text-right">{labels.weight}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {weightRows.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="px-3 py-8 text-center text-slate-400 font-bold uppercase tracking-wider">{labels.weightsNotRecorded}</td>
                      </tr>
                    ) : weightRows.map((weight, idx) => (
                      <tr key={weight.id || idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 border-r border-slate-100 font-bold text-slate-800 uppercase">{isGu ? `બારદાન ${toGujaratiDigits(weight.sr_no || idx + 1)}` : `Bardan ${weight.sr_no || idx + 1}`}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-[#1d5f84]">{fmtNum(weight.weight, 2, isGu)}</td>
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
