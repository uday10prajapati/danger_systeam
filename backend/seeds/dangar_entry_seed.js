
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

async function seed_dangar_entry() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  try {
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


    console.log('✅ Table dangar_entry seeded!');
  } catch (err) {
    console.error('❌ Error seeding dangar_entry:', err);
  } finally {
    await connection.end();
  }
}

seed_dangar_entry();
