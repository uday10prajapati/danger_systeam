
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const SYNC_SCHEMA = true;

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

async function seed_account_ledger() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  try {
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


    console.log('✅ Table account_ledger seeded!');
  } catch (err) {
    console.error('❌ Error seeding account_ledger:', err);
  } finally {
    await connection.end();
  }
}

seed_account_ledger();
