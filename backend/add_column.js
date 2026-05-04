import { getConnection } from './db.js';

async function addSeasonColumn() {
  const connection = await getConnection();
  try {
    console.log('Adding season column...');
    await connection.query('ALTER TABLE dangar_entry ADD COLUMN IF NOT EXISTS season VARCHAR(20)');
    console.log('Column added successfully.');
  } catch (err) {
    console.error('Error adding column:', err.message);
  } finally {
    connection.release();
    process.exit(0);
  }
}

addSeasonColumn();
