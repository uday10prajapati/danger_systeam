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

    let accountFilter = '';
    if (accountId && accountId !== 'all') {
        accountFilter = ' AND account_id = ?';
    }
    
    if (memberId && memberId !== 'all') {
        conditions += ' AND m.id = ?';
        params.push(memberId);
    }

    // Query to get all members and their specific ledger metrics
    const sql = `
      SELECT 
        m.id AS member_id,
        m.member_code,
        m.member_name,
        COALESCE(a.account_name, 'Subledger Member') as account_name,
        
        -- Opening Period Balance (Member specific entries before startDate)
        (
          SELECT COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0)
          FROM account_ledger
          WHERE member_id = m.id ${accountFilter} AND transaction_date < ?
        ) AS op_period_balance,

        -- Period Debit (Member specific)
        (
          SELECT COALESCE(SUM(debit), 0)
          FROM account_ledger
          WHERE member_id = m.id ${accountFilter} AND transaction_date BETWEEN ? AND ?
        ) AS period_debit,

        -- Period Credit (Member specific)
        (
          SELECT COALESCE(SUM(credit), 0)
          FROM account_ledger
          WHERE member_id = m.id ${accountFilter} AND transaction_date BETWEEN ? AND ?
        ) AS period_credit
        
      FROM member_master m
      LEFT JOIN accounts a ON m.account_id = a.id
      WHERE ${conditions}
      ORDER BY m.member_name ASC
    `;

    // Dynamic parameter building for subqueries
    let queryParams = [];
    
    // Each of the 3 subqueries needs accountId if provided, plus date params
    // op_period_balance
    if (accountFilter) queryParams.push(accountId);
    queryParams.push(startDate);

    // period_debit
    if (accountFilter) queryParams.push(accountId);
    queryParams.push(startDate, endDate);

    // period_credit
    if (accountFilter) queryParams.push(accountId);
    queryParams.push(startDate, endDate);

    // Main query WHERE conditions
    queryParams.push(...params);

    const results = await query(sql, queryParams);

    // Process the results
    const reportData = results.map((row, index) => {
      const openingBalance = parseFloat(row.op_period_balance || 0);
      const debit = parseFloat(row.period_debit || 0);
      const credit = parseFloat(row.period_credit || 0);
      const closingBalance = openingBalance + credit - debit;

      return {
        sr_no: index + 1,
        member_code: row.member_code,
        member_name: row.member_name,
        account_name: row.account_name,
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
