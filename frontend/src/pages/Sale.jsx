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
import { exportToPDF } from '../utils/pdfExporter';
export default function Sale() {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';
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
      ((sale.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
      ((sale.customer_name_gu || '').toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredSales(filtered);
  };

  const displaySaleCustomer = (sale) => {
    if (!sale) return '';
    return isGu
      ? (sale.customer_name_gu || sale.customer_name || '')
      : (sale.customer_name || sale.customer_name_gu || '');
  };

  const displaySaleItem = (item) => {
    if (!item) return '';
    return isGu
      ? (item.item_name_gu || item.item_name || '')
      : (item.item_name || item.item_name_gu || '');
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
            <div class="company-info">${t('saleMaster.bill.professionalInvoice')}</div>
            <div class="invoice-title">${t('saleMaster.bill.title')}</div>
          </div>
 
          <!-- Invoice Meta -->
          <div class="invoice-meta">
            <div>
              <div class="meta-item">
                <span class="meta-label">${t('saleMaster.bill.invoiceNo')}:</span>
                <span class="meta-value">${selectedSale.invoice_no}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">${t('saleMaster.bill.invoiceDate')}:</span>
                <span class="meta-value">${invoiceDate}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">${t('saleMaster.bill.customer')}:</span>
                <span class="meta-value">${displaySaleCustomer(selectedSale)}</span>
              </div>
            </div>
            <div>
              <div class="meta-item">
                <span class="meta-label">${t('saleMaster.bill.paymentType')}:</span>
                <span class="meta-value">${selectedSale.payment_type === 'cash' ? t('saleForm.cash') : t('saleForm.credit')}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">${t('saleMaster.bill.createdBy')}:</span>
                <span class="meta-value">${selectedSale.created_by_user}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">${t('saleMaster.bill.printDate')}:</span>
                <span class="meta-value">${currentDate}</span>
              </div>
            </div>
          </div>
 
          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40%;">${t('saleMaster.bill.inventoryNode')}</th>
                <th class="text-center" style="width: 15%;">${t('saleMaster.bill.qty')}</th>
                <th class="text-right" style="width: 15%;">${t('saleMaster.table.rate')}</th>
                <th class="text-right" style="width: 30%;">${t('saleMaster.table.amount')}</th>
              </tr>
            </thead>
            <tbody>
              ${(selectedSale.items || []).map(item => `
                <tr>
                  <td>${displaySaleItem(item)}</td>
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
                <span>${t('saleMaster.bill.subtotal')}:</span>
                <span>₹${parseFloat(selectedSale.total_amount || 0).toFixed(2)}</span>
              </div>
              ${parseFloat(selectedSale.discount_amount || 0) > 0 ? `
                <div class="total-row discount">
                  <span>${t('saleMaster.bill.discount')}:</span>
                   <span>-₹${parseFloat(selectedSale.discount_amount || 0).toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="total-row net-amount">
                <span>${t('saleMaster.bill.netAmount')}:</span>
                <span>₹${parseFloat(selectedSale.net_amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
 
          ${selectedSale.notes ? `
            <div class="notes">
              <div class="notes-label">${t('saleMaster.bill.notes')}:</div>
              <div>${selectedSale.notes}</div>
            </div>
          ` : ''}
 
          <!-- Footer -->
          <div class="footer">
            <p>${t('saleMaster.bill.thanks')}</p>
            <p style="margin-top: 10px; font-size: 11px;">${t('saleMaster.bill.computerGenerated')}</p>
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
      `"${displaySaleCustomer(sale)}"`,
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

  const handleExportPDF = async () => {
    if (!filteredSales.length) return;

    const totalAmt = filteredSales.reduce((s, x) => s + parseFloat(x.net_amount || 0), 0);
    const totalItems = filteredSales.reduce((s, x) => s + parseInt(x.item_count || 0), 0);

    const rowsWithTotal = [
      ...filteredSales,
      { isTotal: true, totalCount: filteredSales.length, totalAmt, totalItems }
    ];

    const columns = [
      {
        header: isGu ? 'ક્રમ' : 'Sr.',
        align: 'center',
        width: '5%',
        render: (s, idx) => {
          if (s.isTotal) return '';
          return String(idx + 1);
        }
      },
      {
        header: t('saleMaster.registryReport.client') || (isGu ? 'ગ્રાહક' : 'Customer'),
        align: 'left',
        width: '26%',
        render: (s) => {
          if (s.isTotal) return `<strong style="font-size:12px;">${isGu ? 'કુલ' : 'Total'} (${s.totalCount} ${isGu ? 'રેકોર્ડ્સ' : 'Records'})</strong>`;
          const name = displaySaleCustomer(s) || (isGu ? 'નોધાયેલ' : 'Walk-In');
          const code = s.member_code ? `<br/><span style="font-size:10px;color:#555;">${s.member_code}</span>` : '';
          return `<strong>${name}</strong>${code}`;
        },
        usePromptFont: true
      },
      {
        header: t('saleMaster.registryReport.invoice') || (isGu ? 'ઇન્વોઇસ' : 'Invoice'),
        align: 'center',
        width: '14%',
        render: (s) => {
          if (s.isTotal) return '';
          return `#${s.invoice_no}`;
        }
      },
      {
        header: t('saleMaster.registryReport.date') || (isGu ? 'તારીખ' : 'Date'),
        align: 'center',
        width: '14%',
        render: (s) => {
          if (s.isTotal) return '';
          return s.invoice_date
            ? new Date(s.invoice_date).toLocaleDateString('en-GB').replace(/\//g, '-')
            : '—';
        }
      },
      {
        header: t('saleMaster.registryReport.items') || (isGu ? 'આઇટમ્સ' : 'Items'),
        align: 'center',
        width: '10%',
        render: (s) => {
          if (s.isTotal) return `<strong>${s.totalItems}</strong>`;
          return String(s.item_count || 0);
        }
      },
      {
        header: t('saleMaster.registryReport.netProceeds') || (isGu ? 'નેટ રકમ' : 'Net Amount'),
        align: 'right',
        width: '18%',
        render: (s) => {
          const val = s.isTotal ? s.totalAmt : parseFloat(s.net_amount || 0);
          return `<strong>₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>`;
        }
      },
      {
        header: t('saleMaster.registryReport.mode') || (isGu ? 'પ્રકાર' : 'Payment'),
        align: 'center',
        width: '13%',
        render: (s) => {
          if (s.isTotal) return '';
          return s.payment_type === 'cash'
            ? (isGu ? 'નગદ' : 'Cash')
            : (isGu ? 'ઉધાર' : 'Credit');
        }
      }
    ];

    const metaInfo = [
      {
        label: isGu ? 'સમયગાળો' : 'Period',
        value: `${dateRange.startDate.split('-').reverse().join('-')} — ${dateRange.endDate.split('-').reverse().join('-')}`
      },
      {
        label: isGu ? 'કુલ વેચાણ' : 'Total Sales',
        value: String(filteredSales.length)
      }
    ];

    await exportToPDF({
      title: t('saleMaster.registryReport.title') || (isGu ? 'વેચાણ રજીસ્ટ્રી' : 'Sales Registry'),
      columns,
      rows: rowsWithTotal,
      isGu,
      metaInfo,
      filename: `Sales_Registry_${new Date().toISOString().split('T')[0]}.pdf`,
      onStart: () => setLoading(true),
      onComplete: () => setLoading(false)
    });
  };

  const stats = {
    totalSales: filteredSales.length,
    totalAmount: filteredSales.reduce((sum, s) => sum + (parseFloat(s.net_amount) || 0), 0),
    totalItems: filteredSales.reduce((sum, s) => sum + (parseInt(s.item_count) || 0), 0),
    uniqueCustomers: new Set(filteredSales.map(s => displaySaleCustomer(s))).size
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 font-sans">
        <div className="text-center font-bold text-slate-400">
          <p className="text-xs mb-4 uppercase tracking-widest font-mono">{t('common.loading')}</p>
          <RefreshCcw className="animate-spin mx-auto text-[#1d5f84]" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 select-none pb-12">
      <Toast message={message} onClose={() => setMessage(null)} />
      
      <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">
        {/* Stats Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('saleMaster.stats.totalSales')}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{stats.totalSales}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('saleMaster.stats.totalProceeds')}</span>
            <span className="text-[13px] font-bold font-sans text-emerald-600 mt-1">₹{stats.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('saleMaster.stats.densityUnits')}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{stats.totalItems}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('saleMaster.stats.activeIdentities')}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{stats.uniqueCustomers}</span>
          </div>
        </div>

        {/* Registry Table Wrapper */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none">
          {/* Table Control Header Bar */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
             <div className="flex items-center gap-2">
                <span className={`text-xs font-extrabold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>
                   {t('saleMaster.title')}
                </span>
                <span className="bg-slate-200 text-slate-600 font-bold force-en text-[9px] px-1.5 py-0.5 rounded-sm">
                   {filteredSales.length} {t('saleMaster.records')}
                </span>
             </div>
             
             <div className="flex items-center gap-2 flex-wrap">
               {/* Search Bar */}
               <div className="relative flex items-center border border-slate-200 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] rounded-md bg-white px-2.5 py-1 transition-colors w-48 sm:w-64">
                 <Search size={12} className="text-slate-400 mr-1.5" />
                 <input
                   type="text"
                   placeholder={t('saleMaster.searchPlaceholder')}
                   value={searchTerm}
                   onChange={(e) => { setSearchTerm(e.target.value); applyFilters(sales); }}
                   className="bg-transparent border-none outline-none text-xs text-slate-700 placeholder:text-slate-300 w-full font-semibold"
                 />
                 {searchTerm && (
                   <button onClick={() => {setSearchTerm(''); applyFilters(sales);}} className="p-0.5 text-slate-300 hover:text-slate-600 transition">
                     <X size={10} />
                   </button>
                 )}
               </div>
               
               {/* Date Range */}
               <div className="flex items-center gap-1.5 border border-slate-200 rounded-md bg-white px-2 py-0.5">
                 <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-600 uppercase" />
                 <ArrowRight size={10} className="text-slate-400" />
                 <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-600 uppercase" />
               </div>

               {/* Sync/Filter Button */}
               <button onClick={fetchSales} className="h-7 flex items-center gap-1.5 px-2.5 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[11px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider">
                 <Filter size={13} />
                 <span>{t('saleMaster.sync')}</span>
               </button>

               {/* Export CSV/PDF */}
               <button onClick={handleDownloadCSV} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer" title={t('saleMaster.csv')}>
                 <Download size={13} className="text-slate-500" />
               </button>
               <button onClick={handleExportPDF} className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer" title={t('saleMaster.pdf')}>
                 <FileText size={13} className="text-slate-500" />
               </button>
               
               {/* Add New */}
               <button onClick={() => setShowForm(true)} className="h-7 flex items-center gap-1.5 px-2.5 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[11px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider ml-1">
                 <Plus size={13} />
                 <span>{t('saleMaster.initializeSale')}</span>
               </button>
             </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-slate-200 border-collapse text-[11px]">
              <thead className="bg-slate-50 font-sans">
                <tr>
                  <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-24">{t('saleMaster.table.invoice')}</th>
                  <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('saleMaster.table.identityNode')}</th>
                  <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('saleMaster.table.grossYield')}</th>
                  <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-24">{t('saleMaster.table.settlement')}</th>
                  <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 w-20">{t('saleMaster.table.audit')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-20 text-center">
                      <RefreshCcw className="animate-spin mx-auto mb-4 text-slate-400" size={24} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t('saleMaster.loadingData')}</p>
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-20 text-center">
                      <Layout className="text-slate-300 mx-auto mb-4" size={40} strokeWidth={1} />
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('saleMaster.noRecords')}</p>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-3.5 py-2 text-center font-mono text-slate-600 border-r border-slate-100">
                        <span className="font-bold text-[#1d5f84] text-[9px]">#{sale.invoice_no}</span>
                      </td>
                      <td className="px-3.5 py-2 border-r border-slate-100">
                        <div className="flex flex-col">
                          <span className={`font-bold text-slate-800 ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>{displaySaleCustomer(sale)}</span>
                          <span className="text-[9px] font-mono text-slate-400">ID: {sale.member_code || 'WALK-IN'}</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono font-bold text-emerald-600 border-r border-slate-100">
                        ₹{parseFloat(sale.net_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3.5 py-2 text-center border-r border-slate-100">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border uppercase ${sale.payment_type === 'cash' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                          {sale.payment_type === 'cash' ? t('sale.cash') : t('sale.credit')}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        <button onClick={() => viewSaleDetails(sale.id)} className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 hover:text-[#1d5f84] transition cursor-pointer">
                          <Eye size={11} />
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
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px] transition-opacity duration-150" onClick={() => setShowDetails(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] font-sans select-none z-10">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className={`text-xs font-bold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>{t('saleMaster.details.isolation')}</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">{t('saleMaster.details.manifestNode')}: #{selectedSale.invoice_no}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePrintBill} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition rounded-md cursor-pointer" title={t('common.print')}><Printer size={15} /></button>
                <button onClick={() => setShowDetails(false)} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition rounded-md cursor-pointer"><X size={15} /></button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 bg-white">
              <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-50 p-4 border border-slate-200 rounded-md">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('saleMaster.details.identityVector')}</p>
                  <p className={`text-xs font-bold text-slate-800 ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>{displaySaleCustomer(selectedSale)}</p>
                  <p className="text-[10px] font-mono text-[#1d5f84] font-bold">ID: {selectedSale.member_code || 'GENERIC'}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('saleMaster.details.settlementLog')}</p>
                  <p className="text-xs font-bold text-slate-800 uppercase font-sans">{selectedSale.payment_type === 'cash' ? t('saleForm.cash') : t('saleForm.credit')}</p>
                  <p className="text-[10px] font-mono text-slate-500">{selectedSale.invoice_date}</p>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                   {t('saleMaster.details.payloadBreakdown')}
                </h4>
                <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                  <table className="min-w-full divide-y divide-slate-200 border-collapse text-[11px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('saleMaster.details.inventoryNode')}</th>
                        <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-24">{t('saleMaster.details.qty')}</th>
                        <th className="px-3.5 py-2 text-right font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">{t('saleMaster.details.yield')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {(selectedSale.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/75 transition-colors">
                          <td className={`px-3.5 py-2 border-r border-slate-100 font-bold text-slate-700 ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>{displaySaleItem(item)}</td>
                          <td className="px-3.5 py-2 text-center border-r border-slate-100 font-mono text-slate-600">{item.quantity}</td>
                          <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-800">₹{parseFloat(item.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-50 p-4 border border-slate-200 rounded-md flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('saleMaster.details.totalFiscalProceeds')}</p>
                  <h5 className={`text-xs font-bold text-slate-800 uppercase tracking-wide ${isGu ? 'font-prompt' : ''}`}>{t('saleMaster.details.netYield')}</h5>
                </div>
                <p className="text-lg font-mono font-bold text-emerald-600">₹{parseFloat(selectedSale.net_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && <SaleForm onSubmit={handleFormSubmit} onCancel={() => setShowForm(false)} />}
    </div>
  );
}
