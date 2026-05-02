import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, AlertCircle, ShoppingCart, RefreshCcw,
  Search, Filter, ChevronDown, Download,
  TrendingUp, TrendingDown, Clock, MoreHorizontal,
  Calendar, ArrowUpRight, Users, LayoutDashboard, Activity, Database, Hash, FileText, Printer
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
        reorders: 500,
        todaysSales: 125400,
        todaysPurchases: 85200,
        inventoryItems: [
          { name: 'Basmati Rice', stock: 450, threshold: 100, status: 'Healthy', statusColor: 'emerald', date: '02/05/2026', daysLeft: '45' },
          { name: 'Wheat Flour', stock: 85, threshold: 100, status: 'Low Stock', statusColor: 'amber', date: '01/05/2026', daysLeft: '12' },
          { name: 'Sugar S-30', stock: 1200, threshold: 500, status: 'Healthy', statusColor: 'emerald', date: '28/04/2026', daysLeft: '60' },
          { name: 'Cooking Oil', stock: 42, threshold: 50, status: 'Critical', statusColor: 'rose', date: '30/04/2026', daysLeft: '5' },
        ],
        supplierInfo: [
          { name: 'Reliance Retail Ltd', products: 12, lastShipment: '01/05/2026', nextShipment: '05/05/2026', contact: 'Mumbai, MH', rating: 5 },
          { name: 'Adani Wilmar', products: 8, lastShipment: '28/04/2026', nextShipment: '03/05/2026', contact: 'Ahmedabad, GJ', rating: 4 },
          { name: 'Tata Consumer', products: 15, lastShipment: '30/04/2026', nextShipment: '07/05/2026', contact: 'Bangalore, KA', rating: 5 },
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  const summaryMetrics = [
    { label: 'Total Inventory Assets', value: stats?.totalItems || '0', unit: 'Units', icon: Package, color: 'text-blue-600' },
    { label: 'Below Threshold Risk', value: stats?.belowThreshold || '0', unit: 'Alerts', icon: AlertCircle, color: 'text-amber-600' },
    { label: 'Critical Stock Level', value: stats?.lowStockCount || '0', unit: 'Items', icon: TrendingDown, color: 'text-red-600' },
    { label: 'Pending Reorders', value: stats?.reorders || '0', unit: 'Orders', icon: RefreshCcw, color: 'text-emerald-600' },
  ]

  const financialFlow = [
    { label: "Today's Gross Liquidity (Sales)", value: stats?.todaysSales || 0, icon: ArrowUpRight, color: 'blue' },
    { label: "Today's Procurement Outflow", value: stats?.todaysPurchases || 0, icon: TrendingDown, color: 'zinc' },
  ]

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans select-none text-zinc-900">
      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-4 space-y-4">
        
        {/* Command Center Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 select-none">
              <LayoutDashboard size={20} className="text-zinc-600" />
              Executive Command Center
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider select-none">Operations / Real-time Analytics</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-600 text-xs font-bold px-3 py-2 rounded-none transition shadow-sm select-none uppercase whitespace-nowrap">
              <Calendar size={14} />
              Fiscal Period: May 2026
            </button>
            <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none uppercase whitespace-nowrap">
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} onClick={fetchStats} />
              SYNC DATA
            </button>
            <button className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-600 text-xs font-bold px-3 py-2 rounded-none transition shadow-sm select-none uppercase whitespace-nowrap">
              <Download size={14} />
              Report
            </button>
          </div>
        </div>

        {/* Intelligence Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 select-none">
          {summaryMetrics.map((metric, idx) => (
            <div key={idx} className="bg-zinc-50 border border-zinc-300 p-2.5 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">{metric.label}</span>
                <metric.icon size={12} className={metric.color} />
              </div>
              <span className="text-lg font-bold font-mono text-zinc-800 mt-0.5">
                {Number(metric.value).toLocaleString()} <span className="text-[9px] text-zinc-400 font-sans">{metric.unit}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Financial Protocol Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {financialFlow.map((card, idx) => (
            <div key={idx} className={`p-4 border flex items-center justify-between transition-all ${
              card.color === 'blue' ? 'bg-blue-600 border-blue-700 text-white' : 'bg-zinc-800 border-zinc-900 text-white'
            }`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 text-white">
                  <card.icon size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">
                    {card.label}
                  </p>
                  <h3 className="text-xl font-black font-mono tracking-tighter">
                    ₹{Number(card.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
              </div>
              <button className="px-4 py-1.5 bg-white text-zinc-900 font-bold text-[9px] uppercase tracking-widest hover:bg-zinc-100 transition-colors rounded-none border border-white">
                View Ledger
              </button>
            </div>
          ))}
        </div>

        {/* Analytical Operations Center */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Inventory Surveillance Registry */}
          <div className="lg:col-span-8 bg-white border border-zinc-300 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between select-none">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-blue-600" />
                <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-wider">
                  Inventory Surveillance Registry
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white border border-zinc-300 px-2 py-1">
                  <Search size={10} className="text-zinc-400" />
                  <input type="text" placeholder="Filter stream..." className="bg-transparent border-none outline-none text-[9px] text-zinc-600 w-32 placeholder:text-zinc-300 font-mono uppercase" />
                </div>
                <button className="text-blue-600 text-[9px] font-bold hover:underline uppercase tracking-widest">
                  Detailed View
                </button>
              </div>
            </div>

            <div className="overflow-x-auto scroller-airy">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-300 text-zinc-500 font-mono text-[9px]">
                  <tr>
                    <th className="px-4 py-2.5 uppercase tracking-widest font-bold border-r border-zinc-200">Nomenclature</th>
                    <th className="px-4 py-2.5 uppercase tracking-widest font-bold border-r border-zinc-200 text-right">Current</th>
                    <th className="px-4 py-2.5 uppercase tracking-widest font-bold border-r border-zinc-200 text-right">Limit</th>
                    <th className="px-4 py-2.5 uppercase tracking-widest font-bold border-r border-zinc-200 text-center">Protocol Status</th>
                    <th className="px-4 py-2.5 uppercase tracking-widest font-bold">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {stats?.inventoryItems?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-2 text-[10.5px] font-bold text-zinc-800 uppercase border-r border-zinc-100">{item.name}</td>
                      <td className="px-4 py-2 text-[10.5px] font-mono text-right text-zinc-600 border-r border-zinc-100">{item.stock} <span className="text-[9px] text-zinc-400">U</span></td>
                      <td className="px-4 py-2 text-[10.5px] font-mono text-right text-zinc-400 border-r border-zinc-100">{item.threshold}</td>
                      <td className="px-4 py-2 text-center border-r border-zinc-100">
                        <span className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-tighter border ${
                          item.statusColor === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          item.statusColor === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                          'bg-red-50 text-red-600 border-red-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[10.5px] text-zinc-400 font-mono italic">{item.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Distribution Analytics */}
          <div className="lg:col-span-4 bg-white border border-zinc-300 shadow-sm p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-2">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-zinc-400" />
                <h2 className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">Asset Allocation</h2>
              </div>
              <ChevronDown size={14} className="text-zinc-300" />
            </div>

            <div className="relative flex justify-center py-6">
              <svg width="140" height="140" viewBox="0 0 36 36" className="transform -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#F4F4F5" strokeWidth="4"></circle>
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#2563EB" strokeWidth="4" strokeDasharray="40 60" strokeDashoffset="0"></circle>
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#71717A" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="-40"></circle>
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#D4D4D8" strokeWidth="4" strokeDasharray="35 65" strokeDashoffset="-65"></circle>
              </svg>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-[8px] font-mono font-bold text-zinc-400 uppercase">Equity</p>
                <p className="text-lg font-black text-zinc-800 font-mono leading-none">100%</p>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {[
                { label: 'Primary Portfolio', value: '40.0%', color: 'bg-blue-600' },
                { label: 'Reserve Assets', value: '25.0%', color: 'bg-zinc-500' },
                { label: 'Secondary Stock', value: '35.0%', color: 'bg-zinc-200' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-zinc-50 pb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 ${item.color}`} />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">{item.label}</span>
                  </div>
                  <span className="text-[10px] font-black text-zinc-800 font-mono">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Global Logistics Provider Registry */}
        <div className="bg-white border border-zinc-300 shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-zinc-600" />
              <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-wider">
                Authorized Logistics & Supplier Registry
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1 text-zinc-400 hover:text-zinc-800 transition-colors">
                <Filter size={12} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-50 border-b border-zinc-300 text-zinc-500 font-mono text-[9px]">
                <tr>
                  <th className="px-4 py-2.5 uppercase tracking-widest font-bold border-r border-zinc-200">Legal Name</th>
                  <th className="px-4 py-2.5 uppercase tracking-widest font-bold border-r border-zinc-200 text-right">SKU Count</th>
                  <th className="px-4 py-2.5 uppercase tracking-widest font-bold border-r border-zinc-200">Last Inbound</th>
                  <th className="px-4 py-2.5 uppercase tracking-widest font-bold border-r border-zinc-200">Expected Arrival</th>
                  <th className="px-4 py-2.5 uppercase tracking-widest font-bold border-r border-zinc-200">Operational Hub</th>
                  <th className="px-4 py-2.5 uppercase tracking-widest font-bold text-center">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {stats?.supplierInfo?.map((sup, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-2 text-[10.5px] font-bold text-zinc-800 uppercase border-r border-zinc-100">{sup.name}</td>
                    <td className="px-4 py-2 text-[10.5px] font-mono text-right text-zinc-600 border-r border-zinc-100">{sup.products} <span className="text-[9px] text-zinc-400">Lines</span></td>
                    <td className="px-4 py-2 text-[10.5px] font-mono text-zinc-500 border-r border-zinc-100">{sup.lastShipment}</td>
                    <td className="px-4 py-2 text-[10.5px] font-mono text-blue-600 font-bold border-r border-zinc-100 italic">{sup.nextShipment}</td>
                    <td className="px-4 py-2 text-[10.5px] text-zinc-400 uppercase border-r border-zinc-100">{sup.contact}</td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-0.5 opacity-60 grayscale group-hover:grayscale-0 transition-all">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className={`text-[10px] ${s <= sup.rating ? 'text-blue-600' : 'text-zinc-200'}`}>●</span>
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
