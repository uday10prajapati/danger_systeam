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

    let { startDate, endDate, accountId, memberId, hideZeroBalance, village, bankName, season, itemId } = req.query;

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

    if (village) {
      conditions += ' AND m.village_name = ?';
      params.push(village);
    }

    if (bankName) {
      conditions += ' AND m.bank_name = ?';
      params.push(bankName);
    }

    // Special Season Filtering Logic
    let seasonMemberFilter = '';
    if (season) {
        // Find members who have entries in this season to narrow down the report
        seasonMemberFilter = ` AND m.id IN (SELECT DISTINCT member_id FROM dangar_entry WHERE season = ? OR book_type = ?)`;
        params.push(season, season);
    }
    conditions += seasonMemberFilter;

    // Query to get all members and their specific ledger metrics
    const sql = `
      SELECT 
        m.id AS member_id,
        m.member_code,
        m.member_name,
        m.village_name,
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
                  (SELECT COALESCE(SUM(qty), 0) FROM jama_bardan_entry WHERE member_id = m.id AND company_id = ? AND (option_type IS NULL OR option_type != 'Self')) -
                  (SELECT COALESCE(SUM(COALESCE(NULLIF(regexp_replace(description, '[^0-9]', '', 'g'), ''), '0')::INTEGER), 0) 
                   FROM account_ledger 
                   WHERE member_id = m.id AND reference_type = 'BardanPenalty' AND company_id = ?)
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
    queryParams.push(companyId, companyId, companyId, companyId, companyId, companyId);

    // last_activity_date
    if (accountFilter && !accountFilter.includes('IN')) queryParams.push(accountId);

    // Main query WHERE conditions
    queryParams.push(...params);

    let selectedAcc = null;
    if (accountId && accountId !== 'all') {
      const accs = await query("SELECT * FROM accounts WHERE id = ? AND company_id = ?", [accountId, companyId]);
      if (accs.length > 0) selectedAcc = accs[0];
    }

    const dangarAcc = await query("SELECT id FROM accounts WHERE (account_code = 'DS0001' OR account_name ILIKE '%DANGAR SYSTEM%' OR account_name ILIKE '%dangar%') AND company_id = ?", [companyId]);
    const isDangar = dangarAcc.some(a => String(a.id) === String(accountId));

    const purchaseAcc = await query(`SELECT id FROM accounts WHERE (account_name ILIKE '%PURCHES%' OR account_name ILIKE '%PURCHASE%' OR account_name ILIKE '%qrldi%' OR account_name ILIKE '%\u0a96\u0ab0\u0ac0\u0aa6\u0ac0%') AND company_id = ?`, [companyId]);
    const isPurchase = purchaseAcc.some(a => String(a.id) === String(accountId));

    const saleAcc = await query(`SELECT id FROM accounts WHERE (account_name ILIKE '%SALE%' OR account_name ILIKE '%veca%' OR account_name ILIKE '%\u0ab5\u0ac7\u0a9a\u0abe\u0aa3%') AND company_id = ?`, [companyId]);
    const isSale = saleAcc.some(a => String(a.id) === String(accountId));

    const bardanSysAcc = await query("SELECT id FROM accounts WHERE account_name ILIKE '%Bardan System%' AND company_id = ?", [companyId]);
    const isBardan = bardanSysAcc.some(a => String(a.id) === String(accountId));

    const isInterest = selectedAcc?.account_code === 'IK0001' || 
                       selectedAcc?.account_name?.toLowerCase().includes('interest khate') ||
                       selectedAcc?.account_name?.toLowerCase().includes('vyaj');

    if (accountId && isBardan) {
      let conditions = 'al.account_id = ? AND al.company_id = ?';
      const bParams = [accountId, companyId];

      if (village) {
        conditions += ' AND m.village_name = ?';
        bParams.push(village);
      }

      if (memberId && memberId !== 'all') {
        conditions += ' AND m.id = ?';
        bParams.push(memberId);
      }

      const bardanSql = `
        SELECT 
          m.id AS member_id,
          m.member_code,
          m.member_name,
          m.village_name,
          
          -- Opening Balance before startDate (including base member_master.bardan_opening)
          COALESCE(m.bardan_opening, 0) + COALESCE(
            (
              SELECT COALESCE(SUM(al2.debit), 0) - COALESCE(SUM(
                CASE 
                  WHEN al2.reference_type = 'BardanPenalty' THEN 
                    COALESCE(NULLIF(regexp_replace(al2.description, '[^0-9]', '', 'g'), ''), '0')::INTEGER
                  ELSE al2.credit
                END
              ), 0)
              FROM account_ledger al2
              WHERE al2.member_id = m.id AND al2.account_id = ? AND al2.company_id = ?
              AND al2.transaction_date < ?
            ), 0
          ) AS opening_balance,

          -- Period Debit
          (
            SELECT COALESCE(SUM(al2.debit), 0)
            FROM account_ledger al2
            WHERE al2.member_id = m.id AND al2.account_id = ? AND al2.company_id = ?
            AND al2.transaction_date BETWEEN ? AND ?
          ) AS debit,

          -- Period Regular Credit
          (
            SELECT COALESCE(SUM(
              CASE 
                WHEN al2.reference_type = 'BardanPenalty' THEN 
                  COALESCE(NULLIF(regexp_replace(al2.description, '[^0-9]', '', 'g'), ''), '0')::INTEGER
                ELSE al2.credit
              END
            ), 0)
            FROM account_ledger al2
            WHERE al2.member_id = m.id AND al2.account_id = ? AND al2.company_id = ?
            AND NOT (
              al2.reference_type = 'jama_bardan_entry' 
              AND (
                LOWER(COALESCE(al2.description, '')) LIKE '%[self]%' 
                OR EXISTS(SELECT 1 FROM jama_bardan_entry jbe WHERE jbe.id = al2.reference_id AND jbe.option_type = 'Self')
              )
            )
            AND al2.transaction_date BETWEEN ? AND ?
          ) AS regular_credit,

          -- Period Self Credit
          (
            SELECT COALESCE(SUM(al2.credit), 0)
            FROM account_ledger al2
            WHERE al2.member_id = m.id AND al2.account_id = ? AND al2.company_id = ?
            AND al2.reference_type = 'jama_bardan_entry' 
            AND (
              LOWER(COALESCE(al2.description, '')) LIKE '%[self]%' 
              OR EXISTS(SELECT 1 FROM jama_bardan_entry jbe WHERE jbe.id = al2.reference_id AND jbe.option_type = 'Self')
            )
            AND al2.transaction_date BETWEEN ? AND ?
          ) AS self_credit

        FROM member_master m
        INNER JOIN account_ledger al ON al.member_id = m.id
        WHERE ${conditions}
        GROUP BY m.id, m.member_code, m.member_name, m.village_name, m.bardan_opening
        ORDER BY m.member_name ASC
      `;

      // Build parameters for the subqueries
      const finalParams = [
        // Opening subquery
        accountId, companyId, startDate,
        // Debit subquery
        accountId, companyId, startDate, endDate,
        // Regular Credit subquery
        accountId, companyId, startDate, endDate,
        // Self Credit subquery
        accountId, companyId, startDate, endDate,
        // Main WHERE conditions
        ...bParams
      ];

      const bRows = await query(bardanSql, finalParams);

      const rowsWithBalances = bRows.map(row => {
        const op = parseFloat(row.opening_balance || 0);
        const deb = parseFloat(row.debit || 0);
        const cre = parseFloat(row.regular_credit || 0);
        const selfCre = parseFloat(row.self_credit || 0);
        const closing = op + deb - cre - selfCre;

        return {
          member_id: row.member_id,
          member_code: row.member_code,
          member_name: row.member_name,
          village_name: row.village_name,
          opening_balance: op,
          debit: deb,
          credit: cre,
          self_credit: selfCre,
          balance: closing,
          account_name: 'Bardan System'
        };
      });

      // Filter out members who have all zero values to keep the list clean, but if there's a specific member selected, keep it.
      const filteredRows = rowsWithBalances.filter(r => 
        (memberId && memberId !== 'all') || 
        Math.abs(r.opening_balance) > 0 || 
        Math.abs(r.debit) > 0 || 
        Math.abs(r.credit) > 0 || 
        Math.abs(r.self_credit) > 0
      );

      return res.json({
        success: true,
        isBardan: true,
        data: filteredRows,
        totals: {
          opening_balance: filteredRows.reduce((acc, r) => acc + r.opening_balance, 0),
          debit: filteredRows.reduce((acc, r) => acc + r.debit, 0),
          credit: filteredRows.reduce((acc, r) => acc + r.credit, 0),
          self_credit: filteredRows.reduce((acc, r) => acc + r.self_credit, 0),
          balance: filteredRows.reduce((acc, r) => acc + r.balance, 0)
        }
      });
    }


    if (accountId && isSale) {
      const saleSql = `
        SELECT 
          m.member_code,
          m.member_name,
          m.village_name,
          al.member_id,
          al.transaction_date as entry_date,
          al.description,
          al.reference_no,
          COALESCE(al.debit, al.debit_amount, 0) as debit,
          COALESCE(al.credit, al.credit_amount, 0) as credit,
          'Sale Account' as account_name,
          s.payment_type
        FROM account_ledger al
        LEFT JOIN sales s ON (('SALE-' || CAST(s.id AS TEXT)) = al.reference_no OR s.invoice_no = al.reference_no OR ((al.reference_type = 'SALE' OR al.reference_type = 'dangar_sale') AND al.reference_id = s.id))
        LEFT JOIN member_master m ON COALESCE(al.member_id, s.member_id) = m.id
        WHERE al.company_id = ? AND al.account_id = ?
        AND al.transaction_date BETWEEN ? AND ?
        ${memberId && memberId !== 'all' ? ' AND al.member_id = ?' : ''}
        ORDER BY al.transaction_date ASC, al.id ASC
      `;
      const sParams = [companyId, accountId, startDate, endDate];
      if (memberId && memberId !== 'all') sParams.push(memberId);

      const opSale = await query(`
        SELECT COALESCE(SUM(credit) - SUM(debit), 0) as op_bal
        FROM account_ledger
        WHERE company_id = ? AND account_id = ? AND transaction_date < ?
        ${memberId && memberId !== 'all' ? ' AND member_id = ?' : ''}
      `, [companyId, accountId, startDate, ...(memberId && memberId !== 'all' ? [memberId] : [])]);
      const initialSale = parseFloat(opSale[0].op_bal || 0);

      const sRows = await query(saleSql, sParams);
      
      let runningBalance = initialSale;
      const rowsWithBalance = sRows.map(row => {
        runningBalance += (parseFloat(row.credit) - parseFloat(row.debit));
        return { ...row, balance: runningBalance };
      });

      return res.json({
        success: true,
        isSale: true,
        data: rowsWithBalance,
        totals: {
          opening_balance: initialSale,
          debit: rowsWithBalance.reduce((acc, r) => acc + parseFloat(r.debit || 0), 0),
          credit: rowsWithBalance.reduce((acc, r) => acc + parseFloat(r.credit || 0), 0),
          balance: runningBalance
        }
      });
    }



    if (accountId && isPurchase) {
      const purchaseSql = `
        SELECT 
          m.member_code,
          m.member_name,
          m.village_name,
          al.member_id,
          al.transaction_date as entry_date,
          al.description,
          COALESCE(al.debit, al.debit_amount, 0) as debit,
          COALESCE(al.credit, al.credit_amount, 0) as credit,
          'Purchase Account' as account_name
        FROM account_ledger al
        LEFT JOIN dangar_entry de ON (al.reference_type = 'dangar_entry' AND al.reference_id = de.id)
        LEFT JOIN member_master m ON COALESCE(al.member_id, de.member_id) = m.id
        WHERE al.company_id = ? AND al.account_id = ?
        AND al.transaction_date BETWEEN ? AND ?
        ${memberId && memberId !== 'all' ? ' AND al.member_id = ?' : ''}
        ORDER BY al.transaction_date ASC, al.id ASC
      `;
      const pParams = [companyId, accountId, startDate, endDate];
      if (memberId && memberId !== 'all') pParams.push(memberId);

      const opPurchase = await query(`
        SELECT COALESCE(SUM(debit) - SUM(credit), 0) as op_bal
        FROM account_ledger
        WHERE company_id = ? AND account_id = ? AND transaction_date < ?
        ${memberId && memberId !== 'all' ? ' AND member_id = ?' : ''}
      `, [companyId, accountId, startDate, ...(memberId && memberId !== 'all' ? [memberId] : [])]);
      const initialPurchase = parseFloat(opPurchase[0].op_bal || 0);

      const pRows = await query(purchaseSql, pParams);
      
      // Calculate running balance
      let runningBalance = initialPurchase;
      const rowsWithBalance = pRows.map(row => {
        runningBalance += (parseFloat(row.debit) - parseFloat(row.credit));
        return { ...row, balance: runningBalance };
      });

      return res.json({
        success: true,
        isPurchase: true,
        data: rowsWithBalance,
        totals: {
          opening_balance: initialPurchase,
          debit: rowsWithBalance.reduce((acc, r) => acc + parseFloat(r.debit || 0), 0),
          credit: rowsWithBalance.reduce((acc, r) => acc + parseFloat(r.credit || 0), 0),
          balance: runningBalance
        }
      });
    }



    const isTransactional = !!accountId && accountId !== 'all';
    const isCashAccount = (selectedAcc?.account_name || '')?.toLowerCase().includes('cash account');

    if (isTransactional && !isSale && !isBardan) {
      const transactionalSql = `
        SELECT 
          m.member_code,
          m.member_name,
          m.village_name,
          al.member_id,
          al.transaction_date as entry_date,
          CASE 
            WHEN al.interest_account_id = ? THEN 'Interest Amount'
            WHEN (al.reference_type = 'SALE' OR al.reference_type = 'dangar_sale') THEN 'Dangar Sale'
            WHEN al.reference_type = 'bardan_entry' THEN 'BARDAN taken'
            WHEN al.reference_type = 'jama_bardan_entry' AND LOWER(al.description) LIKE '%settlement%' THEN 'Dangar Settlement'
            WHEN al.reference_type = 'jama_bardan_entry' THEN 'Bardan Settlement'
            WHEN al.reference_type = 'SALE_DEDUCTION' AND (LOWER(al.description) LIKE 'brokerage on%' OR LOWER(al.description) LIKE 'brokrej on%') THEN 'Brokerage on Bardan'
            WHEN al.reference_type = 'dangar_entry_fund' OR LOWER(al.description) LIKE 'godown fund%' THEN 'Dangar Godown Fund'
            WHEN al.reference_type = 'SALE_DEDUCTION' AND LOWER(al.description) LIKE 'labour on%' THEN 'Labour Charge'
            ELSE al.description 
          END as description,
          al.reference_no,
          al.reference_type,
          COALESCE(CASE 
            WHEN al.interest_account_id = ? THEN al.interest_amount 
            WHEN (${isDangar ? 'TRUE' : 'FALSE'} OR ${isBardan ? 'TRUE' : 'FALSE'}) AND al.account_id IS NULL AND (al.reference_type ILIKE '%dangar%' OR al.reference_type ILIKE '%bardan%') THEN al.credit
            ELSE al.debit 
          END, 0) as debit,
          COALESCE(CASE 
            WHEN al.interest_account_id = ? THEN 0 
            WHEN (${isDangar ? 'TRUE' : 'FALSE'} OR ${isBardan ? 'TRUE' : 'FALSE'}) AND al.account_id IS NULL AND (al.reference_type ILIKE '%dangar%' OR al.reference_type ILIKE '%bardan%') THEN al.debit
            ELSE al.credit 
          END, 0) as credit,
          COALESCE(a.account_name, CASE WHEN al.reference_type ILIKE '%dangar%' THEN 'Dangar System' WHEN al.reference_type ILIKE '%bardan%' THEN 'Bardan System' ELSE 'Cash Account' END) as account_name,
          al.interest_percent,
          al.interest_amount as raw_interest_amount,
          al.interest_account_id
        FROM account_ledger al
        LEFT JOIN dangar_entry de ON (al.reference_type = 'dangar_entry' AND al.reference_id = de.id)
        LEFT JOIN sales s ON ((al.reference_type = 'SALE' OR al.reference_type = 'dangar_sale') AND al.reference_id = s.id)
        LEFT JOIN member_master m ON COALESCE(al.member_id, de.member_id, s.member_id) = m.id
        LEFT JOIN accounts a ON al.account_id = a.id
        WHERE al.company_id = ? 
        AND (
          al.account_id = ? 
          OR (al.interest_account_id = ?)
          OR (${isCashAccount ? 'TRUE' : 'FALSE'} AND al.account_id IS NULL AND (al.transaction_type = 'cash_book' OR al.reference_type = 'cash_book'))
          OR (${isDangar ? 'TRUE' : 'FALSE'} AND al.account_id IS NULL AND (al.reference_type ILIKE '%dangar%'))
          OR (${isBardan ? 'TRUE' : 'FALSE'} AND al.account_id IS NULL AND (al.reference_type ILIKE '%bardan%'))
        )
        AND al.transaction_date BETWEEN ? AND ?
        ${memberId && memberId !== 'all' ? ' AND al.member_id = ?' : ''}
        ORDER BY al.transaction_date ASC, al.id ASC
      `;

      const opRes = await query(`
        SELECT COALESCE(
          SUM(CASE 
            WHEN interest_account_id = ? THEN interest_amount 
            WHEN (${isDangar ? 'TRUE' : 'FALSE'} OR ${isBardan ? 'TRUE' : 'FALSE'}) AND account_id IS NULL AND (reference_type ILIKE '%dangar%' OR reference_type ILIKE '%bardan%') THEN credit
            ELSE ${isCashAccount ? 'credit' : 'debit'} 
          END) - 
          SUM(CASE 
            WHEN interest_account_id = ? THEN 0 
            WHEN (${isDangar ? 'TRUE' : 'FALSE'} OR ${isBardan ? 'TRUE' : 'FALSE'}) AND account_id IS NULL AND (reference_type ILIKE '%dangar%' OR reference_type ILIKE '%bardan%') THEN debit
            ELSE ${isCashAccount ? 'debit' : 'credit'} 
          END), 
          0
        ) as op_bal
        FROM account_ledger
        WHERE company_id = ? 
        AND (
          account_id = ? 
          OR (interest_account_id = ?)
          OR (${isCashAccount ? 'TRUE' : 'FALSE'} AND account_id IS NULL AND (transaction_type = 'cash_book' OR reference_type = 'cash_book'))
          OR (${isDangar ? 'TRUE' : 'FALSE'} AND account_id IS NULL AND (reference_type ILIKE '%dangar%'))
          OR (${isBardan ? 'TRUE' : 'FALSE'} AND account_id IS NULL AND (reference_type ILIKE '%bardan%'))
        )
        AND transaction_date < ?
        ${memberId && memberId !== 'all' ? ' AND member_id = ?' : ''}
      `, [accountId, accountId, companyId, accountId, accountId, startDate, ...(memberId && memberId !== 'all' ? [memberId] : [])]);
      
      const initialBal = parseFloat(opRes[0].op_bal || 0);

      const tRows = await query(transactionalSql, [accountId, accountId, accountId, companyId, accountId, accountId, startDate, endDate, ...(memberId && memberId !== 'all' ? [memberId] : [])]);
      
      
      let runningBal = initialBal;
      const rowsWithBal = tRows.map(row => {
        if (isCashAccount) {
          // Cash Book Logic: Credit = In (+), Debit = Out (-)
          runningBal += (parseFloat(row.credit) - parseFloat(row.debit));
        } else {
          // Standard Ledger Logic: Debit (+) - Credit (-)
          runningBal += (parseFloat(row.debit) - parseFloat(row.credit));
        }
        return { ...row, balance: runningBal };
      });

      const totalDebit = rowsWithBal.reduce((acc, r) => acc + parseFloat(r.debit || 0), 0);
      const totalCredit = rowsWithBal.reduce((acc, r) => acc + parseFloat(r.credit || 0), 0);

      return res.json({
        success: true,
        isTransactional: true,
        data: rowsWithBal,
        totals: {
          opening_balance: initialBal,
          debit: totalDebit,
          credit: totalCredit,
          balance: runningBal,
          closing_balance: runningBal
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
          m.village_name,
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
          m.village_name,
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
        village_name: row.village_name,
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
