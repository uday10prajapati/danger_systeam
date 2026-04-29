import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const query = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

async function findInterestEntries() {
  try {
    console.log('🔍 Searching for Interest-related entries in the ledger...');

    // 1. Find all accounts to identify which one is Interest
    const accounts = await query('SELECT id, account_name, account_code FROM accounts');
    console.log('📋 Current Accounts:', accounts);

    // 2. Search for any ledger entry with "Interest" in description
    const entries = await query(`
       SELECT al.*, a.account_name 
       FROM account_ledger al
       LEFT JOIN accounts a ON al.account_id = a.id
       WHERE al.description LIKE "%Interest%" OR al.description LIKE "%Vaj%"
    `);

    console.log(`📈 Found ${entries.length} Interest-related entries.`);
    entries.forEach(e => {
       console.log(`ID: ${e.id} | Date: ${e.transaction_date} | Acc: ${e.account_name} (ID: ${e.account_id}) | Desc: ${e.description} | Member: ${e.member_id}`);
    });

    if (entries.length > 0) {
       const wrongIds = [...new Set(entries.filter(e => e.account_id !== 12).map(e => e.account_id))];
       if (wrongIds.length > 0) {
          console.log(`⚠️ Warning: Interest entries found under wrong Account IDs: ${wrongIds.join(', ')}`);
       }
    } else {
       console.log('❌ No entries found with "Interest" in description.');
    }

  } catch (err) {
    console.error('❌ Search failed:', err);
  } finally {
    db.close();
  }
}

findInterestEntries();
