import React, { useState, useEffect, useRef } from 'react';
import {
  Database, Plus, Trash2, Printer,
  Save, Search, X, RefreshCcw,
  Calendar, Info, AlertCircle, FileText,
  User, Box, Calculator, Truck,
  CheckCircle, History, Edit3, ChevronRight, Eye,
  TrendingDown, CreditCard, TrendingUp, Package, Shield, Loader, Filter
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

const DangarEntry = () => {/*  */
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isGu = i18n.language === 'gu';
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
  const [showHistoryFiltersDrawer, setShowHistoryFiltersDrawer] = useState(false);
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

  const displayMemberName = (member = {}) => {
    if (!member) return '';
    const engCandidates = [member.eng_name, member.name_en, member.english_name, member.engName, member.member_name_en, member.member_name, member.name];
    const guCandidates = [member.member_name_gu, member.name_gu, member.member_name, member.name];

    if (isGu) {
      for (const c of guCandidates) if (c) return c;
      for (const c of engCandidates) if (c) return c;
      return '';
    }

    for (const c of engCandidates) if (c) return c;
    for (const c of guCandidates) if (c) return c;
    return '';
  };

  const displayItemName = (item = {}) => {
    if (!item) return '';
    const engCandidates = [item.item_name, item.name_en, item.name, item.eng_name, item.item_name_en];
    const guCandidates = [item.item_name_gu, item.name_gu, item.item_name];
    if (isGu) {
      for (const c of guCandidates) if (c) return c;
      for (const c of engCandidates) if (c) return c;
      return '';
    }
    for (const c of engCandidates) if (c) return c;
    for (const c of guCandidates) if (c) return c;
    return '';
  };

  const formatDisplayDate = (value) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formatted = `${day}/${month}/${year}`;
    if (isGu) {
      return formatted.replace(/[0-9]/g, d => {
        const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
        return guDigits[d] || d;
      });
    }
    return formatted;
  };

  const selectedItem = items.find(i => i.id === parseInt(formData.item_id));

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
      setMessage({ type: 'error', text: t('dangarEntry.messages.loadFailed') });
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

  const addGujaratiFontToDoc = async (doc) => {
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
        setMessage({ type: 'error', text: t('dangarEntry.messages.exportInfoRequired') });
        setLoading(false);
        return;
      }

      const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
      const toGujaratiDigits = (num) => {
        const value = String(num ?? '');
        return isGu ? value.replace(/[0-9]/g, d => guDigits[d] || d) : value;
      };

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
        <div style="border:5px solid #1d5f84; padding:30px; background:#fff; font-family:'Noto Sans Gujarati', sans-serif;">
          <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <tr>
              <td style="text-align:center; border-bottom:3px solid #1d5f84; padding-bottom:15px;">
                <div style="font-size:36px; font-weight:900; color:#1d5f84; font-family:'Prompt', sans-serif !important;">${cName}</div>
                <div style="font-size:22px; font-weight:700; color:#1e293b; margin-top:5px;">ડાંગેર પાકી પહોંચ</div>
              </td>
            </tr>
          </table>

          <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:16px;">
            <tr>
              <td style="width:65%; vertical-align:top;">
                <div style="color:#64748b; font-size:12px; font-weight:bold; text-transform:uppercase;">MEMBER / સભાસદ</div>
                <div style="font-size:26px; font-weight:900; color:#0f172a; margin:5px 0; font-family:'Prompt', sans-serif !important;">${memberObj?.member_name || '-'}</div>
                <div style="color:#1d5f84; font-weight:bold; font-family:Arial;">CODE: ${toGujaratiDigits(memberObj?.member_code || '-')}</div>
              </td>
              <td style="width:35%; text-align:right; vertical-align:top;">
                <div style="color:#64748b; font-size:12px; font-weight:bold; text-transform:uppercase;">DETAILS / વિગત</div>
                <div style="font-weight:bold; margin:5px 0; font-family:Arial;">DATE: ${toGujaratiDigits(new Date(data.date || data.entry_date).toLocaleDateString('en-GB'))}</div>
                <div style="color:#1d5f84; font-weight:bold; font-family:Arial;">BILL: #${data.srNo || data.sr_no}</div>
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
                  <div style="font-size:18px; font-weight:bold; color:#1d5f84;">${data.quality_class}</div>
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
                <table style="width:100%; border-collapse:collapse; background:#fff; border:2px solid #1d5f84;">
                  <tr style="background:#1d5f84; color:#fff;">
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
                  <tr style="background:#eff6ff; color:#1d5f84; font-size:20px; font-weight:900;">
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
      setMessage({ type: 'error', text: t('dangarEntry.messages.pdfFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleExportBardanPDF = async (record = null) => {
    setLoading(true);
    try {
      let data = record || formData;

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
        setMessage({ type: 'error', text: t('dangarEntry.messages.memberRequired') });
        setLoading(false);
        return;
      }

      const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
      const toGujaratiDigits = (num) => {
        const value = String(num ?? '');
        return isGu ? value.replace(/[0-9]/g, d => guDigits[d] || d) : value;
      };

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
                <div style="font-weight:900; font-size:22px; font-family:Arial; color:#1d5f84; margin-top:4px;">${toGujaratiDigits(w.weight || w.wgt)}</div>
              </td>
            `).join('')}
            ${Array(5 - chunk.length).fill('<td style="border-right:1px solid #e2e8f0; width:20%;"></td>').join('')}
          </tr>
        `;
      }

      tempWrap.innerHTML = `
        <div style="border:5px solid #1d5f84; padding:25px; background:#fff; font-family:'Noto Sans Gujarati', sans-serif;">
          <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <tr>
              <td style="text-align:center; border-bottom:3px solid #1d5f84; padding-bottom:15px;">
                <div style="font-size:32px; font-weight:900; color:#1d5f84; font-family:'Prompt', sans-serif !important;">${cName}</div>
                <div style="font-size:20px; font-weight:700; color:#1e293b; margin-top:5px;">${reportTitle}</div>
              </td>
            </tr>
          </table>

          <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:16px;">
            <tr>
              <td style="width:60%; vertical-align:top;">
                <div style="color:#64748b; font-size:12px; font-weight:bold;">સભાસદ વિગત</div>
                <div style="font-size:24px; font-weight:900; color:#0f172a; margin:5px 0; font-family:'Noto Sans Gujarati', sans-serif !important;">${memberObj?.member_name || '-'}</div>
                <div style="color:#1d5f84; font-weight:bold; font-family:Arial, sans-serif !important;">કોડ: ${toGujaratiDigits(memberObj?.member_code || '-')}</div>
              </td>
              <td style="width:40%; text-align:right; vertical-align:top;">
                <div style="color:#64748b; font-size:12px; font-weight:bold;">એન્ટ્રી વિગત</div>
                <div style="font-weight:bold; margin:5px 0; font-family:Arial, sans-serif !important;">તારીખ: ${toGujaratiDigits(new Date(data.entry_date || data.date).toLocaleDateString('en-GB'))}</div>
                <div style="color:#1d5f84; font-weight:bold; font-family:Arial, sans-serif !important;">SR: #${data.sr_no || data.srNo}</div>
              </td>
            </tr>
          </table>

          <div style="background:#f1f5f9; padding:15px; border-left:6px solid #1d5f84; margin-bottom:25px;">
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
                <div style="font-size:32px; font-weight:900; color:#1d5f84; font-family:Arial, sans-serif;">${toGujaratiDigits(record ? record.total_kg : data.total_kg)} <span style="font-size:16px;">KG</span></div>
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
      setMessage({ type: 'error', text: t('dangarEntry.messages.bardanSlipFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleExportBardanSummaryPDF = async () => {
    if (history.length === 0) {
      setMessage({ type: 'error', text: t('dangarEntry.messages.noHistoryToExport') });
      return;
    }

    setLoading(true);
    try {
      const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
      const toGujaratiDigits = (num) => {
        const value = String(num ?? '');
        return isGu ? value.replace(/[0-9]/g, d => guDigits[d] || d) : value;
      };
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
          <div style="margin-bottom:20px; border:1px solid #1d5f84; break-inside:avoid;">
            <div style="background:#eff6ff; padding:10px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1d5f84;">
              <div>
                <span style="font-weight:900; font-size:16px;">${row.member_name}</span>
                <span style="margin-left:15px; color:#1d5f84; font-weight:bold; font-family:Arial;">(CODE: ${toGujaratiDigits(row.member_code)})</span>
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

            <div style="background:#f8fafc; padding:10px; border-top:1px solid #1d5f84; display:flex; justify-content:flex-end; gap:30px;">
              <div><span style="font-size:11px; color:#64748b;">TOTAL BARDAN:</span> <span style="font-weight:900; font-family:Arial;">${toGujaratiDigits(row.returned_bags)}</span></div>
              <div><span style="font-size:11px; color:#64748b;">TOTAL WEIGHT:</span> <span style="font-weight:900; font-family:Arial; color:#1d5f84;">${toGujaratiDigits(row.total_kg)} KG</span></div>
            </div>
          </div>
        `;
      }).join('');

      tempWrap.innerHTML = `
        <div style="font-family:'Noto Sans Gujarati', sans-serif; color:#1e293b;">
          <div style="text-align:center; border-bottom:4px solid #1d5f84; padding-bottom:20px; margin-bottom:30px;">
            <div style="font-size:36px; font-weight:900; color:#1d5f84; font-family:'Prompt', sans-serif !important;">${cName}</div>
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
      setMessage({ type: 'error', text: t('dangarEntry.messages.reportFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleExportHistoryPDF = async () => {
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
      const toGujaratiDigits = (num) => {
        const value = String(num ?? '');
        return isGu ? value.replace(/[0-9]/g, d => guDigits[d] || d) : value;
      };

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
        <div style="border:2px solid #1d5f84; border-radius:0;">
          <div style="background:#1d5f84;color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;">
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
      setMessage({ type: 'error', text: t('dangarEntry.messages.pdfFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleExportAllBardanSlipsPDF = async () => {
    if (history.length === 0) {
      setMessage({ type: 'error', text: t('dangarEntry.messages.noHistoryRecords') });
      return;
    }

    setLoading(true);
    try {
      const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
      const toGujaratiDigits = (num) => {
        const value = String(num ?? '');
        return isGu ? value.replace(/[0-9]/g, d => guDigits[d] || d) : value;
      };
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
          <div style="border:4px solid #1d5f84; padding:30px; font-family:'Noto Sans Gujarati', sans-serif;">
            <div style="text-align:center; border-bottom:3px solid #1d5f84; padding-bottom:15px; margin-bottom:20px;">
              <div style="font-size:36px; font-weight:900; color:#1d5f84; font-family:'Prompt', sans-serif !important;">${cName}</div>
              <div style="font-size:22px; font-weight:700; color:#1e293b;">બારદાન જમા સ્લિપ</div>
            </div>

            <table style="width:100%; margin-bottom:20px;">
              <tr>
                <td style="width:60%;">
                  <div style="color:#64748b; font-size:12px; font-weight:bold;">સભાસદ</div>
                  <div style="font-size:26px; font-weight:900; color:#0f172a;">${row.member_name}</div>
                  <div style="color:#1d5f84; font-weight:bold; font-family:Arial;">CODE: ${toGujaratiDigits(row.member_code)}</div>
                </td>
                <td style="width:40%; text-align:right;">
                  <div style="color:#64748b; font-size:12px; font-weight:bold;">એન્ટ્રી વિગત</div>
                  <div style="font-weight:bold; font-family:Arial;">તારીખ: ${toGujaratiDigits(new Date(row.entry_date).toLocaleDateString('en-GB'))}</div>
                  <div style="color:#1d5f84; font-weight:bold; font-family:Arial;">SR: #${row.sr_no}</div>
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
                  <div style="font-size:36px; font-weight:900; color:#1d5f84; font-family:Arial;">${toGujaratiDigits(row.total_kg)} KG</div>
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
      setMessage({ type: 'error', text: t('dangarEntry.messages.bulkExportFailed') });
    } finally {
      setLoading(false);
    }
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
    const toGujaratiDigits = (num) => {
      const value = String(num ?? '');
      return isGu ? value.replace(/[0-9]/g, d => guDigits[d] || d) : value;
    };

    const totalQt = filteredHistory.reduce((s, r) => s + parseFloat(r.net_quintal || 0), 0);
    const rows = filteredHistory.map((row, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
        <td style="font-family:Arial, sans-serif; padding:10px;">${toGujaratiDigits(new Date(row.entry_date).toLocaleDateString('en-GB'))}</td>
        <td style="font-family:Arial, sans-serif; padding:10px;" translate="no">#${String(row.sr_no || '')}<br/><span style="font-size:9px;color:#94a3b8">${t('dangarEntry.form.' + row.book_type.toLowerCase()) || row.book_type}</span></td>
        <td style="padding:10px;"><strong style="font-family:'Prompt', sans-serif;">${row.member_name}</strong><br/><span style="font-size:9px;color:#94a3b8">${t('memberMaster.code') || 'CODE'}: ${toGujaratiDigits(row.member_code)}</span></td>
        <td style="font-family:'Prompt', sans-serif; padding:10px;">${row.item_name || '-'}</td>
        <td style="font-family:Arial, sans-serif; padding:10px;">${row.quality_class === '1st' ? t('dangarMaster.filters.first') : row.quality_class === '2nd' ? t('dangarMaster.filters.second') : row.quality_class === '3rd' ? t('dangarMaster.filters.third') : toGujaratiDigits(row.quality_class || '1st')}</td>
        <td style="font-family:Arial, sans-serif; padding:10px;">${row.vehicle_no || '-'}</td>
        <td style="text-align:right;font-family:Arial, sans-serif; padding:10px;">${toGujaratiDigits(parseFloat(row.net_quintal || 0).toFixed(2))} ${t('dangarMaster.table.unit')}</td>
      </tr>`);
    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.write(`<html><head><title>${cName} - ${t('dangarEntry.historyTitle')}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:10px;color:#1e293b;padding:20px}
        .logo-bar{background:#1d5f84;color:#fff;padding:10px 18px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
        .logo-bar h1{font-size:13px;font-weight:900;font-family:'Prompt', sans-serif;}.logo-bar span{font-size:9px;color:#cbd5e1}
        h2{font-size:18px;font-weight:900;margin-bottom:2px}
        p.sub{font-size:9px;color:#64748b;margin-bottom:10px}
        hr{border:none;border-top:1px solid #cbd5e1;margin:8px 0}
        table{width:100%;border-collapse:collapse}
        thead tr{background:#1d5f84;color:#fff}
        th{padding:10px 8px;font-size:9px;font-weight:700;text-transform:uppercase;text-align:left}
        td{padding:8px 8px;border-bottom:1px solid #f1f5f9;font-size:9px}
        tfoot tr{background:#1e293b;color:#fff;font-weight:700}
        @media print{@page{size:A4 portrait;margin:1.5cm}}
      </style></head><body>
      <div class='logo-bar'><h1>${cName}</h1><span>${t('dangarEntry.historyTitle')} &nbsp;|&nbsp; ${toGujaratiDigits(new Date().toLocaleDateString('en-IN'))}</span></div>
      <h2>${t('dangarEntry.historyTitle')}</h2>
      <p class='sub'>${t('common.records')}: ${toGujaratiDigits(filteredHistory.length)} &nbsp;|&nbsp; ${t('dangarMaster.pdfReport.generated')}: ${toGujaratiDigits(new Date().toLocaleString('en-IN'))}</p>
      ${historyFilters.startDate || historyFilters.fromMember ? `<p class='sub'>${t('dangarEntry.historyFilter')}: ${toGujaratiDigits(historyFilters.startDate || '--')} થી ${toGujaratiDigits(historyFilters.endDate || '--')} | ${t('dangarEntry.historyMemberRange')}: ${toGujaratiDigits(historyFilters.fromMember || '--')} થી ${toGujaratiDigits(historyFilters.toMember || '--')}</p>` : ''}
      <hr/>
      <table>
        <thead><tr><th>${t('common.date')}</th><th>${t('common.billNumber')}</th><th>${t('dangarEntry.form.memberNode')}</th><th>${t('dangarEntry.form.itemStructure')}</th><th>${t('dangarEntry.form.qualityVector')}</th><th>${t('dangarEntry.form.vehicle')}</th><th style='text-align:right'>${t('dangarEntry.stats.netVol')}</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
        <tfoot><tr><td style="padding:10px;" colspan='6'>${t('dangarMaster.table.totals')} &mdash; ${toGujaratiDigits(filteredHistory.length)} ${t('common.records')}</td><td style='text-align:right; padding:10px;'>${toGujaratiDigits(totalQt.toFixed(2))} ${t('dangarMaster.table.unit')}</td></tr></tfoot>
      </table></body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
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
      setMessage({ type: 'error', text: t('dangarEntry.messages.validationRequired') });
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
        setMessage({
          type: 'success',
          text: id
            ? t('dangarEntry.messages.updateSuccess')
            : t('dangarEntry.messages.createSuccess', { srNo: res.data.data.srNo })
        });

        handleExportSlipPDF(res.data.data);

        if (!id) resetForm();
        setTimeout(() => {
          setMessage(null);
          if (id) navigate('/dangar-master');
        }, 2000);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: t('dangarEntry.messages.commitFailed', { error: error.response?.data?.error || error.message })
      });
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
      setMessage({ type: 'error', text: t('dangarEntry.messages.historyLoadFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Decommission this transaction node?')) return;
    try {
      await dangarEntryApi.delete(id);
      setMessage({ type: 'success', text: t('dangarEntry.messages.deleteSuccess') });
      if (showHistory) loadHistory();
    } catch (error) {
      setMessage({ type: 'error', text: t('dangarEntry.messages.deleteFailed') });
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
    const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
    const toGujaratiDigits = (num) => {
      const value = String(num ?? '');
      return isGu ? value.replace(/[0-9]/g, d => guDigits[d] || d) : value;
    };

    // Timezone-safe date formatter — parses YYYY-MM-DD directly to avoid local offset shifts
    const formatDisplayDate = (value) => {
      if (!value) return '--';
      const dateStr = String(value).split(/[T ]/)[0]; // e.g. "2026-05-16"
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        const formatted = `${day}/${month}/${year}`;
        return isGu ? formatted.replace(/[0-9]/g, d => guDigits[d] || d) : formatted;
      }
      return value;
    };

    const displayMemberName = (row) => {
      if (!row) return '—';
      const engCandidates = [row.eng_name, row.name_en, row.english_name, row.engName, row.member_name_en, row.member_name, row.name];
      const guCandidates = [row.member_name_gu, row.name_gu, row.member_name, row.name];
      if (isGu) {
        for (const c of guCandidates) if (c) return c;
        for (const c of engCandidates) if (c) return c;
        return '—';
      }
      for (const c of engCandidates) if (c) return c;
      for (const c of guCandidates) if (c) return c;
      return '—';
    };

    const totalVolume = filteredHistory.reduce((acc, row) => acc + (parseFloat(row.net_quintal || 0) * 5), 0);
    const totalNetVol = filteredHistory.reduce((acc, row) => acc + parseFloat(row.net_quintal || 0), 0);
    const hasActiveFilters = !!historyFilters.startDate || !!historyFilters.endDate || !!historyFilters.fromMember || !!historyFilters.toMember;
    const numberTextClass = isGu ? 'font-prompt-sm' : 'force-en notranslate';

    return (
      <div className="min-h-screen bg-slate-50 font-sans select-none text-slate-800 pb-12">
        <Toast message={message} onClose={() => setMessage(null)} />

        <div className="max-w-[1600px] mx-auto px-4 py-4">
          {/* Polished Ledger Statement Registry Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col min-h-[600px] relative shadow-none">

            {/* Table Header Bar */}
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-extrabold text-slate-800 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                  {t('dangarEntry.pdf.historyTitle') || 'Transaction History'}
                </span>
                <span className="bg-slate-200 text-slate-600 font-bold force-en text-[9px] px-1.5 py-0.5 rounded-sm">
                  {toGujaratiDigits(filteredHistory.length)} {t('villageMaster.records') || "Records"}
                </span>
                {hasActiveFilters && (
                  <span className="px-1.5 py-0.5 text-[9px] bg-amber-50 text-amber-600 border border-amber-100 rounded-md font-bold uppercase">
                    {t('dangarEntry.historyFiltersActive') || "Filters Active"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Slide-In Filters Drawer Trigger Button */}
                <button
                  onClick={() => setShowHistoryFiltersDrawer(true)}
                  className={`h-7 flex items-center gap-1.5 px-2.5 text-[11px] font-bold transition-all rounded-md cursor-pointer relative select-none shadow-none border ${hasActiveFilters
                    ? 'bg-blue-50 border-blue-200 text-[#1d5f84] hover:bg-blue-100/70'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                >
                  <Filter size={12} className={hasActiveFilters ? "text-[#1d5f84]" : "text-slate-400"} />
                  <span className="uppercase tracking-wider">{t('sabhasadLedgerSummary.filters') || "Filters"}</span>
                  {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
                    </span>
                  )}
                </button>
                <button
                  onClick={handleHistoryPrint}
                  title={t('common.print') || "Print"}
                  className="h-7 w-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none select-none"
                >
                  <Printer size={12} className="text-slate-400" />
                </button>
                <button
                  onClick={handleExportHistoryPDF}
                  title={t('common.pdf') || "PDF"}
                  className="h-7 w-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none select-none"
                >
                  <FileText size={12} className="text-slate-400" />
                </button>
                <button
                  onClick={loadHistory}
                  disabled={loading}
                  title={t('sabhasadLedgerSummary.refreshRegistry') || "Refresh"}
                  className="h-7 w-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md shadow-none cursor-pointer disabled:opacity-50"
                >
                  <RefreshCcw size={12} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] relative">
              <table className="w-full text-left border-collapse select-none">
                <thead className="sticky top-0 bg-slate-50 z-30 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                    <th className="px-3 py-2.5 border-r border-slate-100 w-12 text-center">{t('sabhasadLedgerSummary.srNo') || "Sr. No."}</th>
                    <th className="px-3 py-2.5 border-r border-slate-100">{t('common.date')}</th>
                    <th className="px-3 py-2.5 border-r border-slate-100">{t('common.billNumber')}</th>
                    <th className="px-3 py-2.5 border-r border-slate-100 min-w-[200px]">{t('dangarEntry.form.memberNode')}</th>
                    <th className="px-3 py-2.5 border-r border-slate-100 text-center">{t('dangarEntry.form.qualityVector')}</th>
                    <th className="px-3 py-2.5 border-r border-slate-100 text-right">{t('dangarEntry.form.volume')}</th>
                    <th className="px-3 py-2.5 border-r border-slate-100 text-right">{t('dangarEntry.stats.netVol')}</th>
                    <th className="px-3 py-2.5 text-center">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-sans text-xs">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-24 text-center text-slate-400 font-bold text-xs tracking-wider bg-slate-50/20">
                        <Database size={32} className="mx-auto mb-2 opacity-40 text-[#1d5f84]" />
                        {t('sabhasadLedgerSummary.noSabhasadRecordsFound') || "No transaction records found."}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredHistory.map((row, idx) => {
                        return (
                          <tr key={row.id} className="hover:bg-slate-50/75 transition-colors border-b border-slate-100">
                            <td className={`px-3 py-1.5 text-[10px] text-slate-400 border-r border-slate-100 font-medium text-center ${numberTextClass}`} translate="no">
                              {String(idx + 1).padStart(3, '0')}
                            </td>
                            <td
                              className={`px-3 py-1.5 border-r border-slate-100 font-bold text-slate-800 ${isGu ? '' : 'font-mono'}`}
                              style={isGu ? { fontFamily: "'Noto Sans Gujarati','NotoGujarati',sans-serif", fontSize: '13px' } : {}}
                              translate="no"
                            >
                              {formatDisplayDate(row.entry_date)}
                            </td>
                            <td className="px-3 py-1.5 border-r border-slate-100">
                              <span className="text-[#1d5f84] font-bold font-sans" translate="no">#{String(row.sr_no || '')}</span>
                              <p className={`text-[10px] text-slate-400 font-bold mt-0.5 ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>{t('dangarEntry.form.' + row.book_type.toLowerCase()) || row.book_type}</p>
                            </td>
                            <td className="px-3 py-1.5 border-r border-slate-100 leading-tight font-bold text-slate-800" style={{ fontFamily: "'Noto Sans Gujarati','NotoGujarati','Prompt',sans-serif" }}>
                              {(() => {
                                const primary = displayMemberName(row);
                                const primaryNode = primary ? (isGu ? formatBilingualText(primary) : primary) : '—';
                                const secondaryRaw = isGu ? (row.eng_name || row.member_name) : (row.member_name_gu || row.member_name);
                                const secondaryNode = secondaryRaw && secondaryRaw !== primary ? (isGu ? formatBilingualText(secondaryRaw) : secondaryRaw) : null;
                                return (
                                  <div className="flex flex-col gap-0.5">
                                    <span translate="no">{primaryNode}</span>
                                    {secondaryNode && (
                                      <span className="text-[9px] text-slate-400 uppercase font-mono tracking-wider font-semibold" translate="no">{secondaryNode}</span>
                                    )}
                                    <p className={`text-[10px] text-slate-400 mt-0.5 font-bold ${i18n.language === 'gu' ? '' : 'font-sans uppercase'}`}>
                                      {t('memberMaster.code') || 'CODE'}: <span className={numberTextClass} translate="no">{toGujaratiDigits(row.member_code)}</span>
                                    </p>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-1.5 border-r border-slate-100 text-center">
                              <span className={`px-2 py-0.5 text-[10px] font-bold border notranslate rounded-md ${i18n.language === 'gu' ? 'font-prompt-sm' : ''} ${row.quality_class === '1st' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : row.quality_class === '2nd' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-rose-50 border-rose-200 text-rose-600'}`} translate="no">
                                {row.quality_class === '1st' ? t('dangarMaster.filters.first') :
                                  row.quality_class === '2nd' ? t('dangarMaster.filters.second') :
                                    row.quality_class === '3rd' ? t('dangarMaster.filters.third') : toGujaratiDigits(row.quality_class || '1st')}
                              </span>
                            </td>
                            <td className={`px-3 py-1.5 border-r border-slate-100 text-right font-bold text-amber-600 text-[11px] ${numberTextClass}`} translate="no">
                              {toGujaratiDigits((parseFloat(row.net_quintal) * 5).toFixed(2))}
                            </td>
                            <td className={`px-3 py-1.5 border-r border-slate-100 text-right font-bold text-slate-800 text-[11px] ${numberTextClass}`} translate="no">
                              {toGujaratiDigits(parseFloat(row.net_quintal).toFixed(2))}
                            </td>
                            <td className="px-3 py-1.5 text-center space-x-1 flex items-center justify-center">
                              <button onClick={() => handleExportSlipPDF(row)} className="p-1 border border-slate-200 bg-white hover:bg-slate-50 text-[#1d5f84] hover:text-[#154662] transition rounded cursor-pointer" title="Transaction Slip"><FileText size={12} /></button>
                              <button onClick={() => handleExportBardanPDF(row)} className="p-1 border border-slate-200 bg-white hover:bg-slate-50 text-emerald-600 hover:text-emerald-700 transition rounded cursor-pointer" title="Bardan Receipt"><Package size={12} /></button>
                              <button onClick={() => handleDelete(row.id)} className="p-1 border border-slate-200 bg-white hover:bg-slate-50 text-rose-600 hover:text-rose-700 transition rounded cursor-pointer" title="Delete record"><Trash2 size={12} /></button>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Grand totals footer row */}
                      <tr className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wide border-t border-b border-slate-300 sticky bottom-0 z-20">
                        <td colSpan="5" className="px-3 py-2 text-right font-black border-r border-slate-200 text-slate-700">
                          {t('sabhasadLedgerSummary.totals') || "Totals"}:
                        </td>
                        <td className={`px-3 py-2 text-right text-[11px] tracking-tighter text-[#1d5f84] font-bold border-r border-slate-200 ${numberTextClass}`} translate="no">
                          {toGujaratiDigits(totalVolume.toFixed(2))}
                        </td>
                        <td className={`px-3 py-2 text-right text-[11px] tracking-tighter text-[#1d5f84] font-bold border-r border-slate-200 ${numberTextClass}`} translate="no">
                          {toGujaratiDigits(totalNetVol.toFixed(2))}
                        </td>
                        <td className="px-3 py-2"></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modern Slide-Out Filters Drawer (WOW design with animation in & out) */}
        <div className={`fixed inset-0 z-[100] overflow-hidden ${showHistoryFiltersDrawer ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          {/* Backdrop Blur Overlay */}
          <div
            className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px] transition-opacity duration-300 ${showHistoryFiltersDrawer ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setShowHistoryFiltersDrawer(false)}
          />

          {/* Drawer Panel Container */}
          <div className={`fixed inset-y-0 right-0 max-w-full flex pl-10 transform transition-transform duration-300 ease-in-out ${showHistoryFiltersDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="w-screen max-w-sm bg-white border-l border-slate-200 flex flex-col shadow-none">

              {/* Drawer Title Bar */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 select-none">
                  <Filter size={14} className="text-[#1d5f84]" />
                  <span className={`text-xs font-bold text-slate-800 uppercase tracking-wide ${isGu ? 'font-prompt-sm' : ''}`}>
                    {t('sabhasadLedgerSummary.filters') || "Filters"}
                  </span>
                </div>
                <button
                  onClick={() => setShowHistoryFiltersDrawer(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Scrollable Filters Form */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {/* Date range inputs */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {t('dangarEntry.historyFilter') || "Date Filter"}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold uppercase ${isGu ? 'font-prompt-sm' : ''}`}>{t('common.from') || 'From'}</span>
                      <input
                        type="date"
                        value={historyFilters.startDate}
                        onChange={e => setHistoryFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-10 pr-2 py-1.5 text-xs text-slate-700 font-bold outline-none w-full ${numberTextClass}`}
                        translate="no"
                      />
                    </div>
                    <div className="relative">
                      <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold uppercase ${isGu ? 'font-prompt-sm' : ''}`}>{t('common.to') || 'To'}</span>
                      <input
                        type="date"
                        value={historyFilters.endDate}
                        onChange={e => setHistoryFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-6 pr-2 py-1.5 text-xs text-slate-700 font-bold outline-none w-full ${numberTextClass}`}
                        translate="no"
                      />
                    </div>
                  </div>
                </div>

                {/* Member range inputs */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {t('dangarEntry.historyMemberRange') || "Member Range"}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold uppercase ${isGu ? 'font-prompt-sm' : ''}`}>{t('common.from') || 'From'}</span>
                      <input
                        type="text"
                        placeholder={t('common.code') || 'Code'}
                        value={historyFilters.fromMember}
                        onChange={e => setHistoryFilters(prev => ({ ...prev, fromMember: e.target.value }))}
                        className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-10 pr-2 py-1.5 text-xs text-slate-700 font-bold outline-none w-full ${numberTextClass}`}
                        translate="no"
                      />
                    </div>
                    <div className="relative">
                      <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold uppercase ${isGu ? 'font-prompt-sm' : ''}`}>{t('common.to') || 'To'}</span>
                      <input
                        type="text"
                        placeholder={t('common.code') || 'Code'}
                        value={historyFilters.toMember}
                        onChange={e => setHistoryFilters(prev => ({ ...prev, toMember: e.target.value }))}
                        className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-6 pr-2 py-1.5 text-xs text-slate-700 font-bold outline-none w-full ${numberTextClass}`}
                        translate="no"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
                <button
                  onClick={() => setHistoryFilters({ startDate: '', endDate: '', fromMember: '', toMember: '' })}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition cursor-pointer text-center"
                >
                  {t('common.clear') || "Clear All"}
                </button>
                <button
                  onClick={() => setShowHistoryFiltersDrawer(false)}
                  className="flex-1 py-2 text-xs font-bold text-white bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] rounded-md transition cursor-pointer text-center"
                >
                  {t('common.apply') || "Apply"}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800 select-none animate-none pb-12">
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="max-w-[1600px] mx-auto space-y-4">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Left panel: main form inputs */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg flex flex-col shadow-none overflow-hidden">

            {/* Form Section Header with Actions */}
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className={`text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                {id ? t('dangarEntry.form.updateNode') : t('dangarEntry.title')}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={loadHistory}
                  className={`flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-md cursor-pointer select-none transition ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}
                >
                  <History size={13} /> {t('common.history')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className={`flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-md cursor-pointer select-none transition ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}
                >
                  <X size={13} /> {t('common.reset')}
                </button>
                <button
                  type="button"
                  onClick={() => handleExportBardanPDF()}
                  className={`flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-md cursor-pointer select-none transition ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}
                >
                  <Package size={13} /> {t('dangarEntry.pdf.bardanDepositSlip') || 'Bardan Slip'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className={`flex items-center gap-1.5 bg-[#1d5f84] hover:bg-[#154662] text-white text-[11px] font-bold px-4 py-2 rounded-md transition shadow-none select-none cursor-pointer ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}
                >
                  {id ? <Edit3 size={14} /> : <Save size={14} />}
                  {id ? t('dangarEntry.form.updateNode') : t('dangarEntry.form.commitEntry')}
                </button>
              </div>
            </div>

            <div className="p-5 flex flex-col gap-5">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Book Type */}
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                    {t('dangarEntry.form.bookType') || 'Book Type'}
                  </label>
                  <select
                    ref={bookTypeRef}
                    value={formData.bookType}
                    onChange={(e) => setFormData({ ...formData, bookType: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, bookTypeRef)}
                    className={`w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md outline-none text-xs text-slate-700 font-bold cursor-pointer ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}
                  >
                    <option value="Tuver">{t('dangarEntry.form.tuver')}</option>
                    <option value="Dangar">{t('dangarEntry.form.dangar')}</option>
                    <option value="Divela">{t('dangarEntry.form.divela')}</option>
                  </select>
                </div>

                {/* SR Number */}
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                    {t('dangarEntry.form.srNumber') || 'SR Number'}
                  </label>
                  <div className="flex items-center h-[31px] px-3 bg-slate-50 border border-slate-200 rounded-md font-mono text-xs select-none">
                    <span className={`font-bold tracking-widest notranslate ${formData.srNo === 'AUTO' ? 'text-slate-400 font-prompt-sm' : 'text-[#1d5f84]'}`} translate="no">
                      {formData.srNo === 'AUTO' ? t('dangarEntry.form.auto') : `#${formData.srNo}`}
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                    {t('dangarEntry.form.entryDate') || 'Entry Date'}
                  </label>
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
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md outline-none text-xs text-slate-700 font-mono font-bold cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Season switcher */}
                <div className="md:col-span-4 flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                    {t('dangarEntry.form.protocolSeason') || 'Season'}
                  </label>
                  <div className="flex p-0.5 bg-slate-100 border border-slate-200 rounded-md gap-0.5">
                    {['winter', 'summer'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, season: s }))}
                        className={`flex-1 py-1 text-[10px] font-extrabold uppercase rounded transition cursor-pointer ${formData.season === s
                          ? 'bg-white text-slate-800 shadow-xs'
                          : 'text-slate-400 hover:text-slate-600'
                          } ${i18n.language === 'gu' ? 'font-prompt-sm' : ''} notranslate`}
                        translate="no"
                      >
                        {t(`dangarEntry.form.${s}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Member Auto-complete selector */}
                <div className="md:col-span-8 flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                    {t('dangarEntry.form.memberNode') || 'Member Node'}
                  </label>
                  <div className="flex gap-2">
                    <div className="w-1/4">
                      <input
                        ref={memberCodeRef}
                        type="text"
                        placeholder={t('common.code')}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md outline-none text-xs font-mono font-bold text-slate-700 uppercase force-en notranslate" translate="no" lang="en"
                        value={selectedMember?.member_code || ''}
                        onChange={(e) => handleMemberCodeChange(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, memberCodeRef)}
                      />
                    </div>
                    <div className="w-3/4">
                      <select
                        ref={memberIdRef}
                        className={`w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md outline-none text-xs text-slate-700 font-bold cursor-pointer ${isGu ? 'font-prompt-sm' : 'font-sans'}`}
                        style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : undefined}
                        value={formData.member_id}
                        onChange={(e) => handleMemberChange(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, memberIdRef)}
                      >
                        <option value="" className={isGu ? 'font-prompt-sm' : 'font-sans'}>
                          {t('dangarEntry.form.selectMember')}
                        </option>
                        {members.map(m => (
                          <option
                            key={m.id}
                            value={m.id}
                            className={isGu ? 'font-prompt-sm' : 'font-sans'}
                            style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : undefined}
                          >
                            {m.member_code} - {isGu ? formatBilingualText(displayMemberName(m)) : displayMemberName(m)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Quality Class */}
                <div className="md:col-span-4 flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                    {t('dangarEntry.form.qualityVector') || 'Quality Class'}
                  </label>
                  <div className="flex p-0.5 bg-slate-100 border border-slate-200 rounded-md gap-0.5">
                    {['1st', '2nd', '3rd'].map(q => (
                      <button
                        key={q}
                        ref={q === '1st' ? qualityClassRef : null}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, quality_class: q }))}
                        className={`flex-1 py-1 text-[10px] font-extrabold uppercase rounded transition cursor-pointer ${formData.quality_class === q
                          ? 'bg-white text-slate-800 shadow-xs'
                          : 'text-slate-400 hover:text-slate-600'
                          } ${i18n.language === 'gu' ? 'font-prompt-sm' : ''} notranslate`}
                        translate="no"
                      >
                        {q === '1st' ? t('dangarMaster.filters.first') :
                          q === '2nd' ? t('dangarMaster.filters.second') :
                            q === '3rd' ? t('dangarMaster.filters.third') : q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Item Auto-complete Selector */}
                <div className="md:col-span-8 flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                    {t('dangarEntry.form.itemStructure') || 'Item Structure'}
                  </label>
                  <div className="flex gap-2">
                    <div className="w-1/4">
                      <input
                        ref={itemCodeRef}
                        type="text"
                        placeholder={t('common.code')}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md outline-none text-xs font-mono font-bold text-slate-700 uppercase force-en notranslate" translate="no" lang="en"
                        value={items.find(i => i.id === parseInt(formData.item_id))?.item_code || ''}
                        onChange={(e) => handleItemCodeChange(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, itemCodeRef)}
                      />
                    </div>
                    <div className="w-3/4">
                      <select
                        ref={itemIdRef}
                        className={`w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md outline-none text-xs text-slate-700 font-bold cursor-pointer ${isGu ? 'font-sans' : 'font-sans'}`}
                        style={isGu && selectedItem?.item_name_gu
                          ? { fontFamily: '"Noto Sans Gujarati", sans-serif' }
                          : undefined
                        }
                        value={formData.item_id}
                        onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                        onKeyDown={(e) => handleKeyDown(e, itemIdRef)}
                      >
                        <option value="" className="font-sans">{t('dangarEntry.form.selectResource')}</option>
                        {items.map(i => (
                          <option
                            key={i.id}
                            value={i.id}
                            className={isGu && i.item_name_gu ? 'font-sans' : 'font-sans'}
                            style={isGu && i.item_name_gu ? { fontFamily: '"Noto Sans Gujarati", sans-serif' } : undefined}
                          >
                            {i.item_code} - {isGu ? formatBilingualText(displayItemName(i)) : displayItemName(i)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vehicle Number */}
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                    {t('dangarEntry.form.vehicle') || 'Vehicle'}
                  </label>
                  <input
                    ref={vehicleNoRef}
                    type="text"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md outline-none text-xs text-slate-700 font-mono font-bold"
                    placeholder="GJ-01-XX-1234"
                    value={formData.vehicleNo}
                    onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value.toUpperCase() })}
                    onKeyDown={(e) => handleKeyDown(e, vehicleNoRef)}
                  />
                </div>
              </div>

              {/* Remark */}
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                  {t('dangarEntry.form.remark') || 'Remark'}
                </label>
                <textarea
                  ref={remarkRef}
                  className={`w-full px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md outline-none text-xs text-slate-700 min-h-[70px] ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}
                  placeholder={t('dangarEntry.form.remarkPlaceholder')}
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  onKeyDown={(e) => handleKeyDown(e, remarkRef)}
                />
              </div>

              {/* Live calculation manifest strip */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <select
                    className={`bg-white border border-slate-200 hover:border-slate-300 transition rounded px-2 py-1 outline-none text-[10px] font-extrabold uppercase tracking-wider text-slate-600 cursor-pointer ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}
                    value={display_unit}
                    onChange={(e) => setDisplayUnit(e.target.value)}
                  >
                    <option value="kg">{t('dangarEntry.units.kg')}</option>
                    <option value="man">{t('dangarEntry.units.man')}</option>
                    <option value="quintal">{t('dangarEntry.units.quintal')}</option>
                  </select>
                  <span className={`text-[9px] font-bold uppercase tracking-widest text-slate-400 notranslate ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`} translate="no">{t('dangarEntry.form.metric') || 'Display Metric'}</span>
                </div>
                <div className={`flex items-center gap-2 text-xs font-bold font-mono ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">{t('dangarEntry.form.volume')}:</span>
                  <span className="text-slate-800 font-extrabold notranslate" translate="no">
                    {display_unit === 'man' ? formData.total_man : (display_unit === 'quintal' ? formData.gross_quintal : formData.total_kg)}
                    <span className="text-[9px] text-slate-400 uppercase ml-0.5">{display_unit}</span>
                  </span>
                  <span className="text-slate-300 font-normal">×</span>
                  <span className="text-slate-800 font-extrabold notranslate" translate="no">₹{display_unit === 'man' ? (parseFloat(formData.rate) / 5).toFixed(2) : (display_unit === 'quintal' ? parseFloat(formData.rate).toFixed(2) : (parseFloat(formData.rate) / 100).toFixed(2))}</span>
                  <span className="text-slate-300 font-normal">=</span>
                  <span className="text-sm text-[#1d5f84] font-black notranslate" translate="no">₹{formData.gross_amount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: weight matrix & manifest summary details */}
          <div className="lg:col-span-4 flex flex-col gap-4">

            {/* Weight Matrix grid */}
            <div className="bg-white border border-slate-200 rounded-lg flex flex-col h-[400px] select-none shadow-none">
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className={`text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                  <Calculator size={14} className="text-[#1d5f84]" />
                  {t('dangarEntry.form.weightMatrix') || 'Weight Matrix'}
                </span>
                <button
                  onClick={handleAddRow}
                  className="w-6 h-6 flex items-center justify-center border border-slate-200 bg-white hover:bg-slate-50 transition rounded-md text-[#1d5f84] hover:text-[#154662] select-none cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 select-none">
                <div className={`grid grid-cols-12 gap-3 text-[9px] font-bold text-slate-400 font-mono uppercase notranslate ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`} translate="no">
                  <div className="col-span-2 text-center">#</div>
                  <div className="col-span-10">{t('dangarEntry.form.entryVolume') || 'Bag Weight (KG)'}</div>
                </div>

                {weightRows.map((row, idx) => (
                  <div key={row.id} className="grid grid-cols-12 gap-2 items-center select-none">
                    <div className="col-span-2 text-center font-bold text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </div>
                    <div className="col-span-8 relative">
                      <input
                        id={`wgt-input-${idx}`}
                        type="number"
                        className="w-full bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] rounded-md px-3 py-1.5 text-xs font-mono font-bold text-slate-700 outline-none transition select-none force-en notranslate" translate="no" lang="en"
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
                        className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-rose-600 border border-slate-200 hover:border-rose-100 bg-white hover:bg-rose-50 transition rounded-md select-none cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center select-none rounded-b-lg">
                <p className={`text-[9px] font-bold uppercase tracking-widest text-slate-400 font-mono ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>{t('dangarEntry.stats.grossVol') || 'Gross Weight'}</p>
                <p className="text-base font-extrabold font-mono text-slate-800 leading-none notranslate" translate="no">
                  {formData.total_kg} <span className="text-[9px] font-bold text-slate-400 uppercase">KG</span>
                </p>
              </div>
            </div>

            {/* Calculations Breakdown card */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 flex-1 shadow-none">
              <h3 className={`text-xs font-extrabold text-slate-700 uppercase tracking-wider border-b border-slate-200 pb-1.5 ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>
                {t('dangarEntry.form.manifest') || 'Calculated Manifest'}
              </h3>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <p className={`text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono leading-none ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>{t('dangarEntry.stats.bardanBal') || 'Bardan'}</p>
                  <input type="number" readOnly className="w-full bg-slate-50 border border-slate-200 p-1 font-mono font-bold text-slate-700 outline-none text-xs rounded cursor-not-allowed select-none notranslate" translate="no" value={formData.bardan} />
                  {selectedMember && (
                    <div className={`text-[8px] font-bold text-[#1d5f84] uppercase ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>{t('dangarEntry.stats.balan') || 'Bal'}: <span className="notranslate" translate="no">{bardanBalance}</span></div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className={`text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono leading-none ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>{t('dangarEntry.stats.netVol') || 'Net Weight'}</p>
                  <input type="number" readOnly className="w-full bg-slate-50 border border-slate-200 p-1 font-mono font-bold text-slate-700 outline-none text-xs rounded cursor-not-allowed select-none notranslate" translate="no" value={formData.total_kg} />
                </div>
                <div className="space-y-1">
                  <p className={`text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono leading-none ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`}>{t('dangarEntry.stats.rateQt') || 'Rate'}</p>
                  <input type="number" readOnly className="w-full bg-slate-50 border border-slate-200 p-1 font-mono font-bold text-slate-700 outline-none text-xs rounded cursor-not-allowed select-none notranslate" translate="no" value={formData.rate} />
                </div>
              </div>

              <div className="divide-y divide-slate-100 font-mono border border-slate-200 rounded-lg overflow-hidden">
                {[
                  { label: t('dangarEntry.stats.grossNetVol') || 'Gross Net Wt', val: `${(formData.total_kg - formData.less_bardan).toFixed(2)} kg`, color: 'text-slate-600' },
                  { label: t('dangarEntry.stats.grossAmount') || 'Gross Amt', val: `₹${formData.gross_amount}`, color: 'text-[#1d5f84] font-bold' },
                  { label: t('dangarEntry.stats.bardanWeightLess') || 'Bardan Wt Less', val: `- ${formData.less_bardan} kg`, color: 'text-rose-500' },
                  { label: t('dangarEntry.stats.kapat') || 'Kapat', val: `- ₹${formData.total_deduction}`, color: 'text-rose-500' },
                  { label: t('dangarEntry.stats.bardanPenalty') || 'Bardan Penalty', val: `- ₹${formData.remaining_bardan_deduction}`, color: 'text-rose-600' },
                  { label: t('dangarEntry.stats.netPayable') || 'Net Payable', val: `₹${formData.amount}`, color: 'text-emerald-600 font-black', size: 'text-lg bg-slate-50/50 p-3 flex justify-between' }
                ].map((calc, i) => (
                  <div key={i} className={`flex justify-between items-center p-2.5 ${calc.size ? 'border-t border-slate-200 bg-slate-50' : ''}`}>
                    <p className={`text-[9px] font-bold uppercase tracking-widest text-slate-400 notranslate ${i18n.language === 'gu' ? 'font-prompt-sm' : ''}`} translate="no">{calc.label}</p>
                    <p className={`${calc.size || 'text-xs'} font-bold ${calc.color} notranslate`} translate="no">{calc.val}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-[#1d5f84] hover:bg-[#154662] text-white font-bold transition rounded-md uppercase flex items-center justify-center gap-2 py-3 text-xs select-none mt-2 shadow-none cursor-pointer"
              >
                <Save size={14} /> {t('dangarEntry.form.saveNode') || 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DangarEntry;
