import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search } from 'lucide-react';

export default function JVEntryModal({ company, onClose, onSubmit }) {
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [credits, setCredits] = useState([]);
  const [debits, setDebits] = useState([]);
  
  // Modals state
  const [activeSubModal, setActiveSubModal] = useState(null); // 'credit' | 'debit' | null

  // Dropdown lists
  const [accounts, setAccounts] = useState([]);
  
  useEffect(() => {
    fetchAccounts();
  }, [company]);

  const fetchAccounts = async () => {
    try {
      const res = await axios.get(`/api/accounts/company/${company?.id}`, {
        headers: { 'x-company-id': company?.id }
      });
      if (res.data.success) {
        setAccounts(res.data.data);
      }
    } catch (err) { }
  };

  const handleSave = async () => {
    try {
      if (credits.length === 0 && debits.length === 0) return;
      
      const payload = {
        voucher_date: voucherDate,
        credits,
        debits,
        voucher_type: 'CONTRA/JV'
      };

      await axios.post('/api/jv', payload, {
        headers: { 'x-company-id': company.id, 'x-user-id': 1 }
      });

      if (onSubmit) onSubmit();
    } catch (err) {
      alert('Failed to save JV: ' + (err.response?.data?.error || err.message));
    }
  };

  const totalCredit = credits.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  const totalDebit = debits.reduce((sum, item) => sum + parseFloat(item.amount), 0);

  // Pad tables to look nice
  const displayCredits = [...credits];
  const displayDebits = [...debits];
  while (displayCredits.length < 5) displayCredits.push(null);
  while (displayDebits.length < 5) displayDebits.push(null);

  return (
    <div className="fixed inset-0 bg-[#00000060] flex items-center justify-center z-[100] p-4 select-none">
      
      {/* Main JV Wrap */}
      <div className="bg-[#aecbf1] border-2 border-[#1E3A8A] w-full max-w-4xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col font-sans relative">
        
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-[#2c5b9f] to-[#1E3A8A] text-white px-3 py-1.5 flex justify-between items-center cursor-move">
          <div className="font-bold text-[14px]">Contra Entry</div>
          <button onClick={onClose} className="hover:text-red-300">
            <X size={16} />
          </button>
        </div>

        {/* Top Controls */}
        <div className="p-2 flex gap-4 bg-[#c5daf4] border-b border-[#1E3A8A]">
           <div className="flex items-center gap-2">
             <span className="text-[13px] font-bold text-[#1E3A8A]">Date :</span>
             <input 
               type="date"
               value={voucherDate}
               onChange={e => setVoucherDate(e.target.value)}
               className="border border-slate-400 px-2 py-0.5 text-[13px] outline-none"
             />
           </div>
        </div>

        {/* Two Tables Wrap */}
        <div className="flex h-[350px]">
           {/* Credit Side */}
           <div className="flex-1 flex flex-col border-r border-[#1E3A8A] bg-[#f9fbff]">
              <div className="text-[12px] font-bold text-[#1E3A8A] uppercase relative top-2 left-2 pb-1">Credit</div>
              <div className="h-px bg-[#1E3A8A] w-full mt-2"></div>
              
              <div className="grid grid-cols-12 bg-[#6b96d3] text-white text-[12px] font-bold border-b border-[#1E3A8A]">
                 <div className="col-span-6 p-1 border-r border-[#1E3A8A] text-center">Particular</div>
                 <div className="col-span-3 p-1 border-r border-[#1E3A8A] text-center">Amount</div>
                 <div className="col-span-3 p-1 text-center">Amount</div>
              </div>

              <div className="flex-1 overflow-y-auto">
                 {displayCredits.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 text-[12px] text-[#1E3A8A] border-b border-blue-200">
                       <div className="col-span-6 p-1 border-r border-blue-200 font-bold px-2">{item?.particulars || item?.account_name || ''}</div>
                       <div className="col-span-3 p-1 border-r border-blue-200 text-right pr-2"></div>
                       <div className="col-span-3 p-1 text-right font-bold pr-2">{item ? parseFloat(item.amount).toFixed(2) : ''}</div>
                    </div>
                 ))}
              </div>

              {/* Credit Footer */}
              <div className="flex bg-[#e4efff] border-t border-[#1E3A8A] text-[12px] h-[25px]">
                 <div className="flex-1 text-right font-bold text-[#1E3A8A] py-1 px-2 border-r border-[#1E3A8A]">Total</div>
                 <div className="w-[124px] text-right font-bold text-red-700 bg-white border border-[#1E3A8A] m-[2px] px-2 flex items-center justify-end">{totalCredit.toFixed(2)}</div>
              </div>
           </div>

           {/* Debit Side */}
           <div className="flex-1 flex flex-col bg-[#f9fbff]">
              <div className="text-[12px] font-bold text-[#1E3A8A] uppercase relative top-2 left-2 pb-1">Debit</div>
              <div className="h-px bg-[#1E3A8A] w-full mt-2"></div>
              
              <div className="grid grid-cols-12 bg-[#6b96d3] text-white text-[12px] font-bold border-b border-[#1E3A8A]">
                 <div className="col-span-6 p-1 border-r border-[#1E3A8A] text-center">Particular</div>
                 <div className="col-span-3 p-1 border-r border-[#1E3A8A] text-center">Amount</div>
                 <div className="col-span-3 p-1 text-center">Amount</div>
              </div>

              <div className="flex-1 overflow-y-auto">
                 {displayDebits.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 text-[12px] text-[#1E3A8A] border-b border-blue-200">
                       <div className="col-span-6 p-1 border-r border-blue-200 font-bold px-2">{item?.particulars || item?.account_name || ''}</div>
                       <div className="col-span-3 p-1 border-r border-blue-200 text-right pr-2"></div>
                       <div className="col-span-3 p-1 text-right font-bold pr-2">{item ? parseFloat(item.amount).toFixed(2) : ''}</div>
                    </div>
                 ))}
              </div>

              {/* Debit Footer */}
              <div className="flex bg-[#e4efff] border-t border-[#1E3A8A] text-[12px] h-[25px]">
                 <div className="flex-1 text-right font-bold text-[#1E3A8A] py-1 px-2 border-r border-[#1E3A8A]">Total</div>
                 <div className="w-[124px] text-right font-bold text-red-700 bg-white border border-[#1E3A8A] m-[2px] px-2 flex items-center justify-end">{totalDebit.toFixed(2)}</div>
              </div>
           </div>
        </div>

        {/* Actions row under grids */}
        <div className="bg-[#a8c4ea] flex justify-between p-1.5 border-t border-[#1E3A8A]">
           <button 
             onClick={() => setActiveSubModal('credit')} 
             className="bg-[#c2d7f4] border border-[#1E3A8A] px-6 py-0.5 text-[12px] font-bold text-[#1E3A8A] hover:bg-[#a5c3ed] shadow"
           >Credit</button>
           <button 
             onClick={() => setActiveSubModal('debit')} 
             className="bg-[#c2d7f4] border border-[#1E3A8A] px-6 py-0.5 text-[12px] font-bold text-[#1E3A8A] hover:bg-[#a5c3ed] shadow"
           >Debit</button>
        </div>

        {/* Global Ok / Cancel */}
        <div className="bg-[#a8c4ea] flex justify-end gap-2 p-1.5 border-t border-[#1E3A8A] pb-3 pr-4">
           <button onClick={handleSave} className="bg-[#e4efff] border border-[#1E3A8A] px-6 py-1 text-[13px] font-bold text-[#1E3A8A] hover:bg-[#c2d7f4] shadow">Ok</button>
           <button onClick={onClose} className="bg-[#e4efff] border border-[#1E3A8A] px-6 py-1 text-[13px] font-bold text-[#1E3A8A] hover:bg-[#c2d7f4] shadow">Cancel</button>
        </div>

        {/* Sub Modals Overlays */}
        {activeSubModal && (
          <SubEntryModal 
            type={activeSubModal}
            date={voucherDate}
            accounts={accounts}
            onClose={() => setActiveSubModal(null)}
            onAdd={(item) => {
              if(activeSubModal === 'credit') setCredits(prev => [...prev, item]);
              else setDebits(prev => [...prev, item]);
              setActiveSubModal(null);
            }}
          />
        )}

      </div>
    </div>
  );
}

// Inner sub modal component
function SubEntryModal({ type, date, accounts, onClose, onAdd }) {
  const isCredit = type === 'credit';
  const title = isCredit ? 'Credit Entry' : 'Debit Entry';

  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [refNo, setRefNo] = useState('');
  const [particulars, setParticulars] = useState('');

  const handleSubmit = () => {
    if (!accountId || !amount) {
      alert("Please select Account and enter Amount.");
      return;
    }
    const acc = accounts.find(a => a.id === parseInt(accountId));
    onAdd({
      account_id: parseInt(accountId),
      account_name: acc?.account_name || 'Accounts',
      amount: parseFloat(amount),
      reference_no: refNo,
      particulars: particulars || acc?.account_name || ''
    });
  };

  return (
    <div className="absolute inset-0 bg-[#00000020] z-[120] flex items-center justify-center">
      <div className="bg-[#aecbf1] border-2 border-[#1E3A8A] shadow-[0_10px_30px_rgba(0,0,0,0.5)] w-[500px]">
         <div className="bg-[#2c5b9f] text-white px-2 py-1 flex justify-between">
            <span className="text-[14px] font-bold">{title}</span>
            <button onClick={onClose}><X size={16} /></button>
         </div>

         <div className="p-4 space-y-3 bg-[#e4efff]">
            <div className="flex items-center gap-2 text-[13px]">
               <span className="w-20 font-bold text-[#1E3A8A]">Date :</span>
               <input disabled value={date} className="border border-slate-400 px-2 py-0.5 outline-none bg-slate-200" />
            </div>

            <div className="flex items-center gap-2 text-[13px]">
               <span className="w-20 font-bold text-[#1E3A8A]">Account :</span>
               <select 
                 value={accountId}
                 onChange={e => setAccountId(e.target.value)}
                 className="flex-1 border border-slate-400 px-2 py-1 outline-none font-bold uppercase text-[#1E3A8A]"
               >
                 <option value="">-- SELECT ACCOUNT --</option>
                 {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
               </select>
            </div>

            <div className="flex items-center gap-2 text-[13px]">
               <span className="w-20 font-bold text-[#1E3A8A]">Amount :</span>
               <input 
                 type="number" 
                 value={amount}
                 onChange={e => setAmount(e.target.value)}
                 className="w-32 border border-slate-400 px-2 py-1 outline-none font-bold text-right"
                 placeholder="0.00"
               />
               <span className="font-bold text-[#1E3A8A] ml-2">{isCredit ? 'Receipt No:' : 'Voucher No:'}</span>
               <input 
                 type="text"
                 value={refNo}
                 onChange={e => setRefNo(e.target.value)}
                 className="flex-1 border border-slate-400 px-2 py-1 outline-none"
               />
            </div>

            <div className="flex items-start gap-2 text-[13px]">
               <span className="w-20 font-bold text-[#1E3A8A] mt-1">Particulars:</span>
               <textarea 
                 value={particulars}
                 onChange={e => setParticulars(e.target.value)}
                 className="flex-1 border border-slate-400 px-2 py-1 outline-none uppercase text-[#1E3A8A] h-16 resize-none"
               />
            </div>

         </div>

         <div className="bg-[#a8c4ea] p-2 flex justify-center gap-2 border-t border-[#1E3A8A]">
            <button onClick={handleSubmit} className="bg-[#e4efff] border border-[#1E3A8A] px-6 py-1 text-[13px] font-bold text-[#1E3A8A] hover:bg-[#c2d7f4] shadow">Ok</button>
            <button onClick={onClose} className="bg-[#e4efff] border border-[#1E3A8A] px-6 py-1 text-[13px] font-bold text-[#1E3A8A] hover:bg-[#c2d7f4] shadow">Cancel</button>
         </div>
      </div>
    </div>
  );
}
