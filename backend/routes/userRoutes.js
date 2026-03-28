// ===== USER API ROUTES =====
// File: backend/routes/userRoutes.js
// User Master module with company isolation and role-based access

import bcrypt from 'bcrypt';
import { query, queryOne, execute } from '../db.js';
import { validateUser, validateLogin } from '../validators/userValidator.js';

export function registerUserRoutes(app) {
  
  // ===== CREATE USER =====
  // Create a new user (belongs to a company)
  app.post('/api/users', async (req, res) => {
    try {
      const validation = validateUser(req.body);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          errors: validation.errors
        });
      }

      const { company_id, username, email, password, role, is_active } = req.body;

      // Verify company exists
      const company = await queryOne('SELECT id FROM company WHERE id = ?', [company_id]);
      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company not found'
        });
      }

      // Check if username already exists in this company
      const existingUsername = await queryOne(
        'SELECT id FROM users WHERE company_id = ? AND username = ?',
        [company_id, username.trim()]
      );
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          error: 'Username already exists in this company'
        });
      }

      // Check if email already exists in this company
      const existingEmail = await queryOne(
        'SELECT id FROM users WHERE company_id = ? AND email = ?',
        [company_id, email.toLowerCase().trim()]
      );
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists in this company'
        });
      }

      // Hash password using bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await execute(
        `INSERT INTO users (company_id, username, email, password, role, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          company_id,
          username.trim(),
          email.toLowerCase().trim(),
          hashedPassword,
          role,
          is_active !== undefined ? (is_active ? 1 : 0) : 1
        ]
      );

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        userId: result.lastID
      });
    } catch (error) {
      console.error('Create user error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ===== LIST USERS BY COMPANY =====
  // Get all users for a specific company
  app.get('/api/users/company/:company_id', async (req, res) => {
    try {
      const { company_id } = req.params;

      // Verify company exists
      const company = await queryOne('SELECT id FROM company WHERE id = ?', [company_id]);
      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company not found'
        });
      }

      // Get users, excluding password field
      const users = await query(
        `SELECT id, company_id, username, email, role, is_active, created_at, updated_at
         FROM users
         WHERE company_id = ?
         ORDER BY created_at DESC`,
        [company_id]
      );

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('List users error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ===== GET USER BY ID =====
  // Get single user details (excluding password)
  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await queryOne(
        `SELECT id, company_id, username, email, role, is_active, created_at, updated_at
         FROM users
         WHERE id = ?`,
        [req.params.id]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get user error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ===== UPDATE USER =====
  // Update user details (username, email, role, is_active)
  app.put('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { username, email, role, is_active } = req.body;

      // Get existing user
      const existingUser = await queryOne(
        'SELECT company_id FROM users WHERE id = ?',
        [id]
      );

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Validate update data (without password)
      const validation = validateUser({
        company_id: existingUser.company_id,
        username: username || '',
        email: email || '',
        role: role || 'cashier',
        is_active: is_active !== undefined ? is_active : true,
        id: id // Indicate this is an update, not create
      });

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          errors: validation.errors
        });
      }

      // Check if new username already exists in this company (excluding current user)
      if (username) {
        const duplicateUsername = await queryOne(
          'SELECT id FROM users WHERE company_id = ? AND username = ? AND id != ?',
          [existingUser.company_id, username.trim(), id]
        );
        if (duplicateUsername) {
          return res.status(400).json({
            success: false,
            error: 'Username already exists in this company'
          });
        }
      }

      // Check if new email already exists in this company (excluding current user)
      if (email) {
        const duplicateEmail = await queryOne(
          'SELECT id FROM users WHERE company_id = ? AND email = ? AND id != ?',
          [existingUser.company_id, email.toLowerCase().trim(), id]
        );
        if (duplicateEmail) {
          return res.status(400).json({
            success: false,
            error: 'Email already exists in this company'
          });
        }
      }

      // Build dynamic update query
      const updates = [];
      const params = [];

      if (username) {
        updates.push('username = ?');
        params.push(username.trim());
      }
      if (email) {
        updates.push('email = ?');
        params.push(email.toLowerCase().trim());
      }
      if (role) {
        updates.push('role = ?');
        params.push(role);
      }
      if (is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(is_active ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      const result = await execute(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      res.json({
        success: true,
        message: 'User updated successfully',
        changes: result.changes
      });
    } catch (error) {
      console.error('Update user error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ===== DEACTIVATE USER =====
  // Deactivate a user instead of deleting (soft delete)
  app.post('/api/users/:id/deactivate', async (req, res) => {
    try {
      const { id } = req.params;

      const user = await queryOne('SELECT id FROM users WHERE id = ?', [id]);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const result = await execute(
        'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'User deactivated successfully',
        changes: result.changes
      });
    } catch (error) {
      console.error('Deactivate user error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ===== ACTIVATE USER =====
  // Activate a deactivated user
  app.post('/api/users/:id/activate', async (req, res) => {
    try {
      const { id } = req.params;

      const user = await queryOne('SELECT id FROM users WHERE id = ?', [id]);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const result = await execute(
        'UPDATE users SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'User activated successfully',
        changes: result.changes
      });
    } catch (error) {
      console.error('Activate user error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ===== CHANGE PASSWORD =====
  // Change user password
  app.post('/api/users/:id/change-password', async (req, res) => {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters'
        });
      }

      const user = await queryOne(
        'SELECT id, password FROM users WHERE id = ?',
        [id]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Verify current password
      const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const result = await execute(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedPassword, id]
      );

      res.json({
        success: true,
        message: 'Password changed successfully',
        changes: result.changes
      });
    } catch (error) {
      console.error('Change password error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ===== LOGIN =====
  // Authenticate user with email and password
  app.post('/api/login', async (req, res) => {
    try {
      console.log('Login attempt:', { email: req.body.email, hasPassword: !!req.body.password });
      
      const validation = validateLogin(req.body);

      if (!validation.isValid) {
        console.log('Validation errors:', validation.errors);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      const { email, password } = req.body;

      // Find user by email (search across all companies)
      const user = await queryOne(
        `SELECT id, company_id, username, email, role, is_active, password
         FROM users
         WHERE email = ?`,
        [email.toLowerCase().trim()]
      );

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          error: 'User account is deactivated'
        });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Get company info
      const company = await queryOne(
        'SELECT id, company_name FROM company WHERE id = ?',
        [user.company_id]
      );

      // Return user info (excluding password)
      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          company_id: user.company_id,
          company_name: company?.company_name
        }
      });
    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}
