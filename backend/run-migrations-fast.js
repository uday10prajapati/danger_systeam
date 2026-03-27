import { execSync } from 'child_process';

const scripts = [
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
  for (const script of scripts) {
    console.log(`\n--- Running ${script} ---`);
    try {
      execSync(`node ${script}`, { stdio: 'inherit', timeout: 3000, killSignal: 'SIGKILL' });
    } catch (err) {
      if (err.code === 'ETIMEDOUT') {
        console.log(`${script}: finished and killed due to timeout (hanging pool).`);
      } else {
        console.error(`Error running ${script}:`, err.message);
      }
    }
  }
  console.log('--- ALL DONE ---');
  process.exit(0);
}

run();
