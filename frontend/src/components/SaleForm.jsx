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

  // Input Refs for hotkeys
  const itemInputRef = useRef(null);

  useEffect(() => {
    loadCompanyAndData();
  }, []);

  const loadCompanyAndData = async () => {
    try {
      const compRes = await axios.get('/api/company');
      if (compRes.data.success && compRes.data.data) {
        const comp = compRes.data.data;
        setCompany(comp);

        // Fetch Members
        const memRes = await axios.get(`/api/members/company/${comp.id}`, { headers: { 'x-company-id': comp.id } });
        if (memRes.data.success) {
          setAvailableMembers(memRes.data.data || []);
        }

        // Fetch Items
        const itemRes = await axios.get(`/api/items/company/${comp.id}?active=true`, { headers: { 'x-company-id': comp.id } });
        if (itemRes.data.success) {
          setAvailableItems(itemRes.data.data || []);
        }

        // Auto-generate Bill No (fetch last and increment)
        const lastSale = await axios.get(`/api/sales/company/${comp.id}?limit=1`, { headers: { 'x-company-id': comp.id } });
        if (lastSale.data.success && lastSale.data.data.length > 0) {
           const lastNo = parseInt(lastSale.data.data[0].invoice_no) || 0;
           setBillNo(String(lastNo + 1).padStart(6, '0'));
        } else {
           setBillNo('000001');
        }
        
        // Default Dates (April 1 to March 31 of current FY)
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

    if (item && item.gst_rate) {
       const totalGstRate = parseFloat(item.gst_rate) || 0;
       if (taxType === 'CGST/SGST') {
          cgstPercent = totalGstRate / 2;
          sgstPercent = totalGstRate / 2;
          cgstAmt = amount * (cgstPercent / 100);
          sgstAmt = amount * (sgstPercent / 100);
       } else {
          igstPercent = totalGstRate;
          igstAmt = amount * (igstPercent / 100);
       }
    }

    const totalAmount = amount + cgstAmt + sgstAmt + igstAmt;

    return { amount, cgstPercent, cgstAmt, sgstPercent, sgstAmt, igstPercent, igstAmt, totalAmount };
  };

  const handleAddItem = (e) => {
    if (e) e.preventDefault();
    if (!currentItem || !currentQty || currentQty <= 0) return;

    const rate = currentRate !== '' ? parseFloat(currentRate) : parseFloat(currentItem.sale_rate || 0);
    const details = calculateRowDetails(currentItem, parseFloat(currentQty), rate);

    const newItem = {
      ...currentItem,
      quantity: parseFloat(currentQty),
      rate: rate,
      ...details
    };

    setSaleItems([...saleItems, newItem]);
    
    // Reset inputs
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
    setMemberSearchText(`${member.member_code || member.id} ${member.member_name}`);
    setShowMemberDropdown(false);
  };

  const handleItemSelect = (item) => {
    setCurrentItem(item);
    setItemSearchText(`${item.item_code} ${item.item_name}`);
    setCurrentRate(item.sale_rate || '');
    setShowItemDropdown(false);
  };

  // Recalculate totals
  const totalBaseAmount = saleItems.reduce((sum, row) => sum + row.amount, 0);
  const totalCgst = saleItems.reduce((sum, row) => sum + row.cgstAmt, 0);
  const totalSgst = saleItems.reduce((sum, row) => sum + row.sgstAmt, 0);
  const totalIgst = saleItems.reduce((sum, row) => sum + row.igstAmt, 0);
  const grossTotal = totalBaseAmount + totalCgst + totalSgst + totalIgst;
  const netAmount = Math.round(grossTotal);
  const rounding = netAmount - grossTotal;

  const handleSave = async () => {
    if (saleItems.length === 0) {
      setError("Please add at least one item.");
      return;
    }
    if (salesType === 'credit' && !selectedMember) {
      setError("Please select a Member for Credit Sales.");
      return;
    }

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
        notes: isChequePayment ? `Cheque Payment: Bank ${bankName}, Chq No ${chequeNo}` : '',
        discount_amount: 0,
        items: saleItems.map(row => ({
          item_id: row.id,
          quantity: row.quantity,
          sale_rate: row.rate
        }))
      };

      const res = await axios.post('/api/sales/with-gst', payload, {
        headers: { 'x-company-id': company.id, 'x-user-id': 1 }
      });

      if (res.data.success) {
        setSuccess("Sale Created Successfully! Invoice No: " + res.data.data.invoice_no);
        setTimeout(() => {
          if (onSubmit) onSubmit(res.data.data);
        }, 1500);
      }
    } catch (err) {
       setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save sale');
    } finally {
      setLoading(false);
    }
  };

  // Handle Hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Insert Key -> Focus Item input (New Entry)
      if (e.key === 'Insert') {
        if (itemInputRef.current) itemInputRef.current.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 overflow-hidden select-none">
      {/* Background shadow overlay */}
      <div className="absolute inset-0 bg-[#00000050]" onClick={onCancel}></div>

      {/* Main VB6 Window Form */}
      <div className="relative bg-[#C2D6ED] border-4 border-[#A3BAE0] shadow-2xl w-[95vw] max-w-6xl max-h-[95vh] flex flex-col font-sans mb-8">
        
        {/* Title Bar - Dark Blue */}
        <div className="bg-linear-to-r from-[#173F7A] to-[#255299] text-white px-3 py-1.5 flex justify-between items-center border-b border-[#0A1F45] cursor-move">
          <div className="font-bold text-[15px] tracking-wide flex items-center gap-2">
            <span className="bg-blue-300 w-3 h-3 block inline-block"></span>
            Sales
          </div>
          <button onClick={onCancel} className="hover:bg-red-500 text-white rounded p-0.5 border border-transparent hover:border-white transition-colors">
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        {error && <div className="bg-red-100 text-red-800 p-2 text-sm font-bold border-b border-red-300">{error}</div>}
        {success && <div className="bg-green-100 text-green-800 p-2 text-sm font-bold border-b border-green-300">{success}</div>}

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-2 relative">
          
          {/* TOP SECTION : Dates (Milk / Deduction) */}
          <div className="border border-[#9AAFD2] p-2 flex flex-col gap-2 pb-3 mb-1 bg-[#D3E1F1]">
            <div className="flex items-center gap-4 ml-8">
              <span className="font-bold text-[#1E3A8A] w-32 text-right text-[13px]">Milk Date :</span>
              <input type="date" value={milkDateFrom} onChange={(e)=>setMilkDateFrom(e.target.value)} className="border border-[#7A93BE] px-1 py-0.5 text-[13px] bg-white w-32 outline-none shadow-inner" />
              <span className="font-bold text-[#1E3A8A] text-[13px]">To</span>
              <input type="date" value={milkDateTo} onChange={(e)=>setMilkDateTo(e.target.value)} className="border border-[#7A93BE] px-1 py-0.5 text-[13px] bg-white w-32 outline-none shadow-inner" />
            </div>
            <div className="flex items-center gap-4 ml-8">
              <span className="font-bold text-[#1E3A8A] w-32 text-right text-[13px]">Deduction Date :</span>
              <input type="date" value={deductionDateFrom} onChange={(e)=>setDeductionDateFrom(e.target.value)} className="border border-[#7A93BE] px-1 py-0.5 text-[13px] bg-white w-32 outline-none shadow-inner" />
              <span className="font-bold text-[#1E3A8A] text-[13px]">To</span>
              <input type="date" value={deductionDateTo} onChange={(e)=>setDeductionDateTo(e.target.value)} className="border border-[#7A93BE] px-1 py-0.5 text-[13px] bg-white w-32 outline-none shadow-inner" />
            </div>
          </div>

          <div className="border-t border-[#FFFFFF] w-full mt-[-10px] mb-2 opacity-60"></div>

          {/* SECOND SECTION : Bill Details */}
          <div className="flex flex-wrap gap-x-6 gap-y-3 px-2">
            
            {/* Bill No & Date */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1E3A8A] w-20 text-right text-[13px]">Bill No :</span>
              <input type="text" value={billNo} onChange={(e) => setBillNo(e.target.value)} className="border border-[#7A93BE] px-2 py-0.5 text-[13px] bg-[#F4F8FC] w-28 outline-none shadow-inner text-center font-bold" />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1E3A8A] text-[13px]">Date :</span>
              <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="border border-[#7A93BE] px-2 py-0.5 text-[13px] bg-white w-36 outline-none shadow-inner" />
            </div>

            {/* Sales Type Radios */}
            <div className="flex items-center gap-4 ml-4">
              <span className="font-bold text-[#1E3A8A] text-[13px]">Sales Type :</span>
              <label className="flex items-center gap-1 text-[13px] font-semibold text-[#1E3A8A] cursor-pointer">
                <input type="radio" name="salesType" checked={salesType === 'credit'} onChange={() => setSalesType('credit')} className="w-4 h-4" /> Credit Sales
              </label>
              <label className="flex items-center gap-1 text-[13px] font-semibold text-[#1E3A8A] cursor-pointer">
                <input type="radio" name="salesType" checked={salesType === 'cash'} onChange={() => setSalesType('cash')} className="w-4 h-4 border-[#7A93BE]" /> Cash Sales
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 px-2 mt-1">
            {/* Member Dropdown */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1E3A8A] w-20 text-right text-[13px]">Member :</span>
              
              <div className="relative flex items-center gap-1">
                 <input 
                   type="text" 
                   value={memberSearchText} 
                   onChange={(e) => {
                     setMemberSearchText(e.target.value);
                     setShowMemberDropdown(true);
                   }}
                   onFocus={() => setShowMemberDropdown(true)}
                   className="border border-[#7A93BE] px-2 py-1 text-[13px] bg-white w-64 outline-none shadow-inner uppercase"
                   placeholder="Search Member..."
                 />
                 
                 {showMemberDropdown && (
                    <div className="absolute top-full left-0 bg-white border border-[#7A93BE] shadow-xl w-[350px] max-h-48 overflow-y-auto z-40">
                       <div className="p-1 border-b bg-[#F0F5FA] flex justify-end"><X size={14} className="cursor-pointer hover:text-red-600" onClick={() => setShowMemberDropdown(false)}/></div>
                       {availableMembers.filter(m => String(m.member_name).toLowerCase().includes(memberSearchText.toLowerCase()) || String(m.member_code).includes(memberSearchText)).map((m) => (
                         <div key={m.id} onClick={() => handleMemberSelect(m)} className="px-2 py-1 hover:bg-[#1E3A8A] hover:text-white cursor-pointer text-[13px] font-semibold flex justify-between">
                            <span>{m.member_name}</span>
                            <span className="text-[11px] opacity-70">[{m.member_code || m.id}]</span>
                         </div>
                       ))}
                    </div>
                 )}
              </div>
            </div>

            {/* Tax Dropdown */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="font-bold text-[#1E3A8A] text-[13px]">Type Of Tax :</span>
              <select value={taxType} onChange={(e) => setTaxType(e.target.value)} className="border border-[#7A93BE] px-2 py-0.5 text-[13px] bg-[#E8F0F8] w-48 outline-none shadow-inner font-bold text-[#1E3A8A]">
                <option value="CGST/SGST">CGST/SGST</option>
                <option value="IGST">IGST</option>
              </select>
            </div>
          </div>

          {/* Cheque Payment Row */}
          <div className="flex flex-wrap gap-x-4 gap-y-3 px-2 mt-2 items-center">
            <label className="flex items-center gap-2 ml-24 cursor-pointer">
              <input type="checkbox" checked={isChequePayment} onChange={(e) => setIsChequePayment(e.target.checked)} className="w-4 h-4 border-[#7A93BE]" />
              <span className="font-bold text-[#1E3A8A] text-[13px]">Is Cheque Payment ?</span>
            </label>
          </div>
          
          {isChequePayment && (
            <div className="flex flex-wrap gap-x-4 gap-y-3 px-2 mt-1 items-center bg-[#D3E1F1] p-1 border border-[#9AAFD2] ml-2 w-fit">
              <div className="flex items-center gap-2 text-[13px]">
                <span className="font-bold text-[#1E3A8A]">Bank Name :</span>
                <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} className="border border-[#7A93BE] px-2 py-0.5 w-64 outline-none shadow-inner bg-white uppercase" />
              </div>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="font-bold text-[#1E3A8A]">Cheque No :</span>
                <input type="text" value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} className="border border-[#7A93BE] px-2 py-0.5 w-40 outline-none shadow-inner bg-white font-mono" />
              </div>
            </div>
          )}

          {/* DATA GRID TABLE */}
          <div className="mt-4 border border-[#7A93BE] bg-white h-[280px] overflow-y-auto flex flex-col shadow-inner mx-1">
            <table className="w-full text-[12px] border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-[#A6C8FF] text-[#0A2647] font-extrabold text-sm border-b-2 border-[#7A93BE] sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="border-r border-[#7A93BE] p-1 w-8 text-center bg-[#A6C8FF]">No</th>
                  <th className="border-r border-[#7A93BE] p-1 w-64 text-left px-2 bg-[#A6C8FF]">Item</th>
                  <th className="border-r border-[#7A93BE] p-1 w-16 text-right px-2 bg-[#A6C8FF]">Qty</th>
                  <th className="border-r border-[#7A93BE] p-1 w-20 text-right px-2 bg-[#A6C8FF]">Rate</th>
                  <th className="border-r border-[#7A93BE] p-1 w-24 text-right px-2 bg-[#A6C8FF]">Amount</th>
                  <th className="border-r border-[#7A93BE] p-1 w-16 text-right px-1 bg-[#A6C8FF]">{taxType === 'IGST' ? 'IGST %' : 'CGST %'}</th>
                  <th className="border-r border-[#7A93BE] p-1 w-20 text-right px-1 bg-[#A6C8FF]">{taxType === 'IGST' ? 'IGST Amt' : 'CGST Amt'}</th>
                  <th className="border-r border-[#7A93BE] p-1 w-16 text-right px-1 bg-[#A6C8FF]">{taxType === 'IGST' ? '' : 'SGST %'}</th>
                  <th className="border-r border-[#7A93BE] p-1 w-20 text-right px-1 bg-[#A6C8FF]">{taxType === 'IGST' ? '' : 'SGST Amt'}</th>
                  <th className="border-r border-[#7A93BE] p-1 w-16 text-right px-1 bg-[#A6C8FF]">CESS %</th>
                  <th className="border-r border-[#7A93BE] p-1 w-16 text-right px-1 bg-[#A6C8FF]">CESS Amt</th>
                  <th className="p-1 w-24 text-right px-2 bg-[#A6C8FF]">Total Amount</th>
                  <th className="p-1 w-10 text-center bg-[#A6C8FF]">X</th>
                </tr>
              </thead>
              <tbody className="bg-[#fbfcff]">
                {saleItems.map((row, idx) => (
                  <tr key={idx} className="border-b border-[#E0E8F5] hover:bg-[#FFFFE0] cursor-pointer">
                    <td className="border-r border-[#E0E8F5] p-1 text-center font-bold text-gray-600">{idx + 1}</td>
                    <td className="border-r border-[#E0E8F5] p-1 px-2 whitespace-nowrap overflow-hidden text-ellipsis font-bold">
                       {row.item_code} {row.item_name}
                    </td>
                    <td className="border-r border-[#E0E8F5] p-1 px-2 text-right font-mono">{row.quantity.toFixed(3)}</td>
                    <td className="border-r border-[#E0E8F5] p-1 px-2 text-right font-mono">{row.rate.toFixed(2)}</td>
                    <td className="border-r border-[#E0E8F5] p-1 px-2 text-right font-mono font-bold">{row.amount.toFixed(2)}</td>
                    
                    <td className="border-r border-[#E0E8F5] p-1 px-2 text-right font-mono text-gray-600">{taxType === 'IGST' ? row.igstPercent.toFixed(2) : row.cgstPercent.toFixed(2)}</td>
                    <td className="border-r border-[#E0E8F5] p-1 px-2 text-right font-mono">{taxType === 'IGST' ? row.igstAmt.toFixed(2) : row.cgstAmt.toFixed(2)}</td>
                    
                    <td className="border-r border-[#E0E8F5] p-1 px-2 text-right font-mono text-gray-600">{taxType === 'IGST' ? '' : row.sgstPercent.toFixed(2)}</td>
                    <td className="border-r border-[#E0E8F5] p-1 px-2 text-right font-mono">{taxType === 'IGST' ? '' : row.sgstAmt.toFixed(2)}</td>
                    
                    <td className="border-r border-[#E0E8F5] p-1 px-2 text-right font-mono text-gray-600">0.00</td>
                    <td className="border-r border-[#E0E8F5] p-1 px-2 text-right font-mono">0.00</td>
                    
                    <td className="p-1 px-2 text-right font-mono font-bold text-blue-900">{row.totalAmount.toFixed(2)}</td>
                    <td className="p-1 px-2 text-center text-red-500 font-bold hover:bg-red-200 cursor-pointer" onClick={() => handleRemoveItem(idx)}>X</td>
                  </tr>
                ))}
                
                {/* Input Row for New Item */}
                <tr className="bg-[#E4EFFF] border-b-2 border-[#7A93BE] sticky bottom-0">
                   <td className="border-r border-[#A3C2EA] p-1 text-center text-[10px] text-gray-500 font-bold">*</td>
                   <td className="border-r border-[#A3C2EA] p-0 relative">
                      <input 
                        ref={itemInputRef}
                        type="text" 
                        value={itemSearchText}
                        onChange={(e) => {
                          setItemSearchText(e.target.value);
                          setShowItemDropdown(true);
                        }}
                        onFocus={() => setShowItemDropdown(true)}
                        placeholder="Search Item..."
                        className="w-full h-full min-h-[22px] px-2 outline-none border-none text-[12px] bg-white font-bold uppercase text-[#1E3A8A]"
                      />
                      {showItemDropdown && (
                        <div className="absolute bottom-full left-0 bg-white border-2 border-[#1E3A8A] shadow-2xl w-[400px] max-h-64 overflow-y-auto flex flex-col z-50">
                           <div className="bg-[#1E3A8A] text-white px-2 py-0.5 text-xs font-bold flex justify-between">
                             <span>Select Item (Up/Down + Enter)</span>
                             <X size={14} className="cursor-pointer" onClick={()=>setShowItemDropdown(false)}/>
                           </div>
                           {availableItems.filter(i => String(i.item_name).toLowerCase().includes(itemSearchText.toLowerCase()) || String(i.item_code).toLowerCase().includes(itemSearchText.toLowerCase()) || (i.barcode && i.barcode.includes(itemSearchText))).map(i => (
                             <div key={i.id} onClick={() => handleItemSelect(i)} className="px-2 py-1.5 border-b border-gray-100 hover:bg-[#A6C8FF] cursor-pointer text-xs font-bold text-[#1E3A8A] flex justify-between">
                               <span>{i.item_name}</span>
                               <span className="text-gray-500 text-[10px] bg-gray-100 px-1 rounded border border-gray-300">₹{i.sale_rate} | Stock:{i.current_stock}</span>
                             </div>
                           ))}
                        </div>
                      )}
                   </td>
                   <td className="border-r border-[#A3C2EA] p-0">
                      <input 
                        type="number" 
                        value={currentQty} 
                        onChange={(e) => setCurrentQty(e.target.value)} 
                        onKeyDown={(e) => { if(e.key==='Enter') handleAddItem(); }}
                        placeholder="Qty" 
                        className="w-full h-full min-h-[22px] px-1 text-right outline-none bg-yellow-50 font-bold font-mono text-[12px]" 
                      />
                   </td>
                   <td className="border-r border-[#A3C2EA] p-0">
                      <input 
                        type="number" 
                        value={currentRate} 
                        onChange={(e) => setCurrentRate(e.target.value)} 
                        onKeyDown={(e) => { if(e.key==='Enter') handleAddItem(); }}
                        className="w-full h-full min-h-[22px] px-1 text-right outline-none bg-yellow-50 font-bold font-mono text-[12px]" 
                      />
                   </td>
                   <td colSpan="8" className="bg-[#E4EFFF] p-1 text-[11px] text-indigo-800 font-bold text-center border-r border-[#A3C2EA]">
                       [ Press Enter on Qty or Rate to Add to Grid ]
                   </td>
                   <td className="bg-[#E4EFFF]">
                      <button onClick={handleAddItem} className="w-full h-full px-1 bg-[#1E3A8A] hover:bg-green-600 text-white font-bold text-[10px]">Add</button>
                   </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TOTALS BOTTOM SECTION */}
          <div className="mt-1 flex justify-between items-start px-1 font-bold">
             
             {/* Left Shortcuts */}
             <div className="flex flex-col text-[12px] text-[#1E3A8A] gap-1 mt-2 font-mono">
                <p>1. New Entry 'Insert'</p>
                <p>2. Edit 'Enter' <span className="text-xs text-gray-500 font-sans italic ml-2">(Future update)</span></p>
                <p>3. Delete 'Delete' <span className="text-xs text-gray-500 font-sans italic ml-1">(Click X in grid)</span></p>
             </div>

             {/* Right Calculation Map matching column widths! */}
             <div className="flex flex-col items-end gap-1">
               
               <div className="flex bg-[#A6C8FF] border border-[#7A93BE] shadow-inner font-mono text-sm mr-12 h-6 items-center">
                  <div className="w-[100px] text-right px-2 border-r border-[#7A93BE] h-full flex items-center justify-end text-[#1E3A8A] font-bold bg-[#E4EFFF]">{totalBaseAmount.toFixed(2)}</div>
                  <div className="w-[110px] text-right px-2 border-r border-[#7A93BE] h-full flex items-center justify-end text-[#1E3A8A] font-bold">{taxType === 'IGST' ? totalIgst.toFixed(2) : totalCgst.toFixed(2)}</div>
                  <div className="w-[110px] text-right px-2 border-r border-[#7A93BE] h-full flex items-center justify-end text-[#1E3A8A] font-bold">{taxType === 'IGST' ? '0.00' : totalSgst.toFixed(2)}</div>
                  <div className="w-[110px] text-right px-2 h-full flex items-center justify-end text-[#1E3A8A] font-bold">0.00</div>
               </div>

               <div className="flex items-center gap-2 mt-2">
                 <span className="text-[13px] text-[#2c4b72] tracking-wide">Net Amount :</span>
                 <input type="text" readOnly value={netAmount.toFixed(2)} className="border border-[#7A93BE] px-2 py-0.5 text-[15px] bg-[#93B4E0] w-28 text-right font-mono text-[#0A2647] font-extrabold shadow-inner" />
               </div>

               <div className="flex items-center gap-2 mb-1">
                 <span className="text-[13px] text-[#2c4b72] tracking-wide">Rounding :</span>
                 <input type="text" readOnly value={rounding.toFixed(2)} className="border border-[#7A93BE] px-2 py-0.5 text-[13px] bg-[#D3E1F1] w-28 text-right font-mono text-[#0A2647] font-bold shadow-inner" />
               </div>

             </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-auto border-t border-[#9AAFD2] pt-3 pb-1 px-4 mb-2">
             <button onClick={handleSave} disabled={loading} className="px-8 py-1.5 bg-[#E4EFFF] hover:bg-[#D3E1F1] active:bg-[#B9D1EA] border border-[#7A93BE] text-[#1E3A8A] font-bold shadow-sm flex items-center gap-2 text-[14px]">
               {loading ? 'Saving...' : 'Ok'}
             </button>
             <button onClick={onCancel} className="px-8 py-1.5 bg-[#E4EFFF] hover:bg-[#D3E1F1] active:bg-[#B9D1EA] border border-[#7A93BE] text-[#1E3A8A] font-bold shadow-sm flex items-center gap-2 text-[14px]">
               Cancel
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}
