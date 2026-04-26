import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Eye, Printer, X, ShoppingBag, 
  TrendingUp, CreditCard, UserCheck, Layout, 
  RefreshCcw, ArrowRight, Calendar, ChevronRight, 
  Database, ShieldCheck, Activity, Package, FileText
} from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import SaleForm from '../components/SaleForm';

export default function Sale() {
  const { t } = useTranslation();
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    if (company?.id) {
      fetchSales();
    }
  }, [company]);

  const loadCompany = async () => {
    try {
      const response = await axios.get('/api/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      }
    } catch (error) {
       console.error('Failed to load company', error);
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );

      if (response.data.success) {
        setSales(response.data.data);
        applyFilters(response.data.data);
      }
    } catch (error) {
      console.error('Fetch sales error:', error);
    } finally {
       setLoading(false);
    }
  };

  const applyFilters = (salesData = sales) => {
    const filtered = salesData.filter(sale =>
      sale.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customer_name && sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredSales(filtered);
  };

  const viewSaleDetails = async (saleId) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/sales/${saleId}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );

      if (response.data.success) {
        setSelectedSale(response.data.data);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Get sale details error:', error);
    }
  };

  const handleFormSubmit = (newSale) => {
    setShowForm(false);
    fetchSales();
  };

  const handlePrintBill = () => {
    if (!selectedSale || !company) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    const invoiceDate = new Date(selectedSale.invoice_date).toLocaleDateString('en-IN');
    const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            padding: 20px;
          }
          .invoice { 
            background: white;
            max-width: 800px;
            margin: 0 auto;
            padding: 30px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 20px;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
          }
          .company-info {
            font-size: 12px;
            color: #666;
            margin-top: 10px;
          }
          .invoice-title {
            font-size: 18px;
            font-weight: bold;
            margin-top: 15px;
            color: #333;
          }
          .invoice-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
            font-size: 13px;
          }
          .meta-item {
            display: flex;
            justify-content: space-between;
          }
          .meta-label {
            font-weight: bold;
            color: #666;
          }
          .meta-value {
            color: #333;
          }
          .items-table {
            width: 100%;
            margin: 20px 0;
            border-collapse: collapse;
          }
          .items-table thead {
            background: #f0f0f0;
            border-top: 2px solid #ddd;
            border-bottom: 2px solid #ddd;
          }
          .items-table th {
            padding: 12px;
            text-align: left;
            font-weight: bold;
            color: #333;
            font-size: 13px;
          }
          .items-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #eee;
            font-size: 13px;
          }
          .items-table tr:last-child td {
            border-bottom: 2px solid #ddd;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .totals {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
          }
          .totals-box {
            width: 300px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 13px;
            border-bottom: 1px solid #ddd;
          }
          .total-row.subtotal {
            color: #666;
          }
          .total-row.discount {
            color: #ff6b35;
          }
          .total-row.net-amount {
            border-top: 2px solid #333;
            border-bottom: 2px solid #333;
            font-weight: bold;
            font-size: 16px;
            color: #1e40af;
            padding: 12px 0;
            margin: 10px 0;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            border-top: 1px solid #ddd;
            padding-top: 20px;
            font-size: 12px;
            color: #666;
          }
          .notes {
            margin-top: 20px;
            padding: 15px;
            background: #f9f9f9;
            border-left: 3px solid #ff9800;
            font-size: 12px;
          }
          .notes-label {
            font-weight: bold;
            color: #666;
            margin-bottom: 5px;
          }
          @media print {
            body { padding: 0; background: white; }
            .invoice { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice">
          <!-- Header -->
          <div class="header">
            <div class="company-name">${company.company_name}</div>
            <div class="company-info">Professional Sales Invoice</div>
            <div class="invoice-title">SALE BILL</div>
          </div>

          <!-- Invoice Meta -->
          <div class="invoice-meta">
            <div>
              <div class="meta-item">
                <span class="meta-label">Invoice #:</span>
                <span class="meta-value">${selectedSale.invoice_no}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Invoice Date:</span>
                <span class="meta-value">${invoiceDate}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Customer:</span>
                <span class="meta-value">${selectedSale.customer_name}</span>
              </div>
            </div>
            <div>
              <div class="meta-item">
                <span class="meta-label">Payment Type:</span>
                <span class="meta-value">${selectedSale.payment_type.charAt(0).toUpperCase() + selectedSale.payment_type.slice(1)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Created By:</span>
                <span class="meta-value">${selectedSale.created_by_user}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Print Date:</span>
                <span class="meta-value">${currentDate}</span>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40%;">Item</th>
                <th class="text-center" style="width: 15%;">Quantity</th>
                <th class="text-right" style="width: 15%;">Rate</th>
                <th class="text-right" style="width: 30%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(selectedSale.items || []).map(item => `
                <tr>
                  <td>${item.item_name}</td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">₹${parseFloat(item.sale_rate || 0).toFixed(2)}</td>
                  <td class="text-right">₹${parseFloat(item.amount || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Totals -->
          <div class="totals">
            <div class="totals-box">
              <div class="total-row subtotal">
                <span>Subtotal:</span>
                <span>₹${parseFloat(selectedSale.total_amount || 0).toFixed(2)}</span>
              </div>
              ${parseFloat(selectedSale.discount_amount || 0) > 0 ? `
                <div class="total-row discount">
                  <span>Discount:</span>
                   <span>-₹${parseFloat(selectedSale.discount_amount || 0).toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="total-row net-amount">
                <span>Net Amount:</span>
                <span>₹${parseFloat(selectedSale.net_amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          ${selectedSale.notes ? `
            <div class="notes">
              <div class="notes-label">Notes:</div>
              <div>${selectedSale.notes}</div>
            </div>
          ` : ''}

          <!-- Footer -->
          <div class="footer">
            <p>Thank you for your business!</p>
            <p style="margin-top: 10px; font-size: 11px;">This is a computer-generated receipt. No signature required.</p>
          </div>
        </div>

        <script>
          window.addEventListener('load', function() {
            window.print();
            setTimeout(function() { window.close(); }, 1000);
          });
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const stats = {
    totalSales: filteredSales.length,
    totalAmount: filteredSales.reduce((sum, s) => sum + (parseFloat(s.net_amount) || 0), 0),
    totalItems: filteredSales.reduce((sum, s) => sum + (parseInt(s.item_count) || 0), 0),
    uniqueCustomers: new Set(filteredSales.map(s => s.customer_name)).size
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="text-center font-black uppercase tracking-widest text-slate-300">
          <p className="text-xs mb-6 italic tracking-[0.4em]">Initialising Revenue Channel...</p>
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
              <ShoppingBag size={12} />
              <span>Revenue Core / Live Sales Manifest</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Sales Command Center</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 px-8 py-3.5 rounded-2xl text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            <Plus size={20} />
            {t('sale.createSale', 'Initialize Sale')}
          </button>
        </div>

        {/* Revenue Metric Grid - Compact Airy Shards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 print:hidden">
           {[
              { label: t('sale.totalSales', 'Total Sales'), val: stats.totalSales, icon: <Layout size={18}/>, color: 'blue' },
              { label: t('sale.totalAmount', 'Total Proceeds'), val: `₹${stats.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: <TrendingUp size={18}/>, color: 'emerald' },
              { label: t('sale.totalItems', 'Density (Units)'), val: stats.totalItems, icon: <Package size={18}/>, color: 'indigo' },
              { label: t('sale.uniqueCustomers', 'Active Identities'), val: stats.uniqueCustomers, icon: <UserCheck size={18}/>, color: 'slate' }
           ].map((stat, i) => (
             <div key={i} className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm group hover:border-slate-200 transition-all">
                <div className="flex justify-between items-start mb-4">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{stat.label}</p>
                   <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                </div>
                <p className="text-4xl font-bold text-slate-800 tracking-tighter">{stat.val}</p>
             </div>
           ))}
        </div>

        {/* Command Deck Toolbar */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm mb-10 print:hidden flex flex-wrap items-end gap-6">
           <div className="flex-1 min-w-[350px]">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 italic">Identity Manifest Search</span>
              <div className="relative group">
                 <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                 <input 
                    type="text" 
                    placeholder={t('sale.searchInvoice', 'SEARCH BY INVOICE OR CUSTOMER...')}
                    value={searchTerm}
                    onChange={(e) => {
                       setSearchTerm(e.target.value);
                       applyFilters(sales);
                    }}
                    className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold uppercase text-[11px] tracking-widest"
                 />
              </div>
           </div>

           <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm h-full">
              <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all font-mono" />
              <ArrowRight size={14} className="text-slate-200" />
              <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 transition-all font-mono" />
           </div>

           <button onClick={fetchSales} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-xl active:scale-95 h-[52px]">{t('sale.filter', 'Sync Manifest')}</button>
        </div>

        {/* Sales Registry Manifest */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[600px] relative">
           
           <div className="px-8 py-5 border-b border-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] italic">Consolidated Yield registry</p>
              </div>
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Density: {filteredSales.length} Transactions</p>
           </div>

           <div className="flex-1 overflow-x-auto px-4 pb-12 scroller-airy">
              <table className="w-full text-left">
                 <thead className="bg-[#F8FAFC]">
                    <tr className="uppercase text-[10px] font-bold text-slate-400 tracking-widest italic">
                       <th className="px-8 py-5">Invoice Manifest</th>
                       <th className="px-8 py-5">{t('sale.customer', 'Identity Node')}</th>
                       <th className="px-8 py-5 text-center">{t('sale.items', 'Density')}</th>
                       <th className="px-8 py-5 text-right">{t('sale.amount', 'Gross Yield')}</th>
                       <th className="px-8 py-5 text-center">{t('sale.payment', 'Settlement')}</th>
                       <th className="px-8 py-5 text-center">{t('sale.date', 'Timeline')}</th>
                       <th className="px-8 py-5 text-center">{t('sale.action', 'Audit')}</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {loading ? (
                       <tr>
                         <td colSpan="7" className="py-32 text-center text-slate-200">
                            <RefreshCcw className="animate-spin mx-auto mb-4" size={50} />
                            <p className="text-[10px] font-bold uppercase tracking-[0.4em] italic">Building Secure Log Stream...</p>
                         </td>
                       </tr>
                    ) : filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-32 text-center">
                           <Layout className="text-slate-100 mx-auto" size={70} strokeWidth={1} />
                           <p className="mt-4 text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">Zero Revenue Nodes Isolated</p>
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map((sale, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                           <td className="px-8 py-6">
                              <span className="text-sm font-bold text-slate-800 uppercase italic tracking-tight font-mono">#{sale.invoice_no}</span>
                           </td>
                           <td className="px-8 py-6">
                              <p className="text-sm font-bold text-slate-800 uppercase italic tracking-tight">{sale.customer_name}</p>
                              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">ID: {sale.member_code || 'WALK-IN'}</p>
                           </td>
                           <td className="px-8 py-6 text-center">
                              <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sale.item_count} NODES</span>
                           </td>
                           <td className="px-8 py-6 text-right font-bold text-slate-800 italic text-base">₹{parseFloat(sale.net_amount || 0).toFixed(2)}</td>
                           <td className="px-8 py-6 text-center">
                              <span className={`px-4 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest inline-flex items-center gap-2 border ${
                                 sale.payment_type === 'credit' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              }`}>
                                 <div className={`w-1.5 h-1.5 rounded-full ${sale.payment_type === 'credit' ? 'bg-indigo-600' : 'bg-emerald-600'}`}></div>
                                 {sale.payment_type}
                              </span>
                           </td>
                           <td className="px-8 py-6 text-center font-mono text-slate-400 text-xs italic">{sale.invoice_date}</td>
                           <td className="px-8 py-6 text-center">
                              <button onClick={() => viewSaleDetails(sale.id)} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm mx-auto active:scale-95">
                                 <Eye size={18}/>
                              </button>
                           </td>
                        </tr>
                      ))
                    )}
                 </tbody>
              </table>
           </div>

           {/* Dashboard Insight Footer */}
           <div className="mt-auto p-10 border-t border-slate-50 bg-[#F8FAFC]/30 flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">
              <div className="flex items-center gap-6">
                 <span className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg shadow-sm border border-slate-50"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Audit Status: Verified</span>
                 <span className="flex items-center gap-2"><Layout size={12}/> Nodes Scanning: {sales.length}</span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                 <span>SYS_SHA: {new Date().getTime().toString(16).toUpperCase()}</span>
                 <div className="w-px h-3 bg-slate-200"></div>
                 <span>REF: {company.id}</span>
              </div>
           </div>
        </div>
      </div>

      {/* Sale Details Modal - Premium Glassmorphic */}
      {showDetails && selectedSale && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-8 z-[1000] animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-500 relative">
               
               {/* Modal Header Shard */}
               <div className="bg-slate-900 p-10 flex justify-between items-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32"></div>
                  <div className="relative z-10 flex items-center gap-6">
                     <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-white"><FileText size={32}/></div>
                     <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">Invoice Isolation Log</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">
                           Vector Path: #{selectedSale.invoice_no} / {selectedSale.customer_name}
                        </p>
                     </div>
                  </div>
                  <div className="flex gap-3 relative z-10">
                     <button onClick={handlePrintBill} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl transition-all active:scale-95"><Printer size={20}/></button>
                     <button onClick={() => setShowDetails(false)} className="bg-white/10 hover:bg-red-500/20 text-white p-3 rounded-2xl transition-all active:scale-95"><X size={20}/></button>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-10 scroller-airy">
                  <div className="grid grid-cols-2 gap-8 mb-10 bg-[#F8FAFC]/50 p-8 rounded-[2rem] border border-slate-100">
                     <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 italic">Timeline Node</p>
                        <p className="text-sm font-bold text-slate-800 italic uppercase">{selectedSale.invoice_date}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 italic">Settlement Vector</p>
                        <p className="text-sm font-bold text-slate-800 italic uppercase">{selectedSale.payment_type}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 italic">Authorized Agent</p>
                        <p className="text-sm font-bold text-slate-800 italic uppercase">{selectedSale.created_by_user}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 italic">Identity Ref</p>
                        <p className="text-sm font-bold text-slate-800 italic uppercase">{selectedSale.member_code || 'GENERIC'}</p>
                     </div>
                  </div>

                  <div className="mb-10">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-4">
                        <div className="w-8 h-0.5 bg-slate-200"></div> Payload Breakdown
                     </h4>
                     <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                           <thead className="bg-[#F8FAFC]">
                              <tr className="uppercase text-[9px] font-bold text-slate-400 tracking-widest italic border-b border-slate-100">
                                 <th className="px-6 py-4">Inventory Node</th>
                                 <th className="px-6 py-4 text-center">Density</th>
                                 <th className="px-6 py-4 text-right">Yield</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50 text-xs">
                              {(selectedSale.items || []).map((item, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                   <td className="px-6 py-4">
                                      <p className="font-bold text-slate-800 uppercase italic tracking-tight leading-none mb-1">{item.item_name}</p>
                                      <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">UNIT_VAL: ₹{parseFloat(item.sale_rate || 0).toFixed(2)}</p>
                                   </td>
                                   <td className="px-6 py-4 text-center font-bold text-slate-800 italic">{item.quantity} units</td>
                                   <td className="px-6 py-4 text-right font-bold text-slate-800 font-mono italic">₹{parseFloat(item.amount || 0).toFixed(2)}</td>
                                </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>

                  <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                     <div className="absolute inset-0 bg-linear-to-r from-blue-600/10 to-transparent"></div>
                     <div className="flex justify-between items-end relative z-10">
                        <div>
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mb-4 italic">Aggregate Fiscal Settlement</p>
                           <h5 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Net Proceeds</h5>
                        </div>
                        <div className="text-right">
                           <p className="text-sm border-b border-white/10 pb-2 mb-2 font-mono text-slate-400">Yield: ₹{parseFloat(selectedSale.total_amount || 0).toFixed(2)}</p>
                           <p className="text-4xl font-black italic font-mono tracking-tighter">₹{parseFloat(selectedSale.net_amount || 0).toFixed(2)}</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Sale Form Modal */}
      {showForm && <SaleForm onSubmit={handleFormSubmit} onCancel={() => setShowForm(false)} />}

      <style dangerouslySetInnerHTML={{ __html: `
        .scroller-airy::-webkit-scrollbar { width: 4px; }
        .scroller-airy::-webkit-scrollbar-track { background: transparent; }
        .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
    </div>
  );
}
