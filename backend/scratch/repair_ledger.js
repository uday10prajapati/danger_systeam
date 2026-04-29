
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function repair() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'danger_systeam'
  });

  console.log('🔍 Scanning for missing Bardan entries in ledger...');

  // 1. Repair jama_bardan_entry
  const [missingJama] = await connection.query(`
    SELECT j.* FROM jama_bardan_entry j
    LEFT JOIN account_ledger al ON al.source_table = "jama_bardan_entry" AND al.source_id = j.id
    WHERE al.id IS NULL
  `);

  console.log(`📋 Found ${missingJama.length} missing Jama entries.`);

  for (const entry of missingJama) {
    const ledgerDesc = `[BARDAN] Returned (#${entry.pavti_no}) | ${entry.remark || ''}`;
    await connection.query(`
      INSERT INTO account_ledger (
        company_id, financial_year, account_id, member_id, 
        transaction_date, reference_no, description, 
        debit, credit, source_table, source_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      entry.company_id, entry.financial_year, entry.account_id, entry.member_id,
      entry.entry_date, entry.pavti_no, ledgerDesc,
      0, entry.qty || 0, 'jama_bardan_entry', entry.id
    ]);
    console.log(`✅ Repaired Jama Entry: ${entry.pavti_no}`);
  }

  // 2. Repair bardan_entry (taken)
  const [missingTaken] = await connection.query(`
    SELECT b.* FROM bardan_entry b
    LEFT JOIN account_ledger al ON al.source_table = "bardan_entry" AND al.source_id = b.id
    WHERE al.id IS NULL
  `);

  console.log(`📋 Found ${missingTaken.length} missing Taken entries.`);

  for (const entry of missingTaken) {
    const ledgerDesc = `[BARDAN] Taken (#${entry.pavti_no}) | ${entry.remark || ''}`;
    await connection.query(`
      INSERT INTO account_ledger (
        company_id, financial_year, account_id, member_id, 
        transaction_date, reference_no, description, 
        debit, credit, source_table, source_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      entry.company_id, entry.financial_year, entry.account_id, entry.member_id,
      entry.entry_date, entry.pavti_no, ledgerDesc,
      entry.qty || 0, 0, 'bardan_entry', entry.id
    ]);
    console.log(`✅ Repaired Taken Entry: ${entry.pavti_no}`);
  }

  await connection.end();
  console.log('🏁 Repair complete.');
}

repair().catch(console.error);
