import React, { useState, useEffect, useCallback, useRef } from 'react'
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

  // Field refs
  const sabhasadCodeRef = useRef(null);
  const pCodeRef = useRef(null);
  const sabhasadNameRef = useRef(null);
  const engNameRef = useRef(null);
  const villageCodeRef = useRef(null);
  const phoneNoRef = useRef(null);
  const bankNameRef = useRef(null);
  const ifscCodeRef = useRef(null);
  const fullAcNumberRef = useRef(null);
  const accountTypeRef = useRef(null);
  const bardanOpeningRef = useRef(null);
  const addressNoRef = useRef(null);

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
      fetchNextPCode(false)
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

  const handleKeyDown = (e, nextRef) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
      } else {
        handleSubmit(e);
      }
    }
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setMessage(null)
    setErrors({})

    if (!formData.sabhasadName || !formData.sabhasadName.trim()) {
      setMessage({ type: 'error', text: 'Member Name is required.' });
      return;
    }

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
        onSuccess('Member updated successfully.');
      } else {
        await sabhasadMasterApi.createSabhasad(formData);
        onSuccess('Member registered successfully.');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save member.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-0 overflow-hidden rounded-none border border-zinc-400 font-mono text-xs select-none animate-none">
      <div className="bg-zinc-100 px-5 py-3 border-b border-zinc-300 flex justify-between items-center select-none animate-none">
        <div>
          <h2 className="text-sm font-bold text-zinc-800 uppercase tracking-tight animate-none">
            {localEditId || editingMember ? 'EDIT MEMBER' : 'ADD NEW MEMBER'}
          </h2>
          <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5 tracking-wider">Configure sabhasad registry data</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-red-600 transition">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="p-5 animate-none">
        {message && (
          <div className={`mb-4 p-3 border text-xs flex items-center gap-2 ${
            message.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}>
            {message.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
            <span className="font-bold uppercase leading-none">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Left Column */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1 border-b border-zinc-200 pb-1">
                <User size={15} className="text-zinc-500" />
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest leading-none">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Code</label>
                  <div className="relative">
                    <input
                      ref={sabhasadCodeRef}
                      type="text"
                      name="sabhasadCode"
                      value={formData.sabhasadCode}
                      onChange={handleChange}
                      onBlur={(e) => handleCodeFetch(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, pCodeRef)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800"
                    />
                    {isFetchingCode && <Loader size={12} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-blue-600" />}
                  </div>
                </div>
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">P-Code</label>
                  <input
                    ref={pCodeRef}
                    type="text"
                    name="p_code"
                    value={formData.p_code}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, sabhasadNameRef)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-800"
                  />
                </div>
                <div className="col-span-3 flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Sabhasad Name (Local)</label>
                  <input
                    ref={sabhasadNameRef}
                    type="text"
                    name="sabhasadName"
                    value={formData.sabhasadName}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, engNameRef)}
                    required
                    placeholder="ENTER NAME"
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-sans font-bold text-zinc-800"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">English Name / Alias</label>
                <input
                  ref={engNameRef}
                  type="text"
                  name="engName"
                  value={formData.engName}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, villageCodeRef)}
                  placeholder="ENTER ENGLISH NAME"
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Village</label>
                  <select
                    ref={villageCodeRef}
                    name="villageCode"
                    value={formData.villageCode}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, phoneNoRef)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-700 cursor-pointer"
                  >
                    <option value="">SELECT VILLAGE</option>
                    {villageList.map(v => (
                      <option key={v.id} value={v.village_code}>{v.village_code} - {v.village_name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Mobile Number</label>
                  <input
                    ref={phoneNoRef}
                    type="tel"
                    name="phoneNo"
                    value={formData.phoneNo}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, bankNameRef)}
                    placeholder="10-DIGIT MOBILE"
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-700"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Member Classification</label>
                <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-1 border border-zinc-300">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(p => ({ ...p, nominalMember: false }));
                      if (!editingMember) fetchNextPCode(false);
                    }}
                    className={`py-1.5 text-[10px] font-bold uppercase transition rounded-none ${!formData.nominalMember ? 'bg-blue-600 border border-blue-500 text-white' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    Sabhasad
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(p => ({ ...p, nominalMember: true }));
                      if (!editingMember) fetchNextPCode(true);
                    }}
                    className={`py-1.5 text-[10px] font-bold uppercase transition rounded-none ${formData.nominalMember ? 'bg-blue-600 border border-blue-500 text-white' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    Nominal
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1 border-b border-zinc-200 pb-1">
                <Building2 size={15} className="text-zinc-500" />
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest leading-none">Banking Details</h3>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Bank Institution</label>
                  <select
                    ref={bankNameRef}
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, ifscCodeRef)}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-700 cursor-pointer"
                  >
                    <option value="">SELECT BANK MASTER</option>
                    {bankList.map(b => (
                      <option key={b.id} value={b.bank_name}>{b.bank_name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">IFSC Code</label>
                    <input
                      ref={ifscCodeRef}
                      type="text"
                      name="ifscCode"
                      value={formData.ifscCode}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, fullAcNumberRef)}
                      placeholder="IFSC0000XXX"
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold uppercase text-zinc-700"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Account No.</label>
                    <input
                      ref={fullAcNumberRef}
                      type="text"
                      name="fullAcNumber"
                      value={formData.fullAcNumber}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, accountTypeRef)}
                      placeholder="BANK A/C NO."
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition text-zinc-700 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Account Type</label>
                    <select
                      ref={accountTypeRef}
                      name="accountType"
                      value={formData.accountType}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, bardanOpeningRef)}
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-700"
                    >
                      <option value="">SELECT TYPE</option>
                      <option value="Savings">SAVINGS</option>
                      <option value="Current">CURRENT</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Opening Bardan</label>
                    <input
                      ref={bardanOpeningRef}
                      type="number"
                      step="0.01"
                      name="bardanOpening"
                      value={formData.bardanOpening}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, addressNoRef)}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition font-bold text-zinc-700"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1 pt-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase">Registry Status</label>
                  <div className="flex items-center gap-4 bg-zinc-50 p-2 border border-zinc-300">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                        className="w-3.5 h-3.5 cursor-pointer accent-blue-600"
                      />
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${formData.is_active ? 'text-zinc-800' : 'text-zinc-400'}`}>Active Record</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Address / Locality</label>
            <textarea
              ref={addressNoRef}
              name="addressNo"
              value={formData.addressNo}
              onChange={handleChange}
              rows="2"
              onKeyDown={(e) => handleKeyDown(e, null)}
              placeholder="HOUSE DETAILS, STREET INFO..."
              className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-300 rounded-none focus:bg-white focus:border-zinc-600 outline-none transition text-zinc-700"
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-zinc-200 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-bold transition rounded-none uppercase text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 border border-blue-500 hover:bg-blue-700 text-white font-bold transition rounded-none uppercase flex items-center justify-center gap-2 text-xs"
            >
              {loading ? <Loader className="animate-spin" size={14} /> : <><Save size={14} /> {localEditId || editingMember ? 'Update' : 'Save'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
