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
    startDate: '2026-04-01',
    endDate: new Date().toISOString().split('T')[0],
    memberId: '',
    itemId: ''
  });
  const [summary, setSummary] = useState({
    totalQty: 0,
    totalRateAmount: 0,
    totalDeduction: 0,
    totalExpense: 0,
    totalFinal: 0,
    count: 0
  });
  const [error, setError] = useState('');

  const [members, setMembers] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchInitialData().then(() => fetchReport());
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
      setError('');

      const company   = JSON.parse(localStorage.getItem('company') || '{}');
      const user      = JSON.parse(localStorage.getItem('user')    || '{}');
      const companyId = company.id || user.company_id;

      if (!companyId) {
        setError('Company not found. Please log in again.');
        return;
      }

      // Use the dedicated payment-report endpoint (account_ledger + dangar_entry + bardan_entry)
      const res = await api.get('/dangar-entry/payment-report', {
        params: { companyId, startDate: filters.startDate, endDate: filters.endDate }
      });
      console.log('📊 Payment report response:', res.data);

      if (res.data.success) {
        let rows = res.data.data || [];

        // Client-side member filter
        if (filters.memberId) {
          rows = rows.filter(r => String(r.member_id) === String(filters.memberId));
        }

        setData(rows);

        const s = rows.reduce((acc, r) => ({
          totalQty:        acc.totalQty        + parseFloat(r.total_kg        || 0),
          totalRateAmount: acc.totalRateAmount + parseFloat(r.rate_amount     || 0),
          totalDeduction:  acc.totalDeduction  + parseFloat(r.deduction_amount|| 0),
          totalExpense:    acc.totalExpense     + parseFloat(r.net_debit       || 0),
          totalFinal:      acc.totalFinal       + parseFloat(r.final_amount    || 0),
          count:           acc.count + 1,
        }), { totalQty: 0, totalRateAmount: 0, totalDeduction: 0, totalExpense: 0, totalFinal: 0, count: 0 });

        setSummary(s);
      } else {
        setError(res.data.error || 'Failed to load report.');
      }
    } catch (err) {
      console.error('Report fetch error:', err);
      setError('Server error: ' + (err.response?.data?.error || err.message));
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

        {/* Summary Cards */}
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest">
            ⚠ {error}
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {[
            { label: 'Total Volume',      val: `${summary.totalQty.toFixed(2)} KG`,          icon: Box,         color: 'blue'   },
            { label: 'Rate Amount',       val: `₹${summary.totalRateAmount.toFixed(2)}`,      icon: CreditCard,  color: 'indigo' },
            { label: 'Kapat (Deduction)', val: `₹${summary.totalDeduction.toFixed(2)}`,       icon: Filter,      color: 'rose'   },
            { label: 'Other Expense',     val: `₹${summary.totalExpense.toFixed(2)}`,         icon: ArrowRight,  color: 'amber'  },
            { label: 'Final Payable',     val: `₹${summary.totalFinal.toFixed(2)}`,           icon: CheckCircle, color: 'emerald'},
          ].map((shard, i) => (
            <div key={i} className="bg-white p-5 rounded-[2rem] border border-white shadow-sm flex items-center gap-4 hover:shadow-md transition-all group">
              <div className={`p-3 bg-${shard.color}-50 text-${shard.color}-600 rounded-2xl group-hover:scale-110 transition-transform shrink-0`}>
                <shard.icon size={20} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 italic">{shard.label}</p>
                <p className="text-lg font-black text-slate-800 italic tracking-tighter leading-none">{shard.val}</p>
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
                  <th className="px-6 py-5">#</th>
                  <th className="px-6 py-5">Member Code</th>
                  <th className="px-6 py-5">Member Name</th>
                  <th className="px-6 py-5 text-right">Qty (KG)</th>
                  <th className="px-6 py-5 text-right text-indigo-500">Rate Amount</th>
                  <th className="px-6 py-5 text-right text-rose-500">Kapat</th>
                  <th className="px-6 py-5 text-right text-amber-500">Expense</th>
                  <th className="px-6 py-5 text-right">Bardan Bags</th>
                  <th className="px-6 py-5 text-right text-emerald-600">Final Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-300">
                        <Clock size={40} className="animate-spin opacity-30" />
                        <p className="text-xs font-black uppercase tracking-widest italic">Loading...</p>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center gap-4 text-slate-300">
                        <FileText size={64} className="opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest italic">No Transaction Data Found</p>
                        <p className="text-[10px] text-slate-400">Make sure there are entries in the ledger for this period.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((row, i) => (
                    <tr key={row.member_id} className="group hover:bg-indigo-50/30 transition-all cursor-default">
                      <td className="px-6 py-4 text-xs font-black text-slate-400">{i + 1}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-800 font-mono">{row.member_code}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{row.member_name}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{row.entry_count} entries</p>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-600 italic text-sm">{row.total_kg}</td>
                      <td className="px-6 py-4 text-right font-black text-indigo-600 italic text-sm">₹{row.rate_amount}</td>
                      <td className="px-6 py-4 text-right font-black text-rose-500 italic text-sm">₹{row.deduction_amount}</td>
                      <td className="px-6 py-4 text-right font-black text-amber-500 italic text-sm">₹{row.net_debit}</td>
                      <td className="px-6 py-4 text-right font-black text-slate-500 text-sm">{row.bardan_issued}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-base font-black italic tracking-tighter text-emerald-600">₹{row.final_amount}</span>
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
