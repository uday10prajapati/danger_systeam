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

    // 2. Commit Header State
    const result = await execute(`
      INSERT INTO dangar_entry (
        company_id, financial_year, book_type, sr_no, entry_date, 
        member_id, item_id, remark, vehicle_no, quality_class,
        total_kg, bardan, gun, gross_quintal, less_bardan, net_quintal,
        rate, amount, total_deduction, weight_unit, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId, currentFinancialYear, bookType, srNo, date,
      member_id, item_id, remark, vehicleNo, quality_class || '1st',
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

    // 5. Commit to Unified Ledger (Reflect in Rojmel & Member Balance)
    // In this flow, Dangar Entry acts as a cash purchase from the member
    // So we CREDIT the member (they provided goods, we owe them/paid them)
    
    // Fetch Item's Ledger Account Identity
    const itemData = await queryOne('SELECT purchase_account_id FROM item_master WHERE id = ?', [item_id]);
    const purchaseAccountId = itemData?.purchase_account_id || null;

    const ledgerDesc = `${bookType} Purchase - ${item_id} - ${net_quintal} Qt @ ${rate}`;
    await execute(`
      INSERT INTO account_ledger (
        company_id, account_id, member_id, transaction_date, transaction_type, reference_type, 
        reference_id, reference_no, description, credit, financial_year
      ) VALUES (?, ?, ?, ?, 'cash_book', 'cash_book', ?, ?, ?, ?, ?)
    `, [
      companyId, purchaseAccountId, member_id, date, entryId, srNo, ledgerDesc, 
      parseFloat(amount || 0), currentFinancialYear
    ]);

    // 6. Auto-Settle Bardan Balance (Jama Entry)
    // We credit the bags actually returned (returned_bags), not the remaining balance.
    if (returned_bags && parseFloat(returned_bags) > 0) {
      const member = await queryOne(`SELECT member_code, member_name FROM member_master WHERE id = ?`, [member_id]);
      if (member) {
        let settleRemark = `Dangar Settlement SR: ${srNo}`;
        await execute(`
          INSERT INTO jama_bardan_entry (
            company_id, financial_year, entry_date, 
            book_type, pavti_no, mem_nominal, code, name, qty, remark
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          companyId, currentFinancialYear, date,
          'J', srNo, 'S', member.member_code, member.member_name, parseFloat(returned_bags), settleRemark
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
