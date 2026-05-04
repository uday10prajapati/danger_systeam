import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;
const poolInstance = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || ''),
  database: process.env.DB_NAME || 'danger_systeam',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function inspect() {
  const client = await poolInstance.connect();
  try {
    const res = await client.query("SELECT description FROM account_ledger WHERE reference_type = 'jama_bardan_entry'");
    console.table(res.rows);
  } catch (err) {
    console.error(err.message);
  } finally {
    client.release();
    await poolInstance.end();
  }
}

inspect();
