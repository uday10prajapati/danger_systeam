import React, { useState, useEffect } from 'react';
import { 
  FileText, ArrowLeft, Printer, Download, 
  TrendingUp, Box, Database, Calculator 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import PageHeader from '../components/PageHeader';
import * as XLSX from 'xlsx';

const DangarSummaryReport = () => {
   const navigate = useNavigate();
   const [loading, setLoading] = useState(false);
   const [summaryData, setSummaryData] = useState({ dangarSummary: [], fixedAccounts: [] });
   const [dateRange, setDateRange] = useState({
      startDate: '2026-04-01',
      endDate: new Date().toISOString().split('T')[0]
   });

   useEffect(() => {
      fetchSummary();
   }, []);

   const fetchSummary = async () => {
      try {
         setLoading(true);
         const company = JSON.parse(localStorage.getItem('company') || '{}');
         const user = JSON.parse(localStorage.getItem('user') || '{}');
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

   const exportToExcel = () => {
      const ws = XLSX.utils.json_to_sheet(summaryData.dangarSummary.map(row => ({
         'Item Name': row.item_name,
         'Item Name (GU)': row.item_name_gu,
         'Class': row.quality_class,
         'Total Weight (KG)': row.total_kg,
         'Net Quintal': row.total_quintal,
         'Avg Rate': row.avg_rate,
         'Total Amount': row.total_amount,
         'Total Deduction': row.total_deduction
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dangar Summary");
      XLSX.writeFile(wb, `Dangar_Summary_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`);
   };

   return (
      <div className="min-h-screen bg-slate-50 pb-12">
         <div className="max-w-[1400px] mx-auto px-6 py-6">
            <div className="flex items-center gap-4 mb-6 no-print">
               <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                  <ArrowLeft size={20} />
               </button>
               <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dangar Purchase Summary</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* Purchase Summary Table */}
               <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                     <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-2">
                           <Box className="text-blue-600" size={18} />
                           <h3 className="font-bold text-slate-800">Variety & Class Breakdown</h3>
                        </div>
                        <div className="flex gap-2 no-print">
                           <button onClick={exportToExcel} className="p-2 text-slate-500 hover:text-blue-600 transition-colors"><Download size={18} /></button>
                           <button onClick={() => window.print()} className="p-2 text-slate-500 hover:text-blue-600 transition-colors"><Printer size={18} /></button>
                        </div>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="bg-slate-100/50 border-b border-slate-200">
                                 <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Item Name / Class</th>
                                 <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Total KG</th>
                                 <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Quintal</th>
                                 <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Avg Rate</th>
                                 <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Total Amount</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {summaryData.dangarSummary.map((row, i) => (
                                 <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                       <div className="flex flex-col">
                                          <span className="text-sm font-bold text-slate-800">{row.item_name}</span>
                                          <span className="text-xs font-medium text-slate-400 uppercase tracking-tighter">{row.quality_class || 'Standard'} Class</span>
                                          <span className="text-[10px] font-bold text-blue-600 mt-1">{row.item_name_gu}</span>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-600">{parseFloat(row.total_kg || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">{parseFloat(row.total_quintal || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">₹{parseFloat(row.avg_rate || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-mono font-black text-slate-900">₹{parseFloat(row.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                 </tr>
                              ))}
                              {summaryData.dangarSummary.length === 0 && (
                                 <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400 font-bold">No data found for selected period</td></tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>

               {/* Account Balances (Kapat Vigat) */}
               <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                     <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                        <Calculator className="text-rose-600" size={18} />
                        <h3 className="font-bold text-slate-800">Kapat Vigat (Account Balances)</h3>
                     </div>
                     <div className="p-4 space-y-3">
                        {summaryData.fixedAccounts.map((acc, i) => (
                           <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                              <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{acc.account_code}</p>
                                 <p className="text-xs font-bold text-slate-700">{acc.account_name}</p>
                              </div>
                              <p className={`text-sm font-black font-mono ${acc.total_balance < 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                 ₹{Math.abs(acc.total_balance || 0).toLocaleString('en-IN', { minimumDigits: 2 })}
                                 <span className="text-[10px] ml-1">{acc.total_balance < 0 ? 'Cr' : 'Dr'}</span>
                              </p>
                           </div>
                        ))}
                        {summaryData.fixedAccounts.length === 0 && (
                           <div className="py-6 text-center text-slate-400 text-xs font-bold">No Kapat account activity found</div>
                        )}
                     </div>
                  </div>

                  <div className="bg-blue-600 rounded-xl p-6 text-white shadow-lg shadow-blue-100 relative overflow-hidden">
                     <Database className="absolute -right-4 -bottom-4 opacity-20" size={120} />
                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Total Procurement Amount</p>
                     <h2 className="text-3xl font-black tracking-tighter">
                        ₹{summaryData.dangarSummary.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                     </h2>
                     <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center">
                        <div>
                           <p className="text-[10px] font-bold uppercase opacity-80">Total Quintal</p>
                           <p className="font-bold">{summaryData.dangarSummary.reduce((s, r) => s + parseFloat(r.total_quintal || 0), 0).toLocaleString()} Qtl</p>
                        </div>
                        <TrendingUp size={24} className="opacity-50" />
                     </div>
                  </div>
               </div>
            </div>
         </div>
         <style>{`
            @media print {
               .no-print { display: none !important; }
               body { background: white !important; }
               .min-h-screen { min-height: 0 !important; padding: 0 !important; }
               .shadow-sm, .shadow-lg { shadow: none !important; }
               .border { border-color: #eee !important; }
            }
         `}</style>
      </div>
   );
};

export default DangarSummaryReport;
