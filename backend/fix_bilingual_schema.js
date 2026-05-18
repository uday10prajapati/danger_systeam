import { getConnection } from './db.js';

async function fixSchema() {
  const connection = await getConnection();
  try {
    console.log('Fixing database schema for bilingual support...');

    // Add eng_name to village table
    try {
      await connection.query('ALTER TABLE village ADD COLUMN eng_name VARCHAR(255)');
      console.log('Added eng_name to village table.');
    } catch (err) {
      if (err.message.includes('Duplicate column') || err.message.includes('already exists')) {
        console.log('eng_name already exists in village table.');
      } else {
        throw err;
      }
    }

    // Add eng_name to member_master table
    try {
      await connection.query('ALTER TABLE member_master ADD COLUMN eng_name VARCHAR(255)');
      console.log('Added eng_name to member_master table.');
    } catch (err) {
      if (err.message.includes('Duplicate column') || err.message.includes('already exists')) {
        console.log('eng_name already exists in member_master table.');
      } else {
        throw err;
      }
    }

    console.log('Schema fix completed successfully.');
  } catch (err) {
    console.error('Error fixing schema:', err.message);
  } finally {
    connection.release();
    process.exit(0);
  }
}

fixSchema();
