/**
 * Migration: Add Initial Stock to Sample Items
 * Run: node backend/add-stock-to-items.js
 */

import db from './db.js';

const migrate = async () => {
  try {
    const conn = await db.getConnection();

    console.log('\n========================================');
    console.log('📦 ADDING INITIAL STOCK TO ITEMS');
    console.log('========================================\n');

    // Get all items from company 1
    const [items] = await conn.query(
      'SELECT id, item_code, item_name FROM item_master WHERE company_id = 1 AND is_active = 1'
    );

    console.log(`Found ${items.length} items to add stock\n`);

    let stockCount = 0;

    for (const item of items) {
      try {
        // Add 100 units of stock to each item
        const quantity = 100;

        const [result] = await conn.query(
          `INSERT INTO purchase_stock_ledger (
            company_id, 
            item_id, 
            quantity_in, 
            quantity_out,
            current_stock,
            transaction_type, 
            reference_no
          ) VALUES (?, ?, ?, 0, ?, 'INITIAL_STOCK', 'INIT-001')`,
          [1, item.id, quantity, quantity]
        );

        console.log(`✅ ${item.item_code}: Added ${quantity} units stock`);
        stockCount++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`⏭️  ${item.item_code}: Stock already exists, skipping`);
        } else {
          console.error(`❌ Error adding stock for ${item.item_code}:`, err.message);
        }
      }
    }

    console.log('\n========================================');
    console.log(`✨ Added stock to ${stockCount} items!`);
    console.log('========================================\n');
    console.log('📝 All items now have 100 units in stock.\n');

    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

migrate();
