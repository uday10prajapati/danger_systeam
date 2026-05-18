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
      setMemberCodeSearch(String(account.id));
      setMemberNameSearch(account.account_name_gu || account.account_name);
      setShowMemberDropdown(false);
      setView('ledger');

      const targetId = account.id;
      await Promise.all([
         fetchAccountLedger(targetId),
         fetchAccountBalance(targetId),
         fetchAccountBreakdown(targetId)
      ]);
   };

   useEffect(() => {
      if (memberCodeSearch && (!selectedAccount || String(selectedAccount.id) !== memberCodeSearch)) {
         const exactMatch = accounts.find(acc => String(acc.id) === memberCodeSearch);
         if (exactMatch) {
            handleSelectAccount(exactMatch);
         }
      }
   }, [memberCodeSearch, accounts]);

   const filteredAccounts = accounts.filter(acc =>
      (String(acc.id).includes(memberCodeSearch) || memberCodeSearch === '') &&
      ((acc.account_name || '').toLowerCase().includes(memberNameSearch.toLowerCase()) || 
       (acc.account_name_gu || '').toLowerCase().includes(memberNameSearch.toLowerCase()) ||
       memberNameSearch === '')
   );

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

         <div className="max-w-[1500px] mx-auto bg-white border border-zinc-300 p-5 space-y-6">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-300 pb-4 gap-4">
               <div>
                  <h1 className="text-xl font-bold tracking-tight text-zinc-800 flex items-center gap-2">
                     <Database size={20} className="text-zinc-600" />
                     {t('accountLedger.title')}
                  </h1>
                  <p className="text-xs font-mono text-zinc-500 mt-0.5 uppercase tracking-wider">
                     {t('accountLedger.subtitle')}
                  </p>
               </div>
               
               <div className="flex items-center gap-2 bg-zinc-50 p-0.5 border border-zinc-200">
                  <button
                     onClick={() => setView('ledger')}
                     className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${view === 'ledger' ? 'bg-white text-zinc-800 border border-zinc-300 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}
                  >
                     <Activity size={14} /> {t('accountLedger.transactions')}
                  </button>
                  {selectedAccount && (
                     <button
                        onClick={() => { setView('breakdown'); fetchAccountBreakdown(selectedAccount.id); }}
                        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${view === 'breakdown' ? 'bg-white text-zinc-800 border border-zinc-300 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}
                     >
                        <ShieldCheck size={14} /> {t('accountLedger.breakdown')}
                     </button>
                  )}
               </div>
            </div>

            {view === 'ledger' && (
               <div className="flex flex-col gap-6">
                  <div className="bg-zinc-50 p-6 border border-zinc-300 relative print:hidden">
                     <div className="flex flex-wrap items-end justify-between gap-6">
                        <div className="flex-1 flex flex-wrap items-end gap-6 relative">
                           <div className="w-full md:w-32">
                              <span className="block text-sm font-bold text-zinc-400 mb-2 px-1">{t('accountLedger.nodeId')}</span>
                              <div className="relative group">
                                 <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors" />
                                 <input
                                    type="text"
                                    value={memberCodeSearch}
                                    onChange={(e) => {
                                       setMemberCodeSearch(e.target.value);
                                       setShowMemberDropdown(true);
                                    }}
                                    onFocus={() => setShowMemberDropdown(true)}
                                    placeholder="ID"
                                    className={`w-full pl-11 pr-4 py-2 bg-white border border-zinc-300 focus:border-zinc-500 outline-none transition-all font-bold uppercase text-xs ${i18n.language === 'gu' ? 'font-prompt' : 'font-mono'}`}
                                 />
                              </div>
                           </div>

                           <div className="flex-1 min-w-[300px]">
                              <span className="block text-sm font-bold text-zinc-400 mb-2 px-1">{t('accountLedger.searchNomenclature')}</span>
                              <div className="relative group">
                                 <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors" />
                                 <input
                                    type="text"
                                    value={memberNameSearch}
                                    onChange={(e) => {
                                       setMemberNameSearch(e.target.value);
                                       setShowMemberDropdown(true);
                                    }}
                                    onFocus={() => setShowMemberDropdown(true)}
                                    placeholder={t('accountLedger.searchPrompt')}
                                    className={`w-full pl-11 pr-4 py-2 bg-white border border-zinc-300 focus:border-zinc-500 outline-none transition-all font-bold uppercase text-xs ${i18n.language === 'gu' ? 'font-prompt' : 'font-mono'}`}
                                 />
                              </div>
                           </div>

                           {showMemberDropdown && accounts.length > 0 && (
                              <div className="absolute top-[75px] left-0 right-0 bg-white border border-zinc-300 shadow-2xl overflow-hidden z-[100] animate-in zoom-in-95">
                                 <div className="max-h-64 overflow-y-auto">
                                    {filteredAccounts.map((acc) => (
                                       <div
                                          key={acc.id}
                                          onClick={() => handleSelectAccount(acc)}
                                          className="px-6 py-3.5 hover:bg-zinc-50 flex justify-between items-center cursor-pointer transition-all border-b border-zinc-100 last:border-none group"
                                       >
                                          <div>
                                             <p className="text-xs font-bold text-zinc-800 group-hover:text-blue-600 transition-colors italic">{formatBilingualText(acc.account_name_gu || acc.account_name)}</p>
                                             <p className="text-[9px] font-bold text-zinc-400 uppercase leading-none mt-1 group-hover:text-blue-400">{t(`accountTypes.${acc.account_type?.toLowerCase()}`)}</p>
                                          </div>
                                          <span className="text-sm font-black text-zinc-300 group-hover:text-blue-600">#{acc.id}</span>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}

                           <div className="flex flex-wrap items-end gap-6">
                              <div>
                                 <span className="block text-sm font-bold text-zinc-400 mb-2 px-1">{t('accountLedger.temporalStart')}</span>
                                 <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="bg-white border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 outline-none focus:border-zinc-500 transition-all font-mono" />
                              </div>
                              <div>
                                 <span className="block text-sm font-bold text-zinc-400 mb-2 px-1">{t('accountLedger.temporalEnd')}</span>
                                 <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="bg-white border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 outline-none focus:border-zinc-500 transition-all font-mono" />
                              </div>
                           </div>
                        </div>

                        <div className="flex gap-2">
                           <button onClick={clearFilters} className="bg-white border border-zinc-300 text-zinc-500 px-4 py-2 rounded-none font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-100 transition-all flex items-center gap-2">
                              <X size={14} /> {t('accountLedger.clear')}
                           </button>
                           <button onClick={handlePrint} className="bg-white border border-zinc-300 text-zinc-700 px-4 py-2 rounded-none font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-100 transition-all flex items-center gap-2">
                              <Printer size={14} /> {t('accountLedger.print')}
                           </button>
                           <button onClick={handleExportPDF} className="bg-blue-600 text-white px-6 py-2 rounded-none font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2 border border-blue-700">
                              <FileText size={14} /> {t('accountLedger.exportPdf')}
                           </button>
                        </div>
                     </div>
                  </div>

                  {selectedAccount ? (
                     <>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4 select-none">
                           {[
                              { label: t('accountLedger.debit'), val: parseFloat(accountBalance.total_debit || 0), color: 'zinc' },
                              { label: t('accountLedger.credit'), val: parseFloat(accountBalance.total_credit || 0), color: 'zinc' },
                              { label: t('accountLedger.openingBalance'), val: parseFloat(accountBalance.opening_balance || 0), color: 'zinc', type: accountBalance.opening_balance_type },
                              { label: t('accountLedger.netPosition'), val: parseFloat(accountBalance.balance || accountBalance.running_balance || 0), color: 'blue', special: true },
                           ].map((shard, i) => (
                              <div key={i} className={`bg-zinc-50 p-3 border border-zinc-300 flex flex-col justify-between transition-all ${shard.special && shard.val < 0 ? 'bg-rose-50/30 border-rose-200' : ''}`}>
                                 <span className="text-sm font-sans text-zinc-500">{shard.label}</span>
                                 <p className={`text-2xl font-bold tracking-tight font-mono mt-1 ${shard.special ? (shard.val >= 0 ? 'text-zinc-800' : 'text-rose-600') : 'text-zinc-800'}`}>
                                    ₹{shard.val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    {shard.label === t('accountLedger.openingBalance') && shard.val !== 0 && (
                                       <span className="text-sm ml-2 text-zinc-400 font-bold">{shard.type === 'credit' ? t('accountLedger.jama') : t('accountLedger.udhar')}</span>
                                    )}
                                 </p>
                              </div>
                           ))}
                        </div>

                        <div className="bg-white border border-zinc-300 shadow-sm overflow-hidden flex flex-col min-h-[600px] relative">
                           <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between select-none">
                              <div className="flex items-center gap-2">
                                 <span className="text-sm font-bold text-zinc-700">{formatBilingualText(selectedAccount.account_name_gu || selectedAccount.account_name)}</span>
                                 <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-sm px-2 py-0.5">
                                    {ledgerEntries.length} {t('accountLedger.transactionsCount')}
                                 </span>
                              </div>
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t(`accountTypes.${selectedAccount.account_type?.toLowerCase()}`)}</p>
                           </div>

                           <div className="flex-1 overflow-x-auto scroller-airy bg-white">
                              <table className="w-full text-left font-mono text-sm border-collapse">
                                 <thead className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">
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
                                          <th key={i} className={`px-6 py-3 font-bold uppercase tracking-widest border-r border-zinc-200 last:border-none ${i > 1 ? 'text-right' : ''}`}>
                                             {h}
                                          </th>
                                       ))}
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-zinc-200">
                                    {loading ? (
                                       <tr>
                                          <td colSpan="8" className="py-32 text-center text-zinc-300 font-bold text-sm">
                                             <RefreshCcw className="animate-spin mx-auto mb-4 text-zinc-200" size={40} />
                                             {t('accountLedger.syncing')}
                                          </td>
                                       </tr>
                                    ) : ledgerEntries.length === 0 ? (
                                       <tr>
                                          <td colSpan="8" className="py-32 text-center">
                                             <div className="max-w-md mx-auto">
                                                <Database size={48} className="mx-auto text-zinc-100 mb-6" strokeWidth={1} />
                                                <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px] italic">{t('accountLedger.noNodes')}</p>
                                             </div>
                                          </td>
                                       </tr>
                                    ) : (
                                       <>
                                          {parseFloat(accountBalance.opening_balance || 0) !== 0 && (
                                             <tr className="bg-zinc-50 border-b border-zinc-200 font-bold italic">
                                                <td className="px-6 py-3 text-zinc-400 border-r border-zinc-100">—</td>
                                                <td className="px-6 py-3 text-zinc-500 border-r border-zinc-100">{t('accountLedger.openingBalanceForward')}</td>
                                                <td className="px-6 py-3 text-right text-zinc-400 border-r border-zinc-100">{accountBalance.opening_balance_type === "credit" ? `₹${parseFloat(accountBalance.opening_balance).toLocaleString("en-IN")}` : "—"}</td>
                                                <td className="px-6 py-3 text-right text-zinc-400 border-r border-zinc-100">{accountBalance.opening_balance_type === "debit" ? `₹${parseFloat(accountBalance.opening_balance).toLocaleString("en-IN")}` : "—"}</td>
                                                <td className={`px-6 py-3 text-right font-black text-xs border-r border-zinc-100 ${accountBalance.opening_balance_type === "debit" ? "text-zinc-800" : "text-rose-600"}`}>₹{parseFloat(accountBalance.opening_balance).toLocaleString("en-IN")} {accountBalance.opening_balance_type === "debit" ? "D" : "C"}</td>
                                             </tr>
                                          )}
                                          {ledgerEntries.map((row, idx) => (
                                             <tr key={idx} className="group hover:bg-zinc-50 transition-all duration-300">
                                                <td className="px-6 py-4 text-zinc-600 border-r border-zinc-100 font-sans">{new Date(row.transaction_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                                <td className="px-6 py-4 font-bold text-zinc-700 text-sm border-r border-zinc-100">
                                                   <div className="flex flex-col leading-tight">
                                                      <span className="font-bold">{formatBilingualText(selectedAccount?.account_code === 'IK0001' ? `[INTEREST] ${row.description}` : row.description)}</span>
                                                      {row.member_name && (
                                                         <span className="text-sm text-blue-600 font-bold mt-1">
                                                            {t('accountLedger.node')}: {formatBilingualText(row.member_name)} {row.member_code ? `[${row.member_code}]` : ''}
                                                         </span>
                                                      )}
                                                   </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-zinc-500 border-r border-zinc-100">
                                                   {selectedAccount?.account_code === 'IK0001' ? (parseFloat(row.credit || 0) > 0 ? `₹${parseFloat(row.credit).toLocaleString('en-IN')}` : `₹0.00`) : parseFloat(row.credit || 0) > 0 ? ((selectedAccount?.account_code === 'BS0001' || row.description?.includes('[BARDAN]')) ? parseFloat(row.company_credit || 0) > 0 ? parseFloat(row.company_credit).toLocaleString('en-IN') : '—' : `₹${parseFloat(row.credit).toLocaleString('en-IN')}`) : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-zinc-900 border-r border-zinc-100">
                                                   {parseFloat(row.debit || 0) > 0 ? ((selectedAccount?.account_code === 'BS0001' || row.description?.includes('[BARDAN]')) ? parseFloat(row.debit).toLocaleString('en-IN') : `₹${parseFloat(row.debit).toLocaleString('en-IN')}`) : '—'}
                                                </td>
                                                {selectedAccount?.account_code === 'BS0001' && (
                                                   <td className="px-6 py-4 text-right font-bold text-emerald-600 border-r border-zinc-100">
                                                      {parseFloat(row.self_credit || 0) > 0 ? parseFloat(row.self_credit).toLocaleString('en-IN') : '—'}
                                                   </td>
                                                )}
                                                <td className={`px-6 py-4 text-right font-bold text-sm border-r border-zinc-100 ${parseFloat(row.running_balance) >= 0 ? 'text-zinc-800' : 'text-rose-600'}`}>
                                                   {(selectedAccount?.account_code === 'BS0001' || row.description?.includes('[BARDAN]')) ? `${Math.abs(parseFloat(row.running_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(row.running_balance) >= 0 ? 'D' : 'C'}` : `₹${Math.abs(parseFloat(row.running_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(row.running_balance) >= 0 ? 'D' : 'C'}`}
                                                </td>
                                                {selectedAccount?.account_code === 'BS0001' && (
                                                   <td className="px-6 py-4 text-right font-bold text-sm text-blue-600">
                                                      ₹{Math.abs(parseFloat(row.penalty_balance || row.running_balance) * bardanPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                   </td>
                                                )}
                                             </tr>
                                          ))}
                                       </>
                                    )}
                                 </tbody>
                                 <tfoot className="bg-blue-600 font-bold text-white text-sm uppercase tracking-widest border-t-2 border-blue-700">
                                    <tr>
                                       <td colSpan="2" className="px-6 py-4 text-right">{t('accountLedger.registryTotals')}</td>
                                       <td className="px-6 py-4 text-right text-white">₹{parseFloat(accountBalance.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                       <td className="px-6 py-4 text-right text-white">₹{parseFloat(accountBalance.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                       {selectedAccount?.account_code === 'BS0001' && <td className="px-6 py-4 text-right text-emerald-400">—</td>}
                                       <td className="px-6 py-4 text-right font-black text-white">₹{Math.abs(parseFloat(accountBalance.running_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {parseFloat(accountBalance.running_balance) >= 0 ? 'DR' : 'CR'}</td>
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
                              <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-sm px-2 py-0.5">
                                 {filteredAccounts.length} {t('accountLedger.nodesCount')}
                              </span>
                           </div>
                           <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('accountLedger.selectNodePrompt')}</p>
                        </div>

                        <div className="flex-1 overflow-x-auto scroller-airy bg-white">
                           <table className="w-full text-left font-mono text-sm border-collapse">
                              <thead className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">
                                 <tr>
                                    <th className="px-6 py-4 font-bold border-r border-zinc-200">{t('accountLedger.nomenclature')}</th>
                                    <th className="px-6 py-4 font-bold border-r border-zinc-200">{t('accountLedger.registryClass')}</th>
                                    <th className="px-6 py-4 font-bold border-r border-zinc-200 text-right">{t('accountLedger.openingBal')}</th>
                                    <th className="px-6 py-4 font-bold text-right">{t('accountLedger.auditStatus')}</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200">
                                 {filteredAccounts.length === 0 ? (
                                    <tr><td colSpan="3" className="py-32 text-center text-zinc-300 font-bold text-sm tracking-[0.4em] ">{t('accountLedger.noShards')}</td></tr>
                                 ) : (
                                    filteredAccounts.map(acc => (
                                       <tr key={acc.id} onClick={() => handleSelectAccount(acc)} className="group hover:bg-zinc-50 cursor-pointer transition-all duration-300">
                                          <td className="px-6 py-4 border-r border-zinc-100">
                                             <div className="flex flex-col">
                                                <span className="text-sm font-bold text-zinc-800 group-hover:text-blue-600 transition-colors tracking-tight">{formatBilingualText(acc.account_name_gu || acc.account_name)}</span>
                                                <span className="text-sm font-black text-zinc-400 mt-0.5">{t('accountLedger.shaId')}: #{acc.id}</span>
                                             </div>
                                          </td>
                                          <td className="px-6 py-4 border-r border-zinc-100"><span className="px-3 py-1 bg-white border border-zinc-200 text-sm font-black text-zinc-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">{t(`accountTypes.${acc.account_type?.toLowerCase()}`)}</span></td>
                                          <td className="px-6 py-4 border-r border-zinc-100 text-right">
                                             <div className="flex flex-col items-end">
                                                <span className="text-sm font-bold text-zinc-800">₹{(Math.abs(parseFloat(acc.opening_balance)) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                <span className={`text-[9px] font-black ${parseFloat(acc.opening_balance) < 0 ? 'text-blue-600' : parseFloat(acc.opening_balance) > 0 ? 'text-red-600' : 'text-zinc-400'}`}>
                                                   {parseFloat(acc.opening_balance) < 0 ? `${t('accountLedger.jama')} (CR)` : parseFloat(acc.opening_balance) > 0 ? `${t('accountLedger.udhar')} (DR)` : t('accountLedger.zero')}
                                                </span>
                                             </div>
                                          </td>
                                          <td className="px-6 py-4 text-right"><button className="p-2 bg-zinc-100 text-zinc-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:scale-110 border border-zinc-200"><ChevronRight size={18} /></button></td>
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

            {selectedAccount && view === 'breakdown' && (
               <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="bg-white border border-zinc-300 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                     <div className="px-4 py-3 bg-zinc-100 border-b border-zinc-300 flex items-center justify-between select-none">
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-bold text-zinc-700">{t('accountLedger.memberBreakdown')}: {formatBilingualText(selectedAccount.account_name_gu || selectedAccount.account_name)}</span>
                           <span className="bg-zinc-200 border border-zinc-300 text-zinc-700 font-sans text-sm px-2 py-0.5">{breakdownData.length} {t('accountLedger.membersCount')}</span>
                        </div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t('accountLedger.granularAnalysis')}</p>
                     </div>

                     <div className="overflow-x-auto scroller-airy bg-white">
                        <table className="w-full text-left font-mono text-sm border-collapse">
                           <thead className="bg-zinc-50 border-b border-zinc-300 text-zinc-600">
                              <tr>
                                 <th className="px-6 py-4 font-bold border-r border-zinc-200">{t('accountLedger.memberNomenclature')}</th>
                                 <th className="px-6 py-4 font-bold border-r border-zinc-200">{t('accountLedger.code')}</th>
                                 <th className="px-6 py-4 font-bold text-right border-r border-zinc-200">{t('accountLedger.openingBal')}</th>
                                 <th className="px-6 py-4 font-bold text-right border-r border-zinc-200">{t('accountLedger.ledgerBal')}</th>
                                 <th className="px-6 py-4 font-bold text-right border-r border-zinc-200 text-indigo-600">{t('accountLedger.dangarAmt')}</th>
                                 <th className="px-6 py-4 font-bold text-right border-r border-zinc-200 text-amber-600">{t('accountLedger.bardanPnl')}</th>
                                 <th className="px-6 py-4 font-bold text-right border-r border-zinc-200 text-orange-600">{t('accountLedger.interest')}</th>
                                 <th className="px-6 py-4 font-bold text-right text-zinc-800">{t('accountLedger.netPosition')}</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-200">
                              {breakdownData.filter(row => (String(row.member_id).includes(memberCodeSearch) || memberCodeSearch === '') && ((row.member_name || '').toLowerCase().includes(memberNameSearch.toLowerCase()) || memberNameSearch === '')).length === 0 ? (
                                 <tr><td colSpan="8" className="py-32 text-center"><Database size={48} className="mx-auto text-zinc-100 mb-4" strokeWidth={1} /><p className="text-zinc-300 font-bold uppercase tracking-widest text-[10px] italic">{t('accountLedger.noMemberNodes')}</p></td></tr>
                              ) : (
                                 breakdownData.filter(row => (String(row.member_id).includes(memberCodeSearch) || memberCodeSearch === '') && ((row.member_name || '').toLowerCase().includes(memberNameSearch.toLowerCase()) || memberNameSearch === '')).map((row, idx) => (
                                    <React.Fragment key={idx}>
                                       <tr className="group hover:bg-zinc-50 cursor-pointer transition-all duration-300 border-l-4 border-transparent hover:border-blue-600" onClick={() => toggleMemberExpansion(row.member_id)}>
                                          <td className="px-6 py-4 border-r border-zinc-100">
                                             <div className="flex items-center gap-4">
                                                <div className="p-1.5 bg-zinc-100 text-zinc-400 group-hover:bg-zinc-800 group-hover:text-white transition-all border border-zinc-200">{expandedMembers[row.member_id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</div>
                                                <div>
                                                   <p className="text-sm font-bold text-zinc-800 italic group-hover:text-blue-600 transition-colors">{formatBilingualText(row.member_name || t('accountLedger.genericLedger'))}</p>
                                                   <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">{t('accountLedger.shardId')}: #{row.member_id || t('accountLedger.system')}</p>
                                                </div>
                                             </div>
                                          </td>
                                          <td className="px-6 py-4 text-zinc-400 font-sans border-r border-zinc-100">{row.member_code || '—'}</td>
                                          <td className={`px-6 py-4 text-right font-bold italic border-r border-zinc-100 ${parseFloat(row.opening_balance || 0) >= 0 ? 'text-zinc-900' : 'text-rose-500'}`}>₹{Math.abs(parseFloat(row.opening_balance || 0)).toLocaleString('en-IN')} {parseFloat(row.opening_balance || 0) >= 0 ? 'D' : 'C'}</td>
                                          <td className={`px-6 py-4 text-right font-bold italic border-r border-zinc-100 ${parseFloat(row.ledger_balance || 0) >= 0 ? 'text-zinc-900' : 'text-rose-500'}`}>₹{Math.abs(parseFloat(row.ledger_balance || 0)).toLocaleString('en-IN')} {parseFloat(row.ledger_balance || 0) >= 0 ? 'D' : 'C'}</td>
                                          <td className="px-6 py-4 text-right font-bold text-indigo-600 border-r border-zinc-100">₹{parseFloat(row.dangar_amount || 0).toLocaleString('en-IN')}</td>
                                          <td className="px-6 py-4 text-right font-bold text-amber-600 border-r border-zinc-100">₹{parseFloat(row.bardan_penalty || 0).toLocaleString('en-IN')}</td>
                                          <td className="px-6 py-4 text-right font-bold text-orange-600 border-r border-zinc-100">₹{parseFloat(row.total_interest || 0).toLocaleString('en-IN')}</td>
                                          <td className={`px-6 py-4 text-right font-bold text-sm ${parseFloat(row.net_position) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>₹{Math.abs(parseFloat(row.net_position)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {parseFloat(row.net_position) >= 0 ? 'D' : 'C'}</td>
                                       </tr>
                                       {expandedMembers[row.member_id] && (
                                          <tr>
                                             <td colSpan="8" className="p-0 bg-zinc-50/50">
                                                <div className="mx-6 my-4 bg-white border border-zinc-300 shadow-sm overflow-hidden">
                                                   <table className="w-full text-left font-mono text-[10px] border-collapse">
                                                      <thead className="bg-zinc-800 text-white"><tr className="uppercase tracking-widest"><th className="px-4 py-2 border-r border-zinc-700">{t('accountLedger.epoch')}</th><th className="px-4 py-2 border-r border-zinc-700">{t('accountLedger.reference')}</th><th className="px-4 py-2 border-r border-zinc-700">{t('accountLedger.description')}</th><th className="px-4 py-2 text-right border-r border-zinc-700">{t('accountLedger.debit')}</th><th className="px-4 py-2 text-right border-r border-zinc-700">{t('accountLedger.credit')}</th><th className="px-4 py-2 text-right">{t('accountLedger.balance')}</th></tr></thead>
                                                      <tbody className="divide-y divide-zinc-200">
                                                         {!memberEntries[row.member_id] ? (<tr><td colSpan="6" className="px-4 py-8 text-center text-zinc-300 font-bold text-sm"><RefreshCcw size={16} className="animate-spin mx-auto mb-2" />{t('accountLedger.fetchingShards')}</td></tr>) : memberEntries[row.member_id].length === 0 ? (<tr><td colSpan="6" className="px-4 py-8 text-center text-zinc-200 font-bold text-sm">{t('accountLedger.noDetailedNodes')}</td></tr>) : (
                                                            memberEntries[row.member_id].map((me, mei) => (
                                                               <tr key={mei} className="hover:bg-zinc-50 transition-colors">
                                                                  <td className="px-4 py-2 text-zinc-600 border-r border-zinc-100 font-sans">{new Date(me.transaction_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                                                  <td className="px-4 py-2 text-zinc-300 border-r border-zinc-100">{me.reference_no}</td>
                                                                  <td className="px-4 py-2 text-zinc-600 border-r border-zinc-100"><div className="flex items-center gap-2"><span className="font-bold text-sm">{formatBilingualText(selectedAccount?.account_code === 'IK0001' ? `[INTEREST] ${me.description}` : me.description)}</span></div></td>
                                                                  <td className="px-4 py-2 text-right font-bold text-zinc-900 border-r border-zinc-100">{(selectedAccount?.account_code === 'BS0001' || me.description?.includes('[BARDAN]')) ? (parseFloat(me.debit || 0).toLocaleString('en-IN')) : `₹${(parseFloat(me.debit || 0).toLocaleString('en-IN'))}`}</td>
                                                                  <td className="px-4 py-2 text-right font-bold text-zinc-400 border-r border-zinc-100">{selectedAccount?.account_code === 'IK0001' ? (parseFloat(me.credit || 0) > 0 ? `₹${(parseFloat(me.credit).toLocaleString('en-IN'))}` : `₹0.00`) : (selectedAccount?.account_code === 'BS0001' || me.description?.includes('[BARDAN]')) ? (parseFloat(me.credit || 0).toLocaleString('en-IN')) : `₹${(parseFloat(me.credit || 0).toLocaleString('en-IN'))}`}</td>
                                                                  <td className={`px-4 py-2 text-right font-black italic ${parseFloat(me.running_balance) >= 0 ? 'text-zinc-800' : 'text-rose-600'}`}>{(selectedAccount?.account_code === 'BS0001' || me.description?.includes('[BARDAN]')) ? `${Math.abs(parseFloat(me.running_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(me.running_balance) >= 0 ? 'DR' : 'CR'}` : `₹${Math.abs(parseFloat(me.running_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${parseFloat(me.running_balance) >= 0 ? 'DR' : 'CR'}`}</td>
                                                               </tr>
                                                            ))
                                                         )}
                                                      </tbody>
                                                   </table>
                                                </div>
                                             </td>
                                          </tr>
                                       )}
                                    </React.Fragment>
                                 ))
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>
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
