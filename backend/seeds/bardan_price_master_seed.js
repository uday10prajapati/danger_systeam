
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

async function seed_bardan_price_master() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  try {
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


    console.log('✅ Table bardan_price_master seeded!');
  } catch (err) {
    console.error('❌ Error seeding bardan_price_master:', err);
  } finally {
    await connection.end();
  }
}

seed_bardan_price_master();
