export function validateSaleReturn(data) {
  const errors = {};

  // Validate sale_id
  if (!data.sale_id || data.sale_id <= 0) {
    errors.sale_id = 'Sale ID is required';
  }

  // Validate return_date
  if (!data.return_date) {
    errors.return_date = 'Return date is required';
  } else {
    const [year, month, day] = data.return_date.split('-').map(Number);
    const returnDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (returnDate > today) {
      errors.return_date = 'Return date cannot be in the future';
    }
  }

  // Validate items array
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.items = 'At least one item must be returned';
  } else {
    data.items.forEach((item, index) => {
      if (!item.item_id || item.item_id <= 0) {
        errors[`items[${index}].item_id`] = 'Invalid item ID';
      }
      if (!item.quantity || item.quantity <= 0) {
        errors[`items[${index}].quantity`] = 'Quantity must be greater than 0';
      }
      if (!item.sale_rate || item.sale_rate < 0) {
        errors[`items[${index}].sale_rate`] = 'Sale rate is required';
      }
    });
  }

  // Validate refund_type
  if (!data.refund_type || !['cash', 'credit'].includes(data.refund_type)) {
    errors.refund_type = 'Refund type must be "cash" or "credit"';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
