const mysql = require('mysql2/promise');

async function check() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'danger_systeam'
  });

  const [rows] = await connection.query('SELECT account_id, member_id, debit, credit, description FROM account_ledger WHERE reference_type = "dangar_entry" LIMIT 20');
  console.log('--- Ledger Entries ---');
  console.log(JSON.stringify(rows, null, 2));

  await connection.end();
}

check().catch(console.error);
