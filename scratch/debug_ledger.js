
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

async function check() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  try {
    const [rows] = await connection.query("SELECT * FROM account_ledger LIMIT 10");
    console.log("SAMPLE LEDGER ENTRIES:", JSON.stringify(rows, null, 2));
    
    const [counts] = await connection.query("SELECT COUNT(*) as total FROM account_ledger");
    console.log("TOTAL ENTRIES:", counts[0].total);
    
    const [accCount] = await connection.query("SELECT account_id, COUNT(*) as count FROM account_ledger GROUP BY account_id");
    console.log("ENTRIES BY ACCOUNT ID:", accCount);

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

check();
