import express from 'express';
import { query, execute, queryOne } from '../db.js';

const router = express.Router();

/**
 * GET ALL SABHASAD
 */
router.get('/', async (req, res) => {
  try {
    const company_id = req.headers['x-company-id'];
    const financial_year = req.headers['x-financial-year'] || '2026-27';

    if (!company_id) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const results = await query(
      `SELECT * FROM member_master 
       WHERE company_id = ? AND financial_year = ? 
       ORDER BY CAST(member_code AS UNSIGNED) ASC`,
      [company_id, financial_year]
    );
    res.json({ success: true, data: results || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET LAST CODE
 */
router.get('/last-code', async (req, res) => {
  try {
    const company_id = req.headers['x-company-id'];
    if (!company_id) return res.status(400).json({ error: 'Company ID required' });

    const rows = await query(
      "SELECT member_code FROM member_master WHERE company_id = ? ORDER BY id DESC LIMIT 1",
      [company_id]
    );
    const last = rows.length > 0 ? parseInt(rows[0].member_code) : 0;
    res.json({ lastCode: last });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * CREATE SABHASAD
 */
router.post('/', async (req, res) => {
  try {
    const company_id = req.headers['x-company-id'];
    const financial_year = req.headers['x-financial-year'] || '2026-27';
    
    if (!company_id) return res.status(400).json({ error: 'Company ID required' });

    const {
      sabhasadCode, sabhasadName, phoneNo, villageCode, villageName,
      fullAcNumber, bankName, branchName, accountType, addressNo,
      engName, nominalMember
    } = req.body;

    const result = await execute(
      `INSERT INTO member_master 
      (company_id, financial_year, member_code, member_name, phone, village_code, village_name, 
       full_ac_number, bank_name, branch_name, account_type, address_no, eng_name, nominal_member)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company_id, financial_year, sabhasadCode, sabhasadName, phoneNo || null, 
        villageCode || null, villageName || null, fullAcNumber || null, bankName || null, 
        branchName || null, accountType || null, addressNo || null, engName || null, nominalMember || null
      ]
    );

    res.status(201).json({ success: true, id: result.lastID });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * UPDATE SABHASAD
 */
router.put('/:id', async (req, res) => {
  try {
    const company_id = req.headers['x-company-id'];
    if (!company_id) return res.status(400).json({ error: 'Company ID required' });

    const {
      sabhasadCode, sabhasadName, phoneNo, villageCode, villageName,
      fullAcNumber, bankName, branchName, accountType, addressNo,
      engName, nominalMember
    } = req.body;

    await execute(
      `UPDATE member_master SET 
        member_code = ?, member_name = ?, phone = ?, village_code = ?, 
        village_name = ?, full_ac_number = ?, bank_name = ?, branch_name = ?, 
        account_type = ?, address_no = ?, eng_name = ?, nominal_member = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ?`,
      [
        sabhasadCode, sabhasadName, phoneNo, villageCode, villageName,
        fullAcNumber, bankName, branchName, accountType, addressNo,
        engName, nominalMember, req.params.id, company_id
      ]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET SINGLE SABHASAD
 */
router.get('/:id', async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM member_master WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: row });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE SABHASAD
 */
router.delete('/:id', async (req, res) => {
  try {
    const company_id = req.headers['x-company-id'];
    await execute('DELETE FROM member_master WHERE id = ? AND company_id = ?', [req.params.id, company_id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/code/:code', async (req, res) => {
  const company_id = req.headers['x-company-id'];
  const financial_year = req.headers['x-financial-year'];

  if (!company_id || !financial_year) {
    return res.status(400).json({ error: 'Company ID and Financial Year required' });
  }

  try {
    const member = await queryOne(
      'SELECT * FROM member_master WHERE member_code = ? AND company_id = ? AND financial_year = ?',
      [req.params.code, company_id, financial_year]
    );

    if (!member) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    res.json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
