import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { X } from 'lucide-react';

export default function MemberForm({ 
  companyId, 
  onSuccess, 
  editingMember = null, 
  onClose 
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    member_name: '',
    member_address: '',
    member_gst_no: '',
    phone: '',
    email: '',
    discount_percentage: 0,
    member_code: null
  });

  // Populate form when editing
  useEffect(() => {
    if (editingMember) {
      setFormData({
        member_name: editingMember.member_name,
        member_address: editingMember.member_address || '',
        member_gst_no: editingMember.member_gst_no || '',
        phone: editingMember.phone || '',
        email: editingMember.email || '',
        discount_percentage: editingMember.discount_percentage || 0,
        member_code: editingMember.member_code
      });
    }
  }, [editingMember]);



  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'discount_percentage' ? parseFloat(value) || 0 : value
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.member_name.trim()) {
      setError(t('memberMaster.memberNameRequired'));
      return false;
    }
    if (formData.member_name.length < 2) {
      setError(t('memberMaster.memberNameMin'));
      return false;
    }
    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError(t('memberMaster.invalidEmail'));
      return false;
    }
    if (formData.phone && formData.phone.length < 10) {
      setError(t('memberMaster.phoneMin'));
      return false;
    }
    if (formData.discount_percentage < 0 || formData.discount_percentage > 100) {
      setError(t('memberMaster.discountRange'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      const url = editingMember ? `/api/members/${editingMember.id}` : '/api/members';
      const method = editingMember ? 'PUT' : 'POST';
      const headers = { 'x-company-id': companyId };

      // For new members, use POST; for editing, use PUT
      const payload = {
        member_name: formData.member_name,
        member_address: formData.member_address,
        member_gst_no: formData.member_gst_no,
        phone: formData.phone,
        email: formData.email,
        discount_percentage: formData.discount_percentage
      };

      if (!editingMember) {
        payload.company_id = companyId;
      }

      const response = method === 'POST' 
        ? await axios.post(url, payload, { headers })
        : await axios.put(url, payload, { headers });

      if (response.data.success) {
        onSuccess();
        if (!editingMember) {
          setFormData({
            member_name: '',
            member_address: '',
            member_gst_no: '',
            phone: '',
            email: '',
            discount_percentage: 0,
            member_code: null
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-8">
      <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-2">
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">
          {editingMember ? t('memberMaster.editMember') : t('memberMaster.newMember')}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-black transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl flex items-center gap-3 shadow-sm border-l-4 bg-white border-red-600 text-red-900">
          <div className="font-bold uppercase text-xs tracking-widest leading-none">
            {error}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Member Code */}
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
            Member Code
          </label>
          <input
            type="text"
            value={formData.member_code || ''}
            disabled
            className="w-full px-4 py-3 border-2 border-slate-100 rounded-lg bg-slate-50 text-slate-400 font-bold cursor-not-allowed uppercase tracking-widest text-xs"
          />
          <p className="mt-2 text-[10px] font-bold text-slate-400 italic uppercase">
            {editingMember ? 'Locked ID' : 'Auto-Assignment Pending'}
          </p>
        </div>

        {/* Member Name */}
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
            {t('memberMaster.memberName')} *
          </label>
          <input
            type="text"
            name="member_name"
            value={formData.member_name}
            onChange={handleChange}
            placeholder="Enter full name"
            className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-lg focus:outline-none focus:border-black focus:bg-white transition-all font-bold"
          />
        </div>

        {/* Member Address */}
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
            Address
          </label>
          <textarea
            name="member_address"
            value={formData.member_address}
            onChange={handleChange}
            placeholder="Enter complete address"
            rows="3"
            className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-lg focus:outline-none focus:border-black focus:bg-white transition-all font-bold"
          />
        </div>

        {/* Member GST Number */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              GST Number
            </label>
            <input
              type="text"
              name="member_gst_no"
              value={formData.member_gst_no}
              onChange={handleChange}
              placeholder="e.g., 27AABCT1234F1Z5"
              className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-lg focus:outline-none focus:border-black focus:bg-white transition-all font-bold uppercase"
            />
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              {t('memberMaster.phone')}
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Primary Phone"
              className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-lg focus:outline-none focus:border-black focus:bg-white transition-all font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
              {t('memberMaster.email')}
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Contact Email"
              className="w-full px-4 py-3 border-2 border-slate-100 bg-slate-50 rounded-lg focus:outline-none focus:border-black focus:bg-white transition-all font-bold"
            />
          </div>
        </div>

        {/* Discount Percentage */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
          <label className="block text-xs font-black uppercase tracking-widest text-slate-900 mb-3">
            {t('memberMaster.discountPercentage')}
          </label>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="number"
                name="discount_percentage"
                value={formData.discount_percentage}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.01"
                className="w-full pl-6 pr-12 py-4 border-2 border-white rounded-xl focus:outline-none focus:border-black transition-all font-black text-2xl text-slate-900 shadow-inner"
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-2xl text-slate-300 pointer-events-none">%</span>
            </div>
          </div>
          <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase italic">Applied during sales transactions</p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black hover:bg-slate-800 disabled:bg-slate-400 text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            editingMember ? t('memberMaster.updateMember') : t('memberMaster.createMember')
          )}
        </button>
      </form>
    </div>
  );
}
