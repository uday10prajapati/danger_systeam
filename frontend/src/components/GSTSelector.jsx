import React, { useState, useEffect, useCallback } from 'react';

/**
 * GST Selector & Calculator
 * Allows selecting GST percentage and viewing breakdown (CGST/SGST/IGST)
 * Shows final amount with tax included
 * 
 * BUG FIX: 
 * - Memoized calculateGST with useCallback to prevent stale closures
 * - Simplified useEffect to trigger on amount/gstPercent/isIntraState changes
 * - Taxable Amount ALWAYS calculated from: amount * (gstPercent / 100)
 * - Real-time recalculation on price, quantity, or GST % changes
 */
export default function GSTSelector({
  amount = 0,
  onGSTChange = null,
  showBreakdown = true,
  isIntraState = true
}) {
  const [gstPercent, setGstPercent] = useState(18);
  const [gstData, setGstData] = useState({
    taxable_amount: 0,
    cgst_percent: 0,
    sgst_percent: 0,
    igst_percent: 0,
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: 0,
    total_tax: 0,
    final_amount: 0
  });

  // Available GST percentages
  const gstOptions = [
    { value: 0, label: '0% - Exempt Items' },
    { value: 5, label: '5% - Essential Goods' },
    { value: 12, label: '12% - Mid-range Goods' },
    { value: 18, label: '18% - Premium Goods' },
    { value: 28, label: '28% - Luxury Items' }
  ];

  // Memoize calculateGST to prevent stale closures
  const calculateGST = useCallback(() => {
    // ALWAYS use current amount and gstPercent from latest props/state
    const taxable = Number(amount) || 0;
    const gst = Number(gstPercent) || 0;

    // DEBUG: Log to verify calculation is happening with current values
    console.log('[GSTSelector] Calculating GST:', { taxable, gstPercent: gst, isIntraState });

    if (isIntraState) {
      // CGST + SGST (split 50-50)
      const cgstPct = gst / 2;
      const sgstPct = gst / 2;
      const cgstAmt = (taxable * cgstPct) / 100;
      const sgstAmt = (taxable * sgstPct) / 100;
      const totalTax = cgstAmt + sgstAmt;

      const calculated = {
        taxable_amount: taxable,
        cgst_percent: cgstPct,
        sgst_percent: sgstPct,
        igst_percent: 0,
        cgst_amount: cgstAmt,
        sgst_amount: sgstAmt,
        igst_amount: 0,
        total_tax: totalTax,
        final_amount: taxable + totalTax
      };

      setGstData(calculated);
      if (onGSTChange) onGSTChange(calculated);
    } else {
      // IGST (full amount)
      const igstAmt = (taxable * gst) / 100;

      const calculated = {
        taxable_amount: taxable,
        cgst_percent: 0,
        sgst_percent: 0,
        igst_percent: gst,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: igstAmt,
        total_tax: igstAmt,
        final_amount: taxable + igstAmt
      };

      setGstData(calculated);
      if (onGSTChange) onGSTChange(calculated);
    }
  }, [amount, gstPercent, isIntraState]);

  // Recalculate whenever amount, gstPercent, or isIntraState changes
  // This ensures taxable amount updates IMMEDIATELY when price/quantity changes
  useEffect(() => {
    calculateGST();
  }, [calculateGST]);

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {isIntraState ? '📍 GST Calculator (Intra-State)' : '✈️ GST Calculator (Inter-State)'}
        </h3>
      </div>

      {/* GST Percentage Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select GST Percentage
        </label>
        <select
          value={gstPercent}
          onChange={(e) => setGstPercent(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {gstOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Amount Display */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-xs text-gray-600">Taxable Amount</p>
          <p className="text-lg font-bold text-gray-800">₹ {Number(gstData.taxable_amount).toFixed(2)}</p>
        </div>

        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <p className="text-xs text-gray-600">Total Tax</p>
          <p className="text-lg font-bold text-yellow-600">₹ {Number(gstData.total_tax).toFixed(2)}</p>
        </div>

        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <p className="text-xs text-gray-600">Final Amount</p>
          <p className="text-lg font-bold text-green-600">₹ {Number(gstData.final_amount).toFixed(2)}</p>
        </div>
      </div>

      {/* GST Breakdown */}
      {showBreakdown && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm font-semibold text-gray-700 mb-3">GST Breakdown:</p>

          {isIntraState ? (
            <div className="space-y-2">
              {/* CGST */}
              {gstData.cgst_percent > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">CGST ({gstData.cgst_percent}%)</span>
                  <span className="font-semibold text-gray-800">₹ {Number(gstData.cgst_amount).toFixed(2)}</span>
                </div>
              )}

              {/* SGST */}
              {gstData.sgst_percent > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">SGST ({gstData.sgst_percent}%)</span>
                  <span className="font-semibold text-gray-800">₹ {Number(gstData.sgst_amount).toFixed(2)}</span>
                </div>
              )}

              {/* Zero Tax */}
              {gstData.cgst_percent === 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">No Tax (0%)</span>
                  <span className="font-semibold text-gray-800">₹ 0.00</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* IGST */}
              {gstData.igst_percent > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">IGST ({gstData.igst_percent}%)</span>
                  <span className="font-semibold text-gray-800">₹ {Number(gstData.igst_amount).toFixed(2)}</span>
                </div>
              )}

              {/* Zero Tax */}
              {gstData.igst_percent === 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">No Tax (0%)</span>
                  <span className="font-semibold text-gray-800">₹ 0.00</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-gray-600">Taxable Amount:</div>
          <div className="font-semibold text-right">₹ {Number(gstData.taxable_amount).toFixed(2)}</div>

          <div className="text-gray-600">+ Tax ({gstPercent}%):</div>
          <div className="font-semibold text-right text-yellow-600">₹ {Number(gstData.total_tax).toFixed(2)}</div>

          <div className="text-lg font-bold text-gray-800 pt-2">Final Amount:</div>
          <div className="text-lg font-bold text-right text-green-600 pt-2">₹ {Number(gstData.final_amount).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
