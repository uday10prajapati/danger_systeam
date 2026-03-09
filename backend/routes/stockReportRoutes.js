import express from 'express';
import * as db from '../db.js';

const router = express.Router();

// Get complete stock report
router.get('/', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }
    
    const report = await db.getStockReport(companyId);
    
    res.json({
      success: true,
      data: report,
      totalItems: report.length,
      lowStockItems: report.filter(item => item.stock_status === 'LOW').length
    });
  } catch (error) {
    console.error('Error fetching stock report:', error);
    res.status(500).json({ error: 'Failed to fetch stock report' });
  }
});

// Get low stock items (need reordering)
router.get('/low-stock', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }
    
    const lowStockItems = await db.getLowStockItems(companyId);
    
    res.json({
      success: true,
      data: lowStockItems,
      count: lowStockItems.length
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

// Get stock history for a specific item
router.get('/item/:itemId', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const { itemId } = req.params;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }
    
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID required' });
    }
    
    const history = await db.getItemStockHistory(parseInt(itemId), companyId);
    
    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ error: 'Failed to fetch stock history' });
  }
});

export default router;
