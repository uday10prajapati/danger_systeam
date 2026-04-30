import React, { useState, useEffect } from 'react';
import {
   ArrowLeft,
   TrendingUp, Box, Database, Calculator, Calendar, X, RefreshCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';
import * as XLSX from 'xlsx';

const DangarSummaryReport = () => {
   const navigate = useNavigate();
   const [loading, setLoading] = useState(false);
   const [summaryData, setSummaryData] = useState({ dangarSummary: [], fixedAccounts: [] });
   const [dateRange, setDateRange] = useState({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
   });

   useEffect(() => {
      fetchSummary();
   }, [dateRange.startDate, dateRange.endDate]);

   const fetchSummary = async () => {
      try {
         setLoading(true);
         const companyStr = localStorage.getItem('company');
         const userStr = localStorage.getItem('user');
         const company = JSON.parse(companyStr || '{}');
         const user = JSON.parse(userStr || '{}');
         const companyId = company.id || user.company_id;

         const res = await api.get('/dangar-entry/summary-report', {
            params: {
               companyId,
               startDate: dateRange.startDate,
               endDate: dateRange.endDate
            }
         });
         if (res.data.success) {
            setSummaryData(res.data.data);
         }
      } catch (err) {
         console.error('Failed to load summary:', err);
      } finally {
         setLoading(false);
      }
   };



   return (
      <div className="min-h-screen bg-slate-50 pb-12 animate-in fade-in duration-700">
         <div className="max-w-[1600px] mx-auto px-8">

            <PageHeader
               eyebrow="Procurement Audit / Variety Analytics"
               eyebrowIcon={<Database size={12} />}
               title="Dangar Purchase Summary"
               subtitle="Consolidated view of dangar varieties and account deductions"
            >
               <div className="flex items-center gap-3 no-print">
                  <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
                     <Calendar size={14} className="ml-2 text-slate-400" />
                     <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-tighter w-24"
                     />
                     <span className="text-slate-300">/</span>
                     <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-tighter w-24"
                     />
                  </div>

                  <button
                     onClick={fetchSummary}
                     className="p-3 bg-white text-slate-400 hover:text-blue-600 rounded-lg border border-slate-100 shadow-sm transition-all active:scale-95"
                  >
                     <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                  </button>

                  <button
                     onClick={() => navigate(-1)}
                     className="p-3 bg-white text-slate-400 hover:text-rose-600 rounded-lg border border-slate-100 shadow-sm transition-all"
                  >
                     <X size={20} />
                  </button>
               </div>
            </PageHeader>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
               {/* Purchase Summary Table */}
               <div className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                     <TableHeading
                        icon={<Box size={18} />}
                        iconColor="blue"
                        title="Variety & Class Breakdown"
                        subtitle="Aggregated volume and average rates per dangar variety"
                     />
                     <div className="overflow-x-auto scroller-airy">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="bg-[#F8FAFC] border-b border-slate-100">
                                 <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name / Class</th>
                                 <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total KG</th>
                                 <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Quintal</th>
                                 <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Avg Rate</th>
                                 <th className="px-10 py-6 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Total Amount</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50">
                              {loading ? (
                                 <tr>
                                    <td colSpan="5" className="py-24 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">
                                       Synchronizing Procurement Data...
                                    </td>
                                 </tr>
                              ) : summaryData.dangarSummary.length === 0 ? (
                                 <tr>
                                    <td colSpan="5" className="py-24 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">
                                       No transaction nodes detected in temporal range
                                    </td>
                                 </tr>
                              ) : (
                                 summaryData.dangarSummary.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                       <td className="px-10 py-5">
                                          <div className="flex flex-col">
                                             <span className="text-sm font-black text-slate-800 uppercase italic tracking-tight group-hover:text-blue-600 transition-colors">{row.item_name}</span>
                                             <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{row.quality_class || 'Standard'} Class</span>
                                                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                <span className="text-[10px] font-bold text-blue-500 italic">{row.item_name_gu}</span>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-10 py-5 text-right font-mono font-bold text-slate-400 text-xs italic">{parseFloat(row.total_kg || 0).toLocaleString()}</td>
                                       <td className="px-10 py-5 text-right font-mono font-black text-slate-800 text-sm">{parseFloat(row.total_quintal || 0).toLocaleString()}</td>
                                       <td className="px-10 py-5 text-right font-mono font-black text-emerald-600 text-sm">₹{parseFloat(row.avg_rate || 0).toFixed(2)}</td>
                                       <td className="px-10 py-5 text-right font-mono font-black text-slate-900 text-sm">₹{parseFloat(row.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                 ))
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>

               {/* Account Balances (Kapat Vigat) */}
               <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                     <TableHeading
                        icon={<Calculator size={18} />}
                        iconColor="rose"
                        title="Kapat Vigat"
                        subtitle="Consolidated account balances for deductions"
                     />
                     <div className="p-4 space-y-2">
                        {summaryData.fixedAccounts.map((acc, i) => (
                           <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-lg border border-slate-100 hover:border-slate-200 transition-all group">
                              <div>
                                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-slate-400">{acc.account_code}</p>
                                 <p className="text-xs font-black text-slate-700 uppercase italic tracking-tight">{acc.account_name}</p>
                              </div>
                              <p className={`text-sm font-black font-mono italic ${acc.total_balance < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                 ₹{Math.abs(acc.total_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                 <span className="text-[10px] ml-1.5 opacity-60">{acc.total_balance < 0 ? 'C' : 'D'}</span>
                              </p>
                           </div>
                        ))}
                        {summaryData.fixedAccounts.length === 0 && (
                           <div className="py-12 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest italic">No deduction nodes active</div>
                        )}
                     </div>
                  </div>

                  <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
                     <TrendingUp className="absolute -right-6 -bottom-6 text-slate-50 group-hover:text-blue-50 transition-colors" size={160} strokeWidth={1} />
                     <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 italic">Procurement Aggregate</p>
                        <h2 className="text-4xl font-black tracking-tighter text-slate-800">
                           ₹{summaryData.dangarSummary.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </h2>
                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-end">
                           <div>
                              <p className="text-[9px] font-black uppercase text-slate-300 tracking-[0.2em] mb-1">Total Procurement Volume</p>
                              <p className="text-lg font-black text-slate-700 italic tracking-tight">
                                 {summaryData.dangarSummary.reduce((s, r) => s + parseFloat(r.total_quintal || 0), 0).toLocaleString()}
                                 <span className="text-xs ml-1.5 text-slate-400">QTL</span>
                              </p>
                           </div>
                           <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                              <Box size={24} />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
         <style>{`
            @media print {
               .no-print { display: none !important; }
               body { background: white !important; margin: 0 !important; }
               .min-h-screen { min-height: 0 !important; padding: 0 !important; }
               .shadow-sm, .shadow-xl { box-shadow: none !important; }
               .border, .border-b { border-color: #f1f5f9 !important; }
               .max-w-[1600px] { max-width: 100% !important; padding: 0 40px !important; }
               .grid { display: block !important; }
               .lg\\:col-span-2, .space-y-4 { margin-bottom: 20px !important; }
            }
         `}</style>
      </div>
   );
};

export default DangarSummaryReport;
