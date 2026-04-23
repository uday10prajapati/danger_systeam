import React, { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import axios from 'axios';

export default function SaleForm({ onSubmit, onCancel }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form Header State
  const [milkDateFrom, setMilkDateFrom] = useState('');
  const [milkDateTo, setMilkDateTo] = useState('');
  const [deductionDateFrom, setDeductionDateFrom] = useState('');
  const [deductionDateTo, setDeductionDateTo] = useState('');

  // Primary Form State
  const [billNo, setBillNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesType, setSalesType] = useState('credit'); // credit, cash
  const [taxType, setTaxType] = useState('CGST/SGST'); // CGST/SGST, IGST
  const [memberId, setMemberId] = useState('');

  // Member Search State
  const [availableMembers, setAvailableMembers] = useState([]);
  const [memberSearchText, setMemberSearchText] = useState('');
  const [memberNameSearch, setMemberNameSearch] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Bank Info State
  const [isChequePayment, setIsChequePayment] = useState(false);
  const [bankName, setBankName] = useState('');
  const [chequeNo, setChequeNo] = useState('');

  // Items State
  const [availableItems, setAvailableItems] = useState([]);
  const [saleItems, setSaleItems] = useState([]);

  // Current Input Row State
  const [currentItem, setCurrentItem] = useState(null);
  const [currentQty, setCurrentQty] = useState('');
  const [currentRate, setCurrentRate] = useState('');
  const [itemSearchText, setItemSearchText] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [itemSelectedIndex, setItemSelectedIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  // Input Refs for hotkeys
  const itemInputRef = useRef(null);
  const memberDropdownRef = useRef(null);
  const itemDropdownRef = useRef(null);
  const dropdownListRef = useRef(null);

  const calculateDropdownPos = () => {
    if (itemInputRef.current) {
      const rect = itemInputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, 350)
      });
    }
  };

  useEffect(() => {
    if (showItemDropdown) {
      calculateDropdownPos();
      window.addEventListener('resize', calculateDropdownPos);
      return () => window.removeEventListener('resize', calculateDropdownPos);
    }
  }, [showItemDropdown]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (showItemDropdown && dropdownListRef.current) {
      const selectedEl = dropdownListRef.current.children[itemSelectedIndex + 1]; // +1 for header
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [itemSelectedIndex, showItemDropdown]);

  // Auto-fetch member by code
  useEffect(() => {
    if (memberSearchText) {
      const match = availableMembers.find(m => String(m.member_code) === memberSearchText);
      if (match) {
        setSelectedMember(match);
        setMemberId(match.id);
        setMemberNameSearch(match.member_name);
        setShowMemberDropdown(false); // Auto-close on exact code match
      } else {
        // Only clear if we were previously matched
        if (selectedMember && String(selectedMember.member_code) !== memberSearchText) {
          setSelectedMember(null);
          setMemberId('');
        }
      }
    } else {
      setSelectedMember(null);
      setMemberId('');
    }
  }, [memberSearchText, availableMembers]);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(e.target)) {
        setShowMemberDropdown(false);
      }
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.target)) {
        setShowItemDropdown(false);
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showItemDropdown) {
          setShowItemDropdown(false);
          return;
        }
        if (showMemberDropdown) {
          setShowMemberDropdown(false);
          return;
        }
        onCancel();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showItemDropdown, showMemberDropdown, onCancel]);

  useEffect(() => {
    loadCompanyAndData();
  }, []);

  const loadCompanyAndData = async () => {
    try {
      const compRes = await axios.get('/api/company');
      if (compRes.data.success && compRes.data.data) {
        const comp = compRes.data.data;
        setCompany(comp);

        const memRes = await axios.get(`/api/members/company/${comp.id}`, { headers: { 'x-company-id': comp.id } });
        if (memRes.data.success) {
          setAvailableMembers(memRes.data.data || []);
        }

        const itemRes = await axios.get(`/api/items/company/${comp.id}?active=true`, { headers: { 'x-company-id': comp.id } });
        if (itemRes.data.success) {
          setAvailableItems(itemRes.data.data || []);
        }

        try {
          const lastSale = await axios.get(`/api/sales`, { headers: { 'x-company-id': comp.id } });
          if (lastSale.data.success && lastSale.data.data && lastSale.data.data.length > 0) {
            const lastInv = lastSale.data.data[lastSale.data.data.length - 1].invoice_no;
            const matches = String(lastInv).match(/(\d+)/);
            const lastNo = matches ? parseInt(matches[0]) : 0;
            setBillNo(String(lastNo + 1).padStart(6, '0'));
          } else {
            setBillNo('000001');
          }
        } catch (saleErr) {
          setBillNo('000001');
        }

        const today = new Date();
        const year = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
        setMilkDateFrom(`${year}-04-01`);
        setMilkDateTo(`${year + 1}-03-31`);
        setDeductionDateFrom(`${year}-04-01`);
        setDeductionDateTo(`${year + 1}-03-31`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const calculateRowDetails = (item, qty, rate) => {
    const amount = qty * rate;
    let cgstPercent = 0, cgstAmt = 0;
    let sgstPercent = 0, sgstAmt = 0;
    let igstPercent = 0, igstAmt = 0;

    if (item) {
      if (taxType === 'CGST/SGST') {
        cgstPercent = parseFloat(item.cgst_percent) || 0;
        sgstPercent = parseFloat(item.sgst_percent) || 0;
        if (cgstPercent === 0 && sgstPercent === 0 && item.tax_percentage) {
          cgstPercent = parseFloat(item.tax_percentage) / 2;
          sgstPercent = parseFloat(item.tax_percentage) / 2;
        }
        cgstAmt = amount * (cgstPercent / 100);
        sgstAmt = amount * (sgstPercent / 100);
      } else {
        igstPercent = parseFloat(item.igst_percent) || parseFloat(item.tax_percentage) || 0;
        igstAmt = amount * (igstPercent / 100);
      }
    }
    const totalAmount = amount + cgstAmt + sgstAmt + igstAmt;
    return { amount, cgstPercent, cgstAmt, sgstPercent, sgstAmt, igstPercent, igstAmt, totalAmount };
  };

  const handleAddItem = (e) => {
    if (e) e.preventDefault();
    if (!currentItem || !currentQty || currentQty <= 0) return;
    const defaultRate = currentItem.sale_price !== undefined ? currentItem.sale_price : currentItem.sale_rate || 0;
    const rate = currentRate !== '' ? parseFloat(currentRate) : parseFloat(defaultRate);
    const details = calculateRowDetails(currentItem, parseFloat(currentQty), rate);
    const newItem = {
      ...currentItem,
      quantity: parseFloat(currentQty),
      rate: rate,
      ...details
    };
    setSaleItems([...saleItems, newItem]);
    setCurrentItem(null);
    setItemSearchText('');
    setCurrentQty('');
    setCurrentRate('');
    if (itemInputRef.current) itemInputRef.current.focus();
  };

  const handleRemoveItem = (index) => {
    const newItems = [...saleItems];
    newItems.splice(index, 1);
    setSaleItems(newItems);
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setMemberId(member.id);
    setMemberSearchText(member.member_code ? String(member.member_code) : '');
    setMemberNameSearch(member.member_name);
    setShowMemberDropdown(false);
  };

  const handleItemSelect = (item) => {
    setCurrentItem(item);
    setItemSearchText(`${item.item_code} ${item.item_name}`);
    const defaultRate = item.sale_price !== undefined ? item.sale_price : item.sale_rate || '';
    setCurrentRate(defaultRate);
    setShowItemDropdown(false);
    setItemSelectedIndex(0);
  };

  const handleItemSearchKeyDown = (e) => {
    const filteredItems = availableItems.filter(i => 
      String(i.item_name).toLowerCase().includes(itemSearchText.toLowerCase()) || 
      String(i.item_code).includes(itemSearchText)
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setItemSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setItemSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (showItemDropdown && filteredItems.length > 0) {
        e.preventDefault();
        handleItemSelect(filteredItems[itemSelectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setShowItemDropdown(false);
    }
  };

  const totalBaseAmount = saleItems.reduce((sum, row) => sum + row.amount, 0);
  const totalCgst = saleItems.reduce((sum, row) => sum + row.cgstAmt, 0);
  const totalSgst = saleItems.reduce((sum, row) => sum + row.sgstAmt, 0);
  const totalIgst = saleItems.reduce((sum, row) => sum + row.igstAmt, 0);
  const grossTotal = totalBaseAmount + totalCgst + totalSgst + totalIgst;
  const netAmount = Math.round(grossTotal);
  const rounding = netAmount - grossTotal;
  const liveRate = currentRate !== '' ? parseFloat(currentRate) : (currentItem?.sale_price || currentItem?.sale_rate || 0);
  const livePreview = currentItem ? calculateRowDetails(currentItem, parseFloat(currentQty) || 0, liveRate) : null;

  const handleSave = async () => {
    if (saleItems.length === 0) { setError("Please add at least one item."); return; }
    if (salesType === 'credit' && !selectedMember) { setError("Please select a Member."); return; }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        customer_account_id: selectedMember ? selectedMember.account_id : null,
        member_id: selectedMember ? selectedMember.id : null,
        invoice_no: billNo,
        invoice_date: invoiceDate,
        is_intra_state: taxType === 'CGST/SGST',
        payment_type: salesType,
        notes: (salesType === 'cash' && isChequePayment) ? `Bank ${bankName}, Chq ${chequeNo}` : '',
        discount_amount: 0,
        items: saleItems.map(row => ({
          item_id: row.id,
          quantity: row.quantity,
          sale_rate: row.rate,
          gst_percent: taxType === 'IGST' ? row.igstPercent : (row.cgstPercent + row.sgstPercent)
        }))
      };
      const res = await axios.post('/api/sales/with-gst', payload, { headers: { 'x-company-id': company.id, 'x-user-id': 1 } });
      if (res.data.success) {
        setSuccess("Sale Saved Successfully!");
        setTimeout(() => { if (onSubmit) onSubmit(res.data.data); }, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="bg-slate-200 w-full max-w-6xl max-h-[90vh] rounded-lg shadow-2xl flex flex-col border-2 border-slate-900 overflow-hidden font-sans">
        
        {/* Header Ribbon */}
        <div className="flex justify-between items-center bg-black text-white px-5 py-2">
          <div className="flex items-center gap-3 font-black text-xs uppercase tracking-widest">
            <div className="w-3 h-3 bg-white rounded-full"></div>
            Sale Entry
          </div>
          <button onClick={onCancel} className="hover:bg-red-600 text-white rounded-lg p-1 transition-all active:scale-90">
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        {/* Dynamic Alerts */}
        {error && <div className="bg-red-500 text-white text-[10px] font-black px-6 py-1.5 animate-pulse uppercase tracking-widest">{error}</div>}
        {success && <div className="bg-slate-900 text-white text-[10px] font-black px-6 py-1.5 uppercase tracking-widest border-l-4 border-white">{success}</div>}

        <div className="flex-1 overflow-auto bg-white flex flex-col">
          {/* Top Form Section */}
          <div className="bg-slate-50 p-3 border-b border-slate-200 flex flex-col gap-3">
            {/* Row 1: Bill & Date */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 items-center px-2">
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-500 uppercase tracking-widest text-[9px] w-14 text-right">Bill No :</span>
                <input type="text" value={billNo} onChange={e => setBillNo(e.target.value)} className="border border-slate-300 px-4 h-8 text-xs bg-slate-900 text-white w-32 outline-none rounded font-mono font-black text-center shadow-lg focus:ring-2 focus:ring-slate-400" />
              </div>
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-500 uppercase tracking-widest text-[9px]">Date :</span>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="border border-slate-300 px-4 h-8 text-[11px] bg-white w-40 outline-none rounded font-bold shadow-sm focus:border-black transition-all" />
              </div>
              <div className="flex items-center gap-2 ml-auto text-[10px] bg-slate-900 text-white p-1 rounded-lg border-2 border-slate-900 shadow-lg font-black uppercase tracking-widest h-9">
                <button onClick={() => setSalesType('cash')} className={`px-4 py-1.5 rounded-md transition-all h-full ${salesType === 'cash' ? 'bg-white text-black' : 'hover:bg-slate-800'}`}>Cash</button>
                <button onClick={() => setSalesType('credit')} className={`px-4 py-1.5 rounded-md transition-all h-full ${salesType === 'credit' ? 'bg-white text-black' : 'hover:bg-slate-800'}`}>Credit</button>
              </div>
            </div>

            {/* Row 2: Member & Tax */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 items-center px-2">
              <div className="flex items-center gap-3 relative" ref={memberDropdownRef}>
                <span className="font-black text-slate-500 uppercase tracking-widest text-[9px] w-14 text-right">Member :</span>
                <input 
                  type="text" 
                  value={memberSearchText} 
                  onChange={e => { setMemberSearchText(e.target.value); setShowMemberDropdown(true); }}
                  onFocus={() => setShowMemberDropdown(true)}
                  className="border border-slate-300 px-4 h-8 text-xs bg-white w-28 outline-none rounded font-black text-center uppercase shadow-sm focus:border-black" 
                  placeholder="CODE"
                />
                <input 
                  type="text" 
                  value={memberNameSearch} 
                  onChange={e => { 
                    setMemberNameSearch(e.target.value); 
                    setShowMemberDropdown(true); 
                    if (selectedMember && selectedMember.member_name !== e.target.value) {
                      setSelectedMember(null);
                      setMemberId('');
                    }
                  }} 
                  onFocus={() => setShowMemberDropdown(true)}
                  className="border border-slate-300 px-4 h-8 text-xs bg-white w-64 outline-none rounded font-black text-slate-900 uppercase shadow-sm focus:border-black" 
                  placeholder="NAME OR SEARCH..."
                />
                {showMemberDropdown && (
                  <div className="absolute top-full left-16 bg-white border-2 border-black shadow-2xl w-[400px] max-h-56 overflow-y-auto z-50 rounded-lg mt-1 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 border-b bg-slate-900 flex justify-between items-center sticky top-0">
                       <span className="text-white text-[9px] font-black uppercase tracking-widest px-2">Members</span>
                       <X size={14} className="text-white cursor-pointer hover:bg-red-500 rounded p-0.5" onClick={() => setShowMemberDropdown(false)}/>
                    </div>
                    {availableMembers.filter(m => {
                      const codeMatch = memberSearchText ? String(m.member_code).includes(memberSearchText) : true;
                      const nameMatch = memberNameSearch ? String(m.member_name).toLowerCase().includes(memberNameSearch.toLowerCase()) : true;
                      return codeMatch && nameMatch;
                    }).map(m => (
                      <div key={m.id} onClick={() => handleMemberSelect(m)} className="px-4 py-2 hover:bg-black hover:text-white cursor-pointer text-xs font-black border-b border-slate-50 last:border-0 transition-colors uppercase tracking-tight flex justify-between items-center group">
                        <span>{m.member_name}</span>
                        <span className="text-[9px] text-slate-400 group-hover:text-slate-300">#{m.member_code}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <span className="font-black text-slate-500 uppercase tracking-widest text-[9px]">Tax Type :</span>
                <select value={taxType} onChange={e => setTaxType(e.target.value)} className="border border-slate-300 px-4 h-8 text-xs bg-white w-48 outline-none rounded font-black text-slate-900 shadow-sm focus:border-black transition-all">
                  <option value="CGST/SGST">CGST/SGST (Intrastate)</option>
                  <option value="IGST">IGST (Interstate)</option>
                </select>
              </div>
            </div>

            {salesType === 'cash' && (
               <div className="flex items-center gap-4 px-2">
                 <label className="flex items-center gap-2 cursor-pointer ml-14">
                    <input type="checkbox" checked={isChequePayment} onChange={e => setIsChequePayment(e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="font-black text-slate-500 uppercase tracking-widest text-[9px]">Cheque Payment</span>
                 </label>
                 {isChequePayment && (
                    <div className="flex gap-2 items-center">
                       <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="BANK NAME" className="border border-slate-300 px-3 h-7 text-[10px] w-48 outline-none rounded bg-white font-black shadow-sm" />
                       <input type="text" value={chequeNo} onChange={e => setChequeNo(e.target.value)} placeholder="CHQ NO" className="border border-slate-300 px-3 h-7 text-[10px] w-28 outline-none rounded bg-white font-black shadow-sm" />
                    </div>
                 )}
               </div>
            )}
          </div>

          {/* Table Area */}
          <div className="flex-1 overflow-auto bg-white min-h-[350px]">
            <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest border-b border-slate-800 sticky top-0 z-10 shadow-lg">
                <tr>
                  <th className="p-2 w-10">#</th>
                  <th className="p-2 w-72 text-left">Item Description</th>
                  <th className="p-2 w-20 text-right">Qty</th>
                  <th className="p-2 w-20 text-right">Rate</th>
                  <th className="p-2 w-24 text-right">Base</th>
                  <th className="p-2 w-12 text-right">{taxType === 'IGST' ? 'I%' : 'C%'}</th>
                  <th className="p-2 w-16 text-right">{taxType === 'IGST' ? 'IGST' : 'CGST'}</th>
                  <th className="p-2 w-12 text-right">{taxType === 'IGST' ? '' : 'S%'}</th>
                  <th className="p-2 w-16 text-right">{taxType === 'IGST' ? '' : 'SGST'}</th>
                  <th className="p-2 w-28 text-right">Total</th>
                  <th className="p-2 w-10 text-center">X</th>
                </tr>
              </thead>
              <tbody>
                {saleItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 group font-black text-slate-800 transition-colors">
                    <td className="p-2 text-center text-slate-300 text-[9px]">{idx + 1}</td>
                    <td className="p-2 whitespace-nowrap overflow-hidden text-ellipsis text-xs font-black">{item.item_code} {item.item_name}</td>
                    <td className="p-2 text-right font-mono italic text-slate-900">{item.quantity.toFixed(3)}</td>
                    <td className="p-2 text-right font-mono text-slate-500 font-bold">{item.rate.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono text-slate-900">{item.amount.toFixed(2)}</td>
                    <td className="p-2 text-right text-slate-400 text-[9px]">{taxType === 'IGST' ? item.igstPercent.toFixed(1) : item.cgstPercent.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono text-slate-600 font-bold">{taxType === 'IGST' ? item.igstAmt.toFixed(1) : item.cgstAmt.toFixed(1)}</td>
                    <td className={`p-2 text-right text-slate-400 text-[9px] ${taxType === 'CGST/SGST' ? 'bg-slate-50/50' : ''}`}>{taxType === 'IGST' ? '' : item.sgstPercent.toFixed(1)}</td>
                    <td className={`p-2 text-right font-mono text-slate-600 font-bold ${taxType === 'CGST/SGST' ? 'bg-slate-50/50' : ''}`}>{taxType === 'IGST' ? '' : item.sgstAmt.toFixed(1)}</td>
                    <td className="p-2 text-right font-mono bg-slate-50 text-slate-900 font-black">{item.totalAmount.toFixed(2)}</td>
                    <td className="p-2 text-center text-slate-400 hover:text-red-500 cursor-pointer transition-all" onClick={() => handleRemoveItem(idx)}><X size={14} strokeWidth={3}/></td>
                  </tr>
                ))}
                {/* Live Entry Input Row */}
                <tr className="bg-white border-t-2 border-slate-900 sticky bottom-0 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] h-11">
                  <td className="p-2 bg-slate-50 text-center text-[8px] font-black uppercase text-slate-300 italic w-10">NEW</td>
                  <td className="p-0 relative w-72">
                    <input 
                      ref={itemInputRef} 
                      type="text" 
                      value={itemSearchText} 
                      onChange={e => { 
                        setItemSearchText(e.target.value); 
                        setShowItemDropdown(true); 
                        setItemSelectedIndex(0);
                      }} 
                      onFocus={() => setShowItemDropdown(true)} 
                      onKeyDown={handleItemSearchKeyDown}
                      className="w-full h-full px-4 outline-none border-none text-xs bg-white font-black uppercase text-black placeholder:text-slate-300" 
                      placeholder="SEARCH PRODUCT..." 
                    />
                  </td>
                  <td className="p-0 bg-yellow-50 w-20">
                    <input type="number" value={currentQty} onChange={e => setCurrentQty(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddItem(e)} className="w-full h-full px-2 text-right outline-none bg-transparent font-black font-mono text-xs focus:bg-yellow-100 transition-colors" placeholder="0.000" />
                  </td>
                  <td className="p-0 bg-yellow-50 w-20">
                    <input type="number" value={currentRate} onChange={e => setCurrentRate(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddItem(e)} className="w-full h-full px-2 text-right outline-none bg-transparent font-black font-mono text-xs focus:bg-yellow-100 transition-colors" placeholder="0.00" />
                  </td>
                  
                  {livePreview ? (
                    <>
                      <td className="p-2 text-right font-black font-mono bg-slate-50 text-[11px] w-24">₹{livePreview.amount.toFixed(2)}</td>
                      <td className="p-2 text-right font-black font-mono bg-slate-50 text-[10px] text-slate-400 w-12">{taxType === 'IGST' ? livePreview.igstPercent.toFixed(1) : livePreview.cgstPercent.toFixed(1)}%</td>
                      <td className="p-2 text-right font-black font-mono bg-slate-50 text-[10px] text-slate-600 w-16">{taxType === 'IGST' ? livePreview.igstAmt.toFixed(1) : livePreview.cgstAmt.toFixed(1)}</td>
                      <td className="p-2 text-right font-black font-mono bg-slate-50 text-[10px] text-slate-400 w-12">{taxType === 'IGST' ? '' : livePreview.sgstPercent.toFixed(1) + '%'}</td>
                      <td className="p-2 text-right font-black font-mono bg-slate-50 text-[10px] text-slate-600 w-16">{taxType === 'IGST' ? '' : livePreview.sgstAmt.toFixed(1)}</td>
                      <td className="p-2 text-right font-black font-mono bg-slate-900 text-white text-[11px] w-28">₹{livePreview.totalAmount.toFixed(2)}</td>
                    </>
                  ) : (
                    <td colSpan={6} className="bg-slate-50 text-[9px] font-black uppercase text-slate-300 italic tracking-[0.2em] text-center">
                      [ Enter Quantity & Rate ]
                    </td>
                  )}
                  
                  <td className="bg-black text-white w-10">
                    <button onClick={handleAddItem} className="w-full h-full text-[10px] font-black uppercase hover:bg-slate-800 transition-all active:scale-95">Add</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Item Selector Dropdown */}
          {showItemDropdown && (
            <div ref={itemDropdownRef} style={{ position: 'fixed', top: `${dropdownPos.top}px`, left: dropdownPos.left, width: dropdownPos.width }} className="bg-white border-2 border-black shadow-2xl max-h-72 overflow-y-auto z-[9999] rounded-lg animate-in slide-in-from-top-1 duration-200">
              <div ref={dropdownListRef}>
                <div className="bg-slate-900 text-white p-2 text-[9px] font-black uppercase tracking-widest flex justify-between items-center sticky top-0">
                  <span>Select Item</span>
                  <X size={14} className="cursor-pointer hover:bg-red-500 rounded p-0.5" onClick={() => setShowItemDropdown(false)}/>
                </div>
                {availableItems.filter(i => String(i.item_name).toLowerCase().includes(itemSearchText.toLowerCase()) || String(i.item_code).includes(itemSearchText)).map((i, idx) => (
                  <div 
                    key={i.id} 
                    onClick={() => handleItemSelect(i)} 
                    className={`px-3 py-2 border-b border-slate-50 transition-colors flex justify-between items-center cursor-pointer ${
                      itemSelectedIndex === idx ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-black uppercase transition-colors ${itemSelectedIndex === idx ? 'text-white' : 'text-slate-800'}`}>{i.item_name}</span>
                      <span className={`text-[8px] font-bold tracking-widest uppercase transition-colors ${itemSelectedIndex === idx ? 'text-slate-300' : 'text-slate-400'}`}>₹{i.sale_price !== undefined ? i.sale_price : i.sale_rate} | STK: {i.current_stock || 0}</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-[9px] font-black transition-all border ${
                      itemSelectedIndex === idx ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>{i.item_code}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Summary Bar */}
          <div className="bg-slate-900 p-4 text-white flex justify-between items-center sm:flex-row flex-col gap-4 border-t border-slate-800">
            <div className="text-[9px] font-mono opacity-40 uppercase tracking-[0.2em] italic leading-relaxed">
              * LIVE GST CALCULATION ENABLED<br/>
              * ROUNDED TO NEAREST INDIAN RUPEE
            </div>
            <div className="flex gap-6 items-center">
              <div className="flex flex-col gap-1 pr-6 border-r border-slate-800">
                <div className="flex justify-between w-40 font-black text-[9px] uppercase tracking-widest text-slate-400"><span>BASE:</span><span className="font-mono text-white text-[11px]">{totalBaseAmount.toFixed(2)}</span></div>
                {taxType === 'CGST/SGST' ? (
                  <>
                    <div className="flex justify-between w-40 font-black text-[9px] uppercase tracking-widest text-slate-400"><span>CGST:</span><span className="font-mono text-white text-[11px]">{totalCgst.toFixed(2)}</span></div>
                    <div className="flex justify-between w-40 font-black text-[9px] uppercase tracking-widest text-slate-400"><span>SGST:</span><span className="font-mono text-white text-[11px]">{totalSgst.toFixed(2)}</span></div>
                  </>
                ) : (
                  <div className="flex justify-between w-40 font-black text-[9px] uppercase tracking-widest text-slate-400"><span>IGST:</span><span className="font-mono text-white text-[11px]">{totalIgst.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between w-40 border-t border-slate-800 pt-1 mt-1 font-black text-[9px] uppercase tracking-widest text-slate-400"><span>ROUND:</span><span className={`font-mono text-[11px] ${rounding >= 0 ? 'text-green-400' : 'text-red-400'}`}>{rounding.toFixed(2)}</span></div>
              </div>
              <div className="flex flex-col items-end pr-2 justify-center">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">NET PAYABLE ₹</span>
                <div className="bg-white text-black px-5 py-2 rounded-lg h-12 flex items-center font-black font-mono text-[24px] shadow-2xl tracking-tighter border-2 border-slate-100 relative">
                  ₹{netAmount.toFixed(2)}
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-slate-900 rounded-full animate-ping"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="bg-slate-200 p-3 border-t border-slate-300 flex justify-end gap-3 shadow-inner">
          <button onClick={onCancel} className="px-8 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 font-black rounded-lg text-xs uppercase tracking-widest h-9 transition-all active:scale-95 shadow-sm">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="px-12 py-2 bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white font-black rounded-lg text-xs uppercase tracking-widest h-9 transition-all active:scale-95 shadow-xl border border-black">{loading ? 'Processing...' : 'Confirm & Post Entry'}</button>
        </div>
      </div>
    </div>
  );
}
