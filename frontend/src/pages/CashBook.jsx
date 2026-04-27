import React, { useState, useEffect } from 'react';
import { Plus, Search, TrendingDown, TrendingUp, DollarSign, X, Calendar, Activity, Database } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export default function CashBook() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [balance, setBalance] = useState({ total_cash_in: 0, total_cash_out: 0, current_balance: 0 });
  const [dailySummary, setDailySummary] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [company, setCompany] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    cash_in: 0,
    cash_out: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    if (company?.id) {
      fetchCashBook();
      fetchBalance();
    }
  }, [company]);

  const loadCompany = async () => {
    try {
      const response = await axios.get('/api/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      } else {
        setCompany(null);
      }
    } catch (error) {
      setCompany(null);
    }
  };

  const fetchCashBook = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/cash-book?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setEntries(response.data.data);
        applyFilters(response.data.data);
        fetchDailySummary();
      }
    } catch (err) {
      setError('Failed to fetch cash book');
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/cash-book/balance/current`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setBalance(response.data.data);
      }
    } catch (err) {
      console.error('Fetch balance error:', err);
    }
  };

  const fetchDailySummary = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/cash-book/summary/daily?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setDailySummary(response.data.data);
      }
    } catch (err) {
      console.error('Fetch daily summary error:', err);
    }
  };

  const applyFilters = (entriesData = entries) => {
    const filtered = entriesData.filter(entry =>
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reference_no.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEntries(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (!formData.description) {
        setError('Description is required');
        setLoading(false);
        return;
      }

      if (formData.cash_in === 0 && formData.cash_out === 0) {
        setError('Enter cash in or cash out amount');
        setLoading(false);
        return;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/cash-book/manual`,
        {
          transaction_date: formData.transaction_date,
          description: formData.description,
          cash_in: parseFloat(formData.cash_in) || 0,
          cash_out: parseFloat(formData.cash_out) || 0,
          notes: formData.notes
        },
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );

      if (response.data.success) {
        setSuccess('Cash entry added successfully!');
        setFormData({
          transaction_date: new Date().toISOString().split('T')[0],
          description: '',
          cash_in: 0,
          cash_out: 0,
          notes: ''
        });
        setTimeout(() => {
          setShowForm(false);
          fetchCashBook();
          fetchBalance();
          setSuccess('');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add entry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [searchTerm]);

  const handleDateChange = () => {
    fetchCashBook();
    fetchBalance();
  };

  if (!company || !company.id) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center font-black uppercase tracking-widest text-slate-400">
          <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-lg mb-4 italic">Establishing secure connection...</p>
          <div className="w-16 h-1 bg-slate-200 mx-auto overflow-hidden rounded-full">
            <div className="w-full h-full bg-black animate-[slide_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-900 font-sans">

      {/* Header - Industrial Monochrome */}
      <div className="flex justify-between items-end border-b-4 border-black pb-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{t('cashBook.title', 'Cash Book')}</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">{company.company_name} / LIQUIDITY LEDGER</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-8 py-3 bg-black text-white rounded-2xl hover:bg-slate-800 font-black shadow-2xl transition-all active:scale-95 uppercase tracking-widest text-xs"
        >
          <Plus size={18} strokeWidth={3} />
          {t('cashBook.addEntry', 'Inject Capital / Debit')}
        </button>
      </div>

      {/* Stats Cards - Sleek Grayscale */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-900 group hover:bg-slate-900 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">Cash Influx</p>
              <p className="text-3xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white">
                ₹{parseFloat(balance.total_cash_in || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingUp size={24} className="text-slate-300 group-hover:text-white transition-colors" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-500 group hover:bg-slate-800 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">Cash Outflow</p>
              <p className="text-3xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white">
                ₹{parseFloat(balance.total_cash_out || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingDown size={24} className="text-slate-300 group-hover:text-white transition-colors" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-black group hover:bg-black transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">Current Liquidity</p>
              <p className={`text-4xl font-black mt-1 tracking-tighter group-hover:text-white ${parseFloat(balance.current_balance) >= 0 ? 'text-slate-900' : 'text-red-600'
                }`}>
                ₹{parseFloat(balance.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <DollarSign size={24} className="text-slate-300 group-hover:text-white transition-colors" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border-l-8 border-slate-300 group hover:bg-slate-600 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-slate-500">Total Records</p>
              <p className="text-4xl font-black text-slate-900 mt-1 tracking-tighter group-hover:text-white">{filteredEntries.length}</p>
            </div>
            <Activity size={24} className="text-slate-300 group-hover:text-white transition-colors" />
          </div>
        </div>
      </div>

      {/* Daily Summary Ribbon */}
      {dailySummary.length > 0 && (
        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 p-4 border-b border-black">
            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic flex items-center gap-2">
              <div className="w-4 h-1 bg-white"></div>
              Chronological Daily Aggregation
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-widest font-black text-slate-400">
                <tr>
                  <th className="px-6 py-3 text-left">Timeline</th>
                  <th className="px-6 py-3 text-right">Influx (+)</th>
                  <th className="px-6 py-3 text-right">Outflow (-)</th>
                  <th className="px-6 py-3 text-right">Net Differential</th>
                  <th className="px-6 py-3 text-center">Batch Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailySummary.map((day) => (
                  <tr key={day.transaction_date} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-3 font-mono font-bold text-slate-600">{new Date(day.transaction_date).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-3 text-right text-slate-900 font-black">
                      ₹{parseFloat(day.daily_in || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-400 font-bold">
                      ₹{parseFloat(day.daily_out || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-6 py-3 text-right font-black italic underline decoration-slate-100 ${parseFloat(day.daily_net) >= 0 ? 'text-black' : 'text-red-700'
                      }`}>
                      ₹{parseFloat(day.daily_net || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="bg-slate-100 px-2 py-1 rounded text-[9px] font-black border border-slate-200">{day.transaction_count} TX</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Global Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-slate-100 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[250px]">
          <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Global Audit Search</span>
          <div className="relative group">
            <Search className="absolute left-4 top-3 text-slate-300 group-focus-within:text-black transition-colors" size={18} />
            <input
              type="text"
              placeholder="SEARCH BY DESCRIPTION OR REFERENCE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-black transition-all bg-slate-50 font-black uppercase text-xs"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Start Point</span>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-4 py-2 border-2 border-slate-100 rounded-2xl focus:border-black transition-all font-black text-xs uppercase bg-white cursor-pointer"
            />
          </div>
          <div>
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">End Point</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-4 py-2 border-2 border-slate-100 rounded-2xl focus:border-black transition-all font-black text-xs uppercase bg-white cursor-pointer"
            />
          </div>
          <button
            onClick={handleDateChange}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-2xl hover:bg-black font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg h-[41px]"
          >
            {t('common.filter', 'EXECUTE')}
          </button>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Registry Date</th>
                <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Description / Nomenclature</th>
                <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Doc Ref</th>
                <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Module</th>
                <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px]">Influx (+)</th>
                <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px]">Outflow (-)</th>
                <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px]">Net Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-slate-400 font-black uppercase tracking-[0.3em] text-xs italic">
                    NO LIQUIDITY ENTRIES DETECTED
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 font-mono font-bold text-slate-500 text-[11px]">
                      {new Date(entry.transaction_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900 text-xs uppercase tracking-tight">{entry.description}</td>
                    <td className="px-6 py-4 text-[10px] text-slate-400 font-black uppercase tracking-widest">{entry.reference_no || 'MANUAL_POS'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.1em] border-2 ${entry.reference_type === 'sale' ? 'bg-slate-100 text-black border-black' :
                          entry.reference_type === 'sale_return' ? 'bg-black text-white border-black' :
                            entry.reference_type === 'purchase' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                              'bg-white text-slate-400 border-slate-100'
                        }`}>
                        {entry.reference_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-900 font-black italic text-sm">
                      {parseFloat(entry.cash_in || 0) > 0 ? `₹${parseFloat(entry.cash_in).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 font-bold text-sm">
                      {parseFloat(entry.cash_out || 0) > 0 ? `₹${parseFloat(entry.cash_out).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className={`px-6 py-4 text-right font-black text-sm italic ${parseFloat(entry.net_amount) >= 0 ? 'text-black' : 'text-red-700 underline decoration-red-100'
                      }`}>
                      ₹{parseFloat(entry.net_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Form Modal - High Contrast Industrial */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden border border-slate-700">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase italic">Manual Cash Entry</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Ledger Injection Control</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="bg-slate-800 hover:bg-red-600 text-white p-2 rounded-xl transition-all active:scale-90"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border-l-4 border-red-800 font-bold text-xs uppercase tracking-widest italic">
                  Critical Error: {error}
                </div>
              )}
              {success && (
                <div className="p-4 bg-slate-900 text-white rounded-xl border-l-4 border-white font-black text-xs uppercase tracking-[0.2em] animate-pulse">
                  Transaction Verified: {success}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Registry Date</span>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 text-slate-300" size={16} />
                    <input
                      type="date"
                      value={formData.transaction_date}
                      onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-black transition-all bg-slate-50 font-black text-xs uppercase h-12"
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nomenclature / Purpose</span>
                  <input
                    type="text"
                    placeholder="E.G., MISC OFFICE OVERHEADS, CAPITAL INJECTION..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-black transition-all bg-slate-50 font-black text-xs uppercase h-12 placeholder:text-slate-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Influx (+)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cash_in}
                      onChange={(e) => setFormData({ ...formData, cash_in: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-black transition-all bg-slate-50 font-black text-sm h-12 text-slate-900"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Outflow (-)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cash_out}
                      onChange={(e) => setFormData({ ...formData, cash_out: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-black transition-all bg-slate-50 font-black text-sm h-12 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Internal Manifesto (Notes)</span>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                    placeholder="OPTIONAL CONTEXTUAL DATA..."
                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-black transition-all bg-slate-50 font-bold text-xs uppercase placeholder:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-4 border-2 border-slate-100 text-slate-400 rounded-xl hover:bg-slate-50 font-black uppercase tracking-widest text-[10px] transition-all"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-3 px-8 py-4 bg-black text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl transition-all active:scale-95"
                >
                  {loading ? 'PROCESSING...' : 'COMMIT TRANSACTION'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
