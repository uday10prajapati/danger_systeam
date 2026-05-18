import { query } from '../backend/db.js';
async function run() {
  try {
    const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'company'");
    console.log('COMPANY COLUMNS:', res.map(r => r.column_name));
    
    const res2 = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'member_master'");
    console.log('MEMBER COLUMNS:', res2.map(r => r.column_name));
    
    const res3 = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'item_master'");
    console.log('ITEM COLUMNS:', res3.map(r => r.column_name));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
