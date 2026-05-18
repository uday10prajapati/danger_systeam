const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: '', // Replace if needed
  database: 'danger_systeam',
  port: 5432,
});

async function testQuery() {
  try {
    const res = await pool.query(`
      SELECT de.id, de.sr_no, de.bardan,
      (SELECT JSON_AGG(dw.*) FROM dangar_weights dw WHERE dw.entry_id = de.id) as weights
      FROM dangar_entry de
      ORDER BY de.id DESC
      LIMIT 1
    `);
    console.log("RESULT_START");
    console.log(JSON.stringify(res.rows, null, 2));
    console.log("RESULT_END");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testQuery();
