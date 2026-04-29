import { query } from '../backend/db.js';

async function dumpLedger() {
  try {
    const rows = await query('SELECT * FROM account_ledger WHERE company_id = 2 ORDER BY id DESC LIMIT 20');
    console.log('--- LATEST LEDGER ENTRIES (Company 2) ---');
    console.table(rows);
    
    const accs = await query('SELECT id, account_name, account_code FROM accounts WHERE company_id = 2');
    console.log('--- ACCOUNTS (Company 2) ---');
    console.table(accs);
  } catch (err) {
    console.error(err);
  }
}

dumpLedger();
