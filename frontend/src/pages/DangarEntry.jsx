import React, { useState, useEffect, useRef } from 'react';
import {
  Database, Plus, Trash2, Printer,
  Save, Search, X, RefreshCcw,
  Calendar, Info, AlertCircle, FileText,
  User, Box, Calculator, Truck,
  CheckCircle, History, Edit3, ChevronRight, Eye,
  TrendingDown, CreditCard, TrendingUp
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import api, { sabhasadMasterApi, dangarEntryApi, bardanEntryApi } from '../api';
import Toast from '../components/Toast';

const DangarEntry = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    bookType: 'Dangar',
    srNo: 'AUTO',
    date: new Date().toISOString().split('T')[0],
    member_id: '',
    item_id: '',
    remark: '',
    vehicleNo: '',
    total_kg: 0,
    bardan: 0,
    gun: 0,
    gross_quintal: 0,
    less_bardan: 0,
    net_quintal: 0,
    total_man: 0,
    rate: 0,
    bardan_rate: 0,
    amount: 0,
    active_bardan_price: 0,
    returned_bags: 0,
    quality_class: '1st',
    season: new Date().getMonth() >= 3 && new Date().getMonth() <= 8 ? 'summer' : 'winter'
  });

  const [weightRows, setWeightRows] = useState([{ id: 1, wgt: '' }]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [members, setMembers] = useState([]);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    fromMember: '',
    toMember: ''
  });
  const [company, setCompany] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [bardanBalance, setBardanBalance] = useState(0);
  const [bardanPrice, setBardanPrice] = useState(0);
  const [seasons, setSeasons] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [display_unit, setDisplayUnit] = useState('quintal'); // kg, man, quintal

  const [deductions, setDeductions] = useState([]);
  const [deductionMasters, setDeductionMasters] = useState([]);

  // Focus Refs for Keyboard Navigation
  const bookTypeRef = useRef(null);
  const dateRef = useRef(null);
  const memberCodeRef = useRef(null);
  const memberIdRef = useRef(null);
  const qualityClassRef = useRef(null);
  const itemCodeRef = useRef(null);
  const itemIdRef = useRef(null);
  const vehicleNoRef = useRef(null);
  const remarkRef = useRef(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleMemberChange = async (mid) => {
    try {
      const member = members.find(m => m.id === parseInt(mid));
      if (!member) {
        setSelectedMember(null);
        setFormData(prev => ({ ...prev, member_id: '' }));
        return;
      }

      setSelectedMember(member);
      setFormData(prev => ({ ...prev, member_id: mid }));

      try {
        const bardanRes = await bardanEntryApi.getBalance(member.member_code);
        if (bardanRes.data.success) {
          const bal = bardanRes.data.data?.balance || 0;
          setBardanBalance(bal);
          setFormData(prev => ({ ...prev, bardan: bal }));
        } else {
          setBardanBalance(0);
          setFormData(prev => ({ ...prev, bardan: 0 }));
        }
      } catch (err) {
        console.error('Bardan balance fetch failed:', err);
        setBardanBalance(0);
        setFormData(prev => ({ ...prev, bardan: 0 }));
      }

      setLoading(true);
      const updatedDeds = await Promise.all(deductionMasters
        .filter(dm => dm.auto_apply || dm.is_active)
        .map(async (dm) => {
          let balance = 0;
          if (dm.ledger_account_id) {
            try {
              const balRes = await sabhasadMasterApi.getMemberBalance(dm.ledger_account_id, mid);
              if (balRes.data.success) balance = balRes.data.balance;
            } catch (err) { console.error(`Balance fetch failed for ${dm.name}:`, err); }
          }
          return {
            deduction_id: dm.id,
            name: dm.name,
            type: dm.type,
            value: dm.default_value,
            balance: balance,
            calculated_amount: 0
          };
        })
      );
      setDeductions(updatedDeds.filter(d => deductionMasters.find(dm => dm.id === d.deduction_id && dm.auto_apply)));
    } catch (e) {
      console.error('Member change error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMemberCodeChange = (code) => {
    const member = members.find(m => String(m.member_code) === String(code));
    if (member) {
      handleMemberChange(member.id);
    } else {
      setSelectedMember(null);
      setFormData(prev => ({ ...prev, member_id: '' }));
    }
  };

  const handleItemCodeChange = (code) => {
    const item = items.find(i => String(i.item_code) === String(code));
    if (item) {
      setFormData(prev => ({ ...prev, item_id: item.id }));
    } else {
      setFormData(prev => ({ ...prev, item_id: '' }));
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [membersRes, itemsRes, companyRes] = await Promise.all([
        sabhasadMasterApi.getAllSabhasad(),
        api.get('/items'),
        api.get('/company')
      ]);

      if (membersRes.data.success) setMembers(membersRes.data.data);
      if (itemsRes.data.success) setItems(itemsRes.data.data);
      if (companyRes.data.success) {
        setCompany(companyRes.data.data);
        const dedRes = await api.get(`/deductions/company/${companyRes.data.data.id}`);
        if (dedRes.data.success) {
          setDeductionMasters(dedRes.data.data);
          const autoDeds = dedRes.data.data
            .filter(dm => dm.auto_apply)
            .map(dm => ({
              deduction_id: dm.id,
              name: dm.name,
              type: dm.type,
              value: dm.default_value,
              calculated_amount: 0
            }));
          setDeductions(autoDeds);
        }
      }

      const bpRes = await api.get('/bardan-price');
      if (bpRes.data.success) {
        setBardanPrice(parseFloat(bpRes.data.data?.price_per_bardan || 0));
      }

      const compId = companyRes.data.data.id;
      const seasonsRes = await api.get(`/seasons/company/${compId}`);
      if (seasonsRes.data.success && seasonsRes.data.data.length > 0) {
        const latest = seasonsRes.data.data[0];
        setSeasons(seasonsRes.data.data);
        setCurrentSeason(latest);
        if (!id) {
          setFormData(prev => ({
            ...prev,
            season: latest.season_type.toLowerCase()
          }));
        }
      }

      if (id) {
        const entryRes = await dangarEntryApi.getById(id);
        if (entryRes.data.success) {
          const entry = entryRes.data.data;
          setFormData({
            bookType: entry.book_type,
            srNo: entry.sr_no,
            date: new Date(entry.entry_date).toISOString().split('T')[0],
            member_id: entry.member_id,
            item_id: entry.item_id,
            remark: entry.remark,
            vehicleNo: entry.vehicle_no || '',
            total_kg: entry.total_kg,
            bardan: entry.bardan,
            gun: entry.gun,
            gross_quintal: entry.gross_quintal,
            less_bardan: entry.less_bardan,
            net_quintal: entry.net_quintal,
            rate: entry.rate,
            amount: entry.amount,
            quality_class: entry.quality_class || '1st',
            season: entry.season || 'winter'
          });

          if (entry.weights && entry.weights.length > 0) {
            setWeightRows(entry.weights.map(w => ({ id: w.id, wgt: w.weight })));
          }

          const member = (membersRes.data.data || []).find(m => m.id === entry.member_id);
          if (member) {
            setSelectedMember(member);
            const bardanRes = await bardanEntryApi.getBalance(member.member_code);
            if (bardanRes.data.success) {
              setBardanBalance(bardanRes.data.data?.balance || 0);
            }
          }
        }
      }

    } catch (error) {
      console.error('Failed to load initial data:', error);
      setMessage({ type: 'error', text: 'Infrastructure synchronization failure' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bagCountFromWeights = weightRows.length;
    let totalKG = weightRows.reduce((acc, row) => acc + (parseFloat(row.wgt) || 0), 0);

    const totalMan = totalKG / 20;
    const grossQuintal = totalKG / 100;

    const gunWeight = parseFloat(formData.gun) || 0;
    const totalBardanDeductionKG = (parseFloat(bagCountFromWeights) || 0) * gunWeight;

    const netKG = Math.max(0, totalKG - totalBardanDeductionKG);
    const netQuintal = netKG / 100;

    const grossAmount = netQuintal * (parseFloat(formData.rate) || 0);

    let totalKapatDeduction = 0;
    const updatedDeductions = deductions.map(d => {
      let calcAmt = 0;
      if (d.type === 'fixed') calcAmt = parseFloat(d.value) || 0;
      else if (d.type === 'per_unit') calcAmt = netQuintal * (parseFloat(d.value) || 0);
      else if (d.type === 'percentage') calcAmt = (grossAmount * (parseFloat(d.value) || 0)) / 100;

      totalKapatDeduction += calcAmt;
      return { ...d, calculated_amount: calcAmt.toFixed(2) };
    });

    const remainingBardan = Math.max(0, bardanBalance - bagCountFromWeights);
    const activePrice = parseFloat(formData.active_bardan_price) || bardanPrice;
    const bardanPenaltyAmount = remainingBardan * activePrice;

    const netPayable = grossAmount - totalKapatDeduction;

    setFormData(prev => ({
      ...prev,
      total_kg: totalKG.toFixed(2),
      total_man: totalMan.toFixed(2),
      gross_quintal: grossQuintal.toFixed(2),
      less_bardan: totalBardanDeductionKG.toFixed(2),
      net_quintal: netQuintal.toFixed(2),
      amount: netPayable.toFixed(2),
      gross_amount: grossAmount.toFixed(2),
      total_deduction: totalKapatDeduction.toFixed(2),
      remaining_bardan_deduction: bardanPenaltyAmount.toFixed(2),
      remaining_bardan_bags: remainingBardan,
      returned_bags: bagCountFromWeights,
      bardan: remainingBardan,
      active_bardan_price: activePrice,
      weight_unit: 'kg'
    }));
  }, [weightRows, formData.bardan, formData.gun, formData.rate, formData.active_bardan_price, deductions, bardanBalance, bardanPrice]);

  useEffect(() => {
    if (formData.item_id && company) {
      const fetchItemRate = async () => {
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const year = user.financial_year || '2026-27';
          const res = await api.get(`/dangar-rates/item/${formData.item_id}?year=${year}`);
          if (res.data.success && res.data.data) {
            const data = res.data.data;
            let selectedRate = data.rate;
            if (formData.quality_class === '2nd') selectedRate = data.winter_rate || data.rate;
            else if (formData.quality_class === '3rd') selectedRate = data.summer_rate || data.rate;

            setFormData(prev => ({
              ...prev,
              rate: selectedRate
            }));
          } else {
            setFormData(prev => ({ ...prev, rate: 0, bardan_rate: 0 }));
          }
        } catch (err) {
          console.error('Fetch rate error:', err);
        }
      };
      fetchItemRate();
    }
  }, [formData.item_id, formData.quality_class, company]);

  const addGujaratiFont = async (doc) => {
    try {
      const res = await fetch('/fonts/NotoSansGujarati-Regular.ttf');
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          doc.addFileToVFS('NotoSansGujarati.ttf', base64);
          doc.addFont('NotoSansGujarati.ttf', 'NotoGujarati', 'normal');
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (e) { console.warn('Gujarati font load failed', e); }
  };

  const handleExportSlipPDF = async () => {
    const cName = company ? (company.company_name || 'Company') : 'Company';
    if (!formData.member_id || !formData.item_id) {
      alert('Please fill in the member and item first.');
      return;
    }
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    await addGujaratiFont(doc);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 40;
    const navy = [15,23,42], white = [255,255,255], gray = [100,116,139], dark = [30,41,59];

    doc.setFillColor(...navy); doc.rect(0,0,W,30,'F');
    doc.setFont('NotoGujarati','normal'); doc.setFontSize(9); doc.setTextColor(...white);
    doc.text(cName.toUpperCase(), M, 20);
    doc.setFontSize(7.5); doc.setTextColor(148,163,184);
    doc.text('DANGAR ENTRY SLIP', W/2, 20, {align:'center'});
    doc.setFontSize(7); doc.setTextColor(239,68,68);
    doc.text('CONFIDENTIAL', W-M, 20, {align:'right'});

    let y = 50;
    doc.setFont('NotoGujarati','normal'); doc.setFontSize(16); doc.setTextColor(...navy);
    doc.text('Dangar Entry Slip', M, y);
    doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text('SR: ' + (formData.srNo === 'AUTO' ? 'Auto-Generate' : '#' + formData.srNo) + '   |   Date: ' + new Date(formData.date).toLocaleDateString('en-GB') + '   |   Generated: ' + new Date().toLocaleString('en-IN'), M, y+14);
    doc.setDrawColor(226,232,240); doc.setLineWidth(0.5); doc.line(M, y+20, W-M, y+20);
    y += 32;

    const member = members.find(m => m.id === parseInt(formData.member_id));
    const item = items.find(i => i.id === parseInt(formData.item_id));

    autoTable(doc, {
      startY: y,
      head: [['Field','Details','Field','Details']],
      body: [
        ['Member', member ? member.member_name + ' [' + member.member_code + ']' : '-', 'Item', item ? item.item_name : '-'],
        ['Book Type', formData.bookType, 'Quality Class', formData.quality_class + ' Class'],
        ['Vehicle No', formData.vehicleNo || '-', 'Season', (formData.season||'').toUpperCase()],
        ['Remark', formData.remark || '-', 'Date', new Date(formData.date).toLocaleDateString('en-GB')]
      ],
      styles: { font:'helvetica', fontSize:8, cellPadding:[5,8], textColor:dark, lineColor:[226,232,240], lineWidth:0.3 },
      headStyles: { font:'helvetica', fillColor:navy, textColor:white },
      alternateRowStyles: { fillColor:[248,250,252] },
      theme: 'grid', margin: { left:M, right:M }
    });

    y = doc.lastAutoTable.finalY + 16;

    autoTable(doc, {
      startY: y,
      head: [['Measurement','Value']],
      body: [
        ['Total Gross KG', parseFloat(formData.total_kg||0).toFixed(2) + ' kg'],
        ['Bardan Bags', formData.returned_bags || 0],
        ['Gun Weight Deduction', parseFloat(formData.less_bardan||0).toFixed(2) + ' kg'],
        ['Net Quintal', parseFloat(formData.net_quintal||0).toFixed(2) + ' Qt'],
        ['Rate per Quintal', parseFloat(formData.rate||0).toFixed(2)],
        ['Gross Amount', parseFloat(formData.gross_amount||0).toLocaleString('en-IN', {minimumFractionDigits:2})],
        ['Total Deduction (Kapat)', '- ' + parseFloat(formData.total_deduction||0).toLocaleString('en-IN', {minimumFractionDigits:2})],
        ['NET PAYABLE', parseFloat(formData.amount||0).toLocaleString('en-IN', {minimumFractionDigits:2})]
      ],
      styles: { font:'helvetica', fontSize:8, cellPadding:[5,8], textColor:dark, lineColor:[226,232,240], lineWidth:0.3 },
      headStyles: { font:'helvetica', fillColor:navy, textColor:white },
      alternateRowStyles: { fillColor:[248,250,252] },
      didParseCell: (data) => {
        if (data.row.index === 7) {
          data.cell.styles.fillColor = navy;
          data.cell.styles.textColor = white;
        }
      },
      theme: 'grid', columnStyles: { 0: { cellWidth: 200 } },
      margin: { left:M, right:M }
    });

    const totPg = doc.internal.getNumberOfPages();
    for (let i=1; i<=totPg; i++) {
      doc.setPage(i);
      doc.setDrawColor(226,232,240); doc.setLineWidth(0.4);
      doc.line(M, H-18, W-M, H-18);
      doc.setFont('NotoGujarati','normal'); doc.setFontSize(7); doc.setTextColor(...gray);
      doc.text(cName + ' - Dangar Entry', M, H-9);
      doc.text('Page ' + i + ' of ' + totPg, W-M, H-9, {align:'right'});
    }

    doc.save('Dangar_Slip_' + (formData.srNo !== 'AUTO' ? formData.srNo + '_' : '') + new Date().toISOString().split('T')[0] + '.pdf');
  };

  const handleAddRow = () => {
    setWeightRows([...weightRows, { id: Date.now(), wgt: '' }]);
  };

  const handleRemoveRow = (id) => {
    if (weightRows.length > 1) {
      setWeightRows(weightRows.filter(row => row.id !== id));
    }
  };

  const handleWeightChange = (id, value) => {
    setWeightRows(weightRows.map(row =>
      row.id === id ? { ...row, wgt: value } : row
    ));
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.bookType || !formData.member_id || !formData.item_id) {
      setMessage({ type: 'error', text: 'Validation Error: Required nodes missing' });
      return;
    }

    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const payload = {
        ...formData,
        company_id: company?.id,
        financial_year: user.financial_year || '2026-27',
        entry_date: formData.date,
        created_by: user.id || 1,
        weights: weightRows,
        deductions: deductions,
        weight_unit: 'kg'
      };

      const res = id 
        ? await dangarEntryApi.update(id, payload)
        : await dangarEntryApi.create(payload);

      if (res.data.success) {
        setMessage({ type: 'success', text: id ? 'Transaction node updated successfully' : `Transaction committed. Node SR: ${res.data.data.srNo}` });
        if (!id) resetForm();
        setTimeout(() => {
          setMessage(null);
          if (id) navigate('/dangar-master');
        }, 2000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Operational failure during commit: ' + (error.response?.data?.error || error.message) });
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setShowHistory(true);
      setLoading(true);
      const res = await dangarEntryApi.getAll(company?.id);
      if (res.data.success) setHistory(res.data.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to retrieve history logs' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Decommission this transaction node?')) return;
    try {
      await dangarEntryApi.delete(id);
      setMessage({ type: 'success', text: 'Node decommissioned successfully' });
      if (showHistory) loadHistory();
    } catch (error) {
      setMessage({ type: 'error', text: 'Decommission failed' });
    }
  };

  const resetForm = () => {
    setFormData(prev => ({
      ...prev,
      srNo: 'AUTO',
      member_id: '',
      item_id: '',
      remark: '',
      vehicleNo: '',
      total_kg: 0,
      bardan: 0,
      gross_quintal: 0,
      less_bardan: 0,
      net_quintal: 0,
      amount: 0,
      total_man: 0,
      gross_amount: 0,
      total_deduction: 0,
      remaining_bardan_deduction: 0,
      remaining_bardan_bags: 0,
      returned_bags: 0,
      bardan_rate: 0
    }));
    setWeightRows([{ id: Date.now(), wgt: '' }]);
    setSelectedMember(null);
    setBardanBalance(0);

    const autoDeds = deductionMasters
      .filter(dm => dm.auto_apply)
      .map(dm => ({
        deduction_id: dm.id,
        name: dm.name,
        type: dm.type,
        value: dm.default_value,
        calculated_amount: 0
      }));
    setDeductions(autoDeds);
  };

  const handleHistoryPrint = () => {
    const cName = company?.company_name || 'Company';
    const filteredHistory = history.filter(row => {
      const rowDate = new Date(row.entry_date).toISOString().split('T')[0];
      const matchesDate = (!historyFilters.startDate || rowDate >= historyFilters.startDate) &&
                         (!historyFilters.endDate || rowDate <= historyFilters.endDate);
      const memberCode = parseInt(row.member_code);
      const fromCode = parseInt(historyFilters.fromMember) || 0;
      const toCode = parseInt(historyFilters.toMember) || 999999;
      const matchesMember = (!historyFilters.fromMember || memberCode >= fromCode) &&
                           (!historyFilters.toMember || memberCode <= toCode);
      return matchesDate && matchesMember;
    });

    const totalQt = filteredHistory.reduce((s, r) => s + parseFloat(r.net_quintal || 0), 0);
    const rows = filteredHistory.map((row, i) => `
      <tr style="background:${i%2===0?'#fff':'#f1f5f9'}">
        <td>${new Date(row.entry_date).toLocaleDateString('en-GB')}</td>
        <td>#${row.sr_no}<br/><span style="font-size:9px;color:#94a3b8">${row.book_type}</span></td>
        <td><strong>${row.member_name}</strong><br/><span style="font-size:9px;color:#94a3b8">CODE: ${row.member_code}</span></td>
        <td>${row.item_name || '-'}</td>
        <td>${row.quality_class || '1st'}</td>
        <td>${row.vehicle_no || '-'}</td>
        <td style="text-align:right">${parseFloat(row.net_quintal||0).toFixed(2)} Qt</td>
      </tr>`);
    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.write(`<html><head><title>${cName} - Transaction History</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:10px;color:#1e293b;padding:20px}
        .logo-bar{background:#0f172a;color:#fff;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
        .logo-bar h1{font-size:13px;font-weight:900;text-transform:uppercase}.logo-bar span{font-size:9px;color:#94a3b8}
        h2{font-size:18px;font-weight:900;text-transform:uppercase;margin-bottom:2px}
        p.sub{font-size:9px;color:#64748b;margin-bottom:10px}
        hr{border:none;border-top:1px solid #e2e8f0;margin:8px 0}
        table{width:100%;border-collapse:collapse}
        thead tr{background:#0f172a;color:#fff}
        th{padding:7px 8px;font-size:9px;font-weight:700;text-transform:uppercase;text-align:left}
        td{padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:9px}
        tfoot tr{background:#1e293b;color:#fff;font-weight:700}
        @media print{@page{size:A4 portrait;margin:1.5cm}}
      </style></head><body>
      <div class='logo-bar'><h1>${cName}</h1><span>Dangar Transaction History &nbsp;|&nbsp; ${new Date().toLocaleDateString('en-IN')}</span></div>
      <h2>Transaction History</h2>
      <p class='sub'>Dangar &middot; Tuver &middot; Divela Manifest &nbsp;|&nbsp; Records: ${filteredHistory.length} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</p>
      ${historyFilters.startDate || historyFilters.fromMember ? `<p class='sub'>Filters: ${historyFilters.startDate||'--'} to ${historyFilters.endDate||'--'} | Member: ${historyFilters.fromMember||'--'} to ${historyFilters.toMember||'--'}</p>` : ''}
      <hr/>
      <table>
        <thead><tr><th>Date</th><th>Reference</th><th>Member</th><th>Item</th><th>Class</th><th>Vehicle</th><th style='text-align:right'>Net Quintal</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot><tr><td colspan='6'>TOTALS &mdash; ${filteredHistory.length} Records</td><td style='text-align:right'>${totalQt.toFixed(2)} Qt</td></tr></tfoot>
      </table></body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleHistoryExportPDF = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 32;
    const navy = [15,23,42], white = [255,255,255], gray = [100,116,139], dark = [30,41,59], stripe = [241,245,249];
    const cName = company?.company_name || 'Company';

    try {
      const res = await fetch('/fonts/NotoSansGujarati-Regular.ttf');
      const blob = await res.blob();
      await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          doc.addFileToVFS('NotoSansGujarati.ttf', reader.result.split(',')[1]);
          doc.addFont('NotoSansGujarati.ttf', 'NotoGujarati', 'normal');
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (e) { console.warn('Could not load font', e); }

    const hdr = () => {
       doc.setFillColor(...navy); doc.rect(0,0,W,26,'F');
       doc.setFont('NotoGujarati','normal'); doc.setFontSize(8.5); doc.setTextColor(...white);
       doc.text(cName.toUpperCase(), M, 17);
       doc.setFontSize(7); doc.setTextColor(148,163,184);
       doc.text('TRANSACTION HISTORY', W/2, 17, {align:'center'});
       doc.setFontSize(7); doc.setTextColor(239,68,68);
       doc.text('CONFIDENTIAL', W-M, 17, {align:'right'});
    };

    const ftr = (pg, tot) => {
       doc.setDrawColor(226,232,240); doc.setLineWidth(0.4); doc.line(M, H-18, W-M, H-18);
       doc.setFont('NotoGujarati','normal'); doc.setFontSize(7); doc.setTextColor(...gray);
       doc.text(cName + ' - Transaction History', M, H-9);
       doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W/2, H-9, {align:'center'});
       doc.text('Page ' + pg + ' of ' + tot, W-M, H-9, {align:'right'});
    };

    hdr();
    let y = 40;
    doc.setFont('NotoGujarati','normal'); doc.setFontSize(15); doc.setTextColor(...navy);
    doc.text('Dangar Transaction History', M, y);
    doc.setFontSize(7.5); doc.setTextColor(...gray);
    doc.text('Records: ' + history.length + '  |  Generated: ' + new Date().toLocaleString('en-IN'), M, y+13);
    doc.setDrawColor(226,232,240); doc.setLineWidth(0.4); doc.line(M, y+18, W-M, y+18);
    y += 28;

    const filteredHistory = history.filter(row => {
      const rowDate = new Date(row.entry_date).toISOString().split('T')[0];
      const matchesDate = (!historyFilters.startDate || rowDate >= historyFilters.startDate) &&
                         (!historyFilters.endDate || rowDate <= historyFilters.endDate);
      const memberCode = parseInt(row.member_code);
      const fromCode = parseInt(historyFilters.fromMember) || 0;
      const toCode = parseInt(historyFilters.toMember) || 999999;
      const matchesMember = (!historyFilters.fromMember || memberCode >= fromCode) &&
                           (!historyFilters.toMember || memberCode <= toCode);
      return matchesDate && matchesMember;
    });

    const totalQt = filteredHistory.reduce((s, r) => s + parseFloat(r.net_quintal || 0), 0);
    const bodyRows = filteredHistory.map(row => [
        new Date(row.entry_date).toLocaleDateString('en-GB'),
        '#' + row.sr_no + ' (' + row.book_type + ')',
        row.member_name,
        row.item_name || '-',
        row.quality_class || '1st',
        row.vehicle_no || '-',
        parseFloat(row.net_quintal||0).toFixed(2)
    ]);

    autoTable(doc, {
       startY: y,
       head: [['Date', 'Reference', 'Member', 'Item', 'Class', 'Vehicle', 'Net Quintal']],
       body: bodyRows,
       foot: [['', '', '', '', '', 'TOTAL', totalQt.toFixed(2)]],
       styles: { font: 'helvetica', fontSize:8, cellPadding:[4,5], textColor:dark, lineColor:[226,232,240], lineWidth:0.3 },
       headStyles: { font: 'helvetica', fillColor:navy, textColor:white, fontStyle: 'normal' },
       footStyles: { font: 'helvetica', fillColor:[30,41,59], textColor:white },
       alternateRowStyles: { fillColor:stripe },
       theme: 'grid',
       margin: { left:M, right:M }
    });

    const tot = doc.internal.getNumberOfPages();
    for (let i=1; i<=tot; i++) { doc.setPage(i); ftr(i,tot); }
    doc.save('Transaction_History.pdf');
  };

  const fieldRefs = [
    bookTypeRef,
    dateRef,
    memberCodeRef,
    memberIdRef,
    itemCodeRef,
    itemIdRef,
    vehicleNoRef,
    remarkRef
  ];

  const handleKeyDown = (e, currentRef) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = fieldRefs.findIndex(r => r === currentRef);
      if (currentIndex !== -1 && currentIndex < fieldRefs.length - 1) {
        fieldRefs[currentIndex + 1].current?.focus();
      } else {
        handleSave(e);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = fieldRefs.findIndex(r => r === currentRef);
      if (currentIndex > 0) {
        fieldRefs[currentIndex - 1].current?.focus();
      }
    }
  };

  const handleWeightKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (idx === weightRows.length - 1) {
        handleAddRow();
      } else {
        document.getElementById(`wgt-input-${idx + 1}`)?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      document.getElementById(`wgt-input-${idx + 1}`)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      document.getElementById(`wgt-input-${idx - 1}`)?.focus();
    }
  };
  
  const filteredHistory = history.filter(row => {
    const rowDate = new Date(row.entry_date).toISOString().split('T')[0];
    const matchesDate = (!historyFilters.startDate || rowDate >= historyFilters.startDate) &&
                       (!historyFilters.endDate || rowDate <= historyFilters.endDate);
    
    const memberCode = parseInt(row.member_code);
    const fromCode = parseInt(historyFilters.fromMember) || 0;
    const toCode = parseInt(historyFilters.toMember) || 999999;
    
    const matchesMember = (!historyFilters.fromMember || memberCode >= fromCode) &&
                         (!historyFilters.toMember || memberCode <= toCode);
    
    return matchesDate && matchesMember;
  });

  if (showHistory) {
    return (
      <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none animate-none">
        <Toast message={message} onClose={() => setMessage(null)} />
        <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
                <History size={20} className="text-zinc-600" />
                Transaction History
              </h1>
              <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">Reports / Operational Logs</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleHistoryExportPDF}
                className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
              >
                <FileText size={14} /> Export PDF
              </button>
              <button
                onClick={handleHistoryPrint}
                className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
              >
                <Printer size={14} /> Print
              </button>
              <button
                onClick={() => setShowHistory(false)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-3 py-1.5 select-none rounded-none transition"
              >
                <X size={14} /> Back to Entry
              </button>
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-300 p-4 flex flex-wrap items-center gap-4 select-none">
            <div className="flex items-center gap-2">
              <Calendar className="text-zinc-500" size={15} />
              <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase">Period Filter:</span>
            </div>
            <div className="flex items-center gap-1 border border-zinc-300 bg-white p-1">
              <input 
                type="date" 
                value={historyFilters.startDate} 
                onChange={e => setHistoryFilters(prev => ({ ...prev, startDate: e.target.value }))} 
                className="bg-transparent border-none outline-none text-[11px] font-bold text-zinc-700 uppercase font-mono" 
              />
              <span className="text-zinc-400 font-bold">/</span>
              <input 
                type="date" 
                value={historyFilters.endDate} 
                onChange={e => setHistoryFilters(prev => ({ ...prev, endDate: e.target.value }))} 
                className="bg-transparent border-none outline-none text-[11px] font-bold text-zinc-700 uppercase font-mono" 
              />
            </div>

            <div className="flex items-center gap-2 ml-4">
              <User className="text-zinc-500" size={15} />
              <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase">Member Range:</span>
            </div>
            <div className="flex items-center gap-1 border border-zinc-300 bg-white p-1">
              <input 
                type="text" 
                placeholder="From"
                value={historyFilters.fromMember} 
                onChange={e => setHistoryFilters(prev => ({ ...prev, fromMember: e.target.value }))} 
                className="w-16 bg-transparent border-none outline-none text-[11px] font-bold text-zinc-700 uppercase font-mono px-1" 
              />
              <span className="text-zinc-400 font-bold">to</span>
              <input 
                type="text" 
                placeholder="To"
                value={historyFilters.toMember} 
                onChange={e => setHistoryFilters(prev => ({ ...prev, toMember: e.target.value }))} 
                className="w-16 bg-transparent border-none outline-none text-[11px] font-bold text-zinc-700 uppercase font-mono px-1" 
              />
            </div>

            <button 
              onClick={() => setHistoryFilters({ startDate: '', endDate: '', fromMember: '', toMember: '' })} 
              className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold text-[10px] uppercase transition rounded-none ml-auto"
            >
              Clear Filters
            </button>
          </div>

          <div className="border border-zinc-300 bg-white">
            <table className="w-full text-left font-mono text-xs select-none border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">
                  <th className="px-4 py-3 border-r border-zinc-200">Date</th>
                  <th className="px-4 py-3 border-r border-zinc-200">Reference</th>
                  <th className="px-4 py-3 border-r border-zinc-200">Member</th>
                  <th className="px-4 py-3 border-r border-zinc-200 text-center">Class</th>
                  <th className="px-4 py-3 border-r border-zinc-200 text-right">Net Man</th>
                  <th className="px-4 py-3 border-r border-zinc-200 text-right">Net Quintal</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {filteredHistory.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-4 py-3 border-r border-zinc-200 font-bold">
                      {new Date(row.entry_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3 border-r border-zinc-200">
                      <span className="text-blue-600 font-bold">#{row.sr_no}</span>
                      <p className="text-[10px] text-zinc-400 uppercase font-bold mt-0.5">{row.book_type}</p>
                    </td>
                    <td className="px-4 py-3 border-r border-zinc-200">
                      <p className="font-sans font-bold tracking-tight text-zinc-800 uppercase italic leading-none">{row.member_name}</p>
                      <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold font-mono">CODE: {row.member_code}</p>
                    </td>
                    <td className="px-4 py-3 border-r border-zinc-200 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold border ${row.quality_class === '1st' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : row.quality_class === '2nd' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>
                        {row.quality_class || '1st'}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-amber-600">
                      {(parseFloat(row.net_quintal) * 5).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-zinc-800">
                      {row.net_quintal}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDelete(row.id)} className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-red-600 transition" title="Delete record"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              <Database size={20} className="text-zinc-600" />
              {id ? "Edit Transaction Node" : "Dangar Entry Registration"}
            </h1>
            <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">Registry Management / Dangar Operations</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadHistory}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
            >
              <History size={14} /> History
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none"
            >
              <X size={14} /> Reset
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1.5 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none"
            >
              {id ? <Edit3 size={15} /> : <Save size={15} />}
              {id ? 'UPDATE NODE' : 'COMMIT ENTRY'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Content Areas */}
          <div className="lg:col-span-8 bg-zinc-50 border border-zinc-300 p-5 flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Book Type</label>
                <select
                  ref={bookTypeRef}
                  value={formData.bookType}
                  onChange={(e) => setFormData({ ...formData, bookType: e.target.value })}
                  onKeyDown={(e) => handleKeyDown(e, bookTypeRef)}
                  className="w-full px-3 py-2 bg-white border border-zinc-300 outline-none text-xs text-zinc-800 font-bold focus:bg-white focus:border-zinc-600 transition"
                >
                  <option value="Tuver">TUVER</option>
                  <option value="Dangar">DANGAR</option>
                  <option value="Divela">DIVELA</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">SR Number</label>
                <div className="flex items-center h-[34px] px-3 bg-zinc-100 border border-zinc-300 font-mono text-xs select-none">
                  <span className={`font-bold tracking-widest ${formData.srNo === 'AUTO' ? 'text-zinc-400' : 'text-blue-600'}`}>
                    {formData.srNo === 'AUTO' ? 'Auto' : `#${formData.srNo}`}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Entry Date</label>
                <input
                  ref={dateRef}
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    const month = date.getMonth();
                    const newSeason = (month >= 3 && month <= 8) ? 'summer' : 'winter';
                    setFormData({ ...formData, date: e.target.value, season: newSeason });
                  }}
                  onKeyDown={(e) => handleKeyDown(e, dateRef)}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-300 outline-none text-xs text-zinc-800 font-mono focus:border-zinc-600 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Protocol Season</label>
                <div className="flex gap-1.5 p-1 bg-zinc-200 border border-zinc-300">
                  {['winter', 'summer'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, season: s }))}
                      className={`flex-1 py-1 text-[10px] font-bold uppercase transition ${formData.season === s
                        ? 'bg-white text-zinc-800 border border-zinc-300'
                        : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-8 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Member Node</label>
                <div className="flex gap-2">
                  <div className="w-1/4">
                    <input
                      ref={memberCodeRef}
                      type="text"
                      placeholder="Code"
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 outline-none text-xs font-mono font-bold text-zinc-700 uppercase focus:border-zinc-600"
                      value={selectedMember?.member_code || ''}
                      onChange={(e) => handleMemberCodeChange(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, memberCodeRef)}
                    />
                  </div>
                  <div className="w-3/4">
                    <select
                      ref={memberIdRef}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 outline-none text-xs text-zinc-800 focus:border-zinc-600 appearance-none font-bold italic"
                      value={formData.member_id}
                      onChange={(e) => handleMemberChange(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, memberIdRef)}
                    >
                      <option value="">Select Member...</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.member_code} - {m.member_name.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Quality Vector</label>
                <div className="flex gap-1 p-1 bg-zinc-200 border border-zinc-300">
                  {['1st', '2nd', '3rd'].map(q => (
                    <button
                      key={q}
                      ref={q === '1st' ? qualityClassRef : null}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, quality_class: q }))}
                      className={`flex-1 py-1 text-[10px] font-bold uppercase transition ${formData.quality_class === q
                        ? 'bg-white text-zinc-800 border border-zinc-300'
                        : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-8 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Item Structure Vector</label>
                <div className="flex gap-2">
                  <div className="w-1/4">
                    <input
                      ref={itemCodeRef}
                      type="text"
                      placeholder="Code"
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 outline-none text-xs font-mono font-bold text-zinc-700 uppercase focus:border-zinc-600"
                      value={items.find(i => i.id === parseInt(formData.item_id))?.item_code || ''}
                      onChange={(e) => handleItemCodeChange(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, itemCodeRef)}
                    />
                  </div>
                  <div className="w-3/4">
                    <select
                      ref={itemIdRef}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 outline-none text-xs text-zinc-800 focus:border-zinc-600 appearance-none font-bold"
                      value={formData.item_id}
                      onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, itemIdRef)}
                    >
                      <option value="">Select Resource Type...</option>
                      {items.map(i => (
                        <option key={i.id} value={i.id}>{i.item_code} - {i.item_name.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Vehicle No</label>
                <input
                  ref={vehicleNoRef}
                  type="text"
                  className="w-full px-3 py-1.5 bg-white border border-zinc-300 outline-none text-xs text-zinc-800 font-mono font-bold focus:border-zinc-600 transition"
                  placeholder="GJ-01-XX-1234"
                  value={formData.vehicleNo}
                  onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value.toUpperCase() })}
                  onKeyDown={(e) => handleKeyDown(e, vehicleNoRef)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Remark Context</label>
              <textarea
                ref={remarkRef}
                className="w-full px-3 py-1.5 bg-white border border-zinc-300 outline-none text-xs text-zinc-800 min-h-[70px] focus:border-zinc-600 transition"
                placeholder="ADDITIONAL TRANSACTION CONTEXT..."
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, remarkRef)}
              />
            </div>

            <div className="bg-zinc-100 border border-zinc-300 p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <select
                  className="bg-white border border-zinc-300 px-2 py-1 outline-none text-[10px] font-bold uppercase tracking-wider text-zinc-700"
                  value={display_unit}
                  onChange={(e) => setDisplayUnit(e.target.value)}
                >
                  <option value="kg">Per KG</option>
                  <option value="man">Per MAN (20kg)</option>
                  <option value="quintal">Per QUINTAL</option>
                </select>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Node Calculation Metric</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold font-mono">
                <span className="text-zinc-500">Volume:</span>
                <span className="text-zinc-800">{display_unit === 'man' ? formData.total_man : (display_unit === 'quintal' ? formData.gross_quintal : formData.total_kg)} {display_unit.toUpperCase()}</span>
                <span className="text-zinc-400 font-normal">x</span>
                <span className="text-zinc-800">₹{display_unit === 'man' ? (parseFloat(formData.rate) / 5).toFixed(2) : (display_unit === 'quintal' ? parseFloat(formData.rate).toFixed(2) : (parseFloat(formData.rate) / 100).toFixed(2))}</span>
                <span className="text-zinc-400 font-normal">=</span>
                <span className="text-base text-blue-600 font-black">₹{formData.gross_amount}</span>
              </div>
            </div>
          </div>

          {/* Side Panel: Calculations & Matrix */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Weights Matrix */}
            <div className="bg-zinc-50 border border-zinc-300 flex flex-col h-[400px] select-none">
              <div className="p-3 border-b border-zinc-300 bg-zinc-100 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator size={15} /> Weight Registry Matrix
                </span>
                <button
                  onClick={handleAddRow}
                  className="p-1 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm text-blue-600 hover:text-blue-700 select-none"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 select-none bg-white">
                <div className="grid grid-cols-12 gap-3 text-[10px] font-bold text-zinc-400 font-mono uppercase">
                  <div className="col-span-2 text-center">#</div>
                  <div className="col-span-10">Entry Volume (KG)</div>
                </div>

                {weightRows.map((row, idx) => (
                  <div key={row.id} className="grid grid-cols-12 gap-2 items-center select-none">
                    <div className="col-span-2 text-center font-bold text-zinc-400 font-mono text-xs">
                      {idx + 1}
                    </div>
                    <div className="col-span-8 relative">
                      <input
                        id={`wgt-input-${idx}`}
                        type="number"
                        className="w-full bg-white border border-zinc-300 rounded-none px-3 py-1.5 text-xs font-mono font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-600 transition-all select-none"
                        value={row.wgt}
                        autoFocus={idx === weightRows.length - 1 && idx > 0}
                        onChange={(e) => handleWeightChange(row.id, e.target.value)}
                        onKeyDown={(e) => handleWeightKeyDown(e, idx)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <button
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-1 text-zinc-300 hover:text-red-600 border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition rounded-none select-none"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-zinc-300 bg-zinc-50 flex justify-between items-center select-none">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">Gross Total Vol</p>
                <p className="text-xl font-bold font-mono text-zinc-800 leading-none">
                  {formData.total_kg} <span className="text-[10px] font-bold text-zinc-400 uppercase">KG</span>
                </p>
              </div>
            </div>

            {/* Overall Calculation Manifest Summary */}
            <div className="bg-white border border-zinc-300 p-4 space-y-4 flex-1">
              <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider border-b border-zinc-200 pb-1.5">Calculation Manifest</h3>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono leading-none">Bardan Bal</p>
                  <input type="number" readOnly className="w-full bg-zinc-50 border border-zinc-300 p-1 font-mono font-bold text-zinc-700 outline-none text-xs cursor-not-allowed select-none" value={formData.bardan} />
                  {selectedMember && (
                    <div className="text-[8px] font-bold text-blue-600 uppercase">Balan: {bardanBalance}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono leading-none">Net Vol</p>
                  <input type="number" readOnly className="w-full bg-zinc-50 border border-zinc-300 p-1 font-mono font-bold text-zinc-700 outline-none text-xs cursor-not-allowed select-none" value={formData.total_kg} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono leading-none">Rate / Qt</p>
                  <input type="number" readOnly className="w-full bg-zinc-50 border border-zinc-300 p-1 font-mono font-bold text-zinc-700 outline-none text-xs cursor-not-allowed select-none" value={formData.rate} />
                </div>
              </div>

              <div className="divide-y divide-zinc-200 font-mono border border-zinc-300">
                {[
                  { label: 'Gross Net Vol', val: `${(formData.total_kg - formData.less_bardan).toFixed(2)} kg`, color: 'text-zinc-600' },
                  { label: 'Gross Amount', val: `₹${formData.gross_amount}`, color: 'text-blue-600 font-bold' },
                  { label: 'Bardan Weight Less', val: `- ${formData.less_bardan} kg`, color: 'text-red-500' },
                  { label: 'Kapat (Deductions)', val: `- ₹${formData.total_deduction}`, color: 'text-red-500' },
                  { label: 'Bardan Penalty', val: `- ₹${formData.remaining_bardan_deduction}`, color: 'text-red-600' },
                  { label: 'Net Payable', val: `₹${formData.amount}`, color: 'text-emerald-600 font-black', size: 'text-xl bg-zinc-50 p-3 flex justify-between' }
                ].map((calc, i) => (
                  <div key={i} className={`flex justify-between items-center p-2.5 ${calc.size ? 'border-t border-zinc-300 bg-zinc-50' : ''}`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{calc.label}</p>
                    <p className={`${calc.size || 'text-xs'} font-bold ${calc.color}`}>{calc.val}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold transition rounded-none uppercase flex items-center justify-center gap-2 py-3 text-xs select-none mt-2 shadow-sm"
              >
                <Save size={16} /> Save Node Entry
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DangarEntry;
