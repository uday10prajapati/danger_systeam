import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import {
  Plus, Search, Filter, Download,
  Package, PackageCheck, PackageX, Layers,
  Edit3, Trash2, Power, ChevronRight,
  MoreVertical, QrCode, Building2, Tag,
  RefreshCcw, Database, Shield, AlertCircle,
  CheckCircle, Loader, DollarSign, X, Hash
} from 'lucide-react'
import ItemForm from '../components/ItemForm'
import { useNavigate } from 'react-router-dom'
import TableHeading from '../components/TableHeading'
import PageHeader from '../components/PageHeader'

export default function ItemMaster() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  useEffect(() => {
    loadCompany()
  }, [])

  useEffect(() => {
    if (company) loadItems()
  }, [company, statusFilter])

  const loadCompany = async () => {
    try {
      const response = await axios.get('/api/company')
      if (response.data.success && response.data.data) {
        setCompany(response.data.data)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load company context.' })
    }
  }

  const loadItems = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/items/company/${company.id}`)
      if (response.data.success) {
        setItems(response.data.data || [])
        const uniqueCats = [...new Set(response.data.data.map(i => i.category).filter(Boolean))]
        setCategories(uniqueCats)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load inventory nodes.' })
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

  const handleFormSuccess = () => {
    setShowModal(false)
    setEditingItem(null)
    loadItems()
    setMessage({ type: 'success', text: 'Item saved successfully.' })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleStatusToggle = async (item) => {
    try {
      const endpoint = item.is_active ? 'deactivate' : 'activate'
      const response = await axios.post(`/api/items/${item.id}/${endpoint}`, {}, {
        headers: { 'x-company-id': company.id }
      })
      if (response.data.success) {
        setMessage({ type: 'success', text: `Item ${item.is_active ? 'deactivated' : 'activated'} successfully.` })
        loadItems()
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update status.' })
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

  const handleDownloadCSV = () => {
    const headers = ['Item Name', 'Category', 'Code', 'Unit', 'Status'];
    const rows = filteredItems.map(i => [
      `"${i.item_name}"`,
      `"${i.category || ''}"`,
      `"${i.item_code}"`,
      `"${i.unit}"`,
      `"${i.is_active ? 'Active' : 'Inactive'}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Items_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!company && !loading) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
        <Loader className="animate-spin text-blue-500" size={40} />
        <p className="font-bold text-slate-400 uppercase tracking-widest">Loading Inventory Data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-6">

        <PageHeader
          eyebrow="Management / Inventory"
          eyebrowIcon={<Shield size={12} />}
          title="Item Master"
          subtitle="Manage product nomenclature and inventory nodes"
        >
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 bg-white rounded-lg px-4 py-2.5 border border-slate-200 shadow-sm focus-within:border-blue-500 transition-all group">
              <Search size={16} className="text-slate-400 group-focus-within:text-blue-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="bg-transparent border-none outline-none text-xs text-slate-600 w-48 placeholder:text-slate-300 font-bold"
              />
            </div>
            <button
              onClick={handleDownloadCSV}
              className="hidden lg:flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 transition-all active:scale-95 shadow-sm"
            >
              <Download size={16} /> Export
            </button>
            <button
              onClick={handleCreateItem}
              className="flex items-center gap-2 bg-blue-600 px-6 py-2.5 rounded-lg text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-95"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>
        </PageHeader>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top duration-300 border-l-4 ${
            message.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'
          }`}>
            {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span className="text-xs font-bold uppercase tracking-wider">{message.text}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Density Count', val: items.length, icon: <Package size={18} />, color: 'blue' },
            { label: 'Active Streams', val: items.filter(i => i.is_active).length, icon: <PackageCheck size={18} />, color: 'emerald' },
            { label: 'Sector Isolation', val: categories.length, icon: <Layers size={18} />, color: 'violet' },
            { label: 'Offline Nodes', val: items.filter(i => !i.is_active).length, icon: <PackageX size={18} />, color: 'rose' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-100 transition-all">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <div className={`p-2 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg group-hover:scale-110 transition-transform`}>{stat.icon}</div>
              </div>
              <p className="text-xl font-black text-slate-800">{stat.val}</p>
            </div>
          ))}
        </div>

        {/* Table View */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6 min-h-[500px] flex flex-col">
          <TableHeading
            icon={<Package size={18} />}
            iconColor="blue"
            title="Item Registry"
            subtitle={`Total ${filteredItems.length} nomenclature nodes registered`}
          >
            <div className="flex items-center p-1 bg-slate-50 rounded-lg border border-slate-200">
              {['all', 'active', 'inactive'].map((filt) => (
                <button
                  key={filt}
                  onClick={() => setStatusFilter(filt)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    statusFilter === filt ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {filt}
                </button>
              ))}
            </div>
          </TableHeading>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-32">
              <RefreshCcw size={48} className="animate-spin text-blue-100 mb-6" />
              <p className="text-slate-300 font-bold uppercase tracking-widest text-[10px] italic">Synchronizing Registry...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-32 text-center">
              <Database size={48} className="text-slate-200 mb-6" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-10 italic">No matched nodes found</p>
              <button onClick={handleCreateItem} className="px-10 py-3 bg-blue-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-100 active:scale-95">
                Authorize First Object
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto scroller-airy">
              <table className="w-full text-left">
                <thead className="bg-[#F8FAFC]">
                  <tr className="uppercase tracking-widest font-black text-slate-400 text-[10px]">
                    <th className="px-6 py-5 border-r border-slate-50/50">Item Nomenclature</th>
                    <th className="px-6 py-5 border-r border-slate-50/50">Code / Optical ID</th>
                    <th className="px-6 py-5 border-r border-slate-50/50">Unit / Scale</th>
                    <th className="px-6 py-5 border-r border-slate-50/50 text-right">Tax (%)</th>
                    <th className="px-6 py-5 border-r border-slate-50/50 text-center">Status</th>
                    <th className="px-6 py-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-black text-sm transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:scale-110 shadow-sm">
                            {item.item_name[0]}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight italic">{item.item_name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest inline-flex items-center gap-1">
                                <Tag size={10} className="text-slate-300" /> {item.category || 'NO_SECTOR'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-0.5 rounded text-[10px] font-bold text-slate-500 uppercase tracking-tighter italic border border-slate-200">
                            <Hash size={10} /> {item.item_code}
                          </div>
                          {item.barcode && (
                            <p className="text-[10px] font-bold text-slate-300 flex items-center gap-1 pl-1 italic">
                              <QrCode size={10} /> {item.barcode}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">{item.unit}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <p className="text-xs font-black text-slate-800 italic">{(parseFloat(item.tax_percentage) || 0).toFixed(2)}%</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] border shadow-sm ${item.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-400 border-rose-100'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
                            {item.is_active ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEditItem(item)} className="p-2.5 bg-white border border-slate-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleStatusToggle(item)} className={`p-2.5 bg-white border border-slate-100 rounded-lg shadow-sm transition-all active:scale-95 ${item.is_active ? 'text-rose-500 hover:bg-rose-600 hover:text-white' : 'text-emerald-500 hover:bg-emerald-600 hover:text-white'}`}>
                            <Power size={16} />
                          </button>
                          <button className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-slate-800 rounded-lg transition-all shadow-sm">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Item Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto scroller-airy">
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
    </div>
  )
}
