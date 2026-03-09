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

async function createAccountLedgerTable() {
  const connection = await pool.getConnection();

  try {
    console.log('Creating Account Ledger table...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS account_ledger (
        id INT PRIMARY KEY AUTO_INCREMENT,
        company_id INT NOT NULL,
        account_id INT NOT NULL,
        transaction_date DATE NOT NULL,
        reference_type ENUM('sale', 'sale_return', 'purchase', 'purchase_return', 'cash_in', 'cash_out', 'expense', 'opening_balance') NOT NULL,
        reference_id INT,
        reference_no VARCHAR(100),
        description VARCHAR(255),
        debit DECIMAL(12, 2) DEFAULT 0,
        credit DECIMAL(12, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE RESTRICT,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
        
        KEY idx_company_account (company_id, account_id),
        KEY idx_account_date (account_id, transaction_date),
        KEY idx_reference (reference_type, reference_id),
        KEY idx_created_at (created_at)
      )
    `);
    console.log('✅ account_ledger table created');

    console.log('\n✅ Account Ledger table created successfully!');
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
  } finally {
    await connection.release();
  }
}

createAccountLedgerTable();
