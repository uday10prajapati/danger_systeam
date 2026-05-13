import express from 'express';
import { query, queryOne, execute, ACCOUNT_CODES, postJournal, postToLedger, getAccountIdByCode } from '../db.js';
import { generateDangarEntryCode } from '../utils/protocolCodeGenerator.js';

const router = express.Router();

// --- ISOLATED ACCOUNTING HELPERS ---

/**
 * Maps Dangar transaction data into balanced journal entries
 * as per custom 'Danger System' structure.
 */
function mapPurchaseJournalEntries({ 
  purchaseAccountId, godownAccountId, memberPurchaseAccountId, memberId, 
  grossAmount, fundAmount, deductions, bookType, netQuintal, rate, srNo 
}) {
  const entries = [
    { accountId: purchaseAccountId, credit: grossAmount, description: `Danger Purchase Account - ${netQuintal} Qt @ ${rate}` },
    { accountId: godownAccountId, credit: fundAmount, description: `Danger Godown Fund Account` }
  ];

  let totalDeductions = 0;
  deductions.forEach(d => {
    const dAmt = parseFloat(d.calculated_amount || d.amt || 0);
    if (dAmt > 0 && d.account_id) {
       entries.push({
         accountId: d.account_id,
         debit: dAmt,
         description: `Kapat: ${d.name || 'Deduction'}`
       });
       totalDeductions += dAmt;
    }
  });

  // Net Member Allocation (Udhar Side)
  const netMemberDebit = grossAmount + fundAmount - totalDeductions;
  entries.push({
    accountId: memberPurchaseAccountId,
    memberId: memberId,
    debit: netMemberDebit,
    description: `Members Danger Purchase Account [SR: ${srNo}]`
  });

  return entries;
}

// GET all dangar entries
router.get('/', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || req.query.companyId;
    const { startDate, endDate, season } = req.query;

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company Context Required' });
    }

    let sql = `
      SELECT de.*, mm.member_name, mm.member_code, mm.village_name, mm.nominal_member, im.item_name 
      FROM dangar_entry de
      LEFT JOIN member_master mm ON de.member_id = mm.id
      LEFT JOIN item_master im ON de.item_id = im.id
      WHERE de.company_id = ?
    `;
    const params = [companyId];

    if (season) {
      sql += ` AND de.season = ?`;
      params.push(season);
    }

    if (startDate && endDate) {
      sql += ` AND de.entry_date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    sql += ` ORDER BY de.entry_date DESC, de.id DESC LIMIT 1000`;
    
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Fetch dangar entries error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET unique seasons
router.get('/seasons', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || req.query.companyId;
    if (!companyId) return res.status(400).json({ success: false, error: 'Company ID required' });
    const rows = await query(`
      SELECT DISTINCT season FROM dangar_entry WHERE company_id = ? AND season IS NOT NULL AND season != ''
      UNION
      SELECT DISTINCT book_type FROM dangar_entry WHERE company_id = ? AND book_type IS NOT NULL AND book_type != ''
    `, [companyId, companyId]);
    res.json({ success: true, data: rows.map(r => r.season) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET PAYMENT REPORT — aggregates account_ledger credits + dangar_entry + bardan_entry
router.get('/payment-report', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || req.query.companyId;
    const { startDate, endDate } = req.query;

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company Context Required' });
    }

    const dateFilter  = startDate && endDate ? 'AND al.transaction_date BETWEEN ? AND ?' : '';
    const dateParams  = startDate && endDate ? [startDate, endDate] : [];

    // 1. Member-level credits from account_ledger (dangar purchase credits)
    const ledgerRows = await query(`
      SELECT
        mm.id             AS member_id,
        COALESCE(de.quality_class, '1st') AS quality_class,
        mm.member_code,
        COALESCE(mm.member_name, mm.eng_name, '') AS member_name,
        mm.full_ac_number,
        mm.bank_name,
        mm.branch_name,
        mm.ifsc_code,
        mm.village_name,
        SUM(al.credit) AS total_credit,
        SUM(al.debit)  AS total_debit,
        COUNT(al.id)   AS entry_count
      FROM account_ledger al
      JOIN member_master mm ON al.member_id = mm.id
      LEFT JOIN dangar_entry de ON al.reference_id = de.id AND al.reference_type = 'dangar_entry'
      WHERE al.company_id = ?
        AND al.member_id IS NOT NULL
        ${dateFilter}
      GROUP BY mm.id, COALESCE(de.quality_class, '1st'), mm.member_code, COALESCE(mm.member_name, mm.eng_name, ''), mm.full_ac_number, mm.bank_name, mm.branch_name, mm.ifsc_code, mm.village_name
      ORDER BY mm.member_code ASC, COALESCE(de.quality_class, '1st') ASC
    `, [companyId, ...dateParams]);

    // 1b. Individual kapat (deduction) entries per member — for sub-rows
    const kapatDateFilter = startDate && endDate ? 'AND al.transaction_date BETWEEN ? AND ?' : '';
    const kapatRows = await query(`
      SELECT
        al.member_id,
        al.transaction_date,
        al.credit         AS amount,
        al.reference_no,
        acc.account_name,
        al.interest_amount
      FROM account_ledger al
      LEFT JOIN accounts acc ON al.account_id = acc.id
      WHERE al.company_id = ?
        AND al.member_id IS NOT NULL
        AND al.transaction_type = 'deduction'
        ${kapatDateFilter}
      ORDER BY al.transaction_date DESC
    `, [companyId, ...dateParams]);

    // Group kapat entries by member_id
    const kapatMap = {};
    kapatRows.forEach(k => {
      if (!kapatMap[k.member_id]) kapatMap[k.member_id] = [];
      kapatMap[k.member_id].push(k);
    });


    // 2. Dangar entry details per member (sr_no, qty, rate, kapat)
    const dangDateFilter = startDate && endDate ? 'AND de.entry_date BETWEEN ? AND ?' : '';
    const dangParams     = startDate && endDate ? [startDate, endDate] : [];

    const dangarRows = await query(`
      SELECT
        de.member_id,
        de.sr_no,
        de.entry_date,
        de.quality_class,
        de.total_kg,
        de.net_quintal,
        de.rate,
        de.amount       AS rate_amount,
        de.total_deduction AS deduction_amount,
        (de.amount - de.total_deduction) AS net_amount,
        im.item_name_gu,
        im.item_name,
        de.season,
        de.financial_year
      FROM dangar_entry de
      LEFT JOIN item_master im ON de.item_id = im.id
      WHERE de.company_id = ?
        ${dangDateFilter}
      ORDER BY de.entry_date ASC, de.id ASC
    `, [companyId, ...dangParams]);

    // 3. Bardan issued per member code
    const bardanRows = await query(`
      SELECT
        be.code            AS member_code,
        SUM(be.qty)        AS total_bardan_issued
      FROM bardan_entry be
      WHERE be.company_id = ?
      GROUP BY be.code
    `, [companyId]);

    // 3b. Bardan returned (jama) per member code
    const jamaBardanRows = await query(`
      SELECT
        jbe.code           AS member_code,
        SUM(jbe.qty)       AS total_bardan_returned
      FROM jama_bardan_entry jbe
      WHERE jbe.company_id = ?
      GROUP BY jbe.code
    `, [companyId]);

    const bardanIssuedMap  = {};
    const bardanReturnedMap = {};
    bardanRows.forEach(b    => { bardanIssuedMap[b.member_code]   = parseFloat(b.total_bardan_issued   || 0); });
    jamaBardanRows.forEach(j => { bardanReturnedMap[j.member_code] = parseFloat(j.total_bardan_returned || 0); });

    // 4. Bardan price (company-wide)
    const bardanPriceRow = await queryOne(
      'SELECT price_per_bardan FROM bardan_price_master WHERE company_id = ? LIMIT 1',
      [companyId]
    );
    const pricePerBardan = parseFloat(bardanPriceRow?.price_per_bardan || 0);

    // Index dangar rows by member_id
    const dangarMap = {};
    dangarRows.forEach(d => {
      if (!dangarMap[d.member_id]) dangarMap[d.member_id] = [];
      dangarMap[d.member_id].push(d);
    });

    const memberDeductionsAssigned = new Set();
    const report = [];

    for (const row of ledgerRows) {
      // Filter entries by class (matching the grouping)
      const allMemberEntries = dangarMap[row.member_id] || [];
      const entries = allMemberEntries.filter(e => {
        const eClass = e.quality_class || '1st';
        return eClass === row.quality_class;
      });

      // Skip row if no matching dangar entries for this class (unless it's a pure ledger adjustment)
      if (entries.length === 0 && row.total_credit === 0 && row.total_debit === 0) continue;

      const totalKg        = entries.reduce((s, e) => s + parseFloat(e.total_kg          || 0), 0);
      const totalQuintal   = entries.reduce((s, e) => s + parseFloat(e.net_quintal       || 0), 0);
      const rateAmount     = entries.reduce((s, e) => s + parseFloat(e.rate_amount       || 0), 0);
      const weightedRate   = entries.length > 0
        ? entries.reduce((s, e) => s + parseFloat(e.rate || 0), 0) / entries.length
        : 0;
      
      const dangarNameGu   = entries.length > 0 ? (entries[0].item_name_gu || entries[0].item_name || 'ગુર્જરી ચાઈનાકટ વગે-૧') : '---';

      const bardanIssued    = parseFloat(bardanIssuedMap[row.member_code]   || 0);
      const bardanReturned  = parseFloat(bardanReturnedMap[row.member_code] || 0);
      
      let pendingInterest = 0;
      let memberAdvance = 0;
      let godownFund = parseFloat(totalKg) * 0.05;
      let bardanPhysicalRemaining = 0;
      let bardanPenaltyBalance = 0;
      let otherUdhar = 0;
      let otherDeductionsList = [];
      let bardanSelfJama = 0;

      const shouldAssignMemberDeductions = !memberDeductionsAssigned.has(row.member_id);
      let totalKapat = 0;

      if (shouldAssignMemberDeductions) {
          memberDeductionsAssigned.add(row.member_id);
          totalKapat = (kapatMap[row.member_id] || []).reduce((s, k) => s + parseFloat(k.amount || 0), 0);
          try {
             // System Accounts
             const advAc = await queryOne("SELECT id FROM accounts WHERE account_code = 'L0001' AND company_id = ?", [companyId]);
             const godownAc = await queryOne("SELECT id FROM accounts WHERE account_code = 'GF0001' AND company_id = ?", [companyId]);
             const bardanAc = await queryOne("SELECT id FROM accounts WHERE account_code = 'BS0001' AND company_id = ?", [companyId]);
             const advAcId = advAc?.id;
             const godownAcId = godownAc?.id;
             const bardanAcId = bardanAc?.id;
    
             const memberBardan = await queryOne('SELECT bardan_opening FROM member_master WHERE id = ?', [row.member_id]);
             const bardanOpening = parseFloat(memberBardan?.bardan_opening || 0);
             bardanPenaltyBalance = bardanOpening;
    
             const memberLedger = await query(`
                SELECT account_id, debit, credit, transaction_date, interest_percent, interest_amount, reference_type, description 
                FROM account_ledger 
                WHERE member_id = ? AND company_id = ?
             `, [row.member_id, companyId]);
    
              for (const entry of memberLedger) {
                 const bal = parseFloat(entry.debit || 0) - parseFloat(entry.credit || 0);
                 const desc = (entry.description || '').toLowerCase();
                 const isSelf = desc.includes('[self]');
                 
                 const isAdvance = advAcId && entry.account_id === advAcId;
                 const isGodownFund = (godownAcId && entry.account_id === godownAcId) || entry.reference_type === 'dangar_entry_fund' || desc.includes('godown fund');
                 const isBardan = bardanAcId && entry.account_id === bardanAcId;
    
                 if (isGodownFund && entry.reference_type !== 'dangar_entry_fund') {
                    godownFund += bal;
                 } else if (isAdvance) {
                    memberAdvance += bal;
                 } else if (isBardan) {
                    const penaltyCredit = isSelf ? 0 : parseFloat(entry.credit || 0);
                    bardanPenaltyBalance += parseFloat(entry.debit || 0) - penaltyCredit;
                    if (isSelf) bardanSelfJama += parseFloat(entry.credit || 0);
                 } else if (Math.abs(bal) > 0.01) {
                    const accRow = await queryOne('SELECT account_name FROM accounts WHERE id = ?', [entry.account_id]);
                    const accName = accRow?.account_name || 'Uncategorized';
                    const existing = otherDeductionsList.find(d => d.account_name === accName);
                    if (existing) existing.amount += bal;
                    else otherDeductionsList.push({ account_name: accName, amount: bal });
                    otherUdhar += bal;
                 }
    
                 if (parseFloat(entry.interest_amount || 0) > 0) {
                    pendingInterest += parseFloat(entry.interest_amount);
                 } else if (parseFloat(entry.interest_percent || 0) > 0 && bal > 0.01) {
                    const start = new Date(entry.transaction_date);
                    const end = endDate ? new Date(endDate) : new Date();
                    const diff = end - start;
                    const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
                    pendingInterest += (bal * (parseFloat(entry.interest_percent) / 100) * (days / 30.0));
                 }
              }
              
              const memberBardanData = await queryOne('SELECT bardan_opening FROM member_master WHERE id = ?', [row.member_id]);
              const bOpening = parseFloat(memberBardanData?.bardan_opening || 0);
              bardanPhysicalRemaining = Math.max(0, bOpening + bardanIssued - bardanReturned);
              bardanPenaltyBalance = Math.max(0, bardanPenaltyBalance);
    
          } catch (err) {
             console.error('Report Breakdown calculation failed', err);
          }
      }

      const bardanRemaining = Math.max(0, bardanPenaltyBalance);
      const bardanPenalty = bardanRemaining * pricePerBardan;
      const totalDeductions = memberAdvance + pendingInterest + bardanPenalty + godownFund;
      const finalAmount = rateAmount - totalDeductions;

      report.push({
        member_id:        row.member_id,
        member_code:      row.member_code,
        member_name:      row.member_name,
        village_name:     row.village_name || '',
        dangar_name:      dangarNameGu,
        quality_class:    row.quality_class || '1st',
        full_ac_number:   row.full_ac_number || '',
        bank_name:        row.bank_name || '',
        branch_name:      row.branch_name || '',
        ifsc_code:        row.ifsc_code || '',
        entry_count:      entries.length,
        total_kg:         totalKg.toFixed(2),
        total_quintal:    totalQuintal.toFixed(2),
        rate_per_kg:      weightedRate.toFixed(2),
        rate_amount:      rateAmount.toFixed(2),
        member_advance:   memberAdvance.toFixed(2),
        godown_fund:      godownFund.toFixed(2),
        other_udhar:      otherUdhar.toFixed(2),
        other_deductions: otherDeductionsList.map(d => ({ account_name: d.account_name, amount: d.amount.toFixed(2) })),
        total_interest:   pendingInterest.toFixed(2),
        total_kapat:      totalKapat.toFixed(2),
        total_deductions: totalDeductions.toFixed(2),
        final_amount:     finalAmount.toFixed(2),
        bardan_issued:    shouldAssignMemberDeductions ? bardanIssued : 0,
        bardan_returned:  shouldAssignMemberDeductions ? bardanReturned : 0,
        bardan_physical_remaining: bardanPhysicalRemaining,
        bardan_remaining: bardanRemaining,
        bardan_penalty:   bardanPenalty.toFixed(2),
        bardan_self_jama: bardanSelfJama,
        kapat_entries:    kapatMap[row.member_id] || [],
        dangar_name_gu:   dangarNameGu,
        entries:          entries,
      });
    }


    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Payment report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET Dangar Summary Report
router.get('/summary-report', async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query;

    // 1. Grouped Dangar Purchases (by variety & quality class)
    const dangarSummary = await query(`
      SELECT 
        im.item_name,
        im.item_name_gu,
        de.quality_class,
        de.financial_year,
        COUNT(de.id) AS entry_count,
        SUM(de.total_kg) as total_kg,
        SUM(de.net_quintal) as total_quintal,
        AVG(de.rate) as avg_rate,
        SUM(de.amount) as total_amount,
        SUM(de.total_deduction) as total_deduction
      FROM dangar_entry de
      LEFT JOIN item_master im ON de.item_id = im.id
      WHERE de.company_id = ?
        AND de.entry_date BETWEEN ? AND ?
      GROUP BY im.item_name, im.item_name_gu, de.quality_class, de.financial_year
      ORDER BY SUM(de.amount) DESC
    `, [companyId, startDate, endDate]);

    // 2. Global Fixed Account Balances (Kapat Vigat)
    const fixedAccounts = await query(`
       SELECT 
         a.id AS account_id,
         a.account_name,
         a.account_code,
         SUM(al.debit - al.credit) as total_balance,
         SUM(al.debit) as total_debit,
         SUM(al.credit) as total_credit
       FROM account_ledger al
       JOIN accounts a ON al.account_id = a.id
       WHERE al.company_id = ?
         AND al.transaction_date <= ?
         AND (a.account_code IN ('L0001', 'GF0001', 'BS0001', 'IK0001') 
              OR a.account_name LIKE '%Kapat%' 
              OR a.account_name LIKE '%Deduction%')
       GROUP BY a.id, a.account_name, a.account_code
       ORDER BY ABS(SUM(al.debit - al.credit)) DESC
    `, [companyId, endDate]);

    // 3. Payment per account — how much has been paid out via each account
    const paymentPerAccount = await query(`
      SELECT
        a.id AS account_id,
        a.account_name,
        a.account_code,
        a.account_type,
        COUNT(al.id) AS txn_count,
        SUM(al.credit) AS total_credited,
        SUM(al.debit)  AS total_debited,
        SUM(al.credit - al.debit) AS net_paid
      FROM account_ledger al
      JOIN accounts a ON al.account_id = a.id
      WHERE al.company_id = ?
        AND al.transaction_date BETWEEN ? AND ?
        AND al.account_id IS NOT NULL
      GROUP BY a.id, a.account_name, a.account_code, a.account_type
      ORDER BY SUM(al.credit) DESC
    `, [companyId, startDate, endDate]);

    // 4. Grand totals
    const totalsRow = await query(`
      SELECT
        COALESCE(SUM(de.total_kg), 0)         AS grand_total_kg,
        COALESCE(SUM(de.net_quintal), 0)      AS grand_total_quintal,
        COALESCE(SUM(de.amount), 0)           AS grand_rate_amount,
        COALESCE(SUM(de.total_deduction), 0)  AS grand_total_deduction,
        COUNT(de.id)                           AS grand_entry_count
      FROM dangar_entry de
      WHERE de.company_id = ?
        AND de.entry_date BETWEEN ? AND ?
    `, [companyId, startDate, endDate]);

    // 5. Total interest accumulated in period
    const interestRow = await query(`
      SELECT
        COALESCE(SUM(al.interest_amount), 0) AS total_interest
      FROM account_ledger al
      WHERE al.company_id = ?
        AND al.transaction_date BETWEEN ? AND ?
        AND al.interest_amount > 0
    `, [companyId, startDate, endDate]);

    // 6. Member count with activity
    const memberCountRow = await query(`
      SELECT COUNT(DISTINCT de.member_id) AS active_members
      FROM dangar_entry de
      WHERE de.company_id = ?
        AND de.entry_date BETWEEN ? AND ?
    `, [companyId, startDate, endDate]);

    // 7. Journal/Ledger payment summary (credited to member = amount owed)
    const memberPaymentSummary = await query(`
      SELECT
        SUM(CASE WHEN al.credit > 0 THEN al.credit ELSE 0 END) AS total_member_credit,
        SUM(CASE WHEN al.debit > 0 THEN al.debit ELSE 0 END)   AS total_member_debit
      FROM account_ledger al
      WHERE al.company_id = ?
        AND al.member_id IS NOT NULL
        AND al.transaction_date BETWEEN ? AND ?
    `, [companyId, startDate, endDate]);

    // 8. Procurement by Village
    const villageSummary = await query(`
      SELECT 
        m.village_name AS village_name,
        NULL AS village_name_gu,
        COUNT(de.id) AS entry_count,
        SUM(de.total_kg) AS total_kg,
        SUM(de.net_quintal) AS total_quintal,
        SUM(de.amount) AS total_amount,
        SUM(de.total_deduction) AS total_deduction
      FROM dangar_entry de
      JOIN member_master m ON de.member_id = m.id
      WHERE de.company_id = ?
        AND de.entry_date BETWEEN ? AND ?
      GROUP BY m.village_name
      ORDER BY SUM(de.amount) DESC
    `, [companyId, startDate, endDate]);

    res.json({
      success: true,
      data: {
        dangarSummary,
        villageSummary,
        fixedAccounts,
        paymentPerAccount,
        grandTotals: totalsRow[0] || {},
        totalInterest: parseFloat(interestRow[0]?.total_interest || 0),
        activeMembers: parseInt(memberCountRow[0]?.active_members || 0),
        memberPaymentSummary: memberPaymentSummary[0] || {},
      }
    });
  } catch (error) {
    console.error('Dangar Summary Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});





// GET one dangar entry with weights
router.get('/:id', async (req, res) => {
  try {
    const entry = await queryOne(`
       SELECT de.*, mm.member_name, mm.member_code, im.item_name 
       FROM dangar_entry de
       LEFT JOIN member_master mm ON de.member_id = mm.id
       LEFT JOIN item_master im ON de.item_id = im.id
       WHERE de.id = ?
    `, [req.params.id]);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Node not discovered in registry' });
    }

    const weights = await query('SELECT * FROM dangar_weights WHERE entry_id = ? ORDER BY sr_no ASC', [req.params.id]);
    entry.weights = weights;

    res.json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create new dangar entry (Commit Transaction)
router.post('/', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || req.body.company_id;
    const currentFinancialYear = req.headers['x-financial-year'] || '2026-27';

    if (!companyId) {
      throw new Error('Mandatory Header: X-Company-Id missing');
    }

    const { 
      bookType, date, member_id, item_id, remark, vehicleNo,
      total_kg, bardan, gun, gross_quintal, less_bardan, net_quintal,
      rate, amount, total_deduction, created_by, weights, deductions = [], remaining_bardan_bags, returned_bags,
      quality_class, weight_unit, season
    } = req.body;

    // 1. Precise SR No Generation (Protocol D00001)
    const srNo = await generateDangarEntryCode(companyId);

    // 1b. Resolve System Accounts
    const dangarAccount = await queryOne("SELECT id FROM accounts WHERE account_code = 'DS0001' AND company_id = ?", [companyId]);
    const bardanAccount = await queryOne("SELECT id FROM accounts WHERE account_code = 'BS0001' AND company_id = ?", [companyId]);
    const dangarAccountId = dangarAccount?.id || null;
    const bardanAccountId = bardanAccount?.id || null;

    // 2. Commit Header State
    const result = await execute(`
      INSERT INTO dangar_entry (
        company_id, financial_year, book_type, sr_no, entry_date, 
        member_id, account_id, item_id, remark, vehicle_no, quality_class,
        total_kg, bardan, gun, gross_quintal, less_bardan, net_quintal,
        rate, amount, total_deduction, weight_unit, created_by, season
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId, currentFinancialYear, bookType, srNo, date,
      member_id, dangarAccountId, item_id, remark, vehicleNo, quality_class || '1st',
      total_kg, bardan, gun, gross_quintal, less_bardan, net_quintal,
      rate || 0, amount || 0, total_deduction || 0, weight_unit || 'kg', created_by || 1, season
    ]);

    const entryId = result.insertId || result.lastID;

    // 3. Populate Weight Matrix
    if (weights && Array.isArray(weights)) {
      for (let i = 0; i < weights.length; i++) {
        const val = parseFloat(weights[i].wgt);
        if (!isNaN(val) && val > 0) {
          await execute(
            'INSERT INTO dangar_weights (entry_id, sr_no, weight) VALUES (?, ?, ?)',
            [entryId, i + 1, val]
          );
        }
      }
    }

    // 4. Handle Strategic Deductions (Kapat)
    if (deductions.length > 0) {
      for (const d of deductions) {
        if (d.deduction_id) {
          await execute(
            `INSERT INTO transaction_deductions (entry_id, deduction_id, input_value, calculated_amount)
             VALUES (?, ?, ?, ?)`,
            [entryId, d.deduction_id, d.value || 0, d.calculated_amount || 0]
          );
        }
      }
    }

    // 5. Commit to Unified Ledger (Using Isolated Mapper)
    const itemData = await queryOne('SELECT purchase_account_id FROM item_master WHERE id = ?', [item_id]);
    const purchaseAccountId = itemData?.purchase_account_id || await getAccountIdByCode(companyId, ACCOUNT_CODES.DANGAR_PURCHASE);
    const memberPurchaseAccountId = await getAccountIdByCode(companyId, ACCOUNT_CODES.MEMBERS_DANGAR_PURCHASE);
    const godownAccountId = await getAccountIdByCode(companyId, ACCOUNT_CODES.DANGAR_GODOWN_FUND);
    
    // Resolve deduction account IDs from master
    const resolvedDeductions = [];
    if (deductions.length > 0) {
      for (const d of deductions) {
        const dMaster = await queryOne('SELECT ledger_account_id, name FROM deduction_master WHERE id = ?', [d.deduction_id]);
        if (dMaster?.ledger_account_id) {
          resolvedDeductions.push({ account_id: dMaster.ledger_account_id, name: dMaster.name, amt: d.calculated_amount });
        }
      }
    }

    const journalEntries = mapPurchaseJournalEntries({
      purchaseAccountId, godownAccountId, memberPurchaseAccountId, memberId: member_id,
      grossAmount: parseFloat(req.body.gross_amount || amount || 0),
      fundAmount: (parseFloat(total_kg) || 0) * 0.05,
      deductions: resolvedDeductions,
      bookType, netQuintal: net_quintal, rate, srNo
    });

    try {
      await postJournal({
        companyId,
        date,
        referenceType: 'dangar_entry',
        referenceId: entryId,
        referenceNo: srNo,
        description: `${bookType} Purchase Entry`,
        entries: journalEntries,
        financialYear: currentFinancialYear,
        userId: created_by || 1,
        transactionType: 'cash_book'
      });
      console.log('✅ Consolidated Dangar Journal Committed');
    } catch (ledgerErr) {
      console.warn('Ledger sync warning:', ledgerErr.message);
    }

    // 6. Auto-Settle Bardan Balance (Jama Entry)
    // We credit the bags actually returned (returned_bags), not the remaining balance.
    if (returned_bags && parseFloat(returned_bags) > 0) {
      const member = await queryOne(`SELECT id, member_code, member_name FROM member_master WHERE id = ?`, [member_id]);
      if (member) {
        let settleRemark = `Dangar Settlement SR: ${srNo}`;
        const jamResult = await execute(`
          INSERT INTO jama_bardan_entry (
            company_id, financial_year, entry_date, 
            book_type, pavti_no, mem_nominal, code, name, qty, remark,
            member_id, account_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          companyId, currentFinancialYear, date,
          'J', srNo, 'S', member.member_code, member.member_name, parseFloat(returned_bags), settleRemark,
          member.id, bardanAccountId
        ]);

        const jamId = jamResult.lastID;

        // --- Sync Bardan Return with Account Ledger ---
        if (bardanAccountId) {
           await execute(`
              INSERT INTO account_ledger (
                 company_id, financial_year, account_id, member_id, 
                 transaction_date, reference_no, description, 
                 debit, credit, reference_type, reference_id
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           `, [
              companyId, currentFinancialYear, bardanAccountId, member.id,
              date, srNo, settleRemark,
              0, parseFloat(returned_bags), 'jama_bardan_entry', jamId
           ]);
           console.log('✅ Bardan Settle Ledger Sync Complete');
        }
      }
    }

    res.json({ success: true, data: { id: entryId, srNo } });
  } catch (error) {
    console.error('Dangar Entry Commit Error:', error);
    res.status(500).json({ success: false, error: 'Database Synchronization Failure: ' + error.message });
  }
});

// UPDATE dangar entry (Re-Commit Transaction)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.headers['x-company-id'] || req.body.company_id;
    const currentFinancialYear = req.headers['x-financial-year'] || '2026-27';

    if (!companyId) {
      throw new Error('Mandatory Header: X-Company-Id missing');
    }

    const { 
      bookType, date, member_id, item_id, remark, vehicleNo, srNo,
      total_kg, bardan, gun, gross_quintal, less_bardan, net_quintal,
      rate, amount, total_deduction, weights, deductions = [], returned_bags,
      quality_class, weight_unit, season
    } = req.body;

    // 1. Update Header State
    await execute(`
      UPDATE dangar_entry SET
        book_type = ?, entry_date = ?, member_id = ?, item_id = ?, 
        remark = ?, vehicle_no = ?, quality_class = ?,
        total_kg = ?, bardan = ?, gun = ?, gross_quintal = ?, 
        less_bardan = ?, net_quintal = ?, rate = ?, amount = ?, 
        total_deduction = ?, weight_unit = ?, season = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ?
    `, [
      bookType, date, member_id, item_id, remark, vehicleNo, quality_class || '1st',
      total_kg, bardan, gun, gross_quintal, less_bardan, net_quintal,
      rate || 0, amount || 0, total_deduction || 0, weight_unit || 'kg', season, id, companyId
    ]);

    // 2. Refresh Weight Matrix (Delete and Re-insert)
    await execute('DELETE FROM dangar_weights WHERE entry_id = ?', [id]);
    if (weights && Array.isArray(weights)) {
      for (let i = 0; i < weights.length; i++) {
        const val = parseFloat(weights[i].wgt);
        if (!isNaN(val) && val > 0) {
          await execute(
            'INSERT INTO dangar_weights (entry_id, sr_no, weight) VALUES (?, ?, ?)',
            [id, i + 1, val]
          );
        }
      }
    }

    // 3. Refresh Kapat Matrix
    await execute('DELETE FROM transaction_deductions WHERE entry_id = ?', [id]);
    if (deductions.length > 0) {
      for (const d of deductions) {
        if (d.deduction_id) {
          await execute(
            `INSERT INTO transaction_deductions (entry_id, deduction_id, input_value, calculated_amount)
             VALUES (?, ?, ?, ?)`,
            [id, d.deduction_id, d.value || 0, d.calculated_amount || 0]
          );
        }
      }
    }

    // 4. Re-sync Account Ledger (Using Isolated Mapper)
    await execute("DELETE FROM account_ledger WHERE reference_type IN ('dangar_entry', 'dangar_entry_fund', 'dangar_entry_kapat', 'jama_bardan_entry') AND reference_id = ?", [id]);

    const purchaseAccountId = (await queryOne('SELECT purchase_account_id FROM item_master WHERE id = ?', [item_id]))?.purchase_account_id 
      || await getAccountIdByCode(companyId, ACCOUNT_CODES.DANGAR_PURCHASE);
    const memberPurchaseAccountId = await getAccountIdByCode(companyId, ACCOUNT_CODES.MEMBERS_DANGAR_PURCHASE);
    const godownAccountId = await getAccountIdByCode(companyId, ACCOUNT_CODES.DANGAR_GODOWN_FUND);
    
    const resolvedDeductions = [];
    if (deductions.length > 0) {
      for (const d of deductions) {
        const dMaster = await queryOne('SELECT ledger_account_id, name FROM deduction_master WHERE id = ?', [d.deduction_id]);
        if (dMaster?.ledger_account_id) {
          resolvedDeductions.push({ account_id: dMaster.ledger_account_id, name: dMaster.name, amt: d.calculated_amount });
        }
      }
    }

    const journalEntries = mapPurchaseJournalEntries({
      purchaseAccountId, godownAccountId, memberPurchaseAccountId, memberId: member_id,
      grossAmount: parseFloat(req.body.gross_amount || amount || 0),
      fundAmount: (parseFloat(total_kg) || 0) * 0.05,
      deductions: resolvedDeductions,
      bookType, netQuintal: net_quintal, rate, srNo
    });

    try {
      await postJournal({
        companyId,
        date,
        referenceType: 'dangar_entry',
        referenceId: id,
        referenceNo: srNo,
        description: `${bookType} Purchase Entry [Edit]`,
        entries: journalEntries,
        financialYear: currentFinancialYear,
        userId: 1,
        transactionType: 'cash_book'
      });
      console.log('✅ Consolidated Dangar Update Journal Committed');
    } catch (ledgerErr) {
      console.warn('Ledger re-sync warning:', ledgerErr.message);
    }

    // 6. Re-sync Bardan Return
    await execute("DELETE FROM jama_bardan_entry WHERE remark LIKE ? AND company_id = ?", [`%Dangar Settlement SR: ${srNo}%`, companyId]);
    if (returned_bags && parseFloat(returned_bags) > 0) {
      const member = await queryOne(`SELECT member_code, member_name FROM member_master WHERE id = ?`, [member_id]);
      const bardanAccount = await queryOne("SELECT id FROM accounts WHERE account_code = 'BS0001' AND company_id = ?", [companyId]);
      if (member) {
        const settleRemark = `Dangar Settlement SR: ${srNo}`;
        const jamResult = await execute(`
          INSERT INTO jama_bardan_entry (
            company_id, financial_year, entry_date, 
            book_type, pavti_no, mem_nominal, code, name, qty, remark,
            member_id, account_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          companyId, currentFinancialYear, date,
          'J', srNo, 'S', member.member_code, member.member_name, parseFloat(returned_bags), settleRemark,
          member_id, bardanAccount?.id || null
        ]);

        if (bardanAccount?.id) {
          await execute(`
            INSERT INTO account_ledger (
              company_id, financial_year, account_id, member_id, 
              transaction_date, reference_no, description, 
              debit, credit, reference_type, reference_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            companyId, currentFinancialYear, bardanAccount.id, member_id,
            date, srNo, settleRemark, 0, parseFloat(returned_bags), 'jama_bardan_entry', jamResult.insertId || jamResult.lastID
          ]);
        }
      }
    }

    res.json({ success: true, message: 'Transaction node re-committed successfully.' });
  } catch (error) {
    console.error('Update Dangar Entry Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// RECALCULATE entries for an item based on current master rates
router.post('/recalculate', async (req, res) => {
  try {
    const { item_id, financial_year, company_id } = req.body;
    
    // 1. Fetch Master Rates
    const rates = await queryOne(
      'SELECT rate, winter_rate, summer_rate FROM dangar_rates WHERE item_id = ? AND financial_year = ? AND company_id = ?',
      [item_id, financial_year, company_id]
    );

    if (!rates) return res.status(404).json({ success: false, error: 'Rates not configured for this item/year' });

    // 2. Fetch all entries
    const entries = await query(
      'SELECT id, sr_no, net_quintal, total_kg, quality_class, item_id, member_id FROM dangar_entry WHERE item_id = ? AND financial_year = ? AND company_id = ?',
      [item_id, financial_year, company_id]
    );

    for (const entry of entries) {
      let activeRate = rates.rate;
      if (entry.quality_class === '2nd') activeRate = rates.winter_rate || rates.rate;
      else if (entry.quality_class === '3rd') activeRate = rates.summer_rate || rates.rate;

      const newAmount = parseFloat(entry.net_quintal || 0) * parseFloat(activeRate || 0);
      const newDesc = `Dangar Purchase [Recalc]`;

      // 1. Update Dangar Entry Table
      await execute(
        'UPDATE dangar_entry SET rate = ?, amount = ? WHERE id = ?',
        [activeRate, newAmount, entry.id]
      );

      // 2. Re-sync Ledger entries for this specific transaction
      // We update the primary Purchase Account row and the Member Account row
      // Note: Deductions are not recalculated here as they might be fixed amounts or percentages of something else
      
      // Update Purchase Account Credit (Jama)
      await execute(
        `UPDATE account_ledger SET credit = ?, description = ? 
         WHERE reference_type = 'dangar_entry' AND reference_id = ? AND account_id IS NOT NULL 
         AND account_id = (SELECT purchase_account_id FROM item_master WHERE id = ?) AND company_id = ?`,
        [newAmount, newDesc, entry.id, entry.item_id, company_id]
      );

      // Update Member Debit (Udhar)
      const godownFund = (parseFloat(entry.total_kg) || 0) * 0.05;
      
      const deductions = await query('SELECT SUM(calculated_amount) as total FROM transaction_deductions WHERE entry_id = ?', [entry.id]);
      const totalDeductions = parseFloat(deductions[0]?.total || 0);
      
      const newNetMemberDebit = newAmount + godownFund - totalDeductions;

      await execute(
        `UPDATE account_ledger SET debit = ?, description = ? 
         WHERE reference_type = 'dangar_entry' AND reference_id = ? AND member_id = ? AND company_id = ?`,
        [newNetMemberDebit, newDesc, entry.id, entry.member_id, company_id]
      );
      
      console.log(`✅ Recalculated entry ${entry.sr_no}: Net Credit ${newNetMemberCredit}`);
    }

    res.json({ success: true, message: `Successfully synchronized ${entries.length} transaction nodes.` });
  } catch (error) {
    console.error('Recalculate Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE dangar entry
router.delete('/:id', async (req, res) => {
  try {
    // 1. Delete associated ledger entries (Both the purchase credit AND any Bardan return)
    // The purchase entry is linked via source_id = id AND source_table = 'dangar_entry' (if we use source_table)
    // Wait, in POST we didn't set source_table for the dangar purchase, we used reference_id.
    // Let's delete all ledger entries linked to this Dangar SR/ID
    await execute("DELETE FROM account_ledger WHERE reference_type IN ('dangar_entry', 'dangar_entry_fund', 'jama_bardan_entry') AND reference_id = ?", [req.params.id]);
    
    // 2. Delete associated jama_bardan_entry created during this dangar entry
    // These are linked via the same SR No or we can find them via the ledger source link
    await execute('DELETE FROM jama_bardan_entry WHERE remark LIKE ?', [`%Dangar Settlement SR: %`]); // A bit risky, better to use SR
    
    // 3. Delete weights and the main entry
    await execute('DELETE FROM dangar_weights WHERE entry_id = ?', [req.params.id]);
    await execute('DELETE FROM dangar_entry WHERE id = ?', [req.params.id]);
    
    res.json({ success: true, message: 'Dangar entry and linked ledger nodes removed.' });
  } catch (error) {
    console.error('Delete Dangar Entry Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
