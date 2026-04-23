import React, { useState, useEffect } from 'react';
import { Search, FileText, Printer, Database, Calendar, ChevronRight, Activity } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export default function LedgerReport() {
  const { t, i18n } = useTranslation();
  
  // States
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);
  const [accountName, setAccountName] = useState('');
  
  // Filter States
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // 1st of current month
    endDate: new Date().toISOString().split('T')[0]
  });
  const [accountId, setAccountId] = useState('');
  const [language, setLanguage] = useState('english');
  const [printSubAmount, setPrintSubAmount] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  // Dropdown Data
  const [accounts, setAccounts] = useState([]);

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
          setAccountId(accRes.data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load accounts', error);
    }
  };

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
    if (val < 0) return `${absVal} C`;
    if (val > 0) return `${absVal} D`;
    return '0.00';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  };

  if (loading && !data.length) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center font-black uppercase tracking-widest text-slate-400">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-pulse" />
          <p className="text-lg mb-4 italic">Assembling Ledger Report...</p>
          <div className="w-16 h-1 bg-slate-200 mx-auto overflow-hidden rounded-full">
             <div className="w-full h-full bg-black animate-[slide_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen text-slate-900 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header - Industrial Monochrome */}
        <div className="flex justify-between items-end border-b-4 border-black pb-4 print:hidden">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{t('ledgerReport.title', 'Statement of Account')}</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">{company?.company_name} / OFFICIAL RECORD AUDIT</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
                onClick={fetchReportData}
                className="bg-black hover:bg-slate-800 text-white px-8 py-3 rounded-lg shadow-2xl flex items-center gap-2 font-black uppercase tracking-widest text-xs transition-all active:scale-95"
              >
                <Search size={18} strokeWidth={3} /> {t('common.generate', 'Synchronize')}
              </button>
              <button 
                onClick={handlePrint}
                className="bg-slate-100 hover:bg-slate-200 text-slate-900 px-8 py-3 rounded-lg border-2 border-slate-200 flex items-center gap-2 font-black uppercase tracking-widest text-xs transition-all active:scale-95"
              >
                <Printer size={18} strokeWidth={2.5} /> {t('common.print', 'Print Dispatch')}
              </button>
          </div>
        </div>

        {/* Top Control Panel - High Density Industrial */}
        <div className="bg-white p-6 border-2 border-slate-200 print:hidden shadow-xl rounded-2xl space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            <div className="lg:col-span-8 flex flex-wrap items-end gap-6">
               <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">START POINT</span>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-300" size={16} />
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                      className="pl-10 pr-4 py-2 border-2 border-slate-100 rounded-xl outline-none focus:border-black transition-all bg-slate-50 font-black text-xs h-11"
                    />
                  </div>
               </div>
               <div className="flex items-center pb-3 text-slate-300 font-black">
                  <ChevronRight size={16} strokeWidth={3} />
               </div>
               <div>
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">END POINT</span>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-300" size={16} />
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                      className="pl-10 pr-4 py-2 border-2 border-slate-100 rounded-xl outline-none focus:border-black transition-all bg-slate-50 font-black text-xs h-11"
                    />
                  </div>
               </div>
               
               <div className="flex-1 min-w-[300px]">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">ACCOUNT RECORD SELECTION</span>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-slate-100 rounded-xl outline-none uppercase focus:border-black transition-all bg-white font-black text-xs h-11 cursor-pointer appearance-none"
                  >
                    <option value="">-- SYSTEM REGISTRY SELECTION --</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                         {`${String(acc.id).padStart(4, '0')} — ${acc.account_name.toUpperCase()}`}
                      </option>
                    ))}
                  </select>
               </div>
            </div>

            <div className="lg:col-span-4 flex flex-wrap items-center justify-end gap-6 text-slate-400 font-black uppercase text-[10px] tracking-widest bg-slate-50 p-3 rounded-xl border border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer hover:text-black transition-colors group outline-none"
                tabIndex="0"
                onKeyDown={(e) => { if (e.key === 'Enter') setPrintSubAmount(!printSubAmount); }}
              >
                <input 
                  type="checkbox" 
                  checked={printSubAmount}
                  onChange={e => setPrintSubAmount(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-black"
                  tabIndex="-1"
                />
                <span className="group-hover:translate-x-1 transition-transform">Sub-Amounts</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:text-black transition-colors group outline-none"
                tabIndex="0"
                onKeyDown={(e) => { if (e.key === 'Enter') setShowAccountNumber(!showAccountNumber); }}
              >
                <input 
                  type="checkbox" 
                  checked={showAccountNumber}
                  onChange={e => setShowAccountNumber(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-black"
                  tabIndex="-1"
                />
                <span className="group-hover:translate-x-1 transition-transform">Acc. ID</span>
              </label>
            </div>
          </div>
        </div>

        {/* Report Canvas - Monochrome Elegance */}
        <div className="bg-white p-10 shadow-2xl border-2 border-slate-100 rounded-[2.5rem] print:shadow-none print:border-none print:p-0 relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 pointer-events-none opacity-50"></div>
          
          {accountName ? (
            <div className="text-center mb-10 pb-6 border-b-8 border-black">
               <h1 className="text-5xl font-black text-black tracking-tighter italic uppercase">{company?.company_name}</h1>
               <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="h-0.5 w-12 bg-black"></div>
                  <h2 className="font-black text-xl text-slate-900 uppercase tracking-[0.3em] inline-block">
                    {accountName}
                  </h2>
                  <div className="h-0.5 w-12 bg-black"></div>
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mt-3 italic">Audit Window: {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}</p>
            </div>
          ) : (
            <div className="text-center py-32 opacity-40">
               <Database className="w-20 h-20 text-slate-100 mx-auto mb-6" strokeWidth={1} />
               <h2 className="font-black text-sm text-slate-300 uppercase tracking-[0.4em] italic">
                 Awaiting System Command
               </h2>
               <p className="text-[9px] font-bold text-slate-200 uppercase tracking-widest mt-2">Initialize registry search to populate statement</p>
            </div>
          )}

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-black uppercase tracking-widest text-[9px]">
                  <th className="px-6 py-5 text-left border-r border-slate-800 whitespace-nowrap w-24">Entry Date</th>
                  <th className="px-6 py-5 text-left border-r border-slate-800 whitespace-nowrap w-32">Manifest ID</th>
                  <th className="px-6 py-5 text-left border-r border-slate-800">Descriptor / Particulars</th>
                  <th className="px-6 py-5 text-right border-r border-slate-800 w-32 bg-black">Credit (-)</th>
                  <th className="px-6 py-5 text-right border-r border-slate-800 w-32">Debit (+)</th>
                  <th className="px-6 py-5 text-right w-36 italic">Position</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-32 print:hidden bg-white">
                      <div className="w-12 h-12 border-4 border-slate-100 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-slate-300 font-black uppercase tracking-widest text-[10px]">Processing Database Query...</p>
                    </td>
                  </tr>
                ) : data.length === 0 && accountName ? (
                  <tr>
                    <td colSpan="6" className="text-center py-20 text-slate-300 font-black uppercase tracking-[0.3em] italic text-[10px]">
                      ZERO DATA DENSITY DETECTED FOR SEGMENT
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 border-r border-slate-50 whitespace-nowrap font-mono font-bold text-slate-500">{formatDate(row.transaction_date)}</td>
                        <td className="px-6 py-4 border-r border-slate-50 font-black text-[10px] text-slate-300 uppercase italic">{row.reference_no}</td>
                        <td className="px-6 py-4 border-r border-slate-50 font-black text-slate-900 uppercase tracking-tight">{row.description}</td>
                        <td className="px-6 py-4 border-r border-slate-50 text-right font-bold text-slate-400 italic">₹{parseFloat(row.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 border-r border-slate-50 text-right font-black text-slate-900 italic">₹{parseFloat(row.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-right font-black italic text-slate-900 group-hover:underline decoration-slate-100 underline-offset-4">{formatBalance(row.running_balance)}</td>
                      </tr>
                    ))}
                    {/* Final Total Row monochrome design */}
                    {data.length > 0 && (
                      <tr className="bg-slate-900 text-white font-black text-base italic border-t-4 border-black">
                        <td colSpan="3" className="px-6 py-6 text-center border-r border-slate-800 uppercase tracking-[0.3em] text-xs">
                          Final Consolidation
                        </td>
                        <td className="px-6 py-6 text-right border-r border-slate-800">₹{parseFloat(totals.credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-6 text-right border-r border-slate-800">₹{parseFloat(totals.debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-6 font-mono tracking-tighter"></td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global Registry Summary Footer */}
        <div className="flex justify-between items-center text-slate-400 font-black uppercase tracking-widest text-[9px] border-t-2 border-slate-100 pt-6 mt-12 pb-10">
          <p className="italic underline decoration-slate-200 underline-offset-8 uppercase tracking-[0.3em] opacity-60">Report Generation Cycle Complete: {data.length} Nodes Populated</p>
          <div className="flex gap-4">
             <span>SYS_AUTH_ID: {company?.id}</span>
             <span className="text-slate-200">•</span>
             <span>TIMESTAMP: {new Date().toISOString()}</span>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 1cm; size: auto; }
          body { background-color: white !important; margin: 0; padding: 0; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .bg-slate-900, .bg-black { background-color: #000000 !important; color: white !important; }
          .bg-slate-100, .bg-slate-50 { background-color: #f8fafc !important; }
          table { width: 100%; border-collapse: collapse; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; }
          th, td { border: 1px solid #000000 !important; padding: 8px 12px !important; }
          .text-slate-900, .text-slate-700, .text-slate-500 { color: #000000 !important; }
          tr { page-break-inside: avoid; }
        }
      `}} />
    </div>
  );
}
