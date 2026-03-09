import express from 'express';
import { query, execute } from '../db.js';
import { validationResult } from 'express-validator';
import { validateCreateItem, validateUpdateItem } from '../validators/itemValidator.js';

const router = express.Router();

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      error: errors.array()[0].msg 
    });
  }
  next();
};

/**
 * CREATE ITEM
 * POST /api/items
 */
router.post('/', validateCreateItem, handleValidationErrors, async (req, res) => {
  try {
    const { item_name, item_code, barcode, category, unit, tax_percentage, reorder_level } = req.body;
    const company_id = req.headers['x-company-id'];
    
    if (!company_id) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }

    // Check if item_code already exists for this company
    const itemCodes = await query(
      'SELECT id FROM item_master WHERE item_code = ? AND company_id = ?',
      [item_code, company_id]
    );

    if (itemCodes && itemCodes.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Item code already exists for this company' 
      });
    }

    // Check if barcode already exists (globally unique)
    const barcodes = await query(
      'SELECT id FROM item_master WHERE barcode = ?',
      [barcode]
    );

    if (barcodes && barcodes.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Barcode already exists in the system' 
      });
    }

    // Create item
    await execute(
      'INSERT INTO item_master (company_id, item_name, item_code, barcode, category, unit, tax_percentage, reorder_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [company_id, item_name, item_code, barcode, category || null, unit, tax_percentage || 0, reorder_level || 0]
    );

    // Get the created item
    const items = await query(
      'SELECT * FROM item_master WHERE item_code = ? AND company_id = ?',
      [item_code, company_id]
    );

    res.status(201).json({
      success: true,
      data: items[0]
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * LIST ITEMS BY COMPANY
 * GET /api/items/company/:companyId
 * Query: ?active=true|false (optional), ?category=X (optional), ?search=X (optional)
 */
router.get('/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const { active, category, search } = req.query;

    let sql = 'SELECT * FROM item_master WHERE company_id = ?';
    const params = [companyId];

    if (active === 'true') {
      sql += ' AND is_active = 1';
    } else if (active === 'false') {
      sql += ' AND is_active = 0';
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (item_name LIKE ? OR item_code LIKE ? OR barcode LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY created_at DESC';

    const items = await query(sql, params);
    res.json({ success: true, data: items || [] });
  } catch (error) {
    console.error('List items error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * FETCH ITEM BY BARCODE (for POS)
 * GET /api/items/barcode/:barcode
 * Returns: item details with active rate and current stock
 */
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;
    const companyId = req.headers['x-company-id'];

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    // Fetch item with active rate and current stock
    const sql = `
      SELECT 
        im.id,
        im.item_code,
        im.item_name,
        im.category,
        im.unit,
        im.barcode,
        im.tax_percentage,
        COALESCE(SUM(psl.quantity_in - psl.quantity_out), 0) as current_stock,
        ir.id as rate_id,
        ir.sale_rate,
        ir.purchase_rate,
        ir.is_active
      FROM item_master im
      LEFT JOIN purchase_stock_ledger psl ON im.id = psl.item_id AND psl.company_id = ?
      LEFT JOIN item_rate ir ON im.id = ir.item_id AND ir.is_active = 1
      WHERE im.barcode = ? AND im.company_id = ? AND im.is_active = 1
      GROUP BY im.id, ir.id
      LIMIT 1
    `;

    const items = await query(sql, [companyId, barcode, companyId]);

    if (!items || items.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Item not found or inactive' 
      });
    }

    const item = items[0];

    // Check if item has active rate
    if (!item.rate_id || !item.sale_rate) {
      return res.status(400).json({ 
        success: false, 
        error: 'Item has no active rate configured',
        item: {
          id: item.id,
          item_code: item.item_code,
          item_name: item.item_name
        }
      });
    }

    res.json({ 
      success: true, 
      data: {
        id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        category: item.category,
        unit: item.unit,
        barcode: item.barcode,
        tax_percentage: item.tax_percentage,
        current_stock: parseFloat(item.current_stock || 0),
        sale_rate: parseFloat(item.sale_rate || 0),
        purchase_rate: parseFloat(item.purchase_rate || 0)
      }
    });
  } catch (error) {
    console.error('Get item by barcode error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET SINGLE ITEM
 * GET /api/items/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const items = await query(
      'SELECT * FROM item_master WHERE id = ?',
      [id]
    );

    if (!items || items.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({ success: true, data: items[0] });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * UPDATE ITEM
 * PUT /api/items/:id
 * Note: Cannot update item_code or barcode
 */
router.put('/:id', validateUpdateItem, handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { item_name, category, unit, tax_percentage, reorder_level } = req.body;

    const updates = [];
    const values = [];

    if (item_name !== undefined) {
      updates.push('item_name = ?');
      values.push(item_name);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category || null);
    }
    if (unit !== undefined) {
      updates.push('unit = ?');
      values.push(unit);
    }
    if (tax_percentage !== undefined) {
      updates.push('tax_percentage = ?');
      values.push(tax_percentage);
    }
    if (reorder_level !== undefined) {
      updates.push('reorder_level = ?');
      values.push(reorder_level);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE item_master SET ${updates.join(', ')} WHERE id = ?`;
    
    await execute(sql, values);
    res.json({ success: true, message: 'Item updated successfully' });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ACTIVATE ITEM
 * POST /api/items/:id/activate
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    await execute('UPDATE item_master SET is_active = 1 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Item activated successfully' });
  } catch (error) {
    console.error('Activate item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DEACTIVATE ITEM
 * POST /api/items/:id/deactivate
 */
router.post('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params;
    await execute('UPDATE item_master SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Item deactivated successfully' });
  } catch (error) {
    console.error('Deactivate item error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET CATEGORIES (for filter dropdown)
 * GET /api/items/categories/:companyId
 */
router.get('/categories/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;

    const categories = await query(
      'SELECT DISTINCT category FROM item_master WHERE company_id = ? AND category IS NOT NULL ORDER BY category',
      [companyId]
    );

    const categoryList = categories.map(c => c.category);
    res.json({ success: true, data: categoryList });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
