/**
 * seed_admin.js
 * ─────────────────────────────────────────────────────────
 * Seeds the database with:
 *   1. A default Company
 *   2. An Admin user
 *   3. A Financial Year (2026-27)
 *
 * Run AFTER MySQL is started:
 *   node backend/seed_admin.js
 *
 * LOGIN CREDENTIALS:
 *   Email    : admin@danger.com
 *   Password : admin123
 *   Year     : 2026-27
 * ─────────────────────────────────────────────────────────
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { config } from 'dotenv';

config(); // load .env if present

const DB = {
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'danger_systeam',
};

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
  let connection;
  try {
    // ── Connect ──────────────────────────────────────────
    console.log(`\n🔌 Connecting to MySQL at ${DB.host} as ${DB.user}...`);
    connection = await mysql.createConnection(DB);
    console.log('✅ Connected.\n');

    // ── 1. Company ───────────────────────────────────────
    const [existing] = await connection.query('SELECT id FROM company LIMIT 1');
    let companyId;

    if (existing.length > 0) {
      companyId = existing[0].id;
      console.log(`ℹ️  Company already exists (id=${companyId}). Skipping insert.`);
    } else {
      const [result] = await connection.query(
        `INSERT INTO company
           (company_name, address, phone, email, gst_number,
            financial_year_start, financial_year_end, currency, logo_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          COMPANY.company_name, COMPANY.address, COMPANY.phone,
          COMPANY.email, COMPANY.gst_number,
          COMPANY.financial_year_start, COMPANY.financial_year_end,
          COMPANY.currency, COMPANY.logo_url,
        ]
      );
      companyId = result.insertId;
      console.log(`✅ Company created (id=${companyId}).`);
    }

    // ── 2. Financial Year ─────────────────────────────────
    const [yearRows] = await connection.query(
      'SELECT id FROM financial_years WHERE company_id = ? AND year_label = ?',
      [companyId, FINANCIAL_YEAR.year_label]
    );

    if (yearRows.length > 0) {
      console.log(`ℹ️  Financial year ${FINANCIAL_YEAR.year_label} already exists. Skipping.`);
    } else {
      await connection.query(
        `INSERT INTO financial_years (company_id, year_label, start_date, end_date, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [companyId, FINANCIAL_YEAR.year_label, FINANCIAL_YEAR.start_date, FINANCIAL_YEAR.end_date]
      );
      console.log(`✅ Financial year ${FINANCIAL_YEAR.year_label} created.`);
    }

    // ── 3. Admin User ─────────────────────────────────────
    const [userRows] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [ADMIN.email]
    );

    if (userRows.length > 0) {
      console.log(`ℹ️  Admin user already exists (${ADMIN.email}). Skipping.`);
    } else {
      const hashedPassword = await bcrypt.hash(ADMIN.password, 10);
      await connection.query(
        `INSERT INTO users (company_id, username, email, password, role, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [companyId, ADMIN.username, ADMIN.email, hashedPassword, ADMIN.role]
      );
      console.log(`✅ Admin user created.`);
    }

    // ── Done ──────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Seed complete! Use these credentials to login:');
    console.log('   Email    : admin@danger.com');
    console.log('   Password : admin123');
    console.log('   Year     : 2026-27');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('   → MySQL is not running. Please start XAMPP → MySQL first.\n');
    }
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

seed();
