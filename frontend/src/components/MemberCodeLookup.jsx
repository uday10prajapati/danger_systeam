import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, AlertCircle, CheckCircle } from 'lucide-react';

export default function MemberCodeLookup({ companyId, onMemberSelect, initialCode = '' }) {
  const [memberCode, setMemberCode] = useState(initialCode);
  const [memberData, setMemberData] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  // Fetch suggestions as user types
  useEffect(() => {
    if (memberCode.trim().length > 0) {
      searchMembers();
    } else {
      setSuggestions([]);
      setMemberData(null);
    }
  }, [memberCode]);

  const searchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/members/search-code`, {
        params: {
          code: memberCode,
          limit: 5
        },
        headers: { 'x-company-id': companyId }
      });

      if (response.data.success) {
        setSuggestions(response.data.data || []);
        setShowSuggestions(true);
      }
    } catch (err) {
      setError('Failed to search members');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const selectMember = async (code) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`/api/members/by-code/${code}`, {
        headers: { 'x-company-id': companyId }
      });

      if (response.data.success) {
        const member = response.data.data;
        setMemberData(member);
        setMemberCode(code);
        setSuggestions([]);
        setShowSuggestions(false);
        
        // Notify parent component
        if (onMemberSelect) {
          onMemberSelect(member);
        }
      } else {
        setError(response.data.error || 'Member not found');
      }
    } catch (err) {
      setError('Member not found or inactive');
      setMemberData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && memberCode.trim()) {
      e.preventDefault();
      selectMember(memberCode);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleCodeChange = (e) => {
    setMemberCode(e.target.value);
    setMemberData(null);
  };

  return (
    <div className="space-y-3">
      {/* Member Code Input */}
      <div className="relative">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Member Code <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={memberCode}
            onChange={handleCodeChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setSuggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Enter member code or press Enter"
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {loading && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin">⏳</div>
            </div>
          )}
          {memberData && !loading && (
            <CheckCircle className="absolute right-3 top-3 w-4 h-4 text-green-600" />
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg">
            {suggestions.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => selectMember(member.member_code)}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-slate-200 last:border-b-0 focus:outline-none"
              >
                <div className="font-semibold text-slate-900">
                  Code: {member.member_code}
                </div>
                <div className="text-sm text-slate-600">
                  {member.member_name}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute z-10 w-full mt-1 bg-red-50 border border-red-300 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Member Details Display */}
      {memberData && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-green-700 font-semibold">
            <CheckCircle className="w-5 h-5" />
            Member Found
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {/* Member Name */}
            <div>
              <div className="font-medium text-slate-700">Name</div>
              <div className="text-slate-900">{memberData.member_name}</div>
            </div>

            {/* Member Code */}
            <div>
              <div className="font-medium text-slate-700">Code</div>
              <div className="text-slate-900 font-semibold">{memberData.member_code}</div>
            </div>

            {/* Address */}
            {memberData.member_address && (
              <div className="col-span-2">
                <div className="font-medium text-slate-700">Address</div>
                <div className="text-slate-600 whitespace-pre-wrap text-xs">
                  {memberData.member_address}
                </div>
              </div>
            )}

            {/* GST Number */}
            {memberData.member_gst_no && (
              <div>
                <div className="font-medium text-slate-700">GST No.</div>
                <div className="text-slate-900 font-mono text-sm">{memberData.member_gst_no}</div>
              </div>
            )}

            {/* Discount */}
            {memberData.discount_percentage > 0 && (
              <div>
                <div className="font-medium text-slate-700">Discount</div>
                <div className="text-slate-900">{memberData.discount_percentage}%</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Member Selected */}
      {!memberData && memberCode && !loading && !error && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
          <div className="text-sm text-amber-800">
            Press <span className="font-semibold">Enter</span> to search for code "{memberCode}"
          </div>
        </div>
      )}
    </div>
  );
}
