
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

        console.log("🔍 Scanning for orphaned Dangar entries...");
        
        // 1. Get all dangar entries
        const [dangarEntries] = await connection.query(`
            SELECT de.*, mm.member_name 
            FROM dangar_entry de
            LEFT JOIN member_master mm ON de.member_id = mm.id
        `);

        console.log(`Found ${dangarEntries.length} Dangar entries. Checking ledger sync...`);

        for (const entry of dangarEntries) {
            // Check if already in ledger
            const [existing] = await connection.query(
                'SELECT id FROM account_ledger WHERE reference_type = "dangar_entry" AND reference_id = ?',
                [entry.id]
            );

            if (existing.length === 0) {
                console.log(`🚀 Syncing entry ${entry.sr_no} (ID: ${entry.id}) to ledger...`);
                
                const ledgerDesc = `Dangar Purchase - ${entry.net_quintal} Qt @ ${entry.rate}`;
                const amount = parseFloat(entry.amount || 0);

                // Insert into ledger (Credit Member, Debit Dangar System/Purchase Account)
                // Note: In this system, we record one row for the account and one for the member?
                // Actually, the getAccountLedger logic handles rows where both are present.
                
                await connection.execute(`
                    INSERT INTO account_ledger (
                        company_id, account_id, member_id, transaction_date, transaction_type, reference_type, 
                        reference_id, reference_no, description, credit, financial_year
                    ) VALUES (?, ?, ?, ?, 'cash_book', 'dangar_entry', ?, ?, ?, ?, ?)
                `, [
                    entry.company_id, entry.account_id || 5, entry.member_id, entry.entry_date, 
                    entry.id, entry.sr_no, ledgerDesc, amount, entry.financial_year || '2026-27'
                ]);
            }
        }

        console.log("✅ Repair complete!");
        await connection.end();
    } catch (err) {
        console.error("❌ Repair failed:", err.message);
    }
}
repair();
