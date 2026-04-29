
import { query } from './db.js';
async function check() {
  try {
    const rows = await query('DESCRIBE item_rate');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
