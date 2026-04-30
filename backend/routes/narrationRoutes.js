import express from 'express';
import { query, queryOne, execute } from '../db.js';

const router = express.Router();

async function resolveCompanyId(req) {
  const raw = req.headers['x-company-id'];
  const parsed = raw !== undefined && raw !== null && raw !== '' ? Number.parseInt(String(raw), 10) : null;

  if (Number.isFinite(parsed) && parsed > 0) {
    const exists = await queryOne('SELECT id FROM company WHERE id = ?', [parsed]);
    return exists ? parsed : null;
  }

  const fallback = await queryOne('SELECT id FROM company LIMIT 1');
  return fallback?.id || null;
}

router.get('/', async (req, res) => {
  try {
    const company_id = await resolveCompanyId(req);
    if (!company_id) {
      return res.status(400).json({ success: false, error: 'Invalid company context. Please create/select company first.' });
    }

    const { type } = req.query;
    let sql = 'SELECT * FROM narrations WHERE company_id = ?';
    const params = [company_id];

    if (type) {
      sql += ' AND narration_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY id DESC';
    const results = await query(sql, params);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const company_id = await resolveCompanyId(req);
    const { narration_text, narration_code, narration_type } = req.body;
    if (!company_id) {
      return res.status(400).json({ success: false, error: 'Invalid company context. Please create/select company first.' });
    }
    if (!narration_text || !String(narration_text).trim()) {
      return res.status(400).json({ success: false, error: 'Narration text is required' });
    }

    // Check for duplicate narration text
    const existing = await queryOne(
      'SELECT id FROM narrations WHERE company_id = ? AND narration_text = ?',
      [company_id, narration_text]
    );
    if (existing) {
      return res.status(400).json({ success: false, error: 'Narration text already exists' });
    }

    await execute(
      'INSERT INTO narrations (company_id, narration_text, narration_code, narration_type) VALUES (?, ?, ?, ?)',
      [company_id, narration_text, narration_code, narration_type || 'JV']
    );
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const company_id = await resolveCompanyId(req);
    const { narration_text, narration_code, narration_type } = req.body;
    if (!company_id) {
      return res.status(400).json({ success: false, error: 'Invalid company context. Please create/select company first.' });
    }
    if (!narration_text || !String(narration_text).trim()) {
      return res.status(400).json({ success: false, error: 'Narration text is required' });
    }

    // Check for duplicate narration text (excluding current ID)
    const duplicate = await queryOne(
      'SELECT id FROM narrations WHERE company_id = ? AND narration_text = ? AND id != ?',
      [company_id, narration_text, req.params.id]
    );
    if (duplicate) {
      return res.status(400).json({ success: false, error: 'Narration text already exists' });
    }
    await execute(
      'UPDATE narrations SET narration_text = ?, narration_code = ?, narration_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?',
      [narration_text, narration_code, narration_type || 'JV', req.params.id, company_id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const company_id = await resolveCompanyId(req);
    if (!company_id) {
      return res.status(400).json({ success: false, error: 'Invalid company context. Please create/select company first.' });
    }
    await execute('DELETE FROM narrations WHERE id = ? AND company_id = ?', [req.params.id, company_id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
