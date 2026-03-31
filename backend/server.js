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
import purchaseGSTRoutes from './routes/purchaseGSTRoutes.js';
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
import sabhasadReportRoutes from './routes/sabhasadReportRoutes.js';
import ledgerReportRoutes from './routes/ledgerReportRoutes.js';
import rojmelRoutes from './routes/rojmelRoutes.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// VPS Nginx Resilience Middleware: 
// If Nginx strips the '/api' prefix (via proxy_pass trailing slash), this adds it back 
// so the hardcoded Express routes still flawlessly trigger.
app.use((req, res, next) => {
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Health check endpoint (no database required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend Running', timestamp: new Date() });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('🔄 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully');

    // Register all routes
    console.log('📝 Registering routes...');
    registerCompanyRoutes(app);
    registerUserRoutes(app);
    app.use(accountRoutes);
    app.use('/api/members', memberCodeRoutes);
    app.use('/api/members', memberRoutes);
    app.use('/api/items', itemRoutes);
    app.use('/api/item-rates', itemRateRoutes);
    app.use('/api/purchases', purchaseRoutes);
    app.use('/api/purchases', purchaseGSTRoutes);
    app.use('/api/purchase-returns', purchaseReturnRoutes);
    app.use('/api/sales', saleRoutes);
    app.use('/api/sales', saleGSTRoutes);
    app.use('/api/sale-returns', saleReturnRoutes);
    app.use('/api/cash-book', cashBookRoutes);
    app.use('/api/account-ledger', accountLedgerRoutes);
    app.use('/api/stock-report', stockReportRoutes);
    app.use('/api/profit-loss', profitLossRoutes);
    app.use('/api/gst', gstRoutes);
    app.use('/api/sabhasad-ledger-summary', sabhasadReportRoutes);
    app.use('/api/ledger-report', ledgerReportRoutes);
    app.use('/api/rojmel', rojmelRoutes);

    // Dashboard stats endpoint
    app.get('/api/dashboard/stats', async (req, res) => {
      try {
        const stats = {
          totalModules: 15,
          activeUsers: 0,
          todaysSales: 0,
          totalItems: 0,
          todaysTransactions: 0,
          lowStockItems: [],
          bestSellingItems: [],
          totalStockValue: 0,
          recentSalesData: []
        };

        try {
          const usersResult = await query('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
          stats.activeUsers = usersResult[0]?.count || 0;
        } catch (e) {
          console.warn('Could not fetch users:', e.message);
        }

        try {
          const itemsResult = await query('SELECT COUNT(*) as count FROM item_master WHERE is_active = 1');
          stats.totalItems = itemsResult[0]?.count || 0;
        } catch (e) {
          console.warn('Could not fetch items:', e.message);
        }

        res.json(stats);
      } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Product routes
    app.get('/api/products', async (req, res) => {
      try {
        const products = await query('SELECT * FROM products LIMIT 100');
        res.json(products || []);
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

    // User routes
    app.get('/api/users', async (req, res) => {
      try {
        const users = await query('SELECT id, username, email, role, created_at FROM users LIMIT 100');
        res.json(users || []);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/users', async (req, res) => {
      try {
        const { username, email, password, role } = req.body;
        const result = await execute(
          'INSERT INTO users (username, email, password, role, is_active) VALUES (?, ?, ?, ?, 1)',
          [username, email, password, role || 'staff']
        );
        res.status(201).json({ id: result.lastID, message: 'User created' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Reports routes
    app.get('/api/reports/daily-sales', async (req, res) => {
      try {
        const sales = await query(
          'SELECT DATE(created_at) as date, SUM(total_amount) as total, COUNT(*) as count FROM sales GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30'
        );
        res.json(sales || []);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/reports/inventory', async (req, res) => {
      try {
        const inventory = await query(
          'SELECT id, name, sku, quantity, price, (quantity * price) as total_value FROM products ORDER BY quantity ASC LIMIT 100'
        );
        res.json(inventory || []);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Start listening
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📊 API endpoints available`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Start the server
startServer();
