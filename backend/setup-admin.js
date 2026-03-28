import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'superstore',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function createAdmin() {
  let connection;
  try {
    connection = await pool.getConnection();
    const hashedPassword = await bcrypt.hash('admin@123', 10);
    
    const [companies] = await connection.execute('SELECT id FROM company LIMIT 1');
    const companyId = companies?.[0]?.id || 1;
    
    const [result] = await connection.execute(
      'INSERT IGNORE INTO users (username, email, password, role, company_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, NOW())',
      ['admin', 'admin@superstore.com', hashedPassword, 'admin', companyId]
    );
    
    if (result.affectedRows > 0) {
      console.log('✓ Admin user created successfully!');
    } else {
      console.log('✓ Admin user already exists!');
    }
    
    console.log('');
    console.log('LOGIN CREDENTIALS:');
    console.log('==================');
    console.log('Username: admin');
    console.log('Password: admin@123');
    console.log('Email: admin@superstore.com');
    console.log('==================');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.release();
    await pool.end();
  }
}

createAdmin();
