
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

  const [rows] = await connection.query(`
    SELECT a.id, a.account_name, COUNT(*) as count 
    FROM account_ledger al 
    JOIN accounts a ON al.account_id = a.id 
    WHERE a.account_type = "sales" 
    GROUP BY a.id, a.account_name
  `);
  console.log('--- Sales Account Distribution ---');
  console.table(rows);

  await connection.end();
}

check();
