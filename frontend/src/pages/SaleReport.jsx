import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  Search, 
  RefreshCcw, 
  Download,
  Hash,
  User,
  ExternalLink,
  ShoppingCart,
  CreditCard,
  Banknote,
  FileText,
  BarChart3,
  LayoutGrid,
  Box,
  ChevronDown,
  ChevronRight,
  UserCheck,
  TrendingUp,
  Tags
} from 'lucide-react';
import * as XLSX from 'xlsx';

const formatCurrency = (num) => {
  return parseFloat(num || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  });
};

const formatQty = (qty) => {
  return parseFloat(qty || 0).toFixed(3);
};

export default function SaleReport() {
  const { t } = useTranslation();
  const [viewType, setViewType] = useState('report'); 
  const [data, setData] = useState([]);
  const [itemData, setItemData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [company, setCompany] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    if (company?.id) {
      fetchData();
    }
  }, [company, startDate, endDate]);

  const loadCompany = async () => {
    try {
      const response = await axios.get('/api/company');
      setCompany(response.data.success ? response.data.data : null);
    } catch (error) {
      setCompany(null);
    }
  };

  const fetchData = async () => {
    if (!company?.id) return;
    try {
      setLoading(true);
      const salesRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/sales`, {
        params: { startDate, endDate },
        headers: { 'x-company-id': company.id }
      });
      const itemRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/items/company/${company.id}`);
      if (salesRes.data.success) setData(salesRes.data.data);
      if (itemRes.data.success) setItemData(itemRes.data.data.filter(i => parseFloat(i.outward) > 0));
    } catch (error) {
      console.error('Error fetching sale data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const filteredReports = data.filter(s => 
    s.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.customer_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.member_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grouping logic for Sale Report (By Client)
  const groupedReports = filteredReports.reduce((acc, s) => {
    const key = s.customer_name || 'COUNTER SALE';
    if (!acc[key]) acc[key] = { name: key, invoices: [], total: 0 };
    acc[key].invoices.push(s);
    acc[key].total += parseFloat(s.total_amount || 0);
    return acc;
  }, {});

  const filteredSummary = itemData.filter(i => 
    i.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.item_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grouping logic for Sale Summary (By Category)
  const groupedSummary = filteredSummary.reduce((acc, i) => {
    const key = i.category || 'RETAIL INVENTORY';
    if (!acc[key]) acc[key] = { name: key, items: [], total: 0 };
    acc[key].items.push(i);
    acc[key].total += (parseFloat(i.outward || 0) * parseFloat(i.sale_price || 0));
    return acc;
  }, {});

  const totalRevenueAudit = filteredReports.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);

  const exportToExcel = () => {
    const ws_data = viewType === 'report' ? 
      filteredReports.map(s => ({
        'Client': s.customer_name || 'COUNTER SALE',
        'Date': new Date(s.invoice_date).toLocaleDateString('en-GB'),
        'Invoice ID': s.invoice_no,
        'Type': s.payment_type?.toUpperCase() || 'CASH',
        'Proceeds': parseFloat(s.total_amount || 0)
      })) :
      filteredSummary.map(i => ({
        'Category': i.category || 'UNCATEGORIZED',
        'Product': i.item_name,
        'SKU': i.item_code,
        'Outward Qty': parseFloat(i.outward || 0),
        'Unit Rate': parseFloat(i.sale_price || 0),
        'Total Proceeds': parseFloat(i.outward || 0) * parseFloat(i.sale_price || 0)
      }));

    const ws = XLSX.utils.json_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AuditExport");
    XLSX.writeFile(wb, `Sale_Audit_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportGroupToExcel = (e, groupData, type) => {
    e.stopPropagation();
    const ws_data = type === 'report' ?
      groupData.invoices.map(s => ({
        'Client': s.customer_name || 'COUNTER SALE',
        'Date': new Date(s.invoice_date).toLocaleDateString('en-GB'),
        'Invoice ID': s.invoice_no,
        'Type': s.payment_type?.toUpperCase() || 'CASH',
        'Proceeds': parseFloat(s.total_amount || 0)
      })) :
      groupData.items.map(i => ({
        'Category': i.category || 'UNCATEGORIZED',
        'Product': i.item_name,
        'SKU': i.item_code,
        'Outward Qty': parseFloat(i.outward || 0),
        'Unit Rate': parseFloat(i.sale_price || 0),
        'Total Proceeds': parseFloat(i.outward || 0) * parseFloat(i.sale_price || 0)
      }));

    const ws = XLSX.utils.json_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GroupAudit");
    XLSX.writeFile(wb, `${groupData.name}_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Superior Header with Toggle */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-6 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="bg-black text-white p-2 rounded-lg shadow-xl">
                  {viewType === 'report' ? <ShoppingCart size={24} /> : <TrendingUp size={24} />}
               </div>
               <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                 Revenue Audit
               </h1>
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] italic">
               {viewType === 'report' ? 'Grouped Settlement Review' : 'Categorized Revenue Yield'} / {company?.company_name}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white p-1.5 rounded-2xl border-2 border-slate-200 shadow-xl self-end md:self-auto">
             <button onClick={() => setViewType('report')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${viewType === 'report' ? 'bg-black text-white shadow-lg' : 'text-slate-400 hover:text-black'}`}>
                <UserCheck size={14} /> Report (Grouped)
             </button>
             <button onClick={() => setViewType('summary')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${viewType === 'summary' ? 'bg-black text-white shadow-lg' : 'text-slate-400 hover:text-black'}`}>
                <Tags size={14} /> Summary (Categorized)
             </button>
          </div>

          <div className="flex gap-2">
             <button 
               onClick={exportToExcel} 
               className="p-3 bg-slate-900 text-white hover:bg-black rounded-xl transition-all shadow-xl active:scale-95 border-2 border-black"
             >
                <Download size={20} strokeWidth={3} />
             </button>
             <button 
               onClick={fetchData} 
               className="flex items-center gap-2 px-8 py-3 bg-white text-black border-4 border-black rounded-xl hover:bg-slate-50 font-black shadow-2xl transition-all active:scale-95 uppercase tracking-widest text-[10px]"
             >
              <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} strokeWidth={3} />
              Sync Revenue
            </button>
          </div>
        </div>

        {/* Universal Revenue Dashboard Context */}
        <div className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 flex flex-wrap gap-6 items-end">
           <div className="flex-1 min-w-[300px]">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 italic italic">Identity Search Audit</span>
              <div className="relative group">
                 <Search className="absolute left-4 top-3.5 text-slate-300 group-focus-within:text-black transition-colors" size={18} strokeWidth={3} />
                 <input
                   type="text"
                   placeholder="SEARCH CLIENTS, PRODUCTS OR INVOICES..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-12 pr-4 py-3 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-black transition-all bg-slate-50 font-black uppercase text-[11px] h-12 italic shadow-inner"
                 />
              </div>
           </div>

           <div className="flex gap-4">
              <div className="w-44">
                 <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 italic italic">Timeline Logic Start</span>
                 <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-black transition-all bg-white font-black text-xs h-12" />
              </div>
              <div className="w-44">
                 <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 italic italic">Timeline Logic End</span>
                 <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-3 border-2 border-slate-50 rounded-2xl focus:outline-none focus:border-black transition-all bg-white font-black text-xs h-12" />
              </div>
           </div>
        </div>

        {/* Dynamic Data Grid */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
           <div className="overflow-x-auto">
              {loading ? (
                <div className="px-8 py-32 text-center">
                   <RefreshCcw className="w-12 h-12 text-slate-100 animate-spin mx-auto mb-4" strokeWidth={3} />
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic tracking-[0.3em]">Auditing Performance Streams...</p>
                </div>
              ) : (
                <table className="w-full">
                   <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest italic leading-none">
                      {viewType === 'report' ? (
                         <tr>
                            <th className="px-10 py-6 text-left w-1/3 italic">Client Identity / Activity</th>
                            <th className="px-8 py-6 text-left italic">Reference Ledger</th>
                            <th className="px-8 py-6 text-center italic">Settlement Type</th>
                            <th className="px-8 py-6 text-right bg-black italic">Net Liquidity</th>
                            <th className="px-8 py-6 text-center italic">Audit</th>
                         </tr>
                      ) : (
                         <tr>
                            <th className="px-10 py-6 text-left w-1/3 italic">Product Taxonomy / SKU</th>
                            <th className="px-8 py-6 text-center italic">Unit</th>
                            <th className="px-8 py-6 text-right italic">Yield Volume</th>
                            <th className="px-8 py-6 text-right bg-black italic">Gross Proceeds</th>
                         </tr>
                      )}
                   </thead>
                   <tbody className="divide-y divide-slate-100 italic">
                      {viewType === 'report' ? (
                         Object.values(groupedReports).length === 0 ? (
                            <tr><td colSpan="5" className="py-24 text-center font-black text-slate-200 uppercase tracking-widest italic">Zero Client Events Detected</td></tr>
                         ) : (
                            Object.values(groupedReports).map((group, gIdx) => (
                               <React.Fragment key={gIdx}>
                                  {/* Client Group Header */}
                                  <tr 
                                    onClick={() => toggleGroup(group.name)}
                                    className="bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all border-l-8 border-green-600 select-none"
                                  >
                                     <td className="px-10 py-5">
                                        <div className="flex items-center gap-4">
                                           {expandedGroups[group.name] ? <ChevronDown size={20} className="text-green-600" strokeWidth={3} /> : <ChevronRight size={20} className="text-green-600" strokeWidth={3} />}
                                           <div>
                                              <p className="font-black text-slate-900 uppercase text-sm tracking-tight leading-none mb-1">{group.name}</p>
                                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{group.invoices.length} RECORDED SETTLEMENTS</p>
                                           </div>
                                        </div>
                                     </td>
                                     <td colSpan="2" className="px-8 py-5 text-center">
                                         <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest">BATCH AUDIT</span>
                                     </td>
                                     <td className="px-8 py-5 text-right font-black text-sm bg-slate-900 text-white italic tracking-tighter">
                                        {formatCurrency(group.total)}
                                     </td>
                                     <td className="px-8 py-5 text-center">
                                         <button 
                                           onClick={(e) => exportGroupToExcel(e, group, 'report')}
                                           className="p-2.5 bg-slate-900 hover:bg-black text-white rounded-lg transition-all shadow-lg active:scale-90"
                                           title="Download Member Data"
                                         >
                                            <Download size={14} strokeWidth={3} />
                                         </button>
                                     </td>
                                  </tr>
                                  {/* Individual Invoices */}
                                  {expandedGroups[group.name] && group.invoices.map((s, sIdx) => (
                                     <tr key={sIdx} className="bg-white hover:bg-slate-50 transition-colors animate-in slide-in-from-top-2 duration-150 border-l border-slate-100">
                                        <td className="px-10 py-4 pl-20 font-mono font-bold text-slate-400 text-xs italic">
                                           {new Date(s.invoice_date).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="px-8 py-4 font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 text-xs">
                                           <Hash size={12} className="text-slate-300" /> {s.invoice_no}
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                           {s.payment_type === 'cash' ? (
                                              <div className="inline-flex items-center gap-1.5 text-green-600 font-black uppercase text-[8px] tracking-widest border border-green-600 px-2 py-0.5 rounded bg-green-50">CASH</div>
                                           ) : (
                                              <div className="inline-flex items-center gap-1.5 text-blue-600 font-black uppercase text-[8px] tracking-widest border border-blue-600 px-2 py-0.5 rounded bg-blue-50">CREDIT</div>
                                           )}
                                        </td>
                                        <td className="px-8 py-4 text-right font-black text-xs text-slate-900 opacity-60">
                                           {formatCurrency(s.total_amount)}
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                           <button className="p-2 text-slate-400 hover:text-black transition-colors border border-slate-100 rounded hover:border-black"><ExternalLink size={14} strokeWidth={3} /></button>
                                        </td>
                                     </tr>
                                  ))}
                               </React.Fragment>
                            ))
                         )
                      ) : (
                         Object.values(groupedSummary).length === 0 ? (
                            <tr><td colSpan="4" className="py-24 text-center font-black text-slate-200 uppercase tracking-widest italic">Zero Product Dynamics Found</td></tr>
                         ) : (
                            Object.values(groupedSummary).map((cat, cIdx) => (
                               <React.Fragment key={cIdx}>
                                  {/* Product Category Header */}
                                  <tr 
                                    onClick={() => toggleGroup(cat.name)}
                                    className="bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all border-l-8 border-slate-900 select-none shadow-sm"
                                  >
                                     <td className="px-10 py-5">
                                        <div className="flex items-center gap-4">
                                           {expandedGroups[cat.name] ? <ChevronDown size={20} strokeWidth={3} /> : <ChevronRight size={20} strokeWidth={3} />}
                                           <div>
                                              <p className="font-black text-slate-900 uppercase text-sm tracking-tight leading-none mb-1">{cat.name}</p>
                                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{cat.items.length} ACTIVE PRODUCT LINES</p>
                                           </div>
                                        </div>
                                     </td>
                                     <td colSpan="2"></td>
                                     <td className="px-8 py-5 text-right font-black text-sm bg-slate-900 text-white italic tracking-tighter">
                                        <div className="flex items-center justify-end gap-4">
                                           <span>{formatCurrency(cat.total)}</span>
                                           <button 
                                             onClick={(e) => exportGroupToExcel(e, cat, 'summary')}
                                             className="p-2 bg-slate-900 hover:bg-black text-white rounded-lg transition-all shadow-lg active:scale-90"
                                             title="Download Category Data"
                                           >
                                              <Download size={14} strokeWidth={3} />
                                           </button>
                                        </div>
                                     </td>
                                  </tr>
                                  {/* Item Details */}
                                  {expandedGroups[cat.name] && cat.items.map((item, iIdx) => (
                                     <tr key={iIdx} className="bg-white hover:bg-slate-50 transition-colors border-l border-slate-100">
                                        <td className="px-10 py-4 pl-20">
                                           <div className="flex items-center gap-3">
                                              <Box size={16} className="text-slate-200" strokeWidth={3} />
                                              <div>
                                                 <p className="font-black text-slate-900 uppercase text-xs tracking-tight leading-none mb-1">{item.item_name}</p>
                                                 <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em]">{item.item_code}</p>
                                              </div>
                                           </div>
                                        </td>
                                        <td className="px-8 py-4 text-center font-black text-slate-400 text-[10px] uppercase">{item.unit || 'NOS'}</td>
                                        <td className="px-8 py-4 text-right font-mono font-bold text-slate-900 text-xs italic">{formatQty(item.outward)}</td>
                                        <td className="px-8 py-4 text-right font-black text-xs text-slate-900 opacity-60">
                                           {formatCurrency(parseFloat(item.outward || 0) * parseFloat(item.sale_price || 0))}
                                        </td>
                                     </tr>
                                  ))}
                               </React.Fragment>
                            ))
                         )
                      )}
                   </tbody>
                </table>
              )}
           </div>
        </div>

      </div>
    </div>
  );
}
