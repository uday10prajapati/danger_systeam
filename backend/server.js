import express from 'express';
import cors from 'cors';
import db, { initializeDatabase, query, queryOne, execute } from './db.js';
import dotenv from 'dotenv';
import { registerCompanyRoutes } from './routes/companyRoutes.js';
import { registerUserRoutes } from './routes/userRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import itemRateRoutes from './routes/itemRateRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import purchaseReturnRoutes from './routes/purchaseReturnRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import saleReturnRoutes from './routes/saleReturnRoutes.js';
import cashBookRoutes from './routes/cashBookRoutes.js';
import accountLedgerRoutes from './routes/accountLedgerRoutes.js';
import stockReportRoutes from './routes/stockReportRoutes.js';
import profitLossRoutes from './routes/profitLossRoutes.js';
import gstRoutes from './routes/gstRoutes.js';
import saleGSTRoutes from './routes/saleGSTRoutes.js';
import memberCodeRoutes from './routes/memberCodeRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Initialize database
await initializeDatabase();

// Register routes
registerCompanyRoutes(app);
registerUserRoutes(app);
app.use(accountRoutes);
app.use('/api/members', memberCodeRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/item-rates', itemRateRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/purchase-returns', purchaseReturnRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/sales', saleGSTRoutes);
app.use('/api/sale-returns', saleReturnRoutes);
app.use('/api/cash-book', cashBookRoutes);
app.use('/api/account-ledger', accountLedgerRoutes);
app.use('/api/stock-report', stockReportRoutes);
app.use('/api/profit-loss', profitLossRoutes);
app.use('/api/gst', gstRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend Running', timestamp: new Date(), database: 'MySQL via XAMPP' });
});

// ===== DASHBOARD STATS =====
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const stats = {};

    // Get total modules (hardcoded as 15)
    stats.totalModules = 15;

    // Get active users (users with is_active = true)
    const usersResult = await query('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    stats.activeUsers = usersResult[0]?.count || 0;

    // Get today's sales (sum of sales amount for today)
    const todaysSalesResult = await query(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM sales WHERE DATE(created_at) = CURDATE()'
    );
    stats.todaysSales = todaysSalesResult[0]?.total || 0;

    // Get total items
    const itemsResult = await query('SELECT COUNT(*) as count FROM item_master WHERE is_active = 1');
    stats.totalItems = itemsResult[0]?.count || 0;

    // Get today's transactions count
    const transactionsResult = await query(
      'SELECT COUNT(*) as count FROM sales WHERE DATE(created_at) = CURDATE()'
    );
    stats.todaysTransactions = transactionsResult[0]?.count || 0;

    // Get low stock items using correct schema (from purchase_stock_ledger)
    const lowStockResult = await query(
      `SELECT 
        im.id,
        im.item_code,
        im.item_name,
        im.reorder_level,
        COALESCE(SUM(CASE 
          WHEN pl.transaction_type = 'PURCHASE_IN' THEN pl.quantity_in 
          WHEN pl.transaction_type = 'PURCHASE_RETURN' THEN -pl.quantity_out
          WHEN pl.transaction_type = 'SALE_OUT' THEN -pl.quantity_out
          WHEN pl.transaction_type = 'SALE_RETURN' THEN pl.quantity_in
          ELSE 0 
        END), 0) as stock_quantity
      FROM item_master im
      LEFT JOIN purchase_stock_ledger pl ON im.id = pl.item_id
      WHERE im.is_active = 1
      GROUP BY im.id
      HAVING stock_quantity <= im.reorder_level
      ORDER BY stock_quantity ASC
      LIMIT 5`
    );
    stats.lowStockItems = lowStockResult || [];

    // Get best selling items (last 30 days)
    const bestSellingResult = await query(
      `SELECT si.item_id, im.item_name, SUM(si.quantity) as total_quantity, SUM(si.amount) as total_sales
       FROM sale_items si
       JOIN item_master im ON si.item_id = im.id
       JOIN sales s ON si.sale_id = s.id
       WHERE s.created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
       GROUP BY si.item_id, im.item_name
       ORDER BY total_quantity DESC
       LIMIT 5`
    );
    stats.bestSellingItems = bestSellingResult || [];

    // Get total stock value - simplified from recent item rates
    try {
      const stockValueResult = await query(
        `SELECT im.id, im.item_name,
                COALESCE(SUM(CASE 
                  WHEN pl.transaction_type = 'PURCHASE_IN' THEN pl.quantity_in 
                  WHEN pl.transaction_type = 'PURCHASE_RETURN' THEN -pl.quantity_out
                  WHEN pl.transaction_type = 'SALE_OUT' THEN -pl.quantity_out
                  WHEN pl.transaction_type = 'SALE_RETURN' THEN pl.quantity_in
                  ELSE 0 
                END), 0) as stock_qty,
                (SELECT sale_rate FROM item_rate WHERE item_id = im.id AND is_active = 1 ORDER BY created_at DESC LIMIT 1) as rate
         FROM item_master im
         LEFT JOIN purchase_stock_ledger pl ON im.id = pl.item_id
         WHERE im.is_active = 1
         GROUP BY im.id`
      );
      stats.totalStockValue = (stockValueResult || []).reduce((sum, item) => {
        const qty = item?.stock_qty || 0;
        const rate = item?.rate || 0;
        return sum + (qty * rate);
      }, 0);
    } catch (e) {
      console.warn('Stock value calculation warning:', e.message);
      stats.totalStockValue = 0;
    }

    // Get recent sales (last 7 days)
    const recentSalesResult = await query(
      'SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total_amount) as total FROM sales WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(created_at) ORDER BY date DESC'
    );
    stats.recentSalesData = recentSalesResult || [];

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== PRODUCT ROUTES =====
app.get('/api/products', async (req, res) => {
  try {
    const products = await query('SELECT * FROM products');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { name, sku, category, price, quantity, description, image_url } = req.body;
    const result = await execute(
      'INSERT INTO products (name, sku, category, price, quantity, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, sku, category, price, quantity, description, image_url]
    );
    
    res.status(201).json({ id: result.lastID, message: 'Product created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { name, sku, category, price, quantity, description, image_url } = req.body;
    await execute(
      'UPDATE products SET name = ?, sku = ?, category = ?, price = ?, quantity = ?, description = ?, image_url = ? WHERE id = ?',
      [name, sku, category, price, quantity, description, image_url, req.params.id]
    );
    
    res.json({ message: 'Product updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SALES ROUTES =====
app.get('/api/sales', async (req, res) => {
  try {
    const sales = await query('SELECT * FROM sales ORDER BY sale_date DESC');
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sales/:id', async (req, res) => {
  try {
    const sale = await queryOne('SELECT * FROM sales WHERE id = ?', [req.params.id]);
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    const items = await query('SELECT * FROM sale_items WHERE sale_id = ?', [req.params.id]);
    res.json({ ...sale, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/sales', async (req, res) => {
  try {
    const { user_id, items, payment_method } = req.body;
    
    // Calculate total
    let total_amount = 0;
    for (const item of items) {
      total_amount += item.unit_price * item.quantity;
    }

    // Insert sale
    const saleResult = await execute(
      'INSERT INTO sales (user_id, total_amount, payment_method) VALUES (?, ?, ?)',
      [user_id, total_amount, payment_method]
    );

    const saleId = saleResult.lastID;

    // Insert sale items and update inventory
    for (const item of items) {
      await execute(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [saleId, item.product_id, item.quantity, item.unit_price]
      );

      // Update product quantity
      await execute(
        'UPDATE products SET quantity = quantity - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );

      // Log inventory change
      await execute(
        'INSERT INTO inventory_log (product_id, quantity_changed, reason) VALUES (?, ?, ?)',
        [item.product_id, -item.quantity, 'Sale']
      );
    }

    res.status(201).json({ id: saleId, message: 'Sale created', total_amount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== USER ROUTES =====
app.get('/api/users', async (req, res) => {
  try {
    const users = await query('SELECT id, username, email, role, created_at FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const result = await execute(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, password, role || 'staff']
    );
    
    res.status(201).json({ id: result.lastID, message: 'User created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== REPORTS ROUTES =====
app.get('/api/reports/daily-sales', async (req, res) => {
  try {
    const sales = await query(
      'SELECT DATE(sale_date) as date, SUM(total_amount) as total, COUNT(*) as count FROM sales GROUP BY DATE(sale_date) ORDER BY date DESC LIMIT 30'
    );
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/inventory', async (req, res) => {
  try {
    const inventory = await query(
      'SELECT id, name, sku, quantity, price, (quantity * price) as total_value FROM products ORDER BY quantity ASC'
    );
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints: http://localhost:${PORT}/api/*`);
  console.log(`💾 Database: MySQL via XAMPP`);
});
