import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Printer, Save,
  Search, X, RefreshCcw, Calendar,
  AlertCircle, CheckCircle, History,
  Package, User, FileText, ChevronRight,
  Database, Info, Layout, ArrowLeftRight,
  TrendingDown, TrendingUp, IndianRupee, Tag, Edit2, Eye
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import api, { bardanEntryApi, jamaBardanEntryApi, sabhasadMasterApi } from '../api';
import { addGujaratiFont, addPromptFont } from '../utils/pdfFonts';
import { formatBilingualText } from '../utils/textUtils';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import Toast from '../components/Toast';
import { exportToPDF, toGujaratiDigits as guDigits } from '../utils/pdfExporter';


const BardanPortfolio = () => {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';
  const displayMemberName = (member) => {
    if (!member) return '';
    return isGu
      ? (member.member_name_gu || member.member_name || member.eng_name || '')
      : (member.eng_name || member.member_name || member.member_name_gu || '');
  };
  const [formData, setFormData] = useState({
    id: null,
    type: 'GIVEN', // GIVEN or RETURNED
    pavtiNo: '',
    date: new Date().toISOString().split('T')[0],
    memNominal: '',
    code: '',
    name: '',
    qty: '',
    remark: '',
    dayQty: '',
    totalQty: '',
    option: 'Company' // Default to Company Bags for returns
  });

  const [gridRows, setGridRows] = useState(Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [members, setMembers] = useState([]);
  const [history, setHistory] = useState([]);
  const [ledgerData, setLedgerData] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [balanceData, setBalanceData] = useState({ taken: 0, returned: 0, balance: 0 });
  const [bardanPrice, setBardanPrice] = useState(0);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceForm, setPriceForm] = useState({ price_per_bardan: '' });
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [dropdowns, setDropdowns] = useState({ code: false, name: false });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const entryFormRef = useRef(null);

  const handleEnterFieldNavigation = (e) => {
    if (e.key !== 'Enter') return;
    const tagName = (e.target.tagName || '').toLowerCase();
    if (tagName === 'textarea') return;

    e.preventDefault();

    const root = entryFormRef.current;
    if (!root) return;

    const focusable = Array.from(root.querySelectorAll('input, select, textarea, button, [tabindex]:not([tabindex="-1"])'))
      .filter((el) => !el.disabled && el.offsetParent !== null && el.type !== 'hidden');

    const currentIndex = focusable.indexOf(e.target);
    if (currentIndex === -1) return;

    const next = focusable[currentIndex + 1];
    if (next) {
      next.focus();
      if (typeof next.select === 'function' && (next.tagName || '').toLowerCase() === 'input') {
        next.select();
      }
    }
  };

  useEffect(() => {
    const total = gridRows.reduce((acc, row) => {
      const sum = (parseFloat(row.col1) || 0) + (parseFloat(row.col2) || 0) + (parseFloat(row.col3) || 0);
      return acc + sum;
    }, 0);
    // Only auto-fill qty from grid if grid has data
    if (total > 0 && formData.type !== 'RETURNED') {
      setFormData(prev => ({ ...prev, qty: total.toFixed(2) }));
    }
  }, [gridRows, formData.type]);

  useEffect(() => {
    loadData();
    loadBardanPrice();

    const handleOutsideClick = (e) => {
      if (!e.target.closest('.member-select-container')) {
        setDropdowns({ code: false, name: false });
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!formData.code) return;
    const member = members.find(m => String(m.member_code) === String(formData.code));
    if (!member) return;

    const localizedName = displayMemberName(member);
    if (localizedName && localizedName !== formData.name) {
      setFormData(prev => ({ ...prev, name: localizedName }));
    }
  }, [isGu, members, formData.code, formData.name]);

  const loadData = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr || userStr === 'undefined') {
        console.warn('Redirecting to login: No session found');
        return;
      }

      const user = JSON.parse(userStr);
      if (!user.company_id) {
        console.warn('Incomplete session: Missing company_id');
        setMessage({ type: 'error', text: 'Authentication session incomplete' });
        return;
      }

      setLoading(true);
      const [membersRes, givenRes, returnedRes] = await Promise.all([
        sabhasadMasterApi.getAllSabhasad(),
        bardanEntryApi.getAllEntries(),
        jamaBardanEntryApi.getAllEntries()
      ]);

      const membersArr = membersRes.data.success ? (membersRes.data.data || membersRes.data) : (Array.isArray(membersRes.data) ? membersRes.data : []);
      const membersWithGu = (membersArr || []).map(m => ({
        ...m,
        display_name: m.eng_name || m.member_name || m.member_name_gu || ''
      }));
      setMembers(membersWithGu);

      const combined = [
        ...(givenRes.data.success ? (givenRes.data.data || []).map(item => ({ ...item, debit: item.qty, credit: 0, type: 'GIVEN' })) : []),
        ...(returnedRes.data.success ? (returnedRes.data.data || []).map(item => ({ ...item, debit: 0, credit: item.qty, type: 'RETURNED' })) : []),
        ...membersArr.map(m => ({
          code: m.member_code,
          name: m.member_name,
          debit: parseFloat(m.bardan_opening || 0),
          credit: 0,
          entry_date: null,
          pavti_no: 'OPENING',
          type: 'OPENING'
        }))
      ].sort((a, b) => new Date(b.entry_date || 0) - new Date(a.entry_date || 0));

      // Group history by Member only for a "summed up" view
      const memberGroups = {};
      combined.forEach(item => {
        const key = item.code;
        if (!memberGroups[key]) {
          memberGroups[key] = {
            code: item.code,
            name: item.name,
            date: item.entry_date,
            debit: 0,
            credit: 0,
            details: []
          };
        }
        memberGroups[key].debit += parseFloat(item.debit || 0);
        memberGroups[key].credit += parseFloat(item.credit || 0);
        if (item.pavti_no && item.pavti_no !== 'OPENING') memberGroups[key].details.push(item.pavti_no);
      });

      const processedHistory = Object.values(memberGroups)
        .filter(m => m.debit !== 0 || m.credit !== 0) // Only show members with activity or opening
        .map(m => ({
          ...m,
          pavti_no: m.details.length > 0 ? [...new Set(m.details)].join(', ') : (t('bardanPortfolio.initial') || 'પ્રારંભિક'),
          balance: m.debit - m.credit
        }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      // ensure history shows name correctly for the font mapping
      setHistory(processedHistory.map(h => {
        const m = membersWithGu.find(mem => String(mem.member_code) === String(h.code));
        return {
          ...h,
          name: displayMemberName(m) || h.name || '',
          display_balance: h.balance.toFixed(2),
          display_debit: h.debit.toFixed(2),
          display_credit: h.credit.toFixed(2)
        };
      }));
    } catch (error) {
      console.error('Failed to load initial data:', error);
      if (error.response?.status === 400) {
        setMessage({ type: 'error', text: 'Authorization failure: Company context missing' });
      } else {
        setMessage({ type: 'error', text: 'Synchronization failure' });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadBardanPrice = async () => {
    try {
      const res = await api.get('/bardan-price');
      if (res.data.success) {
        setBardanPrice(res.data.data?.price_per_bardan || 0);
        setPriceForm({ price_per_bardan: res.data.data?.price_per_bardan || '' });
      }

    } catch (err) {
      console.error('Bardan price fetch error:', err);
    }
  };

  // Fetch entry by Pavti/Receipt number (search both bardan_entry and jama_bardan_entry)
  const fetchByPavti = async (pavti) => {
    if (!pavti) return;
    try {
      setLoading(true);
      const isReturnMode = formData.type === 'RETURNED';

      try {
        const full = await bardanEntryApi.getEntryByPavti(pavti);
        if (full.data?.success) {
          const e = full.data.data;
          let prefillQty = e.qty;
          let prefillType = 'GIVEN';
          let prefillId = e.id;
          let prefillGridRows = e.gridRows || Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' }));

          if (isReturnMode) {
            try {
              const balRes = await bardanEntryApi.getBalance(e.code);
              const remaining = Math.max(0, parseFloat(balRes?.data?.data?.balance || 0));
              prefillQty = '';
              prefillType = 'RETURNED';
              prefillId = null;
              prefillGridRows = Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' }));

              if (remaining <= 0) {
                setMessage({ type: 'error', text: 'No remaining bardan for this member.' });
                setTimeout(() => setMessage(null), 2500);
              }
            } catch (balErr) {
              console.warn('Failed to fetch remaining balance during pavti lookup:', balErr);
            }
          }

          setFormData(prev => ({
            ...prev,
            id: prefillId,
            bookType: e.book_type,
            pavtiNo: e.pavti_no,
            date: e.entry_date ? new Date(e.entry_date).toISOString().split('T')[0] : prev.date,
            memNominal: e.mem_nominal,
            code: e.code,
            name: e.name,
            qty: prefillQty,
            option: e.option_type || prev.option,
            remark: e.remark || prev.remark,
            dayQty: isReturnMode ? prefillQty : e.day_qty,
            totalQty: isReturnMode ? prefillQty : e.total_qty,
            type: prefillType
          }));
          setGridRows(prefillGridRows);
          fetchBalance(e.code);
          setMessage({
            type: 'success',
            text: isReturnMode ? `Loaded remaining bardan for #${e.pavti_no}` : `Loaded entry #${e.pavti_no}`
          });
          setTimeout(() => setMessage(null), 2500);
          return;
        }
      } catch (err) {
        // ignore and try jama
      }

      try {
        const full = await jamaBardanEntryApi.getEntryByPavti(pavti);
        if (full.data?.success) {
          const e = full.data.data;
          setFormData(prev => ({
            ...prev,
            id: e.id,
            bookType: e.book_type,
            pavtiNo: e.pavti_no,
            date: e.entry_date ? new Date(e.entry_date).toISOString().split('T')[0] : prev.date,
            memNominal: e.mem_nominal,
            code: e.code,
            name: e.name,
            qty: e.qty,
            option: e.option_type || prev.option,
            remark: e.remark || prev.remark,
            dayQty: e.day_qty,
            totalQty: e.total_qty,
            type: 'RETURNED'
          }));
          setGridRows(e.gridRows || Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
          fetchBalance(e.code);
          setMessage({ type: 'success', text: `Loaded return #${e.pavti_no}` });
          setTimeout(() => setMessage(null), 2500);
          return;
        }
      } catch (err) {
        // ignore and fall through
      }

      setMessage({ type: 'error', text: 'No entry found for that Pavti/Receipt number' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Pavti lookup error:', err);
      setMessage({ type: 'error', text: 'Lookup failed' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const saveBardanPrice = async () => {
    try {
      const res = await api.post('/bardan-price', priceForm);
      if (res.data.success) {
        setBardanPrice(parseFloat(priceForm.price_per_bardan) || 0);
        setShowPriceModal(false);
        setMessage({ type: 'success', text: 'Bardan price updated successfully' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update bardan price' });
    }
  };

  const fetchBalance = async (code) => {
    if (!code) {
      setBalanceData({ opening: 0, taken: 0, returned: 0, balance: 0 });
      setLedgerData([]);
      return;
    }
    try {
      setLoading(true);
      const [balRes, ledRes] = await Promise.all([
        bardanEntryApi.getBalance(code),
        bardanEntryApi.getLedger(code)
      ]);

      if (balRes.data.success) {
        setBalanceData(balRes.data.data);
      }
      if (ledRes.data.success) {
        setLedgerData(ledRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch balance/ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryPrint = () => {
    const dataToPrint = formData.code ? ledgerData : history;
    const filteredRows = dataToPrint.filter(row => {
      const term = (historySearchQuery || '').toLowerCase();
      return !term ||
        String(row.name || row.particulars || row.sabhasad_name || row.member_name || '').toLowerCase().includes(term) ||
        String(row.pavti_no || '').toLowerCase().includes(term);
    });

    const company = JSON.parse(localStorage.getItem('company') || '{}');
    const cName = isGu
      ? (company.company_name_gu || company.company_name || '')
      : (company.company_name || company.company_name_gu || '');
    const reportTitle = t('bardanPortfolio.historyTitle') || 'બારદાન ઈતિહાસ અને લેજર';
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const formattedDate = isGu ? `તારીખ: ${dateStr}` : `Date: ${dateStr}`;
    const fy = localStorage.getItem('financialYear') || '2026-27';
    const formattedFY = isGu ? `વર્ષ : ${fy}` : `FY: ${fy}`;

    const fontStyle = isGu ? "font-family:'Prompt','Noto Sans Gujarati',sans-serif;" : "font-family:Arial,sans-serif;";

    const rowsHTML = filteredRows.map((r, idx) => {
      const dateVal = (r.date || r.entry_date)
        ? new Date(r.date || r.entry_date).toLocaleDateString('en-GB').replace(/\//g, '-')
        : '—';
      const particulars = r.particulars || r.name || (r.type === 'GIVEN' ? (isGu ? 'આપેલ' : 'Given') : (isGu ? 'પરત' : 'Returned'));
      const pavtiPart = r.pavti_no ? `<br/><span style="font-size:10px;color:#64748b;"># ${r.pavti_no}</span>` : '';
      const debit = r.debit ?? (r.type === 'GIVEN' ? r.qty : 0);
      const credit = r.credit ?? (r.type === 'RETURNED' ? r.qty : 0);
      const balance = r.balance != null ? r.balance : 0;
      return `
        <tr>
          <td style="text-align:center;${fontStyle}">${idx + 1}</td>
          <td style="text-align:center;${fontStyle}">${dateVal}</td>
          <td style="${fontStyle}">${particulars}${pavtiPart}</td>
          <td style="text-align:right;${fontStyle}"><strong>${debit || '—'}</strong></td>
          <td style="text-align:right;${fontStyle}"><strong>${credit || '—'}</strong></td>
          <td style="text-align:right;${fontStyle}"><strong>${balance}</strong></td>
        </tr>`;
    }).join('');

    const totalDebit = filteredRows.reduce((s, r) => s + parseFloat(r.debit ?? (r.type === 'GIVEN' ? r.qty : 0) ?? 0), 0);
    const totalCredit = filteredRows.reduce((s, r) => s + parseFloat(r.credit ?? (r.type === 'RETURNED' ? r.qty : 0) ?? 0), 0);
    const totalBalance = filteredRows.reduce((s, r) => s + parseFloat(r.balance ?? 0), 0);

    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.write(`
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&family=Outfit:wght@400;600;700&display=swap');
            @font-face { font-family:'Prompt'; src:url('/fonts/Prompt.ttf') format('truetype'); }
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family:'Outfit','Noto Sans Gujarati',Arial,sans-serif; padding:16px; background:#fff; color:#000; }
            .pdf-report-container { border:1.5px solid #000; overflow:hidden; background:#fff; }
            .pdf-header-company { border-bottom:1.5px solid #000; padding:12px; text-align:center; font-size:112px; font-weight:bold; font-family:'Prompt','Noto Sans Gujarati','Outfit',sans-serif; color:#000; }
            .pdf-header-title { border-bottom:1.5px solid #000; padding:12px; text-align:center; font-size:14px; font-weight:bold; font-family:'Noto Sans Gujarati','Outfit',sans-serif; color:#000; }
            .pdf-info-bar { border-bottom:1.5px solid #000; padding:12px 12px; display:flex; justify-content:flex-end; align-items:center; background:#fff; }
            .pdf-table { width:100%; border-collapse:collapse; }
            .pdf-table th, .pdf-table td { border:1.5px solid #000 !important; padding:12px 10px; font-size:12px; color:#000; }
            .pdf-table th { font-weight:bold; background:#fff; border-top:none !important; }
            .pdf-table th:first-child, .pdf-table td:first-child { border-left:none !important; }
            .pdf-table th:last-child, .pdf-table td:last-child { border-right:none !important; }
            .pdf-table tr:last-child td { border-bottom:none !important; }
            @media print { @page { size:A4 portrait; margin:10mm; } body { padding:0; } }
          </style>
        </head>
        <body>
          <div class="pdf-report-container">
            <div class="pdf-header-company">${cName}</div>
            <div class="pdf-header-title">${reportTitle}</div>
            <div class="pdf-info-bar">
              <div style="font-size:12px;font-weight:bold;color:#000;display:flex;gap:16px;">
                <span>${formattedDate}</span><span>|</span><span>${formattedFY}</span>
              </div>
            </div>
            <table class="pdf-table">
              <thead><tr>
                <th style="width:6%;text-align:center;">${isGu ? 'ક્રમ' : 'Sr.'}</th>
                <th style="width:12%;text-align:center;">${isGu ? 'તારીખ' : 'Date'}</th>
                <th style="width:34%;text-align:left;">${isGu ? 'વિગત' : 'Particulars'}</th>
                <th style="width:16%;text-align:right;">${isGu ? 'ઉધાર' : 'Debit'}</th>
                <th style="width:16%;text-align:right;">${isGu ? 'જમા' : 'Credit'}</th>
                <th style="width:16%;text-align:right;">${isGu ? 'બાકી' : 'Balance'}</th>
              </tr></thead>
              <tbody>
                ${rowsHTML}
                <tr style="font-weight:bold;">
                  <td style="text-align:center;"></td>
                  <td style="text-align:center;"></td>
                  <td style="text-align:left;font-size:12px;"><strong>${isGu ? 'કુલ' : 'Total'} (${filteredRows.length} ${isGu ? 'રેકોર્ડ્સ' : 'Records'})</strong></td>
                  <td style="text-align:right;font-size:12px;"><strong>${totalDebit.toFixed(2)}</strong></td>
                  <td style="text-align:right;font-size:12px;"><strong>${totalCredit.toFixed(2)}</strong></td>
                  <td style="text-align:right;font-size:12px;"><strong>${totalBalance.toFixed(2)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleHistoryExportPDF = async () => {
    const dataToPrint = formData.code ? ledgerData : history;
    const filteredRows = dataToPrint.filter(row => {
      const term = (historySearchQuery || '').toLowerCase();
      const dateStr = (row.date || row.entry_date) ? new Date(row.date || row.entry_date).toLocaleDateString() : '—';
      const partStr = row.particulars || row.name || (row.type === 'GIVEN' ? (t('bardanPortfolio.given') || 'આપેલ') : (t('bardanPortfolio.returned') || 'પરત'));
      const pvtStr = row.pavti_no || '';
      return dateStr.toLowerCase().includes(term) || partStr.toLowerCase().includes(term) || pvtStr.toLowerCase().includes(term);
    });

    if (!filteredRows.length) {
      setMessage({ type: 'error', text: 'No records found to export' });
      return;
    }

    const totalDebit = filteredRows.reduce((s, r) => s + parseFloat(r.debit ?? (r.type === 'GIVEN' ? r.qty : 0) ?? 0), 0);
    const totalCredit = filteredRows.reduce((s, r) => s + parseFloat(r.credit ?? (r.type === 'RETURNED' ? r.qty : 0) ?? 0), 0);
    const totalBalance = filteredRows.reduce((s, r) => s + parseFloat(r.balance ?? 0), 0);

    const rowsWithTotal = [
      ...filteredRows,
      { isTotal: true, totalCount: filteredRows.length, totalDebit, totalCredit, totalBalance }
    ];

    const columns = [
      {
        header: isGu ? 'ક્રમ' : 'Sr. No.',
        align: 'center',
        width: '6%',
        render: (r, idx) => {
          if (r.isTotal) return '';
          return String(idx + 1);
        }
      },
      {
        header: isGu ? 'તારીખ' : 'Date',
        align: 'center',
        width: '12%',
        render: (r) => {
          if (r.isTotal) return '';
          return (r.date || r.entry_date)
            ? new Date(r.date || r.entry_date).toLocaleDateString('en-GB').replace(/\//g, '-')
            : '—';
        }
      },
      {
        header: isGu ? 'વિગત' : 'Particulars',
        align: 'left',
        width: '34%',
        render: (r) => {
          if (r.isTotal) {
            return `<strong style="font-size:12px;">${isGu ? 'કુલ' : 'Total'} (${r.totalCount} ${isGu ? 'રેકોર્ડ્સ' : 'Records'})</strong>`;
          }
          const particulars = r.particulars || r.name || (r.type === 'GIVEN' ? (isGu ? 'આપેલ' : 'Given') : (isGu ? 'પરત' : 'Returned'));
          const pavtiPart = r.pavti_no ? `<br/><span style="font-size:10px;color:#64748b;"># ${r.pavti_no}</span>` : '';
          return `<strong>${particulars}</strong>${pavtiPart}`;
        },
        usePromptFont: true
      },
      {
        header: isGu ? 'ઉધાર' : 'Debit',
        align: 'right',
        width: '16%',
        render: (r) => {
          const val = r.isTotal ? r.totalDebit : (r.debit ?? (r.type === 'GIVEN' ? r.qty : 0));
          return val ? `<strong>${parseFloat(val).toFixed(2)}</strong>` : '—';
        }
      },
      {
        header: isGu ? 'જમા' : 'Credit',
        align: 'right',
        width: '16%',
        render: (r) => {
          const val = r.isTotal ? r.totalCredit : (r.credit ?? (r.type === 'RETURNED' ? r.qty : 0));
          return val ? `<strong>${parseFloat(val).toFixed(2)}</strong>` : '—';
        }
      },
      {
        header: isGu ? 'બાકી' : 'Balance',
        align: 'right',
        width: '16%',
        render: (r) => {
          const val = r.isTotal ? r.totalBalance : (r.balance ?? 0);
          return `<strong>${parseFloat(val).toFixed(2)}</strong>`;
        }
      }
    ];

    const metaInfo = formData.code
      ? [{ label: isGu ? 'સભાસદ કોડ' : 'Member Code', value: String(formData.code) }]
      : [];

    await exportToPDF({
      title: t('bardanPortfolio.historyTitle') || 'બારદાન ఈતિહાસ અને લેજર',
      columns,
      rows: rowsWithTotal,
      isGu,
      metaInfo,
      filename: `Bardan_History_${formData.code || 'all'}_${new Date().toISOString().split('T')[0]}.pdf`,
      onStart: () => setLoading(true),
      onComplete: () => setLoading(false)
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setDropdowns(prev => ({ ...prev, [name]: true }));

    if (name === 'code') {
      const member = members.find(m => m.member_code === value || String(m.member_code) === String(value));
      if (member) {
        setFormData(prev => ({ ...prev, name: displayMemberName(member) || '' }));
        fetchBalance(value);
        setDropdowns(prev => ({ ...prev, code: false }));
      } else {
        setBalanceData({ taken: 0, returned: 0, balance: 0 });
      }
    }
    if (name === 'name') {
      const member = members.find(m =>
        m.member_name === value ||
        m.member_name_gu === value ||
        m.eng_name === value ||
        m.display_name === value ||
        displayMemberName(m) === value
      );
      if (member) {
        setFormData(prev => ({ ...prev, code: member.member_code, name: displayMemberName(member) }));
        fetchBalance(member.member_code);
        setDropdowns(prev => ({ ...prev, name: false }));
      } else {
        setBalanceData({ taken: 0, returned: 0, balance: 0 });
      }
    }
  };

  const selectMember = (member) => {
    setFormData(prev => ({
      ...prev,
      code: member.member_code,
      name: displayMemberName(member),
      memNominal: member.nominal_member === 'Member' ? 'Member' : 'Nominal'
    }));
    setDropdowns({ code: false, name: false });
    fetchBalance(member.member_code);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.date) {
      setMessage({ type: 'error', text: '⚠️ Please select a member and ensure date is set before saving.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!formData.qty || parseFloat(formData.qty) <= 0) {
      setMessage({ type: 'error', text: '⚠️ Quantity must be greater than 0. Enter bags count or fill the grid.' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const payload = {
        ...formData,
        gridRows,
        company_id: user.company_id,
        financial_year: user.financial_year || '2026-27'
      };

      let res;

      // If no id but pavtiNo is provided, attempt to find existing entry and update it instead of creating duplicate
      if (!formData.id && formData.pavtiNo) {
        try {
          const foundBardan = await bardanEntryApi.getEntryByPavti(formData.pavtiNo);
          if (foundBardan.data?.success) {
            res = await bardanEntryApi.updateEntry(foundBardan.data.data.id, payload);
          }
        } catch (lookupErr) {
          try {
            const foundJama = await jamaBardanEntryApi.getEntryByPavti(formData.pavtiNo);
            if (foundJama.data?.success) {
              res = await jamaBardanEntryApi.updateEntry(foundJama.data.data.id, payload);
            }
          } catch (nestedErr) {
            console.warn('Pavti lookup during save failed', nestedErr);
          }
        }
      }

      // If res is still undefined, fall back to normal create/update flow
      if (!res) {
        if (formData.id) {
          res = formData.type === 'GIVEN'
            ? await bardanEntryApi.updateEntry(formData.id, payload)
            : await jamaBardanEntryApi.updateEntry(formData.id, payload);
        } else {
          res = formData.type === 'GIVEN'
            ? await bardanEntryApi.createEntry(payload)
            : await jamaBardanEntryApi.createEntry(payload);
        }
      }

      if (res.data.success) {
        setMessage({ type: 'success', text: formData.id ? 'Transaction updated' : 'Transaction committed' });
        if (!formData.id) resetForm();
        loadData();
        if (formData.code) fetchBalance(formData.code);
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ type: 'error', text: res.data.error || 'Operational failure' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network or server error during commit' });
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async (id, type) => {
    if (!id) return;
    if (!window.confirm('⚠️ Are you sure you want to VOID this transaction? This will set quantity to zero but keep the record for audit.')) return;
    try {
      setLoading(true);
      const res = type === 'GIVEN'
        ? await bardanEntryApi.getEntryById(id)
        : await jamaBardanEntryApi.getEntryById(id);

      if (res.data.success) {
        const entry = res.data.data;
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const payload = {
          ...entry,
          qty: 0,
          gridRows: Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })),
          remark: `[VOIDED] ${entry.remark || ''}`,
          company_id: user.company_id,
          financial_year: user.financial_year || '2026-27'
        };

        const updateRes = type === 'GIVEN'
          ? await bardanEntryApi.updateEntry(id, payload)
          : await jamaBardanEntryApi.updateEntry(id, payload);

        if (updateRes.data.success) {
          setMessage({ type: 'success', text: 'Transaction voided successfully' });
          loadData();
          if (formData.code) fetchBalance(formData.code);
          setTimeout(() => setMessage(null), 5000);
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Operational failure during voiding' });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (row) => {
    setItemToDelete(row);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete?.id) return;
    const { id, type } = itemToDelete;
    try {
      setLoading(true);
      const res = type === 'GIVEN'
        ? await bardanEntryApi.deleteEntry(id)
        : await jamaBardanEntryApi.deleteEntry(id);

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Transaction deleted successfully' });
        setDeleteModalOpen(false);
        setItemToDelete(null);
        loadData();
        if (formData.code) fetchBalance(formData.code);
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ type: 'error', text: res.data.error || 'Failed to delete transaction' });
      }
    } catch (error) {
      console.error('Delete transaction error:', error);
      setMessage({ type: 'error', text: 'Operational failure during deletion' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (item) => {
    if (!item?.id) {
      console.warn('⚠️ Missing transaction ID - Operation aborted');
      return;
    }
    try {
      setLoading(true);
      const res = item.type === 'GIVEN'
        ? await bardanEntryApi.getEntryById(item.id)
        : await jamaBardanEntryApi.getEntryById(item.id);

      if (res.data.success) {
        const entry = res.data.data;
        setFormData({
          id: entry.id,
          type: item.type,
          pavtiNo: entry.pavti_no,
          date: entry.entry_date ? new Date(entry.entry_date).toISOString().split('T')[0] : '',
          memNominal: entry.mem_nominal,
          code: entry.code,
          name: entry.name,
          qty: entry.qty,
          option: entry.option_type || 'Company',
          remark: entry.remark,
          dayQty: entry.day_qty,
          totalQty: entry.total_qty
        });
        setGridRows(entry.gridRows || Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
        setShowHistory(false);
        fetchBalance(entry.code);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load transaction details' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      type: 'GIVEN',
      pavtiNo: '',
      date: new Date().toISOString().split('T')[0],
      memNominal: '',
      code: '',
      name: '',
      qty: '',
      option: 'Company',
      remark: '',
      dayQty: '',
      totalQty: ''
    });
    setGridRows(Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
    setBalanceData({ taken: 0, returned: 0, balance: 0 });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800 select-none animate-none pb-12">
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1600px] mx-auto space-y-4">
        {showHistory ? (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col min-h-[500px] shadow-none select-none animate-none">
            {/* Header Section */}
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className={`text-sm font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                {t('bardanPortfolio.historyTitle')}
                <span className="bg-slate-200 text-slate-600 font-bold force-en text-[12px] px-1.5 py-0.5 rounded-sm ml-1.5">
                  {(formData.code ? ledgerData : history).length} {t('common.records')}
                </span>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <div className="h-7 flex items-center gap-1.5 px-2 bg-white border border-slate-200 rounded-md focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] w-full sm:w-48 transition">
                  <Search size={13} className="text-slate-400" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder={t("bardanPortfolio.searchLogs") || "Search logs..."}
                    className="bg-transparent border-none outline-none text-[12px] text-slate-700 placeholder:text-slate-400 w-full font-bold"
                  />
                </div>
                <button
                  onClick={handleHistoryPrint}
                  title={t('common.print') || "Print"}
                  className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
                >
                  <Printer size={13} className="text-slate-500" />
                </button>
                <button
                  onClick={handleHistoryExportPDF}
                  title={t('common.pdf') || "PDF"}
                  className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
                >
                  <FileText size={13} className="text-slate-500" />
                </button>
                <button
                  onClick={loadData}
                  title="Refresh"
                  className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
                >
                  <RefreshCcw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowHistory(false)}
                  title={t('bardanPortfolio.exitHistory') || "Close"}
                  className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#ef4444] hover:border-rose-200 transition rounded-md cursor-pointer shadow-sm"
                >
                  <X size={13} className="text-slate-500" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto bg-white">
              <table className="min-w-full divide-y divide-slate-100 select-none">
                <thead className="bg-slate-50 select-none">
                  <tr className="text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200 bg-slate-50/50">
                    <th className="px-4 py-2.5">{t('bardanPortfolio.table.date')}</th>
                    <th className="px-4 py-2.5">{t('bardanPortfolio.table.particulars')}</th>
                    <th className="px-4 py-2.5 text-right">{t('bardanPortfolio.table.debit')}</th>
                    <th className="px-4 py-2.5 text-right">{t('bardanPortfolio.table.credit')}</th>
                    <th className="px-4 py-2.5 text-right">{t('bardanPortfolio.table.balance')}</th>
                    <th className="px-4 py-2.5 text-right w-24">{t('bardanPortfolio.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100 text-sm select-none">
                  {(formData.code ? ledgerData : history).filter(row => {
                    const term = (historySearchQuery || '').toLowerCase();
                    const dateStr = (row.date || row.entry_date) ? new Date(row.date || row.entry_date).toLocaleDateString() : '—';
                    const partStr = row.particulars || row.name || (row.type === 'GIVEN' ? (t('bardanPortfolio.given') || 'આપેલ') : (t('bardanPortfolio.returned') || 'પરત'));
                    const pvtStr = row.pavti_no || '';
                    return dateStr.toLowerCase().includes(term) || partStr.toLowerCase().includes(term) || pvtStr.toLowerCase().includes(term);
                  }).map((row, i) => (
                    <tr key={row.id || i} className="hover:bg-slate-50/75 transition border-b border-slate-100">
                      <td className="px-4 py-2.5 font-bold force-en font-mono text-slate-700">
                        {(row.date || row.entry_date) ? new Date(row.date || row.entry_date).toLocaleDateString('en-GB').replace(/\//g, '-') : '—'}
                      </td>
                      <td className={`px-4 py-2.5 text-slate-800 ${i18n.language === 'gu' ? 'font-prompt-sm' : 'font-sans'}`}>
                        <span className={i18n.language === 'gu' ? 'font-extrabold' : 'font-bold'}>
                          {i18n.language === 'gu' ? formatBilingualText(row.particulars || row.name || (row.type === 'GIVEN' ? (t('bardanPortfolio.given') || 'આપેલ') : (t('bardanPortfolio.returned') || 'પરત'))) : (row.particulars || row.name || (row.type === 'GIVEN' ? (t('bardanPortfolio.given') || 'આપેલ') : (t('bardanPortfolio.returned') || 'પરત')))}
                        </span>
                        {row.pavti_no && <span className="block text-[10px] text-blue-600 mt-0.5 font-bold">{t('bardanEntry.pavti_no') || 'પાવતી'}: {formatBilingualText(row.pavti_no)}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-700 force-en font-mono">
                        {row.debit ?? (row.type === 'GIVEN' ? row.qty : 0)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-emerald-600 force-en font-mono">
                        {row.credit ?? (row.type === 'RETURNED' ? row.qty : 0)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-black text-slate-800 force-en font-mono">
                        {row.balance != null ? row.balance : 0}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1.5">
                          {!formData.code && (
                            <button
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  code: row.code,
                                  name: row.name
                                }));
                                fetchBalance(row.code);
                              }}
                              className="h-6 flex items-center gap-1 px-2 border border-slate-200 hover:bg-slate-50 text-[#1d5f84] hover:text-[#154662] transition rounded-md font-bold text-[12px] uppercase tracking-wide bg-white cursor-pointer select-none"
                              title="View Ledger"
                            >
                              <Eye size={12} />
                              <span>{t('bardanPortfolio.viewLedger') || 'View'}</span>
                            </button>
                          )}
                          {(row.type === 'GIVEN' || row.type === 'RETURNED') && row.id && row.id !== 'OP' && (
                            <>
                              <button
                                onClick={() => handleEdit(row)}
                                className="p-1 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-[#1d5f84] transition rounded cursor-pointer"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => confirmDelete(row)}
                                className="p-1 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-rose-600 transition rounded cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 select-none">
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg flex flex-col shadow-none overflow-hidden">
              {/* Form Section Header with Actions */}
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <span className={`text-sm font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                  {formData.id ? t('bardanPortfolio.form.updateNode') || 'Update Bardan Node' : t('bardanPortfolio.title')}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPriceModal(true)}
                    className="h-7 flex items-center gap-1.5 px-2.5 text-[12px] font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition rounded-md cursor-pointer select-none"
                  >
                    <Tag size={13} /> {t('bardanPortfolio.bardanRate')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHistory(true)}
                    className="h-7 flex items-center gap-1.5 px-2.5 text-[12px] font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition rounded-md cursor-pointer select-none"
                  >
                    <History size={13} /> {t('bardanPortfolio.history')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="h-7 flex items-center gap-1.5 px-2.5 text-[12px] font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition rounded-md cursor-pointer select-none"
                  >
                    <X size={13} /> {t('common.reset') || 'RESET'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={loading}
                    className="h-7 flex items-center gap-1.5 px-3.5 text-[12px] font-bold text-white bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] rounded-md transition shadow-none select-none cursor-pointer"
                  >
                    <Save size={13} />
                    {formData.id ? t('bardanPortfolio.form.updateNode') || 'Update' : t('bardanPortfolio.saveTransaction')}
                  </button>
                </div>
              </div>

              <div ref={entryFormRef} onKeyDown={handleEnterFieldNavigation} className="p-5 flex flex-col gap-5">
                {/* Ledger Type Toggler */}
                <div className="flex p-0.5 bg-slate-100 border border-slate-200 rounded-md gap-0.5 max-w-md select-none">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'GIVEN' })}
                    disabled={!!formData.id}
                    className={`flex-1 py-1.5 rounded transition cursor-pointer flex items-center justify-center gap-1.5 font-bold text-sm uppercase tracking-wider select-none ${formData.type === 'GIVEN'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-400 hover:text-slate-600'
                      } ${formData.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <TrendingUp size={14} className={formData.type === 'GIVEN' ? "text-[#1d5f84]" : ""} />
                    {t('bardanPortfolio.giveBags')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'RETURNED' })}
                    disabled={!!formData.id}
                    className={`flex-1 py-1.5 rounded transition cursor-pointer flex items-center justify-center gap-1.5 font-bold text-sm uppercase tracking-wider select-none ${formData.type === 'RETURNED'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-400 hover:text-slate-600'
                      } ${formData.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <TrendingDown size={14} className={formData.type === 'RETURNED' ? "text-emerald-600" : ""} />
                    {t('bardanPortfolio.returnBags')}
                  </button>
                </div>

                {/* Form Grid Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('bardanEntry.pavti_no')}</label>
                    <input
                      name="pavtiNo"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md outline-none transition font-bold text-sm force-en text-slate-700"
                      placeholder={t("bardanEntry.enterPavtiNo")}
                      value={formData.pavtiNo}
                      onChange={handleChange}
                      onBlur={() => fetchByPavti(formData.pavtiNo)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('bardanEntry.date')}</label>
                    <input
                      type="date"
                      name="date"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md outline-none transition font-bold text-sm force-en text-slate-700 font-mono"
                      value={formData.date}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 relative member-select-container">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('bardanPortfolio.memberCode')}</label>
                    <input
                      type="text"
                      name="code"
                      translate="no"
                      lang="en"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md outline-none transition font-bold text-sm force-en notranslate text-slate-700 font-mono"
                      placeholder={t("bardanEntry.code")}
                      value={formData.code}
                      autoComplete="off"
                      onFocus={() => setDropdowns(prev => ({ ...prev, code: true }))}
                      onChange={handleChange}
                    />
                    <div className="mt-1 text-[10px] text-slate-400 font-bold select-none force-en">{formData.code}</div>
                    {dropdowns.code && (
                      <div className="absolute z-[100] w-full top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-[250px] overflow-y-auto divide-y divide-slate-100">
                        {members
                          .filter(m => String(m.member_code).toLowerCase().includes(String(formData.code).toLowerCase()))
                          .slice(0, 50)
                          .map(m => (
                            <div
                              key={m.id}
                              onClick={() => selectMember(m)}
                              className="px-3.5 py-2 hover:bg-slate-50 cursor-pointer text-sm transition flex flex-col justify-center"
                            >
                              <div className="flex justify-between items-center select-none">
                                <span className="font-bold text-slate-800 force-en font-mono">{m.member_code}</span>
                              </div>
                              <p className={`text-[10px] text-slate-500 mt-0.5 tracking-tight ${isGu ? 'font-prompt-sm' : 'font-bold'}`} style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}>{formatBilingualText(displayMemberName(m))}</p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 relative member-select-container">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('bardanPortfolio.memberName')}</label>
                    <input
                      type="text"
                      name="name"
                      lang={isGu ? 'gu' : 'en'}
                      className={`w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md outline-none transition text-sm text-slate-700 font-bold ${isGu ? 'font-prompt-sm' : 'font-sans uppercase'}`}
                      style={isGu ? { fontFamily: "'Prompt', sans-serif" } : {}}
                      placeholder={t("bardanEntry.name")}
                      value={formData.name}
                      autoComplete="off"
                      onFocus={() => setDropdowns(prev => ({ ...prev, name: true }))}
                      onChange={handleChange}
                    />
                    {dropdowns.name && (
                      <div className="absolute z-[100] w-full top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-[250px] overflow-y-auto divide-y divide-slate-100">
                        {members
                          .filter(m => {
                            const term = String(formData.name || '').toLowerCase();
                            return (
                              String(displayMemberName(m) || '').toLowerCase().includes(term) ||
                              String(m.member_name || '').toLowerCase().includes(term) ||
                              String(m.member_name_gu || '').toLowerCase().includes(term) ||
                              String(m.eng_name || '').toLowerCase().includes(term)
                            );
                          })
                          .slice(0, 50)
                          .map(m => (
                            <div
                              key={m.id}
                              onClick={() => selectMember(m)}
                              className="px-3.5 py-2 hover:bg-slate-50 cursor-pointer text-sm transition flex flex-col justify-center"
                            >
                              <div className="flex justify-between items-center select-none">
                                <span className={`text-slate-800 ${isGu ? 'font-prompt-sm font-extrabold' : 'font-bold'}`} style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}>{formatBilingualText(displayMemberName(m))}</span>
                                <span className="text-[10px] font-extrabold text-slate-400 font-mono uppercase">{m.member_code}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
                  <div className="flex flex-col gap-1.5 relative">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('bardanPortfolio.labels.bagsCount')}</label>
                    <div className="relative">
                      <input
                        type="number"
                        name="qty"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md outline-none transition font-bold text-sm force-en text-slate-700 font-mono pr-28 placeholder:text-slate-400"
                        placeholder={isGu ? '૦.૦૦' : '0.00'}
                        value={formData.qty}
                        onChange={handleChange}
                      />
                      {formData.type === 'RETURNED' && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-50 border border-slate-200 rounded px-2 py-0.5 select-none flex items-center gap-1 h-6">
                          <span className="text-slate-400 text-[12px] font-bold uppercase tracking-widest leading-none">{t('bardanPortfolio.table.balance')}: </span>
                          <span className="text-[#1d5f84] force-en font-black text-sm leading-none font-mono">{balanceData.balance || 0}</span>
                        </div>
                      )}
                    </div>
                    {formData.type === 'RETURNED' && (
                      <div className="text-[10px] font-bold text-[#1d5f84] force-en mt-1">
                        Remaining Bardan Qty: {parseFloat(balanceData.balance || 0).toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('bardanEntry.mem_nominal')}</label>
                    <div className="flex items-center gap-3 bg-slate-50 p-2 border border-slate-200 rounded-md select-none h-[31px]">
                      <input
                        type="checkbox"
                        id="memNominalCheck"
                        className="w-4 h-4 rounded text-[#1d5f84] border-slate-300 focus:ring-[#1d5f84] transition-all cursor-pointer"
                        checked={formData.memNominal === 'Member'}
                        onChange={(e) => setFormData({ ...formData, memNominal: e.target.checked ? 'Member' : 'Nominal' })}
                      />
                      <label htmlFor="memNominalCheck" className="text-sm font-extrabold uppercase tracking-wider text-slate-600 cursor-pointer select-none">
                        {formData.memNominal === 'Member' ? t('bardanPortfolio.labels.sabhasadActive') : t('bardanPortfolio.labels.nominalMember')}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 select-none">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('bardanEntry.remark')}</label>
                  <textarea
                    name="remark"
                    className={`w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md outline-none transition text-sm text-slate-700 min-h-[80px] placeholder:text-slate-400 ${isGu ? 'font-prompt' : 'font-bold uppercase'}`}
                    placeholder={isGu ? 'ટિપ્પણી આધાર કરો...' : 'ENTER REMARK...'}
                    value={formData.remark}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Side Panels - Metric Insights & Grid Matrix */}
            <div className="lg:col-span-4 space-y-4 select-none">
              <div className="bg-white p-4 border border-slate-200 rounded-lg flex flex-col shadow-none space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-md">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={15} className="text-[#1d5f84]" />
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{t('bardanPortfolio.labels.totalTaken')}</p>
                  </div>
                  <p className="text-sm font-black text-slate-800 leading-none force-en font-mono">{((balanceData.opening || 0) + (balanceData.taken || 0)).toFixed(2)}</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-md">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={15} className="text-emerald-600" />
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{t('bardanPortfolio.labels.totalReturned')}</p>
                  </div>
                  <p className="text-sm font-black text-slate-800 leading-none force-en font-mono">{balanceData.returned}</p>
                </div>

                <div className="p-3 bg-slate-50/75 border border-slate-100 rounded-md flex justify-between items-center">
                  <div className="flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">{t('bardanPortfolio.labels.closingBalance')}</span>
                    <span className="text-base font-black text-slate-800 mt-1 leading-none force-en font-mono">{balanceData.balance}</span>
                  </div>
                  {bardanPrice > 0 && (
                    <div className="text-right flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">Valuation</span>
                      <span className="text-sm font-black text-[#1d5f84] mt-1 leading-none force-en font-mono">₹{(balanceData.balance * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg flex flex-col shadow-none overflow-hidden select-none">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between select-none">
                  <span className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">{t('bardanEntry.multiVectorMatrix')}</span>
                </div>

                <div className="p-4 space-y-4">
                  {formData.type === 'RETURNED' && (
                    <div className="flex flex-col gap-1.5 select-none">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('bardanEntry.option')}</label>
                      <select
                        name="option"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-sm select-none rounded-md text-slate-700 cursor-pointer"
                        value={formData.option}
                        onChange={handleChange}
                      >
                        <option value="Company">{t('bardanPortfolio.labels.companyBags')}</option>
                        <option value="Self">{t('bardanPortfolio.labels.personalBags')}</option>
                      </select>
                    </div>
                  )}

                  <div className="flex flex-col gap-1 select-none">
                    <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-md">
                      <table className="w-full text-sm select-none">
                        <thead className="bg-slate-50 select-none sticky top-0 z-10">
                          <tr className="text-[12px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 select-none">
                            <th className="py-2 text-center w-8">#</th>
                            <th className="py-2 px-1 text-center">POS 1</th>
                            <th className="py-2 px-1 text-center">POS 2</th>
                            <th className="py-2 px-1 text-center">POS 3</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {gridRows.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition select-none">
                              <td className="text-center font-bold text-slate-300 text-[10px] select-none force-en font-mono">{i + 1}</td>
                              <td className="px-1 py-1">
                                <input
                                  className="w-full bg-white border border-slate-200 focus:border-[#1d5f84] hover:border-slate-300 rounded px-2 py-1 font-bold text-slate-700 outline-none transition text-center force-en font-mono text-sm focus:ring-1 focus:ring-[#1d5f84]"
                                  value={row.col1}
                                  onChange={(e) => {
                                    const r = [...gridRows]; r[i].col1 = e.target.value; setGridRows(r);
                                  }}
                                />
                              </td>
                              <td className="px-1 py-1">
                                <input
                                  className="w-full bg-white border border-slate-200 focus:border-[#1d5f84] hover:border-slate-300 rounded px-2 py-1 font-bold text-slate-700 outline-none transition text-center force-en font-mono text-sm focus:ring-1 focus:ring-[#1d5f84]"
                                  value={row.col2}
                                  onChange={(e) => {
                                    const r = [...gridRows]; r[i].col2 = e.target.value; setGridRows(r);
                                  }}
                                />
                              </td>
                              <td className="px-1 py-1">
                                <input
                                  className="w-full bg-white border border-slate-200 focus:border-[#1d5f84] hover:border-slate-300 rounded px-2 py-1 font-bold text-slate-700 outline-none transition text-center force-en font-mono text-sm focus:ring-1 focus:ring-[#1d5f84]"
                                  value={row.col3}
                                  onChange={(e) => {
                                    const r = [...gridRows]; r[i].col3 = e.target.value; setGridRows(r);
                                  }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50/50 select-none">
                  <div className="flex justify-between items-center text-slate-600">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{t('bardanPortfolio.labels.totalVolume')}</p>
                    <p className="text-base font-black tracking-tight text-[#1d5f84] leading-none force-en font-mono">{parseFloat(formData.qty || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bardan Rate Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white border border-slate-200 rounded-lg p-5 w-full max-w-md flex flex-col shadow-none select-none animate-none">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4 select-none">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-[#1d5f84]" />
                <div>
                  <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">{t('bardanPortfolio.rateModal.title')}</h2>
                  <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{t('bardanPortfolio.rateModal.subtitle')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPriceModal(false)}
                className="p-1 border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition rounded-md cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-4 select-none">
              <div className="p-3 bg-slate-50/75 border border-slate-100 rounded-md flex justify-between items-center">
                <div className="flex items-center gap-1.5 leading-none">
                  <Database size={13} className="text-slate-400" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">{t('bardanPortfolio.rateModal.activeRate')}</p>
                </div>
                <p className="text-sm font-black text-slate-800 leading-none force-en font-mono">₹{parseFloat(bardanPrice || 0).toFixed(2)}</p>
              </div>

              <div className="flex flex-col gap-1 select-none">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-relaxed">{t('bardanPortfolio.rateModal.valuationLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md font-bold text-slate-700 text-sm outline-none transition force-en font-mono placeholder:text-slate-400"
                  placeholder={isGu ? '૦.૦૦' : '0.00'}
                  value={priceForm.price_per_bardan}
                  onChange={(e) => setPriceForm({ ...priceForm, price_per_bardan: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveBardanPrice();
                  }}
                />
                <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider leading-relaxed select-none">
                  {t('bardanPortfolio.rateModal.valuationNote')}
                </p>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowPriceModal(false)}
                  className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[12px] font-bold select-none transition rounded-md cursor-pointer flex items-center justify-center"
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  onClick={saveBardanPrice}
                  className="flex-[2] py-1.5 bg-[#1d5f84] hover:bg-[#154662] text-white border border-[#1d5f84] text-[12px] font-bold select-none transition rounded-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save size={13} />
                  <span>{t('bardanPortfolio.rateModal.updateRate')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title={t('bardanPortfolio.deleteConfirmTitle')}
        message={
          itemToDelete?.type === 'GIVEN'
            ? `${t('bardanPortfolio.deleteConfirmMessageGiven')} ${itemToDelete?.pavti_no ? `(Pavti: ${itemToDelete.pavti_no})` : ''}`
            : `${t('bardanPortfolio.deleteConfirmMessageReturned')} ${itemToDelete?.pavti_no ? `(Pavti: ${itemToDelete.pavti_no})` : ''}`
        }
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
      />
    </div>
  );
};

export default BardanPortfolio;
