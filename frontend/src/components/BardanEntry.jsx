import React, { useState, useEffect } from 'react';
import { bardanEntryApi, sabhasadMasterApi } from '../api';

const translations = {
  en: {
    title: "Khali Bardan Entry",
    form: {
      book_type: "Book Type",
      pavti_no: "Pavti No",
      date: "Date",
      mem_nominal: "Mem/Nominal",
      code: "Code",
      name: "Name",
      qty: "Qty",
      option: "Option",
      remark: "Remark",
      item_details: "Item Details",
      day_qty: "Day Qty",
      total_qty: "Total Qty"
    },
    buttons: {
      new: "New",
      save: "Save",
      edit: "Edit",
      delete: "Delete",
      cancel: "Cancel",
      
      print: "Print",
      data_show: "Data Show",
            refresh: "Refresh",
      report: "Report",
      temporary_save: "Temporary Save",
      name_update: "Name Update"
    }
  },
  gu: {
    title: "ખાલી બારદાન જમા-ઉઠાર",
    form: {
      book_type: "બુક ટાઈપ",
      pavti_no: "પાવતી નં",
      date: "તારીખ",
      mem_nominal: "મેમ/નોમિનલ",
      code: "કોડ",
      name: "નામ",
      qty: "ક્વાન્ટી",
      option: "ઓપ્શન",
      remark: "રીમાર્ક",
      item_details: "આઈટમ વિગત",
      day_qty: "દિન Qty",
      total_qty: "કુલ Qty"
    },
    buttons: {
      new: "નવું",
      save: "સેવ",
      edit: "સુધારો",
      delete: "કાઢી નાખો",
      cancel: "રદ",
      
      data_show: "ડેટા બતાવો",
            refresh: "રીફ્રેશ",
      print: "પ્રિન્ટ",
      report: "રિપોર્ટ",
      temporary_save: "ટેમ્પરરી સેવ",
      name_update: "નામ અપડેટ"
    }
  }
};

export default function BardanEntry({ isOpen, onClose, lang = 'gu' }) {
  const t = translations[lang] || translations.en;

  const [form, setForm] = useState({
    bookType: 'Combo1',
    pavtiNo: '',
    date: new Date().toISOString().split('T')[0],
    memNominal: '',
    code: '',
    name: '',
    qty: '',
    option: 'Combo1',
    remark: '',
    dayQty: '',
    totalQty: ''
  });

  const [gridRows, setGridRows] = useState(Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
  const [entries, setEntries] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [balanceData, setBalanceData] = useState({ taken: 0, returned: 0, balance: 0 });

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchEntries();
      fetchMembers();
    }
  }, [isOpen]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await bardanEntryApi.getAllEntries();
      if (res.data.success) {
        setEntries(res.data.data);
      }
    } catch (err) {
      setError('Failed to load entries');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await sabhasadMasterApi.getAllSabhasad();
      const memberList = res.data.success ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setMembers(memberList);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const fetchBalance = async (code) => {
    if (!code) {
      setBalanceData({ taken: 0, returned: 0, balance: 0 });
      return;
    }
    try {
      const res = await bardanEntryApi.getBalance(code);
      if (res.data.success) {
        setBalanceData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Auto-fill name if code is changed
    if (name === 'code') {
      const member = members.find(m => m.member_code === value);
      if (member) {
        setForm(prev => ({ ...prev, name: member.member_name }));
        fetchBalance(value);
      } else {
        setBalanceData({ taken: 0, returned: 0, balance: 0 });
      }
    }
    // Auto-fill code if name is changed
    if (name === 'name') {
      const member = members.find(m => m.member_name === value);
      if (member) {
        setForm(prev => ({ ...prev, code: member.member_code }));
        fetchBalance(member.member_code);
      } else {
        setBalanceData({ taken: 0, returned: 0, balance: 0 });
      }
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await bardanEntryApi.createEntry({ ...form, gridRows });
      if (res.data.success) {
        setSuccess('Saved successfully!');
        handleNew();
        fetchEntries();
      } else {
        throw new Error(res.data.error || 'Failed to save');
      }
    } catch (err) {
      setError('Save failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!form.id) {
      setError('Please select an entry to update');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await bardanEntryApi.updateEntry(form.id, { ...form, gridRows });
      if (res.data.success) {
        setSuccess('Updated successfully!');
        fetchEntries();
      } else {
        throw new Error(res.data.error || 'Failed to update');
      }
    } catch (err) {
      setError('Update failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setForm({
      bookType: 'Combo1',
      pavtiNo: '',
      date: new Date().toISOString().split('T')[0],
      memNominal: '',
      code: '',
      name: '',
      qty: '',
      option: 'Combo1',
      remark: '',
      dayQty: '',
      totalQty: ''
    });
    setGridRows(Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async () => {
    if (!form.id) {
      setError('Please select an entry to delete');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    setLoading(true);
    setError(null);
    try {
      const res = await bardanEntryApi.deleteEntry(form.id);
      if (res.data.success) {
        setSuccess('Deleted successfully!');
        handleNew();
        fetchEntries();
      } else {
        throw new Error(res.data.error || 'Failed to delete');
      }
    } catch (err) {
      setError('Delete failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (entryId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await bardanEntryApi.getEntryById(entryId);
      if (res.data.success) {
        const entry = res.data.data;
        setForm({
          id: entry.id,
          bookType: entry.book_type,
          pavtiNo: entry.pavti_no,
          date: entry.entry_date ? new Date(entry.entry_date).toISOString().split('T')[0] : '',
          memNominal: entry.mem_nominal,
          code: entry.code,
          name: entry.name,
          qty: entry.qty,
          option: entry.option_type,
          remark: entry.remark,
          dayQty: entry.day_qty,
          totalQty: entry.total_qty
        });
        setGridRows(entry.gridRows || Array.from({ length: 8 }).map(() => ({ col1: '', col2: '', col3: '' })));
      }
    } catch (err) {
      setError('Failed to load entry: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('bardan-print-area');
    const WinPrint = window.open('', '', 'width=900,height=650');
    WinPrint.document.write('<html><head><title>Print Bardan Entry</title>');
    WinPrint.document.write('<style>table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid black; padding: 8px; text-align: left; }</style>');
    WinPrint.document.write('</head><body>');
    WinPrint.document.write('<h1>' + t.title + '</h1>');
    WinPrint.document.write('<p>Pavti No: ' + form.pavtiNo + ' | Date: ' + form.date + '</p>');
    WinPrint.document.write('<p>Member: ' + form.name + ' (' + form.code + ')</p>');
    WinPrint.document.write('<table><thead><tr><th>Col 1</th><th>Col 2</th><th>Col 3</th></tr></thead><tbody>');
    gridRows.forEach(row => {
      if (row.col1 || row.col2 || row.col3) {
        WinPrint.document.write(`<tr><td>${row.col1}</td><td>${row.col2}</td><td>${row.col3}</td></tr>`);
      }
    });
    WinPrint.document.write('</tbody></table>');
    WinPrint.document.write('<p>Qty: ' + form.qty + ' | Remark: ' + form.remark + '</p>');
    WinPrint.document.write('</body></html>');
    WinPrint.document.close();
    WinPrint.focus();
    WinPrint.print();
    WinPrint.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white w-[1000px] rounded-xl shadow-2xl flex flex-col max-h-[95vh] border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-400 to-rose-400 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 p-2 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
             </div>
             <h2 className="text-xl font-bold tracking-tight">{t.title}</h2>
          </div>
          <button onClick={onClose} className="bg-white/20 hover:bg-white/40 p-2 rounded-full transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-6 gap-6 bg-gray-50">
          {/* Balance Metrics Card */}
          <div className="grid grid-cols-3 gap-4">
             <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 italic">Total Bags Taken</p>
                <p className="text-2xl font-black text-slate-800 italic">{balanceData.taken}</p>
             </div>
             <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-emerald-500">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 italic">Total Returned</p>
                <p className="text-2xl font-black text-emerald-500 italic">{balanceData.returned}</p>
             </div>
             <div className="bg-slate-900 p-4 rounded-xl shadow-lg border-l-4 border-l-rose-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 italic">Current Remaining</p>
                <p className="text-2xl font-black text-white italic">{balanceData.balance}</p>
             </div>
          </div>

          {error && <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg animate-pulse">{error}</div>}
          {success && <div className="p-3 bg-green-100 border border-green-200 text-green-700 rounded-lg">{success}</div>}
          
          <div className="grid grid-cols-12 gap-6 flex-1 overflow-hidden">
            {/* Form Section */}
            <div className="col-span-8 flex flex-col gap-6 overflow-y-auto pr-2">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.form.book_type}</label>
                  <select name="bookType" value={form.bookType} onChange={handleChange} className="w-full border-gray-200 rounded-lg focus:ring-rose-500 focus:border-rose-500 transition-all">
                    <option>Combo1</option>
                    <option>Combo2</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.form.pavti_no}</label>
                  <input name="pavtiNo" value={form.pavtiNo} onChange={handleChange} className="w-full border-gray-200 rounded-lg focus:ring-rose-500 focus:border-rose-500" placeholder="Enter Pavti No" />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.form.date}</label>
                  <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full border-gray-200 rounded-lg focus:ring-rose-500 focus:border-rose-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.form.mem_nominal}</label>
                  <select name="memNominal" value={form.memNominal} onChange={handleChange} className="w-full border-gray-200 rounded-lg focus:ring-rose-500 focus:border-rose-500">
                    <option value="">Select...</option>
                    <option value="Member">Member</option>
                    <option value="Nominal">Nominal</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.form.code}</label>
                  <select name="code" value={form.code} onChange={handleChange} className="w-full border-gray-200 rounded-lg focus:ring-rose-500 focus:border-rose-500">
                    <option value="">Select Code</option>
                    {members.map(m => <option key={m.id} value={m.member_code}>{m.member_code}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.form.name}</label>
                  <select name="name" value={form.name} onChange={handleChange} className="w-full border-gray-200 rounded-lg focus:ring-rose-500 focus:border-rose-500">
                    <option value="">Select Name</option>
                    {members.map(m => <option key={m.id} value={m.member_name}>{m.member_name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.form.qty}</label>
                  <input type="number" name="qty" value={form.qty} onChange={handleChange} className="w-full border-gray-200 rounded-lg focus:ring-rose-500 focus:border-rose-500" placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.form.option}</label>
                  <select name="option" value={form.option} onChange={handleChange} className="w-full border-gray-200 rounded-lg focus:ring-rose-500 focus:border-rose-500">
                    <option>Combo1</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t.form.remark}</label>
                  <input name="remark" value={form.remark} onChange={handleChange} className="w-full border-gray-200 rounded-lg focus:ring-rose-500 focus:border-rose-500" placeholder="Add any notes..." />
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                   <h3 className="text-sm font-bold text-gray-700 uppercase">{t.title} List</h3>
                   <span className="text-xs text-gray-400">{entries.length} records</span>
                </div>
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white">
                      <tr>
                        <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase border-b border-gray-100">Pavti No</th>
                        <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase border-b border-gray-100">Date</th>
                        <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase border-b border-gray-100">Name</th>
                        <th className="px-4 py-2 text-xs font-bold text-gray-500 uppercase border-b border-gray-100 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {entries.length === 0 ? (
                        <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-400 italic">No entries found</td></tr>
                      ) : (
                        entries.map(entry => (
                          <tr 
                            key={entry.id}
                            onClick={() => handleEdit(entry.id)}
                            className="cursor-pointer hover:bg-rose-50 transition-colors group"
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-700">{entry.pavti_no}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{new Date(entry.entry_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 group-hover:text-rose-600 font-medium">{entry.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 text-right font-mono">{parseFloat(entry.qty).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Section (Grid & Totals) */}
            <div className="col-span-4 flex flex-col gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col flex-1">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700 uppercase">{t.form.item_details}</h3>
                </div>
                <div className="overflow-auto flex-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white sticky top-0 shadow-sm">
                        <th className="px-2 py-2 text-left text-xs font-bold text-gray-400 w-10">#</th>
                        <th className="px-2 py-2 text-left text-xs font-bold text-gray-400">Col 1</th>
                        <th className="px-2 py-2 text-left text-xs font-bold text-gray-400">Col 2</th>
                        <th className="px-2 py-2 text-left text-xs font-bold text-gray-400">Col 3</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {gridRows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-2 py-1.5 text-center text-xs text-gray-300 font-bold">{i + 1}</td>
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              value={row.col1 || ''}
                              onChange={(e) => {
                                const newRows = [...gridRows];
                                newRows[i] = { ...row, col1: e.target.value };
                                setGridRows(newRows);
                              }}
                              className="w-full border-transparent focus:border-rose-200 focus:ring-0 rounded p-1 text-sm bg-gray-50/50"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              value={row.col2 || ''}
                              onChange={(e) => {
                                const newRows = [...gridRows];
                                newRows[i] = { ...row, col2: e.target.value };
                                setGridRows(newRows);
                              }}
                              className="w-full border-transparent focus:border-rose-200 focus:ring-0 rounded p-1 text-sm bg-gray-50/50"
                            />
                          </td>
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              value={row.col3 || ''}
                              onChange={(e) => {
                                const newRows = [...gridRows];
                                newRows[i] = { ...row, col3: e.target.value };
                                setGridRows(newRows);
                              }}
                              className="w-full border-transparent focus:border-rose-200 focus:ring-0 rounded p-1 text-sm bg-gray-50/50"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t.form.day_qty}</span>
                    <input type="number" name="dayQty" value={form.dayQty} onChange={handleChange} className="w-24 text-right border-gray-200 rounded-lg focus:ring-rose-500 focus:border-rose-500 py-1" placeholder="0.00" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t.form.total_qty}</span>
                    <input type="number" name="totalQty" value={form.totalQty} onChange={handleChange} className="w-24 text-right border-gray-200 rounded-lg font-bold text-rose-600 focus:ring-rose-500 focus:border-rose-500 py-1" placeholder="0.00" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 shrink-0">
            <div className="flex gap-2">
              <button type="button" onClick={handleNew} className="flex items-center gap-2 px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-bold shadow-lg shadow-sky-200 transition-all active:scale-95">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                {t.buttons.new}
              </button>
              <button type="button" onClick={handleDelete} className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-200 transition-all active:scale-95">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                {t.buttons.delete}
              </button>
              <button type="button" onClick={fetchEntries} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition-all">
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                {t.buttons.refresh}
              </button>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={handlePrint} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                {t.buttons.print}
              </button>
              <button 
                type="button" 
                onClick={form.id ? handleUpdate : handleSubmit} 
                disabled={loading}
                className="flex items-center gap-2 px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                {form.id ? t.buttons.edit : t.buttons.save}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
