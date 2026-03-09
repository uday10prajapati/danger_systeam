import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'superstore_db',
};

async function migrate() {
  const connection = await mysql.createConnection(config);

  try {
    console.log('🔄 Starting migration...');

    // Check if company_id column exists
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'company_id'`
    );

    if (columns.length === 0) {
      console.log('Adding company_id column to users table...');
      
      // Add company_id column (nullable first)
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN company_id INT AFTER id
      `);
      console.log('✅ Added company_id column');

      // Set default company_id = 1 for existing users
      await connection.query(`
        UPDATE users SET company_id = 1 WHERE company_id IS NULL
      `);
      console.log('✅ Set default company_id to 1 for existing users');

      // Make it NOT NULL
      await connection.query(`
        ALTER TABLE users 
        MODIFY COLUMN company_id INT NOT NULL
      `);
      console.log('✅ Made company_id NOT NULL');

      // Add unique constraint
      await connection.query(`
        ALTER TABLE users 
        ADD UNIQUE KEY unique_username_per_company (company_id, username)
      `);
      console.log('✅ Added unique constraint on (company_id, username)');

      // Add unique constraint on email
      await connection.query(`
        ALTER TABLE users 
        ADD UNIQUE KEY unique_email_per_company (company_id, email)
      `);
      console.log('✅ Added unique constraint on (company_id, email)');

      // Add foreign key constraint
      try {
        await connection.query(`
          ALTER TABLE users 
          ADD CONSTRAINT fk_users_company 
          FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE
        `);
        console.log('✅ Added foreign key constraint');
      } catch (err) {
        console.log('⚠️  Foreign key constraint may already exist:', err.message);
      }

      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('ℹ️  company_id column already exists');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

migrate();
