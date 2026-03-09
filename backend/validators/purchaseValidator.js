export function validatePurchase(data) {
  const errors = {};

  // Supplier validation
  if (!data.supplier_account_id) {
    errors.supplier_account_id = 'Supplier is required';
  } else if (typeof data.supplier_account_id !== 'number' || data.supplier_account_id <= 0) {
    errors.supplier_account_id = 'Invalid supplier';
  }

  // Invoice No validation
  if (!data.invoice_no || typeof data.invoice_no !== 'string') {
    errors.invoice_no = 'Invoice number is required';
  } else if (data.invoice_no.trim().length === 0) {
    errors.invoice_no = 'Invoice number cannot be empty';
  } else if (data.invoice_no.length > 100) {
    errors.invoice_no = 'Invoice number is too long (max 100 characters)';
  }

  // Invoice Date validation
  if (!data.invoice_date) {
    errors.invoice_date = 'Invoice date is required';
  } else {
    const date = new Date(data.invoice_date);
    if (isNaN(date.getTime())) {
      errors.invoice_date = 'Invalid invoice date format';
    } else if (date > new Date()) {
      errors.invoice_date = 'Invoice date cannot be in the future';
    }
  }

  // Items validation
  if (!data.items || !Array.isArray(data.items)) {
    errors.items = 'Items are required';
  } else if (data.items.length === 0) {
    errors.items = 'At least one item is required';
  } else {
    const itemErrors = [];
    data.items.forEach((item, index) => {
      const itemError = {};

      // Item ID validation
      if (!item.item_id || typeof item.item_id !== 'number' || item.item_id <= 0) {
        itemError.item_id = 'Valid item selection is required';
      }

      // Quantity validation
      if (!item.quantity || typeof item.quantity !== 'number') {
        itemError.quantity = 'Quantity is required and must be a number';
      } else if (item.quantity <= 0) {
        itemError.quantity = 'Quantity must be greater than 0';
      } else if (item.quantity > 999999.99) {
        itemError.quantity = 'Quantity is too large';
      }

      // Purchase Rate validation
      if (!item.purchase_rate || typeof item.purchase_rate !== 'number') {
        itemError.purchase_rate = 'Purchase rate is required and must be a number';
      } else if (item.purchase_rate < 0) {
        itemError.purchase_rate = 'Purchase rate cannot be negative';
      } else if (item.purchase_rate > 999999.99) {
        itemError.purchase_rate = 'Purchase rate is too large';
      }

      if (Object.keys(itemError).length > 0) {
        itemErrors[index] = itemError;
      }
    });

    if (itemErrors.length > 0 && itemErrors.some(e => e)) {
      errors.items = itemErrors;
    }
  }

  // Notes validation (optional)
  if (data.notes && typeof data.notes !== 'string') {
    errors.notes = 'Notes must be text';
  } else if (data.notes && data.notes.length > 500) {
    errors.notes = 'Notes are too long (max 500 characters)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function validatePurchaseUpdate(data) {
  // Purchases cannot be updated, only reversed via Purchase Return
  return {
    isValid: false,
    errors: { message: 'Purchases cannot be updated. Create a Purchase Return to reverse.' }
  };
}
