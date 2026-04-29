
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

  const [rows] = await connection.query('SELECT account_id, COUNT(*) as count FROM account_ledger WHERE reference_type = "dangar_entry" GROUP BY account_id');
  console.table(rows);

  const [accs] = await connection.query('SELECT id, account_name FROM accounts WHERE id IN (?)', [rows.map(r => r.account_id)]);
  console.table(accs);

  await connection.end();
}

check();
