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
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';

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
        <div className="max-w-[1600px] mx-auto px-8">
          <PageHeader
            eyebrow="Dangar Entry / Operation History"
            eyebrowIcon={<History size={12} />}
            title="Transaction History"
            subtitle="Dangar · Tuver · Divela Manifest"
          >
            <button
              onClick={() => setShowHistory(false)}
              className="flex items-center gap-2 bg-white text-slate-600 px-5 py-3.5 rounded-lg text-xs font-black uppercase tracking-widest border border-slate-200 hover:border-slate-400 transition-all shadow-sm active:scale-95"
            >
              <X size={16} /> Back to Entry
            </button>
          </PageHeader>

          <div className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Net Man</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Net Quintal</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map((row) => (
                  <tr key={row.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5 text-sm font-bold text-slate-600 font-mono">
                      {new Date(row.entry_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-blue-600 font-black text-sm">#{row.sr_no}</span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{row.book_type}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{row.member_name}</p>
                      <p className="text-[10px] font-bold text-slate-400 tracking-widest">CODE: {row.member_code}</p>
                    </td>
                    <td className="px-6 py-5 text-right font-black text-amber-600 text-base">
                      {(parseFloat(row.net_quintal) * 5).toFixed(2)}
                    </td>
                    <td className="px-6 py-5 text-right font-black text-slate-800 text-base">{row.net_quintal}</td>
                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                        <button className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-lg shadow-sm transition-all"><Printer size={16} /></button>
                        <button onClick={() => handleDelete(row.id)} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 rounded-lg shadow-sm transition-all"><Trash2 size={16} /></button>
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
      <div className="max-w-[1600px] mx-auto px-8">

        {/* Page Header */}
        <PageHeader
          eyebrow="Transaction Node / Entry Console"
          eyebrowIcon={<Database size={12} />}
          title={t('dangarEntry.title', 'Dangar / Tuver / Divela Entry')}
          subtitle={currentSeason ? `Season: ${currentSeason.name}` : undefined}
        >
          <button
            onClick={loadHistory}
            className="flex items-center gap-2 bg-white text-slate-600 px-5 py-3.5 rounded-lg text-xs font-black uppercase tracking-widest border border-slate-200 hover:border-slate-400 transition-all shadow-sm active:scale-95"
          >
            <History size={16} /> History
          </button>
          <button
            onClick={resetForm}
            className="flex items-center gap-2 bg-white text-slate-600 px-5 py-3.5 rounded-lg text-xs font-black uppercase tracking-widest border border-slate-200 hover:border-slate-400 transition-all shadow-sm active:scale-95"
          >
            <X size={16} /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3.5 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50"
          >
            <Save size={16} /> Save Entry
          </button>
        </PageHeader>

        {/* Status Messaging */}
        {message && (
          <div className={`mb-8 p-5 rounded-lg flex items-center gap-4 animate-in slide-in-from-top duration-300 border-l-[6px] ${message.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'
            }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <span className="text-sm font-black italic tracking-tight uppercase tracking-widest">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Main Form Area (Left) */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white p-8 rounded-lg border border-slate-100 shadow-sm space-y-6">


              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Book Type */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('dangarEntry.bookType')}</label>
                  <div className="relative group">
                    <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <select
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 appearance-none"
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
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('dangarEntry.srNo')}</label>
                  <div className="flex items-center h-[46px] px-4 bg-slate-50 border border-slate-200 rounded-lg gap-3">
                    <FileText size={15} className="text-slate-300" />
                    <span className={`text-sm font-black tracking-widest ${formData.srNo === 'AUTO' ? 'text-slate-300' : 'text-blue-600'}`}>
                      {formData.srNo === 'AUTO' ? 'Auto' : `#${formData.srNo}`}
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('dangarEntry.date')}</label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                      type="date"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all text-sm font-semibold text-slate-700"
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

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Season Selection - Controlled by DB Protocol */}
                <div className="md:col-span-4 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                    <span>Protocol Season</span>
                  </label>
                  <div className="flex gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-lg">
                    {['winter', 'summer'].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, season: s }))}
                        className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${formData.season === s
                          ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                          : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {currentSeason && (
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-1">
                      Active: <span className="text-blue-600 font-bold">{currentSeason.name}</span>
                    </p>
                  )}
                </div>

                {/* Member Selection */}
                <div className="md:col-span-8 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Member</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <select
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 appearance-none"
                      value={formData.member_id}
                      onChange={(e) => handleMemberChange(e.target.value)}
                    >
                      <option value="">Select Member...</option>
                      {members.map(m => (
                        <option key={m.id} value={m.id}>{m.member_code} - {m.member_name}</option>
                      ))}
                    </select>
                  </div>
                  {selectedMember && selectedMember.full_ac_number && (
                    <div className="flex items-center gap-2 mt-2 ml-1">
                      <CreditCard size={12} className="text-slate-300" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">A/C: {selectedMember.full_ac_number}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Quality Category Selection */}
                <div className="md:col-span-4 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                    <span>Quality Vector</span>

                  </label>
                  <div className="flex gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-lg">
                    {[
                      { key: '1st', label: '1st' },
                      { key: '2nd', label: '2nd' },
                      { key: '3rd', label: '3rd' }
                    ].map(q => (
                      <button
                        key={q.key}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, quality_class: q.key }))}
                        className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${formData.quality_class === q.key
                          ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
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
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Item Schema Vector</label>
                  <div className="relative group">
                    <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <select
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 appearance-none"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vehicle No */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('dangarEntry.vehicleNo')}</label>
                  <div className="relative group">
                    <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input
                      type="text"
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all text-sm font-semibold text-slate-700"
                      placeholder="GJ-01-XX-1234"
                      value={formData.vehicleNo}
                      onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
              </div>

              {/* Remark */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('dangarEntry.remark')}</label>
                <div className="relative group">
                  <Info className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                  <textarea
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all text-sm font-semibold text-slate-700 min-h-[100px]"
                    placeholder="ADDITIONAL TRANSACTION CONTEXT..."
                    value={formData.remark}
                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  />
                </div>
              </div>

              {/* Rate Preview */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 text-white rounded-lg">
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Rate Preview</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live calculation</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Unit Selector & Price Preview */}
                    <div className="bg-white p-2 rounded-lg border border-blue-100 flex items-center gap-3">
                      <select
                        className="bg-transparent border-none outline-none px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-600"
                        value={display_unit}
                        onChange={(e) => setDisplayUnit(e.target.value)}
                      >
                        <option value="kg">Per KG</option>
                        <option value="man">Per MAN (20kg)</option>
                        <option value="quintal">Per QUINTAL</option>
                      </select>
                      <div className="px-4 py-2 bg-white rounded-lg min-w-[200px] border border-blue-100">
                        <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest leading-none mb-1 text-center">Valuation</p>
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-blue-700">
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
          <div className="lg:col-span-4 flex flex-col gap-4">

            {/* Weight Matrix */}
            <div className="bg-white rounded-lg border border-slate-200 flex flex-col h-[520px] overflow-hidden">
              <TableHeading
                icon={<Calculator size={16} />}
                iconColor="indigo"
                title={t('dangarEntry.itemDetails')}
                subtitle="Weight Entry"
                count={weightRows.length}
              >
                <button
                  onClick={handleAddRow}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all active:scale-90"
                >
                  <Plus size={15} />
                </button>
              </TableHeading>

              <div className="flex-1 overflow-y-auto px-4 pt-3 scroller-airy space-y-3 mb-4">
                <div className="grid grid-cols-12 gap-4 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  <div className="col-span-2 text-center">#</div>
                  <div className="col-span-10 px-3">Weight (KG)</div>
                </div>

                {weightRows.map((row, idx) => (
                  <div key={row.id} className="grid grid-cols-12 gap-3 items-center group">
                    <div className="col-span-2 text-center font-bold text-slate-300 text-xs">
                      {idx + 1}
                    </div>
                    <div className="col-span-8 relative">
                      <input
                        type="number"
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all"
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

              <div className="p-5 border-t border-slate-100 flex justify-between items-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total KG</p>
                <p className="text-2xl font-black text-slate-800 leading-none">
                  {formData.total_kg} <span className="text-xs font-bold text-slate-400 ml-1">kg</span>
                </p>
              </div>
            </div>



            {/* Calculation Summary */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculation Summary</h3>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rem. Bardan</p>
                  <input type="number" readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 outline-none cursor-not-allowed" value={formData.bardan} />
                  {selectedMember && (
                    <div className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 w-fit">Bal: {bardanBalance}</div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net KG</p>
                  <input type="number" readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 outline-none cursor-not-allowed" value={formData.total_kg} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate</p>
                  <input type="number" readOnly className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 outline-none cursor-not-allowed" value={formData.rate} />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
                {[
                  { label: 'Gross Net (KG)', val: (formData.total_kg - formData.less_bardan).toFixed(2), color: 'text-slate-600' },
                  { label: 'Gross Amount', val: `₹${formData.gross_amount}`, color: 'text-blue-600' },
                  { label: t('dangarEntry.lessBardan'), val: `- ₹0.00 (${formData.less_bardan}kg Gun)`, color: 'text-rose-500' },
                  { label: `${formData.quality_class} Rate / kg`, val: `₹${formData.rate}`, color: 'text-blue-600' },
                  { label: 'Kapat (Deductions)', val: `- ₹${formData.total_deduction}`, color: 'text-rose-500' },
                  { label: 'Bardan Penalty', val: `- ₹${formData.remaining_bardan_deduction}`, color: 'text-rose-600', highlight: true },
                  { label: 'Net Payable', val: `₹${formData.amount}`, color: 'text-emerald-600', size: 'text-3xl', highlight: true }
                ].map((calc, i) => (
                  <div key={i} className={`flex justify-between items-center px-4 py-2.5 ${calc.size ? 'border-t border-slate-200 pt-4 pb-4' : ''}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${calc.highlight ? 'text-blue-600' : 'text-slate-400'}`}>{calc.label}</p>
                    <p className={`${calc.size || 'text-sm'} font-black ${calc.highlight ? 'text-emerald-600' : calc.color}`}>{calc.val}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-bold uppercase tracking-widest text-xs shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={16} /> Save Entry
              </button>
            </div>

          </div>
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
