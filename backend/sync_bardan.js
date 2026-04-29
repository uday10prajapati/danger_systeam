import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const execute = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { err ? reject(err) : resolve(this); });
});

async function syncExistingBardan() {
  try {
    console.log('🚀 Starting Bardan -> Ledger Synchronization...');

    // 1. Resolve Bardan System Account ID
    const bardanAccount = await query('SELECT id FROM accounts WHERE account_code = "BS0001"');
    const bardanAccountId = bardanAccount[0]?.id;

    if (!bardanAccountId) {
       console.error('❌ Error: Bardan System Account (BS0001) not found. Aborting.');
       return;
    }

    // 2. Sync Bardan Entries (Taking bags)
    const entries = await query('SELECT * FROM bardan_entry');
    console.log(`📦 Found ${entries.length} Bardan entries to sync.`);

    for (const entry of entries) {
       // Check if already synced
       const existing = await query('SELECT id FROM account_ledger WHERE source_table = "bardan_entry" AND source_id = ?', [entry.id]);
       if (existing.length > 0) {
          console.log(`⏩ Entry ${entry.id} already synced. Skipping.`);
          continue;
       }

       const ledgerDesc = `[BARDAN] Qty: ${entry.qty || 0} | Taken (#${entry.pavti_no}) | ${entry.remark || ''}`;
       await execute(`
          INSERT INTO account_ledger (
             company_id, financial_year, account_id, member_id, 
             transaction_date, reference_no, description, 
             debit, credit, source_table, source_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       `, [
          entry.company_id, entry.financial_year || '2026-27', bardanAccountId, entry.member_id,
          entry.entry_date, entry.pavti_no, ledgerDesc,
          0, 0, 'bardan_entry', entry.id
       ]);
       console.log(`✅ Synced Bardan Entry ${entry.id}`);
    }

    // 3. Sync Jama Bardan Entries (Returning bags)
    const jamaEntries = await query('SELECT * FROM jama_bardan_entry');
    console.log(`📥 Found ${jamaEntries.length} Jama Bardan entries to sync.`);

    for (const entry of jamaEntries) {
       const existing = await query('SELECT id FROM account_ledger WHERE source_table = "jama_bardan_entry" AND source_id = ?', [entry.id]);
       if (existing.length > 0) continue;

       const ledgerDesc = `[BARDAN] Qty: ${entry.qty || 0} | Returned (#${entry.pavti_no}) | ${entry.remark || ''}`;
       await execute(`
          INSERT INTO account_ledger (
             company_id, financial_year, account_id, member_id, 
             transaction_date, reference_no, description, 
             debit, credit, source_table, source_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       `, [
          entry.company_id, entry.financial_year || '2026-27', bardanAccountId, entry.member_id,
          entry.entry_date, entry.pavti_no, ledgerDesc,
          0, 0, 'jama_bardan_entry', entry.id
       ]);
       console.log(`✅ Synced Jama Bardan Entry ${entry.id}`);
    }

    console.log('🎉 Synchronization Complete!');
  } catch (err) {
    console.error('❌ Sync failed:', err);
  } finally {
    db.close();
  }
}

syncExistingBardan();
