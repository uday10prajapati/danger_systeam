// ===== COMPANY API ROUTES =====
// File: backend/routes/companyRoutes.js

import { query, queryOne, execute } from '../db.js';
import { validateCompany } from '../validators/companyValidator.js';

export function registerCompanyRoutes(app) {
  
  // ===== GET COMPANY =====
  // Get company details (only 1 company in system)
  app.get('/api/company', async (req, res) => {
    try {
      const company = await queryOne('SELECT * FROM company LIMIT 1');
      
      if (!company) {
        return res.status(404).json({ 
          error: 'Company not found',
          message: 'Please create company first'
        });
      }
      
      res.json({
        success: true,
        data: company
      });
    } catch (error) {
      console.error('Get company error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== GET COMPANY BY ID =====
  // Get company by ID
  app.get('/api/company/:id', async (req, res) => {
    try {
      const company = await queryOne('SELECT * FROM company WHERE id = ?', [req.params.id]);
      
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
      
      res.json({
        success: true,
        data: company
      });
    } catch (error) {
      console.error('Get company by ID error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== CREATE COMPANY =====
  // Create new company (only 1 allowed)
  app.post('/api/company', async (req, res) => {
    try {
      const validation = validateCompany(req.body);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          errors: validation.errors
        });
      }

      // Check if company already exists
      const existingCompany = await queryOne('SELECT id FROM company LIMIT 1');
      if (existingCompany) {
        return res.status(400).json({
          success: false,
          error: 'Company already exists. Update the existing company instead.'
        });
      }

        const {
        company_name,
        company_name_gu,
        address,
        phone,
        email,
        gst_number,
        company_account_no,
        financial_year_start,
        financial_year_end,
        currency,
        logo_url
      } = req.body;

      const result = await execute(
        `INSERT INTO company (
          company_name, company_name_gu, address, phone, email, gst_number, company_account_no,
          financial_year_start, financial_year_end, currency, logo_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          company_name.trim(),
          company_name_gu ? company_name_gu.trim() : null,
          address.trim(),
          phone,
          email.toLowerCase(),
          gst_number || null,
          company_account_no || null,
          financial_year_start,
          financial_year_end,
          currency.toUpperCase(),
          logo_url || null
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Company created successfully',
        data: {
          id: result.lastID,
          company_name,
          email
        }
      });
    } catch (error) {
      console.error('Create company error:', error.message);
      
      // Handle duplicate email/company_name
      if (error.message.includes('ER_DUP_ENTRY')) {
        return res.status(400).json({
          success: false,
          error: 'Company name or email already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ===== UPDATE COMPANY =====
  // Update company details
  app.put('/api/company/:id', async (req, res) => {
    try {
      const validation = validateCompany(req.body);
      
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          errors: validation.errors
        });
      }

      // Check if company exists
      const company = await queryOne('SELECT id FROM company WHERE id = ?', [req.params.id]);
      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company not found'
        });
      }

      const {
        company_name,
        company_name_gu,
        address,
        phone,
        email,
        gst_number,
        company_account_no,
        financial_year_start,
        financial_year_end,
        currency,
        logo_url
      } = req.body;

      await execute(
        `UPDATE company SET
          company_name = ?, company_name_gu = ?, address = ?, phone = ?, email = ?,
          gst_number = ?, company_account_no = ?,
          financial_year_start = ?, financial_year_end = ?,
          currency = ?, logo_url = ?
        WHERE id = ?`,
        [
          company_name.trim(),
          company_name_gu ? company_name_gu.trim() : null,
          address.trim(),
          phone,
          email.toLowerCase(),
          gst_number || null,
          company_account_no || null,
          financial_year_start,
          financial_year_end,
          currency.toUpperCase(),
          logo_url || null,
          req.params.id
        ]
      );

      res.json({
        success: true,
        message: 'Company updated successfully',
        data: { id: req.params.id, company_name, email }
      });
    } catch (error) {
      console.error('Update company error:', error.message);
      
      if (error.message.includes('ER_DUP_ENTRY')) {
        return res.status(400).json({
          success: false,
          error: 'Company name or email already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ===== DEACTIVATE COMPANY =====
  // Soft delete - mark as inactive
  app.delete('/api/company/:id', async (req, res) => {
    try {
      await execute(
        'UPDATE company SET is_active = 0 WHERE id = ?',
        [req.params.id]
      );

      res.json({
        success: true,
        message: 'Company deactivated successfully'
      });
    } catch (error) {
      console.error('Deactivate company error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // ===== GET COMPANY SUMMARY =====
  // Get company info for dashboard
  app.get('/api/company/info/summary', async (req, res) => {
    try {
      const company = await queryOne(
        'SELECT id, company_name, email, phone, currency, created_at FROM company WHERE is_active = 1'
      );

      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Company not found'
        });
      }

      res.json({
        success: true,
        data: company
      });
    } catch (error) {
      console.error('Get company summary error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}
