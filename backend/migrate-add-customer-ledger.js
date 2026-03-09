import db from './db.js';

async function migrateCustomerLedger() {
  try {
    const createCustomerLedgerTable = `
      CREATE TABLE IF NOT EXISTS customer_ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        customer_account_id INT NOT NULL,
        debit_amount DECIMAL(12, 2) DEFAULT 0,
        credit_amount DECIMAL(12, 2) DEFAULT 0,
        balance DECIMAL(12, 2) NOT NULL,
        transaction_type ENUM('SALE', 'PAYMENT', 'RETURN', 'ADJUSTMENT') NOT NULL,
        reference_no VARCHAR(100),
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE RESTRICT,
        FOREIGN KEY (customer_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_company_customer (company_id, customer_account_id),
        INDEX idx_created_at (created_at)
      )
    `;

    const connection = await db.getConnection();
    
    try {
      console.log('Creating customer_ledger table...');
      await connection.query(createCustomerLedgerTable);
    } finally {
      connection.release();
    }

    console.log('✓ Customer ledger table created successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrateCustomerLedger();
