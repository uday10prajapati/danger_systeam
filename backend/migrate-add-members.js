import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'superstore_db',
};

async function migrate() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('🔄 Creating member_master table...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS member_master (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        account_id INT NOT NULL,
        member_code VARCHAR(100) NOT NULL,
        member_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        discount_percentage DECIMAL(5, 2) DEFAULT 0,
        loyalty_points INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_member_code (company_id, member_code),
        UNIQUE KEY unique_member_email (company_id, email),
        UNIQUE KEY unique_member_phone (company_id, phone),
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        
        INDEX idx_member_company (company_id),
        INDEX idx_member_account (account_id),
        INDEX idx_member_active (is_active)
      )
    `);

    console.log('✅ member_master table created successfully');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating member_master table:', error.message);
    await connection.end();
    process.exit(1);
  }
}

migrate();
