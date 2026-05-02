import { query } from './db.js';

async function test() {
  try {
    const res = await query(`
      SELECT 
        v.name AS village_name,
        v.name_gu AS village_name_gu,
        COUNT(de.id) AS entry_count,
        SUM(de.total_kg) AS total_kg,
        SUM(de.net_quintal) AS total_quintal,
        SUM(de.amount) AS total_amount,
        SUM(de.total_deduction) AS total_deduction
      FROM dangar_entry de
      JOIN members m ON de.member_id = m.id
      JOIN villages v ON m.village_id = v.id
      WHERE de.company_id = 1
        AND de.entry_date BETWEEN '2020-01-01' AND '2030-01-01'
      GROUP BY v.id, v.name, v.name_gu
      ORDER BY SUM(de.amount) DESC
    `);
    console.log('SUCCESS');
    process.exit(0);
  } catch(e) {
    console.log('ERROR:', e.message);
    process.exit(1);
  }
}
test();
