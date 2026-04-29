import React, { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import axios from 'axios';

export default function SaleForm({ onSubmit, onCancel }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Primary Form State
  const [billNo, setBillNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesType, setSalesType] = useState('credit'); // credit, cash
  const [memberId, setMemberId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [gadiNumber, setGadiNumber] = useState('');

  // Deduction State
  const [brokeragePercent, setBrokeragePercent] = useState('');
  const [labourCharge, setLabourCharge] = useState('');

  // Member Search State
  const [availableMembers, setAvailableMembers] = useState([]);
  const [memberSearchText, setMemberSearchText] = useState('');
  const [memberNameSearch, setMemberNameSearch] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Items State
  const [availableItems, setAvailableItems] = useState([]);
  const [saleItems, setSaleItems] = useState([]);

  // Current Input Row State
  const [currentItem, setCurrentItem] = useState(null);
  const [currentWeight, setCurrentWeight] = useState('');
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

  useEffect(() => {
    if (showItemDropdown && dropdownListRef.current) {
      const selectedEl = dropdownListRef.current.children[itemSelectedIndex + 1];
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [itemSelectedIndex, showItemDropdown]);

  useEffect(() => {
    if (memberSearchText) {
      const match = availableMembers.find(m => String(m.id) === memberSearchText);
      if (match) {
        setSelectedMember(match);
        setMemberId(match.id);
        setMemberNameSearch(match.account_name);
        setShowMemberDropdown(false);
      } else {
        if (selectedMember && String(selectedMember.id) !== memberSearchText) {
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

  useEffect(() => {
    if (company?.id) {
      fetchNextBillNo();
    }
  }, [salesType, company]);

  const fetchNextBillNo = async () => {
    if (!company?.id) return;
    try {
      // We fetch last sale for this specific type to avoid conflicts
      const res = await axios.get(`/api/sales?type=${salesType}`, { headers: { 'x-company-id': company.id } });
      if (res.data.success && res.data.data && res.data.data.length > 0) {
        // Filter for matching prefix to be safe
        const prefix = salesType === 'cash' ? 'CS' : 'CR';
        const typedSales = res.data.data.filter(s => String(s.invoice_no).startsWith(prefix));
        
        if (typedSales.length > 0) {
            const lastInv = typedSales[typedSales.length - 1].invoice_no;
            const matches = String(lastInv).match(/(\d+)/);
            const lastNo = matches ? parseInt(matches[0]) : 0;
            setBillNo(`${prefix}${String(lastNo + 1).padStart(6, '0')}`);
        } else {
            setBillNo(`${salesType === 'cash' ? 'CS' : 'CR'}000001`);
        }
      } else {
        setBillNo(`${salesType === 'cash' ? 'CS' : 'CR'}000001`);
      }
    } catch (err) {
      setBillNo(`${salesType === 'cash' ? 'CS' : 'CR'}000001`);
    }
  };

  const loadCompanyAndData = async () => {
    try {
      const compRes = await axios.get('/api/company');
      if (compRes.data.success && compRes.data.data) {
        const comp = compRes.data.data;
        setCompany(comp);
        const accRes = await axios.get(`/api/accounts/company/${comp.id}`, { headers: { 'x-company-id': comp.id } });
        if (accRes.data.success) {
          const vendorList = (accRes.data.data || []).filter(acc => acc.account_type === 'vendor');
          setAvailableMembers(vendorList);
        }
        const itemRes = await axios.get(`/api/items/company/${comp.id}?active=true`, { headers: { 'x-company-id': comp.id } });
        if (itemRes.data.success) {
          setAvailableItems(itemRes.data.data || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const calculateRowAmount = (weight, rate) => {
    if (!weight || !rate) return 0;
    // Formula: (weight * rate / 140) * 100
    return (parseFloat(weight) * parseFloat(rate) / 140) * 100;
  };

  const handleAddItem = (e) => {
    if (e) e.preventDefault();
    if (!currentItem || !currentWeight || currentWeight <= 0) return;
    const rate = currentRate !== '' ? parseFloat(currentRate) : 0;
    const amount = calculateRowAmount(currentWeight, rate);
    const newItem = {
      ...currentItem,
      weight: parseFloat(currentWeight),
      quantity: parseFloat(currentQty) || 0,
      rate: rate,
      amount: amount,
      totalAmount: amount // No GST
    };
    setSaleItems([...saleItems, newItem]);
    setCurrentItem(null); setItemSearchText(''); setCurrentWeight(''); setCurrentQty(''); setCurrentRate('');
    if (itemInputRef.current) itemInputRef.current.focus();
  };

  const handleRemoveItem = (index) => {
    const newItems = [...saleItems];
    newItems.splice(index, 1);
    setSaleItems(newItems);
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member); setMemberId(member.id); setMemberSearchText(String(member.id)); setMemberNameSearch(member.account_name); setShowMemberDropdown(false);
  };

  const handleItemSelect = (item) => {
    setCurrentItem(item);
    setItemSearchText(`${item.item_code} ${item.item_name}`);
    const defaultRate = item.sale_rate || item.sale_price || '';
    setCurrentRate(defaultRate);
    setShowItemDropdown(false);
    setItemSelectedIndex(0);
  };

  const handleItemSearchKeyDown = (e) => {
    const filteredItems = availableItems.filter(i => String(i.item_name).toLowerCase().includes(itemSearchText.toLowerCase()) || String(i.item_code).includes(itemSearchText));
    if (e.key === 'ArrowDown') { e.preventDefault(); setItemSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : prev)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setItemSelectedIndex(prev => (prev > 0 ? prev - 1 : 0)); }
    else if (e.key === 'Enter') { if (showItemDropdown && filteredItems.length > 0) { e.preventDefault(); handleItemSelect(filteredItems[itemSelectedIndex]); } }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setShowItemDropdown(false); }
  };

  const liveRate = currentRate !== '' ? parseFloat(currentRate) : (currentItem?.sale_rate || currentItem?.sale_price || 0);
  const liveAmount = calculateRowAmount(currentWeight || 0, liveRate);

  const totalBaseAmount = saleItems.reduce((sum, row) => sum + row.amount, 0) + liveAmount;
  const brokerageAmt = totalBaseAmount * ((parseFloat(brokeragePercent) || 0) / 100);
  const labourAmt = parseFloat(labourCharge) || 0;
  const netAmount = Math.round(totalBaseAmount - brokerageAmt - labourAmt);

  const handleSave = async () => {
    let finalItems = [...saleItems];
    
    // Auto-include the live row if it's valid but not yet added to the list
    if (currentItem && currentWeight && parseFloat(currentWeight) > 0) {
      finalItems.push({
        id: currentItem.id,
        item_name: currentItem.item_name,
        weight: parseFloat(currentWeight),
        quantity: parseFloat(currentQty) || 0,
        rate: liveRate,
        amount: liveAmount
      });
    }

    if (finalItems.length === 0) { setError("Please add at least one item."); return; }
    if (salesType === 'credit' && !selectedMember) { setError("Please select a Vendor."); return; }
    setLoading(true); setError(null);
    try {
      const payload = {
        customer_account_id: selectedMember ? selectedMember.id : null,
        invoice_no: billNo,
        invoice_date: invoiceDate,
        payment_type: salesType,
        driver_name: driverName,
        mobile_number: mobileNumber,
        gadi_number: gadiNumber,
        brokerage_percent: parseFloat(brokeragePercent) || 0,
        brokerage_amount: brokerageAmt,
        labour_charge: labourAmt,
        items: finalItems.map(row => ({
          item_id: row.id,
          quantity: row.quantity,
          weight: row.weight,
          sale_rate: row.rate,
          amount: row.amount
        }))
      };
      // We'll update the backend route to handle these new fields
      const res = await axios.post('/api/sales/weight-based', payload, { headers: { 'x-company-id': company.id, 'x-user-id': 1 } });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-2 sm:p-4 backdrop-blur-md">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-lg shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] flex flex-col border border-slate-200 overflow-hidden font-sans">
        <div className="flex justify-between items-center bg-slate-900 text-white px-6 py-3">
          <div className="flex items-center gap-3 font-black text-xs uppercase tracking-widest">
            <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse"></div>
            Sale Entry Manifest (Weight-Based)
          </div>
          <button onClick={onCancel} className="hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg p-1.5 transition-all active:scale-90">
            <X size={18} strokeWidth={3} />
          </button>
        </div>
        {error && <div className="bg-red-500/90 text-white text-[10px] font-black px-6 py-2 animate-pulse uppercase tracking-widest text-center">{error}</div>}
        {success && <div className="bg-emerald-600 text-white text-[10px] font-black px-6 py-2 uppercase tracking-widest border-l-4 border-l-emerald-300 text-center">{success}</div>}
        <div className="flex-1 overflow-auto bg-[#F8FAFC] flex flex-col">
          <div className="bg-white p-5 border-b border-slate-100 flex flex-col gap-4 shadow-sm">
            <div className="flex flex-wrap gap-x-8 gap-y-4 px-2 items-center">
              <div className="flex items-center gap-3 relative z-30" ref={memberDropdownRef}>
                <span className="font-black text-slate-600 uppercase tracking-widest text-[10px] w-14 text-right">Vendor :</span>
                <input type="text" value={memberSearchText} onChange={e => { setMemberSearchText(e.target.value); setShowMemberDropdown(true); }} onFocus={() => setShowMemberDropdown(true)} className="border border-slate-200 px-4 py-2 text-[13px] bg-white w-24 outline-none rounded-lg font-black text-center uppercase shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="CODE" />
                <input type="text" value={memberNameSearch} onChange={e => { setMemberNameSearch(e.target.value); setShowMemberDropdown(true); if (selectedMember && selectedMember.account_name !== e.target.value) { setSelectedMember(null); setMemberId(''); } }} onFocus={() => setShowMemberDropdown(true)} className="border border-slate-200 px-4 py-2 text-[13px] bg-white w-80 outline-none rounded-lg font-black text-slate-900 uppercase shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="NAME OR SEARCH..." />
                {showMemberDropdown && (
                  <div className="absolute top-full left-16 bg-white border border-slate-200 shadow-lg w-[400px] max-h-64 overflow-y-auto z-40 rounded-lg mt-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 border-b bg-slate-900 flex justify-between items-center sticky top-0 rounded-t-2xl">
                      <span className="text-white text-[10px] font-black uppercase tracking-widest px-2">Vendor Nodes</span>
                      <X size={16} className="text-slate-400 cursor-pointer hover:text-red-500 rounded p-0.5 transition-colors" onClick={() => setShowMemberDropdown(false)} />
                    </div>
                    {availableMembers.filter(m => {
                      const idMatch = memberSearchText ? String(m.id).includes(memberSearchText) : true;
                      const nameMatch = memberNameSearch ? String(m.account_name).toLowerCase().includes(memberNameSearch.toLowerCase()) : true;
                      return idMatch && nameMatch;
                    }).map(m => (
                      <div key={m.id} onClick={() => handleMemberSelect(m)} className="px-4 py-3 hover:bg-blue-600 hover:text-white cursor-pointer text-[13px] font-black border-b border-slate-100 last:border-0 transition-colors uppercase tracking-tight flex justify-between items-center group">
                        <span>{m.account_name}</span>
                        <span className="text-[10px] text-slate-400 group-hover:text-slate-300">#{m.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-auto text-[11px] bg-white border border-slate-200 p-1.5 rounded-lg shadow-sm font-black uppercase tracking-widest h-10">
                <button onClick={() => setSalesType('cash')} className={`px-5 py-1.5 rounded-lg transition-all h-full ${salesType === 'cash' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>Cash</button>
                <button onClick={() => setSalesType('credit')} className={`px-5 py-1.5 rounded-lg transition-all h-full ${salesType === 'credit' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>Credit</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-4 px-2">
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-600 uppercase tracking-widest text-[10px] w-14 text-right">Bill No :</span>
                <input type="text" value={billNo} onChange={e => setBillNo(e.target.value)} className="border border-slate-200 px-4 py-1.5 text-[13px] bg-blue-600 text-white w-32 outline-none rounded-lg font-mono font-black text-center shadow-sm focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-600 uppercase tracking-widest text-[10px]">Date :</span>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="border border-slate-200 px-4 py-2 text-[12px] bg-white w-40 outline-none rounded-lg font-bold shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-600 uppercase tracking-widest text-[10px]">Vehicle # :</span>
                <input type="text" value={gadiNumber} onChange={e => setGadiNumber(e.target.value)} className="border border-slate-200 px-4 py-1.5 text-[13px] bg-white w-36 outline-none rounded-lg font-black uppercase shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="GADI NO" />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-4 px-2">
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-600 uppercase tracking-widest text-[10px] w-14 text-right">Driver :</span>
                <input type="text" value={driverName} onChange={e => setDriverName(e.target.value)} className="border border-slate-200 px-4 py-1.5 text-[13px] bg-white w-44 outline-none rounded-lg font-black uppercase shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="DRIVER NAME" />
              </div>
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-600 uppercase tracking-widest text-[10px]">Mobile :</span>
                <input type="text" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} className="border border-slate-200 px-4 py-1.5 text-[13px] bg-white w-40 outline-none rounded-lg font-black uppercase shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="MOBILE NO" />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-white min-h-[350px]">
            <table className="w-full text-xs border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest border-b border-slate-800 sticky top-0 z-10 shadow-lg">
                <tr>
                  <th className="p-2 w-10">#</th><th className="p-2 w-72 text-left">Item Description</th><th className="p-2 w-20 text-right">Qty</th><th className="p-2 w-20 text-right">Weight</th><th className="p-2 w-24 text-right">Rate</th><th className="p-2 w-32 text-right">Amount</th><th className="p-2 w-10 text-center">X</th>
                </tr>
              </thead>
              <tbody>
                {saleItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 group font-black text-slate-800 transition-colors">
                    <td className="p-2 text-center text-slate-300 text-[9px]">{idx + 1}</td>
                    <td className="p-2 whitespace-nowrap overflow-hidden text-ellipsis text-xs font-black">{item.item_code} {item.item_name}</td>
                    <td className="p-2 text-right font-mono text-slate-500">{item.quantity}</td>
                    <td className="p-2 text-right font-mono italic text-slate-900">{item.weight.toFixed(3)}</td>
                    <td className="p-2 text-right font-mono text-slate-500 font-bold">{item.rate.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono bg-slate-50 text-slate-900 font-black italic">₹{item.amount.toFixed(2)}</td>
                    <td className="p-2 text-center text-slate-400 hover:text-red-500 cursor-pointer transition-all" onClick={() => handleRemoveItem(idx)}><X size={14} strokeWidth={3} /></td>
                  </tr>
                ))}
                <tr className="bg-blue-50/30 border-t-2 border-blue-200 sticky bottom-0 z-20 shadow-[0_-5px_15px_rgba(37,99,235,0.05)] h-11">
                  <td className="p-2 bg-slate-100 text-center text-[8px] font-black uppercase text-slate-600 italic w-10">NEW</td>
                  <td className="p-0 relative w-72">
                    <input ref={itemInputRef} type="text" value={itemSearchText} onChange={e => { setItemSearchText(e.target.value); setShowItemDropdown(true); setItemSelectedIndex(0); }} onFocus={() => setShowItemDropdown(true)} onKeyDown={handleItemSearchKeyDown} className="w-full h-full px-4 outline-none border-none text-xs bg-white font-black uppercase text-black placeholder:text-slate-400" placeholder="SEARCH PRODUCT..." />
                  </td>
                  <td className="p-0 bg-blue-100/20 w-20">
                    <input
                      type="number"
                      value={currentQty}
                      onChange={e => setCurrentQty(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddItem(e)}
                      className="w-full h-full px-2 text-right outline-none bg-transparent font-black font-mono text-xs focus:bg-white transition-colors"
                      placeholder="0"
                    />
                  </td>
                  <td className="p-0 bg-blue-100/20 w-20">
                    <input
                      type="number"
                      value={currentWeight}
                      onChange={e => setCurrentWeight(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddItem(e)}
                      className="w-full h-full px-2 text-right outline-none bg-transparent font-black font-mono text-xs focus:bg-white transition-colors"
                      placeholder="0.000"
                    />
                  </td>
                  <td className="p-0 bg-blue-100/20 w-24">
                    <input
                      type="number"
                      value={currentRate}
                      onChange={e => setCurrentRate(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddItem(e)}
                      className="w-full h-full px-2 text-right outline-none bg-transparent font-black font-mono text-xs focus:bg-white transition-colors"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="p-2 text-right font-black font-mono bg-blue-600 text-white text-[11px] w-32">₹{liveAmount.toFixed(2)}</td>
                  <td className="bg-blue-600 hover:bg-blue-700 transition-colors text-white">
                    <button onClick={handleAddItem} className="w-full h-full text-[10px] font-black uppercase transition-all active:scale-95">Add</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {showItemDropdown && (
            <div ref={itemDropdownRef} style={{ position: 'fixed', top: `${dropdownPos.top}px`, left: dropdownPos.left, width: dropdownPos.width }} className="bg-white border border-slate-200 shadow-lg max-h-72 overflow-y-auto z-[9999] rounded-lg animate-in slide-in-from-top-1 duration-200">
              <div ref={dropdownListRef}>
                <div className="bg-slate-900 text-white p-3 text-[9px] font-black uppercase tracking-widest flex justify-between items-center sticky top-0 rounded-t-2xl">
                  <span>Select Item</span>
                  <X size={14} className="cursor-pointer text-slate-400 hover:text-red-500 rounded p-0.5 transition-colors" onClick={() => setShowItemDropdown(false)} />
                </div>
                {availableItems.filter(i => String(i.item_name).toLowerCase().includes(itemSearchText.toLowerCase()) || String(i.item_code).includes(itemSearchText)).map((i, idx) => (
                  <div key={i.id} onClick={() => handleItemSelect(i)} className={`px-4 py-3 border-b border-slate-100 transition-colors flex justify-between items-center cursor-pointer ${itemSelectedIndex === idx ? 'bg-blue-600 text-white' : 'hover:bg-slate-50 text-slate-800'}`}>
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-black uppercase transition-colors ${itemSelectedIndex === idx ? 'text-white' : 'text-slate-800'}`}>{i.item_name}</span>
                      <span className={`text-[8px] font-bold tracking-widest uppercase transition-colors ${itemSelectedIndex === idx ? 'text-blue-100' : 'text-slate-400'}`}>₹{i.sale_rate || i.sale_price} | STK: {i.current_stock || 0}</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-[9px] font-black transition-all border ${itemSelectedIndex === idx ? 'bg-blue-600 text-white border-blue-500' : 'bg-blue-50 text-black border-blue-200'}`}>{i.item_code}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-blue-50 p-4 text-slate-900 flex justify-between items-center sm:flex-row flex-col gap-4 border-t border-blue-100">
            <div className="text-[9px] font-mono text-slate-500 opacity-70 uppercase tracking-[0.2em] italic leading-relaxed">
              * CALCULATION: (WEIGHT * RATE) / 140<br />* ROUNDED TO NEAREST RUPEE
            </div>
            <div className="flex gap-6 items-center">
              <div className="flex flex-col gap-1 pr-6 border-r border-blue-200">
                <div className="flex justify-between w-52 font-black text-[9px] uppercase tracking-widest text-blue-700"><span>GROSS TOTAL:</span><span className="font-mono text-slate-900 text-[11px]">{totalBaseAmount.toFixed(2)}</span></div>
                <div className="flex justify-between w-52 items-center gap-2 mt-1">
                  <span className="font-black text-[9px] uppercase tracking-widest text-rose-600">BROKERAGE % :</span>
                  <input type="number" value={brokeragePercent} onChange={e => setBrokeragePercent(e.target.value)} className="w-16 bg-white border border-slate-200 rounded px-2 py-0.5 text-right font-mono text-[10px] outline-none focus:border-rose-400" placeholder="0.00" />
                  <span className="font-mono text-rose-600 text-[10px] min-w-[50px] text-right">-{brokerageAmt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-52 items-center gap-2 mt-1">
                  <span className="font-black text-[9px] uppercase tracking-widest text-rose-600">LABOUR CHG :</span>
                  <input type="number" value={labourCharge} onChange={e => setLabourCharge(e.target.value)} className="w-16 bg-white border border-slate-200 rounded px-2 py-0.5 text-right font-mono text-[10px] outline-none focus:border-rose-400" placeholder="0.00" />
                  <span className="font-mono text-rose-600 text-[10px] min-w-[50px] text-right">-{labourAmt.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end pr-2 justify-center">
                <span className="text-[8px] font-black text-blue-700 uppercase tracking-[0.3em] mb-1">NET PAYABLE ₹</span>
                <div className="bg-blue-600 text-white px-6 py-2 rounded-lg h-12 flex items-center font-black font-mono text-[24px] shadow-md tracking-tighter border border-blue-500">₹{netAmount.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 p-4 border-t border-blue-100 flex justify-end gap-3 shadow-sm">
          <button onClick={onCancel} className="px-8 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-black rounded-lg text-xs uppercase tracking-widest transition-all active:scale-95 shadow-sm">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="px-12 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-black rounded-lg text-xs uppercase tracking-widest transition-all active:scale-95 shadow-md">{loading ? 'Processing...' : 'Confirm & Post Entry'}</button>
        </div>
      </div>
    </div>
  );
}
