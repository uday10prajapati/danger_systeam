import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Search, Plus, Save, RefreshCcw,
  AlertCircle, CheckCircle, Database, Calendar,
  TrendingUp, Scale, Box, Loader, Info, Edit3, X, FileText, Printer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import Toast from '../components/Toast';
import Loading from '../components/Loading';
import { formatBilingualText } from '../utils/textUtils';
import { exportToPDF } from '../utils/pdfExporter';


export default function DangarRateMaster() {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';
  const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
  const toGu = (num) => {
    const value = String(num ?? '');
    return isGu ? value.replace(/[0-9]/g, d => guDigits[d] || d) : value;
  };
  const displayItemName = (item = {}) => (
    isGu
      ? (item.item_name_gu || item.item_name || '')
      : (item.item_name || item.item_name_gu || '')
  );
  const displayRateItemName = (item = {}, rateObj = {}) => {
    const activeItem = (item && item.item_name) ? item : (rateObj || {});
    return isGu
      ? (activeItem.item_name_gu || activeItem.item_name || '')
      : (activeItem.item_name || activeItem.item_name_gu || '');
  };
  const displayCategory = (item = {}) => (
    isGu
      ? (item.category_gu || item.category || '')
      : (item.category || item.category_gu || '')
  );
  const tableTextClass = isGu ? 'font-prompt-sm' : 'force-en notranslate';
  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [items, setItems] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [financialYear, setFinancialYear] = useState('2026-27');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Season Modal State
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [newSeason, setNewSeason] = useState({ name: '', season: 'Winter', year: '2026-27' });
  const [currentSeason, setCurrentSeason] = useState(null);

  // Edit states
  const [editingItemId, setEditingItemId] = useState(null);
  const [editRate, setEditRate] = useState('');
  const [editWinterRate, setEditWinterRate] = useState('');
  const [editSummerRate, setEditSummerRate] = useState('');

  // Refs for season modal
  const seasonNameRef = useRef(null);
  const seasonTypeRef = useRef(null);
  const seasonYearRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('financialYear', financialYear);
    loadInitialData();
    setCurrentPage(1);
  }, [financialYear]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const companyRes = await api.get('/company');
      const comp = companyRes?.data?.data;

      if (!companyRes?.data?.success || !comp?.id) {
        setCompanyId(null);
        setCompanyName('');
        setItems([]);
        setRates([]);
        setCurrentSeason(null);
        setMessage({ type: 'error', text: t('dangarRateMaster.errors.companyNotFound') });
        return;
      }

      setCompanyId(comp.id);
      setCompanyName(comp.company_name || '');

      const headers = { 'X-Company-Id': comp.id };
      const [itemsListRes, ratesRes, seasonsRes] = await Promise.all([
        api.get('/items', { headers }),
        api.get('/dangar-rates', { headers, params: { year: financialYear } }),
        api.get(`/seasons/company/${comp.id}`)
      ]);

      if (itemsListRes?.data?.success) {
        setItems(itemsListRes.data.data || []);
      } else {
        setItems([]);
      }

      if (ratesRes?.data?.success) {
        setRates(ratesRes.data.data || []);
      } else {
        setRates([]);
      }

      if (seasonsRes?.data?.success && (seasonsRes.data.data || []).length > 0) {
        setCurrentSeason(seasonsRes.data.data[0]);
      } else {
        setCurrentSeason(null);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setMessage({ type: 'error', text: t('dangarRateMaster.errors.syncFailure') });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item, rateObj) => {
    setEditingItemId(item.id);
    setEditRate(rateObj?.rate ?? '');
    setEditWinterRate(rateObj?.winter_rate ?? '');
    setEditSummerRate(rateObj?.summer_rate ?? '');
  };

  const handleSave = async (itemId) => {
    try {
      setIsSaving(true);
      const res = await api.post('/dangar-rates', {
        company_id: companyId,
        financial_year: financialYear,
        item_id: itemId,
        rate: parseFloat(editRate) || 0,
        winter_rate: parseFloat(editWinterRate) || 0,
        summer_rate: parseFloat(editSummerRate) || 0
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Rate configuration finalized' });
        setEditingItemId(null);
        loadInitialData();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Secure commit failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateSeason = async (e) => {
    if (e) e.preventDefault();
    try {
      setIsSaving(true);
      const payload = {
        company_id: companyId,
        name: newSeason.name,
        season_type: newSeason.season,
        financial_year: newSeason.year
      };

      const res = await api.post('/seasons', payload);

      if (res.data.success) {
        setMessage({ type: 'success', text: 'New season configuration registered successfully' });
        setShowSeasonModal(false);
        setNewSeason({ name: '', season: 'Winter', year: '2026-27' });
        loadInitialData();
      } else {
        throw new Error(res.data.error || 'Server rejection');
      }
    } catch (error) {
      console.error('Season creation error:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to initialize new season' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeasonKeyDown = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      } else {
        handleCreateSeason();
      }
    }
  };

  const filteredItems = items.filter(item =>
    (item.item_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.item_name_gu || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.item_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    if (filteredItems.length === 0) {
      setMessage({ type: 'error', text: t('dangarRateMaster.errors.syncFailure') });
      return;
    }

    const isGu = i18n.language === 'gu';

    // Fetch Company Information from localStorage or fallback to state
    const companyData = JSON.parse(localStorage.getItem('company') || '{}');
    const companyHeaderName = isGu
      ? (companyData.company_name_gu || companyData.company_name || companyName || '')
      : (companyData.company_name || companyData.company_name_gu || companyName || '');

    // Get current financial year
    const formattedFY = financialYear ? (isGu ? `વર્ષ : ${toGu(financialYear)}` : `FY: ${financialYear}`) : '';

    // Generate today's date string
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const dateStr = `${day}/${month}/${year}`;
    const formattedDate = isGu ? `તારીખ: ${toGu(dateStr)}` : `Date: ${dateStr}`;

    const reportTitle = t('dangarRateMaster.pdf.title') || 'વાર્ષિક ડાંગર દર રજિસ્ટ્રી';

    const rowsHTML = filteredItems.map((item, idx) => {
      const serial = isGu ? toGu(idx + 1) : String(idx + 1);
      const rateObj = rates.find(r => r.item_id === item.id);

      const itemName = displayRateItemName(item, rateObj);
      const sku = item.item_code || '—';
      const category = displayCategory(item) || '—';

      const rateVal1 = rateObj ? parseFloat(rateObj.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00';
      const rateVal2 = rateObj ? parseFloat(rateObj.winter_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00';
      const rateVal3 = rateObj ? parseFloat(rateObj.summer_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00';

      const class1 = isGu ? `₹${toGu(rateVal1)}` : `₹${rateVal1}`;
      const class2 = isGu ? `₹${toGu(rateVal2)}` : `₹${rateVal2}`;
      const class3 = isGu ? `₹${toGu(rateVal3)}` : `₹${rateVal3}`;

      const fontStyle = isGu ? "font-family:'Prompt', 'Noto Sans Gujarati', sans-serif;" : "font-family:Arial, sans-serif;";
      const nameStyle = isGu ? "font-family:'Prompt', 'Noto Sans Gujarati', sans-serif;" : "font-family:Arial, sans-serif;";

      return `
        <tr>
          <td style="text-align: center; ${fontStyle}">${serial}</td>
          <td style="text-align: center; font-family: Arial, sans-serif;">${sku}</td>
          <td style="${nameStyle}">${itemName}</td>
          <td style="${nameStyle}">${category}</td>
          <td style="text-align: right; ${fontStyle}">${class1}</td>
          <td style="text-align: right; ${fontStyle}">${class2}</td>
          <td style="text-align: right; ${fontStyle}">${class3}</td>
        </tr>
      `;
    }).join('');

    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&family=Outfit:wght@400;600;700&display=swap');
            
            @font-face {
              font-family: 'Prompt';
              src: url('/fonts/Prompt.ttf') format('truetype');
              font-weight: normal;
              font-style: normal;
            }

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Outfit', 'Noto Sans Gujarati', Arial, sans-serif;
              padding: 16px;
              background: #ffffff;
              color: #000000;
            }
            .pdf-report-container {
              border: 1.5px solid #000000;
              overflow: hidden;
              background: #ffffff;
            }
            .pdf-header-company {
              border-bottom: 1.5px solid #000000;
              padding: 12px;
              text-align: center;
              font-size: 112px;
              font-weight: bold;
              font-family: 'Prompt', 'Noto Sans Gujarati', 'Outfit', sans-serif;
              color: #000000;
            }
            .pdf-header-title {
              border-bottom: 1.5px solid #000000;
              padding: 12px;
              text-align: center;
              font-size: 14px;
              font-weight: bold;
              font-family: 'Noto Sans Gujarati', 'Outfit', sans-serif;
              color: #000000;
            }
            .pdf-info-bar {
              border-bottom: 1.5px solid #000000;
              padding: 12px 12px;
              display: flex;
              justify-content: flex-end;
              align-items: center;
              background: #ffffff;
            }
            .pdf-table {
              width: 100%;
              border-collapse: collapse;
            }
            .pdf-table th, .pdf-table td {
              border: 1.5px solid #000000 !important;
              padding: 12px 10px;
              font-size: 12px;
              color: #000000;
            }
            .pdf-table th {
              font-weight: bold;
              background: #ffffff;
              border-top: none !important;
            }
            /* Remove outer borders of the table to merge with the container's border */
            .pdf-table th:first-child, .pdf-table td:first-child {
              border-left: none !important;
            }
            .pdf-table th:last-child, .pdf-table td:last-child {
              border-right: none !important;
            }
            .pdf-table tr:last-child td {
              border-bottom: none !important;
            }
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="pdf-report-container">
            <div class="pdf-header-company">${companyHeaderName}</div>
            <div class="pdf-header-title">${reportTitle}</div>
            <div class="pdf-info-bar">
              <div style="font-size:12px; font-weight:bold; color:#000000; display:flex; gap:16px;">
                <span>${formattedDate}</span>
                ${formattedFY ? `<span>|</span> <span>${formattedFY}</span>` : ''}
              </div>
            </div>
            <table class="pdf-table">
              <thead>
                <tr>
                  <th style="width: 6%; text-align: center;">#</th>
                  <th style="width: 10%; text-align: center;">${t('dangarRateMaster.table.sku') || 'SKU'}</th>
                  <th style="width: 28%; text-align: left;">${t('dangarRateMaster.table.itemName') || 'Item Name'}</th>
                  <th style="width: 14%; text-align: left;">${t('dangarRateMaster.table.category') || 'Category'}</th>
                  <th style="width: 14%; text-align: right;">${t('dangarRateMaster.table.class1') || 'Class 1 Rate'}</th>
                  <th style="width: 14%; text-align: right;">${t('dangarRateMaster.table.class2') || 'Class 2 Rate'}</th>
                  <th style="width: 14%; text-align: right;">${t('dangarRateMaster.table.class3') || 'Class 3 Rate'}</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 600);
  };

  const handleExportPDF = async () => {
    if (!filteredItems.length) {
      setMessage({ type: 'error', text: t('dangarRateMaster.errors.syncFailure') });
      return;
    }

    const isGu = i18n.language === 'gu';
    const columns = [
      {
        header: '#',
        align: 'center',
        width: '6%',
        render: (item, idx) => isGu ? toGu(idx + 1) : String(idx + 1)
      },
      {
        header: t('dangarRateMaster.table.sku') || 'SKU',
        align: 'center',
        width: '10%',
        render: (item) => item.item_code || '—'
      },
      {
        header: t('dangarRateMaster.table.itemName') || 'Item Name',
        align: 'left',
        width: '28%',
        render: (item) => {
          const rateObj = rates.find(r => r.item_id === item.id);
          return displayRateItemName(item, rateObj);
        },
        usePromptFont: isGu
      },
      {
        header: t('dangarRateMaster.table.category') || 'Category',
        align: 'left',
        width: '14%',
        render: (item) => displayCategory(item) || '—',
        usePromptFont: isGu
      },
      {
        header: t('dangarRateMaster.table.class1') || 'Class 1 Rate',
        align: 'right',
        width: '14%',
        render: (item) => {
          const rateObj = rates.find(r => r.item_id === item.id);
          const val = parseFloat(rateObj?.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
          return isGu ? `₹${toGu(val)}` : `₹${val}`;
        }
      },
      {
        header: t('dangarRateMaster.table.class2') || 'Class 2 Rate',
        align: 'right',
        width: '14%',
        render: (item) => {
          const rateObj = rates.find(r => r.item_id === item.id);
          const val = parseFloat(rateObj?.winter_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
          return isGu ? `₹${toGu(val)}` : `₹${val}`;
        }
      },
      {
        header: t('dangarRateMaster.table.class3') || 'Class 3 Rate',
        align: 'right',
        width: '14%',
        render: (item) => {
          const rateObj = rates.find(r => r.item_id === item.id);
          const val = parseFloat(rateObj?.summer_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
          return isGu ? `₹${toGu(val)}` : `₹${val}`;
        }
      }
    ];

    await exportToPDF({
      title: t('dangarRateMaster.pdf.title'),
      columns,
      rows: filteredItems,
      isGu,
      filename: `Dangar_Rate_Master_FY${financialYear.replace('-', '_')}.pdf`,
      onStart: () => setLoading(true),
      onComplete: () => setLoading(false)
    });
  };

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredItems.length);
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  if (loading && !companyId) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 select-none pb-8">
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1600px] mx-auto px-4 py-4">
        {/* Registry Table Card Container */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">

          {/* Table Control Header Bar (First Line) */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-extrabold text-slate-800 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
                {t('dangarRateMaster.title') || 'Yearly Rate Master'}
              </span>
              <span className="bg-slate-200 text-slate-600 font-bold force-en text-[12px] px-1.5 py-0.5 rounded-sm">
                {toGu(filteredItems.length)} {t('common.records') || 'RECORDS'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Financial Year Dropdown */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 h-7 rounded-md select-none shadow-none">
                <Calendar size={12} className="text-slate-400" />
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="bg-transparent border-none outline-none text-[12px] text-slate-600 font-bold cursor-pointer select-none py-0"
                >
                  <option value="2026-27">2026-27</option>
                  <option value="2025-26">2025-26</option>
                </select>
              </div>

              {/* Symmetrical Search Box */}
              <div className="relative flex items-center border border-slate-200 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] rounded-md bg-white px-2.5 py-1 transition-colors w-48 sm:w-64">
                <Search size={12} className="text-slate-400 mr-1.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t('dangarRateMaster.searchPlaceholder') || "Search crop..."}
                  className="bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-350 w-full font-semibold"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="p-0.5 text-slate-300 hover:text-slate-600 transition">
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* New Season Button */}
              <button
                onClick={() => setShowSeasonModal(true)}
                className="h-7 flex items-center gap-1.5 px-2.5 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[12px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider"
              >
                <Plus size={13} />
                <span>{t('dangarRateMaster.newSeason')}</span>
              </button>

              {/* Print Button */}
              <button
                onClick={handlePrint}
                title={t('dangarMaster.print') || "Print"}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none"
              >
                <Printer size={13} className="text-slate-500" />
              </button>

              {/* PDF Report Button */}
              <button
                onClick={handleExportPDF}
                title={t('common.pdf') || "PDF"}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none"
              >
                <FileText size={13} className="text-slate-500" />
              </button>

              {/* Refresh Button */}
              <button
                onClick={loadInitialData}
                disabled={loading}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none disabled:opacity-40"
                title={t('common.refresh') || 'Refresh'}
              >
                <RefreshCcw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto bg-white select-none flex-1">
            {paginatedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-center p-4">
                <Database size={32} className="text-slate-300 opacity-30" />
                <p className="text-sm font-bold text-slate-400">{t('dangarRateMaster.noRecords') || 'No records found'}</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 border-collapse text-[12px] select-none">
                <thead className="bg-slate-50 font-sans">
                  <tr>
                    <th scope="col" className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-12">#</th>
                    <th scope="col" className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-20">{t('dangarRateMaster.table.sku') || "SKU"}</th>
                    <th scope="col" className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('dangarRateMaster.table.itemName') || "Item Name"}</th>
                    <th scope="col" className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('dangarRateMaster.table.category') || "Category"}</th>
                    <th scope="col" className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-28">{t('dangarRateMaster.table.class1') || "Class 1 Rate"}</th>
                    <th scope="col" className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-28">{t('dangarRateMaster.table.class2') || "Class 2 Rate"}</th>
                    <th scope="col" className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-28">{t('dangarRateMaster.table.class3') || "Class 3 Rate"}</th>
                    <th scope="col" className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 w-28">{t('dangarRateMaster.table.ops') || "Operations"}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {paginatedItems.map((item, idx) => {
                    const globalIdx = startIndex + idx + 1;
                    const rateObj = rates.find(r => r.item_id === item.id);
                    const isEditing = editingItemId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/75 transition-colors cursor-pointer select-none animate-none"
                      >
                        <td className={`px-3.5 py-2 text-center text-slate-500 border-r border-slate-100 ${tableTextClass}`} translate="no">
                          {toGu(globalIdx)}
                        </td>
                        <td className={`px-3.5 py-2 text-center font-bold text-[#1d5f84] border-r border-slate-100 ${tableTextClass}`} translate="no">
                          {toGu(item.item_code || item.id)}
                        </td>
                        <td
                          className={`px-3.5 py-2 border-r border-slate-100 font-bold text-slate-800 break-words whitespace-normal ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}
                          translate="no"
                        >
                          {displayRateItemName(item, rateObj)}
                        </td>
                        <td className="px-3.5 py-2 border-r border-slate-100 text-slate-655 font-medium">
                          {displayCategory(item) ? (
                            <span className={`px-2 py-0.5 bg-slate-100 text-slate-700 rounded-sm text-[12px] font-bold uppercase tracking-widest border border-slate-200/50 ${tableTextClass}`} translate="no">
                              {displayCategory(item)}
                            </span>
                          ) : '—'}
                        </td>

                        {/* Rates columns */}
                        <td className="px-3.5 py-2 border-r border-slate-100 text-right font-bold text-slate-800 text-[12px] force-en notranslate" translate="no">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editRate}
                              onChange={(e) => setEditRate(e.target.value)}
                              placeholder="0.00"
                              className="w-24 px-2 py-1 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded outline-none text-right font-mono font-bold text-slate-700 transition"
                            />
                          ) : (
                            <span>
                              {rateObj ? `₹${toGu(parseFloat(rateObj.rate).toFixed(2))}` : `₹${toGu('0.00')}`}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2 border-r border-slate-100 text-right font-bold text-slate-800 text-[12px] force-en notranslate" translate="no">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editWinterRate}
                              onChange={(e) => setEditWinterRate(e.target.value)}
                              placeholder="0.00"
                              className="w-24 px-2 py-1 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded outline-none text-right font-mono font-bold text-slate-700 transition"
                            />
                          ) : (
                            <span>
                              {rateObj ? `₹${toGu(parseFloat(rateObj.winter_rate || 0).toFixed(2))}` : `₹${toGu('0.00')}`}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2 border-r border-slate-100 text-right font-bold text-slate-800 text-[12px] force-en notranslate" translate="no">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editSummerRate}
                              onChange={(e) => setEditSummerRate(e.target.value)}
                              placeholder="0.00"
                              className="w-24 px-2 py-1 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded outline-none text-right font-mono font-bold text-slate-700 transition"
                            />
                          ) : (
                            <span>
                              {rateObj ? `₹${toGu(parseFloat(rateObj.summer_rate || 0).toFixed(2))}` : `₹${toGu('0.00')}`}
                            </span>
                          )}
                        </td>

                        <td className="px-3.5 py-2 text-center flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSave(item.id)}
                                disabled={isSaving}
                                className="p-1 border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 text-emerald-600 rounded transition cursor-pointer"
                                title="Save rates"
                              >
                                {isSaving ? <RefreshCcw size={12} className="animate-spin" /> : <Save size={12} />}
                              </button>
                              <button
                                onClick={() => setEditingItemId(null)}
                                className="p-1 border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-rose-600 rounded transition cursor-pointer"
                                title="Cancel"
                              >
                                <X size={12} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={async () => {
                                  if (!window.confirm(`Sync all previous entries for ${displayRateItemName(item, rateObj)} with current master rates?`)) return;
                                  try {
                                    setIsSaving(true);
                                    const res = await api.post('/dangar-entry/recalculate', {
                                      item_id: item.id,
                                      financial_year: financialYear,
                                      company_id: companyId
                                    });
                                    if (res.data.success) {
                                      setMessage({ type: 'success', text: res.data.message });
                                    }
                                  } catch (e) {
                                    setMessage({ type: 'error', text: 'Synchronization engine error' });
                                  } finally {
                                    setIsSaving(false);
                                  }
                                }}
                                disabled={isSaving}
                                title="Recalculate earlier entries"
                                className="p-1 border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-200 text-amber-600 rounded transition cursor-pointer"
                              >
                                <RefreshCcw size={12} className={isSaving ? 'animate-spin' : ''} />
                              </button>
                              <button
                                onClick={() => handleEdit(item, rateObj)}
                                className="p-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded transition cursor-pointer"
                                title="Edit Rates"
                              >
                                <Edit3 size={12} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Directory Pagination Panel */}
          {filteredItems.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span className={`text-[10px] text-slate-400 font-bold uppercase ${tableTextClass}`} translate="no">
                {toGu(startIndex + 1)}-{toGu(endIndex)} / {toGu(filteredItems.length)}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 transition text-[10px] font-extrabold text-slate-600 disabled:cursor-not-allowed cursor-pointer animate-duration-100"
                >
                  Prev
                </button>
                <span className={`text-sm font-bold text-slate-600 px-1.5 ${tableTextClass}`} translate="no">
                  {toGu(currentPage)} / {toGu(totalPages)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 transition text-[10px] font-extrabold text-slate-600 disabled:cursor-not-allowed cursor-pointer animate-duration-100"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Season Registration Modal */}
      {showSeasonModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1.5px] flex items-center justify-center p-4 z-50 select-none animate-none">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col w-full max-w-md shadow-none animate-none">

            {/* Modal Title Bar */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-[#1d5f84]" />
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wide font-sans">
                  {t('dangarRateMaster.initializeNewSeason') || "Initialize New Season"}
                </span>
              </div>
              <button
                onClick={() => setShowSeasonModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateSeason} className="p-4 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {t('dangarRateMaster.seasonDescription') || "Season Description"}
                </label>
                <input
                  ref={seasonNameRef}
                  type="text"
                  required
                  value={newSeason.name}
                  onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                  onKeyDown={(e) => handleSeasonKeyDown(e, seasonTypeRef)}
                  placeholder="e.g. Winter Epoch 2026"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md outline-none text-sm font-mono font-bold text-slate-700 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t('dangarRateMaster.seasonType') || "Season Type"}
                  </label>
                  <select
                    ref={seasonTypeRef}
                    required
                    value={newSeason.season}
                    onChange={(e) => setNewSeason({ ...newSeason, season: e.target.value })}
                    onKeyDown={(e) => handleSeasonKeyDown(e, seasonYearRef)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md outline-none text-sm font-bold text-slate-700 uppercase cursor-pointer"
                  >
                    <option value="Winter">{t('dangarRateMaster.winter') || "Winter"}</option>
                    <option value="Summer">{t('dangarRateMaster.summer') || "Summer"}</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t('company.financialYear') || "Financial Year"}
                  </label>
                  <input
                    ref={seasonYearRef}
                    type="text"
                    required
                    value={newSeason.year}
                    onChange={(e) => setNewSeason({ ...newSeason, year: e.target.value })}
                    onKeyDown={(e) => handleSeasonKeyDown(e, null)}
                    placeholder="2026-27"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md outline-none text-sm font-mono font-bold text-slate-700 text-center"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSeasonModal(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 text-sm font-bold rounded-md transition cursor-pointer select-none"
                >
                  {t('common.cancel') || "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#1d5f84] hover:bg-[#154662] text-white border border-[#1d5f84] text-sm font-bold rounded-md transition cursor-pointer select-none flex items-center gap-1.5 shadow-none"
                >
                  {isSaving ? <RefreshCcw size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>{t('dangarRateMaster.register') || "Register"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
