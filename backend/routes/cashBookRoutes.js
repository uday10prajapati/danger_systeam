import express from 'express';
import {
  insertCashBookEntry,
  getCashBookEntries,
  getCashBalance,
  getDailyCashSummary,
  getOpeningBalance,
  query
} from '../db.js';

const router = express.Router();

// POST: Add manual cash entry (expense or adjustment)
router.post('/manual', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const userId = req.header('x-user-id');

    if (!companyId || !userId) {
      return res.status(400).json({ success: false, error: 'Company ID and User ID required' });
    }

    const { transaction_date, description, cash_in, cash_out, notes, entries } = req.body;

    if (!transaction_date || (!description && (!entries || entries.length === 0))) {
      return res.status(400).json({ success: false, error: 'Date and entry details required' });
    }

    const referenceNo = `CB-${Date.now()}`;
    const transactionDate = transaction_date;

    // BATCH MODE: Multiple sub-entries
    if (entries && entries.length > 0) {
      for (const entry of entries) {
        await query(`
          INSERT INTO account_ledger (
            company_id, account_id, member_id, transaction_date, transaction_type, reference_type, 
            reference_no, description, debit, credit, notes, created_by, financial_year,
            interest_amount, interest_a_per, interest_percent, interest_member_id, interest_account_id
          ) VALUES (?, ?, ?, ?, 'cash_book', 'cash_book', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          companyId,
          entry.account_id || req.body.account_id || null,
          entry.member_id || null,
          transactionDate, referenceNo, entry.description || description,
          parseFloat(entry.cash_out || 0),
          parseFloat(entry.cash_in || 0),
          entry.notes || '', userId, '2026-27',
          entry.interest_amount ? parseFloat(entry.interest_amount) : 0,
          entry.interest_a_per || null,
          entry.interest_percent ? parseFloat(entry.interest_percent) : 0,
          entry.interest_member_id || null,
          entry.interest_account_id || null
        ]);

        // 2. Counter Cash Account Entry (Symmetric Mapping: Credit in Rojmel = Credit in Cash Acc)
        await query(`
          INSERT INTO account_ledger (
            company_id, account_id, member_id, transaction_date, transaction_type, reference_type, 
            reference_no, description, debit, credit, notes, created_by, financial_year
          ) VALUES (?, ?, NULL, ?, 'cash_account_entry', 'cash_book', ?, ?, ?, ?, ?, ?, ?)
        `, [
          companyId,
          14, // CASH_ACCOUNT_ID
          transactionDate, referenceNo, entry.description || description,
          parseFloat(entry.cash_out || 0),
          parseFloat(entry.cash_in || 0),
          entry.notes || '', userId, '2026-27'
        ]);
      }
      return res.status(201).json({ success: true, data: { reference_no: referenceNo } });
    }

    // SINGLE MODE: Legacy support
    let mainResult = null;
    if (req.body.account_id || req.body.member_id || parseFloat(cash_out || 0) > 0 || parseFloat(cash_in || 0) > 0) {
      mainResult = await query(`
         INSERT INTO account_ledger (
           company_id, account_id, member_id, transaction_date, transaction_type, reference_type, 
           reference_no, description, debit, credit, notes, created_by, financial_year,
           interest_amount, interest_a_per, interest_percent, interest_member_id, interest_account_id
         ) VALUES (?, ?, ?, ?, 'cash_book', 'cash_book', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       `, [
        companyId,
        req.body.account_id || null,
        req.body.member_id || null,
        transactionDate, referenceNo, description,
        parseFloat(cash_out || 0),
        parseFloat(cash_in || 0),
        notes || '', userId, '2026-27',
        req.body.interest_amount ? parseFloat(req.body.interest_amount) : 0,
        req.body.interest_a_per || null,
        req.body.interest_percent ? parseFloat(req.body.interest_percent) : 0,
        req.body.interest_member_id || null,
        req.body.interest_account_id || null
      ]);

      // 2. Counter Cash Account Entry
      await query(`
        INSERT INTO account_ledger (
          company_id, account_id, member_id, transaction_date, transaction_type, reference_type, 
          reference_no, description, debit, credit, notes, created_by, financial_year
        ) VALUES (?, ?, NULL, ?, 'cash_account_entry', 'cash_book', ?, ?, ?, ?, ?, ?, ?)
      `, [
        companyId,
        14, // CASH_ACCOUNT_ID
        transactionDate, referenceNo, description,
        parseFloat(cash_out || 0),
        parseFloat(cash_in || 0),
        notes || '', userId, '2026-27'
      ]);
    }

    return res.status(201).json({ success: true, data: { reference_no: referenceNo } });


  } catch (error) {
    console.error('Add cash entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Single cash book entry from unified ledger
router.get('/:id', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const id = req.params.id;

    // In unified system, we fetch the cash entry.
    // If it's a double entry, we might want the details of the other side too.
    const rows = await query(`
      SELECT 
        al.id, 
        al.transaction_date, 
        al.description, 
        al.debit as cash_in, 
        al.credit as cash_out, 
        al.notes,
        al.account_id,
        al.member_id,
        m.member_name,
        m.member_code,
        al.reference_no,
        al.reference_type
      FROM account_ledger al
      LEFT JOIN member_master m ON al.member_id = m.id
      WHERE al.id = ? AND al.company_id = ?
    `, [id, companyId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Get single cash entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH: Update cash entry in unified ledger
router.patch('/:id', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const id = req.params.id;
    const { transaction_date, description, cash_in, cash_out, notes, account_id } = req.body;

    // Update the main entry (The record we are editing)
    await query(`
      UPDATE account_ledger 
      SET transaction_date = ?, description = ?, debit = ?, credit = ?, notes = ?, 
          account_id = ?, member_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND company_id = ?
    `, [
      transaction_date, description, cash_in || 0, cash_out || 0, notes || '',
      req.body.account_id || null, req.body.member_id || null,
      id, companyId
    ]);



    res.json({ success: true, message: 'Entry updated successfully' });
  } catch (error) {
    console.error('Update cash entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: List cash book entries
router.get('/', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    let { startDate, endDate } = req.query;

    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }
    if (!startDate) {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString().split('T')[0];
    }

    const entries = await getCashBookEntries(companyId, startDate, endDate);
    return res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Get cash book error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get current cash balance
router.get('/balance/current', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const balance = await getCashBalance(companyId);
    return res.json({ success: true, data: balance });
  } catch (error) {
    console.error('Get cash balance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get daily summary
router.get('/summary/daily', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    let { startDate, endDate } = req.query;

    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }
    if (!startDate) {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString().split('T')[0];
    }

    const summary = await getDailyCashSummary(companyId, startDate, endDate);
    return res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Get daily summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get opening balance for a specific date
router.get('/opening-balance/:date', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const openingBalance = await getOpeningBalance(companyId, req.params.date);
    return res.json({ success: true, data: { opening_balance: openingBalance } });
  } catch (error) {
    console.error('Get opening balance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE: Remove cash entry
router.delete('/:id', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const id = req.params.id;

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    await query('DELETE FROM account_ledger WHERE id = ? AND company_id = ?', [id, companyId]);

    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Delete cash entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
