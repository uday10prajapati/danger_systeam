import { query } from '../backend/db.js';
async function run() {
  await query("UPDATE member_master SET member_name_gu = 'ઉદય', member_name = 'ઉદય' WHERE member_name = ']dy' OR eng_name = 'UDAY'");
  console.log('Member name updated');
  process.exit(0);
}
run();
