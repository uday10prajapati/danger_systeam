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
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';
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
  const [members, setMembers] = useState([]);
  const [isComputed, setIsComputed] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [customNarration, setCustomNarration] = useState('');

  const toggleRow = (memberId) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(memberId)) newSet.delete(memberId);
    else newSet.add(memberId);
    setExpandedRows(newSet);
  };

  const getDisplayName = (row) => {
    if (!row) return '';
    return isGu
      ? (row.member_name_gu || row.member_name || row.eng_name || '')
      : (row.eng_name || row.member_name || row.member_name_gu || '');
  };

  const fetchMembers = async () => {
    try {
      const response = await api.get('/members');
      if (response.data.success) {
        const fetchedMembers = response.data.data || [];
        setMembers(fetchedMembers);
        return fetchedMembers;
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
    return [];
  };

  const fetchCalculations = async () => {
    try {
      setLoading(true);
      let memberList = members;
      if (!memberList.length) {
        memberList = await fetchMembers();
      }
      const response = await api.get('/account-ledger/interest-calculations', {
        params: { date: calculationDate }
      });

      if (response.data.success) {
        const initialData = response.data.data.map(row => {
          const member = memberList.find(m => String(m.id) === String(row.member_id) || String(m.member_code) === String(row.member_code));
          const end = new Date(calculationDate);

          const start = new Date(row.transaction_date);
          const diffTime = end - start;
          const elapsedDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);

          return {
            ...row,
            member_name_gu: row.member_name_gu || member?.member_name_gu || row.member_name || '',
            eng_name: member?.eng_name || member?.member_name || row.member_name || '',
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
        <td style="padding:8px;border:1px solid #e2e8f0;font-weight:700;"><span class="font-prompt-sm tracking-wider">${row.member_name || '-'}</span> <br/><span style="font-size:9px;color:#94a3b8;">${row.member_code}</span></td>
        <td style="padding:8px;border:1px solid #e2e8f0;"><span class="font-prompt-sm tracking-wider" style="font-size:10px;">${row.description === 'Multiple Consolidated Nodes' ? t('interestCalculator.consolidatedTransactions') : row.description}</span></td>
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
          <span class="font-prompt-sm tracking-wider">${getDisplayName(row) || '-'}</span>
          <div style="font-size:9px;color:#64748b;margin-top:2px;">CODE: ${row.member_code}</div>
        </td>
        <td style="padding:12px;border:1px solid #e2e8f0;">
          <div class="font-prompt-sm tracking-wider" style="font-size:11px;">${row.description === 'Multiple Consolidated Nodes' ? t('interestCalculator.consolidatedTransactions') : row.description}</div>
          <div style="font-size:9px;color:#64748b;margin-top:2px;">${row.reference_no === 'GROUPED' ? `<span class="font-prompt-sm">${t('interestCalculator.grouped')}</span>` : '#' + row.reference_no}</div>
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
    getDisplayName(row).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (row.member_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (row.reference_no || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800 select-none animate-none pb-12">
      <Toast message={message} onClose={() => setMessage(null)} />
      <div className="max-w-[1600px] mx-auto space-y-4">
            {/* Dynamic Parameter Ribbon with inline Stat Cards */}
            <div className="flex flex-wrap items-center gap-4 bg-slate-50 border border-slate-200 rounded-lg p-4 select-none">
              <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('interestCalculator.rateLabel')}</label>
                <div className="flex items-center bg-white border border-slate-200 rounded-md px-2.5 h-8 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] transition w-full sm:w-28">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="2.00"
                    value={globalRate}
                    onChange={handleGlobalRateChange}
                    className="text-xs font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-full font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('interestCalculator.periodLabel')}</label>
                <div className="flex items-center bg-white border border-slate-200 rounded-md px-2.5 h-8 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] transition w-full sm:w-36">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                  <select
                    value={globalRateType}
                    onChange={(e) => setGlobalRateType(e.target.value)}
                    className="text-xs font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-full appearance-none pr-4"
                  >
                    <option value="per_month">{t('interestCalculator.perMonth')}</option>
                    <option value="per_year">{t('interestCalculator.perYear')}</option>
                    <option value="per_day">{t('interestCalculator.perDay')}</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('interestCalculator.targetDate')}</label>
                <div className="flex items-center bg-white border border-slate-200 rounded-md px-2.5 h-8 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] transition w-full sm:w-36">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
                  <input
                    type="date"
                    value={calculationDate}
                    onChange={(e) => setCalculationDate(e.target.value)}
                    className="text-xs font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-full font-mono"
                  />
                </div>
              </div>

              <div className="flex items-end pt-5 w-full sm:w-auto">
                <button
                  onClick={handleCompute}
                  disabled={loading || !results.length}
                  className={`h-8 flex items-center gap-1.5 px-4 text-xs font-bold text-white transition rounded-md cursor-pointer select-none shadow-none border w-full sm:w-auto ${
                    isComputed 
                      ? 'bg-slate-700 hover:bg-slate-800 border-slate-700' 
                      : 'bg-[#1d5f84] hover:bg-[#154662] border-[#1d5f84]'
                  } disabled:opacity-50`}
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="uppercase tracking-wider">{isComputed ? 'RE-COMPUTE' : 'COMPUTE'}</span>
                </button>
              </div>

              {/* Inline Stat Cards */}
              <div className="flex items-center gap-3 ml-auto">
                <div className="flex flex-col justify-between bg-white border border-slate-200 rounded-lg px-4 py-2 h-14 shadow-none min-w-[140px]">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('interestCalculator.activePrincipal')}</span>
                  <span className="text-sm font-black text-slate-800 font-mono tracking-tight">
                    ₹{stats.totalPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex flex-col justify-between bg-white border border-slate-200 rounded-lg px-4 py-2 h-14 shadow-none min-w-[140px]">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('interestCalculator.accruedInterest')}</span>
                  <span className="text-sm font-black text-[#1d5f84] font-mono tracking-tight">
                    ₹{stats.totalInterest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Dense Minimal Classic Interest Computation Table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col min-h-[500px] shadow-none select-none">
              {/* Table Header Bar */}
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-extrabold text-slate-700 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                    {t('interestCalculator.calculationMatrix')}
                  </span>
                  <span className="bg-slate-200 text-slate-600 font-bold force-en text-[9px] px-1.5 py-0.5 rounded-sm">
                    {filteredResults.length} {t('interestCalculator.nodes')}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  <div className="h-7 flex items-center gap-1.5 px-2 bg-white border border-slate-200 rounded-md focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] w-full sm:w-64 transition">
                    <Search size={13} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder={t("interestCalculator.searchIdentity")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none text-[11px] text-slate-700 placeholder:text-slate-400 w-full font-bold font-prompt-sm"
                    />
                  </div>
                  <button
                    onClick={handlePrint}
                    title={t('common.print') || "Print"}
                    className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none select-none"
                  >
                    <Printer size={13} className="text-slate-500" />
                  </button>
                  <button
                    onClick={handleExportPDF}
                    title={t('common.pdf') || "PDF"}
                    className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none select-none"
                  >
                    <FileText size={13} className="text-slate-500" />
                  </button>
                  <button
                    onClick={fetchCalculations}
                    title="Refresh"
                    className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md shadow-none cursor-pointer"
                  >
                    <RefreshCcw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto bg-white select-none">
                <table className="w-full text-left border-collapse font-sans text-xs select-none">
                  <thead className="bg-slate-50 select-none">
                    <tr className="text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
                      <th scope="col" className="px-4 py-2.5 border-r border-slate-100 font-prompt-sm">{t('interestCalculator.table.entity')}</th>
                      <th scope="col" className="px-4 py-2.5 border-r border-slate-100 font-prompt-sm">{t('interestCalculator.table.reference')}</th>
                      <th scope="col" className="px-4 py-2.5 border-r border-slate-100 text-right font-prompt-sm">{t('interestCalculator.table.debit')}</th>
                      <th scope="col" className="px-4 py-2.5 border-r border-slate-100 text-right font-prompt-sm">{t('interestCalculator.table.credit')}</th>
                      <th scope="col" className="px-4 py-2.5 border-r border-slate-100 text-right font-prompt-sm">{t('interestCalculator.table.principal')}</th>
                      <th scope="col" className="px-4 py-2.5 border-r border-slate-100 text-center font-prompt-sm">{t('interestCalculator.table.days')}</th>
                      <th scope="col" className="px-4 py-2.5 border-r border-slate-100 text-center font-prompt-sm">{t('interestCalculator.table.rate')}</th>
                      <th scope="col" className="px-4 py-2.5 border-r border-slate-100 text-right font-prompt-sm">{t('interestCalculator.table.yield')}</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-prompt-sm w-36">{t('interestCalculator.table.total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan="9" className="py-20 text-center">
                          <RefreshCcw className="w-8 h-8 text-[#1d5f84] animate-spin mx-auto mb-3" />
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-prompt-sm">{t('interestCalculator.processing')}</p>
                        </td>
                      </tr>
                    ) : filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="py-20 text-center">
                          <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-prompt-sm">{t('interestCalculator.noNodes')}</p>
                        </td>
                      </tr>
                    ) : (
                      filteredResults.map((row, idx) => (
                        <React.Fragment key={row.member_id || idx}>
                          <tr
                            className={`group hover:bg-slate-50/50 transition-all cursor-pointer ${expandedRows.has(row.member_id) ? 'bg-blue-50/30' : ''}`}
                            onClick={() => row.entry_count > 1 && toggleRow(row.member_id)}
                          >
                            <td className="py-3 px-4 border-r border-slate-100">
                              <div className="flex items-center gap-3">
                                {row.entry_count > 1 && (
                                  <ChevronRight size={13} className={`text-slate-400 transition-transform ${expandedRows.has(row.member_id) ? 'rotate-90' : ''}`} />
                                )}
                                <div>
                                  <p className="text-[11px] font-bold text-slate-800 tracking-tight uppercase font-prompt-sm">{getDisplayName(row)}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">CODE: {row.member_code}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 border-r border-slate-100">
                              <p className="text-[11px] font-bold text-slate-600 truncate max-w-[200px] font-prompt-sm">
                                {row.description === 'Multiple Consolidated Nodes' ? t('interestCalculator.consolidatedTransactions') : row.description}
                              </p>
                              <p className="text-[9px] text-slate-400 font-mono">
                                {row.reference_no === 'GROUPED' ? (
                                  <span className="font-prompt-sm tracking-wider italic text-blue-600 font-bold">{t('interestCalculator.viewDetails')}</span>
                                ) : (
                                  `# ${row.reference_no || '-'}`
                                )}
                              </p>
                            </td>
                            <td className="py-3 px-4 border-r border-slate-100 text-right font-bold text-rose-600 font-mono text-[11px]">
                              ₹{parseFloat(row.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 border-r border-slate-100 text-right font-bold text-emerald-600 font-mono text-[11px]">
                              ₹{parseFloat(row.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 border-r border-slate-100 text-right font-bold text-slate-800 font-mono text-[11px]">
                              ₹{parseFloat(row.principal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 border-r border-slate-100 text-center">
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                {row.elapsedDays} D
                              </span>
                            </td>
                            <td className="py-3 px-4 border-r border-slate-100 text-center text-[11px] font-bold text-slate-600 font-mono">
                              {isComputed ? `${parseFloat(globalRate) || row.interest_percent}%` : '—'}
                            </td>
                            <td className="py-3 px-4 border-r border-slate-100 text-right font-black text-[#1d5f84] font-mono text-[11px]">
                              ₹{parseFloat(calculateYield(row)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-between items-center w-full gap-2">
                                {isComputed && parseFloat(calculateYield(row)) > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSettleModalRow(row);
                                      setSettleAmount(calculateYield(row));
                                    }}
                                    className="h-5 flex items-center px-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-[#1d5f84] hover:text-[#154662] transition rounded font-bold text-[9px] uppercase tracking-wider select-none cursor-pointer"
                                    title="Settle Interest"
                                  >
                                    SETTLE
                                  </button>
                                )}
                                <span className="text-[11px] font-black text-slate-800 bg-slate-50 px-2 py-0.5 border border-slate-200 rounded font-mono ml-auto">
                                  ₹{(parseFloat(row.principal) + parseFloat(calculateYield(row))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </td>
                          </tr>
                          {expandedRows.has(row.member_id) && row.entries && row.entries.map((entry, eIdx) => (
                            <tr key={`${row.member_id}-sub-${eIdx}`} className="bg-slate-50/30 border-t border-slate-100">
                              <td className="py-2.5 px-4 pl-10 border-r border-slate-100">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-prompt-sm">Node {eIdx + 1}</p>
                              </td>
                              <td className="py-2.5 px-4 border-r border-slate-100">
                                <p className="text-[11px] font-bold text-slate-500 truncate max-w-[200px] font-prompt-sm">{entry.description}</p>
                                <p className="text-[9px] text-slate-400 font-mono"># {entry.reference_no}</p>
                              </td>
                              <td className="py-2.5 px-4 border-r border-slate-100 text-right text-xs text-rose-600 font-mono">₹{parseFloat(entry.debit || 0).toFixed(2)}</td>
                              <td className="py-2.5 px-4 border-r border-slate-100 text-right text-xs text-emerald-600 font-mono">₹{parseFloat(entry.credit || 0).toFixed(2)}</td>
                              <td className="py-2.5 px-4 border-r border-slate-100 text-right text-xs font-bold text-slate-600 font-mono">₹{parseFloat(entry.principal).toFixed(2)}</td>
                              <td className="py-2.5 px-4 border-r border-slate-100 text-center text-[10px] text-slate-400 font-mono">{entry.elapsedDays} d</td>
                              <td className="py-2.5 px-4 border-r border-slate-100 text-center text-[10px] text-slate-400 font-mono">—</td>
                              <td className="py-2.5 px-4 border-r border-slate-100 text-right font-bold text-[#1d5f84] text-xs font-mono">₹{isComputed ? parseFloat(calculateYield(entry)).toFixed(2) : '0.00'}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-400 text-xs font-mono">₹{parseFloat(entry.principal).toFixed(2)}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
      </div>

      {settleModalRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white shadow-xl max-w-md w-full rounded-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 select-none">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center font-prompt-sm">
              <div>
                <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">{t('interestCalculator.settleAccount')}</h2>
                <p className="text-[10px] text-slate-400 font-bold tracking-widest mt-0.5">{settleModalRow.member_name} [{settleModalRow.member_code}]</p>
              </div>
              <button 
                onClick={() => setSettleModalRow(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSettleSubmit} className="p-5 space-y-4">
              <div className="flex p-0.5 bg-slate-100 border border-slate-200 rounded-md gap-0.5 select-none font-prompt-sm">
                <button
                  type="button"
                  onClick={() => setSettleType('Credit')}
                  className={`flex-1 py-1.5 rounded transition cursor-pointer flex items-center justify-center font-bold text-[10px] uppercase tracking-wider select-none ${settleType === 'Credit'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {t('interestCalculator.receiveCredit')}
                </button>
                <button
                  type="button"
                  onClick={() => setSettleType('Debit')}
                  className={`flex-1 py-1.5 rounded transition cursor-pointer flex items-center justify-center font-bold text-[10px] uppercase tracking-wider select-none ${settleType === 'Debit'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {t('interestCalculator.giveDebit')}
                </button>
              </div>

              <div className="flex flex-col gap-1.5 font-prompt-sm">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('interestCalculator.settleAmount')}</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md outline-none text-xs text-slate-700 font-bold font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5 font-prompt-sm">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('interestCalculator.narration')}</label>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={customNarration}
                    onChange={(e) => setCustomNarration(e.target.value)}
                    placeholder={t('interestCalculator.interestSettlement', { name: settleModalRow.member_name })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md outline-none text-xs text-slate-700 font-bold"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {['interestAccrued', 'interestSettled', 'interestAdjustment', 'openingBalanceInterest'].map(key => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setCustomNarration(t(`interestCalculator.narrations.${key}`))}
                        className="text-[9px] font-bold bg-slate-50 hover:bg-slate-100 px-2 py-1 border border-slate-200 text-slate-600 rounded transition cursor-pointer"
                      >
                        {t(`interestCalculator.narrations.${key}`)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2 font-prompt-sm">
                <button 
                  type="button" 
                  onClick={() => setSettleModalRow(null)} 
                  className="flex-1 h-8 flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 font-bold text-xs uppercase tracking-wider rounded-md cursor-pointer transition"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="flex-2 h-8 flex items-center justify-center text-white bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] font-bold text-xs uppercase tracking-wider rounded-md cursor-pointer transition shadow-none"
                >
                  {t('interestCalculator.confirmSettlement')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
