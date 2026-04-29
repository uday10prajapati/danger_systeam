
/**
 * AUTO-GENERATED FULL SEED FILE
 * Generated on: 29/4/2026, 5:13:26 pm
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function addColumn(connection, table, col, type, options = "") {
  try {
    const [cols] = await connection.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [col]);
    if (cols.length === 0) {
      console.log(`🛠  Adding missing column [${col}] to [${table}]...`);
      await connection.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${type} ${options}`);
    }
  } catch (e) {
    console.error(`⚠️ Error adding column ${col}: `, e.message);
  }
}

async function runFullSeed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  // SET THIS TO FALSE IF YOU ONLY WANT TO SEED DATA AND YOUR SCHEMA IS ALREADY UP TO DATE
  const SYNC_SCHEMA = true; 

  try {
    console.log('⏳ Disabling Foreign Key Checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    if (SYNC_SCHEMA) {
      console.log('🛠  Ensuring table exists: company...');
      await connection.query(`CREATE TABLE IF NOT EXISTS \`company\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`company_id\` int(11) DEFAULT NULL,
  \`company_name\` varchar(255) NOT NULL,
  \`address\` text NOT NULL,
  \`phone\` varchar(20) NOT NULL,
  \`email\` varchar(100) NOT NULL,
  \`gst_number\` varchar(15) DEFAULT NULL,
  \`financial_year_start\` date NOT NULL,
  \`financial_year_end\` date NOT NULL,
  \`currency\` varchar(3) DEFAULT 'INR',
  \`logo_url\` varchar(255) DEFAULT NULL,
  \`created_at\` datetime DEFAULT current_timestamp(),
  \`updated_at\` datetime DEFAULT current_timestamp(),
  \`is_active\` int(11) DEFAULT 1,
  \`company_account_no\` varchar(100) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`company_name\` (\`company_name\`),
  UNIQUE KEY \`email\` (\`email\`),
  UNIQUE KEY \`uidx_company_name\` (\`company_name\`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);
      const cols = [{"field":"company_id","type":"int(11)","options":""},{"field":"company_name","type":"varchar(255)","options":" NOT NULL"},{"field":"address","type":"text","options":" NOT NULL"},{"field":"phone","type":"varchar(20)","options":" NOT NULL"},{"field":"email","type":"varchar(100)","options":" NOT NULL"},{"field":"gst_number","type":"varchar(15)","options":""},{"field":"financial_year_start","type":"date","options":" NOT NULL"},{"field":"financial_year_end","type":"date","options":" NOT NULL"},{"field":"currency","type":"varchar(3)","options":" DEFAULT 'INR'"},{"field":"logo_url","type":"varchar(255)","options":""},{"field":"created_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"},{"field":"updated_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"},{"field":"is_active","type":"int(11)","options":" DEFAULT '1'"},{"field":"company_account_no","type":"varchar(100)","options":""}];
      for (const col of cols) { await addColumn(connection, 'company', col.field, col.type, col.options); }
    }
    console.log('🧹 Clearing table: company...');
    await connection.query('TRUNCATE TABLE company');
    console.log('📥 Inserting 1 rows into company...');
    await connection.query(
      `INSERT INTO company (id, company_id, company_name, address, phone, email, gst_number, financial_year_start, financial_year_end, currency, logo_url, created_at, updated_at, is_active, company_account_no) VALUES 
      (2, 2, 'Demo Company', '364 / 35 Gajanand Society near hasti talav', '09909989392', 'uday.prajapati1403@gmail.com', NULL, '2026-03-30 18:30:00', '2027-03-29 18:30:00', 'INR', NULL, '2026-04-26 10:53:06', '2026-04-26 10:53:06', 1, '808005042876')` 
    );

    if (SYNC_SCHEMA) {
      console.log('🛠  Ensuring table exists: accounts...');
      await connection.query(`CREATE TABLE IF NOT EXISTS \`accounts\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`company_id\` int(11) NOT NULL,
  \`account_name\` varchar(100) NOT NULL,
  \`account_type\` varchar(50) NOT NULL,
  \`phone\` varchar(20) DEFAULT NULL,
  \`email\` varchar(100) DEFAULT NULL,
  \`gst_no\` varchar(15) DEFAULT NULL,
  \`tin_no\` varchar(20) DEFAULT NULL,
  \`opening_balance\` decimal(10,2) DEFAULT 0.00,
  \`is_active\` int(11) DEFAULT 1,
  \`is_deleted\` int(11) DEFAULT 0,
  \`created_at\` datetime DEFAULT current_timestamp(),
  \`updated_at\` datetime DEFAULT current_timestamp(),
  \`financial_year\` varchar(20) NOT NULL DEFAULT '2026-27',
  \`account_code\` varchar(50) DEFAULT NULL,
  \`is_subledger\` tinyint(1) DEFAULT 0,
  \`is_system\` tinyint(1) DEFAULT 0,
  PRIMARY KEY (\`id\`),
  KEY \`company_id\` (\`company_id\`),
  KEY \`idx_accounts_fy\` (\`financial_year\`),
  CONSTRAINT \`accounts_ibfk_1\` FOREIGN KEY (\`company_id\`) REFERENCES \`company\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);
      const cols = [{"field":"company_id","type":"int(11)","options":" NOT NULL"},{"field":"account_name","type":"varchar(100)","options":" NOT NULL"},{"field":"account_type","type":"varchar(50)","options":" NOT NULL"},{"field":"phone","type":"varchar(20)","options":""},{"field":"email","type":"varchar(100)","options":""},{"field":"gst_no","type":"varchar(15)","options":""},{"field":"tin_no","type":"varchar(20)","options":""},{"field":"opening_balance","type":"decimal(10,2)","options":" DEFAULT '0.00'"},{"field":"is_active","type":"int(11)","options":" DEFAULT '1'"},{"field":"is_deleted","type":"int(11)","options":" DEFAULT '0'"},{"field":"created_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"},{"field":"updated_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"},{"field":"financial_year","type":"varchar(20)","options":" NOT NULL DEFAULT '2026-27'"},{"field":"account_code","type":"varchar(50)","options":""},{"field":"is_subledger","type":"tinyint(1)","options":" DEFAULT '0'"},{"field":"is_system","type":"tinyint(1)","options":" DEFAULT '0'"}];
      for (const col of cols) { await addColumn(connection, 'accounts', col.field, col.type, col.options); }
    }
    console.log('🧹 Clearing table: accounts...');
    await connection.query('TRUNCATE TABLE accounts');
    console.log('📥 Inserting 10 rows into accounts...');
    await connection.query(
      `INSERT INTO accounts (id, company_id, account_name, account_type, phone, email, gst_no, tin_no, opening_balance, is_active, is_deleted, created_at, updated_at, financial_year, account_code, is_subledger, is_system) VALUES 
      (5, 2, 'Dangar System', 'System Account', NULL, NULL, NULL, NULL, '0.00', 1, 0, '2026-04-28 05:31:32', '2026-04-28 05:31:32', '2026-27', 'DS0001', 1, 1),
      (6, 2, 'Bardan System', 'System Account', NULL, NULL, NULL, NULL, '0.00', 1, 0, '2026-04-28 05:31:32', '2026-04-28 05:31:32', '2026-27', 'BS0001', 1, 1),
      (7, 2, 'Member Adv Ac', 'System Account', '1234567890', NULL, NULL, NULL, '0.00', 1, 0, '2026-04-28 12:12:29', '2026-04-28 12:12:29', '2026-27', 'L0001', 1, 1),
      (9, 2, 'Dangar Purchase', 'purchase', NULL, NULL, NULL, NULL, '0.00', 1, 0, '2026-04-28 12:13:50', '2026-04-28 12:13:50', '2026-27', 'P0001', 0, 1),
      (10, 2, 'Rounding Khate', 'System Account', NULL, NULL, NULL, NULL, '0.00', 1, 0, '2026-04-28 15:23:55', '2026-04-28 15:23:55', '2026-27', 'RK0001', 1, 1),
      (11, 2, 'Brokerage Khate', 'System Account', NULL, NULL, NULL, NULL, '0.00', 1, 0, '2026-04-28 15:23:55', '2026-04-28 15:23:55', '2026-27', 'BK0001', 1, 1),
      (12, 2, 'Interest Khate', 'System Account', NULL, NULL, NULL, NULL, '0.00', 1, 0, '2026-04-28 15:23:55', '2026-04-28 15:23:55', '2026-27', 'IK0001', 1, 1),
      (13, 2, 'Labour Khate', 'System Account', NULL, NULL, NULL, NULL, '0.00', 1, 0, '2026-04-28 15:23:55', '2026-04-28 15:23:55', '2026-27', 'LK0001', 1, 1),
      (14, 2, 'Cash Account', 'System Account', NULL, NULL, NULL, NULL, '0.00', 1, 0, '2026-04-29 08:15:06', '2026-04-29 08:15:06', '2026-27', 'CS0001', 0, 1),
      (15, 2, 'Dangar Sale', 'sales', NULL, NULL, NULL, NULL, '0.00', 1, 0, '2026-04-29 08:17:35', '2026-04-29 08:17:35', '2026-27', 'S0001', 0, 1)` 
    );

    if (SYNC_SCHEMA) {
      console.log('🛠  Ensuring table exists: member_master...');
      await connection.query(`CREATE TABLE IF NOT EXISTS \`member_master\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`company_id\` int(11) NOT NULL,
  \`account_id\` int(11) DEFAULT NULL,
  \`member_name\` text DEFAULT NULL,
  \`member_code\` varchar(50) DEFAULT NULL,
  \`phone\` varchar(20) DEFAULT NULL,
  \`is_active\` int(11) DEFAULT 1,
  \`created_at\` datetime DEFAULT current_timestamp(),
  \`updated_at\` datetime DEFAULT current_timestamp(),
  \`financial_year\` varchar(20) NOT NULL DEFAULT '2026-27',
  \`village_code\` text DEFAULT NULL,
  \`village_name\` varchar(155) DEFAULT NULL,
  \`full_ac_number\` text DEFAULT NULL,
  \`bank_name\` text DEFAULT NULL,
  \`branch_name\` varchar(155) DEFAULT NULL,
  \`account_type\` text DEFAULT NULL,
  \`address_no\` text DEFAULT NULL,
  \`eng_name\` text DEFAULT NULL,
  \`nominal_member\` text DEFAULT NULL,
  \`bardan_opening\` decimal(15,2) DEFAULT 0.00,
  \`ifsc_code\` varchar(20) DEFAULT NULL,
  \`opening_balance\` decimal(15,2) DEFAULT 0.00,
  \`member_address\` text DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`company_id\` (\`company_id\`),
  KEY \`account_id\` (\`account_id\`),
  KEY \`idx_member_master_fy\` (\`financial_year\`),
  CONSTRAINT \`member_master_ibfk_1\` FOREIGN KEY (\`company_id\`) REFERENCES \`company\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`member_master_ibfk_2\` FOREIGN KEY (\`account_id\`) REFERENCES \`accounts\` (\`id\`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);
      const cols = [{"field":"company_id","type":"int(11)","options":" NOT NULL"},{"field":"account_id","type":"int(11)","options":""},{"field":"member_name","type":"text","options":""},{"field":"member_code","type":"varchar(50)","options":""},{"field":"phone","type":"varchar(20)","options":""},{"field":"is_active","type":"int(11)","options":" DEFAULT '1'"},{"field":"created_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"},{"field":"updated_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"},{"field":"financial_year","type":"varchar(20)","options":" NOT NULL DEFAULT '2026-27'"},{"field":"village_code","type":"text","options":""},{"field":"village_name","type":"varchar(155)","options":""},{"field":"full_ac_number","type":"text","options":""},{"field":"bank_name","type":"text","options":""},{"field":"branch_name","type":"varchar(155)","options":""},{"field":"account_type","type":"text","options":""},{"field":"address_no","type":"text","options":""},{"field":"eng_name","type":"text","options":""},{"field":"nominal_member","type":"text","options":""},{"field":"bardan_opening","type":"decimal(15,2)","options":" DEFAULT '0.00'"},{"field":"ifsc_code","type":"varchar(20)","options":""},{"field":"opening_balance","type":"decimal(15,2)","options":" DEFAULT '0.00'"},{"field":"member_address","type":"text","options":""}];
      for (const col of cols) { await addColumn(connection, 'member_master', col.field, col.type, col.options); }
    }
    console.log('🧹 Clearing table: member_master...');
    await connection.query('TRUNCATE TABLE member_master');
    console.log('📥 Inserting 2 rows into member_master...');
    await connection.query(
      `INSERT INTO member_master (id, company_id, account_id, member_name, member_code, phone, is_active, created_at, updated_at, financial_year, village_code, village_name, full_ac_number, bank_name, branch_name, account_type, address_no, eng_name, nominal_member, bardan_opening, ifsc_code, opening_balance, member_address) VALUES 
      (6, 2, NULL, 'ARYAN HERE', '1', NULL, 1, '2026-04-29 06:45:43', '2026-04-29 06:45:43', '2026-27', '2', 'Pungam', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '0.00', NULL, '0.00', NULL),
      (7, 2, NULL, 'Uday', '2', NULL, 1, '2026-04-29 09:41:39', '2026-04-29 09:41:39', '2026-27', '1', 'Sajod', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '0.00', NULL, '0.00', NULL)` 
    );

    if (SYNC_SCHEMA) {
      console.log('🛠  Ensuring table exists: village...');
      await connection.query(`CREATE TABLE IF NOT EXISTS \`village\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`village_code\` varchar(50) DEFAULT NULL,
  \`village_name\` varchar(255) DEFAULT NULL,
  \`taluka_name\` varchar(255) DEFAULT NULL,
  \`district_name\` varchar(255) DEFAULT NULL,
  \`no_of_villages\` int(11) DEFAULT 0,
  \`created_at\` datetime DEFAULT current_timestamp(),
  \`updated_at\` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);
      const cols = [{"field":"village_code","type":"varchar(50)","options":""},{"field":"village_name","type":"varchar(255)","options":""},{"field":"taluka_name","type":"varchar(255)","options":""},{"field":"district_name","type":"varchar(255)","options":""},{"field":"no_of_villages","type":"int(11)","options":" DEFAULT '0'"},{"field":"created_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"},{"field":"updated_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"}];
      for (const col of cols) { await addColumn(connection, 'village', col.field, col.type, col.options); }
    }
    console.log('🧹 Clearing table: village...');
    await connection.query('TRUNCATE TABLE village');
    console.log('📥 Inserting 2 rows into village...');
    await connection.query(
      `INSERT INTO village (id, village_code, village_name, taluka_name, district_name, no_of_villages, created_at, updated_at) VALUES 
      (1, '1', 'Sajod', 'Ankleshwar', 'Bharuch', 1, '2026-04-23 16:35:36', '2026-04-23 16:35:36'),
      (2, '2', 'Pungam', 'Ankleshwar', 'Bharuch', 2, '2026-04-23 16:36:00', '2026-04-23 16:36:00')` 
    );

    if (SYNC_SCHEMA) {
      console.log('🛠  Ensuring table exists: bardan_price_master...');
      await connection.query(`CREATE TABLE IF NOT EXISTS \`bardan_price_master\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`company_id\` int(11) NOT NULL,
  \`price_per_bardan\` decimal(10,2) NOT NULL DEFAULT 0.00,
  \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
  \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`company_unique\` (\`company_id\`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);
      const cols = [{"field":"company_id","type":"int(11)","options":" NOT NULL"},{"field":"price_per_bardan","type":"decimal(10,2)","options":" NOT NULL DEFAULT '0.00'"},{"field":"created_at","type":"timestamp","options":" NOT NULL DEFAULT 'current_timestamp()'"},{"field":"updated_at","type":"timestamp","options":" NOT NULL DEFAULT 'current_timestamp()'"}];
      for (const col of cols) { await addColumn(connection, 'bardan_price_master', col.field, col.type, col.options); }
    }
    console.log('🧹 Clearing table: bardan_price_master...');
    await connection.query('TRUNCATE TABLE bardan_price_master');
    console.log('📥 Inserting 1 rows into bardan_price_master...');
    await connection.query(
      `INSERT INTO bardan_price_master (id, company_id, price_per_bardan, created_at, updated_at) VALUES 
      (2, 2, '40.00', '2026-04-28 12:15:57', '2026-04-28 12:15:57')` 
    );

    if (SYNC_SCHEMA) {
      console.log('🛠  Ensuring table exists: dangar_entry...');
      await connection.query(`CREATE TABLE IF NOT EXISTS \`dangar_entry\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`company_id\` int(11) NOT NULL,
  \`financial_year\` varchar(20) NOT NULL DEFAULT '2026-27',
  \`book_type\` varchar(50) NOT NULL,
  \`sr_no\` varchar(100) DEFAULT NULL,
  \`entry_date\` date NOT NULL,
  \`member_id\` int(11) DEFAULT NULL,
  \`item_id\` int(11) DEFAULT NULL,
  \`remark\` text DEFAULT NULL,
  \`vehicle_no\` varchar(100) DEFAULT NULL,
  \`quality_class\` varchar(20) DEFAULT '1st',
  \`total_kg\` decimal(15,2) DEFAULT 0.00,
  \`bardan\` int(11) DEFAULT 0,
  \`gun\` decimal(10,2) DEFAULT 0.00,
  \`gross_quintal\` decimal(15,2) DEFAULT 0.00,
  \`less_bardan\` decimal(15,2) DEFAULT 0.00,
  \`net_quintal\` decimal(15,2) DEFAULT 0.00,
  \`created_by\` int(11) DEFAULT NULL,
  \`created_at\` datetime DEFAULT current_timestamp(),
  \`updated_at\` datetime DEFAULT current_timestamp(),
  \`rate\` decimal(12,2) DEFAULT 0.00,
  \`amount\` decimal(15,2) DEFAULT 0.00,
  \`weight_unit\` varchar(20) DEFAULT 'kg',
  \`total_deduction\` decimal(15,2) DEFAULT 0.00,
  \`bardan_penalty\` decimal(15,2) DEFAULT 0.00,
  \`account_id\` int(11) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`company_id\` (\`company_id\`),
  KEY \`member_id\` (\`member_id\`),
  KEY \`item_id\` (\`item_id\`),
  CONSTRAINT \`dangar_entry_ibfk_1\` FOREIGN KEY (\`company_id\`) REFERENCES \`company\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`dangar_entry_ibfk_2\` FOREIGN KEY (\`member_id\`) REFERENCES \`member_master\` (\`id\`) ON DELETE SET NULL,
  CONSTRAINT \`dangar_entry_ibfk_3\` FOREIGN KEY (\`item_id\`) REFERENCES \`item_master\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);
      const cols = [{"field":"company_id","type":"int(11)","options":" NOT NULL"},{"field":"financial_year","type":"varchar(20)","options":" NOT NULL DEFAULT '2026-27'"},{"field":"book_type","type":"varchar(50)","options":" NOT NULL"},{"field":"sr_no","type":"varchar(100)","options":""},{"field":"entry_date","type":"date","options":" NOT NULL"},{"field":"member_id","type":"int(11)","options":""},{"field":"item_id","type":"int(11)","options":""},{"field":"remark","type":"text","options":""},{"field":"vehicle_no","type":"varchar(100)","options":""},{"field":"quality_class","type":"varchar(20)","options":" DEFAULT '1st'"},{"field":"total_kg","type":"decimal(15,2)","options":" DEFAULT '0.00'"},{"field":"bardan","type":"int(11)","options":" DEFAULT '0'"},{"field":"gun","type":"decimal(10,2)","options":" DEFAULT '0.00'"},{"field":"gross_quintal","type":"decimal(15,2)","options":" DEFAULT '0.00'"},{"field":"less_bardan","type":"decimal(15,2)","options":" DEFAULT '0.00'"},{"field":"net_quintal","type":"decimal(15,2)","options":" DEFAULT '0.00'"},{"field":"created_by","type":"int(11)","options":""},{"field":"created_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"},{"field":"updated_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"},{"field":"rate","type":"decimal(12,2)","options":" DEFAULT '0.00'"},{"field":"amount","type":"decimal(15,2)","options":" DEFAULT '0.00'"},{"field":"weight_unit","type":"varchar(20)","options":" DEFAULT 'kg'"},{"field":"total_deduction","type":"decimal(15,2)","options":" DEFAULT '0.00'"},{"field":"bardan_penalty","type":"decimal(15,2)","options":" DEFAULT '0.00'"},{"field":"account_id","type":"int(11)","options":""}];
      for (const col of cols) { await addColumn(connection, 'dangar_entry', col.field, col.type, col.options); }
    }
    console.log('🧹 Clearing table: dangar_entry...');
    await connection.query('TRUNCATE TABLE dangar_entry');
    console.log('📥 Inserting 4 rows into dangar_entry...');
    await connection.query(
      `INSERT INTO dangar_entry (id, company_id, financial_year, book_type, sr_no, entry_date, member_id, item_id, remark, vehicle_no, quality_class, total_kg, bardan, gun, gross_quintal, less_bardan, net_quintal, created_by, created_at, updated_at, rate, amount, weight_unit, total_deduction, bardan_penalty, account_id) VALUES 
      (7, 2, '2026-27', 'Dangar', 'D00001', '2026-04-28 18:30:00', NULL, 2, '', '', '1st', '1000.00', 30, '0.00', '10.00', '0.00', '10.00', 1, '2026-04-29 06:39:42', '2026-04-29 06:39:42', '500.00', '5000.00', 'kg', '0.00', '0.00', 5),
      (8, 2, '2026-27', 'Dangar', 'D00002', '2026-04-28 18:30:00', 6, 2, '', '', '1st', '1000.00', 29, '0.00', '10.00', '0.00', '10.00', 1, '2026-04-29 06:49:43', '2026-04-29 06:49:43', '500.00', '5000.00', 'kg', '0.00', '0.00', 5),
      (9, 2, '2026-27', 'Dangar', 'D00003', '2026-04-28 18:30:00', 6, 2, '', '', '1st', '210.00', 25, '0.00', '2.10', '0.00', '2.10', 1, '2026-04-29 09:08:00', '2026-04-29 09:08:00', '500.00', '1050.00', 'kg', '0.00', '0.00', 5),
      (10, 2, '2026-27', 'Dangar', 'D00004', '2026-04-28 18:30:00', 6, 2, '', '', '1st', '3000.00', 71, '0.00', '30.00', '0.00', '30.00', 1, '2026-04-29 09:38:44', '2026-04-29 09:38:44', '500.00', '15000.00', 'kg', '0.00', '0.00', 5)` 
    );

    if (SYNC_SCHEMA) {
      console.log('🛠  Ensuring table exists: account_ledger...');
      await connection.query(`CREATE TABLE IF NOT EXISTS \`account_ledger\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`company_id\` int(11) NOT NULL,
  \`account_id\` int(11) DEFAULT NULL,
  \`member_id\` int(11) DEFAULT NULL,
  \`transaction_date\` date DEFAULT NULL,
  \`transaction_type\` varchar(50) DEFAULT NULL,
  \`reference_type\` varchar(50) DEFAULT NULL,
  \`reference_id\` int(11) DEFAULT NULL,
  \`reference_no\` varchar(100) DEFAULT NULL,
  \`debit_amount\` decimal(10,2) DEFAULT 0.00,
  \`credit_amount\` decimal(10,2) DEFAULT 0.00,
  \`debit\` decimal(10,2) DEFAULT 0.00,
  \`credit\` decimal(10,2) DEFAULT 0.00,
  \`description\` text DEFAULT NULL,
  \`created_by\` int(11) DEFAULT NULL,
  \`created_at\` datetime DEFAULT current_timestamp(),
  \`financial_year\` varchar(20) NOT NULL DEFAULT '2026-27',
  \`notes\` text DEFAULT NULL,
  \`updated_at\` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  \`interest_amount\` decimal(10,2) DEFAULT 0.00,
  \`interest_a_per\` varchar(50) DEFAULT NULL,
  \`interest_percent\` decimal(5,2) DEFAULT 0.00,
  \`interest_member_id\` int(11) DEFAULT NULL,
  \`interest_account_id\` int(11) DEFAULT NULL,
  \`source_table\` varchar(50) DEFAULT NULL,
  \`source_id\` int(11) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`company_id\` (\`company_id\`),
  KEY \`account_id\` (\`account_id\`),
  KEY \`created_by\` (\`created_by\`),
  KEY \`idx_account_ledger_fy\` (\`financial_year\`),
  CONSTRAINT \`account_ledger_ibfk_1\` FOREIGN KEY (\`company_id\`) REFERENCES \`company\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`account_ledger_ibfk_2\` FOREIGN KEY (\`account_id\`) REFERENCES \`accounts\` (\`id\`),
  CONSTRAINT \`account_ledger_ibfk_3\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);
      const cols = [{"field":"company_id","type":"int(11)","options":" NOT NULL"},{"field":"account_id","type":"int(11)","options":""},{"field":"member_id","type":"int(11)","options":""},{"field":"transaction_date","type":"date","options":""},{"field":"transaction_type","type":"varchar(50)","options":""},{"field":"reference_type","type":"varchar(50)","options":""},{"field":"reference_id","type":"int(11)","options":""},{"field":"reference_no","type":"varchar(100)","options":""},{"field":"debit_amount","type":"decimal(10,2)","options":" DEFAULT '0.00'"},{"field":"credit_amount","type":"decimal(10,2)","options":" DEFAULT '0.00'"},{"field":"debit","type":"decimal(10,2)","options":" DEFAULT '0.00'"},{"field":"credit","type":"decimal(10,2)","options":" DEFAULT '0.00'"},{"field":"description","type":"text","options":""},{"field":"created_by","type":"int(11)","options":""},{"field":"created_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"},{"field":"financial_year","type":"varchar(20)","options":" NOT NULL DEFAULT '2026-27'"},{"field":"notes","type":"text","options":""},{"field":"updated_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"},{"field":"interest_amount","type":"decimal(10,2)","options":" DEFAULT '0.00'"},{"field":"interest_a_per","type":"varchar(50)","options":""},{"field":"interest_percent","type":"decimal(5,2)","options":" DEFAULT '0.00'"},{"field":"interest_member_id","type":"int(11)","options":""},{"field":"interest_account_id","type":"int(11)","options":""},{"field":"source_table","type":"varchar(50)","options":""},{"field":"source_id","type":"int(11)","options":""}];
      for (const col of cols) { await addColumn(connection, 'account_ledger', col.field, col.type, col.options); }
    }
    console.log('🧹 Clearing table: account_ledger...');
    await connection.query('TRUNCATE TABLE account_ledger');
    console.log('📥 Inserting 12 rows into account_ledger...');
    await connection.query(
      `INSERT INTO account_ledger (id, company_id, account_id, member_id, transaction_date, transaction_type, reference_type, reference_id, reference_no, debit_amount, credit_amount, debit, credit, description, created_by, created_at, financial_year, notes, updated_at, interest_amount, interest_a_per, interest_percent, interest_member_id, interest_account_id, source_table, source_id) VALUES 
      (35, 2, 7, 6, '2026-03-31 18:30:00', 'cash_book', 'cash_book', NULL, 'CB-1777445170347', '0.00', '0.00', '10000.00', '0.00', 'Cash Out - Member Adv Ac', 1, '2026-04-29 06:46:10', '2026-27', 'ARYAN HERE', '2026-04-29 11:25:49', '92.05', 'per_year', '12.00', 6, 12, NULL, NULL),
      (36, 2, 9, 6, '2026-04-28 18:30:00', 'cash_book', 'dangar_entry', 8, 'D00002', '0.00', '0.00', '0.00', '5000.00', 'Dangar Purchase - 10.00 Qt @ 500.00', NULL, '2026-04-29 06:49:43', '2026-27', NULL, '2026-04-29 06:49:43', '0.00', NULL, '0.00', NULL, NULL, NULL, NULL),
      (37, 2, 9, 6, '2026-04-28 18:30:00', 'cash_book', 'dangar_entry', 9, 'D00003', '0.00', '0.00', '0.00', '1050.00', 'Dangar Purchase - 2.10 Qt @ 500.00', NULL, '2026-04-29 09:08:00', '2026-27', NULL, '2026-04-29 09:08:00', '0.00', NULL, '0.00', NULL, NULL, NULL, NULL),
      (38, 2, 6, 6, '2026-04-28 18:30:00', NULL, NULL, NULL, '505', '0.00', '0.00', '50.00', '0.00', '[BARDAN] Taken (#505) | ', NULL, '2026-04-29 09:16:57', '2026-27', NULL, '2026-04-29 09:19:05', '0.00', NULL, '0.00', NULL, NULL, 'bardan_entry', 7),
      (39, 2, 6, 6, '2026-04-28 18:30:00', NULL, NULL, NULL, '12345', '0.00', '0.00', '50.00', '0.00', '[BARDAN] Taken (#12345) | ', NULL, '2026-04-29 09:16:57', '2026-27', NULL, '2026-04-29 09:19:05', '0.00', NULL, '0.00', NULL, NULL, 'bardan_entry', 8),
      (40, 2, 6, 6, '2026-04-28 18:30:00', NULL, NULL, NULL, 'D00002', '0.00', '0.00', '0.00', '21.00', '[BARDAN] Returned (#D00002) | Dangar Settlement SR: D00002', NULL, '2026-04-29 09:16:57', '2026-27', NULL, '2026-04-29 09:19:05', '0.00', NULL, '0.00', NULL, NULL, 'jama_bardan_entry', 9),
      (41, 2, 6, 6, '2026-04-28 18:30:00', NULL, NULL, NULL, 'D00003', '0.00', '0.00', '0.00', '4.00', '[BARDAN] Returned (#D00003) | Dangar Settlement SR: D00003', NULL, '2026-04-29 09:16:57', '2026-27', NULL, '2026-04-29 09:19:05', '0.00', NULL, '0.00', NULL, NULL, 'jama_bardan_entry', 10),
      (42, 2, 9, 6, '2026-04-28 18:30:00', 'cash_book', 'dangar_entry', 10, 'D00004', '0.00', '0.00', '0.00', '15000.00', 'Dangar Purchase - 30.00 Qt @ 500.00', NULL, '2026-04-29 09:38:44', '2026-27', NULL, '2026-04-29 09:38:44', '0.00', NULL, '0.00', NULL, NULL, NULL, NULL),
      (43, 2, 7, 7, '2026-03-31 18:30:00', 'cash_book', 'cash_book', NULL, 'CB-1777455736091', '0.00', '0.00', '1000.00', '0.00', 'Cash Out - Member Adv Ac', 1, '2026-04-29 09:42:16', '2026-27', 'Uday', '2026-04-29 11:25:49', '9.21', 'per_year', '12.00', 7, 12, NULL, NULL),
      (44, 2, NULL, NULL, '2026-04-28 18:30:00', 'cash_book', 'cash_book', NULL, 'CB-1777458726812', '0.00', '0.00', '0.00', '200.00', 'Interest Settlement / Adjustment for ARYAN HERE', 1, '2026-04-29 10:32:06', '2026-27', 'Calculated Yield Reference: 0.00', '2026-04-29 10:32:06', '0.00', NULL, '0.00', NULL, NULL, NULL, NULL),
      (45, 2, 7, 6, '2026-04-28 18:30:00', 'cash_book', 'cash_book', NULL, 'CB-1777459125424', '0.00', '0.00', '9000.00', '0.00', 'Cash Out - Member Adv Ac', 1, '2026-04-29 10:38:45', '2026-27', 'ARYAN HERE', '2026-04-29 11:25:49', '0.00', 'per_year', '12.00', 6, 12, NULL, NULL),
      (46, 2, 7, 6, '2026-04-28 18:30:00', 'cash_book', 'cash_book', NULL, 'CB-1777459819896', '0.00', '0.00', '1000.00', '0.00', 'Cash Out - Member Adv Ac', 1, '2026-04-29 10:50:19', '2026-27', 'ARYAN HERE', '2026-04-29 11:25:49', '0.00', 'per_year', '12.00', 6, 12, NULL, NULL)` 
    );

    if (SYNC_SCHEMA) {
      console.log('🛠  Ensuring table exists: bardan_entry...');
      await connection.query(`CREATE TABLE IF NOT EXISTS \`bardan_entry\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`company_id\` int(11) NOT NULL,
  \`financial_year\` varchar(20) NOT NULL DEFAULT '2026-27',
  \`book_type\` varchar(50) DEFAULT NULL,
  \`pavti_no\` varchar(100) DEFAULT NULL,
  \`entry_date\` date NOT NULL,
  \`mem_nominal\` varchar(100) DEFAULT NULL,
  \`code\` varchar(100) DEFAULT NULL,
  \`name\` varchar(255) DEFAULT NULL,
  \`qty\` decimal(15,2) DEFAULT 0.00,
  \`option_type\` varchar(100) DEFAULT NULL,
  \`remark\` text DEFAULT NULL,
  \`day_qty\` decimal(15,2) DEFAULT 0.00,
  \`total_qty\` decimal(15,2) DEFAULT 0.00,
  \`created_by\` int(11) DEFAULT NULL,
  \`created_at\` datetime DEFAULT current_timestamp(),
  \`updated_at\` datetime DEFAULT current_timestamp(),
  \`account_id\` int(11) DEFAULT NULL,
  \`member_id\` int(11) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`company_id\` (\`company_id\`),
  CONSTRAINT \`bardan_entry_ibfk_1\` FOREIGN KEY (\`company_id\`) REFERENCES \`company\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);
      const cols = [{"field":"company_id","type":"int(11)","options":" NOT NULL"},{"field":"financial_year","type":"varchar(20)","options":" NOT NULL DEFAULT '2026-27'"},{"field":"book_type","type":"varchar(50)","options":""},{"field":"pavti_no","type":"varchar(100)","options":""},{"field":"entry_date","type":"date","options":" NOT NULL"},{"field":"mem_nominal","type":"varchar(100)","options":""},{"field":"code","type":"varchar(100)","options":""},{"field":"name","type":"varchar(255)","options":""},{"field":"qty","type":"decimal(15,2)","options":" DEFAULT '0.00'"},{"field":"option_type","type":"varchar(100)","options":""},{"field":"remark","type":"text","options":""},{"field":"day_qty","type":"decimal(15,2)","options":" DEFAULT '0.00'"},{"field":"total_qty","type":"decimal(15,2)","options":" DEFAULT '0.00'"},{"field":"created_by","type":"int(11)","options":""},{"field":"created_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"},{"field":"updated_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"},{"field":"account_id","type":"int(11)","options":""},{"field":"member_id","type":"int(11)","options":""}];
      for (const col of cols) { await addColumn(connection, 'bardan_entry', col.field, col.type, col.options); }
    }
    console.log('🧹 Clearing table: bardan_entry...');
    await connection.query('TRUNCATE TABLE bardan_entry');
    console.log('📥 Inserting 2 rows into bardan_entry...');
    await connection.query(
      `INSERT INTO bardan_entry (id, company_id, financial_year, book_type, pavti_no, entry_date, mem_nominal, code, name, qty, option_type, remark, day_qty, total_qty, created_by, created_at, updated_at, account_id, member_id) VALUES 
      (7, 2, '2026-27', 'Combo1', '505', '2026-04-28 18:30:00', '', '1', 'ARYAN HERE', '50.00', 'Combo1', '', '0.00', '0.00', NULL, '2026-04-29 06:49:09', '2026-04-29 06:49:09', 6, 6),
      (8, 2, '2026-27', 'Combo1', '12345', '2026-04-28 18:30:00', '', '1', 'ARYAN HERE', '50.00', 'Combo1', '', '0.00', '0.00', NULL, '2026-04-29 09:09:48', '2026-04-29 09:09:48', 6, 6)` 
    );

    if (SYNC_SCHEMA) {
      console.log('🛠  Ensuring table exists: jama_bardan_entry...');
      await connection.query(`CREATE TABLE IF NOT EXISTS \`jama_bardan_entry\` (
  \`id\` int(11) NOT NULL AUTO_INCREMENT,
  \`company_id\` int(11) NOT NULL,
  \`financial_year\` varchar(20) NOT NULL DEFAULT '2026-27',
  \`book_type\` varchar(50) DEFAULT NULL,
  \`pavti_no\` varchar(100) DEFAULT NULL,
  \`entry_date\` date NOT NULL,
  \`mem_nominal\` varchar(100) DEFAULT NULL,
  \`code\` varchar(100) DEFAULT NULL,
  \`name\` varchar(255) DEFAULT NULL,
  \`qty\` decimal(15,2) DEFAULT 0.00,
  \`option_type\` varchar(100) DEFAULT NULL,
  \`remark\` text DEFAULT NULL,
  \`day_qty\` decimal(15,2) DEFAULT 0.00,
  \`total_qty\` decimal(15,2) DEFAULT 0.00,
  \`created_by\` int(11) DEFAULT NULL,
  \`created_at\` datetime DEFAULT current_timestamp(),
  \`updated_at\` datetime DEFAULT current_timestamp(),
  \`account_id\` int(11) DEFAULT NULL,
  \`member_id\` int(11) DEFAULT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`company_id\` (\`company_id\`),
  CONSTRAINT \`jama_bardan_entry_ibfk_1\` FOREIGN KEY (\`company_id\`) REFERENCES \`company\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);
      const cols = [{"field":"company_id","type":"int(11)","options":" NOT NULL"},{"field":"financial_year","type":"varchar(20)","options":" NOT NULL DEFAULT '2026-27'"},{"field":"book_type","type":"varchar(50)","options":""},{"field":"pavti_no","type":"varchar(100)","options":""},{"field":"entry_date","type":"date","options":" NOT NULL"},{"field":"mem_nominal","type":"varchar(100)","options":""},{"field":"code","type":"varchar(100)","options":""},{"field":"name","type":"varchar(255)","options":""},{"field":"qty","type":"decimal(15,2)","options":" DEFAULT '0.00'"},{"field":"option_type","type":"varchar(100)","options":""},{"field":"remark","type":"text","options":""},{"field":"day_qty","type":"decimal(15,2)","options":" DEFAULT '0.00'"},{"field":"total_qty","type":"decimal(15,2)","options":" DEFAULT '0.00'"},{"field":"created_by","type":"int(11)","options":""},{"field":"created_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"},{"field":"updated_at","type":"datetime","options":" DEFAULT 'current_timestamp()'"},{"field":"account_id","type":"int(11)","options":""},{"field":"member_id","type":"int(11)","options":""}];
      for (const col of cols) { await addColumn(connection, 'jama_bardan_entry', col.field, col.type, col.options); }
    }
    console.log('🧹 Clearing table: jama_bardan_entry...');
    await connection.query('TRUNCATE TABLE jama_bardan_entry');
    console.log('📥 Inserting 3 rows into jama_bardan_entry...');
    await connection.query(
      `INSERT INTO jama_bardan_entry (id, company_id, financial_year, book_type, pavti_no, entry_date, mem_nominal, code, name, qty, option_type, remark, day_qty, total_qty, created_by, created_at, updated_at, account_id, member_id) VALUES 
      (9, 2, '2026-27', 'J', 'D00002', '2026-04-28 18:30:00', 'S', '1', 'ARYAN HERE', '21.00', NULL, 'Dangar Settlement SR: D00002', '0.00', '0.00', NULL, '2026-04-29 06:49:43', '2026-04-29 06:49:43', 6, 6),
      (10, 2, '2026-27', 'J', 'D00003', '2026-04-28 18:30:00', 'S', '1', 'ARYAN HERE', '4.00', NULL, 'Dangar Settlement SR: D00003', '0.00', '0.00', NULL, '2026-04-29 09:08:00', '2026-04-29 09:08:00', 6, 6),
      (11, 2, '2026-27', 'J', 'D00004', '2026-04-28 18:30:00', 'S', '1', 'ARYAN HERE', '4.00', NULL, 'Dangar Settlement SR: D00004', '0.00', '0.00', NULL, '2026-04-29 09:38:44', '2026-04-29 09:38:44', 6, 6)` 
    );


    console.log('✅ Re-enabling Foreign Key Checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🎉 Full System Seeded Successfully!');
  } catch (error) {
    console.error('❌ Error during full seeding:', error);
  } finally {
    await connection.end();
  }
}

runFullSeed();
