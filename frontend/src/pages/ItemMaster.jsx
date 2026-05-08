import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
  const { t } = useTranslation()
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
        setMessage({ type: 'error', text: 'No company found. Please create a company in Company Master.' });
      }
    } catch (error) {
      console.error('Failed to load company', error);
      setMessage({ type: 'error', text: 'Failed to load company context. Please check if backend is running.' });
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
      setMessage({ type: 'error', text: 'Failed to load items.' })
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
    setMessage({ type: 'success', text: msg || 'Item saved successfully.' })
  }

  const handleStatusToggle = async (item) => {
    try {
      const endpoint = item.is_active ? 'deactivate' : 'activate'
      const response = await api.post(`/items/${item.id}/${endpoint}`)
      if (response.data.success) {
        setMessage({ type: 'success', text: `Item ${item.is_active ? 'deactivated' : 'activated'} successfully.` })
        loadItems()
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update status.' })
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
      setMessage({ type: 'success', text: 'Item deleted successfully.' })
      setDeleteModalOpen(false)
      setItemToDelete(null)
      loadItems()
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Delete failed.' })
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

  const addGujaratiFont = async (doc) => {
    try {
      const res = await fetch('/fonts/NotoSansGujarati-Regular.ttf')
      const blob = await res.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1]
          doc.addFileToVFS('NotoSansGujarati.ttf', base64)
          doc.addFont('NotoSansGujarati.ttf', 'NotoGujarati', 'normal')
          resolve()
        }
        reader.readAsDataURL(blob)
      })
    } catch (e) {
      console.warn('Could not load Gujarati font', e)
    }
  }

  const handleExportPDF = async () => {
    const cName = company ? (company.company_name || 'Company') : 'Company'
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    await addGujaratiFont(doc)
    const W = doc.internal.pageSize.getWidth()
    const H = doc.internal.pageSize.getHeight()
    const M = 32
    const navy = [15, 23, 42], white = [255, 255, 255], gray = [100, 116, 139]
    const dark = [30, 41, 59], stripe = [241, 245, 249]

    const hdr = () => {
      doc.setFillColor(...navy); doc.rect(0, 0, W, 26, 'F')
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...white)
      doc.text(cName.toUpperCase(), M, 17)
      doc.setFontSize(7); doc.setTextColor(148, 163, 184)
      doc.text('ITEM MASTER REGISTRY', W / 2, 17, { align: 'center' })
      doc.setFontSize(7); doc.setTextColor(239, 68, 68)
      doc.text('CONFIDENTIAL', W - M, 17, { align: 'right' })
    }

    const ftr = (pg, tot) => {
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4)
      doc.line(M, H - 18, W - M, H - 18)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray)
      doc.text(cName + ' - Item Master', M, H - 9)
      doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' })
      doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' })
    }

    hdr()
    let y = 40
    y += 15

    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...navy)
    doc.text('Item Master Registry', M, y)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...gray)
    doc.text('Filter: ' + (statusFilter === 'all' ? 'All Items' : statusFilter.toUpperCase()) + '   |   Generated: ' + new Date().toLocaleString('en-IN'), M, y + 13)
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18)
    y += 28

    const bodyRows = filteredItems.map(item => [
      item.item_name || '-',
      item.item_code || '-',
      item.barcode || '-',
      item.category || 'Uncategorized',
      item.unit || '-',
      (parseFloat(item.tax_percentage) || 0).toFixed(2) + '%',
      item.is_active ? 'Active' : 'Inactive'
    ])

    autoTable(doc, {
      startY: y,
      head: [['Item Name', 'Code', 'Barcode', 'Category', 'Unit', 'Tax %', 'Status']],
      body: bodyRows,
      foot: [['', '', '', '', '', 'TOTAL ITEMS', filteredItems.length + ' Nodes']],
      styles: { font: 'helvetica', fontSize: 7.5, cellPadding: [4, 5], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
      headStyles: { font: 'helvetica', fillColor: navy, textColor: white },
      footStyles: { font: 'helvetica', fillColor: [30, 41, 59], textColor: white },
      alternateRowStyles: { fillColor: stripe },
      theme: 'grid',
      margin: { left: M, right: M }
    })

    const tot = doc.internal.getNumberOfPages()
    for (let i = 1; i <= tot; i++) { doc.setPage(i); ftr(i, tot) }
    doc.save('Item_Master_' + new Date().toISOString().split('T')[0] + '.pdf')
  }

  const handlePrint = () => {
    if (filteredItems.length === 0) {
      alert('No data available to print.')
      return
    }
    const cName = company ? (company.company_name || 'Company') : 'Company'
    const rows = filteredItems.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td>${item.item_name || '-'}</td>
        <td>${item.item_code || '-'}</td>
        <td style="text-align:right"><strong>${parseFloat(item.purchase_price || 0).toFixed(2)}</strong></td>
        <td style="text-align:right"><strong>${parseFloat(item.sale_price || 0).toFixed(2)}</strong></td>
        <td style="text-align:center">${item.category || 'Misc'}</td>
        <td style="text-align:center">${item.is_active === 1 ? 'ACTIVE' : 'INACTIVE'}</td>
      </tr>`)

    const win = window.open('', '_blank', 'width=1100,height=800')
    win.document.write(`<html><head><title>Item Master Registry</title>
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

      <div class='logo-bar'><h1>${cName}</h1><span>Item Master Registry &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN')}</span></div>
      <h2>Item Master Registry</h2>
      <p class='sub'>Status: ${(statusFilter === 'all' ? 'All Items' : statusFilter).toUpperCase()} &nbsp;|&nbsp; Records: ${filteredItems.length} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</p>
      <hr/>
      <table>
        <thead><tr><th>Nomenclature</th><th>System ID</th><th style="text-align:right">Procurement Rate</th><th style="text-align:right">Yield Index (Rate)</th><th style="text-align:center">Class</th><th style="text-align:center">Status</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table></body></html>`)
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400)
  }

  const handleDownloadCSV = () => {
    const headers = ['Item Name', 'Category', 'Code', 'Unit', 'Status']
    const rows = filteredItems.map(i => [
      `"${i.item_name}"`,
      `"${i.category || ''}"`,
      `"${i.item_code}"`,
      `"${i.unit}"`,
      `"${i.is_active ? 'Active' : 'Inactive'}"`
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
        <h2 className="text-xl font-bold text-slate-800 mb-2">Company Context Missing</h2>
        <p className="text-slate-500 mb-6 text-center max-w-md">
          We couldn't load the company information. This usually happens if no company has been created yet or the connection to the server was lost.
        </p>
        <div className="flex gap-4">
          <button onClick={() => window.location.reload()} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCcw className="w-4 h-4 mr-2" /> Retry Connection
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
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
              <Package size={20} className="text-zinc-600" />
              Item Registry Master
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">Management / Inventory</p>
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
              <FileText size={14} /> PDF
            </button>
            <button
              onClick={handleCreateItem}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none"
            >
              <Plus size={16} />
              ADD ITEM
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Total Items</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{items.length}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Active Items</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{items.filter(i => i.is_active).length}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Unique Categories</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{categories.length}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Inactive Items</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{items.filter(i => !i.is_active).length}</span>
          </div>
        </div>

        {/* Dense Minimal Registry Table */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                Item List
              </span>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5">
                {filteredItems.length} RECORDS
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-3">
              <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
                <Search size={16} className="text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className="bg-transparent border-none outline-none text-xs text-zinc-800 placeholder:text-zinc-400 w-full md:w-48 font-mono"
                />
              </div>
              <div className="flex items-center p-0.5 bg-zinc-200 border border-zinc-300">
                {['all', 'active', 'inactive'].map((filt) => (
                  <button
                    key={filt}
                    onClick={() => setStatusFilter(filt)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase transition select-none ${statusFilter === filt ? 'bg-white text-zinc-800 font-mono font-bold border border-zinc-300' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    {filt}
                  </button>
                ))}
              </div>
              <button
                onClick={loadItems}
                className="p-1.5 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm"
                title="Refresh Registry"
              >
                <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-white">
            {loading && items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                <Loader className="animate-spin text-zinc-500" size={24} />
                <p className="text-xs font-mono">LOADING REGISTRY DATA...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500 select-none">
                <PackageX size={32} className="text-zinc-400" />
                <p className="text-xs font-mono">NO ITEM RECORDS FOUND</p>
                <button 
                  onClick={handleCreateItem} 
                  className="text-white border border-blue-600 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold mt-2 transition"
                >
                  ADD FIRST ITEM NODE
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse font-mono text-xs select-none">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">
                    <th className="px-4 py-2 border-r border-zinc-200">Item Name</th>
                    <th className="px-4 py-2 border-r border-zinc-200 w-32">Identity</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Unit / Scale</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">Tax (%)</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-center w-24">Status</th>
                    <th className="px-4 py-2 text-center w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/60 transition-colors duration-300">
                      <td className="px-4 py-2 border-r border-zinc-200 font-sans font-bold tracking-tight text-zinc-800 uppercase italic">
                        {item.item_name}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200">
                        <div className="flex flex-col leading-tight">
                          <span className="inline-flex bg-zinc-100 text-zinc-800 border border-zinc-300 font-bold text-[9px] px-1.5 py-0.5 w-fit">
                            {item.p_code || item.item_code}
                          </span>
                          {item.p_code && <span className="text-[9px] text-zinc-400 mt-0.5">#{item.item_code}</span>}
                          {item.category && <span className="text-[9px] text-zinc-500 mt-0.5 uppercase italic">{item.category}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 font-bold text-zinc-700">
                        {item.unit}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-right font-bold text-zinc-800">
                        {(parseFloat(item.tax_percentage) || 0).toFixed(2)}%
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold border ${item.is_active ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                          {item.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition shadow-sm"
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleStatusToggle(item)}
                            className={`p-1 border border-zinc-300 bg-zinc-50 transition shadow-sm ${item.is_active ? 'text-red-600 hover:bg-red-50 hover:border-red-300' : 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300'}`}
                            title={item.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <Power size={13} />
                          </button>
                          <button
                            onClick={() => confirmDelete(item)}
                            className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-red-50 hover:border-red-300 text-zinc-600 hover:text-red-700 transition shadow-sm"
                            title="Delete"
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
        title="DELETE ITEM RECORD"
        message={`ARE YOU SURE YOU WANT TO DELETE THE ITEM "${itemToDelete?.item_name?.toUpperCase() || ''}"? THIS ACTION CANNOT BE UNDONE.`}
        onConfirm={handleDeleteItem}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  )
}
