/**
 * GST Calculation Utility for Frontend
 * Client-side GST calculations matching backend logic
 */

// Allowed GST percentages
export const ALLOWED_GST_PERCENTAGES = [0, 5, 12, 18, 28];

/**
 * Calculate intra-state GST (CGST + SGST)
 * @param {number} taxableAmount 
 * @param {number} gstPercent 
 * @returns {object}
 */
export function calculateIntraStateGST(taxableAmount, gstPercent) {
  const taxable = Number(taxableAmount) || 0;
  const gstPct = Number(gstPercent) || 0;

  const cgstPercent = gstPct / 2;
  const sgstPercent = gstPct / 2;

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
 * Calculate inter-state GST (IGST)
 * @param {number} taxableAmount 
 * @param {number} gstPercent 
 * @returns {object}
 */
export function calculateInterStateGST(taxableAmount, gstPercent) {
  const taxable = Number(taxableAmount) || 0;
  const gstPct = Number(gstPercent) || 0;

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
 * @param {number} taxableAmount 
 * @param {number} gstPercent 
 * @param {boolean} isIntraState 
 * @returns {object}
 */
export function calculateGST(taxableAmount, gstPercent, isIntraState = true) {
  if (isIntraState) {
    return calculateIntraStateGST(taxableAmount, gstPercent);
  } else {
    return calculateInterStateGST(taxableAmount, gstPercent);
  }
}

/**
 * Calculate GST for multiple items
 * @param {array} items - Array of {taxable_amount, gst_percent, is_intra_state?}
 * @returns {object}
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

  const calculatedItems = items.map(item => {
    const isIntraState = item.is_intra_state !== false;
    const gstCalc = calculateGST(item.taxable_amount, item.gst_percent, isIntraState);

    totalTaxable += gstCalc.taxable_amount;
    totalCGST += gstCalc.cgst_amount;
    totalSGST += gstCalc.sgst_amount;
    totalIGST += gstCalc.igst_amount;
    totalTax += gstCalc.total_tax;

    return gstCalc;
  });

  const netAmount = totalTaxable + totalTax;

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
 * Get description for GST percentage
 * @param {number} percent 
 * @returns {string}
 */
export function getGSTDescription(percent) {
  const descriptions = {
    0: 'Exempt Items',
    5: 'Essential Goods',
    12: 'Mid-range Goods',
    18: 'Premium Goods',
    28: 'Luxury Items'
  };
  return descriptions[percent] || 'Other';
}

export default {
  ALLOWED_GST_PERCENTAGES,
  calculateIntraStateGST,
  calculateInterStateGST,
  calculateGST,
  calculateBulkGST,
  getGSTDescription
};
