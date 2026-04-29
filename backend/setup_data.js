import { query, execute } from './db.js';
import bcrypt from 'bcrypt';

async function run() {
  try {
    console.log('--- Fixing Database State ---');

    // 1. Ensure company exists
    let company = await query('SELECT * FROM company LIMIT 1');
    let companyId = 1;
    if (company.length === 0) {
      console.log('No company found! Creating default company...');
      const result = await execute("INSERT INTO company (company_name, email, is_active) VALUES ('Default Company', 'admin@danger.com', 1)");
      companyId = result.insertId;
    } else {
      companyId = company[0].id;
    }

    // 2. Setup user with password 'admin123'
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const existingUser = await query('SELECT * FROM users WHERE email = ?', ['admin@danger.com']);
    
    if (existingUser.length > 0) {
      console.log('Updating existing user password to admin123...');
      await execute('UPDATE users SET password = ?, company_id = ? WHERE email = ?', [hashedPassword, companyId, 'admin@danger.com']);
    } else {
      console.log('Creating admin@danger.com user...');
      await execute('INSERT INTO users (company_id, username, email, password, role) VALUES (?, ?, ?, ?, ?)', [companyId, 'Admin', 'admin@danger.com', hashedPassword, 'admin']);
    }

    // 3. Add required system accounts
    const systemAccounts = ['rounding khate', 'brokerj khate', 'intrest khate', 'labour khate'];
    for (const name of systemAccounts) {
      const exists = await query('SELECT id FROM accounts WHERE company_id = ? AND account_name = ?', [companyId, name]);
      if (exists.length === 0) {
        console.log(`Adding system account: ${name}`);
        // Based on db.js migrations, there's likely an is_system column
        await execute(`
          INSERT INTO accounts (company_id, account_name, account_type, is_active, is_system) 
          VALUES (?, ?, 'System Account', 1, 1)
        `, [companyId, name]);
      } else {
        console.log(`System account already exists: ${name}`);
      }
    }

    console.log('--- Database Setup Complete ---');
    process.exit(0);
  } catch (err) {
    console.error('Error during setup:', err);
    process.exit(1);
  }
}

run();
