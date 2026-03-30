import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * GET SABHASAD LEDGER SUMMARY
 * GET /api/sabhasad-ledger-summary
 * Query params: startDate, endDate, accountId (optional), memberId (optional)
 */
router.get('/', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }

    let { startDate, endDate, accountId, memberId, hideZeroBalance } = req.query;

    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }
    if (!startDate) {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString().split('T')[0];
    }

    // Prepare parameters and conditions
    const params = [companyId];
    let conditions = 'm.company_id = ? AND m.is_active = 1';

    if (accountId && accountId !== 'all') {
        // If they filter by a specific account ID (like Sabhasad Bachat Khatu)
        conditions += ' AND a.id = ?';
        params.push(accountId);
    }
    
    if (memberId && memberId !== 'all') {
        conditions += ' AND m.id = ?';
        params.push(memberId);
    }

    // Query to get all members along with their opening and current period balances
    const sql = `
      SELECT 
        m.id AS member_id,
        m.member_code,
        m.member_name,
        a.id AS account_id,
        a.account_name,
        a.opening_balance AS account_base_op_balance,
        
        -- Opening Balance Calculation (Up to startDate)
        (
          SELECT COALESCE(SUM(credit_amount), 0) - COALESCE(SUM(debit_amount), 0)
          FROM account_ledger
          WHERE account_id = m.account_id AND transaction_date < ?
        ) AS op_period_balance,

        -- Debits and Credits during the period
        (
          SELECT COALESCE(SUM(debit_amount), 0)
          FROM account_ledger
          WHERE account_id = m.account_id AND transaction_date BETWEEN ? AND ?
        ) AS period_debit,

        (
          SELECT COALESCE(SUM(credit_amount), 0)
          FROM account_ledger
          WHERE account_id = m.account_id AND transaction_date BETWEEN ? AND ?
        ) AS period_credit
        
      FROM member_master m
      INNER JOIN accounts a ON m.account_id = a.id
      WHERE ${conditions}
      ORDER BY m.member_name ASC
    `;

    // Add dates to params for the subqueries
    // The order of subquery parameters is: startDate, startDate, endDate, startDate, endDate
    const fullParams = [
      startDate, 
      startDate, endDate, 
      startDate, endDate,
      ...params
    ];

    // Rearrange because the WHERE conditions for the main query are at the end!
    // Wait, the subqueries are in the SELECT clause, so their parameters come FIRST.
    const queryParams = [
      startDate, 
      startDate, endDate, 
      startDate, endDate,
      ...params
    ];

    const results = await query(sql, queryParams);

    // Process the results to calculate final balances
    const reportData = results.map((row, index) => {
      // For Sabhasad accounts (which are usually liabilities), 
      // Credit increases balance, Debit decreases balance.
      // Base Opening Balance from account + Transactions before start date
      const openingBalance = parseFloat(row.account_base_op_balance || 0) + parseFloat(row.op_period_balance || 0);
      const debit = parseFloat(row.period_debit || 0);
      const credit = parseFloat(row.period_credit || 0);
      const closingBalance = openingBalance + credit - debit;

      return {
        sr_no: index + 1,
        member_code: row.member_code,
        member_name: row.member_name,
        account_name: row.account_name, // e.g., 'સભાસદ બચત ખાતું'
        opening_balance: openingBalance.toFixed(2),
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
        closing_balance: closingBalance.toFixed(2)
      };
    });

    // Filter out zero balance accounts if requested
    let finalData = reportData;
    if (hideZeroBalance === 'true') {
      finalData = reportData.filter(row => 
        parseFloat(row.opening_balance) !== 0 || 
        parseFloat(row.debit) !== 0 || 
        parseFloat(row.credit) !== 0 || 
        parseFloat(row.closing_balance) !== 0
      );
    }

    // Also calculate totals
    const totals = finalData.reduce((acc, row) => ({
      opening_balance: acc.opening_balance + parseFloat(row.opening_balance),
      debit: acc.debit + parseFloat(row.debit),
      credit: acc.credit + parseFloat(row.credit),
      closing_balance: acc.closing_balance + parseFloat(row.closing_balance),
    }), { opening_balance: 0, debit: 0, credit: 0, closing_balance: 0 });

    res.json({
      success: true,
      data: finalData,
      totals: {
        opening_balance: totals.opening_balance.toFixed(2),
        debit: totals.debit.toFixed(2),
        credit: totals.credit.toFixed(2),
        closing_balance: totals.closing_balance.toFixed(2),
      }
    });

  } catch (error) {
    console.error('Sabhasad ledger summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
