import express from 'express';
import { query, queryOne, execute } from '../db.js';
import { validateAccount } from '../validators/accountValidator.js';
import { generateNextMemberCode } from '../utils/memberCodeGenerator.js';
import { generateAccountCode } from '../utils/protocolCodeGenerator.js';

const router = express.Router();

// ==================== LIST ALL ACCOUNTS (HEADER BASED) ====================
router.get('/', async (req, res) => {
  try {
    const company_id = req.headers['x-company-id'];
    if (!company_id) return res.status(400).json({ success: false, error: 'Company ID required' });

    const sql = `
       SELECT id, account_code, account_name, account_type, is_active, is_subledger, is_system FROM accounts 
       WHERE company_id = ? AND is_deleted = 0
       ORDER BY account_name ASC
    `;
    const accounts = await query(sql, [company_id]);
    res.json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GET NEXT ACCOUNT CODE ====================
router.get('/next-code', async (req, res) => {
  try {
    const company_id = req.headers['x-company-id'];
    const { type } = req.query;
    if (!company_id) return res.status(400).json({ success: false, error: 'Company ID required' });
    if (!type) return res.status(400).json({ success: false, error: 'Account Type required' });

    const nextCode = await generateAccountCode(company_id, type);
    res.json({ success: true, nextCode });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GET NEXT ACCOUNT ID (Type-Specific Sequence) ====================
router.get('/next-id', async (req, res) => {
  try {
    const { type } = req.query;
    const company_id = req.headers['x-company-id'];
    if (!type) return res.status(400).json({ success: false, error: 'Account Type required' });
    if (!company_id) return res.status(400).json({ success: false, error: 'Company ID required' });

    const prefix = {
      'assets': 'A', 'liabilities': 'L', 'customer': 'C', 'supplier': 'S',
      'bank': 'BN', 'cash': 'CS', 'capital': 'CP', 'revenue': 'R',
      'expense': 'E', 'purchase': 'P', 'sales': 'SL'
    }[type.trim().toLowerCase()] || 'X';

    const result = await queryOne(
      `SELECT account_code FROM accounts 
       WHERE company_id = ? AND account_code LIKE ? 
       ORDER BY CAST(SUBSTRING(account_code, ?) AS UNSIGNED) DESC LIMIT 1`,
      [company_id, `${prefix}%`, prefix.length + 1]
    );

    let nextNumber = 1;
    if (result && result.account_code) {
      const currentNumber = parseInt(result.account_code.replace(prefix, ''), 10);
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1;
      }
    }

    res.json({ success: true, nextId: nextNumber });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== CREATE ACCOUNT ====================
router.post('/', async (req, res) => {
  try {
    let { company_id, account_code, account_name, account_type, phone, email, opening_balance, opening_balance_type, gst_no, tin_no, is_subledger } = req.body;

    // Auto-generate account code if missing
    if (!account_code || account_code === '') {
      account_code = await generateAccountCode(company_id, account_type);
    }

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
       SELECT 
         CAST(a.id AS CHAR) as id, a.account_code, m.member_code, a.company_id, a.account_name, a.account_type, a.phone, a.email, a.gst_no, a.tin_no, 
         a.opening_balance, a.is_active, a.is_subledger, a.is_system, a.created_at, a.updated_at,
         COALESCE((SELECT SUM(COALESCE(debit, debit_amount, 0)) FROM account_ledger WHERE account_id = a.id AND company_id = a.company_id), 0) as total_debit,
         COALESCE((SELECT SUM(COALESCE(credit, credit_amount, 0)) FROM account_ledger WHERE account_id = a.id AND company_id = a.company_id), 0) as total_credit
       FROM accounts a
       LEFT JOIN member_master m ON a.id = m.account_id
       WHERE a.company_id = ? AND a.is_deleted = 0
    `;
    let params = [company_id];

    if (type && type !== 'all') {
      sql += ' AND a.account_type = ?';
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

// ==================== GET ACCOUNT/MEMBER BALANCE STATS ====================
router.get('/:id/balance', async (req, res) => {
  try {
    const rawId = req.params.id;
    const companyId = req.headers['x-company-id'];

    const isMember = String(rawId).toUpperCase().startsWith('M');
    const dbId = isMember ? parseInt(rawId.slice(1), 10) : parseInt(rawId, 10);
    const identityCol = isMember ? 'member_id' : 'account_id';

    // 1. Get Opening Balance
    let openingBalance = 0;
    if (isMember) {
      const member = await queryOne('SELECT id FROM member_master WHERE id = ?', [dbId]);
      if (!member) return res.status(404).json({ success: false, error: 'Member not found' });
      // Members typically don't have an opening balance column in this schema, assume 0
      openingBalance = 0;
    } else {
      const account = await queryOne('SELECT COALESCE(opening_balance, 0) as opening_balance FROM accounts WHERE id = ?', [dbId]);
      if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
      openingBalance = parseFloat(account.opening_balance || 0);
    }

    // 2. Get total ledger debits and credits
    const ledgerStats = await queryOne(`
       SELECT 
         COALESCE(SUM(COALESCE(debit, debit_amount, 0)), 0) as total_debit,
         COALESCE(SUM(COALESCE(credit, credit_amount, 0)), 0) as total_credit
       FROM account_ledger
       WHERE ${identityCol} = ? AND (company_id = ? OR ? IS NULL)
    `, [dbId, companyId, companyId]);

    const totalDebit = parseFloat(ledgerStats.total_debit || 0);
    const totalCredit = parseFloat(ledgerStats.total_credit || 0);
    
    res.json({
      success: true,
      data: {
        openingBalance,
        totalDebit,
        totalCredit,
        currentBalance: openingBalance + totalDebit - totalCredit
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

    if (account.is_system) {
      return res.status(403).json({ success: false, error: 'System Protocol Account: Modification restricted by core security layer.' });
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

// ==================== DELETE ACCOUNT ====================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const account = await queryOne(
      'SELECT id, is_system FROM accounts WHERE id = ? AND is_deleted = 0',
      [id]
    );

    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    if (account.is_system) {
      return res.status(403).json({ success: false, error: 'Operation Denied: This account is a critical system dependency (Protocol Node).' });
    }

    await execute(
      'UPDATE accounts SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Account permanently removed from active registry'
    });
  } catch (error) {
    console.error('Delete account error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to purge account' });
  }
});

// ==================== GET ACCOUNT PROTOCOL AUDIT ====================
router.get('/:id/audit', async (req, res) => {
  try {
    const { id } = req.params;
    const { memberQuery } = req.query;
    
    // 1. Get Account Info
    const account = await queryOne('SELECT * FROM accounts WHERE id = ?', [id]);
    if (!account) return res.status(404).json({ success: false, error: 'Protocol Node not found' });

    // 2. Resolve target member/identity
    let targetMember = null;
    if (memberQuery) {
      // Search by Account P-code, Member Code, or Name
      targetMember = await queryOne(
        `SELECT m.id, COALESCE(m.member_code, a.account_code) as member_code, a.account_code, 
                COALESCE(m.member_name, a.account_name) as member_name 
         FROM accounts a
         LEFT JOIN member_master m ON a.id = m.account_id
         WHERE a.account_code = ? OR m.member_code = ? OR a.account_name LIKE ? LIMIT 1`,
        [memberQuery, memberQuery, `%${memberQuery}%`]
      );
    } else {
      // Default to the member linked directly to this account
      targetMember = await queryOne(
        `SELECT m.id, m.member_code, a.account_name as member_name FROM member_master m 
         LEFT JOIN accounts a ON m.account_id = a.id
         WHERE a.id = ?`, 
        [id]
      );
    }

    let dangarEntries = [];
    let bardanEntries = [];
    let ledgerEntries = [];

    // Define search identifiers
    const memberId = targetMember?.id || 0;
    const codes = [
       targetMember?.member_code, 
       targetMember?.account_code, 
       memberQuery
    ].filter(Boolean);

    if (targetMember || memberQuery) {
      // 3. Fetch Dangar entries (linked via member_id or member code)
      dangarEntries = await query(
        `SELECT de.*, im.item_name, mm.member_name FROM dangar_entry de 
         LEFT JOIN item_master im ON de.item_id = im.id
         LEFT JOIN member_master mm ON de.member_id = mm.id
         WHERE de.member_id = ? OR de.member_id IN (SELECT id FROM member_master WHERE member_code IN (?))
         ORDER BY de.entry_date DESC`,
        [memberId, codes.length > 0 ? codes : ['__NONE__']]
      );

      // 4. Fetch Bardan entries (linked via code)
      bardanEntries = await query(
        `SELECT * FROM bardan_entry WHERE code IN (?) ORDER BY entry_date DESC`,
        [codes.length > 0 ? codes : ['__NONE__']]
      );

      // 5. Fetch Account Ledger entries
      if (targetMember) {
        ledgerEntries = await query(
          `SELECT * FROM account_ledger 
           WHERE account_id = ? AND (member_id = ? OR member_id IS NULL)
           ORDER BY (COALESCE(transaction_date, created_at)) DESC`,
          [id, memberId]
        );
      }
    }

    res.json({
      success: true,
      data: {
        account,
        resolvedMember: targetMember,
        dangar: dangarEntries,
        bardan: bardanEntries,
        ledger: ledgerEntries
      }
    });
  } catch (error) {
    console.error('Audit Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
