// admin@danger.com
// 6099
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
import saleWeightRoutes from './routes/saleWeightRoutes.js';
import memberCodeRoutes from './routes/memberCodeRoutes.js';
import sabhasadReportRoutes from './routes/sabhasadReportRoutes.js';
import ledgerReportRoutes from './routes/ledgerReportRoutes.js';
import rojmelRoutes from './routes/rojmelRoutes.js';
import jvRoutes from './routes/jvRoutes.js';
import villageRoutes from './routes/villageRoute.js';
import dangarRoutes from './routes/dangarRoutes.js';
import dangarRateRoutes from './routes/dangarRateRoutes.js';
import bardanRoutes from './routes/bardanRoutes.js';
import jamaBardanRoutes from './routes/jamaBardanRoutes.js';
import bankRoutes from './routes/bankRoutes.js';
import deductionRoutes from './routes/deductionRoutes.js';
import bardanPriceRoutes from './routes/bardanPriceRoutes.js';
import seasonRoutes from './routes/seasonRoutes.js';
import narrationRoutes from './routes/narrationRoutes.js';
import { seedSystemAccounts } from './seed_system_accounts.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const PORT = process.env.PORT || 5080;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Context Resolver Middleware
app.use(async (req, res, next) => {
  try {
    // 1. Resolve Company ID if missing
    if (!req.headers['x-company-id']) {
      const company = await queryOne('SELECT id FROM company LIMIT 1');
      if (company) {
        req.headers['x-company-id'] = String(company.id);
      }
    }

    // 2. Resolve Financial Year if missing
    if (!req.headers['x-financial-year']) {
      const year = await queryOne('SELECT year_label FROM financial_years WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
      if (year) {
        req.headers['x-financial-year'] = year.year_label;
      } else {
        req.headers['x-financial-year'] = '2026-27'; // System fallback
      }
    }
    next();
  } catch (err) {
    console.error('Context resolution failed:', err);
    next();
  }
});

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | CID: ${req.headers['x-company-id']} | FY: ${req.headers['x-financial-year']}`);
  next();
});

// Health check endpoint (no database required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend Running', timestamp: new Date() });
});

// Initialize database and start server
async function startServer() {
  try {
    // Serve static files from React build
    const distPath = process.pkg
      ? path.join(path.dirname(process.execPath), 'dist')
      : process.resourcesPath
        ? path.join(process.resourcesPath, 'app.asar', 'frontend', 'dist')
      : path.join(__dirname, '..', 'frontend', 'dist');
    
    console.log(`📂 Serving static files from: ${distPath}`);
    app.use(express.static(distPath));

    // Register all routes immediately
    console.log('📝 Registering routes...');
    registerCompanyRoutes(app);
    registerUserRoutes(app);
    app.use('/api/accounts', accountRoutes);
    app.use('/api/members', memberRoutes);
    app.use('/api/items', itemRoutes);
    app.use('/api/item-rates', itemRateRoutes);
    app.use('/api/purchases', purchaseRoutes);
    app.use('/api/purchases', purchaseGSTRoutes);
    app.use('/api/purchase-returns', purchaseReturnRoutes);
    app.use('/api/sales', saleRoutes);
    app.use('/api/sales', saleGSTRoutes);
    app.use('/api/sales', saleWeightRoutes);
    app.use('/api/sale-returns', saleReturnRoutes);
    app.use('/api/cash-book', cashBookRoutes);
    app.use('/api/account-ledger', accountLedgerRoutes);
    app.use('/api/stock-report', stockReportRoutes);
    app.use('/api/profit-loss', profitLossRoutes);
    app.use('/api/gst', gstRoutes);
    app.use('/api/sabhasad-ledger-summary', sabhasadReportRoutes);
    app.use('/api/ledger-report', ledgerReportRoutes);
    app.use('/api/rojmel', rojmelRoutes);
    app.use('/api/jv', jvRoutes);
    app.use('/api/village', villageRoutes);
    app.use('/api/dangar-entry', dangarRoutes);
    app.use('/api/dangar-rates', dangarRateRoutes);
    app.use('/api/bardan-entry', bardanRoutes);
    app.use('/api/jama-bardan-entry', jamaBardanRoutes);
    app.use('/api/banks', bankRoutes);
    app.use('/api/deductions', deductionRoutes);
    app.use('/api/bardan-price', bardanPriceRoutes);
    app.use('/api/seasons', seasonRoutes);
    app.use('/api/narrations', narrationRoutes);


    console.log('🔄 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully');

    console.log('🛠 Synchronizing system accounts...');
    // await seedSystemAccounts(); // Redundant: Now handled automatically in initializeDatabase()
    console.log('✅ System accounts synchronized');

    // Financial Years Routes
    app.get('/api/financial-years/:companyId', async (req, res) => {
        try {
            const rows = await query('SELECT * FROM financial_years WHERE company_id = ? ORDER BY year_label DESC', [req.params.companyId]);
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });


    app.post('/api/financial-years', async (req, res) => {
        try {
            const { companyId, yearLabel, startDate, endDate } = req.body;
            // Convert empty strings to null for DATE columns
            const finalStart = startDate || null;
            const finalEnd = endDate || null;
            
            await query(
                'INSERT INTO financial_years (company_id, year_label, start_date, end_date) VALUES (?, ?, ?, ?)',
                [companyId, yearLabel, finalStart, finalEnd]
            );
            res.json({ success: true });
        } catch (err) {
            console.error('Fiscal Year Post Error:', err);
            res.status(500).json({ error: err.code === 'ER_DUP_ENTRY' ? 'This year label already exists.' : err.message });
        }
    });

    app.put('/api/financial-years/:id', async (req, res) => {
        try {
            const { yearLabel, startDate, endDate, is_active } = req.body;
            const finalStart = startDate || null;
            const finalEnd = endDate || null;

            await query(
                'UPDATE financial_years SET year_label = ?, start_date = ?, end_date = ?, is_active = ? WHERE id = ?',
                [yearLabel, finalStart, finalEnd, is_active !== undefined ? is_active : 1, req.params.id]
            );
            res.json({ success: true });
        } catch (err) {
            console.error('Fiscal Year Put Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // Dashboard stats endpoint
    app.get('/api/dashboard/stats', async (req, res) => {
      try {
        const stats = {
          totalItems: 0,
          lowStockCount: 0,
          belowThreshold: 0,
          reorders: 0,
          todaysSales: 0,
          todaysPurchases: 0,
          activeUsers: 0,
          inventoryItems: []
        };

        const today = new Date().toISOString().split('T')[0];

        try {
          // 1. Core Inventory Stats
          const itemsResult = await query(`
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN COALESCE((SELECT current_stock FROM purchase_stock_ledger psl WHERE psl.item_id = im.id ORDER BY psl.id DESC LIMIT 1), im.opening_stock) < COALESCE(im.minimum_stock, 0) THEN 1 ELSE 0 END) as low_stock,
              SUM(CASE WHEN COALESCE((SELECT current_stock FROM purchase_stock_ledger psl WHERE psl.item_id = im.id ORDER BY psl.id DESC LIMIT 1), im.opening_stock) < COALESCE(im.reorder_level, 0) THEN 1 ELSE 0 END) as below_threshold
            FROM item_master im 
            WHERE im.is_active = 1
          `);
          
          stats.totalItems = itemsResult[0]?.total || 0;
          stats.lowStockCount = itemsResult[0]?.low_stock || 0;
          stats.belowThreshold = itemsResult[0]?.below_threshold || 0;
          stats.reorders = stats.belowThreshold;
        } catch (e) {
          console.warn('Inventory stats failed:', e.message);
        }

        try {
          // 2. Financial Pulse (Today)
          const salesResult = await query('SELECT SUM(net_amount) as total FROM sales WHERE DATE(invoice_date) = ?', [today]);
          stats.todaysSales = salesResult[0]?.total || 0;

          const purchaseResult = await query('SELECT SUM(net_amount) as total FROM purchases WHERE DATE(invoice_date) = ?', [today]);
          stats.todaysPurchases = purchaseResult[0]?.total || 0;
        } catch (e) {
          console.warn('Financial stats failed:', e.message);
        }

        try {
          // 3. User Activity
          const usersResult = await query('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
          stats.activeUsers = usersResult[0]?.count || 0;
        } catch (e) {
          console.warn('User stats failed:', e.message);
        }

        try {
          // 4. Low Stock Items Matrix
          const lowStockList = await query(`
            SELECT 
              im.item_name as name,
              COALESCE((SELECT current_stock FROM purchase_stock_ledger psl WHERE psl.item_id = im.id ORDER BY psl.id DESC LIMIT 1), im.opening_stock) as stock,
              COALESCE(im.reorder_level, 0) as threshold,
              im.minimum_stock as min_stock,
              im.updated_at as date
            FROM item_master im
            WHERE im.is_active = 1
            ORDER BY stock ASC
            LIMIT 5
          `);

          stats.inventoryItems = lowStockList.map(item => ({
            name: item.name,
            stock: parseFloat(item.stock || 0),
            threshold: parseFloat(item.threshold || 0),
            status: item.stock < item.min_stock ? 'Low Stock' : (item.stock < item.threshold ? 'Below Threshold' : 'Stable'),
            date: new Date(item.date).toLocaleDateString('en-GB'),
            daysLeft: item.stock < item.threshold ? 'Critical' : 'N/A',
            statusColor: item.stock < item.min_stock ? 'rose' : (item.stock < item.threshold ? 'amber' : 'emerald')
          }));
        } catch (e) {
          console.warn('Inventory list failed:', e.message);
        }

        try {
          // 5. Supplier Intelligence Feed
          const suppliersList = await query(`
            SELECT 
              a.account_name as name,
              a.phone as contact,
              (SELECT MAX(invoice_date) FROM purchases p WHERE p.supplier_account_id = a.id) as last_shipment,
              (SELECT COUNT(*) FROM purchases p WHERE p.supplier_account_id = a.id) as total_purchases
            FROM accounts a
            WHERE a.account_type = 'supplier' AND a.is_active = 1
            ORDER BY last_shipment DESC
            LIMIT 5
          `);

          stats.supplierInfo = suppliersList.map(sup => ({
            name: sup.name,
            products: 'General Inventory', // We'd need to join purchase_items to know exactly, keeping it simple for now
            lastShipment: sup.last_shipment ? new Date(sup.last_shipment).toLocaleDateString('en-GB') : 'No History',
            nextShipment: 'As Per Routine',
            contact: sup.contact || 'N/A',
            rating: Math.min(5, Math.max(3, sup.total_purchases > 10 ? 5 : (sup.total_purchases > 2 ? 4 : 3)))
          }));
        } catch (e) {
          console.warn('Supplier list failed:', e.message);
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

    // User routes are registered via registerUserRoutes(app) in the startup section.

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

    // 404 Catch-All (Finally)
    app.use((req, res) => {
      if (req.url.startsWith('/api')) {
        console.warn(`[404] No route found for: ${req.method} ${req.url}`);
        return res.status(404).json({
          success: false,
          error: `Route not found: ${req.method} ${req.url}`
        });
      }

      // Serve index.html for all non-API routes (SPA Routing)
      const indexPath = process.pkg
        ? path.join(path.dirname(process.execPath), 'dist', 'index.html')
        : process.resourcesPath
          ? path.join(process.resourcesPath, 'app.asar', 'frontend', 'dist', 'index.html')
        : path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
      
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error('❌ index.html not found at:', indexPath);
        res.status(404).send('Application not found');
      }
    });

    // Force clear port if needed (Windows specific)
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        const stdout = execSync(`netstat -ano | findstr :${PORT}`).toString();
        const lines = stdout.split('\n');
        lines.forEach(line => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== process.pid.toString()) {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          }
        });
      } catch (e) { /* ignore */ }
    }

    // Start listening
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on http://127.0.0.1:${PORT}`);
      console.log('📊 API endpoints available');
      console.log('🚀 BACKEND STARTUP COMPLETE');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Start the server with retry logic for database initialization
async function startWithRetry(retries = 25, delay = 6000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🚀 Attempting backend startup (Attempt ${i + 1}/${retries})...`);
      await startServer();
      console.log('🚀 BACKEND STARTUP COMPLETE');
      return;
    } catch (err) {
      console.error(`❌ Startup attempt ${i + 1} failed:`, err.message);
      if (i < retries - 1) {
        console.log(`⏳ Waiting ${delay / 1000}s before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ All startup attempts failed. Exiting.');
        process.exit(1);
      }
    }
  }
}

// Global error handlers
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
});

// Launch
startWithRetry();
