import express from 'express';
import * as db from '../db.js';

const router = express.Router();

// Get Profit & Loss Statement by Date Range
router.get('/', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const { startDate, endDate } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date required' });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const plStatement = await db.getProfitLossStatement(companyId, startDate, endDate);

    res.json({
      success: true,
      data: plStatement,
      message: `Profit & Loss statement for ${startDate} to ${endDate}`
    });
  } catch (error) {
    console.error('Error fetching P&L statement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Profit & Loss statement',
      message: error.message
    });
  }
});

// Get Monthly Profit & Loss for a specific year
router.get('/monthly/:year', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const { year } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }

    if (!year || isNaN(year)) {
      return res.status(400).json({ error: 'Valid year required' });
    }

    const monthlyData = await db.getMonthlyProfitLoss(companyId, parseInt(year));

    res.json({
      success: true,
      data: monthlyData,
      year: parseInt(year),
      message: `Monthly Profit & Loss for year ${year}`
    });
  } catch (error) {
    console.error('Error fetching monthly P&L:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly Profit & Loss',
      message: error.message
    });
  }
});

// Get P&L Summary (Current Month)
router.get('/summary/current', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }

    const summary = await db.getProfitLossSummary(companyId);

    res.json({
      success: true,
      data: summary,
      message: 'Current month Profit & Loss summary'
    });
  } catch (error) {
    console.error('Error fetching P&L summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch P&L summary',
      message: error.message
    });
  }
});

export default router;
