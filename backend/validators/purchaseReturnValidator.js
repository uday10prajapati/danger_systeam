export function validatePurchaseReturn(data) {
  const errors = {};

  // Validate purchase_id
  if (!data.purchase_id) {
    errors.purchase_id = 'Purchase selection is required';
  } else if (isNaN(parseInt(data.purchase_id))) {
    errors.purchase_id = 'Invalid purchase';
  }

  // Validate return_date
  if (!data.return_date) {
    errors.return_date = 'Return date is required';
  } else {
    const returnDate = new Date(data.return_date);
    const today = new Date();
    if (returnDate > today) {
      errors.return_date = 'Return date cannot be in the future';
    }
  }

  // Validate items array
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.items = 'At least one item must be selected for return';
  } else {
    const itemErrors = [];
    
    data.items.forEach((item, index) => {
      const itemError = {};

      // Validate item_id
      if (!item.item_id) {
        itemError.item_id = 'Item is required';
      } else if (isNaN(parseInt(item.item_id))) {
        itemError.item_id = 'Invalid item';
      }

      // Validate quantity
      if (!item.quantity) {
        itemError.quantity = 'Quantity is required';
      } else {
        const qty = parseFloat(item.quantity);
        if (isNaN(qty) || qty <= 0) {
          itemError.quantity = 'Quantity must be greater than 0';
        } else if (qty > (item.max_return_qty || 0)) {
          itemError.quantity = `Cannot exceed purchased quantity of ${item.max_return_qty}`;
        }
      }

      // Validate purchase_rate
      if (!item.purchase_rate) {
        itemError.purchase_rate = 'Rate is required';
      } else {
        const rate = parseFloat(item.purchase_rate);
        if (isNaN(rate) || rate < 0) {
          itemError.purchase_rate = 'Rate must be a valid positive number';
        }
      }

      if (Object.keys(itemError).length > 0) {
        itemErrors[index] = itemError;
      }
    });

    if (itemErrors.length > 0) {
      errors.items = itemErrors;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
