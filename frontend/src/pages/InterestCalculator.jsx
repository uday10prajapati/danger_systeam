import React, { useState, useEffect } from 'react';
import {
  Calculator, Calendar, Download, RefreshCcw, TrendingUp, DollarSign,
  Users, ChevronRight, AlertCircle, Search, Info, History, Database,
  Plus, X, Save, TrendingDown, Layout, FileText, Printer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { addGujaratiFont, addPromptFont } from '../utils/pdfFonts';
import api from '../api';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';
import Toast from '../components/Toast';
import Loading from '../components/Loading';

export default function InterestCalculator() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [calculationDate, setCalculationDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ totalPrincipal: 0, totalInterest: 0 });
  const [globalRate, setGlobalRate] = useState('');
  const [globalRateType, setGlobalRateType] = useState('per_month');
  const [settleModalRow, setSettleModalRow] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleType, setSettleType] = useState('Credit');
  const [searchQuery, setSearchQuery] = useState('');
  const [isComputed, setIsComputed] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [customNarration, setCustomNarration] = useState('');

  const toggleRow = (memberId) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(memberId)) newSet.delete(memberId);
    else newSet.add(memberId);
    setExpandedRows(newSet);
  };

  const fetchCalculations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/account-ledger/interest-calculations', {
        params: { date: calculationDate }
      });

      if (response.data.success) {
        const initialData = response.data.data.map(row => {
          const end = new Date(calculationDate);

          const start = new Date(row.transaction_date);
          const diffTime = end - start;
          const elapsedDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);

          return {
            ...row,
            elapsedDays: elapsedDays,
            entries: (row.entries || []).map(entry => {
              const eStart = new Date(entry.transaction_date);
              const eDiff = end - eStart;
              return { ...entry, elapsedDays: Math.max(0, Math.floor(eDiff / (1000 * 60 * 60 * 24)) + 1) };
            })
          };
        });
        setResults(initialData);
        setIsComputed(false);
      }
    } catch (error) {
      console.error('Error fetching interest calculations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const totals = results.reduce((acc, curr) => {
      const interest = isComputed ? (parseFloat(calculateYield(curr)) || 0) : 0;
      const principal = parseFloat(curr.principal || 0);

      return {
        totalPrincipal: acc.totalPrincipal + principal,
        totalInterest: acc.totalInterest + interest
      };
    }, { totalPrincipal: 0, totalInterest: 0 });

    setStats(totals);
  }, [results, globalRate, globalRateType, isComputed]);

  const calculateYield = (row) => {
    if (!isComputed) return '0.00';
    const r = parseFloat(globalRate) || parseFloat(row.interest_percent) || 0;

    if (row.entries && row.entries.length > 0) {
      const totalYield = row.entries.reduce((acc, entry) => {
        const p = parseFloat(entry.principal);
        const d = parseInt(entry.elapsedDays) || 0;
        let m = 0;
        if (globalRateType === 'per_day') m = d;
        else if (globalRateType === 'per_month') m = d / 30.0;
        else if (globalRateType === 'per_year') m = d / 365.0;
        return acc + (p * (r / 100) * m);
      }, 0);
      return totalYield.toFixed(2);
    }

    const days = parseInt(row.elapsedDays) || 0;
    let multiplier = 0;
    if (globalRateType === 'per_day') multiplier = days;
    else if (globalRateType === 'per_month') multiplier = days / 30.0;
    else if (globalRateType === 'per_year') multiplier = days / 365.0;

    const yieldAmt = (parseFloat(row.principal) * (r / 100) * multiplier);
    return isNaN(yieldAmt) ? '0.00' : yieldAmt.toFixed(2);
  };

  const handleCompute = async () => {
    try {
      setLoading(true);
      if (globalRate && results.length > 0) {
        await api.post('/account-ledger/bulk-apply-interest', {
          globalRate: parseFloat(globalRate),
          asOfDate: calculationDate,
          rateType: globalRateType
        });
      }
      setIsComputed(true);
    } catch (error) {
      console.error('Error applying interest to DB:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalRateChange = (e) => {
    setGlobalRate(e.target.value);
  };

  const handleSettleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!settleModalRow || !settleAmount) return;
    try {
      setLoading(true);
      const cashIn = settleType === 'Credit' ? parseFloat(settleAmount) : 0;
      const cashOut = settleType === 'Debit' ? parseFloat(settleAmount) : 0;

      const response = await api.post('/cash-book/manual', {
        transaction_date: calculationDate,
        description: customNarration || t('interestCalculator.interestSettlement', { name: settleModalRow.member_name }),
        cash_in: cashIn,
        cash_out: cashOut,
        notes: t('interestCalculator.calculatedYieldRef', { yield: calculateYield(settleModalRow) }),
        member_id: settleModalRow.member_id
      }, {
        headers: { 'x-user-id': 1 }
      });

      if (response.data.success) {
        setSettleModalRow(null);
        setSettleAmount('');
        setCustomNarration('');
        setMessage({ type: 'success', text: 'Interest settlement recorded successfully' });
        fetchCalculations();
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Failed to record settlement' });
      }
    } catch (error) {
      console.error('Error settling interest:', error);
      setMessage({ type: 'error', text: 'Operational failure' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalculations();
  }, [calculationDate]);

  const handlePrint = async () => {
    const dataToPrint = filteredResults;
    if (!dataToPrint.length) return;

    const company = JSON.parse(localStorage.getItem('company') || '{}');
    const cName = company.company_name_gu || company.company_name || 'Danger Systeam';
    
    const tempWrap = document.createElement('div');
    tempWrap.style.position = 'fixed';
    tempWrap.style.left = '-10000px';
    tempWrap.style.top = '0';
    tempWrap.style.width = '1000px';
    tempWrap.style.background = '#fff';
    tempWrap.style.padding = '30px';

    const tableRows = dataToPrint.map((row, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="padding:8px;border:1px solid #e2e8f0;font-weight:700;"><span class="font-prompt tracking-wider">${row.member_name || '-'}</span> <br/><span style="font-size:9px;color:#94a3b8;">${row.member_code}</span></td>
        <td style="padding:8px;border:1px solid #e2e8f0;"><span class="font-prompt tracking-wider" style="font-size:10px;">${row.description === 'Multiple Consolidated Nodes' ? t('interestCalculator.consolidatedTransactions') : row.description}</span></td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${parseFloat(row.debit || 0).toFixed(2)}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${parseFloat(row.credit || 0).toFixed(2)}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:700;">${parseFloat(row.principal || 0).toFixed(2)}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${row.elapsedDays} D</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${isComputed ? (parseFloat(globalRate) || row.interest_percent) + '%' : '-'}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;font-weight:700;color:#2563eb;">${calculateYield(row)}</td>
      </tr>`).join('');

    const totalInterest = dataToPrint.reduce((s, r) => s + parseFloat(calculateYield(r) || 0), 0);
    const totalPrincipal = dataToPrint.reduce((s, r) => s + parseFloat(r.principal || 0), 0);

    tempWrap.innerHTML = `
      <div style="border:1px solid #000;padding:2px;">
        <div style="background:#1e293b;color:#fff;padding:15px;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:20px;font-weight:900;">${cName}</div>
          <div style="font-size:12px;font-weight:700;">${t('interestCalculator.title')}</div>
        </div>
        <div style="padding:20px;">
          <h2 style="font-size:18px;font-weight:900;margin-bottom:5px;">${t('interestCalculator.title')}</h2>
          <p style="font-size:10px;color:#64748b;margin-bottom:15px;">
            ${t('interestCalculator.targetDate')}: ${calculationDate.split('-').reverse().join('-')} | 
            ${t('interestCalculator.rateLabel')}: ${globalRate || '--'}% | 
            Generated: ${new Date().toLocaleString('en-IN')}
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:10px;border:1px solid #cbd5e1;text-align:left;">${t('interestCalculator.table.entity')}</th>
                <th style="padding:10px;border:1px solid #cbd5e1;text-align:left;">${t('interestCalculator.table.reference')}</th>
                <th style="padding:10px;border:1px solid #cbd5e1;text-align:right;">${t('interestCalculator.table.debit')}</th>
                <th style="padding:10px;border:1px solid #cbd5e1;text-align:right;">${t('interestCalculator.table.credit')}</th>
                <th style="padding:10px;border:1px solid #cbd5e1;text-align:right;">${t('interestCalculator.table.principal')}</th>
                <th style="padding:10px;border:1px solid #cbd5e1;text-align:center;">${t('interestCalculator.table.days')}</th>
                <th style="padding:10px;border:1px solid #cbd5e1;text-align:center;">${t('interestCalculator.table.rate')}</th>
                <th style="padding:10px;border:1px solid #cbd5e1;text-align:right;">${t('interestCalculator.table.yield')}</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot>
              <tr style="background:#f8fafc;font-weight:900;">
                <td style="padding:10px;border:1px solid #cbd5e1;">TOTALS (${dataToPrint.length})</td>
                <td style="padding:10px;border:1px solid #cbd5e1;"></td>
                <td style="padding:10px;border:1px solid #cbd5e1;"></td>
                <td style="padding:10px;border:1px solid #cbd5e1;"></td>
                <td style="padding:10px;border:1px solid #cbd5e1;text-align:right;">${totalPrincipal.toFixed(2)}</td>
                <td style="padding:10px;border:1px solid #cbd5e1;"></td>
                <td style="padding:10px;border:1px solid #cbd5e1;"></td>
                <td style="padding:10px;border:1px solid #cbd5e1;text-align:right;">${totalInterest.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;

    document.body.appendChild(tempWrap);
    await new Promise(r => setTimeout(r, 300));
    const canvas = await html2canvas(tempWrap, { scale: 2 });
    document.body.removeChild(tempWrap);
    
    const win = window.open('', '_blank');
    win.document.write(`<html><body style="margin:0"><img src="${canvas.toDataURL('image/png')}" style="width:100%"/></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handleExportPDF = async () => {
    const dataToPrint = filteredResults;
    if (!dataToPrint.length) return;

    const company = JSON.parse(localStorage.getItem('company') || '{}');
    const cName = company.company_name_gu || company.company_name || 'Danger Systeam';
    
    const tempWrap = document.createElement('div');
    tempWrap.style.position = 'fixed';
    tempWrap.style.left = '-10000px';
    tempWrap.style.top = '0';
    tempWrap.style.width = '1100px';
    tempWrap.style.background = '#fff';
    tempWrap.style.padding = '30px';

    const tableRows = dataToPrint.map((row, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="padding:12px;border:1px solid #e2e8f0;font-weight:700;">
          <span class="font-prompt tracking-wider">${row.member_name || '-'}</span>
          <div style="font-size:9px;color:#64748b;margin-top:2px;">CODE: ${row.member_code}</div>
        </td>
        <td style="padding:12px;border:1px solid #e2e8f0;">
          <div class="font-prompt tracking-wider" style="font-size:11px;">${row.description === 'Multiple Consolidated Nodes' ? t('interestCalculator.consolidatedTransactions') : row.description}</div>
          <div style="font-size:9px;color:#64748b;margin-top:2px;">${row.reference_no === 'GROUPED' ? `<span class="font-prompt">${t('interestCalculator.grouped')}</span>` : '#' + row.reference_no}</div>
        </td>
        <td style="padding:12px;border:1px solid #e2e8f0;text-align:right;">${parseFloat(row.debit || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
        <td style="padding:12px;border:1px solid #e2e8f0;text-align:right;">${parseFloat(row.credit || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
        <td style="padding:12px;border:1px solid #e2e8f0;text-align:right;font-weight:900;">${parseFloat(row.principal || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
        <td style="padding:12px;border:1px solid #e2e8f0;text-align:center;">${row.elapsedDays} D</td>
        <td style="padding:12px;border:1px solid #e2e8f0;text-align:center;">${isComputed ? (parseFloat(globalRate) || row.interest_percent) + '%' : '-'}</td>
        <td style="padding:12px;border:1px solid #e2e8f0;text-align:right;font-weight:900;color:#2563eb;">${calculateYield(row)}</td>
      </tr>`).join('');

    const totalInterest = dataToPrint.reduce((s, r) => s + parseFloat(calculateYield(r) || 0), 0);
    const totalPrincipal = dataToPrint.reduce((s, r) => s + parseFloat(r.principal || 0), 0);

    tempWrap.innerHTML = `
      <div style="border:2px solid #0f172a;padding:2px;">
        <div style="background:#0f172a;color:#fff;padding:25px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:26px;font-weight:900;letter-spacing:-1px;">${cName}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">FINANCIAL ANALYTICS DIVISION</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:14px;font-weight:700;">${t('interestCalculator.title')}</div>
            <div style="font-size:9px;color:#94a3b8;margin-top:2px;">REF: IC-COMPUTE-${new Date().getTime()}</div>
          </div>
        </div>
        
        <div style="padding:30px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:25px;border-bottom:3px solid #f1f5f9;padding-bottom:15px;">
             <div>
               <div style="font-size:20px;font-weight:900;color:#0f172a;">${t('interestCalculator.title')}</div>
               <div style="font-size:10px;color:#64748b;font-weight:700;margin-top:2px;">MANIFEST DATE: ${calculationDate.split('-').reverse().join('-')}</div>
             </div>
             <div style="text-align:right;">
               <div style="font-size:10px;color:#64748b;font-weight:700;">
                 RATE: ${globalRate || '--'}% (${globalRateType.replace('_', ' ')}) | RECORDS: ${dataToPrint.length}
               </div>
             </div>
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#0f172a;color:#fff;">
                <th style="padding:15px 12px;border:1px solid #0f172a;text-align:left;">${t('interestCalculator.table.entity')}</th>
                <th style="padding:15px 12px;border:1px solid #0f172a;text-align:left;">${t('interestCalculator.table.reference')}</th>
                <th style="padding:15px 12px;border:1px solid #0f172a;text-align:right;">${t('interestCalculator.table.debit')}</th>
                <th style="padding:15px 12px;border:1px solid #0f172a;text-align:right;">${t('interestCalculator.table.credit')}</th>
                <th style="padding:15px 12px;border:1px solid #0f172a;text-align:right;">${t('interestCalculator.table.principal')}</th>
                <th style="padding:15px 12px;border:1px solid #0f172a;text-align:center;">${t('interestCalculator.table.days')}</th>
                <th style="padding:15px 12px;border:1px solid #0f172a;text-align:center;">${t('interestCalculator.table.rate')}</th>
                <th style="padding:15px 12px;border:1px solid #0f172a;text-align:right;">${t('interestCalculator.table.yield')}</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
            <tfoot>
              <tr style="background:#f8fafc;font-weight:900;font-size:13px;border-top:2px solid #0f172a;">
                <td style="padding:15px 12px;border:1px solid #cbd5e1;">TOTALS</td>
                <td style="padding:15px 12px;border:1px solid #cbd5e1;"></td>
                <td style="padding:15px 12px;border:1px solid #cbd5e1;"></td>
                <td style="padding:15px 12px;border:1px solid #cbd5e1;"></td>
                <td style="padding:15px 12px;border:1px solid #cbd5e1;text-align:right;">${totalPrincipal.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
                <td style="padding:15px 12px;border:1px solid #cbd5e1;"></td>
                <td style="padding:15px 12px;border:1px solid #cbd5e1;"></td>
                <td style="padding:15px 12px;border:1px solid #cbd5e1;text-align:right;color:#2563eb;">${totalInterest.toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top:60px;display:flex;justify-content:space-between;padding-top:25px;border-top:1px solid #e2e8f0;">
             <div style="font-size:9px;color:#94a3b8;font-weight:700;">
               INTEREST CALCULATED AS OF ${calculationDate} BASED ON TRANSACTIONAL LOGS.
             </div>
             <div style="text-align:right;">
               <div style="width:160px;border-bottom:2px solid #0f172a;margin-bottom:5px;"></div>
               <div style="font-size:11px;font-weight:900;color:#0f172a;">ACCOUNTANT SIGNATURE</div>
             </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(tempWrap);
    await new Promise(r => setTimeout(r, 400));
    const canvas = await html2canvas(tempWrap, { scale: 3, useCORS: true });
    document.body.removeChild(tempWrap);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 32;
    const imgW = pageW - margin * 2;
    const pageHpx = ((pageH - margin * 2) * canvas.width) / imgW;

    let yOffset = 0;
    while (yOffset < canvas.height) {
      const sliceHeight = Math.min(pageHpx, canvas.height - yOffset);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      
      if (yOffset > 0) doc.addPage();
      doc.addImage(pageCanvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, (sliceHeight * imgW) / canvas.width);
      yOffset += sliceHeight;
    }
    doc.save(`Interest_Manifest_${calculationDate}.pdf`);
  };

  const filteredResults = results.filter(row =>
    (row.member_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (row.member_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (row.reference_no || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none animate-none">
      <Toast message={message} onClose={() => setMessage(null)} />
      <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2 select-none">
              <Calculator size={20} className="text-zinc-600" />
              {t('interestCalculator.title')}
            </h1>
            <p className="text-xs font-bold text-zinc-500 mt-0.5 uppercase tracking-wider font-prompt">{t('interestCalculator.eyebrow')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto select-none">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
            >
              <Printer size={14} />{t('common.print')}</button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
            >
              <FileText size={14} />{t('common.pdf')}</button>
          </div>
        </div>

        {/* Dynamic Parameter Ribbon */}
        <div className="flex flex-wrap items-center gap-4 bg-zinc-50 border border-zinc-300 p-3 select-none">
          <div className="flex items-center gap-3 px-3 flex-1 md:flex-initial">
            <DollarSign className="w-4 h-4 text-zinc-600" />
            <div className="flex flex-col">
              <label className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase">{t('interestCalculator.rateLabel')}</label>
              <input
                type="number"
                step="0.01"
                placeholder="2.00"
                value={globalRate}
                onChange={handleGlobalRateChange}
                className="text-xs font-bold text-zinc-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-16"
              />
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-zinc-200" />
          <div className="flex items-center gap-3 px-3 flex-1 md:flex-initial">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <div className="flex flex-col">
              <label className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase">{t('interestCalculator.periodLabel')}</label>
              <select
                value={globalRateType}
                onChange={(e) => setGlobalRateType(e.target.value)}
                className="text-xs font-bold text-zinc-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-24 appearance-none"
              >
                <option value="per_month">{t('interestCalculator.perMonth')}</option>
                <option value="per_year">{t('interestCalculator.perYear')}</option>
                <option value="per_day">{t('interestCalculator.perDay')}</option>
              </select>
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-zinc-200" />
          <div className="flex items-center gap-3 px-3 flex-1 md:flex-initial">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <div className="flex flex-col">
              <label className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase">{t('interestCalculator.targetDate')}</label>
              <input
                type="date"
                value={calculationDate}
                onChange={(e) => setCalculationDate(e.target.value)}
                className="text-xs font-bold text-zinc-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-28"
              />
            </div>
          </div>
          <div className="hidden md:block w-px h-8 bg-zinc-200" />
          <div className="flex items-center px-3">
            <button
              onClick={handleCompute}
              disabled={loading || !results.length}
              className={`flex items-center gap-1.5 border px-4 py-2 text-white text-xs font-bold transition shadow-sm select-none ${
                isComputed ? 'bg-zinc-700 hover:bg-zinc-800 border-zinc-600' : 'bg-blue-600 hover:bg-blue-700 border-blue-500'
              } disabled:opacity-50`}
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {isComputed ? 'RE-COMPUTE' : 'COMPUTE'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 select-none">
          <div className="bg-zinc-50 border border-zinc-300 p-4 flex flex-col justify-between h-24">
            <span className="text-[10px] font-bold text-zinc-500 uppercase font-prompt">{t('interestCalculator.activePrincipal')}</span>
            <span className="text-2xl font-bold text-zinc-800 mt-1 font-prompt">₹{stats.totalPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="bg-zinc-50 border border-zinc-300 p-4 flex flex-col justify-between h-24">
            <span className="text-[10px] font-bold text-zinc-500 uppercase font-prompt">{t('interestCalculator.accruedInterest')}</span>
            <span className="text-2xl font-bold text-zinc-800 mt-1 font-prompt">₹{stats.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Dense Minimal Classic Interest Computation Table */}
        <div className="border border-zinc-300 bg-zinc-50 flex flex-col min-h-[450px]">
          <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex flex-wrap items-center justify-between gap-3">
             <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider font-prompt">
                   {t('interestCalculator.calculationMatrix')}
                </span>
                <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-bold text-[10px] px-2 py-0.5 uppercase font-prompt">
                   {filteredResults.length} {t('interestCalculator.nodes')}
                </span>
             </div>
             <div className="flex items-center gap-2 border border-zinc-300 bg-white px-3 py-1.5 focus-within:border-zinc-500 w-full md:w-auto">
               <Search className="w-4 h-4 text-zinc-400" />
               <input
                 type="text"
                 placeholder={t("interestCalculator.searchIdentity")}
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="bg-transparent text-xs font-bold text-zinc-700 outline-none w-64 placeholder:text-zinc-300 font-prompt"
               />
             </div>
          </div>

          <div className="flex-1 overflow-x-auto bg-white select-none">
            <table className="w-full text-left border-collapse font-sans text-xs select-none">
               <thead>
                 <tr className="bg-zinc-50 border-b border-zinc-300 text-[10px] font-bold text-zinc-600 uppercase tracking-wider select-none font-sans">
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-left font-prompt">{t('interestCalculator.table.entity')}</th>
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-left font-prompt">{t('interestCalculator.table.reference')}</th>
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-right font-prompt">{t('interestCalculator.table.debit')}</th>
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-right font-prompt">{t('interestCalculator.table.credit')}</th>
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-right font-prompt">{t('interestCalculator.table.principal')}</th>
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-center font-prompt">{t('interestCalculator.table.days')}</th>
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-center font-prompt">{t('interestCalculator.table.rate')}</th>
                   <th scope="col" className="px-4 py-2 border-r border-zinc-200 text-right font-prompt">{t('interestCalculator.table.yield')}</th>
                   <th scope="col" className="px-4 py-2 text-right font-prompt">{t('interestCalculator.table.total')}</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-zinc-200 text-xs">
                 {loading ? (
                   <tr>
                     <td colSpan="9" className="py-20 text-center">
                       <RefreshCcw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-prompt">{t('interestCalculator.processing')}</p>
                     </td>
                   </tr>
                 ) : filteredResults.length === 0 ? (
                   <tr>
                     <td colSpan="9" className="py-20 text-center">
                       <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-prompt">{t('interestCalculator.noNodes')}</p>
                     </td>
                   </tr>
                 ) : (
                   filteredResults.map((row, idx) => (
                     <React.Fragment key={row.member_id || idx}>
                       <tr
                         className={`group hover:bg-slate-50/50 transition-all cursor-pointer ${expandedRows.has(row.member_id) ? 'bg-blue-50/30' : ''}`}
                         onClick={() => row.entry_count > 1 && toggleRow(row.member_id)}
                       >
                         <td className="py-3 px-4 border-r border-zinc-200">
                           <div className="flex items-center gap-3">
                             {row.entry_count > 1 && (
                               <ChevronRight size={14} className={`text-slate-400 transition-transform ${expandedRows.has(row.member_id) ? 'rotate-90' : ''}`} />
                             )}
                             <div>
                               <p className="text-sm font-bold text-slate-800 tracking-tight uppercase italic font-prompt tracking-wider">{row.member_name}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CODE: {row.member_code}</p>
                             </div>
                           </div>
                         </td>
                         <td className="py-3 px-4 border-r border-zinc-200">
                           <p className="text-xs font-bold text-slate-600 truncate max-w-[200px] font-prompt tracking-wider">
                              {row.description === 'Multiple Consolidated Nodes' ? t('interestCalculator.consolidatedTransactions') : row.description}
                            </p>
                           <p className="text-[10px] text-slate-400">
                              {row.reference_no === 'GROUPED' ? (
                                <span className="font-prompt tracking-wider italic text-blue-600">{t('interestCalculator.viewDetails')}</span>
                              ) : (
                                `# ${row.reference_no || '-'}`
                              )}
                            </p>
                         </td>
                         <td className="py-3 px-4 border-r border-zinc-200 text-right">
                           <span className="text-sm font-bold text-rose-600">₹{parseFloat(row.debit || 0).toLocaleString('en-IN')}</span>
                         </td>
                         <td className="py-3 px-4 border-r border-zinc-200 text-right">
                           <span className="text-sm font-bold text-emerald-600">₹{parseFloat(row.credit || 0).toLocaleString('en-IN')}</span>
                         </td>
                         <td className="py-3 px-4 border-r border-zinc-200 text-right">
                           <span className="text-sm font-bold text-slate-800">₹{parseFloat(row.principal).toLocaleString('en-IN')}</span>
                         </td>
                         <td className="py-3 px-4 border-r border-zinc-200 text-center">
                           <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 border border-zinc-300">
                             {row.elapsedDays} D
                           </span>
                         </td>
                         <td className="py-3 px-4 border-r border-zinc-200 text-center text-xs font-bold text-slate-600">
                           {isComputed ? `${parseFloat(globalRate) || row.interest_percent}%` : '—'}
                         </td>
                         <td className="py-3 px-4 border-r border-zinc-200 text-right font-bold text-blue-600 text-sm">
                           ₹{calculateYield(row)}
                         </td>
                         <td className="py-3 px-4 text-right font-bold">
                           <span className="text-sm font-bold text-slate-900 bg-blue-50/50 px-2 py-1 border border-blue-200/60">
                             ₹{(parseFloat(row.principal) + parseFloat(calculateYield(row))).toLocaleString('en-IN')}
                           </span>
                         </td>
                       </tr>
                       {expandedRows.has(row.member_id) && row.entries && row.entries.map((entry, eIdx) => (
                         <tr key={`${row.member_id}-sub-${eIdx}`} className="bg-slate-50/30 border-t border-slate-100">
                           <td className="py-2 px-4 pl-14 border-r border-zinc-200">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-prompt">Node {eIdx + 1}</p>
                           </td>
                           <td className="py-2 px-4 border-r border-zinc-200">
                             <p className="text-[11px] font-bold text-slate-500 truncate max-w-[200px] font-prompt">{entry.description}</p>
                             <p className="text-[9px] text-slate-400"># {entry.reference_no}</p>
                           </td>
                           <td className="py-2 px-4 border-r border-zinc-200 text-right text-xs text-rose-600">₹{parseFloat(entry.debit || 0).toFixed(2)}</td>
                           <td className="py-2 px-4 border-r border-zinc-200 text-right text-xs text-emerald-600">₹{parseFloat(entry.credit || 0).toFixed(2)}</td>
                           <td className="py-2 px-4 border-r border-zinc-200 text-right text-xs font-bold text-slate-600">₹{parseFloat(entry.principal).toFixed(2)}</td>
                           <td className="py-2 px-4 border-r border-zinc-200 text-center text-[10px] text-slate-400">{entry.elapsedDays} d</td>
                           <td className="py-2 px-4 border-r border-zinc-200 text-center text-[10px] text-slate-400">—</td>
                           <td className="py-2 px-4 border-r border-zinc-200 text-right font-bold text-blue-600 text-xs">₹{isComputed ? calculateYield(entry) : '0.00'}</td>
                           <td className="py-2 px-4 text-right font-bold text-slate-400 text-xs">₹{parseFloat(entry.principal).toFixed(2)}</td>
                         </tr>
                       ))}
                     </React.Fragment>
                   ))
                 )}
               </tbody>
            </table>
          </div>
        </div>

      {settleModalRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white shadow-2xl w-full max-w-md overflow-hidden border border-zinc-300 animate-in zoom-in-95 duration-200">
            <div className="bg-zinc-800 p-4 flex justify-between items-center font-prompt">
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">{t('interestCalculator.settleAccount')}</h2>
                <p className="text-[10px] text-zinc-300 uppercase tracking-widest mt-1">{settleModalRow.member_name} [{settleModalRow.member_code}]</p>
              </div>
              <button onClick={() => setSettleModalRow(null)} className="p-2 text-white/50 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSettleSubmit} className="p-6 space-y-6">
              <div className="flex bg-zinc-100 p-1 font-prompt">
                <button
                  type="button"
                  onClick={() => setSettleType('Credit')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${settleType === 'Credit' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-400'}`}
                >
                  {t('interestCalculator.receiveCredit')}
                </button>
                <button
                  type="button"
                  onClick={() => setSettleType('Debit')}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${settleType === 'Debit' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-400'}`}
                >
                  {t('interestCalculator.giveDebit')}
                </button>
              </div>
              <div className="space-y-1.5 font-prompt">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">{t('interestCalculator.settleAmount')}</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-xl font-black text-zinc-900 outline-none focus:bg-white focus:border-zinc-500 transition-all tracking-tighter"
                />
              </div>
              <div className="space-y-1.5 font-prompt">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">{t('interestCalculator.narration')}</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={customNarration}
                    onChange={(e) => setCustomNarration(e.target.value)}
                    placeholder={t('interestCalculator.interestSettlement', { name: settleModalRow.member_name })}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-700 outline-none focus:bg-white focus:border-zinc-500 transition-all"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['interestAccrued', 'interestSettled', 'interestAdjustment', 'openingBalanceInterest'].map(key => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCustomNarration(t(`interestCalculator.narrations.${key}`))}
                        className="text-[9px] font-bold bg-zinc-100 hover:bg-zinc-200 px-2 py-1 border border-zinc-300 text-zinc-600 transition-colors"
                      >
                        {t(`interestCalculator.narrations.${key}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 font-prompt">
                <button type="button" onClick={() => setSettleModalRow(null)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all">{t('common.cancel')}</button>
                <button type="submit" className="flex-2 py-3 bg-zinc-800 text-white font-bold uppercase tracking-widest text-xs hover:bg-zinc-900 transition-all shadow-sm">{t('interestCalculator.confirmSettlement')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
