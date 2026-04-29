
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function repair() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log("🧹 Wiping old dangar entries from ledger...");
        await connection.query('DELETE FROM account_ledger WHERE reference_type = "dangar_entry"');

        console.log("🔍 Scanning Dangar Master for reconciliation...");
        const [entries] = await connection.query(`
            SELECT de.*, mm.member_name, im.purchase_account_id
            FROM dangar_entry de
            LEFT JOIN member_master mm ON de.member_id = mm.id
            LEFT JOIN item_master im ON de.item_id = im.id
        `);

        // Resolve Dangar System Account ID for company 2 (usually 5)
        const [sysAcc] = await connection.query('SELECT id FROM accounts WHERE account_code = "DS0001"');
        const dangarSystemAccountId = sysAcc[0]?.id || 5;

        for (const entry of entries) {
            console.log(`🚀 Balanced Sync for ${entry.sr_no}...`);
            const targetAccId = entry.purchase_account_id || dangarSystemAccountId;
            const ledgerDesc = `Dangar Purchase - ${entry.net_quintal} Qt @ ${entry.rate}`;
            const amount = parseFloat(entry.amount || 0);

            // A. DEBIT THE SYSTEM ACCOUNT (Stock Increase)
            await connection.execute(`
                INSERT INTO account_ledger (
                    company_id, account_id, transaction_date, transaction_type, reference_type, 
                    reference_id, reference_no, description, debit, financial_year
                ) VALUES (?, ?, ?, 'cash_book', 'dangar_entry', ?, ?, ?, ?, ?)
            `, [
                entry.company_id, targetAccId, entry.entry_date, entry.id, entry.sr_no, ledgerDesc, 
                amount, entry.financial_year || '2026-27'
            ]);

            // B. CREDIT THE MEMBER (Payable Increase)
            await connection.execute(`
                INSERT INTO account_ledger (
                    company_id, member_id, transaction_date, transaction_type, reference_type, 
                    reference_id, reference_no, description, credit, financial_year
                ) VALUES (?, ?, ?, 'cash_book', 'dangar_entry', ?, ?, ?, ?, ?)
            `, [
                entry.company_id, entry.member_id, entry.entry_date, entry.id, entry.sr_no, ledgerDesc, 
                amount, entry.financial_year || '2026-27'
            ]);
        }

        console.log("✅ Balanced Ledger reconciliation complete!");
        await connection.end();
    } catch (err) {
        console.error("❌ Reconciliation FAILED:", err.message);
    }
}
repair();
