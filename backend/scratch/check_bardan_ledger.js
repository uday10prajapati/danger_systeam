
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

  console.log('--- member_master for code 1 ---');
  const [rows] = await connection.query('SELECT id, member_code FROM member_master WHERE member_code = "1" AND company_id = 2');
  console.table(rows);

  await connection.end();
}

check();
