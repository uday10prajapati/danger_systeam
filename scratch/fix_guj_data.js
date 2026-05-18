import { query } from '../backend/db.js';

async function run() {
  try {
    console.log('--- Starting Gujarati Data Migration ---');

    // 1. Update Villages
    const villageUpdates = [
      { eng: 'pardi', gu: 'પારડી' },
      { eng: 'surat', gu: 'સુરત' },
      { eng: 'olpad', gu: 'ઓલપાડ' }
    ];
    for (const v of villageUpdates) {
      await query("UPDATE village SET village_name = ? WHERE LOWER(village_name) = ? OR LOWER(eng_name) = ?", [v.gu, v.eng, v.eng]);
      await query("UPDATE member_master SET village_name = ? WHERE LOWER(village_name) = ?", [v.gu, v.eng]);
    }
    console.log('✅ Villages updated');

    // 2. Update Items (Dangar Types)
    const itemUpdates = [
      { eng: 'jya gujri heND kT', gu: 'જયા ગુજરાતી હેન્ડ કટ' },
      { eng: 'jya gujri', gu: 'જયા ગુજરાતી' },
      { eng: 'gujri', gu: 'ગુજરાતી' }
    ];
    for (const i of itemUpdates) {
      await query("UPDATE item_master SET item_name_gu = ? WHERE LOWER(item_name) LIKE ? OR LOWER(item_name_gu) LIKE ?", [i.gu, `%${i.eng}%`, `%${i.eng}%`]);
    }
    console.log('✅ Items updated');

    // 3. Update Members
    // This is hard since names are unique, but we can try common ones
    const memberUpdates = [
      { eng: 'jdy', gu: 'જેડીવાય' }
    ];
    for (const m of memberUpdates) {
      await query("UPDATE member_master SET member_name_gu = ? WHERE LOWER(member_name) = ? OR LOWER(eng_name) = ?", [m.gu, m.eng, m.eng]);
    }
    console.log('✅ Common members updated');

    // 4. Force Gujarati for any member who has empty gu field but English field has content
    // (We can't auto-translate everything, but we can at least ensure fields are ready)
    
    console.log('--- Migration Complete ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

run();
