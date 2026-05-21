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
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [errors, setErrors] = useState({})
  const [villageList, setVillageList] = useState([])
  const [bankList, setBankList] = useState([])

  const [formData, setFormData] = useState({
    sabhasadCode: '',
    p_code: '',
    sabhasadName: '',
    member_name_gu: '',
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
        member_name_gu: editingMember.member_name_gu || '',
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
    const tId = setTimeout(() => {
      sabhasadNameRef.current?.focus();
    }, 150);
    return () => clearTimeout(tId);
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
          member_name_gu: member.member_name_gu || '',
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
        setMessage({ type: 'success', text: t('memberMaster.memberFound') });
      }
    } catch (err) {
      if (err.response?.status !== 404) console.error('Code fetch error:', err);
    } finally {
      setIsFetchingCode(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;

    if (name === 'engName' && typeof finalValue === 'string') {
      finalValue = finalValue.replace(/[^ -~]/g, '').toUpperCase();
    }

    setFormData(prev => {
      const newData = { ...prev, [name]: finalValue };
      if (name === 'villageCode') {
        const village = villageList.find(v => v.village_code === value);
        if (village) newData.villageName = village.village_name;
      }
      if (name === 'engName') {
        // Automatically sync to Gujarati field if it's currently empty or was previously synced
        if (prev.member_name_gu === prev.engName || !prev.member_name_gu) {
          newData.member_name_gu = finalValue;
        }
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

    if (!formData.member_name_gu || !formData.member_name_gu.trim()) {
      setMessage({ type: 'error', text: t('memberMaster.nameRequiredGuj') || 'Gujarati Member Name is required.' });
      return;
    }

    if (!formData.engName || !formData.engName.trim()) {
      setMessage({ type: 'error', text: t('memberMaster.nameRequiredEng') || 'English Member Name is required.' });
      return;
    }

    if (!formData.villageCode || !formData.villageCode.trim()) {
      setMessage({ type: 'error', text: t('memberMaster.villageRequired') || 'Village is required.' });
      return;
    }

    const isDuplicate = existingMembers.some(m => 
      m.member_name.toLowerCase().trim() === formData.sabhasadName.toLowerCase().trim() && 
      m.id !== (localEditId || (editingMember ? editingMember.id : null))
    );

    if (isDuplicate) {
      setMessage({ type: 'error', text: t('memberMaster.nameExists') });
      return;
    }

    try {
      setLoading(true)
      const currentId = localEditId || (editingMember ? editingMember.id : null);

      if (currentId) {
        await sabhasadMasterApi.updateSabhasad(currentId, formData);
        onSuccess(t('memberMaster.memberUpdated'));
      } else {
        await sabhasadMasterApi.createSabhasad(formData);
        onSuccess(t('memberMaster.memberRegistered'));
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || t('memberMaster.failedToSaveMember') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-slate-200 shadow-xl flex flex-col font-mono text-xs select-none">
      
      {/* Title Bar */}
      <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center select-none">
        <div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {localEditId || editingMember ? t('memberForm.editTitle') : t('memberForm.addTitle')}
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">{t('memberForm.subtitle')}</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition rounded-md"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Form Content */}
      <div className="p-5 flex-1 overflow-y-auto">
        {message && (
          <div className={`mb-4 p-2.5 border font-bold text-[11px] rounded-md flex items-center gap-2 shadow-sm ${
            message.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            {message.type === 'error' ? <AlertCircle size={14} className="shrink-0" /> : <CheckCircle size={14} className="shrink-0" />}
            <span className="uppercase leading-none tracking-wider">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Left Column */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1 border-b border-slate-100 pb-2">
                <User size={13} className="text-[#1d5f84]" />
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">{t('memberForm.basicInfo')}</h3>
              </div>
              
              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('memberForm.code')}</label>
                  <div className="relative">
                    <input
                      ref={sabhasadCodeRef}
                      type="text"
                      name="sabhasadCode"
                      value={formData.sabhasadCode}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md outline-none font-bold text-slate-500 cursor-not-allowed"
                      readOnly
                      tabIndex={-1}
                      translate="no"
                      lang="en"
                    />
                    {isFetchingCode && <Loader size={11} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-[#1d5f84]" />}
                  </div>
                </div>
                <div className="col-span-1 flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('memberForm.pCode')}</label>
                  <input
                    ref={pCodeRef}
                    type="text"
                    name="p_code"
                    value={formData.p_code}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, sabhasadNameRef)}
                    translate="no"
                    lang="en"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 force-en font-sans"
                  />
                </div>
                <div className="col-span-3 flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 font-sans">{t('memberMaster.memberNameGU')}</label>
                  <input
                    ref={sabhasadNameRef}
                    type="text"
                    name="member_name_gu"
                    value={formData.member_name_gu}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        member_name_gu: val,
                        sabhasadName: val 
                      }));
                    }}
                    onKeyDown={(e) => handleKeyDown(e, engNameRef)}
                    required
                    placeholder="ગુજરાતી નામ લખો"
                    translate="no"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700"
                    style={{ fontFamily: "'Prompt', 'Noto Sans Gujarati', sans-serif" }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('memberForm.engName')}</label>
                <input
                  ref={engNameRef}
                  type="text"
                  name="engName"
                  value={formData.engName}
                  onChange={handleChange}
                  translate="no"
                  lang="en"
                  onKeyDown={(e) => handleKeyDown(e, villageCodeRef)}
                  placeholder={t('memberForm.enterName')}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 force-en font-sans"
                  spellCheck="false"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('memberForm.village')}</label>
                  <select
                    ref={villageCodeRef}
                    name="villageCode"
                    value={formData.villageCode}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, phoneNoRef)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="">{t('memberForm.selectVillage')}</option>
                    {villageList.map(v => (
                      <option key={v.id} value={v.village_code}>{v.village_code} - {v.village_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('memberForm.mobile')}</label>
                  <input
                    ref={phoneNoRef}
                    type="tel"
                    name="phoneNo"
                    value={formData.phoneNo}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, bankNameRef)}
                    placeholder={t('memberForm.mobilePlaceholder')}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-[9px] font-bold text-slate-400 font-sans ${i18n.language !== 'gu' ? 'uppercase' : ''}`}>{t('memberForm.classification')}</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-md border border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(p => ({ ...p, nominalMember: false }));
                      if (!editingMember) fetchNextPCode(false);
                    }}
                    className={`py-1 flex items-center justify-center text-[10px] font-bold transition rounded-md border cursor-pointer uppercase tracking-wider ${!formData.nominalMember ? 'bg-[#1d5f84] border-[#1d5f84] text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'}`}
                  >
                    {t('memberForm.sabhasad')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(p => ({ ...p, nominalMember: true }));
                      if (!editingMember) fetchNextPCode(true);
                    }}
                    className={`py-1 flex items-center justify-center text-[10px] font-bold transition rounded-md border cursor-pointer uppercase tracking-wider ${formData.nominalMember ? 'bg-[#1d5f84] border-[#1d5f84] text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'}`}
                  >
                    {t('memberForm.nominal')}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1 border-b border-slate-100 pb-2">
                <Building2 size={13} className="text-[#1d5f84]" />
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">{t('memberForm.bankingDetails')}</h3>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('memberForm.bankInstitution')}</label>
                  <select
                    ref={bankNameRef}
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    translate="no"
                    lang="en"
                    onKeyDown={(e) => handleKeyDown(e, ifscCodeRef)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 cursor-pointer force-en"
                  >
                    <option value="" className="force-en">{t('memberForm.selectBank')}</option>
                    {bankList.map(b => (
                      <option key={b.id} value={b.bank_name} className="force-en">{b.bank_name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase label-ifsc-gu" translate="no"></label>
                    <input
                      ref={ifscCodeRef}
                      type="text"
                      name="ifscCode"
                      value={formData.ifscCode}
                      onChange={handleChange}
                      translate="no"
                      lang="en"
                      onKeyDown={(e) => handleKeyDown(e, fullAcNumberRef)}
                      placeholder={t('memberForm.ifscPlaceholder')}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold uppercase text-slate-700 force-en"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('memberForm.accountNo')}</label>
                    <input
                      ref={fullAcNumberRef}
                      type="text"
                      name="fullAcNumber"
                      value={formData.fullAcNumber}
                      onChange={handleChange}
                      translate="no"
                      lang="en"
                      onKeyDown={(e) => handleKeyDown(e, accountTypeRef)}
                      placeholder={t('memberForm.accountNoPlaceholder')}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition text-slate-700 font-bold force-en"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('memberForm.accountType')}</label>
                    <select
                      ref={accountTypeRef}
                      name="accountType"
                      value={formData.accountType}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, bardanOpeningRef)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="">{t('memberForm.selectType')}</option>
                      <option value="Savings">{t('memberForm.savings')}</option>
                      <option value="Current">{t('memberForm.current')}</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('memberForm.openingBardan')}</label>
                    <input
                      ref={bardanOpeningRef}
                      type="number"
                      step="0.01"
                      name="bardanOpening"
                      value={formData.bardanOpening}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, addressNoRef)}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition font-bold text-slate-700 font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1 pt-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('memberForm.registryStatus')}</label>
                  <div className="flex items-center gap-4 bg-slate-50 p-2.5 border border-slate-200 rounded-md">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                        className="w-3.5 h-3.5 cursor-pointer accent-[#1d5f84]"
                      />
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${formData.is_active ? 'text-slate-700' : 'text-slate-400'}`}>{t('memberForm.activeRecord')}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase font-sans">{t('memberForm.addressLocality')}</label>
            <textarea
              ref={addressNoRef}
              name="addressNo"
              value={formData.addressNo}
              onChange={handleChange}
              rows="2"
              onKeyDown={(e) => handleKeyDown(e, null)}
              placeholder={t('memberForm.addressPlaceholder')}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md focus:border-[#1d5f84] focus:ring-1 focus:ring-[#1d5f84] outline-none transition text-slate-700"
            />
          </div>
        </form>
      </div>

      {/* Modal Footer Actions */}
      <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex gap-2.5 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold transition rounded-md uppercase tracking-wide cursor-pointer"
        >
          {t('memberForm.cancel')}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-1.5 flex items-center gap-1.5 text-xs font-bold text-white bg-[#1d5f84] hover:bg-[#154662] border border-[#1d5f84] transition rounded-md uppercase tracking-wide cursor-pointer disabled:opacity-50"
        >
          {loading ? <Loader className="animate-spin" size={12} /> : <Save size={12} />}
          <span>{localEditId || editingMember ? t('memberForm.update') : t('memberForm.save')}</span>
        </button>
      </div>
    </div>
  )
}
