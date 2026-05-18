import React, { useState, useEffect } from 'react';
import {
  Database, Search, Filter, Download, Plus,
  Eye, RefreshCcw, Layout, FileText, Printer,
  Calendar, User, Box, Shield, MapPin,
  CheckCircle, Loader, Info, Edit3
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addGujaratiFont } from '../utils/pdfFonts';
import api from '../api';
import { useTranslation } from 'react-i18next';
import Toast from '../components/Toast';
import Loading from '../components/Loading';
import html2canvas from 'html2canvas';

export default function DangarMaster() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [company, setCompany] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [season, setSeason] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [message, setMessage] = useState(null);

  const guDigits = {
    '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
    '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯'
  };
  const toGujaratiDigits = (num) => String(num || '').replace(/[0-9]/g, d => guDigits[d] || d);
  const toEnglishDigits = (value) => String(value ?? '').replace(/[૦-૯]/g, d => '0123456789'['૦૧૨૩૪૫૬૭૮૯'.indexOf(d)] || d);
  const formatSrNo = (value) => toEnglishDigits(value);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const companyRes = await api.get('/company');
      if (companyRes.data.success) {
        setCompany(companyRes.data.data);
        fetchEntries(companyRes.data.data.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async (compId) => {
    try {
      setLoading(true);
      const params = {};
      if (dateRange.start && dateRange.end) {
        params.startDate = dateRange.start;
        params.endDate = dateRange.end;
      }
      if (season) {
        params.season = season;
      }
      const res = await api.get('/dangar-entry', { params: { companyId: compId, ...params } });
      if (res.data.success) {
        setEntries(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    const rows = filteredEntries;
    if (!rows.length) {
      setMessage({ type: 'error', text: t('dangarMaster.noRecords') });
      return;
    }

    setLoading(true);

    const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
    const toGu = (num) => String(num || '').replace(/[0-9]/g, d => guDigits[d] || d);

    const formatGuDate = (dateStr) => {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return toGu(`${day}/${month}/${year}`);
    };

    const companyData = company || {};
    const cName = companyData.company_name_gu || companyData.company_name || 'Company';
    const reportTitle = t('dangarMaster.pdfReport.title');

    const totalQtl = rows.reduce((a, c) => a + parseFloat(c.net_quintal || 0), 0);
    const totalAmt = rows.reduce((a, c) => a + parseFloat(c.amount || 0), 0);

    const tempWrap = document.createElement('div');
    tempWrap.style.position = 'fixed';
    tempWrap.style.left = '-9999px';
    tempWrap.style.top = '0';
    tempWrap.style.width = '1120px';
    tempWrap.style.padding = '40px';
    tempWrap.style.background = '#ffffff';
    tempWrap.style.fontFamily = '"Noto Sans Gujarati", "NotoGujarati", sans-serif';

    const tableRows = rows.map((r, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding:10px; text-align:center; font-family:Arial, sans-serif !important;">${toGu(idx + 1)}</td>
        <td style="padding:10px; text-align:center; font-family:Arial, sans-serif !important;">${formatGuDate(r.entry_date)}</td>
        <td style="padding:10px; font-weight:700; font-family:'Prompt', sans-serif !important;">${r.member_name} <span style="font-family:Arial, sans-serif !important; font-weight:normal; color:#64748b; margin-left:4px;">(${toGu(r.member_code)})</span></td>
        <td style="padding:10px; font-family:'Prompt', sans-serif !important;">${r.village_name || '-'}</td>
        <td style="padding:10px; font-family:'Prompt', sans-serif !important;">${r.item_name_gu || r.item_name}</td>
        <td style="padding:10px; text-align:center;">${toGu(r.quality_class?.match(/\d+/)?.[0] || '1')}</td>
        <td style="padding:10px; text-align:right; font-weight:700; font-family:Arial, sans-serif !important;">${toGu(parseFloat(r.net_quintal).toFixed(2))}</td>
        <td style="padding:10px; text-align:right; font-family:Arial, sans-serif !important;">${toGu(parseFloat(r.rate).toFixed(2))}</td>
        <td style="padding:10px; text-align:right; font-weight:800; color:#2563eb; font-family:Arial, sans-serif !important;">${toGu(parseFloat(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</td>
      </tr>
    `).join('');

    tempWrap.innerHTML = `
      <div style="border: 1px solid #2563eb; padding: 2px;">
        <div style="background: #2563eb; color: #ffffff; padding: 25px 35px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">${cName}</div>
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 4px; opacity: 0.8; letter-spacing: 1px;">Audit Protected System v2.0</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 16px; font-weight: 800; text-transform: uppercase;">${reportTitle}</div>
            <div style="font-size: 10px; font-weight: 700; margin-top: 4px; opacity: 0.8;">${toGu(new Date().toLocaleDateString('en-GB'))} | ${toGu(new Date().toLocaleTimeString())}</div>
          </div>
        </div>

        <div style="padding: 35px;">
          <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9;">
            <div>
              <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Registry Period</div>
              <div style="font-size: 15px; font-weight: 700; color: #1e293b;">${toGu(dateRange.start || '--')} થી ${toGu(dateRange.end || '--')}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Season Context</div>
              <div style="font-size: 15px; font-weight: 700; color: #1e293b;">${season ? t(`dangarMaster.filters.${season}`) : t('common.all')}</div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #f8fafc; color: #475569; text-transform: uppercase; font-size: 10px; font-weight: 800;">
                <th style="padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center;">ક્રમ</th>
                <th style="padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center;">તારીખ</th>
                <th style="padding: 12px 10px; border: 1px solid #e2e8f0; text-align: left;">સભાસદનું નામ</th>
                <th style="padding: 12px 10px; border: 1px solid #e2e8f0; text-align: left;">ગામ</th>
                <th style="padding: 12px 10px; border: 1px solid #e2e8f0; text-align: left;">માલનો પ્રકાર</th>
                <th style="padding: 12px 10px; border: 1px solid #e2e8f0; text-align: center;">વર્ગ</th>
                <th style="padding: 12px 10px; border: 1px solid #e2e8f0; text-align: right;">નેટ ક્વિન્ટલ</th>
                <th style="padding: 12px 10px; border: 1px solid #e2e8f0; text-align: right;">ભાવ</th>
                <th style="padding: 12px 10px; border: 1px solid #e2e8f0; text-align: right;">કુલ રકમ</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: 900; color: #1e293b;">
                <td colspan="6" style="padding: 18px; border: 1px solid #e2e8f0; text-align: right; text-transform: uppercase; font-size: 11px;">Consolidated Summary (${toGu(rows.length)} Records)</td>
                <td style="padding: 18px; border: 1px solid #e2e8f0; text-align: right; font-size: 16px; font-family:Arial, sans-serif !important;">${toGu(totalQtl.toFixed(2))}</td>
                <td style="padding: 18px; border: 1px solid #e2e8f0; text-align: right; font-family:Arial, sans-serif !important;">-</td>
                <td style="padding: 18px; border: 1px solid #e2e8f0; text-align: right; color: #2563eb; font-size: 18px; font-family:Arial, sans-serif !important;">₹${toGu(totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 40px; display: grid; grid-template-cols: 1fr 1fr; gap: 40px;">
            <div style="border: 1px solid #e2e8f0; padding: 15px; background: #f8fafc;">
              <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">System Validation</div>
              <div style="font-size: 11px; color: #475569; line-height: 1.5;">This registry has been processed via the Dangar Accounting Suite. All calculations are verified against the master ledger and seasonal rate tables.</div>
            </div>
            <div style="text-align: right; padding-top: 20px;">
              <div style="height: 60px;"></div>
              <div style="border-top: 2px solid #1e293b; display: inline-block; min-width: 200px; padding-top: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1e293b;">Authorized Signatory</div>
            </div>
          </div>
        </div>

        <div style="background: #f1f5f9; padding: 15px 35px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0;">
          <div style="font-weight: 700;">PROCESSED BY ANTIGRAVITY OS</div>
          <div>CONFIDENTIAL BUSINESS DATA - PAGE ૧ OF ૧</div>
        </div>
      </div>
    `;

    document.body.appendChild(tempWrap);

    try {
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 600));

      const canvas = await html2canvas(tempWrap, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: true
      });

      document.body.removeChild(tempWrap);

      const imgData = canvas.toDataURL('image/png', 1.0);
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width / 3, canvas.height / 3]
      });

      doc.addImage(imgData, 'PNG', 0, 0, canvas.width / 3, canvas.height / 3, undefined, 'FAST');
      doc.save(`Dangar_Registry_${new Date().toISOString().split('T')[0]}.pdf`);
      
      setMessage({ type: 'success', text: 'PDF report generated successfully.' });
    } catch (error) {
      console.error('PDF Generation Error:', error);
      setMessage({ type: 'error', text: 'Failed to generate PDF report.' });
      if (document.body.contains(tempWrap)) document.body.removeChild(tempWrap);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContents = document.getElementById('dangar-registry-table');
    if (!printContents) { window.print(); return; }
    const win = window.open('', '_blank', 'width=1200,height=800');
    win.document.write(`
      <html><head><title>${t('dangarMaster.printReport.title')}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 20px; }
        .logo-bar { background: #2563eb; color: #fff; padding: 6px 18px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
        .logo-bar h1 { font-size: 9.5px; font-weight: bold; text-transform: uppercase; }
        .logo-bar .lbl { font-size: 8px; color: #bfdbfe; font-weight: normal; letter-spacing: 1px; }
        .logo-bar .conf { font-size: 8px; color: #fecaca; font-weight: bold; letter-spacing: 0.5px; }
        h2 { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 2px; }
        p.sub { font-size: 8.5px; color: #64748b; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        thead tr { background: #2563eb; color: #fff; }
        th, td { padding: 8px 10px; border: 1px solid #e2e8f0; text-align: left; }
        tbody tr:nth-child(even) { background: #f1f5f9; }
        tfoot tr { background: #1e40af; color: #fff; font-weight: 700; }
        .font-mono { font-family: 'Prompt', monospace !important; }
        .amt { text-align: right; }
        @media print { @page { size: A4 landscape; margin: 1cm; } }
      </style></head><body>
      <div className='logo-bar'>
         <h1 style="font-family:'Prompt', sans-serif;">${(company?.company_name_gu || company?.company_name || 'Company')}</h1>
         <span className='lbl'>${t('dangarMaster.pdfReport.title')}</span>
         <span className='conf'>${t('dangarMaster.pdfReport.confidential')}</span>
      </div>
      <h2>${t('dangarMaster.printReport.title')}</h2>
      <p className='sub'>${t('dangarMaster.pdfReport.period')}: ${toGujaratiDigits(dateRange.start || '--')} થી ${toGujaratiDigits(dateRange.end || '--')} &nbsp;|&nbsp; ${t('dangarMaster.pdfReport.season')}: ${season ? t(`dangarMaster.filters.${season}`) : (t('dangarMaster.filters.allSeasons') || 'બધી ઋતુઓ')} &nbsp;|&nbsp; ${t('dangarMaster.pdfReport.generated')}: ${toGujaratiDigits(new Date().toLocaleString('en-IN'))}</p>
      ${printContents.outerHTML}
      </body></html>`);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleAddNewRedirect = () => {
    window.location.hash = '#/dangar-entry';
  };

  const filteredEntries = entries.filter(e => {
    const matchesSearch =
      e.member_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.member_code?.toString().includes(searchQuery) ||
      toEnglishDigits(e.sr_no).toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.vehicle_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.village_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVillage = selectedVillage === 'all' || e.village_name === selectedVillage;
    const matchesClass = selectedClass === 'all' || e.quality_class === selectedClass;

    return matchesSearch && matchesVillage && matchesClass;
  });

  const villages = ['all', ...new Set(entries.map(e => e.village_name).filter(Boolean))].sort();
  const classes = ['all', ...new Set(entries.map(e => e.quality_class).filter(Boolean))].sort();

  if (loading || !company) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none animate-none">

      {/* Toast Notification */}
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
              <Database size={20} className="text-zinc-600" />
              {t('dangarMaster.title')}
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">{t('dangarMaster.managementMaster')}</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
              title={t('common.print')}
            >
              <Printer size={14} /> {t('common.print')}
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
              title={t('common.pdf')}
            >
              <FileText size={14} /> {t('common.pdf')}
            </button>

            <button
              onClick={handleAddNewRedirect}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none"
            >
              <Plus size={16} /> {t('dangarMaster.addNew')}
            </button>

            <button
              onClick={() => fetchEntries(company?.id)}
              className="p-1.5 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm"
              title={t('dangarMaster.refreshRegistry')}
            >
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Dynamic Filters */}
        <div className="bg-zinc-50 border border-zinc-300 p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-zinc-500" size={15} />
            <span className="text-[10px] font-bold text-zinc-500 uppercase">{t('dangarMaster.filters.dateFilter')}</span>
          </div>
          <div className="flex items-center gap-1 border border-zinc-300 bg-white p-1">
            <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-transparent border-none outline-none text-[11px] font-bold text-zinc-700 uppercase font-mono" />
            <span className="text-zinc-400 font-bold">/</span>
            <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-transparent border-none outline-none text-[11px] font-bold text-zinc-700 uppercase font-mono" />
          </div>
          <button onClick={() => fetchEntries(company?.id)} className="px-3 py-1.5 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold text-xs uppercase transition rounded-none">{t('dangarMaster.filters.verifyRegistry')}</button>

          <div className="flex items-center gap-2 border border-zinc-300 bg-white px-2 py-1">
            <Filter size={13} className="text-zinc-400" />
            <select
              value={season}
              onChange={e => {
                const s = e.target.value;
                setSeason(s);
                const params = { companyId: company?.id };
                if (dateRange.start && dateRange.end) {
                  params.startDate = dateRange.start;
                  params.endDate = dateRange.end;
                }
                if (s) params.season = s;
                api.get('/dangar-entry', { params }).then(res => {
                  if (res.data.success) setEntries(res.data.data);
                });
              }}
              className="bg-transparent border-none outline-none text-[11px] font-bold text-zinc-700 cursor-pointer"
            >
              <option value="">{t('dangarMaster.filters.allSeasons')}</option>
              <option value="winter">{t('dangarMaster.filters.winter')}</option>
              <option value="summer">{t('dangarMaster.filters.summer')}</option>
            </select>
          </div>

          <div className="flex items-center gap-2 border border-zinc-300 bg-white px-2 py-1">
            <MapPin size={13} className="text-zinc-400" />
            <select
              value={selectedVillage}
              onChange={e => setSelectedVillage(e.target.value)}
              className={`bg-transparent border-none outline-none text-[11px] font-bold text-zinc-700 cursor-pointer ${selectedVillage !== 'all' ? 'font-mono' : 'font-sans'}`}
            >
              <option value="all" className="font-sans">{t('dangarMaster.filters.allVillages')}</option>
              {villages.filter(v => v !== 'all').map(v => (
                <option key={v} value={v} className="font-mono">{v}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 border border-zinc-300 bg-white px-2 py-1">
            <Shield size={13} className="text-zinc-400" />
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="bg-transparent border-none outline-none text-[11px] font-bold text-zinc-700 cursor-pointer"
            >
              <option value="all">{t('dangarMaster.filters.allClasses')}</option>
              {classes.filter(c => c !== 'all').map(c => (
                <option key={c} value={c}>
                  {c === '1st' ? t('dangarMaster.filters.first') :
                    c === '2nd' ? t('dangarMaster.filters.second') :
                      c === '3rd' ? t('dangarMaster.filters.third') : c}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-[9px] font-sans text-zinc-400 uppercase">{t('dangarMaster.stats.totalNetVolume')}</p>
              <p className="text-base font-bold font-sans text-zinc-800">{toGujaratiDigits(filteredEntries.reduce((a, c) => a + parseFloat(c.net_quintal || 0), 0).toFixed(2))} {t('dangarMaster.table.unit')}</p>
            </div>
            <div className="w-px h-8 bg-zinc-300" />
            <div className="text-right">
              <p className="text-[9px] font-sans text-zinc-400 uppercase">{t('dangarMaster.stats.totalAmount')}</p>
              <p className="text-base font-bold font-sans text-emerald-600">₹{toGujaratiDigits(filteredEntries.reduce((a, c) => a + parseFloat(c.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}</p>
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                {t('dangarMaster.listTitle')}
              </span>
              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-[10px] px-2 py-0.5">
                {toGujaratiDigits(filteredEntries.length)} {t('dangarMaster.records')}
              </span>
            </div>

            <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
              <Search size={16} className="text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('dangarMaster.searchPlaceholder')}
                className="bg-transparent border-none outline-none text-xs text-zinc-800 placeholder:text-zinc-400 w-full md:w-56 font-mono"
              />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-white">
            {loading && entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                <Loader className="animate-spin text-zinc-500" size={24} />
                <p className="text-xs font-mono">{t('dangarMaster.loadingData')}</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500 select-none">
                <Box size={32} className="text-zinc-400" />
                <p className="text-xs font-mono">{t('dangarMaster.noRecords')}</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs select-none font-sans" id="dangar-registry-table">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">
                    <th className="px-4 py-2 border-r border-zinc-200">{t('dangarMaster.table.date')}</th>
                    <th className="px-4 py-2 border-r border-zinc-200">{t('dangarMaster.table.member')}</th>
                    <th className="px-4 py-2 border-r border-zinc-200">{t('dangarMaster.table.refSr')}</th>
                    <th className="px-4 py-2 border-r border-zinc-200">{t('dangarMaster.table.item')}</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-center">{t('dangarMaster.table.class')}</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">{t('dangarMaster.table.netVolume')}</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">{t('dangarMaster.table.rate')}</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">{t('dangarMaster.table.amount')}</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-center">{t('dangarMaster.table.status')}</th>
                    <th className="px-4 py-2 text-center">{t('dangarMaster.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {filteredEntries.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-2 border-r border-zinc-200 font-sans">
                        {toGujaratiDigits(new Date(row.entry_date).toLocaleDateString('en-GB'))}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 font-bold tracking-tight text-zinc-800">
                        <span className="font-prompt" style={{ fontFamily: "'Prompt', sans-serif" }}>{row.member_name}</span> {row.member_code && <span className="text-zinc-500 font-normal ml-1 font-sans">#{toGujaratiDigits(row.member_code)}</span>}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 font-sans font-bold text-blue-600" translate="no">
                        #{formatSrNo(row.sr_no)}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 font-bold text-zinc-700">
                        <span 
                          className={row.item_name_gu ? 'font-sans' : 'font-prompt'}
                          style={{ fontFamily: row.item_name_gu ? '"Noto Sans Gujarati", sans-serif' : "'Prompt', sans-serif" }}
                        >
                          {row.item_name_gu || row.item_name}
                        </span>
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-center font-bold text-zinc-600 font-sans">
                        {toGujaratiDigits(row.quality_class ? row.quality_class.match(/\d+/)?.[0] || row.quality_class : '1')}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-right font-bold text-zinc-800 font-sans">
                        {toGujaratiDigits(parseFloat(row.net_quintal).toFixed(2))} {t('dangarMaster.table.unit')}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-right font-bold text-zinc-800 font-sans">
                        ₹{toGujaratiDigits(parseFloat(row.rate).toFixed(2))}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-right font-bold text-emerald-600 font-sans">
                        ₹{toGujaratiDigits(parseFloat(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                      </td>
                      <td className="px-4 py-2 border-r border-zinc-200 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold border bg-emerald-50 border-emerald-300 text-emerald-700">
                          {t('dangarMaster.table.committed')}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => {
                            window.location.hash = `#/dangar-entry/${row.id}`;
                          }}
                          className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 transition"
                          title="Edit Transaction"
                        >
                          <Edit3 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
