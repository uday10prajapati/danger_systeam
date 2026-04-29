import React, { useState, useEffect } from 'react';
import {
  Plus, X, Eye, ChevronRight, CheckCircle2,
  User, Hash, Calendar, DollarSign, ArrowLeft,
  Search, ShieldCheck, ShoppingBag, Package,
  Save, RefreshCcw, Activity, Layout, FileText,
  AlertCircle, ChevronDown, Trash2, Command,
  TrendingDown, Database, ShoppingCart, Layers
} from 'lucide-react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
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

export default function SaleReturnForm({ onClose, onSuccess, company }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableSales, setAvailableSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [refundType, setRefundType] = useState('cash');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [gstData, setGstData] = useState(null);

  // Member Search States
  const [members, setMembers] = useState([]);
  const [searchCode, setSearchCode] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  useEffect(() => {
    if (company?.id) {
      fetchAvailableSales();
      fetchMembers();
    }
  }, [company]);

  const fetchMembers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/accounts/company/${company.id}`, {
        headers: { 'x-company-id': company.id }
      });
      setMembers(res.data.success ? res.data.data : []);
    } catch (err) {
      console.error('Fetch members error', err);
    }
  };

  const handleMemberSelect = (m) => {
    setSelectedMember(m);
    setSearchCode(String(m.id));
    setSearchText(m.account_name);
    setShowMemberDropdown(false);
  };

  // Auto-select on code match
  useEffect(() => {
    if (searchCode && !selectedMember) {
      const match = members.find(m => String(m.id) === searchCode);
      if (match) handleMemberSelect(match);
    }
  }, [searchCode, members]);

  const filteredMembers = members.filter(m => {
    const cMatch = searchCode ? String(m.id).includes(searchCode) : true;
    const nMatch = searchText ? m.account_name.toLowerCase().includes(searchText.toLowerCase()) : true;
    return cMatch && nMatch;
  });

  const fetchAvailableSales = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/sale-returns/available-sales`,
        { headers: { 'x-company-id': company.id, 'x-user-id': 1 } }
      );
      setAvailableSales(response.data.data);
    } catch (err) {
      setError('Connection Failure: Pipeline unreachable');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSale = async (sale) => {
    try {
      setLoading(true);
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
      setError('');
    } catch (err) {
      setError('Sync Failure: Transaction shard corrupted');
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (index, delta) => {
    const updated = [...returnItems];
    const currentQty = parseInt(updated[index].return_quantity) || 0;
    const newQty = Math.min(Math.max(0, currentQty + delta), updated[index].quantity);
    updated[index].return_quantity = newQty;
    updated[index].return_amount = newQty * parseFloat(updated[index].sale_rate || 0);
    setReturnItems(updated);
  };

  const handleSubmit = async () => {
    const itemsToReturn = returnItems.filter(item => item.return_quantity > 0);
    if (itemsToReturn.length === 0) return setError('Mandatory: One component required for reversal');

    try {
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
  const filteredSales = availableSales.filter(s => {
    const termMatch = s.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customer_name && s.customer_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const memberMatch = selectedMember ? s.customer_account_id === selectedMember.id : true;
    return termMatch && memberMatch;
  });

  return (
    <div className="bg-white rounded-lg border border-slate-100 shadow-2xl p-10 relative overflow-hidden animate-in slide-in-from-bottom duration-500">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/20 rounded-full -mr-32 -mt-32 blur-3xl shadow-inner"></div>

      <div className="relative z-10 space-y-12">

        {/* Step 1: Initialize Manifest */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
              <div className="w-8 h-0.5 bg-blue-600"></div> Initialize Reversal Manifest
            </h3>
            {selectedSale && (
              <button
                onClick={() => setSelectedSale(null)}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1.5"
              >
                <RefreshCcw size={12} /> Change Source
              </button>
            )}
          </div>

          {!selectedSale ? (
            <div className="space-y-6">
              {/* Member Lookup Row */}
              <div className="flex flex-col md:flex-row gap-6 relative">
                <div className="w-full md:w-32 lg:w-40 space-y-2">
                  <FormLabel icon={Hash}>Member Code</FormLabel>
                  <FormInput
                    placeholder="ID"
                    value={searchCode}
                    onChange={(e) => {
                      setSearchCode(e.target.value);
                      setShowMemberDropdown(true);
                      if (selectedMember) setSelectedMember(null);
                    }}
                    onFocus={() => setShowMemberDropdown(true)}
                    className="text-center"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <FormLabel icon={User}>Member Name</FormLabel>
                  <FormInput
                    icon={Search}
                    placeholder="SEARCH BY NAME..."
                    value={searchText}
                    onChange={(e) => {
                      setSearchText(e.target.value);
                      setShowMemberDropdown(true);
                      if (selectedMember) setSelectedMember(null);
                    }}
                    onFocus={() => setShowMemberDropdown(true)}
                  />
                </div>

                {showMemberDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-100 shadow-2xl rounded-lg overflow-hidden z-[100] mt-1 animate-in zoom-in-95 duration-200">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center italic">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identified Entity Nodes</span>
                      <X size={12} className="text-slate-300 cursor-pointer" onClick={() => setShowMemberDropdown(false)} />
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {filteredMembers.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => handleMemberSelect(m)}
                          className="px-8 py-4 hover:bg-blue-50 flex justify-between items-center cursor-pointer group transition-colors border-b border-slate-50 last:border-none"
                        >
                          <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600 uppercase italic">{m.account_name}</span>
                          <span className="text-[10px] font-bold text-slate-300 group-hover:text-blue-300 tracking-[0.2em]">NODE_#{m.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative group">
                <FormLabel icon={ShoppingCart}>Source Manifest Identifier</FormLabel>
                <div className="relative">
                  <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600" />
                  <input
                    type="text"
                    placeholder="SELECT RELEVANT TRANSACTION SHARD..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-14 pl-14 pr-6 bg-slate-50/50 border border-slate-100 rounded-lg focus:bg-white focus:border-blue-500 outline-none transition-all font-black uppercase text-xs tracking-widest placeholder:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 scroller-airy">
                {filteredSales.map(sale => (
                  <button
                    key={sale.id}
                    onClick={() => handleSelectSale(sale)}
                    className="p-6 bg-white border border-slate-50 hover:border-blue-200 rounded-lg shadow-sm hover:shadow-xl hover:shadow-blue-50/50 transition-all text-left group flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-800 tracking-tight group-hover:text-blue-600">{sale.invoice_no}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic truncate max-w-[150px]">{sale.customer_name || 'WALK-IN_ENTITY'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black italic text-slate-900">₹{parseFloat(sale.net_amount).toLocaleString()}</p>
                      <p className="text-[9px] font-black text-slate-300 uppercase italic">{new Date(sale.sale_date).toLocaleDateString('en-GB')}</p>
                    </div>
                  </button>
                ))}
                {filteredSales.length === 0 && (
                  <div className="col-span-2 py-10 text-center text-slate-200 italic font-black uppercase text-[10px] tracking-[0.3em]">No Shards Detected</div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 bg-slate-900 rounded-lg border border-slate-800 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-br from-blue-600/10 to-transparent"></div>
              <div className="relative z-10 flex justify-between items-end">
                <div>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-2 block italic">Source Registry Shard</span>
                  <h4 className="text-3xl font-black italic tracking-tighter">{selectedSale.invoice_no}</h4>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Entity Auth</p>
                  <p className="text-sm font-black uppercase truncate max-w-[250px]">{selectedSale.customer_name || 'WALK_IN_AUTHENTICATION'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Component Configuration */}
        {selectedSale && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
              <div className="w-8 h-0.5 bg-emerald-500"></div> Component Shard Configuration
            </h3>

            <div className="space-y-4">
              {returnItems.map((item, index) => (
                <div key={item.item_id} className={`p-8 rounded-lg border transition-all ${item.return_quantity > 0 ? 'bg-white border-blue-200 shadow-xl ring-1 ring-blue-50' : 'bg-slate-50/50 border-slate-100'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-base font-black text-slate-800 tracking-tight uppercase italic">{item.item_name}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Source: {item.quantity} Units @ ₹{parseFloat(item.sale_rate).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Impact Value</p>
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
                        className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all font-black shadow-sm"
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
                        className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${refundType === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <FormLabel icon={FileText}>Auditor Dashboard Notes</FormLabel>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ISOLATE REASON FOR REVERSAL..."
                  className="w-full px-6 py-5 bg-slate-50/50 border border-slate-100 focus:bg-white focus:border-blue-500 outline-none rounded-lg font-black uppercase text-[10px] tracking-widest placeholder:text-slate-200 h-full resize-none transition-all italic"
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
        {selectedSale && (
          <div className="bg-slate-900 p-10 rounded-lg text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:rotate-12 transition-transform duration-700"><TrendingDown size={150} /></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="text-center md:text-left">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] mb-2 italic">Net Reversal Value Shard</p>
                <div className="flex items-start justify-center md:justify-start gap-1">
                  <span className="text-2xl mt-2 font-black text-blue-600 italic">₹</span>
                  <span className="text-7xl font-black italic tracking-tighter drop-shadow-2xl">{totalReturnAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <button
                  onClick={handleSubmit}
                  disabled={loading || totalReturnAmount <= 0}
                  className="flex-1 md:flex-none bg-blue-600 hover:bg-white hover:text-blue-600 text-white font-black py-6 px-12 rounded-lg transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3 uppercase text-xs tracking-widest italic"
                >
                  {loading ? <RefreshCcw className="animate-spin" size={20} /> : <><Save size={20} /> Commit Manifest</>}
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
