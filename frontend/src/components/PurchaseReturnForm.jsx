import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, Search, Package, Hash, User, Calendar, CheckCircle2, ChevronRight, Activity, DollarSign } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import GSTSelector from './GSTSelector';

export default function PurchaseReturnForm({ company, onSubmit, onClose }) {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [formData, setFormData] = useState({
    purchase_id: '',
    return_date: new Date().toISOString().split('T')[0],
    items: [],
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchPurchase, setSearchPurchase] = useState('');
  const [showPurchaseSearch, setShowPurchaseSearch] = useState(false);
  const [gstData, setGstData] = useState(null);

  // Load purchases
  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const startDate = new Date(new Date().setDate(new Date().getDate() - 120)).toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];
        
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/purchases`, {
          params: { startDate, endDate },
          headers: { 'x-company-id': company.id }
        });
        setPurchases(res.data.success ? res.data.data : []);
      } catch (err) {
        console.error('Fetch purchases error:', err);
      }
    };
    fetchPurchases();
  }, [company]);

  const filteredPurchases = purchases.filter(p =>
    p.invoice_no.toLowerCase().includes(searchPurchase.toLowerCase()) ||
    p.supplier_name.toLowerCase().includes(searchPurchase.toLowerCase())
  );

  const handleSelectPurchase = async (purchase) => {
    try {
      setLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/purchase-returns/purchase/${purchase.id}`, {
        headers: { 'x-company-id': company.id }
      });

      if (res.data.success) {
        const purchaseData = res.data.data;
        setSelectedPurchase(purchaseData);
        setFormData(prev => ({
          ...prev,
          purchase_id: purchase.id,
          items: purchaseData.items.map(item => ({
            item_id: item.item_id,
            item_name: item.item_name,
            item_code: item.item_code,
            purchased_quantity: item.purchased_quantity,
            purchase_rate: item.purchase_rate,
            quantity: '',
            max_return_qty: item.purchased_quantity
          }))
        }));
        setShowPurchaseSearch(false);
        setSearchPurchase('');
        setErrors({});
      }
    } catch (err) {
      setErrors({ submit: 'Manifest Integrity Breach: Failed to load purchase pipeline' });
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    let finalValue = value;
    if (field === 'quantity') {
      finalValue = Math.min(Math.max(0, parseFloat(value) || 0), newItems[index].max_return_qty);
    }
    newItems[index][field] = finalValue;
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const calculateAmount = (index) => {
    const item = formData.items[index];
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.purchase_rate) || 0;
    return qty * rate;
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item, index) => {
      return sum + calculateAmount(index);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const itemsToReturn = formData.items.filter(item => parseFloat(item.quantity) > 0);
      
      if (itemsToReturn.length === 0) {
        setErrors({ submit: 'VALIDATION_FAILURE: No objects isolated for return' });
        setLoading(false);
        return;
      }

      const returnData = {
        purchase_id: parseInt(formData.purchase_id),
        return_date: formData.return_date,
        items: itemsToReturn.map(item => ({
          item_id: parseInt(item.item_id),
          quantity: parseFloat(item.quantity),
          purchase_rate: parseFloat(item.purchase_rate),
          max_return_qty: parseFloat(item.max_return_qty)
        })),
        notes: formData.notes
      };

      await onSubmit(returnData);
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'CRITICAL_AUTH: Submission protocol rejected' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4 select-none">
      <div className="bg-[#f8fafc] border-2 border-slate-900 w-full max-w-4xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col font-sans relative rounded-3xl overflow-hidden max-h-[95vh]">
        
        {/* Ribbon Header */}
        <div className="bg-slate-900 text-white px-8 py-5 flex justify-between items-center border-b-2 border-white/5">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-white border-2 border-white/10 rounded-xl flex items-center justify-center text-slate-900 shadow-xl">
                <Package size={20} strokeWidth={3} />
             </div>
             <div>
                <h2 className="text-xl font-black uppercase tracking-tighter italic leading-none">{t('purchaseReturn.createNewReturn', 'Inward Manifest Reversal')}</h2>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Industrial Supply Chain Correction</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2.5 bg-white/5 hover:bg-red-600 text-white rounded-xl transition-all active:scale-90 border border-white/10">
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scroller-industrial">
          <div className="p-10 space-y-10 bg-white">
            
            {/* ALERT CENTER */}
            {errors.submit && (
              <div className="flex gap-4 p-5 bg-red-50 border-2 border-red-200 rounded-2xl animate-pulse">
                <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-red-700 leading-relaxed italic">{errors.submit}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
               {/* Left Controls */}
               <div className="lg:col-span-12 space-y-8">
                  
                  {/* Purchase Selector */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1 italic">Phase_01: Source Isolation</label>
                    <div className="relative">
                      {selectedPurchase ? (
                        <div className="w-full p-6 bg-slate-900 border-2 border-black rounded-2xl shadow-xl flex justify-between items-center group overflow-hidden">
                           <div className="absolute top-0 right-0 w-32 h-full bg-white/5 skew-x-12 translate-x-16"></div>
                           <div className="relative z-10">
                              <div className="flex items-center gap-3">
                                 <Hash size={14} className="text-slate-500" />
                                 <p className="text-lg font-black text-white italic tracking-tighter uppercase">{selectedPurchase.invoice_no}</p>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                 <User size={12} className="text-slate-500" />
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedPurchase.supplier_name}</p>
                              </div>
                           </div>
                           <button
                             type="button"
                             onClick={() => setSelectedPurchase(null)}
                             className="relative z-10 px-6 py-2.5 bg-white text-slate-900 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-lg shadow-black/20 italic"
                           >
                             Reset Pipeline
                           </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowPurchaseSearch(!showPurchaseSearch)}
                            className="w-full p-6 bg-slate-50 border-2 border-slate-100 hover:border-black rounded-2xl text-left transition-all group flex items-center justify-between"
                          >
                             <div className="flex items-center gap-4">
                                <Search className="w-6 h-6 text-slate-300 group-hover:text-black transition-colors" strokeWidth={3} />
                                <span className="font-black text-slate-300 group-hover:text-black uppercase tracking-widest text-[11px] italic">Access Inward Manifest Stream...</span>
                             </div>
                             <ChevronRight className="text-slate-200 group-hover:translate-x-1 transition-all" />
                          </button>

                          {showPurchaseSearch && (
                            <div className="absolute top-full left-0 right-0 mt-4 bg-white border-2 border-black rounded-3xl shadow-[0_40px_80px_rgba(0,0,0,0.15)] z-[120] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                              <div className="p-4 bg-slate-50 border-b border-slate-100 sticky top-0 bg-white">
                                <div className="relative">
                                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={3} />
                                  <input
                                    type="text"
                                    placeholder="ISOLATE BY INVOICE_ID OR ENTITY_NAME..."
                                    value={searchPurchase}
                                    onChange={(e) => setSearchPurchase(e.target.value)}
                                    className="w-full pl-12 pr-6 py-3 border-2 border-slate-200 rounded-xl text-[10px] uppercase font-black tracking-widest outline-none focus:border-black transition-all bg-white shadow-inner"
                                    autoFocus
                                  />
                                </div>
                              </div>
                              <div className="max-h-64 overflow-y-auto scroller-industrial">
                                {filteredPurchases.length === 0 ? (
                                  <div className="p-12 text-center text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 italic">
                                    Zero Manifest Matches Detected
                                  </div>
                                ) : (
                                  filteredPurchases.map(purchase => (
                                    <button
                                      key={purchase.id}
                                      type="button"
                                      onClick={() => handleSelectPurchase(purchase)}
                                      className="w-full px-8 py-5 text-left hover:bg-slate-50 border-b border-slate-50 transition-colors flex justify-between items-center group"
                                    >
                                      <div>
                                        <p className="font-black text-slate-900 italic uppercase tracking-tight">{purchase.invoice_no}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{purchase.supplier_name}</p>
                                      </div>
                                      <div className="text-right">
                                         <p className="text-xs font-black text-slate-900 italic">₹{parseFloat(purchase.total_amount).toLocaleString('en-IN')}</p>
                                         <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mt-1">Audit_Ref: {purchase.id}</p>
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
               </div>

               {selectedPurchase && (
                 <div className="lg:col-span-12 space-y-10 animate-in fade-in duration-500">
                    
                    {/* Return Setup Group */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end border-b-2 border-slate-100 pb-10">
                       <div className="md:col-span-4 space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1 flex items-center gap-2">
                             <Calendar size={12} strokeWidth={3} /> Reversal Date :
                          </label>
                          <input
                            type="date"
                            value={formData.return_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, return_date: e.target.value }))}
                            className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest outline-none focus:bg-white shadow-lg transition-transform focus:scale-[1.02]"
                          />
                       </div>
                       <div className="md:col-span-8 space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">Protocol Notes / Cause :</label>
                          <input
                            type="text"
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="DOCUMENT REASON FOR LOGISTIC REVERSAL..."
                            className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none focus:border-black focus:bg-white transition-all italic"
                          />
                       </div>
                    </div>

                    {/* Object Detail Table */}
                    <div className="space-y-6">
                       <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-black"></div>
                          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900">Isolated Reversal Array</h3>
                       </div>

                       <div className="border-4 border-black rounded-[2rem] overflow-hidden shadow-2xl bg-[#fefefe]">
                          <table className="w-full">
                            <thead>
                               <tr className="bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] italic border-b-4 border-black">
                                  <th className="px-8 py-6 text-left border-r border-white/5">Nomenclature</th>
                                  <th className="px-8 py-6 text-center border-r border-white/5">Inbound</th>
                                  <th className="px-8 py-6 text-center border-r border-white/5">Reversal_Qty</th>
                                  <th className="px-8 py-6 text-right border-r border-white/5">Rate</th>
                                  <th className="px-8 py-6 text-right">Value</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-50">
                               {formData.items.map((item, index) => (
                                 <tr key={index} className={`transition-all ${parseFloat(item.quantity) > 0 ? 'bg-slate-100 italic' : 'bg-white'}`}>
                                    <td className="px-8 py-5 border-r border-slate-50">
                                       <p className="font-black text-slate-900 text-sm tracking-tighter uppercase">{item.item_name}</p>
                                       <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">{item.item_code}</p>
                                    </td>
                                    <td className="px-8 py-5 text-center font-mono font-black text-slate-400 border-r border-slate-50">{item.purchased_quantity}</td>
                                    <td className="px-8 py-5 text-center border-r border-slate-50">
                                       <div className="relative group mx-auto w-24">
                                          <input
                                            type="number"
                                            step="1"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            placeholder="0"
                                            className={`w-full px-4 py-2 font-black font-mono text-center text-sm rounded-xl outline-none transition-all ${
                                              parseFloat(item.quantity) > 0 
                                              ? 'bg-black text-white border-2 border-black' 
                                              : 'bg-slate-50 text-slate-300 border-2 border-slate-100 focus:border-black focus:text-black'
                                            }`}
                                          />
                                       </div>
                                    </td>
                                    <td className="px-8 py-5 text-right font-mono font-black text-slate-400 border-r border-slate-50 italic">₹{parseFloat(item.purchase_rate).toFixed(2)}</td>
                                    <td className="px-8 py-5 text-right">
                                       <span className={`font-mono text-base font-black tracking-tighter italic ${parseFloat(item.quantity) > 0 ? 'text-black' : 'text-slate-200'}`}>
                                          ₹{calculateAmount(index).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                       </span>
                                    </td>
                                 </tr>
                               ))}
                            </tbody>
                          </table>
                          {formData.items.length === 0 && (
                             <div className="p-16 text-center border-t-2 border-slate-50 text-slate-200 font-black uppercase tracking-[0.5em] italic text-[10px]">Zero Object Density In Pipeline</div>
                          )}
                       </div>
                    </div>

                    {/* HIGH IMPACT SUMMARY FOOTER */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                       
                       <div className="md:col-span-7 bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-all duration-1000"></div>
                          <div className="relative z-10 space-y-8">
                             <div className="flex items-center gap-4 border-b border-white/10 pb-6 opacity-60">
                                <div className="p-3 bg-white/10 rounded-2xl"><Activity size={24} strokeWidth={3}/></div>
                                <div>
                                   <p className="text-[9px] font-black uppercase tracking-[0.4em] leading-none">Inward Protocol Audit</p>
                                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-2 italic">Automated Yield Calculation Engine</p>
                                </div>
                             </div>
                             
                             <div className="grid grid-cols-3 gap-6">
                                <div>
                                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Isolated Nodes</p>
                                   <p className="text-2xl font-black italic tracking-tighter">{formData.items.filter(i => parseFloat(i.quantity) > 0).length}</p>
                                </div>
                                <div>
                                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Total Density</p>
                                   <p className="text-2xl font-black italic tracking-tighter">{formData.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0).toFixed(1)} <span className="text-[10px]">UNTs</span></p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Gross Reversal</p>
                                   <p className="text-3xl font-black italic tracking-tighter text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">₹{calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 0 })}</p>
                                </div>
                             </div>
                             
                             <div className="flex items-center gap-3 pt-6 border-t border-white/10 text-[9px] font-black italic text-slate-500 uppercase tracking-widest">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                                System synchronization ready for execution phase
                             </div>
                          </div>
                       </div>

                       <div className="md:col-span-5 bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] shadow-xl">
                          <GSTSelector
                            amount={calculateTotal()}
                            isIntraState={true}
                            showBreakdown={true}
                            onGSTChange={(data) => setGstData(data)}
                          />
                       </div>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </form>

        {/* SHIPMENT CONTROLS */}
        <div className="bg-slate-100 border-t-2 border-slate-900 px-10 py-8 flex justify-end gap-6 shadow-2xl relative z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-10 py-4 text-slate-400 font-black uppercase tracking-widest text-[11px] hover:text-black transition-colors italic hover:bg-white rounded-2xl active:scale-95"
          >
            Abort Protocol
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedPurchase || formData.items.every(i => !parseFloat(i.quantity))}
            className="px-16 py-4 bg-slate-900 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-black transition-all active:scale-90 shadow-2xl flex items-center gap-4 italic disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed border-2 border-black"
          >
            {loading ? <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle2 size={18} strokeWidth={3} />}
            COMMIT INWARD REVERSAL
          </button>
        </div>

        {/* Industrial Decor */}
        <style dangerouslySetInnerHTML={{ __html: `
          .scroller-industrial::-webkit-scrollbar { width: 8px; }
          .scroller-industrial::-webkit-scrollbar-track { background: #f8fafc; }
          .scroller-industrial::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #f8fafc; }
          .scroller-industrial::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}} />
      </div>
    </div>
  );
}
