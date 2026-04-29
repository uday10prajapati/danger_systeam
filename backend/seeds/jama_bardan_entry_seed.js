
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

async function seed_jama_bardan_entry() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  try {
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


    console.log('✅ Table jama_bardan_entry seeded!');
  } catch (err) {
    console.error('❌ Error seeding jama_bardan_entry:', err);
  } finally {
    await connection.end();
  }
}

seed_jama_bardan_entry();
