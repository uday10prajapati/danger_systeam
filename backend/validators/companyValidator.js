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

  // Validate phone (10-15 digits)
  if (!data.phone || !/^[0-9]{10,15}$/.test(data.phone.replace(/[-\s]/g, ''))) {
    errors.push('Phone must be 10-15 digits');
  }

  // Validate email
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }

  // Validate GST (15 characters for India)
  if (data.gst_number && !/^[0-9A-Z]{15}$/.test(data.gst_number.toUpperCase())) {
    errors.push('GST number must be 15 alphanumeric characters');
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
    
    // Check if dates are exactly 1 year apart (or 365 days for leap years)
    const daysDiff = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff < 360 || daysDiff > 370) {
      errors.push('Financial year must be approximately 1 year');
    }
  }

  // Validate currency
  const validCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD'];
  if (!data.currency || !validCurrencies.includes(data.currency.toUpperCase())) {
    errors.push(`Currency must be one of: ${validCurrencies.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
