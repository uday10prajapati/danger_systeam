import { query, queryOne, execute } from './db.js';

async function consolidatedDataFix() {
  try {
    console.log('🚀 Starting Consolidated Data Repair...');

    // --- 1. RESOLVE SYSTEM ACCOUNTS ---
    const bardanAcc = await queryOne('SELECT id FROM accounts WHERE account_code = "BS0001"');
    const interestAcc = await queryOne('SELECT id FROM accounts WHERE account_code = "IK0001"');
    
    const bardanAccountId = bardanAcc?.id;
    const interestAccountId = interestAcc?.id || 12; // Default to 12 if code not found

    console.log(`📍 System Map: Bardan Acc ID: ${bardanAccountId}, Interest Acc ID: ${interestAccountId}`);

    // --- 2. RECOVER HIDDEN INTEREST ENTRIES ---
    console.log('🔍 Auditing Interest entries...');
    // Find entries that look like interest but aren't assigned to the interest account
    const misalignedInterest = await query(`
      SELECT id, description, account_id 
      FROM account_ledger 
      WHERE (description LIKE "%Interest%" OR description LIKE "%Vaj%") 
      AND (account_id != ? OR account_id IS NULL)
    `, [interestAccountId]);

    console.log(`📈 Found ${misalignedInterest.length} misaligned interest entries.`);
    for (const entry of misalignedInterest) {
       await execute('UPDATE account_ledger SET account_id = ? WHERE id = ?', [interestAccountId, entry.id]);
       console.log(`✅ Fixed Interest Entry ${entry.id}: Moved to Account ${interestAccountId}`);
    }

    // --- 3. SYNC BARDAN ENTRIES ---
    if (bardanAccountId) {
       console.log('📦 Auditing Bardan entries...');
       const entries = await query('SELECT * FROM bardan_entry');
       for (const entry of entries) {
          const existing = await queryOne('SELECT id FROM account_ledger WHERE source_table = "bardan_entry" AND source_id = ?', [entry.id]);
          if (!existing) {
             const ledgerDesc = `[BARDAN] Taken (#${entry.pavti_no}) | ${entry.remark || ''}`;
             await execute(`
                INSERT INTO account_ledger (
                   company_id, financial_year, account_id, member_id, 
                   transaction_date, reference_no, description, 
                   debit, credit, source_table, source_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             `, [
                entry.company_id, entry.financial_year || '2026-27', bardanAccountId, entry.member_id,
                entry.entry_date, entry.pavti_no, ledgerDesc,
                entry.qty || 0, 0, 'bardan_entry', entry.id
             ]);
             console.log(`✅ Synced Bardan Entry ${entry.id} with Qty ${entry.qty}`);
          } else {
             // Update existing 0.00 entries
             await execute(`
               UPDATE account_ledger SET debit = ?, description = ? 
               WHERE source_table = "bardan_entry" AND source_id = ?
             `, [entry.qty || 0, `[BARDAN] Taken (#${entry.pavti_no}) | ${entry.remark || ''}`, entry.id]);
             console.log(`✅ Updated existing Bardan Entry ${entry.id} to Qty ${entry.qty}`);
          }
       }

       const jamaEntries = await query('SELECT * FROM jama_bardan_entry');
       for (const entry of jamaEntries) {
          const existing = await queryOne('SELECT id FROM account_ledger WHERE source_table = "jama_bardan_entry" AND source_id = ?', [entry.id]);
          if (!existing) {
             const ledgerDesc = `[BARDAN] Returned (#${entry.pavti_no}) | ${entry.remark || ''}`;
             await execute(`
                INSERT INTO account_ledger (
                   company_id, financial_year, account_id, member_id, 
                   transaction_date, reference_no, description, 
                   debit, credit, source_table, source_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             `, [
                entry.company_id, entry.financial_year || '2026-27', bardanAccountId, entry.member_id,
                entry.entry_date, entry.pavti_no, ledgerDesc,
                0, entry.qty || 0, 'jama_bardan_entry', entry.id
             ]);
             console.log(`✅ Synced Jama Bardan Entry ${entry.id} with Qty ${entry.qty}`);
          } else {
             await execute(`
               UPDATE account_ledger SET credit = ?, description = ? 
               WHERE source_table = "jama_bardan_entry" AND source_id = ?
             `, [entry.qty || 0, `[BARDAN] Returned (#${entry.pavti_no}) | ${entry.remark || ''}`, entry.id]);
             console.log(`✅ Updated existing Jama Bardan Entry ${entry.id} to Qty ${entry.qty}`);
          }
       }
    }

    console.log('🎉 Consolidated Fix Complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Repair failed:', err);
    process.exit(1);
  }
}

consolidatedDataFix();
