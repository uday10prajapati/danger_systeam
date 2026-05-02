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
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ItemRateForm from '../components/ItemRateForm';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';
import Toast from '../components/Toast';
import Loading from '../components/Loading';

export default function ItemRate() {
  const { t } = useTranslation();
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
      const res = await axios.get('/api/company');
      if (res.data.success && res.data.data) {
        setCompany(res.data.data);
        fetchRates(res.data.data.id);
        fetchItems(res.data.data.id);
      }
    } catch (err) {
      console.error('Fetch company error:', err);
      setLoading(false);
    }
  };

  const fetchRates = async (companyId) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/item-rates/company/${companyId}`, {
        headers: { 'x-company-id': companyId }
      });
      if (res.data.success) {
        const fetchedRates = res.data.data || [];
        setRateEntries(fetchedRates);
        const mergedRates = mergeRatesWithItems(fetchedRates, items);
        setRates(mergedRates);
        applyFilters(mergedRates, searchTerm, selectedStatus);
      }
    } catch (err) {
      console.error('Fetch rates error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async (companyId) => {
    try {
      const res = await axios.get(`/api/items/company/${companyId}`, {
        headers: { 'x-company-id': companyId }
      });
      if (res.data.success) {
        const fetchedItems = res.data.data || [];
        setItems(fetchedItems);
        const mergedRates = mergeRatesWithItems(rateEntries, fetchedItems);
        setRates(mergedRates);
        applyFilters(mergedRates, searchTerm, selectedStatus);
      }
    } catch (err) {
      console.error('Fetch items error:', err);
    }
  };

  const fetchPriceHistory = async (itemId) => {
    try {
      const res = await axios.get(`/api/item-rates/history/${itemId}`, {
        headers: { 'x-company-id': company.id }
      });
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
        await axios.put(`/api/item-rates/${editingRate.id}`, formData, {
          headers: { 'x-company-id': company.id }
        });
      } else {
        await axios.post('/api/item-rates', formData, {
          headers: { 'x-company-id': company.id }
        });
      }
      setShowForm(false);
      setEditingRate(null);
      fetchRates(company.id);
    } catch (err) {
      console.error('Form submit error:', err);
    }
  };

  const addGujaratiFont = async (doc) => {
    try {
      const res = await fetch('/fonts/NotoSansGujarati-Regular.ttf');
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          doc.addFileToVFS('NotoSansGujarati.ttf', reader.result.split(',')[1]);
          doc.addFont('NotoSansGujarati.ttf', 'NotoGujarati', 'normal');
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (e) { console.warn('Could not load font', e); }
  };

  const handleExportPDF = async () => {
    if (filteredRates.length === 0) {
      setMessage({ type: 'error', text: 'No data available to export.' });
      return;
    }
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    await addGujaratiFont(doc);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 32;
    const navy = [37, 99, 235], white = [255, 255, 255], gray = [100, 116, 139];
    const dark = [30, 41, 59], stripe = [241, 245, 249];

    const cName = company?.company_name || 'Company';

    const hdr = () => {
      const navy = [37, 99, 235], white = [255, 255, 255];
      doc.setFillColor(...navy); doc.rect(0, 0, W, 26, 'F');
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
      doc.text(cName.toUpperCase(), M, 17);
      doc.setFontSize(7); doc.setTextColor(191, 219, 254);
      doc.text('ITEM RATE MASTER REGISTRY', W / 2, 17, { align: 'center' });
      doc.setFontSize(7); doc.setTextColor(239, 68, 68);
      doc.text('CONFIDENTIAL', W - M, 17, { align: 'right' });
    };

    const ftr = (pg, tot) => {
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, H - 18, W - M, H - 18);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text(cName + ' - Tariff Manifest', M, H - 9);
      doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' });
      doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' });
    };

    hdr();
    let y = 55;
    doc.setFont('NotoGujarati', 'bold'); doc.setFontSize(14); doc.setTextColor(...navy);
    doc.text('Item Tariff Manifest', M, y);
    doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gray);
    doc.text('Status: ' + (selectedStatus === 'all' ? 'All Rates' : selectedStatus.toUpperCase()) +
      '   |   Records: ' + filteredRates.length, M, y + 13);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
    y += 28;

    const bodyRows = filteredRates.map(rate => [
      rate.item_name || 'Unknown',
      rate.item_code || '-',
      parseFloat(rate.sale_rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
      rate.effective_from ? new Date(rate.effective_from).toLocaleDateString('en-GB') : '-',
      rate.is_active === 1 ? 'Active' : 'Inactive'
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Category', 'Node Name', 'Code', 'P-Code', 'Unit', 'W-Rate', 'S-Rate', 'Purchase']],
      body: bodyRows,
      styles: { font: 'NotoGujarati', fontSize: 7.5, cellPadding: [4, 5], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
      headStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: stripe },
      theme: 'grid',
      margin: { left: M, right: M },
      columnStyles: {
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' }
      },
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i = 1; i <= tot; i++) { doc.setPage(i); ftr(i, tot); }
    doc.save('Tariff_Manifest_' + new Date().toISOString().split('T')[0] + '.pdf');
  };

  const handlePrint = () => {
    if (filteredRates.length === 0) {
      setMessage({ type: 'error', text: 'No data available to print.' });
      return;
    }
    const cName = company?.company_name || 'Company';
    const rows = filteredRates.map((rate, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="padding: 6px 8px; border: 1px solid #e4e4e7;">${rate.item_name || 'Unknown'}</td>
        <td style="padding: 6px 8px; border: 1px solid #e4e4e7;">${rate.item_code || '-'}</td>
        <td style="padding: 6px 8px; border: 1px solid #e4e4e7; text-align:right"><strong>${parseFloat(rate.sale_rate || 0).toFixed(2)}</strong></td>
        <td style="padding: 6px 8px; border: 1px solid #e4e4e7; text-align:center">${rate.effective_from ? new Date(rate.effective_from).toLocaleDateString('en-GB') : '-'}</td>
        <td style="padding: 6px 8px; border: 1px solid #e4e4e7; text-align:center">${rate.is_active === 1 ? 'ACTIVE' : 'INACTIVE'}</td>
      </tr>`);

    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.write(`<html><head><title>Tariff Manifest</title>
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
      <div class='logo-bar'><h1>${cName}</h1><span>Tariff Manifest &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN')}</span></div>
      <h2>Item Tariff Manifest</h2>
      <p class='sub'>Status: ${(selectedStatus === 'all' ? 'All Rates' : selectedStatus).toUpperCase()} &nbsp;|&nbsp; Records: ${filteredRates.length} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</p>
      <table>
        <thead><tr><th>Nomenclature</th><th>System ID</th><th style="text-align:right">Rate (₹)</th><th style="text-align:center">Effective Date</th><th style="text-align:center">Status</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table></body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  if (!company) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none">
      <Toast message={message} onClose={() => setMessage(null)} />
      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
              <Tag size={20} className="text-zinc-600" />
              Price Gradient Master
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">Management / Tariff Registry</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none uppercase tracking-widest"
            >
              <FileText size={14} /> PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none uppercase tracking-widest"
            >
              <Printer size={14} /> PRINT
            </button>
            <button
              onClick={() => { setEditingRate(null); setShowForm(true); }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm uppercase tracking-widest select-none"
            >
              <Plus size={16} />
              INITIALIZE TARIFF
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 select-none">
          {[
            { label: 'Global Tariffs', val: rates.length },
            { label: 'Verified Nodes', val: rateEntries.filter(r => Number(r.is_active) === 1).length },
            { label: 'Active Inventory', val: new Set(rates.filter(r => r.is_active === 1).map(r => r.item_id)).size },
            { label: 'Audit Protocol', val: 'SYMMETRICAL' }
          ].map((stat, i) => (
            <div key={i} className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between h-24">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{stat.label}</span>
              <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{stat.val}</span>
            </div>
          ))}
        </div>

        {/* Table/Manifest Container */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[500px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex flex-wrap items-center justify-between gap-3">
             <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                   Tariff Manifest
                </span>
                <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5 uppercase">
                   {filteredRates.length} NODES
                </span>
             </div>
             
             <div className="flex items-center flex-wrap gap-2">
               <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500">
                 <Search className="w-4 h-4 text-zinc-400" />
                 <input
                   type="text"
                   placeholder="SEARCH NOMENCLATURE OR SKU..."
                   value={searchTerm}
                   onChange={handleSearch}
                   className="bg-transparent text-xs font-bold text-zinc-700 outline-none w-64 placeholder:text-zinc-300 font-mono"
                 />
               </div>
               
               <div className="flex items-center border border-zinc-300 bg-white p-0.5">
                 {['active', 'inactive', 'all'].map(status => (
                   <button
                     key={status}
                     onClick={() => handleStatusFilter(status)}
                     className={`px-3 py-1 text-[10px] font-bold uppercase select-none transition-all ${
                       selectedStatus === status 
                         ? 'bg-blue-600 text-white' 
                         : 'bg-transparent text-zinc-600 hover:bg-zinc-100'
                     }`}
                   >
                     {status}
                   </button>
                 ))}
               </div>
               
               <button onClick={() => fetchRates(company.id)} className="px-3 py-1.5 bg-blue-600 text-white border border-blue-500 font-bold uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all flex items-center gap-2">
                 <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
                 SYNC VECTORS
               </button>
             </div>
          </div>

          <div className="overflow-x-auto flex-1 bg-white">
            {loading ? (
              <div className="py-20 text-center">
                <RefreshCcw className="animate-spin mx-auto text-blue-500 mb-2" size={24} />
                <p className="text-xs font-bold text-zinc-400 font-mono uppercase tracking-widest">Synchronizing Tariff Streams...</p>
              </div>
            ) : filteredRates.length === 0 ? (
              <div className="py-20 text-center text-zinc-400 font-bold font-mono text-xs uppercase tracking-widest">
                No Tariff Nodes Isolated
              </div>
            ) : (
              <table className="w-full text-left border-collapse font-sans text-xs select-none">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 text-[10px] font-bold text-zinc-600 uppercase tracking-widest select-none">
                    <th className="px-4 py-3 border-r border-zinc-200">Nomenclature</th>
                    <th className="px-4 py-3 border-r border-zinc-200">System ID</th>
                    <th className="px-4 py-3 border-r border-zinc-200 text-right">Yield Index</th>
                    <th className="px-4 py-3 border-r border-zinc-200 text-center">Timeline</th>
                    <th className="px-4 py-3 border-r border-zinc-200 text-center">Audit Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredRates.map((rate, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-2 border-r border-zinc-200">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-zinc-800 uppercase tracking-tight italic leading-tight">{rate.item_name}</span>
                          <span className="text-[9px] text-zinc-400 mt-0.5 uppercase">
                            {rate.is_pending_rate ? 'PENDING CONFIG' : `INWARD: ₹${parseFloat(rate.purchase_rate || 0).toFixed(2)}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200">
                        <span className="text-[10px] font-bold text-zinc-700 font-mono uppercase tracking-wider">{rate.item_code}</span>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-right font-bold text-zinc-800">
                        <div className="flex flex-col items-end">
                          <span>₹{(parseFloat(rate.sale_rate) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Yield: {parseFloat(rate.purchase_rate || 0) > 0 ? ((parseFloat(rate.sale_rate || 0) - parseFloat(rate.purchase_rate || 0)) / parseFloat(rate.purchase_rate || 0) * 100).toFixed(1) : '0'}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-center font-mono font-bold text-zinc-600">
                        {new Date(rate.effective_from).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold border ${rate.is_pending_rate ? 'bg-amber-50 border-amber-300 text-amber-600' : (rate.is_active ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600')}`}>
                          {rate.is_pending_rate ? 'PENDING' : (rate.is_active ? 'VERIFIED' : 'REDACTED')}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          {!rate.is_pending_rate && (
                            <button onClick={() => fetchPriceHistory(rate.item_id)} className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm" title="Chronological Audit">
                              <History size={13} />
                            </button>
                          )}
                          <button onClick={() => handleEdit(rate)} className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm" title="Edit Tariff">
                            <Edit2 size={13} />
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
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-none" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-none border border-zinc-400 shadow-xl overflow-hidden flex flex-col max-h-[90vh] font-mono text-xs select-none">
            <div className="p-4 border-b border-zinc-300 bg-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={16} className="text-zinc-600" />
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest leading-none">Chronological Audit</h3>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-1 text-zinc-400 hover:text-red-600 transition"><X size={18} /></button>
            </div>

            <div className="p-4 bg-white overflow-y-auto flex-1 space-y-4">
              {priceHistory.map((h, i) => (
                <div key={i} className="bg-zinc-50 p-3 border border-zinc-300 space-y-3">
                  <div className="flex justify-between items-center mb-1 border-b border-zinc-200 pb-2">
                    <span className="text-[10px] font-bold text-zinc-800 uppercase font-mono tracking-wider">{new Date(h.effective_from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 border ${h.status === 'Active' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-zinc-200 border-zinc-300 text-zinc-500'}`}>{h.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Release Yield</p>
                      <p className="text-base font-bold text-zinc-800">₹{parseFloat(h.sale_rate).toFixed(2)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Inward Value</p>
                      <p className="text-sm font-bold text-zinc-600">₹{parseFloat(h.purchase_rate).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-zinc-50 border-t border-zinc-300 flex justify-end">
              <button onClick={() => setShowHistory(false)} className="px-4 py-2 bg-blue-600 text-white font-bold uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all select-none">Close Audit</button>
            </div>
          </div>
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-none" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-none border border-zinc-400 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
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
