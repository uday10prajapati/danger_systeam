import { query, execute } from './db.js';

const fixes = [
    { code: 'DS0001', en: 'DANGAR SYSTEM ACCOUNT', gu: 'ડાંગર સિસ્ટમ ખાતું' },
    { code: 'BS0001', en: 'BARDAN SYSTEM ACCOUNT', gu: 'બારદાન સિસ્ટમ ખાતું' },
    { code: 'L0001', en: 'MEMBER ADVANCE ACCOUNT', gu: 'સભાસદ એડવાન્સ ખાતું' },
    { code: 'IK0001', en: 'INTEREST ACCOUNT', gu: 'વ્યાજ ખાતું' },
    { code: 'P0001', en: 'DANGAR PURCHASE ACCOUNT', gu: 'ડાંગર ખરીદ ખાતું' },
    { code: 'MP0001', en: 'MEMBER PURCHASE ACCOUNT', gu: 'સભાસદ ખરીદ ખાતું' },
    { code: 'CS0001', en: 'CASH ACCOUNT', gu: 'રોકડ ખાતું' },
    { code: 'DF0001', en: 'GODOWN FUND ACCOUNT', gu: 'ગોડાઉન ફંડ ખાતું' },
    { code: 'GF0001', en: 'DANGAR GODOWN FUND ACCOUNT', gu: 'ડાંગર ગોડાઉન ફંડ ખાતું' },
    { code: 'RK0001', en: 'ROUNDING ACCOUNT', gu: 'રાઉન્ડિંગ ખાતું' },
    { code: 'BK0001', en: 'DALALI ACCOUNT', gu: 'દલાલી ખાતું' },
    { code: 'LK0001', en: 'MAJURI ACCOUNT', gu: 'મજૂરી ખાતું' },
    { code: 'S0001', en: 'DANGAR SALES ACCOUNT', gu: 'ડાંગર વેચાણ ખાતું' },
    { name: 'Purchase Account', en: 'PURCHASE ACCOUNT', gu: 'ખરીદી ખાતું' },
    { name: 'Sales Account', en: 'SALES ACCOUNT', gu: 'વેચાણ ખાતું' },
    { id: 15, en: 'PURCHASE ACCOUNT', gu: 'ખરીદી ખાતું' },
    { id: 16, en: 'SALES ACCOUNT', gu: 'વેચાણ ખાતું' }
];

async function fixNames() {
    console.log('Starting bilingual name cleanup...');
    for (const fix of fixes) {
        try {
            if (fix.code) {
                await execute(
                    'UPDATE accounts SET account_name = ?, account_name_gu = ? WHERE account_code = ?',
                    [fix.en, fix.gu, fix.code]
                );
                console.log(`✅ Updated Code ${fix.code} (EN: ${fix.en}, GU: ${fix.gu})`);
            } else if (fix.id) {
                await execute(
                    'UPDATE accounts SET account_name = ?, account_name_gu = ? WHERE id = ?',
                    [fix.en, fix.gu, fix.id]
                );
                console.log(`✅ Updated ID ${fix.id} (EN: ${fix.en}, GU: ${fix.gu})`);
            } else if (fix.name) {
                await execute(
                    'UPDATE accounts SET account_name = ?, account_name_gu = ? WHERE account_name = ?',
                    [fix.en, fix.gu, fix.name]
                );
                console.log(`✅ Updated Name "${fix.name}" to (EN: ${fix.en}, GU: ${fix.gu})`);
            }
        } catch (err) {
            console.error(`❌ Failed to update ${fix.name || fix.code || fix.id}:`, err.message);
        }
    }
    console.log('Cleanup complete.');
    process.exit(0);
}

fixNames();
