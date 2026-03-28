import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'superstore'
});

async function addAdmin() {
  const connection = await pool.getConnection();
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const [companies] = await connection.execute('SELECT id FROM company LIMIT 1');
    const companyId = companies?.[0]?.id || 1;
    
    await connection.execute(
      'INSERT IGNORE INTO users (username, email, password, role, company_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, NOW())',
      ['Admin', 'admin@superstore.com', hashedPassword, 'admin', companyId]
    );
    
    console.log('Admin setup complete');
    console.log('Username: Admin');
    console.log('Password: admin123');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.release();
    await pool.end();
  }
}

addAdmin();
