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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addGujaratiFont } from '../utils/pdfFonts';
import ItemRateForm from '../components/ItemRateForm';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';
import Toast from '../components/Toast';
import Loading from '../components/Loading';
import html2canvas from 'html2canvas';

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

  const buildTariffManifestHTML = () => {
    const cName = company?.company_name_gu || company?.company_name || 'Company';
    const reportTitle = t('itemRate.print.tariffManifest');

    const tableRows = filteredRates.map((rate, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding:10px;border:1px solid #d1d5db;text-align:center;">${toGujaratiDigits(idx + 1)}</td>
        <td style="padding:10px;border:1px solid #d1d5db;font-family:'NotoGujarati', 'Noto Sans Gujarati', sans-serif;font-weight:700;">${rate.item_name_gu || rate.item_name}</td>
        <td style="padding:10px;border:1px solid #d1d5db;text-align:center;font-weight:bold;">${rate.item_code || '-'}</td>
        <td style="padding:10px;border:1px solid #d1d5db;text-align:right;font-weight:900;">₹${parseFloat(rate.sale_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="padding:10px;border:1px solid #d1d5db;text-align:center;">${new Date(rate.effective_from).toLocaleDateString('en-GB')}</td>
        <td style="padding:10px;border:1px solid #d1d5db;text-align:center;">
          <span style="font-size:10px;font-weight:800;padding:2px 6px;border:1px solid #d1d5db;background:#f8fafc;">
            ${rate.is_active === 1 ? t('itemRate.table.verified') : t('itemRate.table.redacted')}
          </span>
        </td>
      </tr>
    `).join('');

    return `
      <div style="width:1000px;background:#fff;color:#111827;font-family:'NotoGujarati', 'Noto Sans Gujarati', Arial, sans-serif;padding:30px;border:1px solid #cbd5e1;">
        <div style="background:#2563eb;color:#fff;padding:20px 25px;display:flex;justify-content:space-between;align-items:center;margin-bottom:25px;">
          <div style="font-size:24px;font-weight:900;">${cName}</div>
          <div style="font-size:14px;font-weight:700;opacity:0.9;letter-spacing:1px;">${reportTitle}</div>
        </div>
        
        <div style="margin-bottom:20px;">
          <h2 style="font-size:28px;font-weight:900;color:#1e293b;margin-bottom:8px;">${reportTitle}</h2>
          <div style="font-size:13px;color:#64748b;display:flex;gap:15px;padding-bottom:15px;border-bottom:2px solid #f1f5f9;">
            <span>${t('memberMaster.status')}: <b>${selectedStatus === 'all' ? t('common.all') : t(`itemRate.table.${selectedStatus}`)}</b></span>
            <span>${t('dangarMaster.records')}: <b>${filteredRates.length}</b></span>
            <span>${t('itemRate.pdf.generated')}: <b>${new Date().toLocaleString('en-IN')}</b></span>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:12px 10px;border:1px solid #d1d5db;text-align:center;">#</th>
              <th style="padding:12px 10px;border:1px solid #d1d5db;text-align:left;">${t('itemRate.table.nomenclature')}</th>
              <th style="padding:12px 10px;border:1px solid #d1d5db;text-align:center;">${t('itemRate.table.systemId')}</th>
              <th style="padding:12px 10px;border:1px solid #d1d5db;text-align:right;">${t('itemRate.table.yieldIndex')}</th>
              <th style="padding:12px 10px;border:1px solid #d1d5db;text-align:center;">${t('itemRate.table.timeline')}</th>
              <th style="padding:12px 10px;border:1px solid #d1d5db;text-align:center;">${t('itemRate.table.auditStatus')}</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    `;
  };

  const handleExportPDF = async () => {
    if (filteredRates.length === 0) {
      setMessage({ type: 'error', text: translateServerMessage(t('itemMaster.errors.failedLoadItems')) });
      return;
    }
    
    setLoading(true);
    try {
      const tempWrap = document.createElement('div');
      tempWrap.style.position = 'fixed';
      tempWrap.style.left = '-10000px';
      tempWrap.style.top = '0';
      tempWrap.style.width = '1000px';
      tempWrap.style.background = '#fff';
      tempWrap.innerHTML = buildTariffManifestHTML();
      document.body.appendChild(tempWrap);

      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await new Promise(r => setTimeout(r, 500));

      const canvas = await html2canvas(tempWrap, { 
        scale: 2.5, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false 
      });
      document.body.removeChild(tempWrap);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 32;
      const imgW = pageW - margin * 2;
      const pageHpx = ((pageH - margin * 2) * canvas.width) / imgW;

      let yPos = 0;
      let pIdx = 0;
      while (yPos < canvas.height) {
        const sliceH = Math.min(pageHpx, canvas.height - yPos);
        const pCanvas = document.createElement('canvas');
        pCanvas.width = canvas.width;
        pCanvas.height = sliceH;
        const ctx = pCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pCanvas.width, pCanvas.height);
        ctx.drawImage(canvas, 0, yPos, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

        if (pIdx > 0) doc.addPage();
        doc.addImage(pCanvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, (sliceH * imgW) / canvas.width);
        
        yPos += sliceH;
        pIdx++;
      }
      
      doc.save('Tariff_Manifest_' + new Date().toISOString().split('T')[0] + '.pdf');
    } catch (err) {
      console.error('PDF Export Error:', err);
      setMessage({ type: 'error', text: translateServerMessage('PDF Generation Failed') });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (filteredRates.length === 0) {
      setMessage({ type: 'error', text: translateServerMessage(t('itemMaster.errors.failedLoadItems')) });
      return;
    }
    const cName = company?.company_name || 'Company';
    const rows = filteredRates.map((rate, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="padding: 6px 8px; border: 1px solid #e4e4e7;">${rate.item_name || 'Unknown'}</td>
        <td style="padding: 6px 8px; border: 1px solid #e4e4e7;">${rate.item_code || '-'}</td>
        <td style="padding: 6px 8px; border: 1px solid #e4e4e7; text-align:right"><strong>${parseFloat(rate.sale_rate || 0).toFixed(2)}</strong></td>
        <td style="padding: 6px 8px; border: 1px solid #e4e4e7; text-align:center">${rate.effective_from ? new Date(rate.effective_from).toLocaleDateString('en-GB') : '-'}</td>
        <td style="padding: 6px 8px; border: 1px solid #e4e4e7; text-align:center">${rate.is_active === 1 ? t('itemRate.table.verified') : t('itemRate.table.redacted')}</td>
      </tr>`);

    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.write(`<html><head><title>${t('itemRate.print.tariffManifest')}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:10px;color:#18181b;padding:30px}
        .logo-bar{background:#2563eb;color:#fff;padding:8px 15px;display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-radius:0}
        .logo-bar h1{font-size:12px;font-weight:900;text-transform:uppercase}
        .logo-bar span{font-size:8px;color:#dbeafe}
        h2{font-size:16px;font-weight:bold;text-transform:uppercase;margin-bottom:4px;color:#18181b}
        p.sub{font-size:8px;color:#71717a;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px}
        table{width:100%;border-collapse:collapse;border:1px solid #18181b}
        th{padding:8px;font-size:9px;font-weight:bold;text-transform:uppercase;background:#f4f4f5;border:1px solid #18181b;text-align:left}
        td{font-size:10px}
        @media print{@page{size:A4 portrait;margin:0}}
      </style></head><body>
      <div class='logo-bar'><h1>${cName}</h1><span>${t('itemRate.print.tariffManifest')} &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN')}</span></div>
      <h2>${t('itemRate.print.tariffManifest')}</h2>
      <p class='sub'>${t('memberMaster.status')}: ${(selectedStatus === 'all' ? t('common.all') : t(`itemRate.table.${selectedStatus}`))} &nbsp;|&nbsp; ${t('dangarMaster.records')}: ${filteredRates.length} &nbsp;|&nbsp; ${t('itemRate.pdf.generated')}: ${new Date().toLocaleString('en-IN')}</p>
      <table>
        <thead><tr><th>${t('itemRate.table.nomenclature')}</th><th>${t('itemRate.table.systemId')}</th><th style="text-align:right">${t('itemRate.table.yieldIndex')} (₹)</th><th style="text-align:center">${t('itemRate.table.timeline')}</th><th style="text-align:center">${t('itemRate.table.auditStatus')}</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table></body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
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
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
              <span className={`text-[13px] font-bold font-sans text-slate-800 mt-1 ${i < 3 ? 'force-en' : 'font-prompt'}`}>{stat.val}</span>
            </div>
          ))}
        </div>

        {/* Table/Manifest Container */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none">
          {/* Table Control Header Bar */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
             <div className="flex items-center gap-2">
                <span className={`text-xs font-extrabold text-slate-800 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
                   {t('itemRate.title')}
                </span>
                <span className="bg-slate-200 text-slate-600 font-bold force-en text-[9px] px-1.5 py-0.5 rounded-sm">
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
                   className="bg-transparent border-none outline-none text-xs text-slate-700 placeholder:text-slate-300 w-full font-semibold font-mono"
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
                     className={`px-2.5 py-1 text-[10px] font-bold uppercase select-none transition-all rounded-sm ${
                       selectedStatus === status 
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
                 <button onClick={() => { setEditingRate(null); setShowForm(true); }} className="h-7 flex items-center gap-1.5 px-2.5 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[11px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider">
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
              <table className="min-w-full divide-y divide-slate-200 border-collapse text-[11px]">
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
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            {rate.is_pending_rate ? t('itemRate.table.pendingConfig') : `${t('itemRate.table.inward')}: ₹${parseFloat(rate.purchase_rate || 0).toFixed(2)}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2 border-r border-slate-100">
                        <span className="font-bold text-[#1d5f84] text-[11px] font-mono">#{rate.item_code}</span>
                      </td>
                      <td className="px-3.5 py-2 border-r border-slate-100 text-right font-bold text-slate-800 force-en">
                        <div className="flex flex-col items-end">
                          <span className="text-[11px]">₹{(parseFloat(rate.sale_rate) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          <span className="text-[9px] font-bold text-emerald-600 mt-0.5">{t('itemRate.table.yield')}: {parseFloat(rate.purchase_rate || 0) > 0 ? ((parseFloat(rate.sale_rate || 0) - parseFloat(rate.purchase_rate || 0)) / parseFloat(rate.purchase_rate || 0) * 100).toFixed(1) : '0'}%</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2 border-r border-slate-100 text-center font-mono font-bold text-slate-500 force-en">
                        {new Date(rate.effective_from).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-3.5 py-2 border-r border-slate-100 text-center">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase ${rate.is_pending_rate ? 'bg-amber-50 border-amber-200 text-amber-700' : (rate.is_active ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-600')}`}>
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
          <div className="relative w-full max-w-lg bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] font-sans text-xs select-none z-10">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <History size={14} className="text-slate-600" />
                <h3 className={`text-xs font-bold text-slate-800 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>{t('itemRate.history.title')}</h3>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition rounded-md cursor-pointer"><X size={15} /></button>
            </div>

            <div className="p-5 bg-white overflow-y-auto flex-1 space-y-3">
              {priceHistory.map((h, i) => (
                <div key={i} className="bg-slate-50 p-4 border border-slate-200 rounded-md space-y-3">
                  <div className="flex justify-between items-center mb-1 border-b border-slate-200 pb-2">
                    <span className="text-[11px] font-bold text-slate-700 font-mono">{new Date(h.effective_from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm border ${h.status === 'Active' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>{h.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('itemRate.history.releaseYield')}</p>
                      <p className="text-sm font-bold text-slate-800 font-mono">₹{parseFloat(h.sale_rate).toFixed(2)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('itemRate.history.inwardValue')}</p>
                      <p className="text-sm font-bold text-slate-600 font-mono">₹{parseFloat(h.purchase_rate).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setShowHistory(false)} className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold transition rounded-md uppercase tracking-wide cursor-pointer">{t('common.close') || 'Close'}</button>
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
