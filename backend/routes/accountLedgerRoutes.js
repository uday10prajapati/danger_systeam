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

// GET: Global balances for members in specific accounts (Smart Fill Auto Mode)
router.get('/global-balances', async (req, res) => {
  try {
    const { accountIds, endDate } = req.query;
    const companyId = req.header('x-company-id');
    
    if (!accountIds) {
      return res.status(400).json({ success: false, error: 'accountIds query parameter is required' });
    }
    
    const ids = accountIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    if (ids.length === 0) return res.json({ success: true, data: [] });

    let sql = `
      SELECT member_id, 
        SUM(COALESCE(debit, debit_amount, 0)) as total_debit,
        SUM(COALESCE(credit, credit_amount, 0)) as total_credit
      FROM account_ledger
      WHERE company_id = ? AND account_id IN (${ids.map(() => '?').join(',')})
      AND member_id IS NOT NULL
    `;
    const params = [companyId, ...ids];
    
    if (endDate) {
      sql += ' AND DATE(transaction_date) <= ?';
      params.push(endDate);
    }
    
    sql += ' GROUP BY member_id';
    
    const rows = await query(sql, params);
    
    const result = rows.map(row => ({
      member_id: row.member_id,
      balance: parseFloat(row.total_credit || 0) - parseFloat(row.total_debit || 0)
    })).filter(r => Math.abs(r.balance) > 0.01);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Global balances error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Active Interest Calculations
router.get('/interest-calculations', async (req, res) => {
  try {
    const { date, asOfDate } = req.query;
    const companyId = req.header('x-company-id');
    const targetDate = (date || asOfDate) ? new Date(date || asOfDate) : new Date();

    // Fetch all entries from account_ledger for Member Adv Ac (L0001) OR manual member entries OR interest-bearing rows
    const rows = await query(`
      SELECT 
        al.id, al.transaction_date, al.reference_no, al.description,
        al.debit, al.credit, al.interest_percent,
        m.member_name, m.member_code, al.member_id,
        (COALESCE(al.debit, 0) - COALESCE(al.credit, 0)) as principal
      FROM account_ledger al
      LEFT JOIN member_master m ON al.member_id = m.id
      LEFT JOIN accounts a ON al.account_id = a.id
      WHERE al.company_id = ? 
        AND al.member_id IS NOT NULL
        AND (LOWER(a.account_code) = 'l0001' OR al.account_id IS NULL OR al.interest_percent > 0)
      HAVING principal > 0
      ORDER BY al.transaction_date ASC
    `, [companyId]);

    const rawResults = rows.map(row => {
       const trDate = new Date(row.transaction_date);
       const timeDiff = targetDate.getTime() - trDate.getTime();
       const elapsedDays = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));
       const elapsedMonths = elapsedDays / 30.0;
       
       const principal = parseFloat(row.principal || 0);
       const rate = parseFloat(row.interest_percent || 0);
       const calculatedInterest = principal * (rate / 100) * elapsedMonths;

       return {
          ...row,
          elapsedDays,
          calculatedInterest
       };
    });

    // Group by member_id
    const grouped = {};
    rawResults.forEach(r => {
       if (!grouped[r.member_id]) {
          grouped[r.member_id] = {
             member_id: r.member_id,
             member_name: r.member_name,
             member_code: r.member_code,
             principal: 0,
             debit: 0,
             credit: 0,
             calculated_interest: 0,
             entry_count: 0,
             transaction_date: r.transaction_date, // Use earliest date
             description: 'Multiple Consolidated Nodes',
             reference_no: 'GROUPED',
             interest_percent: r.interest_percent, // Show first rate found
             entries: []
          };
       }
       grouped[r.member_id].principal += parseFloat(r.principal || 0);
       grouped[r.member_id].debit += parseFloat(r.debit || 0);
       grouped[r.member_id].credit += parseFloat(r.credit || 0);
       grouped[r.member_id].calculated_interest += r.calculatedInterest;
       grouped[r.member_id].entry_count += 1;
       grouped[r.member_id].entries.push(r);
       if (new Date(r.transaction_date) < new Date(grouped[r.member_id].transaction_date)) {
          grouped[r.member_id].transaction_date = r.transaction_date;
       }
    });

    const finalData = Object.values(grouped).map(g => ({
       ...g,
       calculated_interest: g.calculated_interest.toFixed(2)
    }));

    res.json({ success: true, data: finalData });
  } catch (error) {
    console.error('Interest calculations error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Account ledger with running balance
router.get('/account/:accountId', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    let { startDate, endDate, memberId } = req.query;

    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }
    if (!startDate) {
      const start = new Date();
      start.setDate(start.getDate() - 90);
      startDate = start.toISOString().split('T')[0];
    }

    const ledger = await getAccountLedgerWithRunningBalance(accountId, startDate, endDate, memberId);
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

    if (memberId && accountId && accountId !== 'all') {
       // Filter by both specific account and specific member
       filter += ' AND account_id = ? AND (member_id = ? OR reference_id = ?)';
       params.push(accountId, memberId, memberId);
    } else if (memberId) {
       // If only memberId is provided, show their GLOBAL balance (original behavior for top stats)
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

    // --- Comprehensive Totals Calculation ---
    let total_interest = 0;
    let dangar_amount = 0;
    let dangar_quintal = 0;
    let bardan_balance = 0;
    let bardan_penalty = 0;

    // Determine which members to audit (either one or all in this account)
    let memberIds = [];
    if (memberId) {
       memberIds = [memberId];
    } else {
       // Get all members who have transactions in this account
       const activeMembers = await query('SELECT DISTINCT member_id FROM account_ledger WHERE account_id = ? AND company_id = ? AND member_id IS NOT NULL', [accountId, companyId]);
       memberIds = activeMembers.map(m => m.member_id);
    }

    if (memberIds.length > 0) {
        const interestData = await queryOne(`
          SELECT SUM(COALESCE(interest_amount, 0)) as total 
          FROM account_ledger 
          WHERE (account_id = ? OR interest_account_id = ?) AND company_id = ?
        `, [accountId, accountId, companyId]);
        total_interest = parseFloat(interestData?.total || 0);

       // 2. Dangar Calculation
       let dQuery = 'SELECT SUM(amount) as amt, SUM(net_quintal) as qty FROM dangar_entry WHERE member_id IN (' + memberIds.map(() => '?').join(',') + ') AND company_id = ?';
       let dParams = [...memberIds, companyId];
       if (startDate && endDate) {
         dQuery += ' AND DATE(entry_date) BETWEEN ? AND ?';
         dParams.push(startDate, endDate);
       }
       const dResult = await queryOne(dQuery, dParams);
       dangar_amount = parseFloat(dResult?.amt || 0);
       dangar_quintal = parseFloat(dResult?.qty || 0);

       // 3. Bardan Penalty (only if specific member is selected for performance)
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
                bardan_penalty = bardan_balance * parseFloat(priceData?.price_per_bardan || 0);
              }
            }
          } catch (err) { console.error('Bardan fetch failed', err); }
       }
    }

    const netTotalJama = jamaTotal + dangar_amount;
    const netTotalUdhar = udharTotal + total_interest; // Removed bardan_penalty from global ledger view to prevent slow queries
    const finalBalance = netTotalJama - netTotalUdhar;

    res.json({
      success: true,
      data: {
        total_debit: udharTotal,
        total_credit: netTotalJama,
        balance: finalBalance,
        bardan_balance: Math.max(0, bardan_balance),
        bardan_penalty: Math.max(0, bardan_penalty),
        dangar_amount: Math.max(0, dangar_amount),
        dangar_quintal: Math.max(0, dangar_quintal),
        net_debit: netTotalUdhar,
        total_interest: total_interest
      }
    });
  } catch (error) {
    console.error('Get account stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Member-wise breakdown of a specific account (Deep Audit Mode)
router.get('/breakdown/:accountId', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const companyId = req.header('x-company-id');
    const { startDate, endDate } = req.query;

    const company = await queryOne('SELECT company_account_no FROM company WHERE id = ?', [companyId]);
    const priceData = await queryOne('SELECT price_per_bardan FROM bardan_price_master WHERE company_id = ?', [companyId]);
    const bardanPrice = parseFloat(priceData?.price_per_bardan || 0);

    // 1. Get all members with activity in this account or basic details
    // We use COALESCE for member_id and account_id to support interest-account mappings (IK0001)
    const membersWithActivity = await query(`
      SELECT 
        COALESCE(CASE WHEN al.interest_account_id = ? THEN al.interest_member_id ELSE al.member_id END, al.member_id) as member_id,
        m.member_code,
        m.member_name,
        m.bardan_opening,
        SUM(CASE WHEN al.interest_account_id = ? THEN 0 ELSE COALESCE(al.debit, al.debit_amount, 0) END) as ledger_debit,
        SUM(CASE WHEN al.interest_account_id = ? THEN COALESCE(al.interest_amount, 0) ELSE COALESCE(al.credit, al.credit_amount, 0) END) as ledger_credit
      FROM account_ledger al
      JOIN member_master m ON m.id = COALESCE(CASE WHEN al.interest_account_id = ? THEN al.interest_member_id ELSE al.member_id END, al.member_id)
      WHERE al.company_id = ? AND (al.account_id = ? OR al.interest_account_id = ?)
      ${startDate && endDate ? 'AND DATE(al.transaction_date) BETWEEN ? AND ?' : ''}
      GROUP BY member_id
    `, startDate && endDate 
       ? [accountId, accountId, accountId, accountId, companyId, accountId, accountId, startDate, endDate] 
       : [accountId, accountId, accountId, accountId, companyId, accountId, accountId]);

    const result = [];

    for (const m of membersWithActivity) {
      const mid = m.member_id;
      const code = m.member_code;

      // 2. Dangar stats for this member
      let dangarQuery = 'SELECT SUM(amount) as amount, SUM(net_quintal) as qty FROM dangar_entry WHERE member_id = ? AND company_id = ?';
      let dangarParams = [mid, companyId];
      if (startDate && endDate) {
        dangarQuery += ' AND DATE(entry_date) BETWEEN ? AND ?';
        dangarParams.push(startDate, endDate);
      }
      const dangar = await queryOne(dangarQuery, dangarParams);

      // 3. Bardan stats
      const taken = await queryOne('SELECT SUM(qty) as total FROM bardan_entry WHERE code = ? AND company_id = ?', [code, companyId]);
      const returned = await queryOne('SELECT SUM(qty) as total FROM jama_bardan_entry WHERE code = ? AND company_id = ?', [code, companyId]);
      const bBal = parseFloat(m.bardan_opening || 0) + parseFloat(taken?.total || 0) - parseFloat(returned?.total || 0);
      const bPenalty = bBal > 0 ? bBal * bardanPrice : 0;

      // 4. Interest calculation for this member
      let interestTotal = 0;
      const interestEntries = await query(`
        SELECT debit, credit, transaction_date, interest_percent 
        FROM account_ledger 
        WHERE (member_id = ? OR reference_id = ?) AND interest_percent > 0 AND company_id = ?
      `, [mid, mid, companyId]);

      for (const entry of interestEntries) {
        const bal = parseFloat(entry.debit || 0) - parseFloat(entry.credit || 0);
        if (Math.abs(bal) < 0.01) continue;
        const start = new Date(entry.transaction_date);
        const end = endDate ? new Date(endDate) : new Date();
        const days = Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
        interestTotal += (Math.abs(bal) * (parseFloat(entry.interest_percent) / 100) * days);
      }

      const lDebit = parseFloat(m.ledger_debit || 0);
      const lCredit = parseFloat(m.ledger_credit || 0);
      const dAmount = parseFloat(dangar?.amount || 0);
      
      // Net Position Logic: (Ledger Credits + Dangar) - (Ledger Debits + Bardan Penalty + Interest)
      const netPosition = (lCredit + dAmount) - (lDebit + bPenalty + interestTotal);

      result.push({
        member_id: mid,
        member_code: code,
        member_name: m.member_name,
        ledger_debit: lDebit,
        ledger_credit: lCredit,
        ledger_balance: lCredit - lDebit,
        dangar_amount: dAmount,
        bardan_balance: bBal,
        bardan_penalty: bPenalty,
        total_interest: interestTotal,
        net_position: netPosition
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Deep breakdown error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Member balance in specific account
router.get('/member-balance/:accountId/:memberId', async (req, res) => {
  try {
    const { accountId, memberId } = req.params;
    const { startDate, endDate } = req.query;
    const companyId = req.header('x-company-id');
    
    // Resolve System Account IDs if not provided
    const systemAccounts = await query('SELECT id, account_code FROM accounts WHERE account_code IN ("DS0001", "BS0001") AND company_id = ?', [companyId]);
    const dangarAccountId = systemAccounts.find(a => a.account_code === 'DS0001')?.id;
    const bardanAccountId = systemAccounts.find(a => a.account_code === 'BS0001')?.id;

    let totalDebit = 0;
    let totalCredit = 0;

    if (parseInt(accountId) === dangarAccountId) {
      // Return Dangar Amount as Credit (Jama)
      let dangarQuery = 'SELECT SUM(amount) as total FROM dangar_entry WHERE member_id = ? AND company_id = ?';
      let dangarParams = [memberId, companyId];
      if (startDate && endDate) {
        dangarQuery += ' AND DATE(entry_date) BETWEEN ? AND ?';
        dangarParams.push(startDate, endDate);
      }
      const dangarData = await queryOne(dangarQuery, dangarParams);
      totalCredit = parseFloat(dangarData?.total || 0);
    } else if (parseInt(accountId) === bardanAccountId) {
      // Return Bardan Penalty as Debit (Udhar)
      const member = await queryOne('SELECT bardan_opening FROM member_master WHERE id = ?', [memberId]);
      
      let takenQuery = 'SELECT SUM(qty) as total FROM bardan_entry WHERE member_id = ? AND company_id = ?';
      let returnedQuery = 'SELECT SUM(qty) as total FROM jama_bardan_entry WHERE member_id = ? AND company_id = ?';
      let params = [memberId, companyId];
      
      if (startDate && endDate) {
        takenQuery += ' AND DATE(entry_date) BETWEEN ? AND ?';
        returnedQuery += ' AND DATE(entry_date) BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      const taken = await queryOne(takenQuery, params);
      const returned = await queryOne(returnedQuery, params);
      const bardan_balance = parseFloat(member?.bardan_opening || 0) + parseFloat(taken?.total || 0) - parseFloat(returned?.total || 0);
      
      if (bardan_balance > 0) {
        const priceData = await queryOne('SELECT price_per_bardan FROM bardan_price_master WHERE company_id = ?', [companyId]);
        totalDebit = bardan_balance * parseFloat(priceData?.price_per_bardan || 0);
      }
    } else {
      // Standard Ledger Balance
      let ledgerQuery = `
        SELECT 
           COALESCE(SUM(COALESCE(debit, debit_amount, 0)), 0) as total_debit,
           COALESCE(SUM(COALESCE(credit, credit_amount, 0)), 0) as total_credit
         FROM account_ledger 
         WHERE account_id = ? AND (member_id = ? OR reference_id = ?) AND company_id = ?`;
      let ledgerParams = [accountId, memberId, memberId, companyId];
      
      if (startDate && endDate) {
        ledgerQuery += ' AND DATE(transaction_date) BETWEEN ? AND ?';
        ledgerParams.push(startDate, endDate);
      }

      const result = await query(ledgerQuery, ledgerParams);
      totalDebit = parseFloat(result[0].total_debit || 0);
      totalCredit = parseFloat(result[0].total_credit || 0);
    }
    
    res.json({ 
      success: true, 
      balance: totalCredit - totalDebit, // Note: changed to Credit - Debit for consistency with Jama-Udhar logic
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

    let { startDate, endDate, accountId, memberId } = req.query;

    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }
    if (!startDate) {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString().split('T')[0];
    }

    // Determine which DB function to use based on provided filters
    let ledger;
    if (accountId && accountId !== 'all') {
      // Use specialized balance + entries function for specific account
      ledger = await getAccountLedgerWithRunningBalance(accountId, startDate, endDate, memberId);
    } else if (memberId) {
      // Show all ledger entries for a specific member across all accounts
      const sql = `
        SELECT al.*, a.account_name, a.account_code 
        FROM account_ledger al
        LEFT JOIN accounts a ON al.account_id = a.id
        WHERE al.company_id = ? AND (al.member_id = ? OR al.reference_id = ?)
        AND DATE(al.transaction_date) BETWEEN ? AND ?
        ORDER BY al.transaction_date ASC, al.id ASC
      `;
      ledger = await query(sql, [companyId, memberId, memberId, startDate, endDate]);
    } else {
      // Global date-range view
      ledger = await getLedgerByDateRange(companyId, startDate, endDate);
    }

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


// POST: Bulk Apply Interest Rates (Updates both percent and calculated amount)
router.post('/bulk-apply-interest', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const { globalRate, asOfDate, rateType } = req.body; // asOfDate is optional, defaults to now

    if (!companyId) return res.status(400).json({ success: false, error: 'Company ID required' });
    if (globalRate === undefined || globalRate === '') return res.status(400).json({ success: false, error: 'Global Rate required' });

    // 1. Fetch all entries that should have interest (Member Adv Ac L0001)
    const entries = await query(`
      SELECT al.id, al.debit, al.credit, al.transaction_date 
      FROM account_ledger al
      LEFT JOIN accounts a ON al.account_id = a.id
      WHERE al.company_id = ? 
        AND (al.interest_percent > 0 OR a.account_code = 'L0001')
    `, [companyId]);

    const targetDate = asOfDate ? new Date(asOfDate) : new Date();
    let updatedCount = 0;

    // 2. Calculate and Update each entry
    for (const entry of entries) {
      const principal = parseFloat(entry.debit || 0) - parseFloat(entry.credit || 0);
      if (principal <= 0) continue;

      const startDate = new Date(entry.transaction_date);
      const diffTime = targetDate - startDate;
      const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      
      // Calculate multiplier based on rate type
      let multiplier = 0;
      if (rateType === 'per_day') multiplier = diffDays;
      else if (rateType === 'per_month') multiplier = diffDays / 30.0;
      else if (rateType === 'per_year') multiplier = diffDays / 365.0;
      else multiplier = diffDays / 30.0; // Fallback to monthly

      const calculatedInterest = principal * (parseFloat(globalRate) / 100) * multiplier;

      await execute(`
        UPDATE account_ledger 
        SET interest_percent = ?, interest_amount = ?, interest_a_per = ?
        WHERE id = ?
      `, [globalRate, calculatedInterest.toFixed(2), rateType, entry.id]);
      
      updatedCount++;
    }

    res.json({ success: true, message: `Successfully synchronized ${updatedCount} interest nodes.` });
  } catch (error) {
    console.error('Bulk apply interest error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
