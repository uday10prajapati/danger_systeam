import bcrypt from 'bcrypt';
import { query, execute, initializeDatabase } from './db.js';

const ADMIN = {
  username: 'Admin',
  email:    'admin@danger.com',
  password: 'admin123',
  role:     'admin',
};

const COMPANY = {
  company_name:          'Danger Systeam',
  address:               '123, Main Street, Gujarat',
  phone:                 '9999999999',
  email:                 'company@danger.com',
  gst_number:            null,
  financial_year_start:  '2026-04-01',
  financial_year_end:    '2027-03-31',
  currency:              'INR',
  logo_url:              null,
};

const FINANCIAL_YEAR = {
  year_label: '2026-27',
  start_date: '2026-04-01',
  end_date:   '2027-03-31',
};

async function seed() {
  try {
    console.log('🔄 Initializing Database Schema...');
    await initializeDatabase();
    
    // 1. Create Company
    console.log('🏢 Checking for Company...');
    const existing = await query('SELECT id FROM company LIMIT 1');
    let companyId;

    if (existing.length > 0) {
      companyId = existing[0].id;
      console.log(`ℹ️ Company already exists (ID: ${companyId})`);
    } else {
      const result = await execute(
        `INSERT INTO company
           (company_name, address, phone, email, gst_number,
            financial_year_start, financial_year_end, currency, logo_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [
          COMPANY.company_name, COMPANY.address, COMPANY.phone,
          COMPANY.email, COMPANY.gst_number,
          COMPANY.financial_year_start, COMPANY.financial_year_end,
          COMPANY.currency, COMPANY.logo_url,
        ]
      );
      companyId = result.lastID;
      console.log(`✅ Company created (ID: ${companyId})`);
    }

    // 2. Financial Year
    console.log('📅 Checking for Financial Year...');
    const yearRows = await query(
      'SELECT id FROM financial_years WHERE company_id = ? AND year_label = ?',
      [companyId, FINANCIAL_YEAR.year_label]
    );

    if (yearRows.length > 0) {
      console.log(`ℹ️ Financial year ${FINANCIAL_YEAR.year_label} already exists.`);
    } else {
      await execute(
        `INSERT INTO financial_years (company_id, year_label, start_date, end_date, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [companyId, FINANCIAL_YEAR.year_label, FINANCIAL_YEAR.start_date, FINANCIAL_YEAR.end_date]
      );
      console.log(`✅ Financial year ${FINANCIAL_YEAR.year_label} created.`);
    }

    // 3. Admin User
    console.log('👤 Checking for Admin User...');
    const userRows = await query(
      'SELECT id FROM users WHERE email = ?',
      [ADMIN.email]
    );

    if (userRows.length > 0) {
      console.log(`ℹ️ Admin user already exists (${ADMIN.email}).`);
    } else {
      const hashedPassword = await bcrypt.hash(ADMIN.password, 10);
      await execute(
        `INSERT INTO users (company_id, username, email, password, role, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [companyId, ADMIN.username, ADMIN.email, hashedPassword, ADMIN.role]
      );
      console.log(`✅ Admin user created.`);
    }

    console.log('\n✨ Seeding Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('   Email    : admin@danger.com');
    console.log('   Password : admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
