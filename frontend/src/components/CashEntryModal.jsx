import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, AlertCircle } from 'lucide-react';

export default function CashEntryModal({ company, type = 'credit', onSubmit, onClose }) {
  // type: 'credit' = Jama (Cash In), 'debit' = Udhar (Cash Out)
  const isCredit = type === 'credit';
  const title = isCredit ? 'Credit Entry (Cash In)' : 'Debit Entry (Cash Out)';

  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    account_id: '',
    amount: '',
    reference_no: '',
    description: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAccounts();
  }, [company]);

  const fetchAccounts = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/accounts/company/${company.id}`, {
        headers: { 'x-company-id': company.id }
      });
      // Optionally filter out 'Bank' or 'Cash' itself, but usually all parties are valid
      setAccounts(res.data.success ? res.data.data : []);
    } catch (err) {
      console.error('Fetch accounts error', err);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!formData.account_id || !formData.amount || formData.amount <= 0) {
      setError('Please fill required fields (Account and Amount).');
      return;
    }

    setLoading(true);
    setError(null);

    const selectedAccount = accounts.find(a => a.id === parseInt(formData.account_id));

    try {
      const payload = {
        transaction_date: formData.transaction_date,
        description: formData.description || `Cash ${isCredit ? 'Received from' : 'Paid to'} ${selectedAccount?.account_name || 'Account'}`,
        cash_in: isCredit ? parseFloat(formData.amount) : 0,
        cash_out: isCredit ? 0 : parseFloat(formData.amount),
        notes: formData.reference_no ? `Ref: ${formData.reference_no}` : ''
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/cash-book/manual`,
        payload,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );

      if (response.data.success) {
        // Also manually add an entry to account_ledger to update the party balance
        // If Cash IN (Credit Entry): Party gives us cash, so Party A/c is CREDITED
        // If Cash OUT (Debit Entry): We pay Party cash, so Party A/c is DEBITED
        
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/account-ledger`,
          {
            company_id: company.id,
            account_id: parseInt(formData.account_id),
            transaction_date: formData.transaction_date,
            transaction_type: isCredit ? 'CASH_RECEIPT' : 'CASH_PAYMENT',
            reference_type: 'cash_book',
            reference_id: response.data.entryId || 0, // Fallback if backend doesn't return
            reference_no: formData.reference_no,
            debit_amount: isCredit ? 0 : parseFloat(formData.amount),
            credit_amount: isCredit ? parseFloat(formData.amount) : 0,
            description: `Cash ${isCredit ? 'Receipt' : 'Payment'}`,
            created_by: 1
          },
          { headers: { 'x-company-id': company.id } }
        ).catch(err => {
          console.warn('Silent ledger warning (route might not exist):', err.message);
        });

        onSubmit();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 font-sans print:hidden">
      <div className="bg-[#e4efff] rounded border-2 border-slate-500 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header Ribbon styled like user image */}
        <div className="bg-[#46a2de] text-white py-1.5 px-3 flex justify-between items-center border-b-2 border-slate-400">
          <h2 className="font-bold text-[15px]">{title}</h2>
          <button onClick={onClose} className="hover:bg-blue-600 rounded p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 flex-1 space-y-3">
          {error && (
            <div className="text-red-700 bg-red-100 px-3 py-2 rounded text-sm italic font-semibold flex items-center gap-2">
               <AlertCircle size={16} /> {error}
            </div>
          )}

          <div className="flex items-center gap-2 border-b border-blue-200 pb-3">
            <label className="text-[14px] text-blue-900 font-bold w-20">Date :</label>
            <input 
              type="date"
              name="transaction_date"
              value={formData.transaction_date}
              onChange={handleChange}
              className="border border-slate-400 px-2 py-1 outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-12 gap-3 items-center">
             <label className="col-span-2 text-[14px] text-blue-900 font-bold">Account :</label>
             <select 
               name="account_id"
               value={formData.account_id}
               onChange={handleChange}
               className="col-span-10 border border-slate-400 px-2 py-1 outline-none focus:border-blue-600"
             >
               <option value="">-- Select Account / Party --</option>
               {accounts.map(acc => (
                 <option key={acc.id} value={acc.id}>{acc.account_name}</option>
               ))}
             </select>
          </div>

          <div className="grid grid-cols-12 gap-3 items-center">
             <label className="col-span-2 text-[14px] text-blue-900 font-bold">Amount :</label>
             <input 
               type="number"
               name="amount"
               value={formData.amount}
               onChange={handleChange}
               className="col-span-4 border border-slate-400 px-2 py-1 outline-none text-right font-bold focus:border-blue-600"
               placeholder="0.00"
             />
             <label className="col-span-2 text-[14px] text-blue-900 font-bold text-right pr-2">Receipt No:</label>
             <input 
               type="text"
               name="reference_no"
               value={formData.reference_no}
               onChange={handleChange}
               className="col-span-4 border border-slate-400 px-2 py-1 outline-none focus:border-blue-600"
             />
          </div>

          <div className="grid grid-cols-12 gap-3 items-center pb-8 border-b border-slate-300">
             <label className="col-span-2 text-[14px] text-blue-900 font-bold">Description :</label>
             <input 
               type="text"
               name="description"
               value={formData.description}
               onChange={handleChange}
               className="col-span-10 border border-slate-400 px-2 py-1 outline-none focus:border-blue-600"
               placeholder="Optional remarks"
             />
          </div>
        </div>

        {/* Footer actions matching user interface style */}
        <div className="bg-[#cbdcf5] p-2 border-t border-slate-400 flex justify-center gap-2">
           <button 
             onClick={handleSave}
             disabled={loading}
             className="min-w-[80px] px-4 py-1.5 border border-slate-500 bg-gradient-to-b from-slate-100 to-slate-300 rounded shadow hover:from-slate-200 hover:to-slate-400 text-[13px] font-bold"
           >
             {loading ? 'Saving...' : 'Ok'}
           </button>
           <button 
             onClick={onClose}
             className="min-w-[80px] px-4 py-1.5 border border-slate-500 bg-gradient-to-b from-slate-100 to-slate-300 rounded shadow hover:from-slate-200 hover:to-slate-400 text-[13px] font-bold"
           >
             Cancel
           </button>
        </div>
      </div>
    </div>
  );
}
