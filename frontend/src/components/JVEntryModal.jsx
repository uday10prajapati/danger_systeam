import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search, AlertCircle, Trash2, Edit3 } from 'lucide-react';

export default function JVEntryModal({ company, onClose, onSubmit }) {
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [credits, setCredits] = useState([]);
  const [debits, setDebits] = useState([]);
  
  // Modals state
  const [activeSubModal, setActiveSubModal] = useState(null); // 'credit' | 'debit' | null
  const [editIndex, setEditIndex] = useState(null);
  const [selected, setSelected] = useState(null); // { type, index }

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

  const removeItem = (type, index) => {
    if (type === 'credit') {
      setCredits(prev => prev.filter((_, i) => i !== index));
    } else {
      setDebits(prev => prev.filter((_, i) => i !== index));
    }
    if (selected?.type === type && selected?.index === index) setSelected(null);
  };

  const totalCredit = credits.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  const totalDebit = debits.reduce((sum, item) => sum + parseFloat(item.amount), 0);

  // Pad tables to look nice
  const displayCredits = [...credits];
  const displayDebits = [...debits];
  while (displayCredits.length < 5) displayCredits.push(null);
  while (displayDebits.length < 5) displayDebits.push(null);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 select-none">
      
      {/* Main JV Wrap - Industrial Monochrome */}
      <div className="bg-slate-200 border-2 border-slate-900 w-full max-w-4xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col font-sans relative rounded-lg overflow-hidden">
        
        {/* Title Bar */}
        <div className="bg-black text-white px-4 py-1.5 flex justify-between items-center cursor-move">
          <div className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
            <div className="w-3.5 h-3.5 bg-white rounded-sm rotate-45"></div>
            Contra / J.V. Entry
          </div>
          <button onClick={onClose} className="hover:bg-red-600 p-0.5 rounded transition-all active:scale-90">
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        {/* Top Controls */}
        <div className="p-2.5 flex gap-4 bg-white border-b border-slate-300 items-center">
           <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date :</span>
             <input 
               type="date"
               value={voucherDate}
               onChange={e => setVoucherDate(e.target.value)}
               className="border border-slate-300 px-3 py-1 text-xs outline-none rounded font-bold shadow-sm focus:border-black"
             />
           </div>
        </div>

        {/* Two Tables Wrap */}
        <div className="flex h-[350px] bg-white">
           {/* Credit Side */}
           <div className="flex-1 flex flex-col border-r border-slate-900">
              <div className="bg-slate-50 p-1.5 border-b border-slate-200 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-2">Credit (Jama)</span>
                <button onClick={() => { setEditIndex(null); setActiveSubModal('credit'); }} className="text-[9px] bg-black text-white px-3 py-0.5 rounded font-black hover:bg-slate-800 transition-all uppercase tracking-widest tracking-tighter">+ Add Credit</button>
              </div>
              
              <div className="grid grid-cols-12 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest border-b border-slate-900">
                 <div className="col-span-8 p-1.5 border-r border-slate-800 text-left px-3">Particular Account</div>
                 <div className="col-span-4 p-1.5 text-right px-3">Amount (₹)</div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white scrollbar-hide">
                 {displayCredits.map((item, i) => (
                    <div 
                      key={i} 
                      onClick={() => item && setSelected({ type: 'credit', index: i })}
                      onDoubleClick={() => { if(item) { setEditIndex(i); setActiveSubModal('credit'); } }}
                      className={`grid grid-cols-12 border-b transition-all min-h-[3.5rem] py-2 items-center group cursor-pointer ${
                         selected?.type === 'credit' && selected?.index === i 
                         ? 'bg-black text-white' 
                         : 'text-slate-800 border-slate-50 hover:bg-slate-50'
                      }`}
                    >
                       <div className={`col-span-8 p-1 border-r px-3 flex flex-col gap-0.5 ${selected?.type === 'credit' && selected?.index === i ? 'border-slate-800' : 'border-slate-50'}`}>
                          <div className={`font-black uppercase text-xs tracking-tighter leading-tight ${selected?.type === 'credit' && selected?.index === i ? 'text-white' : 'text-slate-900'}`}>
                             {item?.account_name || ''}
                          </div>
                          <div className={`text-[10px] font-bold italic truncate ${selected?.type === 'credit' && selected?.index === i ? 'text-slate-400' : 'text-slate-400'}`}>
                             {item?.particulars || ''}
                          </div>
                       </div>
                       <div className="col-span-4 p-1 flex justify-between items-center px-3">
                          <span className="font-black font-mono text-sm">{item ? parseFloat(item.amount).toFixed(2) : ''}</span>
                          {item && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeItem('credit', i); }}
                              className={`p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all ${selected?.type === 'credit' && selected?.index === i ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                       </div>
                    </div>
                 ))}
              </div>

              {/* Credit Footer */}
              <div className="flex bg-slate-100 border-t border-slate-900 h-10 items-center">
                 <div className="flex-1 text-right font-black text-slate-500 uppercase tracking-widest px-3 text-[10px]">Total Credit</div>
                 <div className="w-[120px] text-right font-black text-slate-900 bg-white border-l border-slate-900 h-full flex items-center justify-end px-3 font-mono text-sm">{totalCredit.toFixed(2)}</div>
              </div>
           </div>

           {/* Debit Side */}
           <div className="flex-1 flex flex-col">
              <div className="bg-slate-50 p-1.5 border-b border-slate-200 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest px-2">Debit (Udhar)</span>
                <button onClick={() => { setEditIndex(null); setActiveSubModal('debit'); }} className="text-[9px] bg-black text-white px-3 py-0.5 rounded font-black hover:bg-slate-800 transition-all uppercase tracking-widest tracking-tighter">+ Add Debit</button>
              </div>
              
              <div className="grid grid-cols-12 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest border-b border-slate-900">
                 <div className="col-span-8 p-1.5 border-r border-slate-800 text-left px-3">Particular Account</div>
                 <div className="col-span-4 p-1.5 text-right px-3">Amount (₹)</div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white scrollbar-hide">
                 {displayDebits.map((item, i) => (
                    <div 
                      key={i} 
                      onClick={() => item && setSelected({ type: 'debit', index: i })}
                      onDoubleClick={() => { if(item) { setEditIndex(i); setActiveSubModal('debit'); } }}
                      className={`grid grid-cols-12 border-b transition-all min-h-[3.5rem] py-2 items-center group cursor-pointer ${
                        selected?.type === 'debit' && selected?.index === i 
                        ? 'bg-black text-white' 
                        : 'text-slate-800 border-slate-50 hover:bg-slate-50'
                     }`}
                    >
                       <div className={`col-span-8 p-1 border-r px-3 flex flex-col gap-0.5 ${selected?.type === 'debit' && selected?.index === i ? 'border-slate-800' : 'border-slate-50'}`}>
                          <div className={`font-black uppercase text-xs tracking-tighter leading-tight ${selected?.type === 'debit' && selected?.index === i ? 'text-white' : 'text-slate-900'}`}>
                             {item?.account_name || ''}
                          </div>
                          <div className={`text-[10px] font-bold italic truncate ${selected?.type === 'debit' && selected?.index === i ? 'text-slate-400' : 'text-slate-400'}`}>
                             {item?.particulars || ''}
                          </div>
                       </div>
                       <div className="col-span-4 p-1 flex justify-between items-center px-3">
                          <span className="font-black font-mono text-sm">{item ? parseFloat(item.amount).toFixed(2) : ''}</span>
                          {item && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeItem('debit', i); }}
                              className={`p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all ${selected?.type === 'debit' && selected?.index === i ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                       </div>
                    </div>
                 ))}
              </div>

              {/* Debit Footer */}
              <div className="flex bg-slate-100 border-t border-slate-900 h-10 items-center">
                 <div className="flex-1 text-right font-black text-slate-500 uppercase tracking-widest px-3 text-[10px]">Total Debit</div>
                 <div className="w-[120px] text-right font-black text-slate-900 bg-white border-l border-slate-900 h-full flex items-center justify-end px-3 font-mono text-sm">{totalDebit.toFixed(2)}</div>
              </div>
           </div>
        </div>

        {/* Global Ok / Cancel - Monochrome Style */}
        <div className="bg-slate-200 border-t border-slate-300 p-2.5 flex justify-end gap-3 shadow-inner">
           {totalCredit !== totalDebit && (
             <div className="mr-auto flex items-center text-red-600 font-black text-[10px] uppercase tracking-tighter self-center animate-pulse">
               <AlertCircle size={14} className="mr-1" /> Difference: {(totalCredit - totalDebit).toFixed(2)}
             </div>
           )}
           <button onClick={onClose} className="bg-white border border-slate-300 px-6 py-1.5 text-[11px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 shadow-sm rounded transition-all">Cancel</button>
           <button 
             onClick={handleSave} 
             disabled={totalCredit === 0 || totalCredit !== totalDebit}
             className="bg-black border border-black px-8 py-1.5 text-[11px] font-black text-white uppercase tracking-widest hover:bg-slate-800 shadow-lg rounded transition-all disabled:bg-slate-400 disabled:border-slate-400 active:scale-95"
           >
             Save Voucher
           </button>
        </div>

        {/* Sub Modals Overlays */}
        {activeSubModal && (
          <SubEntryModal 
            type={activeSubModal}
            date={voucherDate}
            accounts={accounts}
            initialData={editIndex !== null ? (activeSubModal === 'credit' ? credits[editIndex] : debits[editIndex]) : null}
            onClose={() => { setActiveSubModal(null); setEditIndex(null); }}
            onAdd={(item) => {
              if (activeSubModal === 'credit') {
                if (editIndex !== null) {
                  const newC = [...credits];
                  newC[editIndex] = item;
                  setCredits(newC);
                } else {
                  setCredits(prev => [...prev, item]);
                }
              } else {
                if (editIndex !== null) {
                  const newD = [...debits];
                  newD[editIndex] = item;
                  setDebits(newD);
                } else {
                  setDebits(prev => [...prev, item]);
                }
              }
              setActiveSubModal(null);
              setEditIndex(null);
            }}
          />
        )}

      </div>
    </div>
  );
}

// Inner sub modal component
function SubEntryModal({ type, date, accounts, onClose, onAdd, initialData }) {
  const isCredit = type === 'credit';
  const title = initialData ? (isCredit ? 'Update Credit' : 'Update Debit') : (isCredit ? 'Credit (Jama) Entry' : 'Debit (Udhar) Entry');

  const [accountId, setAccountId] = useState(initialData?.account_id || '');
  const [amount, setAmount] = useState(initialData?.amount || '');
  const [refNo, setRefNo] = useState(initialData?.reference_no || '');
  const [particulars, setParticulars] = useState(initialData?.particulars || '');

  const handleSubmit = () => {
    if (!accountId || !amount) return;
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
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
      <div className="bg-slate-200 border-2 border-slate-900 shadow-2xl w-full max-w-lg rounded-lg overflow-hidden font-sans">
         <div className="bg-black text-white px-5 py-2 flex justify-between items-center">
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">{title}</span>
            <button onClick={onClose} className="hover:bg-red-600 rounded p-1 transition-all"><X size={16} strokeWidth={3} /></button>
         </div>

         <div className="p-4 space-y-4 bg-white">
            <div className="flex items-center justify-between bg-slate-50 p-2 border border-slate-200 rounded">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entry Date:</span>
               <span className="font-mono font-black text-slate-900 text-xs px-2">{date}</span>
            </div>

            <div className="flex flex-col gap-1.5">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Account / Party :</span>
               <select 
                 value={accountId}
                 onChange={e => setAccountId(e.target.value)}
                 className="w-full border border-slate-300 h-9 px-3 rounded outline-none font-black uppercase text-slate-900 bg-white focus:border-black shadow-sm transition-all text-[11px]"
               >
                 <option value="">-- CHOOSE ACCOUNT --</option>
                 {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
               </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount (₹):</span>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full border border-slate-300 h-10 px-4 rounded outline-none font-black text-right shadow-sm focus:border-black text-base italic text-slate-900 bg-yellow-50/30"
                    placeholder="0.00"
                  />
               </div>
               <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isCredit ? 'Receipt #' : 'Voucher #'}</span>
                  <input 
                    type="text"
                    value={refNo}
                    onChange={e => setRefNo(e.target.value)}
                    className="w-full border border-slate-300 h-10 px-4 rounded outline-none font-black shadow-sm focus:border-black text-[11px] uppercase"
                    placeholder="REFERENCE"
                  />
               </div>
            </div>

            <div className="flex flex-col gap-1.5">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Particulars / Remarks:</span>
               <textarea 
                 value={particulars}
                 onChange={e => setParticulars(e.target.value)}
                 className="w-full border border-slate-300 px-4 py-2 rounded outline-none uppercase font-bold text-slate-900 h-20 resize-none focus:border-black shadow-sm italic text-[11px] bg-slate-50/50"
                 placeholder="Auto-filled from account name if empty"
               />
            </div>
         </div>

         <div className="bg-slate-200 p-3 flex justify-end gap-3 border-t border-slate-300 shadow-inner">
            <button onClick={onClose} className="px-6 py-2 text-[10px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="bg-black text-white px-8 py-2 text-[10px] font-black uppercase tracking-widest rounded shadow-xl hover:bg-slate-800 transition-all active:scale-95 border border-black">{initialData ? 'Update Entry' : 'Add To Voucher'}</button>
         </div>
      </div>
    </div>
  );
}
