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
      <div className="bg-slate-200 w-full max-w-6xl max-h-[90vh] rounded-lg shadow-2xl flex flex-col border-2 border-slate-900 overflow-hidden font-sans">

        {/* Title Bar - Industrial Black */}
        <div className="flex justify-between items-center bg-black text-white px-5 py-2">
          <div className="flex items-center gap-3 font-black text-xs uppercase tracking-widest">
            <div className="w-3 h-3 bg-white rounded-full"></div>
            Purchase Entry
          </div>
          <button onClick={onCancel} className="hover:bg-red-600 text-white rounded-lg p-1 transition-all active:scale-90">
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        {/* Dynamic Alerts */}
        {error && <div className="bg-red-500 text-white text-[10px] font-black px-6 py-1.5 animate-pulse uppercase tracking-widest">{error}</div>}
        {success && <div className="bg-slate-900 text-white text-[10px] font-black px-6 py-1.5 uppercase tracking-widest border-l-4 border-l-white">{success}</div>}

        <div className="flex-1 overflow-auto bg-white flex flex-col">
          {/* Top Form Section */}
          <div className="bg-slate-50 p-3 border-b border-slate-200 shadow-sm font-semibold text-[12px] text-slate-800">

            {/* Row 1: Party */}
            <div className="flex flex-wrap gap-x-8 gap-y-4 px-2 items-center">
              <div className="flex items-center gap-3 relative z-20">
                <span className="font-black text-slate-500 uppercase tracking-widest text-[11px] w-12 text-right">Party :</span>
                <input
                  type="text"
                  value={supplierSearchText}
                  onChange={(e) => {
                    setSupplierSearchText(e.target.value);
                    setShowSupplierDropdown(true);
                  }}
                  onFocus={() => setShowSupplierDropdown(true)}
                  className="border border-slate-300 px-4 py-2 text-[13px] bg-slate-50 w-[400px] outline-none rounded-lg focus:border-black focus:bg-white transition-all uppercase font-black text-slate-900 shadow-sm"
                  placeholder="SEARCH SUPPLIER / PARTY..."
                />

                {showSupplierDropdown && (
                  <div className="absolute top-full left-14 bg-white border-2 border-black shadow-2xl w-[400px] max-h-64 overflow-y-auto z-40 rounded-lg mt-2 overflow-hidden">
                    <div className="p-2 border-b bg-slate-900 flex justify-between items-center">
                      <span className="text-white text-[10px] font-black uppercase tracking-widest px-2">Suppliers</span>
                      <X size={16} className="text-white cursor-pointer hover:bg-red-500 rounded p-0.5" onClick={() => setShowSupplierDropdown(false)} />
                    </div>
                    {availableSuppliers.filter(m => String(m.account_name).toLowerCase().includes(supplierSearchText.toLowerCase())).map((m) => (
                      <div key={m.id} onClick={() => handleSupplierSelect(m)} className="px-4 py-2 hover:bg-black hover:text-white cursor-pointer text-[13px] font-black border-b border-slate-100 last:border-0 transition-colors">
                        {m.account_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto text-[11px] bg-slate-900 text-white p-1 rounded-lg border-2 border-slate-900 shadow-lg font-black uppercase tracking-widest">
                <button onClick={() => setPaymentType('cash')} className={`px-4 py-1.5 rounded-md transition-all ${paymentType === 'cash' ? 'bg-white text-black' : 'hover:bg-slate-800'}`}>Cash</button>
                <button onClick={() => setPaymentType('credit')} className={`px-4 py-1.5 rounded-md transition-all ${paymentType === 'credit' ? 'bg-white text-black' : 'hover:bg-slate-800'}`}>Credit</button>
              </div>
            </div>

            {/* Row 2: Bill No & Date */}
            <div className="flex flex-wrap gap-x-8 gap-y-4 px-2 mt-4">
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-500 uppercase tracking-widest text-[11px] w-12 text-right">Bill No :</span>
                <input
                  type="text"
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  className="border border-slate-300 px-4 py-2 text-[13px] bg-slate-900 text-white w-40 outline-none rounded-lg font-mono font-black text-center shadow-lg focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div className="flex items-center gap-3 ml-4">
                <span className="font-black text-slate-500 uppercase tracking-widest text-[11px]">Date :</span>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="border border-slate-300 px-4 py-2 text-[13px] bg-white w-44 outline-none rounded-lg font-bold shadow-sm focus:border-black transition-all"
                />
              </div>
            </div>

            {/* Row 3: Tax Type */}
            <div className="flex flex-wrap gap-x-8 gap-y-4 px-2 mt-4 items-center">
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-500 uppercase tracking-widest text-[11px] w-12 text-right">Tax :</span>
                <select value={taxType} onChange={(e) => setTaxType(e.target.value)} className="border border-slate-300 px-4 py-2 text-[13px] bg-white w-52 outline-none rounded-lg font-black text-slate-900 shadow-sm focus:border-black transition-all">
                  <option value="CGST/SGST">LOCAL (CGST/SGST)</option>
                  <option value="IGST">INTERSTATE (IGST)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 ml-4">
                <span className="font-black text-slate-500 uppercase tracking-widest text-[11px]">State :</span>
                <input
                  type="text"
                  disabled
                  value="GUJARAT (24)"
                  className="border border-slate-200 px-4 py-2 text-[13px] bg-slate-100 w-48 outline-none rounded-lg font-bold text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* DATA GRID TABLE */}
          <div className="flex-1 bg-white overflow-y-auto flex flex-col font-sans border-b border-slate-200 h-[40vh]">
            <table className="w-full text-[12px] border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-slate-900 text-white font-black text-[10px] border-b border-slate-800 sticky top-0 z-10 shadow-md uppercase tracking-widest">
                <tr>
                  <th className="p-3 w-10 text-center">No</th>
                  <th className="p-3 w-64 text-left px-4">Item Description</th>
                  <th className="p-3 w-20 text-right px-4">Qty</th>
                  <th className="p-3 w-24 text-right px-4">Rate</th>
                  <th className="p-3 w-28 text-right px-4">Total</th>
                  <th className="p-3 w-16 text-right px-2">{taxType === 'IGST' ? 'IGST%' : 'CGST%'}</th>
                  <th className="p-3 w-20 text-right px-2">{taxType === 'IGST' ? 'IGST ₹' : 'CGST ₹'}</th>
                  <th className="p-3 w-16 text-right px-2">{taxType === 'IGST' ? '' : 'SGST%'}</th>
                  <th className="p-3 w-20 text-right px-2">{taxType === 'IGST' ? '' : 'SGST ₹'}</th>
                  <th className="p-3 w-32 text-right px-4">Gr. Amount</th>
                  <th className="p-3 w-12 text-center">X</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {purchaseItems.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                    <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3 px-4 whitespace-nowrap overflow-hidden text-ellipsis font-black text-slate-900">
                      {row.item_code} {row.item_name}
                    </td>
                    <td className="p-3 px-4 text-right font-mono font-black">{row.quantity.toFixed(3)}</td>
                    <td className="p-3 px-4 text-right font-mono font-black italic text-slate-500">{row.rate.toFixed(2)}</td>
                    <td className="p-3 px-4 text-right font-mono font-black text-slate-900">{row.amount.toFixed(2)}</td>

                    <td className="p-3 px-2 text-right font-mono text-slate-400 text-[10px]">{taxType === 'IGST' ? row.igstPercent.toFixed(2) : row.cgstPercent.toFixed(2)}</td>
                    <td className="p-3 px-2 text-right font-mono text-slate-700">{taxType === 'IGST' ? row.igstAmt.toFixed(1) : row.cgstAmt.toFixed(1)}</td>

                    <td className="p-3 px-2 text-right font-mono text-slate-400 text-[10px]">{taxType === 'IGST' ? '' : row.sgstPercent.toFixed(2)}</td>
                    <td className="p-3 px-2 text-right font-mono text-slate-700">{taxType === 'IGST' ? '' : row.sgstAmt.toFixed(1)}</td>

                    <td className="p-3 px-4 text-right font-mono font-black text-black bg-slate-50">{row.totalAmount.toFixed(2)}</td>
                    <td className="p-3 text-center text-slate-300 hover:text-red-500 cursor-pointer font-bold transition-colors" onClick={() => handleRemoveItem(idx)}>
                      <X size={14} />
                    </td>
                  </tr>
                ))}

                {/* Live Input Row */}
                <tr className="bg-slate-100 border-t-2 border-slate-900 sticky bottom-0 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
                  <td className="p-2 text-center text-[10px] font-black uppercase text-slate-500">New</td>
                  <td className="p-0 relative">
                    <input
                      type="text"
                      ref={itemInputRef}
                      value={itemSearchText}
                      onChange={(e) => {
                        setItemSearchText(e.target.value);
                        setShowItemDropdown(true);
                      }}
                      onFocus={() => setShowItemDropdown(true)}
                      className="w-full h-10 px-4 outline-none border-none text-[12px] bg-white font-black uppercase text-black placeholder:text-slate-400 shadow-inner"
                      placeholder="SEARCH ITEM BY NAME OR CODE..."
                    />
                  </td>
                  <td className="p-0 bg-yellow-50">
                    <input
                      type="number"
                      value={currentQty}
                      onChange={(e) => setCurrentQty(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddItem(e)}
                      className="w-full h-10 px-4 text-right outline-none bg-transparent font-black font-mono text-sm focus:bg-white transition-colors"
                      placeholder="0.000"
                    />
                  </td>
                  <td className="p-0 bg-yellow-50 border-r border-slate-200">
                    <input
                      type="number"
                      value={currentRate}
                      onChange={(e) => setCurrentRate(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddItem(e)}
                      className="w-full h-10 px-4 text-right outline-none bg-transparent font-black font-mono text-sm focus:bg-white transition-colors"
                      placeholder="0.00"
                    />
                  </td>
                  {/* Live Computation display */}
                  {livePreview ? (
                    <>
                      <td className="p-2 px-4 text-right font-black font-mono bg-slate-900 text-white shadow-inner">{livePreview.amount.toFixed(2)}</td>
                      <td className="p-2 px-2 text-right font-mono text-slate-400 bg-slate-100 text-[10px]">{taxType === 'IGST' ? livePreview.igstPercent.toFixed(2) : livePreview.cgstPercent.toFixed(2)}</td>
                      <td className="p-2 px-2 text-right font-mono text-slate-900 bg-slate-100">{taxType === 'IGST' ? livePreview.igstAmt.toFixed(1) : livePreview.cgstAmt.toFixed(1)}</td>
                      <td className="p-2 px-2 text-right font-mono text-slate-400 bg-slate-100 text-[10px]">{taxType === 'IGST' ? '' : livePreview.sgstPercent.toFixed(2)}</td>
                      <td className="p-2 px-2 text-right font-mono text-slate-900 bg-slate-100">{taxType === 'IGST' ? '' : livePreview.sgstAmt.toFixed(1)}</td>
                      <td className="p-2 px-4 text-right font-black font-mono text-black bg-white border-r border-slate-300 shadow-xl">{livePreview.totalAmount.toFixed(2)}</td>
                    </>
                  ) : (
                    <td colSpan={taxType === 'IGST' ? 4 : 6} className="bg-slate-100 p-2 text-[10px] text-slate-400 font-black text-center border-r border-slate-200 uppercase tracking-widest italic">
                      [ Enter Qty & Rate ]
                    </td>
                  )}
                  <td className="bg-black">
                    <button onClick={handleAddItem} className="w-full h-10 bg-black hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-tighter">Add</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Absolute Item Dropdown - High Contrast Monochrome */}
          {showItemDropdown && (
            <div
              style={{ position: 'fixed', top: `${dropdownPos.top + 5}px`, left: dropdownPos.left || 0, width: dropdownPos.width || 400 }}
              className="bg-white border-2 border-black shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] max-h-80 overflow-y-auto z-[9999] rounded-lg animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="p-2 border-b bg-slate-900 flex justify-between font-black text-white text-[10px] uppercase tracking-widest sticky top-0 items-center">
                <span>Select Product From Inventory</span>
                <X size={16} className="cursor-pointer hover:bg-red-500 rounded p-0.5" onClick={() => setShowItemDropdown(false)} />
              </div>
              {availableItems.filter(i => String(i.item_name).toLowerCase().includes(itemSearchText.toLowerCase()) || String(i.item_code).includes(itemSearchText)).map((item) => (
                <div key={item.id} onClick={() => handleItemSelect(item)} className="px-4 py-3 border-b border-slate-100 hover:bg-slate-900 group cursor-pointer transition-colors flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase text-slate-800 group-hover:text-white">{item.item_name}</span>
                    <span className="text-[10px] text-slate-400 group-hover:text-slate-300 font-bold uppercase tracking-widest">Code: {item.item_code} | PR: ₹{item.purchase_price}</span>
                  </div>
                  <div className="bg-slate-50 px-2 py-1 rounded border border-slate-200 text-black font-black text-[10px] group-hover:bg-slate-800 group-hover:text-white group-hover:border-slate-700">Stock: {item.current_stock || 0}</div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Summary - Impactful Monochrome */}
          <div className="bg-slate-900 p-2.5 flex flex-col sm:flex-row justify-between items-start">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-col gap-0.5">
                <span className="font-black text-slate-400 text-[8px] uppercase tracking-widest">E-way Bill :</span>
                <input type="text" className="bg-slate-800 border border-slate-700 px-3 py-1 rounded text-white w-56 outline-none focus:border-white transition-all font-mono text-[9px] h-6" placeholder="BILL NO." />
              </div>
              <div className="text-slate-500 text-[8px] font-mono leading-tight tracking-widest uppercase italic opacity-40">
                * GST based on tax selection.
              </div>
            </div>

            <div className="flex gap-4">
              {/* Calculation Breakdown */}
              <div className="flex flex-col gap-0.5 pr-6 border-r border-slate-800">
                <div className="flex justify-between items-center w-36 py-0.5">
                  <span className="font-black text-slate-400 text-[8px] uppercase tracking-widest">Base :</span>
                  <span className="font-mono font-black text-white text-[9px]">{totalBaseAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center w-36 py-0.5">
                  <span className="font-black text-slate-400 text-[8px] uppercase tracking-widest">GST :</span>
                  <span className="font-mono font-black text-white text-[9px]">{(totalCgst + totalSgst + totalIgst).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center w-36 py-0.5 border-t border-slate-800 mt-0.5 pt-0.5">
                  <span className="font-black text-slate-400 text-[8px] uppercase tracking-widest">Round :</span>
                  <span className={`font-mono font-black text-[9px] ${rounding >= 0 ? 'text-green-400' : 'text-red-400'}`}>{rounding.toFixed(2)}</span>
                </div>
              </div>

              {/* FINAL BIG TOTAL */}
              <div className="flex flex-col items-end gap-0 pl-4 justify-center">
                <span className="font-black text-white text-[7px] uppercase tracking-[0.2em] opacity-30">Net Payable</span>
                <div className="bg-white text-black px-4 py-1 rounded shadow-xl border border-slate-100 flex items-center h-8">
                  <span className="text-[18px] font-black font-mono tracking-tighter">₹{netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-slate-200 p-2 border-t border-slate-300 flex items-center justify-end gap-3 shadow-inner">
          <button onClick={onCancel} className="px-5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-600 font-black shadow rounded transition-all active:scale-95 text-[9px] uppercase tracking-widest h-7">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} className="px-8 py-1 bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white font-black shadow-lg rounded transition-all active:scale-95 text-[10px] uppercase tracking-widest h-7">
            {loading ? 'Processing...' : 'Confirm & Save'}
          </button>
        </div>

      </div>
    </div>
  );
}
