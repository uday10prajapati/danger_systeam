import db from './db.js';

async function checkTables() {
  try {
    const connection = await db.getConnection();
    
    // Get list of tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n📋 Existing Tables:');
    tables.forEach(row => {
      const tableName = Object.values(row)[0];
      console.log(`  - ${tableName}`);
    });

    // Check structure of key tables
    const tablesToCheck = ['company', 'users', 'accounts', 'item_master', 'sales'];
    
    for (const tableName of tablesToCheck) {
      try {
        const [columns] = await connection.query(`DESCRIBE ${tableName}`);
        console.log(`\n📊 Table: ${tableName}`);
        columns.forEach(col => {
          console.log(`  ${col.Field} (${col.Type}) ${col.Key === 'PRI' ? '🔑' : ''}`);
        });
      } catch (err) {
        console.log(`\n⚠️ Table ${tableName} not found`);
      }
    }

    connection.release();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkTables();
