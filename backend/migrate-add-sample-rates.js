/**
 * Migration: Add Sample Item Rates to Item Rate Master
 * Creates active sale and purchase rates for sample items
 * Run: node backend/migrate-add-sample-rates.js
 */

import db from './db.js';

const migrate = async () => {
  try {
    const conn = await db.getConnection();

    console.log('🔄 Adding sample item rates...\n');

    // Get all active items from company 1
    const [items] = await conn.query(
      'SELECT id, item_code, sale_price, purchase_price FROM item_master WHERE company_id = 1 AND is_active = 1'
    );

    console.log(`Found ${items.length} items to add rates for\n`);

    let addedCount = 0;
    let skippedCount = 0;

    for (const item of items) {
      try {
        // Check if rate already exists
        const [existingRate] = await conn.query(
          'SELECT id FROM item_rate WHERE item_id = ? AND is_active = 1 LIMIT 1',
          [item.id]
        );

        if (existingRate && existingRate.length > 0) {
          console.log(`⏭️  Skipped (rate exists): ${item.item_code}`);
          skippedCount++;
          continue;
        }

        // Insert new rate
        await conn.query(
          `INSERT INTO item_rate (
            item_id, 
            sale_rate, 
            purchase_rate, 
            is_active, 
            effective_date
          ) VALUES (?, ?, ?, 1, NOW())`,
          [item.id, item.sale_price || 0, item.purchase_price || 0]
        );

        console.log(`✅ Added rate: ${item.item_code} - Sale: ₹${item.sale_price}, Purchase: ₹${item.purchase_price}`);
        addedCount++;
      } catch (err) {
        console.error(`❌ Error adding rate for ${item.item_code}:`, err.message);
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Added: ${addedCount} rates`);
    console.log(`⏭️  Skipped: ${skippedCount} rates (already exist)`);
    console.log(`📦 Total: ${addedCount + skippedCount}/${items.length} items processed`);

    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

migrate();
