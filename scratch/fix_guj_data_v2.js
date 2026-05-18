import { query } from '../backend/db.js';

async function run() {
  try {
    console.log('--- Starting AGGRESSIVE Gujarati Data Migration ---');

    // 1. Update Items
    // We'll use case-insensitive matching
    const itemUpdates = [
      { eng: 'jya gujri heND kT', gu: 'જયા ગુજરાતી હેન્ડ કટ' },
      { eng: 'jya gujri', gu: 'જયા ગુજરાતી' },
      { eng: 'jya gujrI heND kT', gu: 'જયા ગુજરાતી હેન્ડ કટ' }
    ];
    for (const i of itemUpdates) {
      await query("UPDATE item_master SET item_name_gu = ? WHERE LOWER(item_name) = LOWER(?)", [i.gu, i.eng]);
    }
    
    // Also update any item_name_gu that is still English
    await query("UPDATE item_master SET item_name_gu = 'જયા ગુજરાતી હેન્ડ કટ' WHERE item_name_gu = 'ગુજરાતી' OR item_name_gu IS NULL");

    // 2. Update Members
    await query("UPDATE member_master SET member_name_gu = 'જેડીવાય' WHERE LOWER(member_name) LIKE '%jdy%' OR LOWER(eng_name) LIKE '%jdy%'");
    await query("UPDATE member_master SET member_name_gu = 'પારડી' WHERE LOWER(member_name) LIKE '%pardi%'");

    // 3. Update Villages
    await query("UPDATE village SET village_name = 'પારડી' WHERE LOWER(village_name) = 'pardi' OR LOWER(eng_name) = 'pardi'");
    await query("UPDATE member_master SET village_name = 'પારડી' WHERE LOWER(village_name) = 'pardi'");

    console.log('✅ Data updated aggressively');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}
run();
