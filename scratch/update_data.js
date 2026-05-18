import { query } from '../backend/db.js';
async function run() {
  try {
    await query("UPDATE company SET company_name_gu = 'ડાંગર સિસ્ટમ' WHERE company_name_gu IS NULL OR company_name_gu = ''");
    console.log('Company name updated');
    
    // Also update members if they have English names but no Gujarati names
    // Actually, I can't safely translate names, but I can at least ensure the fields are prioritized.
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
