import express from 'express';
import { query, execute } from '../db.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Validation middleware
const validateCreateMember = [
  body('account_id')
    .notEmpty().withMessage('Account is required')
    .isInt().withMessage('Account ID must be a number'),
  body('member_name')
    .notEmpty().withMessage('Member name is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Member name must be 2-100 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[0-9\-\+\(\)\s]+$/).withMessage('Invalid phone format')
    .isLength({ min: 10 }).withMessage('Phone must be at least 10 digits'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Invalid email format'),
  body('discount_percentage')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0-100'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: errors.array()[0].msg 
    });
  }
  next();
};

/**
 * CREATE MEMBER
 * POST /api/members
 */
router.post('/', validateCreateMember, handleValidationErrors, async (req, res) => {
  try {
    const { account_id, member_name, phone, email, discount_percentage } = req.body;
    const company_id = req.headers['x-company-id'];
    
    if (!company_id) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }

    // Check if account exists and is type 'customer'
    const accounts = await query(
      'SELECT id, account_type FROM accounts WHERE id = ? AND account_type = ? AND company_id = ?',
      [account_id, 'customer', company_id]
    );

    if (!accounts || accounts.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid account. Only customer-type accounts can be members.' 
      });
    }

    // Generate member code
    const memberCode = `MEM-${company_id}-${Date.now()}`;

    // Insert member
    await execute(
      'INSERT INTO member_master (company_id, account_id, member_code, member_name, phone, email, discount_percentage) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [company_id, account_id, memberCode, member_name, phone || null, email || null, discount_percentage || 0]
    );

    // Get the inserted member
    const members = await query(
      'SELECT * FROM member_master WHERE member_code = ?',
      [memberCode]
    );

    res.status(201).json({
      success: true,
      data: members[0]
    });
  } catch (error) {
    if (error.message.includes('UNIQUE') || error.message.includes('Duplicate')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone or email already exists for this company' 
      });
    }
    console.error('Create member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET MEMBERS BY COMPANY
 * GET /api/members/company/:companyId
 */
router.get('/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { active } = req.query;

    let sql = `
      SELECT 
        m.id, m.company_id, m.account_id, m.member_code, m.member_name,
        m.phone, m.email, m.discount_percentage, m.loyalty_points,
        m.is_active, m.created_at, a.account_name, a.account_type
      FROM member_master m
      INNER JOIN accounts a ON m.account_id = a.id
      WHERE m.company_id = ?
    `;

    const params = [companyId];

    if (active === 'true') {
      sql += ' AND m.is_active = 1';
    } else if (active === 'false') {
      sql += ' AND m.is_active = 0';
    }

    sql += ' ORDER BY m.created_at DESC';

    const results = await query(sql, params);
    res.json({ success: true, data: results || [] });
  } catch (error) {
    console.error('List members error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET SINGLE MEMBER
 * GET /api/members/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const results = await query(
      `SELECT m.*, a.account_name, a.account_type
       FROM member_master m
       INNER JOIN accounts a ON m.account_id = a.id
       WHERE m.id = ?`,
      [id]
    );

    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    res.json({ success: true, data: results[0] });
  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * UPDATE MEMBER
 * PUT /api/members/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { member_name, phone, email, discount_percentage } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];

    if (member_name !== undefined) {
      updates.push('member_name = ?');
      values.push(member_name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone || null);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email || null);
    }
    if (discount_percentage !== undefined) {
      updates.push('discount_percentage = ?');
      values.push(discount_percentage);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE member_master SET ${updates.join(', ')} WHERE id = ?`;
    
    await execute(sql, values);
    res.json({ success: true, message: 'Member updated successfully' });
  } catch (error) {
    if (error.message.includes('UNIQUE') || error.message.includes('Duplicate')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone or email already exists' 
      });
    }
    console.error('Update member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ACTIVATE MEMBER
 * POST /api/members/:id/activate
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    await execute('UPDATE member_master SET is_active = 1 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Member activated successfully' });
  } catch (error) {
    console.error('Activate member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DEACTIVATE MEMBER
 * POST /api/members/:id/deactivate
 */
router.post('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    await execute('UPDATE member_master SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Member deactivated successfully' });
  } catch (error) {
    console.error('Deactivate member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * UPDATE LOYALTY POINTS
 * POST /api/members/:id/update-loyalty
 */
router.post('/:id/update-loyalty', async (req, res) => {
  try {
    const { id } = req.params;
    const { points_to_add } = req.body;

    if (!points_to_add || isNaN(points_to_add)) {
      return res.status(400).json({ success: false, error: 'Valid points value required' });
    }

    await execute(
      'UPDATE member_master SET loyalty_points = loyalty_points + ? WHERE id = ?',
      [parseInt(points_to_add), id]
    );

    res.json({ success: true, message: 'Loyalty points updated' });
  } catch (error) {
    console.error('Update loyalty error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
export default router;
