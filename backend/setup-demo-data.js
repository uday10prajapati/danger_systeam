/**
 * Complete Setup Script: Add Sample Company, Items, and Rates
 * Run this ONCE to set up a complete demo environment
 * Run: node backend/setup-demo-data.js
 */

import db from './db.js';

const sampleCompany = {
  company_name: 'Demo Superstore',
  email: 'demo@superstore.com',
  phone: '9876543210',
  address: '123 Main Street, Ahmedabad, Gujarat',
  gst_number: '27AABCU9603R1Z5',
  financial_year_start: '2025-04-01',
  financial_year_end: '2026-03-31'
};

const sampleItems = [
  { item_code: 'RICE-BASMATI-1KG', item_name: 'Basmati Rice 1kg', barcode: 'RICE001', category: 'Groceries', unit: 'kg', purchase_price: 40, sale_price: 60, tax_percentage: 5, reorder_level: 10 },
  { item_code: 'RICE-REGULAR-5KG', item_name: 'Regular Rice 5kg', barcode: 'RICE002', category: 'Groceries', unit: 'kg', purchase_price: 180, sale_price: 250, tax_percentage: 5, reorder_level: 8 },
  { item_code: 'FLOUR-WHEAT-1KG', item_name: 'Wheat Flour 1kg', barcode: 'FLO001', category: 'Groceries', unit: 'kg', purchase_price: 25, sale_price: 40, tax_percentage: 5, reorder_level: 12 },
  { item_code: 'OIL-MUSTARD-1LTR', item_name: 'Mustard Oil 1L', barcode: 'OIL001', category: 'Oils & Ghee', unit: 'liter', purchase_price: 80, sale_price: 120, tax_percentage: 5, reorder_level: 8 },
  { item_code: 'OIL-SUNFLOWER-1LTR', item_name: 'Sunflower Oil 1L', barcode: 'OIL002', category: 'Oils & Ghee', unit: 'liter', purchase_price: 90, sale_price: 140, tax_percentage: 5, reorder_level: 10 },
  { item_code: 'TEA-LOOSE-250G', item_name: 'Loose Tea 250g', barcode: 'TEA001', category: 'Beverages', unit: 'gm', purchase_price: 120, sale_price: 180, tax_percentage: 5, reorder_level: 10 },
  { item_code: 'COFFEE-INSTANT-100G', item_name: 'Instant Coffee 100g', barcode: 'COF001', category: 'Beverages', unit: 'gm', purchase_price: 150, sale_price: 220, tax_percentage: 5, reorder_level: 8 },
  { item_code: 'MILK-POWDER-500G', item_name: 'Milk Powder 500g', barcode: 'MIL001', category: 'Beverages', unit: 'gm', purchase_price: 200, sale_price: 300, tax_percentage: 5, reorder_level: 12 },
  { item_code: 'SPICE-TURMERIC-100G', item_name: 'Turmeric Powder 100g', barcode: 'SPI001', category: 'Spices', unit: 'gm', purchase_price: 30, sale_price: 55, tax_percentage: 5, reorder_level: 15 },
  { item_code: 'SPICE-CHILI-100G', item_name: 'Red Chili Powder 100g', barcode: 'SPI002', category: 'Spices', unit: 'gm', purchase_price: 40, sale_price: 70, tax_percentage: 5, reorder_level: 12 },
  { item_code: 'SNACK-CHIPS-50G', item_name: 'Potato Chips 50g', barcode: 'SNK001', category: 'Snacks', unit: 'unit', purchase_price: 8, sale_price: 15, tax_percentage: 5, reorder_level: 25 },
  { item_code: 'SNACK-BISCUITS-250G', item_name: 'Marie Biscuits 250g', barcode: 'SNK002', category: 'Snacks', unit: 'unit', purchase_price: 25, sale_price: 40, tax_percentage: 5, reorder_level: 20 },
  { item_code: 'SOAP-BATH-100G', item_name: 'Bath Soap 100g', barcode: 'SOP001', category: 'Toiletries', unit: 'unit', purchase_price: 15, sale_price: 30, tax_percentage: 18, reorder_level: 20 },
  { item_code: 'BATTERY-AA-PACK4', item_name: 'AA Batteries Pack of 4', barcode: 'BAT001', category: 'Electronics', unit: 'unit', purchase_price: 100, sale_price: 180, tax_percentage: 18, reorder_level: 10 },
];

const migrate = async () => {
  try {
    const conn = await db.getConnection();

    console.log('\n========================================');
    console.log('🚀 DEMO DATA SETUP - Superstore');
    console.log('========================================\n');

    // Step 1: Add Company
    console.log('📋 Step 1: Adding sample company...');
    const [companyResult] = await conn.query(
      `INSERT INTO company (company_name, email, phone, address, gst_number, financial_year_start, financial_year_end, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        sampleCompany.company_name,
        sampleCompany.email,
        sampleCompany.phone,
        sampleCompany.address,
        sampleCompany.gst_number,
        sampleCompany.financial_year_start,
        sampleCompany.financial_year_end
      ]
    ).catch(err => {
      if (err.code === 'ER_DUP_ENTRY') {
        console.log('⏭️  Company already exists, skipping...');
        return [{ insertId: 1 }];
      }
      throw err;
    });

    const companyId = companyResult.insertId || 1;
    console.log(`✅ Company setup (ID: ${companyId})\n`);

    // Step 2: Add Items
    console.log('📦 Step 2: Adding sample items...');
    let itemCount = 0;
    const itemIds = [];

    for (const item of sampleItems) {
      try {
        const [result] = await conn.query(
          `INSERT INTO item_master (company_id, item_code, item_name, barcode, category, unit, purchase_price, sale_price, tax_percentage, reorder_level, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [companyId, item.item_code, item.item_name, item.barcode, item.category, item.unit, item.purchase_price, item.sale_price, item.tax_percentage, item.reorder_level]
        ).catch(err => {
          if (err.code === 'ER_DUP_ENTRY') {
            return null;
          }
          throw err;
        });

        if (result) {
          itemIds.push(result.insertId);
          console.log(`  ✅ ${item.item_code}: ${item.item_name} (barcode: ${item.barcode})`);
          itemCount++;
        }
      } catch (err) {
        console.error(`  ❌ Error adding ${item.item_code}:`, err.message);
      }
    }
    console.log(`✅ Added ${itemCount} items\n`);

    // Step 3: Add Item Rates
    console.log('💰 Step 3: Adding item rates...');
    
    // Get all items to add rates
    const [allItems] = await conn.query(
      'SELECT id, item_code, sale_price, purchase_price FROM item_master WHERE company_id = ? AND is_active = 1',
      [companyId]
    );

    let rateCount = 0;
    for (const item of allItems) {
      try {
        // Check if rate already exists
        const [exists] = await conn.query(
          'SELECT id FROM item_rate WHERE item_id = ? AND is_active = 1 LIMIT 1',
          [item.id]
        );

        if (exists.length === 0) {
          await conn.query(
            `INSERT INTO item_rate (company_id, item_id, sale_rate, purchase_rate, is_active, effective_from) 
             VALUES (?, ?, ?, ?, 1, CURDATE())`,
            [companyId, item.id, item.sale_price || 0, item.purchase_price || 0]
          );
          console.log(`  ✅ ${item.item_code}: Sale ₹${item.sale_price}, Purchase ₹${item.purchase_price}`);
          rateCount++;
        }
      } catch (err) {
        console.error(`  ❌ Error adding rate for ${item.item_code}:`, err.message);
      }
    }
    console.log(`✅ Added ${rateCount} rates\n`);

    console.log('========================================');
    console.log('✨ Demo Data Setup Complete!');
    console.log('========================================\n');
    console.log('📝 You can now:');
    console.log('  1. Try barcode scanning with: RICE001, TEA001, BAT001, etc.');
    console.log('  2. Create sales transactions');
    console.log('  3. View stock reports\n');

    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  }
};

migrate();
