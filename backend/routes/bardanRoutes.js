import express from 'express';
import { query, queryOne, execute } from '../db.js';

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

    if (!companyId) {
      console.warn('X-Company-Id missing in ledger request');
    }

    // 1. Get Opening Balance from member_master
    const member = await queryOne(`SELECT bardan_opening FROM member_master WHERE member_code = ? ${companyId ? 'AND company_id = ?' : ''}`, companyId ? [code, companyId] : [code]);
    const openingBal = parseFloat(member?.bardan_opening || 0);

    // 2. Get All Given (Debit)
    const given = await query(`SELECT id, entry_date as date, 'GIVEN' as type, qty as debit, 0 as credit, remark, pavti_no FROM bardan_entry WHERE code = ? ${companyId ? 'AND company_id = ?' : ''}`, companyId ? [code, companyId] : [code]);
    
    // 3. Get All Returned (Credit)
    const returned = await query(`SELECT id, entry_date as date, 'RETURNED' as type, 0 as debit, qty as credit, remark, pavti_no FROM jama_bardan_entry WHERE code = ? ${companyId ? 'AND company_id = ?' : ''}`, companyId ? [code, companyId] : [code]);

    // 4. Combine and Sort
    let ledger = [...given, ...returned].sort((a, b) => new Date(a.date) - new Date(b.date));

    // 5. Calculate Running Balance
    let runningBalance = parseFloat(openingBal);
    
    // Initial opening row
    const result = [{
      id: 'OP',
      date: null,
      type: 'OPENING',
      particulars: 'Opening Balance',
      debit: openingBal > 0 ? openingBal : 0,
      credit: openingBal < 0 ? Math.abs(openingBal) : 0,
      balance: runningBalance
    }];

    ledger.forEach(item => {
      runningBalance += (parseFloat(item.debit) - parseFloat(item.credit));
      result.push({
        ...item,
        particulars: item.type === 'GIVEN' ? `Bardan Given (#${item.pavti_no})` : `Bardan Returned (#${item.pavti_no})`,
        balance: runningBalance
      });
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

    const { 
      bookType, pavtiNo, date, memNominal, code, name, qty, option, remark, dayQty, totalQty, gridRows 
    } = req.body;

    const result = await execute(`
      INSERT INTO bardan_entry (
        company_id, financial_year, book_type, pavti_no, entry_date, 
        mem_nominal, code, name, qty, option_type, remark,
        day_qty, total_qty
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId, financialYear, bookType, pavtiNo, date,
      memNominal, code, name, qty || 0, option, remark,
      dayQty || 0, totalQty || 0
    ]);

    const entryId = result.insertId || result.lastID;

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
