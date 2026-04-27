import { query, execute } from './db.js';

async function fixLedger() {
  try {
    console.log('--- Starting Ledger Repair Sequence ---');
    
    // 1. Fetch all dangar entries
    const dangarEntries = await query(`
      SELECT de.id as entry_id, im.purchase_account_id 
      FROM dangar_entry de
      JOIN item_master im ON de.item_id = im.id
    `);
    
    console.log(`Found ${dangarEntries.length} dangar entries to verify.`);

    let fixedCount = 0;
    for (const entry of dangarEntries) {
      if (!entry.purchase_account_id) continue;

      const [result] = await execute(`
        UPDATE account_ledger 
        SET account_id = ? 
        WHERE (reference_id = ? OR reference_no LIKE ?)
          AND reference_type = 'cash_book' 
          AND account_id IS NULL
      `, [entry.purchase_account_id, entry.entry_id, `%${entry.entry_id}%`]);
      
      if (result && result.affectedRows > 0) {
         fixedCount += result.affectedRows;
      }
    }

    console.log(`Successfully repaired ${fixedCount} ledger entries.`);
    process.exit(0);
  } catch (error) {
    console.error('Repair Failed:', error);
    process.exit(1);
  }
}

fixLedger();
