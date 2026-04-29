
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

async function seed_member_master() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  try {
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


    console.log('✅ Table member_master seeded!');
  } catch (err) {
    console.error('❌ Error seeding member_master:', err);
  } finally {
    await connection.end();
  }
}

seed_member_master();
