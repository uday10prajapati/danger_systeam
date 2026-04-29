
import { query } from './db.js';
async function migrate() {
  try {
    await query('ALTER TABLE sales ADD COLUMN driver_name VARCHAR(255) NULL, ADD COLUMN mobile_number VARCHAR(20) NULL, ADD COLUMN gadi_number VARCHAR(50) NULL');
    console.log('Migration successful');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}
migrate();
