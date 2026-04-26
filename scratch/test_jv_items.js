
import mysql from 'mysql2/promise';

async function test() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'danger_systeam'
  });

  const voucherId = 7;

  console.log('--- Testing JV Items ---');
  const [rows] = await connection.execute(
    'SELECT i.*, a.account_name, a.account_type FROM journal_voucher_items i JOIN accounts a ON i.account_id = a.id WHERE i.voucher_id = ?',
    [voucherId]
  );
  
  console.log('Items found:', rows.length);
  rows.forEach(r => {
    console.log(`[${r.type}] Account: ${r.account_name} (${r.account_type}), Amt: ${r.amount}`);
  });

  await connection.end();
}

test();
