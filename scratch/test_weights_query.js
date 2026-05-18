const pool = require('../backend/db');

async function testQuery() {
  try {
    const res = await pool.query(`
      SELECT de.id, de.sr_no, de.bardan,
      (SELECT JSON_AGG(dw.*) FROM dangar_weights dw WHERE dw.entry_id = de.id) as weights
      FROM dangar_entry de
      LIMIT 5
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testQuery();
