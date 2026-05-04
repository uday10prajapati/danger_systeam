import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || ''),
  database: process.env.DB_NAME || 'danger_systeam',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting ledger migration for Sales...');
    
    const saleRes = await client.query(`
      UPDATE account_ledger 
      SET member_id = (
        SELECT member_id 
        FROM sales s 
        WHERE s.invoice_no = account_ledger.reference_no 
           OR ('SALE-' || CAST(s.id AS TEXT)) = account_ledger.reference_no
           OR account_ledger.description ILIKE ('%#' || s.invoice_no || '%')
        LIMIT 1
      ) 
      WHERE (description ILIKE '%Sale Inv%' OR transaction_type = 'SALE' OR transaction_type = 'cash_book')
        AND member_id IS NULL
        AND (description ILIKE '%Sale%')
    `);
    console.log('✅ Updated Sale rows:', saleRes.rowCount);

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
