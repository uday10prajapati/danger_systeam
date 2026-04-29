import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const TABLES_TO_EXPORT = [
  'company',
  'accounts',
  'member_master',
  'village',
  'bardan_price_master',
  'dangar_entry',
  'account_ledger',
  'bardan_entry',
  'jama_bardan_entry'
];

async function generateSeed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  console.log('🚀 Starting Data Export for Seeding...');
  
  const seedsDir = path.join(process.cwd(), 'seeds');
  if (!fs.existsSync(seedsDir)) fs.mkdirSync(seedsDir);

  let fullSeedContent = `
/**
 * AUTO-GENERATED FULL SEED FILE
 * Generated on: ${new Date().toLocaleString()}
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function addColumn(connection, table, col, type, options = "") {
  try {
    const [cols] = await connection.query(\`SHOW COLUMNS FROM \${table} LIKE ?\`, [col]);
    if (cols.length === 0) {
      console.log(\`🛠  Adding missing column [\${col}] to [\${table}]...\`);
      await connection.query(\`ALTER TABLE \${table} ADD COLUMN \${col} \${type} \${options}\`);
    }
  } catch (e) {
    console.error(\`⚠️ Error adding column \${col}: \`, e.message);
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
`;

  for (const table of TABLES_TO_EXPORT) {
    console.log(`📦 Exporting table: ${table}...`);
    const [rows] = await connection.query(`SELECT * FROM ${table}`);
    
    if (rows.length === 0) {
      console.log(`⚠️  Table ${table} is empty. Skipping.`);
      continue;
    }

    const [createTableInfo] = await connection.query(`SHOW CREATE TABLE ${table}`);
    const createStmt = createTableInfo[0]['Create Table']
      .replace('CREATE TABLE', 'CREATE TABLE IF NOT EXISTS')
      .replace(/`/g, '\\`'); // Escape backticks for JS template literal
    const [columnsInfo] = await connection.query(`SHOW COLUMNS FROM ${table}`);
    
    let tableSeedContent = `
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const SYNC_SCHEMA = true;

async function addColumn(connection, table, col, type, options = "") {
  try {
    const [cols] = await connection.query(\`SHOW COLUMNS FROM \${table} LIKE ?\`, [col]);
    if (cols.length === 0) {
      console.log(\`🛠  Adding missing column [\${col}] to [\${table}]...\`);
      await connection.query(\`ALTER TABLE \${table} ADD COLUMN \${col} \${type} \${options}\`);
    }
  } catch (e) {
    console.error(\`⚠️ Error adding column \${col}: \`, e.message);
  }
}

async function seed_${table}() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  try {
    if (SYNC_SCHEMA) {
      console.log('🛠  Ensuring table exists: ${table}...');
      await connection.query(\`${createStmt}\`);
`;

    // Add to full seed
    fullSeedContent += `    if (SYNC_SCHEMA) {\n`;
    fullSeedContent += `      console.log('🛠  Ensuring table exists: ${table}...');\n`;
    fullSeedContent += `      await connection.query(\`${createStmt}\`);\n`;

    const colsToSync = columnsInfo.filter(c => c.Field !== 'id').map(c => ({
      field: c.Field,
      type: c.Type,
      options: `${c.Null === 'YES' ? '' : ' NOT NULL'}${c.Default === null ? '' : ` DEFAULT '${c.Default}'`}`
    }));

    const syncBlock = `      const cols = ${JSON.stringify(colsToSync)};\n      for (const col of cols) { await addColumn(connection, '${table}', col.field, col.type, col.options); }\n`;
    
    tableSeedContent += syncBlock;
    fullSeedContent += syncBlock;
    
    tableSeedContent += `    }\n`;
    fullSeedContent += `    }\n`;

    tableSeedContent += `
    console.log('🧹 Clearing table: ${table}...');
    await connection.query('TRUNCATE TABLE ${table}');
    console.log('📥 Inserting ${rows.length} rows into ${table}...');
`;

    // Add to full seed
    fullSeedContent += `    console.log('🧹 Clearing table: ${table}...');\n`;
    fullSeedContent += `    await connection.query('TRUNCATE TABLE ${table}');\n`;
    fullSeedContent += `    console.log('📥 Inserting ${rows.length} rows into ${table}...');\n`;
    
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const columns = Object.keys(chunk[0]).join(', ');
      
      const values = chunk.map(row => {
        return '(' + Object.values(row).map(val => {
          if (val === null) return 'NULL';
          if (typeof val === 'string') return connection.escape(val);
          if (val instanceof Date) return connection.escape(val.toISOString().slice(0, 19).replace('T', ' '));
          return val;
        }).join(', ') + ')';
      }).join(',\n      ');

      const insertStmt = `    await connection.query(\n      \`INSERT INTO ${table} (${columns}) VALUES \n      ${values}\` \n    );\n\n`;
      tableSeedContent += insertStmt;
      fullSeedContent += insertStmt;
    }

    tableSeedContent += `
    console.log('✅ Table ${table} seeded!');
  } catch (err) {
    console.error('❌ Error seeding ${table}:', err);
  } finally {
    await connection.end();
  }
}

seed_${table}();
`;

    fs.writeFileSync(path.join(seedsDir, `${table}_seed.js`), tableSeedContent);
  }

  fullSeedContent += `
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
`;

  fs.writeFileSync(path.join(process.cwd(), 'seed_all_data.js'), fullSeedContent);
  console.log(`✅ All seed files generated successfully in /seeds and /seed_all_data.js`);
  
  await connection.end();
}

generateSeed().catch(console.error);
