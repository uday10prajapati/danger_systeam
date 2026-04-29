import { query } from './db.js';

async function viewAccounts() {
  try {
    const accounts = await query('SELECT id, account_name, account_code FROM accounts');
    console.table(accounts);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

viewAccounts();
