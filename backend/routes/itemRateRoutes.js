import express from 'express'
import { query, execute } from '../db.js'
import { validateItemRate } from '../validators/itemRateValidator.js'

const router = express.Router()

// Middleware to get company ID from header
const getCompanyId = (req, res, next) => {
  const companyId = req.headers['x-company-id']
  if (!companyId) {
    return res.status(400).json({
      success: false,
      message: 'Missing x-company-id header'
    })
  }
  req.companyId = companyId
  next()
}

router.use(getCompanyId)

/**
 * POST /api/item-rates
 * Create new item rate
 * Automatically deactivates old rate for the item
 */
router.post('/', validateItemRate(), async (req, res) => {
  console.log('--- ITEM RATE POST ---');
  console.log('Body:', req.body);
  console.log('CompanyId Header:', req.headers['x-company-id']);
  try {
    const { item_id, purchase_rate, sale_rate, mrp, effective_from } = req.body
    const companyId = req.companyId

    // Verify item exists and belongs to company
    const items = await query(
      'SELECT id FROM item_master WHERE id = ? AND company_id = ? AND is_active = 1',
      [item_id, companyId]
    )

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found or inactive'
      })
    }

    // Deactivate previous active rate for this item
    await execute(
      'UPDATE item_rate SET is_active = 0 WHERE item_id = ? AND company_id = ? AND is_active = 1',
      [item_id, companyId]
    )

    // Insert new rate
    const result = await execute(
      `INSERT INTO item_rate 
       (company_id, item_id, purchase_rate, sale_rate, mrp, effective_from, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [companyId, item_id, purchase_rate, sale_rate, mrp || null, effective_from]
    )

    // Sync with item_master for compatibility
    await execute(
      'UPDATE item_master SET purchase_price = ?, sale_price = ? WHERE id = ?',
      [purchase_rate, sale_rate, item_id]
    )

    res.json({
      success: true,
      message: 'Item rate created successfully and synced to master',
      data: {
        id: result.insertId,
        company_id: companyId,
        item_id,
        purchase_rate,
        sale_rate,
        mrp: mrp || null,
        effective_from,
        is_active: 1,
        created_at: new Date()
      }
    })
  } catch (error) {
    console.error('Create item rate error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create item rate',
      error: error.message
    })
  }
})

/**
 * GET /api/item-rates/company/:companyId
 * List all rates (active and inactive) for a company with pagination
 */
router.get('/company/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params
    const { status = 'all', page = 1, limit = 20 } = req.query

    let queryStr = `
      SELECT 
        ir.id,
        ir.company_id,
        ir.item_id,
        im.item_name,
        im.item_code,
        im.barcode,
        ir.purchase_rate,
        ir.sale_rate,
        ir.mrp,
        ir.effective_from,
        ir.is_active,
        ir.created_at,
        ir.updated_at,
        CASE 
          WHEN ir.is_active = 1 THEN 'Active' 
          ELSE 'Inactive' 
        END AS status
      FROM item_rate ir
      JOIN item_master im ON ir.item_id = im.id
      WHERE ir.company_id = ?
    `

    let params = [companyId]

    if (status !== 'all') {
      queryStr += status === 'active' 
        ? ' AND ir.is_active = 1' 
        : ' AND ir.is_active = 0'
    }

    queryStr += ' ORDER BY ir.item_id, ir.effective_from DESC'

    // Pagination
    const offset = (page - 1) * limit
    queryStr += ` LIMIT ${limit} OFFSET ${offset}`

    const rates = await query(queryStr, params)

    // Get total count
    const countQueryStr = `
      SELECT COUNT(*) as total FROM item_rate 
      WHERE company_id = ?
      ${status !== 'all' ? (status === 'active' ? 'AND is_active = 1' : 'AND is_active = 0') : ''}
    `
    const countResult = await query(countQueryStr, [companyId])

    res.json({
      success: true,
      data: rates,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult[0].total / limit)
      }
    })
  } catch (error) {
    console.error('Fetch rates error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item rates'
    })
  }
})

/**
 * GET /api/item-rates/item/:itemId
 * Get ACTIVE rate for an item (used by Sale module)
 */
router.get('/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params
    const companyId = req.companyId

    const rates = await query(
      `SELECT 
        id,
        company_id,
        item_id,
        purchase_rate,
        sale_rate,
        mrp,
        effective_from,
        is_active,
        created_at
      FROM item_rate 
      WHERE item_id = ? AND company_id = ? AND is_active = 1
      LIMIT 1`,
      [itemId, companyId]
    )

    if (rates.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active rate found for this item'
      })
    }

    res.json({
      success: true,
      data: rates[0]
    })
  } catch (error) {
    console.error('Fetch active rate error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item rate'
    })
  }
})

/**
 * GET /api/item-rates/history/:itemId
 * Get price history (all rates) for an item
 */
router.get('/history/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params
    const companyId = req.companyId

    const history = await query(
      `SELECT 
        id,
        item_id,
        purchase_rate,
        sale_rate,
        mrp,
        effective_from,
        is_active,
        created_at,
        CASE WHEN is_active = 1 THEN 'Active' ELSE 'Inactive' END AS status
      FROM item_rate 
      WHERE item_id = ? AND company_id = ?
      ORDER BY effective_from DESC, created_at DESC`,
      [itemId, companyId]
    )

    res.json({
      success: true,
      data: history
    })
  } catch (error) {
    console.error('Fetch price history error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch price history'
    })
  }
})

/**
 * GET /api/item-rates/:id
 * Get single rate details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const companyId = req.companyId

    const rates = await query(
      `SELECT * FROM item_rate WHERE id = ? AND company_id = ?`,
      [id, companyId]
    )

    if (rates.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item rate not found'
      })
    }

    res.json({
      success: true,
      data: rates[0]
    })
  } catch (error) {
    console.error('Fetch rate error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch item rate'
    })
  }
})

/**
 * PUT /api/item-rates/:id
 * Update item rate
 */
router.put('/:id', validateItemRate(), async (req, res) => {
  try {
    const { id } = req.params
    const { purchase_rate, sale_rate, mrp, effective_from } = req.body
    const companyId = req.companyId

    // Verify rate exists and belongs to company
    const existingRates = await query(
      'SELECT item_id FROM item_rate WHERE id = ? AND company_id = ?',
      [id, companyId]
    )

    if (existingRates.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item rate not found'
      })
    }

    // Update the rate
    await query(
      `UPDATE item_rate 
       SET purchase_rate = ?, sale_rate = ?, mrp = ?, effective_from = ?
       WHERE id = ?`,
      [purchase_rate, sale_rate, mrp || null, effective_from, id]
    )

    // Sync with item_master if this was the active rate
    // Note: In this system, typically the one being edited is the active one or we just sync it anyway
    await execute(
      'UPDATE item_master SET purchase_price = ?, sale_price = ? WHERE id = ?',
      [purchase_rate, sale_rate, existingRates[0].item_id]
    )

    const updatedRate = await query(
      'SELECT * FROM item_rate WHERE id = ?',
      [id]
    )

    res.json({
      success: true,
      message: 'Item rate updated successfully and synced to master',
      data: updatedRate[0]
    })
  } catch (error) {
    console.error('Update item rate error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update item rate'
    })
  }
})

/**
 * POST /api/item-rates/:id/deactivate
 * Manually deactivate a rate
 */
router.post('/:id/deactivate', async (req, res) => {
  try {
    const { id } = req.params
    const companyId = req.companyId

    const result = await query(
      'UPDATE item_rate SET is_active = 0 WHERE id = ? AND company_id = ?',
      [id, companyId]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item rate not found'
      })
    }

    res.json({
      success: true,
      message: 'Item rate deactivated successfully'
    })
  } catch (error) {
    console.error('Deactivate rate error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate item rate'
    })
  }
})

/**
 * GET /api/item-rates/active/all
 * Get all active rates for a company (used for reports)
 */
router.get('/active/all', async (req, res) => {
  try {
    const companyId = req.companyId

    const rates = await query(
      `SELECT 
        ir.id,
        ir.item_id,
        im.item_name,
        im.item_code,
        ir.purchase_rate,
        ir.sale_rate,
        ir.mrp,
        ir.effective_from,
        ir.is_active
      FROM item_rate ir
      JOIN item_master im ON ir.item_id = im.id
      WHERE ir.company_id = ? AND ir.is_active = 1
      ORDER BY im.item_code`,
      [companyId]
    )

    res.json({
      success: true,
      data: rates
    })
  } catch (error) {
    console.error('Fetch active rates error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active rates'
    })
  }
})

export default router
