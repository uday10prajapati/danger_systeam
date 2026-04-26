
import mysql from 'mysql2/promise';

async function test() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'danger_systeam'
  });

  const companyId = 1;

  console.log('--- Testing JV Table ---');
  const [rows] = await connection.execute(
    'SELECT * FROM journal_vouchers WHERE company_id = ? ORDER BY id DESC LIMIT 5',
    [companyId]
  );
  
  console.log('JVs found:', rows.length);
  rows.forEach(r => {
    console.log(`[${r.id}] Date: ${r.voucher_date}, Type: ${r.voucher_type}, Notes: ${r.notes}`);
  });

  await connection.end();
}

test();
