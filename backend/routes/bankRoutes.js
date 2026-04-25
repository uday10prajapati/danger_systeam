import express from 'express';
import { query, execute, queryOne } from '../db.js';

const router = express.Router();

/**
 * GET ALL BANKS
 */
router.get('/', async (req, res) => {
  try {
    const company_id = req.headers['x-company-id'];
    if (!company_id) return res.status(400).json({ error: 'Company ID required' });

    const results = await query(
      'SELECT * FROM banks WHERE company_id = ? ORDER BY bank_name ASC',
      [company_id]
    );
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * CREATE BANK
 */
router.post('/', async (req, res) => {
  try {
    const company_id = req.headers['x-company-id'];
    if (!company_id) return res.status(400).json({ error: 'Company ID required' });

    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Bank name required' });

    const result = await execute(
      'INSERT IGNORE INTO banks (company_id, bank_name) VALUES (?, ?)',
      [company_id, name]
    );

    res.status(201).json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE BANK
 */
router.delete('/:id', async (req, res) => {
  try {
    const company_id = req.headers['x-company-id'];
    await execute('DELETE FROM banks WHERE id = ? AND company_id = ?', [req.params.id, company_id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
