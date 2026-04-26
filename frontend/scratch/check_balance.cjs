const db = require('../backend/db');
async function check() {
  try {
    const memId = 2;
    const [p] = await db.query('SELECT SUM(amount) as total FROM dangar_entry WHERE member_id = ?', [memId]);
    const [s] = await db.query('SELECT SUM(net_amount) as total FROM sales WHERE member_id = ?', [memId]);
    console.log(`Member ${memId} - Purchases: ${p[0].total}, Sales: ${s[0].total}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
