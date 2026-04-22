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
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header - Monochrome Style */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">{t('memberMaster.title')}</h1>
            <p className="text-slate-500 font-medium">{company.name}</p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingMember(null);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-slate-800 font-bold shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            {t('memberMaster.addNew')}
          </button>
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

        {/* Statistics Cards - Sleek Grayscale */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-slate-900">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{t('memberMaster.totalMembers')}</p>
            <p className="text-3xl font-black text-slate-900">{members.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-slate-500">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{t('memberMaster.activeMembers')}</p>
            <p className="text-3xl font-black text-slate-900">{members.filter(m => m.is_active).length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-slate-400">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{t('memberMaster.inactiveMembers')}</p>
            <p className="text-3xl font-black text-slate-700">{members.filter(m => !m.is_active).length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-slate-300">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{t('memberMaster.avgDiscount')}</p>
            <p className="text-3xl font-black text-slate-900">
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
            {/* Toolbar - Monochrome Tabs */}
            <div className="bg-white p-4 rounded-xl shadow-md border border-slate-100 flex justify-start gap-3 mb-6">
              <button
                onClick={() => handleStatusChange('all')}
                className={`px-6 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t('memberMaster.allStatus')}
              </button>
              <button
                onClick={() => handleStatusChange('active')}
                className={`px-6 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                  statusFilter === 'active'
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t('memberMaster.activeOnly')}
              </button>
              <button
                onClick={() => handleStatusChange('inactive')}
                className={`px-6 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                  statusFilter === 'inactive'
                    ? 'bg-slate-900 text-white shadow-lg'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t('memberMaster.inactiveOnly')}
              </button>
            </div>

            {/* Members Table - High Contrast Monochrome */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Loading members...</p>
                </div>
              ) : members.length === 0 ? (
                <div className="p-12 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-6">{t('memberMaster.noMembers')}</p>
                  <button
                    onClick={() => {
                      setShowForm(true);
                      setEditingMember(null);
                    }}
                    className="bg-black text-white px-6 py-3 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all"
                  >
                    {t('memberMaster.createFirst')}
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-900 text-white text-left">
                      <tr>
                        <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">{t('memberMaster.memberName')}</th>
                        <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">Member Code</th>
                        <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">{t('memberMaster.phone')}</th>
                        <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">{t('memberMaster.discount')}</th>
                        <th className="px-6 py-4 font-black uppercase tracking-wider text-xs">{t('memberMaster.status')}</th>
                        <th className="px-6 py-4 font-black uppercase tracking-wider text-xs text-right">{t('memberMaster.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-black text-slate-900 tracking-tight text-sm">{member.member_name}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                              {member.member_code}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-medium">{member.phone || '-'}</td>
                          <td className="px-6 py-4 text-sm font-black text-slate-900 italic underline decoration-slate-200 underline-offset-4">{(parseFloat(member.discount_percentage) || 0).toFixed(2)}%</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${
                              member.is_active
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-400 border-slate-200 line-through'
                            }`}>
                              {member.is_active ? t('memberMaster.active') : t('memberMaster.inactive')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEdit(member)}
                                className="p-2 text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-300 rounded-lg transition-all"
                                title={t('memberMaster.edit')}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {member.is_active ? (
                                <button
                                  onClick={() => handleDeactivate(member.id)}
                                  className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 hover:border-zinc-200 border border-transparent rounded-lg transition-all"
                                  title={t('memberMaster.deactivate')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivate(member.id)}
                                  className="p-2 text-zinc-900 hover:bg-zinc-900 hover:text-white border border-transparent rounded-lg transition-all"
                                  title={t('memberMaster.activate')}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tip Section - Monochrome Style */}
        <div className="bg-white p-6 rounded-xl border-l-4 border-slate-900 shadow-md">
          <div className="flex gap-4 items-start">
            <div className="bg-slate-900 text-white p-2 rounded-lg">💡</div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-900 mb-1">{t('memberMaster.tip')}</p>
              <p className="text-sm text-slate-600 font-medium">
                Members are customers linked to accounts. They receive their assigned discount during billing transactions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
