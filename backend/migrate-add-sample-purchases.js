import db from './db.js';

async function addSamplePurchases() {
  try {
    console.log('🔄 Adding sample purchase data...\n');

    const connection = await db.getConnection();

    try {
      // Sample purchases with company_id 2 (U-Store)
      const companyId = 2;
      const supplierId = 2; // Jeeny (supplier account)
      const userId = 1;

      // Get sample items for company 2
      const itemsResult = await connection.query(
        `SELECT id, item_name FROM item_master WHERE company_id = ? AND is_active = 1 LIMIT 5`,
        [companyId]
      );
      
      const items = itemsResult[0];

      if (!items || items.length === 0) {
        console.log('❌ No items found for company. Please create items first.');
        return;
      }

      console.log(`Found ${items.length} items. Creating sample purchases...\n`);

      // Create 3 sample purchases
      for (let p = 1; p <= 3; p++) {
        const timestamp = Date.now() + (p * 1000);
        const invoiceNo = `INVP-${timestamp}`;
        const invoiceDate = new Date();
        invoiceDate.setDate(invoiceDate.getDate() - (4 - p)); // Past 3 days

        const purchaseItems = [];
        let totalAmount = 0;

        // Add random quantities of items
        for (let i = 0; i < Math.min(3, items.length); i++) {
          const quantity = Math.floor(Math.random() * 50) + 20; // 20-70 units
          const rate = Math.floor(Math.random() * 500) + 100; // 100-600 per unit
          const amount = quantity * rate;
          totalAmount += amount;

          purchaseItems.push({
            item_id: items[i].id,
            quantity,
            purchase_rate: rate,
            amount
          });
        }

        // Insert purchase header
        const [purchaseResult] = await connection.query(
          `INSERT INTO purchases (company_id, supplier_account_id, invoice_no, invoice_date, total_amount, notes, created_by) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [companyId, supplierId, invoiceNo, invoiceDate, totalAmount, `Sample purchase ${p}`, userId]
        );

        const purchaseId = purchaseResult.insertId;
        console.log(`✅ Purchase ${invoiceNo} created (ID: ${purchaseId})`);

        // Insert items and stock ledger entries
        for (const item of purchaseItems) {
          // Insert purchase item
          const [itemResult] = await connection.query(
            `INSERT INTO purchase_items (purchase_id, item_id, quantity, purchase_rate, amount)
             VALUES (?, ?, ?, ?, ?)`,
            [purchaseId, item.item_id, item.quantity, item.purchase_rate, item.amount]
          );

          // Get current stock
          const [currentStockRow] = await connection.query(
            `SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as current_stock 
             FROM purchase_stock_ledger 
             WHERE company_id = ? AND item_id = ?`,
            [companyId, item.item_id]
          );
          
          const currentStock = currentStockRow[0]?.current_stock || 0;
          const newStock = currentStock + item.quantity;

          // Insert stock ledger entry
          await connection.query(
            `INSERT INTO purchase_stock_ledger 
             (company_id, item_id, purchase_id, purchase_item_id, quantity_in, current_stock, transaction_type, reference_no, created_by)
             VALUES (?, ?, ?, ?, ?, ?, 'PURCHASE_IN', ?, ?)`,
            [companyId, item.item_id, purchaseId, itemResult.insertId, item.quantity, newStock, invoiceNo, userId]
          );

          console.log(`   📦 Added ${item.quantity} units of item ${item.item_id} @ ${item.purchase_rate}`);
        }
      }

      // Create 2 sample sales
      console.log('\n Creating sample sales...\n');
      
      for (let s = 1; s <= 2; s++) {
        const timestamp = Date.now() + (1000000 + s * 1000);
        const invoiceNo = `INV-${timestamp}`;
        const invoiceDate = new Date();
        invoiceDate.setDate(invoiceDate.getDate() - s);

        const saleItems = [];
        let totalAmount = 0;

        // Add items to sale
        for (let i = 0; i < Math.min(2, items.length); i++) {
          const quantity = Math.floor(Math.random() * 10) + 5; // 5-15 units
          const rate = Math.floor(Math.random() * 1000) + 500; // 500-1500 per unit
          const amount = quantity * rate;
          totalAmount += amount;

          saleItems.push({
            item_id: items[i].id,
            quantity,
            sale_rate: rate,
            amount
          });
        }

        // Insert sale header
        const [saleResult] = await connection.query(
          `INSERT INTO sales 
           (company_id, invoice_no, invoice_date, customer_account_id, member_id, discount_amount, payment_type, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [companyId, invoiceNo, invoiceDate, null, null, 0, 'cash', `Sample sale ${s}`, userId]
        );

        const saleId = saleResult.insertId;
        const netAmount = totalAmount;

        // Update sale totals
        await connection.query(
          `UPDATE sales SET total_amount = ?, net_amount = ? WHERE id = ?`,
          [totalAmount, netAmount, saleId]
        );

        console.log(`✅ Sale ${invoiceNo} created (ID: ${saleId})`);

        // Insert sale items and stock ledger entries
        for (const item of saleItems) {
          // Insert sale item
          await connection.query(
            `INSERT INTO sale_items (sale_id, item_id, quantity, sale_rate, amount)
             VALUES (?, ?, ?, ?, ?)`,
            [saleId, item.item_id, item.quantity, item.sale_rate, item.amount]
          );

          // Get current stock
          const [currentStockRow] = await connection.query(
            `SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as current_stock 
             FROM purchase_stock_ledger 
             WHERE company_id = ? AND item_id = ?`,
            [companyId, item.item_id]
          );
          
          const currentStock = currentStockRow[0]?.current_stock || 0;
          const newStock = currentStock - item.quantity;

          // Insert stock ledger entry
          await connection.query(
            `INSERT INTO purchase_stock_ledger 
             (company_id, item_id, quantity_out, current_stock, transaction_type, reference_id, reference_no, created_by)
             VALUES (?, ?, ?, ?, 'SALE_OUT', ?, ?, ?)`,
            [companyId, item.item_id, item.quantity, newStock, saleId, `SALE-${saleId}`, userId]
          );

          console.log(`   📤 Sold ${item.quantity} units of item ${item.item_id} @ ${item.sale_rate}`);
        }
      }

      console.log('\n✅ Sample purchase and sale data added successfully!');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error adding sample data:', error.message);
    throw error;
  }
}

addSamplePurchases();
