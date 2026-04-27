import express from 'express';
import {
  getAccountLedger,
  getAccountBalance,
  getAccountLedgerWithRunningBalance,
  getTrialBalance,
  getLedgerByDateRange,
  query,
  queryOne,
  execute
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
    const { startDate, endDate, memberId } = req.query;
    const companyId = req.header('x-company-id');

    let filter = ' WHERE company_id = ?';
    const params = [companyId];

    if (memberId) {
       // If memberId is provided, we want their GLOBAL balance across all accounts 
       // to show as "Jama" and "Udhar" in the Kapat Console
       filter += ' AND (member_id = ? OR reference_id = ?)';
       params.push(memberId, memberId);
    } else {
       // Standard account-only view
       filter += ' AND account_id = ?';
       params.push(accountId);
    }

    if (startDate && endDate) {
      filter += ' AND DATE(transaction_date) BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const result = await query(
      `SELECT 
         COALESCE(SUM(ABS(COALESCE(debit, debit_amount, 0))), 0) as total_debit,
         COALESCE(SUM(ABS(COALESCE(credit, credit_amount, 0))), 0) as total_credit
       FROM account_ledger 
       ${filter}`,
      params
    );

    const debit = parseFloat(result[0].total_debit || 0);
    const credit = parseFloat(result[0].total_credit || 0);
    
    // Normalize opening balance
    const accQuery = await query('SELECT opening_balance FROM accounts WHERE id = ?', [accountId]);
    const openingBal = parseFloat(accQuery[0]?.opening_balance || 0);

    // In this system: opening_balance < 0 is Credit (Jama), > 0 is Debit (Udhar)
    const openingCredit = openingBal < 0 ? Math.abs(openingBal) : 0;
    const openingDebit = openingBal > 0 ? openingBal : 0;

    const jamaTotal = credit + openingCredit;
    const udharTotal = debit + openingDebit;

    // --- Bardan Penalty Calculation ---
    let bardan_balance = 0;
    let bardan_penalty = 0;

    if (memberId) {
      try {
        const member = await queryOne('SELECT member_code, bardan_opening FROM member_master WHERE id = ?', [memberId]);
        if (member) {
          const code = member.member_code;
          const taken = await queryOne('SELECT SUM(qty) as total FROM bardan_entry WHERE code = ? AND company_id = ?', [code, companyId]);
          const returned = await queryOne('SELECT SUM(qty) as total FROM jama_bardan_entry WHERE code = ? AND company_id = ?', [code, companyId]);
          
          bardan_balance = parseFloat(member.bardan_opening || 0) + parseFloat(taken?.total || 0) - parseFloat(returned?.total || 0);
          
          if (bardan_balance > 0) {
            const priceData = await queryOne('SELECT price_per_bardan FROM bardan_price_master WHERE company_id = ?', [companyId]);
            const price = parseFloat(priceData?.price_per_bardan || 0);
            bardan_penalty = bardan_balance * price;
          }
        }
      } catch (err) {
        console.error('Bardan Penalty fetch failed:', err);
      }
    }

    const netTotalUdhar = udharTotal + Math.max(0, bardan_penalty);
    const finalBalance = jamaTotal - netTotalUdhar;

    res.json({
      success: true,
      data: {
        total_debit: udharTotal,
        total_credit: jamaTotal,
        bardan_balance: Math.max(0, bardan_balance),
        bardan_penalty: Math.max(0, bardan_penalty),
        net_debit: netTotalUdhar,
        balance: finalBalance
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
