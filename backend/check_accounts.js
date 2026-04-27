import { query } from './db.js';

async function checkAccounts() {
  const rows = await query('SELECT id, account_name, account_code FROM accounts WHERE account_code = "0005" OR id = 9');
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
checkAccounts();
