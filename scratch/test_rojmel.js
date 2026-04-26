
import mysql from 'mysql2/promise';

async function test() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'danger_systeam'
  });

  const companyId = 1; 
  const date = '2026-04-26'; 

  console.log('--- Testing Rojmel Fetch ---');
  const [rows] = await connection.execute(
    'SELECT id, transaction_date, reference_no, reference_type, description, notes, cash_in, cash_out FROM cash_book WHERE company_id = ? AND transaction_date = ?',
    [companyId, date]
  );
  
  console.log('Transactions found:', rows.length);
  rows.forEach(r => {
    console.log(`[${r.reference_type}] ${r.description}: In=${r.cash_in}, Out=${r.cash_out}`);
  });

  await connection.end();
}

test();
