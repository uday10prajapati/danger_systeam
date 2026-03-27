import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, X } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export default function AccountLedger() {
  const { t } = useTranslation();
  const [view, setView] = useState('ledger'); // 'ledger' or 'trial-balance'
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [trialBalance, setTrialBalance] = useState([]);
  const [totals, setTotals] = useState({ total_debit: 0, total_credit: 0, difference: 0 });
  const [accountBalance, setAccountBalance] = useState({ total_debit: 0, total_credit: 0, running_balance: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const company = JSON.parse(localStorage.getItem('company')) || {};

  useEffect(() => {
    fetchAccounts();
    if (view === 'trial-balance') {
      fetchTrialBalance();
    }
  }, [view]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/accounts/company/${company.id}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.data) {
        setAccounts(response.data.data);
      }
    } catch (err) {
      console.error('Fetch accounts error:', err);
    }
  };

  const fetchAccountLedger = async (accountId) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/account-ledger/account/${accountId}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setLedgerEntries(response.data.data);
      }
    } catch (err) {
      console.error('Fetch ledger error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountBalance = async (accountId) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/account-ledger/balance/${accountId}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setAccountBalance(response.data.data);
      }
    } catch (err) {
      console.error('Fetch balance error:', err);
    }
  };

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/account-ledger/trial-balance`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      if (response.data.success) {
        setTrialBalance(response.data.data);
        setTotals(response.data.totals);
      }
    } catch (err) {
      console.error('Fetch trial balance error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = async (account) => {
    setSelectedAccount(account);
    setView('ledger');
    await Promise.all([
      fetchAccountLedger(account.id),
      fetchAccountBalance(account.id)
    ]);
  };

  const filteredAccounts = accounts.filter(acc =>
    acc.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.account_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDateChange = () => {
    if (selectedAccount) {
      fetchAccountLedger(selectedAccount.id);
    }
  };

  const handleViewDetails = () => {
    if (!selectedAccount || ledgerEntries.length === 0) {
      alert('No data to display');
      return;
    }
    setShowDetailsModal(true);
  };

  const handlePrint = () => {
    if (!selectedAccount || ledgerEntries.length === 0) {
      alert('No data to print');
      return;
    }
    setShowPrintModal(true);
  };

  const handlePrintPage = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Account Ledger</h1>
          <p className="text-gray-600">{company.company_name}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('ledger')}
            className={`px-6 py-2 rounded font-semibold ${
              view === 'ledger'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Account Ledger
          </button>
          <button
            onClick={() => { setView('trial-balance'); fetchTrialBalance(); }}
            className={`px-6 py-2 rounded font-semibold ${
              view === 'trial-balance'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Trial Balance
          </button>
        </div>
      </div>

      {/* Account Ledger View */}
      {view === 'ledger' && (
        <div className="space-y-6">
          {/* Account Selection */}
          <div className="grid grid-cols-3 gap-6">
            {/* Account List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold mb-4">Accounts</h2>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredAccounts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No accounts found</p>
                ) : (
                  filteredAccounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleSelectAccount(account)}
                      className={`w-full text-left px-4 py-2 rounded transition ${
                        selectedAccount?.id === account.id
                          ? 'bg-blue-100 border-l-4 border-blue-600 font-semibold'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-sm font-semibold">{account.account_name}</div>
                      <div className="text-xs text-gray-600">{account.account_type}</div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Ledger Details */}
            <div className="col-span-2 space-y-4">
              {selectedAccount && (
                <>
                  {/* Account Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-600">
                      <p className="text-gray-600 text-sm font-medium">Total Debit</p>
                      <p className="text-2xl font-bold text-blue-600 mt-2">
                        ₹{parseFloat(accountBalance.total_debit || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-red-600">
                      <p className="text-gray-600 text-sm font-medium">Total Credit</p>
                      <p className="text-2xl font-bold text-red-600 mt-2">
                        ₹{parseFloat(accountBalance.total_credit || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className={`bg-white p-4 rounded-lg shadow-md border-l-4 ${
                      parseFloat(accountBalance.running_balance) >= 0 ? 'border-green-600' : 'border-orange-600'
                    }`}>
                      <p className="text-gray-600 text-sm font-medium">Balance</p>
                      <p className={`text-2xl font-bold mt-2 ${
                        parseFloat(accountBalance.running_balance) >= 0 ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        ₹{parseFloat(accountBalance.running_balance || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Date Range Filter */}
                  <div className="bg-white p-4 rounded-lg shadow-md flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold mb-2">From Date</label>
                      <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                        onBlur={handleDateChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-semibold mb-2">To Date</label>
                      <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                        onBlur={handleDateChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Ledger Table */}
          {selectedAccount && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold">{selectedAccount.account_name} - Ledger</h2>
                  <p className="text-sm text-gray-600">{selectedAccount.account_type}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleViewDetails()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 font-semibold"
                  >
                    📋 View Details
                  </button>
                  <button
                    onClick={() => handlePrint()}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 font-semibold"
                  >
                    🖨️ Print
                  </button>
                </div>
              </div>
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Date</th>
                    <th className="px-6 py-3 text-left font-semibold">Reference</th>
                    <th className="px-6 py-3 text-left font-semibold">Description</th>
                    <th className="px-6 py-3 text-right font-semibold">Debit</th>
                    <th className="px-6 py-3 text-right font-semibold">Credit</th>
                    <th className="px-6 py-3 text-right font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        No entries found
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-700">
                          {new Date(entry.transaction_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{entry.reference_no}</td>
                        <td className="px-6 py-3 text-gray-700">{entry.description}</td>
                        <td className="px-6 py-3 text-right text-blue-600 font-semibold">
                          {parseFloat(entry.debit || 0) > 0 ? `₹${parseFloat(entry.debit).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-6 py-3 text-right text-red-600 font-semibold">
                          {parseFloat(entry.credit || 0) > 0 ? `₹${parseFloat(entry.credit).toFixed(2)}` : '-'}
                        </td>
                        <td className={`px-6 py-3 text-right font-bold ${
                          parseFloat(entry.running_balance) >= 0 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          ₹{parseFloat(entry.running_balance || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Trial Balance View */}
      {view === 'trial-balance' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-lg font-bold">Trial Balance</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              <Download size={18} />
              Download
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left font-semibold">Account</th>
                <th className="px-6 py-3 text-left font-semibold">Type</th>
                <th className="px-6 py-3 text-right font-semibold">Debit</th>
                <th className="px-6 py-3 text-right font-semibold">Credit</th>
                <th className="px-6 py-3 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : (
                <>
                  {trialBalance.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-700 font-semibold">{account.account_name}</td>
                      <td className="px-6 py-3 text-gray-600">{account.account_type}</td>
                      <td className="px-6 py-3 text-right text-blue-600">
                        ₹{parseFloat(account.total_debit || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-right text-red-600">
                        ₹{parseFloat(account.total_credit || 0).toFixed(2)}
                      </td>
                      <td className={`px-6 py-3 text-right font-bold ${
                        parseFloat(account.balance) >= 0 ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        ₹{parseFloat(account.balance || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold border-t-2 border-b-2">
                    <td colSpan="2" className="px-6 py-3">TOTALS</td>
                    <td className="px-6 py-3 text-right text-blue-600">
                      ₹{parseFloat(totals.total_debit || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-right text-red-600">
                      ₹{parseFloat(totals.total_credit || 0).toFixed(2)}
                    </td>
                    <td className={`px-6 py-3 text-right ${
                      totals.difference < 0.01 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {totals.difference < 0.01 ? '✓ Balanced' : `Difference: ₹${totals.difference.toFixed(2)}`}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-blue-600 text-white p-6 flex justify-between items-center border-b">
              <div>
                <h2 className="text-2xl font-bold">{selectedAccount?.account_name}</h2>
                <p className="text-sm text-blue-100">Account Details</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-blue-700 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Account Info */}
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-4">Account Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-gray-600 text-sm">Account Type</p>
                    <p className="font-bold">{selectedAccount?.account_type}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-gray-600 text-sm">Phone</p>
                    <p className="font-bold">{selectedAccount?.phone || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded col-span-2">
                    <p className="text-gray-600 text-sm">Email</p>
                    <p className="font-bold">{selectedAccount?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                  <p className="text-gray-600 text-sm">Total Debit</p>
                  <p className="text-2xl font-bold text-blue-600">₹{parseFloat(accountBalance.total_debit || 0).toFixed(2)}</p>
                </div>
                <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
                  <p className="text-gray-600 text-sm">Total Credit</p>
                  <p className="text-2xl font-bold text-red-600">₹{parseFloat(accountBalance.total_credit || 0).toFixed(2)}</p>
                </div>
                <div className={`border-l-4 p-4 rounded ${
                  parseFloat(accountBalance.running_balance) >= 0
                    ? 'bg-green-50 border-green-600'
                    : 'bg-orange-50 border-orange-600'
                }`}>
                  <p className="text-gray-600 text-sm">Balance</p>
                  <p className={`text-2xl font-bold ${
                    parseFloat(accountBalance.running_balance) >= 0 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    ₹{parseFloat(accountBalance.running_balance || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Transactions Table */}
              <div>
                <h3 className="text-lg font-bold mb-4">Transaction Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Reference</th>
                        <th className="px-4 py-3 text-left">Description</th>
                        <th className="px-4 py-3 text-right">Debit</th>
                        <th className="px-4 py-3 text-right">Credit</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map((entry, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{new Date(entry.transaction_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3">{entry.reference_no}</td>
                          <td className="px-4 py-3">{entry.description}</td>
                          <td className="px-4 py-3 text-right">
                            {parseFloat(entry.debit || 0) > 0 ? (
                              <span className="text-blue-600 font-bold">₹{parseFloat(entry.debit).toFixed(2)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {parseFloat(entry.credit || 0) > 0 ? (
                              <span className="text-red-600 font-bold">₹{parseFloat(entry.credit).toFixed(2)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${
                            parseFloat(entry.running_balance) >= 0 ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            ₹{parseFloat(entry.running_balance || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t text-center text-gray-600 text-sm">
                <p>Generated on {new Date().toLocaleString()}</p>
                <p>Company: {company.company_name}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center rounded-b-lg">
              <button
                onClick={handlePrintPage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Download size={18} /> Print from Modal
              </button>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Print Header */}
            <div className="bg-gray-800 text-white p-6 sticky top-0 flex justify-between items-center border-b">
              <div>
                <h2 className="text-2xl font-bold">Print Report</h2>
                <p className="text-sm text-gray-300">{selectedAccount?.account_name}</p>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Printable Content */}
            <div className="p-8 bg-white">
              {/* Header */}
              <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
                <h1 className="text-3xl font-bold">{company.company_name}</h1>
                <p className="text-gray-600">Account Statement</p>
              </div>

              {/* Account Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">{selectedAccount?.account_name}</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Account Type: <span className="font-bold">{selectedAccount?.account_type}</span></p>
                    <p className="text-gray-600">Phone: <span className="font-bold">{selectedAccount?.phone || 'N/A'}</span></p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email: <span className="font-bold">{selectedAccount?.email || 'N/A'}</span></p>
                    <p className="text-gray-600">Printed: <span className="font-bold">{new Date().toLocaleString()}</span></p>
                  </div>
                </div>
              </div>

              {/* Summary Section */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="border-2 border-blue-600 p-4 rounded">
                  <p className="text-gray-600 text-sm font-bold">TOTAL DEBIT</p>
                  <p className="text-2xl font-bold text-blue-600">₹{parseFloat(accountBalance.total_debit || 0).toFixed(2)}</p>
                </div>
                <div className="border-2 border-red-600 p-4 rounded">
                  <p className="text-gray-600 text-sm font-bold">TOTAL CREDIT</p>
                  <p className="text-2xl font-bold text-red-600">₹{parseFloat(accountBalance.total_credit || 0).toFixed(2)}</p>
                </div>
                <div className={`border-2 p-4 rounded ${
                  parseFloat(accountBalance.running_balance) >= 0
                    ? 'border-green-600'
                    : 'border-orange-600'
                }`}>
                  <p className="text-gray-600 text-sm font-bold">CURRENT BALANCE</p>
                  <p className={`text-2xl font-bold ${
                    parseFloat(accountBalance.running_balance) >= 0 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    ₹{Math.abs(parseFloat(accountBalance.running_balance || 0)).toFixed(2)}
                    {parseFloat(accountBalance.running_balance) >= 0 ? ' (Due)' : ' (Advance)'}
                  </p>
                </div>
              </div>

              {/* Transactions Table */}
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="bg-gray-200 border-2">
                    <th className="px-4 py-3 text-left border-r">Date</th>
                    <th className="px-4 py-3 text-left border-r">Reference</th>
                    <th className="px-4 py-3 text-left border-r">Description</th>
                    <th className="px-4 py-3 text-right border-r">Debit (₹)</th>
                    <th className="px-4 py-3 text-right border-r">Credit (₹)</th>
                    <th className="px-4 py-3 text-right">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((entry, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3 border-r">{new Date(entry.transaction_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 border-r">{entry.reference_no}</td>
                      <td className="px-4 py-3 border-r">{entry.description}</td>
                      <td className="px-4 py-3 text-right border-r font-bold text-blue-600">
                        {parseFloat(entry.debit || 0) > 0 ? parseFloat(entry.debit).toFixed(2) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right border-r font-bold text-red-600">
                        {parseFloat(entry.credit || 0) > 0 ? parseFloat(entry.credit).toFixed(2) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${
                        parseFloat(entry.running_balance) >= 0 ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {parseFloat(entry.running_balance || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div className="text-center border-t-2 pt-4 text-gray-600 text-xs">
                <p>This is a computer-generated statement. No signature required.</p>
                <p>For clarifications, please contact: {company.company_name}</p>
              </div>
            </div>

            {/* Print Button Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center rounded-b-lg">
              <button
                onClick={handlePrintPage}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 font-bold"
              >
                🖨️ Print Now
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
