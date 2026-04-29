
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

async function seed_company() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  try {
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


    console.log('✅ Table company seeded!');
  } catch (err) {
    console.error('❌ Error seeding company:', err);
  } finally {
    await connection.end();
  }
}

seed_company();
