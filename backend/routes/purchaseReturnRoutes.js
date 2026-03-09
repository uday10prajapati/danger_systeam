import express from 'express';
import * as db from '../db.js';
import { validatePurchaseReturn } from '../validators/purchaseReturnValidator.js';

const router = express.Router();

/**
 * CREATE PURCHASE RETURN
 * POST /api/purchase-returns
 * 
 * Body: {
 *   purchase_id: number,
 *   return_date: date (YYYY-MM-DD),
 *   items: [{ item_id, quantity, purchase_rate, max_return_qty }, ...],
 *   notes: string (optional)
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { purchase_id, return_date, items, notes } = req.body;
    const companyId = req.headers['x-company-id'];
    const userId = req.headers['x-user-id'];

    // Add max_return_qty to items for validation (will be calculated during validation)
    // First, get the purchase details
    const purchase = await db.getPurchaseForReturn(purchase_id, companyId);
    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    // Get items from original purchase with max returnable quantities
    const purchaseItems = await db.getPurchaseItemsWithStock(purchase_id);
    
    // Map purchase items to items with max_return_qty
    const itemsWithMax = items.map(item => {
      const purchaseItem = purchaseItems.find(pi => pi.item_id === parseInt(item.item_id));
      return {
        ...item,
        max_return_qty: purchaseItem?.purchased_quantity || 0
      };
    });

    // Validation
    const validation = validatePurchaseReturn({ 
      purchase_id, 
      return_date, 
      items: itemsWithMax 
    });
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

    // Verify supplier exists
    const supplier = await db.queryOne(
      'SELECT id FROM accounts WHERE id = ? AND company_id = ?',
      [purchase.supplier_account_id, companyId]
    );
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Verify all items exist and belong to the company
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

    // Create purchase return
    const result = await db.createPurchaseReturn(
      companyId,
      purchase_id,
      purchase.supplier_account_id,
      return_date,
      items.map(item => ({
        item_id: parseInt(item.item_id),
        quantity: parseFloat(item.quantity),
        purchase_rate: parseFloat(item.purchase_rate)
      })),
      notes || null,
      userId
    );

    res.status(201).json({
      success: true,
      message: 'Purchase return created successfully',
      data: result
    });
  } catch (error) {
    console.error('Create purchase return error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create purchase return',
      error: error.message
    });
  }
});

/**
 * GET PURCHASE RETURNS BY DATE RANGE
 * GET /api/purchase-returns?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
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

    const returns = await db.getPurchaseReturnsByCompany(companyId, startDate, endDate);

    res.json({
      success: true,
      data: returns,
      count: returns.length
    });
  } catch (error) {
    console.error('Get purchase returns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase returns',
      error: error.message
    });
  }
});

/**
 * GET PURCHASE RETURN DETAILS
 * GET /api/purchase-returns/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.headers['x-company-id'];

    const purchaseReturn = await db.getPurchaseReturnDetails(id);
    
    if (!purchaseReturn) {
      return res.status(404).json({
        success: false,
        message: 'Purchase return not found'
      });
    }

    // Verify purchase return belongs to the company
    if (purchaseReturn.company_id !== parseInt(companyId)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    res.json({
      success: true,
      data: purchaseReturn
    });
  } catch (error) {
    console.error('Get purchase return details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase return details',
      error: error.message
    });
  }
});

/**
 * GET PURCHASE FOR RETURN
 * GET /api/purchase-returns/purchase/:purchaseId
 * Retrieves a purchase with its items for creating a return
 */
router.get('/purchase/:purchaseId', async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const companyId = req.headers['x-company-id'];

    const purchase = await db.getPurchaseForReturn(purchaseId, companyId);
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    const items = await db.getPurchaseItemsWithStock(purchaseId);

    res.json({
      success: true,
      data: {
        ...purchase,
        items
      }
    });
  } catch (error) {
    console.error('Get purchase for return error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase',
      error: error.message
    });
  }
});

/**
 * NOTE: Purchase Returns CANNOT be deleted
 * Once created, they are permanent records for audit trail
 * To reverse a return, create another purchase (receive goods back)
 */

export default router;
