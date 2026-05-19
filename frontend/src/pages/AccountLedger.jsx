import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import React, { useState, useEffect } from 'react';
import {
   Search, Download, Filter, X, ChevronRight, Printer,
   FileText, Database, Activity, Layout, BookOpen,
   TrendingDown, TrendingUp, DollarSign, RefreshCcw,
   Trash2, ShieldCheck, CheckCircle2, Hash, User, ChevronDown, Book, Users
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import TableHeading from '../components/TableHeading';
import Toast from '../components/Toast';
import Loading from '../components/Loading';
import api from '../api';
import { addGujaratiFont, addPromptFont } from '../utils/pdfFonts';
import { formatBilingualText, translateSystemText } from '../utils/textUtils';


export default function AccountLedger() {
   const { t, i18n } = useTranslation();
   const [view, setView] = useState('ledger');
   const [accounts, setAccounts] = useState([]);
   const [selectedAccount, setSelectedAccount] = useState(null);
   const [ledgerEntries, setLedgerEntries] = useState([]);
   const [accountBalance, setAccountBalance] = useState({ total_debit: 0, total_credit: 0, running_balance: 0 });
   const [breakdownData, setBreakdownData] = useState([]);
   const [expandedMembers, setExpandedMembers] = useState({});
   const [memberEntries, setMemberEntries] = useState({});
   const [searchTerm, setSearchTerm] = useState('');
   const [company, setCompany] = useState(null);
   const [message, setMessage] = useState(null);
   const [dateRange, setDateRange] = useState({
      startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
   });
   const [loading, setLoading] = useState(false);
   const [memberCodeSearch, setMemberCodeSearch] = useState('');
   const [memberNameSearch, setMemberNameSearch] = useState('');
   const [showMemberDropdown, setShowMemberDropdown] = useState(false);
   const [bardanPrice, setBardanPrice] = useState(0);

   // Focus navigation refs
   const startDateRef = React.useRef(null);
   const endDateRef = React.useRef(null);
   const accCodeRef = React.useRef(null);
   const accNameRef = React.useRef(null);
   const dropdownRef = React.useRef(null);

   const [accActiveIdx, setAccActiveIdx] = useState(0);

   useEffect(() => {
      setAccActiveIdx(0);
   }, [memberCodeSearch, memberNameSearch]);

   useEffect(() => {
      const handleClickOutside = (event) => {
         if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setShowMemberDropdown(false);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
         document.removeEventListener('mousedown', handleClickOutside);
      };
   }, []);

   const handleAccCodeKeyDown = (e) => {
      if (showMemberDropdown && filteredAccounts.length > 0) {
         if (e.key === 'ArrowDown') {
            e.preventDefault();
            setAccActiveIdx((prev) => Math.min(prev + 1, filteredAccounts.length - 1));
         } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setAccActiveIdx((prev) => Math.max(prev - 1, 0));
         } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            const selected = filteredAccounts[accActiveIdx];
            if (selected) {
               handleSelectAccount(selected);
               if (accNameRef.current) {
                  accNameRef.current.focus();
               }
            }
         } else if (e.key === 'Escape') {
            setShowMemberDropdown(false);
         }
      } else {
         if (e.key === 'Enter') {
            e.preventDefault();
            if (accNameRef.current) {
               accNameRef.current.focus();
            }
         }
      }
   };

   const handleAccNameKeyDown = (e) => {
      if (showMemberDropdown && filteredAccounts.length > 0) {
         if (e.key === 'ArrowDown') {
            e.preventDefault();
            setAccActiveIdx((prev) => Math.min(prev + 1, filteredAccounts.length - 1));
         } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setAccActiveIdx((prev) => Math.max(prev - 1, 0));
         } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            const selected = filteredAccounts[accActiveIdx];
            if (selected) {
               handleSelectAccount(selected);
            }
         } else if (e.key === 'Escape') {
            setShowMemberDropdown(false);
         }
      } else {
         if (e.key === 'Enter') {
            e.preventDefault();
         }
      }
   };

   const handleKeyDown = (e, nextRef, submitFn) => {
      if (e.key === 'Enter') {
         e.preventDefault();
         if (nextRef && nextRef.current) {
            nextRef.current.focus();
         } else if (submitFn) {
            submitFn();
         }
      }
   };

   const handleInputChangeWithAutocomplete = (e, inputRef, list, nameKey, setValue, setShowDrop) => {
      const typedVal = e.target.value;
      const inputType = e.nativeEvent?.inputType || '';

      setValue(typedVal);
      if (setShowDrop) setShowDrop(true);

      if (inputType.startsWith('delete') || inputType === 'historyUndo') {
         return;
      }

      if (!typedVal.trim()) return;

      const match = list[0];

      if (match) {
         const rawText = match[nameKey] || '';
         const matchText = i18n.language === 'gu' ? translateSystemText(match.account_name_gu || rawText) : rawText;
         if (matchText.toLowerCase().startsWith(typedVal.toLowerCase())) {
            setValue(matchText);
            setTimeout(() => {
               const input = inputRef.current;
               if (input) {
                  input.setSelectionRange(typedVal.length, matchText.length);
               }
            }, 0);
         }
      }
   };

   useEffect(() => {
      loadCompany();
   }, []);

   const loadCompany = async () => {
      try {
         const response = await api.get('/company');
         if (response.data.success && response.data.data) {
            setCompany(response.data.data);
         }
      } catch (error) {
         console.error('Failed to load company', error);
      }
   };

   useEffect(() => {
      if (company?.id) {
         fetchAccounts();
         fetchBardanPrice();
      }
   }, [company]);

   const fetchBardanPrice = async () => {
      try {
         const response = await api.get('/bardan-price');
         if (response.data.success && response.data.data) {
            setBardanPrice(parseFloat(response.data.data.price_per_bardan || 0));
         }
      } catch (error) {
         console.error('Failed to load bardan price', error);
      }
   };

   const fetchAccounts = async () => {
      try {
         const response = await api.get(`/accounts/company/${company.id}`);
         if (response.data.data) {
            setAccounts(response.data.data);
         }
      } catch (err) {
         console.error('Fetch accounts error:', err);
      }
   };

   const fetchAccountLedger = async (accountId) => {
      try {
         setLoading(true);
         const response = await api.get(
            `/account-ledger/account/${accountId}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
         );
         if (response.data.success) {
            setLedgerEntries(response.data.data);
         }
      } catch (err) {
         console.error('Fetch ledger error:', err);
      } finally {
         setLoading(false);
      }
   };

   const fetchMemberLedgerEntries = async (memberId) => {
      try {
         setMemberEntries(prev => ({ ...prev, [memberId]: null }));
         const response = await api.get(
            `/account-ledger/account/${selectedAccount.id}?memberId=${memberId}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
         );
         if (response.data.success) {
            setMemberEntries(prev => ({ ...prev, [memberId]: response.data.data }));
         }
      } catch (err) {
         console.error('Fetch member ledger error:', err);
         setMemberEntries(prev => ({ ...prev, [memberId]: [] }));
      }
   };

   const toggleMemberExpansion = (memberId) => {
      const isExpanding = !expandedMembers[memberId];
      setExpandedMembers(prev => ({ ...prev, [memberId]: isExpanding }));
      if (isExpanding) {
         fetchMemberLedgerEntries(memberId);
      }
   };

   const fetchAccountBalance = async (accountId) => {
      try {
         const response = await api.get(
            `/account-ledger/account-stats/${accountId}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
         );
         if (response.data.success) {
            setAccountBalance(response.data.data);
         }
      } catch (err) {
         console.error('Fetch balance error:', err);
      }
   };

   const fetchAccountBreakdown = async (accountId) => {
      try {
         const response = await api.get(
            `/account-ledger/breakdown/${accountId}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
         );
         if (response.data.success) {
            setBreakdownData(response.data.data);
            setExpandedMembers({});
            setMemberEntries({});
         }
      } catch (err) {
         console.error('Fetch breakdown error:', err);
      }
   };

   const handleSelectAccount = async (account) => {
      setSelectedAccount(account);
      setMemberCodeSearch(account ? String(account.id) : '');
      setMemberNameSearch(account ? (i18n.language === 'gu' ? translateSystemText(account.account_name_gu || account.account_name) : account.account_name) : '');
      setShowMemberDropdown(false);
      setView('ledger');

      if (account) {
         const targetId = account.id;
         await Promise.all([
            fetchAccountLedger(targetId),
            fetchAccountBalance(targetId),
            fetchAccountBreakdown(targetId)
         ]);
      } else {
         setLedgerEntries([]);
         setAccountBalance({ total_debit: 0, total_credit: 0, running_balance: 0 });
         setBreakdownData([]);
      }
   };

   useEffect(() => {
      if (memberCodeSearch && (!selectedAccount || String(selectedAccount.id) !== memberCodeSearch)) {
         const exactMatch = accounts.find(acc => String(acc.id) === memberCodeSearch);
         if (exactMatch) {
            handleSelectAccount(exactMatch);
         }
      } else if (!memberCodeSearch && selectedAccount) {
         handleSelectAccount(null);
      }
   }, [memberCodeSearch, accounts]);

   useEffect(() => {
      if (memberNameSearch && (!selectedAccount || (selectedAccount.account_name || '').toLowerCase() !== memberNameSearch.toLowerCase())) {
         const exactMatch = accounts.find(acc =>
            (acc.account_name || '').toLowerCase() === memberNameSearch.toLowerCase() ||
            (acc.account_name_gu || '').toLowerCase() === memberNameSearch.toLowerCase()
         );
         if (exactMatch) {
            handleSelectAccount(exactMatch);
         }
      }
   }, [memberNameSearch, accounts]);

   const filteredAccounts = accounts.filter(acc => {
      const idStr = memberCodeSearch ? memberCodeSearch.toLowerCase() : '';
      const nameQuery = memberNameSearch ? memberNameSearch.toLowerCase() : '';
      return (!idStr || String(acc.id).toLowerCase().includes(idStr)) &&
         (!nameQuery ||
          (acc.account_name || '').toLowerCase().includes(nameQuery) || 
          (acc.account_name_gu || '').toLowerCase().includes(nameQuery));
   });

   const handleDateChange = () => {
      if (selectedAccount) {
         fetchAccountLedger(selectedAccount.id);
         fetchAccountBalance(selectedAccount.id);
         fetchAccountBreakdown(selectedAccount.id);
      }
   };

   useEffect(() => {
      handleDateChange();
   }, [dateRange.startDate, dateRange.endDate]);

   const clearFilters = () => {
      setMemberCodeSearch('');
      setMemberNameSearch('');
      setSelectedAccount(null);
      setLedgerEntries([]);
      setAccountBalance({ total_debit: 0, total_credit: 0, running_balance: 0 });
      setBreakdownData([]);
      setDateRange({
         startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
         endDate: new Date().toISOString().split('T')[0]
      });
      setView('ledger');
   };

   const handleExportPDF = async () => {
      if (!selectedAccount || ledgerEntries.length === 0) {
         alert('Please select an account with transactions first.');
         return;
      }
      const cName = company ? (company.company_name || 'Company') : 'Company';
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      await addGujaratiFont(doc);
      await addPromptFont(doc);
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 32;
      const navy = [37, 99, 235], white = [255, 255, 255], gray = [100, 116, 139], dark = [30, 41, 59], stripe = [241, 245, 249];

      const hdr = () => {
         doc.setFillColor(...navy); doc.rect(0, 0, W, 28, 'F');
         doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...white);
         doc.text(cName, M, 18);
         doc.setFontSize(7.5); doc.setTextColor(191, 219, 254);
         doc.text('ACCOUNT LEDGER AUDIT REGISTRY', W / 2, 18, { align: 'center' });
         doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
         doc.text('CONFIDENTIAL', W - M, 18, { align: 'right' });
      };

      const ftr = (pg, tot) => {
         doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4);
         doc.line(M, H - 18, W - M, H - 18);
         doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(7); doc.setTextColor(...gray);
         doc.text(cName + ' - Ledger Audit', M, H - 9);
         doc.text('Generated: ' + new Date().toLocaleString('en-IN'), W / 2, H - 9, { align: 'center' });
         doc.text('Page ' + pg + ' of ' + tot, W - M, H - 9, { align: 'right' });
      };

      hdr();
      let y = 62;
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(16); doc.setTextColor(...navy);
      doc.text(translateSystemText(selectedAccount.account_name_gu || selectedAccount.account_name), M, y);
      doc.setFont('NotoGujarati', 'normal'); doc.setFontSize(8); doc.setTextColor(...gray);
      doc.text('AUDIT_CLASS: ' + (selectedAccount.account_type || '-') + '  |  PERIOD: ' + dateRange.startDate + ' to ' + dateRange.endDate, M, y + 13);
      doc.text('GENERATED: ' + new Date().toLocaleString('en-IN'), W - M, y + 13, { align: 'right' });
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.4); doc.line(M, y + 18, W - M, y + 18);
      y += 32;

      const totDr = parseFloat(accountBalance.total_debit || 0);
      const totCr = parseFloat(accountBalance.total_credit || 0);
      const bal = parseFloat(accountBalance.balance || accountBalance.running_balance || 0);
      
      autoTable(doc, {
         startY: y,
         head: [[t('accountLedger.date'), t('accountLedger.descriptionMember'), 'Debit', 'Credit', t('accountLedger.balance')]],
         body: [
            ...(parseFloat(accountBalance.opening_balance || 0) !== 0 ? [[
               '—',
               t('accountLedger.openingBalanceForward'),
               accountBalance.opening_balance_type === 'debit' ? parseFloat(accountBalance.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—',
               accountBalance.opening_balance_type === 'credit' ? parseFloat(accountBalance.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—',
               parseFloat(accountBalance.opening_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' ' + (accountBalance.opening_balance_type === 'debit' ? 'DR' : 'CR'),
            ]] : []),
            ...ledgerEntries.map(e => [
               new Date(e.transaction_date).toLocaleDateString('en-GB'),
               translateSystemText((e.description || '-') + (e.member_name ? ' [' + e.member_name + ']' : '')),
               parseFloat(e.debit || 0) > 0 ? parseFloat(e.debit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-',
               parseFloat(e.credit || 0) > 0 ? parseFloat(e.credit).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-',
               Math.abs(parseFloat(e.running_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' ' + (parseFloat(e.running_balance) >= 0 ? 'DR' : 'CR'),
            ])
         ],
         foot: [['', 'CONSOLIDATED TOTALS', totDr.toLocaleString('en-IN', { minimumFractionDigits: 2 }), totCr.toLocaleString('en-IN', { minimumFractionDigits: 2 }), Math.abs(bal).toLocaleString('en-IN', { minimumFractionDigits: 2 }) + ' ' + (bal >= 0 ? 'DR' : 'CR')]],
         styles: { font: 'NotoGujarati', fontSize: 8, cellPadding: [4, 5], textColor: dark, lineColor: [226, 232, 240], lineWidth: 0.3 },
         headStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'bold', fontSize: 7.5 },
         footStyles: { font: 'NotoGujarati', fillColor: navy, textColor: white, fontStyle: 'bold', fontSize: 7.5 },
         alternateRowStyles: { fillColor: stripe },
         didParseCell: (data) => {
            const text = data.cell.text.join(' ');
            if (!text) return;

            // Use NotoGujarati for Unicode characters
            if (/[\u0A80-\u0AFF]/.test(text)) {
               data.cell.styles.font = 'NotoGujarati';
               return;
            }

            // Use Prompt font for legacy-mapped Gujarati (lowercase text)
            if (/[a-z]/.test(text)) {
               data.cell.styles.font = 'Prompt';
            } else {
               // Use standard Helvetica for numbers, codes, and uppercase text
               data.cell.styles.font = 'helvetica';
            }
         },
         theme: 'grid',
         margin: { left: M, right: M },
         columnStyles: {
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right', fontStyle: 'bold' },
         },
      });

      const tot = doc.internal.getNumberOfPages();
      for (let i = 1; i <= tot; i++) { doc.setPage(i); ftr(i, tot); }
      doc.save('Ledger_' + selectedAccount.account_name.replace(/\s+/g, '-') + '.pdf');
   };

   const handlePrint = () => {
      if (!selectedAccount || ledgerEntries.length === 0) {
         alert('Incomplete data stream for deployment.');
         return;
      }
      // Printing modal logic would go here
   };

   if (!company?.id) {
      return <Loading />;
   }

   return (
      <div className="min-h-screen bg-zinc-100 p-6 font-sans text-zinc-900 select-none">
         <Toast message={message} onClose={() => setMessage(null)} />

         <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-4 space-y-4">
            
            {/* Compact, Redesigned Filter Console */}
            <div className="bg-zinc-50 border border-zinc-300 p-2.5 space-y-2 print:hidden">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center">
                  
                  {/* Date Range */}
                  <div className="lg:col-span-4 flex items-center gap-1">
                     <span className="text-[10px] font-bold text-zinc-500 min-w-[30px]">{t('accountLedger.temporalStart').split(' ')[0]}</span>
                     <input ref={startDateRef} type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} onKeyDown={e => handleKeyDown(e, endDateRef)} className="flex-1 px-1.5 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-[10px] text-zinc-700" />
                     <span className="text-[10px] font-bold text-zinc-500">-</span>
                     <input ref={endDateRef} type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} onKeyDown={e => handleKeyDown(e, accCodeRef)} className="flex-1 px-1.5 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-[10px] text-zinc-700" />
                  </div>

                  {/* Account Selection Autocomplete */}
                  <div className="lg:col-span-6 flex items-center gap-1 relative">
                     <span className="text-[10px] font-bold text-zinc-500 min-w-[45px]">{t('accountLedger.searchNomenclature').split(' ')[0]}</span>
                     <div className="flex flex-1 gap-1" ref={dropdownRef}>
                        <div className="w-16 relative">
                           <Hash size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                           <input ref={accCodeRef} type="text" value={memberCodeSearch} onChange={(e) => { setMemberCodeSearch(e.target.value); setShowMemberDropdown(true); }} onFocus={() => setShowMemberDropdown(true)} onKeyDown={handleAccCodeKeyDown} placeholder="ID" className="w-full pl-5 pr-1 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-mono font-bold text-[10px] text-zinc-700" />
                        </div>
                        <div className="flex-1 relative">
                           <User size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
                           <input ref={accNameRef} type="text" value={memberNameSearch} onChange={(e) => handleInputChangeWithAutocomplete(e, accNameRef, filteredAccounts, 'account_name', setMemberNameSearch, setShowMemberDropdown)} onFocus={() => setShowMemberDropdown(true)} onKeyDown={handleAccNameKeyDown} placeholder={t('accountLedger.searchPrompt')} className={`w-full pl-6 pr-1.5 py-1 bg-white border border-zinc-300 rounded-none outline-none focus:border-zinc-500 transition-all font-bold text-[10px] text-zinc-700 uppercase ${i18n.language === 'gu' ? 'font-prompt text-sm' : 'font-mono'}`} />
                           {showMemberDropdown && filteredAccounts.length > 0 && (
                              <div className="absolute top-[26px] left-0 right-0 bg-white border border-zinc-300 shadow-xl rounded-none z-[100] overflow-hidden w-full">
                                 <div className="max-h-48 overflow-y-auto">
                                    {filteredAccounts.map((a, idx) => (
                                       <div key={a.id} onClick={() => handleSelectAccount(a)} onMouseEnter={() => setAccActiveIdx(idx)} className={`px-3 py-1.5 flex justify-between items-center cursor-pointer border-b border-zinc-100 last:border-none group ${accActiveIdx === idx ? 'bg-blue-50 text-blue-700' : 'hover:bg-blue-50'}`}>
                                          <div className="flex items-center gap-1.5 truncate">
                                             <Search size={10} className={`transition-colors ${accActiveIdx === idx ? 'text-blue-600' : 'text-zinc-400'}`} />
                                             <span className={`text-[11px] font-bold transition-colors ${accActiveIdx === idx ? 'text-blue-700' : 'text-zinc-700 group-hover:text-blue-600'}`}>{formatBilingualText(a.account_name_gu || a.account_name)}</span>
                                          </div>
                                          <span className="text-[10px] font-sans text-zinc-400 shrink-0">#{a.id}</span>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* Clear button */}
                  <div className="lg:col-span-2 flex items-center justify-end">
                     <button
                        onClick={clearFilters}
                        className="w-full flex items-center justify-center gap-1 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-600 text-[10px] font-bold px-2 py-1.5 rounded-none transition cursor-pointer select-none uppercase whitespace-nowrap"
                     >
                        <X size={12} /> {t('accountLedger.clear')}
                     </button>
                  </div>

               </div>
            </div>

            {view === 'ledger' && (
               <div className="flex flex-col gap-4">

                  {selectedAccount ? (
                     <>
                        <div className="bg-white border border-zinc-300 shadow-sm overflow-hidden flex flex-col min-h-[600px] relative">
                           {/* Unified Table Header Bar with Actions & Tabs */}
                           <div className="px-3 py-1.5 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between flex-wrap gap-2 select-none">
                              <div className="flex items-center gap-2">
                                 <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                                    {formatBilingualText(selectedAccount.account_name_gu || selectedAccount.account_name)}
                                 </span>


                                 
                              </div>

                              <div className="flex items-center gap-1.5">
                                 <button onClick={handlePrint} className="p-1 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm select-none rounded-none" title={t('accountLedger.print')}><Printer size={12} /></button>
                                 <button onClick={handleExportPDF} className="p-1 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm select-none rounded-none" title={t('accountLedger.exportPdf')}><FileText size={12} /></button>
                                 <button onClick={() => fetchAccountLedger(selectedAccount.id)} className="p-1 text-zinc-500 hover:text-zinc-800 border border-zinc-300 bg-white hover:bg-zinc-50 transition shadow-sm" title="Refresh"><RefreshCcw size={12} className={loading ? 'animate-spin' : ''} /></button>
                              </div>
                           </div>

                           <div className="flex-1 overflow-x-auto scroller-airy bg-white">
                              <table className="w-full text-left font-mono text-xs border-collapse">
                                  <thead className="bg-zinc-50 border-b border-zinc-300 text-zinc-700 font-sans text-[10px]">
                                    <tr>
                                       {[
                                          t('accountLedger.date'),
                                          t('accountLedger.descriptionMember'),
                                          t('accountLedger.credit'),
                                          t('accountLedger.debit'),
                                          ...(selectedAccount?.account_code === 'BS0001' ? [t('accountLedger.selfJama')] : []),
                                          t('accountLedger.balance'),
                                          ...(selectedAccount?.account_code === 'BS0001' ? [t('accountLedger.bardanAmt')] : [])
                                       ].map((h, i) => (
                                          <th key={i} className={`px-2 py-1.5 font-bold border-r border-zinc-200 last:border-none ${i > 1 ? 'text-right' : ''}`}>
                                             {h}
                                          </th>
                                       ))}
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-zinc-200">
                                    {loading ? (
                                       <tr>
                                          <td colSpan="8" className="py-24 text-center text-zinc-300 font-bold text-xs">
                                             <RefreshCcw className="animate-spin mx-auto mb-4 text-zinc-250" size={30} />
                                             {t('accountLedger.syncing')}
                                          </td>
                                       </tr>
                                    ) : ledgerEntries.length === 0 ? (
                                       <tr>
                                          <td colSpan="8" className="py-24 text-center">
                                             <div className="max-w-md mx-auto">
                                                <Database size={36} className="mx-auto text-zinc-150 mb-4" strokeWidth={1} />
                                                <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[9px] italic">{t('accountLedger.noNodes')}</p>
                                             </div>
                                          </td>
                                       </tr>
                                    ) : (
                                       <>
                                          {parseFloat(accountBalance.opening_balance || 0) !== 0 && (
                                             <tr className="bg-zinc-50 border-b border-zinc-200 font-bold italic">
                                                <td className="px-2 py-1.5 text-zinc-400 border-r border-zinc-100">—</td>
                                                <td className="px-2 py-1.5 text-zinc-500 border-r border-zinc-100">{t('accountLedger.openingBalanceForward')}</td>
                                                <td className="px-2 py-1.5 text-right text-zinc-400 border-r border-zinc-100">{accountBalance.opening_balance_type === "credit" ? `₹${parseFloat(accountBalance.opening_balance).toLocaleString("en-IN")}` : "—"}</td>
                                                <td className="px-2 py-1.5 text-right text-zinc-400 border-r border-zinc-100">{accountBalance.opening_balance_type === "debit" ? `₹${parseFloat(accountBalance.opening_balance).toLocaleString("en-IN")}` : "—"}</td>
                                                <td className={`px-2 py-1.5 text-right font-black border-r border-zinc-100 ${accountBalance.opening_balance_type === "debit" ? "text-zinc-800" : "text-rose-600"}`}>₹{parseFloat(accountBalance.opening_balance).toLocaleString("en-IN")} {accountBalance.opening_balance_type === "debit" ? "D" : "C"}</td>
                                             </tr>
                                          )}
                                          {ledgerEntries.map((row, idx) => (
                                             <tr key={idx} className="group hover:bg-zinc-50 transition-all duration-300">
                                                <td className="px-2 py-1.5 text-zinc-600 border-r border-zinc-100 font-sans text-[10px]">{new Date(row.transaction_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                                <td className="px-2 py-1.5 font-bold text-zinc-700 border-r border-zinc-100">
                                                   <div className="flex flex-col leading-tight">
                                                      <span className="font-bold text-[11px] text-zinc-800 uppercase">{formatBilingualText(selectedAccount?.account_code === 'IK0001' ? `[INTEREST] ${row.description}` : row.description)}</span>
                                                      {row.member_name && (
                                                         <span className="text-[10px] text-blue-600 font-bold mt-0.5">
                                                            {t('accountLedger.node')}: {formatBilingualText(row.member_name)} {row.member_code ? `[${row.member_code}]` : ''}
                                                         </span>
                                                      )}
                                                   </div>
                                                </td>
                                                <td className="px-2 py-1.5 text-right font-bold text-zinc-800 border-r border-zinc-100">
                                                   {selectedAccount?.account_code === 'IK0001' ? (parseFloat(row.credit || 0) > 0 ? `₹${parseFloat(row.credit).toLocaleString('en-IN')}` : `₹0.00`) : parseFloat(row.credit || 0) > 0 ? ((selectedAccount?.account_code === 'BS0001' || row.description?.includes('[BARDAN]')) ? parseFloat(row.company_credit || 0) > 0 ? parseFloat(row.company_credit).toLocaleString('en-IN') : '—' : `₹${parseFloat(row.credit).toLocaleString('en-IN')}`) : '—'}
                                                </td>
                                                <td className="px-2 py-1.5 text-right font-bold text-zinc-800 border-r border-zinc-100">
                                                   {parseFloat(row.debit || 0) > 0 ? ((selectedAccount?.account_code === 'BS0001' || row.description?.includes('[BARDAN]')) ? parseFloat(row.debit).toLocaleString('en-IN') : `₹${parseFloat(row.debit).toLocaleString('en-IN')}`) : '—'}
                                                </td>
                                                {selectedAccount?.account_code === 'BS0001' && (
                                                   <td className="px-2 py-1.5 text-right font-bold text-emerald-600 border-r border-zinc-100">
                                                      {parseFloat(row.self_credit || 0) > 0 ? parseFloat(row.self_credit).toLocaleString('en-IN') : '—'}
                                                   </td>
                                                )}
                                                <td className={`px-2 py-1.5 text-right font-bold border-r border-zinc-100 ${parseFloat(row.running_balance) >= 0 ? 'text-zinc-800' : 'text-rose-600'}`}>
                                                   {(selectedAccount?.account_code === 'BS0001' || row.description?.includes('[BARDAN]')) ? `${Math.abs(parseFloat(row.running_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(row.running_balance) >= 0 ? 'D' : 'C'}` : `₹${Math.abs(parseFloat(row.running_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(row.running_balance) >= 0 ? 'D' : 'C'}`}
                                                </td>
                                                {selectedAccount?.account_code === 'BS0001' && (
                                                   <td className="px-2 py-1.5 text-right font-bold text-blue-600">
                                                      ₹{Math.abs(parseFloat(row.penalty_balance || row.running_balance) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                   </td>
                                                )}
                                             </tr>
                                          ))}
                                       </>
                                    )}
                                 </tbody>
                                 <tfoot className="bg-zinc-200 font-bold text-blue-700 uppercase text-[10px] tracking-widest border-t-2 border-zinc-300 sticky bottom-0 z-20 shadow-[0_-1px_0_0_rgba(209,213,219,1)]">
                                    <tr>
                                       <td colSpan="2" className="px-2 py-1.5 text-right">{t('accountLedger.registryTotals')}</td>
                                       <td className="px-2 py-1.5 text-right text-blue-700">₹{parseFloat(accountBalance.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                       <td className="px-2 py-1.5 text-right text-blue-700">₹{parseFloat(accountBalance.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                       {selectedAccount?.account_code === 'BS0001' && <td className="px-2 py-1.5 text-right text-blue-700">—</td>}
                                       <td className="px-2 py-1.5 text-right font-black text-blue-700">₹{Math.abs(parseFloat(accountBalance.running_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {parseFloat(accountBalance.running_balance) >= 0 ? 'DR' : 'CR'}</td>
                                    </tr>
                                 </tfoot>
                              </table>
                           </div>
                        </div>
                     </>
                  ) : (
                     <div className="bg-white border border-zinc-300 shadow-sm overflow-hidden flex flex-col min-h-[600px] relative">
                        <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between select-none">
                           <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-zinc-700">{t('accountLedger.institutionalRegistry')}</span>
                              
                           </div>
                           <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('accountLedger.selectNodePrompt')}</p>
                        </div>

                        <div className="flex-1 overflow-x-auto scroller-airy bg-white">
                           <table className="w-full text-left font-mono text-xs border-collapse">
                              <thead className="bg-zinc-50 border-b border-zinc-300 text-zinc-700 font-sans text-[10px]">
                                 <tr>
                                    <th className="px-2 py-1.5 font-bold border-r border-zinc-200">{t('accountLedger.nomenclature')}</th>
                                    <th className="px-2 py-1.5 font-bold border-r border-zinc-200">{t('accountLedger.registryClass')}</th>
                                    <th className="px-2 py-1.5 font-bold border-r border-zinc-200 text-right">{t('accountLedger.openingBal')}</th>
                                    <th className="px-2 py-1.5 font-bold text-right">{t('accountLedger.auditStatus')}</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200">
                                 {filteredAccounts.length === 0 ? (
                                    <tr><td colSpan="3" className="py-32 text-center text-zinc-300 font-bold text-sm tracking-[0.4em] ">{t('accountLedger.noShards')}</td></tr>
                                 ) : (
                                    filteredAccounts.map(acc => (
                                       <tr key={acc.id} onClick={() => handleSelectAccount(acc)} className="group hover:bg-zinc-50 cursor-pointer transition-all duration-300">
                                          <td className="px-2 py-1.5 border-r border-zinc-100">
                                             <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-zinc-800 group-hover:text-blue-600 transition-colors tracking-tight uppercase">{formatBilingualText(acc.account_name_gu || acc.account_name)}</span>
                                                <span className="text-[9px] font-black text-zinc-400 mt-0.5">{t('accountLedger.shaId')}: #{acc.id}</span>
                                             </div>
                                          </td>
                                          <td className="px-2 py-1.5 border-r border-zinc-100"><span className="px-1.5 py-1 bg-white border border-zinc-200 text-[10px] font-black text-zinc-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">{t(`accountTypes.${acc.account_type?.toLowerCase()}`)}</span></td>
                                          <td className="px-2 py-1.5 border-r border-zinc-100 text-right">
                                             <div className="flex flex-col items-end">
                                                <span className="text-[11px] font-bold text-zinc-800">₹{(Math.abs(parseFloat(acc.opening_balance)) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                <span className={`text-[9px] font-black ${parseFloat(acc.opening_balance) < 0 ? 'text-blue-600' : parseFloat(acc.opening_balance) > 0 ? 'text-red-600' : 'text-zinc-400'}`}>
                                                   {parseFloat(acc.opening_balance) < 0 ? `${t('accountLedger.jama')} (CR)` : parseFloat(acc.opening_balance) > 0 ? `${t('accountLedger.udhar')} (DR)` : t('accountLedger.zero')}
                                                </span>
                                             </div>
                                          </td>
                                          <td className="px-2 py-1.5 text-right"><button className="p-1 bg-zinc-100 text-zinc-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:scale-110 border border-zinc-200"><ChevronRight size={12} /></button></td>
                                       </tr>
                                    ))
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  )}
               </div>
            )}

            
         </div>

         <style dangerouslySetInnerHTML={{
            __html: `
        @media print {
          @page { margin: 1cm; size: auto; }
          body { background-color: white !important; margin: 0; padding: 0; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          #printable-ledger { width: 100% !important; padding: 0 !important; }
        }
      `}} />
      </div>
   );
}
