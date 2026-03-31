import db from './db.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const connection = await db.getConnection();
  console.log("Adding columns to purchases...");
  try { await connection.query("ALTER TABLE purchases ADD COLUMN taxable_amount DECIMAL(10, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchases ADD COLUMN gst_percent DECIMAL(5, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchases ADD COLUMN cgst_percent DECIMAL(5, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchases ADD COLUMN sgst_percent DECIMAL(5, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchases ADD COLUMN igst_percent DECIMAL(5, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchases ADD COLUMN cgst_amount DECIMAL(10, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchases ADD COLUMN sgst_amount DECIMAL(10, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchases ADD COLUMN igst_amount DECIMAL(10, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchases ADD COLUMN total_tax DECIMAL(10, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchases ADD COLUMN is_intra_state INT DEFAULT 1"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchases ADD COLUMN payment_type VARCHAR(50) DEFAULT 'credit'"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchases ADD COLUMN net_amount DECIMAL(10, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }

  console.log("Adding columns to purchase_items...");
  try { await connection.query("ALTER TABLE purchase_items ADD COLUMN taxable_amount DECIMAL(10, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchase_items ADD COLUMN gst_percent DECIMAL(5, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchase_items ADD COLUMN cgst_percent DECIMAL(5, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchase_items ADD COLUMN sgst_percent DECIMAL(5, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchase_items ADD COLUMN igst_percent DECIMAL(5, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchase_items ADD COLUMN cgst_amount DECIMAL(10, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchase_items ADD COLUMN sgst_amount DECIMAL(10, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchase_items ADD COLUMN igst_amount DECIMAL(10, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchase_items ADD COLUMN gst_amount DECIMAL(10, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  try { await connection.query("ALTER TABLE purchase_items ADD COLUMN total_tax DECIMAL(10, 2) DEFAULT 0"); } catch(e) { console.log(e.message) }
  
  console.log("Done");
  process.exit();
}
test();
