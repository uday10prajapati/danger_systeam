const db = require('../backend/db');
async function check() {
  try {
    const [rows] = await db.query("SELECT * FROM account_ledger WHERE description LIKE '%CHEQUE OUT%' OR description LIKE '%uday%' LIMIT 10");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
