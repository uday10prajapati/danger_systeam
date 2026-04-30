import express from 'express';
import { query, execute, queryOne } from '../db.js';

const router = express.Router();

const fetchMembers = async (companyId, financialYear) => {
  const safeOrderBy = `
    ORDER BY
      CASE WHEN member_code REGEXP '^[0-9]+$' THEN CAST(member_code AS UNSIGNED) ELSE 999999999 END,
      member_code ASC
  `;

  try {
    return await query(
      `SELECT * FROM member_master
       WHERE company_id = ? AND financial_year = ?
       ${safeOrderBy}`,
      [companyId, financialYear]
    );
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('unknown column') && message.includes('financial_year')) {
      return await query(
        `SELECT * FROM member_master
         WHERE company_id = ?
         ${safeOrderBy}`,
        [companyId]
      );
    }
    throw error;
  }
};

const resolveCompanyId = async (headerCompanyId) => {
  const normalizedHeaderId = Number(headerCompanyId);

  if (Number.isInteger(normalizedHeaderId) && normalizedHeaderId > 0) {
    const existing = await queryOne('SELECT id FROM company WHERE id = ?', [normalizedHeaderId]);
    if (existing?.id) return existing.id;
  }

  const company = await queryOne('SELECT id FROM company ORDER BY id ASC LIMIT 1');
  return company?.id || null;
};

const resolveFinancialYear = async (companyId, req) => {
  const headerYear = req.headers['x-financial-year'];
  const bodyYear = req.body?.financial_year || req.body?.financialYear;
  if (headerYear) return String(headerYear);
  if (bodyYear) return String(bodyYear);

  if (!companyId) return null;

  try {
    const fy = await queryOne(
      `SELECT year_label FROM financial_years
       WHERE company_id = ?
       ORDER BY is_active DESC, id DESC
       LIMIT 1`,
      [companyId]
    );
    return fy?.year_label || null;
  } catch {
    return null;
  }
};

/**
 * GET ALL SABHASAD
 */
router.get('/', async (req, res) => {
  try {
    const company_id = await resolveCompanyId(req.headers['x-company-id']);
    const financial_year = req.headers['x-financial-year'] || '2026-27';

    if (!company_id) {
      return res.json({ success: true, data: [] });
    }

    const results = await fetchMembers(company_id, financial_year);
    res.json({ success: true, data: results || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET SABHASAD BY COMPANY ID (Direct URL compatibility)
 */
router.get('/company/:companyId', async (req, res) => {
  try {
    const companyId = await resolveCompanyId(req.params.companyId);
    const financial_year = req.headers['x-financial-year'] || '2026-27';

    if (!companyId) {
      return res.json({ success: true, data: [] });
    }

    const results = await fetchMembers(companyId, financial_year);
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
    const company_id = await resolveCompanyId(req.headers['x-company-id'] || req.body?.company_id);
    const financial_year = await resolveFinancialYear(company_id, req);

    if (!company_id) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const company = await queryOne('SELECT id FROM company WHERE id = ?', [company_id]);
    if (!company) {
      return res.status(400).json({ success: false, error: 'Company not found. Please create company first.' });
    }

    if (!financial_year) {
      return res.status(400).json({ success: false, error: 'Financial year is required' });
    }

    const {
      sabhasadCode, sabhasadName, phoneNo, villageCode, villageName,
      fullAcNumber, bankName, branchName, accountType, addressNo,
      engName, nominalMember, ifscCode, bardanOpening, is_active
    } = req.body;

    // Check for duplicate name
    const existing = await queryOne(
      'SELECT id FROM member_master WHERE member_name = ? AND company_id = ?',
      [sabhasadName, company_id]
    );
    if (existing) {
      return res.status(400).json({ success: false, error: 'Member name already exists in this company.' });
    }

    const result = await execute(
      `INSERT INTO member_master 
      (company_id, financial_year, member_code, member_name, phone, village_code, village_name, 
       full_ac_number, bank_name, branch_name, account_type, address_no, eng_name, nominal_member, ifsc_code, bardan_opening, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company_id, financial_year, sabhasadCode, sabhasadName, phoneNo || null, 
        villageCode || null, villageName || null, fullAcNumber || null, bankName || null, 
        branchName || null, accountType || null, addressNo || null, engName || null, nominalMember || null, ifscCode || null, bardanOpening || 0, is_active !== undefined ? is_active : 1
      ]
    );

    res.status(201).json({ success: true, id: result.lastID });
  } catch (error) {
    if (String(error?.message || '').includes('foreign key constraint fails')) {
      return res.status(400).json({ success: false, error: 'Invalid company reference. Please create/select company first.' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * UPDATE SABHASAD
 */
router.put('/:id', async (req, res) => {
  try {
    const company_id = await resolveCompanyId(req.headers['x-company-id'] || req.body?.company_id);
    const financial_year = await resolveFinancialYear(company_id, req);
    if (!company_id) return res.status(400).json({ success: false, error: 'Company ID required' });
    if (!financial_year) return res.status(400).json({ success: false, error: 'Financial year is required' });

    const {
      sabhasadCode, sabhasadName, phoneNo, villageCode, villageName,
      fullAcNumber, bankName, branchName, accountType, addressNo,
      engName, nominalMember, ifscCode, bardanOpening, is_active
    } = req.body;

    // Check for duplicate name
    const existing = await queryOne(
      'SELECT id FROM member_master WHERE member_name = ? AND company_id = ? AND id != ?',
      [sabhasadName, company_id, req.params.id]
    );
    if (existing) {
      return res.status(400).json({ success: false, error: 'Member name already exists in this company.' });
    }

    await execute(
      `UPDATE member_master SET 
        member_code = ?, member_name = ?, phone = ?, village_code = ?, 
        village_name = ?, full_ac_number = ?, bank_name = ?, branch_name = ?, 
        account_type = ?, address_no = ?, eng_name = ?, nominal_member = ?,
        ifsc_code = ?, bardan_opening = ?, is_active = ?, financial_year = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND company_id = ?`,
      [
        sabhasadCode, sabhasadName, phoneNo, villageCode, villageName,
        fullAcNumber, bankName, branchName, accountType, addressNo,
        engName, nominalMember, ifscCode, bardanOpening || 0, is_active !== undefined ? is_active : 1, financial_year, req.params.id, company_id
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
    const member = await queryOne('SELECT id, company_id FROM member_master WHERE id = ?', [req.params.id]);
    if (!member) {
      return res.json({ success: true, deleted: 0, message: 'Member already removed' });
    }

    const resolvedCompanyId = await resolveCompanyId(req.headers['x-company-id']);
    const effectiveCompanyId = Number.isInteger(Number(resolvedCompanyId)) && Number(resolvedCompanyId) === Number(member.company_id)
      ? Number(resolvedCompanyId)
      : Number(member.company_id);

    let result = await execute('DELETE FROM member_master WHERE id = ? AND company_id = ?', [req.params.id, effectiveCompanyId]);

    if (!result?.changes) {
      result = await execute('DELETE FROM member_master WHERE id = ?', [req.params.id]);
    }

    if (!result?.changes) {
      return res.status(400).json({ success: false, error: 'Delete failed' });
    }

    res.json({ success: true, deleted: result.changes });
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
