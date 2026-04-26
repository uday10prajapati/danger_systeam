import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// GET all seasons for a company
router.get('/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { year } = req.query;
    
    let sql = 'SELECT * FROM seasons WHERE company_id = ?';
    const params = [companyId];
    
    if (year) {
      sql += ' AND financial_year = ?';
      params.push(year);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const results = await query(sql, params);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create season
router.post('/', async (req, res) => {
  try {
    const { company_id, name, season_type, financial_year } = req.body;
    
    if (!company_id || !name || !season_type || !financial_year) {
        return res.status(400).json({ success: false, error: 'Missing Required Fields' });
    }

    const sql = `
      INSERT INTO seasons (company_id, name, season_type, financial_year)
      VALUES (?, ?, ?, ?)
    `;
    
    const result = await query(sql, [company_id, name, season_type, financial_year]);
    res.json({ success: true, message: 'Season registered successfully', id: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE season
router.delete('/:id', async (req, res) => {
    try {
        await query('DELETE FROM seasons WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Season deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
