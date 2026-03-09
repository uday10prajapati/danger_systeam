import db from './db.js';

async function insertSampleData() {
  let connection = null;
  try {
    console.log('🚀 Starting comprehensive sample data migration...\n');
    connection = await db.getConnection();

    // Get or create company
    console.log('🏢 Checking company...');
    const [companyResult] = await connection.query('SELECT id FROM company LIMIT 1');
    let companyId;
    
    if (companyResult && companyResult[0]) {
      companyId = companyResult[0].id;
      console.log(`✓ Using existing company ID: ${companyId}\n`);
    } else {
      console.log('No company found. Please create a company first through the UI.\n');
      process.exit(1);
    }

    // 1. INSERT USERS
    console.log('📝 Inserting Users...');
    const users = [
      { company_id: companyId, username: 'admin@ustore.com', email: 'admin@ustore.com', password: 'password123', role: 'admin' },
      { company_id: companyId, username: 'sales@ustore.com', email: 'sales@ustore.com', password: 'password123', role: 'user' },
      { company_id: companyId, username: 'purchase@ustore.com', email: 'purchase@ustore.com', password: 'password123', role: 'user' }
    ];
    for (const user of users) {
      await connection.query(
        'INSERT INTO users (company_id, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
        [user.company_id, user.username, user.email, user.password, user.role]
      );
    }
    console.log(`✓ Inserted ${users.length} users\n`);

    // 2. INSERT ITEMS
    console.log('📦 Inserting Items...');
    const items = [
      { item_code: 'IT001', item_name: 'T-Shirt', category: 'Clothing', unit: 'Piece', barcode: '8901234567890' },
      { item_code: 'IT002', item_name: 'Jeans', category: 'Clothing', unit: 'Piece', barcode: '8901234567891' },
      { item_code: 'IT003', item_name: 'Watch', category: 'Accessories', unit: 'Piece', barcode: '8901234567892' },
      { item_code: 'IT004', item_name: 'Shoes', category: 'Footwear', unit: 'Piece', barcode: '8901234567893' },
      { item_code: 'IT005', item_name: 'Headphones', category: 'Electronics', unit: 'Piece', barcode: '8901234567894' },
      { item_code: 'IT006', item_name: 'Phone Cover', category: 'Accessories', unit: 'Piece', barcode: '8901234567895' },
      { item_code: 'IT007', item_name: 'Shorts', category: 'Clothing', unit: 'Piece', barcode: '8901234567896' },
      { item_code: 'IT008', item_name: 'Sunglasses', category: 'Accessories', unit: 'Piece', barcode: '8901234567897' }
    ];
    for (const item of items) {
      await connection.query(
        'INSERT INTO item_master (company_id, item_code, item_name, category, unit, tax_percentage, barcode) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [companyId, item.item_code, item.item_name, item.category, item.unit, 5, item.barcode]
      );
    }
    console.log(`✓ Inserted ${items.length} items\n`);

    // 2.5 INSERT ITEM RATES (Required for POS barcode lookup)
    console.log('💰 Inserting Item Rates...');
    const itemIds = await connection.query('SELECT id FROM item_master WHERE company_id = ?', [companyId]);
    const rates = [
      { sale_rate: 499, purchase_rate: 300 },  // T-Shirt
      { sale_rate: 999, purchase_rate: 650 },  // Jeans
      { sale_rate: 1499, purchase_rate: 900 }, // Watch
      { sale_rate: 1999, purchase_rate: 1200 }, // Shoes
      { sale_rate: 2499, purchase_rate: 1500 }, // Headphones
      { sale_rate: 199, purchase_rate: 100 },  // Phone Cover
      { sale_rate: 699, purchase_rate: 400 },  // Shorts
      { sale_rate: 599, purchase_rate: 350 }   // Sunglasses
    ];
    
    if (itemIds && itemIds[0] && itemIds[0].length > 0) {
      for (let i = 0; i < itemIds[0].length; i++) {
        const itemId = itemIds[0][i].id;
        const rate = rates[i] || { sale_rate: 500, purchase_rate: 300 };
        await connection.query(
          'INSERT INTO item_rate (company_id, item_id, sale_rate, purchase_rate, is_active) VALUES (?, ?, ?, ?, 1)',
          [companyId, itemId, rate.sale_rate, rate.purchase_rate]
        );
      }
      console.log(`✓ Inserted rates for ${itemIds[0].length} items\n`);
    }

    // 3. INSERT ACCOUNTS (for Customers/Suppliers)
    console.log('👥 Inserting Accounts (Customers & Suppliers)...');
    const accounts = [
      { account_name: 'Rajesh Kumar', account_type: 'customer', phone: '9876543210', email: 'rajesh@email.com' },
      { account_name: 'Priya Singh', account_type: 'customer', phone: '9876543211', email: 'priya@email.com' },
      { account_name: 'Global Textiles Ltd', account_type: 'supplier', phone: '9876543212', email: 'supplier@textiles.com' },
      { account_name: 'Fashion Wholesale', account_type: 'supplier', phone: '9876543213', email: 'fashion@wholesale.com' },
      { account_name: 'Amit Patel', account_type: 'customer', phone: '9876543214', email: 'amit@email.com' }
    ];
    for (const account of accounts) {
      await connection.query(
        'INSERT INTO accounts (company_id, account_name, account_type, phone, email) VALUES (?, ?, ?, ?, ?)',
        [companyId, account.account_name, account.account_type, account.phone, account.email]
      );
    }
    console.log(`✓ Inserted ${accounts.length} accounts\n`);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SAMPLE DATA MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📊 Summary of inserted data:');
    console.log('   ✓ 3 Users (Admin, Sales, Purchase)');
    console.log('   ✓ 8 Items with Barcodes');
    console.log('   ✓ 8 Item Rates (for POS barcode lookup)');
    console.log('   ✓ 5 Accounts (3 Customers, 2 Suppliers)\n');
    console.log('You can now use these data to test the app modules!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

insertSampleData();
