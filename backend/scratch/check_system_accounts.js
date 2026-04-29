
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

  const [accs] = await connection.query('SELECT id, account_name, account_code FROM accounts WHERE account_name LIKE "%System%" OR account_name LIKE "%Dangar%" OR account_name LIKE "%Bardan%"');
  console.log('--- Relevant Accounts ---');
  console.table(accs);

  await connection.end();
}

check();
