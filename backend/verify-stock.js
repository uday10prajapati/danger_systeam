/**
 * Verify stock was added successfully
 */

import db from './db.js';

const verify = async () => {
  try {
    const conn = await db.getConnection();

    console.log('\n📊 Stock Verification:');
    console.log('=====================================\n');

    // Count items with stock
    const [countResult] = await conn.query(
      'SELECT COUNT(*) as count FROM purchase_stock_ledger WHERE company_id = 1 AND current_stock > 0'
    );
    console.log(`✅ Total items with stock: ${countResult[0].count}`);

    // Show sample of items with current stock
    const [items] = await conn.query(
      `SELECT 
        im.item_code,
        im.item_name,
        psl.current_stock,
        ir.sale_rate
      FROM purchase_stock_ledger psl
      JOIN item_master im ON psl.item_id = im.id
      JOIN item_rate ir ON im.id = ir.item_id
      WHERE psl.company_id = 1 AND ir.is_active = 1
      LIMIT 5`
    );

    console.log('\n📦 Sample Items with Stock:');
    items.forEach(item => {
      console.log(`   ${item.item_code}: ${item.current_stock} units @ ₹${item.sale_rate}`);
    });

    conn.release();
    console.log('\n✨ Stock is ready for sales!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

verify();
