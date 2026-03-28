import express from 'express';
import * as db from '../db.js';
import { validatePurchase } from '../validators/purchaseValidator.js';

const router = express.Router();

/**
 * CREATE PURCHASE
 * POST /api/purchases
 * 
 * Body: {
 *   supplier_account_id: number,
 *   invoice_no: string,
 *   invoice_date: date (YYYY-MM-DD),
 *   items: [{ item_id, quantity, purchase_rate }, ...],
 *   notes: string (optional)
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { supplier_account_id, invoice_no, invoice_date, items, notes, gst_amount, gst_percent } = req.body;
    const companyId = req.headers['x-company-id'];
    const userId = req.headers['x-user-id'];

    // Validation
    const validation = validatePurchase(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Verify company exists
    const company = await db.queryOne('SELECT id FROM company WHERE id = ?', [companyId]);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Verify supplier account exists and is supplier type
    const supplier = await db.queryOne(
      'SELECT id FROM accounts WHERE id = ? AND company_id = ? AND account_type = "supplier"',
      [supplier_account_id, companyId]
    );
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Verify all items exist in the company
    for (const item of items) {
      const itemExists = await db.queryOne(
        'SELECT id FROM item_master WHERE id = ? AND company_id = ?',
        [item.item_id, companyId]
      );
      if (!itemExists) {
        return res.status(404).json({ 
          success: false, 
          message: `Item with ID ${item.item_id} not found` 
        });
      }
    }

    // Create purchase
    const result = await db.createPurchase(
      companyId,
      supplier_account_id,
      invoice_no,
      invoice_date,
      items,
      notes || null,
      userId,
      gst_amount || 0,
      gst_percent || 0
    );

    res.status(201).json({
      success: true,
      message: 'Purchase created successfully',
      data: result
    });
  } catch (error) {
    console.error('Create purchase error:', error);
    
    // Check for duplicate invoice number
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Invoice number already exists for this company'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create purchase',
      error: error.message
    });
  }
});

/**
 * GET PURCHASES BY DATE RANGE
 * GET /api/purchases?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
router.get('/', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Date format must be YYYY-MM-DD'
      });
    }

    const purchases = await db.getPurchasesByCompany(companyId, startDate, endDate);

    res.json({
      success: true,
      data: purchases,
      count: purchases.length
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchases',
      error: error.message
    });
  }
});

/**
 * GET PURCHASE DETAILS
 * GET /api/purchases/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.headers['x-company-id'];

    const purchase = await db.getPurchaseDetails(id);
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Verify purchase belongs to the company
    if (purchase.company_id !== parseInt(companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    res.json({
      success: true,
      data: purchase
    });
  } catch (error) {
    console.error('Get purchase details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase details',
      error: error.message
    });
  }
});

/**
 * GET SUPPLIER BALANCE
 * GET /api/purchases/supplier/:supplierId/balance
 */
router.get('/supplier/:supplierId/balance', async (req, res) => {
  try {
    const { supplierId } = req.params;
    const companyId = req.headers['x-company-id'];

    const balance = await db.getSupplierBalance(companyId, supplierId);

    res.json({
      success: true,
      data: balance || {
        total_due: 0,
        total_paid: 0,
        current_balance: 0
      }
    });
  } catch (error) {
    console.error('Get supplier balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supplier balance',
      error: error.message
    });
  }
});

/**
 * GET ITEM CURRENT STOCK
 * GET /api/purchases/stock/:itemId
 */
router.get('/stock/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const companyId = req.headers['x-company-id'];

    const stock = await db.getItemCurrentStock(companyId, itemId);

    res.json({
      success: true,
      data: { item_id: itemId, current_stock: stock }
    });
  } catch (error) {
    console.error('Get item stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item stock',
      error: error.message
    });
  }
});

/**
 * GET STOCK HISTORY
 * GET /api/purchases/history/:itemId
 */
router.get('/history/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const companyId = req.headers['x-company-id'];
    const { limit } = req.query;

    const history = await db.getStockHistory(companyId, itemId, parseInt(limit) || 50);

    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('Get stock history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock history',
      error: error.message
    });
  }
});

/**
 * NOTE: Purchases CANNOT be deleted or updated
 * To reverse a purchase, use Purchase Return module (future)
 */

export default router;
