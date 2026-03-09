import db from './db.js';

async function migrateSales() {
  try {
    // Create sales (header) table
    const createSalesTable = `
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
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_company_id (company_id),
        INDEX idx_customer_account_id (customer_account_id),
        INDEX idx_invoice_date (invoice_date),
        INDEX idx_created_at (created_at),
        UNIQUE INDEX idx_invoice_unique (company_id, invoice_no)
      )
    `;

    // Create sale_items (details) table
    const createSaleItemsTable = `
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
    `;

    const connection = await db.getConnection();
    
    try {
      console.log('Creating sales table...');
      await connection.query(createSalesTable);

      console.log('Creating sale_items table...');
      await connection.query(createSaleItemsTable);
    } finally {
      connection.release();
    }

    console.log('✓ Sale tables created successfully!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrateSales();
