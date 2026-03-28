import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Local database (EXE/Electron)
const localDb = mysql.createPool({
  host: process.env.DB_HOST || '195.250.20.82',
  user: process.env.DB_USER || 'superuser',
  password: process.env.DB_PASSWORD || 'Sandjtech@6099',
  database: process.env.DB_NAME || 'superstore',
});

async function getCompanyData() {
  const connection = await localDb.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM company LIMIT 1');
    return rows[0] || null;
  } finally {
    connection.release();
  }
}

async function main() {
  try {
    console.log('🔍 Checking company data in local database...');
    const company = await getCompanyData();

    if (!company) {
      console.log('❌ No company found in local database. Please create a company first in the EXE app.');
      process.exit(1);
    }

    console.log('✅ Found company:');
    console.log(JSON.stringify(company, null, 2));
    console.log('\n📋 Company Details:');
    console.log(`  Name: ${company.company_name}`);
    console.log(`  Email: ${company.email}`);
    console.log(`  Phone: ${company.phone}`);
    console.log(`  Address: ${company.address}`);
    console.log(`  GST: ${company.gst_number || 'Not provided'}`);
    console.log(`  Currency: ${company.currency}`);
    console.log(`  Financial Year: ${company.financial_year_start} to ${company.financial_year_end}`);

    console.log('\n✨ Company data exists! Both EXE and deployed web should now show the same data.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await localDb.end();
  }
}

main();
