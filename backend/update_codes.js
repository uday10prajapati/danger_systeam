import { query, execute } from './db.js';

async function updateCodes() {
  try {
    const updates = [
      { name: 'rounding khate', code: 'RK0001' },
      { name: 'brokerj khate', code: 'BK0001' },
      { name: 'intrest khate', code: 'IK0001' },
      { name: 'labour khate', code: 'LK0001' }
    ];

    for (const item of updates) {
      await execute('UPDATE accounts SET account_code = ? WHERE account_name = ?', [item.code, item.name]);
      console.log(`Updated ${item.name} with code ${item.code}`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

updateCodes();
