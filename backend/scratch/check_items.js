
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  const [rows] = await connection.query('SELECT id, item_name, item_name_gu FROM item_master LIMIT 20');
  console.log('--- Item Master ---');
  console.table(rows);
  
  const [dangEntries] = await connection.query('SELECT de.id, de.item_id, im.item_name_gu FROM dangar_entry de LEFT JOIN item_master im ON de.item_id = im.id LIMIT 10');
  console.log('--- Dangar Entries ---');
  console.table(dangEntries);

  await connection.end();
}

check();
