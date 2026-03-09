import db from './db.js';
import mysql from 'mysql2/promise';

async function addSampleItems() {
  const connection = await db.getConnection();
  
  try {
    console.log('🔄 Adding sample items...\n');

    // Sample items to insert
    const items = [
      {
        company_id: 2,
        item_name: 'Laptop Dell',
        item_code: 'DELL-001',
        barcode: '89745615678',
        category: 'Electronics',
        unit: 'PCS',
        tax_percentage: 18,
        reorder_level: 5
      },
      {
        company_id: 2,
        item_name: 'Mouse Logitech',
        item_code: 'LOG-MOUSE-001',
        barcode: '98765432101',
        category: 'Accessories',
        unit: 'PCS',
        tax_percentage: 5,
        reorder_level: 20
      },
      {
        company_id: 2,
        item_name: 'USB Cable 1m',
        item_code: 'USB-001',
        barcode: '12345678901',
        category: 'Accessories',
        unit: 'PCS',
        tax_percentage: 0,
        reorder_level: 50
      },
      {
        company_id: 2,
        item_name: 'Monitor LG 24"',
        item_code: 'LG-MON-24',
        barcode: '55555555555',
        category: 'Electronics',
        unit: 'PCS',
        tax_percentage: 12,
        reorder_level: 3
      }
    ];

    for (const item of items) {
      await connection.query(
        'INSERT INTO item_master (company_id, item_name, item_code, barcode, category, unit, tax_percentage, reorder_level, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
        [item.company_id, item.item_name, item.item_code, item.barcode, item.category, item.unit, item.tax_percentage, item.reorder_level]
      );
      console.log(`✅ Added: ${item.item_name} (Barcode: ${item.barcode})`);
    }

    // Now add rates for these items
    console.log('\n🔄 Adding item rates...\n');

    const rates = [
      { item_code: 'DELL-001', sale_rate: 45000 },
      { item_code: 'LOG-MOUSE-001', sale_rate: 1500 },
      { item_code: 'USB-001', sale_rate: 300 },
      { item_code: 'LG-MON-24', sale_rate: 18000 }
    ];

    for (const rate of rates) {
      // Get item_id first
      const [items] = await connection.query(
        'SELECT id FROM item_master WHERE item_code = ? AND company_id = 2',
        [rate.item_code]
      );

      if (items.length > 0) {
        const itemId = items[0].id;
        await connection.query(
          'INSERT INTO item_rate (company_id, item_id, sale_rate, effective_date) VALUES (?, ?, ?, CURDATE())',
          [2, itemId, rate.sale_rate]
        );
        console.log(`✅ Added rate: ${rate.item_code} = ₹${rate.sale_rate}`);
      }
    }

    console.log('\n✅ Sample items and rates added successfully!');
    console.log('\n📝 You can now use these barcodes to test:');
    console.log('   - 89745615478 (Laptop Dell)');
    console.log('   - 98765432101 (Mouse Logitech)');
    console.log('   - 12345678901 (USB Cable)');
    console.log('   - 55555555555 (Monitor LG)\n');

  } catch (error) {
    console.error('❌ Error adding items:', error.message);
  } finally {
    connection.release();
    process.exit(0);
  }
}

addSampleItems();
