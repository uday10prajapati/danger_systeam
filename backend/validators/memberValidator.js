const { body, validationResult } = require('express-validator');

const validateCreateMember = [
  body('account_id')
    .notEmpty().withMessage('Account is required')
    .isInt().withMessage('Account ID must be a number'),
  body('member_name')
    .notEmpty().withMessage('Member name is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Member name must be 2-100 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[0-9\-\+\(\)\s]+$/).withMessage('Invalid phone format')
    .isLength({ min: 10 }).withMessage('Phone must be at least 10 digits'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Invalid email format'),
  body('discount_percentage')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0-100'),
];

const validateUpdateMember = [
  body('member_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Member name must be 2-100 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[0-9\-\+\(\)\s]+$/).withMessage('Invalid phone format')
    .isLength({ min: 10 }).withMessage('Phone must be at least 10 digits'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Invalid email format'),
  body('discount_percentage')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0-100'),
];

// Validation error handler
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

module.exports = {
  validateCreateMember,
  validateUpdateMember,
  handleValidationErrors
};
