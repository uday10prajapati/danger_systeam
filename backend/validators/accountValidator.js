// ==================== ACCOUNT VALIDATOR ====================
export function validateAccount(data, isUpdate = false) {
  const { company_id, account_name, account_type, phone, email, opening_balance, gst_no, tin_no } = data;

  // For create, all required fields must be present
  if (!isUpdate) {
    if (!company_id) return 'Company is required';
    if (!account_name || account_name.trim().length < 2) {
      return 'Account name must be at least 2 characters';
    }
    if (!account_type) return 'Account type is required';
  }

  // For update, validate only provided fields
  if (isUpdate) {
    if (account_name !== undefined && account_name.trim().length < 2) {
      return 'Account name must be at least 2 characters';
    }
  }

  // Account name validation (if provided)
  if (account_name && account_name.trim().length > 100) {
    return 'Account name cannot exceed 100 characters';
  }

  // Account type validation
  const validTypes = ['customer', 'supplier', 'cash', 'bank', 'expense', 'assets', 'liabilities', 'capital', 'revenue', 'purchase', 'sales'];
  if (account_type && !validTypes.includes(account_type)) {
    return `Account type must be one of: ${validTypes.join(', ')}`;
  }

  // Phone validation (optional but if provided, must be valid)
  if (phone && !/^[0-9\s\-\+\(\)]{7,20}$/.test(phone)) {
    return 'Phone number must be 7-20 characters with digits, spaces, hyphens, or parentheses';
  }

  // Email validation (optional but if provided, must be valid)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Invalid email format';
  }

  // GST Number validation (optional but if provided, must be valid)
  // GSTIN format: 15 alphanumeric characters
  if (gst_no && gst_no.trim().length > 0) {
    if (!/^[0-9A-Z]{15}$/.test(gst_no.trim())) {
      return 'GST Number must be 15 characters alphanumeric';
    }
  }

  // TIN Number validation (optional but if provided, must be valid)
  // TIN format: 11 digits (legacy Indian taxation number)
  if (tin_no && tin_no.trim().length > 0) {
    if (!/^[0-9]{11}$/.test(tin_no.trim())) {
      return 'TIN Number must be 11 digits';
    }
  }

  // Opening balance validation (optional but if provided, must be valid)
  if (opening_balance !== undefined && (isNaN(opening_balance) || opening_balance < 0)) {
    return 'Opening balance must be a non-negative number';
  }

  return null; // No errors
}
