import db, { query } from './db.js';

async function checkRates() {
  try {
    console.log('Checking item rates in database...\n');
    
    const result = await query(`
      SELECT im.item_code, im.item_name, im.barcode, 
             ir.id as rate_id, ir.sale_rate, ir.is_active
      FROM item_master im
      LEFT JOIN item_rate ir ON im.id = ir.item_id AND ir.company_id = im.company_id
      WHERE im.company_id = 2
      ORDER BY im.id
    `);
    
    if (result && result.length > 0) {
      console.table(result);
      
      const withoutRates = result.filter(r => !r.rate_id);
      if (withoutRates.length > 0) {
        console.log(`\n⚠️  ${withoutRates.length} items without rates:\n`);
        console.log(withoutRates.map(r => `  - ${r.item_code}: ${r.item_name} (barcode: ${r.barcode})`).join('\n'));
        
        console.log('\n✋ Adding rates for items without rates...\n');
        const rates = [
          { sale_rate: 499, purchase_rate: 300 },
          { sale_rate: 999, purchase_rate: 650 },
          { sale_rate: 1499, purchase_rate: 900 },
          { sale_rate: 1999, purchase_rate: 1200 },
          { sale_rate: 2499, purchase_rate: 1500 },
          { sale_rate: 199, purchase_rate: 100 },
          { sale_rate: 699, purchase_rate: 400 },
          { sale_rate: 599, purchase_rate: 350 }
        ];
        
        for (let i = 0; i < withoutRates.length; i++) {
          const item = withoutRates[i];
          const itemResult = await query(
            'SELECT id FROM item_master WHERE item_code = ? AND company_id = 2',
            [item.item_code]
          );
          if (itemResult && itemResult[0]) {
            const itemId = itemResult[0].id;
            const rate = rates[i] || { sale_rate: 500, purchase_rate: 300 };
            await query(
              'INSERT INTO item_rate (company_id, item_id, sale_rate, purchase_rate, is_active) VALUES (?, ?, ?, ?, 1)',
              [2, itemId, rate.sale_rate, rate.purchase_rate]
            );
            console.log(`✓ Added rate for: ${item.item_code} (Sale: ₹${rate.sale_rate})`);
          }
        }
        console.log('\n✅ Rates added successfully!');
      } else {
        console.log('\n✅ All items have active rates!');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkRates();
