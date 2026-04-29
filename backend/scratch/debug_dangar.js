
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
        const [rows] = await connection.query('SELECT id, account_code, account_name, company_id FROM accounts WHERE account_code = "DS0001" OR account_name = "Dangar System"');
        console.table(rows);
        
        if (rows.length > 0) {
            const accId = rows[0].id;
            const [ledger] = await connection.query('SELECT * FROM account_ledger WHERE account_id = ?', [accId]);
            console.log("Total entries in Dangar System ledger:", ledger.length);
            console.table(ledger.slice(0, 5));
        }
        await connection.end();
    } catch (err) {
        console.error(err);
    }
}
check();
