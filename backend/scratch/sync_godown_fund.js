import { query, queryOne, execute } from '../db.js';

async function syncGodownFund() {
    try {
        console.log('🚀 Starting Godown Fund Synchronization...');

        // 1. Get all Dangar entries
        const entries = await query('SELECT * FROM dangar_entry');
        console.log(`📊 Found ${entries.length} Dangar entries to process.`);

        for (const entry of entries) {
            const totalKg = parseFloat(entry.total_kg || 0);
            const godownFundAmount = totalKg * 0.05; // 1 RS per 20 KG

            if (godownFundAmount <= 0) continue;

            // Resolve Godown Fund Account for this company
            const godownAc = await queryOne('SELECT id FROM accounts WHERE account_code = "GF0001" AND company_id = ?', [entry.company_id]);
            const godownAccountId = godownAc?.id;

            if (!godownAccountId) {
                console.warn(`⚠️ Godown Fund account (GF0001) not found for company ${entry.company_id}. Skipping.`);
                continue;
            }

            const fundDesc = `Godown Fund - ${totalKg} KG @ 1/20`;

            // Check if ledger entries already exist
            const existing = await queryOne(
                'SELECT id FROM account_ledger WHERE reference_type = "dangar_entry_fund" AND reference_id = ?',
                [entry.id]
            );

            if (!existing) {
                console.log(`✅ Syncing Entry ID: ${entry.id} (SR: ${entry.sr_no}) -> ₹${godownFundAmount.toFixed(2)}`);
                
                // A. DEBIT THE MEMBER
                await execute(`
                    INSERT INTO account_ledger (
                        company_id, member_id, transaction_date, transaction_type, reference_type, 
                        reference_id, reference_no, description, debit, financial_year
                    ) VALUES (?, ?, ?, 'cash_book', 'dangar_entry_fund', ?, ?, ?, ?, ?)
                `, [
                    entry.company_id, entry.member_id, entry.entry_date, entry.id, entry.sr_no, fundDesc, 
                    godownFundAmount, entry.financial_year
                ]);

                // B. CREDIT THE GODOWN FUND ACCOUNT
                await execute(`
                    INSERT INTO account_ledger (
                        company_id, account_id, transaction_date, transaction_type, reference_type, 
                        reference_id, reference_no, description, credit, financial_year
                    ) VALUES (?, ?, ?, 'cash_book', 'dangar_entry_fund', ?, ?, ?, ?, ?)
                `, [
                    entry.company_id, godownAccountId, entry.entry_date, entry.id, entry.sr_no, fundDesc, 
                    godownFundAmount, entry.financial_year
                ]);
            } else {
                // Update existing
                await execute(
                    'UPDATE account_ledger SET debit = ?, description = ? WHERE reference_type = "dangar_entry_fund" AND reference_id = ? AND member_id IS NOT NULL',
                    [godownFundAmount, fundDesc, entry.id]
                );
                await execute(
                    'UPDATE account_ledger SET credit = ?, description = ? WHERE reference_type = "dangar_entry_fund" AND reference_id = ? AND account_id = ?',
                    [godownFundAmount, fundDesc, entry.id, godownAccountId]
                );
                console.log(`ℹ️ Updated Entry ID: ${entry.id} (SR: ${entry.sr_no}) -> ₹${godownFundAmount.toFixed(2)}`);
            }
        }

        console.log('✨ Godown Fund Synchronization Complete.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Sync Failed:', error);
        process.exit(1);
    }
}

syncGodownFund();
