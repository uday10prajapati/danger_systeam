import db from './db.js';

/**
 * Script to delete all data from database except company data
 * This script will:
 * 1. Delete all records from transaction tables (sales, purchases, returns, etc.)
 * 2. Keep all company data intact
 * 3. Preserve the database structure
 */

// Helper function to check if table exists
async function tableExists(connection, tableName) {
  try {
    const [result] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [tableName]
    );
    return result.length > 0;
  } catch (error) {
    return false;
  }
}

// Helper function to safely delete from table
async function safeDelete(connection, tableName) {
  try {
    if (await tableExists(connection, tableName)) {
      await connection.query(`DELETE FROM ${tableName}`);
      console.log(`✅ Deleted data from ${tableName}`);
    } else {
      console.log(`⚠️  Table ${tableName} doesn't exist, skipping...`);
    }
  } catch (error) {
    console.error(`❌ Error deleting from ${tableName}:`, error.message);
    throw error;
  }
}

async function clearAllDataExceptCompany() {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log('🔄 Starting data deletion process...\n');

    // Order matters! Delete dependent records first
    
    // 1. Delete Sale Returns and their items
    console.log('Processing sale returns...');
    await safeDelete(connection, 'sale_return_items');
    await safeDelete(connection, 'sale_returns');
    
    // 2. Delete Sales and their items
    console.log('Processing sales...');
    await safeDelete(connection, 'sale_items');
    await safeDelete(connection, 'sales');
    
    // 3. Delete Purchase Returns and their items
    console.log('Processing purchase returns...');
    await safeDelete(connection, 'purchase_return_items');
    await safeDelete(connection, 'purchase_returns');
    
    // 4. Delete Purchases and their items
    console.log('Processing purchases...');
    await safeDelete(connection, 'purchase_items');
    await safeDelete(connection, 'purchases');
    
    // 5. Delete Stock Ledger
    console.log('Processing stock ledger...');
    await safeDelete(connection, 'purchase_stock_ledger');
    
    // 6. Delete Customer Ledger
    console.log('Processing customer ledger...');
    await safeDelete(connection, 'customer_ledger');
    
    // 7. Delete Supplier Ledger
    console.log('Processing supplier ledger...');
    await safeDelete(connection, 'supplier_ledger');
    
    // 8. Delete Account Ledger
    console.log('Processing account ledger...');
    await safeDelete(connection, 'account_ledger');
    
    // 9. Delete Cash Book
    console.log('Processing cash book...');
    await safeDelete(connection, 'cash_book');
    
    // 10. Delete Item Rates
    console.log('Processing item rates...');
    await safeDelete(connection, 'item_rate');
    
    // 11. Delete Items
    console.log('Processing items...');
    await safeDelete(connection, 'item_master');
    
    // 12. Delete Member Codes
    console.log('Processing member codes...');
    await safeDelete(connection, 'member_code');
    
    // 13. Delete Members
    console.log('Processing members...');
    await safeDelete(connection, 'member_master');
    
    // 14. Delete Accounts
    console.log('Processing accounts...');
    await safeDelete(connection, 'accounts');
    
    // 15. Delete Users
    console.log('Processing users...');
    await safeDelete(connection, 'users');
    
    // 16. Delete Products
    console.log('Processing products...');
    await safeDelete(connection, 'products');
    
    // 17. Delete Inventory Log
    console.log('Processing inventory logs...');
    await safeDelete(connection, 'inventory_log');
    
    // KEEP: company table intact
    
    await connection.commit();
    
    console.log('\n✅ Data deletion completed successfully!');
    console.log('✅ Company data has been preserved');
    console.log('\n📊 Summary:');
    console.log('  - All transactions deleted (sales, purchases, returns)');
    console.log('  - All ledger entries deleted (account, cash, customer, supplier)');
    console.log('  - All items, members, and accounts deleted');
    console.log('  - Company master data intact');
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error during data deletion:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

// Run the script
try {
  await clearAllDataExceptCompany();
  process.exit(0);
} catch (err) {
  console.error('❌ Failed to clear data:', err);
  process.exit(1);
}
