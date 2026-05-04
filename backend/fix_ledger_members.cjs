const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'database/airy.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    UPDATE account_ledger 
    SET member_id = (
      SELECT member_id 
      FROM account_ledger al2 
      WHERE al2.reference_type = account_ledger.reference_type 
        AND al2.reference_id = account_ledger.reference_id 
        AND al2.member_id IS NOT NULL 
      LIMIT 1
    ) 
    WHERE reference_type IN ('dangar_entry', 'dangar_entry_fund') 
      AND member_id IS NULL
  `, function(err) {
    if (err) {
      console.error('Migration failed:', err.message);
      process.exit(1);
    } else {
      console.log('Successfully updated rows:', this.changes);
      process.exit(0);
    }
  });
});
