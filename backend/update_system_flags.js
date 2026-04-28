import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'danger_systeam',
});

async function updateSystemAccounts() {
  try {
    const connection = await pool.getConnection();
    
    await connection.query(
      `UPDATE accounts SET is_system = 1 
       WHERE account_code IN ('DS0001', 'BS0001', 'SYS-BARDAN', 'SYS-DANGAR')`
    );
    console.log('✅ Updated system flags for DS0001, BS0001, SYS-BARDAN, SYS-DANGAR');

    connection.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating accounts:', err.message);
    process.exit(1);
  }
}

updateSystemAccounts();
