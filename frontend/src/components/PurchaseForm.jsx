import React, { useState, useEffect, useRef } from 'react';
import {
  X, Search, Calendar, Hash, User, Truck,
  CreditCard, Info, Trash2, Save, ShoppingCart,
  Loader, Package, TrendingUp, AlertCircle, CheckCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';

export default function PurchaseForm({ onSubmit, onCancel }) {
  const { t, i18n } = useTranslation();
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

  // Input Refs for traversal
  const supplierRef = useRef(null);
  const billNoRef = useRef(null);
  const dateRef = useRef(null);
  const gadiRef = useRef(null);
  const driverRef = useRef(null);
  const mobileRef = useRef(null);
  const itemInputRef = useRef(null);
  const supplierDropdownRef = useRef(null);
  const itemDropdownRef = useRef(null);

  const focusNext = (ref) => {
    if (ref && ref.current) ref.current.focus();
  };

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
        if (showItemDropdown) { setShowItemDropdown(false); return; }
        if (showSupplierDropdown) { setShowSupplierDropdown(false); return; }
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
      const compRes = await api.get('/company');
      if (compRes.data.success && compRes.data.data) {
        const comp = compRes.data.data;
        setCompany(comp);
        const accRes = await api.get(`/accounts/company/${comp.id}`);
        if (accRes.data.success) {
          const supplierList = (accRes.data.data || []).filter(acc => ['supplier', 'vendor', 'customer'].includes(acc.account_type));
          setAvailableSuppliers(supplierList);
        }
        const itemRes = await api.get(`/items/company/${comp.id}?active=true`);
        if (itemRes.data.success) {
          setAvailableItems(itemRes.data.data || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateRowDetails = (item, qty, rate) => {
    const amount = qty * rate;
    let cgstPercent = 0, cgstAmt = 0, sgstPercent = 0, sgstAmt = 0, igstPercent = 0, igstAmt = 0;
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

  useEffect(() => {
    if (supplierCodeSearch) {
      const match = availableSuppliers.find(s => String(s.account_code) === supplierCodeSearch || String(s.id) === supplierCodeSearch);
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
    }
  }, [supplierCodeSearch, availableSuppliers]);

  const handleAddItem = (e) => {
    if (e) e.preventDefault();
    if (!currentItem || !currentQty || currentQty <= 0) return;
    const defaultRate = currentItem.purchase_price || 0;
    const rate = currentRate !== '' ? parseFloat(currentRate) : parseFloat(defaultRate);
    const details = calculateRowDetails(currentItem, parseFloat(currentQty), rate);
    setPurchaseItems([...purchaseItems, { ...currentItem, quantity: parseFloat(currentQty), rate, ...details }]);
    setCurrentItem(null); setItemSearchText(''); setCurrentQty(''); setCurrentRate('');
    if (itemInputRef.current) itemInputRef.current.focus();
  };

  const handleSupplierSelect = (supplier) => {
    setSelectedSupplier(supplier); setSupplierId(supplier.id);
    setSupplierCodeSearch(String(supplier.account_code || supplier.id));
    setSupplierNameSearch(supplier.account_name);
    setShowSupplierDropdown(false);
  };

  const handleItemSelect = (item) => {
    setCurrentItem(item); setItemSearchText(`${item.item_name}`);
    setCurrentRate(item.purchase_price || '');
    setShowItemDropdown(false); setItemSelectedIndex(0);
  };

  const handleSave = async () => {
    if (purchaseItems.length === 0) { setError(t('purchaseForm.errorNoItems')); return; }
    if (paymentType === 'credit' && !selectedSupplier) { setError(t('purchaseForm.errorNoSupplier')); return; }
    if (!billNo.trim()) { setError(t('purchaseForm.errorNoBill')); return; }
    setLoading(true); setError(null);
    try {
      const payload = {
        supplier_account_id: selectedSupplier ? selectedSupplier.id : null,
        invoice_no: billNo, invoice_date: invoiceDate,
        is_intra_state: taxType === 'CGST/SGST', payment_type: paymentType,
        driver_name: driverName, mobile_number: mobileNumber, gadi_number: gadiNumber,
        items: purchaseItems.map(row => ({
          item_id: row.id, quantity: row.quantity, purchase_rate: row.rate,
          gst_percent: taxType === 'IGST' ? row.igstPercent : (row.cgstPercent + row.sgstPercent)
        }))
      };
      const res = await api.post('/purchases/with-gst', payload);
      if (res.data.success) {
        setSuccess(t('purchaseForm.successMsg'));
        setTimeout(() => { if (onSubmit) onSubmit(res.data.data); }, 1000);
      }
    } catch (err) {
      setError(err.response?.data?.error || t('common.errorDefault'));
    } finally { setLoading(false); }
  };

  const totalBaseAmount = purchaseItems.reduce((sum, row) => sum + row.amount, 0);
  const grossTotal = purchaseItems.reduce((sum, row) => sum + row.totalAmount, 0);
  const netAmount = Math.round(grossTotal);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-none" onClick={() => !loading && onCancel()}></div>

      <div className="bg-white border border-zinc-400 rounded-none w-full max-w-6xl shadow-lg relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[95vh] font-mono text-sm select-none">

        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-blue-600" />
            <h2 className="text-sm font-bold tracking-tight text-zinc-800 uppercase">
              {t('purchaseForm.title')}
            </h2>
          </div>
          <button onClick={onCancel} className="p-1 text-zinc-400 hover:text-red-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-zinc-50">
          {error && (
            <div className="p-3 border border-red-300 bg-red-50 text-red-800 flex items-center gap-2 animate-none">
              <AlertCircle size={15} />
              <span className="font-bold uppercase tracking-widest leading-none">• {error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 border border-emerald-300 bg-emerald-50 text-emerald-800 flex items-center gap-2 animate-none">
              <CheckCircle size={15} />
              <span className="font-bold tracking-widest leading-none">• {success}</span>
            </div>
          )}

          {/* Primary Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white border border-zinc-300 p-4">
            <div className="flex flex-col gap-1" ref={supplierDropdownRef}>
              <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">{t('purchaseForm.supplierIdentity')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('common.pCode')}
                  ref={supplierRef}
                  onKeyDown={e => e.key === 'Enter' && focusNext(billNoRef)}
                  value={supplierCodeSearch}
                  onChange={e => { setSupplierCodeSearch(e.target.value); setShowSupplierDropdown(true); }}
                  className="w-20 text-center border border-zinc-300 bg-zinc-50 px-2 py-1.5 focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800 h-9"
                />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={t('purchaseForm.searchSupplierPlaceholder')}
                    value={supplierNameSearch}
                    onChange={e => { setSupplierNameSearch(e.target.value); setShowSupplierDropdown(true); }}
                    className="w-full border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800 h-9"
                  />
                  {showSupplierDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-300 shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-zinc-200">
                      {availableSuppliers.filter(s => s.account_name.toLowerCase().includes(supplierNameSearch.toLowerCase())).map(s => (
                        <div key={s.id} onClick={() => handleSupplierSelect(s)} className="p-2 hover:bg-zinc-50 cursor-pointer flex justify-between items-center">
                          <span className="text-sm font-bold text-zinc-800">{s.account_name}</span>
                          <span className="text-[10px] font-bold text-zinc-400">#{s.account_code || s.id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">{t('purchaseForm.billNoDate')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('common.billNo')}
                  ref={billNoRef}
                  onKeyDown={e => e.key === 'Enter' && focusNext(dateRef)}
                  value={billNo}
                  onChange={e => setBillNo(e.target.value)}
                  className="w-1/3 border border-zinc-300 bg-blue-50 text-blue-700 px-2.5 py-1.5 focus:bg-white outline-none transition font-bold h-9"
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
              <label className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">{t('purchaseForm.logisticsContext')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('common.gadi')}
                  ref={gadiRef}
                  onKeyDown={e => e.key === 'Enter' && focusNext(driverRef)}
                  value={gadiNumber}
                  onChange={e => setGadiNumber(e.target.value)}
                  className="w-1/2 border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 focus:bg-white outline-none transition font-bold text-zinc-800 h-9 uppercase"
                />
                <input
                  type="text"
                  placeholder={t('common.driver')}
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
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('purchaseForm.paymentStrategy')}</label>
              <div className="flex border border-zinc-200 p-1 bg-zinc-50">
                <button onClick={() => setPaymentType('credit')} className={`flex-1 py-1.5 text-[10px] font-bold transition ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'} ${paymentType === 'credit' ? 'bg-white border border-zinc-300 text-zinc-800 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>{t('saleForm.credit')}</button>
                <button onClick={() => setPaymentType('cash')} className={`flex-1 py-1.5 text-[10px] font-bold transition ${i18n.language === 'gu' ? 'font-sans' : 'uppercase'} ${paymentType === 'cash' ? 'bg-white border border-zinc-300 text-zinc-800 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>{t('saleForm.cash')}</button>
              </div>
            </div>
            <div className="bg-white border border-zinc-300 p-3 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('purchaseForm.taxLogic')}</label>
              <select value={taxType} onChange={e => setTaxType(e.target.value)} className="w-full border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 focus:bg-white outline-none transition font-bold text-zinc-700 h-9 uppercase">
                <option value="CGST/SGST">{t('common.localTax')}</option>
                <option value="IGST">{t('common.interstateTax')}</option>
              </select>
            </div>
            <div className="bg-white border border-zinc-300 p-3 flex flex-col gap-1 md:col-span-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">State Node</label>
              <input readOnly value={company?.state_name ? `${company.state_name} (${company.state_code})` : 'GUJARAT (24)'} className="w-full border border-zinc-300 bg-zinc-100 px-2.5 py-1.5 text-zinc-400 font-bold h-9 uppercase" />
              <input
                type="text"
                ref={mobileRef}
                placeholder="MOBILE"
                onKeyDown={e => e.key === 'Enter' && focusNext(itemInputRef)}
                className="hidden"
              />
            </div>
          </div>

          {/* Item Allocation Grid */}
          <div className="bg-white border border-zinc-300 flex flex-col min-h-[300px]">
            <div className="bg-zinc-100 px-3 py-2 border-b border-zinc-300 flex justify-between items-center">
              <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">Item Manifest Matrix</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{purchaseItems.length} Nodes</span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    <th className="px-4 py-2 border-r border-zinc-200">Item Description</th>
                    <th className="w-24 px-4 py-2 border-r border-zinc-200 text-right">Qty</th>
                    <th className="w-28 px-4 py-2 border-r border-zinc-200 text-right">Rate</th>
                    <th className="w-32 px-4 py-2 border-r border-zinc-200 text-right">Total</th>
                    <th className="w-32 px-4 py-2 border-r border-zinc-200 text-right">Gr. Amount</th>
                    <th className="w-12 px-4 py-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {purchaseItems.map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-1.5 border-r border-zinc-200 font-bold text-zinc-800 uppercase tracking-tight">{row.item_name} ({row.item_code})</td>
                      <td className="px-4 py-1.5 border-r border-zinc-200 text-right font-bold text-zinc-600 font-mono">{row.quantity.toFixed(3)}</td>
                      <td className="px-4 py-1.5 border-r border-zinc-200 text-right font-bold text-zinc-500 font-mono italic">{row.rate.toFixed(2)}</td>
                      <td className="px-4 py-1.5 border-r border-zinc-200 text-right font-bold text-zinc-800 font-mono">{row.amount.toFixed(2)}</td>
                      <td className="px-4 py-1.5 border-r border-zinc-200 text-right font-bold text-zinc-900 font-mono bg-zinc-50">₹{row.totalAmount.toFixed(2)}</td>
                      <td className="px-4 py-1.5 text-center">
                        <button onClick={() => setPurchaseItems(purchaseItems.filter((_, i) => i !== idx))} className="text-zinc-400 hover:text-red-600"><Trash2 size={13} /></button>
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
                        value={itemSearchText}
                        onChange={e => { setItemSearchText(e.target.value); setShowItemDropdown(true); }}
                        className="w-full px-3 py-2 bg-white border border-zinc-300 focus:border-zinc-500 outline-none font-bold text-zinc-800 h-9 uppercase"
                      />
                      {showItemDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-300 shadow-2xl z-50 max-h-48 overflow-y-auto">
                          {availableItems.filter(i => i.item_name.toLowerCase().includes(itemSearchText.toLowerCase())).map(item => (
                            <div key={item.id} onClick={() => handleItemSelect(item)} className="p-2 hover:bg-zinc-50 cursor-pointer flex justify-between items-center">
                              <span className="text-sm font-bold text-zinc-700 uppercase">{item.item_name}</span>
                              <span className="text-[10px] font-bold text-zinc-400 uppercase">PR: ₹{item.purchase_price}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-1 border-r border-zinc-200">
                      <input type="number" placeholder="0.000" value={currentQty} onChange={e => setCurrentQty(e.target.value)} className="w-full px-2 py-2 bg-white border border-zinc-300 focus:border-zinc-500 text-right outline-none font-bold font-mono text-zinc-800 h-9" />
                    </td>
                    <td className="p-1 border-r border-zinc-200">
                      <input type="number" placeholder="0.00" value={currentRate} onChange={e => setCurrentRate(e.target.value)} className="w-full px-2 py-2 bg-white border border-zinc-300 focus:border-zinc-500 text-right outline-none font-bold font-mono text-zinc-800 h-9" />
                    </td>
                    <td colSpan={2} className="p-1 border-r border-zinc-200 bg-zinc-100 text-center text-[10px] font-bold text-zinc-400 uppercase italic">
                      {currentItem ? `₹${calculateRowDetails(currentItem, parseFloat(currentQty) || 0, parseFloat(currentRate) || currentItem.purchase_price || 0).totalAmount.toFixed(2)} PREVIEW` : '[ CONFIGURE ROW ]'}
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
              <div className="flex gap-8">
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest">Base Amount</span>
                  <span className="text-sm font-bold text-zinc-600 font-mono">₹{totalBaseAmount.toFixed(2)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-zinc-400 uppercase tracking-widest">GST Burden</span>
                  <span className="text-sm font-bold text-zinc-600 font-mono">₹{(grossTotal - totalBaseAmount).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">Net Payable Ledger</span>
                <span className="text-2xl font-bold text-zinc-800 font-mono italic tracking-tighter">₹{netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-5 py-4 border-t border-zinc-200 bg-zinc-100 flex items-center justify-between shadow-inner">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">
            * Registry entries are synchronized upon confirmation.
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-5 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition rounded-none uppercase text-[10px] tracking-widest shadow-sm">
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading} className="px-8 py-2 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold transition rounded-none uppercase flex items-center justify-center gap-2 text-[10px] tracking-widest shadow-sm">
              {loading ? <Loader className="animate-spin" size={14} /> : <><Save size={14} /> Confirm & Save</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
