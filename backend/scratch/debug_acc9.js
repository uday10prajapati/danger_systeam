
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        const [rows] = await connection.query('SELECT id, account_name, account_code FROM accounts WHERE id = 9');
        console.table(rows);
        
        const [ledger] = await connection.query('SELECT * FROM account_ledger WHERE account_id = 9');
        console.log("Total entries in Account 9 ledger:", ledger.length);
        console.table(ledger);
        
        await connection.end();
    } catch (err) {
        console.error(err);
    }
}
check();
