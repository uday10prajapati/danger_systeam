import express from 'express';
import { query, queryOne, execute } from '../db.js';
import { generateBardanEntryCode } from '../utils/protocolCodeGenerator.js';

const router = express.Router();

// GET bardan balance for a member
router.get('/balance/:code', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const { code } = req.params;

    // 1. Total Taken (from bardan_entry)
    const takenResult = await queryOne(`SELECT SUM(qty) as total FROM bardan_entry WHERE code = ? ${companyId ? 'AND company_id = ?' : ''}`, companyId ? [code, companyId] : [code]);

    // 2. Total Returned (from jama_bardan_entry)
    const returnedResult = await queryOne(`SELECT SUM(qty) as total FROM jama_bardan_entry WHERE code = ? ${companyId ? 'AND company_id = ?' : ''}`, companyId ? [code, companyId] : [code]);

    // 3. Opening Balance
    const member = await queryOne(`SELECT bardan_opening FROM member_master WHERE member_code = ? ${companyId ? 'AND company_id = ?' : ''}`, companyId ? [code, companyId] : [code]);
    
    const opening = parseFloat(member?.bardan_opening || 0);
    const taken = parseFloat(takenResult?.total || 0);
    const returned = parseFloat(returnedResult?.total || 0);
    const balance = opening + taken - returned;

    res.json({ 
      success: true, 
      data: { 
        opening,
        taken, 
        returned, 
        balance 
      } 
    });
  } catch (error) {
    console.error('Fetch balance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET Bardan Ledger for a member
router.get('/ledger/:code', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const { code } = req.params;

    // 1. Get Opening Balance from member_master
    const member = await queryOne(`SELECT bardan_opening, member_name FROM member_master WHERE member_code = ? ${companyId ? 'AND company_id = ?' : ''}`, companyId ? [code, companyId] : [code]);
    const openingBal = parseFloat(member?.bardan_opening || 0);

    // 2. Get All Given (Debit)
    const given = await query(`SELECT id, entry_date as date, 'GIVEN' as type, qty as debit, 0 as credit, remark, pavti_no, name FROM bardan_entry WHERE code = ? ${companyId ? 'AND company_id = ?' : ''}`, companyId ? [code, companyId] : [code]);
    
    // 3. Get All Returned (Credit)
    const returned = await query(`SELECT id, entry_date as date, 'RETURNED' as type, 0 as debit, qty as credit, remark, pavti_no, name FROM jama_bardan_entry WHERE code = ? ${companyId ? 'AND company_id = ?' : ''}`, companyId ? [code, companyId] : [code]);

    // 4. Combine and Group by Pavti/Date
    let combined = [...given, ...returned];
    let grouped = {};
    
    combined.forEach(item => {
      // Group by Pavti No and Date. If Pavti is empty, keep separate by ID.
      const key = item.pavti_no ? `${item.pavti_no}_${item.date}` : `ID_${item.id}_${item.type}`;
      if (!grouped[key]) {
        grouped[key] = { 
          id: item.id,
          date: item.date, 
          pavti_no: item.pavti_no, 
          debit: 0, 
          credit: 0, 
          remark: item.remark, 
          name: item.name,
          particulars: ''
        };
      }
      grouped[key].debit += parseFloat(item.debit || 0);
      grouped[key].credit += parseFloat(item.credit || 0);
      if (item.remark && !grouped[key].remark.includes(item.remark)) {
        grouped[key].remark = grouped[key].remark ? `${grouped[key].remark}; ${item.remark}` : item.remark;
      }
    });

    let ledger = Object.values(grouped).sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      return dateA - dateB;
    });

    // 5. Calculate Running Balance
    let runningBalance = openingBal;
    
    // Initial opening row
    const result = [{
      id: 'OP',
      date: null,
      type: 'OPENING',
      particulars: 'Opening Balance (Initial)',
      debit: openingBal,
      credit: 0,
      balance: openingBal,
      name: member?.member_name || ''
    }];

    ledger.forEach(item => {
      runningBalance += (item.debit - item.credit);
      item.balance = runningBalance;
      item.particulars = `Trans (#${item.pavti_no || 'NA'})`;
      result.push(item);
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Fetch ledger error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET all bardan entries
router.get('/', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const financialYear = req.headers['x-financial-year'];
    
    let sql = `SELECT * FROM bardan_entry WHERE 1=1`;
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
    console.error('Fetch bardan entries error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET one bardan entry with items
router.get('/:id', async (req, res) => {
  try {
    const entry = await queryOne(`SELECT * FROM bardan_entry WHERE id = ?`, [req.params.id]);

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    const items = await query('SELECT * FROM bardan_items WHERE entry_id = ? ORDER BY id ASC', [req.params.id]);
    
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

// POST create new bardan entry
router.post('/', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'] || req.body.company_id;
    const financialYear = req.headers['x-financial-year'] || req.body.financial_year || '2026-27';
    
    console.log('📝 Bardan POST Body:', req.body);
    console.log('🏢 Company Context:', { companyId, financialYear });

    let { 
      bookType, pavtiNo, date, memNominal, code, name, qty, option, remark, dayQty, totalQty, gridRows 
    } = req.body;

    if (!pavtiNo || pavtiNo === '') {
      pavtiNo = await generateBardanEntryCode(companyId);
    }

    // Resolve IDs
    const member = await queryOne('SELECT id FROM member_master WHERE member_code = ? AND company_id = ?', [code, companyId]);
    const bardanAccount = await queryOne('SELECT id FROM accounts WHERE account_code = "BS0001" AND company_id = ?', [companyId]);
    const bardanAccountId = bardanAccount?.id || null;

    const result = await execute(`
      INSERT INTO bardan_entry (
        company_id, financial_year, book_type, pavti_no, entry_date, 
        mem_nominal, code, name, qty, option_type, remark,
        day_qty, total_qty, member_id, account_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId, financialYear, bookType, pavtiNo, date,
      memNominal, code, name, qty || 0, option, remark,
      dayQty || 0, totalQty || 0, member?.id || null, bardanAccountId
    ]);

    const entryId = result.insertId || result.lastID;

    // --- Sync with Account Ledger ---
    if (member?.id && bardanAccountId) {
       const ledgerDesc = `[BARDAN] Taken (#${pavtiNo}) | ${remark || ''}`;
       await execute(`
          INSERT INTO account_ledger (
             company_id, financial_year, account_id, member_id, 
             transaction_date, reference_no, description, 
             debit, credit, source_table, source_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       `, [
          companyId, financialYear, bardanAccountId, member.id,
          date, pavtiNo, ledgerDesc,
          qty || 0, 0, 'bardan_entry', entryId // Qty goes to Debit
       ]);
    }

    // Insert Grid Items
    if (gridRows && gridRows.length > 0) {
      for (const row of gridRows) {
        if (row.col1 || row.col2 || row.col3) {
          await execute(
            'INSERT INTO bardan_items (entry_id, col1, col2, col3) VALUES (?, ?, ?, ?)',
            [entryId, row.col1, row.col2, row.col3]
          );
        }
      }
    }

    res.json({ success: true, data: { id: entryId } });
  } catch (error) {
    console.error('Create bardan entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update bardan entry
router.put('/:id', async (req, res) => {
  try {
    const { 
      bookType, pavtiNo, date, memNominal, code, name, qty, option, remark, dayQty, totalQty, gridRows 
    } = req.body;

    await execute(`
      UPDATE bardan_entry SET 
        book_type = ?, pavti_no = ?, entry_date = ?, 
        mem_nominal = ?, code = ?, name = ?, qty = ?, 
        option_type = ?, remark = ?, day_qty = ?, total_qty = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      bookType, pavtiNo, date, memNominal, code, name, qty || 0, 
      option, remark, dayQty || 0, totalQty || 0, req.params.id
    ]);

    // Update Grid Items (Delete and Re-insert)
    await execute('DELETE FROM bardan_items WHERE entry_id = ?', [req.params.id]);
    
    if (gridRows && gridRows.length > 0) {
      for (const row of gridRows) {
        if (row.col1 || row.col2 || row.col3) {
          await execute(
            'INSERT INTO bardan_items (entry_id, col1, col2, col3) VALUES (?, ?, ?, ?)',
            [req.params.id, row.col1, row.col2, row.col3]
          );
        }
      }
    }

    res.json({ success: true, message: 'Bardan entry updated' });
  } catch (error) {
    console.error('Update bardan entry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE bardan entry
router.delete('/:id', async (req, res) => {
  try {
    // Foreign key with ON DELETE CASCADE will handle bardan_items
    await execute('DELETE FROM bardan_entry WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Bardan entry deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
