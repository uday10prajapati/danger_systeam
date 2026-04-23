import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, AlertCircle, Calendar, Users, Calculator, 
  FileText, ArrowDownLeft, ArrowUpRight, Search,
  Database, ShieldCheck, Activity, Database as DatabaseIcon
} from 'lucide-react';

export default function CashEntryModal({ company, type = 'credit', onSubmit, onClose }) {
  // type: 'credit' = Jama (Cash In), 'debit' = Udhar (Cash Out)
  const isCredit = type === 'credit';
  const title = isCredit ? 'Credit Entry (Cash In)' : 'Debit Entry (Cash Out)';
  const themeColor = isCredit ? 'emerald' : 'blue';

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

  // Search States
  const [searchCode, setSearchCode] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Refs
  const dropdownRef = React.useRef(null);
  const codeInputRef = React.useRef(null);
  const nameInputRef = React.useRef(null);

  useEffect(() => {
    fetchAccounts();
  }, [company]);

  const fetchAccounts = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/accounts/company/${company.id}`, {
        headers: { 'x-company-id': company.id }
      });
      setAccounts(res.data.success ? res.data.data : []);
    } catch (err) {
      console.error('Fetch accounts error', err);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAccountSelect = (acc) => {
    setFormData(prev => ({ ...prev, account_id: acc.id }));
    setSearchCode(String(acc.id));
    setSearchText(acc.account_name);
    setShowDropdown(false);
  };

  // Auto-fetch by code
  useEffect(() => {
    if (searchCode && !formData.account_id) {
      const match = accounts.find(a => String(a.id) === searchCode || String(a.phone) === searchCode);
      if (match) {
        handleAccountSelect(match);
      }
    }
  }, [searchCode, accounts]);

  // Global Listeners for Esc and Click Outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showDropdown) {
          setShowDropdown(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDropdown, onClose]);

  const filteredAccounts = accounts.filter(a => {
    const codeMatch = searchCode ? (String(a.id).includes(searchCode) || String(a.phone).includes(searchCode)) : true;
    const nameMatch = searchText ? a.account_name.toLowerCase().includes(searchText.toLowerCase()) : true;
    return codeMatch && nameMatch;
  });

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredAccounts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (showDropdown && filteredAccounts.length > 0) {
        e.preventDefault();
        handleAccountSelect(filteredAccounts[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setShowDropdown(false);
    }
  };

  const handleSave = async () => {
    if (!formData.account_id || !formData.amount || formData.amount <= 0) {
      setError('Required nomenclature missing: Account & Verified Amount.');
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
        await axios.post(
          `${import.meta.env.VITE_API_URL}/api/account-ledger`,
          {
            company_id: company.id,
            account_id: parseInt(formData.account_id),
            transaction_date: formData.transaction_date,
            transaction_type: isCredit ? 'CASH_RECEIPT' : 'CASH_PAYMENT',
            reference_type: 'cash_book',
            reference_id: response.data.entryId || 0,
            reference_no: formData.reference_no,
            debit_amount: isCredit ? 0 : parseFloat(formData.amount),
            credit_amount: isCredit ? parseFloat(formData.amount) : 0,
            description: `Cash ${isCredit ? 'Receipt' : 'Payment'}`,
            created_by: 1
          },
          { headers: { 'x-company-id': company.id } }
        ).catch(err => console.warn('Ledger sync warning:', err.message));

        onSubmit();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Fiscal Node Initialization Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 font-sans animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-500 relative">
        
        {/* Header Shard */}
        <div className="bg-slate-900 p-5 px-7 flex justify-between items-center relative overflow-hidden">
           <div className={`absolute top-0 right-0 w-24 h-24 bg-${themeColor}-600/10 rounded-full -mr-12 -mt-12`}></div>
           <div className="relative z-10 flex items-center gap-4">
              <div className={`w-11 h-11 bg-${themeColor}-600/10 rounded-xl flex items-center justify-center text-${themeColor}-500`}>
                {isCredit ? <ArrowUpRight size={22} strokeWidth={3}/> : <ArrowDownLeft size={22} strokeWidth={3}/>}
              </div>
              <div>
                 <h2 className="text-base font-bold text-white tracking-tight italic uppercase">{title}</h2>
                 <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 italic">Fiscal Entry Node</p>
              </div>
           </div>
           <button onClick={onClose} className="relative z-10 bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl transition-all active:scale-95">
             <X size={18} strokeWidth={3} />
           </button>
        </div>

        <div className="p-7 flex-1 space-y-6 bg-white scroller-airy overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-600 px-5 py-3 rounded-xl border border-red-100 text-[9px] uppercase font-black tracking-widest italic flex items-center gap-3 animate-pulse">
              <AlertCircle size={12} /> {error}
            </div>
          )}

          {/* Date Shard */}
          <div className="flex items-center gap-5 bg-[#F8FAFC] p-4 rounded-2xl border border-slate-50">
             <div className="p-2.5 bg-white rounded-lg shadow-sm text-slate-400"><Calendar size={16}/></div>
             <div className="flex-1">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5 italic">Node Date</p>
                <input
                  type="date"
                  name="transaction_date"
                  value={formData.transaction_date}
                  onChange={handleChange}
                  className="w-full bg-transparent border-none outline-none font-bold text-slate-700 text-xs italic h-7"
                />
             </div>
          </div>

          {/* Identity Shard (Account) */}
          <div className="relative">
             <div className="flex items-center gap-5 bg-[#F8FAFC] p-4 rounded-2xl border border-slate-50 group hover:border-slate-200 transition-all">
                <div className="p-2.5 bg-white rounded-lg shadow-sm text-slate-400 group-focus-within:text-blue-500 transition-colors"><Search size={16}/></div>
                <div className="flex-1 grid grid-cols-12 gap-3" ref={dropdownRef}>
                   <div className="col-span-3 border-r border-slate-100 pr-3">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5 italic">Code</p>
                      <input
                        ref={codeInputRef}
                        type="text"
                        placeholder="ID"
                        value={searchCode}
                        onChange={(e) => {
                          setSearchCode(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full bg-transparent border-none outline-none font-black text-slate-800 text-xs tracking-widest"
                      />
                   </div>
                   <div className="col-span-9">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5 italic">Entity Search</p>
                      <input
                        ref={nameInputRef}
                        type="text"
                        placeholder="SEARCH..."
                        value={searchText}
                        onChange={(e) => {
                          setSearchText(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full bg-transparent border-none outline-none font-bold text-slate-800 text-xs italic"
                      />
                   </div>
                </div>
             </div>

             {/* Dynamic Suggestion Engine */}
             {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 shadow-2xl z-[100] max-h-52 overflow-y-auto rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                   <div className="bg-slate-900 text-white p-3 px-5 text-[8px] font-black uppercase tracking-[0.4em] flex justify-between items-center sticky top-0 italic">
                      <span>Identity Feed</span>
                      <X size={12} className="cursor-pointer hover:text-red-400" onClick={() => setShowDropdown(false)} />
                   </div>
                   {filteredAccounts.length === 0 ? (
                     <div className="p-8 text-center text-slate-300 text-[9px] font-black uppercase tracking-widest italic">Node Not Found</div>
                   ) : (
                     filteredAccounts.map((acc, idx) => (
                       <div
                         key={acc.id}
                         onClick={() => handleAccountSelect(acc)}
                         className={`px-6 py-3 border-b border-slate-50 flex justify-between items-center cursor-pointer transition-all ${selectedIndex === idx ? `bg-${themeColor}-50` : 'hover:bg-slate-50'}`}
                       >
                         <div>
                            <p className={`font-black text-[11px] uppercase italic tracking-tight ${selectedIndex === idx ? `text-${themeColor}-600` : 'text-slate-800'}`}>{acc.account_name}</p>
                         </div>
                         <div className={`px-3 py-1 rounded-md text-[8px] font-mono font-bold ${selectedIndex === idx ? `bg-${themeColor}-600 text-white` : 'bg-slate-50 text-slate-400'}`}>#{acc.id}</div>
                       </div>
                     ))
                   )}
                </div>
             )}
          </div>

          {/* Value Shard */}
          <div className="grid grid-cols-2 gap-5">
             <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-50 group hover:border-slate-200 transition-all">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5 italic">Verified Amount (₹)</p>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full bg-transparent border-none outline-none font-black text-2xl text-slate-900 font-mono tracking-tighter"
                />
             </div>
             <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-50">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5 italic">Ref Vector</p>
                <input
                  type="text"
                  name="reference_no"
                  value={formData.reference_no}
                  onChange={handleChange}
                  placeholder="OPTIONAL"
                  className="w-full bg-transparent border-none outline-none font-black text-xs text-slate-700 tracking-widest uppercase italic"
                />
             </div>
          </div>

          {/* Description Shard */}
          <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-50">
             <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-0.5 italic">Note Narrative</p>
             <input
               type="text"
               name="description"
               value={formData.description}
               onChange={handleChange}
               placeholder="TRANSACTION NARRATIVE..."
               className="w-full bg-transparent border-none outline-none font-bold text-xs text-slate-600 italic"
             />
          </div>
        </div>

        {/* Action Shard */}
        <div className="bg-[#F8FAFC] p-7 px-8 flex justify-end gap-4 border-t border-slate-50">
           <button
             onClick={onClose}
             className="px-6 py-3 bg-white border border-slate-100 text-slate-400 rounded-xl font-black uppercase text-[9px] tracking-widest hover:text-slate-600 hover:bg-slate-50 shadow-sm transition-all active:scale-95"
           >
             Cancel
           </button>
           <button
             onClick={handleSave}
             disabled={loading}
             className={`px-8 py-3 bg-${themeColor}-600 text-white rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg shadow-${themeColor}-100 hover:bg-${themeColor}-700 transition-all active:scale-95 disabled:grayscale disabled:opacity-50`}
           >
             {loading ? 'Posting...' : 'Confirm Fiscal Posting'}
           </button>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .scroller-airy::-webkit-scrollbar { width: 4px; }
        .scroller-airy::-webkit-scrollbar-track { background: transparent; }
        .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}} />
    </div>
  );
}
