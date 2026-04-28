import express from 'express';
import { query, execute } from '../db.js';

const router = express.Router();

// GET all active deductions for a company
router.get('/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const results = await query(
      'SELECT * FROM deduction_master WHERE company_id = ? AND is_active = 1 ORDER BY name ASC',
      [companyId]
    );
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET all deductions (Master view)
router.get('/master', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const results = await query(
      `SELECT dm.*, acc.account_name 
       FROM deduction_master dm
       LEFT JOIN accounts acc ON dm.ledger_account_id = acc.id
       WHERE dm.company_id = ? 
       ORDER BY dm.sort_order ASC, dm.name ASC`,
      [companyId]
    );
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create/update deduction
router.post('/', async (req, res) => {
  try {
    const { 
      id, company_id, name, type, default_value, 
      is_active, auto_apply, ledger_account_id, 
      show_balance, sort_order 
    } = req.body;
    
    if (id) {
      await query(
        `UPDATE deduction_master SET 
         name = ?, type = ?, default_value = ?, is_active = ?, auto_apply = ?, 
         ledger_account_id = ?, show_balance = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND company_id = ?`,
        [name, type, default_value, is_active, auto_apply, ledger_account_id, show_balance, sort_order, id, company_id]
      );
      res.json({ success: true, message: 'Protocol synchronized' });
    } else {
      const result = await execute(
        `INSERT INTO deduction_master (
          company_id, name, type, default_value, is_active, auto_apply, 
          ledger_account_id, show_balance, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [company_id, name, type, default_value, is_active, auto_apply, ledger_account_id, show_balance, sort_order]
      );
      res.json({ success: true, id: result.lastID });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST batch details for selected users
router.post('/batch-details', async (req, res) => {
  try {
    const { identities } = req.body; // [{ id, type: 'member'|'account' }]
    const companyId = req.headers['x-company-id'];
    
    if (!identities || !identities.length) {
      return res.json({ success: true, data: [] });
    }

    const detailedIdentities = [];

    for (const identity of identities) {
      const type = identity.type;
      const id = identity.id;
      
      const stats = await query(`
         SELECT 
           COALESCE(SUM(COALESCE(debit, debit_amount, 0)), 0) as total_debit,
           COALESCE(SUM(COALESCE(credit, credit_amount, 0)), 0) as total_credit
         FROM account_ledger
         WHERE ${type === 'member' ? 'member_id' : 'account_id'} = ? AND company_id = ?
      `, [id, companyId]);

      const totalDebit = parseFloat(stats[0].total_debit || 0);
      const totalCredit = parseFloat(stats[0].total_credit || 0);

      if (type === 'member') {
        const rows = await query('SELECT member_name, member_code, village_name FROM member_master WHERE id = ?', [id]);
        if (rows && rows.length > 0) {
          detailedIdentities.push({
            ...identity,
            name: rows[0].member_name,
            code: rows[0].member_code,
            details: rows[0].village_name || 'N/A',
            total_debit: totalDebit,
            total_credit: totalCredit,
            balance: totalCredit - totalDebit
          });
        }
      } else {
        const rows = await query('SELECT account_name, account_code, is_subledger FROM accounts WHERE id = ?', [id]);
        if (rows && rows.length > 0) {
          detailedIdentities.push({
             ...identity,
             name: rows[0].account_name,
             code: rows[0].account_code || `ACC-${id}`,
             details: 'LEDGER ACCOUNT',
             is_subledger: rows[0].is_subledger,
             total_debit: totalDebit,
             total_credit: totalCredit,
             balance: totalCredit - totalDebit
          });
        }
      }
    }

    res.json({ success: true, data: detailedIdentities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ================= TARGET MATRIX PERSISTENCE =================

// GET all saved targets for current company
router.get('/targets', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const rows = await query('SELECT id, target_type as type, target_id as db_id FROM deduction_targets WHERE company_id = ?', [companyId]);
    
    if (!rows || rows.length === 0) return res.json({ success: true, data: [] });

    const detailedIdentities = [];

    for (const row of rows) {
      const type = row.type;
      const db_id = row.db_id;

      const stats = await query(`
         SELECT 
           COALESCE(SUM(COALESCE(debit, debit_amount, 0)), 0) as total_debit,
           COALESCE(SUM(COALESCE(credit, credit_amount, 0)), 0) as total_credit
         FROM account_ledger
         WHERE ${type === 'member' ? 'member_id' : 'account_id'} = ? AND company_id = ?
      `, [db_id, companyId]);

      const totalDebit = parseFloat(stats[0].total_debit || 0);
      const totalCredit = parseFloat(stats[0].total_credit || 0);

      if (type === 'member') {
        const memRows = await query('SELECT member_name, member_code, village_name FROM member_master WHERE id = ?', [db_id]);
        if (memRows && memRows.length > 0) {
          detailedIdentities.push({
            id: db_id, type: 'member',
            name: memRows[0].member_name,
            code: memRows[0].member_code,
            details: memRows[0].village_name || 'N/A',
            total_debit: totalDebit,
            total_credit: totalCredit,
            balance: totalCredit - totalDebit
          });
        }
      } else {
        const accRows = await query('SELECT account_name, account_code, is_subledger FROM accounts WHERE id = ?', [db_id]);
        if (accRows && accRows.length > 0) {
          detailedIdentities.push({
             id: db_id, type: 'account',
             name: accRows[0].account_name,
             code: accRows[0].account_code || `ACC-${db_id}`,
             details: 'LEDGER ACCOUNT',
             is_subledger: accRows[0].is_subledger,
             total_debit: totalDebit,
             total_credit: totalCredit,
             balance: totalCredit - totalDebit
          });
        }
      }
    }
    res.json({ success: true, data: detailedIdentities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST sync multiple targets to database (Appends new ones, ignores dupes)
router.post('/targets/sync', async (req, res) => {
  try {
    const { identities } = req.body;
    const companyId = req.headers['x-company-id'];

    if (identities && identities.length > 0) {
       for (const identity of identities) {
         await execute(
           'INSERT IGNORE INTO deduction_targets (company_id, target_type, target_id) VALUES (?, ?, ?)',
           [companyId, identity.type, identity.id]
         );
       }
    }
    
    // Once synced, call the same logic as batch details to return fresh matrix details
    return res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE specific target from persistent store
router.delete('/targets/:type/:id', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const { type, id } = req.params;
    await execute('DELETE FROM deduction_targets WHERE company_id = ? AND target_type = ? AND target_id = ?', [companyId, type, id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST execute batch deduction (Now commits live to account_ledger)
router.post('/execute-batch', async (req, res) => {
  try {
    const { date, target_identifier, identities, master_id, remark, global_amount, sabhasad_id } = req.body;
    const companyId = req.headers['x-company-id'];

    const kapatAccs = await query(
      "SELECT id, account_name FROM accounts WHERE (account_name LIKE '%Kapat%' OR account_name LIKE '%Deduction%') AND company_id = ? LIMIT 1", 
      [companyId]
    );
    const fallbackRule = kapatAccs.length > 0 ? { ledger_account_id: kapatAccs[0].id, name: kapatAccs[0].account_name } : null;

    // Determine target list
    let targets = [];
    if (!target_identifier || target_identifier === 'all') {
      targets = identities;
    } else {
      const [type, id] = target_identifier.split('-');
      const found = identities.find(i => String(i.id) === String(id) && i.type === type);
      if (found) targets = [found];
    }

    if (!targets.length) return res.status(400).json({ success: false, error: 'No valid targets selected' });

    let successCount = 0;
    const referenceNo = `DED-${Date.now()}`;

    for (const target of targets) {
       const amount = parseFloat(target.deduction_amount || global_amount || 0);
       if (amount <= 0) continue;

       // Verify we have a ledger account for this entry
       let finalAccountId = null;
       if (target.type === 'account') {
         finalAccountId = target.id;
       } else if (target.type === 'member') {
         finalAccountId = fallbackRule?.ledger_account_id;
       }

       if (!finalAccountId) {
         return res.status(400).json({ 
           success: false, 
           error: `No ledger account mapped for ${target.name}. Please create a "Kapat Account" in Account Master for member deductions.` 
         });
       }

       // Kapat (Deduction) is typically a Credit (Jama) for the member/account
       const entryType = target.entry_type || 'Cr'; 
       const isCr = entryType === 'Cr';

       // Create Entry for the member/account
       await query(`
         INSERT INTO account_ledger (
           company_id, account_id, member_id, transaction_date, transaction_type, reference_type, 
           reference_no, description, debit, credit, notes, created_by, financial_year
         ) VALUES (?, ?, ?, ?, 'deduction', 'deduction_batch', ?, ?, ?, ?, ?, ?, ?)
       `, [
          companyId, 
          finalAccountId, 
          target.type === 'member' ? target.id : (sabhasad_id || null),
          date, referenceNo, 
          `Kapat (Deduction) - ${target.name}`,
          isCr ? 0 : amount, 
          isCr ? amount : 0,
          remark || '', 
          req.headers['x-user-id'] || 1, 
          '2026-27'
       ]);

       // --- Bardan Penalty Auto-Settlement Logic ---
       if (target.type === 'member') {
         try {
           const memberRes = await query('SELECT member_name, member_code, bardan_opening FROM member_master WHERE id = ?', [target.id]);
           const member = memberRes.length > 0 ? memberRes[0] : null;
           if (member) {
             const code = member.member_code;
             const takenRes = await query('SELECT SUM(qty) as total FROM bardan_entry WHERE code = ? AND company_id = ?', [code, companyId]);
             const returnedRes = await query('SELECT SUM(qty) as total FROM jama_bardan_entry WHERE code = ? AND company_id = ?', [code, companyId]);
             
             const taken = takenRes.length > 0 ? takenRes[0] : null;
             const returned = returnedRes.length > 0 ? returnedRes[0] : null;
             
             const bardan_balance = parseFloat(member.bardan_opening || 0) + parseFloat(taken?.total || 0) - parseFloat(returned?.total || 0);
             
             if (bardan_balance > 0) {
               const priceDataRes = await query('SELECT price_per_bardan FROM bardan_price_master WHERE company_id = ?', [companyId]);
               const priceData = priceDataRes.length > 0 ? priceDataRes[0] : null;
               const price = parseFloat(priceData?.price_per_bardan || 0);
               
               if (price > 0) {
                 const penalty = bardan_balance * price;
                 let bagsToClear = 0;
                 
                 if (amount >= penalty) {
                    bagsToClear = bardan_balance;
                 } else {
                    bagsToClear = Math.floor(amount / price);
                 }

                 if (bagsToClear > 0) {
                   await execute(`
                     INSERT INTO jama_bardan_entry (
                       company_id, financial_year, entry_date, 
                       book_type, pavti_no, mem_nominal, code, name, qty, remark
                     ) VALUES (?, ?, ?, 'J', ?, 'S', ?, ?, ?, ?)
                   `, [
                     companyId, '2026-27', date, referenceNo, 
                     code, member.member_name, bagsToClear, `Bardan Penalty Paid via Kapat (${rule.name})`
                   ]);
                 }
               }
             }
           }
         } catch (err) {
           console.error('Bardan Settlement Failure:', err);
         }
       }

       successCount++;
    }

    res.json({ success: true, message: `Successfully committed ${successCount} entries to account_ledger.` });
  } catch (error) {
    console.error('Batch Execution Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET transaction history for a target identity
router.get('/history/:type/:id', async (req, res) => {
  try {
     const { type, id } = req.params;
    const companyId = req.headers['x-company-id'];

    const history = await query(`
       SELECT 
         transaction_date as date, 
         description, 
         debit, 
         credit,
         reference_no
       FROM account_ledger
       WHERE ${type === 'member' ? 'member_id' : 'account_id'} = ? AND company_id = ?
       ORDER BY transaction_date DESC, created_at DESC
       LIMIT 50
    `, [id, companyId]);

    res.json({ success: true, data: history });
  } catch (error) {
     res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE deduction (Master)
router.delete('/:id', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    await execute('DELETE FROM deduction_master WHERE id = ? AND company_id = ?', [req.params.id, companyId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// GET: Get balance of a specific ACCOUNT for a specific IDENTITY (Member or Account)
router.get('/balance/:type/:dbId/:accountId', async (req, res) => {
  try {
    const { type, dbId, accountId } = req.params;
    const companyId = req.headers['x-company-id'];

    const stats = await query(`
       SELECT 
         COALESCE(SUM(COALESCE(debit, debit_amount, 0)), 0) as total_debit,
         COALESCE(SUM(COALESCE(credit, credit_amount, 0)), 0) as total_credit
       FROM account_ledger
       WHERE company_id = ? AND account_id = ? AND ${type === 'member' ? 'member_id' : 'account_id'} = ?
    `, [companyId, accountId, dbId]);

    const totalDebit = parseFloat(stats[0].total_debit || 0);
    const totalCredit = parseFloat(stats[0].total_credit || 0);
    const balance = totalCredit - totalDebit;

    res.json({ 
      success: true, 
      balance,
      total_debit: totalDebit,
      total_credit: totalCredit
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
