import { query, execute } from './db.js';

async function updateAccounts() {
  try {
    const accounts = await query('SELECT id, account_name FROM accounts');
    for (const acc of accounts) {
      if (acc.account_name) {
        const words = acc.account_name.split(' ');
        const capitalizedWords = words.map(word => {
          if (!word) return '';
          return word.charAt(0).toUpperCase() + word.slice(1);
        });
        const capitalizedName = capitalizedWords.join(' ');

        if (capitalizedName !== acc.account_name) {
          await execute('UPDATE accounts SET account_name = ? WHERE id = ?', [capitalizedName, acc.id]);
          console.log(`Updated: "${acc.account_name}" -> "${capitalizedName}"`);
        }
      }
    }
    console.log('Update complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error updating accounts:', error);
    process.exit(1);
  }
}

updateAccounts();
