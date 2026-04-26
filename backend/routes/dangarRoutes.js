import express from 'express';
import { query, queryOne, execute } from '../db.js';

const router = express.Router();

// GET all dangar entries
router.get('/', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || req.query.companyId;
    const { startDate, endDate } = req.query;

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

    if (startDate && endDate) {
      sql += ` AND de.entry_date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    sql += ` ORDER BY de.entry_date DESC, de.id DESC LIMIT 500`;
    
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
      rate, amount, created_by, weights, deductions = [], remaining_bardan_bags
    } = req.body;

    // 1. Precise SR No Generation (Isolate by Company/Year)
    const lastEntry = await queryOne(`
      SELECT id FROM dangar_entry 
      WHERE company_id = ? AND financial_year = ? 
      ORDER BY id DESC LIMIT 1
    `, [companyId, currentFinancialYear]);
    
    const nextSr = (lastEntry?.id || 0) + 1;
    const srNo = `${bookType?.[0]?.toUpperCase() || 'D'}${String(nextSr).padStart(5, '0')}`;

    // 2. Commit Header State
    const result = await execute(`
      INSERT INTO dangar_entry (
        company_id, financial_year, book_type, sr_no, entry_date, 
        member_id, item_id, remark, vehicle_no,
        total_kg, bardan, gun, gross_quintal, less_bardan, net_quintal,
        rate, amount, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId, currentFinancialYear, bookType, srNo, date,
      member_id, item_id, remark, vehicleNo,
      total_kg, bardan, gun, gross_quintal, less_bardan, net_quintal,
      rate || 0, amount || 0, created_by || 1
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
    const ledgerDesc = `${bookType} Purchase - ${item_id} - ${net_quintal} Qt @ ${rate}`;
    await execute(`
      INSERT INTO account_ledger (
        company_id, member_id, transaction_date, transaction_type, reference_type, 
        reference_id, reference_no, description, credit, financial_year
      ) VALUES (?, ?, ?, 'cash_book', 'cash_book', ?, ?, ?, ?, ?)
    `, [
      companyId, member_id, date, entryId, srNo, ledgerDesc, 
      parseFloat(amount || 0), currentFinancialYear
    ]);

    // 6. Auto-Settle Bardan Balance (Jama Entry)
    if (remaining_bardan_bags && parseFloat(remaining_bardan_bags) > 0) {
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
          'J', srNo, 'S', member.member_code, member.member_name, parseFloat(remaining_bardan_bags), settleRemark
        ]);
      }
    }

    res.json({ success: true, data: { id: entryId, srNo } });
  } catch (error) {
    console.error('Dangar Entry Commit Error:', error);
    res.status(500).json({ success: false, error: 'Database Synchronization Failure: ' + error.message });
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
