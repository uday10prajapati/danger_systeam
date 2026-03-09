import db, { query } from './db.js';

/**
 * Migration: Add GST columns to sales, sale_items, purchases, and purchase_items tables
 * Also creates gst_master table for allowed GST percentages
 */

async function migrateGST() {
  try {
    console.log('🔄 Starting GST Migration...');

    // Initialize connection pool (not strictly necessary but good practice)
    // const pool = await db.createConnectionPool();

    // 1. Create GST Master table (reference table)
    console.log('📋 Creating gst_master table...');
    await query(`
      CREATE TABLE IF NOT EXISTS gst_master (
        id INT AUTO_INCREMENT PRIMARY KEY,
        gst_percent DECIMAL(5, 2) NOT NULL UNIQUE,
        description VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_gst_percent (gst_percent)
      )
    `);

    // 2. Insert standard GST percentages
    console.log('📝 Inserting standard GST percentages...');
    await query(`
      INSERT IGNORE INTO gst_master (gst_percent, description, is_active)
      VALUES 
        (0, 'Exempt Items', TRUE),
        (5, 'Essential Goods', TRUE),
        (12, 'Mid-range Goods', TRUE),
        (18, 'Premium Goods', TRUE),
        (28, 'Luxury Items', TRUE)
    `);

    // 3. Add GST columns to sales table
    console.log('📊 Adding GST columns to sales table...');
    const saleColumns = [
      'taxable_amount DECIMAL(12, 2) DEFAULT 0',
      'gst_percent DECIMAL(5, 2) DEFAULT 0',
      'cgst_percent DECIMAL(5, 2) DEFAULT 0',
      'sgst_percent DECIMAL(5, 2) DEFAULT 0',
      'igst_percent DECIMAL(5, 2) DEFAULT 0',
      'cgst_amount DECIMAL(12, 2) DEFAULT 0',
      'sgst_amount DECIMAL(12, 2) DEFAULT 0',
      'igst_amount DECIMAL(12, 2) DEFAULT 0',
      'total_tax DECIMAL(12, 2) DEFAULT 0',
      'is_intra_state BOOLEAN DEFAULT TRUE'
    ];

    for (const column of saleColumns) {
      try {
        await query(`ALTER TABLE sales ADD COLUMN ${column}`);
        console.log(`  ✅ Added: ${column.split(' ')[0]}`);
      } catch (error) {
        if (error.message.includes('Duplicate')) {
          console.log(`  ⏭️  Already exists: ${column.split(' ')[0]}`);
        } else {
          throw error;
        }
      }
    }

    // 4. Add GST columns to sale_items table
    console.log('📋 Adding GST columns to sale_items table...');
    const saleItemColumns = [
      'taxable_amount DECIMAL(12, 2) DEFAULT 0',
      'gst_percent DECIMAL(5, 2) DEFAULT 0',
      'gst_amount DECIMAL(12, 2) DEFAULT 0'
    ];

    for (const column of saleItemColumns) {
      try {
        await query(`ALTER TABLE sale_items ADD COLUMN ${column}`);
        console.log(`  ✅ Added: ${column.split(' ')[0]}`);
      } catch (error) {
        if (error.message.includes('Duplicate')) {
          console.log(`  ⏭️  Already exists: ${column.split(' ')[0]}`);
        } else {
          throw error;
        }
      }
    }

    // 5. Add GST columns to purchases table
    console.log('📊 Adding GST columns to purchases table...');
    for (const column of saleColumns) {
      const colName = column.split(' ')[0];
      try {
        await query(`ALTER TABLE purchases ADD COLUMN ${column}`);
        console.log(`  ✅ Added: ${colName}`);
      } catch (error) {
        if (error.message.includes('Duplicate')) {
          console.log(`  ⏭️  Already exists: ${colName}`);
        } else {
          throw error;
        }
      }
    }

    // 6. Add GST columns to purchase_items table
    console.log('📋 Adding GST columns to purchase_items table...');
    for (const column of saleItemColumns) {
      const colName = column.split(' ')[0];
      try {
        await query(`ALTER TABLE purchase_items ADD COLUMN ${column}`);
        console.log(`  ✅ Added: ${colName}`);
      } catch (error) {
        if (error.message.includes('Duplicate')) {
          console.log(`  ⏭️  Already exists: ${colName}`);
        } else {
          throw error;
        }
      }
    }

    // 7. Add GST columns to sale_returns table (if exists)
    console.log('📋 Adding GST columns to sale_returns table (if exists)...');
    try {
      for (const column of saleColumns) {
        const colName = column.split(' ')[0];
        try {
          await query(`ALTER TABLE sale_returns ADD COLUMN ${column}`);
          console.log(`  ✅ Added: ${colName}`);
        } catch (error) {
          if (error.message.includes('Duplicate')) {
            console.log(`  ⏭️  Already exists: ${colName}`);
          }
        }
      }
    } catch (error) {
      console.log('  ℹ️  sale_returns table structure skipped');
    }

    // 8. Add GST columns to purchase_returns table (if exists)
    console.log('📋 Adding GST columns to purchase_returns table (if exists)...');
    try {
      for (const column of saleColumns) {
        const colName = column.split(' ')[0];
        try {
          await query(`ALTER TABLE purchase_returns ADD COLUMN ${column}`);
          console.log(`  ✅ Added: ${colName}`);
        } catch (error) {
          if (error.message.includes('Duplicate')) {
            console.log(`  ⏭️  Already exists: ${colName}`);
          }
        }
      }
    } catch (error) {
      console.log('  ℹ️  purchase_returns table structure skipped');
    }

    console.log('✅ GST Migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ GST Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateGST();
