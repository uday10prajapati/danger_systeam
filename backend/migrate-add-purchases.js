import db from './db.js';

async function migratePurchases() {
  try {
    // Create purchases (header) table
    const createPurchasesTable = `
      CREATE TABLE IF NOT EXISTS purchases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        supplier_account_id INT NOT NULL,
        invoice_no VARCHAR(100) NOT NULL UNIQUE,
        invoice_date DATE NOT NULL,
        total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE RESTRICT,
        FOREIGN KEY (supplier_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_company_id (company_id),
        INDEX idx_supplier_account_id (supplier_account_id),
        INDEX idx_invoice_date (invoice_date),
        INDEX idx_created_at (created_at),
        UNIQUE INDEX idx_invoice_unique (company_id, invoice_no)
      )
    `;

    // Create purchase_items (details) table
    const createPurchaseItemsTable = `
      CREATE TABLE IF NOT EXISTS purchase_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        purchase_rate DECIMAL(12, 2) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT,
        INDEX idx_purchase_id (purchase_id),
        INDEX idx_item_id (item_id)
      )
    `;

    // Create purchase_stock_ledger table (tracks stock movements)
    const createStockLedgerTable = `
      CREATE TABLE IF NOT EXISTS purchase_stock_ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        item_id INT NOT NULL,
        purchase_id INT,
        purchase_item_id INT,
        quantity_in DECIMAL(10, 2) DEFAULT 0,
        quantity_out DECIMAL(10, 2) DEFAULT 0,
        current_stock DECIMAL(10, 2) NOT NULL,
        transaction_type ENUM('PURCHASE_IN', 'SALE_OUT', 'PURCHASE_RETURN', 'SALE_RETURN', 'ADJUSTMENT') NOT NULL,
        reference_id INT,
        reference_no VARCHAR(100),
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE RESTRICT,
        FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_company_item (company_id, item_id),
        INDEX idx_transaction_type (transaction_type),
        INDEX idx_created_at (created_at)
      )
    `;

    // Create supplier_ledger table (tracks AP/payment)
    const createSupplierLedgerTable = `
      CREATE TABLE IF NOT EXISTS supplier_ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        supplier_account_id INT NOT NULL,
        purchase_id INT,
        debit_amount DECIMAL(12, 2) DEFAULT 0,
        credit_amount DECIMAL(12, 2) DEFAULT 0,
        balance DECIMAL(12, 2) NOT NULL,
        transaction_type ENUM('PURCHASE', 'PAYMENT', 'RETURN', 'ADJUSTMENT') NOT NULL,
        reference_no VARCHAR(100),
        notes TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE RESTRICT,
        FOREIGN KEY (supplier_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_company_supplier (company_id, supplier_account_id),
        INDEX idx_created_at (created_at)
      )
    `;

    const connection = await db.getConnection();
    
    try {
      console.log('Creating purchases table...');
      await connection.query(createPurchasesTable);

      console.log('Creating purchase_items table...');
      await connection.query(createPurchaseItemsTable);

      console.log('Creating purchase_stock_ledger table...');
      await connection.query(createStockLedgerTable);

      console.log('Creating supplier_ledger table...');
      await connection.query(createSupplierLedgerTable);
    } finally {
      connection.release();
    }

    console.log('✓ Purchase tables created successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migratePurchases();
