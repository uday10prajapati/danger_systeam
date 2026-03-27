/**
 * GST Routes
 * Provides APIs for GST calculations and master data
 */

import express from 'express';
import db, { query, queryOne } from '../db.js';
import {
  validateGSTPercent,
  getAllowedGSTPercentages,
  calculateIntraStateGST,
  calculateInterStateGST,
  calculateGST,
  calculateBulkGST,
  reverseGST
} from '../utils/gstCalculator.js';

const router = express.Router();

/**
 * GET /api/gst/percentages
 * Get all allowed GST percentages
 */
router.get('/percentages', (req, res) => {
  try {
    const percentages = getAllowedGSTPercentages();
    return res.json({
      success: true,
      data: percentages,
      count: percentages.length
    });
  } catch (error) {
    console.error('Get GST percentages error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/gst/master
 * Get GST master data from database
 */
router.get('/master', async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM gst_master 
      WHERE is_active = 1 
      ORDER BY gst_percent ASC
    `);

    return res.json({
      success: true,
      data: result || []
    });
  } catch (error) {
    console.error('Get GST master error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/gst/calculate-intra-state
 * Calculate GST for intra-state sale (CGST + SGST)
 * 
 * Body: { taxable_amount: number, gst_percent: number }
 */
router.post('/calculate-intra-state', (req, res) => {
  try {
    const { taxable_amount, gst_percent } = req.body;

    if (!taxable_amount && taxable_amount !== 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'taxable_amount is required' 
      });
    }

    if (gst_percent === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'gst_percent is required' 
      });
    }

    if (!validateGSTPercent(gst_percent)) {
      return res.status(400).json({
        success: false,
        error: `Invalid GST percentage: ${gst_percent}. Allowed: ${getAllowedGSTPercentages().join(', ')}`
      });
    }

    const result = calculateIntraStateGST(taxable_amount, gst_percent);

    return res.json({
      success: true,
      data: result,
      message: 'Intra-state GST calculated successfully'
    });
  } catch (error) {
    console.error('Calculate intra-state GST error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/gst/calculate-inter-state
 * Calculate GST for inter-state sale (IGST)
 * 
 * Body: { taxable_amount: number, gst_percent: number }
 */
router.post('/calculate-inter-state', (req, res) => {
  try {
    const { taxable_amount, gst_percent } = req.body;

    if (!taxable_amount && taxable_amount !== 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'taxable_amount is required' 
      });
    }

    if (gst_percent === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'gst_percent is required' 
      });
    }

    if (!validateGSTPercent(gst_percent)) {
      return res.status(400).json({
        success: false,
        error: `Invalid GST percentage: ${gst_percent}. Allowed: ${getAllowedGSTPercentages().join(', ')}`
      });
    }

    const result = calculateInterStateGST(taxable_amount, gst_percent);

    return res.json({
      success: true,
      data: result,
      message: 'Inter-state GST calculated successfully'
    });
  } catch (error) {
    console.error('Calculate inter-state GST error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/gst/calculate
 * Calculate GST based on state type
 * 
 * Body: { 
 *   taxable_amount: number, 
 *   gst_percent: number,
 *   is_intra_state: boolean (default: true)
 * }
 */
router.post('/calculate', (req, res) => {
  try {
    const { taxable_amount, gst_percent, is_intra_state } = req.body;

    if (!taxable_amount && taxable_amount !== 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'taxable_amount is required' 
      });
    }

    if (gst_percent === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'gst_percent is required' 
      });
    }

    if (!validateGSTPercent(gst_percent)) {
      return res.status(400).json({
        success: false,
        error: `Invalid GST percentage: ${gst_percent}. Allowed: ${getAllowedGSTPercentages().join(', ')}`
      });
    }

    const isIntraState = is_intra_state !== false; // default true
    const result = calculateGST(taxable_amount, gst_percent, isIntraState);

    return res.json({
      success: true,
      data: result,
      state_type: isIntraState ? 'intra-state (CGST+SGST)' : 'inter-state (IGST)',
      message: 'GST calculated successfully'
    });
  } catch (error) {
    console.error('Calculate GST error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/gst/calculate-bulk
 * Calculate GST for multiple items
 * 
 * Body: { 
 *   items: [
 *     { taxable_amount: number, gst_percent: number, is_intra_state?: boolean }
 *   ]
 * }
 */
router.post('/calculate-bulk', (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'items must be an array'
      });
    }

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items array cannot be empty'
      });
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.taxable_amount === undefined || item.taxable_amount === null) {
        return res.status(400).json({
          success: false,
          error: `Item ${i}: taxable_amount is required`
        });
      }
      if (item.gst_percent === undefined) {
        return res.status(400).json({
          success: false,
          error: `Item ${i}: gst_percent is required`
        });
      }
      if (!validateGSTPercent(item.gst_percent)) {
        return res.status(400).json({
          success: false,
          error: `Item ${i}: Invalid GST percentage ${item.gst_percent}`
        });
      }
    }

    const result = calculateBulkGST(items);

    return res.json({
      success: true,
      data: result,
      message: 'Bulk GST calculation completed'
    });
  } catch (error) {
    console.error('Calculate bulk GST error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/gst/validate-percent
 * Validate if a GST percentage is allowed
 * 
 * Body: { gst_percent: number }
 */
router.post('/validate-percent', (req, res) => {
  try {
    const { gst_percent } = req.body;

    if (gst_percent === undefined) {
      return res.status(400).json({
        success: false,
        error: 'gst_percent is required'
      });
    }

    const isValid = validateGSTPercent(gst_percent);
    const allowedPercentages = getAllowedGSTPercentages();

    return res.json({
      success: true,
      data: {
        gst_percent,
        is_valid: isValid,
        allowed_percentages: allowedPercentages
      },
      message: isValid ? 'Valid GST percentage' : 'Invalid GST percentage'
    });
  } catch (error) {
    console.error('Validate GST percent error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/gst/reverse
 * Reverse GST calculation (for returns)
 * 
 * Body: { gst_calculation_object }
 */
router.post('/reverse', (req, res) => {
  try {
    const gstData = req.body;

    if (!gstData || typeof gstData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid GST calculation object is required'
      });
    }

    const reversed = reverseGST(gstData);

    return res.json({
      success: true,
      data: reversed,
      message: 'GST reversed successfully (for returns)'
    });
  } catch (error) {
    console.error('Reverse GST error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
