import { query } from '../db.js';

async function checkData() {
  try {
    const members = await query('SELECT id, member_code, member_name, eng_name, village_name FROM member_master LIMIT 5');
    console.log('--- MEMBERS ---');
    console.table(members);
    
    const dangar = await query('SELECT quality_class, member_id FROM dangar_entry LIMIT 5');
    console.log('--- DANGAR ENTRIES ---');
    console.table(dangar);

    const accounts = await query('SELECT account_name FROM accounts LIMIT 5');
    console.log('--- ACCOUNTS ---');
    console.table(accounts);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkData();
