import express from 'express';
import { query, queryOne, execute } from '../db.js';
import { validateAccount } from '../validators/accountValidator.js';

const router = express.Router();

// ==================== CREATE ACCOUNT ====================
router.post('/api/accounts', async (req, res) => {
  try {
    const { company_id, account_name, account_type, phone, email, opening_balance, gst_no, tin_no } = req.body;

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
      `INSERT INTO accounts (company_id, account_name, account_type, phone, email, gst_no, tin_no, opening_balance, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [company_id, account_name, account_type, phone || null, email || null, gst_no || null, tin_no || null, opening_balance || 0, 1]
    );

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
router.get('/api/accounts/company/:company_id', async (req, res) => {
  try {
    const { company_id } = req.params;
    const { type } = req.query; // Optional filter by account_type

    let sql = `SELECT id, company_id, account_name, account_type, phone, email, gst_no, tin_no, opening_balance, 
                      is_active, created_at, updated_at
               FROM accounts 
               WHERE company_id = ? AND is_deleted = 0`;
    let params = [company_id];

    if (type && type !== 'all') {
      sql += ' AND account_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY account_type ASC, account_name ASC';

    const accounts = await query(sql, params);

    res.json({
      success: true,
      data: accounts,
      count: accounts.length
    });
  } catch (error) {
    console.error('List accounts error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
  }
});

// ==================== GET SINGLE ACCOUNT ====================
router.get('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const account = await queryOne(
      `SELECT id, company_id, account_name, account_type, phone, email, gst_no, tin_no, opening_balance, 
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

// ==================== GET ACCOUNT BALANCE STATS ====================
router.get('/api/accounts/:id/balance', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get account opening balance
    const account = await queryOne('SELECT opening_balance FROM accounts WHERE id = ?', [id]);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
    
    const openingBalance = parseFloat(account.opening_balance || 0);

    // Get total ledger debits and credits
    const ledgerStats = await queryOne(`
       SELECT 
         COALESCE(SUM(debit_amount), 0) as total_debit,
         COALESCE(SUM(credit_amount), 0) as total_credit
       FROM account_ledger
       WHERE account_id = ?
    `, [id]);

    const totalDebit = parseFloat(ledgerStats.total_debit || 0);
    const totalCredit = parseFloat(ledgerStats.total_credit || 0);
    
    // Assuming Opening Balance is Credit as seen in Rojmel (since liabilities/members are often Credit)
    // Wait, let's just send the raw values and calculate closing balance in UI or here.
    // If it's pure mathematical balance: Op Bal + Debit - Credit ? (If Debit balance)
    // Co-op banking usually: Members = Liabilities = Credit balances. 
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

// ==================== UPDATE ACCOUNT ====================
router.put('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_name, phone, email, opening_balance, gst_no, tin_no } = req.body;

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
       SET account_name = COALESCE(?, account_name),
           phone = COALESCE(?, phone),
           email = COALESCE(?, email),
           gst_no = IF(? IS NOT NULL, ?, gst_no),
           tin_no = IF(? IS NOT NULL, ?, tin_no),
           opening_balance = COALESCE(?, opening_balance),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [account_name || null, phone || null, email || null, gst_no !== undefined ? gst_no : null, gst_no || null, tin_no !== undefined ? tin_no : null, tin_no || null, opening_balance !== undefined ? opening_balance : null, id]
    );

    const updatedAccount = await queryOne(
      'SELECT id, company_id, account_name, account_type, phone, email, gst_no, tin_no, opening_balance, is_active, created_at, updated_at FROM accounts WHERE id = ?',
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
router.post('/api/accounts/:id/deactivate', async (req, res) => {
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
router.post('/api/accounts/:id/activate', async (req, res) => {
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
