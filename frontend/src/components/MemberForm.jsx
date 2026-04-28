import React, { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X, User, MapPin, Phone,
  CreditCard, Save, AlertCircle,
  CheckCircle, Loader, Building2,
  Globe, Hash, Info, Package
} from 'lucide-react'
import api, { sabhasadMasterApi } from '../api'

export default function MemberForm({
  companyId,
  onSuccess,
  editingMember = null,
  onClose
}) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [errors, setErrors] = useState({})
  const [villageList, setVillageList] = useState([])
  const [bankList, setBankList] = useState([])

  const [formData, setFormData] = useState({
    sabhasadCode: '',
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

  // To track if we've switched to "edit mode" via code fetch
  const [localEditId, setLocalEditId] = useState(null)
  const [isFetchingCode, setIsFetchingCode] = useState(false)

  // Load banks and villages
  const loadMasterData = useCallback(async () => {
    try {
      const [villagesRes, banksRes] = await Promise.all([
        sabhasadMasterApi.getAllVillages(),
        api.get('/banks') // Link to the new bank master
      ])
      setVillageList(villagesRes.data || [])
      if (banksRes.data.success) setBankList(banksRes.data.data)
    } catch (err) {
      console.error('Failed to load master data', err)
    }
  }, [])

  // Auto-generate next code if creating new
  const initNewForm = useCallback(async () => {
    try {
      const res = await sabhasadMasterApi.getLastCode();
      const nextCode = (parseInt(res.data.lastCode) || 0) + 1;
      setFormData(prev => ({ ...prev, sabhasadCode: nextCode.toString() }));
    } catch (err) {
      console.error('Error fetching last code:', err);
    }
  }, []);

  useEffect(() => {
    loadMasterData()
    if (editingMember) {
      setLocalEditId(editingMember.id)
      setFormData({
        sabhasadCode: editingMember.member_code || '',
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
        nominalMember: editingMember.nominal_member || '',
        ifscCode: editingMember.ifsc_code || '',
        bardanOpening: editingMember.bardan_opening || 0,
        is_active: editingMember.is_active === 1
      })
    } else {
      initNewForm()
    }
  }, [editingMember, loadMasterData, initNewForm])

  // New: Fetch by Code logic
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
      // If not found, we just stay in "Add" mode
      if (err.response?.status !== 404) {
        console.error('Code fetch error:', err);
      }
    } finally {
      setIsFetchingCode(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => {
      const newData = { ...prev, [name]: type === 'checkbox' ? checked : value };

      // Auto-fill village name if code changes
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

    try {
      setLoading(true)
      const currentId = localEditId || (editingMember ? editingMember.id : null);

      if (currentId) {
        await sabhasadMasterApi.updateSabhasad(currentId, formData);
        setMessage({ type: 'success', text: 'Record synchronized successfully' })
      } else {
        await sabhasadMasterApi.createSabhasad(formData);
        setMessage({ type: 'success', text: 'New record initialized' })
      }

      setTimeout(() => onSuccess(), 1000)
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Registry operation failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-lg border border-white/40 shadow-2xl p-10 relative overflow-hidden animate-in zoom-in-95 duration-300">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/5 rounded-full -mr-48 -mt-48 blur-[100px]"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-400/5 rounded-full -ml-48 -mb-48 blur-[100px]"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">
              {localEditId || editingMember ? 'Update Profile' : 'New Member'}
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Legal Identity Management</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-all active:scale-90">
              <X size={20} />
            </button>
          )}
        </div>

        {message && (
          <div className={`mb-8 p-5 rounded-lg flex items-center gap-4 animate-in slide-in-from-top duration-300 ${message.type === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
            {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <span className="text-sm font-black italic">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-10">

          {/* Identity Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-3">
                <div className="w-8 h-px bg-blue-600"></div> Core Identity
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Code</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                        {isFetchingCode ? <Loader size={14} className="animate-spin text-blue-500" /> : <Hash size={14} />}
                      </div>
                      <input
                        type="text"
                        name="sabhasadCode"
                        value={formData.sabhasadCode}
                        onChange={handleChange}
                        onBlur={(e) => handleCodeFetch(e.target.value)}
                        placeholder="000"
                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 border ${localEditId ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100'} focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-black text-slate-700 text-sm`}
                      />
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Sabhasad Name (Local)</label>
                    <div className="relative group">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="text"
                        name="sabhasadName"
                        value={formData.sabhasadName}
                        onChange={handleChange}
                        required
                        placeholder="Enter Gujarati/Local Name"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-black text-slate-700 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">English Name / Alias</label>
                  <div className="relative group">
                    <Info size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" />
                    <input
                      type="text"
                      name="engName"
                      value={formData.engName}
                      onChange={handleChange}
                      placeholder="Legal Name in English"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-bold text-slate-600 text-sm"
                    />
                  </div>
                </div>

                {/* Member Type Checkbox */}
                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={!formData.nominalMember}
                      onChange={(e) => setFormData(prev => ({ ...prev, nominalMember: !e.target.checked }))}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                    <span className={`text-xs font-bold uppercase tracking-wider transition-colors ${!formData.nominalMember ? 'text-emerald-600' : 'text-blue-600'}`}>
                      {!formData.nominalMember ? 'Sabhasad' : 'Nominal Member'}
                    </span>
                  </label>
                </div>


              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-3">
                <div className="w-8 h-px bg-emerald-600"></div> Communication
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Village Code</label>
                    <select
                      name="villageCode"
                      value={formData.villageCode}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-emerald-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm appearance-none cursor-pointer"
                    >
                      <option value="">Select Village</option>
                      {villageList.map(v => (
                        <option key={v.id} value={v.village_code}>{v.village_code} - {v.village_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Phone Interface</label>
                    <div className="relative group">
                      <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
                      <input
                        type="tel"
                        name="phoneNo"
                        value={formData.phoneNo}
                        onChange={handleChange}
                        placeholder="Primary Number"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-emerald-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm font-mono tracking-tighter"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Administrative Address</label>
                  <div className="relative group">
                    <MapPin size={16} className="absolute left-4 top-4 text-slate-300 group-focus-within:text-emerald-600 transition-colors" />
                    <textarea
                      name="addressNo"
                      value={formData.addressNo}
                      onChange={handleChange}
                      rows="2"
                      placeholder="Locality, Sector, Street Details"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-emerald-500 rounded-lg outline-none transition-all font-medium text-slate-600 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent"></div>

          {/* Financial Section */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] flex items-center gap-3">
              <div className="w-8 h-px bg-amber-600"></div> Banking & Status
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">{t('memberMaster.bankInstitution')}</label>
                <div className="relative group">
                  <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <select
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-amber-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm appearance-none cursor-pointer"
                  >
                    <option value="">{t('memberMaster.selectBankMaster')}</option>
                    {bankList.map(b => (
                      <option key={b.id} value={b.bank_name}>{b.bank_name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">▼</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">{t('memberMaster.ifscCode')}</label>
                <div className="relative group">
                  <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleChange}
                    placeholder="IFSC0000XXX"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-amber-500 rounded-lg outline-none transition-all font-mono text-slate-700 font-bold uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Vault Account No.</label>
                <div className="relative group">
                  <CreditCard size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    name="fullAcNumber"
                    value={formData.fullAcNumber}
                    onChange={handleChange}
                    placeholder="00000000000"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 focus:bg-white focus:border-amber-500 rounded-lg outline-none transition-all font-mono text-slate-700 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Protocols</label>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-1 flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="is_active"
                    className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-widest cursor-pointer rounded-lg transition-all ${formData.is_active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'text-slate-400'
                      }`}
                  >
                    Active
                  </label>
                  <label
                    htmlFor="is_active"
                    className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-widest cursor-pointer rounded-lg transition-all ${!formData.is_active ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'text-slate-400'
                      }`}
                    onClick={() => setFormData(p => ({ ...p, is_active: false }))}
                  >
                    Archived
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Nominal Identification</label>
                <input
                  type="text"
                  name="nominalMember"
                  value={formData.nominalMember}
                  onChange={handleChange}
                  placeholder="Nominal Status / ID"
                  className="w-full px-4 py-3 bg-amber-50/30 border border-amber-100 focus:bg-white focus:border-amber-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Account Category</label>
                <select
                  name="accountType"
                  value={formData.accountType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-amber-50/30 border border-amber-100 focus:bg-white focus:border-amber-500 rounded-lg outline-none transition-all font-bold text-slate-700 text-sm"
                >
                  <option value="">Default</option>
                  <option value="Savings">Savings</option>
                  <option value="Current">Current</option>
                  <option value="Nominal">Nominal Member</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Bardan Opening Balance</label>
                <div className="relative group">
                  <Package size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="number"
                    step="0.01"
                    name="bardanOpening"
                    value={formData.bardanOpening}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-3 bg-blue-50/30 border border-blue-100 focus:bg-white focus:border-blue-500 rounded-lg outline-none transition-all font-mono text-slate-700 font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white font-black py-4 rounded-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-300"
            >
              {loading ? <Loader className="animate-spin" size={20} /> : <><Save size={18} /> {localEditId || editingMember ? 'Synchronize Record' : 'Create Identity'}</>}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-10 py-4 bg-white border border-slate-100 text-slate-400 font-black rounded-lg hover:bg-slate-50 hover:text-slate-600 transition-all text-sm uppercase tracking-widest"
            >
              Abort
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
