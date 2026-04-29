
import { query } from './db.js';
async function run() {
  try {
    const sales = await query('DESCRIBE sales');
    const items = await query('DESCRIBE sale_items');
    console.log('--- SALES ---');
    console.log(JSON.stringify(sales, null, 2));
    console.log('--- ITEMS ---');
    console.log(JSON.stringify(items, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
