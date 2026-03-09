import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Plus, AlertCircle, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import MemberForm from '../components/MemberForm';

export default function MemberMaster() {
  const { t } = useTranslation();
  const [company, setCompany] = useState(null);
  const [members, setMembers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // Load company
  useEffect(() => {
    loadCompany();
  }, []);

  // Load members when company or filter changes
  useEffect(() => {
    if (company) {
      loadMembers();
    }
  }, [company, statusFilter]);

  const loadCompany = async () => {
    try {
      const response = await axios.get('/api/company');
      if (response.data.success && response.data.data) {
        setCompany(response.data.data);
      } else {
        setMessage({ type: 'error', text: t('memberMaster.noCompanyFound') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('memberMaster.failedToLoadCompany') });
    }
  };

  const loadMembers = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all'
        ? `/api/members/company/${company.id}`
        : `/api/members/company/${company.id}?active=${statusFilter === 'active'}`;

      const response = await axios.get(url);
      if (response.data.success) {
        setMembers(response.data.data || []);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || t('memberMaster.failedToLoadMembers') });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
  };

  const handleCreateSuccess = () => {
    setShowForm(false);
    setEditingMember(null);
    loadMembers();
    setMessage({ type: 'success', text: t('memberMaster.memberSaved') });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setShowForm(true);
  };

  const handleDeactivate = async (memberId) => {
    if (!window.confirm(t('memberMaster.confirmDeactivate'))) return;

    try {
      await axios.post(`/api/members/${memberId}/deactivate`);
      setMessage({ type: 'success', text: t('memberMaster.memberDeactivated') });
      loadMembers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || t('memberMaster.failedToDeactivate') });
    }
  };

  const handleActivate = async (memberId) => {
    try {
      await axios.post(`/api/members/${memberId}/activate`);
      setMessage({ type: 'success', text: t('memberMaster.memberActivated') });
      loadMembers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || t('memberMaster.failedToActivate') });
    }
  };

  // If no company, show error
  if (!company) {
    return (
      <div className="min-h-screen bg-linear-to-br from-white via-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">{t('memberMaster.error')}</p>
              <p className="text-red-700">{t('memberMaster.noCompanyFound')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-white via-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">👥</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">{t('memberMaster.title')}</h1>
          </div>
          <p className="text-slate-600">{company.name}</p>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            {message.text}
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-slate-600">{t('memberMaster.totalMembers')}</p>
            <p className="text-xl font-bold text-purple-600">{members.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-slate-600">{t('memberMaster.activeMembers')}</p>
            <p className="text-xl font-bold text-green-600">{members.filter(m => m.is_active).length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-slate-600">{t('memberMaster.inactiveMembers')}</p>
            <p className="text-xl font-bold text-red-600">{members.filter(m => !m.is_active).length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-slate-600">{t('memberMaster.avgDiscount')}</p>
            <p className="text-xl font-bold text-indigo-600">
              {members.length > 0 
                ? (members.reduce((sum, m) => sum + m.discount_percentage, 0) / members.length).toFixed(2)
                : 0}%
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          {showForm && (
            <div className="lg:col-span-1">
              <MemberForm
                companyId={company.id}
                onSuccess={handleCreateSuccess}
                editingMember={editingMember}
                onClose={() => {
                  setShowForm(false);
                  setEditingMember(null);
                }}
              />
            </div>
          )}

          {/* Members List Section */}
          <div className={`${showForm ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {/* Filter Buttons */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                onClick={() => handleStatusChange('all')}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'
                }`}
              >
                {t('memberMaster.allStatus')}
              </button>
              <button
                onClick={() => handleStatusChange('active')}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  statusFilter === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-green-600 border border-green-200 hover:bg-green-50'
                }`}
              >
                {t('memberMaster.activeOnly')}
              </button>
              <button
                onClick={() => handleStatusChange('inactive')}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  statusFilter === 'inactive'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                }`}
              >
                {t('memberMaster.inactiveOnly')}
              </button>
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  setEditingMember(null);
                }}
                className="ml-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                {t('memberMaster.addNew')}
              </button>
            </div>

            {/* Members Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loading ? (
                <div className="p-6 text-center text-slate-500">Loading members...</div>
              ) : members.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-slate-500 mb-3">{t('memberMaster.noMembers')}</p>
                  <button
                    onClick={() => {
                      setShowForm(true);
                      setEditingMember(null);
                    }}
                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    {t('memberMaster.createFirst')}
                  </button>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700">{t('memberMaster.memberName')}</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700">{t('memberMaster.account')}</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700">{t('memberMaster.phone')}</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700">{t('memberMaster.discount')}</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700">{t('memberMaster.loyaltyPoints')}</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700">{t('memberMaster.status')}</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700">{t('memberMaster.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{member.member_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            {member.account_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{member.phone || '-'}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">{(parseFloat(member.discount_percentage) || 0).toFixed(2)}%</td>
                        <td className="px-6 py-4 text-sm font-semibold text-indigo-600">{member.loyalty_points}</td>
                        <td className="px-6 py-4 text-sm">
                          {member.is_active ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span>{t('memberMaster.active')}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-red-600">
                              <XCircle className="w-4 h-4" />
                              <span>{t('memberMaster.inactive')}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm flex gap-2">
                          <button
                            onClick={() => handleEdit(member)}
                            className="p-2 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                            title={t('memberMaster.edit')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {member.is_active ? (
                            <button
                              onClick={() => handleDeactivate(member.id)}
                              className="p-2 hover:bg-red-100 rounded text-red-600 transition-colors"
                              title={t('memberMaster.deactivate')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(member.id)}
                              className="p-2 hover:bg-green-100 rounded text-green-600 transition-colors"
                              title={t('memberMaster.activate')}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <div className="text-blue-600">💡</div>
          <div>
            <p className="text-sm font-semibold text-blue-900">{t('memberMaster.tip')}</p>
            <p className="text-sm text-blue-700">
              Members are customers linked to accounts. They earn loyalty points with each purchase and receive their assigned discount.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
