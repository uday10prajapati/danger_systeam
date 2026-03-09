export function validateSale(data) {
  const errors = {};

  // Invoice date validation
  if (!data.invoice_date) {
    errors.invoice_date = 'Invoice date is required';
  } else {
    // Parse date string as local date (YYYY-MM-DD format)
    const [year, month, day] = data.invoice_date.split('-').map(Number);
    const invDate = new Date(year, month - 1, day);
    
    // Get today's date in local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Allow today or past dates only
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

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
