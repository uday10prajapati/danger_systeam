import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Printer, Save,
  Search, X, RefreshCcw, Calendar,
  AlertCircle, CheckCircle, History,
  Package, User, FileText, ChevronRight,
  Database, Info, Layout, TrendingUp, TrendingDown,
  ArrowLeftRight, IndianRupee, Tag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api, { jamaBardanEntryApi, sabhasadMasterApi, bardanEntryApi } from '../api';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';
import { formatBilingualText } from '../utils/textUtils';

const JamaBardanEntry = () => {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({
    id: null,
    bookType: 'Combo1',
    pavtiNo: '',
    date: new Date().toISOString().split('T')[0],
    memNominal: '',
    code: '',
    name: '',
    qty: '',
    option: 'Combo1',
    remark: '',
    dayQty: '',
    totalQty: ''
  });

  const [gridRows, setGridRows] = useState(Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [members, setMembers] = useState([]);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [balanceData, setBalanceData] = useState({ taken: 0, returned: 0, balance: 0 });
  const [bardanPrice, setBardanPrice] = useState(0);

  useEffect(() => {
    loadData();
    loadBardanPrice();
  }, []);

  useEffect(() => {
    // Auto-calculate total from grid if data exists
    const total = gridRows.reduce((acc, row) => {
      const sum = (parseFloat(row.col1) || 0) + (parseFloat(row.col2) || 0) + (parseFloat(row.col3) || 0);
      return acc + sum;
    }, 0);
    if (total > 0) {
      setFormData(prev => ({ ...prev, qty: total.toFixed(2) }));
    }
  }, [gridRows]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersRes, historyRes] = await Promise.all([
        sabhasadMasterApi.getAllSabhasad(),
        jamaBardanEntryApi.getAllEntries()
      ]);

      if (membersRes.data.success) setMembers(membersRes.data.data || membersRes.data);
      else if (Array.isArray(membersRes.data)) setMembers(membersRes.data);

      if (historyRes.data.success) setHistory(historyRes.data.data);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setMessage({ type: 'error', text: 'Synchronization failure' });
    } finally {
      setLoading(false);
    }
  };

  const loadBardanPrice = async () => {
    try {
      const res = await api.get('/bardan-price');
      if (res.data.success) {
        setBardanPrice(res.data.data?.price_per_bardan || 0);
      }
    } catch (err) {
      console.error('Bardan price fetch error:', err);
    }
  };

  const fetchBalance = async (code) => {
    if (!code) {
      setBalanceData({ taken: 0, returned: 0, balance: 0 });
      return;
    }
    try {
      const res = await bardanEntryApi.getBalance(code);
      if (res.data.success) {
        setBalanceData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
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
      setMessage({ type: 'error', text: 'Identity and Date required' });
      return;
    }
    if (!formData.qty || parseFloat(formData.qty) <= 0) {
      setMessage({ type: 'error', text: 'Quantity must be greater than 0' });
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

      const res = formData.id
        ? await jamaBardanEntryApi.updateEntry(formData.id, payload)
        : await jamaBardanEntryApi.createEntry(payload);

      if (res.data.success) {
        setMessage({ type: 'success', text: formData.id ? 'Entry updated successfully' : 'Entry committed to registry' });
        if (!formData.id) resetForm();
        loadData();
        if (formData.code) fetchBalance(formData.code);
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: 'Operational failure during commit' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm('Decommission this transaction node?')) return;
    try {
      setLoading(true);
      const res = await jamaBardanEntryApi.deleteEntry(id);
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Node decommissioned' });
        loadData();
        if (formData.code) fetchBalance(formData.code);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Decommission failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (entryId) => {
    if (!entryId) return;
    try {
      setLoading(true);
      const res = await jamaBardanEntryApi.getEntryById(entryId);
      if (res.data.success) {
        const entry = res.data.data;
        setFormData({
          id: entry.id,
          bookType: entry.book_type,
          pavtiNo: entry.pavti_no,
          date: entry.entry_date ? new Date(entry.entry_date).toISOString().split('T')[0] : '',
          memNominal: entry.mem_nominal,
          code: entry.code,
          name: entry.name,
          qty: entry.qty,
          option: entry.option_type,
          remark: entry.remark,
          dayQty: entry.day_qty,
          totalQty: entry.total_qty
        });
        setGridRows(entry.gridRows || Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
        setShowHistory(false);
        fetchBalance(entry.code);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load manifest details' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      bookType: 'Combo1',
      pavtiNo: '',
      date: new Date().toISOString().split('T')[0],
      memNominal: '',
      code: '',
      name: '',
      qty: '',
      option: 'Combo1',
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
        <div className="max-w-[1600px] mx-auto px-8">
          <PageHeader
            eyebrow="Asset Management / Jama Vector"
            eyebrowIcon={<History size={12} />}
            title="Jama History"
            subtitle="Jama Gunny Bag Registry Manifest"
          >
            <button
              onClick={() => setShowHistory(false)}
              className="flex items-center gap-2 bg-white text-slate-600 px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-widest border border-slate-200 hover:border-slate-400 transition-all shadow-sm"
            >
              <X size={16} /> Exit History
            </button>
          </PageHeader>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mt-8">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-10 py-6">Identity</th>
                  <th className="px-10 py-6">Date & Pavti</th>
                  <th className="px-10 py-6 text-right">Quantity</th>
                  <th className="px-10 py-6 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((row) => (
                  <tr key={row.id} className="group hover:bg-slate-50/50 transition-all">
                    <td className="px-10 py-6">
                      <p className={`text-sm text-slate-800 tracking-tight ${i18n.language === 'gu' ? 'font-prompt' : 'font-bold uppercase'}`} style={i18n.language === 'gu' ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}>{formatBilingualText(row.name)}</p>
                      <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">CODE: {row.code}</p>
                    </td>
                    <td className="px-10 py-6">
                      <p className="text-sm font-bold text-slate-600 font-mono">{new Date(row.entry_date).toLocaleDateString('en-GB').replace(/\//g, '-')}</p>
                      <p className="text-[10px] font-bold text-blue-500 uppercase font-prompt"># {row.pavti_no || 'N/A'}</p>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <p className="text-2xl font-black text-slate-800 font-mono">{row.qty}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Bags Recorded</p>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEdit(row.id)} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-lg shadow-sm transition-all"><ChevronRight size={16} /></button>
                        <button onClick={() => handleDelete(row.id)} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 rounded-lg shadow-sm transition-all"><Trash2 size={16} /></button>
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
      <div className="max-w-[1600px] mx-auto px-8">

        {/* Header */}
        <PageHeader
          eyebrow="Asset Management / Return Entry"
          eyebrowIcon={<ArrowLeftRight size={12} />}
          title={t('jamaBardanEntry.title', 'Jama Bardan Entry')}
          subtitle="Physical Return Registry / Bag Credit Node"
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(true)}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-slate-600"
            >
              <History size={15} /> History
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm text-slate-600"
            >
              <RefreshCcw size={15} /> Reset
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
            >
              <Save size={15} /> Save Entry
            </button>
          </div>
        </PageHeader>

        {/* Messaging */}
        {message && (
          <div className={`mb-6 p-5 rounded-lg flex items-center gap-4 animate-in slide-in-from-top duration-300 border-l-[6px] ${message.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'
            }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <span className="text-sm font-bold tracking-tight uppercase tracking-widest">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Main Form (Left) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-[0.02] select-none pointer-events-none">
                <Package size={240} />
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
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all font-bold text-sm text-slate-700 placeholder:text-slate-300 font-prompt"
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
                      className={`w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all text-sm text-slate-700 appearance-none ${i18n.language === 'gu' ? 'font-prompt' : 'font-bold uppercase'}`}
                      style={i18n.language === 'gu' ? { fontFamily: "'Prompt', sans-serif" } : {}}
                      value={formData.name}
                      onChange={handleChange}
                    >
                      <option value="">{i18n.language === 'gu' ? 'નામ પસંદ કરો...' : 'NAME REFERENCE...'}</option>
                      {members.map(m => (
                        <option key={m.id} value={m.member_name} style={{ fontFamily: "'Prompt', sans-serif" }}>
                          {m.member_name_gu || m.member_name}
                        </option>
                      ))}
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
                      className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all font-bold text-sm text-slate-700 placeholder:text-slate-300 font-prompt"
                      placeholder="0.00"
                      value={formData.qty}
                      onChange={handleChange}
                    />
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
                    className={`w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none transition-all text-sm text-slate-700 min-h-[100px] placeholder:text-slate-300 ${i18n.language === 'gu' ? 'font-prompt' : 'font-bold uppercase'}`}
                    style={i18n.language === 'gu' ? { fontFamily: "'Prompt', sans-serif" } : {}}
                    placeholder="ADDITIONAL CONTEXT..."
                    value={formData.remark}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel (Metrics + Grid) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp size={16} className="text-blue-600" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Asset Load</p>
                </div>
                <p className="text-lg font-black text-slate-900 tracking-tight font-mono">#{balanceData.taken}</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingDown size={16} className="text-emerald-600" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Return Reg</p>
                </div>
                <p className="text-lg font-black text-emerald-700 tracking-tight font-mono">#{balanceData.returned}</p>
              </div>

              <div className="p-5 bg-white rounded-lg border-2 border-blue-600 shadow-lg shadow-blue-50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
                  <Database size={48} className="text-blue-600" />
                </div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest relative z-10">Net Position</p>
                <div className="flex items-baseline gap-2 mt-1 relative z-10">
                  <p className="text-3xl font-black text-slate-900 tracking-tight font-mono">#{balanceData.balance}</p>
                  <span className="text-[8px] text-blue-600 font-bold uppercase tracking-widest">Outstanding</span>
                </div>
                {bardanPrice > 0 && (
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-3 relative z-10 pt-3 border-t border-slate-100 font-mono">
                    VALUATION: ₹{(balanceData.balance * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-[520px]">
              <TableHeading
                icon={<Layout size={18} />}
                iconColor="blue"
                title="Bags Allocation Log"
                subtitle="Real-time batch entry grid"
              />

              <div className="flex-1 overflow-y-auto pr-2 custom-scroller p-5">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="py-3 text-center w-8">#</th>
                      <th className="py-3 px-2 text-left">POS 1</th>
                      <th className="py-3 px-2 text-left">POS 2</th>
                      <th className="py-3 px-2 text-left">POS 3</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {gridRows.map((row, i) => (
                      <tr key={i} className="group">
                        <td className="text-center font-bold text-slate-300">{i + 1}</td>
                        <td className="px-1 py-1.5">
                          <input
                            className="w-full bg-slate-50 border border-transparent rounded-lg px-2 py-2 font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all font-prompt"
                            value={row.col1}
                            onChange={(e) => {
                              const r = [...gridRows]; r[i].col1 = e.target.value; setGridRows(r);
                            }}
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <input
                            className="w-full bg-slate-50 border border-transparent rounded-lg px-2 py-2 font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all font-prompt"
                            value={row.col2}
                            onChange={(e) => {
                              const r = [...gridRows]; r[i].col2 = e.target.value; setGridRows(r);
                            }}
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <input
                            className="w-full bg-slate-50 border border-transparent rounded-lg px-2 py-2 font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all font-prompt"
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
        </div>

      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scroller::-webkit-scrollbar { width: 4px; }
        .custom-scroller::-webkit-scrollbar-track { background: transparent; }
        .custom-scroller::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scroller:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
      `}} />
    </div>
  );
};

export default JamaBardanEntry;
