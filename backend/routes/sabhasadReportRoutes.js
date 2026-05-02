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
      if (parseInt(accountId) === 1) { // Dangar System
        accountFilter = ' AND account_id IN (1, 11)';
      } else if (parseInt(accountId) === 4) { // Bardan System
        accountFilter = ' AND account_id IN (4, 12)'; // Including potential Bardan Penalty/Fund accounts
      } else {
        accountFilter = ' AND account_id = ?';
      }
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
        m.bardan_opening,
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
        ) AS period_credit,

        -- Bardan Balance (Total physical bags remaining)
        (
           SELECT COALESCE(m.bardan_opening, 0) + 
                  (SELECT COALESCE(SUM(qty), 0) FROM bardan_entry WHERE member_id = m.id AND company_id = ?) - 
                  (SELECT COALESCE(SUM(qty), 0) FROM jama_bardan_entry WHERE member_id = m.id AND company_id = ?)
        ) AS bardan_balance,

        -- Bardan Penalty Balance (Bags that still incur penalty - excludes Self returns)
        (
           SELECT COALESCE(m.bardan_opening, 0) + 
                  (SELECT COALESCE(SUM(qty), 0) FROM bardan_entry WHERE member_id = m.id AND company_id = ?) - 
                  (SELECT COALESCE(SUM(qty), 0) FROM jama_bardan_entry WHERE member_id = m.id AND company_id = ? AND (option_type IS NULL OR option_type != 'Self'))
        ) AS bardan_penalty_balance,

        -- Bardan Self Jama (Bags returned as Self)
        (
           SELECT COALESCE(SUM(qty), 0) FROM jama_bardan_entry WHERE member_id = m.id AND company_id = ? AND option_type = 'Self'
        ) AS bardan_self_jama,

        (
          SELECT MAX(transaction_date)
          FROM account_ledger
          WHERE member_id = m.id ${accountFilter}
        ) AS last_activity_date
        
      FROM member_master m
      LEFT JOIN accounts a ON m.account_id = a.id
      WHERE ${conditions}
      ORDER BY m.member_name ASC
    `;

    // Dynamic parameter building for subqueries
    let queryParams = [];

    // Each of the 3 subqueries needs accountId if provided, plus date params
    // op_period_balance
    if (accountFilter && !accountFilter.includes('IN')) queryParams.push(accountId);
    queryParams.push(startDate);

    // period_debit
    if (accountFilter && !accountFilter.includes('IN')) queryParams.push(accountId);
    queryParams.push(startDate, endDate);

    // period_credit
    if (accountFilter && !accountFilter.includes('IN')) queryParams.push(accountId);
    queryParams.push(startDate, endDate);

    // bardan_balance & bardan_penalty_balance & bardan_self_jama
    queryParams.push(companyId, companyId, companyId, companyId, companyId);

    // last_activity_date
    if (accountFilter && !accountFilter.includes('IN')) queryParams.push(accountId);

    // Main query WHERE conditions
    queryParams.push(...params);

    // Special Handling: If Dangar System (DS0001) is selected, provide detailed entry rows instead of summaries
    const dangarAcc = await query('SELECT id FROM accounts WHERE account_code = \'DS0001\' AND company_id = ?', [companyId]);
    const dangarSystemId = dangarAcc[0]?.id;

    if (accountId && parseInt(accountId) === dangarSystemId) {
      const dangarSql = `
        SELECT 
          m.member_code,
          m.member_name,
          de.entry_date,
          GROUP_CONCAT(DISTINCT de.book_type SEPARATOR ', ') as book_type,
          GROUP_CONCAT(DISTINCT de.quality_class SEPARATOR ', ') as quality_class,
          MAX(de.rate) as rate, -- Show the primary rate
          SUM(de.net_quintal) as net_quintal,
          SUM(de.amount) as amount,
          GROUP_CONCAT(DISTINCT im.item_name SEPARATOR ', ') as item_name,
          'Dangar System' as account_name
        FROM dangar_entry de
        JOIN member_master m ON de.member_id = m.id
        LEFT JOIN item_master im ON de.item_id = im.id
        WHERE de.company_id = ? AND de.entry_date BETWEEN ? AND ?
        ${memberId && memberId !== 'all' ? ' AND de.member_id = ?' : ''}
        GROUP BY de.member_id, de.entry_date, m.member_code, m.member_name, m.id
        ORDER BY de.entry_date DESC, m.member_name ASC
      `;
      const dangarParams = [companyId, startDate, endDate];
      if (memberId && memberId !== 'all') dangarParams.push(memberId);

      const dRows = await query(dangarSql, dangarParams);
      return res.json({
        success: true,
        data: dRows,
        totals: dRows.reduce((acc, r) => ({
          amount: acc.amount + parseFloat(r.amount || 0),
          qty: acc.qty + parseFloat(r.net_quintal || 0)
        }), { amount: 0, qty: 0 })
      });
    }

    // Special Handling: If Interest Khate (IK0001) is selected
    const interestAcc = await query('SELECT id FROM accounts WHERE account_code = \'IK0001\' AND company_id = ?', [companyId]);
    const interestSystemId = interestAcc[0]?.id;

    if (accountId && parseInt(accountId) === interestSystemId) {
      const interestSql = `
        SELECT 
          m.member_code,
          m.member_name,
          al.transaction_date,
          al.interest_percent,
          al.interest_amount,
          al.description,
          CAST(? AS DATE) - (SELECT MIN(transaction_date) FROM account_ledger WHERE member_id = al.member_id AND (debit > 0 OR debit_amount > 0) AND company_id = ?) as days
        FROM account_ledger al
        JOIN member_master m ON al.member_id = m.id
        WHERE al.company_id = ? AND (al.account_id = ? OR al.interest_account_id = ?)
        AND DATE(al.transaction_date) BETWEEN ? AND ?
        ${memberId && memberId !== 'all' ? ' AND al.member_id = ?' : ''}
        ORDER BY al.transaction_date DESC
      `;
      const iParams = [endDate, companyId, companyId, interestSystemId, interestSystemId, startDate, endDate];
      if (memberId && memberId !== 'all') iParams.push(memberId);

      const iRows = await query(interestSql, iParams);
      return res.json({
        success: true,
        data: iRows,
        totals: {
          interest_amount: iRows.reduce((acc, r) => acc + parseFloat(r.interest_amount || 0), 0)
        }
      });
    }

    const targetAccount = (accountId && accountId !== 'all')
      ? (await query('SELECT account_name, account_code FROM accounts WHERE id = ? AND company_id = ?', [accountId, companyId]))[0]
      : null;
    const isBrokerage = targetAccount?.account_name?.toLowerCase().includes('brokerage');
    const isLabour = targetAccount?.account_name?.toLowerCase().includes('labour');

    if (accountId && isBrokerage) {
      const brokerageSql = `
        SELECT 
          COALESCE(m.member_code, 'SYSTEM') as member_code,
          COALESCE(m.member_name, 'GENERAL COLLECTION') as member_name,
          al.transaction_date as entry_date,
          al.reference_no as invoice_no,
          al.description,
          COALESCE(al.debit, al.debit_amount, 0) as amount,
          'Brokerage Khate' as account_name
        FROM account_ledger al
        LEFT JOIN member_master m ON al.member_id = m.id
        WHERE al.company_id = ? AND al.account_id = ?
        AND DATE(al.transaction_date) BETWEEN ? AND ?
        ${memberId && memberId !== 'all' ? ' AND al.member_id = ?' : ''}
        ORDER BY al.transaction_date DESC
      `;
      const bParams = [companyId, accountId, startDate, endDate];
      if (memberId && memberId !== 'all') bParams.push(memberId);

      const bRows = await query(brokerageSql, bParams);
      return res.json({
        success: true,
        data: bRows,
        totals: {
          amount: bRows.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0)
        }
      });
    }

    if (accountId && isLabour) {
      const labourSql = `
        SELECT 
          COALESCE(m.member_code, 'SYSTEM') as member_code,
          COALESCE(m.member_name, 'GENERAL LABOUR') as member_name,
          al.transaction_date as entry_date,
          al.reference_no as invoice_no,
          al.description,
          COALESCE(al.debit, al.debit_amount, 0) as amount,
          'Labour Khate' as account_name
        FROM account_ledger al
        LEFT JOIN member_master m ON al.member_id = m.id
        WHERE al.company_id = ? AND al.account_id = ?
        AND DATE(al.transaction_date) BETWEEN ? AND ?
        ${memberId && memberId !== 'all' ? ' AND al.member_id = ?' : ''}
        ORDER BY al.transaction_date DESC
      `;
      const lParams = [companyId, accountId, startDate, endDate];
      if (memberId && memberId !== 'all') lParams.push(memberId);

      const lRows = await query(labourSql, lParams);
      return res.json({
        success: true,
        data: lRows,
        totals: {
          amount: lRows.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0)
        }
      });
    }

    const results = await query(sql, queryParams);

    // Process the results
    const reportData = results.map((row, index) => {
      const openingBalance = parseFloat(row.op_period_balance || 0);
      const debit = parseFloat(row.period_debit || 0);
      const credit = parseFloat(row.period_credit || 0);
      const closingBalance = openingBalance + credit - debit;

      return {
        sr_no: index + 1,
        member_id: row.member_id,
        member_code: row.member_code,
        member_name: row.member_name,
        account_name: row.account_name,
        last_activity_date: row.last_activity_date,
        opening_balance: openingBalance.toFixed(2),
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
        closing_balance: closingBalance.toFixed(2),
        bardan_balance: row.bardan_balance || 0,
        bardan_penalty_balance: row.bardan_penalty_balance || 0,
        bardan_self_jama: row.bardan_self_jama || 0
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
