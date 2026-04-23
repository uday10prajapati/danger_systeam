import React, { useState, useEffect } from 'react';
import { 
  Search, FileText, Printer, Database, 
  Calendar, ChevronRight, Activity, 
  RefreshCcw, ShieldCheck, Download,
  TrendingDown, TrendingUp, DollarSign,
  User, Layout, ChevronDown, CheckCircle2,
  X, Filter, Hash
} from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export default function LedgerReport() {
  const { t } = useTranslation();
  
  // States
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);
  const [accountName, setAccountName] = useState('');
  
  // Filter States
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [accountId, setAccountId] = useState('');
  const [printSubAmount, setPrintSubAmount] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const [accounts, setAccounts] = useState([]);

  // Navigation and Selection States
  const [memberCodeSearch, setMemberCodeSearch] = useState('');
  const [memberNameSearch, setMemberNameSearch] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const response = await axios.get('/api/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load company', error);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchAccounts();
    }
  }, [company]);

  const fetchAccounts = async () => {
    try {
      const accRes = await axios.get(`/api/accounts/company/${company.id}`, {
        headers: { 'x-company-id': company.id }
      });
      if (accRes.data.success) {
        setAccounts(accRes.data.data);
        if (accRes.data.data.length > 0) {
          handleSelectAccount(accRes.data.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load accounts', error);
    }
  };

  const handleSelectAccount = (acc) => {
    setAccountId(acc.id);
    setMemberCodeSearch(String(acc.id));
    setMemberNameSearch(acc.account_name);
    setShowMemberDropdown(false);
  };

  // Filter accounts based on dual-field search
  const filteredAccounts = accounts.filter(acc => {
    const codeMatch = memberCodeSearch ? String(acc.id).includes(memberCodeSearch) : true;
    const nameMatch = memberNameSearch ? acc.account_name.toLowerCase().includes(memberNameSearch.toLowerCase()) : true;
    return codeMatch && nameMatch;
  });

  // Automated Identity Synthesis: Auto-select on exact Code match
  useEffect(() => {
    if (memberCodeSearch && !accountId) {
       const exactMatch = accounts.find(acc => String(acc.id) === memberCodeSearch);
       if (exactMatch) {
          handleSelectAccount(exactMatch);
       }
    }
  }, [memberCodeSearch, accounts, accountId]);

  useEffect(() => {
    if (company?.id && accountId && dateRange.startDate && dateRange.endDate) {
      fetchReportData();
    }
  }, [accountId, dateRange.startDate, dateRange.endDate, company]);

  const fetchReportData = async () => {
    if (!company?.id || !accountId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/ledger-report/account/${accountId}`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        },
        headers: { 'x-company-id': company.id }
      });

      if (response.data.success) {
        setData(response.data.data);
        setTotals(response.data.totals);
        setAccountName(response.data.account_name);
      }
    } catch (error) {
      console.error('Fetch report error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatBalance = (balance) => {
    const val = parseFloat(balance);
    if (isNaN(val)) return '';
    const absVal = Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    if (val < 0) return `${absVal} CR`;
    if (val > 0) return `${absVal} DR`;
    return '0.00';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="text-center font-black uppercase tracking-widest text-slate-300">
          <p className="text-xs mb-6 italic tracking-[0.4em]">Establishing Audit Connectivity...</p>
          <div className="w-24 h-1 bg-slate-100 mx-auto overflow-hidden rounded-full relative">
             <div className="absolute top-0 left-0 w-1/2 h-full bg-blue-600 animate-[slide_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto px-8">
        
        {/* Superior Header - Dashboard Style */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center py-8 gap-6 print:hidden">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic">
              <Database size={12} />
              <span>Financial Core / Ledger Audit Registry</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Statement of Account</h1>
          </div>
          <div className="flex items-center gap-4">
             <button
               onClick={handlePrint}
               className="flex items-center gap-2 bg-white border border-slate-100 px-6 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95"
             >
               <Printer size={18} />
               Print Statement
             </button>
             <button
               onClick={fetchReportData}
               className="flex items-center gap-2 bg-blue-600 px-6 py-3 rounded-2xl text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
             >
               <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
               Synchronize
             </button>
          </div>
        </div>

        {/* Dynamic Metric Grid - Premium Shards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 print:hidden">
           {[
              { label: 'Baseline Exposure', val: formatBalance(data[0]?.opening_balance || 0), icon: <ShieldCheck size={18}/>, color: 'blue' },
              { label: 'Aggregate Debit', val: `₹${parseFloat(totals.debit || 0).toLocaleString('en-IN')}`, icon: <TrendingUp size={18}/>, color: 'indigo' },
              { label: 'Aggregate Credit', val: `₹${parseFloat(totals.credit || 0).toLocaleString('en-IN')}`, icon: <TrendingDown size={18}/>, color: 'amber' },
              { label: 'Closing Position', val: formatBalance(data[data.length - 1]?.running_balance || 0), icon: <CheckCircle2 size={18}/>, color: 'emerald' }
           ].map((stat, i) => (
             <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-slate-200 transition-all">
                <div className="flex justify-between items-start mb-4">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                   <div className={`p-2.5 bg-${stat.color}-50 text-${stat.color}-600 rounded-xl group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                </div>
                <p className={`text-2xl font-bold text-slate-800 tracking-tighter ${i === 3 ? 'text-emerald-600 animate-pulse' : ''}`}>{stat.val}</p>
             </div>
           ))}
        </div>

        {/* Control Deck - Page Container Style */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm mb-10 print:hidden">
          <div className="flex flex-wrap items-end justify-between gap-8">
             <div className="flex-1 flex flex-wrap items-end gap-6 relative">
                
                {/* Member ID Input */}
                <div className="w-full md:w-32 lg:w-40">
                   <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 italic">Node ID</span>
                   <div className="relative group">
                      <Hash size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                      <input 
                         type="text" 
                         value={memberCodeSearch} 
                         onChange={(e) => {
                            setMemberCodeSearch(e.target.value);
                            setShowMemberDropdown(true);
                            if (accountId) setAccountId('');
                         }}
                         onFocus={() => setShowMemberDropdown(true)}
                         placeholder="ID"
                         className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold uppercase text-[11px] tracking-widest"
                      />
                   </div>
                </div>

                {/* Member Name Search */}
                <div className="flex-1 min-w-[300px]">
                   <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 italic">Identity Nomenclature</span>
                   <div className="relative group">
                      <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                      <input 
                         type="text" 
                         value={memberNameSearch} 
                         onChange={(e) => {
                            setMemberNameSearch(e.target.value);
                            setShowMemberDropdown(true);
                            if (accountId) setAccountId('');
                         }}
                         onFocus={() => setShowMemberDropdown(true)}
                         placeholder="SEARCH IDENTITY REGISTRY..."
                         className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-bold uppercase text-[11px] tracking-widest"
                      />
                   </div>
                </div>

                {/* Dropdown Results */}
                {showMemberDropdown && (filteredAccounts.length > 0) && (
                   <div className="absolute top-[85px] left-0 right-0 bg-white border border-slate-100 shadow-2xl rounded-[1.5rem] overflow-hidden z-[100] animate-in zoom-in-95 duration-200">
                      <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center italic">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identified Nodes in Registry</span>
                         <X size={12} className="text-slate-300 cursor-pointer" onClick={() => setShowMemberDropdown(false)} />
                      </div>
                      <div className="max-h-56 overflow-y-auto scroller-airy">
                         {filteredAccounts.map((acc) => (
                           <div 
                              key={acc.id} 
                              onClick={() => handleSelectAccount(acc)}
                              className="px-8 py-4 hover:bg-blue-50 flex justify-between items-center cursor-pointer group transition-colors border-b border-slate-50 last:border-none"
                           >
                              <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600 uppercase italic">{acc.account_name}</span>
                              <span className="text-[10px] font-bold text-slate-300 group-hover:text-blue-300 tracking-[0.2em]">NODE_#{acc.id}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                )}
                
                <div className="flex items-center gap-4 h-12 pb-1 text-slate-200"><ChevronRight size={24} /></div>

                <div className="flex flex-wrap items-end gap-4">
                   <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 italic">Temporal Start</span>
                      <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})} className="bg-slate-50/50 border border-slate-100 rounded-2xl px-6 py-3.5 text-xs font-bold text-slate-600 outline-none focus:bg-white focus:border-blue-500 transition-all font-mono" />
                   </div>
                   <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 italic">Temporal End</span>
                      <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})} className="bg-slate-50/50 border border-slate-100 rounded-2xl px-6 py-3.5 text-xs font-bold text-slate-600 outline-none focus:bg-white focus:border-blue-500 transition-all font-mono" />
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-6 p-2 bg-slate-50/50 rounded-2xl border border-slate-100">
                <label className="flex items-center gap-3 px-4 py-2 cursor-pointer group transition-all">
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${printSubAmount ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}>
                     <input type="checkbox" checked={printSubAmount} onChange={e => setPrintSubAmount(e.target.checked)} className="hidden" />
                     {printSubAmount && <X size={12} className="text-white rotate-45" />}
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors italic">Sub-Amounts</span>
                </label>
                <div className="w-px h-6 bg-slate-200"></div>
                <label className="flex items-center gap-3 px-4 py-2 cursor-pointer group transition-all">
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${showAccountNumber ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}>
                     <input type="checkbox" checked={showAccountNumber} onChange={e => setShowAccountNumber(e.target.checked)} className="hidden" />
                     {showAccountNumber && <X size={12} className="text-white rotate-45" />}
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors italic">Registry ID</span>
                </label>
             </div>
          </div>
        </div>

        {/* Audit Canvas - Statement Presentation */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[700px] relative">
           
           {/* Watermark Section Header */}
           <div className="p-12 pb-10 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-20"></div>
              <div className="relative z-10 space-y-4">
                 <div className="flex items-center justify-center gap-3 text-slate-400 text-[10px] font-bold uppercase tracking-[0.5em] italic mb-2">
                    <ShieldCheck size={14} className="text-blue-500" /> OFFICIAL CONSOLIDATED AUDIT
                 </div>
                 <h2 className="text-4xl font-bold text-slate-900 tracking-tight uppercase italic">{company?.company_name}</h2>
                 <div className="flex items-center justify-center gap-6 py-2">
                    <div className="h-0.5 w-16 bg-blue-600/20"></div>
                    <span className="text-2xl font-bold text-slate-800 tracking-tight uppercase">{accountName || 'AWAITING IDENTITY'}</span>
                    <div className="h-0.5 w-16 bg-blue-600/20"></div>
                 </div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] italic">Post Window: {formatDate(dateRange.startDate)} To {formatDate(dateRange.endDate)}</p>
              </div>
           </div>

           <div className="flex-1 overflow-x-auto px-4 pb-12 scroller-airy">
              <table className="w-full text-left">
                 <thead className="bg-[#F8FAFC]">
                    <tr>
                       {[
                         { h: 'Post Epoch', w: '120px' },
                         { h: 'Manifest Shard', w: '150px' },
                         { h: 'Particulars / Descriptor', w: 'auto' },
                         { h: 'Credit (-)', w: '140px', al: 'right' },
                         { h: 'Debit (+)', w: '140px', al: 'right' },
                         { h: 'Running Position', w: '160px', al: 'right' }
                       ].map((col, i) => (
                         <th key={i} style={{ width: col.w }} className={`px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest ${col.al === 'right' ? 'text-right' : ''}`}>
                            {col.h}
                         </th>
                       ))}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="px-10 py-32 text-center">
                           <RefreshCcw className="animate-spin text-blue-100 mx-auto" size={40} />
                           <p className="mt-4 text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">Synchronizing Ledger Archives...</p>
                        </td>
                      </tr>
                    ) : data.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-10 py-32 text-center">
                           <Database className="text-slate-100 mx-auto" size={56} strokeWidth={1} />
                           <p className="mt-4 text-slate-300 font-bold uppercase text-[10px] tracking-widest italic">No Transaction Nodes Detected</p>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {data.map((row, idx) => (
                           <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-5 text-[11px] font-bold text-slate-400 font-mono italic">{formatDate(row.transaction_date)}</td>
                              <td className="px-8 py-5 text-[10px] font-bold text-slate-300 uppercase tracking-tight italic">{row.reference_no}</td>
                              <td className="px-8 py-5 font-bold text-slate-700 text-sm uppercase tracking-tight">{row.description}</td>
                              <td className="px-8 py-5 text-right font-bold text-slate-400 italic">₹{parseFloat(row.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td className="px-8 py-5 text-right font-black text-slate-900 italic">₹{parseFloat(row.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td className="px-8 py-5 text-right font-black text-slate-800 italic underline decoration-slate-100 underline-offset-4">{formatBalance(row.running_balance)}</td>
                           </tr>
                        ))}
                        {/* Consolidated Total Shard */}
                        <tr className="bg-slate-900 text-white font-bold italic border-t-8 border-white">
                           <td colSpan="3" className="px-8 py-8 text-xs font-black uppercase tracking-[0.5em] text-blue-500">Aggregate Integrity Total</td>
                           <td className="px-8 py-8 text-right text-base font-black italic tracking-tighter">₹{parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                           <td className="px-8 py-8 text-right text-base font-black italic tracking-tighter">₹{parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                           <td className="px-8 py-8 text-right opacity-30 text-[10px] uppercase font-black tracking-widest">End_of_Window</td>
                        </tr>
                      </>
                    )}
                 </tbody>
              </table>
           </div>

           {/* Dashboard Insight Footer */}
           <div className="mt-auto p-10 border-t border-slate-50 bg-[#F8FAFC]/30 flex justify-between items-center text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em] italic">
              <div className="flex items-center gap-6">
                 <span className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg shadow-sm border border-slate-50"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Audit Status: Verified</span>
                 <span className="flex items-center gap-2"><Layout size={12}/> Shards Populated: {data.length}</span>
              </div>
              <div className="flex items-center gap-3">
                 <span>{company?.company_name} / Registry Auth</span>
                 <div className="w-px h-3 bg-slate-200"></div>
                 <span>ID: {new Date().getTime().toString(36).toUpperCase()}</span>
              </div>
           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 1.5cm; size: auto; }
          body { background-color: white !important; margin: 0; padding: 0; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .bg-slate-900, .bg-black { background-color: #000000 !important; color: white !important; }
          .bg-slate-100, .bg-slate-50 { background-color: #f8fafc !important; }
          .rounded-\\[2\\.5rem\\], .rounded-2xl { border-radius: 0 !important; border: none !important; shadow: none !important; }
          table { width: 100%; border-collapse: collapse; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; }
          th, td { border-bottom: 1px solid #e2e8f0 !important; padding: 10px 12px !important; }
          .text-slate-900, .text-slate-700, .text-slate-800 { color: #000000 !important; }
          tr { page-break-inside: avoid; }
        }
        .scroller-airy::-webkit-scrollbar { width: 4px; }
        .scroller-airy::-webkit-scrollbar-track { background: transparent; }
        .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
    </div>
  );
}
