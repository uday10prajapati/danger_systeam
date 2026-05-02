import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Search, Calendar, Hash, User, Truck, 
  CreditCard, Info, Trash2, Save, ShoppingBag,
  Loader, Package, TrendingUp, AlertCircle, CheckCircle
} from 'lucide-react';
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

  // Input Refs for traversal
  const memberRef = useRef(null);
  const billNoRef = useRef(null);
  const dateRef = useRef(null);
  const gadiRef = useRef(null);
  const driverRef = useRef(null);
  const mobileRef = useRef(null);
  const itemInputRef = useRef(null);
  const weightRef = useRef(null);
  const rateRef = useRef(null);
  const memberDropdownRef = useRef(null);
  const itemDropdownRef = useRef(null);

  const focusNext = (ref) => {
    if (ref && ref.current) ref.current.focus();
  };

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
        if (showItemDropdown) { setShowItemDropdown(false); return; }
        if (showMemberDropdown) { setShowMemberDropdown(false); return; }
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
      const res = await axios.get(`/api/sales?type=${salesType}`, { headers: { 'x-company-id': company.id } });
      const prefix = salesType === 'cash' ? 'CS' : 'CR';
      if (res.data.success && res.data.data && res.data.data.length > 0) {
        const typedSales = res.data.data.filter(s => String(s.invoice_no).startsWith(prefix));
        if (typedSales.length > 0) {
          const lastInv = typedSales[typedSales.length - 1].invoice_no;
          const matches = String(lastInv).match(/(\d+)/);
          const lastNo = matches ? parseInt(matches[0]) : 0;
          setBillNo(`${prefix}${String(lastNo + 1).padStart(6, '0')}`);
        } else {
          setBillNo(`${prefix}000001`);
        }
      } else {
        setBillNo(`${prefix}000001`);
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
    } catch (err) { console.error(err); }
  };

  const calculateRowAmount = (weight, rate) => {
    const w = parseFloat(weight) || 0;
    const r = parseFloat(rate) || 0;
    if (w === 0 || r === 0) return 0;
    return (w * r / 140) * 100;
  };

  useEffect(() => {
    if (memberSearchText) {
      const match = availableMembers.find(m => String(m.account_code) === memberSearchText || String(m.id) === memberSearchText);
      if (match) {
        setSelectedMember(match);
        setMemberId(match.id);
        setMemberNameSearch(match.account_name);
        setShowMemberDropdown(false);
      }
    }
  }, [memberSearchText, availableMembers]);

  const handleAddItem = (e) => {
    if (e) e.preventDefault();
    if (!currentItem || !currentWeight || currentWeight <= 0) return;
    const rate = currentRate !== '' ? parseFloat(currentRate) : (currentItem.sale_rate || 0);
    const amount = calculateRowAmount(currentWeight, rate);
    setSaleItems([...saleItems, { ...currentItem, weight: parseFloat(currentWeight), quantity: parseFloat(currentQty) || 0, rate, amount, totalAmount: amount }]);
    setCurrentItem(null); setItemSearchText(''); setCurrentWeight(''); setCurrentQty(''); setCurrentRate('');
    if (itemInputRef.current) itemInputRef.current.focus();
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member); setMemberId(member.id); setMemberSearchText(String(member.account_code || member.id)); setMemberNameSearch(member.account_name); setShowMemberDropdown(false);
  };

  const handleItemSelect = (item) => {
    setCurrentItem(item); setItemSearchText(`${item.item_name}`);
    setCurrentRate(item.sale_rate || item.sale_price || '');
    setShowItemDropdown(false); setItemSelectedIndex(0);
  };

  const totalBaseAmount = saleItems.reduce((sum, row) => sum + row.amount, 0);
  const brokerageAmt = totalBaseAmount * ((parseFloat(brokeragePercent) || 0) / 100);
  const labourAmt = parseFloat(labourCharge) || 0;
  const netAmount = Math.round(totalBaseAmount - brokerageAmt - labourAmt);

  const handleSave = async () => {
    if (saleItems.length === 0) { setError("Please add at least one item."); return; }
    if (salesType === 'credit' && !selectedMember) { setError("Please select a Vendor Node."); return; }
    setLoading(true); setError(null);
    try {
      const payload = {
        customer_account_id: selectedMember ? selectedMember.id : null,
        invoice_no: billNo, invoice_date: invoiceDate,
        payment_type: salesType, driver_name: driverName, mobile_number: mobileNumber, gadi_number: gadiNumber,
        brokerage_percent: parseFloat(brokeragePercent) || 0, brokerage_amount: brokerageAmt, labour_charge: labourAmt,
        items: saleItems.map(row => ({
          item_id: row.id, quantity: row.quantity, weight: row.weight, sale_rate: row.rate, amount: row.amount
        }))
      };
      const res = await axios.post('/api/sales/weight-based', payload, { headers: { 'x-company-id': company.id, 'x-user-id': 1 } });
      if (res.data.success) {
        setSuccess("Sale Manifest Synchronized Successfully.");
        setTimeout(() => { if (onSubmit) onSubmit(res.data.data); }, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save sale');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-none" onClick={() => !loading && onCancel()}></div>
      
      <div className="bg-white border border-zinc-400 rounded-none w-full max-w-6xl shadow-lg relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[95vh] font-mono text-xs select-none">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-blue-600" />
            <h2 className="text-sm font-bold tracking-tight text-zinc-800 uppercase">
              NEW SALES REGISTRY (WEIGHT-BASED)
            </h2>
          </div>
          <button onClick={onCancel} className="p-1 text-zinc-400 hover:text-red-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-zinc-50">
          {error && (
            <div className="p-3 border border-red-300 bg-red-50 text-red-800 flex items-center gap-2">
              <AlertCircle size={15} />
              <span className="font-bold uppercase tracking-widest leading-none">• {error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 border border-emerald-300 bg-emerald-50 text-emerald-800 flex items-center gap-2">
              <CheckCircle size={15} />
              <span className="font-bold uppercase tracking-widest leading-none">• {success}</span>
            </div>
          )}

          {/* Primary Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white border border-zinc-300 p-4">
            <div className="flex flex-col gap-1" ref={memberDropdownRef}>
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Vendor (Client) *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="CODE"
                  ref={memberRef}
                  onKeyDown={e => e.key === 'Enter' && focusNext(billNoRef)}
                  value={memberSearchText}
                  onChange={e => { setMemberSearchText(e.target.value); setShowMemberDropdown(true); }}
                  className="w-20 text-center border border-zinc-300 bg-zinc-50 px-2 py-1.5 focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800 uppercase h-9"
                />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="SEARCH VENDOR NAME..."
                    value={memberNameSearch}
                    onChange={e => { setMemberNameSearch(e.target.value); setShowMemberDropdown(true); }}
                    className="w-full border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800 h-9 uppercase"
                  />
                  {showMemberDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-300 shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-zinc-200">
                      {availableMembers.filter(m => m.account_name.toLowerCase().includes(memberNameSearch.toLowerCase())).map(m => (
                        <div key={m.id} onClick={() => handleMemberSelect(m)} className="p-2 hover:bg-zinc-50 cursor-pointer flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-800 uppercase">{m.account_name}</span>
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">#{m.account_code || m.id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Bill No / Date *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="BILL #"
                  ref={billNoRef}
                  onKeyDown={e => e.key === 'Enter' && focusNext(dateRef)}
                  value={billNo}
                  onChange={e => setBillNo(e.target.value)}
                  className="w-1/3 border border-zinc-300 bg-blue-50 text-blue-700 px-2.5 py-1.5 focus:bg-white outline-none transition font-bold h-9 uppercase"
                />
                <input
                  type="date"
                  ref={dateRef}
                  onKeyDown={e => e.key === 'Enter' && focusNext(gadiRef)}
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="flex-1 border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-700 h-9"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Vehicle Context</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="GADI #"
                  ref={gadiRef}
                  onKeyDown={e => e.key === 'Enter' && focusNext(driverRef)}
                  value={gadiNumber}
                  onChange={e => setGadiNumber(e.target.value)}
                  className="w-1/2 border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 focus:bg-white outline-none transition font-bold text-zinc-800 h-9 uppercase"
                />
                <input
                  type="text"
                  placeholder="DRIVER"
                  ref={driverRef}
                  onKeyDown={e => e.key === 'Enter' && focusNext(mobileRef)}
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                  className="w-1/2 border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 focus:bg-white outline-none transition font-bold text-zinc-800 h-9 uppercase"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
             <div className="bg-white border border-zinc-300 p-3 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Registry Logic</label>
                <div className="flex border border-zinc-200 p-1 bg-zinc-50">
                   <button onClick={() => setSalesType('credit')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase transition ${salesType === 'credit' ? 'bg-white border border-zinc-300 text-zinc-800 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>Credit</button>
                   <button onClick={() => setSalesType('cash')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase transition ${salesType === 'cash' ? 'bg-white border border-zinc-300 text-zinc-800 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>Cash</button>
                </div>
             </div>
             <div className="bg-white border border-zinc-300 p-3 flex flex-col gap-1 md:col-span-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Mobile Tracking</label>
                <input
                   type="text"
                   ref={mobileRef}
                   placeholder="ENTER MOBILE NUMBER..."
                   onKeyDown={e => e.key === 'Enter' && focusNext(itemInputRef)}
                   value={mobileNumber}
                   onChange={e => setMobileNumber(e.target.value)}
                   className="w-full border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800 h-9 uppercase"
                />
             </div>
          </div>

          {/* Item Matrix Grid */}
          <div className="bg-white border border-zinc-300 flex flex-col min-h-[300px]">
            <div className="bg-zinc-100 px-3 py-2 border-b border-zinc-300 flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">Sales Inventory Matrix</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{saleItems.length} Nodes</span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    <th className="px-4 py-2 border-r border-zinc-200">Item Description</th>
                    <th className="w-24 px-4 py-2 border-r border-zinc-200 text-right">Qty</th>
                    <th className="w-24 px-4 py-2 border-r border-zinc-200 text-right">Weight</th>
                    <th className="w-28 px-4 py-2 border-r border-zinc-200 text-right">Rate</th>
                    <th className="w-32 px-4 py-2 border-r border-zinc-200 text-right">Amount</th>
                    <th className="w-12 px-4 py-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {saleItems.map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-1.5 border-r border-zinc-200 font-bold text-zinc-800 uppercase tracking-tight">{row.item_name} ({row.item_code})</td>
                      <td className="px-4 py-1.5 border-r border-zinc-200 text-right font-bold text-zinc-600 font-mono">{row.quantity}</td>
                      <td className="px-4 py-1.5 border-r border-zinc-200 text-right font-bold text-zinc-900 font-mono italic">{row.weight.toFixed(3)}</td>
                      <td className="px-4 py-1.5 border-r border-zinc-200 text-right font-bold text-zinc-500 font-mono">{row.rate.toFixed(2)}</td>
                      <td className="px-4 py-1.5 border-r border-zinc-200 text-right font-bold text-zinc-900 font-mono bg-zinc-50">₹{row.amount.toFixed(2)}</td>
                      <td className="px-4 py-1.5 text-center">
                        <button onClick={() => setSaleItems(saleItems.filter((_, i) => i !== idx))} className="text-zinc-400 hover:text-red-600"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                  {/* Live Input Row */}
                  <tr className="bg-zinc-50/50 sticky bottom-0">
                    <td className="p-1 border-r border-zinc-200 relative" ref={itemDropdownRef}>
                      <input
                        type="text"
                        ref={itemInputRef}
                        placeholder="SELECT SKU NODE..."
                        onKeyDown={e => e.key === 'Enter' && focusNext(weightRef)}
                        value={itemSearchText}
                        onChange={e => { setItemSearchText(e.target.value); setShowItemDropdown(true); }}
                        className="w-full px-3 py-2 bg-white border border-zinc-300 focus:border-zinc-500 outline-none font-bold text-zinc-800 h-9 uppercase"
                      />
                      {showItemDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-300 shadow-2xl z-50 max-h-48 overflow-y-auto">
                          {availableItems.filter(i => i.item_name.toLowerCase().includes(itemSearchText.toLowerCase())).map(item => (
                            <div key={item.id} onClick={() => handleItemSelect(item)} className="p-2 hover:bg-zinc-50 cursor-pointer flex justify-between items-center">
                              <span className="text-xs font-bold text-zinc-700 uppercase">{item.item_name}</span>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase">SR: ₹{item.sale_rate || item.sale_price}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-1 border-r border-zinc-200">
                      <input type="number" placeholder="QTY" value={currentQty} onChange={e => setCurrentQty(e.target.value)} className="w-full px-2 py-2 bg-white border border-zinc-300 focus:border-zinc-500 text-right outline-none font-bold font-mono text-zinc-800 h-9" />
                    </td>
                    <td className="p-1 border-r border-zinc-200">
                      <input type="number" ref={weightRef} placeholder="0.000" onKeyDown={e => e.key === 'Enter' && focusNext(rateRef)} value={currentWeight} onChange={e => setCurrentWeight(e.target.value)} className="w-full px-2 py-2 bg-white border border-zinc-300 focus:border-zinc-500 text-right outline-none font-bold font-mono text-zinc-800 h-9" />
                    </td>
                    <td className="p-1 border-r border-zinc-200">
                      <input type="number" ref={rateRef} placeholder="0.00" onKeyDown={e => e.key === 'Enter' && handleAddItem(e)} value={currentRate} onChange={e => setCurrentRate(e.target.value)} className="w-full px-2 py-2 bg-white border border-zinc-300 focus:border-zinc-500 text-right outline-none font-bold font-mono text-zinc-800 h-9" />
                    </td>
                    <td className="p-1 border-r border-zinc-200 bg-zinc-100 text-center text-[10px] font-bold text-zinc-400 uppercase italic">
                       {currentItem ? `₹${calculateRowAmount(parseFloat(currentWeight)||0, parseFloat(currentRate)||currentItem.sale_rate||0).toFixed(2)} PREVIEW` : '[ CONFIGURE ROW ]'}
                    </td>
                    <td className="p-1 text-center">
                      <button onClick={handleAddItem} className="w-full bg-zinc-800 text-white h-9 font-bold uppercase text-[10px] hover:bg-zinc-900 transition tracking-widest shadow-sm">Add</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Matrix Footer */}
            <div className="bg-zinc-100 border-t border-zinc-300 px-5 py-3 flex justify-between items-center">
               <div className="flex gap-6">
                  <div className="flex flex-col gap-1">
                     <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Brokerage %</label>
                     <input type="number" value={brokeragePercent} onChange={e => setBrokeragePercent(e.target.value)} className="w-16 bg-white border border-zinc-300 px-2 py-1 text-right font-bold font-mono text-xs outline-none" placeholder="0" />
                  </div>
                  <div className="flex flex-col gap-1">
                     <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Labour Chg</label>
                     <input type="number" value={labourCharge} onChange={e => setLabourCharge(e.target.value)} className="w-20 bg-white border border-zinc-300 px-2 py-1 text-right font-bold font-mono text-xs outline-none" placeholder="0" />
                  </div>
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">Net Receipt Ledger</span>
                  <span className="text-2xl font-bold text-zinc-800 font-mono italic tracking-tighter">₹{netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-5 py-4 border-t border-zinc-200 bg-zinc-100 flex items-center justify-between shadow-inner">
           <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">
              * (Weight * Rate / 140) * 100 Logic Applied.
           </p>
           <div className="flex gap-3">
              <button onClick={onCancel} className="px-5 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition rounded-none uppercase text-[10px] tracking-widest shadow-sm">
                Cancel
              </button>
              <button onClick={handleSave} disabled={loading} className="px-8 py-2 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold transition rounded-none uppercase flex items-center justify-center gap-2 text-[10px] tracking-widest shadow-sm">
                {loading ? <Loader className="animate-spin" size={14} /> : <><Save size={14} /> Confirm & Post</>}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
