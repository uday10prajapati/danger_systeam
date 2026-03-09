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
    console.log('🔄 Creating purchase_returns table...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS purchase_returns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        purchase_id INT NOT NULL,
        supplier_account_id INT NOT NULL,
        return_date DATE NOT NULL,
        total_return_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE RESTRICT,
        FOREIGN KEY (supplier_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_company (company_id),
        INDEX idx_purchase (purchase_id),
        INDEX idx_supplier (supplier_account_id),
        INDEX idx_return_date (return_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ purchase_returns table created successfully');

    console.log('🔄 Creating purchase_return_items table...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS purchase_return_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_return_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity DECIMAL(10,3) NOT NULL,
        purchase_rate DECIMAL(10,2) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT,
        INDEX idx_purchase_return (purchase_return_id),
        INDEX idx_item (item_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ purchase_return_items table created successfully');

    console.log('✅ All Purchase Return tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
