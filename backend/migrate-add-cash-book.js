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

async function createCashBookTable() {
  const connection = await pool.getConnection();

  try {
    console.log('Creating Cash Book table...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS cash_book (
        id INT PRIMARY KEY AUTO_INCREMENT,
        company_id INT NOT NULL,
        transaction_date DATE NOT NULL,
        reference_type ENUM('sale', 'sale_return', 'purchase', 'purchase_return', 'expense', 'opening_balance') NOT NULL,
        reference_id INT,
        reference_no VARCHAR(100),
        description VARCHAR(255),
        cash_in DECIMAL(12, 2) DEFAULT 0,
        cash_out DECIMAL(12, 2) DEFAULT 0,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        
        KEY idx_company_date (company_id, transaction_date),
        KEY idx_reference (reference_type, reference_id),
        KEY idx_created_at (created_at)
      )
    `);
    console.log('✅ cash_book table created');

    console.log('\n✅ Cash Book table created successfully!');
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
  } finally {
    await connection.release();
  }
}

createCashBookTable();
