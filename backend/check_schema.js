
import { query } from './db.js';
async function check() {
  try {
    const res = await query('DESC sales');
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
