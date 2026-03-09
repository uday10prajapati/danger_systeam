import express from 'express';
import {
  getSalesForReturn,
  getSaleForReturnDetails,
  createSaleReturn,
  getSaleReturnsByCompany,
  getSaleReturnDetails,
  insertCashBookEntry
} from '../db.js';
import { validateSaleReturn } from '../validators/saleReturnValidator.js';

const router = express.Router();

// GET: List available sales for return (not yet returned)
router.get('/available-sales', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const sales = await getSalesForReturn(companyId);
    return res.json({ success: true, data: sales });
  } catch (error) {
    console.error('Get available sales error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get sale details for return form
router.get('/sale/:saleId', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const saleDetails = await getSaleForReturnDetails(req.params.saleId);
    if (!saleDetails) {
      return res.status(404).json({ success: false, error: 'Sale not found' });
    }

    // Verify company ownership
    if (saleDetails.company_id !== parseInt(companyId)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    return res.json({ success: true, data: saleDetails });
  } catch (error) {
    console.error('Get sale details error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST: Create sale return
router.post('/', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const userId = req.header('x-user-id');

    if (!companyId || !userId) {
      return res.status(400).json({ success: false, error: 'Company ID and User ID required' });
    }

    const { sale_id, return_date, items, refund_type, notes } = req.body;

    // Validate input
    const validation = validateSaleReturn({ sale_id, return_date, items, refund_type });
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    // Get sale details to verify company and get customer
    const saleDetails = await getSaleForReturnDetails(sale_id);
    if (!saleDetails) {
      return res.status(404).json({ success: false, error: 'Sale not found' });
    }

    if (saleDetails.company_id !== parseInt(companyId)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Verify returned quantities don't exceed original quantities
    for (const returnItem of items) {
      const originalItem = saleDetails.items.find(i => i.item_id === returnItem.item_id);
      if (!originalItem) {
        return res.status(400).json({ 
          success: false, 
          error: `Item ${returnItem.item_id} not found in original sale` 
        });
      }
      if (returnItem.quantity > originalItem.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `Return quantity for ${originalItem.item_name} exceeds original quantity` 
        });
      }
    }

    // Generate return number
    const returnNo = `RET-${Date.now()}`;

    // Create sale return
    const result = await createSaleReturn(
      companyId,
      sale_id,
      returnNo,
      return_date,
      saleDetails.customer_account_id,
      items,
      refund_type,
      notes,
      userId
    );

    // Auto-insert cash book entry if refund is cash
    if (refund_type === 'cash') {
      try {
        await insertCashBookEntry(
          companyId,
          new Date().toISOString().split('T')[0],
          'sale_return',
          result.id,
          result.return_no,
          `Sale Return - ${result.return_no}`,
          0,
          result.refund_amount,
          userId,
          ''
        );
      } catch (cashErr) {
        console.error('Failed to insert cash book entry:', cashErr);
        // Don't fail the return if cash book entry fails
      }
    }

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Create sale return error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: List sale returns
router.get('/', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    let { startDate, endDate } = req.query;

    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }
    if (!startDate) {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString().split('T')[0];
    }

    const returns = await getSaleReturnsByCompany(companyId, startDate, endDate);
    return res.json({ success: true, data: returns });
  } catch (error) {
    console.error('Get sale returns error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get sale return details
router.get('/:id', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const returnDetails = await getSaleReturnDetails(req.params.id);
    if (!returnDetails) {
      return res.status(404).json({ success: false, error: 'Sale return not found' });
    }

    return res.json({ success: true, data: returnDetails });
  } catch (error) {
    console.error('Get sale return details error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
