import express from 'express';
import { query, queryOne, execute } from '../db.js';

const router = express.Router();

// GET bardan price (company-scoped)
router.get('/', async (req, res) => {
  try {
    const company_id = req.headers['x-company-id'];
    if (!company_id) return res.status(400).json({ success: false, error: 'Company ID required' });

    const row = await queryOne(
      'SELECT * FROM bardan_price_master WHERE company_id = ? LIMIT 1',
      [company_id]
    );
    res.json({ success: true, data: row || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST set/update bardan price
router.post('/', async (req, res) => {
  try {
    const company_id = req.headers['x-company-id'];
    const { price_per_bardan } = req.body;

    if (!company_id) return res.status(400).json({ success: false, error: 'Company ID required' });
    if (!price_per_bardan || isNaN(price_per_bardan)) {
      return res.status(400).json({ success: false, error: 'Valid price required' });
    }

    const existing = await queryOne('SELECT id FROM bardan_price_master WHERE company_id = ?', [company_id]);
    if (existing) {
      await execute(
        'UPDATE bardan_price_master SET price_per_bardan = ?, updated_at = CURRENT_TIMESTAMP WHERE company_id = ?',
        [parseFloat(price_per_bardan), company_id]
      );
    } else {
      await execute(
        'INSERT INTO bardan_price_master (company_id, price_per_bardan) VALUES (?, ?)',
        [company_id, parseFloat(price_per_bardan)]
      );
    }

    res.json({ success: true, message: 'Bardan price updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
