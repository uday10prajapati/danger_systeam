import React, { useState, useEffect, useRef } from 'react';
import {
  Database, Plus, Trash2, Printer,
  Save, Search, X, RefreshCcw,
  Calendar, Info, AlertCircle, FileText,
  User, Box, Calculator, Truck,
  CheckCircle, History, Edit3, ChevronRight, Eye,
  TrendingDown, CreditCard, TrendingUp, Package
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addGujaratiFont } from '../utils/pdfFonts';
import html2canvas from 'html2canvas';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import api, { sabhasadMasterApi, dangarEntryApi, bardanEntryApi } from '../api';
import Toast from '../components/Toast';
import { formatBilingualText } from '../utils/textUtils';

const DangarEntry = () => {
  const { t, i18n } = useTranslation();
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
    // Only count rows that have a valid weight entry > 0
    const validWeightRows = weightRows.filter(r => parseFloat(r.wgt) > 0);
    const bagCountFromWeights = validWeightRows.length;
    
    let totalKG = validWeightRows.reduce((acc, row) => acc + (parseFloat(row.wgt) || 0), 0);

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

  const handleExportSlipPDF = async (record = null) => {
    setLoading(true);
    try {
      let data = record || formData;
      
      // If it's a history record, fetch full details to ensure weights are present
      if (record && record.id) {
        try {
          const detailRes = await dangarEntryApi.getById(record.id);
          if (detailRes.data.success) {
            data = { 
              ...detailRes.data.data, 
              member_name: record.member_name, 
              member_code: record.member_code,
              item_name_gu: record.item_name_gu || record.item_name
            };
          }
        } catch (err) {
          console.warn('Full detail fetch failed, using list data', err);
        }
      }

      const weightsArray = record ? (data.weights || []) : weightRows;
      const filteredWeights = weightsArray.filter(w => {
        const val = w.weight || w.wgt || 0;
        return parseFloat(val) > 0;
      });

      if (!data.member_id) {
        setMessage({ type: 'error', text: 'Required information missing for export' });
        setLoading(false);
        return;
      }

      const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
      const toGujaratiDigits = (num) => String(num || '').replace(/[0-9]/g, d => guDigits[d] || d);

      const memberObj = record ? { member_name: data.member_name, member_code: data.member_code } : members.find(m => m.id === parseInt(data.member_id));
      const itemObj = record ? { item_name_gu: data.item_name_gu || data.item_name, item_name: data.item_name } : items.find(i => i.id === parseInt(data.item_id));
      const companyData = company || {};
      const cName = companyData.company_name_gu || companyData.company_name || 'ડાન્ગેર સ્યસ્તેમ';

      const tempWrap = document.createElement('div');
      tempWrap.style.position = 'fixed';
      tempWrap.style.left = '-10000px';
      tempWrap.style.top = '0';
      tempWrap.style.width = '750px';
      tempWrap.style.background = '#fff';
      tempWrap.style.padding = '40px';
      tempWrap.className = 'notranslate';

      let weightRowsHtml = '';
      for (let i = 0; i < filteredWeights.length; i += 5) {
        const chunk = filteredWeights.slice(i, i + 5);
        weightRowsHtml += `
          <tr style="border-bottom:1px solid #e2e8f0;">
            ${chunk.map((w, idx) => `
              <td style="border-right:1px solid #e2e8f0; padding:10px; text-align:center; width:20%;">
                <div style="font-size:10px; color:#64748b; font-family:Arial; font-weight:bold;">BARDAN ${i + idx + 1}</div>
                <div style="font-weight:900; font-size:18px; font-family:Arial; color:#1e293b; margin-top:2px;">${toGujaratiDigits(w.weight || w.wgt)}</div>
              </td>
            `).join('')}
            ${Array(5 - chunk.length).fill('<td style="border-right:1px solid #e2e8f0; width:20%;"></td>').join('')}
          </tr>
        `;
      }

      tempWrap.innerHTML = `
        <div style="border:5px solid #2563eb; padding:30px; background:#fff; font-family:'Noto Sans Gujarati', sans-serif;">
          <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <tr>
              <td style="text-align:center; border-bottom:3px solid #2563eb; padding-bottom:15px;">
                <div style="font-size:36px; font-weight:900; color:#2563eb; font-family:'Prompt', sans-serif !important;">${cName}</div>
                <div style="font-size:22px; font-weight:700; color:#1e293b; margin-top:5px;">ડાંગેર પાકી પહોંચ</div>
              </td>
            </tr>
          </table>

          <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:16px;">
            <tr>
              <td style="width:65%; vertical-align:top;">
                <div style="color:#64748b; font-size:12px; font-weight:bold; text-transform:uppercase;">MEMBER / સભાસદ</div>
                <div style="font-size:26px; font-weight:900; color:#0f172a; margin:5px 0; font-family:'Prompt', sans-serif !important;">${memberObj?.member_name || '-'}</div>
                <div style="color:#2563eb; font-weight:bold; font-family:Arial;">CODE: ${toGujaratiDigits(memberObj?.member_code || '-')}</div>
              </td>
              <td style="width:35%; text-align:right; vertical-align:top;">
                <div style="color:#64748b; font-size:12px; font-weight:bold; text-transform:uppercase;">DETAILS / વિગત</div>
                <div style="font-weight:bold; margin:5px 0; font-family:Arial;">DATE: ${toGujaratiDigits(new Date(data.date || data.entry_date).toLocaleDateString('en-GB'))}</div>
                <div style="color:#2563eb; font-weight:bold; font-family:Arial;">BILL: #${data.srNo || data.sr_no}</div>
              </td>
            </tr>
          </table>

          <div style="background:#f8fafc; padding:15px; border:1px solid #e2e8f0; margin-bottom:25px;">
            <table style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="width:50%;">
                  <div style="color:#64748b; font-size:11px; font-weight:bold;">ITEM / આઇટમ</div>
                  <div style="font-size:18px; font-weight:bold; font-family:'Prompt', sans-serif !important;">${itemObj?.item_name_gu || itemObj?.item_name || '-'}</div>
                </td>
                <td style="width:25%; text-align:center;">
                  <div style="color:#64748b; font-size:11px; font-weight:bold;">QUALITY / ક્વોલિટી</div>
                  <div style="font-size:18px; font-weight:bold; color:#2563eb;">${data.quality_class}</div>
                </td>
                <td style="width:25%; text-align:right;">
                  <div style="color:#64748b; font-size:11px; font-weight:bold;">VEHICLE / વાહન</div>
                  <div style="font-size:18px; font-weight:bold; font-family:Arial;">${data.vehicleNo || '-'}</div>
                </td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom:25px; border:2px solid #e2e8f0; border-bottom:none;">
            <div style="background:#f1f5f9; padding:8px 15px; border-bottom:1px solid #e2e8f0; font-size:11px; font-weight:bold; color:#475569;">ITEMIZED WEIGHT REGISTRY / વજન વિગત</div>
            <table style="width:100%; border-collapse:collapse; background:#fff;">
              ${weightRowsHtml}
            </table>
          </div>

          <table style="width:100%; border-collapse:collapse; margin-bottom:30px;">
            <tr>
              <td style="width:48%; vertical-align:top;">
                <table style="width:100%; border-collapse:collapse; background:#f1f5f9; border-radius:8px; overflow:hidden;">
                  <tr>
                    <td style="padding:12px; border-bottom:1px solid #cbd5e1; font-weight:bold;">કુલ વજન (TOTAL KG)</td>
                    <td style="padding:12px; border-bottom:1px solid #cbd5e1; text-align:right; font-family:Arial; font-weight:900;">${toGujaratiDigits(data.total_kg)} KG</td>
                  </tr>
                  <tr>
                    <td style="padding:12px; border-bottom:1px solid #cbd5e1; font-weight:bold;">કુલ બારદાન (TOTAL GUN)</td>
                    <td style="padding:12px; border-bottom:1px solid #cbd5e1; text-align:right; font-family:Arial; font-weight:900;">${toGujaratiDigits(data.returned_bags)} GUN</td>
                  </tr>
                  <tr>
                    <td style="padding:12px; font-weight:bold;">નેટ વજન (NET QNTL)</td>
                    <td style="padding:12px; text-align:right; font-family:Arial; font-weight:900;">${toGujaratiDigits(data.net_quintal)} QT</td>
                  </tr>
                </table>
              </td>
              <td style="width:4%;"></td>
              <td style="width:48%; vertical-align:top;">
                <table style="width:100%; border-collapse:collapse; background:#fff; border:2px solid #2563eb;">
                  <tr style="background:#2563eb; color:#fff;">
                    <td style="padding:12px; font-weight:bold;">વિગત</td>
                    <td style="padding:12px; text-align:right; font-weight:bold;">રકમ (₹)</td>
                  </tr>
                  <tr>
                    <td style="padding:10px; border-bottom:1px solid #e2e8f0;">કુલ રકમ (GROSS)</td>
                    <td style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:right; font-family:Arial;">${toGujaratiDigits(data.gross_amount || (parseFloat(data.total_kg) * parseFloat(data.rate) / 100))}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px; border-bottom:1px solid #e2e8f0;">કપાત (DEDUCTION)</td>
                    <td style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:right; color:#dc2626; font-family:Arial;">- ${toGujaratiDigits(data.total_deduction || 0)}</td>
                  </tr>
                  <tr style="background:#eff6ff; color:#1e40af; font-size:20px; font-weight:900;">
                    <td style="padding:15px;">ચૂકવવા પાત્ર</td>
                    <td style="padding:15px; text-align:right; font-family:Arial;">₹${toGujaratiDigits(data.amount)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table style="width:100%; border-collapse:collapse; margin-top:50px;">
            <tr>
              <td style="width:33.3%; text-align:center;">
                <div style="width:160px; border-top:2px solid #94a3b8; margin:0 auto; padding-top:10px; font-size:11px; font-weight:bold; color:#475569;">તૈયાર કરનાર</div>
              </td>
              <td style="width:33.3%; text-align:center;">
                <div style="width:160px; border-top:2px solid #94a3b8; margin:0 auto; padding-top:10px; font-size:11px; font-weight:bold; color:#475569;">રિસીવર સહી</div>
              </td>
              <td style="width:33.3%; text-align:center;">
                <div style="width:160px; border-top:2px solid #94a3b8; margin:0 auto; padding-top:10px; font-size:11px; font-weight:bold; color:#475569;">સભાસદ સહી</div>
              </td>
            </tr>
          </table>
        </div>
      `;

      document.body.appendChild(tempWrap);
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 800));

      const canvas = await html2canvas(tempWrap, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      document.body.removeChild(tempWrap);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 30;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;

      doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, imgH);
      doc.save(`Dangar_Slip_${data.srNo || data.sr_no}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      setMessage({ type: 'error', text: 'Failed to generate PDF' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportBardanPDF = async (record = null) => {
    setLoading(true);
    try {
      let data = record || formData;

      // If it's a history record, fetch full details to ensure weights are present
      if (record && record.id) {
        try {
          const detailRes = await dangarEntryApi.getById(record.id);
          if (detailRes.data.success) {
            data = { 
              ...detailRes.data.data, 
              member_name: record.member_name, 
              member_code: record.member_code,
              item_name_gu: record.item_name_gu || record.item_name
            };
          }
        } catch (err) {
          console.warn('Full detail fetch failed, using list data', err);
        }
      }

      const weightsArray = record ? (data.weights || []) : weightRows;
      const filteredWeights = weightsArray.filter(w => {
        const val = w.weight || w.wgt || 0;
        return parseFloat(val) > 0;
      });

      if (!data.member_id) {
        setMessage({ type: 'error', text: 'Member information required' });
        setLoading(false);
        return;
      }

      const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
      const toGujaratiDigits = (num) => String(num || '').replace(/[0-9]/g, d => guDigits[d] || d);

      const companyData = company || {};
      const cName = companyData.company_name_gu || companyData.company_name || 'ડાન્ગેર સ્યસ્તેમ';
      const reportTitle = 'બારદાન જમા સ્લિપ';

      const memberObj = record ? { member_name: data.member_name, member_code: data.member_code } : members.find(m => m.id === parseInt(data.member_id));
      const itemObj = record ? { item_name_gu: data.item_name_gu || data.item_name, item_name: data.item_name } : items.find(i => i.id === parseInt(data.item_id));

      const tempWrap = document.createElement('div');
      tempWrap.style.position = 'fixed';
      tempWrap.style.left = '-10000px';
      tempWrap.style.top = '0';
      tempWrap.style.width = '700px';
      tempWrap.style.background = '#fff';
      tempWrap.style.padding = '30px';
      tempWrap.className = 'notranslate';
      tempWrap.setAttribute('translate', 'no');

      let weightRowsHtml = '';
      for (let i = 0; i < filteredWeights.length; i += 5) {
        const chunk = filteredWeights.slice(i, i + 5);
        weightRowsHtml += `
          <tr style="border-bottom:1px solid #e2e8f0;">
            ${chunk.map((w, idx) => `
              <td style="border-right:1px solid #e2e8f0; padding:15px; text-align:center; width:20%;">
                <div style="font-size:11px; color:#64748b; font-family:Arial; font-weight:bold;">BARDAN ${i + idx + 1}</div>
                <div style="font-weight:900; font-size:22px; font-family:Arial; color:#2563eb; margin-top:4px;">${toGujaratiDigits(w.weight || w.wgt)}</div>
              </td>
            `).join('')}
            ${Array(5 - chunk.length).fill('<td style="border-right:1px solid #e2e8f0; width:20%;"></td>').join('')}
          </tr>
        `;
      }

      tempWrap.innerHTML = `
        <div style="border:5px solid #2563eb; padding:25px; background:#fff; font-family:'Noto Sans Gujarati', sans-serif;">
          <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <tr>
              <td style="text-align:center; border-bottom:3px solid #2563eb; padding-bottom:15px;">
                <div style="font-size:32px; font-weight:900; color:#2563eb; font-family:'Prompt', sans-serif !important;">${cName}</div>
                <div style="font-size:20px; font-weight:700; color:#1e293b; margin-top:5px;">${reportTitle}</div>
              </td>
            </tr>
          </table>

          <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:16px;">
            <tr>
              <td style="width:60%; vertical-align:top;">
                <div style="color:#64748b; font-size:12px; font-weight:bold;">સભાસદ વિગત</div>
                <div style="font-size:24px; font-weight:900; color:#0f172a; margin:5px 0; font-family:'Noto Sans Gujarati', sans-serif !important;">${memberObj?.member_name || '-'}</div>
                <div style="color:#2563eb; font-weight:bold; font-family:Arial, sans-serif !important;">કોડ: ${toGujaratiDigits(memberObj?.member_code || '-')}</div>
              </td>
              <td style="width:40%; text-align:right; vertical-align:top;">
                <div style="color:#64748b; font-size:12px; font-weight:bold;">એન્ટ્રી વિગત</div>
                <div style="font-weight:bold; margin:5px 0; font-family:Arial, sans-serif !important;">તારીખ: ${toGujaratiDigits(new Date(data.entry_date || data.date).toLocaleDateString('en-GB'))}</div>
                <div style="color:#2563eb; font-weight:bold; font-family:Arial, sans-serif !important;">SR: #${data.sr_no || data.srNo}</div>
              </td>
            </tr>
          </table>

          <div style="background:#f1f5f9; padding:15px; border-left:6px solid #2563eb; margin-bottom:25px;">
            <div style="color:#64748b; font-size:12px; font-weight:bold;">આઇટમ</div>
            <div style="font-size:20px; font-weight:bold; color:#0f172a; font-family:'Noto Sans Gujarati', sans-serif !important;">${itemObj?.item_name_gu || itemObj?.item_name || '-'}</div>
          </div>

          <div style="margin-bottom:30px; border:2px solid #e2e8f0; border-bottom:none;">
            <div style="background:#f8fafc; padding:10px 15px; border-bottom:1px solid #e2e8f0; font-size:13px; font-weight:900; color:#1e293b;">બારદાન વાઈઝ વજન વિગત (BARDAN WISE WEIGHT)</div>
            <table style="width:100%; border-collapse:collapse; background:#fff;">
              ${weightRowsHtml}
            </table>
          </div>

          <table style="width:100%; border-collapse:collapse; margin-top:20px; background:#f8fafc; border:2px solid #e2e8f0;">
            <tr>
              <td style="padding:20px; width:50%;">
                <div style="color:#64748b; font-size:12px; font-weight:bold;">કુલ વજન (TOTAL KG)</div>
                <div style="font-size:32px; font-weight:900; color:#2563eb; font-family:Arial, sans-serif;">${toGujaratiDigits(record ? record.total_kg : data.total_kg)} <span style="font-size:16px;">KG</span></div>
              </td>
              <td style="padding:20px; width:50%; text-align:right;">
                <div style="color:#64748b; font-size:12px; font-weight:bold;">કુલ બારદાન (TOTAL GUN)</div>
                <div style="font-size:32px; font-weight:900; color:#0f172a; font-family:Arial, sans-serif;">${toGujaratiDigits(record ? record.returned_bags : data.returned_bags)} <span style="font-size:16px;">GUN</span></div>
              </td>
            </tr>
          </table>

          <table style="width:100%; border-collapse:collapse; margin-top:60px;">
            <tr>
              <td style="width:50%; text-align:center;">
                <div style="width:200px; border-top:2px solid #94a3b8; margin:0 auto; padding-top:10px; font-size:12px; font-weight:bold; color:#475569;">રિસીવર સહી</div>
              </td>
              <td style="width:50%; text-align:center;">
                <div style="width:200px; border-top:2px solid #94a3b8; margin:0 auto; padding-top:10px; font-size:12px; font-weight:bold; color:#475569;">સભાસદ સહી</div>
              </td>
            </tr>
          </table>
        </div>
      `;

      document.body.appendChild(tempWrap);
      await document.fonts.ready;
      await new Promise(r => setTimeout(r, 800));
      
      const canvas = await html2canvas(tempWrap, { 
        scale: 2.5, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      document.body.removeChild(tempWrap);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const imgData = canvas.toDataURL('image/png');
      const margin = 30;
      const docW = doc.internal.pageSize.getWidth();
      const printW = docW - (margin * 2);
      const printH = (canvas.height * printW) / canvas.width;

      doc.addImage(imgData, 'PNG', margin, margin, printW, printH);
      doc.save(`Bardan_Receipt_${data.srNo || data.sr_no}.pdf`);
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Bardan Slip generation failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportBardanSummaryPDF = async () => {
    if (history.length === 0) {
      setMessage({ type: 'error', text: 'No history data to export' });
      return;
    }

    setLoading(true);
    try {
      const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
      const toGujaratiDigits = (num) => String(num || '').replace(/[0-9]/g, d => guDigits[d] || d);
      const companyData = company || {};
      const cName = companyData.company_name_gu || companyData.company_name || 'ડાન્ગેર સ્યસ્તેમ';

      const tempWrap = document.createElement('div');
      tempWrap.style.position = 'fixed';
      tempWrap.style.left = '-10000px';
      tempWrap.style.top = '0';
      tempWrap.style.width = '1200px';
      tempWrap.style.background = '#fff';
      tempWrap.style.padding = '40px';
      tempWrap.className = 'notranslate';

      const tableRows = history.map((row, idx) => {
        const weights = row.weights || [];
        const filteredWeights = weights.filter(w => w.weight > 0);
        
        let weightGridHtml = '';
        for (let i = 0; i < filteredWeights.length; i += 10) {
          const chunk = filteredWeights.slice(i, i + 10);
          weightGridHtml += `
            <div style="display:flex; border-top:1px solid #e2e8f0;">
              ${chunk.map((w, cIdx) => `
                <div style="flex:1; border-right:1px solid #e2e8f0; padding:4px; text-align:center;">
                  <div style="font-size:7px; color:#64748b; font-family:Arial;">${i + cIdx + 1}</div>
                  <div style="font-weight:bold; font-size:11px; font-family:Arial;">${toGujaratiDigits(w.weight)}</div>
                </div>
              `).join('')}
              ${Array(10 - chunk.length).fill('<div style="flex:1; border-right:1px solid #e2e8f0;"></div>').join('')}
            </div>
          `;
        }

        return `
          <div style="margin-bottom:20px; border:1px solid #2563eb; break-inside:avoid;">
            <div style="background:#eff6ff; padding:10px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #2563eb;">
              <div>
                <span style="font-weight:900; font-size:16px;">${row.member_name}</span>
                <span style="margin-left:15px; color:#2563eb; font-weight:bold; font-family:Arial;">(CODE: ${toGujaratiDigits(row.member_code)})</span>
              </div>
              <div style="font-family:Arial; font-weight:bold;">
                DATE: ${toGujaratiDigits(new Date(row.entry_date).toLocaleDateString('en-GB'))} | BILL: #${row.sr_no}
              </div>
            </div>
            
            <div style="padding:10px;">
              <div style="font-size:10px; color:#64748b; margin-bottom:5px; font-weight:bold; text-transform:uppercase;">વજન વિગત (BARDAN WISE WEIGHTS)</div>
              <div style="border:1px solid #e2e8f0; border-right:none; border-top:none;">
                ${weightGridHtml || '<div style="padding:10px; color:#94a3b8;">No weights recorded</div>'}
              </div>
            </div>

            <div style="background:#f8fafc; padding:10px; border-top:1px solid #2563eb; display:flex; justify-content:flex-end; gap:30px;">
              <div><span style="font-size:11px; color:#64748b;">TOTAL BARDAN:</span> <span style="font-weight:900; font-family:Arial;">${toGujaratiDigits(row.returned_bags)}</span></div>
              <div><span style="font-size:11px; color:#64748b;">TOTAL WEIGHT:</span> <span style="font-weight:900; font-family:Arial; color:#2563eb;">${toGujaratiDigits(row.total_kg)} KG</span></div>
            </div>
          </div>
        `;
      }).join('');

      tempWrap.innerHTML = `
        <div style="font-family:'Noto Sans Gujarati', sans-serif; color:#1e293b;">
          <div style="text-align:center; border-bottom:4px solid #2563eb; padding-bottom:20px; margin-bottom:30px;">
            <div style="font-size:36px; font-weight:900; color:#2563eb; font-family:'Prompt', sans-serif !important;">${cName}</div>
            <div style="font-size:22px; font-weight:bold; color:#64748b; margin-top:5px;">વિગતવાર સભાસદ બારદાન રિપોર્ટ (Detailed Member Bardan Statement)</div>
          </div>
          ${tableRows}
        </div>
      `;

      document.body.appendChild(tempWrap);
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 800));

      const canvas = await html2canvas(tempWrap, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(tempWrap);

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const imgW = doc.internal.pageSize.getWidth() - 60;
      const imgH = (canvas.height * imgW) / canvas.width;
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', 30, 30, imgW, imgH);
      doc.save(`Bardan_Detailed_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Report generation failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportHistoryPDF = async () => {
    if (history.length === 0) {
      setMessage({ type: 'error', text: 'No history data to export' });
      return;
    }

    setLoading(true);
    try {
      const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
      const toGujaratiDigits = (num) => String(num || '').replace(/[0-9]/g, d => guDigits[d] || d);
      const companyData = company || {};
      const cName = companyData.company_name_gu || companyData.company_name || 'ડાન્ગેર સ્યસ્તેમ';

      const tempWrap = document.createElement('div');
      tempWrap.style.position = 'fixed';
      tempWrap.style.left = '-10000px';
      tempWrap.style.top = '0';
      tempWrap.style.width = '1000px';
      tempWrap.style.background = '#fff';
      tempWrap.style.padding = '40px';
      tempWrap.className = 'notranslate';

      const tableRows = history.map((row, idx) => `
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:12px; text-align:center;">${toGujaratiDigits(idx + 1)}</td>
          <td style="padding:12px;">${toGujaratiDigits(new Date(row.entry_date).toLocaleDateString('en-GB'))}</td>
          <td style="padding:12px; font-weight:bold;">${row.sr_no}</td>
          <td style="padding:12px; font-weight:bold; font-family:'Prompt', sans-serif !important;">${row.member_name}</td>
          <td style="padding:12px; text-align:center;">${toGujaratiDigits(row.returned_bags)}</td>
          <td style="padding:12px; text-align:right; font-weight:900; color:#2563eb;">${toGujaratiDigits(row.total_kg)} KG</td>
          <td style="padding:12px; text-align:right; font-weight:900; color:#1e293b;">₹${toGujaratiDigits(row.amount)}</td>
        </tr>
      `).join('');

      tempWrap.innerHTML = `
        <div style="font-family:'Noto Sans Gujarati', sans-serif; color:#1e293b;">
          <div style="text-align:center; border-bottom:4px solid #2563eb; padding-bottom:20px; margin-bottom:30px;">
            <div style="font-size:36px; font-weight:900; color:#2563eb; font-family:'Prompt', sans-serif !important;">${cName}</div>
            <div style="font-size:22px; font-weight:bold; color:#64748b; margin-top:5px;">ડાંગેર વ્યવહાર ઇતિહાસ (Transaction History)</div>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <thead>
              <tr style="background:#1e293b; color:#fff;">
                <th style="padding:15px;">ક્રમ</th>
                <th style="padding:15px;">તારીખ</th>
                <th style="padding:15px;">બિલ</th>
                <th style="padding:15px; text-align:left;">સભાસદ</th>
                <th style="padding:15px;">બારદાન</th>
                <th style="padding:15px; text-align:right;">કુલ વજન</th>
                <th style="padding:15px; text-align:right;">ચૂકવવા પાત્ર</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      `;

      document.body.appendChild(tempWrap);
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 800));

      const canvas = await html2canvas(tempWrap, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(tempWrap);

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const imgW = doc.internal.pageSize.getWidth() - 60;
      const imgH = (canvas.height * imgW) / canvas.width;
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', 30, 30, imgW, imgH);
      doc.save(`Dangar_History_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'History PDF failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportAllBardanSlipsPDF = async () => {
    if (history.length === 0) {
      setMessage({ type: 'error', text: 'No history records' });
      return;
    }

    setLoading(true);
    try {
      const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
      const toGujaratiDigits = (num) => String(num || '').replace(/[0-9]/g, d => guDigits[d] || d);
      const companyData = company || {};
      const cName = companyData.company_name_gu || companyData.company_name || 'ડાન્ગેર સ્યસ્તેમ';

      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 40;
      const contentW = pageW - margin * 2;

      for (let idx = 0; idx < history.length; idx++) {
        const row = history[idx];
        const weights = row.weights || [];
        const filteredWeights = weights.filter(w => w.weight > 0);

        const tempWrap = document.createElement('div');
        tempWrap.style.width = '800px';
        tempWrap.style.padding = '40px';
        tempWrap.style.background = '#fff';
        tempWrap.className = 'notranslate';

        let weightRowsHtml = '';
        for (let i = 0; i < filteredWeights.length; i += 5) {
          const chunk = filteredWeights.slice(i, i + 5);
          weightRowsHtml += `
            <tr>
              ${chunk.map((w, cIdx) => `
                <td style="border:1px solid #e2e8f0; padding:12px; text-align:center; width:20%;">
                  <div style="font-size:10px; color:#64748b; font-family:Arial;">GUN ${i + cIdx + 1}</div>
                  <div style="font-weight:bold; font-size:18px; font-family:Arial;">${toGujaratiDigits(w.weight)}</div>
                </td>
              `).join('')}
              ${Array(5 - chunk.length).fill('<td style="border:1px solid #e2e8f0; width:20%;"></td>').join('')}
            </tr>
          `;
        }

        tempWrap.innerHTML = `
          <div style="border:4px solid #2563eb; padding:30px; font-family:'Noto Sans Gujarati', sans-serif;">
            <div style="text-align:center; border-bottom:3px solid #2563eb; padding-bottom:15px; margin-bottom:20px;">
              <div style="font-size:36px; font-weight:900; color:#2563eb; font-family:'Prompt', sans-serif !important;">${cName}</div>
              <div style="font-size:22px; font-weight:700; color:#1e293b;">બારદાન જમા સ્લિપ</div>
            </div>

            <table style="width:100%; margin-bottom:20px;">
              <tr>
                <td style="width:60%;">
                  <div style="color:#64748b; font-size:12px; font-weight:bold;">સભાસદ</div>
                  <div style="font-size:26px; font-weight:900; color:#0f172a;">${row.member_name}</div>
                  <div style="color:#2563eb; font-weight:bold; font-family:Arial;">CODE: ${toGujaratiDigits(row.member_code)}</div>
                </td>
                <td style="width:40%; text-align:right;">
                  <div style="color:#64748b; font-size:12px; font-weight:bold;">એન્ટ્રી વિગત</div>
                  <div style="font-weight:bold; font-family:Arial;">તારીખ: ${toGujaratiDigits(new Date(row.entry_date).toLocaleDateString('en-GB'))}</div>
                  <div style="color:#2563eb; font-weight:bold; font-family:Arial;">SR: #${row.sr_no}</div>
                </td>
              </tr>
            </table>

            <div style="margin-bottom:25px;">
              <div style="color:#64748b; font-size:12px; font-weight:bold; margin-bottom:10px;">વજન રજિસ્ટ્રી</div>
              <table style="width:100%; border-collapse:collapse;">
                ${weightRowsHtml}
              </table>
            </div>

            <table style="width:100%; border-collapse:collapse; background:#f8fafc; border:2px solid #e2e8f0;">
              <tr>
                <td style="padding:20px; width:50%;">
                  <div style="color:#64748b; font-size:12px; font-weight:bold;">કુલ વજન (TOTAL KG)</div>
                  <div style="font-size:36px; font-weight:900; color:#2563eb; font-family:Arial;">${toGujaratiDigits(row.total_kg)} KG</div>
                </td>
                <td style="padding:20px; width:50%; text-align:right;">
                  <div style="color:#64748b; font-size:12px; font-weight:bold;">કુલ બારદાન (TOTAL GUN)</div>
                  <div style="font-size:36px; font-weight:900; color:#0f172a; font-family:Arial;">${toGujaratiDigits(row.returned_bags)} GUN</div>
                </td>
              </tr>
            </table>
          </div>
        `;

        document.body.appendChild(tempWrap);
        await document.fonts.ready;
        const canvas = await html2canvas(tempWrap, { scale: 2, useCORS: true });
        document.body.removeChild(tempWrap);

        const imgData = canvas.toDataURL('image/png');
        const imgH = (canvas.height * contentW) / canvas.width;

        if (idx > 0) doc.addPage();
        doc.addImage(imgData, 'PNG', margin, margin, contentW, imgH);
      }

      doc.save(`All_Bardan_Slips_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Bulk Export failed' });
    } finally {
      setLoading(false);
    }
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
        weights: weightRows.filter(r => r.wgt && parseFloat(r.wgt) > 0),
        deductions: deductions,
        weight_unit: 'kg'
      };

      const res = id 
        ? await dangarEntryApi.update(id, payload)
        : await dangarEntryApi.create(payload);

      if (res.data.success) {
        setMessage({ type: 'success', text: id ? 'Transaction node updated successfully' : `Transaction committed. Node SR: ${res.data.data.srNo}` });
        
        // Auto-download PDF on new entry or update
        handleExportSlipPDF(res.data.data);
        
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
    const cName = company?.company_name_gu || company?.company_name || 'Company';
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

    const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
    const toGujaratiDigits = (num) => String(num || '').replace(/[0-9]/g, d => guDigits[d] || d);

    const totalQt = filteredHistory.reduce((s, r) => s + parseFloat(r.net_quintal || 0), 0);
    const rows = filteredHistory.map((row, i) => `
      <tr style="background:${i%2===0?'#fff':'#f1f5f9'}">
        <td style="font-family:Arial, sans-serif;">${toGujaratiDigits(new Date(row.entry_date).toLocaleDateString('en-GB'))}</td>
        <td style="font-family:Arial, sans-serif;" translate="no">#${String(row.sr_no || '')}<br/><span style="font-size:9px;color:#94a3b8">${t('dangarEntry.form.' + row.book_type.toLowerCase()) || row.book_type}</span></td>
        <td><strong style="font-family:'Prompt', sans-serif;">${row.member_name}</strong><br/><span style="font-size:9px;color:#94a3b8">${t('memberMaster.code') || 'CODE'}: ${toGujaratiDigits(row.member_code)}</span></td>
        <td style="font-family:'Prompt', sans-serif;">${row.item_name || '-'}</td>
        <td style="font-family:Arial, sans-serif;">${row.quality_class === '1st' ? t('dangarMaster.filters.first') : row.quality_class === '2nd' ? t('dangarMaster.filters.second') : row.quality_class === '3rd' ? t('dangarMaster.filters.third') : toGujaratiDigits(row.quality_class || '1st')}</td>
        <td style="font-family:Arial, sans-serif;">${row.vehicle_no || '-'}</td>
        <td style="text-align:right;font-family:Arial, sans-serif;">${toGujaratiDigits(parseFloat(row.net_quintal||0).toFixed(2))} ${t('dangarMaster.table.unit')}</td>
      </tr>`);
    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.write(`<html><head><title>${cName} - ${t('dangarEntry.historyTitle')}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:10px;color:#1e293b;padding:20px}
        .logo-bar{background:#0f172a;color:#fff;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
        .logo-bar h1{font-size:13px;font-weight:900;font-family:'Prompt', sans-serif;}.logo-bar span{font-size:9px;color:#94a3b8}
        h2{font-size:18px;font-weight:900;margin-bottom:2px}
        p.sub{font-size:9px;color:#64748b;margin-bottom:10px}
        hr{border:none;border-top:1px solid #e2e8f0;margin:8px 0}
        table{width:100%;border-collapse:collapse}
        thead tr{background:#0f172a;color:#fff}
        th{padding:7px 8px;font-size:9px;font-weight:700;text-transform:uppercase;text-align:left}
        td{padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:9px}
        tfoot tr{background:#1e293b;color:#fff;font-weight:700}
        @media print{@page{size:A4 portrait;margin:1.5cm}}
      </style></head><body>
      <div class='logo-bar'><h1>${cName}</h1><span>${t('dangarEntry.historyTitle')} &nbsp;|&nbsp; ${toGujaratiDigits(new Date().toLocaleDateString('en-IN'))}</span></div>
      <h2>${t('dangarEntry.historyTitle')}</h2>
      <p class='sub'>${t('common.records')}: ${toGujaratiDigits(filteredHistory.length)} &nbsp;|&nbsp; ${t('dangarMaster.pdfReport.generated')}: ${toGujaratiDigits(new Date().toLocaleString('en-IN'))}</p>
      ${historyFilters.startDate || historyFilters.fromMember ? `<p class='sub'>${t('dangarEntry.historyFilter')}: ${toGujaratiDigits(historyFilters.startDate||'--')} થી ${toGujaratiDigits(historyFilters.endDate||'--')} | ${t('dangarEntry.historyMemberRange')}: ${toGujaratiDigits(historyFilters.fromMember||'--')} થી ${toGujaratiDigits(historyFilters.toMember||'--')}</p>` : ''}
      <hr/>
      <table>
        <thead><tr><th>${t('common.date')}</th><th>${t('common.billNumber')}</th><th>${t('dangarEntry.form.memberNode')}</th><th>${t('dangarEntry.form.itemStructure')}</th><th>${t('dangarEntry.form.qualityVector')}</th><th>${t('dangarEntry.form.vehicle')}</th><th style='text-align:right'>${t('dangarEntry.stats.netVol')}</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot><tr><td colspan='6'>${t('dangarMaster.table.totals')} &mdash; ${toGujaratiDigits(filteredHistory.length)} ${t('common.records')}</td><td style='text-align:right'>${toGujaratiDigits(totalQt.toFixed(2))} ${t('dangarMaster.table.unit')}</td></tr></tfoot>
      </table></body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleHistoryExportPDF = async () => {
    const rows = history.filter(row => {
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

    if (!rows.length) {
      setMessage({ type: 'error', text: t('dangarMaster.noRecords') });
      return;
    }

    setLoading(true);
    try {
      const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
      const toGujaratiDigits = (num) => String(num || '').replace(/[0-9]/g, d => guDigits[d] || d);

      const companyData = company || {};
      const cName = companyData.company_name_gu || companyData.company_name || 'Company';
      const reportTitle = t('dangarEntry.historyTitle') || 'Transaction History';

      const tempWrap = document.createElement('div');
      tempWrap.style.position = 'fixed';
      tempWrap.style.left = '-10000px';
      tempWrap.style.top = '0';
      tempWrap.style.width = '1100px';
      tempWrap.style.background = '#fff';
      tempWrap.style.color = '#111827';
      tempWrap.style.fontFamily = '"Noto Sans Gujarati", "NotoGujarati", Arial, sans-serif';
      tempWrap.style.padding = '30px';

      const totalQt = rows.reduce((s, r) => s + parseFloat(r.net_quintal || 0), 0);

      const tableRows = rows.map((r, idx) => `
        <tr>
          <td style="padding:10px;border:1px solid #cbd5e1;text-align:center;font-family:Arial,sans-serif !important;">${toGujaratiDigits(idx + 1)}</td>
          <td style="padding:10px;border:1px solid #cbd5e1;text-align:center;font-family:Arial,sans-serif !important;">${toGujaratiDigits(new Date(r.entry_date).toLocaleDateString('en-GB'))}</td>
          <td style="padding:10px;border:1px solid #cbd5e1;text-align:center;font-family:Arial,sans-serif !important;" translate="no">#${String(r.sr_no || '')}<br/><span style="font-size:10px;color:#64748b;">${t('dangarEntry.form.' + r.book_type.toLowerCase()) || r.book_type}</span></td>
          <td style="padding:10px;border:1px solid #cbd5e1;font-weight:700;font-family:'Prompt',sans-serif !important;">${r.member_name} <br/><span style="font-size:10px;color:#64748b;font-family:Arial,sans-serif !important;">${t('memberMaster.code') || 'CODE'}: ${toGujaratiDigits(r.member_code)}</span></td>
          <td style="padding:10px;border:1px solid #cbd5e1;font-family:'Prompt',sans-serif !important;">${r.item_name || '-'}</td>
          <td style="padding:10px;border:1px solid #cbd5e1;text-align:center;">${r.quality_class === '1st' ? t('dangarMaster.filters.first') : r.quality_class === '2nd' ? t('dangarMaster.filters.second') : r.quality_class === '3rd' ? t('dangarMaster.filters.third') : toGujaratiDigits(r.quality_class || '1st')}</td>
          <td style="padding:10px;border:1px solid #cbd5e1;text-align:center;font-family:Arial,sans-serif !important;">${r.vehicle_no || '-'}</td>
          <td style="padding:10px;border:1px solid #cbd5e1;text-align:right;font-weight:700;font-family:Arial,sans-serif !important;">${toGujaratiDigits(parseFloat(r.net_quintal).toFixed(2))}</td>
        </tr>
      `).join('');

      tempWrap.innerHTML = `
        <div style="border:2px solid #2563eb; border-radius:0;">
          <div style="background:#2563eb;color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:22px;font-weight:800;font-family:'Prompt', sans-serif;">${cName}</div>
            <div style="font-size:14px;font-weight:700;opacity:0.9;">${reportTitle}</div>
          </div>
          <div style="padding:30px;">
            <div style="font-size:28px;font-weight:800;color:#0f172a;margin-bottom:8px;">${reportTitle}</div>
            <div style="font-size:14px;color:#64748b;margin-bottom:24px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
              ${t('common.from')}: <b>${toGujaratiDigits(historyFilters.startDate || '--')}</b> ${t('common.to')}: <b>${toGujaratiDigits(historyFilters.endDate || '--')}</b> | 
              ${t('dangarEntry.historyMemberRange')}: <b>${toGujaratiDigits(historyFilters.fromMember || '--')}</b> થી <b>${toGujaratiDigits(historyFilters.toMember || '--')}</b> | 
              ${t('dangarMaster.pdfReport.generated')}: <b>${toGujaratiDigits(new Date().toLocaleString('en-IN'))}</b>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead>
                <tr style="background:#f1f5f9;color:#475569;">
                  <th style="padding:12px 10px;border:1px solid #cbd5e1;text-align:center;">${t('sabhasadLedgerSummary.srNo')}</th>
                  <th style="padding:12px 10px;border:1px solid #cbd5e1;">${t('common.date')}</th>
                  <th style="padding:12px 10px;border:1px solid #cbd5e1;">${t('common.billNumber')}</th>
                  <th style="padding:12px 10px;border:1px solid #cbd5e1;">${t('dangarEntry.form.memberNode')}</th>
                  <th style="padding:12px 10px;border:1px solid #cbd5e1;">${t('dangarEntry.form.itemStructure')}</th>
                  <th style="padding:12px 10px;border:1px solid #cbd5e1;text-align:center;">${t('dangarEntry.form.qualityVector')}</th>
                  <th style="padding:12px 10px;border:1px solid #cbd5e1;text-align:center;">${t('dangarEntry.form.vehicle')}</th>
                  <th style="padding:12px 10px;border:1px solid #cbd5e1;text-align:right;">${t('dangarEntry.stats.netQuintal')} (${t('dangarMaster.table.unit')})</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
              <tfoot>
                <tr style="background:#f8fafc;font-weight:800;color:#0f172a;">
                  <td colspan="7" style="padding:15px;border:1px solid #cbd5e1;text-align:right;">${t('dangarMaster.table.totals')} (${toGujaratiDigits(rows.length)} ${t('common.records')})</td>
                  <td style="padding:15px;border:1px solid #cbd5e1;text-align:right;font-size:16px;">${toGujaratiDigits(totalQt.toFixed(2))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;

      document.body.appendChild(tempWrap);

      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 400));

      const canvas = await html2canvas(tempWrap, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        fontEmbedCSS: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;700&display=swap'
      });

      document.body.removeChild(tempWrap);

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 30;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;

      doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, imgH);
      doc.save(`Transaction_History_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      setMessage({ type: 'error', text: 'Failed to generate PDF' });
    } finally {
      setLoading(false);
    }
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
      const currentRow = weightRows[idx];
      if (idx === weightRows.length - 1) {
        if (currentRow.wgt && parseFloat(currentRow.wgt) > 0) {
          handleAddRow();
        } else {
          handleSave(e);
        }
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
                <span className={i18n.language === 'gu' ? 'font-prompt' : ''}>{t('dangarEntry.pdf.historyTitle')}</span>
              </h1>
              <p className={`text-xs text-zinc-500 mt-0.5 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'font-sans'}`}>{t('dangarEntry.historyTitle') || 'Transaction History'}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportHistoryPDF}
                className={`flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
              >
                <FileText size={14} /> {t('common.pdf')}
              </button>
              <button
                onClick={handleHistoryPrint}
                className={`flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
              >
                <Printer size={14} /> {t('common.print')}
              </button>
              <button
                onClick={() => setShowHistory(false)}
                className={`flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white text-xs font-bold px-3 py-1.5 select-none rounded-none transition ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
              >
                <X size={14} /> {t('common.back')}
              </button>
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-300 p-4 flex flex-wrap items-center gap-4 select-none">
            <div className="flex items-center gap-2">
              <Calendar className="text-zinc-500" size={15} />
              <span className={`text-[10px] font-bold text-zinc-500 notranslate ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase font-sans'}`} translate="no">{t('dangarEntry.historyFilter') || 'Date Filter'}:</span>
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
              <span className={`text-[10px] font-bold text-zinc-500 notranslate ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase font-sans'}`} translate="no">{t('dangarEntry.historyMemberRange') || 'Member Range'}:</span>
            </div>
            <div className="flex items-center gap-1 border border-zinc-300 bg-white p-1">
              <input 
                type="text" 
                placeholder={t('common.from')}
                value={historyFilters.fromMember} 
                onChange={e => setHistoryFilters(prev => ({ ...prev, fromMember: e.target.value }))} 
                className="w-16 bg-transparent border-none outline-none text-[11px] font-bold text-zinc-700 uppercase font-mono px-1" 
              />
              <span className="text-zinc-400 font-bold">{t('common.to')}</span>
              <input 
                type="text" 
                placeholder={t('common.to')}
                value={historyFilters.toMember} 
                onChange={e => setHistoryFilters(prev => ({ ...prev, toMember: e.target.value }))} 
                className="w-16 bg-transparent border-none outline-none text-[11px] font-bold text-zinc-700 uppercase font-mono px-1" 
              />
            </div>

            <button 
              onClick={() => setHistoryFilters({ startDate: '', endDate: '', fromMember: '', toMember: '' })} 
              className={`px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold text-[10px] uppercase transition rounded-none ml-auto ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}
            >
              {t('common.clear')}
            </button>
          </div>

          <div className="border border-zinc-300 bg-white">
            <table className="w-full text-left font-sans text-xs select-none border-collapse">
              <thead>
                <tr className={`bg-zinc-50 border-b border-zinc-300 text-zinc-600 ${i18n.language === 'gu' ? 'font-prompt' : ''}`}>
                  <th className="px-4 py-3 border-r border-zinc-200">{t('common.date')}</th>
                  <th className="px-4 py-3 border-r border-zinc-200">{t('common.billNumber')}</th>
                  <th className="px-4 py-3 border-r border-zinc-200">{t('dangarEntry.form.memberNode')}</th>
                  <th className="px-4 py-3 border-r border-zinc-200 text-center">{t('dangarEntry.form.qualityVector')}</th>
                  <th className="px-4 py-3 border-r border-zinc-200 text-right">{t('dangarEntry.form.volume')}</th>
                  <th className="px-4 py-3 border-r border-zinc-200 text-right">{t('dangarEntry.stats.netVol')}</th>
                  <th className="px-4 py-3 text-center">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {filteredHistory.map((row) => {
                  const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
                  const toGujaratiDigits = (num) => String(num || '').replace(/[0-9]/g, d => guDigits[d] || d);
                  return (
                  <tr key={row.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-4 py-3 border-r border-zinc-200 font-bold">
                      {toGujaratiDigits(new Date(row.entry_date).toLocaleDateString('en-GB'))}
                    </td>
                    <td className="px-4 py-3 border-r border-zinc-200">
                      <span className="text-blue-600 font-bold font-sans" translate="no">#{String(row.sr_no || '')}</span>
                      <p className={`text-[10px] text-zinc-400 uppercase font-bold mt-0.5 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}>{t('dangarEntry.form.' + row.book_type.toLowerCase()) || row.book_type}</p>
                    </td>
                    <td className="px-4 py-3 border-r border-zinc-200">
                      <p className={`font-bold tracking-tight text-zinc-800 leading-none ${i18n.language === 'gu' ? 'font-prompt' : 'font-mono uppercase italic'}`} style={i18n.language === 'gu' ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}>{formatBilingualText(row.member_name)}</p>
                      <p className={`text-[10px] text-zinc-400 mt-1 font-bold ${i18n.language === 'gu' ? 'font-prompt' : 'font-sans uppercase'}`}>{t('memberMaster.code') || 'CODE'}: <span className="notranslate" translate="no">{toGujaratiDigits(row.member_code)}</span></p>
                    </td>
                    <td className="px-4 py-3 border-r border-zinc-200 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold border notranslate ${i18n.language === 'gu' ? 'font-prompt' : ''} ${row.quality_class === '1st' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : row.quality_class === '2nd' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`} translate="no">
                        {row.quality_class === '1st' ? t('dangarMaster.filters.first') : 
                         row.quality_class === '2nd' ? t('dangarMaster.filters.second') : 
                         row.quality_class === '3rd' ? t('dangarMaster.filters.third') : toGujaratiDigits(row.quality_class || '1st')}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-amber-600">
                      {toGujaratiDigits((parseFloat(row.net_quintal) * 5).toFixed(2))}
                    </td>
                    <td className="px-4 py-3 border-r border-zinc-200 text-right font-bold text-zinc-800">
                      {toGujaratiDigits(row.net_quintal)}
                    </td>
                    <td className="px-4 py-3 text-center space-x-1 flex items-center justify-center">
                      <button onClick={() => handleExportSlipPDF(row)} className="p-1 border border-zinc-300 bg-blue-50 hover:bg-blue-100 text-blue-600 transition" title="Transaction Slip"><FileText size={13} /></button>
                      <button onClick={() => handleExportBardanPDF(row)} className="p-1 border border-zinc-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition" title="Bardan Receipt"><Package size={13} /></button>
                      <button onClick={() => handleDelete(row.id)} className="p-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-200 text-red-600 transition" title="Delete record"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                )})}
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
              <span className={i18n.language === 'gu' ? 'font-prompt' : ''}>{id ? t('dangarEntry.form.updateNode') : t('dangarEntry.title')}</span>
            </h1>
            <p className={`text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}>{t('dangarEntry.eyebrow')}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadHistory}
              className={`flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
            >
              <History size={14} /> {t('common.history')}
            </button>
            <button
              onClick={resetForm}
              className={`flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
            >
              <X size={14} /> {t('common.reset')}
            </button>
            <button
              onClick={() => handleExportBardanPDF()}
              className={`flex items-center gap-1.5 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 text-xs font-bold px-3 py-1.5 select-none ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
            >
              <Package size={14} /> {t('dangarEntry.pdf.bardanDepositSlip') || 'Bardan Slip'}
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className={`flex items-center gap-1.5 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-none transition shadow-sm select-none ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
            >
              {id ? <Edit3 size={15} /> : <Save size={15} />}
              {id ? t('dangarEntry.form.updateNode') : t('dangarEntry.form.commitEntry')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Content Areas */}
          <div className="lg:col-span-8 bg-zinc-50 border border-zinc-300 p-5 flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className={`text-[10px] font-bold text-zinc-500 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`}>{t('dangarEntry.form.bookType')}</label>
                <select
                  ref={bookTypeRef}
                  value={formData.bookType}
                  onChange={(e) => setFormData({ ...formData, bookType: e.target.value })}
                  onKeyDown={(e) => handleKeyDown(e, bookTypeRef)}
                  className={`w-full px-3 py-2 bg-white border border-zinc-300 outline-none text-xs text-zinc-800 font-bold focus:bg-white focus:border-zinc-600 transition ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
                >
                  <option value="Tuver">{t('dangarEntry.form.tuver')}</option>
                  <option value="Dangar">{t('dangarEntry.form.dangar')}</option>
                  <option value="Divela">{t('dangarEntry.form.divela')}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-[10px] font-bold text-zinc-500 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`}>{t('dangarEntry.form.srNumber')}</label>
                <div className="flex items-center h-[34px] px-3 bg-zinc-100 border border-zinc-300 font-mono text-xs select-none">
                  <span className={`font-bold tracking-widest notranslate ${formData.srNo === 'AUTO' ? 'text-zinc-400 font-prompt uppercase-none' : 'text-blue-600'}`} translate="no">
                    {formData.srNo === 'AUTO' ? t('dangarEntry.form.auto') : `#${formData.srNo}`}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-[10px] font-bold text-zinc-500 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`}>{t('dangarEntry.form.entryDate')}</label>
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
                <label className={`text-[10px] font-bold text-zinc-500 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`}>{t('dangarEntry.form.protocolSeason')}</label>
                <div className="flex gap-1.5 p-1 bg-zinc-200 border border-zinc-300">
                  {['winter', 'summer'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, season: s }))}
                      className={`flex-1 py-1 text-[10px] font-bold uppercase transition ${formData.season === s
                        ? 'bg-white text-zinc-800 border border-zinc-300'
                        : 'text-zinc-500 hover:text-zinc-700'
                        } ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''} notranslate`}
                      translate="no"
                    >
                      {t(`dangarEntry.form.${s}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-8 flex flex-col gap-1">
                <label className={`text-[10px] font-bold text-zinc-500 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`}>{t('dangarEntry.form.memberNode')}</label>
                <div className="flex gap-2">
                  <div className="w-1/4">
                    <input
                      ref={memberCodeRef}
                      type="text"
                      placeholder={t('common.code')}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 outline-none text-xs font-bold text-zinc-700 uppercase focus:border-zinc-600 force-en notranslate" translate="no" lang="en"
                      value={selectedMember?.member_code || ''}
                      onChange={(e) => handleMemberCodeChange(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, memberCodeRef)}
                    />
                  </div>
                  <div className="w-3/4">
                    <select
                      ref={memberIdRef}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 outline-none text-xs text-zinc-800 focus:border-zinc-600 appearance-none font-bold font-prompt"
                      style={{ fontFamily: "'Prompt', sans-serif" }}
                      value={formData.member_id}
                      onChange={(e) => handleMemberChange(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, memberIdRef)}
                    >
                      <option value="" className="font-sans">{t('dangarEntry.form.selectMember')}</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id} className="font-prompt" style={{ fontFamily: "'Prompt', sans-serif" }}>
                          {m.member_code} - {m.member_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 flex flex-col gap-1">
                <label className={`text-[10px] font-bold text-zinc-500 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`}>{t('dangarEntry.form.qualityVector')}</label>
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
                        } ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''} notranslate`}
                      translate="no"
                    >
                      {q === '1st' ? t('dangarMaster.filters.first') : 
                       q === '2nd' ? t('dangarMaster.filters.second') : 
                       q === '3rd' ? t('dangarMaster.filters.third') : q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-8 flex flex-col gap-1">
                <label className={`text-[10px] font-bold text-zinc-500 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`}>{t('dangarEntry.form.itemStructure')}</label>
                <div className="flex gap-2">
                  <div className="w-1/4">
                    <input
                      ref={itemCodeRef}
                      type="text"
                      placeholder={t('common.code')}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 outline-none text-xs font-bold text-zinc-700 uppercase focus:border-zinc-600 force-en notranslate" translate="no" lang="en"
                      value={items.find(i => i.id === parseInt(formData.item_id))?.item_code || ''}
                      onChange={(e) => handleItemCodeChange(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, itemCodeRef)}
                    />
                  </div>
                  <div className="w-3/4">
                    <select
                      ref={itemIdRef}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 outline-none text-xs text-zinc-800 focus:border-zinc-600 appearance-none font-bold font-prompt"
                      style={{ 
                        fontFamily: items.find(i => i.id === parseInt(formData.item_id))?.item_name_gu 
                          ? '"Noto Sans Gujarati", sans-serif' 
                          : "'Prompt', sans-serif" 
                      }}
                      value={formData.item_id}
                      onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, itemIdRef)}
                    >
                      <option value="" className="font-sans">{t('dangarEntry.form.selectResource')}</option>
                      {items.map(i => (
                        <option 
                          key={i.id} 
                          value={i.id} 
                          className={i.item_name_gu ? 'font-sans' : 'font-prompt'}
                          style={{ fontFamily: i.item_name_gu ? '"Noto Sans Gujarati", sans-serif' : "'Prompt', sans-serif" }}
                        >
                          {i.item_code} - {i.item_name_gu || i.item_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={`text-[10px] font-bold text-zinc-500 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`}>{t('dangarEntry.form.vehicle')}</label>
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
              <label className={`text-[10px] font-bold text-zinc-500 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : 'uppercase'}`}>{t('dangarEntry.form.remark')}</label>
              <textarea
                ref={remarkRef}
                className={`w-full px-3 py-1.5 bg-white border border-zinc-300 outline-none text-xs text-zinc-800 min-h-[70px] focus:border-zinc-600 transition ${i18n.language === 'gu' ? 'font-prompt' : ''}`}
                placeholder={t('dangarEntry.form.remarkPlaceholder')}
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                onKeyDown={(e) => handleKeyDown(e, remarkRef)}
              />
            </div>

            <div className="bg-zinc-100 border border-zinc-300 p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <select
                  className={`bg-white border border-zinc-300 px-2 py-1 outline-none text-[10px] font-bold uppercase tracking-wider text-zinc-700 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}
                  value={display_unit}
                  onChange={(e) => setDisplayUnit(e.target.value)}
                >
                  <option value="kg">{t('dangarEntry.units.kg')}</option>
                  <option value="man">{t('dangarEntry.units.man')}</option>
                  <option value="quintal">{t('dangarEntry.units.quintal')}</option>
                </select>
                <span className={`text-[10px] font-bold uppercase tracking-widest text-zinc-500 notranslate ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`} translate="no">{t('dangarEntry.form.metric')}</span>
              </div>
              <div className={`flex items-center gap-2 text-xs font-bold font-mono ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}>
                <span className="text-zinc-500">{t('dangarEntry.form.volume')}:</span>
                <span className="text-zinc-800 notranslate" translate="no">{display_unit === 'man' ? formData.total_man : (display_unit === 'quintal' ? formData.gross_quintal : formData.total_kg)} <span className="text-[10px] uppercase">{display_unit}</span></span>
                <span className="text-zinc-400 font-normal">x</span>
                <span className="text-zinc-800 notranslate" translate="no">₹{display_unit === 'man' ? (parseFloat(formData.rate) / 5).toFixed(2) : (display_unit === 'quintal' ? parseFloat(formData.rate).toFixed(2) : (parseFloat(formData.rate) / 100).toFixed(2))}</span>
                <span className="text-zinc-400 font-normal">=</span>
                <span className="text-base text-blue-600 font-black notranslate" translate="no">₹{formData.gross_amount}</span>
              </div>
            </div>
          </div>

          {/* Side Panel: Calculations & Matrix */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* Weights Matrix */}
            <div className="bg-zinc-50 border border-zinc-300 flex flex-col h-[400px] select-none">
              <div className="p-3 border-b border-zinc-300 bg-zinc-100 flex items-center justify-between">
                <span className={`text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}>
                  <Calculator size={15} /> {t('dangarEntry.form.weightMatrix')}
                </span>
                <button
                  onClick={handleAddRow}
                  className="p-1 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm text-blue-600 hover:text-blue-700 select-none"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 select-none bg-white">
                <div className={`grid grid-cols-12 gap-3 text-[10px] font-bold text-zinc-400 font-mono uppercase notranslate ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`} translate="no">
                  <div className="col-span-2 text-center">#</div>
                  <div className="col-span-10">{t('dangarEntry.form.entryVolume')}</div>
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
                        className="w-full bg-white border border-zinc-300 rounded-none px-3 py-1.5 text-xs font-mono font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-600 transition-all select-none force-en notranslate" translate="no" lang="en"
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
                <p className={`text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}>{t('dangarEntry.stats.grossVol')}</p>
                <p className="text-xl font-bold font-mono text-zinc-800 leading-none notranslate" translate="no">
                  {formData.total_kg} <span className="text-[10px] font-bold text-zinc-400 uppercase">KG</span>
                </p>
              </div>
            </div>

            {/* Overall Calculation Manifest Summary */}
            <div className="bg-white border border-zinc-300 p-4 space-y-4 flex-1">
              <h3 className={`text-xs font-bold text-zinc-700 uppercase tracking-wider border-b border-zinc-200 pb-1.5 ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}>{t('dangarEntry.form.manifest')}</h3>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <p className={`text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono leading-none ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}>{t('dangarEntry.stats.bardanBal')}</p>
                  <input type="number" readOnly className="w-full bg-zinc-50 border border-zinc-300 p-1 font-mono font-bold text-zinc-700 outline-none text-xs cursor-not-allowed select-none notranslate" translate="no" value={formData.bardan} />
                  {selectedMember && (
                    <div className={`text-[8px] font-bold text-blue-600 uppercase ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}>{t('dangarEntry.stats.balan')}: <span className="notranslate" translate="no">{bardanBalance}</span></div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className={`text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono leading-none ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}>{t('dangarEntry.stats.netVol')}</p>
                  <input type="number" readOnly className="w-full bg-zinc-50 border border-zinc-300 p-1 font-mono font-bold text-zinc-700 outline-none text-xs cursor-not-allowed select-none notranslate" translate="no" value={formData.total_kg} />
                </div>
                <div className="space-y-1">
                  <p className={`text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono leading-none ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`}>{t('dangarEntry.stats.rateQt')}</p>
                  <input type="number" readOnly className="w-full bg-zinc-50 border border-zinc-300 p-1 font-mono font-bold text-zinc-700 outline-none text-xs cursor-not-allowed select-none notranslate" translate="no" value={formData.rate} />
                </div>
              </div>

              <div className="divide-y divide-zinc-200 font-mono border border-zinc-300">
                {[
                  { label: t('dangarEntry.stats.grossNetVol'), val: `${(formData.total_kg - formData.less_bardan).toFixed(2)} kg`, color: 'text-zinc-600' },
                  { label: t('dangarEntry.stats.grossAmount'), val: `₹${formData.gross_amount}`, color: 'text-blue-600 font-bold' },
                  { label: t('dangarEntry.stats.bardanWeightLess'), val: `- ${formData.less_bardan} kg`, color: 'text-red-500' },
                  { label: t('dangarEntry.stats.kapat'), val: `- ₹${formData.total_deduction}`, color: 'text-red-500' },
                  { label: t('dangarEntry.stats.bardanPenalty'), val: `- ₹${formData.remaining_bardan_deduction}`, color: 'text-red-600' },
                  { label: t('dangarEntry.stats.netPayable'), val: `₹${formData.amount}`, color: 'text-emerald-600 font-black', size: 'text-xl bg-zinc-50 p-3 flex justify-between' }
                ].map((calc, i) => (
                  <div key={i} className={`flex justify-between items-center p-2.5 ${calc.size ? 'border-t border-zinc-300 bg-zinc-50' : ''}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest text-zinc-400 notranslate ${i18n.language === 'gu' ? 'font-prompt uppercase-none' : ''}`} translate="no">{calc.label}</p>
                    <p className={`${calc.size || 'text-xs'} font-bold ${calc.color} notranslate`} translate="no">{calc.val}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold transition rounded-none uppercase flex items-center justify-center gap-2 py-3 text-xs select-none mt-2 shadow-sm"
              >
                <Save size={16} /> {t('dangarEntry.form.saveNode')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DangarEntry;
