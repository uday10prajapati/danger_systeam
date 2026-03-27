/**
 * Member Code Generator Utility
 * Handles auto-generation of numeric member codes per company
 */

import { query, queryOne } from '../db.js';

/**
 * Generate next member code for a company
 * Gets MAX(member_code) and increments by 1
 * If no members exist, returns 1
 * 
 * @param {number} companyId - Company ID
 * @returns {Promise<number>} Next member code
 */
export async function generateNextMemberCode(companyId) {
  try {
    // Get current max member code for this company
    const result = await queryOne(
      `SELECT MAX(member_code) as max_code FROM member_master WHERE company_id = ? AND member_code IS NOT NULL`,
      [companyId]
    );

    // If no members exist or max_code is null, start from 1
    const maxCode = result?.max_code || 0;
    const nextCode = maxCode + 1;

    return nextCode;
  } catch (error) {
    console.error('Error generating member code:', error);
    throw error;
  }
}

/**
 * Validate member code format
 * Member code must be numeric
 * 
 * @param {number|string} memberCode - Member code to validate
 * @returns {boolean} True if valid
 */
export function validateMemberCode(memberCode) {
  const code = Number(memberCode);
  return !isNaN(code) && code > 0 && Number.isInteger(code);
}

/**
 * Get member by member code
 * Includes all member details
 * 
 * @param {number} companyId - Company ID
 * @param {number} memberCode - Member code to search
 * @returns {Promise<object|null>} Member object or null
 */
export async function getMemberByCode(companyId, memberCode) {
  try {
    if (!validateMemberCode(memberCode)) {
      throw new Error('Invalid member code format');
    }

    const member = await queryOne(
      `SELECT 
        id,
        company_id,
        member_code,
        member_name,
        member_address,
        member_gst_no,
        account_id,
        is_active,
        created_at,
        updated_at
       FROM member_master
       WHERE company_id = ? AND member_code = ? AND is_active = 1
      `,
      [companyId, Number(memberCode)]
    );

    return member || null;
  } catch (error) {
    console.error('Error fetching member by code:', error);
    throw error;
  }
}

/**
 * Search members by code (partial match)
 * Useful for autocomplete/dropdown
 * 
 * @param {number} companyId - Company ID
 * @param {string} searchCode - Member code to search (can be partial)
 * @param {number} limit - Max results (default: 10)
 * @returns {Promise<array>} Array of matching members
 */
export async function searchMembersByCode(companyId, searchCode, limit = 10) {
  try {
    if (!searchCode || searchCode.trim() === '') {
      return [];
    }

    const searchTerm = `${searchCode}%`;
    
    const members = await query(
      `SELECT 
        id,
        member_code,
        member_name,
        member_address,
        member_gst_no,
        is_active
       FROM member_master
       WHERE company_id = ? AND member_code LIKE ? AND is_active = 1
       ORDER BY member_code ASC
       LIMIT ?
      `,
      [companyId, searchTerm, limit]
    );

    return members || [];
  } catch (error) {
    console.error('Error searching members by code:', error);
    throw error;
  }
}

/**
 * Check if member code exists and is unique
 * 
 * @param {number} companyId - Company ID
 * @param {number} memberCode - Member code to check
 * @returns {Promise<boolean>} True if code already exists
 */
export async function memberCodeExists(companyId, memberCode) {
  try {
    const result = await queryOne(
      `SELECT id FROM member_master WHERE company_id = ? AND member_code = ?`,
      [companyId, memberCode]
    );
    return result !== null;
  } catch (error) {
    console.error('Error checking member code existence:', error);
    throw error;
  }
}

/**
 * Get all active members for a company (with codes)
 * Useful for dropdown lists
 * 
 * @param {number} companyId - Company ID
 * @returns {Promise<array>} Array of members
 */
export async function getAllActiveMembers(companyId) {
  try {
    const members = await query(
      `SELECT 
        id,
        member_code,
        member_name,
        member_address,
        member_gst_no,
        account_id
       FROM member_master
       WHERE company_id = ? AND is_active = 1
       ORDER BY member_code ASC
      `,
      [companyId]
    );

    return members || [];
  } catch (error) {
    console.error('Error fetching all members:', error);
    throw error;
  }
}

/**
 * Format member info for display
 * 
 * @param {object} member - Member object
 * @returns {string} Formatted member info
 */
export function formatMemberInfo(member) {
  if (!member) return '';
  return `${member.member_code} - ${member.member_name}${member.member_gst_no ? ` (${member.member_gst_no})` : ''}`;
}

export default {
  generateNextMemberCode,
  validateMemberCode,
  getMemberByCode,
  searchMembersByCode,
  memberCodeExists,
  getAllActiveMembers,
  formatMemberInfo
};
