import mysql from 'mysql2/promise';

async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
  });

  try {
    console.log('🔧 Setting up database...\n');
    
    // Create database
    console.log('📦 Creating database "superstore_local"...');
    await connection.query('CREATE DATABASE IF NOT EXISTS superstore_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✅ Database created successfully!\n');
    
    // Connect to the new database
    await connection.changeUser({ database: 'superstore_local' });
    console.log('✅ Connected to superstore_local database\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

setupDatabase();
