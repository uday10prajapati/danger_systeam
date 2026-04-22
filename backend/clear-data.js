/* 
  File: backend/clear-data.js
  Purpose: Wipes all data from the database except for the 'company' table.
  Run manually: node backend/clear-data.js
*/

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function clearData() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('⚠️  WARNING: Starting data wipe (preserving company table)...');

    // Disable foreign key checks to allow truncating related tables
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    const tablesToClear = [
      'accounts',
      'item_master',
      'products',
      'sales',
      'sale_items',
      'purchases',
      'purchase_items',
      'purchase_stock_ledger',
      'supplier_ledger',
      'customer_ledger',
      'member_master',
      'cash_book',
      'account_ledger',
      'journal_vouchers',
      'journal_voucher_items',
      'item_rate',
      'gst',
      'inventory_log',
      'sale_returns',
      'sale_return_items',
      'purchase_returns',
      'purchase_return_items'
    ];

    for (const table of tablesToClear) {
      try {
        await connection.query(`TRUNCATE TABLE ${table}`);
        console.log(`✅ Cleared table: ${table}`);
      } catch (err) {
        console.warn(`⚠️  Could not clear table ${table} (it might not exist): ${err.message}`);
      }
    }

    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n✨ Database cleanup complete! All data except Company records has been removed.');
    console.log('👉 Remember: You will need to create a new admin user to log back in.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  } finally {
    await connection.end();
  }
}

clearData();
