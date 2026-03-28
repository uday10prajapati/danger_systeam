import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

console.log('\n🔍 === DIAGNOSTIC: Database Connection Check ===\n');

console.log('📋 Environment Variables:');
console.log('  DB_HOST:', process.env.DB_HOST);
console.log('  DB_USER:', process.env.DB_USER);
console.log('  DB_NAME:', process.env.DB_NAME);
console.log('  NODE_ENV:', process.env.NODE_ENV);

console.log('\n🔧 Fallback Configuration:');
const dbConfig = {
  host: process.env.DB_HOST || '195.250.20.82',
  user: process.env.DB_USER || 'superuser',
  password: process.env.DB_PASSWORD || 'Sandjtech@6099',
  database: process.env.DB_NAME || 'superstore',
};
console.log('  Host:', dbConfig.host);
console.log('  User:', dbConfig.user);
console.log('  Database:', dbConfig.database);

console.log('\n🔗 Attempting to connect...\n');

const pool = mysql.createPool(dbConfig);

async function check() {
  const connection = await pool.getConnection();
  try {
    // Check connection
    const [result] = await connection.query('SELECT 1 as alive');
    console.log('✅ Connection successful!');

    // Check company table
    const [companies] = await connection.query('SELECT COUNT(*) as count FROM company');
    console.log(`📊 Company count: ${companies[0]?.count || 0}`);

    if ((companies[0]?.count || 0) > 0) {
      const [companyData] = await connection.query('SELECT * FROM company LIMIT 1');
      console.log('\n✅ Company found:');
      console.log(`  Name: ${companyData[0].company_name}`);
      console.log(`  Email: ${companyData[0].email}`);
    } else {
      console.log('\n❌ No company in database!');
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.code === 'ER_ACCESS_DENIED_FOR_USER') {
      console.log('   → Wrong credentials for this host');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   → Cannot reach host - is it running?');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('   → Database does not exist on this host');
    }
  } finally {
    connection.release();
    await pool.end();
    process.exit(0);
  }
}

check();
