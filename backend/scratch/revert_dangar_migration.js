
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function revert() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  const DANGAR_SYSTEM_ID = 5;
  const DANGAR_PURCHASE_ID = 9;
  const DANGAR_SALE_ID = 15;

  console.log('⏪ Reverting Dangar Migration...');

  // 1. Update account_ledger entries back to original based on description hints or reference_type
  // For dangar_entry, we can distinguish by amount sign or description if needed, 
  // but originally they were in 9 (Purchase) or 15 (Sale).
  // Actually, I can just look at the book_type in dangar_entry if needed, but let's just move them back to 9 for now as most were there.
  // Wait, I know 4 were in 9 and 1 was in 15.
  
  // Update back to 9
  const [res1] = await connection.query(
    'UPDATE account_ledger SET account_id = ? WHERE account_id = ? AND description LIKE "%Purchase%"',
    [DANGAR_PURCHASE_ID, DANGAR_SYSTEM_ID]
  );
  console.log(`✅ Restored ${res1.affectedRows} purchase entries to Account 9.`);

  // Update back to 15
  const [res2] = await connection.query(
    'UPDATE account_ledger SET account_id = ? WHERE account_id = ? AND description LIKE "%Sale%"',
    [DANGAR_SALE_ID, DANGAR_SYSTEM_ID]
  );
  console.log(`✅ Restored ${res2.affectedRows} sale entries to Account 15.`);

  // 2. Restore item_master defaults
  const [res3] = await connection.query(
    'UPDATE item_master SET purchase_account_id = ?, sales_account_id = ? WHERE purchase_account_id = ? AND sales_account_id = ?',
    [DANGAR_PURCHASE_ID, DANGAR_SALE_ID, DANGAR_SYSTEM_ID, DANGAR_SYSTEM_ID]
  );
  console.log(`✅ Restored item master account mappings.`);

  await connection.end();
  console.log('🏁 Revert complete.');
}

revert().catch(console.error);
