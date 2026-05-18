import { query } from '../backend/db.js';
async function run() {
  const rows = await query("SELECT id, member_code, member_name, member_name_gu, eng_name FROM member_master LIMIT 50");
  console.log('ALL MEMBERS:', JSON.stringify(rows, null, 2));
  process.exit(0);
}
run();
