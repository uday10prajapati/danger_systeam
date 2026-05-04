import { getConnection } from './db.js';

async function updateSeasons() {
  const connection = await getConnection();
  try {
    const [rows] = await connection.query('SELECT id, entry_date FROM dangar_entry WHERE season IS NULL');
    console.log(`Found ${rows.length} rows to update.`);
    
    for (const row of rows) {
      const date = new Date(row.entry_date);
      const month = date.getMonth();
      const season = (month >= 3 && month <= 8) ? 'summer' : 'winter';
      await connection.query('UPDATE dangar_entry SET season = ? WHERE id = ?', [season, row.id]);
    }
    
    console.log('Update complete.');
  } catch (err) {
    console.error(err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

updateSeasons();
