import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import {
  Plus, Search, Filter, Download,
  Package, PackageCheck, PackageX, Layers,
  Edit3, Trash2, Power, ChevronRight,
  MoreVertical, QrCode, Building2, Tag,
  RefreshCcw, Database, Shield, AlertCircle,
  CheckCircle, Loader, DollarSign, X
} from 'lucide-react'
import ItemForm from '../components/ItemForm'
import { useNavigate } from 'react-router-dom'

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
  const [showForm, setShowForm] = useState(false)
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
      setMessage({ type: 'error', text: t('itemMaster.failedToLoadCompany') })
    }
  }

  const loadItems = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/items/company/${company.id}`)
      if (response.data.success) {
        setItems(response.data.data || [])
        // Extract unique categories
        const uniqueCats = [...new Set(response.data.data.map(i => i.category).filter(Boolean))]
        setCategories(uniqueCats)
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('itemMaster.failedToLoadItems') })
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

  const handleStatusToggle = async (item) => {
    try {
      const endpoint = item.is_active ? 'deactivate' : 'activate'
      const response = await axios.post(`/api/items/${item.id}/${endpoint}`, {}, {
        headers: { 'x-company-id': company.id }
      })
      if (response.data.success) {
        setMessage({ type: 'success', text: t(`itemMaster.item${item.is_active ? 'Deactivated' : 'Activated'}`) })
        loadItems()
        setTimeout(() => setMessage(null), 3000)
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('itemMaster.failedToUpdateStatus') })
    }
  }

  const handleCreateItem = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const handleEditItem = (item) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingItem(null)
    loadItems()
  }

  if (!company && !loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-12 flex items-center justify-center">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-rose-100/50">
            <PackageX size={40} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t('itemMaster.noCompanyFound', 'No Company Found')}</h1>
          <p className="text-slate-500 font-medium leading-relaxed">{t('itemMaster.createCompanyFirst', 'Please setup your company profile before managing the inventory nodes.')}</p>
          <div className="pt-4 flex flex-col gap-3">
            <button
              onClick={() => navigate('/company')}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
            >
              Setup Company Profile
            </button>
            <button
              onClick={loadCompany}
              className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl transition-all"
            >
              {t('userMaster.refresh', 'Refresh System')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-12 px-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => { setShowForm(false); setEditingItem(null); }}
            className="group mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-800 font-bold text-sm transition-colors"
          >
            <div className="p-2 bg-white rounded-2xl border border-slate-200 group-hover:border-slate-800 transition-all">
              <X size={16} />
            </div>
            {t('itemMaster.backToItems', 'Back to Nomenclature Registry')}
          </button>
          <ItemForm
            item={editingItem}
            company={company}
            onSubmit={handleFormSuccess}
            onClose={() => { setShowForm(false); setEditingItem(null); }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-6">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
              <Shield size={12} />
              <span>{t('modules.management', 'Management')} / {t('modules.itemMaster', 'Item Master')}</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{t('itemMaster.nomenclatureRegistry', 'Nomenclature Registry')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 bg-white rounded-2xl px-5 py-3 border border-slate-100 shadow-sm focus-within:border-blue-500 transition-all group">
              <Search size={18} className="text-slate-400 group-focus-within:text-blue-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('itemMaster.searchPlaceholder', 'Search by name, code or optical ID...')}
                className="bg-transparent border-none outline-none text-sm text-slate-600 w-64 placeholder:text-slate-300 font-medium"
              />
            </div>
            <button
              onClick={() => navigate('/rates')}
              className="hidden lg:flex items-center gap-2 bg-white px-6 py-3.5 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 transition-all active:scale-95 shadow-sm"
            >
              <DollarSign size={18} />
              {t('itemRate.title', 'Price Gradients')}
            </button>
            <button
              onClick={handleCreateItem}
              className="flex items-center gap-2 bg-blue-600 px-6 py-3.5 rounded-2xl text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
            >
              <Plus size={20} />
              {t('itemMaster.initializeObject', 'Initialize Object')}
            </button>
          </div>
        </div>

        {/* Global Messages */}
        {message && (
          <div className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300 ${message.type === 'error' ? 'bg-rose-50 border border-rose-100 text-rose-700' : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
            }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <p className="text-sm font-bold">{message.text}</p>
          </div>
        )}

        {/* Stats Grid - No Company Card as requested */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('itemMaster.densityCount', 'Density Count')}</p>
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><Package size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{items.length}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-emerald-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('itemMaster.activeStreams', 'Active Streams')}</p>
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><PackageCheck size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{items.filter(i => i.is_active).length}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-violet-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('itemMaster.sectorIsolation', 'Sector Isolation')}</p>
              <div className="p-2 bg-violet-50 rounded-xl text-violet-600"><Layers size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{categories.length}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-rose-200 transition-all">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('itemMaster.offlineNodes', 'Offline Nodes')}</p>
              <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><PackageX size={16} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{items.filter(i => !i.is_active).length}</p>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <Package size={18} />
              </div>
              <h2 className="text-lg font-bold text-slate-800">{t('itemMaster.operationalRegistry', 'Operational Object Registry')}</h2>
            </div>
            <div className="flex items-center p-1 bg-slate-50 rounded-xl">
              {['all', 'active', 'inactive'].map((filt) => (
                <button
                  key={filt}
                  onClick={() => setStatusFilter(filt)}
                  className={`px-4 py-1.5 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${statusFilter === filt ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {t(`common.${filt}`, filt)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-24 text-center">
              <Loader className="w-10 h-10 text-blue-100 animate-spin mx-auto mb-4" />
              <p className="text-slate-300 font-bold uppercase tracking-widest text-[10px]">{t('itemMaster.synchronizing', 'Synchronizing Inventory Registry...')}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-24 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-slate-200">
                <Database size={40} />
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">{t('itemMaster.noItems', 'No matched nodes found')}</p>
              <button onClick={handleCreateItem} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all active:scale-95 shadow-xl">
                Authorize First Object
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC]">
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('itemMaster.itemName', 'Object Descriptor')}</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('itemMaster.itemCode', 'Object ID')}</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">{t('itemMaster.unit', 'Format')}</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">{t('itemMaster.tax', 'Tariff')}</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">{t('itemMaster.status', 'Protocol')}</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">{t('common.actions', 'Audit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="group hover:bg-blue-50/30 transition-all duration-300">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-sm group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-blue-200 group-hover:shadow-lg">
                            {item.item_name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors uppercase">{item.item_name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest inline-flex items-center gap-1">
                              <Tag size={10} /> {item.category || 'NO_SECTOR'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-2xl border border-slate-200 group-hover:bg-white transition-colors">
                            <span className="text-[10px] font-black text-slate-600 uppercase mono tracking-tighter italic">{item.item_code}</span>
                          </div>
                          <p className="text-[9px] font-medium text-slate-400 flex items-center gap-1 pl-1">
                            <QrCode size={10} className="text-slate-300" /> {item.barcode || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">{item.unit}</span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <p className="text-xs font-black text-slate-800 italic">{(parseFloat(item.tax_percentage) || 0).toFixed(2)}%</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${item.is_active ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            {item.is_active ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                          <button onClick={() => handleEditItem(item)} className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-100 rounded-xl transition-all">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleStatusToggle(item)} className={`p-2.5 bg-white border border-slate-100 rounded-xl transition-all ${item.is_active ? 'text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:shadow-lg hover:shadow-rose-100' : 'text-slate-400 hover:text-emerald-600 hover:border-emerald-100 hover:shadow-lg hover:shadow-emerald-100'}`}>
                            <Power size={16} />
                          </button>
                          <button className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-slate-800 rounded-xl transition-all">
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
    </div>
  )
}
