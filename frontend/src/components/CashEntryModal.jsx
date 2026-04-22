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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans print:hidden">
      <div className="bg-slate-200 rounded-lg border-2 border-slate-900 shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Header Ribbon - High Contrast Monochrome */}
        <div className="bg-black text-white py-1.5 px-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
            <h2 className="font-black text-xs uppercase tracking-widest">{title}</h2>
          </div>
          <button onClick={onClose} className="hover:bg-red-600 text-white rounded-lg p-0.5 transition-all">
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        <div className="p-4 flex-1 space-y-3 bg-white">
          {error && (
            <div className="text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg text-[10px] italic font-bold flex items-center gap-2 animate-pulse">
               <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest w-20">Date :</label>
            <input 
              type="date"
              name="transaction_date"
              value={formData.transaction_date}
              onChange={handleChange}
              className="border border-slate-300 px-3 py-1.5 rounded outline-none focus:border-black font-bold h-8 text-xs transition-all bg-white shadow-sm"
            />
          </div>

          <div className="grid grid-cols-12 gap-3 items-center px-1">
             <label className="col-span-2 text-[9px] text-slate-500 font-black uppercase tracking-widest">Account :</label>
             <select 
               name="account_id"
               value={formData.account_id}
               onChange={handleChange}
               className="col-span-10 border border-slate-300 px-3 py-1.5 rounded outline-none focus:border-black font-black uppercase text-slate-900 h-8 text-[11px] transition-all bg-white shadow-sm"
             >
               <option value="">-- SELECT ACCOUNT / PARTY --</option>
               {accounts.map(acc => (
                 <option key={acc.id} value={acc.id}>{acc.account_name}</option>
               ))}
             </select>
          </div>

          <div className="grid grid-cols-12 gap-4 items-center px-1">
             <div className="col-span-6 flex flex-col gap-1">
               <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Amount (₹) :</label>
               <input 
                 type="number"
                 name="amount"
                 value={formData.amount}
                 onChange={handleChange}
                 className="w-full border border-slate-300 px-3 py-1.5 rounded outline-none text-right font-black text-base focus:border-black transition-all bg-white shadow flex items-center h-10"
                 placeholder="0.00"
               />
             </div>
             <div className="col-span-6 flex flex-col gap-1">
               <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Reference No :</label>
               <input 
                 type="text"
                 name="reference_no"
                 value={formData.reference_no}
                 onChange={handleChange}
                 className="w-full border border-slate-300 px-3 py-1.5 rounded outline-none font-bold focus:border-black h-10 text-[11px] transition-all bg-white text-slate-900 shadow-sm"
                 placeholder="Optional"
               />
             </div>
          </div>

          <div className="flex flex-col gap-1 px-1 pb-4">
             <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Description :</label>
             <input 
               type="text"
               name="description"
               value={formData.description}
               onChange={handleChange}
               className="w-full border border-slate-300 px-3 py-1.5 rounded outline-none focus:border-black font-medium text-[11px] transition-all bg-white italic shadow-sm"
               placeholder="Optional remarks"
             />
          </div>
        </div>

        {/* Footer actions - High Balance Monochrome */}
        <div className="bg-slate-100 p-3 border-t border-slate-300 flex justify-end gap-3">
           <button 
             onClick={onClose}
             className="min-w-[120px] px-6 py-2.5 border border-slate-300 bg-white rounded-xl shadow-sm hover:bg-slate-50 text-slate-600 font-black uppercase tracking-widest text-xs transition-all active:scale-95"
           >
             Cancel
           </button>
           <button 
             onClick={handleSave}
             disabled={loading}
             className="min-w-[140px] px-6 py-2.5 bg-black border border-black text-white rounded-xl shadow-lg hover:bg-slate-800 font-black uppercase tracking-widest text-xs transition-all active:scale-95 disabled:bg-slate-400"
           >
             {loading ? 'Processing...' : 'Confirm Entry'}
           </button>
        </div>
      </div>
    </div>
  );
}
