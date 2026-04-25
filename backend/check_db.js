import { query } from './db.js';
async function check() {
  try {
    const res = await query('SELECT count(*) as count FROM company');
    console.log('Company count:', res[0].count);
    const res2 = await query('SELECT count(*) as count FROM member_master');
    console.log('Member count:', res2[0].count);
    const res3 = await query('SELECT count(*) as count FROM item_master');
    console.log('Item count:', res3[0].count);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
