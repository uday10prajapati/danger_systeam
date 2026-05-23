import React, { useState, useEffect } from 'react';
import {
  Plus, Edit2, AlertCircle, Search, Filter,
  CheckCircle, XCircle, TrendingUp, Calendar,
  Activity, Database, History, ChevronRight, X,
  Shield, Download, IndianRupee, Tag, Layers,
  ArrowRight, MoreVertical, Power, Loader, RefreshCcw,
  Box, Scale, Info, FileText, Printer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import { exportToPDF } from '../utils/pdfExporter';
import ItemRateForm from '../components/ItemRateForm';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';
import Toast from '../components/Toast';
import Loading from '../components/Loading';

export default function ItemRate() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [rateEntries, setRateEntries] = useState([]);
  const [rates, setRates] = useState([]);
  const [filteredRates, setFilteredRates] = useState([]);
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active');
  const [priceHistory, setPriceHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [message, setMessage] = useState(null);

  const translateServerMessage = (message) => {
    if (!message || i18n.language !== 'gu') return message;

    const text = String(message);
    const lower = text.toLowerCase();

    if (/failed to load items/.test(lower)) return 'વસ્તુઓ લોડ કરવામાં નિષ્ફળ.';
    if (/failed to save rate/.test(lower)) return 'દર સાચવવામાં નિષ્ફળ.';
    if (/pdf generation failed/.test(lower)) return 'PDF બનાવવા નિષ્ફળ.';
    if (/validation/.test(lower)) return 'કૃપા કરીને નીચેની ભૂલો સુધારો.';

    return text;
  };

  useEffect(() => {
    loadCompany();
  }, []);

  const mergeRatesWithItems = (rateRows = [], itemRows = []) => {
    const validRateRows = Array.isArray(rateRows) ? rateRows : [];
    const validItems = Array.isArray(itemRows) ? itemRows : [];
    const existingItemIds = new Set(validRateRows.map(r => Number(r.item_id)));

    const pendingRows = validItems
      .filter(item => Number(item.is_active) === 1 && !existingItemIds.has(Number(item.id)))
      .map(item => ({
        id: `pending-${item.id}`,
        company_id: item.company_id,
        item_id: item.id,
        item_name: item.item_name,
        item_name_gu: item.item_name_gu,
        item_code: item.item_code,
        barcode: item.barcode,
        purchase_rate: item.purchase_price || 0,
        sale_rate: item.sale_price || 0,
        mrp: null,
        effective_from: item.updated_at || item.created_at || new Date().toISOString(),
        is_active: 1,
        is_pending_rate: 1,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

    return [...validRateRows, ...pendingRows];
  };

  const loadCompany = async () => {
    try {
      setLoading(true);
      const res = await api.get('/company');
      if (res.data.success && res.data.data) {
        setCompany(res.data.data);
        await fetchData(res.data.data.id);
      }
    } catch (err) {
      console.error('Fetch company error:', err);
      setLoading(false);
    }
  };

  const fetchData = async (companyId) => {
    try {
      setLoading(true);
      const [ratesRes, itemsRes] = await Promise.all([
        api.get(`/item-rates/company/${companyId}`),
        api.get(`/items/company/${companyId}`)
      ]);

      let fetchedRates = [];
      let fetchedItems = [];

      if (ratesRes.data.success) {
        fetchedRates = ratesRes.data.data || [];
        setRateEntries(fetchedRates);
      }

      if (itemsRes.data.success) {
        fetchedItems = itemsRes.data.data || [];
        setItems(fetchedItems);
      }

      const mergedRates = mergeRatesWithItems(fetchedRates, fetchedItems);
      setRates(mergedRates);
      applyFilters(mergedRates, searchTerm, selectedStatus);
    } catch (err) {
      console.error('Fetch data error:', err);
    } finally {
      setLoading(false);
    }
  };

  // We keep fetchRates pointing to fetchData so we don't need to change other references
  const fetchRates = async (companyId) => {
    return fetchData(companyId);
  };

  const fetchPriceHistory = async (itemId) => {
    try {
      const res = await api.get(`/item-rates/history/${itemId}`);
      if (res.data.success) {
        setPriceHistory(res.data.data);
        setShowHistory(true);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    }
  };

  const applyFilters = (ratesToFilter, search, status) => {
    let filtered = ratesToFilter;
    if (search) {
      filtered = filtered.filter(rate =>
        (rate.item_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (rate.item_code || '').toLowerCase().includes(search.toLowerCase()) ||
        (rate.barcode && String(rate.barcode).includes(search))
      );
    }
    if (status === 'active') filtered = filtered.filter(rate => Number(rate.is_active) === 1 || Number(rate.is_pending_rate) === 1);
    else if (status === 'inactive') filtered = filtered.filter(rate => Number(rate.is_active) === 0 && Number(rate.is_pending_rate) !== 1);
    setFilteredRates(filtered);
  };

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    applyFilters(rates, term, selectedStatus);
  };

  const handleStatusFilter = (status) => {
    setSelectedStatus(status);
    applyFilters(rates, searchTerm, status);
  };

  const handleEdit = (rate) => {
    if (rate.is_pending_rate) {
      setEditingRate(null);
      setShowForm(true);
      return;
    }
    setEditingRate(rate);
    setShowForm(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingRate) {
        await api.put(`/item-rates/${editingRate.id}`, formData);
      } else {
        await api.post('/item-rates', formData);
      }
      setShowForm(false);
      setEditingRate(null);
      fetchRates(company.id);
    } catch (err) {
      console.error('Form submit error:', err);
    }
  };

  const displayItemName = (item) => {
    if (!item) return '';
    return i18n.language === 'gu'
      ? (item.item_name_gu || item.item_name || '')
      : (item.item_name || item.item_name_gu || '');
  };

  const toGujaratiDigits = (num) => {
    const gujDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
    return num.toString().split('').map(digit => gujDigits[digit] || digit).join('');
  };

  const handleExportPDF = async () => {
    if (filteredRates.length === 0) {
      setMessage({ type: 'error', text: translateServerMessage(t('itemMaster.errors.failedLoadItems')) });
      return;
    }

    const isGu = i18n.language === 'gu';
    const columns = [
      {
        header: '#',
        align: 'center',
        width: '8%',
        render: (row, idx) => isGu ? toGujaratiDigits(idx + 1) : String(idx + 1)
      },
      {
        header: t('itemRate.table.nomenclature'),
        align: 'left',
        width: '35%',
        render: (row) => isGu ? (row.item_name_gu || row.item_name || '') : (row.item_name || row.item_name_gu || ''),
        usePromptFont: isGu
      },
      {
        header: t('itemRate.table.systemId'),
        align: 'center',
        width: '15%',
        render: (row) => row.item_code || '—'
      },
      {
        header: t('itemRate.table.yieldIndex'),
        align: 'right',
        width: '15%',
        render: (row) => {
          const val = parseFloat(row.sale_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
          return isGu ? `₹${toGujaratiDigits(val)}` : `₹${val}`;
        }
      },
      {
        header: t('itemRate.table.timeline'),
        align: 'center',
        width: '15%',
        render: (row) => {
          if (!row.effective_from) return '—';
          const d = new Date(row.effective_from);
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          const dateStr = `${day}/${month}/${year}`;
          return isGu ? toGujaratiDigits(dateStr) : dateStr;
        }
      },
      {
        header: t('itemRate.table.auditStatus'),
        align: 'center',
        width: '12%',
        render: (row) => row.is_pending_rate ? t('itemRate.table.pending') : (row.is_active === 1 ? t('itemRate.table.verified') : t('itemRate.table.redacted'))
      }
    ];

    const metaInfo = [];

    await exportToPDF({
      title: t('itemRate.print.tariffManifest'),
      columns,
      rows: filteredRates,
      isGu,
      metaInfo,
      filename: `Tariff_Manifest_${new Date().toISOString().split('T')[0]}.pdf`,
      onStart: () => setLoading(true),
      onComplete: () => setLoading(false)
    });
  };


  const handlePrint = () => {
    if (filteredRates.length === 0) {
      setMessage({ type: 'error', text: translateServerMessage(t('itemMaster.errors.failedLoadItems')) });
      return;
    }

    const isGu = i18n.language === 'gu';

    // Fetch Company Information from localStorage
    const companyData = JSON.parse(localStorage.getItem('company') || '{}');
    const companyName = isGu
      ? (companyData.company_name_gu || companyData.company_name || '')
      : (companyData.company_name || companyData.company_name_gu || '');

    // Get current financial year
    const currentFY = localStorage.getItem('financialYear') || '';
    const formattedFY = currentFY ? (isGu ? `વર્ષ : ${toGujaratiDigits(currentFY)}` : `FY: ${currentFY}`) : '';

    // Generate today's date string
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const dateStr = `${day}/${month}/${year}`;
    const formattedDate = isGu ? `તારીખ: ${toGujaratiDigits(dateStr)}` : `Date: ${dateStr}`;

    const reportTitle = t('itemRate.print.tariffManifest');

    const rowsHTML = filteredRates.map((rate, idx) => {
      const serial = isGu ? toGujaratiDigits(idx + 1) : String(idx + 1);
      const name = isGu ? (rate.item_name_gu || rate.item_name || '') : (rate.item_name || rate.item_name_gu || '');
      const code = rate.item_code || '—';

      const val = parseFloat(rate.sale_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
      const rateVal = isGu ? `₹${toGujaratiDigits(val)}` : `₹${val}`;

      let dateVal = '—';
      if (rate.effective_from) {
        const d = new Date(rate.effective_from);
        const dStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        dateVal = isGu ? toGujaratiDigits(dStr) : dStr;
      }

      const statusVal = rate.is_pending_rate ? t('itemRate.table.pending') : (rate.is_active === 1 ? t('itemRate.table.verified') : t('itemRate.table.redacted'));

      const fontStyle = isGu ? "font-family:'Prompt', 'Noto Sans Gujarati', sans-serif;" : "font-family:Arial, sans-serif;";
      const nameStyle = isGu ? "font-family:'Prompt', 'Noto Sans Gujarati', sans-serif;" : "font-family:Arial, sans-serif;";

      return `
        <tr>
          <td style="text-align: center; ${fontStyle}">${serial}</td>
          <td style="${nameStyle}">${name}</td>
          <td style="text-align: center; font-family: Arial, sans-serif;">${code}</td>
          <td style="text-align: right; ${fontStyle}">${rateVal}</td>
          <td style="text-align: center; font-family: Arial, sans-serif;">${dateVal}</td>
          <td style="text-align: center; ${fontStyle}">${statusVal}</td>
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
              padding: 30px;
              background: #ffffff;
              color: #000000;
            }
            .pdf-report-container {
              border: 2.5px solid #000000;
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
                margin: 20mm;
              }
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="pdf-report-container">
            <div class="pdf-header-company">${companyName}</div>
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
                  <th style="width: 8%; text-align: center;">#</th>
                  <th style="width: 35%; text-align: left;">${t('itemRate.table.nomenclature')}</th>
                  <th style="width: 15%; text-align: center;">${t('itemRate.table.systemId')}</th>
                  <th style="width: 15%; text-align: right;">${t('itemRate.table.yieldIndex')}</th>
                  <th style="width: 15%; text-align: center;">${t('itemRate.table.timeline')}</th>
                  <th style="width: 12%; text-align: center;">${t('itemRate.table.auditStatus')}</th>
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
    }, 400);
  };


  if (!company) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 select-none pb-12">
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: t('itemRate.stats.globalTariffs'), val: rates.length },
            { label: t('itemRate.stats.verifiedNodes'), val: rateEntries.filter(r => Number(r.is_active) === 1).length },
            { label: t('itemRate.stats.activeInventory'), val: new Set(rates.filter(r => r.is_active === 1).map(r => r.item_id)).size },
            { label: t('itemRate.stats.auditProtocol'), val: t('itemRate.stats.symmetricalValue') || '?????' }
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
              <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
              <span className={`text-[13px] font-bold font-sans text-slate-800 mt-1 ${i < 3 ? 'force-en' : 'font-prompt'}`}>{stat.val}</span>
            </div>
          ))}
        </div>

        {/* Table/Manifest Container */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none">
          {/* Table Control Header Bar */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-extrabold text-slate-800 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
                {t('itemRate.title')}
              </span>
              <span className="bg-slate-200 text-slate-600 font-bold force-en text-[12px] px-1.5 py-0.5 rounded-sm">
                {filteredRates.length} {t('itemRate.table.nomenclature')}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative flex items-center border border-slate-200 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] rounded-md bg-white px-2.5 py-1 transition-colors w-48 sm:w-64">
                <Search size={12} className="text-slate-400 mr-1.5" />
                <input
                  type="text"
                  placeholder={t('itemRate.searchPlaceholder')}
                  value={searchTerm}
                  onChange={handleSearch}
                  className="bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-300 w-full font-semibold font-mono"
                />
                {searchTerm && (
                  <button onClick={() => { setSearchTerm(''); applyFilters(rates, '', selectedStatus); }} className="p-0.5 text-slate-300 hover:text-slate-600 transition">
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* Status Filters */}
              <div className="flex items-center border border-slate-200 bg-white rounded-md p-0.5">
                {['active', 'inactive', 'all'].map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusFilter(status)}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase select-none transition-all rounded-sm ${selectedStatus === status
                      ? 'bg-[#1d5f84] text-white'
                      : 'bg-transparent text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    {t(`itemRate.table.${status}`)}
                  </button>
                ))}
              </div>

              {/* Add/Export Actions */}
              <div className="flex items-center gap-1.5 ml-1">
                <button onClick={() => fetchRates(company.id)} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer" title={t('itemRate.syncVectors')}>
                  <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
                <button onClick={handleExportPDF} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer" title={t('common.pdf')}>
                  <FileText size={13} />
                </button>
                <button onClick={handlePrint} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer" title={t('dangarMaster.print')}>
                  <Printer size={13} />
                </button>
                <button onClick={() => { setEditingRate(null); setShowForm(true); }} className="h-7 flex items-center gap-1.5 px-2.5 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[12px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider">
                  <Plus size={13} />
                  <span>{t('itemRate.initializeTariff')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-2 h-64">
                <RefreshCcw className="animate-spin text-slate-400 mb-2" size={24} />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('itemRate.loadingStreams')}</p>
              </div>
            ) : filteredRates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-center p-4">
                <Box size={32} className="text-slate-300 opacity-30" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('itemRate.noNodesIsolated')}</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 border-collapse text-[12px]">
                <thead className="bg-slate-50 font-sans">
                  <tr>
                    <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('itemRate.table.nomenclature')}</th>
                    <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-32">{t('itemRate.table.systemId')}</th>
                    <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-32">{t('itemRate.table.yieldIndex')}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-32">{t('itemRate.table.timeline')}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-24">{t('itemRate.table.auditStatus')}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 w-24">{t('itemRate.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredRates.map((rate, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-3.5 py-2 border-r border-slate-100">
                        <div className="flex flex-col">
                          <span className={`font-bold text-slate-800 uppercase tracking-wide ${i18n.language === 'gu' ? 'font-prompt text-base' : 'font-sans text-sm font-extrabold'}`}>{displayItemName(rate)}</span>
                          <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            {rate.is_pending_rate ? t('itemRate.table.pendingConfig') : `${t('itemRate.table.inward')}: ₹${parseFloat(rate.purchase_rate || 0).toFixed(2)}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2 border-r border-slate-100">
                        <span className="font-bold text-[#1d5f84] text-[12px] font-mono">#{rate.item_code}</span>
                      </td>
                      <td className="px-3.5 py-2 border-r border-slate-100 text-right font-bold text-slate-800 force-en">
                        <div className="flex flex-col items-end">
                          <span className="text-[12px]">₹{(parseFloat(rate.sale_rate) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          <span className="text-[12px] font-bold text-emerald-600 mt-0.5">{t('itemRate.table.yield')}: {parseFloat(rate.purchase_rate || 0) > 0 ? ((parseFloat(rate.sale_rate || 0) - parseFloat(rate.purchase_rate || 0)) / parseFloat(rate.purchase_rate || 0) * 100).toFixed(1) : '0'}%</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2 border-r border-slate-100 text-center font-mono font-bold text-slate-500 force-en">
                        {new Date(rate.effective_from).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-3.5 py-2 border-r border-slate-100 text-center">
                        <span className={`text-[12px] font-bold px-1.5 py-0.5 rounded-md border uppercase ${rate.is_pending_rate ? 'bg-amber-50 border-amber-200 text-amber-700' : (rate.is_active ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-600')}`}>
                          {rate.is_pending_rate ? t('itemRate.table.pending') : (rate.is_active ? t('itemRate.table.verified') : t('itemRate.table.redacted'))}
                        </span>
                      </td>
                      <td className="px-3.5 py-2">
                        <div className="flex items-center justify-center gap-1.5">
                          {!rate.is_pending_rate && (
                            <button onClick={() => fetchPriceHistory(rate.item_id)} className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 hover:text-emerald-600 transition cursor-pointer" title={t('itemRate.history.title')}>
                              <History size={11} />
                            </button>
                          )}
                          <button onClick={() => handleEdit(rate)} className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 hover:text-[#1d5f84] transition cursor-pointer" title={t('itemRate.editTariff')}>
                            <Edit2 size={11} />
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

      {showHistory && priceHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px] transition-opacity duration-150" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] font-sans text-sm select-none z-10">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <History size={14} className="text-slate-600" />
                <h3 className={`text-sm font-bold text-slate-800 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>{t('itemRate.history.title')}</h3>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition rounded-md cursor-pointer"><X size={15} /></button>
            </div>

            <div className="p-5 bg-white overflow-y-auto flex-1 space-y-3">
              {priceHistory.map((h, i) => (
                <div key={i} className="bg-slate-50 p-4 border border-slate-200 rounded-md space-y-3">
                  <div className="flex justify-between items-center mb-1 border-b border-slate-200 pb-2">
                    <span className="text-[12px] font-bold text-slate-700 font-mono">{new Date(h.effective_from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span className={`text-[12px] font-bold uppercase px-1.5 py-0.5 rounded-sm border ${h.status === 'Active' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>{h.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('itemRate.history.releaseYield')}</p>
                      <p className="text-sm font-bold text-slate-800 font-mono">₹{parseFloat(h.sale_rate).toFixed(2)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('itemRate.history.inwardValue')}</p>
                      <p className="text-sm font-bold text-slate-600 font-mono">₹{parseFloat(h.purchase_rate).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setShowHistory(false)} className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-sm font-bold transition rounded-md uppercase tracking-wide cursor-pointer">{t('common.close') || 'Close'}</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px]" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] z-10">
            <ItemRateForm
              rate={editingRate}
              items={items}
              company={company}
              onSubmit={handleFormSubmit}
              onClose={() => { setShowForm(false); setEditingRate(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
