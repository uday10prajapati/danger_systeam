// ===== COMPANY VALIDATION =====
// File: backend/validators/companyValidator.js

export function validateCompany(data) {
  const errors = [];

  // Validate company_name
  if (!data.company_name || data.company_name.trim().length < 2) {
    errors.push('Company name must be at least 2 characters');
  }

  // Validate address
  if (!data.address || data.address.trim().length < 5) {
    errors.push('Address must be at least 5 characters');
  }

  // Validate phone
  if (!data.phone || data.phone.trim().length < 5) {
    errors.push('Phone must be at least 5 characters');
  }

  // Validate email
  if (!data.email || !data.email.includes('@')) {
    errors.push('Invalid email format');
  }

  // Validate GST (15 characters for India) if provided
  if (data.gst_number && data.gst_number.trim().length < 5) {
    errors.push('GST number must be at least 5 characters');
  }

  // Validate financial year dates
  if (!data.financial_year_start || !data.financial_year_end) {
    errors.push('Financial year dates are required');
  } else {
    const startDate = new Date(data.financial_year_start);
    const endDate = new Date(data.financial_year_end);
    
    if (startDate >= endDate) {
      errors.push('Financial year start must be before end date');
    }
  }

  // Validate currency
  const validCurrencies = ['INR'];
  if (!data.currency || !validCurrencies.includes(data.currency.toUpperCase())) {
    errors.push(`Currency must be one of: ${validCurrencies.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
