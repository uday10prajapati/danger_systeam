import express from 'express';
import { query, queryOne, execute } from '../db.js';
import { generateBardanEntryCode } from '../utils/protocolCodeGenerator.js';

const router = express.Router();

// GET all jama bardan entries
router.get('/', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const financialYear = req.headers['x-financial-year'];
    
    let sql = `SELECT * FROM jama_bardan_entry WHERE 1=1`;
    const params = [];

    if (companyId) {
      sql += ` AND company_id = ?`;
      params.push(companyId);
    }
    if (financialYear) {
      sql += ` AND financial_year = ?`;
      params.push(financialYear);
    }

    sql += ` ORDER BY entry_date DESC, id DESC`;
    
    const rows = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Fetch jama bardan entries error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET one jama bardan entry with items
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    const entry = await queryOne(`SELECT * FROM jama_bardan_entry WHERE id = ?`, [id]);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    const items = await query('SELECT * FROM jama_bardan_items WHERE entry_id = ? ORDER BY id ASC', [req.params.id]);
    
    // Transform items for frontend gridRows
    entry.gridRows = items.map(item => ({
      col1: item.col1,
      col2: item.col2,
      col3: item.col3
    }));

    // Ensure we have at least 8 rows if that's what the frontend expects
    while (entry.gridRows.length < 8) {
      entry.gridRows.push({ col1: '', col2: '', col3: '' });
    }

    res.json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create new jama bardan entry
router.post('/', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || req.body.company_id;
    const financialYear = req.headers['x-financial-year'] || req.body.financial_year || '2026-27';
    
    console.log('📝 Jama Bardan POST Body:', req.body);

    let { 
      bookType, pavtiNo, date, memNominal, code, name, qty, option, remark, dayQty, totalQty, gridRows 
    } = req.body;

    if (!pavtiNo || pavtiNo === '') {
      pavtiNo = await generateBardanEntryCode(companyId);
    }

    // Resolve IDs
    const member = await queryOne('SELECT id FROM member_master WHERE member_code = ? AND company_id = ?', [code, companyId]);
    const bardanAccount = await queryOne("SELECT id FROM accounts WHERE (account_code = 'BS0001' OR account_name = 'Bardan System') AND company_id = ?", [companyId]);
    const bardanAccountId = bardanAccount?.id || null;

    console.log('📦 Committing Jama Bardan Entry:', { companyId, financialYear, code, qty, memberId: member?.id, accId: bardanAccountId });

    // Use a manual query to ensure we get the result properly for ledger sync
    const result = await execute(`
      INSERT INTO jama_bardan_entry (
        company_id, financial_year, book_type, pavti_no, entry_date, 
        mem_nominal, code, name, qty, option_type, remark,
        day_qty, total_qty, member_id, account_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId, financialYear, bookType, pavtiNo, date,
      memNominal, code, name, qty || 0, option, remark,
      dayQty || 0, totalQty || 0, member?.id || null, bardanAccountId
    ]);

    const entryId = result.lastID;

    // --- Sync with Account Ledger ---
    // SELF bags DO reduce the physical balance (Quantity) in the ledger, 
    // but they are marked with [SELF] so the penalty logic can ignore them.
    if (member?.id && bardanAccountId) {
       const ledgerDesc = `${option === 'Self' ? '[SELF] ' : ''}[BARDAN] Returned (#${pavtiNo}) | ${remark || ''}`;
       await execute(`
          INSERT INTO account_ledger (
             company_id, financial_year, account_id, member_id, 
             transaction_date, reference_no, description, 
             debit, credit, reference_type, reference_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       `, [
          companyId, financialYear, bardanAccountId, member.id,
          date, pavtiNo, ledgerDesc,
          0, qty || 0, 'jama_bardan_entry', entryId // Qty goes to Credit
       ]);
       console.log('✅ Ledger Synchronized for Jama Entry');
    } else {
       console.warn('⚠️ Missing Member ID or Bardan Account ID - Ledger Sync Skipped', { memberId: member?.id, accId: bardanAccountId });
    }

    // Insert Grid Items
    if (gridRows && gridRows.length > 0) {
      for (const row of gridRows) {
        if (row.col1 || row.col2 || row.col3) {
          await execute(
            'INSERT INTO jama_bardan_items (entry_id, col1, col2, col3) VALUES (?, ?, ?, ?)',
            [entryId, row.col1, row.col2, row.col3]
          );
        }
      }
    }

    res.json({ success: true, data: { id: entryId } });
  } catch (error) {
    console.error('Create jama bardan entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update jama bardan entry
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    const companyId = req.headers['x-company-id'] || req.body.company_id;
    const financialYear = req.headers['x-financial-year'] || req.body.financial_year || '2026-27';
    
    const { 
      bookType, pavtiNo, date, memNominal, code, name, qty, option, remark, dayQty, totalQty, gridRows 
    } = req.body;

    console.log('🔄 Updating Jama Bardan Entry:', { id, code, qty });
    await execute(`
      UPDATE jama_bardan_entry SET 
        book_type = ?, pavti_no = ?, entry_date = ?, 
        mem_nominal = ?, code = ?, name = ?, qty = ?, 
        option_type = ?, remark = ?, day_qty = ?, total_qty = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      bookType, pavtiNo, date, memNominal, code, name, qty || 0, 
      option, remark, dayQty || 0, totalQty || 0, id
    ]);

    // --- Sync with Account Ledger (Update) ---
    const member = await queryOne('SELECT id FROM member_master WHERE member_code = ? AND company_id = ?', [code, companyId]);
    const bardanAccount = await queryOne("SELECT id FROM accounts WHERE (account_code = 'BS0001' OR account_name = 'Bardan System') AND company_id = ?", [companyId]);
    
    if (member?.id && bardanAccount?.id) {
       const ledgerDesc = `${option === 'Self' ? '[SELF] ' : ''}[BARDAN] Returned (#${pavtiNo}) | ${remark || ''}`;
       // Try to update existing ledger entry
       const updateResult = await execute(`
          UPDATE account_ledger SET
             member_id = ?, transaction_date = ?, reference_no = ?, 
             description = ?, credit = ?, financial_year = ?
          WHERE reference_type = 'jama_bardan_entry' AND reference_id = ?
       `, [
          member.id, date, pavtiNo, ledgerDesc, qty || 0, financialYear, req.params.id
       ]);

       // If no rows updated, it might be missing from ledger, so insert it
       if (updateResult.changes === 0) {
          await execute(`
             INSERT INTO account_ledger (
                company_id, financial_year, account_id, member_id, 
                transaction_date, reference_no, description, 
                debit, credit, reference_type, reference_id
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
             companyId, financialYear, bardanAccount.id, member.id,
             date, pavtiNo, ledgerDesc,
             0, qty || 0, 'jama_bardan_entry', id
          ]);
       }
    }

    // Update Grid Items (Delete and Re-insert)
    await execute('DELETE FROM jama_bardan_items WHERE entry_id = ?', [id]);
    
    if (gridRows && gridRows.length > 0) {
      for (const row of gridRows) {
        if (row.col1 || row.col2 || row.col3) {
          await execute(
            'INSERT INTO jama_bardan_items (entry_id, col1, col2, col3) VALUES (?, ?, ?, ?)',
            [id, row.col1, row.col2, row.col3]
          );
        }
      }
    }

    res.json({ success: true, message: 'Jama Bardan entry updated' });
  } catch (error) {
    console.error('Update jama bardan entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE jama bardan entry
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    // 1. Delete from ledger first
    await execute("DELETE FROM account_ledger WHERE reference_type = 'jama_bardan_entry' AND reference_id = ?", [id]);
    
    // 2. Delete the entry (Foreign key with ON DELETE CASCADE will handle jama_bardan_items)
    await execute('DELETE FROM jama_bardan_entry WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Jama Bardan entry deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
