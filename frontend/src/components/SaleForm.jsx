import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Search, Calendar, Hash, User, Truck, 
  CreditCard, Info, Trash2, Save, ShoppingBag,
  Loader, Package, TrendingUp, AlertCircle, CheckCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';

export default function SaleForm({ onSubmit, onCancel }) {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const translateServerMessage = (message) => {
    if (!message || !isGu) return message;

    const text = String(message);
    const lower = text.toLowerCase();

    if (/please add at least one item/.test(lower)) return 'ઓછામાં ઓછું એક આઇટમ ઉમેરો.';
    if (/please select a vendor node/.test(lower)) return 'કૃપા કરીને વેન્ડર પસંદ કરો.';
    if (/failed to save/i.test(lower)) return 'સાચવવામાં નિષ્ફળ. કૃપા કરીને ફરી પ્રયાસ કરો.';
    if (/validation/.test(lower)) return 'કૃપા કરીને નીચેની ભૂલો સુધારો.';
    if (/company.*required/.test(lower)) return 'કંપની આવશ્યક છે.';
    if (/customer.*required/.test(lower)) return 'ગ્રાહક આવશ્યક છે.';
    if (/invoice.*required/.test(lower)) return 'ઇન્વોઇસ નંબર આવશ્યક છે.';
    if (/date.*required/.test(lower)) return 'તારીખ આવશ્યક છે.';
    if (/item.*required/.test(lower)) return 'વસ્તુ પસંદ કરવી આવશ્યક છે.';
    if (/qty|quantity.*required/.test(lower)) return 'જથ્થો આવશ્યક છે.';
    if (/rate.*required/.test(lower)) return 'દર આવશ્યક છે.';

    return text;
  };

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
  const [memberSelectedIndex, setMemberSelectedIndex] = useState(0);

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

  const displayMemberName = (member) => {
    if (!member) return '';
    return isGu
      ? (member.account_name_gu || member.account_name || '')
      : (member.account_name || member.account_name_gu || '');
  };

  const displayItemName = (item) => {
    if (!item) return '';
    return isGu
      ? (item.item_name_gu || item.item_name || '')
      : (item.item_name || item.item_name_gu || '');
  };

  // Filter members by code or name
  const getFilteredMembers = () => {
    const codeQ = memberSearchText.trim().toLowerCase();
    const nameQ = memberNameSearch.trim().toLowerCase();
    
    if (codeQ) {
      return availableMembers.filter(m => 
        String(m.account_code || m.id).toLowerCase().includes(codeQ)
      );
    }
    
    if (nameQ) {
      return availableMembers.filter(m => 
        displayMemberName(m).toLowerCase().includes(nameQ) || 
        (m.account_name || '').toLowerCase().includes(nameQ) || 
        (m.account_name_gu || '').toLowerCase().includes(nameQ)
      );
    }
    
    return availableMembers;
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
      const res = await api.get(`/sales?type=${salesType}`);
      const prefix = 'SL';
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
      const compRes = await api.get('/company');
      if (compRes.data.success && compRes.data.data) {
        const comp = compRes.data.data;
        setCompany(comp);
        const accRes = await api.get(`/accounts/company/${comp.id}`);
        if (accRes.data.success) {
          const vendorList = (accRes.data.data || []).filter(acc => ['customer', 'vendor', 'supplier'].includes(acc.account_type));
          setAvailableMembers(vendorList);
        }
        const itemRes = await api.get(`/items/company/${comp.id}?active=true`);
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
    // Disabled auto-fetch on code - user must select from dropdown or use keyboard nav
    // if (memberSearchText) {
    //   const match = availableMembers.find(m => String(m.account_code) === memberSearchText || String(m.id) === memberSearchText);
    //   if (match) {
    //     setSelectedMember(match);
    //     setMemberId(match.id);
    //     setMemberNameSearch(displayMemberName(match));
    //     setShowMemberDropdown(false);
    //   }
    // }
  }, [memberSearchText, availableMembers, isGu]);

  useEffect(() => {
    if (selectedMember) {
      setMemberNameSearch(displayMemberName(selectedMember));
    }
  }, [selectedMember, isGu]);

  // Auto-fetch item if code matches exactly
  useEffect(() => {
    if (itemSearchText && !currentItem) {
      const match = availableItems.find(i => String(i.item_code).toUpperCase() === itemSearchText.toUpperCase());
      if (match) {
        handleItemSelect(match);
      }
    }
  }, [itemSearchText, availableItems, currentItem]);

  const handleAddItem = (e) => {
    if (e) e.preventDefault();
    if (!currentItem || !currentWeight || currentWeight <= 0) {
      setError(translateServerMessage('Please select an item and enter a valid quantity.'));
      return;
    }
    const rate = currentRate !== '' ? parseFloat(currentRate) : (currentItem.sale_rate || 0);
    const amount = calculateRowAmount(currentWeight, rate);
    setSaleItems([...saleItems, { ...currentItem, weight: parseFloat(currentWeight), quantity: parseFloat(currentQty) || 0, rate, amount, totalAmount: amount }]);
    setCurrentItem(null); setItemSearchText(''); setCurrentWeight(''); setCurrentQty(''); setCurrentRate('');
    if (itemInputRef.current) itemInputRef.current.focus();
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member); 
    setMemberId(member.id); 
    setMemberSearchText(String(member.account_code || member.id)); 
    setMemberNameSearch(displayMemberName(member)); 
    setShowMemberDropdown(false);
    setMemberSelectedIndex(0);
    setTimeout(() => focusNext(billNoRef), 0);
  };

  const handleMemberKeyDown = (e) => {
    if (!showMemberDropdown) {
      if (e.key === 'Enter') {
        setShowMemberDropdown(true);
        setMemberSelectedIndex(0);
      }
      return;
    }

    const filtered = getFilteredMembers();
    if (filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMemberSelectedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMemberSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleMemberSelect(filtered[memberSelectedIndex]);
    } else if (e.key === 'Escape') {
      setShowMemberDropdown(false);
    }
  };

  const handleItemSelect = (item) => {
    setCurrentItem(item); setItemSearchText(displayItemName(item));
    setCurrentRate(item.sale_rate || item.sale_price || '');
    setShowItemDropdown(false); setItemSelectedIndex(0);
  };

  const totalBaseAmount = saleItems.reduce((sum, row) => sum + row.amount, 0);
  const brokerageAmt = totalBaseAmount * ((parseFloat(brokeragePercent) || 0) / 100);
  const labourAmt = parseFloat(labourCharge) || 0;
  const netAmount = Math.round(totalBaseAmount - brokerageAmt - labourAmt);

  const handleSave = async () => {
    if (saleItems.length === 0) { setError(translateServerMessage('Please add at least one item.')); return; }
    if (salesType === 'credit' && !selectedMember) { setError(translateServerMessage('Please select a Vendor Node.')); return; }
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
      const response = await api.post('/sales/weight-based', payload);
      if (response.data.success) {
        setSuccess(t('saleForm.messages.success'));
        setTimeout(() => { if (onSubmit) onSubmit(response.data.data); }, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.error || t('saleForm.errors.failedSave'));
      setError(translateServerMessage(err.response?.data?.error || t('saleForm.errors.failedSave')));
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px]" onClick={() => !loading && onCancel()}></div>
      
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-6xl shadow-xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[95vh] font-sans text-xs select-none">
        
        {/* Modal Header */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={15} className="text-[#1d5f84]" />
            <h2 className={`text-xs font-bold tracking-wider text-slate-800 uppercase ${isGu ? 'font-prompt' : ''}`}>
              {t('saleForm.title')}
            </h2>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition rounded-md cursor-pointer">
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-white">
          {error && (
            <div className="p-2.5 border border-rose-200 bg-rose-50 text-rose-800 flex items-center gap-2 rounded-md">
              <AlertCircle size={14} />
              <span className="font-bold uppercase tracking-widest leading-none">• {error}</span>
            </div>
          )}
          {success && (
            <div className="p-2.5 border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-2 rounded-md">
              <CheckCircle size={14} />
              <span className="font-bold uppercase tracking-widest leading-none">• {success}</span>
            </div>
          )}

          {/* Primary Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/50 border border-slate-200 rounded-md p-4">
            <div className="flex flex-col gap-1" ref={memberDropdownRef}>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('saleForm.targetVendor')}</label>
              <div className="flex gap-2 relative">
                <div className="relative w-20">
                  <input
                    type="text"
                    placeholder={t('saleForm.code')}
                    ref={memberRef}
                    onKeyDown={handleMemberKeyDown}
                    value={memberSearchText}
                    onChange={e => { setMemberSearchText(e.target.value); setMemberNameSearch(''); setShowMemberDropdown(true); setMemberSelectedIndex(0); }}
                    className="w-full text-center border border-slate-200 bg-white px-2 py-1.5 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-800 uppercase h-9 rounded-md force-en"
                  />
                  {showMemberDropdown && memberSearchText && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 min-w-max">
                      {getFilteredMembers().map((m, idx) => (
                        <div 
                          key={m.id} 
                          onClick={() => handleMemberSelect(m)} 
                          className={`p-2 cursor-pointer flex justify-between items-center gap-2 ${idx === memberSelectedIndex ? 'bg-[#1d5f84]/10 border-l-2 border-[#1d5f84]' : 'hover:bg-slate-50'}`}
                        >
                          <span className={`text-xs font-bold text-slate-800 tracking-wider ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>{displayMemberName(m)}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">#{m.account_code || m.id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={t('saleForm.searchVendor')}
                    value={memberNameSearch}
                    onChange={e => { setMemberNameSearch(e.target.value); setMemberSearchText(''); setShowMemberDropdown(true); setMemberSelectedIndex(0); }}
                    onKeyDown={handleMemberKeyDown}
                    translate="no"
                    className={`w-full border border-slate-200 bg-white px-2.5 py-1.5 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-800 h-9 rounded-md ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}
                  />
                  {showMemberDropdown && memberNameSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {getFilteredMembers().map((m, idx) => (
                        <div 
                          key={m.id} 
                          onClick={() => handleMemberSelect(m)} 
                          className={`p-2 cursor-pointer flex justify-between items-center ${idx === memberSelectedIndex ? 'bg-[#1d5f84]/10 border-l-2 border-[#1d5f84]' : 'hover:bg-slate-50'}`}
                        >
                          <span className={`text-xs font-bold text-slate-800 tracking-wider ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>{displayMemberName(m)}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">#{m.account_code || m.id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('saleForm.billNoDate')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('saleForm.billNo')}
                  ref={billNoRef}
                  onKeyDown={e => e.key === 'Enter' && focusNext(dateRef)}
                  value={billNo}
                  onChange={e => setBillNo(e.target.value)}
                  className="w-1/3 border border-slate-200 bg-slate-50 text-[#1d5f84] px-2.5 py-1.5 focus:bg-white focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold h-9 uppercase force-en rounded-md"
                />
                <input
                  type="date"
                  ref={dateRef}
                  onKeyDown={e => e.key === 'Enter' && focusNext(gadiRef)}
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="flex-1 border border-slate-200 bg-white px-2.5 py-1.5 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 h-9 force-en rounded-md"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className={`text-[10px] font-bold text-slate-500 tracking-widest ${isGu ? 'font-sans' : 'uppercase'}`}>{t('saleForm.vehicleContext')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('saleForm.gadiNo')}
                  ref={gadiRef}
                  onKeyDown={e => e.key === 'Enter' && focusNext(driverRef)}
                  value={gadiNumber}
                  onChange={e => setGadiNumber(e.target.value)}
                  className={`w-1/2 border border-slate-200 bg-white px-2.5 py-1.5 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-800 h-9 rounded-md ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}
                />
                <input
                  type="text"
                  placeholder={t('saleForm.driver')}
                  ref={driverRef}
                  onKeyDown={e => e.key === 'Enter' && focusNext(mobileRef)}
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                  className={`w-1/2 border border-slate-200 bg-white px-2.5 py-1.5 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-800 h-9 rounded-md ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
             <div className="bg-white border border-slate-200 rounded-md p-3 flex flex-col gap-1">
                <label className={`text-[10px] font-bold text-slate-500 tracking-widest ${isGu ? 'font-sans' : 'uppercase'}`}>{t('saleForm.registryLogic')}</label>
                <div className="flex border border-slate-200 p-1 bg-slate-50 rounded-md">
                    <button onClick={() => setSalesType('credit')} className={`flex-1 py-1.5 text-[10px] font-bold transition rounded ${isGu ? 'font-sans' : 'uppercase'} ${salesType === 'credit' ? 'bg-white border border-slate-200 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{t('saleForm.credit')}</button>
                    <button onClick={() => setSalesType('cash')} className={`flex-1 py-1.5 text-[10px] font-bold transition rounded ${isGu ? 'font-sans' : 'uppercase'} ${salesType === 'cash' ? 'bg-white border border-slate-200 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{t('saleForm.cash')}</button>
                 </div>
             </div>
             <div className="bg-white border border-slate-200 rounded-md p-3 flex flex-col gap-1 md:col-span-3">
                <label className={`text-[10px] font-bold text-slate-500 tracking-widest ${isGu ? 'font-sans' : 'uppercase'}`}>{t('saleForm.mobileTracking')}</label>
                <input
                   type="text"
                   ref={mobileRef}
                   placeholder={t('saleForm.enterMobile')}
                   onKeyDown={e => e.key === 'Enter' && focusNext(itemInputRef)}
                   value={mobileNumber}
                   onChange={e => setMobileNumber(e.target.value)}
                   className="w-full border border-slate-200 bg-white px-2.5 py-1.5 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-800 h-9 uppercase rounded-md force-en"
                />
             </div>
          </div>

          {/* Item Matrix Grid */}
          <div className="bg-white border border-slate-200 rounded-md flex flex-col min-h-[300px] overflow-hidden">
            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
              <span className={`text-[10px] font-bold text-slate-700 tracking-widest ${isGu ? 'font-sans' : 'uppercase'}`}>{t('saleForm.inventoryMatrix')}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{saleItems.length} {t('saleForm.nodes')}</span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <th className="px-4 py-2 border-r border-slate-200">{t('saleForm.table.itemDescription')}</th>
                    <th className="w-24 px-4 py-2 border-r border-slate-200 text-right">{t('saleForm.table.qty')}</th>
                    <th className="w-24 px-4 py-2 border-r border-slate-200 text-right">{t('saleForm.table.weight')}</th>
                    <th className="w-28 px-4 py-2 border-r border-slate-200 text-right">{t('saleForm.table.rate')}</th>
                    <th className="w-32 px-4 py-2 border-r border-slate-200 text-right">{t('saleForm.table.amount')}</th>
                    <th className="w-12 px-4 py-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {saleItems.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className={`px-4 py-1.5 border-r border-slate-200 font-bold text-slate-800 tracking-tight ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>
                        {displayItemName(row)} <span className="text-[10px] font-mono text-slate-400 font-normal">({row.item_code})</span>
                      </td>
                      <td className="px-4 py-1.5 border-r border-slate-200 text-right font-bold text-slate-600 force-en">{row.quantity}</td>
                      <td className="px-4 py-1.5 border-r border-slate-200 text-right font-bold text-slate-900 force-en italic">{row.weight.toFixed(3)}</td>
                      <td className="px-4 py-1.5 border-r border-slate-200 text-right font-bold text-slate-500 force-en">{row.rate.toFixed(2)}</td>
                      <td className="px-4 py-1.5 border-r border-slate-200 text-right font-bold text-slate-900 force-en bg-slate-50">₹{row.amount.toFixed(2)}</td>
                      <td className="px-4 py-1.5 text-center">
                        <button onClick={() => setSaleItems(saleItems.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-600"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  ))}
                  {/* Live Input Row */}
                  <tr className="bg-slate-50/50 sticky bottom-0">
                    <td className="p-1 border-r border-slate-200 relative" ref={itemDropdownRef}>
                      <input
                        type="text"
                        ref={itemInputRef}
                        placeholder={t('saleForm.selectSku')}
                        onKeyDown={e => e.key === 'Enter' && focusNext(weightRef)}
                        value={itemSearchText}
                        onChange={e => { setItemSearchText(e.target.value); setShowItemDropdown(true); }}
                        className={`w-full px-3 py-2 bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none font-bold text-slate-800 h-9 rounded-md ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}
                      />
                      {showItemDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-xl z-50 max-h-48 overflow-y-auto">
                          {availableItems.filter(i => 
                            displayItemName(i).toLowerCase().includes(itemSearchText.toLowerCase()) ||
                            (i.item_name || '').toLowerCase().includes(itemSearchText.toLowerCase()) ||
                            (i.item_name_gu || '').toLowerCase().includes(itemSearchText.toLowerCase()) ||
                            (i.item_code && i.item_code.toLowerCase().includes(itemSearchText.toLowerCase()))
                          ).map(item => (
                            <div key={item.id} onClick={() => handleItemSelect(item)} className="p-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center group border-b border-slate-100 last:border-0">
                              <span className={`text-xs font-bold text-slate-700 tracking-wider ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>{displayItemName(item)}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono group-hover:text-[#1d5f84]">{item.item_code}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-1 border-r border-slate-200">
                      <input type="number" placeholder={t('saleForm.table.qty')} value={currentQty} onChange={e => setCurrentQty(e.target.value)} className="w-full px-2 py-2 bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] text-right outline-none font-bold font-mono text-slate-800 h-9 rounded-md" />
                    </td>
                    <td className="p-1 border-r border-slate-200">
                      <input type="number" ref={weightRef} placeholder="0.000" onKeyDown={e => e.key === 'Enter' && focusNext(rateRef)} value={currentWeight} onChange={e => setCurrentWeight(e.target.value)} className="w-full px-2 py-2 bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] text-right outline-none font-bold font-mono text-slate-800 h-9 rounded-md" />
                    </td>
                    <td className="p-1 border-r border-slate-200">
                      <input type="number" ref={rateRef} placeholder="0.00" onKeyDown={e => e.key === 'Enter' && handleAddItem(e)} value={currentRate} onChange={e => setCurrentRate(e.target.value)} className="w-full px-2 py-2 bg-white border border-slate-200 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] text-right outline-none font-bold font-mono text-slate-800 h-9 rounded-md" />
                    </td>
                    <td className="p-1 border-r border-slate-200 bg-slate-100 text-center text-[10px] font-bold text-slate-400 uppercase italic font-prompt">
                       {currentItem ? `₹${calculateRowAmount(parseFloat(currentWeight)||0, parseFloat(currentRate)||currentItem.sale_rate||0).toFixed(2)} ${t('saleForm.preview')}` : t('saleForm.configureRow')}
                    </td>
                    <td className="p-1 text-center">
                      <button onClick={handleAddItem} className="w-full bg-slate-800 text-white h-9 font-bold uppercase text-[10px] hover:bg-slate-900 transition tracking-widest shadow-sm rounded-md">{t('saleForm.add')}</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Matrix Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-between items-center">
               <div className="flex gap-6">
                  <div className="flex flex-col gap-1">
                     <label className={`text-[8px] font-bold text-slate-400 tracking-widest ${isGu ? 'font-sans' : 'uppercase'}`}>{t('saleForm.brokeragePercent')}</label>
                     <input type="number" value={brokeragePercent} onChange={e => setBrokeragePercent(e.target.value)} className="w-16 bg-white border border-slate-200 px-2 py-1 text-right font-bold font-mono text-xs outline-none rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84]" placeholder="0" />
                  </div>
                  <div className="flex flex-col gap-1">
                     <label className={`text-[8px] font-bold text-slate-400 tracking-widest ${isGu ? 'font-sans' : 'uppercase'}`}>{t('saleForm.labourCharge')}</label>
                     <input type="number" value={labourCharge} onChange={e => setLabourCharge(e.target.value)} className="w-20 bg-white border border-slate-200 px-2 py-1 text-right font-bold font-mono text-xs outline-none rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84]" placeholder="0" />
                  </div>
               </div>
               <div className="flex flex-col items-end">
                  <span className={`text-[10px] font-bold text-[#1d5f84] tracking-[0.2em] ${isGu ? 'font-sans' : 'uppercase'}`}>{t('saleForm.netReceiptLedger')}</span>
                  <span className="text-2xl font-bold text-slate-800 force-en italic tracking-tighter">₹{netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
           <p className={`text-[10px] font-bold text-slate-400 italic ${isGu ? 'font-sans' : 'uppercase tracking-widest'}`}>
              * {t('saleForm.logicApplied')}
           </p>
           <div className="flex gap-3">
              <button onClick={onCancel} className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition rounded-md uppercase text-[10px] tracking-widest shadow-sm">
                {t('saleForm.cancel')}
              </button>
              <button onClick={handleSave} disabled={loading} className="px-8 py-2 bg-[#1d5f84] border border-[#1d5f84] hover:bg-[#154662] text-white font-bold transition rounded-md uppercase flex items-center justify-center gap-2 text-[10px] tracking-widest shadow-sm disabled:opacity-50">
                {loading ? <Loader className="animate-spin" size={14} /> : <><Save size={14} /> {t('saleForm.confirmPost')}</>}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

