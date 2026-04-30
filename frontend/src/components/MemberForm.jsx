import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X, User, MapPin, Phone,
  CreditCard, Save, AlertCircle,
  CheckCircle, Loader, Building2,
  Globe, Hash, Info, Package,
  UserCheck, Smartphone
} from 'lucide-react'
import api, { sabhasadMasterApi } from '../api'

export default function MemberForm({
  companyId,
  onSuccess,
  editingMember = null,
  onClose,
  existingMembers = []
}) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [errors, setErrors] = useState({})
  const [villageList, setVillageList] = useState([])
  const [bankList, setBankList] = useState([])

  const [formData, setFormData] = useState({
    sabhasadCode: '',
    p_code: '',
    sabhasadName: '',
    phoneNo: '',
    villageCode: '',
    villageName: '',
    fullAcNumber: '',
    bankName: '',
    branchName: '',
    accountType: '',
    addressNo: '',
    engName: '',
    nominalMember: '',
    ifscCode: '',
    bardanOpening: 0,
    is_active: true
  })

  const [localEditId, setLocalEditId] = useState(null)
  const [isFetchingCode, setIsFetchingCode] = useState(false)

  const loadMasterData = useCallback(async () => {
    try {
      const [villagesRes, banksRes] = await Promise.all([
        sabhasadMasterApi.getAllVillages(),
        api.get('/banks')
      ])
      setVillageList(villagesRes.data || [])
      if (banksRes.data.success) setBankList(banksRes.data.data)
    } catch (err) {
      console.error('Failed to load master data', err)
    }
  }, [])

  const initNewForm = useCallback(async () => {
    try {
      const res = await sabhasadMasterApi.getLastCode();
      const nextCode = (parseInt(res.data.lastCode) || 0) + 1;
      setFormData(prev => ({ ...prev, sabhasadCode: nextCode.toString() }));
    } catch (err) {
      console.error('Error fetching last code:', err);
    }
  }, []);

  const fetchNextPCode = async (isNominal) => {
    try {
      const res = await sabhasadMasterApi.getNextPCode(isNominal);
      if (res.data.success) {
        setFormData(prev => ({ ...prev, p_code: res.data.nextPCode }));
      }
    } catch (err) {
      console.error('Error fetching next P-Code:', err);
    }
  };

  useEffect(() => {
    loadMasterData()
    if (editingMember) {
      setLocalEditId(editingMember.id)
      setFormData({
        sabhasadCode: editingMember.member_code || '',
        p_code: editingMember.p_code || '',
        sabhasadName: editingMember.member_name || '',
        phoneNo: editingMember.phone || '',
        villageCode: editingMember.village_code || '',
        villageName: editingMember.village_name || '',
        fullAcNumber: editingMember.full_ac_number || '',
        bankName: editingMember.bank_name || '',
        branchName: editingMember.branch_name || '',
        accountType: editingMember.account_type || '',
        addressNo: editingMember.address_no || '',
        engName: editingMember.eng_name || '',
        nominalMember: editingMember.nominal_member === 'true' || editingMember.nominal_member === true,
        ifscCode: editingMember.ifsc_code || '',
        bardanOpening: editingMember.bardan_opening || 0,
        is_active: editingMember.is_active === 1
      })
    } else {
      initNewForm()
      fetchNextPCode(false) // Default Sabhasad
    }
  }, [editingMember, loadMasterData, initNewForm])

  const handleCodeFetch = async (code) => {
    if (!code || editingMember) return;
    try {
      setIsFetchingCode(true);
      const res = await sabhasadMasterApi.getSabhasadByCode(code);
      if (res.data.success && res.data.data) {
        const member = res.data.data;
        setLocalEditId(member.id);
        setFormData({
          sabhasadCode: member.member_code || '',
          p_code: member.p_code || '',
          sabhasadName: member.member_name || '',
          phoneNo: member.phone || '',
          villageCode: member.village_code || '',
          villageName: member.village_name || '',
          fullAcNumber: member.full_ac_number || '',
          bankName: member.bank_name || '',
          branchName: member.branch_name || '',
          accountType: member.account_type || '',
          addressNo: member.address_no || '',
          engName: member.eng_name || '',
          nominalMember: member.nominal_member || '',
          ifscCode: member.ifsc_code || '',
          bardanOpening: member.bardan_opening || 0,
          is_active: member.is_active === 1
        });
        setMessage({ type: 'success', text: 'Member found! Switched to edit mode.' });
      }
    } catch (err) {
      if (err.response?.status !== 404) console.error('Code fetch error:', err);
    } finally {
      setIsFetchingCode(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => {
      const newData = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'villageCode') {
        const village = villageList.find(v => v.village_code === value);
        if (village) newData.villageName = village.village_name;
      }
      return newData;
    })
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setErrors({})

    const isDuplicate = existingMembers.some(m => 
      m.member_name.toLowerCase().trim() === formData.sabhasadName.toLowerCase().trim() && 
      m.id !== (localEditId || (editingMember ? editingMember.id : null))
    );

    if (isDuplicate) {
      setMessage({ type: 'error', text: 'Member name already exists. Please use a unique name.' });
      return;
    }

    try {
      setLoading(true)
      const currentId = localEditId || (editingMember ? editingMember.id : null);

      if (currentId) {
        await sabhasadMasterApi.updateSabhasad(currentId, formData);
        setMessage({ type: 'success', text: 'Member updated successfully.' })
      } else {
        await sabhasadMasterApi.createSabhasad(formData);
        setMessage({ type: 'success', text: 'Member registered successfully.' })
      }

      setTimeout(() => onSuccess(), 1000)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save member.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-0 overflow-hidden rounded-lg border border-slate-200">
      <div className="bg-blue-600 px-8 py-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-white italic uppercase tracking-tight">
            {localEditId || editingMember ? 'Edit Member' : 'Add New Member'}
          </h2>
          <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-1">Configure sabhasad registry data</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="p-8">
        {message && (
          <div className={`mb-8 p-4 rounded-lg flex items-center gap-3 animate-in slide-in-from-top duration-300 border-l-4 ${
            message.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700'
          }`}>
            {message.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <span className="text-[11px] font-bold uppercase tracking-wider">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column: Personal & Village */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><User size={18} /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-1 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="sabhasadCode"
                      value={formData.sabhasadCode}
                      onChange={handleChange}
                      onBlur={(e) => handleCodeFetch(e.target.value)}
                      placeholder="000"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs"
                    />
                    {isFetchingCode && <Loader size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />}
                  </div>
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">P-Code</label>
                  <input
                    type="text"
                    name="p_code"
                    value={formData.p_code}
                    onChange={handleChange}
                    placeholder="P-000"
                    className="w-full px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs shadow-sm"
                  />
                </div>
                <div className="col-span-3 flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Sabhasad Name (Local)</label>
                  <input
                    type="text"
                    name="sabhasadName"
                    value={formData.sabhasadName}
                    onChange={handleChange}
                    required
                    placeholder="Enter Name"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs italic shadow-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">English Name / Alias</label>
                <input
                  type="text"
                  name="engName"
                  value={formData.engName}
                  onChange={handleChange}
                  placeholder="Enter English Name"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-600 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Village</label>
                  <select
                    name="villageCode"
                    value={formData.villageCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs cursor-pointer"
                  >
                    <option value="">Select Village</option>
                    {villageList.map(v => (
                      <option key={v.id} value={v.village_code}>{v.village_code} - {v.village_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mobile Number</label>
                  <div className="relative">
                    <Smartphone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type="tel"
                      name="phoneNo"
                      value={formData.phoneNo}
                      onChange={handleChange}
                      placeholder="10-digit Mobile"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Member Classification</label>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(p => ({ ...p, nominalMember: false }));
                      if (!editingMember) fetchNextPCode(false);
                    }}
                    className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!formData.nominalMember ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Sabhasad
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(p => ({ ...p, nominalMember: true }));
                      if (!editingMember) fetchNextPCode(true);
                    }}
                    className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${formData.nominalMember ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-400'}`}
                  >
                    Nominal
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Banking & Financial */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Building2 size={18} /></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest italic">Banking Details</h3>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Bank Institution</label>
                  <select
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs cursor-pointer"
                  >
                    <option value="">Select Bank Master</option>
                    {bankList.map(b => (
                      <option key={b.id} value={b.bank_name}>{b.bank_name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">IFSC Code</label>
                    <input
                      type="text"
                      name="ifscCode"
                      value={formData.ifscCode}
                      onChange={handleChange}
                      placeholder="IFSC0000XXX"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-mono text-slate-700 font-bold uppercase text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Account No.</label>
                    <input
                      type="text"
                      name="fullAcNumber"
                      value={formData.fullAcNumber}
                      onChange={handleChange}
                      placeholder="Bank A/c No."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-mono text-slate-700 font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Account Type</label>
                    <select
                      name="accountType"
                      value={formData.accountType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-700 text-xs"
                    >
                      <option value="">Select Type</option>
                      <option value="Savings">Savings</option>
                      <option value="Current">Current</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Opening Bardan</label>
                    <div className="relative">
                      <Package size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input
                        type="number"
                        step="0.01"
                        name="bardanOpening"
                        value={formData.bardanOpening}
                        onChange={handleChange}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 bg-blue-50/30 border border-blue-100 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-mono text-slate-700 font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Registry Status</label>
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                        className="w-4 h-4 accent-emerald-600 cursor-pointer"
                      />
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${formData.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>Active Record</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-2">
              <MapPin size={12} /> Address / Locality
            </label>
            <textarea
              name="addressNo"
              value={formData.addressNo}
              onChange={handleChange}
              rows="2"
              placeholder="House details, Landmark, Street info..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 transition-all font-medium text-slate-600 text-xs"
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="flex-3 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader className="animate-spin" size={18} /> : <><Save size={18} /> {localEditId || editingMember ? 'Update Member' : 'Save Member'}</>}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-10 py-3 bg-slate-100 text-slate-500 font-bold rounded-lg hover:bg-slate-200 transition-all text-[10px] uppercase tracking-widest active:scale-95"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
