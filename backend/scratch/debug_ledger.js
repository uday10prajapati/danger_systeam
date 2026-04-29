
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
        const [rows] = await connection.query('SELECT id, member_name FROM member_master WHERE member_code = "1"');
        console.table(rows);
        
        if (rows.length > 0) {
            const memberId = rows[0].id;
            const [ledger] = await connection.query('SELECT account_id, debit, credit, description FROM account_ledger WHERE member_id = ?', [memberId]);
            console.table(ledger);
        }
        await connection.end();
    } catch (err) {
        console.error(err);
    }
}
check();
