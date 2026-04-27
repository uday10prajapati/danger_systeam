import { query } from './db.js';

async function dump() {
  const rows = await query('SELECT * FROM account_ledger WHERE member_id = 3');
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
dump();
