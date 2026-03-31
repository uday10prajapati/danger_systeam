import React, { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import axios from 'axios';

export default function PurchaseForm({ onSubmit, onCancel }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Primary Form State
  const [billNo, setBillNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState('credit'); // credit, cash
  const [taxType, setTaxType] = useState('CGST/SGST'); // CGST/SGST, IGST
  const [supplierId, setSupplierId] = useState('');
  
  // Supplier (Party) Search State
  const [availableSuppliers, setAvailableSuppliers] = useState([]);
  const [supplierSearchText, setSupplierSearchText] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Items State
  const [availableItems, setAvailableItems] = useState([]);
  const [purchaseItems, setPurchaseItems] = useState([]);

  // Current Input Row State
  const [currentItem, setCurrentItem] = useState(null);
  const [currentQty, setCurrentQty] = useState('');
  const [currentRate, setCurrentRate] = useState('');
  const [itemSearchText, setItemSearchText] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  // Form Extraneous
  const [totalAmountState, setTotalAmountState] = useState(0);

  // Input Refs for hotkeys
  const itemInputRef = useRef(null);

  const calculateDropdownPos = () => {
     if (itemInputRef.current) {
        const rect = itemInputRef.current.getBoundingClientRect();
        setDropdownPos({
           top: rect.bottom, 
           left: rect.left,
           width: Math.max(rect.width, 400)
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
    loadCompanyAndData();
  }, []);

  const loadCompanyAndData = async () => {
    try {
      const compRes = await axios.get('/api/company');
      if (compRes.data.success && compRes.data.data) {
        const comp = compRes.data.data;
        setCompany(comp);

        // Fetch Accounts (Suppliers)
        const accRes = await axios.get(`/api/accounts/company/${comp.id}`, { headers: { 'x-company-id': comp.id } });
        if (accRes.data.success) {
          const supplierList = (accRes.data.data || []).filter(acc => acc.account_type === 'supplier');
          setAvailableSuppliers(supplierList);
        }

        // Fetch Items
        const itemRes = await axios.get(`/api/items/company/${comp.id}?active=true`, { headers: { 'x-company-id': comp.id } });
        if (itemRes.data.success) {
          setAvailableItems(itemRes.data.data || []);
        }
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

    const defaultRate = currentItem.purchase_price !== undefined ? currentItem.purchase_price : 0;
    const rate = currentRate !== '' ? parseFloat(currentRate) : parseFloat(defaultRate);
    const details = calculateRowDetails(currentItem, parseFloat(currentQty), rate);

    const newItem = {
      ...currentItem,
      quantity: parseFloat(currentQty),
      rate: rate,
      ...details
    };

    setPurchaseItems([...purchaseItems, newItem]);
    
    // Reset inputs
    setCurrentItem(null);
    setItemSearchText('');
    setCurrentQty('');
    setCurrentRate('');
    if (itemInputRef.current) itemInputRef.current.focus();
  };

  const handleRemoveItem = (index) => {
    const newItems = [...purchaseItems];
    newItems.splice(index, 1);
    setPurchaseItems(newItems);
  };

  const handleSupplierSelect = (supplier) => {
    setSelectedSupplier(supplier);
    setSupplierId(supplier.id);
    setSupplierSearchText(`${supplier.account_name}`);
    setShowSupplierDropdown(false);
  };

  const handleItemSelect = (item) => {
    setCurrentItem(item);
    setItemSearchText(`${item.item_code} ${item.item_name}`);
    const defaultRate = item.purchase_price !== undefined ? item.purchase_price : '';
    setCurrentRate(defaultRate);
    setShowItemDropdown(false);
  };

  // Recalculate totals
  const totalBaseAmount = purchaseItems.reduce((sum, row) => sum + row.amount, 0);
  const totalCgst = purchaseItems.reduce((sum, row) => sum + row.cgstAmt, 0);
  const totalSgst = purchaseItems.reduce((sum, row) => sum + row.sgstAmt, 0);
  const totalIgst = purchaseItems.reduce((sum, row) => sum + row.igstAmt, 0);
  const grossTotal = totalBaseAmount + totalCgst + totalSgst + totalIgst;
  const netAmount = Math.round(grossTotal);
  const rounding = netAmount - grossTotal;

  // Live preview
  const currentDefaultRate = currentItem?.purchase_price !== undefined ? currentItem.purchase_price : 0;
  const liveRate = currentRate !== '' ? parseFloat(currentRate) : parseFloat(currentDefaultRate);
  const liveQty = parseFloat(currentQty) || 0;
  const livePreview = currentItem ? calculateRowDetails(currentItem, liveQty, liveRate) : null;

  const handleSave = async () => {
    if (purchaseItems.length === 0) {
      setError("Please add at least one item.");
      return;
    }
    if (paymentType === 'credit' && !selectedSupplier) {
      setError("Please select a Party (Supplier) for Credit Purchases.");
      return;
    }
    if (!billNo.trim()) {
      setError("Please enter the Bill No / Invoice No.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        supplier_account_id: selectedSupplier ? selectedSupplier.id : null,
        invoice_no: billNo,
        invoice_date: invoiceDate,
        is_intra_state: taxType === 'CGST/SGST',
        payment_type: paymentType, 
        notes: '',
        items: purchaseItems.map(row => ({
          item_id: row.id,
          quantity: row.quantity,
          purchase_rate: row.rate,
          gst_percent: taxType === 'IGST' ? row.igstPercent : (row.cgstPercent + row.sgstPercent)
        }))
      };

      const res = await axios.post('/api/purchases/with-gst', payload, {
        headers: { 'x-company-id': company.id, 'x-user-id': 1 }
      });

      if (res.data.success) {
        setSuccess("Purchase Created Successfully! Invoice No: " + res.data.data.invoice_no);
        setTimeout(() => {
          if (onSubmit) onSubmit(res.data.data);
        }, 1500);
      }
    } catch (err) {
       setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save purchase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-[#E8F0FF] to-[#F1F5F9] w-full max-w-[1400px] h-[95vh] rounded-none sm:rounded shadow-2xl flex flex-col border border-slate-300 overflow-hidden" 
           style={{ fontFamily: "Tahoma, sans-serif" }}>
        
        {/* Visual Basic Style Form Header */}
        <div className="flex justify-between items-center bg-[#4d79ff] text-white px-2 py-0.5 border-b-2 border-[#1E3A8A]">
          <div className="flex items-center gap-2 font-bold text-sm tracking-wide">
            Purchase
          </div>
          <button onClick={onCancel} className="bg-[#D32F2F] hover:bg-red-700 text-white px-3 border border-red-900 shadow-inner font-bold rounded-sm">X</button>
        </div>

        {/* Dynamic Alerts */}
        {error && <div className="bg-red-500 text-white text-xs font-bold px-4 py-1 animate-pulse border-b border-red-700">{error}</div>}
        {success && <div className="bg-green-600 text-white text-xs font-bold px-4 py-1 border-b border-green-800">{success}</div>}

        <div className="flex-1 overflow-auto bg-[#F0F5FA]">
          {/* Top Form Section mimicking screenshot */}
          <div className="bg-[#D3E1F1] p-2 border-b-2 border-white shadow-sm font-semibold text-[13px] text-[#1E3A8A]">
            
            {/* Row 1: Party */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 px-2">
              <div className="flex items-center gap-2 relative z-20">
                 <span className="font-bold w-12 text-right">Party :</span>
                 <input 
                   type="text" 
                   value={supplierSearchText} 
                   onChange={(e) => {
                     setSupplierSearchText(e.target.value);
                     setShowSupplierDropdown(true);
                   }}
                   onFocus={() => setShowSupplierDropdown(true)}
                   className="border border-[#7A93BE] px-2 py-1 text-[13px] bg-[#FFFFE0] w-[350px] outline-none shadow-inner uppercase font-bold text-blue-900"
                   placeholder="SEARCH SUPPLIER / PARTY..."
                 />
                 
                 {showSupplierDropdown && (
                    <div className="absolute top-full left-14 bg-white border border-[#7A93BE] shadow-xl w-[350px] max-h-48 overflow-y-auto z-40">
                       <div className="p-1 border-b bg-[#F0F5FA] flex justify-end"><X size={14} className="cursor-pointer hover:text-red-600" onClick={() => setShowSupplierDropdown(false)}/></div>
                       {availableSuppliers.filter(m => String(m.account_name).toLowerCase().includes(supplierSearchText.toLowerCase())).map((m) => (
                         <div key={m.id} onClick={() => handleSupplierSelect(m)} className="px-2 py-1 hover:bg-[#1E3A8A] hover:text-white cursor-pointer text-[13px] font-semibold">
                            {m.account_name}
                         </div>
                       ))}
                    </div>
                 )}
              </div>

               <div className="flex items-center gap-2 ml-auto text-[13px] bg-slate-200 px-3 py-1 border border-slate-300 shadow-inner">
                 <label className="flex items-center gap-1 cursor-pointer font-bold text-green-700">
                    <input type="radio" checked={paymentType === 'cash'} onChange={() => setPaymentType('cash')} /> Cash
                 </label>
                 <label className="flex items-center gap-1 cursor-pointer font-bold text-red-700 ml-4">
                    <input type="radio" checked={paymentType === 'credit'} onChange={() => setPaymentType('credit')} /> Credit
                 </label>
               </div>
            </div>

            {/* Row 2: Bill No & Date */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 px-2 mt-2">
              <div className="flex items-center gap-2">
                 <span className="font-bold w-12 text-right">Bill No :</span>
                 <input 
                   type="text" 
                   value={billNo}
                   onChange={(e) => setBillNo(e.target.value)}
                   className="border border-[#7A93BE] px-2 py-1 text-[13px] bg-white w-32 outline-none shadow-inner uppercase font-mono font-bold"
                 />
              </div>

              <div className="flex items-center gap-2 ml-4">
                 <span className="font-bold">Date :</span>
                 <input 
                   type="date" 
                   value={invoiceDate} 
                   onChange={(e) => setInvoiceDate(e.target.value)}
                   className="border border-[#7A93BE] px-2 py-1 text-[13px] bg-white w-36 outline-none shadow-inner"
                 />
              </div>
            </div>

            {/* Row 3: Tax Type */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 px-2 mt-2 items-center">
              <div className="flex items-center gap-2">
                <span className="font-bold w-12 text-right text-[13px]">Tax Type :</span>
                <select value={taxType} onChange={(e) => setTaxType(e.target.value)} className="border border-[#7A93BE] px-2 py-1 text-[13px] bg-[#E8F0F8] w-48 outline-none shadow-inner font-bold text-[#1E3A8A]">
                  <option value="CGST/SGST">CGST/SGST</option>
                  <option value="IGST">IGST</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                 <span className="font-bold">State :</span>
                 <input 
                   type="text" 
                   disabled
                   value="GUJARAT"
                   className="border border-[#7A93BE] px-2 py-1 text-[13px] bg-gray-200 w-36 outline-none shadow-inner cursor-not-allowed text-stone-600"
                 />
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                 <span className="font-bold">GST No. :</span>
                 <input 
                   type="text" 
                   className="border border-[#7A93BE] px-2 py-1 text-[13px] bg-white w-48 outline-none shadow-inner"
                 />
              </div>
            </div>
          </div>

          {/* DATA GRID TABLE */}
          <div className="mt-2 border border-[#7A93BE] bg-white overflow-y-auto flex flex-col shadow-inner mx-1" style={{ height: '35vh'}}>
            <table className="w-full text-[12px] border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-[#467FCF] text-white font-extrabold text-[11px] border-b-2 border-[#1E3A8A] sticky top-0 z-10 shadow-sm uppercase">
                <tr>
                  <th className="border-r border-[#1c3c72] p-1.5 w-8 text-center bg-[#467FCF]">No</th>
                  <th className="border-r border-[#1c3c72] p-1.5 w-64 text-left px-2 bg-[#467FCF]">Item</th>
                  <th className="border-r border-[#1c3c72] p-1.5 w-16 text-right px-2 bg-[#467FCF]">Qty</th>
                  <th className="border-r border-[#1c3c72] p-1.5 w-20 text-right px-2 bg-[#467FCF]">Rate</th>
                  <th className="border-r border-[#1c3c72] p-1.5 w-24 text-right px-2 bg-[#467FCF]">Amount</th>
                  <th className="border-r border-[#1c3c72] p-1.5 w-16 text-right px-1 bg-[#467FCF]">{taxType === 'IGST' ? 'IGST %' : 'CGST %'}</th>
                  <th className="border-r border-[#1c3c72] p-1.5 w-20 text-right px-1 bg-[#467FCF]">{taxType === 'IGST' ? 'IGST Amt' : 'CGST Amt'}</th>
                  <th className="border-r border-[#1c3c72] p-1.5 w-16 text-right px-1 bg-[#467FCF]">{taxType === 'IGST' ? '' : 'SGST %'}</th>
                  <th className="border-r border-[#1c3c72] p-1.5 w-20 text-right px-1 bg-[#467FCF]">{taxType === 'IGST' ? '' : 'SGST Amt'}</th>

                  <th className="p-1.5 w-24 text-right px-2 bg-[#467FCF]">Total Amt.</th>
                  <th className="border-l border-[#1c3c72] p-1.5 w-8 text-center bg-[#467FCF]">X</th>
                </tr>
              </thead>
              <tbody className="bg-[#fbfcff]">
                {purchaseItems.map((row, idx) => (
                  <tr key={idx} className="border-b border-[#E0E8F5] hover:bg-[#FFFFE0] cursor-pointer">
                    <td className="border-r border-[#E0E8F5] p-1.5 text-center font-bold text-gray-600">{idx + 1}</td>
                    <td className="border-r border-[#E0E8F5] p-1.5 px-2 whitespace-nowrap overflow-hidden text-ellipsis font-bold text-blue-900">
                       {row.item_code} {row.item_name}
                    </td>
                    <td className="border-r border-[#E0E8F5] p-1.5 px-2 text-right font-mono text-black">{row.quantity.toFixed(3)}</td>
                    <td className="border-r border-[#E0E8F5] p-1.5 px-2 text-right font-mono text-black">{row.rate.toFixed(2)}</td>
                    <td className="border-r border-[#E0E8F5] p-1.5 px-2 text-right font-mono font-bold text-black">{row.amount.toFixed(2)}</td>
                    
                    <td className="border-r border-[#E0E8F5] p-1.5 px-2 text-right font-mono text-gray-600">{taxType === 'IGST' ? row.igstPercent.toFixed(2) : row.cgstPercent.toFixed(2)}</td>
                    <td className="border-r border-[#E0E8F5] p-1.5 px-2 text-right font-mono text-black">{taxType === 'IGST' ? row.igstAmt.toFixed(2) : row.cgstAmt.toFixed(2)}</td>
                    
                    <td className="border-r border-[#E0E8F5] p-1.5 px-2 text-right font-mono text-gray-600">{taxType === 'IGST' ? '' : row.sgstPercent.toFixed(2)}</td>
                    <td className="border-r border-[#E0E8F5] p-1.5 px-2 text-right font-mono text-black">{taxType === 'IGST' ? '' : row.sgstAmt.toFixed(2)}</td>
                    

                    
                    <td className="p-1 px-2 text-right font-mono font-extrabold text-[#1E3A8A]">{row.totalAmount.toFixed(2)}</td>
                    <td className="border-l border-[#E0E8F5] p-1 px-2 text-center text-red-500 font-bold hover:bg-red-200 cursor-pointer" onClick={() => handleRemoveItem(idx)}>X</td>
                  </tr>
                ))}
                
                {/* Live Input Row */}
                <tr className="bg-[#FFFFE0] border-b-2 border-slate-300">
                  <td className="border-r border-[#E0E8F5] p-1 text-center font-bold">*</td>
                  <td className="border-r border-[#E0E8F5] p-0.5 px-1 relative">
                    <input 
                      type="text" 
                      ref={itemInputRef}
                      value={itemSearchText} 
                      onChange={(e) => {
                        setItemSearchText(e.target.value);
                        setShowItemDropdown(true);
                      }}
                      onFocus={() => setShowItemDropdown(true)}
                      className="w-full border border-blue-400 px-1 py-0.5 outline-none font-bold text-[12px] focus:bg-white focus:border-red-500 uppercase"
                      placeholder="SELECT ITEM..."
                    />
                  </td>
                  <td className="border-r border-[#E0E8F5] p-0.5 px-1">
                    <input 
                      type="number" 
                      value={currentQty} 
                      onChange={(e) => setCurrentQty(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddItem(e)}
                      className="w-full border border-blue-400 px-1 py-0.5 outline-none text-right font-mono font-bold text-[12px] focus:bg-white focus:border-red-500"
                    />
                  </td>
                  <td className="border-r border-[#E0E8F5] p-0.5 px-1">
                    <input 
                      type="number" 
                      value={currentRate} 
                      onChange={(e) => setCurrentRate(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddItem(e)}
                      className="w-full border border-blue-400 px-1 py-0.5 outline-none text-right font-mono font-bold text-[12px] focus:bg-white focus:border-red-500"
                    />
                  </td>
                  {/* Live Computation display */}
                  <td className="border-r border-[#E0E8F5] p-1 px-2 text-right font-mono font-bold text-gray-500">{livePreview ? livePreview.amount.toFixed(2) : ''}</td>
                  <td className="border-r border-[#E0E8F5] p-1 px-2 text-right font-mono text-gray-400">{livePreview ? (taxType==='IGST'?livePreview.igstPercent:livePreview.cgstPercent).toFixed(2) : ''}</td>
                  <td className="border-r border-[#E0E8F5] p-1 px-2 text-right font-mono text-gray-500">{livePreview ? (taxType==='IGST'?livePreview.igstAmt:livePreview.cgstAmt).toFixed(2) : ''}</td>
                  <td className="border-r border-[#E0E8F5] p-1 px-2 text-right font-mono text-gray-400">{livePreview ? (taxType==='IGST'?'':livePreview.sgstPercent).toFixed(2) : ''}</td>
                  <td className="border-r border-[#E0E8F5] p-1 px-2 text-right font-mono text-gray-500">{livePreview ? (taxType==='IGST'?'':livePreview.sgstAmt).toFixed(2) : ''}</td>

                  <td className="p-1 px-2 text-right font-mono font-bold text-gray-400">{livePreview ? livePreview.totalAmount.toFixed(2) : ''}</td>
                  <td className="p-1 px-2 text-center text-blue-500 font-bold hover:bg-blue-100 cursor-pointer" onClick={handleAddItem}>+</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Absolute Item Dropdown for Grid */}
          {showItemDropdown && (
            <div 
              style={{ position: 'fixed', top: (dropdownPos.top || 0) - 100, left: dropdownPos.left || 0, width: dropdownPos.width || 400 }}
              className="bg-white border-2 border-blue-500 shadow-2xl max-h-64 overflow-y-auto z-50 text-[12px]"
            >
              <div className="p-1 border-b bg-blue-100 flex justify-between font-bold text-blue-900 sticky top-0">
                 <span>Items (Esc to close)</span>
                 <X size={14} className="cursor-pointer hover:text-red-600" onClick={() => setShowItemDropdown(false)}/>
              </div>
              <div className="flex border-b bg-gray-50 font-bold text-gray-600 sticky top-7 uppercase">
                 <div className="w-16 p-1 border-r">Code</div>
                 <div className="flex-1 p-1 border-r">Item Name</div>
                 <div className="w-16 p-1 text-right">PRate</div>
              </div>
              {availableItems.filter(i => String(i.item_name).toLowerCase().includes(itemSearchText.toLowerCase()) || String(i.item_code).includes(itemSearchText)).map((item) => (
                <div key={item.id} onClick={() => handleItemSelect(item)} className="flex border-b cursor-pointer hover:bg-blue-600 hover:text-white group">
                   <div className="w-16 p-1 border-r group-hover:border-blue-500 text-gray-500 group-hover:text-gray-200">{item.item_code}</div>
                   <div className="flex-1 p-1 border-r group-hover:border-blue-500 font-semibold">{item.item_name}</div>
                   <div className="w-16 p-1 text-right font-mono font-bold">{parseFloat(item.purchase_price || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Summary Exactly matching screenshot */}
          <div className="mt-2 bg-[#D3E1F1] border-t-2 border-[#9AAFD2] shadow-sm flex flex-col sm:flex-row pb-20 sm:pb-0 h-[220px]">
            {/* Left section empty to match picture */}
            <div className="flex-1 p-2">
               <div className="flex items-center gap-2 mt-auto">
                 <span className="font-bold text-[#1E3A8A] text-[13px]">E-way Bill No. :</span>
                 <input type="text" className="border border-[#7A93BE] px-2 py-1 bg-white w-64 outline-none shadow-inner" />
               </div>
            </div>

            {/* Middle and Right specific computed sections */}
            <div className="flex divide-x divide-[#9AAFD2] border-l border-[#9AAFD2]">
                
                 {/* Computation Left Col */}
                 <div className="flex flex-col text-[13px] w-64">
                    <div className="flex justify-between items-center bg-[#E5EEF9] border-b border-[#9AAFD2] px-3 py-1.5 h-8">
                       <span className="font-bold text-[#1E3A8A]">Total Amount :</span>
                       <span className="font-mono font-bold text-right" style={{backgroundColor: '#A6C8FF', padding: '0 8px'}}>{totalBaseAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#E5EEF9] border-b border-[#9AAFD2] px-3 py-1.5 h-8">
                       <span className="font-bold text-[#1E3A8A]">SGST Amt :</span>
                       <span className="font-mono font-bold text-right" style={{backgroundColor: '#A6C8FF', padding: '0 8px'}}>{totalSgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#E5EEF9] border-b border-[#9AAFD2] px-3 py-1.5 h-8">
                       <span className="font-bold text-[#1E3A8A]">CGST Amt :</span>
                       <span className="font-mono font-bold text-right" style={{backgroundColor: '#A6C8FF', padding: '0 8px'}}>{totalCgst.toFixed(2)}</span>
                    </div>

                 </div>

                 {/* Computation Right Col */}
                 <div className="flex flex-col text-[13px] w-64">
                    <div className="flex justify-between items-center bg-[#E5EEF9] border-b border-[#9AAFD2] px-3 py-1.5 h-8">
                       <span className="font-bold text-[#1E3A8A]">Labour Charge :</span>
                       <input type="number" defaultValue="0.00" className="w-24 border border-[#7A93BE] shadow-inner outline-none px-1 text-right font-mono bg-white" />
                    </div>
                    <div className="flex justify-between items-center bg-[#E5EEF9] border-b border-[#9AAFD2] px-3 py-1.5 h-8">
                       <span className="font-bold text-[#1E3A8A]">TCS Amount :</span>
                       <input type="number" defaultValue="0.00" className="w-24 border border-[#7A93BE] shadow-inner outline-none px-1 text-right font-mono bg-white" />
                    </div>
                    <div className="flex justify-between items-center bg-[#E5EEF9] border-b border-[#9AAFD2] px-3 py-1.5 h-8">
                       <span className="font-bold text-[#1E3A8A]">Rounding :</span>
                       <span className="font-mono font-bold text-right" style={{backgroundColor: '#A6C8FF', padding: '0 8px'}}>{rounding > 0 ? '+' : ''}{rounding.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-[#E5EEF9] border-b border-[#9AAFD2] px-3 py-1.5 h-8">
                       <span className="font-bold text-[#1E3A8A]">Net Amount :</span>
                       <span className="font-mono font-extrabold text-[#1c3c72] text-[15px] text-right" style={{backgroundColor: '#A6C8FF', padding: '0 8px'}}>{netAmount.toFixed(2)}</span>
                    </div>
                 </div>

            </div>
          </div>
          
        </div>

        {/* Action Bar */}
        <div className="bg-[#E5EEF9] p-2 border-t border-[#7A93BE] flex items-center justify-between text-[11px] font-bold text-slate-500 shadow-inner shrink-0">
          <div className="flex gap-4">
            
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={loading} className="px-6 py-1 bg-[#D3E1F1] border border-[#7A93BE] hover:bg-[#A6C8FF] text-slate-800 font-bold shadow-sm rounded-sm">
               Ok
            </button>
            <button onClick={onCancel} className="px-6 py-1 bg-[#D3E1F1] border border-[#7A93BE] hover:bg-slate-300 text-slate-800 font-bold shadow-sm rounded-sm">
               Cancel
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
