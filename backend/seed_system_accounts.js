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
  },
  {
    account_code: 'GF0001',
    account_name: 'Dangar Godown Fund Account',
    account_type: 'System Account',
    is_system: 1,
    is_subledger: 1
  }
];

export async function seedSystemAccounts() {
  try {
    // 1. Get all companies
    const companies = await query('SELECT id, company_name FROM company');
    if (companies.length === 0) {
      console.warn('⚠️ No companies found. System accounts cannot be seeded.');
      return;
    }

    console.log(`🚀 Starting system accounts seeding for ${companies.length} companies...`);

    for (const company of companies) {
      console.log(`\n🏢 Company: ${company.company_name} (ID: ${company.id})`);
      
      for (const acc of systemAccounts) {
        // Check if account already exists by code for this company
        const existing = await query(
          'SELECT id FROM accounts WHERE account_code = ? AND company_id = ?', 
          [acc.account_code, company.id]
        );
        
        if (existing.length === 0) {
          await execute(
            `INSERT INTO accounts (company_id, account_name, account_type, account_code, is_system, is_subledger, is_active) 
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [company.id, acc.account_name, acc.account_type, acc.account_code, acc.is_system, acc.is_subledger]
          );
          console.log(`✅ Created: ${acc.account_name} (${acc.account_code})`);
        } else {
          // Update existing to ensure correct metadata
          await execute(
            `UPDATE accounts SET account_name = ?, account_type = ?, is_system = ?, is_subledger = ? 
             WHERE id = ?`,
            [acc.account_name, acc.account_type, acc.is_system, acc.is_subledger, existing[0].id]
          );
          console.log(`ℹ️ Verified/Updated: ${acc.account_name} (${acc.account_code})`);
        }
      }
    }

    console.log('\n✨ System accounts synchronization complete.');
  } catch (error) {
    console.error('❌ Error seeding system accounts:', error);
    throw error;
  }
}

// If run directly
if (process.argv[1].endsWith('seed_system_accounts.js')) {
  seedSystemAccounts()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
