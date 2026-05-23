import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { exportToPDF } from '../utils/pdfExporter';
import {
  Plus, Search, Download, Package, PackageX,
  Edit3, Trash2, Power, RefreshCcw, Database, Shield,
  Loader, X, FileText, Info, CreditCard, Copy, Check, Eye, Building2
} from 'lucide-react';
import ItemForm from '../components/ItemForm';
import Toast from '../components/Toast';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import Loading from '../components/Loading';
import api from '../api';
import { formatBilingualText } from '../utils/textUtils';

export default function ItemMaster() {
  const { t, i18n } = useTranslation();
  const isGu = i18n.language === 'gu';

  const [company, setCompany] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('general');

  useEffect(() => {
    loadCompany();
  }, []);

  useEffect(() => {
    if (company) loadItems();
  }, [company]);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const response = await api.get('/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      } else {
        setMessage({ type: 'error', text: t('itemMaster.errors.noCompany') });
      }
    } catch (error) {
      console.error('Failed to load company', error);
      setMessage({ type: 'error', text: t('itemMaster.errors.failedLoadContext') });
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/items/company/${company.id}`);
      if (response.data.success) {
        setItems(response.data.data || []);
        const uniqueCats = [...new Set(response.data.data.map(i => i.category).filter(Boolean))];
        setCategories(uniqueCats);
      }
    } catch (error) {
      console.error('Load items error', error);
      setMessage({ type: 'error', text: t('itemMaster.errors.failedLoadItems') });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = () => {
    setEditingItem(null);
    setShowModal(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleFormSuccess = (msg) => {
    setShowModal(false);
    setEditingItem(null);
    loadItems();
    setMessage({ type: 'success', text: msg || t('itemMaster.messages.itemSaved') });
  };

  const handleStatusToggle = async (item) => {
    try {
      const endpoint = item.is_active ? 'deactivate' : 'activate';
      const response = await api.post(`/items/${item.id}/${endpoint}`);
      if (response.data.success) {
        setMessage({ type: 'success', text: t('itemMaster.messages.statusUpdatedSuccessfully') });
        loadItems();
        if (selectedItem && selectedItem.id === item.id) {
          setSelectedItem(prev => ({ ...prev, is_active: !prev.is_active }));
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('itemMaster.errors.failedUpdateStatus') });
    }
  };

  const confirmDelete = (item) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      setLoading(true);
      await api.delete(`/items/${itemToDelete.id}`);
      setMessage({ type: 'success', text: t('itemMaster.messages.itemDeletedSuccessfully') });
      setDeleteModalOpen(false);
      setItemToDelete(null);
      setSelectedItem(null);
      loadItems();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || t('itemMaster.errors.deleteFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const guDigits = {
    '0': '૦', '1': '૧', '2': '૨', '3': '૩', '4': '૪',
    '5': '૫', '6': '૬', '7': '૭', '8': '૮', '9': '૯'
  };

  const guLetters = {
    'અ': 'A', 'આ': 'AA', 'ઇ': 'I', 'ઈ': 'II', 'ઉ': 'U', 'ઊ': 'UU',
    'ઋ': 'R', 'એ': 'E', 'ઐ': 'AI', 'ઓ': 'O', 'ઔ': 'AU',
    'ક': 'K', 'ખ': 'KH', 'ગ': 'G', 'ઘ': 'GH', 'ઙ': 'NG',
    'ચ': 'CH', 'છ': 'CHH', 'જ': 'J', 'ઝ': 'JH', 'ઞ': 'NY',
    'ટ': 'T', 'ઠ': 'TH', 'ડ': 'D', 'ઢ': 'DH', 'ણ': 'N',
    'ત': 'T', 'થ': 'TH', 'દ': 'D', 'ધ': 'DH', 'ન': 'N',
    'પ': 'P', 'ફ': 'F', 'બ': 'B', 'ભ': 'BH', 'મ': 'M',
    'ય': 'Y', 'ર': 'R', 'લ': 'L', 'વ': 'V', 'શ': 'SH',
    'ષ': 'SH', 'સ': 'S', 'હ': 'H',
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
    '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
  };

  const toGujaratiDigits = (value) => {
    if (i18n.language !== 'gu') return String(value ?? '');
    return String(value ?? '').replace(/[0-9]/g, (d) => guDigits[d] || d);
  };
  const toEnglishText = (value) => String(value ?? '').split('').map(char => guLetters[char] || char).join('');
  const fmtVal = (val) => toGujaratiDigits(val);

  const displayItemName = (item) => {
    const name = isGu ? item?.item_name_gu : item?.item_name;
    return name && String(name).trim() ? name : '—';
  };

  const getAvatarGradient = (name) => {
    const s = name || 'I';
    const charCode = s.charCodeAt(0) || 0;
    const gradients = [
      'from-slate-500 to-slate-700',
      'from-sky-600 to-blue-700',
      'from-emerald-600 to-teal-700',
      'from-indigo-600 to-violet-700',
      'from-amber-600 to-orange-700',
      'from-rose-600 to-pink-700'
    ];
    return gradients[charCode % gradients.length];
  };

  const getInitials = (item) => {
    if (!item) return 'I';
    const name = displayItemName(item) || 'I';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleDownloadCSV = () => {
    const headers = [
      t('itemMaster.itemName'),
      t('itemMaster.category'),
      t('itemMaster.code'),
      t('itemMaster.unit'),
      t('itemMaster.status'),
      t('itemMaster.tax')
    ];
    const rows = filteredItems.map(i => [
      `"${displayItemName(i)}"`,
      `"${i.category || ''}"`,
      `"${toEnglishText(i.p_code || i.item_code || i.id)}"`,
      `"${t(`units.${i.unit}`) || i.unit}"`,
      `"${i.is_active ? t('itemMaster.active') : t('itemMaster.inactive')}"`,
      (parseFloat(i.tax_percentage) || 0).toFixed(2)
    ]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Items_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportPDF = async () => {
    const rows = filteredItems.length ? filteredItems : items;

    if (!rows.length) {
      setMessage({ type: 'error', text: t('itemMaster.noRecords') });
      return;
    }

    const columns = [
      {
        header: isGu ? 'ક્રમ' : '#',
        align: 'center',
        width: '8%',
        render: (row, idx) => isGu ? toGujaratiDigits(idx + 1) : (idx + 1)
      },
      {
        header: isGu ? 'વસ્તુનું નામ' : 'Item Name',
        align: 'left',
        width: '35%',
        render: (row) => displayItemName(row) || '',
        usePromptFont: true
      },
      {
        header: isGu ? 'કોડ' : 'Code',
        align: 'center',
        width: '12%',
        render: (row) => isGu ? toGujaratiDigits(row.item_code || '') : (row.item_code || '')
      },
      {
        header: isGu ? 'શ્રેણી' : 'Category',
        align: 'left',
        width: '15%',
        render: (row) => row.category || ''
      },
      {
        header: isGu ? 'એકમ' : 'Unit',
        align: 'center',
        width: '10%',
        render: (row) => t(`units.${row.unit}`) || row.unit || ''
      },
      {
        header: isGu ? 'કર %' : 'Tax %',
        align: 'center',
        width: '10%',
        render: (row) => isGu ? toGujaratiDigits((parseFloat(row.tax_percentage) || 0).toFixed(2)) + '%' : (parseFloat(row.tax_percentage) || 0).toFixed(2) + '%'
      },
      {
        header: isGu ? 'સ્થિતિ' : 'Status',
        align: 'center',
        width: '10%',
        render: (row) => row.is_active ? (isGu ? 'સક્રિય' : 'Active') : (isGu ? 'નિષ્ક્રિય' : 'Inactive')
      }
    ];

    const metaInfo = [
      {
        label: isGu ? 'કુલ વસ્તુઓ' : 'Total Items',
        value: isGu ? toGujaratiDigits(rows.length) : rows.length
      },
      {
        label: isGu ? 'સ્થિતિ ફિલ્ટર' : 'Status Filter',
        value: statusFilter === 'all' ? (isGu ? 'બધા' : 'All') : (statusFilter === 'active' ? (isGu ? 'સક્રિય' : 'Active') : (isGu ? 'નિષ્ક્રિય' : 'Inactive'))
      }
    ];

    await exportToPDF({
      title: isGu ? 'વસ્તુ માસ્ટર' : 'Item Master',
      columns,
      rows,
      isGu,
      metaInfo,
      filename: `Item_Master_${new Date().toISOString().split('T')[0]}.pdf`,
      onStart: () => setLoading(true),
      onComplete: () => setLoading(false)
    });
  };

  const filteredItems = items.filter(i => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' ||
      (i.item_name && i.item_name.toLowerCase().includes(q)) ||
      (i.item_name_gu && i.item_name_gu.toLowerCase().includes(q)) ||
      i.item_code?.toLowerCase().includes(q) ||
      i.p_code?.toLowerCase().includes(q);

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'active') return matchesSearch && i.is_active;
    if (statusFilter === 'inactive') return matchesSearch && !i.is_active;
    return matchesSearch;
  });

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredItems.length);
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setActiveDetailTab('general');
  };

  if (loading && items.length === 0 && !company) return <Loading />;

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-6">
        <div className="w-16 h-16 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 mb-6 shadow-none">
          <Building2 size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">{t('accountMaster.errors.noCompany')}</h2>
        <p className="text-slate-500 mb-6 text-center max-w-md text-sm">{t('accountMaster.errors.companyDescription')}</p>
        <button onClick={() => window.location.reload()} className="flex items-center px-4 py-2 bg-[#1d5f84] hover:bg-[#154662] text-white rounded-md shadow-none transition-colors text-sm font-bold uppercase tracking-widest">
          <RefreshCcw className="w-4 h-4 mr-2" /> {t('accountMaster.errors.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 select-none pb-12">
      <Toast message={message} onClose={() => setMessage(null)} />

      <div className="px-4 py-4 max-w-[1600px] mx-auto space-y-4">
        {/* Global Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('itemMaster.totalItems') || 'Total Items'}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{fmtVal(items.length)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('itemMaster.activeItems') || 'Active'}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{fmtVal(items.filter(i => i.is_active).length)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('itemMaster.inactiveItems') || 'Inactive'}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{fmtVal(items.filter(i => !i.is_active).length)}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-none flex flex-col justify-between">
            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{t('itemMaster.categories') || 'Categories'}</span>
            <span className="text-[13px] font-bold font-sans text-slate-800 mt-1">{fmtVal(categories.length)}</span>
          </div>
        </div>

        {/* Minimal Classic Registry Directory Wrapper (Full Width) */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-none">

          {/* Table Control Header Bar (First Line) */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 select-none">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-extrabold text-slate-800 uppercase tracking-wider ${isGu ? 'font-prompt' : ''}`}>
                {t('itemMaster.title') || 'Item Master'}
              </span>
              <span className="bg-slate-200 text-slate-600 font-bold force-en text-[12px] px-1.5 py-0.5 rounded-sm">
                {fmtVal(filteredItems.length)} {t('itemMaster.records') || 'Records'}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Bar */}
              <div className="relative flex items-center border border-slate-200 focus-within:border-[#1d5f84] focus-within:ring-1 focus-within:ring-[#1d5f84] rounded-md bg-white px-2.5 py-1 transition-colors w-48 sm:w-64">
                <Search size={12} className="text-slate-400 mr-1.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t('itemMaster.searchPlaceholder') || "Search name or code..."}
                  className="bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-300 w-full font-semibold"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-0.5 text-slate-300 hover:text-slate-600 transition">
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* Add Item Button */}
              <button
                onClick={handleCreateItem}
                className="h-7 flex items-center gap-1.5 px-2.5 bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] text-white text-[12px] font-bold rounded-md transition shadow-none cursor-pointer uppercase tracking-wider"
              >
                <Plus size={13} />
                <span>{t('itemMaster.addItem') || "New Item"}</span>
              </button>

              {/* CSV Download Button */}
              <button
                onClick={handleDownloadCSV}
                title="Download CSV"
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none"
              >
                <Download size={13} className="text-slate-500" />
              </button>

              {/* PDF Report Button */}
              <button
                onClick={handleExportPDF}
                title={t('common.pdf') || "PDF Report"}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none"
              >
                <FileText size={13} className="text-slate-500" />
              </button>

              {/* Refresh Button */}
              <button
                onClick={loadItems}
                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition rounded-md cursor-pointer shadow-none"
                title={t('itemMaster.refreshRegistry') || 'Refresh'}
              >
                <RefreshCcw size={13} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Directory Filter Content Panel (Second Line) */}
          <div className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-slate-100 select-none">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5">
              {[
                { value: 'all', label: isGu ? 'બધા' : 'All', count: items.length },
                { value: 'active', label: isGu ? 'સક્રિય' : 'Active', count: items.filter(i => i.is_active).length },
                { value: 'inactive', label: isGu ? 'નિષ્ક્રિય' : 'Inactive', count: items.filter(i => !i.is_active).length },
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => { setStatusFilter(tab.value); setCurrentPage(1); }}
                  className={`h-7 flex items-center gap-1.5 px-2.5 text-[12px] font-bold rounded-md transition-all shrink-0 cursor-pointer border ${statusFilter === tab.value
                    ? 'bg-[#1d5f84] border-[#1d5f84] text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
                    }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded-sm leading-none ${statusFilter === tab.value
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-500'
                    }`}>{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Full Width Table Registry */}
          <div className="overflow-x-auto w-full">
            {paginatedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-center p-4">
                <Database size={32} className="text-slate-300 opacity-30" />
                <p className="text-sm font-bold text-slate-400">{t('itemMaster.noRecords')}</p>
                <button
                  onClick={handleCreateItem}
                  className="text-sm font-bold text-blue-600 hover:text-blue-800 transition uppercase tracking-wider cursor-pointer"
                >
                  + {t('itemMaster.addItem')}
                </button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 border-collapse text-[12px]">
                <thead className="bg-slate-50 font-sans">
                  <tr>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-12">#</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-20">{isGu ? "કોડ" : "Code"}</th>
                    <th className="px-3.5 py-2 text-left font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200">{t('itemMaster.itemName')}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-24">{t('itemMaster.unit')}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-24">{t('itemMaster.tax')}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-r border-b border-slate-200 w-24">{t('itemMaster.status')}</th>
                    <th className="px-3.5 py-2 text-center font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 w-28">{t('itemMaster.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {paginatedItems.map((item, idx) => {
                    const globalIdx = startIndex + idx + 1;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/75 transition-colors cursor-pointer select-none"
                        onClick={() => handleSelectItem(item)}
                      >
                        <td className="px-3.5 py-2 text-center font-mono text-slate-500 border-r border-slate-100">{fmtVal(globalIdx)}</td>
                        <td className="px-3.5 py-2 text-center font-mono font-bold text-[#1d5f84] border-r border-slate-100">{fmtVal(item.item_code || item.id)}</td>
                        <td className={`px-3.5 py-2 border-r border-slate-100 font-bold text-slate-800 break-words whitespace-normal ${isGu ? 'font-prompt' : 'font-sans uppercase'}`}>
                          {displayItemName(item)}
                        </td>
                        <td className="px-3.5 py-2 text-center border-r border-slate-100 font-bold text-slate-600">
                          {t(`units.${item.unit}`) || item.unit || '—'}
                        </td>
                        <td className="px-3.5 py-2 text-center border-r border-slate-100 font-mono font-bold text-slate-700">
                          {fmtVal((parseFloat(item.tax_percentage) || 0).toFixed(2))}%
                        </td>
                        <td className="px-3.5 py-2 text-center border-r border-slate-100" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleStatusToggle(item)}
                            className={`px-2.5 py-0.5 text-[12px] font-bold rounded-md border transition cursor-pointer ${item.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                              }`}
                          >
                            {item.is_active ? t('itemMaster.active') : t('itemMaster.inactive')}
                          </button>
                        </td>
                        <td className="px-3.5 py-2 text-center flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSelectItem(item)}
                            className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 hover:text-[#1d5f84] transition cursor-pointer"
                            title="Details"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-500 hover:text-[#1d5f84] transition cursor-pointer"
                            title={t('itemMaster.edit') || "Edit"}
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => handleStatusToggle(item)}
                            className={`p-1 border border-slate-200 rounded hover:bg-slate-50 transition cursor-pointer ${item.is_active ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                            title={item.is_active ? t('itemMaster.deactivate') : t('itemMaster.activate')}
                          >
                            <Power size={12} />
                          </button>
                          <button
                            onClick={() => confirmDelete(item)}
                            className="p-1 border border-rose-100 rounded text-rose-600 bg-rose-50 hover:bg-rose-150 transition cursor-pointer"
                            title={t('itemMaster.delete') || "Delete"}
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Directory Pagination Panel */}
          {filteredItems.length > 0 && (
            <div className="bg-slate-50 border-t border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                {startIndex + 1}-{endIndex} / {filteredItems.length}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 transition text-[10px] font-extrabold text-slate-600 disabled:cursor-not-allowed cursor-pointer animate-duration-100"
                >
                  Prev
                </button>
                <span className="text-sm font-bold text-slate-600 px-1.5">
                  {fmtVal(currentPage)} / {fmtVal(totalPages)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 transition text-[10px] font-extrabold text-slate-600 disabled:cursor-not-allowed cursor-pointer animate-duration-100"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Item Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-150" onClick={() => { setShowModal(false); setEditingItem(null); }} />
          <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto z-10 scale-100 transition-all duration-150">
            <ItemForm
              company={company}
              item={editingItem}
              onSubmit={handleFormSuccess}
              onClose={() => { setShowModal(false); setEditingItem(null); }}
              existingItems={items}
            />
          </div>
        </div>
      )}

      {/* Modal for Item Details Console (Similar to MemberMaster) */}
      {selectedItem && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-150" onClick={() => handleSelectItem(null)} />
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-lg p-5 shadow-xl z-10 flex flex-col animate-in fade-in zoom-in-95 duration-150">

            {/* Close Button */}
            <button
              onClick={() => handleSelectItem(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 transition cursor-pointer bg-slate-50 rounded-md hover:bg-slate-100 border border-slate-200/50"
              title="Close details"
            >
              <X size={14} />
            </button>

            {/* Profile Header */}
            <div className="border-b border-slate-100 pb-4 mb-4 mt-2">
              <div className="flex items-center gap-3">
                {/* Large Profile bubble */}
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getAvatarGradient(displayItemName(selectedItem))} text-white flex items-center justify-center text-sm font-black shrink-0 uppercase border border-slate-300/35 relative font-mono`}>
                  {getInitials(selectedItem)}
                </div>

                <div className="text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      className="font-extrabold text-slate-800 text-base leading-tight"
                      style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}
                    >
                      {isGu ? formatBilingualText(displayItemName(selectedItem)) : displayItemName(selectedItem)}
                    </h2>
                    {selectedItem.category && (
                      <span className="px-2 py-0.5 rounded-md text-[12px] font-bold tracking-wider uppercase border bg-slate-50 border-slate-200 text-slate-655">
                        {selectedItem.category}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono mt-0.5">
                    {displayItemName(selectedItem)}
                  </p>
                </div>
              </div>

              {/* Identification Badges */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-600 rounded-md">
                  <span className="text-[12px] text-slate-400 uppercase">{isGu ? "વસ્તુ કોડ" : "Item Code"}:</span>
                  <span className="font-mono text-[#1d5f84]">{fmtVal(selectedItem.item_code || selectedItem.id)}</span>
                </span>
                {selectedItem.p_code && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-600 rounded-md">
                    <span className="text-[12px] text-slate-400 uppercase">P-Code:</span>
                    <span className="font-mono text-[#1d5f84]">{selectedItem.p_code}</span>
                  </span>
                )}
                {selectedItem.unit && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-600 rounded-md">
                    <span className="text-[12px] text-slate-400 uppercase">{isGu ? "એકમ" : "Unit"}:</span>
                    <span className="font-bold text-slate-700">{t(`units.${selectedItem.unit}`) || selectedItem.unit}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Detail Tabs */}
            <div className="flex border-b border-slate-100 mb-4 w-full shrink-0">
              {[
                { id: 'general', label: isGu ? "સામાન્ય વિગત" : "General Info", icon: Info },
                { id: 'inventory', label: isGu ? "ઇન્વેન્ટરી અને ટેક્સ" : "Inventory & Tax", icon: CreditCard }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-[12px] font-bold transition relative border-b-2 cursor-pointer ${activeDetailTab === tab.id
                    ? 'text-[#1d5f84] border-[#1d5f84]'
                    : 'text-slate-400 hover:text-slate-800 border-transparent'
                    }`}
                >
                  <tab.icon size={12} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Details Content Container */}
            <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-1.5">

              {activeDetailTab === 'general' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? "વસ્તુનું નામ" : "Item Name"}</p>
                    <p className={`text-sm font-bold text-slate-800 ${isGu ? '' : 'uppercase font-mono'}`} style={isGu ? { fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" } : {}}>
                      {isGu ? formatBilingualText(displayItemName(selectedItem)) : displayItemName(selectedItem)}
                    </p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? "વસ્તુ કોડ" : "Item Code"}</p>
                    <p className="text-sm font-bold text-[#1d5f84] font-mono">{fmtVal(selectedItem.item_code || selectedItem.id)}</p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">P-Code</p>
                    <p className="text-sm font-bold text-slate-800 font-mono">{selectedItem.p_code || '-'}</p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? "ઇન્ટરનલ આઈડી" : "Shard ID"}</p>
                    <p className="text-sm font-bold text-slate-500 font-mono">#{selectedItem.id}</p>
                  </div>
                </div>
              )}

              {activeDetailTab === 'inventory' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? "શ્રેણી" : "Category"}</p>
                    <p className="text-sm font-bold text-slate-800 uppercase">{selectedItem.category || '—'}</p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? "એકમ માપ" : "Unit scale"}</p>
                    <p className="text-sm font-bold text-slate-800 uppercase">{t(`units.${selectedItem.unit}`) || selectedItem.unit || '—'}</p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? "વસ્તુ કરવેરા (ટેક્સ)" : "Tax percentage"}</p>
                    <p className="text-sm font-bold text-slate-800 font-mono">{fmtVal((parseFloat(selectedItem.tax_percentage) || 0).toFixed(2))}%</p>
                  </div>

                  <div className="bg-slate-50/50 border border-slate-200 p-3 rounded-md">
                    <p className="text-[12px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{isGu ? "વસ્તુ સ્થિતિ" : "Item Status"}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md border ${selectedItem.is_active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                      {selectedItem.is_active ? t('itemMaster.active') : t('itemMaster.inactive')}
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer Controls */}
            <div className="bg-slate-50 -mx-5 -mb-5 mt-5 px-5 py-3 border-t border-slate-200 flex gap-2 justify-end rounded-b-lg">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusToggle(selectedItem);
                }}
                className={`px-3 py-1.5 text-sm font-bold rounded-md border transition cursor-pointer ${selectedItem.is_active
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
              >
                <span>{selectedItem.is_active ? t('itemMaster.deactivate') : t('itemMaster.activate')}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditItem(selectedItem);
                  handleSelectItem(null);
                }}
                className="px-3 py-1.5 flex items-center gap-1 border border-slate-200 bg-white rounded-md text-sm font-bold text-slate-650 hover:bg-slate-50 transition cursor-pointer"
                title="Edit Item"
              >
                <Edit3 size={12} />
                <span>{t('itemMaster.edit') || "Edit"}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDelete(selectedItem);
                }}
                className="px-3 py-1.5 flex items-center gap-1 border border-rose-100 bg-rose-50 rounded-md text-sm font-bold text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                title="Delete Item"
              >
                <Trash2 size={12} />
                <span>{t('itemMaster.delete') || "Delete"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title={t('itemMaster.deleteTitle')}
        message={t('itemMaster.deleteConfirm', { name: itemToDelete ? displayItemName(itemToDelete) : '' })}
        onConfirm={handleDeleteItem}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
}
