import { execSync } from 'child_process';
import db from './db.js'; // to get connection if needed
import { initializeDatabase } from './db.js';

const scripts = [
  'migrate-add-accounts.js',
  'migrate-add-account-ledger.js',
  'migrate-add-customer-ledger.js',
  'migrate-add-cash-book.js',
  'migrate-add-customer-balance.js',
  'migrate-add-company-id.js',
  'migrate-add-gst-tin.js',
  'migrate-add-gst.js',
  'migrate-add-item-rates.js',
  'migrate-add-items.js',
  'migrate-add-members.js',
  'migrate-add-purchases.js',
  'migrate-add-purchase-returns.js',
  'migrate-add-sales.js',
  'migrate-add-sale-returns.js',
  'migrate-member-code.js'
];

async function run() {
  console.log('Initializing main DB structure...');
  await initializeDatabase();
  console.log('Main DB structure done.');
  
  for (const script of scripts) {
    console.log(`\n--- Running ${script} ---`);
    try {
      execSync(`node ${script}`, { stdio: 'inherit' });
    } catch (err) {
      console.error(`Error running ${script}:`, err.message);
    }
  }
  console.log('--- ALL DONE ---');
  process.exit(0);
}

run();
