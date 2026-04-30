import { query, queryOne } from '../db.js';

async function testApi() {
    const companyId = 2; // Assuming company 2 from sync logs
    const memberId = 8;  // Uday from sync logs

    const row = { member_id: memberId };
    
    // Exact copy of dangarRoutes.js logic
    let pendingInterest = 0;
    let memberAdvance = 0; 
    let godownFund = 0;    
    let otherUdhar = 0;    
    let otherDeductionsList = []; 

    const advAc = await queryOne('SELECT id FROM accounts WHERE account_code = "L0001" AND company_id = ?', [companyId]);
    const godownAc = await queryOne('SELECT id FROM accounts WHERE account_code = "GF0001" AND company_id = ?', [companyId]);
    const bardanAc = await queryOne('SELECT id FROM accounts WHERE account_code = "BS0001" AND company_id = ?', [companyId]);
    const advAcId = advAc?.id;
    const godownAcId = godownAc?.id;
    const bardanAcId = bardanAc?.id;

    console.log('IDs:', { advAcId, godownAcId, bardanAcId });

    const memberLedger = await query(`
        SELECT account_id, debit, credit, transaction_date, interest_percent, reference_type 
        FROM account_ledger 
        WHERE member_id = ? AND company_id = ?
    `, [row.member_id, companyId]);

    console.log(`Found ${memberLedger.length} ledger entries for member ${memberId}`);

    for (const entry of memberLedger) {
        const bal = parseFloat(entry.debit || 0) - parseFloat(entry.credit || 0);
        console.log(`Processing entry: ref=${entry.reference_type}, acc=${entry.account_id}, bal=${bal}`);

        if (advAcId && entry.account_id === advAcId) {
            memberAdvance += bal;
        } else if (entry.reference_type === 'dangar_entry_fund') {
            godownFund += bal;
            console.log(`>> Added to godownFund: ${bal}`);
        } else if (godownAcId && entry.account_id === godownAcId) {
            godownFund += bal;
        } else if (bardanAcId && entry.account_id === bardanAcId) {
            // skip
        } else if (Math.abs(bal) > 0.01) {
            otherUdhar += bal;
        }
    }

    console.log('Results:', { memberAdvance, godownFund, otherUdhar });
    process.exit(0);
}

testApi();
