import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  Search, RefreshCcw as SyncIcon, Download, Hash, User, 
  ExternalLink, ShoppingCart, CreditCard, Banknote, 
  FileText, BarChart3, LayoutGrid, Box, ChevronDown, 
  ChevronRight, UserCheck, TrendingUp, Tags, Database, 
  ShieldCheck, Layout, Layers, Filter, Calendar, ArrowRight,
  CheckCircle2, History, Package, RefreshCcw
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
       console.error('Failed to load company', error);
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

  if (!company) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="text-center font-black uppercase tracking-widest text-slate-300">
          <p className="text-xs mb-6 italic tracking-[0.4em]">Initialising Revenue Bridge...</p>
          <div className="w-24 h-1 bg-slate-100 mx-auto overflow-hidden rounded-full relative">
             <div className="absolute top-0 left-0 w-1/2 h-full bg-blue-600 animate-[slide_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-8">
        
        {/* Superior Header - Dashboard Style */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-6 print:hidden">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
              <ShoppingCart size={12} />
              <span>Revenue Core / Sales Audit registry</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
               Revenue Command Deck
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
             <div className="flex gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <button onClick={() => setViewType('report')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${viewType === 'report' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:text-slate-600'}`}>
                   <UserCheck size={14} /> Report
                </button>
                <button onClick={() => setViewType('summary')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${viewType === 'summary' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}>
                   <Tags size={14} /> Summary
                </button>
             </div>

             <div className="flex gap-2">
                <button onClick={exportToExcel} className="p-3.5 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-2xl transition-all shadow-sm active:scale-95">
                   <Download size={18} />
                </button>
                <button onClick={fetchData} className="p-3.5 bg-blue-600 text-white rounded-2xl transition-all shadow-lg shadow-blue-100 active:scale-95">
                   <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
             </div>
          </div>
        </div>

        {/* Audit Command Grid - Compact Metric Shards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 print:hidden">
           {[
              { label: 'Total Revenue Yield', val: formatCurrency(totalRevenueAudit), icon: <TrendingUp size={18}/>, color: 'blue' },
              { label: 'Settlement Nodes', val: filteredReports.length, icon: <FileText size={18}/>, color: 'indigo' },
              { label: 'Catalog Throughput', val: itemData.length, icon: <LayoutGrid size={18}/>, color: 'emerald' },
              { label: 'Audit Protocol', val: 'SYMMETRICAL', icon: <ShieldCheck size={18}/>, color: 'slate' }
           ].map((stat, i) => (
             <div key={i} className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm group hover:border-slate-200 transition-all flex justify-between items-center">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">{stat.label}</p>
                   <h5 className="text-2xl font-bold tracking-tighter text-slate-800">{stat.val}</h5>
                </div>
                <div className={`p-4 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl group-hover:scale-110 transition-transform`}>{stat.icon}</div>
             </div>
           ))}
        </div>

        {/* Command Deck Toolbar */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm mb-10 print:hidden flex flex-wrap items-end gap-6">
           <div className="flex-1 min-w-[350px]">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 italic">Identity Search Audit</span>
              <div className="relative group">
                 <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                 <input 
                    type="text" 
                    placeholder="SEARCH CLIENTS, PRODUCTS OR INVOICES..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold uppercase text-[11px] tracking-widest"
                 />
              </div>
           </div>

           <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm h-full">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all font-mono" />
              <ArrowRight size={14} className="text-slate-200" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all font-mono" />
           </div>

           <button onClick={fetchData} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-xl active:scale-95 h-[52px]">Sync Revenue</button>
        </div>

        {/* Revenue Manifest Canvas */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[700px] relative">
           
           <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-50">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] italic">Consolidated Revenue Manifest</p>
              </div>
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">View: {viewType === 'report' ? 'Grouped Settlement' : 'Categorized Product'}</p>
           </div>

           <div className="flex-1 overflow-x-auto px-4 pb-12 scroller-airy">
              <table className="w-full text-left">
                 <thead className="bg-[#F8FAFC]">
                    {viewType === 'report' ? (
                      <tr className="uppercase text-[10px] font-bold text-slate-400 tracking-widest italic">
                         <th className="px-10 py-5 w-1/3">Client Identity / Timeline</th>
                         <th className="px-8 py-5">Reference Ledger</th>
                         <th className="px-8 py-5 text-center">Settlement Type</th>
                         <th className="px-8 py-5 text-right">Net Proceeds</th>
                         <th className="px-8 py-5 text-center">Audit</th>
                      </tr>
                    ) : (
                      <tr className="uppercase text-[10px] font-bold text-slate-400 tracking-widest italic">
                         <th className="px-10 py-5 w-1/3">Product Taxonomy / SKU</th>
                         <th className="px-8 py-5 text-center">Unit</th>
                         <th className="px-8 py-5 text-right">Yield Volume</th>
                         <th className="px-8 py-5 text-right">Gross Proceeds</th>
                         <th className="px-8 py-5 text-center">Status</th>
                      </tr>
                    )}
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="py-32 text-center">
                           <SyncIcon className="animate-spin text-blue-100 mx-auto" size={50} />
                           <p className="mt-4 text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">Building Revenue Matrix...</p>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {viewType === 'report' ? (
                          Object.values(groupedReports).length === 0 ? (
                            <tr><td colSpan="5" className="py-32 text-center italic font-bold text-slate-300 uppercase tracking-widest text-xs">Zero Sales Isolated</td></tr>
                          ) : (
                            Object.values(groupedReports).map((group, gIdx) => (
                              <React.Fragment key={gIdx}>
                                 <tr onClick={() => toggleGroup(group.name)} className="bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all border-l-[6px] border-emerald-600 group">
                                    <td className="px-10 py-6">
                                       <div className="flex items-center gap-4">
                                          <div className={`p-2 rounded-xl transition-all ${expandedGroups[group.name] ? 'bg-emerald-600 text-white' : 'bg-white text-slate-300 group-hover:text-emerald-600 shadow-sm'}`}>
                                            {expandedGroups[group.name] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                          </div>
                                          <div>
                                             <p className="font-bold text-slate-800 text-base tracking-tight uppercase italic">{group.name}</p>
                                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.invoices.length} RECORDED SETTLEMENTS</p>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-8 py-6 text-[10px] font-bold text-slate-300 uppercase italic">BATCH_AUDIT</td>
                                    <td className="px-8 py-6 text-center text-slate-300 font-bold text-xs">—</td>
                                    <td className="px-8 py-6 text-right font-bold text-slate-900 italic text-lg">{formatCurrency(group.total)}</td>
                                    <td className="px-8 py-6 text-center">
                                       <button onClick={(e) => exportGroupToExcel(e, group, 'report')} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-600 shadow-sm mx-auto active:scale-95">
                                          <Download size={18}/>
                                       </button>
                                    </td>
                                 </tr>
                                 {expandedGroups[group.name] && group.invoices.map((s, sIdx) => (
                                   <tr key={sIdx} className="group hover:bg-[#F8FAFC]/50 transition-colors">
                                      <td className="px-10 py-5 pl-24 text-[11px] font-bold text-slate-400 font-mono italic">
                                         {new Date(s.invoice_date).toLocaleDateString('en-GB')}
                                      </td>
                                      <td className="px-8 py-5">
                                         <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase italic tracking-tight">
                                            <Hash size={14} className="text-slate-200" /> {s.invoice_no}
                                         </div>
                                      </td>
                                      <td className="px-8 py-5 text-center">
                                         <div className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest inline-block ${s.payment_type === 'cash' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                            {s.payment_type?.toUpperCase() || 'CASH'}
                                         </div>
                                      </td>
                                      <td className="px-8 py-5 text-right font-bold text-slate-600 font-mono text-sm opacity-60 italic">
                                         {formatCurrency(s.total_amount)}
                                      </td>
                                      <td className="px-8 py-5 text-center">
                                         <button className="text-slate-300 hover:text-emerald-600 transition-colors"><ExternalLink size={16}/></button>
                                      </td>
                                   </tr>
                                 ))}
                              </React.Fragment>
                            ))
                          )
                        ) : (
                          Object.values(groupedSummary).length === 0 ? (
                            <tr><td colSpan="5" className="py-32 text-center italic font-bold text-slate-300 uppercase tracking-widest text-xs">Zero Revenue Vectors Isolated</td></tr>
                          ) : (
                            Object.values(groupedSummary).map((cat, cIdx) => (
                              <React.Fragment key={cIdx}>
                                 <tr onClick={() => toggleGroup(cat.name)} className="bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-all border-l-[6px] border-slate-900 group">
                                    <td className="px-10 py-6">
                                       <div className="flex items-center gap-4">
                                          <div className={`p-2 rounded-xl transition-all ${expandedGroups[cat.name] ? 'bg-slate-900 text-white' : 'bg-white text-slate-300 group-hover:text-slate-900 shadow-sm'}`}>
                                            {expandedGroups[cat.name] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                          </div>
                                          <div>
                                             <p className="font-bold text-slate-800 text-base tracking-tight uppercase italic">{cat.name}</p>
                                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cat.items.length} ACTIVE PRODUCT LINES</p>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-8 py-6 text-center text-slate-300 font-bold text-xs">—</td>
                                    <td className="px-8 py-6 text-right text-slate-300 font-bold text-xs">—</td>
                                    <td className="px-8 py-6 text-right font-bold text-slate-900 italic text-lg">{formatCurrency(cat.total)}</td>
                                    <td className="px-8 py-6 text-center">
                                       <button onClick={(e) => exportGroupToExcel(e, cat, 'summary')} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm mx-auto active:scale-95">
                                          <Download size={18}/>
                                       </button>
                                    </td>
                                 </tr>
                                 {expandedGroups[cat.name] && cat.items.map((item, iIdx) => (
                                   <tr key={iIdx} className="group hover:bg-[#F8FAFC]/50 transition-colors">
                                      <td className="px-10 py-5 pl-24">
                                         <div className="flex items-center gap-3">
                                            <Package size={16} className="text-slate-100" />
                                            <div>
                                               <p className="text-xs font-bold text-slate-800 uppercase italic tracking-tight leading-none mb-1">{item.item_name}</p>
                                               <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] font-mono">#{item.item_code}</p>
                                            </div>
                                         </div>
                                      </td>
                                      <td className="px-8 py-5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">{item.unit || 'NOS'}</td>
                                      <td className="px-8 py-5 text-right font-bold text-slate-400 font-mono text-sm leading-none italic">{formatQty(item.outward)}</td>
                                      <td className="px-8 py-5 text-right font-bold text-slate-600 font-mono text-sm leading-none opacity-60">
                                         {formatCurrency(parseFloat(item.outward || 0) * parseFloat(item.sale_price || 0))}
                                      </td>
                                      <td className="px-8 py-5 text-center">
                                         <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block"></span>
                                      </td>
                                   </tr>
                                 ))}
                              </React.Fragment>
                            ))
                          )
                        )}
                      </>
                    )}
                 </tbody>
              </table>
           </div>

           {/* Dashboard Insight Footer */}
           <div className="mt-auto p-10 border-t border-slate-50 bg-[#F8FAFC]/30 flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">
              <div className="flex items-center gap-6">
                 <span className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg shadow-sm border border-slate-50"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Revenue Stream: Optimal</span>
                 <span className="flex items-center gap-2"><Layout size={12}/> Repository Status: Validated</span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                 <span>REVENUE_CHRONO: {new Date().getTime().toString(16).toUpperCase()}</span>
                 <div className="w-px h-3 bg-slate-200"></div>
                 <span>REF: {company.id}</span>
              </div>
           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .scroller-airy::-webkit-scrollbar { width: 4px; }
        .scroller-airy::-webkit-scrollbar-track { background: transparent; }
        .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
    </div>
  );
}
