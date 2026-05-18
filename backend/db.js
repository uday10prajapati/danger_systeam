import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import bcrypt from 'bcryptjs';

// Load .env from the best available location
const envCandidates = process.pkg
  ? [
    path.join(process.resourcesPath, '.env'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', '.env'),
    path.join(path.dirname(process.execPath), '.env'),
  ]
  : [path.join(__dirname, '.env')];

const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));
dotenv.config(envPath ? { path: envPath } : undefined);

const { Pool } = pg;

// PostgreSQL Configuration
console.log('🔧 Database Configuration (PostgreSQL):');
console.log('  Host:', process.env.DB_HOST || 'localhost');
console.log('  User:', process.env.DB_USER || 'postgres');
console.log('  Database:', process.env.DB_NAME || 'danger_systeam');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '6099'),
  database: process.env.DB_NAME || 'danger_systeam',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Helper to transform MySQL SQL to PostgreSQL
const transformQuery = (sql) => {
  if (typeof sql !== 'string') return sql;

  let newSql = sql;

  // Basic Structural Translations (MySQL -> Postgres)
  newSql = newSql.replace(/INT PRIMARY KEY AUTO_INCREMENT/gi, 'SERIAL PRIMARY KEY');
  newSql = newSql.replace(/INT AUTO_INCREMENT PRIMARY KEY/gi, 'SERIAL PRIMARY KEY');
  newSql = newSql.replace(/AUTO_INCREMENT/gi, ''); // Remove if SERIAL already handled or if it's naked
  newSql = newSql.replace(/DATETIME/gi, 'TIMESTAMP');
  newSql = newSql.replace(/LONGTEXT/gi, 'TEXT');
  newSql = newSql.replace(/TINYINT\(1\)/gi, 'BOOLEAN');
  newSql = newSql.replace(/INT\(\d+\)/gi, 'INT'); // Remove MySQL display width

  // Handle ENUM(...) - Convert to VARCHAR for simplicity
  newSql = newSql.replace(/ENUM\([^)]+\)/gi, 'VARCHAR(255)');

  // Handle MySQL CAST AS UNSIGNED -> Postgres CAST AS INTEGER
  newSql = newSql.replace(/AS UNSIGNED/gi, 'AS INTEGER');

  // Handle MySQL YEAR() and MONTH() -> Postgres EXTRACT
  newSql = newSql.replace(/YEAR\(([^)]+)\)/gi, 'EXTRACT(YEAR FROM $1)');
  newSql = newSql.replace(/MONTH\(([^)]+)\)/gi, 'EXTRACT(MONTH FROM $1)');

  // Handle MySQL TO_DAYS -> Postgres date - '0001-01-01'
  newSql = newSql.replace(/TO_DAYS\(([^)]+)\)/gi, "(CAST($1 AS DATE) - DATE '0001-01-01')");

  // Handle MySQL REGEXP -> Postgres ~
  newSql = newSql.replace(/\s+REGEXP\s+/gi, ' ~ ');

  // Handle MySQL IFNULL -> Postgres COALESCE
  newSql = newSql.replace(/IFNULL\(/gi, 'COALESCE(');

  // Handle MySQL IF(cond, val1, val2) -> Postgres CASE WHEN cond THEN val1 ELSE val2 END
  newSql = newSql.replace(/\bIF\(([^,]+),([^,]+),([^)]+)\)/gi, 'CASE WHEN $1 THEN $2 ELSE $3 END');

  // Handle MySQL CAST AS CHAR -> Postgres CAST AS TEXT
  newSql = newSql.replace(/AS CHAR/gi, 'AS TEXT');

  // Handle MySQL SUBSTRING -> Postgres natively supports SUBSTRING
  // newSql = newSql.replace(/SUBSTRING\(/gi, 'SUBSTR('); 

  // Handle MySQL DATE_FORMAT -> Postgres TO_CHAR
  newSql = newSql.replace(/DATE_FORMAT\(([^,]+),\s*'%Y-%m-%d'\)/gi, "TO_CHAR($1, 'YYYY-MM-DD')");
  newSql = newSql.replace(/DATE_FORMAT\(([^,]+),\s*'%d-%m-%Y'\)/gi, "TO_CHAR($1, 'DD-MM-YYYY')");

  // Handle MySQL backticks -> Postgres double quotes
  newSql = newSql.replace(/`/g, '"');

  // Handle INSERT IGNORE
  const isInsertIgnore = sql.toUpperCase().includes('INSERT IGNORE');
  newSql = newSql.replace(/INSERT IGNORE INTO/gi, 'INSERT INTO');

  // Handle PostgreSQL INSERT logic
  newSql = newSql.trim();
  if (newSql.toUpperCase().startsWith('INSERT')) {
    // Remove trailing semicolon
    newSql = newSql.replace(/;$/, '');

    // Add ON CONFLICT for IGNORE
    if (isInsertIgnore && !newSql.toUpperCase().includes('ON CONFLICT')) {
      newSql += ' ON CONFLICT DO NOTHING';
    }

    // Add RETURNING if missing (only for INSERT)
    if (!newSql.toUpperCase().includes('RETURNING') && !newSql.toUpperCase().includes('SELECT')) {
      newSql += ' RETURNING id';
    }
  }

  // Handle ON UPDATE CURRENT_TIMESTAMP
  newSql = newSql.replace(/ON UPDATE CURRENT_TIMESTAMP/gi, '');

  // Handle ADD COLUMN IF NOT EXISTS
  if (newSql.toUpperCase().includes('ADD COLUMN') && !newSql.toUpperCase().includes('IF NOT EXISTS')) {
    newSql = newSql.replace(/ADD COLUMN/gi, 'ADD COLUMN IF NOT EXISTS');
  }

  // Handle GROUP_CONCAT -> STRING_AGG
  newSql = newSql.replace(/GROUP_CONCAT\((.*?)\s+SEPARATOR\s+['"](.*?)['"]\)/gi, 'STRING_AGG($1, $2)');
  newSql = newSql.replace(/GROUP_CONCAT\((.*?)\)/gi, "STRING_AGG($1, ', ')");

  // Handle DATEDIFF -> Subtraction
  newSql = newSql.replace(/DATEDIFF\((.*?), (.*?)\)/gi, '(CAST($1 AS DATE) - CAST($2 AS DATE))');

  // Handle PostgreSQL placeholders last
  let index = 1;
  newSql = newSql.replace(/\?/g, () => `$${index++}`);

  return newSql;
};

// Add PostgreSQL polyfill for getConnection/connect
pool.getConnection = async () => {
  const client = await pool.connect();
  // Wrap client to match expected interface
  return {
    query: async (sql, params = []) => {
      const transformed = transformQuery(sql);
      const res = await client.query(transformed, params);
      return [res.rows, res.fields];
    },
    execute: async (sql, params = []) => {
      const transformed = transformQuery(sql);
      const res = await client.query(transformed, params);
      return [{ insertId: res.rows[0]?.id || null, affectedRows: res.rowCount }, []];
    },
    beginTransaction: () => client.query('BEGIN'),
    commit: () => client.query('COMMIT'),
    rollback: () => client.query('ROLLBACK'),
    release: () => client.release()
  };
};

console.log('✅ PostgreSQL Connection Pool Initialized');

// Create a connection wrapper for consistency with existing code
export const getConnection = async () => {
  const client = await pool.connect();
  return {
    query: async (sql, params = []) => {
      try {
        const transformedSql = transformQuery(sql);
        console.log('DEBUG [TX] SQL:', transformedSql);
        console.log('DEBUG [TX] PARAMS:', params);
        const result = await client.query(transformedSql, params);
        return [result.rows, result.fields];
      } catch (err) {
        console.error('SQL Error [TX]:', err);
        console.error('In query:', sql);
        console.error('Transformed:', transformQuery(sql));
        throw err;
      }
    },
    execute: async (sql, params = []) => {
      try {
        const transformedSql = transformQuery(sql);
        console.log('DEBUG [TX-EXEC] SQL:', transformedSql);
        console.log('DEBUG [TX-EXEC] PARAMS:', params);
        const result = await client.query(transformedSql, params);
        // Map result to match mysql2 structure [result, fields]
        const mockResult = {
          insertId: result.rows[0]?.id || null, // Postgres returns id in rows if RETURNING used
          affectedRows: result.rowCount
        };
        return [mockResult, []];
      } catch (err) {
        console.error('SQL Error [TX-EXEC]:', err);
        console.error('In query:', sql);
        console.error('Transformed:', transformQuery(sql));
        throw err;
      }
    },
    beginTransaction: async () => { await client.query('BEGIN'); },
    commit: async () => { await client.query('COMMIT'); },
    rollback: async () => { await client.query('ROLLBACK'); },
    release: () => { client.release(); }
  };
};

// Initialize database and create tables
export async function initializeDatabase() {
  // First, verify if the database exists by connecting to 'postgres' first
  const masterPool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || '6099'),
    database: 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('🔍 Checking if target database exists...');
    const client = await masterPool.connect();
    const dbCheck = await client.query("SELECT 1 FROM pg_database WHERE datname = 'danger_systeam'");
    
    if (dbCheck.rowCount === 0) {
      console.log('🚀 Database missing. Creating "danger_systeam"...');
      await client.query('CREATE DATABASE danger_systeam');
      console.log('✅ Database created successfully.');
    } else {
      console.log('✅ Target database already exists.');
    }
    client.release();
  } catch (err) {
    console.warn('⚠️ Master database check failed (might be permissions or already connected):', err.message);
  } finally {
    await masterPool.end();
  }

  // Now proceed with normal initialization
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    try {
      // Create Company table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS company (
          id SERIAL PRIMARY KEY,
          company_name VARCHAR(255) NOT NULL UNIQUE,
          address TEXT NOT NULL,
          phone VARCHAR(20) NOT NULL,
          email VARCHAR(100) NOT NULL UNIQUE,
          gst_number VARCHAR(15),
          company_account_no VARCHAR(100),
          financial_year_start DATE NOT NULL,
          financial_year_end DATE NOT NULL,
          currency VARCHAR(3) DEFAULT 'INR',
          logo_url VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_active INT DEFAULT 1
        )
      `);

      // Create Financial Years table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS financial_years (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          year_label VARCHAR(20) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          is_active INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (company_id, year_label)
        )
      `);

      // Create Users table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          username VARCHAR(100) NOT NULL,
          full_name_gu VARCHAR(255),
          email VARCHAR(100) NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'cashier',
          module_access JSONB DEFAULT '[]',
          is_active INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Add missing columns if they don't exist
      try { await connection.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS module_access JSONB DEFAULT '[]'"); } catch (e) { }
      try { await connection.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name_gu VARCHAR(255)"); } catch (e) { }

      // Create Accounts table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          account_name VARCHAR(100) NOT NULL,
          account_name_gu VARCHAR(255),
          account_type VARCHAR(50) NOT NULL,
          phone VARCHAR(20),
          email VARCHAR(100),
          gst_no VARCHAR(15),
          tin_no VARCHAR(20),
          opening_balance DECIMAL(15, 2) DEFAULT 0,
          is_active INT DEFAULT 1,
          is_deleted INT DEFAULT 0,
          account_code VARCHAR(50),
          is_subledger BOOLEAN DEFAULT FALSE,
          is_system BOOLEAN DEFAULT FALSE,
          financial_year VARCHAR(20) NOT NULL DEFAULT '2026-27',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Item Master table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS item_master (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          item_code VARCHAR(50) NOT NULL,
          item_name VARCHAR(255) NOT NULL,
          item_name_gu VARCHAR(255),
          desc_en TEXT,
          desc_gu TEXT,
          barcode VARCHAR(100),
          category VARCHAR(100),
          unit VARCHAR(20) DEFAULT 'PCS',
          unit_gu VARCHAR(50),
          purchase_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
          sale_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
          purchase_account_id INT,
          sales_account_id INT,
          tax_percentage DECIMAL(5, 2) DEFAULT 0,
          reorder_level INT DEFAULT 0,
          consider_in_autostock INT DEFAULT 0,
          do_auto_stock_in_sales INT DEFAULT 0,
          opening_stock DECIMAL(15, 3) DEFAULT 0.000,
          opening_stock_value DECIMAL(15, 2) DEFAULT 0.00,
          minimum_stock DECIMAL(15, 3) DEFAULT 0.000,
          loss_per_kg DECIMAL(15, 3) DEFAULT 0.000,
          effective_date DATE,
          sgst_percent DECIMAL(5, 2) DEFAULT 0.00,
          cgst_percent DECIMAL(5, 2) DEFAULT 0.00,
          igst_percent DECIMAL(5, 2) DEFAULT 0.00,
          cess_percent DECIMAL(5, 2) DEFAULT 0.00,
          hsn_code VARCHAR(50),
          is_active INT DEFAULT 1,
          financial_year VARCHAR(20) NOT NULL DEFAULT '2026-27',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Dangar Rates table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS dangar_rates (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          financial_year VARCHAR(20) NOT NULL,
          item_id INT NOT NULL REFERENCES item_master(id),
          rate DECIMAL(15, 2) NOT NULL DEFAULT 0,
          winter_rate DECIMAL(15, 2) NOT NULL DEFAULT 0,
          summer_rate DECIMAL(15, 2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (company_id, financial_year, item_id)
        )
      `);

      // Create Sales table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS sales (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE RESTRICT,
          invoice_no VARCHAR(100) NOT NULL UNIQUE,
          invoice_date DATE NOT NULL,
          customer_account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
          member_id INT,
          total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
          discount_amount DECIMAL(15, 2) DEFAULT 0,
          taxable_amount DECIMAL(15, 2) DEFAULT 0,
          gst_percent DECIMAL(5, 2) DEFAULT 0,
          cgst_percent DECIMAL(5, 2) DEFAULT 0,
          sgst_percent DECIMAL(5, 2) DEFAULT 0,
          igst_percent DECIMAL(5, 2) DEFAULT 0,
          cgst_amount DECIMAL(15, 2) DEFAULT 0,
          sgst_amount DECIMAL(15, 2) DEFAULT 0,
          igst_amount DECIMAL(15, 2) DEFAULT 0,
          total_tax DECIMAL(15, 2) DEFAULT 0,
          net_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
          is_intra_state INT DEFAULT 1,
          payment_type VARCHAR(50) DEFAULT 'cash',
          driver_name VARCHAR(100),
          mobile_number VARCHAR(20),
          gadi_number VARCHAR(50),
          brokerage_percent DECIMAL(5, 2) DEFAULT 0,
          brokerage_amount DECIMAL(15, 2) DEFAULT 0,
          labour_charge DECIMAL(15, 2) DEFAULT 0,
          notes TEXT,
          created_by INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          financial_year VARCHAR(20) NOT NULL DEFAULT '2026-27',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Add missing columns to sales
      try { await connection.query("ALTER TABLE sales ADD COLUMN IF NOT EXISTS driver_name VARCHAR(100)"); } catch (e) { }
      try { await connection.query("ALTER TABLE sales ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20)"); } catch (e) { }
      try { await connection.query("ALTER TABLE sales ADD COLUMN IF NOT EXISTS gadi_number VARCHAR(50)"); } catch (e) { }
      try { await connection.query("ALTER TABLE sales ADD COLUMN IF NOT EXISTS brokerage_percent DECIMAL(5,2) DEFAULT 0"); } catch (e) { }
      try { await connection.query("ALTER TABLE sales ADD COLUMN IF NOT EXISTS brokerage_amount DECIMAL(15,2) DEFAULT 0"); } catch (e) { }
      try { await connection.query("ALTER TABLE sales ADD COLUMN IF NOT EXISTS labour_charge DECIMAL(15,2) DEFAULT 0"); } catch (e) { }

      // Create Sale Items table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS sale_items (
          id SERIAL PRIMARY KEY,
          sale_id INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
          item_id INT NOT NULL REFERENCES item_master(id) ON DELETE RESTRICT,
          weight DECIMAL(15, 3) DEFAULT 0,
          quantity DECIMAL(15, 2) NOT NULL,
          sale_rate DECIMAL(15, 2) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          taxable_amount DECIMAL(15, 2) DEFAULT 0,
          gst_percent DECIMAL(5, 2) DEFAULT 0,
          gst_amount DECIMAL(15, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Add missing columns to sale_items
      try { await connection.query("ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS weight DECIMAL(15,3) DEFAULT 0"); } catch (e) { }

      // Create Member Master table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS member_master (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          financial_year VARCHAR(20) NOT NULL DEFAULT '2026-27',
          member_code VARCHAR(50) NOT NULL,
          member_name VARCHAR(255) NOT NULL,
          eng_name TEXT,
          phone VARCHAR(20),
          village_code VARCHAR(50),
          village_name VARCHAR(155),
          full_ac_number VARCHAR(100),
          bank_name VARCHAR(255),
          branch_name VARCHAR(155),
          account_type VARCHAR(50),
          address_no TEXT,
          nominal_member TEXT,
          ifsc_code VARCHAR(20),
          bardan_opening DECIMAL(15, 2) DEFAULT 0,
          account_id INT DEFAULT NULL,
          is_active INT DEFAULT 1,
          member_address TEXT,
          member_gst_no VARCHAR(25),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await connection.query("CREATE INDEX IF NOT EXISTS idx_member_code ON member_master(member_code)");

      // Create Purchases table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS purchases (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          supplier_account_id INT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
          invoice_no VARCHAR(100) NOT NULL UNIQUE,
          invoice_date DATE NOT NULL,
          total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
          taxable_amount DECIMAL(15, 2) DEFAULT 0,
          gst_percent DECIMAL(5, 2) DEFAULT 0,
          cgst_percent DECIMAL(5, 2) DEFAULT 0,
          sgst_percent DECIMAL(5, 2) DEFAULT 0,
          igst_percent DECIMAL(5, 2) DEFAULT 0,
          cgst_amount DECIMAL(15, 2) DEFAULT 0,
          sgst_amount DECIMAL(15, 2) DEFAULT 0,
          igst_amount DECIMAL(15, 2) DEFAULT 0,
          total_tax DECIMAL(15, 2) DEFAULT 0,
          net_amount DECIMAL(15, 2) DEFAULT 0,
          payment_type VARCHAR(50) DEFAULT 'credit',
          is_intra_state INT DEFAULT 1,
          driver_name VARCHAR(100),
          mobile_number VARCHAR(20),
          gadi_number VARCHAR(50),
          notes TEXT,
          created_by INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
          financial_year VARCHAR(20) NOT NULL DEFAULT '2026-27',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Purchase Items table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS purchase_items (
          id SERIAL PRIMARY KEY,
          purchase_id INT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
          item_id INT NOT NULL REFERENCES item_master(id) ON DELETE RESTRICT,
          quantity DECIMAL(15, 2) NOT NULL,
          purchase_rate DECIMAL(15, 2) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          taxable_amount DECIMAL(15, 2) DEFAULT 0,
          gst_percent DECIMAL(5, 2) DEFAULT 0,
          cgst_percent DECIMAL(5, 2) DEFAULT 0,
          sgst_percent DECIMAL(5, 2) DEFAULT 0,
          igst_percent DECIMAL(5, 2) DEFAULT 0,
          cgst_amount DECIMAL(15, 2) DEFAULT 0,
          sgst_amount DECIMAL(15, 2) DEFAULT 0,
          igst_amount DECIMAL(15, 2) DEFAULT 0,
          gst_amount DECIMAL(15, 2) DEFAULT 0,
          total_tax DECIMAL(15, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Stock Ledger table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS purchase_stock_ledger (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          item_id INT NOT NULL REFERENCES item_master(id) ON DELETE RESTRICT,
          purchase_id INT REFERENCES purchases(id) ON DELETE SET NULL,
          purchase_item_id INT,
          quantity_in DECIMAL(15, 2) DEFAULT 0,
          quantity_out DECIMAL(15, 2) DEFAULT 0,
          current_stock DECIMAL(15, 2) DEFAULT 0,
          transaction_type VARCHAR(50),
          reference_no VARCHAR(100),
          created_by INT REFERENCES users(id) ON DELETE SET NULL,
          financial_year VARCHAR(20) NOT NULL DEFAULT '2026-27',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Account Ledger table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS account_ledger (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
          member_id INT REFERENCES member_master(id) ON DELETE SET NULL,
          transaction_date DATE NOT NULL,
          transaction_type VARCHAR(50) DEFAULT 'manual',
          reference_type VARCHAR(50),
          reference_id INT,
          reference_no VARCHAR(100),
          debit DECIMAL(15, 2) DEFAULT 0.00,
          credit DECIMAL(15, 2) DEFAULT 0.00,
          debit_amount DECIMAL(15, 2) DEFAULT 0.00,
          credit_amount DECIMAL(15, 2) DEFAULT 0.00,
          description TEXT,
          notes TEXT,
          financial_year VARCHAR(20) DEFAULT '2026-27',
          interest_amount DECIMAL(15, 2) DEFAULT 0.00,
          interest_percent DECIMAL(5, 2) DEFAULT 0.00,
          interest_a_per VARCHAR(20) DEFAULT 'per_month',
          interest_member_id INT REFERENCES member_master(id) ON DELETE SET NULL,
          interest_account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
          created_by INT REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Performance Indexes for Ledger (Crucial for Rojmel/AccountMaster loading)
      await connection.query("CREATE INDEX IF NOT EXISTS idx_ledger_company_date ON account_ledger(company_id, transaction_date)");
      await connection.query("CREATE INDEX IF NOT EXISTS idx_ledger_account ON account_ledger(account_id)");
      await connection.query("CREATE INDEX IF NOT EXISTS idx_ledger_member ON account_ledger(member_id)");
      await connection.query("CREATE INDEX IF NOT EXISTS idx_ledger_ref_no ON account_ledger(reference_no)");

      // Force-add missing columns for legacy compatibility
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN IF NOT EXISTS interest_member_id INT"); } catch (e) { }
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN IF NOT EXISTS interest_account_id INT"); } catch (e) { }
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN IF NOT EXISTS debit_amount DECIMAL(15,2) DEFAULT 0"); } catch (e) { }
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN IF NOT EXISTS credit_amount DECIMAL(15,2) DEFAULT 0"); } catch (e) { }
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN IF NOT EXISTS debit DECIMAL(15,2) DEFAULT 0"); } catch (e) { }
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN IF NOT EXISTS credit DECIMAL(15,2) DEFAULT 0"); } catch (e) { }

      // Add missing columns if not exist
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN IF NOT EXISTS interest_member_id INT"); } catch (e) { }
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN IF NOT EXISTS interest_account_id INT"); } catch (e) { }

      // Force-add missing columns for legacy compatibility
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN IF NOT EXISTS debit_amount DECIMAL(15,2) DEFAULT 0"); } catch (e) { }
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN IF NOT EXISTS credit_amount DECIMAL(15,2) DEFAULT 0"); } catch (e) { }
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN IF NOT EXISTS debit DECIMAL(15,2) DEFAULT 0"); } catch (e) { }
      try { await connection.query("ALTER TABLE account_ledger ADD COLUMN IF NOT EXISTS credit DECIMAL(15,2) DEFAULT 0"); } catch (e) { }

      // Auto-migrate accounts table
      try { await connection.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS p_code VARCHAR(50)"); } catch (e) { }
      try { await connection.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS account_name_gu VARCHAR(255)"); } catch (e) { }
      try { await connection.query("ALTER TABLE member_master ADD COLUMN IF NOT EXISTS p_code VARCHAR(50)"); } catch (e) { }
      try { await connection.query("ALTER TABLE member_master ADD COLUMN IF NOT EXISTS member_name_gu VARCHAR(255)"); } catch (e) { }
      try { await connection.query("ALTER TABLE village ADD COLUMN IF NOT EXISTS eng_name VARCHAR(255)"); } catch (e) { }

      // Create Village table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS village (
          id SERIAL PRIMARY KEY,
          village_code VARCHAR(50),
          village_name VARCHAR(255),
          eng_name VARCHAR(255),
          taluka_name VARCHAR(255),
          district_name VARCHAR(255),
          no_of_villages INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Dangar Entry table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS dangar_entry (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          financial_year VARCHAR(20) NOT NULL DEFAULT '2026-27',
          book_type VARCHAR(50) NOT NULL,
          sr_no VARCHAR(100),
          entry_date DATE NOT NULL,
          member_id INT REFERENCES member_master(id) ON DELETE SET NULL,
          item_id INT REFERENCES item_master(id) ON DELETE SET NULL,
          account_id INT DEFAULT NULL,
          remark TEXT,
          vehicle_no VARCHAR(100),
          quality_class VARCHAR(50) DEFAULT '1st',
          season VARCHAR(20),
          total_kg DECIMAL(15, 2) DEFAULT 0,
          bardan INT DEFAULT 0,
          gun DECIMAL(15, 2) DEFAULT 0,
          gross_quintal DECIMAL(15, 2) DEFAULT 0,
          less_bardan DECIMAL(15, 2) DEFAULT 0,
          net_quintal DECIMAL(15, 2) DEFAULT 0,
          rate DECIMAL(15, 2) DEFAULT 0,
          amount DECIMAL(15, 2) DEFAULT 0,
          total_deduction DECIMAL(15, 2) DEFAULT 0,
          weight_unit VARCHAR(20) DEFAULT 'kg',
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Dangar Weights table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS dangar_weights (
          id SERIAL PRIMARY KEY,
          entry_id INT NOT NULL REFERENCES dangar_entry(id) ON DELETE CASCADE,
          sr_no INT,
          weight DECIMAL(15, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Bardan Entry table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS bardan_entry (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
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
          account_id INT DEFAULT NULL,
          member_id INT DEFAULT NULL,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Jama Bardan Entry table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS jama_bardan_entry (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
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
          account_id INT DEFAULT NULL,
          member_id INT DEFAULT NULL,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Banks Master table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS banks (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          bank_name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (company_id, bank_name)
        )
      `);

      // Create Deduction Master table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS deduction_master (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL DEFAULT 'fixed',
          ledger_account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
          default_value DECIMAL(12, 2) DEFAULT 0,
          show_balance BOOLEAN DEFAULT TRUE,
          sort_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          auto_apply BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Transaction Deductions table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS transaction_deductions (
          id SERIAL PRIMARY KEY,
          entry_id INT NOT NULL REFERENCES dangar_entry(id) ON DELETE CASCADE,
          deduction_id INT NOT NULL REFERENCES deduction_master(id) ON DELETE RESTRICT,
          input_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
          calculated_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
          balance_at_time DECIMAL(15, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Seasons table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS seasons (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          season_type VARCHAR(100) NOT NULL,
          financial_year VARCHAR(20) NOT NULL,
          is_active INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Bardan Price Master table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS bardan_price_master (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          price_per_bardan DECIMAL(12, 2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Persistent Targets for Kapat Console
      await connection.query(`
        CREATE TABLE IF NOT EXISTS deduction_targets (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          target_type VARCHAR(50) NOT NULL,
          target_id INT NOT NULL,
          is_auto INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (company_id, target_type, target_id)
        )
      `);

      // Create Narrations table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS narrations (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          narration_code VARCHAR(50),
          narration_text TEXT NOT NULL,
          narration_type VARCHAR(50) DEFAULT 'JV',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Add columns if not exist (for existing tables)
      try { await connection.query("ALTER TABLE narrations ADD COLUMN IF NOT EXISTS narration_type VARCHAR(50) DEFAULT 'JV'"); } catch (e) { }
      try { await connection.query("ALTER TABLE narrations ADD COLUMN IF NOT EXISTS narration_code VARCHAR(50)"); } catch (e) { }
      try { await connection.query("ALTER TABLE narrations ADD COLUMN IF NOT EXISTS narration_text_gu TEXT"); } catch (e) { }
      try { await connection.query("ALTER TABLE narrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"); } catch (e) { }

      // Create Journal Vouchers table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS journal_vouchers (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          voucher_date DATE NOT NULL,
          voucher_type VARCHAR(50) DEFAULT 'JV',
          total_credit DECIMAL(15, 2) DEFAULT 0,
          total_debit DECIMAL(15, 2) DEFAULT 0,
          notes TEXT,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Journal Voucher Items table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS journal_voucher_items (
          id SERIAL PRIMARY KEY,
          voucher_id INT NOT NULL REFERENCES journal_vouchers(id) ON DELETE CASCADE,
          type VARCHAR(10) NOT NULL,
          account_id INT NOT NULL REFERENCES accounts(id),
          member_id INT REFERENCES member_master(id),
          amount DECIMAL(15, 2) NOT NULL,
          reference_no VARCHAR(100),
          particulars TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Legacy Cash Book table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS cash_book (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          transaction_date DATE NOT NULL,
          reference_type VARCHAR(50),
          reference_id INT,
          reference_no VARCHAR(100),
          description TEXT,
          cash_in DECIMAL(15, 2) DEFAULT 0,
          cash_out DECIMAL(15, 2) DEFAULT 0,
          notes TEXT,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Legacy Member Ledger table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS member_ledger (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          member_id INT NOT NULL REFERENCES member_master(id),
          account_id INT REFERENCES accounts(id),
          transaction_date DATE NOT NULL,
          transaction_type VARCHAR(50),
          reference_no VARCHAR(100),
          debit_amount DECIMAL(15, 2) DEFAULT 0,
          credit_amount DECIMAL(15, 2) DEFAULT 0,
          particulars TEXT,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Item Rate table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS item_rate (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          item_id INT NOT NULL REFERENCES item_master(id) ON DELETE CASCADE,
          purchase_rate DECIMAL(15, 2) DEFAULT 0,
          sale_rate DECIMAL(15, 2) DEFAULT 0,
          mrp DECIMAL(15, 2) DEFAULT 0,
          effective_from DATE,
          is_active INT DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Products table (Legacy Support)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          sku VARCHAR(100) UNIQUE,
          category VARCHAR(100),
          price DECIMAL(15, 2) DEFAULT 0,
          quantity DECIMAL(15, 2) DEFAULT 0,
          description TEXT,
          image_url VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Sale Returns table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS sale_returns (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          sale_id INT REFERENCES sales(id) ON DELETE SET NULL,
          return_no VARCHAR(100) NOT NULL UNIQUE,
          return_date DATE NOT NULL,
          customer_account_id INT REFERENCES accounts(id) ON DELETE SET NULL,
          total_return_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
          refund_amount DECIMAL(15, 2) DEFAULT 0,
          refund_type VARCHAR(50) DEFAULT 'cash',
          notes TEXT,
          created_by INT REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Sale Return Items table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS sale_return_items (
          id SERIAL PRIMARY KEY,
          sale_return_id INT NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
          item_id INT NOT NULL REFERENCES item_master(id),
          quantity DECIMAL(15, 2) NOT NULL,
          sale_rate DECIMAL(15, 2) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Purchase Returns table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS purchase_returns (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          purchase_id INT REFERENCES purchases(id) ON DELETE SET NULL,
          return_date DATE NOT NULL,
          return_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
          reason TEXT,
          created_by INT REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Purchase Return Items table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS purchase_return_items (
          id SERIAL PRIMARY KEY,
          purchase_return_id INT NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
          item_id INT NOT NULL REFERENCES item_master(id),
          quantity DECIMAL(15, 2) NOT NULL,
          purchase_rate DECIMAL(15, 2) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Purchase Stock Ledger table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS purchase_stock_ledger (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          item_id INT NOT NULL REFERENCES item_master(id) ON DELETE CASCADE,
          quantity_in DECIMAL(15, 3) DEFAULT 0,
          quantity_out DECIMAL(15, 3) DEFAULT 0,
          current_stock DECIMAL(15, 3) DEFAULT 0,
          transaction_type VARCHAR(50),
          reference_no VARCHAR(100),
          notes TEXT,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Bardan Entry table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS bardan_entry (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          financial_year VARCHAR(20),
          member_id INT REFERENCES member_master(id),
          date DATE,
          qty INT DEFAULT 0,
          type VARCHAR(50), -- credit, debit
          description TEXT,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Jama Bardan Entry table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS jama_bardan_entry (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          financial_year VARCHAR(20),
          member_id INT REFERENCES member_master(id),
          date DATE,
          qty INT DEFAULT 0,
          code VARCHAR(50),
          option_type VARCHAR(50), -- Self, etc.
          description TEXT,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Dangar Entry table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS dangar_entry (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          financial_year VARCHAR(20),
          book_type VARCHAR(20), -- KHARIF, RABI, etc.
          sr_no VARCHAR(50) UNIQUE,
          entry_date DATE,
          member_id INT REFERENCES member_master(id),
          account_id INT REFERENCES accounts(id),
          item_id INT REFERENCES item_master(id),
          vehicle_no VARCHAR(50),
          quality_class VARCHAR(50),
          total_kg DECIMAL(15, 3) DEFAULT 0,
          bardan INT DEFAULT 0,
          gun INT DEFAULT 0,
          gross_quintal DECIMAL(15, 3) DEFAULT 0,
          less_bardan DECIMAL(15, 3) DEFAULT 0,
          net_quintal DECIMAL(15, 3) DEFAULT 0,
          rate DECIMAL(15, 2) DEFAULT 0,
          amount DECIMAL(15, 2) DEFAULT 0,
          total_deduction DECIMAL(15, 2) DEFAULT 0,
          weight_unit VARCHAR(20) DEFAULT 'kg',
          remark TEXT,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Dangar Weights table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS dangar_weights (
          id SERIAL PRIMARY KEY,
          entry_id INT NOT NULL REFERENCES dangar_entry(id) ON DELETE CASCADE,
          sr_no INT,
          weight DECIMAL(15, 3) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Transaction Deductions table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS transaction_deductions (
          id SERIAL PRIMARY KEY,
          entry_id INT NOT NULL REFERENCES dangar_entry(id) ON DELETE CASCADE,
          deduction_id INT, -- Refers to accounts or custom deduction
          input_value DECIMAL(15, 2) DEFAULT 0,
          calculated_amount DECIMAL(15, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create Bardan Price Master table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS bardan_price_master (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
          price_per_bardan DECIMAL(15, 2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (company_id)
        )
      `);

      // Seed Default Banks
      try {
        const [companies] = await connection.query("SELECT id FROM company");
        for (const comp of companies) {
          await connection.query("INSERT INTO banks (company_id, bank_name) VALUES (?, ?) ON CONFLICT DO NOTHING", [comp.id, "BOB"]);
          await connection.query("INSERT INTO banks (company_id, bank_name) VALUES (?, ?) ON CONFLICT DO NOTHING", [comp.id, "SDCB"]);
        }
      } catch (e) {
        console.warn("Bank seeding warning:", e.message);
      }

      await connection.commit();
      console.log('✅ PostgreSQL Database tables created/verified/upgraded');

      // Seed Initial Data
      await seedInitialData(connection);
      await connection.commit();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  }
}

/**
 * Automatically seed essential data: Admin user and 11 System Accounts
 */
async function seedInitialData(connection) {
  try {
    console.log('🌱 Seeding initial system data...');

    // 1. Ensure a Default Company exists
    let companyId;
    const [companies] = await connection.query("SELECT id FROM company LIMIT 1");
    if (companies.length === 0) {
      console.log('🏢 Creating Default Company...');
      const [res] = await connection.execute(
        `INSERT INTO company (company_name, address, phone, email, financial_year_start, financial_year_end) 
         VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
        ['Danger Systeam', 'Gujarat, India', '9999999999', 'admin@danger.com', '2026-04-01', '2027-03-31']
      );
      companyId = res.insertId;
    } else {
      companyId = companies[0].id;
    }

    // 2. Ensure Financial Year exists
    const [years] = await connection.query("SELECT id FROM financial_years WHERE company_id = ? AND year_label = ?", [companyId, '2026-27']);
    if (years.length === 0) {
      await connection.execute(
        "INSERT INTO financial_years (company_id, year_label, start_date, end_date, is_active) VALUES (?, ?, ?, ?, 1)",
        [companyId, '2026-27', '2026-04-01', '2027-03-31']
      );
    }

    // 3. Ensure Admin User exists
    const [usersCountRows] = await connection.query("SELECT COUNT(*) as count FROM users");
    const userCount = parseInt(usersCountRows[0].count || 0);
    
    if (userCount === 0) {
      console.log('👤 Seeding Admin User (admin@danger.com / 6099)...');
      const hashedPassword = await bcrypt.hash('6099', 10);
      const adminModuleAccess = JSON.stringify([
        'company', 'users', 'accounts', 'items', 'members', 
        'dangar', 'bardan', 'reports', 'settings', 'deductions', 'banks'
      ]);
      
      await connection.execute(
        "INSERT INTO users (company_id, username, full_name_gu, email, password, role, is_active, module_access) VALUES (?, ?, ?, ?, ?, ?, 1, ?) ON CONFLICT DO NOTHING",
        [companyId, 'Admin', 'એડમિન', 'admin@danger.com', hashedPassword, 'admin', adminModuleAccess]
      );
    } else {
      console.log(`✅ ${userCount} users already exist. Skipping admin seeding.`);
    }

    // 4. Ensure 11 System Accounts exist
    const systemAccounts = [
      { id: 1, name: 'Dangar System', code: 'DS0001', type: 'System Account', sub: true },
      { id: 4, name: 'Bardan System', code: 'BS0001', type: 'System Account', sub: true },
      { id: 7, name: 'Member Adv Ac', code: 'L0001', type: 'System Account', sub: true },
      { id: 8, name: 'Interest Khate', code: 'IK0001', type: 'System Account', sub: true },
      { id: 9, name: 'Dangar Purchase', code: 'P0001', type: 'purchase', sub: false },
      { id: 10, name: 'Cash Account', code: 'CS0001', type: 'System Account', sub: false },
      { id: 11, name: 'Dangar Godown Fund', code: 'DF0001', type: 'System Account', sub: true },
      { name: 'Rounding Khate', code: 'RK0001', type: 'System Account', sub: true },
      { name: 'Brokerage Khate', code: 'BK0001', type: 'System Account', sub: true },
      { name: 'Labour Khate', code: 'LK0001', type: 'System Account', sub: true },
      { name: 'Dangar Sale', code: 'S0001', type: 'sales', sub: false }
    ];

    for (const acc of systemAccounts) {
      const [existing] = await connection.query("SELECT id FROM accounts WHERE account_code = ?", [acc.code]);
      if (existing.length === 0) {
        console.log(`📑 Seeding Account: ${acc.name}...`);
        // We try to use the specific ID if provided to match logic in db.js
        if (acc.id) {
          await connection.execute(
            `INSERT INTO accounts (id, company_id, account_name, account_type, account_code, is_subledger, is_system, financial_year) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
            [acc.id, companyId, acc.name, acc.type, acc.code, acc.sub, true, '2026-27']
          );
        } else {
          await connection.execute(
            `INSERT INTO accounts (company_id, account_name, account_type, account_code, is_subledger, is_system, financial_year) 
             VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
            [companyId, acc.name, acc.type, acc.code, acc.sub, true, '2026-27']
          );
        }
      }
    }

    console.log('✨ Data Seeding Complete.');

    // 5. Sync Sequences (PostgreSQL specific)
    // After manual ID insertion, we must sync the serial sequence to avoid duplicate key errors on future inserts
    try {
      await connection.query("SELECT setval(pg_get_serial_sequence('accounts', 'id'), COALESCE((SELECT MAX(id) FROM accounts), 1))");
      await connection.query("SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1))");
      await connection.query("SELECT setval(pg_get_serial_sequence('company', 'id'), COALESCE((SELECT MAX(id) FROM company), 1))");
      console.log('🔄 PostgreSQL Sequences synchronized.');
    } catch (seqErr) {
      console.warn('⚠️ Sequence synchronization warning:', seqErr.message);
    }

    // Success: return to caller (no commit/rollback here anymore as it's handled by caller if needed, 
    // but seedInitialData was historically using its own transaction logic which I will now simplify)
  } catch (e) {
    console.error('⚠️ Seeding error:', e.message);
    throw e; // Rethrow so caller can rollback
  }
}

// Helper to normalize parameters (Convert true/false to 1/0)
const normalizeParams = (params) => {
  if (!Array.isArray(params)) return params;
  return params.map(p => {
    if (p === true) return 1;
    if (p === false) return 0;
    if (p === undefined) return null;
    return p;
  });
};

// Seamless API export
export async function query(sql, params = []) {
  try {
    const transformedSql = transformQuery(sql);
    const normalized = normalizeParams(params);
    console.log('DEBUG SQL:', transformedSql);
    console.log('DEBUG PARAMS:', normalized);
    const result = await pool.query(transformedSql, normalized);
    return result.rows;
  } catch (error) {
    console.error('Query error:', error.message, '\nSQL:', sql);
    console.error('Transformed SQL:', transformQuery(sql));
    throw error;
  }
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}

export async function execute(sql, params = []) {
  try {
    const transformedSql = transformQuery(sql);
    const normalized = normalizeParams(params);
    const result = await pool.query(transformedSql, normalized);
    const id = result.rows[0]?.id || null;
    return {
      lastID: id,
      insertId: id, // Alias for legacy MySQL compatibility
      changes: result.rowCount
    };
  } catch (error) {
    console.error('Execute error:', error.message, '\nSQL:', sql);
    throw error;
  }
}

// ============================================
// UNIFIED MASTER LEDGER FUNCTIONS
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

export async function insertCashBookEntry(
  companyId, transactionDate, referenceType, referenceId, referenceNo,
  description, cashIn, cashOut, userId, notes = '', financialYear = '2026-27'
) {
  const result = await insertLedgerEntry(
    companyId,
    null,
    transactionDate, 'cash_book', referenceType,
    referenceId, referenceNo,
    parseFloat(cashIn) || 0,
    parseFloat(cashOut) || 0,
    description, notes, null, financialYear
  );

  return { insertId: result[0]?.id || null };
}

export async function getCashBalance(companyId, upToDate = null) {
  const dateCondition = upToDate ? `AND transaction_date <= ?` : '';
  const params = [companyId];
  if (upToDate) params.push(upToDate);

  const sql = `
    SELECT 
      SUM(COALESCE(credit, 0)) as total_cash_in,
      SUM(COALESCE(debit, 0)) as total_cash_out,
      SUM(COALESCE(credit, 0) - COALESCE(debit, 0)) as current_balance
    FROM account_ledger
    WHERE company_id = ? 
      AND (transaction_type = 'cash_book' OR (reference_type = 'cash_book' AND transaction_type != 'cash_account_entry'))
      ${dateCondition}
  `;

  const rows = await query(sql, params);
  return rows?.[0] || { total_cash_in: 0, total_cash_out: 0, current_balance: 0 };
}

export async function getCashBookEntries(companyId, startDate, endDate) {
  const sql = `
    SELECT 
      al.id, al.transaction_date, al.reference_type, al.reference_no, al.description, al.member_id,
      m.member_name, m.member_code,
      COALESCE(al.credit, 0) as cash_in,
      COALESCE(al.debit, 0) as cash_out,
      (COALESCE(al.credit, 0) - COALESCE(al.debit, 0)) as net_amount,
      u.username as created_by_user, al.created_at
    FROM account_ledger al
    LEFT JOIN users u ON al.created_by = u.id
    LEFT JOIN member_master m ON al.member_id = m.id
    WHERE al.company_id = ? 
      AND (al.transaction_type = 'cash_book' OR (al.reference_type = 'cash_book' AND al.transaction_type != 'cash_account_entry'))
      AND al.transaction_date BETWEEN ? AND ?
    ORDER BY al.transaction_date DESC, al.created_at DESC
  `;
  return await query(sql, [companyId, startDate, endDate]);
}

export async function getDailyCashSummary(companyId, startDate, endDate) {
  const sql = `
    SELECT 
      transaction_date,
      SUM(COALESCE(credit, 0)) as daily_in,
      SUM(COALESCE(debit, 0)) as daily_out,
      SUM(COALESCE(credit, 0) - COALESCE(debit, 0)) as daily_net,
      COUNT(*) as transaction_count
    FROM account_ledger
    WHERE company_id = ? 
      AND (transaction_type = 'cash_book' OR (reference_type = 'cash_book' AND transaction_type != 'cash_account_entry'))
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

export async function getAccountBalance(accountId, upToDate = null, memberId = null) {
  let whereClause = "(al.account_id = ? OR al.interest_account_id = ?)";
  let params = [accountId, accountId];
  let openingBalance = 0;
  let isMemberRequest = String(accountId).startsWith('M');
  const targetAccountId = isMemberRequest ? -1 : parseInt(accountId);

  if (parseInt(accountId) === 10) {
    whereClause = "(al.transaction_type = 'cash_book' OR al.reference_type = 'cash_book' OR al.account_id = 10)";
    params = [];
    const account = await queryOne('SELECT opening_balance FROM accounts WHERE id = 10');
    openingBalance = parseFloat(account?.opening_balance || 0);
  } else if (parseInt(accountId) === 1) {
    whereClause = "(al.reference_type IN ('dangar_entry', 'dangar_entry_fund') OR al.account_id IN (1, 11))";
    params = [];
    const account = await queryOne('SELECT opening_balance FROM accounts WHERE id = 1');
    openingBalance = parseFloat(account?.opening_balance || 0);
  } else if (parseInt(accountId) === 4) {
    whereClause = "(al.reference_type IN ('bardan_entry', 'jama_bardan_entry') OR al.account_id = 4)";
    params = [];
    const account = await queryOne('SELECT opening_balance FROM accounts WHERE id = 4');
    openingBalance = parseFloat(account?.opening_balance || 0);
  } else if (parseInt(accountId) === 8) {
    whereClause = "(al.interest_account_id = 8 OR al.account_id = 8)";
    params = [];
    const account = await queryOne('SELECT opening_balance FROM accounts WHERE id = 8');
    openingBalance = parseFloat(account?.opening_balance || 0);
  } else if (isMemberRequest) {
    const actualMemberId = accountId.substring(1);
    const member = await queryOne('SELECT bardan_opening as opening_balance FROM member_master WHERE id = ?', [actualMemberId]);
    openingBalance = parseFloat(member?.opening_balance || 0);
    whereClause = "(al.member_id = ? OR al.interest_member_id = ?)";
    params = [actualMemberId, actualMemberId];
  } else {
    const account = await queryOne('SELECT opening_balance FROM accounts WHERE id = ?', [accountId]);
    openingBalance = parseFloat(account?.opening_balance || 0);
    whereClause = "(al.account_id = ? OR al.interest_account_id = ?)";
    params = [accountId, accountId];
    if (memberId) {
      whereClause += " AND (al.member_id = ? OR al.interest_member_id = ?)";
      params.push(memberId, memberId);
      openingBalance = 0;
    }
  }

  const dateCondition = upToDate ? `AND al.transaction_date <= ?` : '';
  if (upToDate) params.push(upToDate);

  const sql = `
    SELECT 
      COALESCE(SUM(CASE 
        WHEN a.account_code = 'CS0001' THEN COALESCE(al.credit, 0)
        WHEN al.interest_account_id = ${targetAccountId} THEN 
          CASE WHEN COALESCE(al.debit, 0) > 0 THEN COALESCE(al.interest_amount, 0) ELSE 0 END
        ELSE COALESCE(al.debit, 0) 
      END), 0) as total_debit,
      COALESCE(SUM(CASE 
        WHEN a.account_code = 'CS0001' THEN COALESCE(al.debit, 0)
        WHEN al.interest_account_id = ${targetAccountId} THEN 
          CASE WHEN COALESCE(al.credit, 0) > 0 THEN COALESCE(al.interest_amount, 0) ELSE 0 END
        ELSE COALESCE(al.credit, 0) 
      END), 0) as total_credit,
      COALESCE(SUM(
         CASE 
           WHEN a.account_code = 'CS0001' THEN COALESCE(al.credit, 0) - COALESCE(al.debit, 0)
           WHEN al.interest_account_id = ${targetAccountId} THEN 
             CASE 
               WHEN COALESCE(al.debit, 0) > 0 THEN COALESCE(al.interest_amount, 0)
               WHEN COALESCE(al.credit, 0) > 0 THEN -COALESCE(al.interest_amount, 0)
               ELSE 0
             END
           ELSE COALESCE(al.debit, 0) - COALESCE(al.credit, 0)
         END
      ), 0) as ledger_balance
    FROM account_ledger al
    LEFT JOIN accounts a ON al.account_id = a.id
    WHERE ${whereClause} ${dateCondition}
  `;

  const ledgerData = await queryOne(sql, params) || { total_debit: 0, total_credit: 0, ledger_balance: 0 };
  return {
    opening_balance: openingBalance,
    total_debit: ledgerData.total_debit,
    total_credit: ledgerData.total_credit,
    running_balance: openingBalance + parseFloat(ledgerData.ledger_balance)
  };
}

export async function getAccountLedger(accountId, startDate, endDate, memberId = null) {
  let whereClause = "(al.account_id = ? OR al.interest_account_id = ?)";
  let params = [accountId, accountId];
  let isMemberRequest = String(accountId).startsWith('M');

  if (parseInt(accountId) === 10) {
    whereClause = "(al.transaction_type = 'cash_book' OR al.reference_type = 'cash_book' OR al.account_id = 10)";
    params = [];
  } else if (parseInt(accountId) === 1) {
    whereClause = "(al.reference_type IN ('dangar_entry', 'dangar_entry_fund') OR al.account_id IN (1, 11))";
    params = [];
  } else if (parseInt(accountId) === 4) {
    whereClause = "(al.reference_type IN ('bardan_entry', 'jama_bardan_entry') OR al.account_id = 4)";
    params = [];
  } else if (parseInt(accountId) === 8) {
    whereClause = "(al.interest_account_id = 8 OR al.account_id = 8)";
    params = [];
  } else if (isMemberRequest) {
    const actualMemberId = accountId.substring(1);
    whereClause = "(al.member_id = ? OR al.interest_member_id = ?)";
    params = [actualMemberId, actualMemberId];
  }

  if (memberId && memberId !== 'all') {
    whereClause += " AND (al.member_id = ? OR al.interest_member_id = ?)";
    params.push(memberId, memberId);
  }

  const targetAccountId = isMemberRequest ? -1 : parseInt(accountId);
  const sql = `
    SELECT 
      al.id, al.transaction_date, 
      COALESCE(al.transaction_type, al.reference_type, 'manual') as transaction_type,
      al.reference_no,
      CASE 
        WHEN a.account_code = 'CS0001' THEN COALESCE(al.credit, 0)
        WHEN a.account_type = 'sales' AND al.reference_no LIKE 'CR%' THEN COALESCE(al.credit, 0)
        WHEN al.interest_account_id = ${targetAccountId} THEN 
          CASE WHEN COALESCE(al.debit, 0) > 0 THEN COALESCE(al.interest_amount, 0) ELSE 0 END
        ELSE COALESCE(al.debit, 0) 
      END as debit,
      CASE 
        WHEN a.account_code = 'CS0001' THEN COALESCE(al.debit, 0)
        WHEN a.account_type = 'sales' AND al.reference_no LIKE 'CR%' THEN 0
        WHEN al.interest_account_id = ${targetAccountId} THEN 
          CASE WHEN COALESCE(al.credit, 0) > 0 THEN COALESCE(al.interest_amount, 0) ELSE 0 END
        ELSE COALESCE(al.credit, 0) 
      END as credit,
      CASE 
        WHEN a.account_code = 'CS0001' THEN COALESCE(al.debit, 0)
        WHEN a.account_code = 'BS0001' THEN COALESCE(al.debit, 0)
        ELSE 0
      END as penalty_debit,
      CASE 
        WHEN a.account_code = 'CS0001' THEN COALESCE(al.credit, 0)
        WHEN a.account_code = 'BS0001' THEN 
          CASE 
            WHEN al.reference_type = 'jama_bardan_entry' THEN 
              CASE WHEN LOWER(COALESCE(al.description, '')) LIKE '[self]%' THEN 0 ELSE COALESCE(al.credit, 0) END
            WHEN al.reference_type = 'BardanPenalty' THEN 
              COALESCE(CAST(SUBSTRING(al.description FROM '\\(([0-9]+)[[:space:]]*Bags\\)') AS INTEGER), 0)
            ELSE 0
          END
        ELSE 0
      END as penalty_credit,
      CASE 
        WHEN al.interest_account_id = ${targetAccountId} THEN 0 
        WHEN LOWER(COALESCE(al.description, '')) LIKE '[self]%' THEN COALESCE(al.credit, 0)
        ELSE 0 
      END as self_credit,
      CASE 
        WHEN al.interest_account_id = ${targetAccountId} THEN 0 
        WHEN LOWER(COALESCE(al.description, '')) LIKE '[self]%' THEN 0
        ELSE COALESCE(al.credit, 0) 
      END as company_credit,
      CASE 
        WHEN ${targetAccountId} = 8 THEN 'Interest Amount'
        WHEN al.transaction_type = 'cash_book' AND al.reference_type = 'cash_book' THEN
          CASE 
            WHEN al.credit > 0 THEN 'Cash IN - ' || (SELECT account_name FROM accounts WHERE id = (CASE WHEN ${targetAccountId} = -1 THEN al.account_id ELSE ${targetAccountId} END) LIMIT 1)
            WHEN al.debit > 0 THEN 'Cash OUT - ' || (SELECT account_name FROM accounts WHERE id = (CASE WHEN ${targetAccountId} = -1 THEN al.account_id ELSE ${targetAccountId} END) LIMIT 1)
            ELSE COALESCE(al.description, al.notes, '')
          END
        ELSE 
          CASE 
            WHEN (al.reference_type = 'SALE' OR al.reference_type = 'dangar_sale') THEN 'Dangar Sale'
            WHEN al.reference_type = 'bardan_entry' THEN 'BARDAN taken'
            WHEN al.reference_type = 'jama_bardan_entry' AND LOWER(al.description) LIKE '%settlement%' THEN 'Dangar Settlement'
            WHEN al.reference_type = 'jama_bardan_entry' THEN 'Bardan Settlement'
            WHEN al.reference_type = 'SALE_DEDUCTION' AND (LOWER(al.description) LIKE 'brokerage on%' OR LOWER(al.description) LIKE 'brokrej on%') THEN 'Brokerage on Bardan'
            WHEN al.reference_type = 'dangar_entry_fund' OR LOWER(al.description) LIKE 'godown fund%' THEN 'Dangar Godown Fund'
            WHEN al.interest_account_id = ${targetAccountId} THEN 'Interest Amount'
            WHEN al.reference_type = 'SALE_DEDUCTION' AND LOWER(al.description) LIKE 'labour on%' THEN 'Labour Charge'
            ELSE COALESCE(al.description, al.notes, '')
          END
      END as description,
      CASE 
        WHEN ${targetAccountId} = 8 THEN NULL 
        WHEN al.interest_account_id = ${targetAccountId} THEN al.interest_member_id 
        ELSE al.member_id 
      END as member_id,
      CASE WHEN ${targetAccountId} = 8 THEN NULL ELSE COALESCE(m.member_name_gu, m.member_name) END as member_name,
      CASE WHEN ${targetAccountId} = 8 THEN NULL ELSE m.member_code END as member_code,
      al.interest_percent,
      al.interest_amount,
      al.interest_a_per
    FROM account_ledger al
    LEFT JOIN member_master m ON m.id = (CASE WHEN al.interest_account_id = ${targetAccountId} THEN al.interest_member_id ELSE al.member_id END)
    LEFT JOIN accounts a ON al.account_id = a.id
    WHERE ${whereClause} AND al.transaction_date BETWEEN ? AND ?
    ORDER BY al.transaction_date ASC, al.created_at ASC, al.id ASC
  `;
  params.push(startDate, endDate);
  return await query(sql, params);
}

export async function getAccountLedgerWithRunningBalance(accountId, startDate, endDate, memberId = null) {
  const prevDate = new Date(startDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const balanceData = await getAccountBalance(accountId, prevDate.toISOString().split('T')[0], memberId);

  // Get account code to check for flipping logic
  const account = await queryOne('SELECT account_code FROM accounts WHERE id = ?', [parseInt(accountId)]);
  const isCashAccount = account?.account_code === 'CS0001';

  let runningBalance = parseFloat(balanceData.running_balance || 0);
  const entries = await getAccountLedger(accountId, startDate, endDate, memberId);
  let penaltyBalance = runningBalance;
  return entries.map(entry => {
    if (isCashAccount) {
      // For Cash Account: Credit (IN) increases, Debit (OUT) decreases
      runningBalance += (parseFloat(entry.credit) || 0) - (parseFloat(entry.debit) || 0);
      penaltyBalance += (parseFloat(entry.credit) || 0) - (parseFloat(entry.penalty_debit) || 0);
    } else {
      // Standard Account: Debit increases, Credit decreases
      runningBalance += (parseFloat(entry.debit) || 0) - (parseFloat(entry.credit) || 0);
      penaltyBalance += (parseFloat(entry.debit) || 0) - (parseFloat(entry.penalty_credit) || 0);
    }
    return { ...entry, running_balance: runningBalance, penalty_balance: penaltyBalance };
  });
}

export async function getTrialBalance(companyId, asOfDate = null) {
  const dateCondition = asOfDate ? `AND al.transaction_date <= ?` : '';
  const params = [companyId, companyId];
  if (asOfDate) params.push(asOfDate, asOfDate);
  const sql = `
    SELECT id, account_name, account_type, SUM(total_debit) as total_debit, SUM(total_credit) as total_credit, SUM(total_debit - total_credit) as balance
    FROM (
      SELECT a.id::TEXT, COALESCE(a.account_name_gu, a.account_name) as account_name, a.account_type, COALESCE(SUM(COALESCE(al.debit, 0)), 0) as total_debit, COALESCE(SUM(COALESCE(al.credit, 0)), 0) as total_credit
      FROM accounts a
      LEFT JOIN account_ledger al ON a.id = al.account_id ${dateCondition}
      WHERE a.company_id = ? AND a.is_deleted = 0
      GROUP BY a.id, a.account_name, a.account_name_gu, a.account_type
      UNION ALL
      SELECT CONCAT('M', m.id) as id, COALESCE(m.member_name_gu, m.member_name) as account_name, 'member' as account_type, COALESCE(SUM(COALESCE(al.debit, 0)), 0) as total_debit, COALESCE(SUM(COALESCE(al.credit, 0)), 0) as total_credit
      FROM member_master m
      LEFT JOIN account_ledger al ON m.id = al.member_id ${dateCondition}
      WHERE m.company_id = ? AND m.account_id IS NULL
      GROUP BY m.id, m.member_name, m.member_name_gu
    ) unified
    GROUP BY id, account_name, account_type ORDER BY account_name ASC
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
    SELECT al.id, COALESCE(a.account_name_gu, a.account_name, m.member_name_gu, m.member_name) as account_name, al.transaction_date, COALESCE(al.reference_type, al.transaction_type) as reference_type, al.reference_no, COALESCE(al.description, '') as description, COALESCE(al.debit, 0) as debit, COALESCE(al.credit, 0) as credit, (COALESCE(al.debit, 0) - COALESCE(al.credit, 0)) as net_amount
    FROM account_ledger al
    LEFT JOIN accounts a ON al.account_id = a.id
    LEFT JOIN member_master m ON al.member_id = m.id
    WHERE al.company_id = ? AND al.transaction_date BETWEEN ? AND ?
    ORDER BY al.transaction_date ASC, al.created_at ASC
  `;
  return await query(sql, [companyId, startDate, endDate]);
}

// ============ PURCHASE OPERATIONS ============
export async function createPurchase(companyId, supplierId, invoiceNo, invoiceDate, items, notes, userId, gstAmount = 0, gstPercent = 0) {
  const connection = await createConnection();
  try {
    await connection.beginTransaction();
    const [purchaseResult] = await connection.query(
      `INSERT INTO purchases (company_id, supplier_account_id, invoice_no, invoice_date, total_amount, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [companyId, supplierId, invoiceNo, invoiceDate, 0, notes, userId]
    );
    const purchaseId = purchaseResult[0].id;
    let totalAmount = 0;
    for (const item of items) {
      const itemAmount = item.quantity * item.purchase_rate;
      totalAmount += itemAmount;
      const [itemResult] = await connection.query(
        `INSERT INTO purchase_items (purchase_id, item_id, quantity, purchase_rate, amount) VALUES (?, ?, ?, ?, ?) RETURNING id`,
        [purchaseId, item.item_id, item.quantity, item.purchase_rate, itemAmount]
      );
      const currentStockResult = await connection.query(
        `SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as current_stock FROM purchase_stock_ledger WHERE company_id = ? AND item_id = ?`,
        [companyId, item.item_id]
      );
      const currentStock = parseFloat(currentStockResult[0][0]?.current_stock || 0);
      const newStock = currentStock + item.quantity;
      await connection.query(
        `INSERT INTO purchase_stock_ledger (company_id, item_id, purchase_id, purchase_item_id, quantity_in, current_stock, transaction_type, reference_no, created_by) VALUES (?, ?, ?, ?, ?, ?, 'PURCHASE_IN', ?, ?)`,
        [companyId, item.item_id, purchaseId, itemResult[0].id, item.quantity, newStock, invoiceNo, userId]
      );
    }
    const grandTotal = totalAmount + gstAmount;
    await connection.query(`UPDATE purchases SET total_amount = ? WHERE id = ?`, [grandTotal, purchaseId]);

    // --- NEW: Post to Account Ledger ---
    // 1. Debit the Purchase Account
    const [purchaseAcct] = await connection.query(`SELECT id FROM accounts WHERE company_id = ? AND account_type = 'purchase' LIMIT 1`, [companyId]);
    if (purchaseAcct && purchaseAcct.length > 0) {
      await connection.query(
        `INSERT INTO account_ledger (company_id, account_id, transaction_date, transaction_type, reference_type, reference_id, reference_no, debit, credit, description, financial_year) 
         VALUES (?, ?, ?, 'PURCHASE', 'PURCHASE', ?, ?, ?, 0, ?, ?)`,
        [companyId, purchaseAcct[0].id, invoiceDate, purchaseId, invoiceNo, grandTotal, `PURCHASE INV #${invoiceNo}`, '2026-27']
      );
    }

    // 2. Credit the Supplier Account
    if (supplierId) {
      await connection.query(
        `INSERT INTO account_ledger (company_id, account_id, transaction_date, transaction_type, reference_type, reference_id, reference_no, debit, credit, description, financial_year) 
         VALUES (?, ?, ?, 'PURCHASE', 'PURCHASE', ?, ?, 0, ?, ?, ?)`,
        [companyId, supplierId, invoiceDate, purchaseId, invoiceNo, grandTotal, `PURCHASE INV #${invoiceNo}`, '2026-27']
      );
    }

    await connection.commit();
    return { id: purchaseId, total_amount: totalAmount, grand_total: grandTotal };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getPurchasesByCompany(companyId, startDate, endDate) {
  const sql = `
    SELECT p.id, p.invoice_no, p.invoice_date, p.total_amount, p.notes, a.account_name as supplier_name, u.username as created_by_name, COUNT(DISTINCT pi.id) as item_count, p.created_at
    FROM purchases p
    LEFT JOIN accounts a ON p.supplier_account_id = a.id
    LEFT JOIN users u ON p.created_by = u.id
    LEFT JOIN purchase_items pi ON p.id = pi.purchase_id
    WHERE p.company_id = ? AND p.invoice_date BETWEEN ? AND ?
    GROUP BY p.id, a.account_name, u.username
    ORDER BY p.invoice_date DESC, p.created_at DESC
  `;
  return await query(sql, [companyId, startDate, endDate]);
}

export async function getPurchaseDetails(purchaseId) {
  const purchase = await queryOne(`SELECT p.*, a.account_name as supplier_name, c.company_name, u.username as created_by_name FROM purchases p LEFT JOIN accounts a ON p.supplier_account_id = a.id LEFT JOIN company c ON p.company_id = c.id LEFT JOIN users u ON p.created_by = u.id WHERE p.id = ?`, [purchaseId]);
  if (!purchase) return null;
  const items = await query(`SELECT pi.*, it.item_name, it.item_code FROM purchase_items pi LEFT JOIN item_master it ON pi.item_id = it.id WHERE pi.purchase_id = ?`, [purchaseId]);
  return { ...purchase, items };
}

export async function getItemCurrentStock(companyId, itemId) {
  const result = await queryOne(`SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as current_stock FROM purchase_stock_ledger WHERE company_id = ? AND item_id = ?`, [companyId, itemId]);
  return result?.current_stock || 0;
}

export async function getStockReport(companyId) {
  const sql = `
    SELECT im.id, im.item_code, im.item_name, im.category, im.unit, im.reorder_level,
    COALESCE(SUM(CASE WHEN pl.transaction_type = 'PURCHASE_IN' THEN pl.quantity_in ELSE 0 END), 0) as total_purchased,
    COALESCE(SUM(CASE WHEN pl.transaction_type = 'PURCHASE_RETURN' THEN pl.quantity_out ELSE 0 END), 0) as total_purchase_returned,
    COALESCE(SUM(CASE WHEN pl.transaction_type = 'SALE_OUT' THEN pl.quantity_out ELSE 0 END), 0) as total_sold,
    COALESCE(SUM(CASE WHEN pl.transaction_type = 'SALE_RETURN' THEN pl.quantity_in ELSE 0 END), 0) as total_sale_returned,
    COALESCE(SUM(CASE WHEN pl.transaction_type IN ('PURCHASE_IN', 'SALE_RETURN') THEN pl.quantity_in ELSE -pl.quantity_out END), 0) as current_stock
    FROM item_master im
    LEFT JOIN purchase_stock_ledger pl ON im.id = pl.item_id AND pl.company_id = ?
    WHERE im.company_id = ? AND im.is_active = 1
    GROUP BY im.id ORDER BY current_stock ASC
  `;
  return await query(sql, [companyId, companyId]);
}

export async function getSupplierBalance(companyId, supplierId) {
  const sql = `
    SELECT 
      COALESCE(SUM(CASE WHEN debit > 0 THEN debit ELSE 0 END), 0) as total_due,
      COALESCE(SUM(CASE WHEN credit > 0 THEN credit ELSE 0 END), 0) as total_paid,
      COALESCE(SUM(debit - credit), 0) as current_balance
    FROM account_ledger
    WHERE company_id = ? AND account_id = ?
  `;
  return await queryOne(sql, [companyId, supplierId]);
}

export async function getStockHistory(companyId, itemId, limit = 50) {
  const sql = `SELECT id, purchase_id, quantity_in, quantity_out, current_stock, transaction_type, reference_no, created_at FROM purchase_stock_ledger WHERE company_id = ? AND item_id = ? ORDER BY created_at DESC LIMIT ?`;
  return await query(sql, [companyId, itemId, limit]);
}

export async function createPurchaseReturn(companyId, purchaseId, supplierId, returnDate, items, notes, userId) {
  const connection = await createConnection();
  try {
    await connection.beginTransaction();
    const [returnResult] = await connection.query(`INSERT INTO purchase_returns (company_id, purchase_id, return_date, return_amount, reason, created_by) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`, [companyId, purchaseId, returnDate, 0, notes, userId]);
    const returnId = returnResult[0].id;
    let totalReturnAmount = 0;
    for (const item of items) {
      const itemAmount = item.quantity * item.purchase_rate;
      totalReturnAmount += itemAmount;
      await connection.query(`INSERT INTO purchase_return_items (purchase_return_id, item_id, quantity, purchase_rate, amount) VALUES (?, ?, ?, ?, ?)`, [returnId, item.item_id, item.quantity, item.purchase_rate, itemAmount]);
      const currentStock = await getItemCurrentStock(companyId, item.item_id);
      const newStock = currentStock - item.quantity;
      await connection.query(`INSERT INTO purchase_stock_ledger (company_id, item_id, quantity_out, current_stock, transaction_type, reference_no, created_by) VALUES (?, ?, ?, ?, 'PURCHASE_RETURN', ?, ?)`, [companyId, item.item_id, item.quantity, newStock, `RETURN-${returnId}`, userId]);
    }
    await connection.query(`UPDATE purchase_returns SET return_amount = ? WHERE id = ?`, [totalReturnAmount, returnId]);
    await connection.commit();
    return { id: returnId, return_amount: totalReturnAmount };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getPurchaseReturnsByCompany(companyId, startDate, endDate) {
  const sql = `SELECT pr.id, pr.purchase_id, pr.return_date, pr.return_amount, pr.reason, p.supplier_account_id, a.account_name as supplier_name, u.username as created_by_name, pr.created_at FROM purchase_returns pr LEFT JOIN purchases p ON pr.purchase_id = p.id LEFT JOIN accounts a ON p.supplier_account_id = a.id LEFT JOIN users u ON pr.created_by = u.id WHERE pr.company_id = ? AND pr.return_date BETWEEN ? AND ? ORDER BY pr.return_date DESC, pr.created_at DESC`;
  return await query(sql, [companyId, startDate, endDate]);
}

export async function getPurchaseReturnDetails(returnId) {
  const returnHeader = await queryOne(`SELECT pr.*, p.supplier_account_id, a.account_name as supplier_name, c.company_name, u.username as created_by_name, p.invoice_no as original_invoice_no FROM purchase_returns pr LEFT JOIN purchases p ON pr.purchase_id = p.id LEFT JOIN accounts a ON p.supplier_account_id = a.id LEFT JOIN company c ON pr.company_id = c.id LEFT JOIN users u ON pr.created_by = u.id WHERE pr.id = ?`, [returnId]);
  if (!returnHeader) return null;
  const items = await query(`SELECT pri.*, it.item_name, it.item_code FROM purchase_return_items pri LEFT JOIN item_master it ON pri.item_id = it.id WHERE pri.purchase_return_id = ?`, [returnId]);
  return { ...returnHeader, items };
}

export async function getPurchaseForReturn(purchaseId, companyId) {
  return await queryOne(`SELECT p.*, a.account_name as supplier_name, a.id as supplier_account_id, c.company_name FROM purchases p LEFT JOIN accounts a ON p.supplier_account_id = a.id LEFT JOIN company c ON p.company_id = c.id WHERE p.id = ? AND p.company_id = ?`, [purchaseId, companyId]);
}

export async function getPurchaseItemsWithStock(purchaseId) {
  return await query(`SELECT pi.id as purchase_item_id, pi.item_id, pi.quantity as purchased_quantity, pi.purchase_rate, it.item_name, it.item_code, (SELECT COALESCE(SUM(quantity_in - quantity_out), 0) FROM purchase_stock_ledger WHERE item_id = pi.item_id) as current_stock FROM purchase_items pi LEFT JOIN item_master it ON pi.item_id = it.id WHERE pi.purchase_id = ?`, [purchaseId]);
}

// ==================== SALE FUNCTIONS ====================
export async function createSale(companyId, invoiceNo, invoiceDate, customerId, memberId, items, discountAmount, paymentType, notes, userId, financialYear = '2026-27') {
  const connection = await createConnection();
  try {
    await connection.beginTransaction();
    const [saleResult] = await connection.query(`INSERT INTO sales (company_id, invoice_no, invoice_date, customer_account_id, member_id, discount_amount, payment_type, notes, created_by, financial_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`, [companyId, invoiceNo, invoiceDate, customerId || null, memberId || null, discountAmount || 0, paymentType, notes, userId, financialYear]);
    const saleId = saleResult[0].id;
    let totalAmount = 0;
    for (const item of items) {
      const amount = item.quantity * item.sale_rate;
      totalAmount += amount;
      await connection.query(`INSERT INTO sale_items (sale_id, item_id, quantity, sale_rate, amount) VALUES (?, ?, ?, ?, ?)`, [saleId, item.item_id, item.quantity, item.sale_rate, amount]);
      const currentStock = await getItemCurrentStock(companyId, item.item_id);
      const newStock = currentStock - item.quantity;
      await connection.query(`INSERT INTO purchase_stock_ledger (company_id, item_id, quantity_out, current_stock, transaction_type, reference_no, created_by, financial_year) VALUES (?, ?, ?, ?, 'SALE_OUT', ?, ?, ?)`, [companyId, item.item_id, item.quantity, newStock, `SALE-${saleId}`, userId, financialYear]);
    }
    const netAmount = totalAmount - (parseFloat(discountAmount) || 0);
    await connection.query(`UPDATE sales SET total_amount = ?, net_amount = ? WHERE id = ?`, [totalAmount, netAmount, saleId]);

    // --- NEW: Post to Account Ledger ---
    // 1. Credit the Sales Account (Net Amount)
    let [salesAcct] = await connection.query(`SELECT id FROM accounts WHERE company_id = ? AND account_code = 'S0001' LIMIT 1`, [companyId]);
    if (!salesAcct || salesAcct.length === 0) {
      [salesAcct] = await connection.query(`SELECT id FROM accounts WHERE company_id = ? AND account_type = 'sales' LIMIT 1`, [companyId]);
    }
    if (salesAcct && salesAcct.length > 0) {
      await connection.query(
        `INSERT INTO account_ledger (company_id, account_id, transaction_date, transaction_type, reference_type, reference_id, reference_no, debit, credit, description, financial_year) 
         VALUES (?, ?, ?, 'SALE', 'SALE', ?, ?, 0, ?, ?, ?)`,
        [companyId, salesAcct[0].id, invoiceDate, saleId, invoiceNo, netAmount, `SALE INV #${invoiceNo}`, financialYear]
      );
    }

    // 2. Debit the Customer/Member (Net Amount)
    if (customerId || memberId) {
      await connection.query(
        `INSERT INTO account_ledger (company_id, account_id, member_id, transaction_date, transaction_type, reference_type, reference_id, reference_no, debit, credit, description, financial_year) 
         VALUES (?, ?, ?, ?, 'SALE', 'SALE', ?, ?, ?, 0, ?, ?)`,
        [companyId, customerId || null, memberId || null, invoiceDate, saleId, invoiceNo, netAmount, `SALE INV #${invoiceNo}`, financialYear]
      );
    }

    await connection.commit();
    return { id: saleId, invoice_no: invoiceNo, total_amount: totalAmount, net_amount: netAmount };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getSalesByCompany(companyId, startDate, endDate, financialYear = '2026-27') {
  const sql = `
    SELECT 
      s.id, s.invoice_no, s.invoice_date, 
      COALESCE(a.account_name, m.eng_name, m.member_name, 'Walk-in') as customer_name, 
      COALESCE(a.account_name_gu, m.member_name) as customer_name_gu,
      COALESCE(m.member_code, CAST(a.id AS TEXT)) as member_code, 
      s.payment_type, s.total_amount, s.net_amount, 
      COUNT(si.id) as item_count, s.created_at 
    FROM sales s 
    LEFT JOIN accounts a ON s.customer_account_id = a.id 
    LEFT JOIN member_master m ON s.member_id = m.id 
    LEFT JOIN sale_items si ON s.id = si.sale_id 
    WHERE s.company_id = ? AND s.invoice_date BETWEEN ? AND ? AND s.financial_year = ? 
    GROUP BY s.id, a.account_name, m.member_name, m.eng_name, m.member_code, a.id, a.account_name_gu 
    ORDER BY s.invoice_date DESC, s.created_at DESC
  `;
  return await query(sql, [companyId, startDate, endDate, financialYear]);
}

export async function getSaleDetails(saleId) {
  const sale = await queryOne(`
    SELECT 
      s.*, 
      COALESCE(a.account_name, m.eng_name, m.member_name, 'Walk-in') as customer_name, 
      COALESCE(a.account_name_gu, m.member_name) as customer_name_gu,
      u.username as created_by_user, 
      c.company_name 
    FROM sales s 
    LEFT JOIN accounts a ON s.customer_account_id = a.id 
    LEFT JOIN member_master m ON s.member_id = m.id 
    LEFT JOIN users u ON s.created_by = u.id 
    LEFT JOIN company c ON s.company_id = c.id 
    WHERE s.id = ?
  `, [saleId]);
  if (!sale) return null;
  const items = await query(`SELECT si.*, it.item_name, it.item_code FROM sale_items si LEFT JOIN item_master it ON si.item_id = it.id WHERE si.sale_id = ?`, [saleId]);
  return { ...sale, items };
}

export async function getItemByBarcode(barcode, companyId) {
  const sql = `SELECT im.id, im.item_code, im.item_name, COALESCE(SUM(psl.quantity_in - psl.quantity_out), 0) as current_stock, ir.sale_rate FROM item_master im LEFT JOIN purchase_stock_ledger psl ON im.id = psl.item_id LEFT JOIN item_rate ir ON im.id = ir.item_id AND ir.is_active = 1 WHERE im.barcode = ? AND im.company_id = ? GROUP BY im.id, ir.sale_rate`;
  return await query(sql, [barcode, companyId]);
}

export async function getItemRate(itemId) {
  return await queryOne(`SELECT sale_rate as rate FROM item_rate WHERE item_id = ? AND is_active = 1 LIMIT 1`, [itemId]);
}

// ============================================
// PROFIT & LOSS STATEMENT FUNCTIONS
// ============================================
export async function getProfitLossStatement(companyId, startDate, endDate) {
  try {
    const salesRevenue = await queryOne(`SELECT COALESCE(SUM(net_amount), 0) as total FROM sales WHERE company_id = ? AND invoice_date BETWEEN ? AND ?`, [companyId, startDate, endDate]);
    const salesReturns = await queryOne(`SELECT COALESCE(SUM(total_return_amount), 0) as total FROM sale_returns WHERE company_id = ? AND return_date BETWEEN ? AND ?`, [companyId, startDate, endDate]);
    const purchaseCost = await queryOne(`SELECT COALESCE(SUM(total_amount), 0) as total FROM purchases WHERE company_id = ? AND invoice_date BETWEEN ? AND ?`, [companyId, startDate, endDate]);
    const purchaseReturns = await queryOne(`SELECT COALESCE(SUM(return_amount), 0) as total FROM purchase_returns WHERE company_id = ? AND return_date BETWEEN ? AND ?`, [companyId, startDate, endDate]);

    const netSales = parseFloat(salesRevenue.total) - parseFloat(salesReturns.total);
    const netCOGS = parseFloat(purchaseCost.total) - parseFloat(purchaseReturns.total);
    const grossProfit = netSales - netCOGS;

    const expenses = await query(`SELECT a.account_name, SUM(al.debit - al.credit) as amount FROM account_ledger al JOIN accounts a ON al.account_id = a.id WHERE a.company_id = ? AND a.account_type = 'Expense' AND al.transaction_date BETWEEN ? AND ? GROUP BY a.id, a.account_name`, [companyId, startDate, endDate]);
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    return {
      revenue: { netSales, totalSales: salesRevenue.total, returns: salesReturns.total },
      cogs: { netCOGS, totalPurchases: purchaseCost.total, returns: purchaseReturns.total },
      grossProfit,
      operatingExpenses: totalExpenses,
      netProfit: grossProfit - totalExpenses,
      expenseAccounts: expenses
    };
  } catch (error) {
    console.error('P&L Error:', error);
    throw error;
  }
}

export async function getSalesForReturn(companyId) {
  const sql = `SELECT s.id, s.invoice_no, s.invoice_date, s.customer_account_id, COALESCE(a.account_name, 'Walk-in') as customer_name, s.total_amount, s.discount_amount, s.net_amount, COUNT(si.id) as item_count, STRING_AGG(CONCAT(it.item_name, ' x', si.quantity), ', ') as item_summary FROM sales s LEFT JOIN accounts a ON s.customer_account_id = a.id LEFT JOIN sale_items si ON s.id = si.sale_id LEFT JOIN item_master it ON si.item_id = it.id WHERE s.company_id = ? AND s.id NOT IN (SELECT sale_id FROM sale_returns WHERE sale_id IS NOT NULL) GROUP BY s.id, s.invoice_no, s.invoice_date, s.customer_account_id, a.account_name ORDER BY s.invoice_date DESC`;
  return await query(sql, [companyId]);
}

export async function getSaleForReturnDetails(saleId) {
  const sale = await queryOne(`SELECT s.id, s.invoice_no, s.invoice_date, s.customer_account_id, COALESCE(a.account_name, 'Walk-in') as customer_name, s.total_amount, s.discount_amount, s.net_amount, s.company_id FROM sales s LEFT JOIN accounts a ON s.customer_account_id = a.id WHERE s.id = ?`, [saleId]);
  if (!sale) return null;
  const items = await query(`SELECT si.id, si.item_id, si.quantity, si.sale_rate, si.amount, it.item_code, it.item_name FROM sale_items si LEFT JOIN item_master it ON si.item_id = it.id WHERE si.sale_id = ?`, [saleId]);
  return { ...sale, items };
}

export async function createSaleReturn(companyId, saleId, returnNo, returnDate, customerAccountId, items, refundType, notes, userId) {
  const connection = await createConnection();
  try {
    await connection.beginTransaction();
    const totalReturnAmount = items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const [returnResult] = await connection.query(`INSERT INTO sale_returns (company_id, sale_id, return_no, return_date, customer_account_id, total_return_amount, refund_amount, refund_type, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`, [companyId, saleId, returnNo, returnDate, customerAccountId || null, totalReturnAmount, totalReturnAmount, refundType, notes || '', userId]);
    const saleReturnId = returnResult[0].id;
    for (const item of items) {
      await connection.query(`INSERT INTO sale_return_items (sale_return_id, item_id, quantity, sale_rate, amount) VALUES (?, ?, ?, ?, ?)`, [saleReturnId, item.item_id, item.quantity, item.sale_rate, item.amount]);
      await connection.query(`INSERT INTO purchase_stock_ledger (company_id, item_id, quantity_in, quantity_out, transaction_type, reference_no, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`, [companyId, item.item_id, item.quantity, 0, 'SALE_RETURN', `RETURN-${saleReturnId}`, userId]);
    }
    await connection.commit();
    return { id: saleReturnId, return_no: returnNo, total_return_amount: totalReturnAmount };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getSaleReturnsByCompany(companyId, startDate, endDate) {
  const sql = `SELECT sr.id, sr.return_no, sr.return_date, sr.customer_account_id, COALESCE(a.account_name, 'Walk-in') as customer_name, sr.total_return_amount, sr.refund_type, COUNT(sri.id) as item_count, u.username as created_by_user FROM sale_returns sr LEFT JOIN accounts a ON sr.customer_account_id = a.id LEFT JOIN sale_return_items sri ON sr.id = sri.sale_return_id LEFT JOIN users u ON sr.created_by = u.id WHERE sr.company_id = ? AND sr.return_date BETWEEN ? AND ? GROUP BY sr.id, a.account_name, u.username ORDER BY sr.return_date DESC, sr.created_at DESC`;
  return await query(sql, [companyId, startDate, endDate]);
}

export async function getSaleReturnDetails(saleReturnId) {
  const returnData = await queryOne(`SELECT sr.*, COALESCE(a.account_name, 'Walk-in') as customer_name, u.username as created_by_user, sr.created_at, sr.sale_id FROM sale_returns sr LEFT JOIN accounts a ON sr.customer_account_id = a.id LEFT JOIN users u ON sr.created_by = u.id WHERE sr.id = ?`, [saleReturnId]);
  if (!returnData) return null;
  const items = await query(`SELECT sri.id, sri.item_id, sri.quantity, sri.sale_rate, sri.amount, it.item_code, it.item_name FROM sale_return_items sri LEFT JOIN item_master it ON sri.item_id = it.id WHERE sri.sale_return_id = ?`, [saleReturnId]);
  return { ...returnData, items };
}

export async function getLowStockItems(companyId) {
  const sql = `SELECT im.id, im.item_code, im.item_name, im.category, im.reorder_level, COALESCE(SUM(CASE WHEN pl.transaction_type IN ('PURCHASE_IN', 'SALE_RETURN') THEN pl.quantity_in ELSE -pl.quantity_out END), 0) as current_stock FROM item_master im LEFT JOIN purchase_stock_ledger pl ON im.id = pl.item_id AND pl.company_id = ? WHERE im.company_id = ? AND im.is_active = 1 GROUP BY im.id HAVING COALESCE(SUM(CASE WHEN pl.transaction_type IN ('PURCHASE_IN', 'SALE_RETURN') THEN pl.quantity_in ELSE -pl.quantity_out END), 0) <= im.reorder_level ORDER BY current_stock ASC`;
  return await query(sql, [companyId, companyId]);
}

export async function getItemStockHistory(itemId, companyId) {
  const sql = `SELECT pl.id, pl.created_at as transaction_date, pl.transaction_type, pl.reference_no, pl.quantity_in, pl.quantity_out, (pl.quantity_in - pl.quantity_out) as net_qty, pl.created_at FROM purchase_stock_ledger pl WHERE pl.item_id = ? AND pl.company_id = ? ORDER BY pl.created_at DESC`;
  return await query(sql, [itemId, companyId]);
}

export async function getMonthlyProfitLoss(companyId, year) {
  const sql = `
    SELECT m.month_num as month, $1 as year,
    COALESCE(s.amount, 0) as sales_revenue, COALESCE(sr.amount, 0) as sales_returns,
    COALESCE(p.amount, 0) as purchase_cost, COALESCE(pr.amount, 0) as purchase_returns
    FROM (SELECT generate_series(1, 12) as month_num) m
    LEFT JOIN (SELECT EXTRACT(MONTH FROM invoice_date) as month, SUM(net_amount) as amount FROM sales WHERE company_id = $2 AND EXTRACT(YEAR FROM invoice_date) = $3 GROUP BY 1) s ON m.month_num = s.month
    LEFT JOIN (SELECT EXTRACT(MONTH FROM return_date) as month, SUM(total_return_amount) as amount FROM sale_returns WHERE company_id = $4 AND EXTRACT(YEAR FROM return_date) = $5 GROUP BY 1) sr ON m.month_num = sr.month
    LEFT JOIN (SELECT EXTRACT(MONTH FROM invoice_date) as month, SUM(total_amount) as amount FROM purchases WHERE company_id = $6 AND EXTRACT(YEAR FROM invoice_date) = $7 GROUP BY 1) p ON m.month_num = p.month
    LEFT JOIN (SELECT EXTRACT(MONTH FROM return_date) as month, SUM(return_amount) as amount FROM purchase_returns WHERE company_id = $8 AND EXTRACT(YEAR FROM return_date) = $9 GROUP BY 1) pr ON m.month_num = pr.month
    ORDER BY m.month_num
  `;
  const results = await query(sql, [year, companyId, year, companyId, year, companyId, year, companyId, year]);
  return results.map(row => ({ ...row, netSales: parseFloat(row.sales_revenue) - parseFloat(row.sales_returns), netCOGS: parseFloat(row.purchase_cost) - parseFloat(row.purchase_returns), grossProfit: (parseFloat(row.sales_revenue) - parseFloat(row.sales_returns)) - (parseFloat(row.purchase_cost) - parseFloat(row.purchase_returns)) }));
}

export async function getProfitLossSummary(companyId) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return await getProfitLossStatement(companyId, start, end);
}

// --- ACCOUNTING CONSTANTS ---
export const ACCOUNT_CODES = {
  DANGAR_PURCHASE: 'P0001',
  MEMBERS_DANGAR_PURCHASE: 'MP0001',
  DANGAR_GODOWN_FUND: 'DF0001',
  CASH_ACCOUNT: 'CS0001',
  BARDAN_SYSTEM: 'BS0001',
  INTEREST_KHATE: 'IK0001',
  DANGAR_SYSTEM: 'DS0001',
  MEMBER_ADVANCE: 'L0001'
};

/**
 * Advanced helper for posting balanced multi-line journal entries.
 * @param {Object} params { companyId, date, referenceType, referenceId, referenceNo, description, entries, financialYear, userId, transactionType }
 * entries: Array of { accountId, memberId, debit, credit, description, notes }
 */
export async function postJournal({
  companyId,
  date,
  referenceType,
  referenceId,
  referenceNo,
  description,
  entries = [],
  financialYear = '2026-27',
  userId = 1,
  transactionType = 'manual'
}) {
  const totalDebit = entries.reduce((sum, e) => sum + parseFloat(e.debit || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + parseFloat(e.credit || 0), 0);

  // Precision fix (round to 2 decimal places)
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Unbalanced Journal Entry: Total Debit (${totalDebit.toFixed(2)}) != Total Credit (${totalCredit.toFixed(2)})`);
  }

  if (entries.length === 0) return;

  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    for (const entry of entries) {
      const debitVal = parseFloat(entry.debit || 0);
      const creditVal = parseFloat(entry.credit || 0);
      if (debitVal === 0 && creditVal === 0) continue;

      await connection.execute(`
        INSERT INTO account_ledger (
          company_id, account_id, member_id, transaction_date, transaction_type, reference_type, 
          reference_id, reference_no, description, debit, credit, financial_year, created_by, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        companyId, entry.accountId || null, entry.memberId || null, date, transactionType, referenceType,
        referenceId, referenceNo, entry.description || description, debitVal, creditVal, financialYear, userId, entry.notes || ''
      ]);
    }

    await connection.commit();
    console.log(`✅ Balanced Journal Committed: ${referenceType} [SR: ${referenceNo}] | Sum: ${totalDebit.toFixed(2)}`);
    return { success: true };
  } catch (err) {
    await connection.rollback();
    console.error('Journal Posting Error:', err);
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Reusable helper for posting simple double-entry transactions (legacy compatibility)
 */
export async function postToLedger(params) {
  const { amount, debitAccountId, creditAccountId, debitMemberId, creditMemberId, ...rest } = params;
  const entries = [];
  if (debitAccountId || debitMemberId) {
    entries.push({ accountId: debitAccountId, memberId: debitMemberId, debit: amount });
  }
  if (creditAccountId || creditMemberId) {
    entries.push({ accountId: creditAccountId, memberId: creditMemberId, credit: amount });
  }
  return await postJournal({ ...rest, entries });
}

/**
 * Resolves an account ID by its system code
 */
export async function getAccountIdByCode(companyId, code) {
  const row = await queryOne('SELECT id FROM accounts WHERE account_code = ? AND company_id = ?', [code, companyId]);
  return row ? row.id : null;
}

export default pool;





