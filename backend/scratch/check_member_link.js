
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

  const [cols] = await connection.query('SHOW COLUMNS FROM member_master');
  console.log('--- Member Master Columns ---');
  console.table(cols);
  
  const [sample] = await connection.query('SELECT id, member_name, account_id FROM member_master LIMIT 5');
  console.log('--- Member Samples ---');
  console.table(sample);

  await connection.end();
}

check();
