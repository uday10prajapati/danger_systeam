import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import {
  Search, RefreshCcw as SyncIcon, Download, Hash, User,
  ExternalLink, ShoppingCart, CreditCard, Banknote,
  FileText, BarChart3, LayoutGrid, Box, ChevronDown,
  ChevronRight, UserCheck, TrendingUp, Tags, Database,
  ShieldCheck, Layout, Layers, Filter, Calendar, ArrowRight,
  CheckCircle2, History, Package, Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportToPDF, toGujaratiDigits } from '../utils/pdfExporter';
import PageHeader from '../components/PageHeader';
import Toast from '../components/Toast';

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

const formatDate = (dateStr, isGu = false) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const formatted = `${day}/${month}/${year}`;
  return isGu ? toGujaratiDigits(formatted) : formatted;
};

export default function SaleReport() {
  const { t, i18n } = useTranslation();
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
  const [message, setMessage] = useState(null);

  const exportToExcel = () => {
    setMessage('Excel export functionality coming soon');
  };

  const exportGroupToExcel = (e, group, type) => {
    e.stopPropagation();
    setMessage('Group export coming soon');
  };

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
      const response = await api.get('/company');
      setCompany(response.data.success ? response.data.data : null);
    } catch (error) {
      console.error('Failed to load company', error);
    }
  };

  const fetchData = async () => {
    if (!company?.id) return;
    try {
      setLoading(true);
      const salesRes = await api.get('/sales', {
        params: { startDate, endDate }
      });
      const itemRes = await api.get(`/items/company/${company.id}`);
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
    (s.customer_name_gu || s.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.customer_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(s.member_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedReports = filteredReports.reduce((acc, s) => {
    const key = s.customer_name_gu || s.customer_name || 'COUNTER SALE';
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

  const handlePrint = () => {
    const isGu = i18n.language === 'gu';
    const cName = isGu ? (company?.company_name_gu || company?.company_name || 'કંપની') : (company?.company_name || 'Company');
    const fy = localStorage.getItem('financialYear') || '2026-27';
    const formattedFy = isGu ? toGujaratiDigits(fy) : fy;
    const today = new Date();
    const formattedDate = formatDate(today, isGu);
    const formattedPeriod = `${formatDate(startDate, isGu)} — ${formatDate(endDate, isGu)}`;

    const fmtNum = (value, digits = 2) => {
      const n = parseFloat(value || 0);
      const formatted = n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
      return isGu ? toGujaratiDigits(formatted) : formatted;
    };

    let tableHTML = '';

    if (viewType === 'report') {
      const totalAmt = filteredReports.reduce((s, x) => s + parseFloat(x.net_amount || 0), 0);
      const rows = filteredReports.map((s, i) => {
        const customerName = isGu ? (s.customer_name_gu || s.customer_name || 'COUNTER SALE') : (s.customer_name || 'COUNTER SALE');
        const codeFormatted = s.member_code ? (isGu ? `કોડ: ${toGujaratiDigits(s.member_code)}` : `CODE: ${s.member_code}`) : '';
        const clientIdentity = `<strong>${customerName}</strong>${codeFormatted ? `<br/><small style="color:#64748b">${codeFormatted}</small>` : ''}`;
        const formattedInvoiceDate = formatDate(s.invoice_date, isGu);
        const formattedInvoiceNo = isGu ? toGujaratiDigits(s.invoice_no) : s.invoice_no;
        const formattedItems = isGu ? `${toGujaratiDigits(s.item_count)} આઈટમ` : `${s.item_count} Items`;
        const paymentTypeStr = s.payment_type === 'cash' ? (isGu ? 'રોકડ' : 'Cash') : (isGu ? 'જમા' : 'Credit');

        return `
          <tr>
            <td style="border:1.5px solid #000000;padding:5px 8px;font-size:10px;font-family:'Prompt', sans-serif">${clientIdentity}</td>
            <td style="border:1.5px solid #000000;padding:5px 8px;text-align:center;font-size:10px;font-family:monospace">${formattedInvoiceDate}</td>
            <td style="border:1.5px solid #000000;padding:5px 8px;text-align:center;font-size:10px;font-family:monospace">#${formattedInvoiceNo}</td>
            <td style="border:1.5px solid #000000;padding:5px 8px;text-align:center;font-size:10px;font-family:'Prompt', sans-serif">${formattedItems}</td>
            <td style="border:1.5px solid #000000;padding:5px 8px;text-align:right;font-size:10px;font-family:monospace">₹${fmtNum(s.total_amount)}</td>
            <td style="border:1.5px solid #000000;padding:5px 8px;text-align:right;font-size:10px;font-family:monospace">₹${fmtNum(s.discount_amount || 0)}</td>
            <td style="border:1.5px solid #000000;padding:5px 8px;text-align:right;font-size:10px;font-family:monospace;font-weight:bold">₹${fmtNum(s.net_amount)}</td>
            <td style="border:1.5px solid #000000;padding:5px 8px;text-align:center;font-size:10px;font-family:'Prompt', sans-serif">${paymentTypeStr}</td>
          </tr>
        `;
      }).join('');

      tableHTML = `
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="border:1.5px solid #000000;padding:6px 8px;font-size:10px;background:#fff;text-align:left">${isGu ? 'ગ્રાહક વિગત' : 'Client Identity'}</th>
            <th style="border:1.5px solid #000000;padding:6px 8px;font-size:10px;background:#fff;width:12%">${isGu ? 'તારીખ' : 'Date'}</th>
            <th style="border:1.5px solid #000000;padding:6px 8px;font-size:10px;background:#fff;width:12%">${isGu ? 'બિલ નં.' : 'Invoice #'}</th>
            <th style="border:1.5px solid #000000;padding:6px 8px;font-size:10px;background:#fff;width:10%">${isGu ? 'આઈટમ્સ' : 'Items'}</th>
            <th style="border:1.5px solid #000000;padding:6px 8px;font-size:10px;background:#fff;text-align:right;width:12%">${isGu ? 'કુલ રકમ' : 'Gross Amt'}</th>
            <th style="border:1.5px solid #000000;padding:6px 8px;font-size:10px;background:#fff;text-align:right;width:10%">${isGu ? 'ડિસ્કાઉન્ટ' : 'Discount'}</th>
            <th style="border:1.5px solid #000000;padding:6px 8px;font-size:10px;background:#fff;text-align:right;width:16%">${isGu ? 'ચોખ્ખી રકમ' : 'Net Proceeds'}</th>
            <th style="border:1.5px solid #000000;padding:6px 8px;font-size:10px;background:#fff;width:10%">${isGu ? 'ચુકવણી' : 'Payment'}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr>
            <td colspan="4" style="border:1.5px solid #000000;padding:6px 8px;font-size:11px;font-weight:bold;text-align:right">${isGu ? 'સરવાળો:' : 'Total:'}</td>
            <td colspan="2" style="border:1.5px solid #000000;"></td>
            <td style="border:1.5px solid #000000;padding:6px 8px;font-size:11px;font-weight:bold;text-align:right;font-family:monospace">₹${fmtNum(totalAmt)}</td>
            <td style="border:1.5px solid #000000;"></td>
          </tr></tfoot>
        </table>
      `;
    } else {
      const totalAmt = filteredSummary.reduce((s, x) => s + (parseFloat(x.outward || 0) * parseFloat(x.sale_price || 0)), 0);
      const rows = filteredSummary.map((item, i) => {
        const itemDisplayName = isGu ? (item.item_name_gu || item.item_name || '') : (item.item_name || '');
        const itemCodeFormatted = item.item_code ? (isGu ? `કોડ: ${toGujaratiDigits(item.item_code)}` : `CODE: ${item.item_code}`) : '';
        const itemDetails = `<strong>${itemDisplayName}</strong>${itemCodeFormatted ? `<br/><small style="color:#64748b">${itemCodeFormatted}</small>` : ''}`;
        const unitStr = item.unit || 'NOS';
        const formattedUnit = isGu ? (unitStr === 'NOS' ? 'નંગ' : (unitStr === 'KG' ? 'કિલો' : unitStr)) : unitStr;

        return `
          <tr>
            <td style="border:1.5px solid #000000;padding:5px 8px;font-size:10px;font-family:'Prompt', sans-serif">${itemDetails}</td>
            <td style="border:1.5px solid #000000;padding:5px 8px;text-align:center;font-size:10px;font-family:'Prompt', sans-serif">${formattedUnit}</td>
            <td style="border:1.5px solid #000000;padding:5px 8px;text-align:right;font-size:10px;font-family:monospace">${isGu ? toGujaratiDigits(parseFloat(item.outward || 0).toFixed(3)) : parseFloat(item.outward || 0).toFixed(3)}</td>
            <td style="border:1.5px solid #000000;padding:5px 8px;text-align:right;font-size:10px;font-family:monospace">₹${fmtNum(item.sale_price)}</td>
            <td style="border:1.5px solid #000000;padding:5px 8px;text-align:right;font-size:10px;font-family:monospace;font-weight:bold">₹${fmtNum(parseFloat(item.outward || 0) * parseFloat(item.sale_price || 0))}</td>
          </tr>
        `;
      }).join('');

      tableHTML = `
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="border:1.5px solid #000000;padding:6px 8px;font-size:10px;background:#fff;text-align:left">${isGu ? 'પ્રોડક્ટ વિગત' : 'Product Taxonomy'}</th>
            <th style="border:1.5px solid #000000;padding:6px 8px;font-size:10px;background:#fff;width:15%;text-align:center">${isGu ? 'એકમ' : 'Unit'}</th>
            <th style="border:1.5px solid #000000;padding:6px 8px;font-size:10px;background:#fff;width:15%;text-align:right">${isGu ? 'જથ્થો' : 'Yield Volume'}</th>
            <th style="border:1.5px solid #000000;padding:6px 8px;font-size:10px;background:#fff;width:15%;text-align:right">${isGu ? 'ભાવ' : 'Rate'}</th>
            <th style="border:1.5px solid #000000;padding:6px 8px;font-size:10px;background:#fff;text-align:right;width:20%">${isGu ? 'કુલ રકમ' : 'Gross Proceeds'}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr>
            <td colspan="4" style="border:1.5px solid #000000;padding:6px 8px;font-size:11px;font-weight:bold;text-align:right">${isGu ? 'સરવાળો:' : 'Total:'}</td>
            <td style="border:1.5px solid #000000;padding:6px 8px;font-size:11px;font-weight:bold;text-align:right;font-family:monospace">₹${fmtNum(totalAmt)}</td>
          </tr></tfoot>
        </table>
      `;
    }

    const titleStr = viewType === 'report' ? (isGu ? 'વેચાણ અહેવાલ' : 'Sale Settlement Register') : (isGu ? 'પ્રોડક્ટ વેચાણ વિવરણ' : 'Product Sale Summary');

    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.write(`<html><head>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&family=Outfit:wght@400;600;700&display=swap');
        @font-face {
          font-family: 'Prompt';
          src: url('/fonts/Prompt.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
        }
        @page { size: A4 landscape; margin: 10mm; }
        body { margin: 0; padding: 16px; font-family: ${isGu ? `'Prompt', 'Noto Sans Gujarati', sans-serif` : 'Arial, sans-serif'}; }
      </style>
    </head><body>
      <div style="border:1.5px solid #000000;overflow:hidden;">
        <div style="border-bottom:1.5px solid #000000;padding:12px;text-align:center;font-size:18px;font-weight:bold">${cName}</div>
        <div style="border-bottom:1.5px solid #000000;padding:8px;text-align:center;font-size:14px;font-weight:bold">${titleStr}</div>
        <div style="border-bottom:1.5px solid #000000;padding:8px 12px;display:flex;justify-content:space-between;font-size:12px;font-weight:bold">
          <span>${isGu ? 'સમયગાળો' : 'Period'}: ${formattedPeriod}</span>
          <span style="display:flex;gap:16px"><span>${isGu ? 'તારીખ' : 'Date'}: ${formattedDate}</span><span>|</span><span>${isGu ? 'નાણાકીય વર્ષ' : 'Financial Year'}: ${formattedFy}</span></span>
        </div>
        ${tableHTML}
      </div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleExportPDF = async () => {
    const isGu = i18n.language === 'gu';
    const fmtNum = (value, digits = 2) => {
      const n = parseFloat(value || 0);
      const formatted = n.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
      return isGu ? toGujaratiDigits(formatted) : formatted;
    };

    if (viewType === 'report') {
      const totalAmt = filteredReports.reduce((s, x) => s + parseFloat(x.net_amount || 0), 0);
      const allRows = [
        ...filteredReports,
        { _isTotals: true, net_amount: totalAmt }
      ];

      const columns = [
        {
          header: isGu ? 'ગ્રાહક વિગત' : 'Client Identity',
          align: 'left',
          width: '28%',
          render: (row) => {
            if (row._isTotals) return `<strong style="float: right;">${isGu ? 'સરવાળો:' : 'Total:'}</strong>`;
            const customerName = isGu ? (row.customer_name_gu || row.customer_name || 'COUNTER SALE') : (row.customer_name || 'COUNTER SALE');
            const codeFormatted = row.member_code ? (isGu ? `કોડ: ${toGujaratiDigits(row.member_code)}` : `CODE: ${row.member_code}`) : '';
            return `<strong>${customerName}</strong>${codeFormatted ? `<br/><small style="color:#64748b">${codeFormatted}</small>` : ''}`;
          }
        },
        {
          header: isGu ? 'તારીખ' : 'Date',
          align: 'center',
          width: '12%',
          render: (row) => row._isTotals ? '' : formatDate(row.invoice_date, isGu)
        },
        {
          header: isGu ? 'બિલ નં.' : 'Invoice #',
          align: 'center',
          width: '12%',
          render: (row) => row._isTotals ? '' : `#${isGu ? toGujaratiDigits(row.invoice_no) : row.invoice_no}`
        },
        {
          header: isGu ? 'વસ્તુ સંખ્યા' : 'Items',
          align: 'center',
          width: '10%',
          render: (row) => row._isTotals ? '' : (isGu ? `${toGujaratiDigits(row.item_count)} આઈટમ` : `${row.item_count} Items`)
        },
        {
          header: isGu ? 'કુલ રકમ' : 'Gross Amt',
          align: 'right',
          width: '12%',
          render: (row) => row._isTotals ? '' : `₹${fmtNum(row.total_amount)}`
        },
        {
          header: isGu ? 'ડિસ્કાઉન્ટ' : 'Discount',
          align: 'right',
          width: '10%',
          render: (row) => row._isTotals ? '' : `₹${fmtNum(row.discount_amount || 0)}`
        },
        {
          header: isGu ? 'ચોખ્ખી રકમ' : 'Net Proceeds',
          align: 'right',
          width: '16%',
          render: (row) => row._isTotals ? `<strong>₹${fmtNum(row.net_amount)}</strong>` : `₹${fmtNum(row.net_amount)}`
        },
        {
          header: isGu ? 'ચુકવણી' : 'Payment',
          align: 'center',
          width: '10%',
          render: (row) => row._isTotals ? '' : (row.payment_type === 'cash' ? (isGu ? 'રોકડ' : 'Cash') : (isGu ? 'જમા' : 'Credit'))
        }
      ];

      await exportToPDF({
        title: isGu ? 'વેચાણ અહેવાલ' : 'Sale Settlement Register',
        columns,
        rows: allRows,
        isGu,
        metaInfo: [
          { label: isGu ? 'સમયગાળો' : 'Period', value: isGu ? `${formatDate(startDate, true)} — ${formatDate(endDate, true)}` : `${startDate} — ${endDate}` }
        ],
        filename: `${isGu ? 'વેચાણ_અહેવાલ' : 'Sale_Report'}_${startDate}_${endDate}.pdf`
      });
    } else {
      const totalAmt = filteredSummary.reduce((s, x) => s + (parseFloat(x.outward || 0) * parseFloat(x.sale_price || 0)), 0);
      const allRows = [
        ...filteredSummary,
        { _isTotals: true, total_proceeds: totalAmt }
      ];

      const columns = [
        {
          header: isGu ? 'પ્રોડક્ટ વિગત' : 'Product Taxonomy',
          align: 'left',
          width: '35%',
          render: (row) => {
            if (row._isTotals) return `<strong style="float: right;">${isGu ? 'સરવાળો:' : 'Total:'}</strong>`;
            const itemDisplayName = isGu ? (row.item_name_gu || row.item_name || '') : (row.item_name || '');
            const itemCodeFormatted = row.item_code ? (isGu ? `કોડ: ${toGujaratiDigits(row.item_code)}` : `CODE: ${row.item_code}`) : '';
            return `<strong>${itemDisplayName}</strong>${itemCodeFormatted ? `<br/><small style="color:#64748b">${itemCodeFormatted}</small>` : ''}`;
          }
        },
        {
          header: isGu ? 'એકમ' : 'Unit',
          align: 'center',
          width: '15%',
          render: (row) => {
            if (row._isTotals) return '';
            const unitStr = row.unit || 'NOS';
            return isGu ? (unitStr === 'NOS' ? 'નંગ' : (unitStr === 'KG' ? 'કિલો' : unitStr)) : unitStr;
          }
        },
        {
          header: isGu ? 'જથ્થો' : 'Yield Volume',
          align: 'right',
          width: '15%',
          render: (row) => row._isTotals ? '' : (isGu ? toGujaratiDigits(parseFloat(row.outward || 0).toFixed(3)) : parseFloat(row.outward || 0).toFixed(3))
        },
        {
          header: isGu ? 'ભાવ' : 'Rate',
          align: 'right',
          width: '15%',
          render: (row) => row._isTotals ? '' : `₹${fmtNum(row.sale_price)}`
        },
        {
          header: isGu ? 'કુલ રકમ' : 'Gross Proceeds',
          align: 'right',
          width: '20%',
          render: (row) => {
            const val = row._isTotals ? row.total_proceeds : (parseFloat(row.outward || 0) * parseFloat(row.sale_price || 0));
            return row._isTotals ? `<strong>₹${fmtNum(val)}</strong>` : `₹${fmtNum(val)}`;
          }
        }
      ];

      await exportToPDF({
        title: isGu ? 'પ્રોડક્ટ વેચાણ વિવરણ' : 'Product Sale Summary',
        columns,
        rows: allRows,
        isGu,
        metaInfo: [
          { label: isGu ? 'સમયગાળો' : 'Period', value: isGu ? `${formatDate(startDate, true)} — ${formatDate(endDate, true)}` : `${startDate} — ${endDate}` }
        ],
        filename: `${isGu ? 'પ્રોડક્ટ_વેચાણ_અહેવાલ' : 'Product_Sale_Report'}_${startDate}_${endDate}.pdf`
      });
    }
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 font-mono">
        <div className="text-center font-bold text-slate-400">
          <p className="text-xs mb-4 uppercase tracking-widest">Loading Enterprise Core...</p>
          <SyncIcon className="animate-spin mx-auto text-[#1d5f84]" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans select-none text-slate-800 pb-8">
      <Toast message={message} onClose={() => setMessage(null)} />
      <div className="max-w-[1600px] mx-auto px-4 py-4">

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col min-h-[600px] relative shadow-none">
          
          {/* Table Header Bar */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
            <div className="flex items-center gap-4">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                {viewType === 'report' ? t('saleReport.title') : t('saleReport.productTaxonomy')}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
               <div className="flex items-center gap-2 bg-white px-2 py-1 border border-slate-200 rounded-md shadow-sm shrink-0">
                  <input
                     type="date"
                     value={startDate}
                     onChange={(e) => setStartDate(e.target.value)}
                     className="bg-transparent text-xs font-semibold text-slate-600 outline-none cursor-pointer"
                  />
                  <ArrowRight size={12} className="text-slate-400" />
                  <input
                     type="date"
                     value={endDate}
                     onChange={(e) => setEndDate(e.target.value)}
                     className="bg-transparent text-xs font-semibold text-slate-600 outline-none cursor-pointer"
                  />
               </div>

               <div className="relative group">
                  <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                     type="text"
                     placeholder={t('saleReport.searchPrompt') || "Search..."}
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-48 pl-7 pr-2 py-1 h-7 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:border-slate-300 shadow-sm"
                  />
               </div>

               <button
                  onClick={() => setViewType(viewType === 'report' ? 'summary' : 'report')}
                  className={`px-2.5 h-7 flex items-center gap-1.5 justify-center transition-all rounded-md cursor-pointer relative select-none shadow-sm text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800`}
               >
                  {viewType === 'report' ? <Tags size={13} /> : <UserCheck size={13} />}
                  <span>{viewType === 'report' ? t('common.summary') : t('common.report')}</span>
               </button>

              <button
                onClick={exportToExcel}
                title="Excel"
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <Download size={13} />
              </button>

              <button
                onClick={handlePrint}
                title={t('common.print')}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <Printer size={13} />
              </button>

              <button
                onClick={handleExportPDF}
                title={t('common.pdf')}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <FileText size={13} />
              </button>

              <button
                onClick={fetchData}
                title={t('common.sync')}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
              >
                <SyncIcon size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[600px] relative">
            <table className="w-full text-left border-collapse select-none">
              <thead className="sticky top-0 bg-slate-50 z-30 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  {viewType === 'report' ? (
                    <>
                      <th className="px-3 py-2 border-r border-slate-100 w-1/3">{t('saleReport.clientIdentity')}</th>
                      <th className="px-3 py-2 border-r border-slate-100">{t('saleReport.referenceLedger')}</th>
                      <th className="px-3 py-2 border-r border-slate-100 text-center">{t('saleReport.settlementType')}</th>
                      <th className="px-3 py-2 border-r border-slate-100 text-right">{t('saleReport.netProceeds')}</th>
                      <th className="px-3 py-2 text-center">{t('saleReport.audit')}</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 border-r border-slate-100 w-1/3">{t('saleReport.productTaxonomy')}</th>
                      <th className="px-3 py-2 border-r border-slate-100 text-center">{t('saleReport.unit')}</th>
                      <th className="px-3 py-2 border-r border-slate-100 text-right">{t('saleReport.yieldVolume')}</th>
                      <th className="px-3 py-2 border-r border-slate-100 text-right">{t('saleReport.grossProceeds')}</th>
                      <th className="px-3 py-2 text-center">{t('saleReport.status')}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-24 text-center">
                      <SyncIcon className="animate-spin text-slate-400 mx-auto mb-2" size={28} />
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest italic">{t('saleReport.buildingMatrix')}</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {viewType === 'report' ? (
                      Object.values(groupedReports).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-24 text-center text-slate-400 font-bold text-xs tracking-wider bg-slate-50/20">
                            <Database size={32} className="mx-auto mb-2 opacity-40 text-[#1d5f84]" />
                            Zero Sales Isolated
                          </td>
                        </tr>
                      ) : (
                        Object.values(groupedReports).map((group, gIdx) => (
                          <React.Fragment key={gIdx}>
                            <tr
                              onClick={() => toggleGroup(group.name)}
                              className="bg-slate-50/60 hover:bg-slate-100/50 cursor-pointer border-l-4 border-[#1d5f84] transition-colors border-b border-slate-100"
                            >
                              <td className="px-3 py-2 border-r border-slate-100">
                                <div className="flex items-center gap-3">
                                  <div className="p-1 border border-slate-200 bg-white text-slate-500 rounded-md shrink-0 shadow-sm">
                                    {expandedGroups[group.name] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                  </div>
                                  <div>
                                    <p className={`font-bold text-[#1d5f84] text-xs tracking-tight ${i18n.language === 'gu' ? 'font-prompt' : 'uppercase font-prompt'}`}>{group.name}</p>
                                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">{group.invoices.length} settlements</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 text-[10px] text-slate-400 uppercase font-medium">BATCH_AUDIT</td>
                              <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-400 font-medium">—</td>
                              <td className="px-3 py-2 border-r border-slate-100 text-right font-bold text-slate-800 text-xs">{formatCurrency(group.total)}</td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={(e) => exportGroupToExcel(e, group, 'report')}
                                  className="p-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition rounded-md shadow-sm inline-flex"
                                >
                                  <Download size={13} />
                                </button>
                              </td>
                            </tr>
                            {expandedGroups[group.name] && group.invoices.map((s, sIdx) => (
                              <tr key={sIdx} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                                <td className="px-3 py-1.5 pl-12 border-r border-slate-100 text-[10px] text-slate-400 font-mono">
                                  {new Date(s.invoice_date).toLocaleDateString('en-GB')}
                                </td>
                                <td className="px-3 py-1.5 border-r border-slate-100">
                                  <div className="flex items-center gap-1.5 font-semibold text-slate-700 text-[10px] font-mono">
                                    <Hash size={12} className="text-slate-400" /> {s.invoice_no}
                                  </div>
                                </td>
                                <td className="px-3 py-1.5 border-r border-slate-100 text-center">
                                  <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${s.payment_type === 'cash' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                    {s.payment_type === 'cash' ? t('sale.cash') : t('sale.credit')}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 border-r border-slate-100 text-right font-medium text-slate-600 font-mono text-[10px]">
                                  {formatCurrency(s.total_amount)}
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  <button className="text-slate-400 hover:text-[#1d5f84] transition inline-flex"><ExternalLink size={13} /></button>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      )
                    ) : (
                      Object.values(groupedSummary).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-24 text-center text-slate-400 font-bold text-xs tracking-wider bg-slate-50/20">
                            <Database size={32} className="mx-auto mb-2 opacity-40 text-[#1d5f84]" />
                            Zero Revenue Vectors Isolated
                          </td>
                        </tr>
                      ) : (
                        Object.values(groupedSummary).map((cat, cIdx) => (
                          <React.Fragment key={cIdx}>
                            <tr
                              onClick={() => toggleGroup(cat.name)}
                              className="bg-slate-50/60 hover:bg-slate-100/50 cursor-pointer border-l-4 border-slate-600 transition-colors border-b border-slate-100"
                            >
                              <td className="px-3 py-2 border-r border-slate-100">
                                <div className="flex items-center gap-3">
                                  <div className="p-1 border border-slate-200 bg-white text-slate-500 rounded-md shrink-0 shadow-sm">
                                    {expandedGroups[cat.name] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-xs tracking-tight uppercase font-prompt">{cat.name}</p>
                                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">{cat.items.length} product lines</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-400 font-medium">—</td>
                              <td className="px-3 py-2 border-r border-slate-100 text-right text-slate-400 font-medium">—</td>
                              <td className="px-3 py-2 border-r border-slate-100 text-right font-bold text-slate-800 text-xs">{formatCurrency(cat.total)}</td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={(e) => exportGroupToExcel(e, cat, 'summary')}
                                  className="p-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition rounded-md shadow-sm inline-flex"
                                >
                                  <Download size={13} />
                                </button>
                              </td>
                            </tr>
                            {expandedGroups[cat.name] && cat.items.map((item, iIdx) => (
                              <tr key={iIdx} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                                <td className="px-3 py-1.5 pl-12 border-r border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <Package size={12} className="text-slate-400 shrink-0" />
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-700 uppercase tracking-tight leading-none mb-0.5 font-prompt">{item.item_name}</p>
                                      <p className="text-[9px] text-slate-400 tracking-wider font-mono">CODE: #{item.item_code}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-1.5 border-r border-slate-100 text-center text-[10px] text-slate-500 uppercase font-medium">{item.unit || 'NOS'}</td>
                                <td className="px-3 py-1.5 border-r border-slate-100 text-right font-medium text-slate-500 font-mono text-[10px]">{formatQty(item.outward)}</td>
                                <td className="px-3 py-1.5 border-r border-slate-100 text-right font-medium text-slate-600 font-mono text-[10px]">
                                  {formatCurrency(parseFloat(item.outward || 0) * parseFloat(item.sale_price || 0))}
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  <span className="w-1.5 h-1.5 bg-[#1d5f84] rounded-full inline-block"></span>
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

          <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex justify-between items-center text-[10px] font-medium text-slate-500">
             <div className="flex items-center gap-3">
               <span className="flex items-center gap-1.5"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span> Revenue Stream: Optimal</span>
               <span>Records: {viewType === 'report' ? filteredReports.length : itemData.length}</span>
             </div>
             <div className="flex items-center gap-4 font-mono">
               <span>SYS_MD5: {new Date().getTime().toString(16).toUpperCase()}</span>
               <span>REF: {company?.id || '—'}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
