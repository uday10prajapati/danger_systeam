/**
 * Sale Validator with Customer Balance Support
 */

export function validateSale(data) {
  const errors = {};

  // Invoice date validation
  if (!data.invoice_date) {
    errors.invoice_date = 'Invoice date is required';
  } else {
    const [year, month, day] = data.invoice_date.split('-').map(Number);
    const invDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (invDate > today) {
      errors.invoice_date = 'Invoice date cannot be in the future';
    }
  }

  // Items validation
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.items = 'At least one item is required';
  } else {
    data.items.forEach((item, index) => {
      if (!item.item_id) {
        errors[`item_${index}_id`] = 'Item ID is required';
      }
      if (!item.quantity || item.quantity <= 0) {
        errors[`item_${index}_qty`] = 'Quantity must be greater than 0';
      }
      if (!item.sale_rate || item.sale_rate <= 0) {
        errors[`item_${index}_rate`] = 'Sale rate must be greater than 0';
      }
    });
  }

  // Payment type validation
  const validPaymentTypes = ['cash', 'card', 'upi', 'credit'];
  if (data.payment_type && !validPaymentTypes.includes(data.payment_type)) {
    errors.payment_type = 'Invalid payment type';
  }

  // NEW: Amount Paid validation
  if (data.amount_paid === undefined || data.amount_paid === null) {
    errors.amount_paid = 'Amount paid is required';
  } else {
    const amountPaid = parseFloat(data.amount_paid);
    
    if (isNaN(amountPaid)) {
      errors.amount_paid = 'Amount paid must be a valid number';
    } else if (amountPaid < 0) {
      errors.amount_paid = 'Amount paid cannot be negative';
    }
    // Note: amount_paid can be 0 (for credit sales), can be less than or greater than total
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
