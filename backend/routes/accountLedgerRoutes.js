import express from 'express';
import {
  getAccountLedger,
  getAccountBalance,
  getAccountLedgerWithRunningBalance,
  getTrialBalance,
  getLedgerByDateRange,
  query
} from '../db.js';

const router = express.Router();

// GET: Account ledger with running balance
router.get('/account/:accountId', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    let { startDate, endDate } = req.query;

    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }
    if (!startDate) {
      const start = new Date();
      start.setDate(start.getDate() - 90);
      startDate = start.toISOString().split('T')[0];
    }

    const ledger = await getAccountLedgerWithRunningBalance(accountId, startDate, endDate);
    return res.json({ success: true, data: ledger });
  } catch (error) {
    console.error('Get account ledger error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Account balance
router.get('/balance/:accountId', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const balance = await getAccountBalance(accountId);
    return res.json({ success: true, data: balance });
  } catch (error) {
    console.error('Get account balance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Account stats (debit, credit, balance) by Date Range
router.get('/account-stats/:accountId', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const { startDate, endDate } = req.query;
    const companyId = req.header('x-company-id');

    let dateFilter = '';
    const params = [accountId, companyId];

    if (startDate && endDate) {
      dateFilter = ' AND DATE(transaction_date) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const result = await query(
      `SELECT 
         COALESCE(SUM(COALESCE(debit, debit_amount, 0)), 0) as total_debit,
         COALESCE(SUM(COALESCE(credit, credit_amount, 0)), 0) as total_credit
       FROM account_ledger 
       WHERE account_id = ? AND company_id = ? ${dateFilter}`,
      params
    );

    const debit = parseFloat(result[0].total_debit || 0);
    const credit = parseFloat(result[0].total_credit || 0);
    
    // Assume opening balance is Jama (Credit)
    const accQuery = await query('SELECT opening_balance FROM accounts WHERE id = ?', [accountId]);
    const openingBal = parseFloat(accQuery[0]?.opening_balance || 0);

    const totalCredit = credit + openingBal;

    res.json({
      success: true,
      data: {
        total_debit: debit,
        total_credit: totalCredit,
        balance: totalCredit - debit
      }
    });
  } catch (error) {
    console.error('Get account stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Member balance in specific account
router.get('/member-balance/:accountId/:memberId', async (req, res) => {
  try {
    const { accountId, memberId } = req.params;
    const companyId = req.header('x-company-id');
    
    const result = await query(
      `SELECT 
         COALESCE(SUM(COALESCE(debit, debit_amount, 0)), 0) as total_debit,
         COALESCE(SUM(COALESCE(credit, credit_amount, 0)), 0) as total_credit
       FROM account_ledger 
       WHERE account_id = ? AND (member_id = ? OR reference_id = ?) AND company_id = ?`,
      [accountId, memberId, memberId, companyId]
    );
    
    const totalDebit = parseFloat(result[0].total_debit || 0);
    const totalCredit = parseFloat(result[0].total_credit || 0);
    
    res.json({ 
      success: true, 
      balance: totalDebit - totalCredit,
      data: {
        total_debit: totalDebit,
        total_credit: totalCredit
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Ledger entries by date range
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

    const ledger = await getLedgerByDateRange(companyId, startDate, endDate);
    return res.json({ success: true, data: ledger });
  } catch (error) {
    console.error('Get ledger error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Trial balance
router.get('/trial-balance', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const { asOfDate } = req.query;
    const trialBalance = await getTrialBalance(companyId, asOfDate);
    
    // Calculate totals
    const totals = trialBalance.reduce(
      (sum, account) => ({
        total_debit: sum.total_debit + (parseFloat(account.total_debit) || 0),
        total_credit: sum.total_credit + (parseFloat(account.total_credit) || 0)
      }),
      { total_debit: 0, total_credit: 0 }
    );

    return res.json({ 
      success: true, 
      data: trialBalance,
      totals: {
        total_debit: totals.total_debit,
        total_credit: totals.total_credit,
        difference: Math.abs(totals.total_debit - totals.total_credit)
      }
    });
  } catch (error) {
    console.error('Get trial balance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Add manual ledger entry
router.post('/', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) return res.status(400).json({ success: false, error: 'Company ID required' });

    const {
      account_id, transaction_date, transaction_type, reference_type, 
      reference_id, reference_no, debit_amount, credit_amount, debit, credit, description, created_by
    } = req.body;

    // Use whichever field is provided (standardization)
    const final_debit = parseFloat(debit || debit_amount || 0);
    const final_credit = parseFloat(credit || credit_amount || 0);

    const result = await query(
      `INSERT INTO account_ledger 
      (company_id, account_id, transaction_date, transaction_type, reference_type, 
       reference_id, reference_no, debit, credit, debit_amount, credit_amount, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId, account_id, transaction_date, transaction_type || reference_type || null, 
        reference_type || null, reference_id || null, reference_no || null, 
        final_debit, final_credit, final_debit, final_credit, 
        description || null, created_by || null
      ]
    );

    res.json({ success: true, entryId: result.insertId });
  } catch (error) {
    console.error('Add ledger error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
