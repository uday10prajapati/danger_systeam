import { execute, queryOne } from './db.js';

async function restoreData() {
  try {
    console.log('--- 🔄 RESTORING CORE DATA NODES ---');
    await execute('SET FOREIGN_KEY_CHECKS = 0');

    const companyId = 2; // Based on previous headers/logs
    const FY = '2026-27';

    // 1. Restore Account (today27)
    console.log('Restoring Account: today27...');
    await execute(`
      INSERT INTO accounts (id, company_id, account_name, account_type, is_active)
      VALUES (9, ?, 'today27', 'Direct Expense', 1)
      ON DUPLICATE KEY UPDATE account_name = 'today27'
    `, [companyId]);

    // 2. Restore Item (Danger)
    console.log('Restoring Item: Danger...');
    await execute(`
      INSERT INTO item_master (id, company_id, item_code, item_name, unit, purchase_account_id)
      VALUES (4, ?, 'D-001', 'Danger', 'QT', 9)
      ON DUPLICATE KEY UPDATE item_name = 'Danger'
    `, [companyId]);

    // 3. Restore Member (abc27)
    console.log('Restoring Member: abc27...');
    await execute(`
      INSERT INTO member_master (id, company_id, member_code, member_name, village_name, village_code, financial_year)
      VALUES (3, ?, '2', 'abc27', 'SAJOD', '1', ?)
      ON DUPLICATE KEY UPDATE member_name = 'abc27'
    `, [companyId, FY]);

    // 4. Restore Bardan Initial State (100 bags)
    console.log('Restoring Bardan Portfolio (100 bags debit)...');
    await execute(`
      INSERT INTO bardan_entry (company_id, financial_year, entry_date, book_type, pavti_no, code, name, qty)
      VALUES (?, ?, CURDATE(), 'B', 'INITIAL', '2', 'abc27', 100)
    `, [companyId, FY]);

    // 5. Restore Dangar Entry (100kg @ 200)
    console.log('Restoring Dangar Entry (100kg)...');
    const dangarResult = await execute(`
      INSERT INTO dangar_entry (
        id, company_id, financial_year, book_type, sr_no, entry_date, 
        member_id, item_id, total_kg, bardan, gross_quintal, less_bardan, net_quintal,
        rate, amount, created_by
      ) VALUES (10, ?, ?, 'Summer', 'D00004', CURDATE(), 3, 4, 100, 2, 1.00, 0.02, 0.98, 200, 200, 1)
    `, [companyId, FY]);

    const entryId = dangarResult.lastID || 10;

    // 6. Restore Bardan Jama (2 bags)
    console.log('Restoring Bardan Credit (2 bags)...');
    await execute(`
      INSERT INTO jama_bardan_entry (company_id, financial_year, entry_date, book_type, pavti_no, code, name, qty)
      VALUES (?, ?, CURDATE(), 'J', 'D00004', '2', 'abc27', 2)
    `, [companyId, FY]);

    // 7. Restore Ledger Credit (200.00)
    console.log('Restoring Ledger Credit (₹200.00)...');
    await execute(`
      INSERT INTO account_ledger (
        company_id, account_id, member_id, transaction_date, transaction_type, reference_type, 
        reference_id, reference_no, description, credit, financial_year
      ) VALUES (?, 9, 3, CURDATE(), 'cash_book', 'cash_book', ?, 'D00004', 'Dangar Purchase - 4 - 0.98 Qt @ 200', 200, ?)
    `, [companyId, entryId, FY]);

    await execute('SET FOREIGN_KEY_CHECKS = 1');
    console.log('--- ✨ RESTORATION COMPLETE ✨ ---');
    process.exit(0);
  } catch (error) {
    console.error('RESTORATION FAILURE:', error);
    process.exit(1);
  }
}

restoreData();
