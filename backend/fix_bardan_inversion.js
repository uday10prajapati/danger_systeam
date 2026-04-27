import { execute, queryOne } from './db.js';

async function fixBardanInversion() {
  try {
    console.log('--- Correcting Bardan Inversion for PVT: D00004 ---');
    
    // 1. Fetch current state
    const entry = await queryOne('SELECT id, qty, code FROM jama_bardan_entry WHERE pavti_no = "D00004"');
    if (!entry) {
      console.log('Entry D00004 not found in Jama Bardan Registry.');
      process.exit(0);
    }
    
    console.log(`Found entry: ID ${entry.id}, Current Credit: ${entry.qty}, Member Code: ${entry.code}`);

    if (parseFloat(entry.qty) === 98) {
      console.log('Confirmed inversion: Entry shows 98 credited instead of 2. Correcting...');
      await execute('UPDATE jama_bardan_entry SET qty = 2 WHERE id = ?', [entry.id]);
      console.log('✅ Entry D00004 corrected to 2 bags.');
    } else {
      console.log('Entry does not appear inverted (Qty is not 98). No action taken.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Repair Failed:', error);
    process.exit(1);
  }
}

fixBardanInversion();
