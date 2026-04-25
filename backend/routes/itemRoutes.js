import express from 'express';
import { query, execute } from '../db.js';
import { validationResult } from 'express-validator';
import { validateCreateItem, validateUpdateItem } from '../validators/itemValidator.js';
import { transliterateEnglishToGujarati, translateDescription } from '../utils/transliterate.js';

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
    const {
      item_code, consider_in_autostock, item_name, item_name_gu, desc_en, desc_gu,
      unit, unit_gu, purchase_account_id, sales_account_id,
      do_auto_stock_in_sales, opening_stock, opening_stock_value, minimum_stock, loss_per_kg,
      effective_date, sgst_percent, cgst_percent, igst_percent, cess_percent, hsn_code,
      barcode, category, tax_percentage, reorder_level, purchase_price, sale_price
    } = req.body;
    
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

    // Create item
    await execute(
      `INSERT INTO item_master (
        company_id, item_code, consider_in_autostock, item_name, item_name_gu, desc_en, desc_gu,
        unit, unit_gu, purchase_account_id, sales_account_id,
        do_auto_stock_in_sales, opening_stock, opening_stock_value, minimum_stock, loss_per_kg,
        effective_date, sgst_percent, cgst_percent, igst_percent, cess_percent, hsn_code,
        barcode, category, tax_percentage, reorder_level, purchase_price, sale_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company_id, item_code, consider_in_autostock ? 1 : 0, item_name, item_name_gu || null, desc_en || null, desc_gu || null,
        unit || 'PCS', unit_gu || null, purchase_account_id || null, sales_account_id || null,
        do_auto_stock_in_sales ? 1 : 0, opening_stock || 0, opening_stock_value || 0, minimum_stock || 0, loss_per_kg || 0,
        effective_date || null, sgst_percent || 0, cgst_percent || 0, igst_percent || 0, cess_percent || 0, hsn_code || null,
        barcode || null, category || null, tax_percentage || 0, reorder_level || 0, purchase_price || 0, sale_price || 0
      ]
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
 * GET ALL ITEMS
 */
router.get('/', async (req, res) => {
  try {
    const companyId = req.headers['x-company-id'];
    const results = await query(
      `SELECT * FROM item_master WHERE company_id = ? AND is_active = 1 ORDER BY item_name ASC`,
      [companyId]
    );
    res.json({ success: true, data: results || [] });
  } catch (error) {
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

    let sql = `
      SELECT im.*, 
        COALESCE(SUM(psl.quantity_in), 0) as inward, 
        COALESCE(SUM(psl.quantity_out), 0) as outward
      FROM item_master im
      LEFT JOIN purchase_stock_ledger psl ON im.id = psl.item_id AND im.company_id = psl.company_id
      WHERE im.company_id = ?
    `;
    const params = [companyId];

    if (active === 'true') {
      sql += ' AND im.is_active = 1';
    } else if (active === 'false') {
      sql += ' AND im.is_active = 0';
    }

    if (category) {
      sql += ' AND im.category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (im.item_name LIKE ? OR im.item_code LIKE ? OR im.barcode LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ' GROUP BY im.id ORDER BY im.created_at DESC';

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
 * TRANSLATE TEXT TO GUJARATI
 * POST /api/items/translate
 * Body: { text: string, type: 'name' | 'description' | 'unit' }
 */
router.post('/translate', async (req, res) => {
  try {
    const { text, type } = req.body;

    if (!text) {
      return res.status(400).json({ 
        success: false, 
        error: 'Text is required' 
      });
    }

    let gujaratiText;
    
    switch (type) {
      case 'description':
        gujaratiText = translateDescription(text);
        break;
      case 'name':
      case 'unit':
      default:
        gujaratiText = transliterateEnglishToGujarati(text);
    }

    res.json({
      success: true,
      data: {
        english: text,
        gujarati: gujaratiText,
        type: type || 'name'
      }
    });
  } catch (error) {
    console.error('Translation error:', error);
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

    const items = await query(`
      SELECT im.*, 
        COALESCE(SUM(psl.quantity_in), 0) as inward, 
        COALESCE(SUM(psl.quantity_out), 0) as outward
      FROM item_master im
      LEFT JOIN purchase_stock_ledger psl ON im.id = psl.item_id AND im.company_id = psl.company_id
      WHERE im.id = ?
      GROUP BY im.id
    `, [id]);

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
    const {
      item_name, item_name_gu, desc_en, desc_gu, consider_in_autostock,
      unit, unit_gu, purchase_account_id, sales_account_id,
      do_auto_stock_in_sales, opening_stock, opening_stock_value, minimum_stock, loss_per_kg,
      effective_date, sgst_percent, cgst_percent, igst_percent, cess_percent, hsn_code,
      category, tax_percentage, reorder_level, purchase_price, sale_price
    } = req.body;

    const updates = [];
    const values = [];

    const addUpdate = (field, value) => {
      if (value !== undefined) {
        updates.push(`${field} = ?`);
        values.push(value);
      }
    };

    addUpdate('item_name', item_name);
    addUpdate('item_name_gu', item_name_gu);
    addUpdate('desc_en', desc_en);
    addUpdate('desc_gu', desc_gu);
    if (consider_in_autostock !== undefined) {
      updates.push('consider_in_autostock = ?');
      values.push(consider_in_autostock ? 1 : 0);
    }
    addUpdate('unit', unit);
    addUpdate('unit_gu', unit_gu);
    addUpdate('purchase_account_id', purchase_account_id);
    addUpdate('sales_account_id', sales_account_id);
    if (do_auto_stock_in_sales !== undefined) {
      updates.push('do_auto_stock_in_sales = ?');
      values.push(do_auto_stock_in_sales ? 1 : 0);
    }
    addUpdate('opening_stock', opening_stock);
    addUpdate('opening_stock_value', opening_stock_value);
    addUpdate('minimum_stock', minimum_stock);
    addUpdate('loss_per_kg', loss_per_kg);
    addUpdate('effective_date', effective_date);
    addUpdate('sgst_percent', sgst_percent);
    addUpdate('cgst_percent', cgst_percent);
    addUpdate('igst_percent', igst_percent);
    addUpdate('cess_percent', cess_percent);
    addUpdate('hsn_code', hsn_code);
    addUpdate('category', category);
    addUpdate('tax_percentage', tax_percentage);
    addUpdate('reorder_level', reorder_level);
    addUpdate('purchase_price', purchase_price);
    addUpdate('sale_price', sale_price);

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
