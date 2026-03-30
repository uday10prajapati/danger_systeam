import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, FileText } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export default function SabhasadLedgerSummary() {
  const { t } = useTranslation();
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({ opening_balance: 0, debit: 0, credit: 0, closing_balance: 0 });
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);
  
  // Filters
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [accountId, setAccountId] = useState('all');
  const [memberId, setMemberId] = useState('all');
  const [hideZeroBalance, setHideZeroBalance] = useState(false);

  // Dropdown lists
  const [accounts, setAccounts] = useState([]);
  const [members, setMembers] = useState([]);

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
      fetchDropdownData();
    }
  }, [company]);

  const fetchDropdownData = async () => {
    try {
      // Fetch accounts (to populate Account dropdown)
      const accRes = await axios.get(`/api/accounts/company/${company.id}`, {
        headers: { 'x-company-id': company.id }
      });
      if (accRes.data.success) {
        setAccounts(accRes.data.data);
      }

      // Fetch members (to populate Sabhasad dropdown)
      const memRes = await axios.get(`/api/members/company/${company.id}`, {
        headers: { 'x-company-id': company.id }
      });
      if (memRes.data.success) {
        setMembers(memRes.data.data);
      }
      
      // Initial fetch of report data
      fetchReportData();

    } catch (error) {
      console.error('Failed to load dropdowns', error);
    }
  };

  const fetchReportData = async () => {
    if (!company?.id) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/sabhasad-ledger-summary`, {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          accountId,
          memberId,
          hideZeroBalance
        },
        headers: { 'x-company-id': company.id }
      });

      if (response.data.success) {
        setData(response.data.data);
        setTotals(response.data.totals);
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

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Sabhasad Ledger Summary</h1>
              <p className="text-slate-500 font-medium">{company?.company_name || 'Loading company...'}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
             <button
              onClick={fetchReportData}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-sm flex items-center gap-2"
            >
              <Filter size={18} /> Get Report
            </button>
            <button
              onClick={handlePrint}
              className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition font-semibold shadow-sm flex items-center gap-2 print:hidden"
            >
              <Download size={18} /> Print
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-inner border border-blue-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">તારીખ: (From Date)</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">આજે: (To Date)</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">ખાતું: (Account)</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              >
                <option value="all">-- બધા (All) --</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                     {`${String(acc.id).padStart(4, '0')} - ${acc.account_name}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">સભાભાસદ: (Sabhasad)</label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              >
                <option value="all">બધા (All)</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                     {m.member_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center h-[42px]">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={hideZeroBalance}
                  onChange={(e) => setHideZeroBalance(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                શૂન્ય બેલેન્સ વાળા ખાતા ન બતાવવા
              </label>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-blue-600 text-white py-3 px-6 text-center font-bold text-lg tracking-wide shadow-md">
            Sabhasad Ledger Summary
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b-2 border-slate-200 text-slate-700">
                <tr>
                  <th className="px-4 py-4 font-bold text-left whitespace-nowrap border-r border-slate-200">અનુ. નં. (Sr No)</th>
                  <th className="px-4 py-4 font-bold text-left whitespace-nowrap border-r border-slate-200">કોડ (Code)</th>
                  <th className="px-4 py-4 font-bold text-left min-w-[200px] border-r border-slate-200">સભાભાસદ (Sabhasad)</th>
                  <th className="px-4 py-4 font-bold text-left min-w-[200px] border-r border-slate-200">ખાતાનું નામ (Account)</th>
                  <th className="px-4 py-4 font-bold text-right whitespace-nowrap border-r border-slate-200">ઓ. બેલેન્સ (Op Bal)</th>
                  <th className="px-4 py-4 font-bold text-right whitespace-nowrap text-blue-700 border-r border-slate-200">ઉધાર રકમ (Debit)</th>
                  <th className="px-4 py-4 font-bold text-right whitespace-nowrap text-emerald-700 border-r border-slate-200">જમા રકમ (Credit)</th>
                  <th className="px-4 py-4 font-bold text-right whitespace-nowrap">બંધ બેલેન્સ (Cl Bal)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium text-lg">Loading Report Data...</p>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-slate-500 font-medium text-lg bg-slate-50">
                      No records found for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  <>
                    {data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-4 py-3 text-slate-600 font-medium border-r border-slate-100">{row.sr_no}</td>
                        <td className="px-4 py-3 text-slate-600 font-semibold border-r border-slate-100 bg-slate-50/50">{row.member_code}</td>
                        <td className="px-4 py-3 text-slate-800 font-bold border-r border-slate-100">{row.member_name}</td>
                        <td className="px-4 py-3 text-slate-600 border-r border-slate-100">{row.account_name}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700 border-r border-slate-100">{row.opening_balance}</td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-600 border-r border-slate-100">{row.debit}</td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600 border-r border-slate-100">{row.credit}</td>
                        <td className={`px-4 py-3 text-right font-bold ${
                          parseFloat(row.closing_balance) > 0 ? 'text-emerald-700' : 
                          parseFloat(row.closing_balance) < 0 ? 'text-red-600' : 'text-slate-700'
                        }`}>
                          {row.closing_balance}
                        </td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold text-[15px]">
                      <td colSpan="4" className="px-4 py-4 text-right tracking-wider uppercase border-r border-white/20">
                        સરવાળો (Total)...
                      </td>
                      <td className="px-4 py-4 text-right border-r border-white/20">{totals.opening_balance}</td>
                      <td className="px-4 py-4 text-right border-r border-white/20">{totals.debit}</td>
                      <td className="px-4 py-4 text-right border-r border-white/20">{totals.credit}</td>
                      <td className="px-4 py-4 text-right">{totals.closing_balance}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white; }
          .min-h-screen { min-height: auto; }
          .p-4, .p-6 { padding: 0 !important; }
          .shadow-sm, .shadow-md, .shadow-lg, .shadow-inner { box-shadow: none !important; }
          .border, .border-b-2 { border-color: #000 !important; }
          .bg-blue-600 { background-color: #e5e7eb !important; color: #000 !important; }
          .bg-gradient-to-r, .bg-gradient-to-br { background: #fff !important; color: #000 !important; }
          .print\\:hidden { display: none !important; }
          input, select { border: none !important; appearance: none; pointer-events: none; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000 !important; font-size: 11px; padding: 4px !important; }
        }
      `}} />
    </div>
  );
}
