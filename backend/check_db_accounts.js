import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function check() {
  const { Client } = pg;
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '6099',
    database: process.env.DB_NAME || 'danger_systeam',
    port: parseInt(process.env.DB_PORT || '5432')
  });

  try {
    await client.connect();
    const res = await client.query('SELECT id, account_name, account_name_gu, account_code FROM accounts');
    console.log("ACCOUNTS IN DB:");
    res.rows.forEach(r => {
      console.log(`ID: ${r.id} | Code: ${r.account_code} | Name: ${r.account_name} | Name_GU: ${r.account_name_gu}`);
    });
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await client.end();
  }
}

check();
