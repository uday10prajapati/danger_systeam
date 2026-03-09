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
  TrendingUpIcon,
  Clock,
  Activity,
  Loader,
} from 'lucide-react'
import api from '../api'

function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await api.get('/dashboard/stats')
        setStats(response.data)
        setError(null)
      } catch (err) {
        console.error('Error fetching dashboard stats:', err)
        setError(err.message)
        // Set default values on error
        setStats({
          totalModules: 15,
          activeUsers: 0,
          todaysSales: 0,
          totalItems: 0,
          todaysTransactions: 0,
          totalStockValue: 0,
          lowStockItems: [],
          bestSellingItems: [],
          recentSalesData: [],
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  // Format number with commas
  const formatNumber = (value) => {
    return (value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const modules = [
    {
      id: 'company',
      title: t('modules.company'),
      description: t('modules.manageCompanyDetails'),
      icon: Building2,
      color: 'from-blue-500 to-blue-600',
      path: '/company',
    },
    {
      id: 'users',
      title: t('modules.userMaster'),
      description: t('modules.manageSystemUsers'),
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      path: '/users',
    },
    {
      id: 'accounts',
      title: t('modules.accountMaster'),
      description: t('modules.manageAccounts'),
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      path: '/accounts',
    },
    {
      id: 'members',
      title: t('modules.memberMaster'),
      description: t('modules.manageMembers'),
      icon: Users2,
      color: 'from-orange-500 to-orange-600',
      path: '/members',
    },
    {
      id: 'items',
      title: t('modules.itemMaster'),
      description: t('modules.manageInventoryItems'),
      icon: Package,
      color: 'from-red-500 to-red-600',
      path: '/items',
    },
    {
      id: 'rates',
      title: t('modules.itemRate'),
      description: t('modules.manageItemPricing'),
      icon: BarChart3,
      color: 'from-pink-500 to-pink-600',
      path: '/rates',
    },
    {
      id: 'sales',
      title: t('modules.sale'),
      description: t('modules.recordSalesTransactions'),
      icon: ShoppingCart,
      color: 'from-cyan-500 to-cyan-600',
      path: '/sales',
    },
    {
      id: 'sales-return',
      title: t('modules.saleReturn'),
      description: t('modules.manageSalesReturns'),
      icon: RotateCcw,
      color: 'from-indigo-500 to-indigo-600',
      path: '/sales-return',
    },
    {
      id: 'purchase',
      title: t('modules.purchase'),
      description: t('modules.recordPurchases'),
      icon: TrendingUp,
      color: 'from-lime-500 to-lime-600',
      path: '/purchase',
    },
    {
      id: 'purchase-return',
      title: t('modules.purchaseReturn'),
      description: t('modules.managePurchaseReturns'),
      icon: TrendingDown,
      color: 'from-amber-500 to-amber-600',
      path: '/purchase-return',
    },
    {
      id: 'barcode',
      title: t('modules.barcodeScanner'),
      description: t('modules.scanAndManageBarcodes'),
      icon: Barcode,
      color: 'from-teal-500 to-teal-600',
      path: '/barcode',
    },
    {
      id: 'cashbook',
      title: t('modules.cashBook'),
      description: t('modules.manageCashTransactions'),
      icon: Book,
      color: 'from-yellow-500 to-yellow-600',
      path: '/cashbook',
    },
    {
      id: 'ledger',
      title: t('modules.accountLedger'),
      description: t('modules.viewAccountDetails'),
      icon: BookOpen,
      color: 'from-violet-500 to-violet-600',
      path: '/ledger',
    },
    {
      id: 'profit-loss',
      title: t('modules.profitAndLoss'),
      description: t('modules.viewPnLStatements'),
      icon: BarChart2,
      color: 'from-rose-500 to-rose-600',
      path: '/profit-loss',
    },
    {
      id: 'stock',
      title: t('modules.stockReport'),
      description: t('modules.viewStockDetails'),
      icon: Package,
      color: 'from-slate-500 to-slate-600',
      path: '/stock',
    },
  ]

  return (
    <div className="min-h-screen bg-linear-to-br from-white via-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-linear-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">{t('dashboard.superstore')}</h1>
              <p className="text-slate-600">{t('dashboard.completeBusinessManagement')}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">{t('dashboard.dashboard')}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          {/* Total Modules Card */}
          <div className="bg-linear-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 text-sm font-semibold">{t('dashboard.totalModules')}</p>
                {loading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Loader className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-blue-900 mt-1">{stats?.totalModules || 0}</p>
                )}
              </div>
              <Building2 className="w-10 h-10 text-blue-500 opacity-80" />
            </div>
          </div>

          {/* Active Users Card */}
          <div className="bg-linear-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-700 text-sm font-semibold">{t('dashboard.activeUsers')}</p>
                {loading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Loader className="w-5 h-5 animate-spin text-green-600" />
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-green-900 mt-1">{stats?.activeUsers || 0}</p>
                )}
              </div>
              <Users className="w-10 h-10 text-green-500 opacity-80" />
            </div>
          </div>

          {/* Today's Sales Card */}
          <div className="bg-linear-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-700 text-sm font-semibold">{t('dashboard.todaysSales')}</p>
                {loading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Loader className="w-5 h-5 animate-spin text-purple-600" />
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-purple-900 mt-1">{formatCurrency(stats?.todaysSales || 0)}</p>
                )}
              </div>
              <ShoppingCart className="w-10 h-10 text-purple-500 opacity-80" />
            </div>
          </div>

          {/* Total Items Card */}
          <div className="bg-linear-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-700 text-sm font-semibold">{t('dashboard.totalItems')}</p>
                {loading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Loader className="w-5 h-5 animate-spin text-orange-600" />
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-orange-900 mt-1">{stats?.totalItems || 0}</p>
                )}
              </div>
              <Package className="w-10 h-10 text-orange-500 opacity-80" />
            </div>
          </div>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {/* Today's Transactions */}
          <div className="bg-linear-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-700 text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Today's Transactions
                </p>
                {loading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Loader className="w-5 h-5 animate-spin text-red-600" />
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-red-900 mt-1">{stats?.todaysTransactions || 0}</p>
                )}
              </div>
              <Activity className="w-10 h-10 text-red-500 opacity-80" />
            </div>
          </div>

          {/* Total Stock Value */}
          <div className="bg-linear-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-700 text-sm font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Total Stock Value
                </p>
                {loading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Loader className="w-5 h-5 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-indigo-900 mt-1">{formatCurrency(stats?.totalStockValue || 0)}</p>
                )}
              </div>
              <TrendingUpIcon className="w-10 h-10 text-indigo-500 opacity-80" />
            </div>
          </div>

          {/* Low Stock Items Alert */}
          <div className="bg-linear-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-700 text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Low Stock Items
                </p>
                {loading ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Loader className="w-5 h-5 animate-spin text-amber-600" />
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-amber-900 mt-1">{stats?.lowStockItems?.length || 0}</p>
                )}
              </div>
              <AlertTriangle className="w-10 h-10 text-amber-500 opacity-80" />
            </div>
          </div>
        </div>

        {/* Detailed Cards Section */}
        {!loading && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
            {/* Low Stock Items Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Low Stock Items
              </h3>
              {stats.lowStockItems && stats.lowStockItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Item Name</th>
                        <th className="text-right py-2 px-2 font-semibold text-slate-700">Stock</th>
                        <th className="text-right py-2 px-2 font-semibold text-slate-700">Reorder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.lowStockItems.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-2 text-slate-900">{item.item_name}</td>
                          <td className="text-right py-2 px-2">
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                              {item.stock_quantity || 0}
                            </span>
                          </td>
                          <td className="text-right py-2 px-2 text-slate-600">{item.reorder_level || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-600">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>All items are well stocked</p>
                </div>
              )}
            </div>

            {/* Best Selling Items */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Best Selling Items (30 Days)
              </h3>
              {stats.bestSellingItems && stats.bestSellingItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="text-left py-2 px-2 font-semibold text-slate-700">Item Name</th>
                        <th className="text-right py-2 px-2 font-semibold text-slate-700">Qty Sold</th>
                        <th className="text-right py-2 px-2 font-semibold text-slate-700">Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.bestSellingItems.map((item) => (
                        <tr key={item.item_id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-2 text-slate-900">{item.item_name}</td>
                          <td className="text-right py-2 px-2">
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                              {formatNumber(item.total_quantity || 0)}
                            </span>
                          </td>
                          <td className="text-right py-2 px-2 text-slate-600 font-semibold">
                            {formatCurrency(item.total_sales || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-600">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No sales data available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modules Grid */}
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-8">{t('dashboard.availableModules')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => {
              const Icon = module.icon
              return (
                <button
                  key={module.id}
                  onClick={() => navigate(module.path)}
                  className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-slate-200 bg-white"
                >
                  {/* Background gradient subtle overlay */}
                  <div className={`absolute inset-0 bg-linear-to-br ${module.color} opacity-5`}></div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-linear-to-br from-white/40 to-transparent group-hover:from-white/60 transition-colors"></div>

                  {/* Content */}
                  <div className="relative p-6 h-48 flex flex-col justify-between">
                    <div>
                      <div className={`mb-4 p-3 bg-linear-to-br ${module.color} rounded-lg w-fit`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{module.title}</h3>
                      <p className="text-sm text-slate-600">{module.description}</p>
                    </div>

                    {/* Arrow icon */}
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>{t('dashboard.viewDetails')}</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
