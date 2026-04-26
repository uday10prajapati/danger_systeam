import express from 'express';
import { execute, query, queryOne, getConnection } from '../db.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const connection = await getConnection();
  try {
    const companyId = req.header('x-company-id');
    const userId = req.header('x-user-id') || 1;

    if (!companyId) return res.status(400).json({ success: false, error: 'Company ID required' });

    const { voucher_date, voucher_type = 'JV', credits, debits, notes } = req.body;

    if (!credits || !debits || (credits.length === 0 && debits.length === 0)) {
       return res.status(400).json({ success: false, error: 'Credits and Debits are required' });
    }

    const totalCredit = credits.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const totalDebit = debits.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

    await connection.beginTransaction();

    // 1. Create journal voucher header
    const [jvRes] = await connection.execute(
       `INSERT INTO journal_vouchers (company_id, voucher_date, voucher_type, total_credit, total_debit, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
       [companyId, voucher_date, voucher_type, totalCredit, totalDebit, notes || '', userId]
    );

    const voucherId = jvRes.insertId;
    const refNo = `JV-${voucherId}`;

    // Helper to get account info
    const getAccInfo = async (accId) => {
       const [rows] = await connection.execute(`SELECT account_name, account_type, is_subledger FROM accounts WHERE id = ?`, [accId]);
       return rows[0] || null;
    };

    // 2. Insert Credits
    for (const item of credits) {
       const amt = parseFloat(item.amount || 0);
       await connection.execute(
          `INSERT INTO journal_voucher_items (voucher_id, type, account_id, amount, reference_no, member_id, particulars) VALUES (?, 'CREDIT', ?, ?, ?, ?, ?)`,
          [voucherId, item.account_id, amt, item.reference_no || null, item.member_id || null, item.particulars || '']
       );

       const accInfo = await getAccInfo(item.account_id);
       
       // Update Account Ledger (Credit)
       await connection.execute(
          `INSERT INTO account_ledger (company_id, account_id, credit_amount, credit, transaction_type, reference_no, transaction_date, description, created_by) VALUES (?, ?, ?, ?, 'JV', ?, ?, ?, ?)`,
          [companyId, item.account_id, amt, amt, refNo, voucher_date, item.particulars || '', userId]
       );

       // Update Member Ledger if subledger
       if (accInfo?.is_subledger && item.member_id) {
          await connection.execute(
             `INSERT INTO member_ledger (company_id, member_id, account_id, credit_amount, transaction_type, reference_no, transaction_date, particulars, created_by) VALUES (?, ?, ?, ?, 'JV', ?, ?, ?, ?)`,
             [companyId, item.member_id, item.account_id, amt, refNo, voucher_date, item.particulars || '', userId]
          );
       }

       // Update Cash Book if Cash or Bank Account
       if (accInfo?.account_type === 'cash' || accInfo?.account_type === 'bank') {
          const typeLabel = voucher_type.includes('CONTRA') ? 'CONTRA' : 'JV';
          await connection.execute(
             `INSERT INTO cash_book (company_id, transaction_date, reference_type, reference_id, reference_no, description, cash_out, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
             [companyId, voucher_date, typeLabel, voucherId, refNo, `${typeLabel} Credit - ${accInfo.account_name} - ${item.particulars || ''}`, amt, item.reference_no || '', userId]
          );
       }
    }

    // 3. Insert Debits
    for (const item of debits) {
       const amt = parseFloat(item.amount || 0);
       await connection.execute(
          `INSERT INTO journal_voucher_items (voucher_id, type, account_id, amount, reference_no, member_id, particulars) VALUES (?, 'DEBIT', ?, ?, ?, ?, ?)`,
          [voucherId, item.account_id, amt, item.reference_no || null, item.member_id || null, item.particulars || '']
       );

       const accInfo = await getAccInfo(item.account_id);

       // Update Account Ledger (Debit)
       await connection.execute(
          `INSERT INTO account_ledger (company_id, account_id, debit_amount, debit, transaction_type, reference_no, transaction_date, description, created_by) VALUES (?, ?, ?, ?, 'JV', ?, ?, ?, ?)`,
          [companyId, item.account_id, amt, amt, refNo, voucher_date, item.particulars || '', userId]
       );

       // Update Member Ledger if subledger
       if (accInfo?.is_subledger && item.member_id) {
          await connection.execute(
             `INSERT INTO member_ledger (company_id, member_id, account_id, debit_amount, transaction_type, reference_no, transaction_date, particulars, created_by) VALUES (?, ?, ?, ?, 'JV', ?, ?, ?, ?)`,
             [companyId, item.member_id, item.account_id, amt, refNo, voucher_date, item.particulars || '', userId]
          );
       }

       // Update Cash Book if Cash or Bank Account
       if (accInfo?.account_type === 'cash' || accInfo?.account_type === 'bank') {
          const typeLabel = voucher_type.includes('CONTRA') ? 'CONTRA' : 'JV';
          await connection.execute(
             `INSERT INTO cash_book (company_id, transaction_date, reference_type, reference_id, reference_no, description, cash_in, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
             [companyId, voucher_date, typeLabel, voucherId, refNo, `${typeLabel} Debit - ${accInfo.account_name} - ${item.particulars || ''}`, amt, item.reference_no || '', userId]
          );
       }
    }

    await connection.commit();
    res.status(201).json({ success: true, message: 'Voucher saved successfully', voucherId });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('JV POST Error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// GET: Fetch single JV with items
router.get('/:id', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const id = req.params.id;

    const vouchers = await query(`SELECT * FROM journal_vouchers WHERE id = ? AND company_id = ?`, [id, companyId]);
    if (!vouchers || vouchers.length === 0) return res.status(404).json({ success: false, error: 'Voucher not found' });

    const items = await query(`
      SELECT i.*, a.account_name, m.member_name
      FROM journal_voucher_items i
      JOIN accounts a ON i.account_id = a.id
      LEFT JOIN member_master m ON i.member_id = m.id
      WHERE i.voucher_id = ?
    `, [id]);

    const obj = {
      ...vouchers[0],
      credits: items.filter(it => it.type === 'CREDIT'),
      debits: items.filter(it => it.type === 'DEBIT')
    };

    res.json({ success: true, data: obj });
  } catch (error) {
    console.error('JV GET Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
