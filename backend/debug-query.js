import mysql from 'mysql2/promise';

async function debugQuery() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'superstore_local'
  });

  try {
    const connection = await pool.getConnection();
    
    console.log('🔍 Debugging queryOne behavior...\n');

    // Test 1: Simple query
    console.log('Test 1: SELECT id FROM company LIMIT 1');
    const [rows1] = await connection.query('SELECT id FROM company LIMIT 1');
    console.log('Raw result:', rows1);
    console.log('Length:', rows1.length);
    console.log('Boolean value (if (rows) ?):', rows1 ? 'true' : 'false');

    // Test 2: Check if empty array is truthy
    console.log('\nTest 2: Empty array check');
    const emptyArray = [];
    console.log('if (emptyArray) ?', emptyArray ? 'true' : 'false');
    console.log('if (emptyArray[0]) ?', emptyArray[0] ? 'true' : 'false');

    // Test 3: Count query
    console.log('\nTest 3: SELECT COUNT(*) as total FROM company');
    const [rows3] = await connection.query('SELECT COUNT(*) as total FROM company');
    console.log('Raw result:', rows3);
    console.log('Count:', rows3[0].total);

    connection.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugQuery();
