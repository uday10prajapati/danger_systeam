import { execute, query } from './db.js';

async function totalWipe() {
  try {
    console.log('--- ⚠️ INITIALIZING TOTAL DATABASE WIPE ⚠️ ---');
    console.log('White-listed tables: company, users, village');
    
    // 1. Disable Foreign Key Checks to prevent constraint errors during wipe
    await execute('SET FOREIGN_KEY_CHECKS = 0');
    console.log('🔒 Foreign Key Constraints Disabled');

    // 2. Fetch all table names from the database
    const tables = await query("SHOW TABLES");
    const dbNameKey = Object.keys(tables[0])[0];
    const tableNames = tables.map(t => t[dbNameKey]);

    const whitelist = ['company', 'users', 'village'];
    let wipedCount = 0;

    for (const table of tableNames) {
      if (whitelist.includes(table)) {
        console.log(`✅ Keeping Table: ${table}`);
        continue;
      }

      console.log(`🧨 Wiping Table: ${table}...`);
      await execute(`TRUNCATE TABLE ${table}`);
      wipedCount++;
    }

    // 3. Re-enable Foreign Key Checks
    await execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🔓 Foreign Key Constraints Re-enabled');

    console.log(`--- ✨ WIPE COMPLETE: ${wipedCount} tables cleared ✨ ---`);
    process.exit(0);
  } catch (error) {
    console.error('CRITICAL WIPE FAILURE:', error);
    // Safety: ensure FK checks are back on
    await execute('SET FOREIGN_KEY_CHECKS = 1');
    process.exit(1);
  }
}

totalWipe();
