
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

  const [counts] = await connection.query('SELECT account_id, COUNT(*) as count FROM account_ledger WHERE account_id IN (5, 6) GROUP BY account_id');
  console.log('--- Entry Counts ---');
  console.table(counts);

  await connection.end();
}

check();
