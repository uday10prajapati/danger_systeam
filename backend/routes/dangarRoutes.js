import express from 'express';
import { query, queryOne, execute } from '../db.js';
import { generateDangarEntryCode } from '../utils/protocolCodeGenerator.js';

const router = express.Router();

// GET all dangar entries
router.get('/', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || req.query.companyId;
    const { startDate, endDate, season } = req.query;

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company Context Required' });
    }

    let sql = `
      SELECT de.*, mm.member_name, mm.member_code, im.item_name 
      FROM dangar_entry de
      LEFT JOIN member_master mm ON de.member_id = mm.id
      LEFT JOIN item_master im ON de.item_id = im.id
      WHERE de.company_id = ?
    `;
    const params = [companyId];

    if (season) {
      sql += ` AND de.book_type = ?`;
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
        mm.member_code,
        mm.member_name,
        mm.full_ac_number,
        mm.bank_name,
        mm.branch_name,
        SUM(al.credit) AS total_credit,
        SUM(al.debit)  AS total_debit,
        COUNT(al.id)   AS entry_count
      FROM account_ledger al
      JOIN member_master mm ON al.member_id = mm.id
      WHERE al.company_id = ?
        AND al.member_id IS NOT NULL
        ${dateFilter}
      GROUP BY mm.id, mm.member_code, mm.member_name, mm.full_ac_number, mm.bank_name, mm.branch_name
      ORDER BY mm.member_code ASC
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
        de.total_kg,
        de.net_quintal,
        de.rate,
        de.amount       AS rate_amount,
        de.total_deduction AS deduction_amount,
        (de.amount - de.total_deduction) AS net_amount,
        im.item_name_gu,
        im.item_name
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

    // Build final report rows
    const report = [];
    for (const row of ledgerRows) {

      const entries        = dangarMap[row.member_id] || [];
      const totalKg        = entries.reduce((s, e) => s + parseFloat(e.total_kg          || 0), 0);
      const totalQuintal   = entries.reduce((s, e) => s + parseFloat(e.net_quintal       || 0), 0);
      const rateAmount     = entries.reduce((s, e) => s + parseFloat(e.rate_amount       || 0), 0);
      const weightedRate   = entries.length > 0
        ? entries.reduce((s, e) => s + parseFloat(e.rate || 0), 0) / entries.length
        : 0;
      const dangarNameGu   = entries.length > 0 ? (entries[0].item_name_gu || entries[0].item_name || 'ગુર્જરી ચાઈનાકટ વગે-૧') : '---';

      const bardanIssued    = parseFloat(bardanIssuedMap[row.member_code]   || 0);
      const bardanReturned  = parseFloat(bardanReturnedMap[row.member_code] || 0);
      const bardanRemaining = Math.max(0, bardanIssued - bardanReturned);
      const bardanPenalty   = bardanRemaining * pricePerBardan;
      const totalKapat  = (kapatMap[row.member_id] || []).reduce((s, k) => s + parseFloat(k.amount || 0), 0);
      
      // Calculate REAL-TIME breakdown for this member
      let pendingInterest = 0;
      let memberAdvance = 0; // Specifically from L0001 Member Adv Ac
      let otherUdhar = 0;    // Any other outstanding balance
      
      try {
         // Resolve Member Adv Ac ID
         const advAc = await queryOne('SELECT id FROM accounts WHERE account_code = "L0001" AND company_id = ?', [companyId]);
         const advAcId = advAc?.id;

         const memberLedger = await query(`
            SELECT account_id, debit, credit, transaction_date, interest_percent 
            FROM account_ledger 
            WHERE member_id = ? AND company_id = ?
         `, [row.member_id, companyId]);

         for (const entry of memberLedger) {
            const bal = parseFloat(entry.debit || 0) - parseFloat(entry.credit || 0);
            
            if (advAcId && entry.account_id === advAcId) {
               memberAdvance += bal;
            } else {
               otherUdhar += bal;
            }

            if (parseFloat(entry.interest_percent || 0) > 0 && bal > 0.01) {
               const start = new Date(entry.transaction_date);
               const end = endDate ? new Date(endDate) : new Date();
               const diff = end - start;
               const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
               // Monthly Interest Formula: Principal * (Rate/100) * (Days/30)
               pendingInterest += (bal * (parseFloat(entry.interest_percent) / 100) * (days / 30.0));
            }
         }
      } catch (err) {
         console.error('Report Breakdown calculation failed', err);
      }

      // Final Amount = Rate Amount - (Specified Deductions: Advance + Interest + Penalty)
      const totalDeductions = memberAdvance + pendingInterest + bardanPenalty;
      const finalAmount = rateAmount - totalDeductions;

      report.push({
        member_id:        row.member_id,
        member_code:      row.member_code,
        member_name:      row.member_name,
        full_ac_number:   row.full_ac_number || '',
        bank_name:        row.bank_name || '',
        branch_name:      row.branch_name || '',
        entry_count:      row.entry_count,
        total_kg:         totalKg.toFixed(2),
        total_quintal:    totalQuintal.toFixed(2),
        rate_per_kg:      weightedRate.toFixed(2),
        rate_amount:      rateAmount.toFixed(2),
        member_advance:   memberAdvance.toFixed(2),
        other_udhar:      otherUdhar.toFixed(2),
        total_interest:   pendingInterest.toFixed(2),
        total_kapat:      totalKapat.toFixed(2),
        total_deductions: totalDeductions.toFixed(2),
        final_amount:     finalAmount.toFixed(2),
        bardan_issued:    bardanIssued,
        bardan_returned:  bardanReturned,
        bardan_remaining: bardanRemaining,
        bardan_penalty:   bardanPenalty.toFixed(2),
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
      quality_class, weight_unit
    } = req.body;

    // 1. Precise SR No Generation (Protocol D00001)
    const srNo = await generateDangarEntryCode(companyId);

    // 1b. Resolve System Accounts
    const dangarAccount = await queryOne('SELECT id FROM accounts WHERE account_code = "DS0001" AND company_id = ?', [companyId]);
    const bardanAccount = await queryOne('SELECT id FROM accounts WHERE account_code = "BS0001" AND company_id = ?', [companyId]);
    const dangarAccountId = dangarAccount?.id || null;
    const bardanAccountId = bardanAccount?.id || null;

    // 2. Commit Header State
    const result = await execute(`
      INSERT INTO dangar_entry (
        company_id, financial_year, book_type, sr_no, entry_date, 
        member_id, account_id, item_id, remark, vehicle_no, quality_class,
        total_kg, bardan, gun, gross_quintal, less_bardan, net_quintal,
        rate, amount, total_deduction, weight_unit, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId, currentFinancialYear, bookType, srNo, date,
      member_id, dangarAccountId, item_id, remark, vehicleNo, quality_class || '1st',
      total_kg, bardan, gun, gross_quintal, less_bardan, net_quintal,
      rate || 0, amount || 0, total_deduction || 0, weight_unit || 'kg', created_by || 1
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

    // 5. Commit to Unified Ledger
    // Fetch Item's Ledger Account Identity
    const itemData = await queryOne('SELECT purchase_account_id FROM item_master WHERE id = ?', [item_id]);
    const purchaseAccountId = itemData?.purchase_account_id || null;

    const ledgerDesc = `${bookType} Purchase - ${net_quintal} Qt @ ${rate}`;
    try {
      const targetLedgerAccId = purchaseAccountId || dangarAccountId;

      if (targetLedgerAccId) {
        // Full ledger entry with purchase or system account
        await execute(`
          INSERT INTO account_ledger (
            company_id, account_id, member_id, transaction_date, transaction_type, reference_type, 
            reference_id, reference_no, description, credit, financial_year
          ) VALUES (?, ?, ?, ?, 'cash_book', 'dangar_entry', ?, ?, ?, ?, ?)
        `, [
          companyId, targetLedgerAccId, member_id, date, entryId, srNo, ledgerDesc, 
          parseFloat(amount || 0), currentFinancialYear
        ]);
      } else {
        // Fallback — write ledger entry linked to member only
        await execute(`
          INSERT INTO account_ledger (
            company_id, member_id, transaction_date, transaction_type, reference_type, 
            reference_id, reference_no, description, credit, financial_year
          ) VALUES (?, ?, ?, 'cash_book', 'dangar_entry', ?, ?, ?, ?, ?)
        `, [
          companyId, member_id, date, entryId, srNo, ledgerDesc, 
          parseFloat(amount || 0), currentFinancialYear
        ]);
      }
    } catch (ledgerErr) {
      // Log but don't fail — dangar entry is already saved
      console.warn('Ledger sync warning (non-fatal):', ledgerErr.message);
    }

    // 6. Auto-Settle Bardan Balance (Jama Entry)
    // We credit the bags actually returned (returned_bags), not the remaining balance.
    if (returned_bags && parseFloat(returned_bags) > 0) {
      const member = await queryOne(`SELECT id, member_code, member_name FROM member_master WHERE id = ?`, [member_id]);
      if (member) {
        let settleRemark = `Dangar Settlement SR: ${srNo}`;
        await execute(`
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
      }
    }

    res.json({ success: true, data: { id: entryId, srNo } });
  } catch (error) {
    console.error('Dangar Entry Commit Error:', error);
    res.status(500).json({ success: false, error: 'Database Synchronization Failure: ' + error.message });
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
      'SELECT id, net_quintal, quality_class FROM dangar_entry WHERE item_id = ? AND financial_year = ? AND company_id = ?',
      [item_id, financial_year, company_id]
    );

    for (const entry of entries) {
      let activeRate = rates.rate;
      if (entry.quality_class === '2nd') activeRate = rates.winter_rate || rates.rate;
      else if (entry.quality_class === '3rd') activeRate = rates.summer_rate || rates.rate;

      const newAmount = parseFloat(entry.net_quintal || 0) * parseFloat(activeRate || 0);

      // Update Dangar Entry
      await execute(
        'UPDATE dangar_entry SET rate = ?, amount = ? WHERE id = ?',
        [activeRate, newAmount, entry.id]
      );

      // Update Ledger (Matching by reference_id and reference_type)
      await execute(
        'UPDATE account_ledger SET credit = ? WHERE reference_type = "cash_book" AND reference_id = ? AND company_id = ?',
        [newAmount, entry.id, company_id]
      );
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
    await execute('DELETE FROM dangar_weights WHERE entry_id = ?', [req.params.id]);
    await execute('DELETE FROM dangar_entry WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Dangar entry deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
