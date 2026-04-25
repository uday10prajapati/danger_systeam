import { query } from './db.js';
async function run() {
  try {
    const res = await query('DESCRIBE accounts');
    console.table(res);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
