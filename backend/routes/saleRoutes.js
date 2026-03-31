import express from 'express';
import db, { 
  createSale, 
  getSalesByCompany, 
  getSaleDetails, 
  getItemByBarcode,
  getItemRate,
  insertCashBookEntry,
  query
} from '../db.js';
import { validateSale } from '../validators/saleValidator.js';

const router = express.Router();

// POST: Create new sale
router.post('/', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const userId = req.header('x-user-id');

    if (!companyId || !userId) {
      return res.status(400).json({ success: false, error: 'Company ID and User ID required' });
    }

    const { invoice_date, customer_account_id, member_id, items, discount_amount, payment_type, notes } = req.body;

    // Validate input
    const validation = validateSale({ invoice_date, items, payment_type });
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    // Generate invoice number
    let invoiceNo = `GR0001`; // Default
    try {
      const lastSaleRows = await query(
        `SELECT invoice_no FROM sales WHERE company_id = ? AND invoice_no LIKE 'GR%' ORDER BY id DESC LIMIT 1`,
        [companyId]
      );
      if (lastSaleRows && lastSaleRows.length > 0 && lastSaleRows[0].invoice_no) {
        const match = lastSaleRows[0].invoice_no.match(/GR0*(\d+)/);
        if (match) {
          const nextNum = parseInt(match[1], 10) + 1;
          invoiceNo = `GR${String(nextNum).padStart(4, '0')}`;
        }
      }
    } catch (err) {
      console.error('Invoice Number Gen Error:', err);
    }

    // Create sale with atomic transaction
    const result = await createSale(
      companyId,
      invoiceNo,
      invoice_date,
      customer_account_id,
      member_id,
      items,
      discount_amount || 0,
      payment_type || 'cash',
      notes,
      userId
    );

    // Auto-insert cash book entry if payment is cash
    if ((payment_type || 'cash') === 'cash') {
      try {
        await insertCashBookEntry(
          companyId,
          invoice_date,
          'sale',
          result.id,
          result.invoice_no,
          `Sale - ${result.invoice_no}`,
          result.net_amount,
          0,
          userId,
          ''
        );
      } catch (cashErr) {
        console.error('Failed to insert cash book entry:', cashErr);
        // Don't fail the sale creation if cash book entry fails
      }
    }

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: List sales with date range
router.get('/', async (req, res) => {
  try {
    const companyId = req.header('x-company-id') || '2'; // Default to company 2

    let { startDate, endDate } = req.query;
    
    // Provide default dates if not supplied (last 30 days)
    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }
    if (!startDate) {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString().split('T')[0];
    }

    const sales = await getSalesByCompany(companyId, startDate, endDate);
    return res.json({ success: true, data: sales });
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET: Get sale details by ID
router.get('/:id', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const saleDetails = await getSaleDetails(req.params.id);
    if (!saleDetails || !saleDetails.id) {
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

// GET: Search item by barcode
router.get('/barcode/:code', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const itemData = await getItemByBarcode(req.params.code, companyId);
    if (!itemData || itemData.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    const item = itemData[0];
    return res.json({ 
      success: true, 
      data: {
        id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        current_stock: item.current_stock || 0,
        sale_rate: item.sale_rate || 0
      }
    });
  } catch (error) {
    console.error('Get barcode item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
