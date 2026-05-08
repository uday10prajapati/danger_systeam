import React, { useState, useEffect } from 'react';
import {
  Plus, X, Eye, ChevronRight, CheckCircle2,
  User, Hash, Calendar, DollarSign, ArrowLeft,
  Search, ShieldCheck, ShoppingBag, Package,
  Save, RefreshCcw, Activity, Layout, FileText,
  AlertCircle, ChevronDown, Trash2, Command,
  TrendingDown, Database, ShoppingCart, Layers
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import GSTSelector from './GSTSelector';

const FormLabel = ({ children, icon: Icon, className = "" }) => (
  <div className={`flex items-center gap-2 mb-3 select-none ${className}`}>
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
      {children}
    </label>
    {Icon && <Icon size={12} className="text-slate-300" />}
  </div>
);

const FormInput = ({ className = "", error, icon: Icon, ...props }) => (
  <div className="space-y-1.5 flex-1 group">
    <div className="relative">
      {Icon && <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />}
      <input
        className={`w-full h-14 ${Icon ? 'pl-12' : 'px-6'} pr-6 text-sm border ${error ? 'border-rose-400 bg-rose-50/30' : 'border-slate-100 bg-slate-50/50'} focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:outline-none focus:bg-white hover:bg-slate-50/80 transition-all rounded-lg font-bold text-slate-700 placeholder:text-slate-200 ${className}`}
        {...props}
      />
    </div>
    {error && <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-1">{error}</p>}
  </div>
);

export default function PurchaseReturnForm({ onClose, onSuccess, company }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availablePurchases, setAvailablePurchases] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [refundType, setRefundType] = useState('cash');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [gstData, setGstData] = useState(null);

  // Supplier Search States
  const [suppliers, setSuppliers] = useState([]);
  const [searchCode, setSearchCode] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  useEffect(() => {
    if (company?.id) {
      fetchAvailablePurchases();
      fetchSuppliers();
    }
  }, [company]);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get(`/accounts/company/${company.id}`);
      setSuppliers(res.data.success ? res.data.data : []);
    } catch (err) {
      console.error('Fetch suppliers error', err);
    }
  };

  const fetchAvailablePurchases = async () => {
    try {
      setLoading(true);
      const response = await api.get('/purchases', {
        params: { startDate: '2020-01-01', endDate: new Date().toISOString().split('T')[0] }
      });
      setAvailablePurchases(response.data.data);
    } catch (err) {
      setError('Connection Failure: Pipeline unreachable');
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierSelect = (s) => {
    setSelectedSupplier(s);
    setSearchCode(String(s.id));
    setSearchText(s.account_name);
    setShowSupplierDropdown(false);
  };

  // Auto-select on code match
  useEffect(() => {
    if (searchCode && !selectedSupplier) {
      const match = suppliers.find(s => String(s.id) === searchCode);
      if (match) handleSupplierSelect(match);
    }
  }, [searchCode, suppliers]);

  const filteredSuppliers = suppliers.filter(s => {
    const cMatch = searchCode ? String(s.id).includes(searchCode) : true;
    const nMatch = searchText ? s.account_name.toLowerCase().includes(searchText.toLowerCase()) : true;
    return cMatch && nMatch;
  });

  const handleSelectPurchase = async (purchase) => {
    try {
      setLoading(true);
      const response = await api.get(`/purchase-returns/purchase/${purchase.id}`);
      setSelectedPurchase(response.data.data);
      setReturnItems(
        response.data.data.items.map(item => ({
          ...item,
          return_quantity: 0,
          return_amount: 0,
          purchased_quantity: item.purchased_quantity,
          purchase_rate: item.purchase_rate
        }))
      );
      setError('');
    } catch (err) {
      setError('Sync Failure: Inward shard corrupted');
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (index, delta) => {
    const updated = [...returnItems];
    const currentQty = parseInt(updated[index].return_quantity) || 0;
    const newQty = Math.min(Math.max(0, currentQty + delta), updated[index].purchased_quantity);
    updated[index].return_quantity = newQty;
    updated[index].return_amount = newQty * parseFloat(updated[index].purchase_rate || 0);
    setReturnItems(updated);
  };

  const handleSubmit = async () => {
    const itemsToReturn = returnItems.filter(item => item.return_quantity > 0);
    if (itemsToReturn.length === 0) return setError('Mandatory: One component required for reversal');

    try {
      setLoading(true);
      const response = await api.post('/purchase-returns', {
        purchase_id: selectedPurchase.id,
        return_date: returnDate,
        items: itemsToReturn.map(item => ({
          item_id: item.item_id,
          quantity: item.return_quantity,
          purchase_rate: item.purchase_rate,
          amount: item.return_amount
        })),
        refund_type: refundType,
        notes
      });

      if (response.data.success) {
        setSuccess('Reversal protocol committed successfully');
        setTimeout(() => { onSuccess?.(); }, 1500);
      }
    } catch (err) {
      setError('Registry Error: Protocol rejected');
    } finally {
      setLoading(false);
    }
  };

  const totalReturnAmount = returnItems.reduce((sum, item) => sum + (item.return_amount || 0), 0);
  const filteredPurchases = availablePurchases.filter(p => {
    const termMatch = p.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.supplier_name && p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const supplierMatch = selectedSupplier ? p.supplier_id === selectedSupplier.id : true;
    return termMatch && supplierMatch;
  });

  return (
    <div className="bg-white rounded-lg border border-slate-100 shadow-2xl p-10 relative overflow-hidden animate-in slide-in-from-bottom duration-500">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50/20 rounded-full -mr-32 -mt-32 blur-3xl shadow-inner"></div>

      <div className="relative z-10 space-y-12">

        {/* Step 1: Initialize Manifest */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
              <div className="w-8 h-0.5 bg-amber-600"></div> Initialize Procurement Reversal
            </h3>
            {selectedPurchase && (
              <button
                onClick={() => setSelectedPurchase(null)}
                className="text-[10px] font-black text-amber-600 uppercase tracking-widest hover:underline flex items-center gap-1.5"
              >
                <RefreshCcw size={12} /> Change Source
              </button>
            )}
          </div>

          {!selectedPurchase ? (
            <div className="space-y-6">
              {/* Supplier Lookup Row */}
              <div className="flex flex-col md:flex-row gap-4 relative">
                <div className="w-full md:w-32 lg:w-40 space-y-2">
                  <FormLabel icon={Hash}>Vendor Code</FormLabel>
                  <FormInput
                    placeholder="ID"
                    value={searchCode}
                    onChange={(e) => {
                      setSearchCode(e.target.value);
                      setShowSupplierDropdown(true);
                      if (selectedSupplier) setSelectedSupplier(null);
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                    className="text-center"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <FormLabel icon={User}>Vendor Entity</FormLabel>
                  <FormInput
                    icon={Search}
                    placeholder="SEARCH VENDOR LOGS..."
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setShowSupplierDropdown(true);
                      if (selectedSupplier) setSelectedSupplier(null);
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                  />
                </div>

                {showSupplierDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-100 shadow-2xl rounded-lg overflow-hidden z-[100] mt-1 animate-in zoom-in-95 duration-200">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center italic">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identified Inbound Nodes</span>
                      <X size={12} className="text-slate-300 cursor-pointer" onClick={() => setShowSupplierDropdown(false)} />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {filteredSuppliers.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => handleSupplierSelect(s)}
                          className="px-8 py-4 hover:bg-amber-50 flex justify-between items-center cursor-pointer group transition-colors border-b border-slate-50 last:border-none"
                        >
                          <span className="text-sm font-bold text-slate-600 group-hover:text-amber-600 uppercase italic">{s.account_name}</span>
                          <span className="text-[10px] font-bold text-slate-300 group-hover:text-amber-300 tracking-[0.2em]">VENDOR_#{s.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative group">
                <FormLabel icon={ShoppingCart}>Inbound Manifest Identifier</FormLabel>
                <div className="relative">
                  <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-600" />
                  <input
                    type="text"
                    placeholder="SELECT RELEVANT INWARD SHARD (INV #)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-14 pl-14 pr-6 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-amber-500 outline-none transition-all font-black uppercase text-xs tracking-widest placeholder:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 scroller-airy">
                {filteredPurchases.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPurchase(p)}
                    className="p-6 bg-white border border-slate-50 hover:border-amber-200 rounded-lg shadow-sm hover:shadow-xl hover:shadow-amber-50/50 transition-all text-left group flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-800 tracking-tight group-hover:text-amber-600">{p.invoice_no}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic truncate max-w-[150px]">{p.supplier_name || 'GENERIC_VENDOR_ENTITY'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black italic text-slate-900">₹{parseFloat(p.total_amount).toLocaleString()}</p>
                      <p className="text-[9px] font-black text-slate-300 uppercase italic">{new Date(p.purchase_date).toLocaleDateString('en-GB')}</p>
                    </div>
                  </button>
                ))}
                {filteredPurchases.length === 0 && (
                  <div className="col-span-2 py-10 text-center text-slate-200 italic font-black uppercase text-[10px] tracking-[0.3em]">No Manifests Detected</div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 bg-slate-900 rounded-lg border border-slate-800 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-br from-amber-600/10 to-transparent"></div>
              <div className="relative z-10 flex justify-between items-end">
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] mb-2 block italic">Source Inbound Shard</span>
                  <h4 className="text-3xl font-black italic tracking-tighter">{selectedPurchase.invoice_no}</h4>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Vendor Shard Auth</p>
                  <p className="text-sm font-black uppercase truncate max-w-[250px]">{selectedPurchase.supplier_name || 'GENERIC_AUTHENTICATION'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Component Configuration */}
        {selectedPurchase && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
              <div className="w-8 h-0.5 bg-rose-500"></div> Component Reversal Configuration
            </h3>

            <div className="space-y-4">
              {returnItems.map((item, index) => (
                <div key={item.item_id} className={`p-8 rounded-lg border transition-all ${item.return_quantity > 0 ? 'bg-white border-amber-200 shadow-xl ring-1 ring-amber-50' : 'bg-slate-50/50 border-slate-100'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-base font-black text-slate-800 tracking-tight uppercase italic">{item.item_name}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Inbound: {item.purchased_quantity} Units @ ₹{parseFloat(item.purchase_rate).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Reversal Impact</p>
                      <p className="text-xl font-black italic text-slate-900 tracking-tighter">₹{item.return_amount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleQtyChange(index, -1)}
                        className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all font-black shadow-sm"
                      ><ArrowLeft size={14} /></button>
                      <input
                        type="number"
                        value={item.return_quantity}
                        onChange={(e) => handleQtyChange(index, parseInt(e.target.value) - (parseInt(item.return_quantity) || 0))}
                        className="w-16 text-center bg-transparent font-black text-lg outline-none text-slate-800"
                      />
                      <button
                        onClick={() => handleQtyChange(index, 1)}
                        className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-all font-black shadow-sm"
                      ><RefreshCcw size={14} className="rotate-90" /></button>
                    </div>
                    <div className="flex-1 h-px bg-slate-100"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Meta Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-50">
              <div className="space-y-6">
                <div className="space-y-2">
                  <FormLabel icon={Calendar}>Protocol Epoch</FormLabel>
                  <FormInput type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} icon={Calendar} />
                </div>
                <div className="space-y-2">
                  <FormLabel icon={ShieldCheck}>Settlement Logic</FormLabel>
                  <div className="flex gap-2 p-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                    {['cash', 'credit'].map(t => (
                      <button
                        key={t}
                        onClick={() => setRefundType(t)}
                        className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${refundType === t ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <FormLabel icon={FileText}>Auditor Manifesto Notes</FormLabel>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ISOLATE REASON FOR LOGISTIC REVERSAL..."
                  className="w-full px-6 py-5 bg-slate-50/50 border border-slate-100 focus:bg-white focus:border-amber-500 outline-none rounded-lg font-black uppercase text-[10px] tracking-widest placeholder:text-slate-200 h-full resize-none transition-all italic"
                />
              </div>
            </div>
          </div>
        )}

        {/* Global Awareness Module */}
        {(error || success) && (
          <div className={`p-5 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${error ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
            {error ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">{error || success}</p>
          </div>
        )}

        {/* Final Audit Command */}
        {selectedPurchase && (
          <div className="bg-slate-900 p-10 rounded-lg text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:rotate-12 transition-transform duration-700"><TrendingDown size={150} /></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.5em] mb-2 italic">Net Reversal Value Shard</p>
                <div className="flex items-start justify-center md:justify-start gap-1">
                  <span className="text-2xl mt-2 font-black text-amber-600 italic">₹</span>
                  <span className="text-7xl font-black italic tracking-tighter drop-shadow-2xl">{totalReturnAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <button
                  onClick={handleSubmit}
                  disabled={loading || totalReturnAmount <= 0}
                  className="flex-1 md:flex-none bg-amber-600 hover:bg-white hover:text-amber-600 text-white font-black py-6 px-12 rounded-lg transition-all shadow-xl shadow-amber-500/20 active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3 uppercase text-xs tracking-widest italic"
                >
                  {loading ? <RefreshCcw className="animate-spin" size={20} /> : <><Save size={20} /> Commit Reversal</>}
                </button>
                <button
                  onClick={onClose}
                  className="px-8 py-6 bg-slate-800 text-slate-500 hover:text-white rounded-lg font-black uppercase text-[10px] tracking-widest transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          .scroller-airy::-webkit-scrollbar { width: 4px; }
          .scroller-airy::-webkit-scrollbar-track { background: transparent; }
          .scroller-airy::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
          .scroller-airy::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
}
