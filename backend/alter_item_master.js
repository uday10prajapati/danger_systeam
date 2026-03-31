import { execute } from './db.js';

async function alterTable() {
  const queries = [
    "ALTER TABLE item_master ADD COLUMN consider_in_autostock INT DEFAULT 0;",
    "ALTER TABLE item_master ADD COLUMN item_name_gu VARCHAR(255);",
    "ALTER TABLE item_master ADD COLUMN desc_en TEXT;",
    "ALTER TABLE item_master ADD COLUMN desc_gu TEXT;",
    "ALTER TABLE item_master ADD COLUMN unit_gu VARCHAR(50);",
    "ALTER TABLE item_master ADD COLUMN purchase_account_id INT;",
    "ALTER TABLE item_master ADD COLUMN sales_account_id INT;",
    "ALTER TABLE item_master ADD COLUMN do_auto_stock_in_sales INT DEFAULT 0;",
    "ALTER TABLE item_master ADD COLUMN opening_stock DECIMAL(10,3) DEFAULT 0.000;",
    "ALTER TABLE item_master ADD COLUMN opening_stock_value DECIMAL(10,2) DEFAULT 0.00;",
    "ALTER TABLE item_master ADD COLUMN minimum_stock DECIMAL(10,3) DEFAULT 0.000;",
    "ALTER TABLE item_master ADD COLUMN loss_per_kg DECIMAL(10,3) DEFAULT 0.000;",
    "ALTER TABLE item_master ADD COLUMN effective_date DATE;",
    "ALTER TABLE item_master ADD COLUMN sgst_percent DECIMAL(5,2) DEFAULT 0.00;",
    "ALTER TABLE item_master ADD COLUMN cgst_percent DECIMAL(5,2) DEFAULT 0.00;",
    "ALTER TABLE item_master ADD COLUMN igst_percent DECIMAL(5,2) DEFAULT 0.00;",
    "ALTER TABLE item_master ADD COLUMN cess_percent DECIMAL(5,2) DEFAULT 0.00;",
    "ALTER TABLE item_master ADD COLUMN hsn_code VARCHAR(50);"
  ];

  for(let q of queries) {
    try {
      await execute(q);
      console.log('Success:', q);
    } catch(err) {
      if(err.code === 'ER_DUP_FIELDNAME') {
        console.log('Column already exists, skipping:', q);
      } else {
        console.error('Error on query:', q, err.message);
      }
    }
  }
  process.exit();
}
alterTable();
