import { body } from 'express-validator';

export const validateCreateItem = [
  body('item_name')
    .notEmpty().withMessage('Item name is required')
    .trim()
    .isLength({ min: 2, max: 255 }).withMessage('Item name must be 2-255 characters'),
  body('item_code')
    .notEmpty().withMessage('Item code (SKU) is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Item code must be 2-100 characters')
    .matches(/^[A-Z0-9\-_]+$/).withMessage('Item code must contain only uppercase letters, numbers, hyphens, and underscores'),
  body('barcode')
    .notEmpty().withMessage('Barcode is required')
    .trim()
    .isLength({ min: 5, max: 100 }).withMessage('Barcode must be 5-100 characters'),
  body('category')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Category must not exceed 100 characters'),
  body('unit')
    .notEmpty().withMessage('Unit is required')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Unit must be 2-50 characters'),
  body('tax_percentage')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage('Tax percentage must be between 0-100'),
  body('reorder_level')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 }).withMessage('Reorder level must be a non-negative number'),
];

export const validateUpdateItem = [
  body('item_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 255 }).withMessage('Item name must be 2-255 characters'),
  body('category')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('Category must not exceed 100 characters'),
  body('unit')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Unit must be 2-50 characters'),
  body('tax_percentage')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage('Tax percentage must be between 0-100'),
  body('reorder_level')
    .optional({ checkFalsy: true })
    .isInt({ min: 0 }).withMessage('Reorder level must be a non-negative number'),
];
