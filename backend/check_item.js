import { query } from './db.js';

async function checkItem() {
  const rows = await query('SELECT id, item_name, purchase_account_id FROM item_master WHERE id = 4');
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
checkItem();
