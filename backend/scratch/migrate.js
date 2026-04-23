import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'superstore'
  });

  try {
    console.log('Adding columns to purchases table...');
    await connection.query(`
      ALTER TABLE purchases 
      ADD COLUMN driver_name VARCHAR(100), 
      ADD COLUMN mobile_number VARCHAR(20), 
      ADD COLUMN gadi_number VARCHAR(50)
    `);
    console.log('Migration successful!');
  } catch (err) {
    if (err.code === 'ER_DUP_COLUMN_NAME') {
      console.log('Columns already exist.');
    } else {
      console.error('Migration failed:', err);
    }
  } finally {
    await connection.end();
  }
}

migrate();
