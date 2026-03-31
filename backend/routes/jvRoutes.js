import express from 'express';
import { execute, query, queryOne } from '../db.js';

const router = express.Router();

router.post('/', async (req, res) => {
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

    // Create journal voucher header
    const jvRes = await execute(
      `INSERT INTO journal_vouchers (company_id, voucher_date, voucher_type, total_credit, total_debit, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [companyId, voucher_date, voucher_type, totalCredit, totalDebit, notes || '', userId]
    );

    const voucherId = jvRes.lastID;
    const refNo = `JV-${voucherId}`;

    // Helper to get account info
    const getAccountInfo = async (accId) => {
      const accList = await query(`SELECT account_name, account_type FROM accounts WHERE id = ?`, [accId]);
      return accList[0] || null;
    };

    // Insert Credits (Decrease Asset / Increase Liability)
    for (const item of credits) {
      await execute(
        `INSERT INTO journal_voucher_items (voucher_id, type, account_id, amount, reference_no, member_id, particulars) VALUES (?, 'CREDIT', ?, ?, ?, ?, ?)`,
        [voucherId, item.account_id, item.amount, item.reference_no || null, item.member_id || null, item.particulars || '']
      );

      const accInfo = await getAccountInfo(item.account_id);
      
      // Update Account Ledger (Credit)
      await execute(
        `INSERT INTO account_ledger (company_id, account_id, credit_amount, transaction_type, reference_no, transaction_date, created_by) VALUES (?, ?, ?, 'JV', ?, ?, ?)`,
        [companyId, item.account_id, item.amount, refNo, voucher_date, userId]
      );

      // If it's a Cash Account, update Cash Book (Credit Cash = Cash Out)
      if (accInfo && accInfo.account_type === 'cash') {
        await execute(
          `INSERT INTO cash_book (company_id, transaction_date, reference_type, reference_id, reference_no, description, cash_out, notes, created_by) VALUES (?, ?, 'JV', ?, ?, ?, ?, ?, ?)`,
          [companyId, voucher_date, voucherId, refNo, `JV Credit - ${accInfo.account_name} - ${item.particulars || ''}`, item.amount, item.reference_no || '', userId]
        );
      }
    }

    // Insert Debits (Increase Asset / Decrease Liability)
    for (const item of debits) {
      await execute(
        `INSERT INTO journal_voucher_items (voucher_id, type, account_id, amount, reference_no, particulars) VALUES (?, 'DEBIT', ?, ?, ?, ?)`,
        [voucherId, item.account_id, item.amount, item.reference_no || null, item.particulars || '']
      );

      const accInfo = await getAccountInfo(item.account_id);

      // Update Account Ledger (Debit)
      await execute(
        `INSERT INTO account_ledger (company_id, account_id, debit_amount, transaction_type, reference_no, transaction_date, created_by) VALUES (?, ?, ?, 'JV', ?, ?, ?)`,
        [companyId, item.account_id, item.amount, refNo, voucher_date, userId]
      );

      // If it's a Cash Account, update Cash Book (Debit Cash = Cash In)
      if (accInfo && accInfo.account_type === 'cash') {
        await execute(
          `INSERT INTO cash_book (company_id, transaction_date, reference_type, reference_id, reference_no, description, cash_in, notes, created_by) VALUES (?, ?, 'JV', ?, ?, ?, ?, ?, ?)`,
          [companyId, voucher_date, voucherId, refNo, `JV Debit - ${accInfo.account_name} - ${item.particulars || ''}`, item.amount, item.reference_no || '', userId]
        );
      }
    }

    return res.status(201).json({ success: true, message: 'Voucher saved successfully', voucherId });

  } catch (error) {
    console.error('JV POST Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
