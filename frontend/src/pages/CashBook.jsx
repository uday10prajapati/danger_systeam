import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar, Search, 
  Plus, Filter, Download, ArrowUpRight, ArrowDownLeft,
  MoreHorizontal, Edit2, Trash2, Database, Layout, 
  ChevronRight, RefreshCcw, History
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import TableHeading from '../components/TableHeading';
import CashEntryModal from '../components/CashEntryModal';
import api from '../api';

export default function CashBook() {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total_in: 0, total_out: 0, balance: 0 });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('debit'); // 'credit' or 'debit'
  const [editingId, setEditingId] = useState(null);

  const [company, setCompany] = useState(null);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const response = await api.get('/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load company', error);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchData();
    }
  }, [dateRange, company]);

  const fetchData = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const response = await api.get('/cash-book', {
        params: dateRange
      });
      if (response.data.success) {
        setEntries(response.data.data);
        setFilteredEntries(response.data.data);
        calculateSummary(response.data.data);
      }
    } catch (error) {
      console.error('Fetch cash book error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data) => {
    const total_in = data.reduce((sum, item) => sum + parseFloat(item.cash_in || 0), 0);
    const total_out = data.reduce((sum, item) => sum + parseFloat(item.cash_out || 0), 0);
    setSummary({
      total_in,
      total_out,
      balance: total_in - total_out
    });
  };

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = entries.filter(item => 
      item.description?.toLowerCase().includes(term) || 
      (item.reference_no && item.reference_no.toLowerCase().includes(term)) ||
      (item.notes && item.notes.toLowerCase().includes(term))
    );
    setFilteredEntries(filtered);
  }, [searchTerm, entries]);

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setModalType(parseFloat(entry.cash_in) > 0 ? 'credit' : 'debit');
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await api.delete(`/cash-book/${id}`);
      fetchData();
    } catch (error) {
      alert('Failed to delete: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12">
      <div className="max-w-[1600px] mx-auto px-8">
        
        <PageHeader
          eyebrow="Financial Management / Treasury"
          eyebrowIcon={<Database size={12} />}
          title="Cash Book Registry"
          subtitle="Real-time monitor for cash liquidity and manual journals"
        >
          <div className="flex items-center gap-3">
             <button 
               onClick={() => { setEditingId(null); setModalType('credit'); setModalOpen(true); }}
               className="px-4 py-2.5 bg-white text-emerald-600 border border-slate-200 rounded-lg hover:bg-emerald-50 transition-all font-bold text-xs flex items-center gap-2 shadow-sm"
             >
               <ArrowUpRight size={15} /> Jama Entry
             </button>
             <button 
               onClick={() => { setEditingId(null); setModalType('debit'); setModalOpen(true); }}
               className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold text-xs flex items-center gap-2 shadow-sm"
             >
               <ArrowDownLeft size={15} /> Udhar Entry
             </button>
          </div>
        </PageHeader>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <TrendingUp size={64} className="text-emerald-600" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Receipts (Jama)</p>
            <h3 className="text-2xl font-black text-emerald-600 italic">
              ₹{summary.total_in.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded italic">+ Liquidity Stream</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <TrendingDown size={64} className="text-rose-500" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Payments (Udhar)</p>
            <h3 className="text-2xl font-black text-rose-600 italic">
              ₹{summary.total_out.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded italic">- Outgoing Flow</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden group ring-2 ring-blue-600/5">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <DollarSign size={64} className="text-blue-600" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Net Cash Balance</p>
            <h3 className="text-2xl font-black text-slate-900 italic">
              ₹{summary.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <div className="mt-4 flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded italic ${summary.balance >= 0 ? 'text-blue-600 bg-blue-50' : 'text-amber-600 bg-amber-50'}`}>
                {summary.balance >= 0 ? 'Positive Liquidity' : 'Liquidity Deficit'}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search records..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-64"
              />
            </div>
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <input 
                type="date" 
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className="bg-transparent text-xs font-bold text-slate-600 outline-none"
              />
              <span className="text-slate-300 text-xs">to</span>
              <input 
                type="date" 
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className="bg-transparent text-xs font-bold text-slate-600 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
              <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-slate-400 transition-all">
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {/* Registry Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <TableHeading
            icon={<Layout size={18} />}
            iconColor="blue"
            title="Transaction Manifest"
            subtitle="Historical ledger of all cash movements"
            count={filteredEntries.length}
          />
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="uppercase text-[10px] font-black text-slate-400 tracking-[0.1em] italic">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Manifest Details</th>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4 text-right">Jama (In)</th>
                  <th className="px-6 py-4 text-right">Udhar (Out)</th>
                  <th className="px-6 py-4 text-right">Balance</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="7" className="px-6 py-4 h-16 bg-slate-50/20" />
                    </tr>
                  ))
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Database size={32} strokeWidth={1} className="mb-2" />
                        <p className="text-xs font-bold italic">No matching records found for this period.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry, idx) => (
                    <tr key={entry.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-[11px] font-bold text-slate-500">
                        {new Date(entry.transaction_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-slate-900 uppercase italic tracking-tight">{entry.description}</p>
                        {entry.notes && <p className="text-[10px] font-bold text-slate-400 italic mt-0.5 truncate max-w-[300px]">{entry.notes}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-tighter">
                            {entry.reference_no || 'MANUAL'}
                          </span>
                          <span className={`mt-1 inline-flex w-fit px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                            entry.reference_type === 'sale' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            entry.reference_type === 'purchase' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            'bg-slate-50 text-slate-400 border-slate-100'
                          }`}>
                            {entry.reference_type || 'Core'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-emerald-600 italic text-sm">
                        {parseFloat(entry.cash_in || 0) > 0 ? `₹${parseFloat(entry.cash_in).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-rose-500 italic text-sm">
                        {parseFloat(entry.cash_out || 0) > 0 ? `₹${parseFloat(entry.cash_out).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className={`px-6 py-4 text-right font-black text-sm italic ${parseFloat(entry.net_amount || entry.balance) >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                        ₹{parseFloat(entry.net_amount || entry.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(entry)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                            title="Edit Record"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all"
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <CashEntryModal
          company={company}
          type={modalType}
          editId={editingId}
          onClose={() => { setModalOpen(false); setEditingId(null); }}
          onSubmit={() => { setModalOpen(false); setEditingId(null); fetchData(); }}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .scroller-airy::-webkit-scrollbar { width: 5px; }
        .scroller-airy::-webkit-scrollbar-track { background: transparent; }
        .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
    </div>
  );
}
