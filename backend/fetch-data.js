import mysql from 'mysql2/promise';

async function fetchData() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'superstore_db'
  });

  try {
    const connection = await pool.getConnection();
    
    console.log('\n=== COMPANY TABLE ===');
    const companies = await connection.query('SELECT * FROM company');
    console.table(companies[0]);

    console.log('\n=== USERS TABLE ===');
    const users = await connection.query('SELECT * FROM users');
    console.table(users[0]);

    console.log('\n=== ACCOUNTS TABLE ===');
    const accounts = await connection.query('SELECT * FROM accounts');
    console.table(accounts[0]);

    console.log('\n=== ITEM_MASTER TABLE ===');
    const items = await connection.query('SELECT * FROM item_master');
    console.table(items[0]);

    console.log('\n=== SALES TABLE ===');
    const sales = await connection.query('SELECT * FROM sales');
    console.table(sales[0]);

    connection.release();
    await pool.end();
    console.log('\n✅ Data fetched successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fetchData();
