
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  const DANGAR_SYSTEM_ID = 5;
  const DANGAR_PURCHASE_ID = 9;
  const DANGAR_SALE_ID = 15;

  console.log('🚀 Starting Dangar Migration to "Dangar System" (ID 5)...');

  // 1. Update account_ledger entries
  const [res1] = await connection.query(
    'UPDATE account_ledger SET account_id = ? WHERE account_id IN (?, ?)',
    [DANGAR_SYSTEM_ID, DANGAR_PURCHASE_ID, DANGAR_SALE_ID]
  );
  console.log(`✅ Updated ${res1.affectedRows} ledger entries to Dangar System.`);

  // 2. Update item_master defaults
  const [res2] = await connection.query(
    'UPDATE item_master SET purchase_account_id = ?, sales_account_id = ? WHERE purchase_account_id = ? OR sales_account_id = ?',
    [DANGAR_SYSTEM_ID, DANGAR_SYSTEM_ID, DANGAR_PURCHASE_ID, DANGAR_SALE_ID]
  );
  console.log(`✅ Updated ${res2.affectedRows} items to use Dangar System as default.`);

  // 3. Update any items that have NULL but are dangar items?
  // We'll just target items with "dangar" in name if any
  const [res3] = await connection.query(
    'UPDATE item_master SET purchase_account_id = ? WHERE (item_name LIKE "%dangar%" OR item_name LIKE "%ડાંગર%") AND purchase_account_id IS NULL',
    [DANGAR_SYSTEM_ID]
  );
  console.log(`✅ Updated ${res3.affectedRows} additional dangar items.`);

  await connection.end();
  console.log('🏁 Migration complete.');
}

migrate().catch(console.error);
