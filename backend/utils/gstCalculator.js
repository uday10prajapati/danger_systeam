/**
 * GST Calculation Utility
 * Handles all GST calculations: CGST/SGST for intra-state, IGST for inter-state
 */

// Allowed GST percentages
const ALLOWED_GST_PERCENTAGES = [0, 5, 12, 18, 28];

/**
 * Validate if GST percentage is allowed
 * @param {number} gstPercent - GST percentage to validate
 * @returns {boolean} true if valid
 */
export function validateGSTPercent(gstPercent) {
  return ALLOWED_GST_PERCENTAGES.includes(Number(gstPercent));
}

/**
 * Get all allowed GST percentages
 * @returns {number[]} array of allowed GST percentages
 */
export function getAllowedGSTPercentages() {
  return ALLOWED_GST_PERCENTAGES;
}

/**
 * Calculate GST for intra-state sale (CGST + SGST)
 * CGST = GST% / 2
 * SGST = GST% / 2
 * 
 * @param {number} taxableAmount - Amount before GST
 * @param {number} gstPercent - GST percentage (5, 12, 18, 28)
 * @returns {object} Object with CGST and SGST details
 */
export function calculateIntraStateGST(taxableAmount, gstPercent) {
  if (!validateGSTPercent(gstPercent)) {
    throw new Error(`Invalid GST percentage: ${gstPercent}. Allowed: ${ALLOWED_GST_PERCENTAGES.join(', ')}`);
  }

  const taxable = Number(taxableAmount) || 0;
  const gstPct = Number(gstPercent) || 0;

  // CGST and SGST are half of GST each
  const cgstPercent = gstPct / 2;
  const sgstPercent = gstPct / 2;

  // Calculate amounts
  const cgstAmount = (taxable * cgstPercent) / 100;
  const sgstAmount = (taxable * sgstPercent) / 100;
  const totalTax = cgstAmount + sgstAmount;
  const netAmount = taxable + totalTax;

  return {
    taxable_amount: Number(taxable.toFixed(2)),
    gst_percent: gstPct,
    cgst_percent: Number(cgstPercent.toFixed(2)),
    sgst_percent: Number(sgstPercent.toFixed(2)),
    igst_percent: 0,
    cgst_amount: Number(cgstAmount.toFixed(2)),
    sgst_amount: Number(sgstAmount.toFixed(2)),
    igst_amount: 0,
    total_tax: Number(totalTax.toFixed(2)),
    net_amount: Number(netAmount.toFixed(2)),
    is_intra_state: true
  };
}

/**
 * Calculate GST for inter-state sale (IGST)
 * IGST = GST%
 * 
 * @param {number} taxableAmount - Amount before GST
 * @param {number} gstPercent - GST percentage (5, 12, 18, 28)
 * @returns {object} Object with IGST details
 */
export function calculateInterStateGST(taxableAmount, gstPercent) {
  if (!validateGSTPercent(gstPercent)) {
    throw new Error(`Invalid GST percentage: ${gstPercent}. Allowed: ${ALLOWED_GST_PERCENTAGES.join(', ')}`);
  }

  const taxable = Number(taxableAmount) || 0;
  const gstPct = Number(gstPercent) || 0;

  // IGST is full GST percentage
  const igstPercent = gstPct;
  const igstAmount = (taxable * igstPercent) / 100;
  const totalTax = igstAmount;
  const netAmount = taxable + totalTax;

  return {
    taxable_amount: Number(taxable.toFixed(2)),
    gst_percent: gstPct,
    cgst_percent: 0,
    sgst_percent: 0,
    igst_percent: Number(igstPercent.toFixed(2)),
    cgst_amount: 0,
    sgst_amount: 0,
    igst_amount: Number(igstAmount.toFixed(2)),
    total_tax: Number(totalTax.toFixed(2)),
    net_amount: Number(netAmount.toFixed(2)),
    is_intra_state: false
  };
}

/**
 * Calculate GST based on state type
 * @param {number} taxableAmount - Amount before GST
 * @param {number} gstPercent - GST percentage
 * @param {boolean} isIntraState - true for CGST+SGST, false for IGST
 * @returns {object} Complete GST calculation result
 */
export function calculateGST(taxableAmount, gstPercent, isIntraState = true) {
  if (isIntraState) {
    return calculateIntraStateGST(taxableAmount, gstPercent);
  } else {
    return calculateInterStateGST(taxableAmount, gstPercent);
  }
}

/**
 * Calculate GST for multiple items (array of line items)
 * @param {array} items - Array of { taxable_amount, gst_percent, is_intra_state? }
 * @returns {object} Aggregated GST calculation
 */
export function calculateBulkGST(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      total_taxable_amount: 0,
      total_cgst_amount: 0,
      total_sgst_amount: 0,
      total_igst_amount: 0,
      total_tax: 0,
      net_amount: 0,
      items: []
    };
  }

  let totalTaxable = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  let totalTax = 0;
  let netAmount = 0;

  const calculatedItems = items.map(item => {
    const isIntraState = item.is_intra_state !== false; // default true
    const gstCalc = calculateGST(item.taxable_amount, item.gst_percent, isIntraState);

    totalTaxable += gstCalc.taxable_amount;
    totalCGST += gstCalc.cgst_amount;
    totalSGST += gstCalc.sgst_amount;
    totalIGST += gstCalc.igst_amount;
    totalTax += gstCalc.total_tax;
    netAmount += gstCalc.net_amount;

    return gstCalc;
  });

  return {
    total_taxable_amount: Number(totalTaxable.toFixed(2)),
    total_cgst_amount: Number(totalCGST.toFixed(2)),
    total_sgst_amount: Number(totalSGST.toFixed(2)),
    total_igst_amount: Number(totalIGST.toFixed(2)),
    total_tax: Number(totalTax.toFixed(2)),
    net_amount: Number(netAmount.toFixed(2)),
    items: calculatedItems
  };
}

/**
 * Reverse GST calculation (for returns)
 * Used when processing sales return or purchase return
 * 
 * @param {object} originalGST - Original GST calculation object
 * @returns {object} Reversed GST amounts
 */
export function reverseGST(originalGST) {
  return {
    taxable_amount: -Number(originalGST.taxable_amount),
    gst_percent: originalGST.gst_percent,
    cgst_percent: originalGST.cgst_percent,
    sgst_percent: originalGST.sgst_percent,
    igst_percent: originalGST.igst_percent,
    cgst_amount: -Number(originalGST.cgst_amount),
    sgst_amount: -Number(originalGST.sgst_amount),
    igst_amount: -Number(originalGST.igst_amount),
    total_tax: -Number(originalGST.total_tax),
    net_amount: -Number(originalGST.net_amount),
    is_intra_state: originalGST.is_intra_state
  };
}

/**
 * Example calculation helper
 * @param {number} amount - Taxable amount
 * @param {number} gstPercent - GST percentage
 * @returns {object} Example calculation result
 */
export function getExampleCalculation(amount = 1000, gstPercent = 18) {
  return {
    intraState: calculateIntraStateGST(amount, gstPercent),
    interState: calculateInterStateGST(amount, gstPercent)
  };
}

// Export all as default
export default {
  validateGSTPercent,
  getAllowedGSTPercentages,
  calculateIntraStateGST,
  calculateInterStateGST,
  calculateGST,
  calculateBulkGST,
  reverseGST,
  getExampleCalculation
};
