import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '6099'),
  database: process.env.DB_NAME || 'danger_systeam',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('=== BEFORE REPAIR: ORPHANED account_ledger ENTRIES ===');
    const resBefore = await client.query(`
      SELECT al.id, al.member_id, mm.member_name, al.reference_no, al.reference_id, al.credit, al.description 
      FROM account_ledger al
      LEFT JOIN member_master mm ON al.member_id = mm.id
      WHERE al.reference_type = 'jama_bardan_entry'
      AND NOT EXISTS (
        SELECT 1 FROM jama_bardan_entry jbe 
        WHERE jbe.id = al.reference_id
      )
    `);
    console.table(resBefore.rows);

    if (resBefore.rows.length > 0) {
      console.log('🧹 Repairing: Deleting orphaned ledger entries...');
      const idsToDelete = resBefore.rows.map(r => r.id);
      const deleteRes = await client.query(
        "DELETE FROM account_ledger WHERE id = ANY($1)",
        [idsToDelete]
      );
      console.log(`✅ Successfully deleted ${deleteRes.rowCount} orphaned ledger records.`);
    } else {
      console.log('✨ No orphaned ledger entries found.');
    }

    console.log('=== AFTER REPAIR: ORPHANED account_ledger ENTRIES ===');
    const resAfter = await client.query(`
      SELECT al.id, al.member_id, mm.member_name, al.reference_no, al.reference_id, al.credit, al.description 
      FROM account_ledger al
      LEFT JOIN member_master mm ON al.member_id = mm.id
      WHERE al.reference_type = 'jama_bardan_entry'
      AND NOT EXISTS (
        SELECT 1 FROM jama_bardan_entry jbe 
        WHERE jbe.id = al.reference_id
      )
    `);
    console.table(resAfter.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
