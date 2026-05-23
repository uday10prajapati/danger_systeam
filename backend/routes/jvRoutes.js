import express from 'express';
import { execute, query, queryOne, getConnection } from '../db.js';

const router = express.Router();

const getAccInfo = async (accId) => {
   const rows = await query(`SELECT account_name, account_type, is_subledger FROM accounts WHERE id = ?`, [accId]);
   return rows[0] || null;
};

const resolveVoucherId = async (companyId, id) => {
   let vouchers = await query(`SELECT * FROM journal_vouchers WHERE id = ? AND company_id = ?`, [id, companyId]);
   if (vouchers && vouchers.length > 0) return { voucherId: vouchers[0].id, voucher: vouchers[0] };

   const itemRow = await query(`SELECT voucher_id FROM journal_voucher_items WHERE id = ?`, [id]);
   if (!itemRow || itemRow.length === 0) return null;

   vouchers = await query(`SELECT * FROM journal_vouchers WHERE id = ? AND company_id = ?`, [itemRow[0].voucher_id, companyId]);
   if (!vouchers || vouchers.length === 0) return null;

   return { voucherId: vouchers[0].id, voucher: vouchers[0] };
};

const saveVoucher = async (connection, { companyId, userId, voucherId = null, voucher_date, voucher_type = 'JV', credits = [], debits = [], notes = '' }) => {
   const totalCredit = credits.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
   const totalDebit = debits.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

   const refNoFor = (id) => `JV-${id}`;

   if (voucherId) {
      await connection.execute(
         `UPDATE journal_vouchers SET voucher_date = ?, voucher_type = ?, total_credit = ?, total_debit = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ?`,
         [voucher_date, voucher_type, totalCredit, totalDebit, notes || '', voucherId, companyId]
      );

      await connection.execute(`DELETE FROM journal_voucher_items WHERE voucher_id = ?`, [voucherId]);
      await connection.execute(`DELETE FROM account_ledger WHERE company_id = ? AND reference_no = ? AND transaction_type = 'JV'`, [companyId, refNoFor(voucherId)]);
      await connection.execute(`DELETE FROM member_ledger WHERE company_id = ? AND reference_no = ? AND transaction_type = 'JV'`, [companyId, refNoFor(voucherId)]);
      await connection.execute(`DELETE FROM cash_book WHERE company_id = ? AND reference_id = ? AND reference_type IN ('JV', 'CONTRA')`, [companyId, voucherId]);
   } else {
      const [jvResult] = await connection.execute(
         `INSERT INTO journal_vouchers (company_id, voucher_date, voucher_type, total_credit, total_debit, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
         [companyId, voucher_date, voucher_type, totalCredit, totalDebit, notes || '', userId]
      );
      voucherId = jvResult.insertId;
   }

   const refNo = refNoFor(voucherId);

   for (const item of credits) {
      const amt = parseFloat(item.amount || 0);
      await connection.execute(
         `INSERT INTO journal_voucher_items (voucher_id, type, account_id, amount, reference_no, member_id, particulars) VALUES (?, 'CREDIT', ?, ?, ?, ?, ?)`,
         [voucherId, item.account_id, amt, item.reference_no || null, item.member_id || null, item.particulars || '']
      );

      const accInfo = await getAccInfo(item.account_id);
      await connection.execute(
         `INSERT INTO account_ledger (company_id, account_id, credit_amount, credit, transaction_type, reference_no, transaction_date, description, created_by) VALUES (?, ?, ?, ?, 'JV', ?, ?, ?, ?)`,
         [companyId, item.account_id, amt, amt, refNo, voucher_date, item.particulars || '', userId]
      );

      if (accInfo?.is_subledger && item.member_id) {
         await connection.execute(
            `INSERT INTO member_ledger (company_id, member_id, account_id, credit_amount, transaction_type, reference_no, transaction_date, particulars, created_by) VALUES (?, ?, ?, ?, 'JV', ?, ?, ?, ?)`,
            [companyId, item.member_id, item.account_id, amt, refNo, voucher_date, item.particulars || '', userId]
         );
      }

      if (accInfo?.account_type === 'cash' || accInfo?.account_type === 'bank') {
         const typeLabel = voucher_type.includes('CONTRA') ? 'CONTRA' : 'JV';
         await connection.execute(
            `INSERT INTO cash_book (company_id, transaction_date, reference_type, reference_id, reference_no, description, cash_out, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyId, voucher_date, typeLabel, voucherId, refNo, `${typeLabel} Credit - ${accInfo.account_name} - ${item.particulars || ''}`, amt, item.reference_no || '', userId]
         );
      }
   }

   for (const item of debits) {
      const amt = parseFloat(item.amount || 0);
      await connection.execute(
         `INSERT INTO journal_voucher_items (voucher_id, type, account_id, amount, reference_no, member_id, particulars) VALUES (?, 'DEBIT', ?, ?, ?, ?, ?)`,
         [voucherId, item.account_id, amt, item.reference_no || null, item.member_id || null, item.particulars || '']
      );

      const accInfo = await getAccInfo(item.account_id);
      await connection.execute(
         `INSERT INTO account_ledger (company_id, account_id, debit_amount, debit, transaction_type, reference_no, transaction_date, description, created_by) VALUES (?, ?, ?, ?, 'JV', ?, ?, ?, ?)`,
         [companyId, item.account_id, amt, amt, refNo, voucher_date, item.particulars || '', userId]
      );

      if (accInfo?.is_subledger && item.member_id) {
         await connection.execute(
            `INSERT INTO member_ledger (company_id, member_id, account_id, debit_amount, transaction_type, reference_no, transaction_date, particulars, created_by) VALUES (?, ?, ?, ?, 'JV', ?, ?, ?, ?)`,
            [companyId, item.member_id, item.account_id, amt, refNo, voucher_date, item.particulars || '', userId]
         );
      }

      if (accInfo?.account_type === 'cash' || accInfo?.account_type === 'bank') {
         const typeLabel = voucher_type.includes('CONTRA') ? 'CONTRA' : 'JV';
         await connection.execute(
            `INSERT INTO cash_book (company_id, transaction_date, reference_type, reference_id, reference_no, description, cash_in, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyId, voucher_date, typeLabel, voucherId, refNo, `${typeLabel} Debit - ${accInfo.account_name} - ${item.particulars || ''}`, amt, item.reference_no || '', userId]
         );
      }
   }

   return { voucherId, totalCredit, totalDebit };
};

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

    await connection.beginTransaction();
    const { voucherId, totalCredit, totalDebit } = await saveVoucher(connection, {
      companyId,
      userId,
      voucher_date,
      voucher_type,
      credits,
      debits,
      notes
    });

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

      // Try direct voucher lookup first
      let vouchers = await query(`SELECT * FROM journal_vouchers WHERE id = ? AND company_id = ?`, [id, companyId]);

      // If not found, maybe `id` is actually a journal_voucher_items id (JV-ITEM-<id> uses item.id in frontend list)
      if ((!vouchers || vouchers.length === 0)) {
         const itemRow = await query(`SELECT voucher_id FROM journal_voucher_items WHERE id = ?`, [id]);
         if (!itemRow || itemRow.length === 0) return res.status(404).json({ success: false, error: 'Voucher not found' });
         const voucherId = itemRow[0].voucher_id;
         vouchers = await query(`SELECT * FROM journal_vouchers WHERE id = ? AND company_id = ?`, [voucherId, companyId]);
         if (!vouchers || vouchers.length === 0) return res.status(404).json({ success: false, error: 'Voucher not found' });
         // set id to voucherId for subsequent item fetch
         req.params._resolvedVoucherId = voucherId;
      }

      const voucherIdToFetch = req.params._resolvedVoucherId || id;

      const items = await query(`
         SELECT i.*, a.account_name, a.account_name_gu, a.account_code, a.account_type, a.is_subledger,
                   m.member_name, m.member_name_gu, m.member_code
         FROM journal_voucher_items i
         JOIN accounts a ON i.account_id = a.id
         LEFT JOIN member_master m ON i.member_id = m.id
         WHERE i.voucher_id = ?
      `, [voucherIdToFetch]);

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

router.put('/:id', async (req, res) => {
   const connection = await getConnection();
   try {
      const companyId = req.header('x-company-id');
      const userId = req.header('x-user-id') || 1;
      const id = req.params.id;

      if (!companyId) return res.status(400).json({ success: false, error: 'Company ID required' });

      const resolved = await resolveVoucherId(companyId, id);
      if (!resolved) return res.status(404).json({ success: false, error: 'Voucher not found' });

      const { voucher_date, voucher_type = 'JV', credits = [], debits = [], notes = '' } = req.body;
      if ((!credits || credits.length === 0) && (!debits || debits.length === 0)) {
         return res.status(400).json({ success: false, error: 'Credits and Debits are required' });
      }

      await connection.beginTransaction();
      const result = await saveVoucher(connection, {
         companyId,
         userId,
         voucherId: resolved.voucherId,
         voucher_date,
         voucher_type,
         credits,
         debits,
         notes
      });
      await connection.commit();

      res.json({ success: true, message: 'Voucher updated successfully', voucherId: result.voucherId });
   } catch (error) {
      if (connection) await connection.rollback();
      console.error('JV PUT Error:', error);
      res.status(500).json({ success: false, error: error.message });
   } finally {
      if (connection) connection.release();
   }
});

router.delete('/:id', async (req, res) => {
   const connection = await getConnection();
   try {
      const companyId = req.header('x-company-id');
      const id = req.params.id;

      if (!companyId) return res.status(400).json({ success: false, error: 'Company ID required' });

      const resolved = await resolveVoucherId(companyId, id);
      if (!resolved) return res.status(404).json({ success: false, error: 'Voucher not found' });

      const refNo = `JV-${resolved.voucherId}`;
      await connection.beginTransaction();
      await connection.execute(`DELETE FROM journal_voucher_items WHERE voucher_id = ?`, [resolved.voucherId]);
      await connection.execute(`DELETE FROM account_ledger WHERE company_id = ? AND reference_no = ? AND transaction_type = 'JV'`, [companyId, refNo]);
      await connection.execute(`DELETE FROM member_ledger WHERE company_id = ? AND reference_no = ? AND transaction_type = 'JV'`, [companyId, refNo]);
      await connection.execute(`DELETE FROM cash_book WHERE company_id = ? AND reference_id = ? AND reference_type IN ('JV', 'CONTRA')`, [companyId, resolved.voucherId]);
      await connection.execute(`DELETE FROM journal_vouchers WHERE id = ? AND company_id = ?`, [resolved.voucherId, companyId]);
      await connection.commit();

      res.json({ success: true, message: 'Voucher deleted successfully' });
   } catch (error) {
      if (connection) await connection.rollback();
      console.error('JV DELETE Error:', error);
      res.status(500).json({ success: false, error: error.message });
   } finally {
      if (connection) connection.release();
   }
});

export default router;
