import { query } from '../backend/db.js';
async function run() {
  try {
    const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'village'");
    console.log('VILLAGE COLUMNS:', res.map(r => r.column_name));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
