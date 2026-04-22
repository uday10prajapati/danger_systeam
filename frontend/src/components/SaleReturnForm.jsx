import React, { useState, useEffect } from 'react';
import { Plus, X, Eye, ChevronDown, CheckCircle2, ChevronRight, User, Hash, Calendar, DollarSign, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import GSTSelector from './GSTSelector';

export default function SaleReturnForm({ onClose, onSuccess }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1); // 1: Select Sale, 2: Select Items, 3: Review
  const [availableSales, setAvailableSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [refundType, setRefundType] = useState('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gstData, setGstData] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const response = await axios.get('/api/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      }
    } catch (error) {
      console.error('Company load error:', error);
    }
  };

  useEffect(() => {
    if (step === 1 && company?.id) {
      fetchAvailableSales();
    }
  }, [step, company]);

  const fetchAvailableSales = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/sale-returns/available-sales`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      setAvailableSales(response.data.data);
    } catch (err) {
      setError('System Failure: Unable to fetch active sales pipeline');
    }
  };

  const handleSelectSale = async (sale) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/sale-returns/sale/${sale.id}`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      setSelectedSale(response.data.data);
      setReturnItems(
        response.data.data.items.map(item => ({
          ...item,
          return_quantity: 0,
          return_amount: 0
        }))
      );
      setStep(2);
    } catch (err) {
      setError('Data Integrity Error: Failed to synchronize sale details');
    }
  };

  const handleReturnQtyChange = (index, qty) => {
    const updated = [...returnItems];
    const quantity = Math.min(Math.max(0, qty), updated[index].quantity);
    updated[index].return_quantity = quantity;
    updated[index].return_amount = quantity * parseFloat(updated[index].sale_rate || 0);
    setReturnItems(updated);
  };

  const handleSubmitReturn = async () => {
    try {
      const itemsToReturn = returnItems.filter(item => item.return_quantity > 0);
      
      if (itemsToReturn.length === 0) {
        setError('VALIDATION_ERROR: Minimum one item required for inventory reversal');
        return;
      }

      setLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/sale-returns`,
        {
          sale_id: selectedSale.id,
          return_date: returnDate,
          items: itemsToReturn.map(item => ({
            item_id: item.item_id,
            quantity: item.return_quantity,
            sale_rate: item.sale_rate,
            amount: item.return_amount
          })),
          refund_type: refundType,
          notes
        },
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );

      if (response.data.success) {
        setSuccess('PROCEDURE_SUCCESS: Inventory reversal committed to core registry');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'CRITICAL_ERROR: Protocol submission failed');
    } finally {
      setLoading(false);
    }
  };

  const totalReturnAmount = returnItems.reduce((sum, item) => sum + (item.return_amount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 select-none">
      <div className="bg-[#f0f2f5] border-2 border-slate-900 w-full max-w-3xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col font-sans relative rounded-3xl overflow-hidden max-h-[92vh]">
        
        {/* Industrial Header Ribbon */}
        <div className="bg-slate-900 text-white px-8 py-5 flex justify-between items-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <div>
            <div className="font-black text-[10px] uppercase tracking-[0.4em] text-slate-500 mb-1 leading-none italic">Manifesto Reversal Protocol</div>
            <h2 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-3">
               {t('saleReturn.title', 'Sale Return Control')}
               <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full border border-white/20 font-black tracking-widest not-italic">PHASE_0{step}</span>
            </h2>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-red-600 text-white p-2.5 rounded-xl transition-all active:scale-95 border border-white/10 shadow-lg group">
            <X size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* Global Awareness Alerts */}
        {error && (
          <div className="px-8 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] animate-pulse flex items-center gap-3 italic">
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            {error}
          </div>
        )}
        {success && (
          <div className="px-8 py-3 bg-slate-900 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 italic border-b border-emerald-400/20">
            <CheckCircle2 size={14} strokeWidth={3} />
            {success}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-8 bg-white scroller-industrial">
          
          {/* STEP 1: NOMENCLATURE SELECTION */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-4 border-l-4 border-black pl-4">
                 <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Select Active Transaction</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Isolating available sales pipeline density</p>
                 </div>
              </div>

              {availableSales.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-3xl group">
                   <Hash className="w-12 h-12 text-slate-100 mx-auto mb-4 group-hover:text-black transition-colors" strokeWidth={1} />
                   <p className="text-slate-300 font-black uppercase tracking-[0.5em] text-[10px] italic">Zero Transaction Density Detected</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {availableSales.map(sale => (
                    <button
                      key={sale.id}
                      onClick={() => handleSelectSale(sale)}
                      className="group relative transition-all text-left p-6 bg-slate-50 border-2 border-transparent hover:border-black hover:bg-white rounded-2xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.05)] overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-full bg-slate-900 overflow-hidden translate-x-full transition-transform group-hover:translate-x-0 duration-500 flex items-center justify-center">
                         <ChevronRight size={32} className="text-white" strokeWidth={3} />
                      </div>
                      
                      <div className="relative z-10 flex justify-between items-center">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center font-black text-[10px]">{sale.invoice_no.split('-').pop()}</div>
                             <span className="font-black text-slate-900 uppercase tracking-tighter text-base">{sale.invoice_no}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                             <User size={12} strokeWidth={3} />
                             {sale.customer_name || 'WALK_IN_AUTHENTICATION'}
                          </div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2 bg-slate-200/50 px-2 py-1 rounded inline-block">{sale.item_summary}</p>
                        </div>
                        <div className="text-right group-hover:translate-x-[-100px] transition-transform duration-500 mr-8">
                          <p className="text-xl font-black text-slate-900 italic tracking-tighter">₹{parseFloat(sale.net_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{sale.item_count} CORE_OBJECTS</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: OBJECT REVERSAL ARRAY */}
          {step === 2 && selectedSale && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-6">
                <div className="flex items-center gap-5">
                   <button onClick={() => setStep(1)} className="p-3 bg-slate-100 rounded-xl hover:bg-black hover:text-white transition-all active:scale-90 border border-slate-200 group">
                      <ArrowLeft size={18} strokeWidth={3} className="group-hover:translate-x-[-2px] transition-transform" />
                   </button>
                   <div>
                      <h4 className="text-base font-black text-slate-900 uppercase tracking-tighter italic">Source: {selectedSale.invoice_no}</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{selectedSale.customer_name} / AUTH_VERIFIED</p>
                   </div>
                </div>
                <div className="text-right">
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Origin Date</div>
                   <div className="font-mono text-xs font-black">{new Date(selectedSale.sale_date).toLocaleDateString('en-GB')}</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                   <div className="w-2 h-4 bg-black"></div>
                   Select Objects For Reversal
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {returnItems.map((item, index) => (
                    <div key={item.item_id} className={`p-6 border-2 rounded-2xl transition-all ${item.return_quantity > 0 ? 'bg-slate-900 border-black shadow-xl scale-[1.02]' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <p className={`font-black uppercase tracking-tight text-base ${item.return_quantity > 0 ? 'text-white italic' : 'text-slate-900'}`}>{item.item_name}</p>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${item.return_quantity > 0 ? 'text-slate-500 italic' : 'text-slate-400 opacity-60'}`}>ORIGINAL_QUOTA: {item.quantity} UNITS × ₹{parseFloat(item.sale_rate || 0).toFixed(2)}</p>
                        </div>
                        <p className={`font-black text-base italic tracking-tighter ${item.return_quantity > 0 ? 'text-white opacity-40' : 'text-slate-900'}`}>₹{parseFloat(item.amount || 0).toFixed(2)}</p>
                      </div>
                      
                      <div className="flex items-center gap-6 pt-4 border-t border-white/10">
                        <div className="flex-1 space-y-2">
                           <label className={`text-[9px] font-black uppercase tracking-widest block ${item.return_quantity > 0 ? 'text-slate-400' : 'text-slate-500'}`}>Reversal Quantity :</label>
                           <div className="relative">
                             <input
                               type="number"
                               min="0"
                               max={item.quantity}
                               step="1"
                               value={item.return_quantity}
                               onChange={(e) => handleReturnQtyChange(index, e.target.value)}
                               className={`w-full px-4 py-3 font-mono font-black text-sm rounded-xl outline-none transition-all ${
                                 item.return_quantity > 0 
                                  ? 'bg-black text-white border-2 border-white/20 focus:border-white' 
                                  : 'bg-white text-black border-2 border-slate-200 focus:border-black shadow-inner'
                               }`}
                             />
                           </div>
                        </div>
                        <div className="flex-1 text-right">
                           <p className={`text-[8px] font-black uppercase tracking-widest ${item.return_quantity > 0 ? 'text-slate-500' : 'text-slate-400'}`}>Calculated Reversal :</p>
                           <p className={`text-xl font-black tracking-tighter italic m-0 ${item.return_quantity > 0 ? 'text-white underline decoration-white/20 underline-offset-8' : 'text-slate-900'}`}>₹{parseFloat(item.return_amount || 0).toLocaleString('en-IN', { minDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* REVERSAL METADATA CONTROL */}
              <div className="grid grid-cols-2 gap-8 border-2 border-slate-900 p-8 rounded-3xl bg-slate-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10 bg-black rounded-bl-3xl">
                   <DollarSign size={80} strokeWidth={1} />
                </div>
                
                <div className="space-y-6 relative z-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 italic">
                       <Calendar size={12} strokeWidth={3} /> REVERSAL_EPOCH :
                    </label>
                    <input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg focus:scale-[1.02] transition-transform outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 italic">
                       Settlement Logic :
                    </label>
                    <div className="flex gap-2 p-1 bg-white border-2 border-slate-900 rounded-xl shadow-lg">
                       {['cash', 'credit'].map(type => (
                         <button
                           key={type}
                           onClick={() => setRefundType(type)}
                           className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
                             refundType === type ? 'bg-black text-white italic' : 'text-slate-300 hover:text-black'
                           }`}
                         >
                           {type}
                         </button>
                       ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 relative z-10 flex flex-col">
                  <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">NARRATIVE / CAUSE :</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ISOLATE REASON FOR INVENTORY REVERSAL..."
                    rows="5"
                    className="flex-1 w-full px-4 py-3 bg-white border-2 border-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg focus:scale-[1.02] transition-transform outline-none placeholder:text-slate-200 placeholder:italic resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FINAL AUDIT & COMMIT */}
          {step === 3 && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
               <div className="text-center space-y-4 py-12 border-4 border-black rounded-[3rem] bg-slate-50 shadow-2xl relative overflow-hidden group">
                  <div className="absolute -left-10 -top-10 text-black/5 rotate-12 transition-transform duration-1000 group-hover:scale-150"><DollarSign size={200} /></div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter italic text-slate-900">Protocol Review</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic mb-8">Manifest pending core registry synchronization</p>
                  
                  <div className="bg-slate-900 mx-12 p-10 rounded-[2rem] text-white shadow-[0_30px_60px_rgba(0,0,0,0.3)]">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-4">Total Liquidity Reversal</p>
                      <p className="text-6xl font-black tracking-tighter italic drop-shadow-2xl">₹{parseFloat(totalReturnAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      <div className="flex justify-center gap-8 mt-10 border-t border-white/10 pt-8">
                         <div className="text-center">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Objects</p>
                            <p className="text-xl font-black italic">{returnItems.filter(i => i.return_quantity > 0).length}</p>
                         </div>
                         <div className="w-[1px] bg-white/10 h-10 self-center"></div>
                         <div className="text-center">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Settlement</p>
                            <p className="text-xl font-black italic uppercase">{refundType}</p>
                         </div>
                      </div>
                  </div>
               </div>

               <div className="bg-white border-2 border-slate-100 p-8 rounded-3xl">
                  {/* GST INJECTION */}
                  <GSTSelector
                    amount={totalReturnAmount}
                    isIntraState={true}
                    showBreakdown={true}
                    onGSTChange={(data) => setGstData(data)}
                  />
               </div>
            </div>
          )}
        </div>

        {/* SHIPMENT CONTROLS */}
        <div className="bg-slate-100 border-t-2 border-slate-900 px-8 py-6 flex justify-between items-center shadow-inner">
           {step > 1 ? (
             <button
               onClick={() => setStep(step - 1)}
               className="px-8 py-3.5 bg-white border-2 border-slate-900 text-slate-900 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-50 transition-all active:scale-95 flex items-center gap-3 italic"
             >
               <ArrowLeft size={14} strokeWidth={3} /> Disconnect Phase
             </button>
           ) : (
             <div className="w-[1px]"></div>
           )}

           <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="px-6 py-3.5 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-black transition-colors italic"
              >
                Abort Protocol
              </button>
              
              {step < 3 ? (
                <button
                  disabled={step === 2 && returnItems.every(i => i.return_quantity <= 0)}
                  onClick={() => setStep(step + 1)}
                  className="px-12 py-3.5 bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-2xl flex items-center gap-3 italic disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group border-2 border-black"
                >
                  Advance Phase <ChevronRight size={14} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={handleSubmitReturn}
                  disabled={loading}
                  className="px-16 py-3.5 bg-slate-900 text-emerald-400 font-black uppercase tracking-[0.2em] rounded-xl hover:bg-black transition-all active:scale-90 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-3 border-2 border-emerald-400/20 italic"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin"></div> : <CheckCircle2 size={16} strokeWidth={3} />}
                  COMMIT INVENTORY REVERSAL
                </button>
              )}
           </div>
        </div>

        {/* INDUSTRIAL BACKGROUND DECOR */}
        <style dangerouslySetInnerHTML={{ __html: `
          .scroller-industrial::-webkit-scrollbar { width: 6px; }
          .scroller-industrial::-webkit-scrollbar-track { background: #f1f5f9; }
          .scroller-industrial::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .scroller-industrial::-webkit-scrollbar-thumb:hover { background: #64748b; }
        `}} />
      </div>
    </div>
  );
}
