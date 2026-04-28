/**
 * GST Calculation Display Component
 * Shows GST breakdown: CGST, SGST, IGST with proper calculations
 * Used in Sale and Purchase forms
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function GSTCalculator({
  taxableAmount = 0,
  gstPercent = 0,
  isIntraState = true,
  onGSTChange = null,
  readOnly = false,
  showBreakup = true
}) {
  const [gstData, setGSTData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [allowedPercentages, setAllowedPercentages] = useState([0, 5, 12, 18, 28]);

  // Fetch allowed GST percentages on mount
  useEffect(() => {
    fetchAllowedPercentages();
  }, []);

  // Recalculate GST whenever inputs change
  useEffect(() => {
    if (taxableAmount !== undefined && taxableAmount !== null && gstPercent !== undefined) {
      calculateGST();
    }
  }, [taxableAmount, gstPercent, isIntraState]);

  const fetchAllowedPercentages = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/gst/percentages`);
      if (response.data.success) {
        setAllowedPercentages(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching GST percentages:', error);
    }
  };

  const calculateGST = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/gst/calculate`, {
        taxable_amount: Number(taxableAmount),
        gst_percent: Number(gstPercent),
        is_intra_state: isIntraState
      });

      if (response.data.success) {
        setGSTData(response.data.data);
        if (onGSTChange) {
          onGSTChange(response.data.data);
        }
      } else {
        setError(response.data.error || 'Failed to calculate GST');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error calculating GST');
      console.error('GST calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">💰 GST Calculation</h3>
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${isIntraState
          ? 'bg-blue-100 text-blue-800'
          : 'bg-orange-100 text-orange-800'
          }`}>
          {isIntraState ? '📍 Intra-State (CGST+SGST)' : '✈️ Inter-State (IGST)'}
        </span>
      </div>

      {/* Input Controls */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* GST Percentage Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            GST % Selection
          </label>
          <select
            value={gstPercent}
            onChange={(e) => onGSTChange && onGSTChange({ ...gstData, gst_percent: Number(e.target.value) })}
            disabled={readOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">-- Select GST % --</option>
            {allowedPercentages.map((pct) => (
              <option key={pct} value={pct}>
                {pct}% - {getGSTDescription(pct)}
              </option>
            ))}
          </select>
        </div>

        {/* Taxable Amount Display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Taxable Amount
          </label>
          <input
            type="text"
            value={Number(taxableAmount).toFixed(2)}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* GST Breakup Display */}
      {gstData && showBreakup && (
        <div className="space-y-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            {/* CGST Row */}
            {gstData.cgst_percent > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700 font-medium">
                  CGST ({gstData.cgst_percent}%)
                </span>
                <span className="text-gray-900 font-semibold">
                  ₹ {Number(gstData.cgst_amount).toFixed(2)}
                </span>
              </div>
            )}

            {/* SGST Row */}
            {gstData.sgst_percent > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700 font-medium">
                  SGST ({gstData.sgst_percent}%)
                </span>
                <span className="text-gray-900 font-semibold">
                  ₹ {Number(gstData.sgst_amount).toFixed(2)}
                </span>
              </div>
            )}

            {/* IGST Row */}
            {gstData.igst_percent > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700 font-medium">
                  IGST ({gstData.igst_percent}%)
                </span>
                <span className="text-gray-900 font-semibold">
                  ₹ {Number(gstData.igst_amount).toFixed(2)}
                </span>
              </div>
            )}

            {/* No Tax Row */}
            {gstData.gst_percent === 0 && (
              <div className="flex justify-between items-center py-2 text-gray-600 italic">
                <span>No GST (Exempt)</span>
                <span>₹ 0.00</span>
              </div>
            )}

            {/* Total Tax Row */}
            <div className="flex justify-between items-center py-3 pt-4 border-t-2 border-blue-300 mt-2">
              <span className="text-gray-800 font-bold">Total Tax</span>
              <span className="text-blue-700 font-bold text-lg">
                ₹ {Number(gstData.total_tax).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Final Amount Section */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-300">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 text-sm">Taxable Amount</span>
              <span className="text-gray-800 font-medium">
                ₹ {Number(gstData.taxable_amount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 text-sm">+ Total Tax</span>
              <span className="text-gray-800 font-medium">
                ₹ {Number(gstData.total_tax).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t-2 border-green-200">
              <span className="text-lg font-bold text-gray-900">Net Amount (Inc. Tax)</span>
              <span className="text-2xl font-bold text-green-700">
                ₹ {Number(gstData.net_amount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Success Indicator */}
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded">
            <CheckCircle size={16} />
            GST calculated successfully
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <p className="text-gray-600 text-sm mt-2">Calculating GST...</p>
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to get GST description
 */
function getGSTDescription(percent) {
  const descriptions = {
    0: 'Exempt Items',
    5: 'Essential Goods',
    12: 'Mid-range Goods',
    18: 'Premium Goods',
    28: 'Luxury Items'
  };
  return descriptions[percent] || 'Other';
}
