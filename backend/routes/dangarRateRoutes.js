import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// GET all rates root (Registry)
router.get('/', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const { year } = req.query;
    const currentYear = year || req.headers['x-financial-year'] || '2026-27';

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Context Required' });
    }

    const results = await query(
      `SELECT dr.*, im.item_name, im.item_code 
       FROM dangar_rates dr
       JOIN item_master im ON dr.item_id = im.id
       WHERE dr.company_id = ? AND dr.financial_year = ?`,
      [companyId, currentYear]
    );
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET all rates for a company and year
router.get('/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { year } = req.query; // e.g. 2026-27
    
    let sql = `
      SELECT dr.*, im.item_name, im.item_code 
      FROM dangar_rates dr
      JOIN item_master im ON dr.item_id = im.id
      WHERE dr.company_id = ?
    `;
    const params = [companyId];
    
    if (year) {
      sql += ' AND dr.financial_year = ?';
      params.push(year);
    }
    
    const results = await query(sql, params);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET rate for specific item and year
router.get('/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { year } = req.query;
    const companyId = req.headers['x-company-id'];

    const results = await query(
      'SELECT * FROM dangar_rates WHERE item_id = ? AND financial_year = ? AND company_id = ?',
      [itemId, year, companyId]
    );
    
    res.json({ success: true, data: results[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create or update rate
router.post('/', async (req, res) => {
  try {
    const { company_id, financial_year, item_id, rate, winter_rate, summer_rate } = req.body;
    
    const sql = `
      INSERT INTO dangar_rates (company_id, financial_year, item_id, rate, winter_rate, summer_rate)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        rate = VALUES(rate),
        winter_rate = VALUES(winter_rate),
        summer_rate = VALUES(summer_rate),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await query(sql, [company_id, financial_year, item_id, rate || 0, winter_rate || 0, summer_rate || 0]);
    res.json({ success: true, message: 'Rate upserted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
