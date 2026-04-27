import { execute } from './db.js';

async function finalFix() {
  try {
    // 1. Update the item mapping
    await execute('UPDATE item_master SET purchase_account_id = 9 WHERE id = 4');
    console.log('Item 4 updated to account 9');

    // 2. Update the ledger entries
    const result = await execute('UPDATE account_ledger SET account_id = 9 WHERE description LIKE "%Dangar Purchase - 4%" AND account_id IS NULL');
    console.log(`Repaired ${result.changes} ledger entries`);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
finalFix();
