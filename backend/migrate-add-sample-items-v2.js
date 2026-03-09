/**
 * Migration: Add Sample Items to Item Master
 * Superstore sample items with realistic data
 * Run: node backend/migrate-add-sample-items-v2.js
 */

import db from './db.js';

const sampleItems = [
  // Groceries - Rice & Flour
  { item_code: 'RICE-BASMATI-1KG', item_name: 'Basmati Rice 1kg', barcode: 'RICE001', category: 'Groceries', unit: 'kg', purchase_price: 40, sale_price: 60, tax_percentage: 5, reorder_level: 10 },
  { item_code: 'RICE-REGULAR-5KG', item_name: 'Regular Rice 5kg', barcode: 'RICE002', category: 'Groceries', unit: 'kg', purchase_price: 180, sale_price: 250, tax_percentage: 5, reorder_level: 8 },
  { item_code: 'FLOUR-WHEAT-1KG', item_name: 'Wheat Flour 1kg', barcode: 'FLO001', category: 'Groceries', unit: 'kg', purchase_price: 25, sale_price: 40, tax_percentage: 5, reorder_level: 12 },
  { item_code: 'FLOUR-MAIDA-500G', item_name: 'Maida Flour 500g', barcode: 'FLO002', category: 'Groceries', unit: 'gm', purchase_price: 15, sale_price: 25, tax_percentage: 5, reorder_level: 15 },

  // Oils & Ghee
  { item_code: 'OIL-MUSTARD-1LTR', item_name: 'Mustard Oil 1L', barcode: 'OIL001', category: 'Oils & Ghee', unit: 'liter', purchase_price: 80, sale_price: 120, tax_percentage: 5, reorder_level: 8 },
  { item_code: 'OIL-SUNFLOWER-1LTR', item_name: 'Sunflower Oil 1L', barcode: 'OIL002', category: 'Oils & Ghee', unit: 'liter', purchase_price: 90, sale_price: 140, tax_percentage: 5, reorder_level: 10 },
  { item_code: 'GHEE-CLARIFIED-1KG', item_name: 'Clarified Ghee 1kg', barcode: 'GHE001', category: 'Oils & Ghee', unit: 'kg', purchase_price: 400, sale_price: 550, tax_percentage: 5, reorder_level: 5 },

  // Beverages
  { item_code: 'TEA-LOOSE-250G', item_name: 'Loose Tea 250g', barcode: 'TEA001', category: 'Beverages', unit: 'gm', purchase_price: 120, sale_price: 180, tax_percentage: 5, reorder_level: 10 },
  { item_code: 'COFFEE-INSTANT-100G', item_name: 'Instant Coffee 100g', barcode: 'COF001', category: 'Beverages', unit: 'gm', purchase_price: 150, sale_price: 220, tax_percentage: 5, reorder_level: 8 },
  { item_code: 'MILK-POWDER-500G', item_name: 'Milk Powder 500g', barcode: 'MIL001', category: 'Beverages', unit: 'gm', purchase_price: 200, sale_price: 300, tax_percentage: 5, reorder_level: 12 },

  // Spices
  { item_code: 'SPICE-TURMERIC-100G', item_name: 'Turmeric Powder 100g', barcode: 'SPI001', category: 'Spices', unit: 'gm', purchase_price: 30, sale_price: 55, tax_percentage: 5, reorder_level: 15 },
  { item_code: 'SPICE-CHILI-100G', item_name: 'Red Chili Powder 100g', barcode: 'SPI002', category: 'Spices', unit: 'gm', purchase_price: 40, sale_price: 70, tax_percentage: 5, reorder_level: 12 },
  { item_code: 'SPICE-CUMIN-100G', item_name: 'Cumin Seeds 100g', barcode: 'SPI003', category: 'Spices', unit: 'gm', purchase_price: 50, sale_price: 90, tax_percentage: 5, reorder_level: 10 },
  { item_code: 'SPICE-CORIANDER-100G', item_name: 'Coriander Powder 100g', barcode: 'SPI004', category: 'Spices', unit: 'gm', purchase_price: 35, sale_price: 60, tax_percentage: 5, reorder_level: 10 },

  // Snacks & Dry Foods
  { item_code: 'SNACK-CHIPS-50G', item_name: 'Potato Chips 50g', barcode: 'SNK001', category: 'Snacks', unit: 'unit', purchase_price: 8, sale_price: 15, tax_percentage: 5, reorder_level: 25 },
  { item_code: 'SNACK-BISCUITS-250G', item_name: 'Marie Biscuits 250g', barcode: 'SNK002', category: 'Snacks', unit: 'unit', purchase_price: 25, sale_price: 40, tax_percentage: 5, reorder_level: 20 },
  { item_code: 'SNACK-POPCORN-100G', item_name: 'Popcorn 100g', barcode: 'SNK003', category: 'Snacks', unit: 'unit', purchase_price: 15, sale_price: 30, tax_percentage: 5, reorder_level: 20 },

  // Canned & Packaged
  { item_code: 'CAN-TOMATO-400G', item_name: 'Canned Tomato 400g', barcode: 'CAN001', category: 'Canned Foods', unit: 'unit', purchase_price: 30, sale_price: 50, tax_percentage: 5, reorder_level: 15 },
  { item_code: 'CAN-CORN-425G', item_name: 'Canned Corn 425g', barcode: 'CAN002', category: 'Canned Foods', unit: 'unit', purchase_price: 35, sale_price: 60, tax_percentage: 5, reorder_level: 12 },

  // Dairy & Eggs
  { item_code: 'BUTTER-500G', item_name: 'Butter 500g', barcode: 'DAI001', category: 'Dairy', unit: 'unit', purchase_price: 180, sale_price: 280, tax_percentage: 5, reorder_level: 8 },
  { item_code: 'YOGURT-400G', item_name: 'Yogurt 400g', barcode: 'DAI002', category: 'Dairy', unit: 'unit', purchase_price: 25, sale_price: 40, tax_percentage: 5, reorder_level: 20 },
  { item_code: 'CHEESE-200G', item_name: 'Processed Cheese 200g', barcode: 'DAI003', category: 'Dairy', unit: 'unit', purchase_price: 120, sale_price: 180, tax_percentage: 5, reorder_level: 10 },

  // Fruits & Vegetables (per kg)
  { item_code: 'VEG-ONION-1KG', item_name: 'Onions 1kg', barcode: 'VEG001', category: 'Vegetables', unit: 'kg', purchase_price: 20, sale_price: 35, tax_percentage: 5, reorder_level: 20 },
  { item_code: 'VEG-TOMATO-1KG', item_name: 'Tomatoes 1kg', barcode: 'VEG002', category: 'Vegetables', unit: 'kg', purchase_price: 25, sale_price: 45, tax_percentage: 5, reorder_level: 15 },
  { item_code: 'VEG-POTATO-1KG', item_name: 'Potatoes 1kg', barcode: 'VEG003', category: 'Vegetables', unit: 'kg', purchase_price: 15, sale_price: 30, tax_percentage: 5, reorder_level: 25 },
  { item_code: 'FRUIT-BANANA-1KG', item_name: 'Bananas 1kg', barcode: 'FRU001', category: 'Fruits', unit: 'kg', purchase_price: 30, sale_price: 50, tax_percentage: 5, reorder_level: 12 },
  { item_code: 'FRUIT-APPLE-1KG', item_name: 'Apples 1kg', barcode: 'FRU002', category: 'Fruits', unit: 'kg', purchase_price: 80, sale_price: 120, tax_percentage: 5, reorder_level: 8 },

  // Soap & Detergent (GST 18%)
  { item_code: 'SOAP-BATH-100G', item_name: 'Bath Soap 100g', barcode: 'SOP001', category: 'Toiletries', unit: 'unit', purchase_price: 15, sale_price: 30, tax_percentage: 18, reorder_level: 20 },
  { item_code: 'DETERGENT-500G', item_name: 'Laundry Detergent 500g', barcode: 'DET001', category: 'Cleaning', unit: 'unit', purchase_price: 60, sale_price: 100, tax_percentage: 18, reorder_level: 12 },
  { item_code: 'SHAMPOO-200ML', item_name: 'Shampoo 200ml', barcode: 'SHA001', category: 'Toiletries', unit: 'ml', purchase_price: 50, sale_price: 90, tax_percentage: 18, reorder_level: 10 },

  // Electronics & Batteries (GST 18%)
  { item_code: 'BATTERY-AA-PACK4', item_name: 'AA Batteries Pack of 4', barcode: 'BAT001', category: 'Electronics', unit: 'unit', purchase_price: 100, sale_price: 180, tax_percentage: 18, reorder_level: 10 },
  { item_code: 'BULB-LED-9W', item_name: 'LED Bulb 9W', barcode: 'BUL001', category: 'Electronics', unit: 'unit', purchase_price: 40, sale_price: 80, tax_percentage: 18, reorder_level: 15 },
];

const migrate = async () => {
  try {
    const conn = await db.getConnection();
    let addedCount = 0;
    let skippedCount = 0;

    console.log('🔄 Adding sample items to Item Master...\n');

    for (const item of sampleItems) {
      try {
        const [result] = await conn.query(
          'INSERT INTO item_master (company_id, item_code, item_name, barcode, category, unit, purchase_price, sale_price, tax_percentage, reorder_level, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [1, item.item_code, item.item_name, item.barcode, item.category, item.unit, item.purchase_price, item.sale_price, item.tax_percentage, item.reorder_level, 1]
        );
        console.log(`✅ Added: ${item.item_code} - ${item.item_name}`);
        addedCount++;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log(`⏭️  Skipped (already exists): ${item.item_code}`);
          skippedCount++;
        } else {
          console.error(`❌ Error adding ${item.item_code}:`, err.message);
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Added: ${addedCount} items`);
    console.log(`⏭️  Skipped: ${skippedCount} items (already exist)`);
    console.log(`📦 Total: ${addedCount + skippedCount}/${sampleItems.length} items processed`);

    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
};

migrate();
