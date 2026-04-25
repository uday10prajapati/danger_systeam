import express from 'express';
import { query, queryOne, execute } from '../db.js';

const router = express.Router();

// GET all dangar entries
router.get('/', async (req, res) => {
  try {
    const { companyId, startDate, endDate } = req.query;
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

    sql += ` ORDER BY de.entry_date DESC, de.id DESC`;
    
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
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    const weights = await query('SELECT * FROM dangar_weights WHERE entry_id = ? ORDER BY sr_no ASC', [req.params.id]);
    entry.weights = weights;

    res.json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create new dangar entry
router.post('/', async (req, res) => {
  try {
    const { 
      company_id, financial_year, bookType, date, 
      member_id, item_id, remark, vehicleNo,
      total_kg, bardan, gun, gross_quintal, less_bardan, net_quintal,
      rate, amount,
      created_by, weights 
    } = req.body;

    // 1. Generate SR No (Simple AUTO logic for now)
    const lastEntry = await queryOne('SELECT id FROM dangar_entry ORDER BY id DESC LIMIT 1');
    const srNo = `DNG-${(lastEntry?.id || 0) + 1}`;

    // 2. Insert Header
    const result = await execute(`
      INSERT INTO dangar_entry (
        company_id, financial_year, book_type, sr_no, entry_date, 
        member_id, item_id, remark, vehicle_no,
        total_kg, bardan, gun, gross_quintal, less_bardan, net_quintal,
        rate, amount,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      company_id, financial_year || '2026-27', bookType, srNo, date,
      member_id, item_id, remark, vehicleNo,
      total_kg, bardan, gun, gross_quintal, less_bardan, net_quintal,
      rate || 0, amount || 0,
      created_by
    ]);

    const entryId = result.insertId || result.lastID;

    // 3. Insert Weights
    if (weights && weights.length > 0) {
      for (const [idx, w] of weights.entries()) {
        if (w.wgt) {
          await execute(
            'INSERT INTO dangar_weights (entry_id, sr_no, weight) VALUES (?, ?, ?)',
            [entryId, idx + 1, w.wgt]
          );
        }
      }
    }

    res.json({ success: true, data: { id: entryId, srNo } });
  } catch (error) {
    console.error('Create dangar entry error:', error);
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
