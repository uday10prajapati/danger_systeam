import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas';
import {
  Plus, Search, Filter, Download,
  Package, PackageCheck, PackageX, Layers,
  Edit3, Trash2, Power, ChevronRight,
  MoreVertical, QrCode, Building2, Tag,
  RefreshCcw, Database, Shield, AlertCircle,
  CheckCircle, Loader, DollarSign, X, Hash, FileText, Printer
} from 'lucide-react'
import ItemForm from '../components/ItemForm'
import Toast from '../components/Toast'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import Loading from '../components/Loading'
import api from '../api'

export default function ItemMaster() {
  const { t, i18n } = useTranslation()
  const [company, setCompany] = useState(null)
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  useEffect(() => {
    loadCompany()
  }, [])

  useEffect(() => {
    if (company) loadItems()
  }, [company, statusFilter])

  const loadCompany = async () => {
    try {
      setLoading(true);
      const response = await api.get('/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      } else {
        setMessage({ type: 'error', text: t('itemMaster.errors.noCompany') });
      }
    } catch (error) {
      console.error('Failed to load company', error);
      setMessage({ type: 'error', text: t('itemMaster.errors.failedLoadContext') });
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/items/company/${company.id}`)
      if (response.data.success) {
        setItems(response.data.data || [])
        const uniqueCats = [...new Set(response.data.data.map(i => i.category).filter(Boolean))]
        setCategories(uniqueCats)
      }
    } catch (error) {
      console.error('Load items error', error)
      setMessage({ type: 'error', text: t('itemMaster.errors.failedLoadItems') })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateItem = () => {
    setEditingItem(null)
    setShowModal(true)
  }

  const handleEditItem = (item) => {
    setEditingItem(item)
    setShowModal(true)
  }

  const handleFormSuccess = (msg) => {
    setShowModal(false)
    setEditingItem(null)
    loadItems()
    setMessage({ type: 'success', text: msg || t('itemMaster.messages.itemSaved') })
  }

  const handleStatusToggle = async (item) => {
    try {
      const endpoint = item.is_active ? 'deactivate' : 'activate'
      const response = await api.post(`/items/${item.id}/${endpoint}`)
      if (response.data.success) {
        setMessage({ type: 'success', text: t('itemMaster.messages.statusUpdatedSuccessfully') })
        loadItems()
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('itemMaster.errors.failedUpdateStatus') })
    }
  }

  const confirmDelete = (item) => {
    setItemToDelete(item)
    setDeleteModalOpen(true)
  }

  const handleDeleteItem = async () => {
    if (!itemToDelete) return
    try {
      setLoading(true)
      await api.delete(`/items/${itemToDelete.id}`)
      setMessage({ type: 'success', text: t('itemMaster.messages.itemDeletedSuccessfully') })
      setDeleteModalOpen(false)
      setItemToDelete(null)
      loadItems()
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || t('itemMaster.errors.deleteFailed') })
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = items.filter(i => {
    const matchesSearch =
      i.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.item_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.barcode?.includes(searchQuery)

    if (statusFilter === 'all') return matchesSearch
    if (statusFilter === 'active') return matchesSearch && i.is_active
    if (statusFilter === 'inactive') return matchesSearch && !i.is_active
    return matchesSearch
  })

  const guDigits = {
    '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
    '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯'
  };

  const toGujaratiDigits = (value) => String(value ?? '').replace(/[0-9]/g, (d) => guDigits[d] || d);

  const handleExportPDF = async () => {
    setLoading(true);

    const cName = company ? (company.company_name || 'Company') : 'Company';
    const reportTitle = 'વસ્તુ માસ્ટર';
    const rows = filteredItems.length ? filteredItems : items;

    if (!rows.length) {
      setMessage({ type: 'error', text: t('itemMaster.noRecords') });
      return;
    }

    const tempWrap = document.createElement('div');
    tempWrap.style.position = 'fixed';
    tempWrap.style.left = '-10000px';
    tempWrap.style.top = '0';
    tempWrap.style.width = '1300px';
    tempWrap.style.background = '#fff';
    tempWrap.style.color = '#111827';
    tempWrap.style.fontFamily = '"NotoGujarati", "Noto Sans Gujarati", Arial, sans-serif';
    tempWrap.style.padding = '24px';

    const tableRows = rows.map((item, idx) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;font-family:Arial,sans-serif !important;">${toGujaratiDigits(idx + 1)}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;font-family:'Prompt',sans-serif !important;">${item.item_name || ''}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;font-family:Arial,sans-serif !important;">${item.item_code || ''}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;">${item.category || ''}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${t(`units.${item.unit}`) || item.unit || ''}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;font-family:Arial,sans-serif !important;">${toGujaratiDigits((parseFloat(item.tax_percentage) || 0).toFixed(2))}%</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${item.is_active ? 'સક્રિય' : 'નિષ્ક્રિય'}</td>
      </tr>
    `).join('');

    tempWrap.innerHTML = `
      <div style="border:1px solid #cbd5e1;">
        <div style="background:#2563eb;color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:18px;font-weight:700;">${cName}</div>
          <div style="font-size:12px;font-weight:700;">${reportTitle}</div>
        </div>
        <div style="padding:18px;">
          <div style="font-size:22px;font-weight:700;color:#1f2937;margin-bottom:6px;">${reportTitle}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:16px;">કુલ વસ્તુઓ: ${toGujaratiDigits(rows.length)} | સ્થાન: ${statusFilter === 'all' ? 'બધા' : (statusFilter === 'active' ? 'સક્રિય' : 'નિષ્ક્રિય')}</div>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px 10px;border:1px solid #d1d5db;">ક્રમ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">વસ્તુનું નામ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">કોડ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">શ્રેણી</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">એકમ</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">કર %</th>
                <th style="padding:8px 10px;border:1px solid #d1d5db;">સ્થિતિ</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot>
              <tr style="background:#f3f4f6;font-weight:700;">
                <td colspan="6" style="padding:8px 10px;border:1px solid #d1d5db;text-align:right;">કુલ વસ્તુઓ:</td>
                <td style="padding:8px 10px;border:1px solid #d1d5db;text-align:center;">${toGujaratiDigits(rows.length)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(tempWrap);

    await new Promise(resolve => setTimeout(resolve, 200));

    const canvas = await html2canvas(tempWrap, { 
      scale: 3, 
      backgroundColor: '#ffffff', 
      useCORS: true,
      allowTaint: false,
      logging: false,
      fontEmbedCSS: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&display=swap'
    });
    document.body.removeChild(tempWrap);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 24;
    const imgW = pageW - margin * 2;
    const pageHpx = ((pageH - margin * 2) * canvas.width) / imgW;

    let y = 0;
    let pageIndex = 0;
    while (y < canvas.height) {
      const sliceHeight = Math.min(pageHpx, canvas.height - y);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      const imgData = pageCanvas.toDataURL('image/png');
      const imgH = (sliceHeight * imgW) / canvas.width;

      if (pageIndex > 0) doc.addPage();
      doc.addImage(imgData, 'PNG', margin, margin, imgW, imgH);

      y += sliceHeight;
      pageIndex += 1;
    }

    doc.save(`Item_Master_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  const handlePrint = () => {
    if (filteredItems.length === 0) {
      alert(t('itemMaster.errors.failedLoadItems'))
      return
    }
    const cName = company ? (company.company_name || 'Company') : 'Company'
    const rows = filteredItems.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="font-family:'Prompt', sans-serif">${item.item_name || '-'}</td>
        <td style="font-family:Arial, sans-serif">${item.item_code || '-'}</td>
        <td style="text-align:right;font-family:Arial, sans-serif"><strong>${toGujaratiDigits(parseFloat(item.purchase_price || 0).toFixed(2))}</strong></td>
        <td style="text-align:right;font-family:Arial, sans-serif"><strong>${toGujaratiDigits(parseFloat(item.sale_price || 0).toFixed(2))}</strong></td>
        <td style="text-align:center">${item.category || 'Misc'}</td>
        <td style="text-align:center">${item.is_active === 1 ? t('itemMaster.active') : t('itemMaster.inactive')}</td>
      </tr>`)

    const win = window.open('', '_blank', 'width=1100,height=800')
    win.document.write(`<html><head><title>${t('itemMaster.print.registryTitle')}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:10px;color:#1e293b;padding:20px}
        .logo-bar{background:#0f172a;color:#fff;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-radius:4px}
        .logo-bar h1{font-size:13px;font-weight:900;text-transform:uppercase}
        .logo-bar span{font-size:9px;color:#94a3b8}
        h2{font-size:18px;font-weight:900;text-transform:uppercase;margin-bottom:2px}
        p.sub{font-size:9px;color:#64748b;margin-bottom:10px}
        hr{border:none;border-top:1px solid #e2e8f0;margin:8px 0}
        table{width:100%;border-collapse:collapse}
        thead tr{background:#0f172a;color:#fff}
        th{padding:7px 8px;font-size:9px;font-weight:700;text-transform:uppercase;text-align:left}
        td{padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:9px}
        tfoot tr{background:#1e293b;color:#fff;font-weight:700}
        @media print{@page{size:A4 portrait;margin:1.5cm}}
      </style></head><body>

      <div class='logo-bar'><h1>${cName}</h1><span>${t('itemMaster.print.registryTitle')} &nbsp;|&nbsp; ${toGujaratiDigits(new Date().toLocaleDateString('en-IN'))}</span></div>
      <h2>${t('itemMaster.print.registryTitle')}</h2>
      <p class='sub'>${t('memberMaster.status')}: ${(statusFilter === 'all' ? (t('itemMaster.table.all') || t('memberMaster.all') || 'બધા') : t(`itemMaster.${statusFilter}`))} &nbsp;|&nbsp; ${t('dangarMaster.records')}: ${toGujaratiDigits(filteredItems.length)} &nbsp;|&nbsp; ${t('itemMaster.pdf.generated')}: ${toGujaratiDigits(new Date().toLocaleString('en-IN'))}</p>
      <hr/>
      <table>
        <thead><tr><th>${t('itemMaster.itemName')}</th><th>${t('itemMaster.code')}</th><th style="text-align:right">${t('itemMaster.print.procurementRate')}</th><th style="text-align:right">${t('itemMaster.print.yieldIndex')}</th><th style="text-align:center">${t('itemMaster.print.class')}</th><th style="text-align:center">${t('itemMaster.print.status')}</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table></body></html>`)
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400)
  }

  const handleDownloadCSV = () => {
    const headers = [
      t('itemMaster.itemName'),
      t('itemMaster.category'),
      t('itemMaster.code'),
      t('itemMaster.unit'),
      t('itemMaster.status')
    ]
    const rows = filteredItems.map(i => [
      `"${i.item_name}"`,
      `"${i.category || ''}"`,
      `"${i.item_code}"`,
      `"${t(`units.${i.unit}`) || i.unit}"`,
      `"${i.is_active ? t('itemMaster.active') : t('itemMaster.inactive')}"`
    ])
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Items_Export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return <Loading />;
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6">
        <Building2 className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">{t('accountMaster.errors.noCompany')}</h2>
        <p className="text-slate-500 mb-6 text-center max-w-md">
          {t('accountMaster.errors.companyDescription')}
        </p>
        <div className="flex gap-4">
          <button onClick={() => window.location.reload()} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCcw className="w-4 h-4 mr-2" /> {t('accountMaster.errors.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans text-zinc-900 select-none animate-none">
      
      {/* Toast Notification */}
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
              <Package size={24} className="text-zinc-600" />
              {t('itemMaster.title')}
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">{t('itemMaster.managementInventory')}</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
            >
              <FileText size={14} /> {t('common.pdf')}</button>
            <button
              onClick={handleCreateItem}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none"
            >
              <Plus size={16} />
              {t('itemMaster.addItem')}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-sm font-sans text-zinc-500 ">{t('itemMaster.totalItems')}</span>
            <span className="text-2xl font-bold font-sans text-zinc-800 mt-1">{toGujaratiDigits(items.length)}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-sm font-sans text-zinc-500 ">{t('itemMaster.activeItems')}</span>
            <span className="text-2xl font-bold font-sans text-zinc-800 mt-1">{toGujaratiDigits(items.filter(i => i.is_active).length)}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-sm font-sans text-zinc-500 ">{t('itemMaster.uniqueCategories')}</span>
            <span className="text-2xl font-bold font-sans text-zinc-800 mt-1">{toGujaratiDigits(categories.length)}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-sm font-sans text-zinc-500 ">{t('itemMaster.inactiveItems')}</span>
            <span className="text-2xl font-bold font-sans text-zinc-800 mt-1">{toGujaratiDigits(items.filter(i => !i.is_active).length)}</span>
          </div>
        </div>

        {/* Dense Minimal Registry Table */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-700  ">
                {t('itemMaster.listTitle')}
              </span>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-sm px-2 py-0.5">
                {toGujaratiDigits(filteredItems.length)} {t('itemMaster.records')}
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-3">
              <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
                <Search size={16} className="text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('itemMaster.searchPlaceholder')}
                  className="bg-transparent border-none outline-none text-xs text-zinc-800 placeholder:text-zinc-400 w-full md:w-48 font-mono"
                />
              </div>
              <div className="flex items-center p-0.5 bg-zinc-200 border border-zinc-300">
                {['all', 'active', 'inactive'].map((filt) => (
                  <button
                    key={filt}
                    onClick={() => setStatusFilter(filt)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase transition select-none ${statusFilter === filt ? 'bg-white text-zinc-800 font-sans font-bold border border-zinc-300' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    {filt === 'all' ? (t('itemMaster.table.all') || t('memberMaster.all') || 'બધા') : t(`itemMaster.${filt}`)}
                  </button>
                ))}
              </div>
              <button
                onClick={loadItems}
                className="p-1.5 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm"
                title={t('itemMaster.refreshRegistry')}
              >
                <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-white">
            {loading && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                <Loader className="animate-spin text-zinc-500" size={24} />
                <p className="text-xs font-mono">{t('itemMaster.loadingData')}</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500 select-none">
                <PackageX size={32} className="text-zinc-400" />
                <p className="text-xs font-mono">{t('itemMaster.noRecords')}</p>
                <button 
                  onClick={handleCreateItem} 
                  className="text-white border border-blue-600 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold mt-2 transition"
                >
                  {t('itemMaster.addFirstItem')}
                </button>
              </div>
            ) : (
              <table className={`w-full text-left border-collapse select-none ${i18n.language === 'gu' ? 'font-sans text-sm' : 'text-xs'}`}>
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">
                    <th className="px-4 py-2 border-r border-zinc-200">{t('itemMaster.itemName')}</th>
                    <th className="px-4 py-2 border-r border-zinc-200 w-32">{t('itemMaster.identity')}</th>
                    <th className="px-4 py-2 border-r border-zinc-200">{t('itemMaster.unitScale')}</th>
                    <th className={`px-4 py-2 border-r border-zinc-200 text-right ${i18n.language === 'gu' ? 'font-sans' : ''}`}>
                      {t('itemMaster.tax')} <span className="text-[10px] font-sans font-normal opacity-60">(%)</span>
                    </th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-center w-24">{t('itemMaster.status')}</th>
                    <th className="px-4 py-2 text-center w-28">{t('itemMaster.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/60 transition-colors duration-300">
                      <td className="px-4 py-2 border-r border-zinc-200 leading-tight">
                        <div className="flex flex-col">
                          <span className={`font-bold text-zinc-800 text-base ${i18n.language === 'gu' ? 'font-prompt' : 'font-sans uppercase italic'}`}>
                            {i18n.language === 'en' ? (item.item_name || item.item_name_gu) : (item.item_name_gu || item.item_name)}
                          </span>
                          {item.item_name_gu && (
                            <span className="text-[10px] font-prompt text-zinc-400 italic">
                              {item.item_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200">
                        <div className="flex flex-col leading-tight">
                          <span 
                            className="inline-flex bg-zinc-100 text-zinc-800 border border-zinc-300 font-bold text-sm px-1.5 py-0.5 w-fit dynamic-en"
                            style={{ '--en-text': `"${item.p_code || item.item_code}"` }}
                            translate="no"
                          ></span>
                          {item.p_code && (
                            <span 
                              className="text-sm text-zinc-400 mt-0.5 dynamic-en"
                              style={{ '--en-text': `"#${item.item_code}"` }}
                              translate="no"
                            ></span>
                          )}
                          {item.category && <span className="text-sm text-zinc-500 mt-0.5">{item.category}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 font-bold text-zinc-700">
                        {t(`units.${item.unit}`) || item.unit}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-right font-bold text-zinc-800 notranslate" translate="no">
                        {toGujaratiDigits((parseFloat(item.tax_percentage) || 0).toFixed(2))}
                        <span className="text-[10px] font-sans font-normal text-zinc-400 ml-0.5">%</span>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold border ${item.is_active ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                          {item.is_active ? t('itemMaster.active') : t('itemMaster.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm"
                            title={t('itemMaster.edit')}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleStatusToggle(item)}
                            className={`p-1 border border-zinc-300 bg-zinc-50 transition shadow-sm ${item.is_active ? 'text-red-600 hover:bg-red-50 hover:border-red-300' : 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'}`}
                            title={item.is_active ? t('itemMaster.deactivate') : t('itemMaster.activate')}
                          >
                            <Power size={13} />
                          </button>
                          <button
                            onClick={() => confirmDelete(item)}
                            className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-red-50 hover:border-red-300 text-zinc-600 hover:text-red-700 transition shadow-sm"
                            title={t('itemMaster.delete')}
                          >
                            <Trash2 size={13} />
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

      {/* Item Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-none" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto bg-white rounded-none border border-zinc-400 shadow-xl">
            <ItemForm
              company={company}
              item={editingItem}
              onSubmit={handleFormSuccess}
              onClose={() => { setShowModal(false); setEditingItem(null); }}
              existingItems={items}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title={t('itemMaster.deleteTitle')}
        message={t('itemMaster.deleteConfirm', { name: itemToDelete?.item_nam || '' })}
        onConfirm={handleDeleteItem}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  )
}
