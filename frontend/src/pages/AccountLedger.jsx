import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import React, { useState, useEffect } from 'react';
import {
   Search, Download, Filter, X, ChevronRight, Printer,
   FileText, Database, Activity, Layout, BookOpen,
   TrendingDown, TrendingUp, DollarSign, RefreshCcw,
   Trash2, ShieldCheck, CheckCircle2, Hash, User, ChevronDown, Book, Users,
   ArrowLeft
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
   const isGu = i18n.language === 'gu';
   const guDigits = { '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪', '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯' };
   const toGujaratiDigits = (value) => String(value ?? '').replace(/[0-9]/g, (d) => guDigits[d] || d);

   const fmtAmount = (val, prefix = '') => {
      const num = parseFloat(val) || 0;
      const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const str = prefix ? `${prefix}${formatted}` : formatted;
      return isGu ? toGujaratiDigits(str) : str;
   };

   const fmtCell = (val, isBardanCount) => {
      if (parseFloat(val || 0) === 0) return '—';
      return fmtAmount(val, isBardanCount ? '' : '₹');
   };

   const formatDisplayDate = (dateString) => {
      if (!dateString) return '—';
      let dStr = dateString;
      if (dStr.includes('T')) dStr = dStr.split('T')[0];
      const parts = dStr.split('-');
      if (parts.length !== 3) return dateString;
      const engDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      return isGu ? toGujaratiDigits(engDate) : engDate;
   };

   const displayAccountName = (acc) => {
      if (!acc) return '';
      return isGu
         ? (acc.account_name_gu || acc.account_name || '')
         : (acc.account_name || acc.account_name_gu || '');
   };

   const displayBilingualName = (en, gu) => {
      return isGu ? (gu || en || '') : (en || gu || '');
   };

   const renderBilingualText = (text) => {
      if (isGu) return formatBilingualText(text);
      return <span translate="no" style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}>{text}</span>;
   };

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
   const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

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
               (() => {
                  const descStr = e.description || '-';
                  const memberStr = displayBilingualName(e.eng_name || e.member_name, e.member_name_gu || e.member_name);
                  const combined = descStr + (memberStr ? ' [' + memberStr + ']' : '');
                  return isGu ? translateSystemText(combined) : combined;
               })(),
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

   const isDefaultStartDate = dateRange.startDate === new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
   const isDefaultEndDate = dateRange.endDate === new Date().toISOString().split('T')[0];
   const hasActiveFilters = selectedAccount !== null || !isDefaultStartDate || !isDefaultEndDate || memberCodeSearch !== '' || memberNameSearch !== '';

   return (
      <div className="min-h-screen bg-slate-50 font-sans select-none text-slate-800 pb-8">
         <Toast message={message} onClose={() => setMessage(null)} />

         <div className="max-w-[1600px] mx-auto px-4 py-4">

            {/* Main Ledger Area */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col min-h-[600px] relative shadow-none">

               {/* Unified Header Bar */}
               <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none print:hidden">
                  <div className="flex items-center gap-4">
                     <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        {selectedAccount ? (
                           <span className="font-extrabold text-[#1d5f84]" translate="no" style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}>
                              {displayAccountName(selectedAccount)}
                           </span>
                        ) : (
                           t('accountLedger.institutionalRegistry') || "INSTITUTIONAL REGISTRY"
                        )}
                     </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5">
                     <button
                        onClick={() => setShowFiltersDrawer(true)}
                        className={`px-2.5 h-7 flex items-center gap-1.5 justify-center transition-all rounded-md cursor-pointer relative select-none shadow-sm text-xs font-semibold ${hasActiveFilters
                           ? 'bg-[#1d5f84] border border-[#1d5f84] text-white hover:bg-[#154662]'
                           : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                           }`}
                     >
                        <Filter size={13} className={hasActiveFilters ? "text-white" : "text-slate-500"} />
                        <span>{t('sabhasadLedgerSummary.filters') || "Filters"}</span>
                        {hasActiveFilters && (
                           <span className="absolute -top-1 -right-1 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 border border-white"></span>
                           </span>
                        )}
                     </button>
                     {hasActiveFilters && (
                        <button
                           onClick={clearFilters}
                           className="px-2.5 h-7 flex items-center gap-1.5 justify-center transition-all rounded-md cursor-pointer relative select-none shadow-sm text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
                        >
                           <X size={13} className="text-rose-600" />
                           <span>{isGu ? 'ક્લિયર' : 'Clear'}</span>
                        </button>
                     )}
                     {selectedAccount && (
                        <>
                           <button
                              onClick={handlePrint}
                              title={t('accountLedger.print') || "Print"}
                              className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
                           >
                              <Printer size={13} className="text-slate-500" />
                           </button>
                           <button
                              onClick={handleExportPDF}
                              title={t('accountLedger.exportPdf') || "Export PDF"}
                              className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
                           >
                              <FileText size={13} className="text-slate-500" />
                           </button>
                           <button
                              onClick={() => fetchAccountLedger(selectedAccount.id)}
                              title="Refresh"
                              className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-sm"
                           >
                              <RefreshCcw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                           </button>
                        </>
                     )}
                  </div>
               </div>

               <div className="flex-1 overflow-x-auto bg-white custom-scrollbar border-t border-slate-200">
                  {selectedAccount ? (
                     <table className="w-full text-left font-sans text-xs border-collapse select-none">
                        <thead className="sticky top-0 z-20 shadow-sm">
                           <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                              {[
                                 t('accountLedger.date'),
                                 t('accountLedger.descriptionMember'),
                                 t('accountLedger.debit'),
                                 t('accountLedger.credit'),
                                 ...(selectedAccount?.account_code === 'BS0001' ? [t('accountLedger.selfJama')] : []),
                                 t('accountLedger.balance'),
                                 ...(selectedAccount?.account_code === 'BS0001' ? [t('accountLedger.bardanAmt')] : [])
                              ].map((h, i) => (
                                 <th key={i} className={`px-3 py-2 border-r border-slate-200 whitespace-nowrap ${i > 1 ? 'text-right' : ''}`}>
                                    {h}
                                 </th>
                              ))}
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                           {loading ? (
                              <tr>
                                 <td colSpan="8" className="py-24 text-center">
                                    <RefreshCcw className="animate-spin text-slate-400 mx-auto mb-2" size={24} />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('accountLedger.syncing')}</p>
                                 </td>
                              </tr>
                           ) : ledgerEntries.length === 0 ? (
                              <tr>
                                 <td colSpan="8" className="py-24 text-center">
                                    <Database className="text-slate-300 mx-auto mb-2" size={32} />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('accountLedger.noNodes')}</p>
                                 </td>
                              </tr>
                           ) : (
                              <>
                                 {parseFloat(accountBalance.opening_balance || 0) !== 0 && (
                                    <tr className="bg-slate-50 font-bold italic">
                                       <td className="px-3 py-1.5 text-slate-400 border-r border-slate-100 text-[10px] font-mono">—</td>
                                       <td className="px-3 py-1.5 text-[11px] text-slate-550 border-r border-slate-100">{t('accountLedger.openingBalanceForward')}</td>
                                       <td className={`px-3 py-1.5 text-[11px] font-mono text-right text-slate-400 border-r border-slate-100 ${isGu ? 'font-bold' : 'font-semibold'}`}>
                                          {accountBalance.opening_balance_type === "debit"
                                             ? fmtAmount(accountBalance.opening_balance, selectedAccount?.account_code === 'BS0001' ? '' : '₹')
                                             : "—"}
                                       </td>
                                       <td className={`px-3 py-1.5 text-[11px] font-mono text-right text-slate-400 border-r border-slate-100 ${isGu ? 'font-bold' : 'font-semibold'}`}>
                                          {accountBalance.opening_balance_type === "credit"
                                             ? fmtAmount(accountBalance.opening_balance, selectedAccount?.account_code === 'BS0001' ? '' : '₹')
                                             : "—"}
                                       </td>
                                       {selectedAccount?.account_code === 'BS0001' && (
                                          <td className="px-3 py-1.5 text-slate-400 border-r border-slate-100 text-[11px] text-right font-mono">—</td>
                                       )}
                                       <td className={`px-3 py-1.5 text-[11px] font-mono font-black text-right border-r border-slate-100 text-slate-800`}>
                                          {fmtAmount(accountBalance.opening_balance, selectedAccount?.account_code === 'BS0001' ? '' : '₹')} {accountBalance.opening_balance_type === "debit" ? "DR" : "CR"}
                                       </td>
                                       {selectedAccount?.account_code === 'BS0001' && (
                                          <td className={`px-3 py-1.5 text-[11px] font-mono text-right text-slate-800 ${isGu ? 'font-bold' : 'font-semibold'}`}>
                                             {fmtAmount(Math.abs(parseFloat(accountBalance.opening_balance) * bardanPrice), '₹')}
                                          </td>
                                       )}
                                    </tr>
                                 )}
                                 {ledgerEntries.map((row, idx) => {
                                    const isBardanObj = selectedAccount?.account_code === 'BS0001' || row.description?.includes('[BARDAN]');
                                    const displayDate = formatDisplayDate(row.transaction_date);
                                    return (
                                       <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                                          <td className="px-3 py-1.5 text-[10px] text-slate-600 border-r border-slate-100 font-mono" style={isGu ? { fontFamily: "'Noto Sans Gujarati', monospace" } : {}}>{displayDate}</td>
                                          <td className="px-3 py-1.5 text-[11px] border-r border-slate-100 text-slate-700 font-medium leading-tight">
                                             <div className="flex flex-col">
                                                <span>{renderBilingualText(selectedAccount?.account_code === 'IK0001' ? `[INTEREST] ${row.description}` : row.description)}</span>
                                                {row.member_name && (
                                                   <span className="text-[10px] text-[#1d5f84] font-bold mt-0.5">
                                                      {t('accountLedger.node')}: <span translate="no" style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}>{displayBilingualName(row.eng_name || row.member_name, row.member_name_gu || row.member_name)}</span> {row.member_code ? `[${isGu ? toGujaratiDigits(row.member_code) : row.member_code}]` : ''}
                                                   </span>
                                                )}
                                             </div>
                                          </td>
                                          <td className={`px-3 py-1.5 border-r border-slate-100 text-[11px] text-right font-mono text-blue-600 ${isGu ? 'font-black' : 'font-bold'}`}>
                                             {parseFloat(row.debit || 0) > 0 ? (isBardanObj ? fmtAmount(row.debit, '') : fmtAmount(row.debit, '₹')) : '—'}
                                          </td>
                                          <td className={`px-3 py-1.5 border-r border-slate-100 text-[11px] text-right font-mono text-emerald-600 ${isGu ? 'font-black' : 'font-bold'}`}>
                                             {selectedAccount?.account_code === 'IK0001'
                                                ? (parseFloat(row.credit || 0) > 0 ? fmtAmount(row.credit, '₹') : fmtAmount(0, '₹'))
                                                : parseFloat(row.credit || 0) > 0
                                                   ? (isBardanObj
                                                      ? (parseFloat(row.company_credit || 0) > 0 ? fmtAmount(row.company_credit, '') : '—')
                                                      : fmtAmount(row.credit, '₹'))
                                                   : '—'}
                                          </td>
                                          {selectedAccount?.account_code === 'BS0001' && (
                                             <td className={`px-3 py-1.5 text-[11px] text-right font-mono text-emerald-600 border-r border-slate-100 ${isGu ? 'font-black' : 'font-bold'}`}>
                                                {parseFloat(row.self_credit || 0) > 0 ? fmtAmount(row.self_credit, '') : '—'}
                                             </td>
                                          )}
                                          <td className={`px-3 py-1.5 text-[11px] text-right font-mono border-r border-slate-100 text-slate-800 ${isGu ? 'font-black' : 'font-bold'}`}>
                                             {isBardanObj
                                                ? `${fmtAmount(Math.abs(parseFloat(row.running_balance)), '')} ${parseFloat(row.running_balance) >= 0 ? 'DR' : 'CR'}`
                                                : `${fmtAmount(Math.abs(parseFloat(row.running_balance)), '₹')} ${parseFloat(row.running_balance) >= 0 ? 'DR' : 'CR'}`}
                                          </td>
                                          {selectedAccount?.account_code === 'BS0001' && (
                                             <td className={`px-3 py-1.5 text-[11px] text-right font-mono text-slate-800 ${isGu ? 'font-black' : 'font-bold'}`}>
                                                {fmtAmount(Math.abs(parseFloat(row.penalty_balance || row.running_balance) * bardanPrice), '₹')}
                                             </td>
                                          )}
                                       </tr>
                                    );
                                 })}
                                 {/* Consolidated Total Row */}
                                 <tr className="bg-slate-100 border-t border-slate-200">
                                    <td colSpan="2" className="px-3 py-2 text-[11px] font-black uppercase text-slate-705 text-right border-r border-slate-200">{t('accountLedger.registryTotals')}:</td>
                                    <td className={`px-3 py-2 text-right text-[11px] font-mono text-[#1d5f84] border-r border-slate-200 ${isGu ? 'font-black' : 'font-bold'}`}>
                                       {fmtAmount(accountBalance.total_debit, selectedAccount?.account_code === 'BS0001' ? '' : '₹')}
                                    </td>
                                    <td className={`px-3 py-2 text-right text-[11px] font-mono text-[#1d5f84] border-r border-slate-200 ${isGu ? 'font-black' : 'font-bold'}`}>
                                       {fmtAmount(accountBalance.total_credit, selectedAccount?.account_code === 'BS0001' ? '' : '₹')}
                                    </td>
                                    {selectedAccount?.account_code === 'BS0001' && (
                                       <td className="px-3 py-2 text-right text-[#1d5f84] border-r border-slate-200">—</td>
                                    )}
                                    <td className={`px-3 py-2 text-right text-[11px] font-mono text-[#1d5f84] border-r border-slate-200 ${isGu ? 'font-black' : 'font-bold'}`}>
                                       {fmtAmount(Math.abs(parseFloat(accountBalance.running_balance || 0)), selectedAccount?.account_code === 'BS0001' ? '' : '₹')} {parseFloat(accountBalance.running_balance) >= 0 ? 'DR' : 'CR'}
                                    </td>
                                    {selectedAccount?.account_code === 'BS0001' && (
                                       <td className={`px-3 py-2 text-right text-[11px] font-mono text-[#1d5f84] ${isGu ? 'font-black' : 'font-bold'}`}>
                                          {fmtAmount(Math.abs(parseFloat(accountBalance.running_balance || 0) * bardanPrice), '₹')}
                                       </td>
                                    )}
                                 </tr>
                              </>
                           )}
                        </tbody>
                     </table>
                  ) : (
                     <table className="w-full text-left font-sans text-xs border-collapse select-none">
                        <thead className="sticky top-0 z-20 shadow-sm">
                           <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                              <th className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{t('accountLedger.nomenclature')}</th>
                              <th className="px-3 py-2 border-r border-slate-200 whitespace-nowrap">{t('accountLedger.registryClass')}</th>
                              <th className="px-3 py-2 border-r border-slate-200 text-right whitespace-nowrap">{t('accountLedger.openingBal')}</th>
                              <th className="px-3 py-2 text-right whitespace-nowrap">{t('accountLedger.auditStatus')}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                           {filteredAccounts.length === 0 ? (
                              <tr><td colSpan="4" className="py-32 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">{t('accountLedger.noShards')}</td></tr>
                           ) : (
                              filteredAccounts.map(acc => (
                                 <tr key={acc.id} onClick={() => handleSelectAccount(acc)} className="group hover:bg-slate-50 cursor-pointer transition-colors">
                                    <td className="px-3 py-2 border-r border-slate-100">
                                       <div className="flex flex-col">
                                          <span className="text-[11px] font-bold text-slate-800 group-hover:text-[#1d5f84] transition-colors" translate="no" style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}>{displayAccountName(acc)}</span>
                                          <span className="text-[9px] font-mono text-slate-400 mt-0.5">{t('accountLedger.shaId')}: #{isGu ? toGujaratiDigits(acc.id) : acc.id}</span>
                                       </div>
                                    </td>
                                    <td className="px-3 py-2 border-r border-slate-100">
                                       <span className="px-1.5 py-1 bg-white border border-slate-200 text-[10px] font-bold text-slate-500 rounded">{t(`accountTypes.${acc.account_type?.toLowerCase()}`)}</span>
                                    </td>
                                    <td className="px-3 py-2 border-r border-slate-100 text-right">
                                       <div className="flex flex-col items-end">
                                          <span className={`text-[11px] font-mono text-slate-800 ${isGu ? 'font-black' : 'font-bold'}`}>
                                             {fmtAmount(Math.abs(parseFloat(acc.opening_balance)), '₹')}
                                          </span>
                                          <span className={`text-[9px] font-black ${parseFloat(acc.opening_balance) < 0 ? 'text-blue-600' : parseFloat(acc.opening_balance) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                             {parseFloat(acc.opening_balance) < 0 ? `${t('accountLedger.jama')} (CR)` : parseFloat(acc.opening_balance) > 0 ? `${t('accountLedger.udhar')} (DR)` : t('accountLedger.zero')}
                                          </span>
                                       </div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                       <button className="p-1 text-slate-400 group-hover:text-[#1d5f84] transition-colors cursor-pointer"><ChevronRight size={14} /></button>
                                    </td>
                                 </tr>
                              ))
                           )}
                        </tbody>
                     </table>
                  )}
               </div>

               {/* Footer */}
               <div className="bg-slate-100 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row justify-between items-center text-[9px] font-mono text-slate-400 uppercase tracking-wider gap-2 select-none print:hidden">
                  <div className="flex items-center gap-3">
                     <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[#1d5f84] rounded-full"></div> System Status: Verified</span>
                     <span>Shards: {selectedAccount ? ledgerEntries.length : filteredAccounts.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <span>{company?.company_name} / Registry Auth</span>
                     <span>ID: {new Date().getTime().toString(36).toUpperCase()}</span>
                  </div>
               </div>
            </div>
         </div>

         {/* Modern Slide-Out Filters Drawer (WOW design with animation in & out) */}
         <div className={`fixed inset-0 z-[100] overflow-hidden ${showFiltersDrawer ? 'pointer-events-auto' : 'pointer-events-none'}`}>
            <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[1.5px] transition-opacity duration-300 ${showFiltersDrawer ? 'opacity-100' : 'opacity-0'}`} onClick={() => setShowFiltersDrawer(false)} />

            <div className={`fixed inset-y-0 right-0 max-w-full flex pl-10 transform transition-transform duration-300 ease-in-out ${showFiltersDrawer ? 'translate-x-0' : 'translate-x-full'}`}>
               <div className="w-screen max-w-sm bg-white border-l border-slate-200 flex flex-col shadow-none">

                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                     <div className="flex items-center gap-2 select-none">
                        <Filter size={14} className="text-[#1d5f84]" />
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Filter Parameters</span>
                     </div>
                     <button onClick={() => setShowFiltersDrawer(false)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition cursor-pointer">
                        <X size={15} />
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     <div className="space-y-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('sabhasadLedgerSummary.dateRange') || "Date Range Period"}</span>
                        <div className="grid grid-cols-2 gap-2">
                           <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold uppercase">From</span>
                              <input ref={startDateRef} type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') endDateRef.current?.focus(); }} className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-10 pr-2 py-1.5 text-xs text-slate-700 font-bold font-mono outline-none w-full" />
                           </div>
                           <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 font-bold uppercase">To</span>
                              <input ref={endDateRef} type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') accCodeRef.current?.focus(); }} className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md pl-10 pr-2 py-1.5 text-xs text-slate-700 font-bold font-mono outline-none w-full" />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-1.5 relative" ref={dropdownRef}>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('accountLedger.searchNomenclature') || "Account"}</span>
                        <div className="flex gap-2">
                           <input ref={accCodeRef} type="text" value={memberCodeSearch} onChange={(e) => { setMemberCodeSearch(e.target.value); setShowMemberDropdown(true); }} onFocus={() => { setShowMemberDropdown(true); }} onKeyDown={handleAccCodeKeyDown} placeholder="ID" className="bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-1 py-1.5 text-xs text-[#1d5f84] font-mono font-bold w-12 text-center outline-none" />
                           <input ref={accNameRef} type="text" value={memberNameSearch} onChange={(e) => handleInputChangeWithAutocomplete(e, accNameRef, filteredAccounts, 'account_name', setMemberNameSearch, setShowMemberDropdown)} onFocus={() => { setShowMemberDropdown(true); }} onKeyDown={handleAccNameKeyDown} placeholder={t('accountLedger.searchPrompt')} className={`bg-white border border-slate-200 hover:border-slate-300 focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] transition rounded-md px-3 py-1.5 text-xs text-slate-700 font-bold flex-1 uppercase outline-none ${i18n.language === 'gu' ? 'font-prompt' : 'font-mono'}`} />
                        </div>

                        {showMemberDropdown && filteredAccounts.length > 0 && (
                           <div className="absolute top-[102%] left-0 right-0 bg-white border border-slate-200 rounded-md z-[110] mt-0.5 max-h-40 overflow-y-auto shadow-sm">
                              {filteredAccounts.map((a, idx) => (
                                 <div key={a.id} onClick={() => handleSelectAccount(a)} onMouseEnter={() => setAccActiveIdx(idx)} className={`px-2.5 py-1 flex justify-between items-center cursor-pointer border-b border-slate-100 last:border-none ${accActiveIdx === idx ? 'bg-slate-50 text-[#1d5f84]' : 'hover:bg-slate-50'}`}>
                                    <div className="flex flex-col">
                                       <span className="text-[10px] font-bold truncate" translate="no" style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}>{displayAccountName(a)}</span>
                                       <span className="text-[9px] text-slate-400 font-mono">{t('accountLedger.shaId')}: #{isGu ? toGujaratiDigits(a.id) : a.id}</span>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-200">
                     <button onClick={clearFilters} className="w-full flex items-center justify-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs py-2 rounded-md transition cursor-pointer shadow-sm uppercase tracking-wider">
                        <X size={14} /> {t('accountLedger.clear') || "Reset Parameters"}
                     </button>
                  </div>
               </div>
            </div>
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
