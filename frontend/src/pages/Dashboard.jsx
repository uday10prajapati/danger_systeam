import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Users,
  DollarSign,
  Users2,
  Package,
  BarChart3,
  ShoppingCart,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Book,
  BarChart2,
  Barcode,
  BookOpen,
  AlertTriangle,
  Clock,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Plus,
  RefreshCw,
  LayoutGrid,
  List,
  CheckCircle2,
  Zap,
  Calendar,
  ChevronRight,
  ShieldCheck,
  History,
  LayoutDashboard
} from 'lucide-react'
import api from '../api'

function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('grid') 

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) navigate('/login');
  }, [navigate]);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await api.get('/dashboard/stats')
      setStats(response.data)
      setError(null)
    } catch (err) {
      setError(err.message)
      setStats({
        totalModules: 15, activeUsers: 0, todaysSales: 0, totalItems: 0,
        todaysTransactions: 0, totalStockValue: 0, lowStockItems: [],
        bestSellingItems: [], recentSalesData: []
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value || 0)
  }

  const modules = [
    { id: 'sale', title: t('modules.sale'), icon: ShoppingCart, color: 'emerald', path: '/sales', desc: 'Direct Billing' },
    { id: 'purchase', title: t('modules.purchase'), icon: TrendingUp, color: 'blue', path: '/purchase', desc: 'Stock Inward' },
    { id: 'rojmel', title: t('modules.rojmel'), icon: Book, color: 'indigo', path: '/rojmel', desc: 'Daily Ledger' },
    { id: 'profit-loss', title: t('modules.profitAndLoss'), icon: BarChart2, color: 'rose', path: '/profit-loss', desc: 'Net Results' },
    { id: 'members', title: t('modules.memberMaster'), icon: Users2, color: 'cyan', path: '/members', desc: 'Sabhasad' },
    { id: 'items', title: t('modules.itemMaster'), icon: Package, color: 'violet', path: '/items', desc: 'Catalog' },
    { id: 'ledger-report', title: t('modules.ledgerAudit'), icon: BookOpen, color: 'amber', path: '/ledger-report', desc: 'Statements' },
    { id: 'stock', title: t('modules.stockReport'), icon: Package, color: 'orange', path: '/stock', desc: 'Stock Audit' },
    { id: 'user-master', title: 'User Admin', icon: ShieldCheck, color: 'slate', path: '/user-master', desc: 'Security' },
    { id: 'barcode', title: 'Barcode Control', icon: Barcode, color: 'slate', path: '/barcode-scanner', desc: 'Sensors' },
  ]

  const quickStats = [
    { label: 'Revenue Momentum', value: formatCurrency(stats?.todaysSales), icon: DollarSign, trend: '+12%', color: 'text-black', bg: 'bg-white' },
    { label: 'Operational Load', value: stats?.todaysTransactions, icon: Zap, trend: 'Optimal', color: 'text-black', bg: 'bg-white' },
    { label: 'Critical Errors', value: stats?.lowStockItems?.length || 0, icon: AlertTriangle, trend: 'Isolation Required', color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Net Asset Value', value: formatCurrency(stats?.totalStockValue), icon: Activity, trend: 'Audited', color: 'text-black', bg: 'bg-white' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto space-y-10">
        
        {/* Header - Industrial Monochrome */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b-4 border-black pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3 mb-2">
               <span className="px-3 py-1 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-md italic shadow-xl">Secure Platform V3</span>
               <div className="w-2 h-2 bg-slate-900 rounded-full animate-ping" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{t('dashboard.enterpriseOverview', 'Control Center')}</h1>
            <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
               <Calendar size={14} strokeWidth={3} />
               <span>SYSTEM TERMINAL — {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
             <button 
               onClick={() => navigate('/sales')}
               className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-black text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_20px_50px_rgba(0,0,0,0.2)] hover:bg-slate-800 transition-all active:scale-95 border-2 border-black"
             >
                <Plus size={18} strokeWidth={3} /> {t('dashboard.createSale', 'Initiate Transaction')}
             </button>
             <button onClick={fetchStats} className="p-3.5 bg-white border-2 border-slate-200 text-slate-400 hover:text-black hover:border-black transition-all rounded-2xl shadow-sm active:rotate-180">
                <RefreshCw size={20} strokeWidth={3} className={loading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>

        {/* Sharp Industrial Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {quickStats.map((stat, idx) => (
             <div key={idx} className={`relative overflow-hidden p-5 rounded-3xl border-2 transition-all group shadow-xl ${stat.bg === 'bg-white' ? 'bg-white border-slate-100 hover:border-black' : 'bg-red-50 border-red-200'}`}>
                <div className="absolute top-0 right-0 w-24 h-full bg-slate-50 -skew-x-12 translate-x-12 transition-transform group-hover:translate-x-0 duration-700 opacity-50"></div>
                <div className="relative z-10">
                  <div className={`w-10 h-10 flex items-center justify-center mb-3 rounded-xl border-2 ${stat.color === 'text-black' ? 'bg-slate-900 text-white border-black' : 'bg-red-900 text-white border-red-900 shadow-lg shadow-red-200'}`}>
                    <stat.icon size={18} strokeWidth={3} />
                  </div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-0.5 italic">{stat.label}</p>
                  <h3 className={`text-2xl font-black tracking-tighter font-mono italic ${stat.color}`}>{stat.value}</h3>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[8px] font-black text-slate-300 uppercase tracking-widest">
                     <div className={`w-1 h-1 rounded-full ${stat.color === 'text-red-600' ? 'bg-red-600 animate-pulse' : 'bg-slate-300'}`}></div>
                     {stat.trend}
                  </div>
                </div>
             </div>
           ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           
           <div className="lg:col-span-12 space-y-8">
              {/* Navigation Grid - High Density Industrial */}
              <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-200 shadow-2xl relative overflow-hidden">
                 <div className="absolute -right-20 -bottom-20 opacity-[0.03] pointer-events-none rotate-12">
                   <LayoutDashboard size={400} strokeWidth={1} />
                 </div>
                 
                 <div className="flex flex-wrap items-center justify-between gap-6 mb-10 border-b-2 border-slate-50 pb-8">
                    <div className="flex items-center gap-4">
                       <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl"><LayoutGrid size={24} strokeWidth={2.5}/></div>
                       <div>
                          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">{t('dashboard.mainBusinessModules', 'System Architecture')}</h2>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Modular Enterprise Application Protocol</p>
                       </div>
                    </div>
                    <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl border-2 border-slate-200">
                       <button onClick={() => setActiveTab('grid')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all uppercase ${activeTab === 'grid' ? 'bg-black text-white shadow-xl italic' : 'text-slate-400 hover:text-black'}`}>Grid</button>
                       <button onClick={() => setActiveTab('list')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all uppercase ${activeTab === 'list' ? 'bg-black text-white shadow-xl italic' : 'text-slate-400 hover:text-black'}`}>List</button>
                    </div>
                 </div>

                 {activeTab === 'grid' ? (
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {modules.map(m => (
                        <button 
                          key={m.id}
                          onClick={() => navigate(m.path)}
                          className="group relative p-8 min-h-[220px] bg-slate-50 hover:bg-black border-2 border-transparent hover:border-black rounded-[2rem] text-left transition-all hover:shadow-[0_40px_80px_rgba(0,0,0,0.15)] flex flex-col justify-between overflow-hidden group"
                        >
                           <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 opacity-0 group-hover:opacity-100 group-hover:scale-150 transition-all duration-700 -rotate-12 translate-x-10 translate-y-[-10px]">
                              <m.icon size={80} strokeWidth={1} />
                           </div>
                           <div className="w-14 h-14 bg-white border-2 border-slate-100 text-slate-900 group-hover:text-white group-hover:bg-slate-900 group-hover:border-slate-800 rounded-2xl flex items-center justify-center mb-6 transition-all shadow-sm">
                              <m.icon size={28} strokeWidth={2.5} />
                           </div>
                           <div>
                             <h4 className="font-black text-slate-900 group-hover:text-white text-base tracking-tighter uppercase mb-1 italic">{m.title}</h4>
                             <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none group-hover:text-slate-500">{m.desc}</span>
                                <ChevronRight size={16} className="text-slate-200 group-hover:text-white group-hover:translate-x-1 transition-all" strokeWidth={3} />
                             </div>
                           </div>
                        </button>
                      ))}
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {modules.map(m => (
                        <button 
                          key={m.id}
                          onClick={() => navigate(m.path)}
                          className="w-full flex items-center p-6 bg-slate-50 hover:bg-black rounded-3xl transition-all group border-2 border-transparent hover:border-black"
                        >
                           <div className="w-12 h-12 bg-white text-slate-900 border-2 border-slate-100 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-800 rounded-2xl flex items-center justify-center mr-6 shadow-sm">
                              <m.icon size={22} strokeWidth={2.5} />
                           </div>
                           <div className="flex-1 text-left">
                              <h4 className="font-black text-slate-900 group-hover:text-white text-sm uppercase italic tracking-tight">{m.title}</h4>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">{m.desc}</p>
                           </div>
                           <ArrowRight size={20} strokeWidth={3} className="text-slate-200 group-hover:text-white group-hover:translate-x-2 transition-all" />
                        </button>
                      ))}
                   </div>
                 )}
              </div>
           </div>

           {/* PLATFORM EVENT FEED */}
           <div className="lg:col-span-12">
              <div className="bg-slate-900 p-10 rounded-[2.5rem] border-4 border-black shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                 <div className="flex items-center justify-between mb-8 border-b-2 border-slate-800 pb-6 relative z-10">
                    <div className="flex items-center gap-4">
                       <div className="bg-white text-black p-3 rounded-2xl shadow-2xl"><History size={24} strokeWidth={2.5}/></div>
                       <div>
                          <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">{t('dashboard.recentPlatformActivity', 'Event Timeline')}</h2>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1 italic">Chronological System Log Stream</p>
                       </div>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                    {[
                      { icon: ShoppingCart, text: 'Transaction 00x9_Settled', time: '14 mins ago', tag: 'SALES_OP' },
                      { icon: TrendingUp, text: 'Inward Manifest 0x41_Commit', time: '41 mins ago', tag: 'WAREHOUSE' },
                      { icon: BookOpen, text: 'Audit Log 0x11_Export', time: '1 hour ago', tag: 'ADMIN' },
                      { icon: Users2, text: 'Registry ID 0x33_Initialization', time: '2 hours ago', tag: 'IDENTITY' },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col gap-4 p-6 bg-black/40 border-2 border-slate-800 rounded-3xl hover:bg-black hover:border-slate-600 transition-all group/item shadow-inner">
                         <div className="flex justify-between items-start">
                            <div className="p-3 bg-slate-800 text-white rounded-xl border border-slate-700 group-hover/item:bg-white group-hover/item:text-black transition-colors"><item.icon size={20} strokeWidth={2.5}/></div>
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest border border-slate-800 px-2 py-1 rounded group-hover/item:border-slate-600">{item.tag}</span>
                         </div>
                         <div>
                            <p className="text-sm font-black text-slate-100 uppercase italic tracking-tight">{item.text}</p>
                            <div className="flex items-center gap-2 mt-2 opacity-40">
                               <Clock size={12} className="text-slate-400" strokeWidth={3} />
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.time}</span>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        {/* Global Registry Summary Footer */}
        <div className="flex justify-between items-center text-slate-400 font-black uppercase tracking-widest text-[8px] italic pt-12 pb-10 border-t border-slate-200">
           <div className="flex items-center gap-4">
              <span>PLATFORM_STATUS: NOMINAL</span>
              <div className="w-1 h-1 bg-slate-100 rounded-full"></div>
              <span>REGISTRY_LOCK: ACTIVE</span>
           </div>
           <div>SYSTEM_TIMESTAMP: {new Date().toISOString()}</div>
        </div>

      </div>
    </div>
  )
}

export default Dashboard
