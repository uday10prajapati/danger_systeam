import express from 'express';
import {
  insertCashBookEntry,
  getCashBookEntries,
  getCashBalance,
  getDailyCashSummary,
  getOpeningBalance
} from '../db.js';

const router = express.Router();

// POST: Add manual cash entry (expense or adjustment)
router.post('/manual', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const userId = req.header('x-user-id');

    if (!companyId || !userId) {
      return res.status(400).json({ success: false, error: 'Company ID and User ID required' });
    }

    const { transaction_date, description, cash_in, cash_out, notes } = req.body;

    if (!transaction_date || !description) {
      return res.status(400).json({ success: false, error: 'Date and description required' });
    }

    if ((!cash_in || cash_in === 0) && (!cash_out || cash_out === 0)) {
      return res.status(400).json({ success: false, error: 'Either cash_in or cash_out must be provided' });
    }

    const result = await insertCashBookEntry(
      companyId,
      transaction_date,
      'expense',
      null,
      `EXP-${Date.now()}`,
      description,
      cash_in || 0,
      cash_out || 0,
      userId,
      notes || ''
    );

    return res.status(201).json({ success: true, data: { id: result.insertId, description } });
  } catch (error) {
    console.error('Add cash entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: List cash book entries
router.get('/', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    let { startDate, endDate } = req.query;

    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }
    if (!startDate) {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString().split('T')[0];
    }

    const entries = await getCashBookEntries(companyId, startDate, endDate);
    return res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Get cash book error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get current cash balance
router.get('/balance/current', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const balance = await getCashBalance(companyId);
    return res.json({ success: true, data: balance });
  } catch (error) {
    console.error('Get cash balance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get daily summary
router.get('/summary/daily', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    let { startDate, endDate } = req.query;

    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }
    if (!startDate) {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString().split('T')[0];
    }

    const summary = await getDailyCashSummary(companyId, startDate, endDate);
    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Get daily summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get opening balance for a specific date
router.get('/opening-balance/:date', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const openingBalance = await getOpeningBalance(companyId, req.params.date);
    return res.json({ success: true, data: { opening_balance: openingBalance } });
  } catch (error) {
    console.error('Get opening balance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
