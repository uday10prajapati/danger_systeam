
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

async function seed_accounts() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  try {
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


    console.log('✅ Table accounts seeded!');
  } catch (err) {
    console.error('❌ Error seeding accounts:', err);
  } finally {
    await connection.end();
  }
}

seed_accounts();
