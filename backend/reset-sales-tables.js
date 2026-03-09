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

async function resetTables() {
  const connection = await mysql.createConnection(config);
  try {
    console.log('🔄 Dropping old sales tables...');
    await connection.query('DROP TABLE IF EXISTS sale_items');
    await connection.query('DROP TABLE IF EXISTS customer_ledger');
    await connection.query('DROP TABLE IF EXISTS sales');
    console.log('✅ Old tables dropped');

    console.log('📋 Creating new sales table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        invoice_no VARCHAR(100) NOT NULL UNIQUE,
        invoice_date DATE NOT NULL,
        customer_account_id INT,
        member_id INT,
        total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        discount_amount DECIMAL(12, 2) DEFAULT 0,
        net_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        payment_type ENUM('cash', 'card', 'upi', 'credit') DEFAULT 'cash',
        notes TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE RESTRICT,
        FOREIGN KEY (customer_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_company_id (company_id),
        INDEX idx_customer_account_id (customer_account_id),
        INDEX idx_invoice_date (invoice_date),
        INDEX idx_created_at (created_at),
        UNIQUE INDEX idx_invoice_unique (company_id, invoice_no)
      )
    `);
    console.log('✅ Sales table created');

    console.log('📋 Creating new sale_items table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        sale_rate DECIMAL(12, 2) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT,
        INDEX idx_sale_id (sale_id),
        INDEX idx_item_id (item_id)
      )
    `);
    console.log('✅ Sale_items table created');

    console.log('📋 Creating customer_ledger table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customer_ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        customer_account_id INT NOT NULL,
        debit_amount DECIMAL(12, 2) DEFAULT 0,
        credit_amount DECIMAL(12, 2) DEFAULT 0,
        balance DECIMAL(12, 2) DEFAULT 0,
        transaction_type ENUM('SALE', 'PAYMENT', 'RETURN', 'ADJUSTMENT') NOT NULL,
        reference_no VARCHAR(100),
        notes TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE RESTRICT,
        FOREIGN KEY (customer_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_company_customer (company_id, customer_account_id),
        INDEX idx_created_at (created_at),
        INDEX idx_transaction_type (transaction_type)
      )
    `);
    console.log('✅ Customer_ledger table created');
    console.log('✅ All sales tables reset successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

resetTables();
