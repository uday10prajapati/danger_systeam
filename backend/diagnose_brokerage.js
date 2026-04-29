import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function diagnose() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- ACCOUNT CHECK ---');
        const [accounts] = await connection.query('SELECT id, account_code, account_name, company_id FROM accounts WHERE account_name LIKE "%Brokerage%"');
        console.table(accounts);

        if (accounts.length > 0) {
            for (const acc of accounts) {
                console.log(`\n--- ENTRIES FOR ACCOUNT ${acc.id} (${acc.account_name}) ---`);
                const [entries] = await connection.query('SELECT id, transaction_date, debit, credit, description, member_id FROM account_ledger WHERE account_id = ?', [acc.id]);
                console.table(entries);
            }
        } else {
            console.log('No brokerage accounts found by name.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

diagnose();
