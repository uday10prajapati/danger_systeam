import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, AlertCircle, ShoppingCart, RefreshCw,
  Search, Filter, ChevronDown, Download,
  TrendingUp, TrendingDown, Clock, MoreHorizontal,
  Calendar, ArrowUpRight, Users
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../api'

function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) navigate('/login');
    fetchStats();
  }, [navigate]);

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await api.get('/dashboard/stats')
      setStats(response.data)
    } catch (err) {
      setStats({
        totalItems: 1500,
        lowStockCount: 420,
        belowThreshold: 800,
        reorders: 500
      })
    } finally {
      setLoading(false)
    }
  }

  const summaryCards = [
    { label: t('dashboard.stats.totalProducts', 'Total Products in Inventory'), value: stats?.totalItems || '0', unit: 'items', trend: '+0.00% vs last month', isUp: true, icon: Package, color: 'blue' },
    { label: t('dashboard.stats.belowThreshold', 'Products Below Threshold'), value: stats?.belowThreshold || '0', unit: 'items', trend: 'Audit Required', isUp: false, icon: TrendingDown, color: 'green' },
    { label: t('dashboard.stats.lowStock', 'Low Stock Products'), value: stats?.lowStockCount || '0', unit: 'items', trend: 'Immediate Action', isUp: true, icon: TrendingUp, color: 'rose' },
    { label: t('dashboard.stats.reorders', 'Reorders Needed'), value: stats?.reorders || '0', unit: 'items', trend: 'Auto-Stock Linked', isUp: false, icon: RefreshCw, color: 'amber' },
  ]

  const financialCards = [
    { label: "Today's Gross Sales", value: `₹${(stats?.todaysSales || 0).toLocaleString()}`, icon: ArrowUpRight, color: 'blue' },
    { label: "Today's Purchases", value: `₹${(stats?.todaysPurchases || 0).toLocaleString()}`, icon: TrendingDown, color: 'rose' },
  ]

  const inventoryItems = stats?.inventoryItems || []

  const supplierInfo = stats?.supplierInfo || []

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t('dashboard.inventoryManagement', 'Inventory Management')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
              <Calendar size={18} />
              {t('dashboard.thisMonth', 'This Month')}
              <ChevronDown size={16} />
            </button>
            <button className="flex items-center gap-2 bg-blue-600 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95">
              {t('dashboard.export', 'Export')}
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {summaryCards.map((card, idx) => (
            <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-semibold text-slate-400 group-hover:text-slate-500 transition-colors">{card.label}</p>
                <div className={`p-2 rounded-xl border ${card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                    card.color === 'green' ? 'bg-emerald-50 text-emerald-600' :
                      card.color === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                  <card.icon size={20} />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-2xl font-bold text-slate-800">{card.value}</h3>
                <span className="text-sm font-semibold text-slate-400">{card.unit}</span>
              </div>
              <div className="flex items-center gap-1">
                {card.isUp ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-rose-500" />}
                <span className={`text-xs font-bold ${card.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {card.trend}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Financial Flow Shards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {financialCards.map((card, idx) => (
            <div key={idx} className={`p-6 rounded-[2.5rem] border flex items-center justify-between shadow-sm hover:shadow-md transition-all ${card.color === 'blue' ? 'bg-blue-600 border-blue-700 text-white shadow-blue-100' : 'bg-white border-slate-100 text-slate-800'
              }`}>
              <div className="flex items-center gap-5">
                <div className={`p-4 rounded-2xl ${card.color === 'blue' ? 'bg-white/10 text-white' : 'bg-rose-50 text-rose-600'}`}>
                  <card.icon size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${card.color === 'blue' ? 'text-blue-100' : 'text-slate-400'}`}>
                    {card.label}
                  </p>
                  <h3 className="text-2xl font-black font-mono tracking-tighter">
                    {card.value}
                  </h3>
                </div>
              </div>
              <button className={`px-5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${card.color === 'blue' ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200'
                }`}>
                {idx === 0 ? 'View Sales' : 'View Purchases'}
              </button>
            </div>
          ))}
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">

          {/* Inventory Status Overview */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <TrendingUp size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-800">{t('dashboard.inventoryStatus', 'Inventory Status Overview')}</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2 border border-slate-100">
                  <Search size={16} className="text-slate-400" />
                  <input type="text" placeholder={t('dashboard.search', 'Search here...')} className="bg-transparent border-none outline-none text-xs text-slate-600 w-32 placeholder:text-slate-300" />
                </div>
                <button className="text-blue-600 text-sm font-bold hover:underline flex items-center gap-1">
                  {t('dashboard.seeAll', 'See All')} <Download size={14} className="rotate-270" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    {[
                      t('dashboard.table.productName', 'Product Name'),
                      t('dashboard.table.currentStock', 'Current Stock'),
                      t('dashboard.table.threshold', 'Threshold'),
                      t('dashboard.table.statusCol', 'Status'),
                      t('dashboard.table.lastRestocked', 'Last Restocked'),
                      t('dashboard.table.daysLeft', 'Days Left')
                    ].map((head) => (
                      <th key={head} className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {inventoryItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5 text-sm font-bold text-slate-700">{item.name}</td>
                      <td className="px-8 py-5 text-sm font-semibold text-slate-500">{item.stock}</td>
                      <td className="px-8 py-5 text-sm font-semibold text-slate-500">{item.threshold}</td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${item.statusColor === 'amber' ? 'bg-amber-50 text-amber-600' :
                            item.statusColor === 'orange' ? 'bg-orange-50 text-orange-600' :
                              'bg-rose-50 text-rose-600'
                          }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-sm font-semibold text-slate-500">{item.date}</td>
                      <td className="px-8 py-5 text-sm font-semibold text-slate-500">{item.daysLeft}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity/Chart Section */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-slate-800">{t('dashboard.inventoryDistribution', 'Inventory Distribution')}</h2>
              <button className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-2xl text-xs font-bold text-slate-500 border border-slate-100">
                {t('dashboard.monthly', 'Monthly')} <ChevronDown size={14} />
              </button>
            </div>

            {/* Donut Chart SVG */}
            <div className="relative flex justify-center mb-10">
              <svg width="200" height="200" viewBox="0 0 36 36" className="transform -rotate-90 scale-125">
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#E2E8F0" strokeWidth="3"></circle>
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#EAB308" strokeWidth="3" strokeDasharray="25 75" strokeDashoffset="0"></circle>
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#2563EB" strokeWidth="3" strokeDasharray="20 80" strokeDashoffset="-25"></circle>
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#22C55E" strokeWidth="3" strokeDasharray="15 85" strokeDashoffset="-45"></circle>
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#D1D5DB" strokeWidth="3" strokeDasharray="40 60" strokeDashoffset="-60"></circle>
              </svg>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-xs font-bold text-slate-400">Total</p>
                <p className="text-xl font-black text-slate-800">1.3k</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: t('dashboard.distribution.grocery', 'Grocery Products'), value: '40%', color: 'bg-slate-300' },
                { label: t('dashboard.distribution.dairy', 'Dairy Products'), value: '25%', color: 'bg-yellow-400' },
                { label: t('dashboard.distribution.fresh', 'Fresh Produce'), value: '20%', color: 'bg-blue-600' },
                { label: t('dashboard.distribution.bakery', 'Bakery Products'), value: '15%', color: 'bg-emerald-500' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm font-semibold text-slate-500">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Supplier Information */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <Users size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-800">{t('dashboard.supplierInfo', 'Supplier Information')}</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2 border border-slate-100">
                <Search size={16} className="text-slate-400" />
                <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-xs text-slate-600 w-full sm:w-48 placeholder:text-slate-300" />
              </div>
              <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-800 transition-all"><Filter size={18} /></button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  {[
                    t('dashboard.table.supplierName', 'Supplier Name'),
                    t('dashboard.table.productsSupplied', 'Products Supplied'),
                    t('dashboard.table.lastShipment', 'Last Shipment Date'),
                    t('dashboard.table.nextExpected', 'Next Expected Shipment'),
                    t('dashboard.table.contactInfo', 'Contact Info'),
                    t('dashboard.table.rating', 'Supplier Rating')
                  ].map((head) => (
                    <th key={head} className="px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {supplierInfo.map((sup, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5 text-sm font-bold text-slate-700">{sup.name}</td>
                    <td className="px-8 py-5 text-sm font-semibold text-slate-500">{sup.products}</td>
                    <td className="px-8 py-5 text-sm font-semibold text-slate-500">{sup.lastShipment}</td>
                    <td className="px-8 py-5 text-sm font-semibold text-slate-500">{sup.nextShipment}</td>
                    <td className="px-8 py-5 text-sm font-semibold text-slate-500">{sup.contact}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className={`w-3 h-3 ${s <= sup.rating ? 'text-yellow-400' : 'text-slate-200'}`}>★</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Dashboard
