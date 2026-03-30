import React, { useState, useEffect } from 'react';
import { Search, FileText, Printer } from 'lucide-react';
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
    // Determine sign: if negative, 'C', if positive 'D'
    // Usually Liability = negative = C. Asset = positive = D.
    // In the user's screenshot, it was 2550847.90 C
    const absVal = Math.abs(val).toFixed(2);
    if (val < 0) return `${absVal} C`;
    if (val > 0) return `${absVal} D`;
    return '0.00';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-full">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Top Control Panel */}
        <div className="bg-blue-100 p-4 border-b border-blue-200 print:hidden shadow-sm rounded-t-xl">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-4 text-blue-900 font-semibold text-sm">
              <div className="flex items-center gap-2">
                <span>તા.</span>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="px-2 py-1 border border-blue-300 rounded outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span>થી</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="px-2 py-1 border border-blue-300 rounded outline-none"
                />
                <span>સુધી</span>
              </div>
              <div className="flex items-center gap-2">
                <span>ખાતું:</span>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="px-2 py-1 border border-blue-300 rounded outline-none w-64 uppercase"
                >
                  <option value="">-- Select Account --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                       {`${String(acc.id).padStart(4, '0')} - ${acc.account_name}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchReportData}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 shadow-sm font-medium transition"
              >
                <Search size={16} /> જનરેટ (Generate)
              </button>
              <button 
                onClick={handlePrint}
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded flex items-center gap-2 shadow-sm font-medium transition"
              >
                <Printer size={16} /> પ્રિન્ટ (Print)
              </button>
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap items-center gap-8 text-blue-900 font-medium text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={printSubAmount}
                onChange={e => setPrintSubAmount(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              પેંટા રકમ છાપવી
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showAccountNumber}
                onChange={e => setShowAccountNumber(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              ખાતા નંબર
            </label>
            
          </div>
        </div>

        {/* Report Canvas */}
        <div className="bg-white p-6 md:p-8 shadow-lg border border-slate-200 mt-2 rounded-b-xl print:shadow-none print:border-none print:p-0">
          
          {accountName ? (
            <h2 className="text-center font-bold text-lg md:text-xl text-[#0d3b8e] mb-6 tracking-wide uppercase">
              Ledger of {accountName} From {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
            </h2>
          ) : (
            <h2 className="text-center font-bold text-lg text-slate-400 mb-6 uppercase">
              Please select an account and generate report
            </h2>
          )}

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm border-collapse table-auto border border-blue-200">
              <thead>
                <tr className="bg-[#e4efff] text-[#0d3b8e] border-b-2 border-blue-400">
                  <th className="px-3 py-2 text-left border-r border-blue-200 font-bold whitespace-nowrap w-24">Date</th>
                  <th className="px-3 py-2 text-left border-r border-blue-200 font-bold whitespace-nowrap w-32">Bill No</th>
                  <th className="px-3 py-2 text-left border-r border-blue-200 font-bold">Particulars</th>
                  <th className="px-3 py-2 text-right border-r border-blue-200 font-bold w-32">Credit</th>
                  <th className="px-3 py-2 text-right border-r border-blue-200 font-bold w-32">Debit</th>
                  <th className="px-3 py-2 text-right font-bold w-36">Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-10 print:hidden">
                      <div className="flex justify-center mb-2">
                        <div className="w-8 h-8 border-4 border-blue-300 border-t-blue-700 rounded-full animate-spin"></div>
                      </div>
                      <p className="text-blue-800 font-medium">Generating Report...</p>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-500 print:hidden bg-slate-50">
                      No records found
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.map((row, idx) => (
                      <tr key={idx} className="border-b border-blue-100 hover:bg-blue-50/50">
                        <td className="px-3 py-1.5 border-r border-blue-100 whitespace-nowrap">{formatDate(row.transaction_date)}</td>
                        <td className="px-3 py-1.5 border-r border-blue-100">{row.reference_no}</td>
                        <td className="px-3 py-1.5 border-r border-blue-100 uppercase">{row.description}</td>
                        <td className="px-3 py-1.5 border-r border-blue-100 text-right">{row.credit}</td>
                        <td className="px-3 py-1.5 border-r border-blue-100 text-right">{row.debit}</td>
                        <td className="px-3 py-1.5 text-right">{formatBalance(row.running_balance)}</td>
                      </tr>
                    ))}
                    {/* Final Total Row matching the image */}
                    <tr className="bg-[#46a2de] text-white font-bold text-[15px]">
                      <td colSpan="3" className="px-3 py-2.5 text-center border-r border-white/30 uppercase tracking-widest">
                        Total
                      </td>
                      <td className="px-3 py-2.5 text-right border-r border-white/30">{totals.credit}</td>
                      <td className="px-3 py-2.5 text-right border-r border-white/30">{totals.debit}</td>
                      <td className="px-3 py-2.5"></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white !important; margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          .bg-[#46a2de] { background-color: #46a2de !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-[#e4efff] { background-color: #e4efff !important; color: #0d3b8e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1 !important; padding: 4px 6px !important; }
          tr { page-break-inside: avoid; }
        }
      `}} />
    </div>
  );
}
