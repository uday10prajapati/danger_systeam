
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
        
        const companyId = 2;
        const targetLedgerAccId = 5;
        const member_id = 8;
        const date = '2026-04-29';
        const entryId = 13;
        const srNo = 'D00001';
        const ledgerDesc = 'Test Dangar';
        const amount = 5000;
        const currentFinancialYear = '2026-27';

        console.log("Attempting manual ledger insert...");
        
        const [result] = await connection.execute(`
          INSERT INTO account_ledger (
            company_id, account_id, member_id, transaction_date, transaction_type, reference_type, 
            reference_id, reference_no, description, credit, financial_year
          ) VALUES (?, ?, ?, ?, 'cash_book', 'dangar_entry', ?, ?, ?, ?, ?)
        `, [
          companyId, targetLedgerAccId, member_id, date, entryId, srNo, ledgerDesc, 
          parseFloat(amount || 0), currentFinancialYear
        ]);
        
        console.log("Insert success!", result);
        await connection.end();
    } catch (err) {
        console.error("Insert FAILED:", err.message);
        console.error(err);
    }
}
check();
