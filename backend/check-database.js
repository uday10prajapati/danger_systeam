import mysql from 'mysql2/promise';

async function checkDatabase() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'superstore_local'
  });

  try {
    const connection = await pool.getConnection();
    
    console.log('🔍 Checking database contents...\n');

    // Check company table
    console.log('=== COMPANY TABLE ===');
    const [companies] = await connection.query('SELECT * FROM company');
    console.log(`Found ${companies.length} companies`);
    if (companies.length > 0) {
      console.table(companies);
    }

    // Check raw count
    console.log('\n=== RAW COUNT ===');
    const [count] = await connection.query('SELECT COUNT(*) as total FROM company');
    console.log('Total companies in database:', count[0].total);

    connection.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
