import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'superstore_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function createSaleReturnsTables() {
  const connection = await pool.getConnection();

  try {
    console.log('Creating Sale Returns tables...');

    // Sale Returns Header Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sale_returns (
        id INT PRIMARY KEY AUTO_INCREMENT,
        company_id INT NOT NULL,
        sale_id INT NOT NULL UNIQUE,
        return_no VARCHAR(50) UNIQUE NOT NULL,
        return_date DATE NOT NULL,
        customer_account_id INT,
        total_return_amount DECIMAL(12, 2) DEFAULT 0,
        discount_amount DECIMAL(12, 2) DEFAULT 0,
        refund_amount DECIMAL(12, 2) DEFAULT 0,
        refund_type ENUM('cash', 'credit') DEFAULT 'cash',
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE RESTRICT,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
        FOREIGN KEY (customer_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        
        KEY idx_company (company_id),
        KEY idx_sale (sale_id),
        KEY idx_return_date (return_date)
      )
    `);
    console.log('✅ sale_returns table created');

    // Sale Return Items Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sale_return_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sale_return_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity INT NOT NULL,
        sale_rate DECIMAL(12, 2) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (sale_return_id) REFERENCES sale_returns(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT,
        
        KEY idx_sale_return (sale_return_id),
        KEY idx_item (item_id)
      )
    `);
    console.log('✅ sale_return_items table created');

    console.log('\n✅ Sale Returns tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  } finally {
    await connection.release();
  }
}

createSaleReturnsTables();
