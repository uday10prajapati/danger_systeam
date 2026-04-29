import { query, execute } from './db.js';

const newSystemAccounts = [
  { code: 'DS0001', name: 'Dangar System', type: 'System Account', is_system: 1, is_subledger: 1 },
  { code: 'BS0001', name: 'Bardan System', type: 'System Account', is_system: 1, is_subledger: 1 },
  { code: 'L0001', name: 'Member Advance Account', type: 'liabilities', is_system: 1, is_subledger: 1 },
  { code: 'P0001', name: 'Dangar Purchase', type: 'purchase', is_system: 1, is_subledger: 0 },
  { code: 'S0001', name: 'Dangar Sale', type: 'sales', is_system: 1, is_subledger: 0 },
  { code: 'IK0001', name: 'Interest Account', type: 'System Account', is_system: 1, is_subledger: 1 },
  { code: 'BK0001', name: 'Brokerage Account', type: 'System Account', is_system: 1, is_subledger: 1 },
  { code: 'RK0001', name: 'Rounding Account', type: 'System Account', is_system: 1, is_subledger: 1 },
  { code: 'LK0001', name: 'Labour Account', type: 'System Account', is_system: 1, is_subledger: 1 },
  { code: 'CS0001', name: 'Cash Account', type: 'System Account', is_system: 1, is_subledger: 0 }
];

async function resetSystemAccounts() {
  try {
    // 1. Get Company ID
    const companies = await query('SELECT id FROM company ORDER BY id ASC LIMIT 1');
    if (companies.length === 0) {
      console.error('❌ No company found.');
      process.exit(1);
    }
    const companyId = companies[0].id;

    console.log(`🚀 Synchronizing system accounts for Company ID: ${companyId}...`);
    
    for (const acc of newSystemAccounts) {
      // Check if account already exists by code
      const existing = await query('SELECT id FROM accounts WHERE account_code = ? AND company_id = ?', [acc.code, companyId]);
      
      if (existing.length === 0) {
        await execute(
          `INSERT INTO accounts (company_id, account_name, account_type, account_code, is_system, is_subledger) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [companyId, acc.name, acc.type, acc.code, acc.is_system, acc.is_subledger]
        );
        console.log(`✅ Created: ${acc.name} (${acc.code})`);
      } else {
        await execute(
          `UPDATE accounts SET account_name = ?, account_type = ?, is_system = ?, is_subledger = ? 
           WHERE account_code = ? AND company_id = ?`,
          [acc.name, acc.type, acc.is_system, acc.is_subledger, acc.code, companyId]
        );
        console.log(`ℹ️ Updated: ${acc.name} (${acc.code})`);
      }
    }

    // Optional: Remove old system accounts that are NOT in the new list
    const newCodes = newSystemAccounts.map(a => a.code);
    const oldSystemAccounts = await query(
      `SELECT id, account_name, account_code FROM accounts 
       WHERE company_id = ? AND is_system = 1 AND account_code NOT IN (${newCodes.map(() => '?').join(',')})`,
      [companyId, ...newCodes]
    );

    for (const oldAcc of oldSystemAccounts) {
       try {
         await execute('DELETE FROM accounts WHERE id = ?', [oldAcc.id]);
         console.log(`🗑️ Removed old system account: ${oldAcc.account_name} (${oldAcc.account_code})`);
       } catch (fkErr) {
         console.log(`⚠️ Could not remove ${oldAcc.account_name} due to existing ledger entries. Marking as inactive instead.`);
         await execute('UPDATE accounts SET is_active = 0, is_system = 0 WHERE id = ?', [oldAcc.id]);
       }
    }

    console.log('✨ System accounts reset complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting accounts:', error);
    process.exit(1);
  }
}

resetSystemAccounts();
