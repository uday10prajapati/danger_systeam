import { query, execute } from './db.js';

const systemAccounts = [
  {
    account_code: 'DS0001',
    account_name: 'Dangar System',
    account_type: 'System Account',
    is_system: 1,
    is_subledger: 1
  },
  {
    account_code: 'BS0001',
    account_name: 'Bardan System',
    account_type: 'System Account',
    is_system: 1,
    is_subledger: 1
  },
  {
    account_code: 'L0001',
    account_name: 'Member Adv Ac',
    account_type: 'liabilities',
    is_system: 1,
    is_subledger: 1
  },
  {
    account_code: 'SL0001',
    account_name: 'Dangar Sale',
    account_type: 'sales',
    is_system: 0,
    is_subledger: 0
  },
  {
    account_code: 'P0001',
    account_name: 'Dangar Purchase',
    account_type: 'purchase',
    is_system: 0,
    is_subledger: 0
  },
  {
    account_code: 'RK0001',
    account_name: 'Rounding Khate',
    account_type: 'System Account',
    is_system: 1,
    is_subledger: 1
  },
  {
    account_code: 'BK0001',
    account_name: 'Brokerage Khate',
    account_type: 'System Account',
    is_system: 1,
    is_subledger: 1
  },
  {
    account_code: 'IK0001',
    account_name: 'Interest Khate',
    account_type: 'System Account',
    is_system: 1,
    is_subledger: 1
  },
  {
    account_code: 'LK0001',
    account_name: 'Labour Khate',
    account_type: 'System Account',
    is_system: 1,
    is_subledger: 1
  },
  {
    account_code: 'CS0001',
    account_name: 'Cash Account',
    account_type: 'System Account',
    is_system: 1,
    is_subledger: 0
  }
];

async function seedAccounts() {
  try {
    // 1. Get the primary company ID
    const companies = await query('SELECT id FROM company ORDER BY id ASC LIMIT 1');
    if (companies.length === 0) {
      console.error('❌ No company found. Please create a company first.');
      process.exit(1);
    }
    const companyId = companies[0].id;
    console.log(`🚀 Seeding system accounts for Company ID: ${companyId}`);

    for (const acc of systemAccounts) {
      // Check if account already exists by code
      const existing = await query('SELECT id FROM accounts WHERE account_code = ? AND company_id = ?', [acc.account_code, companyId]);
      
      if (existing.length === 0) {
        await execute(
          `INSERT INTO accounts (company_id, account_name, account_type, account_code, is_system, is_subledger) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [companyId, acc.account_name, acc.account_type, acc.account_code, acc.is_system, acc.is_subledger]
        );
        console.log(`✅ Created: ${acc.account_name} (${acc.account_code})`);
      } else {
        // Update existing to ensure correct names/types
        await execute(
          `UPDATE accounts SET account_name = ?, account_type = ?, is_system = ?, is_subledger = ? 
           WHERE account_code = ? AND company_id = ?`,
          [acc.account_name, acc.account_type, acc.is_system, acc.is_subledger, acc.account_code, companyId]
        );
        console.log(`ℹ️ Updated: ${acc.account_name} (${acc.account_code})`);
      }
    }

    console.log('✨ System accounts synchronization complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding accounts:', error);
    process.exit(1);
  }
}

seedAccounts();
