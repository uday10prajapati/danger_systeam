import { body, validationResult } from 'express-validator'

export const validateItemRate = () => [
  body('item_id')
    .isInt({ min: 1 })
    .withMessage('Item must be selected'),
  
  body('purchase_rate')
    .isFloat({ min: 0.01 })
    .withMessage('Purchase rate must be a positive number'),
  
  body('sale_rate')
    .isFloat({ min: 0.01 })
    .withMessage('Sale rate must be a positive number'),
  
  body('mrp')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('MRP must be a positive number'),
  
  body('effective_from')
    .isISO8601()
    .withMessage('Effective date must be a valid date (YYYY-MM-DD)'),
  
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      console.log('❌ Validation Errors:', errors.array());
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => err.msg)
      })
    }
    next()
  }
]

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => err.msg)
    })
  }
  next()
}
