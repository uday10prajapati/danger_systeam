import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// MySQL Configuration (Local XAMPP)
console.log('🔧 Database Configuration:');
console.log('  Host:', process.env.DB_HOST || 'localhost');
console.log('  User:', process.env.DB_USER || 'root');
console.log('  Database:', process.env.DB_NAME || 'danger_systeam');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'danger_systeam',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  connectTimeout: 20000, // Increase timeout for remote connection
  maxIdle: 10,
  idleTimeout: 60000,
});

// Pool error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
    console.log('Database connection lost/reset. The pool will attempt to reconnect on the next request.');
  }
});

console.log('✅ MySQL Connection Pool Initialized');

// Create a connection wrapper for consistency with existing code
const createConnection = async () => {
  const connection = await pool.getConnection();
  return {
    query: async (sql, params = []) => {
      try {
        const [rows, fields] = await connection.query(sql, params);
        return [rows, fields];
      } catch (err) {
        console.error('SQL Error:', err.message, '\nIn query:', sql);
        throw err;
      }
    },
    execute: async (sql, params = []) => {
      try {
        const [result] = await connection.execute(sql, params);
        return [result, []];
      } catch (err) {
        console.error('SQL Error:', err.message, '\nIn query:', sql);
        throw err;
      }
    },
    beginTransaction: async () => { await connection.beginTransaction(); },
    commit: async () => { await connection.commit(); },
    rollback: async () => { await connection.rollback(); },
    release: () => { connection.release(); }
  };
};

// Initialize database and create tables
export async function initializeDatabase() {
  const connection = await createConnection();
  try {
    await connection.beginTransaction();

    try {
      // Create Company table (FOUNDATION TABLE)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS company (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_name VARCHAR(255) NOT NULL UNIQUE,
          address TEXT NOT NULL,
          phone VARCHAR(20) NOT NULL,
          email VARCHAR(100) NOT NULL UNIQUE,
          gst_number VARCHAR(15),
          financial_year_start DATE NOT NULL,
          financial_year_end DATE NOT NULL,
          currency VARCHAR(3) DEFAULT 'INR',
          logo_url VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active INT DEFAULT 1
        )
      `);

      // Create Users table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          username VARCHAR(100) NOT NULL,
          email VARCHAR(100) NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'cashier',
          is_active INT DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
        )
      `);

      // Create Accounts table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          account_name VARCHAR(100) NOT NULL,
          account_type VARCHAR(50) NOT NULL,
          phone VARCHAR(20),
          email VARCHAR(100),
          gst_no VARCHAR(15),
          tin_no VARCHAR(20),
          opening_balance DECIMAL(10, 2) DEFAULT 0,
          is_active INT DEFAULT 1,
          is_deleted INT DEFAULT 0,
          account_code VARCHAR(50),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
        )
      `);

      // Migration for accounts (ensure account_code and is_subledger exist)
      try {
        await connection.query("ALTER TABLE accounts ADD COLUMN account_code VARCHAR(50)");
      } catch (e) {}
      try {
        await connection.query("ALTER TABLE accounts ADD COLUMN is_subledger TINYINT(1) DEFAULT 0");
      } catch (e) {}

      // Create Item Master table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS item_master (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          item_code VARCHAR(50) NOT NULL,
          item_name VARCHAR(255) NOT NULL,
          item_name_gu VARCHAR(255),
          desc_en TEXT,
          desc_gu TEXT,
          barcode VARCHAR(100),
          category VARCHAR(100),
          unit VARCHAR(20) DEFAULT 'PCS',
          unit_gu VARCHAR(50),
          purchase_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
          sale_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
          purchase_account_id INT,
          sales_account_id INT,
          tax_percentage DECIMAL(5, 2) DEFAULT 0,
          reorder_level INT DEFAULT 0,
          consider_in_autostock INT DEFAULT 0,
          do_auto_stock_in_sales INT DEFAULT 0,
          opening_stock DECIMAL(10, 3) DEFAULT 0.000,
          opening_stock_value DECIMAL(10, 2) DEFAULT 0.00,
          minimum_stock DECIMAL(10, 3) DEFAULT 0.000,
          loss_per_kg DECIMAL(10, 3) DEFAULT 0.000,
          effective_date DATE,
          sgst_percent DECIMAL(5, 2) DEFAULT 0.00,
          cgst_percent DECIMAL(5, 2) DEFAULT 0.00,
          igst_percent DECIMAL(5, 2) DEFAULT 0.00,
          cess_percent DECIMAL(5, 2) DEFAULT 0.00,
          hsn_code VARCHAR(50),
          is_active INT DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
        )
      `);

      // Create Dangar Rates table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS dangar_rates (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          financial_year VARCHAR(20) NOT NULL,
          item_id INT NOT NULL,
          rate DECIMAL(12, 2) NOT NULL DEFAULT 0,
          winter_rate DECIMAL(12, 2) NOT NULL DEFAULT 0,
          summer_rate DECIMAL(12, 2) NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id),
          FOREIGN KEY (item_id) REFERENCES item_master(id),
          UNIQUE KEY idx_company_year_item (company_id, financial_year, item_id)
        )
      `);

      // Migration for dangar_rates (ensure new columns exist)
      try {
        await connection.query("ALTER TABLE dangar_rates ADD COLUMN winter_rate DECIMAL(12, 2) DEFAULT 0");
      } catch (e) {}
      try {
        await connection.query("ALTER TABLE dangar_rates ADD COLUMN summer_rate DECIMAL(12, 2) DEFAULT 0");
      } catch (e) {}

      // Create Products table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS products (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          sku VARCHAR(100) UNIQUE NOT NULL,
          category VARCHAR(100) NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          quantity INT DEFAULT 0,
          description TEXT,
          image_url VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Sales table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS sales (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          invoice_no VARCHAR(100) NOT NULL UNIQUE,
          invoice_date DATE NOT NULL,
          customer_account_id INT,
          member_id INT,
          total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
          discount_amount DECIMAL(10, 2) DEFAULT 0,
          taxable_amount DECIMAL(10, 2) DEFAULT 0,
          gst_percent DECIMAL(5, 2) DEFAULT 0,
          cgst_percent DECIMAL(5, 2) DEFAULT 0,
          sgst_percent DECIMAL(5, 2) DEFAULT 0,
          igst_percent DECIMAL(5, 2) DEFAULT 0,
          cgst_amount DECIMAL(10, 2) DEFAULT 0,
          sgst_amount DECIMAL(10, 2) DEFAULT 0,
          igst_amount DECIMAL(10, 2) DEFAULT 0,
          total_tax DECIMAL(10, 2) DEFAULT 0,
          net_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
          is_intra_state INT DEFAULT 1,
          payment_type VARCHAR(50) DEFAULT 'cash',
          notes TEXT,
          created_by INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE RESTRICT,
          FOREIGN KEY (customer_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
        )
      `);



      // Create Sale Items table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS sale_items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          sale_id INT NOT NULL,
          item_id INT NOT NULL,
          quantity DECIMAL(10, 2) NOT NULL,
          sale_rate DECIMAL(10, 2) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          taxable_amount DECIMAL(10, 2) DEFAULT 0,
          gst_percent DECIMAL(5, 2) DEFAULT 0,
          gst_amount DECIMAL(10, 2) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT
        )
      `);

      // Create Customer Ledger table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS customer_ledger (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          customer_account_id INT NOT NULL,
          debit_amount DECIMAL(10, 2) DEFAULT 0,
          credit_amount DECIMAL(10, 2) DEFAULT 0,
          balance DECIMAL(10, 2) DEFAULT 0,
          transaction_type VARCHAR(50) NOT NULL,
          reference_no VARCHAR(100),
          notes TEXT,
          created_by INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE RESTRICT,
          FOREIGN KEY (customer_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
        )
      `);

      // Create Member Master table (Sabhasad)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS member_master (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          financial_year VARCHAR(20) NOT NULL DEFAULT '2026-27',
          member_code VARCHAR(50) NOT NULL,
          member_name VARCHAR(255) NOT NULL,
          eng_name VARCHAR(255),
          phone VARCHAR(20),
          village_code VARCHAR(50),
          village_name VARCHAR(255),
          full_ac_number VARCHAR(100),
          bank_name VARCHAR(255),
          branch_name VARCHAR(255),
          account_type VARCHAR(50),
          address_no VARCHAR(255),
          nominal_member VARCHAR(255),
          ifsc_code VARCHAR(50),
          bardan_opening DECIMAL(15, 2) DEFAULT 0,
          is_active INT DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
          INDEX (member_code),
          INDEX (company_id)
        )
      `);

      // Migration for existing tables (ensure column names match new system)
      try {
          // 0. Pre-shrink some columns to avoid Row Size Too Large error
          try { await connection.query("ALTER TABLE member_master MODIFY COLUMN address_no TEXT"); } catch(e) {}
          try { await connection.query("ALTER TABLE member_master MODIFY COLUMN eng_name TEXT"); } catch(e) {}
          try { await connection.query("ALTER TABLE member_master MODIFY COLUMN nominal_member TEXT"); } catch(e) {}
          try { await connection.query("ALTER TABLE member_master MODIFY COLUMN branch_name VARCHAR(155)"); } catch(e) {}
          try { await connection.query("ALTER TABLE member_master MODIFY COLUMN village_name VARCHAR(155)"); } catch(e) {}

          const cols = [
             'village_code', 'village_name', 'full_ac_number', 
             'bank_name', 'branch_name', 'account_type', 
             'address_no', 'eng_name', 'nominal_member',
             'bardan_opening', 'ifsc_code'
          ];
          for (const col of cols) {
             if (col === 'bardan_opening') {
               try { await connection.query(`ALTER TABLE member_master ADD COLUMN ${col} DECIMAL(15, 2) DEFAULT 0`); } catch(e) {}
             } else if (col === 'ifsc_code') {
               try { await connection.query(`ALTER TABLE member_master ADD COLUMN ${col} VARCHAR(20)`); } catch(e) {}
             } else {
               try { await connection.query(`ALTER TABLE member_master ADD COLUMN ${col} VARCHAR(255)`); } catch(e) {}
             }
          }
         // Clean up old columns if they exist
         try { await connection.query("ALTER TABLE member_master DROP COLUMN email"); } catch(e) {}
         try { await connection.query("ALTER TABLE member_master DROP COLUMN discount_percentage"); } catch(e) {}
         try { await connection.query("ALTER TABLE member_master DROP COLUMN loyalty_points"); } catch(e) {}
         try { await connection.query("ALTER TABLE member_master DROP COLUMN total_purchases"); } catch(e) {}
         try { await connection.query("ALTER TABLE member_master DROP COLUMN member_gst_no"); } catch(e) {}
         try { await connection.query("ALTER TABLE member_master DROP COLUMN member_address"); } catch(e) {}
         try { await connection.query("ALTER TABLE member_master DROP COLUMN address"); } catch(e) {}
      } catch(e) {
         console.warn("Member master migration warning:", e.message);
      }

      // Create Inventory Log table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS inventory_log (
          id INT PRIMARY KEY AUTO_INCREMENT,
          product_id INT NOT NULL,
          quantity_changed INT NOT NULL,
          reason VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `);

      // Create Purchases table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS purchases (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          supplier_account_id INT NOT NULL,
          invoice_no VARCHAR(100) NOT NULL UNIQUE,
          invoice_date DATE NOT NULL,
          total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
          driver_name VARCHAR(100),
          mobile_number VARCHAR(20),
          gadi_number VARCHAR(50),
          notes TEXT,
          created_by INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
          FOREIGN KEY (supplier_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
        )
      `);

      // Create Purchase Items table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS purchase_items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          purchase_id INT NOT NULL,
          item_id INT NOT NULL,
          quantity DECIMAL(10, 2) NOT NULL,
          purchase_rate DECIMAL(10, 2) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT
        )
      `);

      // Create Purchase Stock Ledger table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS purchase_stock_ledger (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          item_id INT NOT NULL,
          purchase_id INT,
          purchase_item_id INT,
          quantity_in DECIMAL(10, 2) DEFAULT 0,
          quantity_out DECIMAL(10, 2) DEFAULT 0,
          current_stock DECIMAL(10, 2) DEFAULT 0,
          transaction_type VARCHAR(50),
          reference_no VARCHAR(100),
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT,
          FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      // Create Supplier Ledger table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS supplier_ledger (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          supplier_account_id INT NOT NULL,
          purchase_id INT,
          debit_amount DECIMAL(10, 2) DEFAULT 0,
          credit_amount DECIMAL(10, 2) DEFAULT 0,
          balance DECIMAL(10, 2) DEFAULT 0,
          transaction_type VARCHAR(50),
          reference_no VARCHAR(100),
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
          FOREIGN KEY (supplier_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
          FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      // Create Sale Returns table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS sale_returns (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          sale_id INT NOT NULL,
          return_no VARCHAR(100),
          return_date DATE NOT NULL,
          customer_account_id INT,
          total_return_amount DECIMAL(10, 2) NOT NULL,
          refund_amount DECIMAL(10, 2) NOT NULL,
          refund_type VARCHAR(50) NOT NULL,
          notes TEXT,
          created_by INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
          FOREIGN KEY (customer_account_id) REFERENCES accounts(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
        )
      `);

      // Create Sale Return Items table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS sale_return_items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          sale_return_id INT NOT NULL,
          item_id INT NOT NULL,
          quantity DECIMAL(10, 2) NOT NULL,
          sale_rate DECIMAL(10, 2) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          FOREIGN KEY (sale_return_id) REFERENCES sale_returns(id) ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT
        )
      `);

      // Create Purchase Returns table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS purchase_returns (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          purchase_id INT NOT NULL,
          return_date DATE NOT NULL,
          return_amount DECIMAL(10, 2) NOT NULL,
          reason TEXT,
          created_by INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
          FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
        )
      `);

      // Create Purchase Return Items table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS purchase_return_items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          purchase_return_id INT NOT NULL,
          item_id INT NOT NULL,
          quantity DECIMAL(10, 2) NOT NULL,
          purchase_rate DECIMAL(10, 2) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE RESTRICT
        )
      `);

      // Create Cash Book table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS cash_book (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          transaction_date DATE NOT NULL,
          reference_type VARCHAR(50),
          reference_id INT,
          reference_no VARCHAR(100),
          description TEXT,
          cash_in DECIMAL(10, 2) DEFAULT 0,
          cash_out DECIMAL(10, 2) DEFAULT 0,
          notes TEXT,
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);

      // Create Account Ledger table (UNIFIED MASTER LEDGER)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS account_ledger (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          account_id INT DEFAULT NULL,
          member_id INT DEFAULT NULL,
          transaction_date DATE NOT NULL,
          transaction_type VARCHAR(50) DEFAULT 'manual', -- manual, sale, purchase, cash_book, jv
          reference_type VARCHAR(50),
          reference_id INT,
          reference_no VARCHAR(100),
          debit DECIMAL(12, 2) DEFAULT 0.00,
          credit DECIMAL(12, 2) DEFAULT 0.00,
          description TEXT,
          notes TEXT,
          financial_year VARCHAR(20) DEFAULT '2026-27',
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
          FOREIGN KEY (member_id) REFERENCES member_master(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
          INDEX (transaction_date),
          INDEX (account_id),
          INDEX (member_id),
          INDEX (reference_type, reference_id)
        )
      `);

      // Migration for account_ledger (Ensure consistency)
      const ledgerCols = [
        { name: 'notes', type: 'TEXT' },
        { name: 'financial_year', type: "VARCHAR(20) DEFAULT '2026-27'" },
        { name: 'transaction_type', type: "VARCHAR(50) DEFAULT 'manual'" },
        { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
        { name: 'debit', type: 'DECIMAL(12, 2) DEFAULT 0.00' },
        { name: 'credit', type: 'DECIMAL(12, 2) DEFAULT 0.00' }
      ];

      for (const col of ledgerCols) {
        try {
          await connection.query(`ALTER TABLE account_ledger ADD COLUMN ${col.name} ${col.type}`);
        } catch (e) {
          // Column likely already exists
        }
      }

      // Unified ledger system completed - no forced cash accounts required

      // Create Journal Vouchers table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS journal_vouchers (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          voucher_date DATE NOT NULL,
          voucher_type VARCHAR(50) DEFAULT 'JV', 
          total_credit DECIMAL(10, 2) DEFAULT 0,
          total_debit DECIMAL(10, 2) DEFAULT 0,
          notes TEXT,
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
        )
      `);

      // Create Journal Voucher Items table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS journal_voucher_items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          voucher_id INT NOT NULL,
          type VARCHAR(10) NOT NULL,
          account_id INT NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          reference_no VARCHAR(100),
          member_id INT,
          particulars TEXT,
          FOREIGN KEY (voucher_id) REFERENCES journal_vouchers(id) ON DELETE CASCADE,
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
        )
      `);

      // Create Item Rates table (for GST/tax rates per item)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS item_rate (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          item_id INT NOT NULL,
          purchase_rate DECIMAL(10, 2),
          sale_rate DECIMAL(10, 2) NOT NULL,
          mrp DECIMAL(10, 2),
          effective_from DATE,
          is_active INT DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE CASCADE
        )
      `);

      // Create GST table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS gst (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          transaction_id INT,
          transaction_type VARCHAR(50),
          gst_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
          cgst_amount DECIMAL(10, 2) DEFAULT 0,
          sgst_amount DECIMAL(10, 2) DEFAULT 0,
          igst_amount DECIMAL(10, 2) DEFAULT 0,
          gst_rate DECIMAL(5, 2),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
        )
      `);

      // Create Indexes for MySQL
      try {
        await connection.query("CREATE UNIQUE INDEX uidx_company_name ON company(company_name)");
        console.log('✅ Index uidx_company_name verified');
      } catch (idxErr) {
        if (idxErr.code === 'ER_DUP_KEYNAME') {
          console.log('ℹ️ Index already exists, skipping.');
        } else { throw idxErr; }
      }

      try {
        await connection.query("CREATE UNIQUE INDEX uidx_user_email ON users(company_id, email)");
        console.log('✅ Index uidx_user_email verified');
      } catch (idxErr) {
        if (idxErr.code === 'ER_DUP_KEYNAME') {
          console.log('ℹ️ Index already exists, skipping.');
        } else { throw idxErr; }
      }

      // Add performance indexes
      try {
        await connection.query("CREATE INDEX idx_sales_invoice_date ON sales(invoice_date)");
        console.log('✅ Index idx_sales_invoice_date created');
      } catch (e) {}

      try {
        await connection.query("CREATE INDEX idx_stock_ledger_item ON purchase_stock_ledger(company_id, item_id)");
        console.log('✅ Index idx_stock_ledger_item created');
      } catch (e) {}

      try {
        await connection.query("CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id)");
        console.log('✅ Index idx_sale_items_sale_id created');
      } catch (e) {}
      // Schema upgrades (safe ALTER TABLE without assuming MySQL version)
      try {
        await connection.query("ALTER TABLE member_master ADD COLUMN member_address TEXT");
      } catch (e) {
        // Ignore error if column already exists (ER_DUP_FIELDNAME)
      }
      try {
        await connection.query("ALTER TABLE member_master ADD COLUMN member_gst_no VARCHAR(25)");
      } catch (e) {}

      // Add Sales GST tracking columns
      try { await connection.query("ALTER TABLE sales ADD COLUMN taxable_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE sales ADD COLUMN gst_percent DECIMAL(5, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE sales ADD COLUMN cgst_percent DECIMAL(5, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE sales ADD COLUMN sgst_percent DECIMAL(5, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE sales ADD COLUMN igst_percent DECIMAL(5, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE sales ADD COLUMN cgst_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE sales ADD COLUMN sgst_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE sales ADD COLUMN igst_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE sales ADD COLUMN total_tax DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE sales ADD COLUMN is_intra_state INT DEFAULT 1"); } catch (e) {}

      try { await connection.query("ALTER TABLE sale_items ADD COLUMN taxable_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE sale_items ADD COLUMN gst_percent DECIMAL(5, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE sale_items ADD COLUMN gst_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      
      // Add Purchases GST tracking columns (to match Sales structure perfectly)
      try { await connection.query("ALTER TABLE purchases ADD COLUMN taxable_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchases ADD COLUMN gst_percent DECIMAL(5, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchases ADD COLUMN cgst_percent DECIMAL(5, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchases ADD COLUMN sgst_percent DECIMAL(5, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchases ADD COLUMN igst_percent DECIMAL(5, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchases ADD COLUMN cgst_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchases ADD COLUMN sgst_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchases ADD COLUMN igst_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchases ADD COLUMN total_tax DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchases ADD COLUMN is_intra_state INT DEFAULT 1"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchases ADD COLUMN payment_type VARCHAR(50) DEFAULT 'credit'"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchases ADD COLUMN net_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}

      try { await connection.query("ALTER TABLE purchase_items ADD COLUMN taxable_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchase_items ADD COLUMN gst_percent DECIMAL(5, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchase_items ADD COLUMN cgst_percent DECIMAL(5, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchase_items ADD COLUMN sgst_percent DECIMAL(5, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchase_items ADD COLUMN igst_percent DECIMAL(5, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchase_items ADD COLUMN cgst_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchase_items ADD COLUMN sgst_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchase_items ADD COLUMN igst_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchase_items ADD COLUMN gst_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE purchase_items ADD COLUMN total_tax DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}

      // Add missing columns to account_ledger (Standardization)
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN reference_type VARCHAR(50)"); } catch (e) {}
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN reference_id INT"); } catch (e) {}
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN description TEXT"); } catch (e) {}
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN debit DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN credit DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN transaction_type VARCHAR(50)"); } catch (e) {}
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN debit_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN credit_amount DECIMAL(10, 2) DEFAULT 0"); } catch (e) {}


      // Create Village table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS village (
          id INT PRIMARY KEY AUTO_INCREMENT,
          village_code VARCHAR(50),
          village_name VARCHAR(255),
          taluka_name VARCHAR(255),
          district_name VARCHAR(255),
          no_of_villages INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Dangar Entry table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS dangar_entry (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          financial_year VARCHAR(20) NOT NULL DEFAULT '2026-27',
          book_type VARCHAR(50) NOT NULL,
          sr_no VARCHAR(100),
          entry_date DATE NOT NULL,
          member_id INT,
          item_id INT,
          remark TEXT,
          vehicle_no VARCHAR(100),
          total_kg DECIMAL(15, 2) DEFAULT 0,
          bardan INT DEFAULT 0,
          gun DECIMAL(10, 2) DEFAULT 0,
          gross_quintal DECIMAL(15, 2) DEFAULT 0,
          less_bardan DECIMAL(15, 2) DEFAULT 0,
          net_quintal DECIMAL(15, 2) DEFAULT 0,
          rate DECIMAL(12, 2) DEFAULT 0,
          amount DECIMAL(15, 2) DEFAULT 0,
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
          FOREIGN KEY (member_id) REFERENCES member_master(id) ON DELETE SET NULL,
          FOREIGN KEY (item_id) REFERENCES item_master(id) ON DELETE SET NULL
        )
      `);

      // Migration for dangar_entry (ensure columns added later are present)
      try {
        await connection.query("ALTER TABLE dangar_entry ADD COLUMN rate DECIMAL(12, 2) DEFAULT 0");
      } catch (e) {}
      try {
        await connection.query("ALTER TABLE dangar_entry ADD COLUMN amount DECIMAL(15, 2) DEFAULT 0");
      } catch (e) {}

      // Create Dangar Weights table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS dangar_weights (
          id INT PRIMARY KEY AUTO_INCREMENT,
          entry_id INT NOT NULL,
          sr_no INT,
          weight DECIMAL(15, 2) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (entry_id) REFERENCES dangar_entry(id) ON DELETE CASCADE
        )
      `);

      // Create Bardan Entry table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS bardan_entry (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          financial_year VARCHAR(20) NOT NULL DEFAULT '2026-27',
          book_type VARCHAR(50),
          pavti_no VARCHAR(100),
          entry_date DATE NOT NULL,
          mem_nominal VARCHAR(100),
          code VARCHAR(100),
          name VARCHAR(255),
          qty DECIMAL(15, 2) DEFAULT 0,
          option_type VARCHAR(100),
          remark TEXT,
          day_qty DECIMAL(15, 2) DEFAULT 0,
          total_qty DECIMAL(15, 2) DEFAULT 0,
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
        )
      `);

      // Create Bardan Items table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS bardan_items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          entry_id INT NOT NULL,
          col1 VARCHAR(255),
          col2 VARCHAR(255),
          col3 VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (entry_id) REFERENCES bardan_entry(id) ON DELETE CASCADE
        )
      `);

       // Create Jama Bardan Entry table
       await connection.query(`
        CREATE TABLE IF NOT EXISTS jama_bardan_entry (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          financial_year VARCHAR(20) NOT NULL DEFAULT '2026-27',
          book_type VARCHAR(50),
          pavti_no VARCHAR(100),
          entry_date DATE NOT NULL,
          mem_nominal VARCHAR(100),
          code VARCHAR(100),
          name VARCHAR(255),
          qty DECIMAL(15, 2) DEFAULT 0,
          option_type VARCHAR(100),
          remark TEXT,
          day_qty DECIMAL(15, 2) DEFAULT 0,
          total_qty DECIMAL(15, 2) DEFAULT 0,
          created_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
        )
      `);

      // Create Jama Bardan Items table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS jama_bardan_items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          entry_id INT NOT NULL,
          col1 VARCHAR(255),
          col2 VARCHAR(255),
          col3 VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (entry_id) REFERENCES jama_bardan_entry(id) ON DELETE CASCADE
        )
      `);

      // Create Narrations table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS narrations (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          narration_code VARCHAR(50),
          narration_text TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
        )
      `);

      // Migration for narrations
      try {
        await connection.query("ALTER TABLE narrations ADD COLUMN narration_code VARCHAR(50)");
      } catch (e) {
        // Ignore if column already exists
      }

      // Create Banks Master table
       await connection.query(`
        CREATE TABLE IF NOT EXISTS banks (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          bank_name VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
          UNIQUE KEY uidx_company_bank (company_id, bank_name)
        )
      `);

      // Create Deduction Master table (Kapat Master)
       await connection.query(`
        CREATE TABLE IF NOT EXISTS deduction_master (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          type ENUM('fixed', 'per_unit', 'percentage') NOT NULL DEFAULT 'fixed',
          ledger_account_id INT,
          default_value DECIMAL(12, 2) DEFAULT 0,
          show_balance BOOLEAN DEFAULT TRUE,
          sort_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          auto_apply BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
          FOREIGN KEY (ledger_account_id) REFERENCES accounts(id) ON DELETE SET NULL
        )
      `);

      // Create Transaction Deductions table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS transaction_deductions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          entry_id INT NOT NULL,
          deduction_id INT NOT NULL,
          input_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
          calculated_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
          balance_at_time DECIMAL(15, 2) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (entry_id) REFERENCES dangar_entry(id) ON DELETE CASCADE,
          FOREIGN KEY (deduction_id) REFERENCES deduction_master(id) ON DELETE RESTRICT
        )
      `);

      // Create Seasons table (for Tariff Designation)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS seasons (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          season_type VARCHAR(100) NOT NULL,
          financial_year VARCHAR(20) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
        )
      `);

      // Create Bardan Price Master table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS bardan_price_master (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          price_per_bardan DECIMAL(12, 2) NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
        )
      `);

      // Create Persistent Targets for Kapat Console
      await connection.query(`
        CREATE TABLE IF NOT EXISTS deduction_targets (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          target_type VARCHAR(50) NOT NULL,
          target_id INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_target (company_id, target_type, target_id),
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
        )
      `);

      // Seed Default Banks for all companies
      try {
        const [companies] = await connection.query("SELECT id FROM company");
        for (const comp of companies) {
          await connection.query("INSERT IGNORE INTO banks (company_id, bank_name) VALUES (?, ?)", [comp.id, "BOB"]);
          await connection.query("INSERT IGNORE INTO banks (company_id, bank_name) VALUES (?, ?)", [comp.id, "SDCB"]);
        }
      } catch (e) {
        console.warn("Bank seeding warning:", e.message);
      }

      // Create Financial Years table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS financial_years (
          id INT PRIMARY KEY AUTO_INCREMENT,
          company_id INT NOT NULL,
          year_label VARCHAR(20) NOT NULL,
          start_date DATE,
          end_date DATE,
          is_active INT DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
          UNIQUE(company_id, year_label)
        )
      `);

      // Modify existing tables to add financial_year column
      const tablesToUpdate = [
        'accounts', 'sales', 'item_master', 'customer_ledger', 'member_master', 
        'purchases', 'purchase_stock_ledger', 'supplier_ledger', 'sale_returns', 
        'purchase_returns', 'cash_book', 'account_ledger', 'journal_vouchers',
        'item_rate', 'gst'
      ];

      for (const table of tablesToUpdate) {
        try {
          await connection.query(`ALTER TABLE ${table} ADD COLUMN financial_year VARCHAR(20) NOT NULL DEFAULT '2026-27'`);
          await connection.query(`CREATE INDEX idx_${table}_fy ON ${table}(financial_year)`);
        } catch (e) {
          // Column might already exist
        }
      }

      // IFSC Code handled in the migration block above

      // Migrations for Deductions
      try { await connection.query("ALTER TABLE deduction_master ADD COLUMN ledger_account_id INT"); } catch(e) {}
      try { await connection.query("ALTER TABLE deduction_master ADD COLUMN show_balance BOOLEAN DEFAULT TRUE"); } catch(e) {}
      try { await connection.query("ALTER TABLE deduction_master ADD COLUMN sort_order INT DEFAULT 0"); } catch(e) {}
      try { await connection.query("ALTER TABLE transaction_deductions ADD COLUMN balance_at_time DECIMAL(15, 2) DEFAULT 0"); } catch(e) {}

      await connection.commit();
      console.log('✅ MySQL Database tables created/verified/upgraded');
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

// Query functions that export the seamless api
export async function query(sql, params = []) {
  try {
    const [results] = await pool.query(sql, params);
    return results;
  } catch (error) {
    if (error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection lost during query, retrying once...');
      try {
        const [results] = await pool.query(sql, params);
        return results;
      } catch (retryError) {
        console.error('Retry failed:', retryError.message);
        throw retryError;
      }
    }
    console.error('Query error:', error.message, '\nSQL:', sql);
    throw error;
  }
}

export async function queryOne(sql, params = []) {
  const results = await query(sql, params);
  return results && results.length > 0 ? results[0] : null;
}

export async function execute(sql, params = []) {
  try {
    const [result] = await pool.execute(sql, params);
    console.log(`✅ SQL Executed: ${result.affectedRows} row(s) affected`);
    return { lastID: result.insertId, changes: result.affectedRows };
  } catch (error) {
    if (error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection lost during execute, retrying once...');
      try {
        const [result] = await pool.execute(sql, params);
        return { lastID: result.insertId, changes: result.affectedRows };
      } catch (retryError) {
        console.error('Retry failed:', retryError.message);
        throw retryError;
      }
    }
    console.error('Execute error:', error.message, '\nSQL:', sql);
    throw error;
  }
}

// ============ PURCHASE OPERATIONS ============

export async function createPurchase(companyId, supplierId, invoiceNo, invoiceDate, items, notes, userId, gstAmount = 0, gstPercent = 0) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert purchase header
    const [purchaseResult] = await connection.query(
      `INSERT INTO purchases (company_id, supplier_account_id, invoice_no, invoice_date, total_amount, notes, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [companyId, supplierId, invoiceNo, invoiceDate, 0, notes, userId]
    );
    const purchaseId = purchaseResult.insertId;

    // 2. Calculate total and insert items with stock ledger entries
    let totalAmount = 0;

    for (const item of items) {
      const itemAmount = item.quantity * item.purchase_rate;
      totalAmount += itemAmount;

      // Insert purchase item
      const [itemResult] = await connection.query(
        `INSERT INTO purchase_items (purchase_id, item_id, quantity, purchase_rate, amount)
         VALUES (?, ?, ?, ?, ?)`,
        [purchaseId, item.item_id, item.quantity, item.purchase_rate, itemAmount]
      );

      // Get current stock for this item
      const currentStockRow = await connection.query(
        `SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as current_stock 
         FROM purchase_stock_ledger 
         WHERE company_id = ? AND item_id = ?`,
        [companyId, item.item_id]
      );

      const currentStock = currentStockRow[0][0]?.current_stock || 0;
      const newStock = currentStock + item.quantity;

      // Insert stock ledger entry (STOCK IN)
      await connection.query(
        `INSERT INTO purchase_stock_ledger 
         (company_id, item_id, purchase_id, purchase_item_id, quantity_in, current_stock, transaction_type, reference_no, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'PURCHASE_IN', ?, ?)`,
        [companyId, item.item_id, purchaseId, itemResult.insertId, item.quantity, newStock, invoiceNo, userId]
      );
    }

    // 3. Update purchase total with GST
    const grandTotal = totalAmount + gstAmount;
    await connection.query(
      `UPDATE purchases SET total_amount = ? WHERE id = ?`,
      [grandTotal, purchaseId]
    );

    // 4. Create supplier ledger entry (DEBIT = money owed to supplier)
    const supplierBalance = await connection.query(
      `SELECT COALESCE(SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END) - 
                       SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END), 0) as balance
       FROM supplier_ledger 
       WHERE company_id = ? AND supplier_account_id = ?`,
      [companyId, supplierId]
    );

    const previousBalance = parseFloat(supplierBalance[0][0]?.balance || 0);
    const newBalance = previousBalance + grandTotal;

    await connection.query(
      `INSERT INTO supplier_ledger 
       (company_id, supplier_account_id, purchase_id, debit_amount, balance, transaction_type, reference_no, created_by)
       VALUES (?, ?, ?, ?, ?, 'PURCHASE', ?, ?)`,
      [companyId, supplierId, purchaseId, grandTotal, newBalance, invoiceNo, userId]
    );

    await connection.commit();
    return { id: purchaseId, total_amount: totalAmount, gst_amount: gstAmount, grand_total: grandTotal };
  } catch (error) {
    await connection.rollback();
    console.error('Create purchase error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function getPurchasesByCompany(companyId, startDate, endDate) {
  const sql = `
    SELECT 
      p.id, p.invoice_no, p.invoice_date, p.total_amount, p.notes,
      a.account_name as supplier_name,
      u.username as created_by_name,
      COUNT(DISTINCT pi.id) as item_count,
      p.created_at
    FROM purchases p
    LEFT JOIN accounts a ON p.supplier_account_id = a.id
    LEFT JOIN users u ON p.created_by = u.id
    LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
    WHERE p.company_id = ? AND DATE(p.invoice_date) BETWEEN ? AND ?
    GROUP BY p.id
    ORDER BY p.invoice_date DESC, p.created_at DESC
  `;
  return await query(sql, [companyId, startDate, endDate]);
}

export async function getPurchaseDetails(purchaseId) {
  // Get purchase header
  const purchaseSql = `
    SELECT 
      p.*,
      a.account_name as supplier_name,
      c.company_name,
      u.username as created_by_name
    FROM purchases p
    LEFT JOIN accounts a ON p.supplier_account_id = a.id
    LEFT JOIN company c ON p.company_id = c.id
    LEFT JOIN users u ON p.created_by = u.id
    WHERE p.id = ?
  `;
  const purchase = await queryOne(purchaseSql, [purchaseId]);

  if (!purchase) return null;

  // Get purchase items
  const itemsSql = `
    SELECT 
      pi.*,
      it.item_name, it.item_code
    FROM purchase_items pi
    LEFT JOIN item_master it ON pi.item_id = it.id
    WHERE pi.purchase_id = ?
  `;
  const items = await query(itemsSql, [purchaseId]);

  return { ...purchase, items };
}

export async function getSupplierBalance(companyId, supplierId) {
  const sql = `
    SELECT 
      COALESCE(SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END), 0) as total_due,
      COALESCE(SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END), 0) as total_paid,
      COALESCE(SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END) - 
               SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END), 0) as current_balance
    FROM supplier_ledger
    WHERE company_id = ? AND supplier_account_id = ?
  `;
  return await queryOne(sql, [companyId, supplierId]);
}

export async function getItemCurrentStock(companyId, itemId) {
  const sql = `
    SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as current_stock
    FROM purchase_stock_ledger
    WHERE company_id = ? AND item_id = ?
  `;
  const result = await queryOne(sql, [companyId, itemId]);
  return result?.current_stock || 0;
}

export async function getStockHistory(companyId, itemId, limit = 50) {
  const sql = `
    SELECT 
      id, purchase_id, quantity_in, quantity_out, current_stock,
      transaction_type, reference_no, created_at
    FROM purchase_stock_ledger
    WHERE company_id = ? AND item_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `;
  return await query(sql, [companyId, itemId, limit]);
}

// ============ PURCHASE RETURN OPERATIONS ============

export async function createPurchaseReturn(companyId, purchaseId, supplierId, returnDate, items, notes, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Insert purchase return header (initialize with 0, update after calculating total)
    const [returnResult] = await connection.query(
      `INSERT INTO purchase_returns (company_id, purchase_id, return_date, return_amount, reason, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [companyId, purchaseId, returnDate, 0, notes, userId]
    );
    const returnId = returnResult.insertId;

    // 2. Calculate total and insert return items with stock ledger entries
    let totalReturnAmount = 0;

    for (const item of items) {
      const itemAmount = item.quantity * item.purchase_rate;
      totalReturnAmount += itemAmount;

      // Insert purchase return item
      await connection.query(
        `INSERT INTO purchase_return_items (purchase_return_id, item_id, quantity, purchase_rate, amount)
         VALUES (?, ?, ?, ?, ?)`,
        [returnId, item.item_id, item.quantity, item.purchase_rate, itemAmount]
      );

      // Get current stock for this item
      const currentStockRow = await connection.query(
        `SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as current_stock 
         FROM purchase_stock_ledger 
         WHERE company_id = ? AND item_id = ?`,
        [companyId, item.item_id]
      );

      const currentStock = currentStockRow[0][0]?.current_stock || 0;
      const newStock = currentStock - item.quantity; // Stock OUT

      // Insert stock ledger entry (STOCK OUT)
      await connection.query(
        `INSERT INTO purchase_stock_ledger 
         (company_id, item_id, quantity_out, current_stock, transaction_type, reference_no, created_by)
         VALUES (?, ?, ?, ?, 'PURCHASE_RETURN', ?, ?)`,
        [companyId, item.item_id, item.quantity, newStock, `RETURN-${returnId}`, userId]
      );
    }

    // 3. Update purchase return total
    await connection.query(
      `UPDATE purchase_returns SET return_amount = ? WHERE id = ?`,
      [totalReturnAmount, returnId]
    );

    // 4. Adjust supplier ledger (CREDIT = money received back from supplier)
    const supplierBalance = await connection.query(
      `SELECT COALESCE(SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END) - 
                       SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END), 0) as balance
       FROM supplier_ledger 
       WHERE company_id = ? AND supplier_account_id = ?`,
      [companyId, supplierId]
    );

    const previousBalance = parseFloat(supplierBalance[0][0]?.balance || 0);
    const newBalance = previousBalance - totalReturnAmount; // Reduce what we owe

    await connection.query(
      `INSERT INTO supplier_ledger 
       (company_id, supplier_account_id, credit_amount, balance, transaction_type, reference_no, created_by)
       VALUES (?, ?, ?, ?, 'RETURN', ?, ?)`,
      [companyId, supplierId, totalReturnAmount, newBalance, `RETURN-${returnId}`, userId]
    );

    await connection.commit();
    return { id: returnId, return_amount: totalReturnAmount };
  } catch (error) {
    await connection.rollback();
    console.error('Create purchase return error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function getPurchaseReturnsByCompany(companyId, startDate, endDate) {
  // Get purchase returns
  const sql = `
    SELECT 
      pr.id, 
      pr.purchase_id, 
      pr.return_date, 
      pr.return_amount,
      pr.reason,
      p.supplier_account_id,
      a.account_name as supplier_name,
      u.username as created_by_name,
      pr.created_at
    FROM purchase_returns pr
    LEFT JOIN purchases p ON pr.purchase_id = p.id
    LEFT JOIN accounts a ON p.supplier_account_id = a.id
    LEFT JOIN users u ON pr.created_by = u.id
    WHERE pr.company_id = ? AND DATE(pr.return_date) BETWEEN ? AND ?
    ORDER BY pr.return_date DESC, pr.created_at DESC
  `;
  
  const returns = await query(sql, [companyId, startDate, endDate]);
  
  // Get item counts for each return
  if (returns && returns.length > 0) {
    for (const ret of returns) {
      const [countResult] = await query(
        'SELECT COUNT(*) as item_count FROM purchase_return_items WHERE purchase_return_id = ?',
        [ret.id]
      );
      ret.item_count = countResult[0]?.item_count || 0;
    }
  }
  
  return returns;
}

export async function getPurchaseReturnDetails(returnId) {
  // Get purchase return header
  const returnSql = `
    SELECT 
      pr.*,
      p.supplier_account_id,
      a.account_name as supplier_name,
      c.company_name,
      u.username as created_by_name,
      p.invoice_no as original_invoice_no
    FROM purchase_returns pr
    LEFT JOIN purchases p ON pr.purchase_id = p.id
    LEFT JOIN accounts a ON p.supplier_account_id = a.id
    LEFT JOIN company c ON pr.company_id = c.id
    LEFT JOIN users u ON pr.created_by = u.id
    WHERE pr.id = ?
  `;
  const returnHeader = await queryOne(returnSql, [returnId]);

  if (!returnHeader) return null;

  // Get return items
  const itemsSql = `
    SELECT 
      pri.*,
      it.item_name, it.item_code
    FROM purchase_return_items pri
    LEFT JOIN item_master it ON pri.item_id = it.id
    WHERE pri.purchase_return_id = ?
  `;
  const items = await query(itemsSql, [returnId]);

  return { ...returnHeader, items };
}

export async function getPurchaseForReturn(purchaseId, companyId) {
  const sql = `
    SELECT 
      p.*,
      a.account_name as supplier_name, a.id as supplier_account_id,
      c.company_name
    FROM purchases p
    LEFT JOIN accounts a ON p.supplier_account_id = a.id
    LEFT JOIN company c ON p.company_id = c.id
    WHERE p.id = ? AND p.company_id = ?
  `;
  return await queryOne(sql, [purchaseId, companyId]);
}

export async function getPurchaseItemsWithStock(purchaseId) {
  const sql = `
    SELECT 
      pi.id as purchase_item_id,
      pi.item_id,
      pi.quantity as purchased_quantity,
      pi.purchase_rate,
      it.item_name, it.item_code,
      COALESCE(SUM(psl.quantity_in - psl.quantity_out), 0) as current_stock
    FROM purchase_items pi
    LEFT JOIN item_master it ON pi.item_id = it.id
    LEFT JOIN purchase_stock_ledger psl ON pi.item_id = psl.item_id
    WHERE pi.purchase_id = ?
    GROUP BY pi.id
  `;
  return await query(sql, [purchaseId]);
}

// ==================== SALE FUNCTIONS ====================

export async function createSale(companyId, invoiceNo, invoiceDate, customerId, memberId, items, discountAmount, paymentType, notes, userId, financialYear = '2026-27') {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. INSERT sale header
    const saleResult = await connection.query(
      `INSERT INTO sales 
       (company_id, invoice_no, invoice_date, customer_account_id, member_id, discount_amount, payment_type, notes, created_by, financial_year)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [companyId, invoiceNo, invoiceDate, customerId || null, memberId || null, discountAmount || 0, paymentType, notes, userId, financialYear]
    );

    const saleId = saleResult[0].insertId;
    let totalAmount = 0;

    // 2. INSERT sale items + calculate stock OUT
    for (const item of items) {
      const amount = item.quantity * item.sale_rate;
      totalAmount += amount;

      await connection.query(
        `INSERT INTO sale_items (sale_id, item_id, quantity, sale_rate, amount)
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, item.item_id, item.quantity, item.sale_rate, amount]
      );

      // Get current stock from ledger
      const currentStockRow = await connection.query(
        `SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as current_stock 
         FROM purchase_stock_ledger 
         WHERE company_id = ? AND item_id = ?`,
        [companyId, item.item_id]
      );

      const currentStock = currentStockRow[0][0]?.current_stock || 0;
      const newStock = currentStock - item.quantity; // Stock OUT

      // Insert stock ledger entry (STOCK OUT for sale)
      await connection.query(
        `INSERT INTO purchase_stock_ledger 
         (company_id, item_id, quantity_out, current_stock, transaction_type, reference_no, created_by, financial_year)
         VALUES (?, ?, ?, ?, 'SALE_OUT', ?, ?, ?)`,
        [companyId, item.item_id, item.quantity, newStock, `SALE-${saleId}`, userId, financialYear]
      );
    }

    // 3. Calculate net amount
    const netAmount = totalAmount - discountAmount;

    // 4. Update sale total
    await connection.query(
      `UPDATE sales SET total_amount = ?, net_amount = ? WHERE id = ?`,
      [totalAmount, netAmount, saleId]
    );

    // 5. Create account ledger entries for ALL sales (double-entry bookkeeping)
    // Use customerId if available, otherwise use memberId (for Member Master customers)
    const accountIdForLedger = customerId || memberId;

    if (accountIdForLedger) {
      // Entry 1: DEBIT Customer Account (customer owes us)
      try {
        await connection.query(
          `INSERT INTO account_ledger 
           (account_id, company_id, transaction_date, reference_type, reference_id, reference_no, description, debit, credit, financial_year)
           VALUES (?, ?, ?, 'SALE', ?, ?, ?, ?, 0, ?)`,
          [accountIdForLedger, companyId, invoiceDate, saleId, `SALE-${saleId}`, `Sale to customer - ${invoiceNo}`, netAmount, financialYear]
        );
      } catch (err) {
        console.error('Error creating debit ledger entry:', err);
        // Continue - don't fail the whole transaction
      }

      // Entry 2: CREDIT Sales Revenue Account
      // Try to find a Revenue account
      try {
        const salesAccountResult = await connection.query(
          `SELECT id FROM accounts WHERE company_id = ? AND (account_type = 'Revenue' OR account_type = 'Sales') AND is_deleted = 0 LIMIT 1`,
          [companyId]
        );

        let salesAccountId = null;

        // Check if we found a Revenue account
        if (salesAccountResult[0] && salesAccountResult[0].length > 0) {
          salesAccountId = salesAccountResult[0][0].id;
        } else {
          // If no Revenue account exists, try to create one or use a default
          const createResult = await connection.query(
            `INSERT INTO accounts (company_id, account_name, account_type, is_active) 
             VALUES (?, 'Sales Revenue', 'Revenue', 1)`,
            [companyId]
          );
          salesAccountId = createResult[0].insertId;
        }

        if (salesAccountId) {
          await connection.query(
            `INSERT INTO account_ledger 
             (account_id, company_id, transaction_date, reference_type, reference_id, reference_no, description, debit, credit, financial_year)
             VALUES (?, ?, ?, 'SALE', ?, ?, ?, 0, ?, ?)`,
            [salesAccountId, companyId, invoiceDate, saleId, `SALE-${saleId}`, `Sale - ${invoiceNo}`, netAmount, financialYear]
          );
        }
      } catch (err) {
        console.error('Error creating credit ledger entry:', err);
        // Continue - don't fail the whole transaction
      }
    }

    // 6. Create customer ledger entry for credit sales (for tracking purposes)
    if (paymentType === 'credit' && customerId) {
      const customerBalance = await connection.query(
        `SELECT COALESCE(SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END) - 
                         SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END), 0) as balance
         FROM customer_ledger 
         WHERE company_id = ? AND customer_account_id = ?`,
        [companyId, customerId]
      );

      const previousBalance = parseFloat(customerBalance[0][0]?.balance || 0);
      const newBalance = previousBalance + netAmount; // Customer owes us

      await connection.query(
        `INSERT INTO customer_ledger 
         (company_id, customer_account_id, debit_amount, balance, transaction_type, reference_no, created_by, financial_year)
         VALUES (?, ?, ?, ?, 'SALE', ?, ?, ?)`,
        [companyId, customerId, netAmount, newBalance, `SALE-${saleId}`, userId, financialYear]
      );
    }

    await connection.commit();
    return { id: saleId, invoice_no: invoiceNo, total_amount: totalAmount, net_amount: netAmount };
  } catch (error) {
    await connection.rollback();
    console.error('Create sale error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function getSalesByCompany(companyId, startDate, endDate, financialYear = '2026-27') {
  const sql = `
    SELECT 
      s.id,
      s.invoice_no,
      s.invoice_date,
      COALESCE(a.account_name, m.member_name, 'Walk-in') as customer_name,
      COALESCE(m.member_code, CAST(a.id AS CHAR)) as member_code,
      s.payment_type,
      s.total_amount,
      s.net_amount,
      COUNT(si.id) as item_count,
      s.created_at
    FROM sales s
    LEFT JOIN accounts a ON s.customer_account_id = a.id
    LEFT JOIN member_master m ON s.member_id = m.id
    LEFT JOIN sale_items si ON s.id = si.sale_id
    WHERE s.company_id = ? AND s.invoice_date BETWEEN ? AND ? AND s.financial_year = ?
    GROUP BY s.id
    ORDER BY s.invoice_date DESC, s.created_at DESC
  `;
  return await query(sql, [companyId, startDate, endDate, financialYear]);
}

export async function getSaleDetails(saleId) {
  const sql = `
    SELECT 
      s.id,
      s.invoice_no,
      s.invoice_date,
      s.customer_account_id,
      COALESCE(a.account_name, m.member_name, 'Walk-in') as customer_name,
      s.member_id,
      COALESCE(m.member_code, CAST(a.id AS CHAR)) as member_code,
      COALESCE(m.member_name, a.account_name, '') as member_name,
      s.total_amount,
      s.discount_amount,
      s.net_amount,
      s.payment_type,
      s.notes,
      s.created_by,
      u.username as created_by_user,
      s.created_at,
      s.company_id,
      c.company_name
    FROM sales s
    LEFT JOIN accounts a ON s.customer_account_id = a.id
    LEFT JOIN member_master m ON s.member_id = m.id
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN company c ON s.company_id = c.id
    WHERE s.id = ?
  `;
  const saleData = await query(sql, [saleId]);

  if (!saleData || saleData.length === 0) {
    return null;
  }

  const itemsSql = `
    SELECT 
      si.id,
      si.item_id,
      si.quantity,
      si.sale_rate,
      si.amount,
      it.item_code,
      it.item_name
    FROM sale_items si
    LEFT JOIN item_master it ON si.item_id = it.id
    WHERE si.sale_id = ?
  `;
  const items = await query(itemsSql, [saleId]);

  return {
    ...saleData[0],
    items: items
  };
}

export async function getItemByBarcode(barcode, companyId) {
  const sql = `
    SELECT 
      im.id,
      im.item_code,
      im.item_name,
      COALESCE(SUM(psl.quantity_in - psl.quantity_out), 0) as current_stock,
      ir.sale_rate
    FROM item_master im
    LEFT JOIN purchase_stock_ledger psl ON im.id = psl.item_id
    LEFT JOIN item_rate ir ON im.id = ir.item_id AND ir.is_active = 1
    WHERE im.barcode = ? AND im.company_id = ?
    GROUP BY im.id, ir.id
  `;
  return await query(sql, [barcode, companyId]);
}

export async function getItemRate(itemId, companyId) {
  const sql = `
    SELECT rate FROM item_rate 
    WHERE item_id = ? AND is_active = 1 
    LIMIT 1
  `;
  return await query(sql, [itemId]);
}

// ============================================
// SALE RETURN FUNCTIONS
// ============================================

export async function getSalesForReturn(companyId) {
  const sql = `
    SELECT 
      s.id,
      s.invoice_no,
      s.invoice_date,
      s.customer_account_id,
      COALESCE(a.account_name, 'Walk-in') as customer_name,
      s.total_amount,
      s.discount_amount,
      s.net_amount,
      COUNT(si.id) as item_count,
      GROUP_CONCAT(CONCAT(it.item_name, ' x', si.quantity) SEPARATOR ', ') as item_summary,
      (SELECT COUNT(*) FROM sale_returns WHERE sale_id = s.id) as has_return
    FROM sales s
    LEFT JOIN accounts a ON s.customer_account_id = a.id
    LEFT JOIN sale_items si ON s.id = si.sale_id
    LEFT JOIN item_master it ON si.item_id = it.id
    WHERE s.company_id = ? AND s.id NOT IN (
      SELECT sale_id FROM sale_returns WHERE sale_id IS NOT NULL
    )
    GROUP BY s.id
    ORDER BY s.invoice_date DESC
  `;
  return await query(sql, [companyId]);
}

export async function getSaleForReturnDetails(saleId) {
  const sql = `
    SELECT 
      s.id,
      s.invoice_no,
      s.invoice_date,
      s.customer_account_id,
      COALESCE(a.account_name, 'Walk-in') as customer_name,
      s.total_amount,
      s.discount_amount,
      s.net_amount,
      s.company_id
    FROM sales s
    LEFT JOIN accounts a ON s.customer_account_id = a.id
    WHERE s.id = ?
  `;
  const saleData = await query(sql, [saleId]);
  if (!saleData || saleData.length === 0) return null;

  const itemsSql = `
    SELECT 
      si.id,
      si.item_id,
      si.quantity,
      si.sale_rate,
      si.amount,
      it.item_code,
      it.item_name
    FROM sale_items si
    LEFT JOIN item_master it ON si.item_id = it.id
    WHERE si.sale_id = ?
  `;
  const items = await query(itemsSql, [saleId]);

  return { ...saleData[0], items };
}

export async function createSaleReturn(
  companyId,
  saleId,
  returnNo,
  returnDate,
  customerAccountId,
  items,
  refundType,
  notes,
  userId
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Calculate total return amount
    const totalReturnAmount = items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

    // Insert sale return header
    const returnSql = `
      INSERT INTO sale_returns 
      (company_id, sale_id, return_no, return_date, customer_account_id, 
       total_return_amount, refund_amount, refund_type, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [returnResult] = await connection.query(returnSql, [
      companyId,
      saleId,
      returnNo,
      returnDate,
      customerAccountId || null,
      totalReturnAmount,
      totalReturnAmount,
      refundType,
      notes || '',
      userId
    ]);

    const saleReturnId = returnResult.insertId;

    // Insert return items and update stock
    for (const item of items) {
      // Insert return item
      const itemSql = `
        INSERT INTO sale_return_items (sale_return_id, item_id, quantity, sale_rate, amount)
        VALUES (?, ?, ?, ?, ?)
      `;
      await connection.query(itemSql, [
        saleReturnId,
        item.item_id,
        item.quantity,
        item.sale_rate,
        item.amount
      ]);

      // Add to purchase stock ledger (stock IN via return)
      const stockSql = `
        INSERT INTO purchase_stock_ledger 
        (company_id, item_id, quantity_in, quantity_out, transaction_type, reference_no, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      await connection.query(stockSql, [
        companyId,
        item.item_id,
        item.quantity,
        0,
        'SALE_RETURN',
        `RETURN-${saleReturnId}`,
        userId
      ]);
    }

    // If cash refund, create cash ledger entry (debit cash, credit sales)
    // TODO: Uncomment when accounts_ledger table is set up
    /*
    if (refundType === 'cash') {
      const cashLedgerSql = `
        INSERT INTO accounts_ledger (account_id, debit_amount, credit_amount, reference_type, reference_id, narration)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const cashAccountId = 1;
      await connection.query(cashLedgerSql, [
        cashAccountId,
        totalReturnAmount,
        0,
        'sale_return',
        saleReturnId,
        `Sale Return ${returnNo}`
      ]);

      if (customerAccountId) {
        const customerLedgerSql = `
          INSERT INTO accounts_ledger (account_id, debit_amount, credit_amount, reference_type, reference_id, narration)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        await connection.query(customerLedgerSql, [
          customerAccountId,
          0,
          totalReturnAmount,
          'sale_return',
          saleReturnId,
          `Sale Return ${returnNo}`
        ]);
      }
    }
    */

    await connection.commit();

    return {
      id: saleReturnId,
      return_no: returnNo,
      total_return_amount: totalReturnAmount,
      refund_amount: totalReturnAmount,
      item_count: items.length
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.release();
  }
}

export async function getSaleReturnsByCompany(companyId, startDate, endDate) {
  const sql = `
    SELECT 
      sr.id,
      sr.return_no,
      sr.return_date,
      sr.customer_account_id,
      COALESCE(a.account_name, 'Walk-in') as customer_name,
      sr.total_return_amount,
      sr.refund_type,
      COUNT(sri.id) as item_count,
      u.username as created_by_user
    FROM sale_returns sr
    LEFT JOIN accounts a ON sr.customer_account_id = a.id
    LEFT JOIN sale_return_items sri ON sr.id = sri.sale_return_id
    LEFT JOIN users u ON sr.created_by = u.id
    WHERE sr.company_id = ? AND sr.return_date BETWEEN ? AND ?
    GROUP BY sr.id
    ORDER BY sr.return_date DESC, sr.created_at DESC
  `;
  return await query(sql, [companyId, startDate, endDate]);
}

export async function getSaleReturnDetails(saleReturnId) {
  const sql = `
    SELECT 
      sr.id,
      sr.return_no,
      sr.return_date,
      sr.customer_account_id,
      COALESCE(a.account_name, 'Walk-in') as customer_name,
      sr.total_return_amount,
      sr.refund_amount,
      sr.refund_type,
      sr.notes,
      sr.created_by,
      u.username as created_by_user,
      sr.created_at,
      sr.sale_id
    FROM sale_returns sr
    LEFT JOIN accounts a ON sr.customer_account_id = a.id
    LEFT JOIN users u ON sr.created_by = u.id
    WHERE sr.id = ?
  `;
  const returnData = await query(sql, [saleReturnId]);
  if (!returnData || returnData.length === 0) return null;

  const itemsSql = `
    SELECT 
      sri.id,
      sri.item_id,
      sri.quantity,
      sri.sale_rate,
      sri.amount,
      it.item_code,
      it.item_name
    FROM sale_return_items sri
    LEFT JOIN item_master it ON sri.item_id = it.id
    WHERE sri.sale_return_id = ?
  `;
  const items = await query(itemsSql, [saleReturnId]);

  return { ...returnData[0], items };
}

// ============================================
// CASH BOOK FUNCTIONS
// ============================================

// ============================================
// UNIFIED MASTER LEDGER FUNCTIONS (Universal Source)
// ============================================

export async function insertLedgerEntry(
  companyId, accountId, transactionDate, transactionType, referenceType, 
  referenceId, referenceNo, debit, credit, description, notes = '', memberId = null, financialYear = '2026-27'
) {
  const sql = `
    INSERT INTO account_ledger 
    (company_id, account_id, member_id, transaction_date, transaction_type, reference_type, 
     reference_id, reference_no, debit, credit, description, notes, financial_year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  return await query(sql, [
    companyId, accountId || null, memberId || null, transactionDate, 
    transactionType || 'manual', referenceType || null, referenceId || null, 
    referenceNo || '', description || '', notes || '', financialYear
  ]);
}

// Legacy Compatibility Wrapper for Cash Book (Now strictly Unified, Single-Entry)
export async function insertCashBookEntry(
  companyId, transactionDate, referenceType, referenceId, referenceNo, 
  description, cashIn, cashOut, userId, notes = '', financialYear = '2026-27'
) {
  // Directly insert into ledger as a cash_book transaction
  // No "Master Cash Account" needed; visibility is handled by transaction_type
  const result = await insertLedgerEntry(
     companyId, 
     null, // No specific account_id required for generic cash transactions
     transactionDate, 'cash_book', referenceType,
     referenceId, referenceNo, 
     parseFloat(cashIn) || 0,  // Debit (In)
     parseFloat(cashOut) || 0, // Credit (Out)
     description, notes, null, financialYear
  );

  return { insertId: result.insertId };
}

// Optimized Cash Balance (Aggregates Receipts - Payments from WHOLE ledger)
export async function getCashBalance(companyId, upToDate = null) {
  const dateCondition = upToDate ? `AND transaction_date <= ?` : '';
  const params = [companyId];
  if (upToDate) params.push(upToDate);

  const sql = `
    SELECT 
      SUM(COALESCE(debit, debit_amount, 0)) as total_cash_in,
      SUM(COALESCE(credit, credit_amount, 0)) as total_cash_out,
      SUM(COALESCE(debit, 0) - COALESCE(credit, 0)) as current_balance
    FROM account_ledger
    WHERE company_id = ? 
      AND (transaction_type = 'cash_book' OR reference_type = 'cash_book')
      ${dateCondition}
  `;

  const result = await query(sql, params);
  return result?.[0] || { total_cash_in: 0, total_cash_out: 0, current_balance: 0 };
}

export async function getCashBookEntries(companyId, startDate, endDate) {
  const sql = `
    SELECT 
      al.id,
      al.transaction_date,
      al.reference_type,
      al.reference_no,
      al.description,
      COALESCE(al.debit, al.debit_amount, 0) as cash_in,
      COALESCE(al.credit, al.credit_amount, 0) as cash_out,
      (COALESCE(al.debit, 0) - COALESCE(al.credit, 0)) as net_amount,
      u.username as created_by_user,
      al.created_at
    FROM account_ledger al
    LEFT JOIN users u ON al.created_by = u.id
    WHERE al.company_id = ? 
      AND (al.transaction_type = 'cash_book' OR al.reference_type = 'cash_book')
      AND al.transaction_date BETWEEN ? AND ?
    ORDER BY al.transaction_date DESC, al.created_at DESC
  `;
  return await query(sql, [companyId, startDate, endDate]);
}

export async function getDailyCashSummary(companyId, startDate, endDate) {
  const sql = `
    SELECT 
      transaction_date,
      SUM(COALESCE(debit, debit_amount, 0)) as daily_in,
      SUM(COALESCE(credit, credit_amount, 0)) as daily_out,
      SUM(COALESCE(debit, 0) - COALESCE(credit, 0)) as daily_net,
      COUNT(*) as transaction_count
    FROM account_ledger
    WHERE company_id = ? 
      AND (transaction_type = 'cash_book' OR reference_type = 'cash_book')
      AND transaction_date BETWEEN ? AND ?
    GROUP BY transaction_date
    ORDER BY transaction_date DESC
  `;
  return await query(sql, [companyId, startDate, endDate]);
}

export async function getOpeningBalance(companyId, forDate) {
  const previousDate = new Date(forDate);
  previousDate.setDate(previousDate.getDate() - 1);
  const prevDateStr = previousDate.toISOString().split('T')[0];

  const balanceData = await getCashBalance(companyId, prevDateStr);
  return parseFloat(balanceData.current_balance) || 0;
}

// ACCOUNT LEDGER FUNCTIONS (Now using Unified logic)

export async function getAccountLedger(accountId, startDate, endDate) {
  let whereClause = "al.account_id = ?";
  let params = [accountId];

  // Handle Member ID prefix
  if (String(accountId).startsWith('M')) {
    const memberId = accountId.substring(1);
    whereClause = "al.member_id = ?";
    params = [memberId];
  }

  const sql = `
    SELECT 
      al.id,
      al.transaction_date,
      COALESCE(al.transaction_type, al.reference_type, 'JV') as transaction_type,
      al.reference_no,
      COALESCE(al.debit, al.debit_amount, 0) as debit,
      COALESCE(al.credit, al.credit_amount, 0) as credit,
      COALESCE(al.description, al.notes, '') as description
    FROM account_ledger al
    WHERE ${whereClause} AND al.transaction_date BETWEEN ? AND ?
    ORDER BY al.transaction_date ASC, al.created_at ASC
  `;
  
  params.push(startDate, endDate);
  return await query(sql, params);
}

export async function getAccountBalance(accountId, upToDate = null) {
  let whereClause = "al.account_id = ?";
  let params = [accountId];

  // Handle Member ID prefix
  if (String(accountId).startsWith('M')) {
    const memberId = accountId.substring(1);
    whereClause = "al.member_id = ?";
    params = [memberId];
  }

  const dateCondition = upToDate ? `AND al.transaction_date <= ?` : '';
  if (upToDate) params.push(upToDate);

  const sql = `
    SELECT 
      COALESCE(SUM(COALESCE(debit, debit_amount, 0)), 0) as total_debit,
      COALESCE(SUM(COALESCE(credit, credit_amount, 0)), 0) as total_credit,
      COALESCE(SUM(COALESCE(debit, debit_amount, 0) - COALESCE(credit, credit_amount, 0)), 0) as running_balance
    FROM account_ledger al
    WHERE ${whereClause} ${dateCondition}
  `;

  const result = await query(sql, params);
  if (!result || result.length === 0) {
    return { total_debit: 0, total_credit: 0, running_balance: 0 };
  }
  return result[0];
}

export async function getAccountLedgerWithRunningBalance(accountId, startDate, endDate) {
  // 1. Get Opening Balance (transactions before startDate)
  const prevDate = new Date(startDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().split('T')[0];
  
  const balanceData = await getAccountBalance(accountId, prevDateStr);
  let runningBalance = parseFloat(balanceData.running_balance || 0);

  // 2. Get period transactions
  const entries = await getAccountLedger(accountId, startDate, endDate);

  // 3. Map with running balance
  const entriesWithBalance = entries.map(entry => {
    runningBalance += (parseFloat(entry.debit) || 0) - (parseFloat(entry.credit) || 0);
    return {
      ...entry,
      running_balance: runningBalance
    };
  });

  return entriesWithBalance;
}

export async function getTrialBalance(companyId, asOfDate = null) {
  const dateCondition = asOfDate ? `AND al.transaction_date <= ?` : '';
  const params = [companyId, companyId];
  if (asOfDate) params.push(asOfDate, asOfDate);

  const sql = `
    SELECT 
      id, account_name, account_type,
      SUM(total_debit) as total_debit,
      SUM(total_credit) as total_credit,
      SUM(total_debit - total_credit) as balance
    FROM (
      SELECT 
        a.id, a.account_name, a.account_type,
        COALESCE(SUM(COALESCE(al.debit, al.debit_amount, 0)), 0) as total_debit,
        COALESCE(SUM(COALESCE(al.credit, al.credit_amount, 0)), 0) as total_credit
      FROM accounts a
      LEFT JOIN account_ledger al ON a.id = al.account_id ${dateCondition}
      WHERE a.company_id = ? AND a.is_deleted = 0
      GROUP BY a.id, a.account_name, a.account_type
      
      UNION ALL
      
      SELECT 
        CONCAT('M', m.id) as id, m.member_name as account_name, 'member' as account_type,
        COALESCE(SUM(COALESCE(al.debit, al.debit_amount, 0)), 0) as total_debit,
        COALESCE(SUM(COALESCE(al.credit, al.credit_amount, 0)), 0) as total_credit
      FROM member_master m
      LEFT JOIN account_ledger al ON m.id = al.member_id ${dateCondition}
      WHERE m.company_id = ? AND m.account_id IS NULL
      GROUP BY m.id, m.member_name
    ) unified
    GROUP BY id, account_name, account_type
    ORDER BY account_name ASC
  `;

  const results = await query(sql, params);
  
  const totals = results.reduce((acc, curr) => {
    acc.total_debit += parseFloat(curr.total_debit);
    acc.total_credit += parseFloat(curr.total_credit);
    return acc;
  }, { total_debit: 0, total_credit: 0 });

  totals.difference = Math.abs(totals.total_debit - totals.total_credit);

  return { data: results, totals };
}


export async function getLedgerByDateRange(companyId, startDate, endDate) {
  const sql = `
    SELECT 
      al.id,
      COALESCE(a.account_name, m.member_name) as account_name,
      al.transaction_date,
      COALESCE(al.reference_type, al.transaction_type) as reference_type,
      al.reference_no,
      COALESCE(al.description, '') as description,
      COALESCE(al.debit, al.debit_amount, 0) as debit,
      COALESCE(al.credit, al.credit_amount, 0) as credit,
      (COALESCE(al.debit, al.debit_amount, 0) - COALESCE(al.credit, al.credit_amount, 0)) as net_amount
    FROM account_ledger al
    LEFT JOIN accounts a ON al.account_id = a.id
    LEFT JOIN member_master m ON al.member_id = m.id
    WHERE al.company_id = ? AND al.transaction_date BETWEEN ? AND ?
    ORDER BY al.transaction_date ASC, al.created_at ASC
  `;
  return await query(sql, [companyId, startDate, endDate]);
}

// Connect on startup
// ============================================
// STOCK REPORT FUNCTIONS
// ============================================

export async function getStockReport(companyId) {
  const sql = `
    SELECT 
      im.id,
      im.item_code,
      im.item_name,
      im.category,
      im.unit,
      im.reorder_level,
      
      COALESCE(SUM(CASE 
        WHEN pl.transaction_type = 'PURCHASE_IN' THEN pl.quantity_in 
        ELSE 0 
      END), 0) as total_purchased,
      
      COALESCE(SUM(CASE 
        WHEN pl.transaction_type = 'PURCHASE_RETURN' THEN pl.quantity_out 
        ELSE 0 
      END), 0) as total_purchase_returned,
      
      COALESCE(SUM(CASE 
        WHEN pl.transaction_type = 'SALE_OUT' THEN pl.quantity_out 
        ELSE 0 
      END), 0) as total_sold,
      
      COALESCE(SUM(CASE 
        WHEN pl.transaction_type = 'SALE_RETURN' THEN pl.quantity_in 
        ELSE 0 
      END), 0) as total_sale_returned,
      
      COALESCE(SUM(CASE 
        WHEN pl.transaction_type = 'PURCHASE_IN' THEN pl.quantity_in 
        WHEN pl.transaction_type = 'PURCHASE_RETURN' THEN -pl.quantity_out
        WHEN pl.transaction_type = 'SALE_OUT' THEN -pl.quantity_out
        WHEN pl.transaction_type = 'SALE_RETURN' THEN pl.quantity_in
        ELSE 0 
      END), 0) as current_stock,
      
      CASE 
        WHEN COALESCE(SUM(CASE 
          WHEN pl.transaction_type = 'PURCHASE_IN' THEN pl.quantity_in 
          WHEN pl.transaction_type = 'PURCHASE_RETURN' THEN -pl.quantity_out
          WHEN pl.transaction_type = 'SALE_OUT' THEN -pl.quantity_out
          WHEN pl.transaction_type = 'SALE_RETURN' THEN pl.quantity_in
          ELSE 0 
        END), 0) <= im.reorder_level THEN 'LOW'
        ELSE 'OK'
      END as stock_status
      
    FROM item_master im
    LEFT JOIN purchase_stock_ledger pl ON im.id = pl.item_id AND pl.company_id = ?
    WHERE im.company_id = ? AND im.is_active = 1
    GROUP BY im.id, im.item_code, im.item_name, im.category, im.unit, im.reorder_level
    ORDER BY current_stock ASC
  `;

  return await query(sql, [companyId, companyId]);
}

export async function getLowStockItems(companyId) {
  const sql = `
    SELECT 
      im.id,
      im.item_code,
      im.item_name,
      im.category,
      im.reorder_level,
      COALESCE(SUM(CASE 
        WHEN pl.transaction_type = 'PURCHASE_IN' THEN pl.quantity_in 
        WHEN pl.transaction_type = 'PURCHASE_RETURN' THEN -pl.quantity_out
        WHEN pl.transaction_type = 'SALE_OUT' THEN -pl.quantity_out
        WHEN pl.transaction_type = 'SALE_RETURN' THEN pl.quantity_in
        ELSE 0 
      END), 0) as current_stock,
      (im.reorder_level - COALESCE(SUM(CASE 
        WHEN pl.transaction_type = 'PURCHASE_IN' THEN pl.quantity_in 
        WHEN pl.transaction_type = 'PURCHASE_RETURN' THEN -pl.quantity_out
        WHEN pl.transaction_type = 'SALE_OUT' THEN -pl.quantity_out
        WHEN pl.transaction_type = 'SALE_RETURN' THEN pl.quantity_in
        ELSE 0 
      END), 0)) as reorder_quantity
      
    FROM item_master im
    LEFT JOIN purchase_stock_ledger pl ON im.id = pl.item_id AND pl.company_id = ?
    WHERE im.company_id = ? AND im.is_active = 1
    GROUP BY im.id
    HAVING current_stock <= im.reorder_level
    ORDER BY reorder_quantity DESC
  `;

  return await query(sql, [companyId, companyId]);
}

export async function getItemStockHistory(itemId, companyId) {
  const sql = `
    SELECT 
      pl.id,
      pl.created_at as transaction_date,
      pl.transaction_type,
      pl.reference_no,
      pl.quantity_in,
      pl.quantity_out,
      (pl.quantity_in - pl.quantity_out) as net_qty,
      pl.created_at
    FROM purchase_stock_ledger pl
    WHERE pl.item_id = ? AND pl.company_id = ?
    ORDER BY pl.created_at DESC
  `;

  return await query(sql, [itemId, companyId]);
}

// ============================================
// PROFIT & LOSS STATEMENT FUNCTIONS
// ============================================

export async function getProfitLossStatement(companyId, startDate, endDate) {
  try {
    // 1. SALES REVENUE
    const salesRevenueResult = await query(
      `SELECT COALESCE(SUM(net_amount), 0) as total_sales_revenue
       FROM sales
       WHERE company_id = ? AND DATE(invoice_date) BETWEEN ? AND ?`,
      [companyId, startDate, endDate]
    );
    const totalSalesRevenue = parseFloat(salesRevenueResult[0]?.total_sales_revenue || 0);

    // 2. SALES RETURNS
    const salesReturnsResult = await query(
      `SELECT COALESCE(SUM(total_return_amount), 0) as total_sales_returns
       FROM sale_returns
       WHERE company_id = ? AND DATE(return_date) BETWEEN ? AND ?`,
      [companyId, startDate, endDate]
    );
    const totalSalesReturns = parseFloat(salesReturnsResult[0]?.total_sales_returns || 0);

    // 3. NET SALES (Sales Revenue - Sales Returns)
    const netSales = totalSalesRevenue - totalSalesReturns;

    // 4. PURCHASE COST (Cost of Goods Sold - COGS)
    const purchaseCostResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total_purchase_cost
       FROM purchases
       WHERE company_id = ? AND DATE(invoice_date) BETWEEN ? AND ?`,
      [companyId, startDate, endDate]
    );
    const totalPurchaseCost = parseFloat(purchaseCostResult[0]?.total_purchase_cost || 0);

    // 5. PURCHASE RETURNS (Adjusting COGS downward)
    const purchaseReturnsResult = await query(
      `SELECT COALESCE(SUM(return_amount), 0) as total_purchase_returns
       FROM purchase_returns
       WHERE company_id = ? AND DATE(return_date) BETWEEN ? AND ?`,
      [companyId, startDate, endDate]
    );
    const totalPurchaseReturns = parseFloat(purchaseReturnsResult[0]?.total_purchase_returns || 0);

    // 6. NET PURCHASE COST (Purchase Cost - Purchase Returns)
    const netPurchaseCost = totalPurchaseCost - totalPurchaseReturns;

    // 7. GROSS PROFIT (Net Sales - Net Purchase Cost)
    const grossProfit = netSales - netPurchaseCost;

    // 8. OPERATING EXPENSES from Cash Book
    // Using account_type to identify expense accounts
    const operatingExpensesResult = await query(
      `SELECT 
        COALESCE(SUM(
          CASE 
            WHEN a.account_type = 'Expense' THEN COALESCE(al.debit_amount, 0)
            ELSE 0
          END
        ), 0) as total_operating_expenses
       FROM account_ledger al
       LEFT JOIN accounts a ON al.account_id = a.id
       WHERE a.company_id = ? AND DATE(al.transaction_date) BETWEEN ? AND ? AND a.account_type = 'Expense'`,
      [companyId, startDate, endDate]
    );
    const operatingExpenses = parseFloat(operatingExpensesResult[0]?.total_operating_expenses || 0);

    // 9. NET PROFIT (Gross Profit - Operating Expenses)
    const netProfit = grossProfit - operatingExpenses;

    // 10. DETAILED BREAKDOWN BY CATEGORY
    const salesByTypeResult = await query(
      `SELECT 
        payment_type,
        COUNT(*) as transaction_count,
        COALESCE(SUM(net_amount), 0) as amount
       FROM sales
       WHERE company_id = ? AND DATE(invoice_date) BETWEEN ? AND ?
       GROUP BY payment_type`,
      [companyId, startDate, endDate]
    );

    // 11. ACCOUNT-WISE BREAKDOWN
    const expenseAccountsResult = await query(
      `SELECT a.account_name, COALESCE(SUM(al.debit - al.credit), 0) as amount
       FROM account_ledger al
       JOIN accounts a ON al.account_id = a.id
       WHERE a.company_id = ? AND a.account_type = 'Expense' 
       AND DATE(al.transaction_date) BETWEEN ? AND ?
       GROUP BY a.id, a.account_name
       HAVING amount != 0`,
      [companyId, startDate, endDate]
    );

    const incomeAccountsResult = await query(
      `SELECT a.account_name, COALESCE(SUM(al.credit - al.debit), 0) as amount
       FROM account_ledger al
       JOIN accounts a ON al.account_id = a.id
       WHERE a.company_id = ? AND a.account_type = 'Revenue' 
       AND DATE(al.transaction_date) BETWEEN ? AND ?
       GROUP BY a.id, a.account_name
       HAVING amount != 0`,
      [companyId, startDate, endDate]
    );

    return {
      period: {
        startDate,
        endDate
      },
      revenue: {
        totalSalesRevenue,
        salesReturns: totalSalesReturns,
        netSales
      },
      costOfGoodsSold: {
        purchaseCost: totalPurchaseCost,
        purchaseReturns: totalPurchaseReturns,
        netCostOfGoodsSold: netPurchaseCost
      },
      grossProfit,
      operatingExpenses,
      netProfit,
      profitMargin: netSales > 0 ? ((netProfit / netSales) * 100).toFixed(2) : 0,
      salesByType: salesByTypeResult,
      expenseAccounts: expenseAccountsResult,
      incomeAccounts: incomeAccountsResult
    };
  } catch (error) {
    console.error('Error calculating P&L statement:', error);
    throw error;
  }
}

export async function getMonthlyProfitLoss(companyId, year) {
  try {
    const sql = `
      SELECT 
        m.month_num as month,
        ? as year,
        COALESCE(s.amount, 0) as sales_revenue,
        COALESCE(sr.amount, 0) as sales_returns,
        COALESCE(p.amount, 0) as purchase_cost,
        COALESCE(pr.amount, 0) as purchase_returns
      FROM (
        SELECT 1 as month_num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION 
        SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION 
        SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12
      ) m
      LEFT JOIN (
        SELECT MONTH(invoice_date) as month, SUM(net_amount) as amount
        FROM sales
        WHERE company_id = ? AND YEAR(invoice_date) = ?
        GROUP BY MONTH(invoice_date)
      ) s ON m.month_num = s.month
      LEFT JOIN (
        SELECT MONTH(return_date) as month, SUM(total_return_amount) as amount
        FROM sale_returns
        WHERE company_id = ? AND YEAR(return_date) = ?
        GROUP BY MONTH(return_date)
      ) sr ON m.month_num = sr.month
      LEFT JOIN (
        SELECT MONTH(invoice_date) as month, SUM(total_amount) as amount
        FROM purchases
        WHERE company_id = ? AND YEAR(invoice_date) = ?
        GROUP BY MONTH(invoice_date)
      ) p ON m.month_num = p.month
      LEFT JOIN (
        SELECT MONTH(return_date) as month, SUM(return_amount) as amount
        FROM purchase_returns
        WHERE company_id = ? AND YEAR(return_date) = ?
        GROUP BY MONTH(return_date)
      ) pr ON m.month_num = pr.month
      ORDER BY m.month_num
    `;

    const results = await query(sql, [
      year, 
      companyId, year, 
      companyId, year, 
      companyId, year, 
      companyId, year
    ]);

    return results.map(row => ({
      month: row.month,
      year: row.year,
      salesRevenue: parseFloat(row.sales_revenue || 0),
      salesReturns: parseFloat(row.sales_returns || 0),
      netSales: parseFloat(row.sales_revenue || 0) - parseFloat(row.sales_returns || 0),
      purchaseCost: parseFloat(row.purchase_cost || 0),
      purchaseReturns: parseFloat(row.purchase_returns || 0),
      netCOGS: parseFloat(row.purchase_cost || 0) - parseFloat(row.purchase_returns || 0),
      grossProfit: (parseFloat(row.sales_revenue || 0) - parseFloat(row.sales_returns || 0)) -
        (parseFloat(row.purchase_cost || 0) - parseFloat(row.purchase_returns || 0))
    }));
  } catch (error) {
    console.error('Error calculating monthly P&L:', error);
    throw error;
  }
}

export async function getProfitLossSummary(companyId) {
  try {
    // Get current month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const startDateStr = startOfMonth.toISOString().split('T')[0];
    const endDateStr = endOfMonth.toISOString().split('T')[0];

    return await getProfitLossStatement(companyId, startDateStr, endDateStr);
  } catch (error) {
    console.error('Error calculating P&L summary:', error);
    throw error;
  }
}

// Export connection pool getter
export async function getConnection() {
  return pool.getConnection();
}

export default pool;

