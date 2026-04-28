import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Printer, Download, Filter, 
  Calendar, User, Box, ArrowRight, TrendingUp,
  CreditCard, ChevronDown, CheckCircle, Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api, { dangarEntryApi } from '../api';

const DangarPaymentReport = () => {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    memberId: '',
    itemId: ''
  });
  const [summary, setSummary] = useState({
    totalQty: 0,
    totalGross: 0,
    totalDeduction: 0,
    totalNet: 0,
    count: 0
  });

  const [members, setMembers] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [mRes, iRes] = await Promise.all([
        api.get('/members'),
        api.get('/items')
      ]);
      if (mRes.data.success) setMembers(mRes.data.data);
      if (iRes.data.success) setItems(iRes.data.data);
    } catch (err) {
      console.error('Failed to load filter dependencies:', err);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const companyId = JSON.parse(localStorage.getItem('company') || '{}').id;
      
      const res = await dangarEntryApi.getAll(companyId, filters.startDate, filters.endDate);
      if (res.data.success) {
        let filtered = res.data.data;
        if (filters.memberId) filtered = filtered.filter(row => row.member_id === parseInt(filters.memberId));
        if (filters.itemId) filtered = filtered.filter(row => row.item_id === parseInt(filters.itemId));
        
        setData(filtered);
        
        // Calculate Summary
        const s = filtered.reduce((acc, row) => ({
          totalQty: acc.totalQty + parseFloat(row.total_kg || 0),
          totalGross: acc.totalGross + (parseFloat(row.total_kg || 0) * parseFloat(row.rate || 0)),
          totalDeduction: acc.totalDeduction + parseFloat(row.total_deduction || 0),
          totalNet: acc.totalNet + parseFloat(row.amount || 0),
          count: acc.count + 1
        }), { totalQty: 0, totalGross: 0, totalDeduction: 0, totalNet: 0, count: 0 });
        
        setSummary(s);
      }
    } catch (error) {
      console.error('Report fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-8">
        
        {/* Modern Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-10 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1 italic">
              <TrendingUp size={12} />
              <span>Financial Intelligence / Payout Analytics</span>
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none italic uppercase">
              Dangar Payment Report
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Audit-Ready Manifest • Fiscal 2026-27</p>
          </div>

          <div className="flex items-center gap-3">
             <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white text-slate-800 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
            >
              <Printer size={16} /> Print Manifest
            </button>
            <button
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        {/* Dynamic Filter Consolidation */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white shadow-xl mb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Start Period</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="date"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-xs text-slate-700"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">End Period</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  type="date"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-xs text-slate-700"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Sabhasad Filter</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <select 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-xs text-slate-700 appearance-none italic"
                  value={filters.memberId}
                  onChange={(e) => setFilters({...filters, memberId: e.target.value})}
                >
                  <option value="">All Identities</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.member_code} - {m.member_name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Resource Vector</label>
              <div className="relative">
                <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <select 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-xs text-slate-700 appearance-none italic"
                   value={filters.itemId}
                   onChange={(e) => setFilters({...filters, itemId: e.target.value})}
                >
                  <option value="">All Items</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.item_name}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={fetchReport}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Clock className="animate-spin" size={16} /> : <Filter size={16} />}
              Generate Report
            </button>
          </div>
        </div>

        {/* Position Metrics Shards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Total Volume', val: `${summary.totalQty.toFixed(2)} KG`, icon: Box, color: 'blue' },
            { label: 'Gross Exposure', val: `₹${summary.totalGross.toFixed(0)}`, icon: CreditCard, color: 'indigo' },
            { label: 'Kapat Retention', val: `₹${summary.totalDeduction.toFixed(0)}`, icon: Filter, color: 'rose' },
            { label: 'Total Payable', val: `₹${summary.totalNet.toFixed(0)}`, icon: CheckCircle, color: 'emerald' },
          ].map((shard, i) => (
            <div key={i} className="bg-white p-6 rounded-[2rem] border border-white shadow-sm flex items-center gap-5 hover:shadow-md transition-all group">
              <div className={`p-4 bg-${shard.color}-50 text-${shard.color}-600 rounded-2xl group-hover:scale-110 transition-transform`}>
                <shard.icon size={24} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 italic">{shard.label}</p>
                <p className="text-xl font-black text-slate-800 italic tracking-tighter leading-none">{shard.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Manifest Table */}
        <div className="bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white shadow-2xl overflow-hidden min-h-[400px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 italic text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <th className="px-8 py-6">Sr No</th>
                  <th className="px-8 py-6">Date</th>
                  <th className="px-8 py-6">Sabhasad Code</th>
                  <th className="px-8 py-6">Sabhasad Name</th>
                  <th className="px-8 py-6 text-right">Qty (KG)</th>
                  <th className="px-8 py-6 text-right">Rate</th>
                  <th className="px-8 py-6 text-right text-rose-500">Deduction</th>
                  <th className="px-8 py-6 text-right text-emerald-600">Net Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-300">
                        <FileText size={64} className="opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest italic">No Transaction Data Discovered</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={i} className="group hover:bg-white transition-all cursor-default">
                      <td className="px-8 py-5">
                        <span className="text-indigo-600 font-black text-xs italic">#{row.sr_no}</span>
                      </td>
                      <td className="px-8 py-5 text-xs font-bold text-slate-500 font-mono">
                        {new Date(row.entry_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-8 py-5 text-sm font-black text-slate-800 font-mono">{row.member_code}</td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{row.member_name}</p>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-slate-600 italic">{row.total_kg}</td>
                      <td className="px-8 py-5 text-right font-black text-slate-500 italic">₹{row.rate}</td>
                      <td className="px-8 py-5 text-right font-black text-rose-500 italic">₹{row.total_deduction || 0}</td>
                      <td className="px-8 py-5 text-right text-emerald-600">
                        <span className="text-base font-black italic tracking-tighter">₹{row.amount}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .shadow-2xl, .shadow-xl, .shadow-sm { box-shadow: none !important; }
          .max-w-[1600px] { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .bg-[#F8FAFC] { background: white !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border-bottom: 1px solid #eee !important; padding: 8px !important; }
          .animate-in { animation: none !important; }
        }
      `}} />
    </div>
  );
};

export default DangarPaymentReport;
