import db from './db.js';

/**
 * Migration script to add GST and TIN columns to accounts table
 * Run this once to update existing database
 */

async function migrateAddGstTin() {
  const connection = await db.getConnection();
  
  try {
    console.log('🔄 Starting migration: Add GST and TIN columns to accounts table...\n');

    // Check if gst_no column exists
    const [gstColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'gst_no'`
    );

    if (gstColumns.length === 0) {
      console.log('➕ Adding gst_no column to accounts table...');
      await connection.query(
        `ALTER TABLE accounts ADD COLUMN gst_no VARCHAR(15) AFTER email`
      );
      console.log('✅ gst_no column added successfully');
    } else {
      console.log('ℹ️  gst_no column already exists');
    }

    // Check if tin_no column exists
    const [tinColumns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' AND COLUMN_NAME = 'tin_no'`
    );

    if (tinColumns.length === 0) {
      console.log('➕ Adding tin_no column to accounts table...');
      await connection.query(
        `ALTER TABLE accounts ADD COLUMN tin_no VARCHAR(20) AFTER gst_no`
      );
      console.log('✅ tin_no column added successfully');
    } else {
      console.log('ℹ️  tin_no column already exists');
    }

    // Verify the columns
    console.log('\n✅ Verifying columns...');
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts' 
       AND COLUMN_NAME IN ('gst_no', 'tin_no')
       ORDER BY ORDINAL_POSITION`
    );

    if (columns.length > 0) {
      console.log('\n📊 Updated columns:');
      columns.forEach(col => {
        console.log(`  ✓ ${col.COLUMN_NAME} (${col.COLUMN_TYPE})`);
      });
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('📝 You can now use GST and TIN fields in your application.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Columns already exist - no action needed');
    } else {
      throw error;
    }
  } finally {
    connection.release();
    process.exit(0);
  }
}

// Run migration
migrateAddGstTin().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
