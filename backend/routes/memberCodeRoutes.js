/**
 * Enhanced Member Routes with Numeric Code Support
 * Includes:
 * - Create member (auto-generate code)
 * - Get member by code
 * - Search members by code
 * - List all active members
 */

import express from 'express';
import { query, queryOne, execute } from '../db.js';
import {
  generateNextMemberCode,
  getMemberByCode,
  searchMembersByCode,
  getAllActiveMembers,
  formatMemberInfo
} from '../utils/memberCodeGenerator.js';

const router = express.Router();

/**
 * POST /api/members/with-code
 * Create new member with auto-generated member code
 */
router.post('/with-code', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const userId = req.header('x-user-id');

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const {
      member_name,
      member_address,
      member_gst_no,
      account_id,
      is_active = true
    } = req.body;

    // Validation
    if (!member_name || member_name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Member name is required' });
    }

    // Generate next member code
    const memberCode = await generateNextMemberCode(companyId);

    // Insert member with auto-generated code
    const result = await execute(
      `INSERT INTO member_master 
       (company_id, member_code, member_name, member_address, member_gst_no, account_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [companyId, memberCode, member_name, member_address || null, member_gst_no || null, account_id || null, is_active]
    );

    // Fetch created member
    const member = await queryOne(
      `SELECT * FROM member_master WHERE id = ?`,
      [result.lastID]
    );

    return res.status(201).json({
      success: true,
      data: member,
      message: `Member created with code: ${memberCode}`
    });

  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/members/by-code/:memberCode
 * Get member by member code
 */
router.get('/by-code/:memberCode', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const { memberCode } = req.params;

    const member = await getMemberByCode(companyId, memberCode);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: `Member with code ${memberCode} not found or inactive`
      });
    }

    return res.json({
      success: true,
      data: member
    });

  } catch (error) {
    console.error('Get member by code error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/members/search-code
 * Search members by code (autocomplete support)
 * Query: ?code=1&limit=10
 */
router.get('/search-code', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const { code, limit = 10 } = req.query;

    if (!code || code.trim() === '') {
      return res.json({ success: true, data: [] });
    }

    const members = await searchMembersByCode(companyId, code, Math.min(limit, 50));

    return res.json({
      success: true,
      data: members,
      count: members.length
    });

  } catch (error) {
    console.error('Search members error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/members/active-list
 * Get all active members with codes
 */
router.get('/active-list', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const members = await getAllActiveMembers(companyId);

    return res.json({
      success: true,
      data: members,
      count: members.length
    });

  } catch (error) {
    console.error('Get active members error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/members/:id
 * Update member (except member_code)
 */
router.put('/:id', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const memberId = req.params.id;
    const {
      member_name,
      member_address,
      member_gst_no,
      account_id,
      is_active
    } = req.body;

    // Verify member exists and belongs to company
    const existing = await queryOne(
      `SELECT id FROM member_master WHERE id = ? AND company_id = ?`,
      [memberId, companyId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (member_name !== undefined) {
      updates.push('member_name = ?');
      values.push(member_name);
    }
    if (member_address !== undefined) {
      updates.push('member_address = ?');
      values.push(member_address);
    }
    if (member_gst_no !== undefined) {
      updates.push('member_gst_no = ?');
      values.push(member_gst_no);
    }
    if (account_id !== undefined) {
      updates.push('account_id = ?');
      values.push(account_id);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(memberId);

    const updateSql = `UPDATE member_master SET ${updates.join(', ')} WHERE id = ?`;

    await execute(updateSql, values);

    // Fetch updated member
    const member = await queryOne(
      `SELECT * FROM member_master WHERE id = ?`,
      [memberId]
    );

    return res.json({
      success: true,
      data: member,
      message: 'Member updated successfully'
    });

  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/members/:id
 * Soft delete member (set is_active = false)
 */
router.delete('/:id', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const memberId = req.params.id;

    // Verify member exists
    const existing = await queryOne(
      `SELECT member_code FROM member_master WHERE id = ? AND company_id = ?`,
      [memberId, companyId]
    );

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    // Soft delete
    await execute(
      `UPDATE member_master SET is_active = FALSE WHERE id = ?`,
      [memberId]
    );

    return res.json({
      success: true,
      message: `Member ${existing.member_code} deactivated successfully`
    });

  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
