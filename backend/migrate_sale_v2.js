
import { execute } from './db.js';
async function migrate() {
  try {
    console.log('--- Migrating sales table ---');
    await execute(`ALTER TABLE sales 
      ADD COLUMN IF NOT EXISTS brokerage_percent DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS brokerage_amount DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS labour_charge DECIMAL(10,2) DEFAULT 0.00`);
    
    console.log('--- Migrating sale_items table ---');
    await execute(`ALTER TABLE sale_items 
      ADD COLUMN IF NOT EXISTS weight DECIMAL(10,3) DEFAULT 0.000`);
    
    console.log('✅ Migration successful');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}
migrate();
