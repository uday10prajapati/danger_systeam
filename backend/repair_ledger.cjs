const { execute } = require('./db.js');

async function repair() {
  try {
    // Fix the Purchase Account side (Debit)
    await execute(
      "UPDATE account_ledger SET debit = 7200, description = 'Dangar Purchase - 3.00 Qt @ 2400' WHERE reference_type = 'dangar_entry' AND reference_id = 5 AND account_id = 15"
    );
    // Fix the Member side (Credit)
    await execute(
      "UPDATE account_ledger SET credit = 7200, description = 'Dangar Purchase - 3.00 Qt @ 2400' WHERE reference_type = 'dangar_entry' AND reference_id = 5 AND member_id = 1"
    );
    console.log('✅ Repair Success');
    process.exit(0);
  } catch (err) {
    console.error('❌ Repair Failed', err);
    process.exit(1);
  }
}

repair();
