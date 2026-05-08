import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Eye, Printer, X, ShoppingBag,
  TrendingUp, CreditCard, UserCheck, Layout,
  RefreshCcw, ArrowRight, Calendar, ChevronRight,
  Database, ShieldCheck, Activity, Package, FileText,
  Info, Filter, Download
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SaleForm from '../components/SaleForm';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';
import Toast from '../components/Toast';
import api from '../api';
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
  const [message, setMessage] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showDetails && e.key === 'Enter') {
        e.preventDefault();
        handlePrintBill();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDetails, selectedSale]);

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
      const response = await api.get('/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load company', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sales', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });

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
      const response = await api.get(`/sales/${saleId}`);

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

  const handleDownloadCSV = () => {
    const headers = ['Invoice No', 'Date', 'Customer Name', 'Member Code', 'Item Count', 'Net Amount', 'Payment Type'];
    const rows = filteredSales.map(sale => [
      `"${sale.invoice_no}"`,
      `"${sale.invoice_date}"`,
      `"${sale.customer_name}"`,
      `"${sale.member_code || 'Walk-In'}"`,
      sale.item_count,
      parseFloat(sale.net_amount || 0).toFixed(2),
      `"${sale.payment_type}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sales_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    const cName = company ? (company.company_name || 'Company') : 'Company';
    const totalAmt = filteredSales.reduce((s, x) => s + parseFloat(x.net_amount || 0), 0);
    const win = window.open('', '_blank', 'width=900,height=800');
    const rows = filteredSales.map((s, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td>${s.customer_name || 'Walk-In'}</td>
        <td>${s.invoice_date}</td>
        <td>#${s.invoice_no}</td>
        <td style="text-align:center">${s.item_count} Items</td>
        <td style="text-align:right">${parseFloat(s.net_amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
        <td style="text-align:center">${(s.payment_type || 'cash').toUpperCase()}</td>
      </tr>`);
    win.document.write(`
      <html><head><title>${cName} - Sales Registry</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:10px;color:#1e293b;padding:20px}
        .logo-bar{background:#0f172a;color:#fff;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-radius:4px}
        .logo-bar h1{font-size:13px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}
        .logo-bar span{font-size:9px;color:#94a3b8}
        .report-title{font-size:18px;font-weight:900;text-transform:uppercase;color:#0f172a;margin-bottom:2px}
        .report-sub{font-size:9px;color:#64748b;margin-bottom:10px}
        .divider{border:none;border-top:1px solid #e2e8f0;margin:8px 0}
        table{width:100%;border-collapse:collapse;margin-top:6px}
        thead tr{background:#0f172a;color:#fff}
        th{padding:7px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:left}
        td{padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:9px}
        tfoot tr{background:#1e293b;color:#fff;font-weight:700}
        @media print{@page{size:A4 portrait;margin:1.5cm}}
      </style></head><body>
      <div class='logo-bar'><h1>${cName}</h1><span>Sales Registry / Analytics &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN')}</span></div>
      <div class='report-title'>Sales Manifest Registry</div>
      <div class='report-sub'>Total Sales: ${filteredSales.length} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</div>
      <hr class='divider'/>
      <table>
        <thead><tr>
          <th>Client</th><th>Date</th><th>Invoice</th><th>Items</th>
          <th style='text-align:right'>Net Proceeds</th>
          <th style='text-align:center'>Mode</th>
        </tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot><tr>
          <td colspan='4'>TOTALS &mdash; ${filteredSales.length} Records</td>
          <td style='text-align:right'>${totalAmt.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</td>
          <td></td>
        </tr></tfoot>
      </table>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const stats = {
    totalSales: filteredSales.length,
    totalAmount: filteredSales.reduce((sum, s) => sum + (parseFloat(s.net_amount) || 0), 0),
    totalItems: filteredSales.reduce((sum, s) => sum + (parseInt(s.item_count) || 0), 0),
    uniqueCustomers: new Set(filteredSales.map(s => s.customer_name)).size
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-8 font-sans">
        <div className="text-center font-bold text-zinc-400">
          <p className="text-xs mb-4 uppercase tracking-widest font-mono">Loading Enterprise Core...</p>
          <RefreshCcw className="animate-spin mx-auto text-blue-500" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none animate-none">
      <Toast message={message} onClose={() => setMessage(null)} />
      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
              <ShoppingBag size={20} className="text-zinc-600" />
              Sales Command Center
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">Revenue Core / Live Sales Manifest</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none uppercase tracking-widest"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none uppercase tracking-widest"
            >
              <FileText size={14} /> PDF
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm uppercase tracking-widest select-none"
            >
              <Plus size={16} />
              Initialize Sale
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between h-24">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Total Sales</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{stats.totalSales}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between h-24">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Total Proceeds</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">₹{stats.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between h-24">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Density (Units)</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{stats.totalItems}</span>
          </div>
          <div className="bg-zinc-50 border border-zinc-300 p-3 flex flex-col justify-between h-24">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Active Identities</span>
            <span className="text-2xl font-bold font-mono text-zinc-800 mt-1">{stats.uniqueCustomers}</span>
          </div>
        </div>

        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[500px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex flex-wrap items-center justify-between gap-3">
             <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                   Revenue Manifest
                </span>
                <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-mono text-[10px] px-2 py-0.5 uppercase">
                   {filteredSales.length} RECORDS
                </span>
             </div>
             
             <div className="flex items-center flex-wrap gap-2">
               <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500">
                 <Search className="w-4 h-4 text-zinc-400" />
                 <input
                   type="text"
                   placeholder="Search identity..."
                   value={searchTerm}
                   onChange={(e) => {
                     setSearchTerm(e.target.value);
                     applyFilters(sales);
                   }}
                   className="bg-transparent text-xs font-bold text-zinc-700 outline-none w-64 placeholder:text-zinc-300 font-mono"
                 />
               </div>
               <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500">
                 <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="bg-transparent border-none outline-none text-[10px] font-bold text-zinc-700 font-mono" />
                 <ArrowRight size={14} className="text-zinc-400" />
                 <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="bg-transparent border-none outline-none text-[10px] font-bold text-zinc-700 font-mono" />
               </div>
               <button onClick={fetchSales} className="px-3 py-1.5 bg-blue-600 text-white border border-blue-500 font-bold uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all flex items-center gap-2">
                 <Filter size={14} />
                 SYNC
               </button>
             </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-white select-none">
            <table className="w-full text-left border-collapse font-sans text-xs select-none">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-300 text-[10px] font-bold text-zinc-600 uppercase tracking-wider select-none font-sans">
                  <th className="px-4 py-2 border-r border-zinc-200">Invoice</th>
                  <th className="px-4 py-2 border-r border-zinc-200">Identity Node</th>
                  <th className="px-4 py-2 border-r border-zinc-200 text-center">Density</th>
                  <th className="px-4 py-2 border-r border-zinc-200 text-right">Gross Yield</th>
                  <th className="px-4 py-2 border-r border-zinc-200 text-center">Settlement</th>
                  <th className="px-4 py-2 border-r border-zinc-200 text-center">Timeline</th>
                  <th className="px-4 py-2 text-center">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-xs font-mono">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-20 text-center">
                      <RefreshCcw className="animate-spin mx-auto mb-4 text-blue-500" size={24} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Synchronizing Data Stream...</p>
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-20 text-center">
                      <Layout className="text-zinc-300 mx-auto mb-4" size={40} strokeWidth={1} />
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Zero Revenue Nodes Isolated</p>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale, idx) => (
                    <tr key={idx} className="group hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3 border-r border-zinc-200">
                        <span className="text-sm font-bold text-zinc-800 tracking-tight font-mono">#{sale.invoice_no}</span>
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-200">
                        <p className="text-sm font-bold text-zinc-800 uppercase tracking-tight leading-none mb-1 font-sans">{sale.customer_name}</p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-sans">ID: {sale.member_code || 'WALK-IN'}</p>
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-200 text-center">
                        <span className="px-2 py-0.5 border border-zinc-300 bg-zinc-100 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{sale.item_count} NODES</span>
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-blue-600 text-sm font-mono">₹{parseFloat(sale.net_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 border-r border-zinc-200 text-center">
                        <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase tracking-widest inline-flex items-center gap-1.5 ${sale.payment_type === 'credit' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                          {sale.payment_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-r border-zinc-200 text-center font-mono text-zinc-500 text-[10px] uppercase tracking-widest">{sale.invoice_date}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => viewSaleDetails(sale.id)} className="w-8 h-8 bg-white border border-zinc-300 flex items-center justify-center text-zinc-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all mx-auto active:scale-95">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showDetails && selectedSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-none" onClick={() => setShowDetails(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-none border border-zinc-400 shadow-xl overflow-hidden flex flex-col max-h-[90vh] font-sans animate-none select-none">
            <div className="bg-zinc-100 p-4 border-b border-zinc-300 flex justify-between items-center relative overflow-hidden shrink-0">
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-8 h-8 border border-zinc-300 bg-white flex items-center justify-center text-zinc-600"><FileText size={16} /></div>
                <div>
                  <h2 className="text-xs font-bold text-zinc-800 uppercase tracking-widest leading-none">Invoice Isolation</h2>
                  <p className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest mt-1">MANIFEST NODE: #{selectedSale.invoice_no}</p>
                </div>
              </div>
              <div className="flex gap-2 relative z-10">
                <button onClick={handlePrintBill} className="p-1 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-600 transition-all select-none" title="Print (Enter)"><Printer size={16} /></button>
                <button onClick={() => setShowDetails(false)} className="p-1 border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-red-600 transition-all"><X size={16} /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-zinc-50">
              <div className="grid grid-cols-2 gap-4 mb-6 bg-white p-4 border border-zinc-300">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Identity Vector</p>
                  <p className="text-sm font-bold text-zinc-800 uppercase italic tracking-tight">{selectedSale.customer_name}</p>
                  <p className="text-[10px] font-mono text-blue-600 font-bold">ID: {selectedSale.member_code || 'GENERIC'}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Settlement Log</p>
                  <p className="text-sm font-bold text-zinc-800 uppercase italic tracking-tight">{selectedSale.payment_type}</p>
                  <p className="text-[10px] font-mono text-zinc-500">{selectedSale.invoice_date}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                   Payload Breakdown
                </h4>
                <div className="border border-zinc-300 overflow-hidden bg-white">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead className="bg-zinc-50 text-[9px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-300 font-sans">
                      <tr>
                        <th className="px-4 py-3 border-r border-zinc-200">Inventory Node</th>
                        <th className="px-4 py-3 text-center border-r border-zinc-200">Qty</th>
                        <th className="px-4 py-3 text-right">Yield</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 text-zinc-700 font-bold font-sans uppercase">
                      {(selectedSale.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-3 border-r border-zinc-200">{item.item_name}</td>
                          <td className="px-4 py-3 text-center border-r border-zinc-200">{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-mono">₹{parseFloat(item.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-zinc-100 p-4 border border-zinc-300 text-zinc-800 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Total Fiscal Proceeds</p>
                  <h5 className="text-xl font-bold uppercase leading-none tracking-tight italic">Net Yield</h5>
                </div>
                <p className="text-2xl font-bold font-mono tracking-tighter text-blue-600">₹{parseFloat(selectedSale.net_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && <SaleForm onSubmit={handleFormSubmit} onCancel={() => setShowForm(false)} />}
    </div>
  );
}
