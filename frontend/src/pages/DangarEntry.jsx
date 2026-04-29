import React, { useState, useEffect } from 'react';
import {
  Database, Plus, Trash2, Printer,
  Save, Search, X, RefreshCcw,
  Calendar, Info, AlertCircle, FileText,
  User, Box, Calculator, Truck,
  CheckCircle, History, Edit3, ChevronRight, Eye,
  TrendingDown, CreditCard, TrendingUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api, { sabhasadMasterApi, dangarEntryApi, bardanEntryApi } from '../api';

const DangarEntry = () => {
  const { t } = useTranslation();
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
  const [company, setCompany] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);
  const [bardanBalance, setBardanBalance] = useState(0);
  const [bardanPrice, setBardanPrice] = useState(0);
  const [seasons, setSeasons] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [display_unit, setDisplayUnit] = useState('quintal'); // kg, man, quintal

  const [deductions, setDeductions] = useState([]);
  const [deductionMasters, setDeductionMasters] = useState([]);

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

      // Fetch bardan balance for this member using their member_code
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
      // Fetch balances for active deductions
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
        // Load deductions for this company
        const dedRes = await api.get(`/deductions/company/${companyRes.data.data.id}`);
        if (dedRes.data.success) {
          setDeductionMasters(dedRes.data.data);
          // Initialize active auto-apply deductions
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

      // Load global Bardan Price
      const bpRes = await api.get('/bardan-price');
      if (bpRes.data.success) {
        setBardanPrice(parseFloat(bpRes.data.data?.price_per_bardan || 0));
      }

      // NEW: Fetch Verified Seasons from DB
      const compId = companyRes.data.data.id;
      const seasonsRes = await api.get(`/seasons/company/${compId}`);
      if (seasonsRes.data.success && seasonsRes.data.data.length > 0) {
        const latest = seasonsRes.data.data[0];
        setSeasons(seasonsRes.data.data);
        setCurrentSeason(latest);
        // Sync form season with verified DB season
        setFormData(prev => ({
          ...prev,
          season: latest.season_type.toLowerCase()
        }));
      }

    } catch (error) {
      console.error('Failed to load initial data:', error);
      setMessage({ type: 'error', text: 'Infrastructure synchronization failure' });
    } finally {
      setLoading(false);
    }
  };

  // Improved calculation logic following business rules
  useEffect(() => {
    // Count all rows added to the weight matrix as bags being returned
    const bagCountFromWeights = weightRows.length;

    // Automatically sync the return bags in the form
    const calculatedBardanReturn = bagCountFromWeights;

    // Calculate Total KG (Standardized to KG only for individual nodes)
    let totalKG = weightRows.reduce((acc, row) => acc + (parseFloat(row.wgt) || 0), 0);

    const totalMan = totalKG / 20;
    const grossQuintal = totalKG / 100;

    // Bardan weight deduction (Gun weight)
    const gunWeight = parseFloat(formData.gun) || 0;
    const totalBardanDeductionKG = (parseFloat(bagCountFromWeights) || 0) * gunWeight;

    // Net KGs for calculation
    const netKG = Math.max(0, totalKG - totalBardanDeductionKG);
    const netQuintal = netKG / 100;

    // Gross amount before kapat/penalties
    // NOTE: rate is now per QUINTAL (100kg)
    const grossAmount = netQuintal * (parseFloat(formData.rate) || 0);

    // Calculate current deductions (Kapat)
    let totalKapatDeduction = 0;
    const updatedDeductions = deductions.map(d => {
      let calcAmt = 0;
      if (d.type === 'fixed') calcAmt = parseFloat(d.value) || 0;
      else if (d.type === 'per_unit') calcAmt = netQuintal * (parseFloat(d.value) || 0);
      else if (d.type === 'percentage') calcAmt = (grossAmount * (parseFloat(d.value) || 0)) / 100;

      totalKapatDeduction += calcAmt;
      return { ...d, calculated_amount: calcAmt.toFixed(2) };
    });

    // Bardan Penalty (Unreturned bags)
    const remainingBardan = Math.max(0, bardanBalance - bagCountFromWeights);
    const activePrice = parseFloat(formData.active_bardan_price) || bardanPrice;
    const bardanPenaltyAmount = remainingBardan * activePrice;

    // Ultimate Net Payable - Penalty is shown as info only, NOT subtracted here
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

    // update calculation results in state without triggering extra effect if possible
    // but react-hooks/exhaustive-deps will complain if we don't include deductions
  }, [weightRows, formData.bardan, formData.gun, formData.rate, formData.active_bardan_price, deductions, bardanBalance, bardanPrice]);

  // Fetch Rate when Item or Date changes
  useEffect(() => {
    if (formData.item_id && company) {
      const fetchItemRate = async () => {
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const year = user.financial_year || '2026-27';
          const res = await api.get(`/dangar-rates/item/${formData.item_id}?year=${year}`);
          if (res.data.success && res.data.data) {
            const data = res.data.data;
            let selectedRate = data.rate; // Default to 1st class
            if (formData.quality_class === '2nd') selectedRate = data.winter_rate || data.rate;
            else if (formData.quality_class === '3rd') selectedRate = data.summer_rate || data.rate;

            setFormData(prev => ({
              ...prev,
              rate: selectedRate
            }));
          } else {
            // Reset rates if not found
            setFormData(prev => ({ ...prev, rate: 0, bardan_rate: 0 }));
          }
        } catch (err) {
          console.error('Fetch rate error:', err);
        }
      };
      fetchItemRate();
    }
  }, [formData.item_id, formData.quality_class, company]);

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

  const handleSave = async () => {
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

      const res = await dangarEntryApi.create(payload);
      if (res.data.success) {
        setMessage({ type: 'success', text: `Transaction committed. Node SR: ${res.data.data.srNo}` });
        resetForm();
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Operational failure during commit' });
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
    setFormData({
      bookType: '',
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
      rate: 0,
      bardan_rate: 0,
      amount: 0
    });
    setWeightRows([{ id: 1, wgt: '' }]);
  };

  if (showHistory) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in slide-in-from-right duration-500">
        <div className="max-w-[1500px] mx-auto px-8">
          <div className="flex justify-between items-center py-10">
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Operation History</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Dangar/Tuver/Divela Manifest</p>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest"
            >
              <X size={16} /> Exit History
            </button>
          </div>

          <div className="bg-white/60 backdrop-blur-xl rounded-lg border border-white shadow-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 italic text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-10 py-6">Date</th>
                  <th className="px-10 py-6">Reference</th>
                  <th className="px-10 py-6">Sabhasad</th>
                  <th className="px-10 py-6 text-right">Net Man</th>
                  <th className="px-10 py-6 text-right">Net Quintal</th>
                  <th className="px-10 py-6 text-right">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((row) => (
                  <tr key={row.id} className="group hover:bg-white transition-all">
                    <td className="px-10 py-6 text-sm font-bold text-slate-600 font-mono">
                      {new Date(row.entry_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-10 py-6">
                      <span className="text-blue-600 font-black text-sm italic">#{row.sr_no}</span>
                      <p className="text-[10px] font-bold text-slate-300 uppercase italic">{row.book_type}</p>
                    </td>
                    <td className="px-10 py-6">
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{row.member_name}</p>
                      <p className="text-[10px] font-bold text-slate-400 tracking-widest">CODE: {row.member_code}</p>
                    </td>
                    <td className="px-10 py-6 text-right font-black text-amber-600 text-lg italic">
                      {(parseFloat(row.net_quintal) * 5).toFixed(2)}
                    </td>
                    <td className="px-10 py-6 text-right font-black text-slate-800 text-lg italic">{row.net_quintal}</td>
                    <td className="px-10 py-6">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        <button className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"><Printer size={16} /></button>
                        <button onClick={() => handleDelete(row.id)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1500px] mx-auto px-8">

        {/* Superior Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-10 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1 italic">
              <Database size={12} />
              <span>Network Infrastructure / Transaction Node</span>
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none italic uppercase">
              {t('dangarEntry.title', 'Tuver/Dangar/Divela Entry')}
            </h1>
          </div>

          <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-6 py-4 rounded-lg border border-white shadow-sm">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <History size={20} />
            </div>
            <div className="text-left">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Session Active</p>
              <p className="text-xs font-black text-slate-800">Operational Log Level 4</p>
            </div>
          </div>
        </div>

        {/* Status Messaging */}
        {message && (
          <div className={`mb-8 p-5 rounded-lg flex items-center gap-4 animate-in slide-in-from-top duration-300 border-l-[6px] ${message.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'
            }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <span className="text-sm font-black italic tracking-tight uppercase tracking-widest">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Main Form Area (Left) */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white/80 backdrop-blur-xl p-10 rounded-lg border border-white shadow-2xl space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12 -mr-10 -mt-10 select-none pointer-events-none">
                <Database size={240} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Book Type */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('dangarEntry.bookType')}</label>
                  <div className="relative group">
                    <Box className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <select
                      className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-black italic text-sm text-slate-700 appearance-none shadow-inner uppercase tracking-wider"
                      value={formData.bookType}
                      onChange={(e) => setFormData({ ...formData, bookType: e.target.value })}
                    >
                      <option value="Tuver">Tuver</option>
                      <option value="Dangar">Dangar</option>
                      <option value="Divela">Divela</option>
                    </select>
                  </div>
                </div>

                {/* Sr No */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('dangarEntry.srNo')}</label>
                  <div className="relative group">
                    <FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      type="text"
                      readOnly
                      className="w-full pl-14 pr-6 py-4 bg-slate-100/50 border border-slate-100 rounded-lg outline-none font-black text-sm text-slate-400 italic"
                      value={formData.srNo}
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('dangarEntry.date')}</label>
                  <div className="relative group">
                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <input
                      type="date"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-black italic text-sm text-slate-700"
                      value={formData.date}
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        const month = date.getMonth();
                        const newSeason = (month >= 3 && month <= 8) ? 'summer' : 'winter';
                        setFormData({ ...formData, date: e.target.value, season: newSeason });
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Season Selection - Controlled by DB Protocol */}
                <div className="md:col-span-4 space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic flex items-center justify-between">
                    <span>Protocol Season</span>
                    <span className="text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 text-[8px] animate-pulse">VERIFIED</span>
                  </label>
                  <div className="flex gap-2 p-1.5 bg-slate-100/50 border border-slate-200 rounded-lg cursor-not-allowed">
                    {['winter', 'summer'].map(s => (
                      <button
                        key={s}
                        type="button"
                        disabled
                        className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${formData.season === s
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                          : 'text-slate-300'
                          }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {currentSeason && (
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-1">
                      ACTUAL: <span className="text-blue-600 font-black italic">{currentSeason.name}</span>
                    </p>
                  )}
                </div>

                {/* Member Selection */}
                <div className="md:col-span-8 space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic flex justify-between items-center">
                    <span>Sabhasad Identity Vector</span>
                    {selectedMember && (
                      <div className="flex gap-2">
                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{selectedMember.village_name}</span>
                        {selectedMember.bank_name && (
                          <span className="text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 uppercase">{selectedMember.bank_name}</span>
                        )}
                      </div>
                    )}
                  </label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <select
                      className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-black text-sm text-slate-700 appearance-none shadow-inner uppercase italic tracking-wider"
                      value={formData.member_id}
                      onChange={(e) => handleMemberChange(e.target.value)}
                    >
                      <option value="">Select Identity Node...</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.member_code} - {m.member_name}</option>
                      ))}
                    </select>
                  </div>
                  {selectedMember && selectedMember.full_ac_number && (
                    <div className="flex items-center gap-2 mt-2 ml-1">
                      <CreditCard size={12} className="text-slate-300" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">A/C: {selectedMember.full_ac_number}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Quality Category Selection */}
                <div className="md:col-span-4 space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic flex items-center justify-between">
                    <span>Quality Vector</span>
                    <span className="text-amber-500 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100 text-[8px]">GRADED</span>
                  </label>
                  <div className="flex gap-2 p-1.5 bg-slate-100/50 border border-slate-200 rounded-lg">
                    {[
                      { key: '1st', label: '1st Class' },
                      { key: '2nd', label: '2nd Class' },
                      { key: '3rd', label: '3rd Class' }
                    ].map(q => (
                      <button
                        key={q.key}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, quality_class: q.key }))}
                        className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formData.quality_class === q.key
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                          : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Item Selection */}
                <div className="md:col-span-8 space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Item Schema Vector</label>
                  <div className="relative group">
                    <Box className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <select
                      className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-black text-sm text-slate-700 appearance-none shadow-inner uppercase italic tracking-wider"
                      value={formData.item_id}
                      onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                    >
                      <option value="">Select Resource Type...</option>
                      {items.map(i => (
                        <option key={i.id} value={i.id}>{i.item_code} - {i.item_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Vehicle No */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('dangarEntry.vehicleNo')}</label>
                  <div className="relative group">
                    <Truck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                    <input
                      type="text"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-black text-sm text-slate-700 shadow-inner italic"
                      placeholder="E.G. GJ-01-XX-1234"
                      value={formData.vehicleNo}
                      onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
              </div>

              {/* Remark */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('dangarEntry.remark')}</label>
                <div className="relative group">
                  <Info className="absolute left-5 top-5 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                  <textarea
                    className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-black text-sm text-slate-700 min-h-[100px] shadow-inner font-mono italic"
                    placeholder="ADDITIONAL TRANSACTION CONTEXT..."
                    value={formData.remark}
                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  />
                </div>
              </div>

              {/* Composite Payload Dashboard */}
              <div className="mt-12 bg-slate-900/5 rounded-lg border border-slate-100 p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-800 shadow-xl">
                      <TrendingUp size={32} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 leading-none italic uppercase">Composite Payload</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1 italic">Tri-Unit Synchronization Active</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Unit Selector & Price Preview */}
                    <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm flex items-center gap-3">
                      <select
                        className="bg-slate-50 border-none outline-none px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600"
                        value={display_unit}
                        onChange={(e) => setDisplayUnit(e.target.value)}
                      >
                        <option value="kg">Per KG</option>
                        <option value="man">Per MAN (20kg)</option>
                        <option value="quintal">Per QUINTAL</option>
                      </select>
                      <div className="px-4 py-2 bg-blue-50 rounded-lg min-w-[200px]">
                        <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1 italic text-center">Payload Valuation Summary</p>
                        <div className="flex items-center justify-center gap-1.5 text-xs font-black text-blue-700 italic">
                          <span>{display_unit === 'man' ? formData.total_man : (display_unit === 'quintal' ? formData.gross_quintal : formData.total_kg)}</span>
                          <span className="text-[8px] uppercase">{display_unit}</span>
                          <span className="text-slate-400 font-normal ml-0.5">x</span>
                          <span>₹{display_unit === 'man' ? (parseFloat(formData.rate) / 5).toFixed(2) : (display_unit === 'quintal' ? parseFloat(formData.rate).toFixed(2) : (parseFloat(formData.rate) / 100).toFixed(2))}</span>
                          <span className="text-slate-400 font-normal">=</span>
                          <span className="text-sm bg-blue-600 text-white px-2 py-0.5 rounded-lg shadow-sm">₹{formData.gross_amount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel (Right) */}
          <div className="lg:col-span-4 space-y-8">

            {/* Weight Matrix */}
            <div className="bg-white/90 backdrop-blur-xl p-8 rounded-lg border border-white shadow-2xl flex flex-col h-[520px]">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform shadow-inner">
                    <Calculator size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 leading-none italic uppercase">{t('dangarEntry.itemDetails')}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Weight Node Matrix</p>
                  </div>
                </div>
                <button
                  onClick={handleAddRow}
                  className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-90"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 scroller-airy space-y-3 mb-6">
                <div className="grid grid-cols-12 gap-4 px-2 italic text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  <div className="col-span-2 text-center">No</div>
                  <div className="col-span-10 px-4">
                    <span>Vector Magnitude (KG)</span>
                  </div>
                </div>

                {weightRows.map((row, idx) => (
                  <div key={row.id} className="grid grid-cols-12 gap-3 items-center group">
                    <div className="col-span-2 text-center font-black text-slate-300 text-xs italic">
                      {idx + 1}
                    </div>
                    <div className="col-span-8 relative">
                      <input
                        type="number"
                        className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-3.5 text-sm font-black text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner font-mono italic"
                        value={row.wgt}
                        autoFocus={idx === weightRows.length - 1 && idx > 0}
                        onChange={(e) => handleWeightChange(row.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddRow();
                          }
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <button
                        onClick={() => handleRemoveRow(row.id)}
                        className="p-2.5 text-slate-200 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-lg active:scale-75"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-50 flex justify-between items-center text-slate-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Aggregate Vector KG</p>
                <p className="text-3xl font-black italic tracking-tighter leading-none">
                  {formData.total_kg} <span className="text-[10px] text-slate-300 uppercase ml-1 italic font-bold">kg</span>
                </p>
              </div>
            </div>



            {/* Fiscal Shard */}
            <div className="bg-slate-900 p-8 rounded-lg text-white shadow-2xl space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 text-blue-500/5 -mr-16 -mt-16 group-hover:scale-110 transition-transform"><Calculator size={200} /></div>

              <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.4em] italic mb-2 relative z-10">Calculated Fiscal State</h3>

              <div className="space-y-6 relative z-10">
                <div className="grid grid-cols-1 gap-5">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none font-mono italic">Rem. Bardan</p>
                      <input
                        type="number"
                        readOnly
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs font-black text-white/50 outline-none cursor-not-allowed opacity-70 transition-all font-mono italic shadow-inner"
                        value={formData.bardan}
                      />
                      {selectedMember && (
                        <div className="text-[7px] font-black text-blue-400 uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 w-fit">
                          Bal: {bardanBalance}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none font-mono italic">Net KG</p>
                      <input
                        type="number"
                        readOnly
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs font-black text-white/50 outline-none cursor-not-allowed opacity-70 transition-all font-mono italic shadow-inner"
                        value={formData.total_kg}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none font-mono italic">Rate (per KG)</p>
                      <input
                        type="number"
                        readOnly
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs font-black text-white/50 outline-none cursor-not-allowed opacity-70 transition-all font-mono italic shadow-inner"
                        value={formData.rate}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-6 border border-white/10 space-y-5">                   {[
                  { label: 'Gross Net (KG)', val: (formData.total_kg - formData.less_bardan).toFixed(2), color: 'slate-500' },
                  { label: 'Gross Amount (₹)', val: `₹${formData.gross_amount}`, color: 'blue-400' },
                  { label: t('dangarEntry.lessBardan'), val: `- ₹0.00 (${formData.less_bardan}kg Gun)`, color: 'rose-500' },
                  {
                    label: `${formData.quality_class} Rate (per 1kg)`,
                    val: `₹${formData.rate}`,
                    color: 'blue-300'
                  },
                  { label: 'Kapat (Deductions)', val: `- ₹${formData.total_deduction}`, color: 'rose-400' },
                  { label: 'Bardan Penalty', val: `- ₹${formData.remaining_bardan_deduction}`, color: 'rose-600', highlight: true },
                  {
                    label: 'Net Payable (₹)',
                    val: `₹${formData.amount}`,
                    color: 'emerald-400',
                    size: 'text-5xl',
                    highlight: true
                  }
                ].map((calc, i) => (
                  <div key={i} className={`flex justify-between items-center group/row py-2 ${calc.size ? 'mt-4 border-t border-white/10 pt-6' : ''}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest italic font-mono ${calc.highlight ? 'text-amber-500' : 'text-slate-500'}`}>{calc.label}</p>
                    <p className={`${calc.size || 'text-base'} font-black italic font-mono tracking-tighter ${calc.highlight ? 'text-white' : `text-${calc.color}`}`}>
                      {calc.val}
                    </p>
                  </div>
                ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-lg font-black uppercase tracking-[0.2em] italic text-sm shadow-2xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Save size={20} />
                  Commit Transaction
                </button>
                <button
                  onClick={loadHistory}
                  className="w-20 bg-white/5 hover:bg-white/10 text-white py-6 rounded-lg font-black border border-white/10 flex items-center justify-center transition-all active:scale-95"
                >
                  <History size={20} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Action Command Interface */}
        <div className="mt-12 bg-white/40 backdrop-blur-md p-6 rounded-lg border border-white shadow-xl flex flex-wrap justify-center gap-5">
          {[
            { label: 'Display Logs', icon: Search, color: 'slate', action: loadHistory, sub: 'Manifest history' },
            { label: 'Commit Entry', icon: Save, color: 'emerald', action: handleSave, sub: 'Save vector' },
            { label: 'Generate Slip', icon: Printer, color: 'slate', sub: 'Print physical log' },
            { label: 'Abort State', icon: X, color: 'rose', action: resetForm, sub: 'Clear cache' },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              className={`flex items-center gap-4 px-10 py-5 rounded-lg tracking-widest transition-all shadow-xl active:scale-95 border-b-4 overflow-hidden relative group ${btn.color === 'blue' ? 'bg-blue-600 text-white border-blue-800 hover:bg-blue-700' :
                btn.color === 'rose' ? 'bg-rose-600 text-white border-rose-800 hover:bg-rose-700' :
                  btn.color === 'emerald' ? 'bg-emerald-600 text-white border-emerald-800 hover:bg-emerald-700' :
                    'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
            >
              <btn.icon size={20} className={`${btn.color === 'slate' ? 'text-blue-600' : 'text-white/80'} group-hover:scale-110 transition-transform`} />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase">{btn.label}</p>
                <p className={`text-[8px] font-bold uppercase opacity-60 tracking-widest leading-none mt-0.5 ${btn.color === 'slate' ? 'text-slate-400' : 'text-white'}`}>{btn.sub}</p>
              </div>
            </button>
          ))}
        </div>

      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .scroller-airy::-webkit-scrollbar { width: 4px; }
        .scroller-airy::-webkit-scrollbar-track { background: transparent; }
        .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .scroller-airy:hover::-webkit-scrollbar-thumb { background: #3b82f6; }
      `}} />
    </div>
  );
};

export default DangarEntry;
