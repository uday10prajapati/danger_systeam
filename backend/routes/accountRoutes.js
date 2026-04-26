import express from 'express';
import { query, queryOne, execute } from '../db.js';
import { validateAccount } from '../validators/accountValidator.js';
import { generateNextMemberCode } from '../utils/memberCodeGenerator.js';

const router = express.Router();

// ==================== LIST ALL ACCOUNTS (HEADER BASED) ====================
router.get('/', async (req, res) => {
  try {
    const company_id = req.headers['x-company-id'];
    if (!company_id) return res.status(400).json({ success: false, error: 'Company ID required' });

    const sql = `
       SELECT id, account_code, account_name, account_type, is_active, is_subledger FROM accounts 
       WHERE company_id = ? AND is_deleted = 0
       ORDER BY account_name ASC
    `;
    const accounts = await query(sql, [company_id]);
    res.json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GET LAST ACCOUNT CODE ====================
router.get('/last-code', async (req, res) => {
  try {
    const company_id = req.headers['x-company-id'];
    if (!company_id) return res.status(400).json({ success: false, error: 'Company ID required' });

    const result = await queryOne(
      `SELECT MAX(CAST(account_code AS UNSIGNED)) as last_code 
       FROM accounts 
       WHERE company_id = ? AND account_code REGEXP '^[0-9]+$'`,
      [company_id]
    );

    res.json({ success: true, lastCode: result?.last_code || 0 });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CREATE ACCOUNT ====================
router.post('/', async (req, res) => {
  try {
    const { company_id, account_code, account_name, account_type, phone, email, opening_balance, opening_balance_type, gst_no, tin_no, is_subledger } = req.body;

    // Credit balances are stored as negative numbers internally to differentiate
    let final_opening_balance = parseFloat(opening_balance || 0);
    if (opening_balance_type === 'credit') {
      final_opening_balance = -Math.abs(final_opening_balance);
    } else if (opening_balance_type === 'debit') {
      final_opening_balance = Math.abs(final_opening_balance);
    }

    // Validate input
    const error = validateAccount({ company_id, account_name, account_type, phone, email, opening_balance, gst_no, tin_no });
    if (error) {
      return res.status(400).json({ success: false, error });
    }

    // Check if account name already exists for this company
    const existingAccount = await queryOne(
      'SELECT id FROM accounts WHERE company_id = ? AND account_name = ? AND is_deleted = 0',
      [company_id, account_name]
    );

    if (existingAccount) {
      return res.status(400).json({ success: false, error: 'Account name already exists for this company' });
    }

    // Insert account
    const result = await execute(
      `INSERT INTO accounts (company_id, account_code, account_name, account_type, phone, email, gst_no, tin_no, opening_balance, is_active, is_subledger)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [company_id, account_code || null, account_name, account_type, phone || null, email || null, gst_no || null, tin_no || null, final_opening_balance, 1, is_subledger ? 1 : 0]
    );

    // If it's a cash account, inject the opening balance directly into Cashbook
    if (account_type === 'cash' && final_opening_balance !== 0) {
      const isDebit = final_opening_balance > 0;
      await execute(
        `INSERT INTO cash_book (company_id, transaction_date, reference_type, description, cash_in, cash_out)
         VALUES (?, CURRENT_DATE, 'OPENING_BALANCE', 'Opening Cash in Hand', ?, ?)`,
        [company_id, isDebit ? Math.abs(final_opening_balance) : 0, isDebit ? 0 : Math.abs(final_opening_balance)]
      );
    }

    // Auto generate member for customer accounts
    if (account_type === 'customer') {
      try {
        const nextCode = await generateNextMemberCode(company_id);
        await execute(
          `INSERT INTO member_master (company_id, account_id, member_code, member_name, phone, email, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [company_id, result.insertId, nextCode, account_name, phone || null, email || null, 1]
        );
      } catch (err) {
        console.error('Failed to auto-create member:', err);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      accountId: result.insertId,
      data: {
        id: result.insertId,
        company_id,
        account_name,
        account_type,
        phone: phone || null,
        email: email || null,
        gst_no: gst_no || null,
        tin_no: tin_no || null,
        opening_balance: opening_balance || 0,
        is_active: true,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Create account error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to create account' });
  }
});

// ==================== LIST ACCOUNTS BY COMPANY ====================
router.get('/company/:company_id', async (req, res) => {
  try {
    const { company_id } = req.params;
    const { type } = req.query; // Optional filter by account_type

    let sql = `
       SELECT * FROM (
         SELECT 
           CAST(a.id AS CHAR) as id, a.account_code, a.company_id, a.account_name, a.account_type, a.phone, a.email, a.gst_no, a.tin_no, 
           a.opening_balance, a.is_active, a.is_subledger, a.created_at, a.updated_at,
           COALESCE((SELECT SUM(COALESCE(debit, debit_amount, 0)) FROM account_ledger WHERE account_id = a.id AND company_id = a.company_id), 0) as total_debit,
           COALESCE((SELECT SUM(COALESCE(credit, credit_amount, 0)) FROM account_ledger WHERE account_id = a.id AND company_id = a.company_id), 0) as total_credit
         FROM accounts a
         WHERE a.company_id = ? AND a.is_deleted = 0
         
         UNION ALL
         
         SELECT 
           CONCAT('M', m.id) as id, m.member_code as account_code, m.company_id, m.member_name as account_name, 'member' as account_type, m.phone, NULL as email, NULL as gst_no, NULL as tin_no,
           0 as opening_balance, m.is_active, 0 as is_subledger, m.created_at, m.updated_at,
           COALESCE((SELECT SUM(COALESCE(debit, debit_amount, 0)) FROM account_ledger WHERE member_id = m.id AND company_id = m.company_id), 0) as total_debit,
           COALESCE((SELECT SUM(COALESCE(credit, credit_amount, 0)) FROM account_ledger WHERE member_id = m.id AND company_id = m.company_id), 0) as total_credit
         FROM member_master m
         WHERE m.company_id = ? AND m.account_id IS NULL
       ) unified
    `;
    let params = [company_id, company_id];

    if (type && type !== 'all') {
      sql += ' WHERE account_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY account_type ASC, account_name ASC';

    const accounts = await query(sql, params);

    const processedAccounts = accounts.map(acc => {
      const op = parseFloat(acc.opening_balance || 0);
      const cr = parseFloat(acc.total_credit || 0);
      const dr = parseFloat(acc.total_debit || 0);
      const closingBal = op + cr - dr;
      
      let balance_type = 'zero';
      if (closingBal > 0) balance_type = 'credit';
      else if (closingBal < 0) balance_type = 'debit';
      
      return {
        ...acc,
        closing_balance: Math.abs(closingBal),
        balance_type_raw: closingBal,
        balance_type
      };
    });

    res.json({
      success: true,
      data: processedAccounts,
      count: processedAccounts.length
    });
  } catch (error) {
    console.error('List accounts error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
  }
});

// ==================== GET ACCOUNT BALANCE STATS ====================
router.get('/:id/balance', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get account opening balance
    const account = await queryOne('SELECT opening_balance FROM accounts WHERE id = ?', [id]);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
    
    const openingBalance = parseFloat(account.opening_balance || 0);

    // Get total ledger debits and credits
    const ledgerStats = await queryOne(`
       SELECT 
         COALESCE(SUM(debit), 0) as total_debit,
         COALESCE(SUM(credit), 0) as total_credit
       FROM account_ledger
       WHERE account_id = ?
    `, [id]);

    const totalDebit = parseFloat(ledgerStats.total_debit || 0);
    const totalCredit = parseFloat(ledgerStats.total_credit || 0);
    
    res.json({
      success: true,
      data: {
        openingBalance,
        totalDebit,
        totalCredit
      }
    });

  } catch (error) {
    console.error('Balance error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch balance' });
  }
});

// ==================== GET SINGLE ACCOUNT ====================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const account = await queryOne(
      `SELECT id, account_code, company_id, account_name, account_type, phone, email, gst_no, tin_no, opening_balance, 
              is_active, created_at, updated_at
       FROM accounts 
       WHERE id = ? AND is_deleted = 0`,
      [id]
    );

    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    res.json({ success: true, data: account });
  } catch (error) {
    console.error('Get account error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch account' });
  }
});

// ==================== UPDATE ACCOUNT ====================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_code, account_name, phone, email, opening_balance, opening_balance_type, gst_no, tin_no, is_subledger } = req.body;

    let final_opening_balance = undefined;
    if (opening_balance !== undefined) {
      final_opening_balance = parseFloat(opening_balance || 0);
      if (opening_balance_type === 'credit') {
        final_opening_balance = -Math.abs(final_opening_balance);
      } else if (opening_balance_type === 'debit') {
        final_opening_balance = Math.abs(final_opening_balance);
      }
    }

    // Validate input
    const error = validateAccount({ account_name, phone, email, opening_balance, gst_no, tin_no }, true);
    if (error) {
      return res.status(400).json({ success: false, error });
    }

    // Check account exists
    const account = await queryOne(
      'SELECT id, company_id FROM accounts WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    // Check if new account name conflicts
    if (account_name) {
      const duplicate = await queryOne(
        'SELECT id FROM accounts WHERE company_id = ? AND account_name = ? AND id != ? AND is_deleted = 0',
        [account.company_id, account_name, id]
      );

      if (duplicate) {
        return res.status(400).json({ success: false, error: 'Account name already exists for this company' });
      }
    }

    // Update account
    await execute(
      `UPDATE accounts 
       SET account_code = COALESCE(?, account_code),
           account_name = COALESCE(?, account_name),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           gst_no = IF(? IS NOT NULL, ?, gst_no),
           tin_no = IF(? IS NOT NULL, ?, tin_no),
           opening_balance = COALESCE(?, opening_balance),
           is_subledger = IF(? IS NOT NULL, ?, is_subledger),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [account_code || null, account_name || null, phone || null, email || null, gst_no !== undefined ? gst_no : null, gst_no || null, tin_no !== undefined ? tin_no : null, tin_no || null, final_opening_balance !== undefined ? final_opening_balance : null, is_subledger !== undefined ? is_subledger : null, is_subledger ? 1 : 0, id]
    );

    const updatedAccount = await queryOne(
      'SELECT id, account_code, company_id, account_name, account_type, phone, email, gst_no, tin_no, opening_balance, is_active, created_at, updated_at FROM accounts WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Account updated successfully',
      data: updatedAccount
    });
  } catch (error) {
    console.error('Update account error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update account' });
  }
});

// ==================== DEACTIVATE ACCOUNT ====================
router.post('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;

    const account = await queryOne(
      'SELECT id, is_active FROM accounts WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    if (!account.is_active) {
      return res.status(400).json({ success: false, error: 'Account is already deactivated' });
    }

    await execute(
      'UPDATE accounts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate account error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to deactivate account' });
  }
});

// ==================== ACTIVATE ACCOUNT ====================
router.post('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    const account = await queryOne(
      'SELECT id, is_active FROM accounts WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    if (account.is_active) {
      return res.status(400).json({ success: false, error: 'Account is already active' });
    }

    await execute(
      'UPDATE accounts SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Account activated successfully'
    });
  } catch (error) {
    console.error('Activate account error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to activate account' });
  }
});

export default router;
