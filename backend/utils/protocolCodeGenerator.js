import { queryOne } from '../db.js';

/**
 * Protocol Code Generator Utility
 * Handles auto-generation of prefixed codes for accounts and transactions
 */

const PREFIX_MAP = {
  'assets': 'A',
  'liabilities': 'L',
  'customer': 'C',
  'supplier': 'S',
  'vendor': 'V',
  'bank': 'BN',
  'cash': 'CS',
  'capital': 'CP',
  'revenue': 'R',
  'expense': 'E',
  'purchase': 'P',
  'sales': 'SL'
};

/**
 * Generate next account code based on type
 * Example: A0001, L0001
 */
export async function generateAccountCode(companyId, accountType) {
  try {
    const prefix = PREFIX_MAP[accountType.trim().toLowerCase()] || 'X';
    
    // Find highest current code with this prefix
    const result = await queryOne(
      `SELECT account_code FROM accounts 
       WHERE company_id = ? AND account_code LIKE ? 
       ORDER BY CAST(SUBSTRING(account_code, ?) AS UNSIGNED) DESC LIMIT 1`,
      [companyId, `${prefix}%`, prefix.length + 1]
    );

    let nextNumber = 1;
    if (result && result.account_code) {
      const currentNumber = parseInt(result.account_code.replace(prefix, ''), 10);
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1;
      }
    }

    // Pad to 4 digits: A0001
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating account code:', error);
    return null;
  }
}

/**
 * Generate next Dangar Entry code (D00001)
 */
export async function generateDangarEntryCode(companyId) {
  try {
    const prefix = 'D';
    const result = await queryOne(
      `SELECT sr_no FROM dangar_entry 
       WHERE company_id = ? AND sr_no LIKE 'D%' 
       ORDER BY CAST(SUBSTRING(sr_no, 2) AS UNSIGNED) DESC LIMIT 1`,
      [companyId]
    );

    let nextNumber = 1;
    if (result && result.sr_no) {
      const currentNumber = parseInt(result.sr_no.replace('D', ''), 10);
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(5, '0')}`;
  } catch (error) {
    console.error('Error generating Dangar code:', error);
    return null;
  }
}

/**
 * Generate next Bardan Entry code (B0001)
 */
export async function generateBardanEntryCode(companyId) {
  try {
    const prefix = 'B';
    const result = await queryOne(
      `SELECT pavti_no FROM bardan_entry 
       WHERE company_id = ? AND pavti_no LIKE 'B%' 
       ORDER BY CAST(SUBSTRING(pavti_no, 2) AS UNSIGNED) DESC LIMIT 1`,
      [companyId]
    );

    let nextNumber = 1;
    if (result && result.pavti_no) {
      const currentNumber = parseInt(result.pavti_no.replace('B', ''), 10);
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating Bardan code:', error);
    return null;
  }
}

export default {
  generateAccountCode,
  generateDangarEntryCode,
  generateBardanEntryCode
};
