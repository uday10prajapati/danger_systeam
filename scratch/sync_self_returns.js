
const { query, execute, queryOne } = require('../backend/db.js');

async function syncSelfReturns() {
  try {
    const bardanAccountIdResult = await queryOne('SELECT id FROM accounts WHERE (account_code = "BS0001" OR account_name = "Bardan System") LIMIT 1');
    const bardanAccountId = bardanAccountIdResult?.id;
    
    if (!bardanAccountId) {
      console.error('Bardan System account not found');
      return;
    }

    const rows = await query("SELECT * FROM jama_bardan_entry WHERE option_type = 'Self'");
    console.log(`Found ${rows.length} Self returns.`);

    for (const row of rows) {
      // Check if already in ledger
      const existing = await queryOne('SELECT id FROM account_ledger WHERE source_table = "jama_bardan_entry" AND source_id = ?', [row.id]);
      
      if (!existing) {
        console.log(`Syncing entry ID ${row.id}...`);
        const ledgerDesc = `[SELF] [BARDAN] Returned (#${row.pavti_no}) | ${row.remark || ''}`;
        
        await execute(`
          INSERT INTO account_ledger (
            company_id, financial_year, account_id, member_id, 
            transaction_date, reference_no, description, 
            debit, credit, source_table, source_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          row.company_id, row.financial_year || '2026-27', bardanAccountId, row.member_id,
          row.entry_date, row.pavti_no, ledgerDesc,
          0, row.qty || 0, 'jama_bardan_entry', row.id
        ]);
      } else {
        console.log(`Entry ID ${row.id} already in ledger, updating description...`);
        const ledgerDesc = `[SELF] [BARDAN] Returned (#${row.pavti_no}) | ${row.remark || ''}`;
        await execute('UPDATE account_ledger SET description = ? WHERE id = ?', [ledgerDesc, existing.id]);
      }
    }
    console.log('Sync complete.');
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

syncSelfReturns();
