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
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  
  const [formData, setFormData] = useState({
    account_id: '',
    member_name: '',
    phone: '',
    email: '',
    discount_percentage: 0,
    member_code: null
  });

  // Load customer accounts when component mounts
  useEffect(() => {
    loadCustomerAccounts();
  }, [companyId]);

  // Populate form when editing
  useEffect(() => {
    if (editingMember) {
      setFormData({
        account_id: editingMember.account_id,
        member_name: editingMember.member_name,
        phone: editingMember.phone || '',
        email: editingMember.email || '',
        discount_percentage: editingMember.discount_percentage || 0,
        member_code: editingMember.member_code
      });
    }
  }, [editingMember]);

  const loadCustomerAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const response = await axios.get(`/api/accounts/company/${companyId}?type=customer`);
      if (response.data.success) {
        setAccounts(response.data.data || []);
      }
    } catch (err) {
      setError('Failed to load customer accounts');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'discount_percentage' ? parseFloat(value) || 0 : value
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.account_id) {
      setError(t('memberMaster.selectAccount'));
      return false;
    }
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
      const headers = !editingMember ? { 'x-company-id': companyId } : {};

      // For new members, use POST; for editing, use PUT
      const payload = {
        account_id: formData.account_id,
        member_name: formData.member_name,
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
            account_id: '',
            member_name: '',
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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          {editingMember ? t('memberMaster.editMember') : t('memberMaster.newMember')}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Member Code (Read-only for new, display for editing) */}
        {editingMember && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Member Code
            </label>
            <input
              type="text"
              value={formData.member_code || ''}
              disabled
              className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 font-semibold cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">Auto-generated, not editable</p>
          </div>
        )}

        {/* Account Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('memberMaster.account')} <span className="text-red-500">*</span>
          </label>
          {loadingAccounts ? (
            <div className="text-slate-500">Loading accounts...</div>
          ) : (
            <select
              name="account_id"
              value={formData.account_id}
              onChange={handleChange}
              disabled={editingMember} // Prevent account change on edit
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
            >
              <option value="">Select a customer account</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.account_name} ({account.id})
                </option>
              ))}
            </select>
          )}
          {accounts.length === 0 && !loadingAccounts && (
            <p className="text-sm text-amber-600 mt-1">
              {t('memberMaster.noCustomerAccounts')}
            </p>
          )}
        </div>

        {/* Member Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('memberMaster.memberName')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="member_name"
            value={formData.member_name}
            onChange={handleChange}
            placeholder="Enter member name"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Member Address */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Member Address
          </label>
          <textarea
            name="member_address"
            value={formData.member_address}
            onChange={handleChange}
            placeholder="Enter complete address"
            rows="3"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Member GST Number */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            GST Number
          </label>
          <input
            type="text"
            name="member_gst_no"
            value={formData.member_gst_no}
            onChange={handleChange}
            placeholder="Enter GST number (e.g., 27AABCT1234F1Z5)"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-500 mt-1">Format: 2 digits state + 10 alphanumeric</p>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('memberMaster.phone')}
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter phone number"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('memberMaster.email')}
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Discount Percentage */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('memberMaster.discountPercentage')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="discount_percentage"
              value={formData.discount_percentage}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.01"
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-slate-500 text-sm">%</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Applied during sales transactions</p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 rounded-lg transition-colors"
        >
          {loading ? 'Saving...' : editingMember ? t('memberMaster.updateMember') : t('memberMaster.createMember')}
        </button>
      </form>
    </div>
  );
}
