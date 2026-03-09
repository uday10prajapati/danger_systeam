// ===== USER VALIDATOR =====
// File: backend/validators/userValidator.js

export function validateUser(data) {
  const errors = {};

  // company_id validation
  if (!data.company_id) {
    errors.company_id = 'Company is required';
  } else if (!Number.isInteger(data.company_id) || data.company_id <= 0) {
    errors.company_id = 'Valid company ID is required';
  }

  // Username validation
  if (!data.username || data.username.trim() === '') {
    errors.username = 'Username is required';
  } else if (data.username.trim().length < 3) {
    errors.username = 'Username must be at least 3 characters';
  } else if (data.username.trim().length > 50) {
    errors.username = 'Username must not exceed 50 characters';
  } else if (!/^[a-zA-Z0-9_.-]+$/.test(data.username.trim())) {
    errors.username = 'Username can only contain letters, numbers, dots, dashes, and underscores';
  }

  // Email validation
  if (!data.email || data.email.trim() === '') {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = 'Email must be a valid email address';
  }

  // Password validation (only for create, not update)
  if (data.password) {
    if (data.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (data.password.length > 100) {
      errors.password = 'Password must not exceed 100 characters';
    }
  } else if (!data.id) {
    // Password is required only when creating new user
    errors.password = 'Password is required';
  }

  // Role validation
  const validRoles = ['admin', 'manager', 'cashier'];
  if (!data.role) {
    errors.role = 'Role is required';
  } else if (!validRoles.includes(data.role)) {
    errors.role = `Role must be one of: ${validRoles.join(', ')}`;
  }

  // is_active validation
  if (data.is_active !== undefined && typeof data.is_active !== 'boolean') {
    errors.is_active = 'is_active must be a boolean value';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Validate login credentials
export function validateLogin(data) {
  const errors = {};

  if (!data.username || data.username.trim() === '') {
    errors.username = 'Username is required';
  }

  if (!data.password || data.password === '') {
    errors.password = 'Password is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
