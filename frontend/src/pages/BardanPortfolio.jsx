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
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';

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

  const handleVoid = async (id, type) => {
    if (!window.confirm('⚠️ Are you sure you want to VOID this transaction? This will set quantity to zero but keep the record for audit.')) return;
    try {
      setLoading(true);
      // 1. Fetch current details to preserve other fields
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
      console.error('Voiding failed:', error);
      setMessage({ type: 'error', text: 'Operational failure during voiding' });
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12">
      <div className="max-w-[1600px] mx-auto px-8">
        {showHistory ? (
          <div className="animate-in slide-in-from-right duration-500">
            <PageHeader
              eyebrow="Asset Management / Logistics"
              eyebrowIcon={<ArrowLeftRight size={12} />}
              title="Bardan Registry"
              subtitle="Combined Logistics & Return Manifest"
            >
              <button
                onClick={() => setShowHistory(false)}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-all"
              >
                <X size={16} /> Exit History
              </button>
            </PageHeader>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                    <tr key={row.id || i} className="group hover:bg-slate-50/50 transition-all">
                      <td className="px-10 py-6">
                        <p className="text-sm font-bold text-slate-600 font-mono">
                          {(row.date || row.entry_date) ? new Date(row.date || row.entry_date).toLocaleDateString() : '—'}
                        </p>
                      </td>
                      <td className="px-10 py-6">
                        <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{row.particulars || row.name || (row.type === 'GIVEN' ? 'Given' : 'Returned')}</p>
                        {row.pavti_no && <p className="text-[10px] font-bold text-blue-500 tracking-widest uppercase mt-0.5">PVT: {row.pavti_no}</p>}
                      </td>
                      <td className="px-10 py-6 text-right">
                        <p className="text-lg font-bold text-slate-800">{row.debit ?? (row.type === 'GIVEN' ? row.qty : '—')}</p>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <p className="text-lg font-bold text-emerald-600">{row.credit ?? (row.type === 'RETURNED' ? row.qty : '—')}</p>
                      </td>
                      <td className="px-10 py-6 text-right">
                        {row.balance != null ? (
                          <p className={`text-xl font-bold ${row.balance > 0 ? 'text-rose-500' : 'text-slate-900'
                            }`}>{row.balance}</p>
                        ) : (
                          <p className="text-[10px] font-bold text-slate-300 uppercase leading-tight">Select member<br />for balance</p>
                        )}
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                          {row.id !== 'OP' && (
                            <>
                              <button onClick={() => handleEdit(row)} title="Edit Entry" className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-lg shadow-sm transition-all"><ChevronRight size={16} /></button>
                              <button onClick={() => handleVoid(row.id, row.type)} title="Void Entry (Zero out)" className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 rounded-lg shadow-sm transition-all"><RefreshCcw size={16} /></button>
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
          <div className="animate-in fade-in duration-700">
            <PageHeader
              eyebrow="Asset Management / Logistics"
              eyebrowIcon={<ArrowLeftRight size={12} />}
              title="Gunny Bag Portfolio"
              subtitle="Unified Asset Protocol / Bardan Ledger"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPriceModal(true)}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-slate-600"
                >
                  <Tag size={15} /> Bardan Rate
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-slate-600"
                >
                  <History size={15} /> History
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                >
                  <Save size={15} /> Commit Transaction
                </button>
              </div>
            </PageHeader>
            {message && (
              <div className={`mb-6 p-5 rounded-lg flex items-center gap-4 animate-in slide-in-from-top duration-300 border-l-[6px] ${message.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'
                }`}>
                {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                <span className="text-sm font-bold tracking-tight uppercase tracking-widest">{message.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-[0.02] select-none pointer-events-none">
                    <Package size={240} />
                  </div>

                  <div className="flex gap-4 p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                    <button
                      onClick={() => setFormData({ ...formData, type: 'GIVEN' })}
                      disabled={!!formData.id}
                      className={`flex-1 py-3.5 rounded-lg flex items-center justify-center gap-3 transition-all font-bold text-xs uppercase tracking-wider ${formData.type === 'GIVEN'
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-100'
                        : 'text-slate-500 hover:bg-white hover:text-slate-800'
                        } ${formData.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <TrendingUp size={16} /> Give Bags (Uthar)
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, type: 'RETURNED' })}
                      disabled={!!formData.id}
                      className={`flex-1 py-3.5 rounded-lg flex items-center justify-center gap-3 transition-all font-bold text-xs uppercase tracking-wider ${formData.type === 'RETURNED'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
                        : 'text-slate-500 hover:bg-white hover:text-slate-800'
                        } ${formData.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <TrendingDown size={16} /> Return Bags (Jama)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Registry Prototype</label>
                      <select
                        name="bookType"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all font-bold text-sm text-slate-700 appearance-none uppercase"
                        value={formData.bookType}
                        onChange={handleChange}
                      >
                        <option>Combo1</option>
                        <option>Combo2</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('bardanEntry.pavti_no')}</label>
                      <input
                        name="pavtiNo"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all font-bold text-sm text-slate-700 placeholder:text-slate-300"
                        placeholder="ENTER PVT NO."
                        value={formData.pavtiNo}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('bardanEntry.date')}</label>
                      <input
                        type="date"
                        name="date"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all font-bold text-sm text-slate-700"
                        value={formData.date}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Identity Node</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <select
                          name="code"
                          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all font-bold text-sm text-slate-700 appearance-none uppercase"
                          value={formData.code}
                          onChange={handleChange}
                        >
                          <option value="">IDENTITY NODE...</option>
                          {members.map(m => <option key={m.id} value={m.member_code}>{m.member_code}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Alias Pointer</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <select
                          name="name"
                          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all font-bold text-sm text-slate-700 appearance-none uppercase"
                          value={formData.name}
                          onChange={handleChange}
                        >
                          <option value="">NAME REFERENCE...</option>
                          {members.map(m => <option key={m.id} value={m.member_name}>{m.member_name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Transaction Volume</label>
                      <div className="relative group">
                        <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                        <input
                          type="number"
                          name="qty"
                          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all font-bold text-sm text-slate-700 placeholder:text-slate-300"
                          placeholder="0.00"
                          value={formData.qty}
                          onChange={handleChange}
                        />
                        {formData.type === 'RETURNED' && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-lg">
                            <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest leading-none mb-0.5">Stock Debt</p>
                            <p className="text-[10px] font-black text-emerald-700 leading-none">#{balanceData.balance || 0}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Membership Status</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <input
                          type="checkbox"
                          id="memNominalCheck"
                          className="w-5 h-5 rounded text-blue-600 border-slate-300 focus:ring-blue-500 transition-all cursor-pointer"
                          checked={formData.memNominal === 'Member'}
                          onChange={(e) => setFormData({ ...formData, memNominal: e.target.checked ? 'Member' : 'Nominal' })}
                        />
                        <label htmlFor="memNominalCheck" className="text-xs font-bold uppercase tracking-wider text-slate-700 cursor-pointer select-none">
                          {formData.memNominal === 'Member' ? 'Sabhasad (Active Member)' : 'Nominal Member'}
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t('bardanEntry.remark')}</label>
                    <div className="relative group">
                      <Info className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                      <textarea
                        name="remark"
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all font-bold text-sm text-slate-700 min-h-[100px] placeholder:text-slate-300"
                        placeholder="ADDITIONAL CONTEXT..."
                        value={formData.remark}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp size={16} className="text-blue-600" />
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Asset Load</p>
                    </div>
                    <p className="text-lg font-black text-slate-900 tracking-tight">#{((balanceData.opening || 0) + (balanceData.taken || 0)).toFixed(2)}</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingDown size={16} className="text-emerald-600" />
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Return Reg</p>
                    </div>
                    <p className="text-lg font-black text-emerald-700 tracking-tight">#{balanceData.returned}</p>
                  </div>

                  <div className="p-5 bg-white rounded-lg border-2 border-blue-600 shadow-lg shadow-blue-50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                      <Database size={48} className="text-blue-600" />
                    </div>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest relative z-10">Net Position</p>
                    <div className="flex items-baseline gap-2 mt-1 relative z-10">
                      <p className="text-3xl font-black text-slate-900 tracking-tight">#{balanceData.balance}</p>
                      <span className="text-[8px] text-blue-600 font-bold uppercase tracking-widest">Outstanding</span>
                    </div>
                    {bardanPrice > 0 && (
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-3 relative z-10 pt-3 border-t border-slate-100">
                        VALUATION: ₹{(balanceData.balance * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
                  <TableHeading
                    icon={<Layout size={18} />}
                    iconColor="blue"
                    title="Transaction Context"
                    subtitle="Allocation & Category Mapping"
                  />
                  
                  <div className="p-6 space-y-6">
                    {formData.type === 'RETURNED' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 italic">Return Category</label>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <select
                            name="option"
                            className="w-full bg-transparent border-none outline-none font-bold text-xs text-slate-700 uppercase appearance-none"
                            value={formData.option}
                            onChange={handleChange}
                          >
                            <option value="Company">Company Bags</option>
                            <option value="Self">Self Bags (Penalty Applies)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 italic">Allocation Matrix</label>
                      <div className="max-h-[300px] overflow-y-auto pr-2 custom-scroller">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                              <th className="py-2 text-center w-8">#</th>
                              <th className="py-2 px-1 text-left">POS 1</th>
                              <th className="py-2 px-1 text-left">POS 2</th>
                              <th className="py-2 px-1 text-left">POS 3</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {gridRows.map((row, i) => (
                              <tr key={i} className="group">
                                <td className="text-center font-bold text-slate-300">{i + 1}</td>
                                <td className="px-1 py-1">
                                  <input
                                    className="w-full bg-slate-50 border border-transparent rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all font-mono"
                                    value={row.col1}
                                    onChange={(e) => {
                                      const r = [...gridRows]; r[i].col1 = e.target.value; setGridRows(r);
                                    }}
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <input
                                    className="w-full bg-slate-50 border border-transparent rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all font-mono"
                                    value={row.col2}
                                    onChange={(e) => {
                                      const r = [...gridRows]; r[i].col2 = e.target.value; setGridRows(r);
                                    }}
                                  />
                                </td>
                                <td className="px-1 py-1">
                                  <input
                                    className="w-full bg-slate-50 border border-transparent rounded-lg px-2 py-1.5 font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all font-mono"
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

                  <div className="p-5 border-t border-slate-100">
                    <div className="flex justify-between items-center text-blue-600 px-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider">Total Volume</p>
                      <p className="text-2xl font-black tracking-tight">{parseFloat(formData.qty || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scroller::-webkit-scrollbar { width: 4px; }
        .custom-scroller::-webkit-scrollbar-track { background: transparent; }
        .custom-scroller::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scroller:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
      `}} />

      {showPriceModal && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPriceModal(false)}></div>
          <div className="bg-white rounded-lg w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <Tag size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Bardan Protocol</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configure System Rate (₹)</p>
                </div>
              </div>
              <button onClick={() => setShowPriceModal(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-8 bg-slate-50/30">
              {/* Current Status Display */}
              <div className="p-5 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <Database size={14} className="text-blue-400" />
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Active System Rate</p>
                </div>
                <p className="text-xl font-black text-blue-700 tracking-tighter">₹{parseFloat(bardanPrice || 0).toFixed(2)}</p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">New Market Valuation (Per Bag)</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 group-focus-within:border-blue-500 group-focus-within:text-blue-500 transition-all">
                    <IndianRupee size={14} />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full pl-16 pr-4 py-4 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all placeholder:text-slate-200"
                    placeholder="0.00"
                    value={priceForm.price_per_bardan}
                    onChange={(e) => setPriceForm({ ...priceForm, price_per_bardan: e.target.value })}
                  />
                </div>
                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider leading-relaxed ml-1">
                  This rate defines the financial value of gunny bags for all ledger computations.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPriceModal(false)}
                  className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 font-bold uppercase tracking-widest text-[10px] rounded-lg hover:bg-slate-50 transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={saveBardanPrice}
                  className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest text-[10px] rounded-lg shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Save size={16} /> Update Protocol
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
