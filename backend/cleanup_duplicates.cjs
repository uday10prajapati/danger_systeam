const { execute, query } = require('./db.js');

async function cleanup() {
  try {
    console.log('Starting Database Cleanup...');

    // 1. Bardan System (Merge 3 -> 4)
    console.log('Merging Bardan Account 3 into 4...');
    await execute("UPDATE account_ledger SET account_id = 4 WHERE account_id = 3");
    await execute("UPDATE bardan_entry SET account_id = 4 WHERE account_id = 3");
    await execute("UPDATE jama_bardan_entry SET account_id = 4 WHERE account_id = 3");
    await execute("UPDATE member_master SET account_id = 4 WHERE account_id = 3");
    await execute("DELETE FROM accounts WHERE id = 3");

    // 2. Dangar System (Merge 2 -> 1)
    console.log('Merging Dangar Account 2 into 1...');
    await execute("UPDATE account_ledger SET account_id = 1 WHERE account_id = 2");
    await execute("UPDATE dangar_entry SET account_id = 1 WHERE account_id = 2");
    await execute("UPDATE member_master SET account_id = 1 WHERE account_id = 2");
    await execute("DELETE FROM accounts WHERE id = 2");

    console.log('✅ Cleanup Complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup Failed', err);
    process.exit(1);
  }
}

cleanup();
