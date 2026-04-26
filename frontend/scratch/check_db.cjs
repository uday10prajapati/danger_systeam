const db = require('../backend/db');
async function check() {
  try {
    const [members] = await db.query('SELECT * FROM member_master WHERE id = 2');
    console.log('Member 2:', members);
    const [accounts] = await db.query('SELECT * FROM accounts WHERE account_name LIKE "%Monty%"');
    console.log('Accounts with Monty:', accounts);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
