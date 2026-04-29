
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

async function seed_village() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  try {
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


    console.log('✅ Table village seeded!');
  } catch (err) {
    console.error('❌ Error seeding village:', err);
  } finally {
    await connection.end();
  }
}

seed_village();
