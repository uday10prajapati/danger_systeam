
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
        const [rows] = await connection.query('SELECT * FROM account_ledger WHERE reference_type = "dangar_entry"');
        console.table(rows);
        await connection.end();
    } catch (err) {
        console.error(err);
    }
}
check();
