import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, RefreshCcw, ArrowUpRight, TrendingDown,
  Users, Package, AlertTriangle, AlertCircle, ShoppingCart,
  Activity, ArrowRight, CheckCircle2, TrendingUp, Box
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import Loading from '../components/Loading';

function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login');
      return;
    }
    fetchStats();
  }, [navigate]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/dashboard/stats');
      if (response.data) {
        setStats(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  // Handle case where stats might be null if there was an error
  const s = stats || {
    totalItems: 0,
    lowStockCount: 0,
    belowThreshold: 0,
    reorders: 0,
    todaysSales: 0,
    todaysPurchases: 0,
    activeUsers: 0,
    inventoryItems: [],
    supplierInfo: []
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8 font-sans text-slate-900">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-2 bg-[#1d5f84]/10 rounded-lg text-[#1d5f84]">
                <LayoutDashboard size={24} />
              </div>
              Executive Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1 ml-12">Real-time system analytics and operational overview</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchStats} 
              className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-sm font-medium"
            >
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
              {t('refresh') || 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-center gap-3">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Primary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard 
            title="Today's Sales" 
            value={`₹${(s.todaysSales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle="Gross Liquidity"
            icon={<TrendingUp size={24} />}
            colorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
            iconBg="bg-emerald-100"
          />
          <KpiCard 
            title="Today's Purchases" 
            value={`₹${(s.todaysPurchases || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            subtitle="Procurement Outflow"
            icon={<TrendingDown size={24} />}
            colorClass="bg-rose-50 text-rose-600 border-rose-100"
            iconBg="bg-rose-100"
          />
          <KpiCard 
            title="Total Inventory" 
            value={(s.totalItems || 0).toLocaleString()}
            subtitle="Active Items"
            icon={<Package size={24} />}
            colorClass="bg-[#1d5f84]/10 text-[#1d5f84] border-[#1d5f84]/20"
            iconBg="bg-[#1d5f84]/20"
          />
          <KpiCard 
            title="Active Users" 
            value={(s.activeUsers || 0).toLocaleString()}
            subtitle="System Access"
            icon={<Users size={24} />}
            colorClass="bg-indigo-50 text-indigo-600 border-indigo-100"
            iconBg="bg-indigo-100"
          />
        </div>

        {/* Detailed Data Sections */}
        <div className="grid grid-cols-1 gap-6">

          {/* Recent Suppliers Feed */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShoppingCart size={20} className="text-[#1d5f84]" />
                Recent Supplier Activity
              </h2>
            </div>
            <div className="p-0 overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3 font-semibold">Supplier Name</th>
                    <th className="px-5 py-3 font-semibold">Contact</th>
                    <th className="px-5 py-3 font-semibold">Last Shipment</th>
                    <th className="px-5 py-3 font-semibold text-center">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {s.supplierInfo && s.supplierInfo.length > 0 ? (
                    s.supplierInfo.map((sup, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 font-bold text-slate-800">{sup.name}</td>
                        <td className="px-5 py-3 text-slate-600">{sup.contact}</td>
                        <td className="px-5 py-3 text-slate-600">{sup.lastShipment}</td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <svg key={i} className={`w-3.5 h-3.5 ${i < sup.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-5 py-12 text-center text-slate-500">
                         <div className="flex flex-col items-center justify-center gap-3">
                          <ShoppingCart size={32} className="text-slate-300" />
                          <p className="font-medium">No supplier activity recorded yet.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable Components

function KpiCard({ title, value, subtitle, icon, colorClass, iconBg }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col relative overflow-hidden group hover:border-[#1d5f84]/30 transition-colors`}>
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-20 transition-transform group-hover:scale-150 duration-700 ease-out ${iconBg}`}></div>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3 rounded-lg border ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</h3>
        <p className="text-sm font-semibold text-slate-600 mt-1">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

export default Dashboard;
