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
  const [driverName, setDriverName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [gadiNumber, setGadiNumber] = useState('');

  // Supplier (Party) Search State
  const [availableSuppliers, setAvailableSuppliers] = useState([]);
  const [supplierCodeSearch, setSupplierCodeSearch] = useState('');
  const [supplierNameSearch, setSupplierNameSearch] = useState('');
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
  const [itemSelectedIndex, setItemSelectedIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  // Form Extraneous
  const [totalAmountState, setTotalAmountState] = useState(0);

  // Input Refs for hotkeys
  const itemInputRef = useRef(null);
  const supplierDropdownRef = useRef(null);
  const itemDropdownRef = useRef(null);
  const dropdownListRef = useRef(null);

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

  // Auto-scroll selected item into view
  useEffect(() => {
    if (showItemDropdown && dropdownListRef.current) {
      const selectedEl = dropdownListRef.current.children[itemSelectedIndex + 1]; // +1 for the header
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [itemSelectedIndex, showItemDropdown]);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target)) {
        setShowSupplierDropdown(false);
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
        if (showSupplierDropdown) {
          setShowSupplierDropdown(false);
          return;
        }
        onCancel();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showItemDropdown, showSupplierDropdown, onCancel]);

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

  // Auto-fetch supplier by code
  useEffect(() => {
    if (supplierCodeSearch) {
      const match = availableSuppliers.find(s => String(s.id) === supplierCodeSearch || String(s.phone) === supplierCodeSearch);
      if (match) {
        setSelectedSupplier(match);
        setSupplierId(match.id);
        setSupplierNameSearch(match.account_name);
        setShowSupplierDropdown(false);
      } else {
        if (selectedSupplier && String(selectedSupplier.id) !== supplierCodeSearch) {
          setSelectedSupplier(null);
          setSupplierId('');
        }
      }
    } else {
      setSelectedSupplier(null);
      setSupplierId('');
    }
  }, [supplierCodeSearch, availableSuppliers]);

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
    setSupplierCodeSearch(String(supplier.id));
    setSupplierNameSearch(supplier.account_name);
    setShowSupplierDropdown(false);
  };

  const handleItemSelect = (item) => {
    setCurrentItem(item);
    setItemSearchText(`${item.item_code} ${item.item_name}`);
    const defaultRate = item.purchase_price !== undefined ? item.purchase_price : '';
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
        driver_name: driverName,
        mobile_number: mobileNumber,
        gadi_number: gadiNumber,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-2 sm:p-4 backdrop-blur-md">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] flex flex-col border border-slate-200 overflow-hidden font-sans">

        {/* Title Bar - Modern Design */}
        <div className="flex justify-between items-center bg-slate-900 text-white px-6 py-3">
          <div className="flex items-center gap-3 font-black text-xs uppercase tracking-widest">
            <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full"></div>
            Purchase Entry
          </div>
          <button onClick={onCancel} className="hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg p-1.5 transition-all active:scale-90">
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        {/* Dynamic Alerts */}
        {error && <div className="bg-red-500/90 text-white text-[10px] font-black px-6 py-2 animate-pulse uppercase tracking-widest">{error}</div>}
        {success && <div className="bg-emerald-600 text-white text-[10px] font-black px-6 py-2 uppercase tracking-widest border-l-4 border-l-emerald-300">{success}</div>}

        <div className="flex-1 overflow-auto bg-[#F8FAFC] flex flex-col">
          {/* Top Form Section */}
          <div className="bg-white p-4 border-b border-slate-100 shadow-sm font-semibold text-[12px] text-slate-800">

            {/* Row 1: Party & Payment Type */}
            <div className="flex flex-wrap gap-x-8 gap-y-4 px-2 items-center">
              <div className="flex items-center gap-3 relative z-30" ref={supplierDropdownRef}>
                <span className="font-black text-slate-600 uppercase tracking-widest text-[11px] w-12 text-right">Party :</span>
                <input
                  type="text"
                  value={supplierCodeSearch}
                  onChange={(e) => {
                    setSupplierCodeSearch(e.target.value);
                    setShowSupplierDropdown(true);
                  }}
                  onFocus={() => setShowSupplierDropdown(true)}
                  className="border border-slate-200 px-4 py-2 text-[13px] bg-white w-24 outline-none rounded-xl focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all uppercase font-black text-slate-900 shadow-sm text-center"
                  placeholder="CODE"
                />
                <input
                  type="text"
                  value={supplierNameSearch}
                  onChange={(e) => {
                    setSupplierNameSearch(e.target.value);
                    setShowSupplierDropdown(true);
                    if (selectedSupplier && selectedSupplier.account_name !== e.target.value) {
                      setSelectedSupplier(null);
                      setSupplierId('');
                    }
                  }}
                  onFocus={() => setShowSupplierDropdown(true)}
                  className="border border-slate-200 px-4 py-2 text-[13px] bg-white w-80 outline-none rounded-xl focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 transition-all uppercase font-black text-slate-900 shadow-sm"
                  placeholder="SEARCH SUPPLIER NAME..."
                />

                {showSupplierDropdown && (
                  <div className="absolute top-full left-16 bg-white border border-slate-200 shadow-lg w-[400px] max-h-64 overflow-y-auto z-40 rounded-2xl mt-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 border-b bg-slate-900 flex justify-between items-center sticky top-0 rounded-t-2xl">
                      <span className="text-white text-[10px] font-black uppercase tracking-widest px-2">Suppliers</span>
                      <X size={16} className="text-slate-400 cursor-pointer hover:text-red-500 rounded p-0.5 transition-colors" onClick={() => setShowSupplierDropdown(false)} />
                    </div>
                    {availableSuppliers.filter(s => {
                      const codeMatch = supplierCodeSearch ? (String(s.id).includes(supplierCodeSearch) || String(s.phone).includes(supplierCodeSearch)) : true;
                      const nameMatch = supplierNameSearch ? String(s.account_name).toLowerCase().includes(supplierNameSearch.toLowerCase()) : true;
                      return codeMatch && nameMatch;
                    }).map((m) => (
                      <div key={m.id} onClick={() => handleSupplierSelect(m)} className="px-4 py-3 hover:bg-emerald-600 hover:text-white cursor-pointer text-[13px] font-black border-b border-slate-100 last:border-0 transition-colors flex justify-between items-center group uppercase">
                        <span>{m.account_name}</span>
                        <span className="text-[10px] text-slate-400 group-hover:text-slate-300">#{m.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto text-[11px] bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm font-black uppercase tracking-widest">
                <button onClick={() => setPaymentType('cash')} className={`px-4 py-1.5 rounded-xl transition-all ${paymentType === 'cash' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>Cash</button>
                <button onClick={() => setPaymentType('credit')} className={`px-4 py-1.5 rounded-xl transition-all ${paymentType === 'credit' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>Credit</button>
              </div>
            </div>

            {/* Row 2: Bill No, Date, Vehicle */}
            <div className="flex flex-wrap gap-x-8 gap-y-4 px-2 mt-3">
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-600 uppercase tracking-widest text-[11px] w-12 text-right">Bill No :</span>
                <input
                  type="text"
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  className="border border-slate-200 px-4 py-1.5 text-[13px] bg-emerald-600 text-white w-32 outline-none rounded-xl font-mono font-black text-center shadow-sm focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="font-black text-slate-600 uppercase tracking-widest text-[11px]">Date :</span>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="border border-slate-200 px-4 py-2 text-[12px] bg-white w-40 outline-none rounded-xl font-bold shadow-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="font-black text-slate-600 uppercase tracking-widest text-[11px]">Vehicle # :</span>
                <input
                  type="text"
                  value={gadiNumber}
                  onChange={(e) => setGadiNumber(e.target.value)}
                  className="border border-slate-200 px-4 py-1.5 text-[13px] bg-white w-36 outline-none rounded-xl font-black uppercase shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="GADI NO"
                />
              </div>
            </div>

            {/* Row 3: Driver & Mobile */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 px-2 mt-3 items-center">
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-600 uppercase tracking-widest text-[11px] w-12 text-right">Driver :</span>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="border border-slate-200 px-4 py-1.5 text-[13px] bg-white w-44 outline-none rounded-xl font-black uppercase shadow-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  placeholder="DRIVER NAME"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-600 uppercase tracking-widest text-[11px]">Mobile :</span>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="border border-slate-200 px-4 py-1.5 text-[13px] bg-white w-40 outline-none rounded-xl font-black uppercase shadow-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                  placeholder="MOBILE NO"
                />
              </div>
            </div>

            {/* Row 4: Tax Type & State */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 px-2 mt-3 items-center">
              <div className="flex items-center gap-3">
                <span className="font-black text-slate-600 uppercase tracking-widest text-[11px] w-12 text-right">Tax :</span>
                <select
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value)}
                  className="border border-slate-200 px-4 py-1.5 text-[12px] bg-white w-44 outline-none rounded-xl font-black shadow-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all cursor-pointer"
                >
                  <option value="CGST/SGST">LOCAL (CGST/SGST)</option>
                  <option value="IGST">INTERSTATE (IGST)</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-black text-slate-600 uppercase tracking-widest text-[11px]">State :</span>
                <input
                  type="text"
                  value={company?.state_name ? `${company.state_name} (${company.state_code})` : 'GUJARAT (24)'}
                  readOnly
                  className="border border-slate-200 px-4 py-1.5 text-[12px] bg-slate-50 w-44 outline-none rounded-xl font-bold text-slate-600 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* DATA GRID TABLE */}
          <div className="flex-1 bg-white overflow-y-auto flex flex-col font-sans border-b border-slate-200 h-[40vh]">
            <table className="w-full text-[12px] border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-slate-900 text-white font-black text-[10px] border-b border-slate-200 sticky top-0 z-10 shadow-sm uppercase tracking-widest">
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

                    <td className={`p-3 px-2 text-right font-mono text-slate-400 text-[10px] ${taxType === 'CGST/SGST' ? 'bg-slate-50/50' : ''}`}>{taxType === 'IGST' ? '' : row.sgstPercent.toFixed(2)}</td>
                    <td className={`p-3 px-2 text-right font-mono text-slate-700 ${taxType === 'CGST/SGST' ? 'bg-slate-50/50' : ''}`}>{taxType === 'IGST' ? '' : row.sgstAmt.toFixed(1)}</td>

                    <td className="p-3 px-4 text-right font-mono font-black text-black bg-slate-50">{row.totalAmount.toFixed(2)}</td>
                    <td className="p-3 text-center text-slate-300 hover:text-red-500 cursor-pointer font-bold transition-colors" onClick={() => handleRemoveItem(idx)}>
                      <X size={14} />
                    </td>
                  </tr>
                ))}

                {/* Live Input Row */}
                <tr className="bg-emerald-50/30 border-t-2 border-emerald-200 sticky bottom-0 z-20 shadow-[0_-10px_30px_rgba(16,185,129,0.05)]">
                  <td className="p-2 text-center text-[10px] font-black uppercase text-slate-600">New</td>
                  <td className="p-0 relative">
                    <input
                      type="text"
                      ref={itemInputRef}
                      value={itemSearchText}
                      onChange={(e) => {
                        setItemSearchText(e.target.value);
                        setShowItemDropdown(true);
                        setItemSelectedIndex(0);
                      }}
                      onFocus={() => setShowItemDropdown(true)}
                      onKeyDown={handleItemSearchKeyDown}
                      className="w-full h-10 px-4 outline-none border-none text-[12px] bg-white font-black uppercase text-black placeholder:text-slate-400 shadow-inner"
                      placeholder="SEARCH ITEM BY NAME OR CODE..."
                    />
                  </td>
                  <td className="p-0 bg-emerald-100/20">
                    <input
                      type="number"
                      value={currentQty}
                      onChange={(e) => setCurrentQty(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddItem(e)}
                      className="w-full h-10 px-4 text-right outline-none bg-transparent font-black font-mono text-sm focus:bg-white transition-colors"
                      placeholder="0.000"
                    />
                  </td>
                  <td className="p-0 bg-emerald-100/20 border-r border-slate-200">
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
                      <td className="p-2 px-4 text-right font-black font-mono bg-emerald-600 text-white shadow-sm">{livePreview.amount.toFixed(2)}</td>
                      <td className="p-2 px-2 text-right font-mono text-slate-500 bg-white text-[10px]">{taxType === 'IGST' ? livePreview.igstPercent.toFixed(2) : livePreview.cgstPercent.toFixed(2)}</td>
                      <td className="p-2 px-2 text-right font-mono text-slate-700 bg-white">{taxType === 'IGST' ? livePreview.igstAmt.toFixed(1) : livePreview.cgstAmt.toFixed(1)}</td>
                      <td className="p-2 px-2 text-right font-mono text-slate-500 bg-white text-[10px]">{taxType === 'IGST' ? '' : livePreview.sgstPercent.toFixed(2)}</td>
                      <td className="p-2 px-2 text-right font-mono text-slate-700 bg-white">{taxType === 'IGST' ? '' : livePreview.sgstAmt.toFixed(1)}</td>
                      <td className="p-2 px-4 text-right font-black font-mono text-slate-900 bg-emerald-50 border-r border-emerald-200 shadow-sm">{livePreview.totalAmount.toFixed(2)}</td>
                    </>
                  ) : (
                    <td colSpan={taxType === 'IGST' ? 4 : 6} className="bg-slate-50 p-2 text-[10px] text-slate-400 font-black text-center border-r border-slate-200 uppercase tracking-widest italic">
                      [ Enter Qty & Rate ]
                    </td>
                  )}
                  <td className="bg-emerald-600 hover:bg-emerald-700 transition-colors">
                    <button onClick={handleAddItem} className="w-full h-10 text-white font-black text-[10px] uppercase tracking-tighter">Add</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Absolute Item Dropdown - Modern Design */}
          {showItemDropdown && (
            <div
              ref={itemDropdownRef}
              style={{ position: 'fixed', top: `${dropdownPos.top + 5}px`, left: dropdownPos.left || 0, width: dropdownPos.width || 400 }}
              className="bg-white border border-slate-200 shadow-lg max-h-80 overflow-y-auto z-[9999] rounded-2xl animate-in fade-in zoom-in-95 duration-200"
            >
              <div ref={dropdownListRef}>
                <div className="p-3 border-b bg-slate-900 flex justify-between font-black text-white text-[10px] uppercase tracking-widest sticky top-0 items-center rounded-t-2xl">
                  <span>Select Product From Inventory</span>
                  <X size={16} className="cursor-pointer text-slate-400 hover:text-red-500 rounded p-0.5 transition-colors" onClick={() => setShowItemDropdown(false)} />
                </div>
                {availableItems.filter(i => String(i.item_name).toLowerCase().includes(itemSearchText.toLowerCase()) || String(i.item_code).includes(itemSearchText)).map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemSelect(item)}
                    className={`px-4 py-3 border-b border-slate-100 transition-colors flex justify-between items-center group cursor-pointer ${itemSelectedIndex === idx ? 'bg-emerald-600 text-white' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                  >
                    <div>
                      <span className={`text-xs font-black uppercase transition-colors ${itemSelectedIndex === idx ? 'text-white' : 'text-slate-800'}`}>{item.item_name}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${itemSelectedIndex === idx ? 'text-emerald-100' : 'text-slate-400'}`}>Code: {item.item_code} | PR: ₹{item.purchase_price}</span>
                    </div>
                    <div className={`px-2 py-1 rounded border text-[10px] font-black transition-all ${itemSelectedIndex === idx ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-emerald-50 text-black border-emerald-200'
                      }`}>Stock: {item.current_stock || 0}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Summary - Modern Design */}
          <div className="bg-emerald-50 p-4 flex flex-col sm:flex-row justify-between items-start border-t border-emerald-100">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-col gap-0.5">
                <span className="font-black text-slate-400 text-[8px] uppercase tracking-widest">E-way Bill :</span>
                <input type="text" className="bg-emerald-600 border border-emerald-500 px-3 py-1 rounded text-white w-56 outline-none focus:border-emerald-300 transition-all font-mono text-[9px] h-6" placeholder="BILL NO." />
              </div>
              <div className="text-slate-500 text-[8px] font-mono leading-tight tracking-widest uppercase italic opacity-40">
                * GST based on tax selection.
              </div>
            </div>

            <div className="flex gap-4">
              {/* Calculation Breakdown */}
              <div className="flex flex-col gap-0.5 pr-6 border-r border-emerald-200">
                <div className="flex justify-between items-center w-36 py-0.5">
                  <span className="font-black text-emerald-700 text-[8px] uppercase tracking-widest">Base :</span>
                  <span className="font-mono font-black text-slate-900 text-[9px]">{totalBaseAmount.toFixed(2)}</span>
                </div>
                {taxType === 'CGST/SGST' ? (
                  <>
                    <div className="flex justify-between items-center w-36 py-0.5">
                      <span className="font-black text-emerald-700 text-[8px] uppercase tracking-widest">CGST :</span>
                      <span className="font-mono font-black text-slate-900 text-[9px]">{totalCgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center w-36 py-0.5">
                      <span className="font-black text-emerald-700 text-[8px] uppercase tracking-widest">SGST :</span>
                      <span className="font-mono font-black text-slate-900 text-[9px]">{totalSgst.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center w-36 py-0.5">
                    <span className="font-black text-emerald-700 text-[8px] uppercase tracking-widest">IGST :</span>
                    <span className="font-mono font-black text-slate-900 text-[9px]">{totalIgst.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center w-36 py-0.5 border-t border-emerald-200 mt-0.5 pt-0.5">
                  <span className="font-black text-emerald-700 text-[8px] uppercase tracking-widest">Round :</span>
                  <span className={`font-mono font-black text-[9px] ${rounding >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{rounding.toFixed(2)}</span>
                </div>
              </div>

              {/* FINAL BIG TOTAL */}
              <div className="flex flex-col items-end gap-0 pl-4 justify-center">
                <span className="font-black text-emerald-700 text-[7px] uppercase tracking-[0.2em] opacity-70">Net Payable</span>
                <div className="bg-emerald-600 text-white px-4 py-1 rounded-lg shadow-md border border-emerald-500 flex items-center h-8">
                  <span className="text-[18px] font-black font-mono tracking-tighter">₹{netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-emerald-50 p-4 border-t border-emerald-100 flex items-center justify-end gap-3 shadow-sm">
          <button onClick={onCancel} className="px-6 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-black shadow-sm rounded-xl transition-all active:scale-95 text-[9px] uppercase tracking-widest">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} className="px-8 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-black shadow-md rounded-xl transition-all active:scale-95 text-[10px] uppercase tracking-widest">
            {loading ? 'Processing...' : 'Confirm & Save'}
          </button>
        </div>

      </div>
    </div>
  );
}
