/**
 * Setup Sample Supplier for Demo
 * Run: node backend/setup-demo-supplier.js
 */

import db from './db.js';

const setup = async () => {
  try {
    const conn = await db.getConnection();

    console.log('\n========================================');
    console.log('📦 SETTING UP DEMO SUPPLIER');
    console.log('========================================\n');

    // Create supplier account for company 1
    const [result] = await conn.query(
      `INSERT INTO accounts (
        company_id, 
        account_type, 
        account_name,
        email,
        phone,
        gst_no,
        is_active
      ) VALUES (?, 'supplier', ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      [1, 'Fresh Farms Supplier', 'supplier@freshfarms.com', '9876543210', '18AABCT1234H1Z0']
    );

    console.log('✅ Sample Supplier Created/Verified');
    console.log(`   Company ID: 1`);
    console.log(`   Supplier Name: Fresh Farms Supplier`);
    console.log(`   Email: supplier@freshfarms.com`);
    console.log(`   Account ID: ${result.insertId}\n`);

    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  }
};

setup();
