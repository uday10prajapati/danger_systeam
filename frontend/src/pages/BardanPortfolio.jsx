import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Printer, Save,
  Search, X, RefreshCcw, Calendar,
  AlertCircle, CheckCircle, History,
  Package, User, FileText, ChevronRight,
  Database, Info, Layout, ArrowLeftRight,
  TrendingDown, TrendingUp, IndianRupee, Tag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api, { bardanEntryApi, jamaBardanEntryApi, sabhasadMasterApi } from '../api';

const BardanPortfolio = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    id: null,
    type: 'GIVEN', // GIVEN or RETURNED
    bookType: 'Combo1',
    pavtiNo: '',
    date: new Date().toISOString().split('T')[0],
    memNominal: '',
    code: '',
    name: '',
    qty: '',
    remark: '',
    dayQty: '',
    totalQty: '',
    option: 'Self' // Default to Self for manual returns
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

  useEffect(() => {
    const total = gridRows.reduce((acc, row) => {
      const sum = (parseFloat(row.col1) || 0) + (parseFloat(row.col2) || 0) + (parseFloat(row.col3) || 0);
      return acc + sum;
    }, 0);
    // Only auto-fill qty from grid if grid has data
    if (total > 0) {
      setFormData(prev => ({ ...prev, qty: total.toFixed(2) }));
    }
  }, [gridRows]);

  useEffect(() => {
    loadData();
    loadBardanPrice();
  }, []);

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
      setMembers(membersArr);

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
          pavti_no: m.details.length > 0 ? [...new Set(m.details)].join(', ') : 'INITIAL',
          balance: m.debit - m.credit
        }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      setHistory(processedHistory);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'code') {
      const member = members.find(m => m.member_code === value);
      if (member) {
        setFormData(prev => ({ ...prev, name: member.member_name }));
        fetchBalance(value);
      } else {
        setBalanceData({ taken: 0, returned: 0, balance: 0 });
      }
    }
    if (name === 'name') {
      const member = members.find(m => m.member_name === value);
      if (member) {
        setFormData(prev => ({ ...prev, code: member.member_code }));
        fetchBalance(member.member_code);
      } else {
        setBalanceData({ taken: 0, returned: 0, balance: 0 });
      }
    }
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
      if (formData.id) {
        res = formData.type === 'GIVEN'
          ? await bardanEntryApi.updateEntry(formData.id, payload)
          : await jamaBardanEntryApi.updateEntry(formData.id, payload);
      } else {
        res = formData.type === 'GIVEN'
          ? await bardanEntryApi.createEntry(payload)
          : await jamaBardanEntryApi.createEntry(payload);
      }

      if (res.data.success) {
        setMessage({ type: 'success', text: formData.id ? 'Transaction updated' : 'Transaction committed' });
        console.log('✅ Commit Success:', res.data);
        if (!formData.id) resetForm();
        loadData();
        if (formData.code) fetchBalance(formData.code);
        setTimeout(() => setMessage(null), 5000);
      } else {
        console.error('❌ Commit Failure:', res.data);
        setMessage({ type: 'error', text: res.data.error || 'Operational failure' });
      }
    } catch (err) {
      console.error('🚀 Dispatching Error:', err);
      setMessage({ type: 'error', text: 'Network or server error during commit' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm('Delete this transaction node?')) return;
    try {
      setLoading(true);
      const res = type === 'GIVEN'
        ? await bardanEntryApi.deleteEntry(id)
        : await jamaBardanEntryApi.deleteEntry(id);

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Node deleted successfully' });
        loadData();
        if (formData.code) fetchBalance(formData.code);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Deletion failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (item) => {
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
          bookType: entry.book_type,
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
      bookType: 'Combo1',
      pavtiNo: '',
      date: new Date().toISOString().split('T')[0],
      memNominal: '',
      code: '',
      name: '',
      qty: '',
      option: 'Self',
      remark: '',
      dayQty: '',
      totalQty: ''
    });
    setGridRows(Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
    setBalanceData({ taken: 0, returned: 0, balance: 0 });
  };

  const handlePrint = () => { window.print(); };

  if (showHistory) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in slide-in-from-right duration-500">
        <div className="max-w-[1500px] mx-auto px-8">
          <div className="flex justify-between items-center py-10">
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">Unified Bardan Registry</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">Combined Logistics & Return Manifest</p>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg text-xs font-black uppercase tracking-widest hover:scale-105 transition-all"
            >
              <X size={16} /> Exit History
            </button>
          </div>

          <div className="bg-white/60 backdrop-blur-xl rounded-lg border border-white shadow-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 italic text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-10 py-6">Date</th>
                  <th className="px-10 py-6">Particulars</th>
                  <th className="px-10 py-6 text-right">Debit (Taken)</th>
                  <th className="px-10 py-6 text-right">Credit (Jama)</th>
                  <th className="px-10 py-6 text-right">Balance</th>
                  <th className="px-10 py-6 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(formData.code ? ledgerData : history).map((row, i) => (
                  <tr key={row.id || i} className="group hover:bg-white transition-all">
                    <td className="px-10 py-6">
                      <p className="text-sm font-bold text-slate-600 font-mono italic">
                        {(row.date || row.entry_date) ? new Date(row.date || row.entry_date).toLocaleDateString() : '—'}
                      </p>
                    </td>
                    <td className="px-10 py-6">
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight italic">{row.particulars || row.name || (row.type === 'GIVEN' ? 'Given' : 'Returned')}</p>
                      {row.pavti_no && <p className="text-[10px] font-bold text-blue-500 tracking-widest uppercase">PVT: {row.pavti_no}</p>}
                    </td>
                    <td className="px-10 py-6 text-right">
                      <p className="text-lg font-black text-slate-800 italic">{row.debit ?? (row.type === 'GIVEN' ? row.qty : '—')}</p>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <p className="text-lg font-black text-emerald-600 italic">{row.credit ?? (row.type === 'RETURNED' ? row.qty : '—')}</p>
                    </td>
                    <td className="px-10 py-6 text-right">
                      {row.balance != null ? (
                        <p className={`text-xl font-black italic ${row.balance >= 0 ? 'text-rose-500' : 'text-slate-900'
                          }`}>{Math.abs(row.balance)} {row.balance >= 0 ? 'D' : 'C'}</p>
                      ) : (
                        <p className="text-xs font-bold text-slate-300 italic uppercase">Select member<br />for balance</p>
                      )}
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        {row.id !== 'OP' && (
                          <>
                            <button onClick={() => handleEdit(row)} className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"><ChevronRight size={16} /></button>
                            <button onClick={() => handleDelete(row.id, row.type)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"><Trash2 size={16} /></button>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1500px] mx-auto px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-10 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1 italic">
              <ArrowLeftRight size={12} />
              <span>Unified Asset Protocol / Bardan Ledger</span>
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none italic uppercase">
              Gunny Bag Portfolio
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Bardan Price Button */}
            <button
              onClick={() => setShowPriceModal(true)}
              className="flex items-center gap-2 bg-white border border-slate-100 text-slate-700 px-5 py-4 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all shadow-sm"
            >
              <Tag size={16} />
              <div className="text-left">
                <p className="text-[9px] font-black uppercase leading-none tracking-widest">Bardan Rate</p>
                {bardanPrice > 0 && <p className="text-[8px] font-bold opacity-60 mt-0.5">₹{parseFloat(bardanPrice).toFixed(2)}/bag</p>}
              </div>
            </button>

            {/* History Button */}
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-6 py-4 rounded-lg border border-white shadow-sm">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                <History size={20} />
              </div>
              <div onClick={() => setShowHistory(true)} className="text-left cursor-pointer group">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 group-hover:text-blue-600 transition-colors">Audit Console</p>
                <p className="text-xs font-black text-slate-800 uppercase tracking-tight underline decoration-blue-500/30">Review Unified History</p>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Metrics Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white/40 backdrop-blur-md p-8 rounded-lg border border-white shadow-xl group hover:bg-white/80 transition-all border-l-8 border-l-rose-500">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Asset Load (Inc. Open)</p>
                <p className="text-2xl font-black text-slate-800 italic">#{((balanceData.opening || 0) + (balanceData.taken || 0)).toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/40 backdrop-blur-md p-8 rounded-lg border border-white shadow-xl group hover:bg-white/80 transition-all border-l-8 border-l-emerald-500">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center -rotate-3 group-hover:rotate-0 transition-transform">
                <TrendingDown size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Return Registry</p>
                <p className="text-2xl font-black text-emerald-600 italic">#{balanceData.returned} <span className="text-[10px] uppercase">JAMMA</span></p>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 p-8 rounded-lg border border-slate-800 shadow-2xl relative overflow-hidden group border-l-8 border-l-blue-500">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Database size={80} />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Net Position</p>
              <p className="text-2xl font-black text-white italic">#{balanceData.balance} <span className="text-[10px] text-blue-400 font-bold ml-1 uppercase">Outstanding</span></p>
              {bardanPrice > 0 && (
                <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mt-2 italic">
                  Est. Value: ₹{(balanceData.balance * bardanPrice).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Messaging */}
        {message && (
          <div className={`mb-8 p-5 rounded-lg flex items-center gap-4 animate-in slide-in-from-top duration-300 border-l-[6px] ${message.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'
            }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <span className="text-sm font-black italic tracking-tight uppercase tracking-widest">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Main Form (Left) */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white/80 backdrop-blur-xl p-10 rounded-lg border border-white shadow-2xl space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12 -mr-10 -mt-10 select-none pointer-events-none">
                <Package size={240} />
              </div>

              {/* Transaction Type Toggle */}
              <div className="flex gap-4 p-2 bg-slate-100/50 rounded-lg border border-slate-100">
                <button
                  onClick={() => setFormData({ ...formData, type: 'GIVEN' })}
                  disabled={!!formData.id} // Disable type change on edit
                  className={`flex-1 py-4 rounded-lg flex items-center justify-center gap-3 transition-all ${formData.type === 'GIVEN'
                    ? 'bg-rose-500 text-white shadow-xl shadow-rose-100 scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-600'
                    } ${formData.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <TrendingUp size={18} />
                  <span className="text-xs font-black uppercase tracking-widest">Give Bags (Uthar)</span>
                </button>
                <button
                  onClick={() => setFormData({ ...formData, type: 'RETURNED' })}
                  disabled={!!formData.id} // Disable type change on edit
                  className={`flex-1 py-4 rounded-lg flex items-center justify-center gap-3 transition-all ${formData.type === 'RETURNED'
                    ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-100 scale-[1.02]'
                    : 'text-slate-400 hover:text-slate-600'
                    } ${formData.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <TrendingDown size={18} />
                  <span className="text-xs font-black uppercase tracking-widest">Return Bags (Jama)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Registry Prototype</label>
                  <select
                    name="bookType"
                    className="w-full px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-black italic text-sm text-slate-700 appearance-none shadow-inner uppercase"
                    value={formData.bookType}
                    onChange={handleChange}
                  >
                    <option>Combo1</option>
                    <option>Combo2</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('bardanEntry.pavti_no')}</label>
                  <input
                    name="pavtiNo"
                    className="w-full px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-black text-sm text-slate-700 shadow-inner italic"
                    placeholder="ENTER PVT NO."
                    value={formData.pavtiNo}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('bardanEntry.date')}</label>
                  <input
                    type="date"
                    name="date"
                    className="w-full px-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-black italic text-sm text-slate-700 shadow-inner"
                    value={formData.date}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Identity Node</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <select
                      name="code"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-black text-sm text-slate-700 appearance-none shadow-inner uppercase italic"
                      value={formData.code}
                      onChange={handleChange}
                    >
                      <option value="">IDENTITY NODE...</option>
                      {members.map(m => <option key={m.id} value={m.member_code}>{m.member_code}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Alias Pointer</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <select
                      name="name"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-black text-sm text-slate-700 appearance-none shadow-inner uppercase italic"
                      value={formData.name}
                      onChange={handleChange}
                    >
                      <option value="">NAME REFERENCE...</option>
                      {members.map(m => <option key={m.id} value={m.member_name}>{m.member_name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Transaction Volume</label>
                  <div className="relative group">
                    <Package className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      type="number"
                      name="qty"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-black text-sm text-slate-700 shadow-inner italic"
                      placeholder="0.00"
                      value={formData.qty}
                      onChange={handleChange}
                    />
                    {formData.type === 'RETURNED' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                        <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-0.5">Stock Debt</p>
                        <p className="text-xs font-black text-emerald-700 leading-none">#{balanceData.balance || 0}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{formData.type === 'RETURNED' ? 'Return Category' : 'Membership Vector'}</label>
                  <div className="flex items-center gap-3 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                    {formData.type === 'RETURNED' ? (
                      <select
                        name="option"
                        className="w-full bg-transparent border-none outline-none font-black text-xs text-slate-700 uppercase italic"
                        value={formData.option}
                        onChange={handleChange}
                      >
                        <option value="Company">Company Bags</option>
                        <option value="Self">Self Bags (Penalty Applies)</option>
                      </select>
                    ) : (
                      <>
                        <input
                          type="checkbox"
                          id="memNominalCheck"
                          className="w-6 h-6 rounded-lg text-blue-600 border-slate-300 focus:ring-blue-500 transition-all cursor-pointer"
                          checked={formData.memNominal === 'Member'}
                          onChange={(e) => setFormData({ ...formData, memNominal: e.target.checked ? 'Member' : 'Nominal' })}
                        />
                        <label htmlFor="memNominalCheck" className="text-xs font-black uppercase tracking-widest text-slate-700 cursor-pointer select-none italic">
                          {formData.memNominal === 'Member' ? 'Sabhasad (Active Member)' : 'Nominal Member'}
                        </label>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">{t('bardanEntry.remark')}</label>
                <div className="relative group">
                  <Info className="absolute left-5 top-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <textarea
                    name="remark"
                    className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-black text-sm text-slate-700 min-h-[100px] shadow-inner font-mono italic"
                    placeholder="ADDITIONAL CONTEXT..."
                    value={formData.remark}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel (Grid) */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white/90 backdrop-blur-xl p-8 rounded-lg border border-white shadow-2xl flex flex-col h-[600px]">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-50 text-blue-500 rounded-lg shadow-inner">
                  <Layout size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 leading-none italic uppercase">{t('bardanEntry.item_details')}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Matrix Vector Array</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scroller space-y-3 mb-6">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="italic text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="py-3 text-center w-8">#</th>
                      <th className="py-3 px-2 text-left">POS 1</th>
                      <th className="py-3 px-2 text-left">POS 2</th>
                      <th className="py-3 px-2 text-left">POS 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gridRows.map((row, i) => (
                      <tr key={i} className="group">
                        <td className="text-center font-black text-slate-200 italic">{i + 1}</td>
                        <td className="px-1 py-1">
                          <input
                            className="w-full bg-slate-50 border-none rounded-lg px-3 py-2.5 font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                            value={row.col1}
                            onChange={(e) => {
                              const r = [...gridRows]; r[i].col1 = e.target.value; setGridRows(r);
                            }}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className="w-full bg-slate-50 border-none rounded-lg px-3 py-2.5 font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                            value={row.col2}
                            onChange={(e) => {
                              const r = [...gridRows]; r[i].col2 = e.target.value; setGridRows(r);
                            }}
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            className="w-full bg-slate-50 border-none rounded-lg px-3 py-2.5 font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
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

              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center text-blue-600">
                  <p className="text-[10px] font-black uppercase italic">Current Node Total</p>
                  <input
                    type="number"
                    className="w-32 text-right bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-3 text-2xl font-black italic tracking-tighter"
                    value={formData.qty}
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Commands */}
        <div className="mt-12 bg-white/40 backdrop-blur-md p-6 rounded-lg border border-white shadow-xl flex flex-wrap justify-center gap-5">
          {[
            { label: 'View Portfolio History', icon: History, color: 'slate', action: () => setShowHistory(true), sub: 'Registry logs' },
            { label: 'Commit Transaction', icon: Save, color: 'blue', action: handleSave, sub: 'Commit to DB' },
            { label: 'Physical Slip', icon: Printer, color: 'slate', action: handlePrint, sub: 'Generate slip' },
            { label: 'Clear Active', icon: X, color: 'slate', action: resetForm, sub: 'Clear form' },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              className={`flex items-center gap-4 px-10 py-5 rounded-lg tracking-widest transition-all shadow-xl active:scale-95 border-b-4 relative group overflow-hidden ${btn.color === 'rose' ? 'bg-rose-500 text-white border-rose-700 hover:bg-rose-600' :
                btn.color === 'emerald' ? 'bg-emerald-500 text-white border-emerald-700 hover:bg-emerald-600' :
                  btn.color === 'blue' ? 'bg-blue-600 text-white border-blue-800 hover:bg-blue-700' :
                    'bg-white text-slate-800 border-slate-100 hover:bg-slate-50'
                }`}
            >
              <div className="absolute inset-0 bg-white/10 translate-y-20 group-hover:translate-y-0 transition-transform duration-300"></div>
              <btn.icon size={20} className="relative z-10" />
              <div className="text-left relative z-10">
                <p className="text-[10px] font-black uppercase leading-none">{btn.label}</p>
                <p className="text-[8px] font-black uppercase opacity-60 mt-1">{btn.sub}</p>
              </div>
            </button>
          ))}
        </div>

      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scroller::-webkit-scrollbar { width: 4px; }
        .custom-scroller::-webkit-scrollbar-track { background: transparent; }
        .custom-scroller::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scroller:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
      `}} />

      {/* Bardan Price Modal */}
      {showPriceModal && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setShowPriceModal(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden">

            {/* Modal Header */}
            <div className="p-10 bg-[#F8FAFC] border-b border-slate-100 flex justify-between items-center relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-48 h-48 bg-amber-50 rounded-full blur-3xl opacity-60"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                    <Tag size={18} />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Bardan Rate</h2>
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Price per Gunny Bag (₹)</p>
              </div>
              <button onClick={() => setShowPriceModal(false)} className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-rose-600 rounded-lg transition-all shadow-sm relative z-10">
                <X size={18} />
              </button>
            </div>

            {/* Current Price Display */}
            {bardanPrice > 0 && (
              <div className="mx-10 mt-8 p-5 bg-amber-50 border border-amber-100 rounded-lg flex justify-between items-center">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest italic">Current Rate</p>
                <p className="text-xl font-black text-amber-800 italic font-mono">₹{parseFloat(bardanPrice).toFixed(2)}</p>
              </div>
            )}

            {/* Price Input */}
            <div className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic ml-2">New Price Per Bardan (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={priceForm.price_per_bardan}
                    onChange={(e) => setPriceForm({ price_per_bardan: e.target.value })}
                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border-none rounded-lg outline-none font-black text-slate-800 text-xl font-mono italic shadow-inner focus:ring-4 focus:ring-amber-100 transition-all"
                    autoFocus
                  />
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-2">
                  This rate will be used to compute estimated bardan value across the system.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={saveBardanPrice}
                  disabled={!priceForm.price_per_bardan}
                  className="flex-1 py-5 bg-amber-500 text-white rounded-lg font-black uppercase text-[10px] tracking-[0.3em] shadow-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-3 italic disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={18} /> Commit Rate
                </button>
                <button
                  onClick={() => setShowPriceModal(false)}
                  className="px-8 py-5 bg-slate-100 text-slate-400 rounded-lg font-black uppercase text-[10px] tracking-[0.3em] italic"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BardanPortfolio;
