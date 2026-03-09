/**
 * Updated Sale Routes with Customer Balance Support
 * 
 * Changes:
 * 1. POST /api/sales - Now accepts amount_paid and handles automatic advance adjustment
 * 2. GET /api/customers/:customerId/balance - NEW - Returns customer current balance
 * 3. POST /api/customers/:customerId/payment - NEW - Apply manual payment
 */

import express from 'express';
import db, { insertCashBookEntry, getSalesByCompany, getSaleDetails } from '../db.js';
import { validateSale } from '../validators/saleValidator.js';
import {
  createSaleWithBalance,
  getCustomerBalance,
  getCustomerBalanceHistory,
  applyCreditPayment
} from '../utils/customerBalanceUtils.js';

const router = express.Router();

// =============== CREATE SALE WITH BALANCE HANDLING ===============
router.post('/', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const userId = req.header('x-user-id');

    if (!companyId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company ID and User ID required' 
      });
    }

    const { 
      invoice_date, customer_account_id, member_id, items,
      discount_amount, amount_paid,  // amount_paid is NEW
      payment_type, notes 
    } = req.body;

    // Validate using existing validator (already updated)
    const validation = validateSale({ invoice_date, items, payment_type, amount_paid });
    if (!validation.isValid) {
      return res.status(400).json({ 
        success: false, 
        errors: validation.errors 
      });
    }

    // Generate invoice number
    const invoiceNo = `INV-${Date.now()}`;

    // Create sale with balance handling
    const result = await createSaleWithBalance(
      db.pool,
      companyId,
      invoiceNo,
      invoice_date,
      customer_account_id,
      member_id,
      items,
      discount_amount || 0,
      amount_paid,
      payment_type || 'cash',
      notes,
      userId
    );

    return res.status(201).json({ success: true, data: result });

  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============== GET CUSTOMER CURRENT BALANCE ===============
router.get('/balance/:customerId', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const { customerId } = req.params;

    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company ID required' 
      });
    }

    const balance = await getCustomerBalance(db.pool, companyId, customerId);

    return res.json({ success: true, data: balance });

  } catch (error) {
    console.error('Get customer balance error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============== GET CUSTOMER BALANCE HISTORY ===============
router.get('/history/:customerId', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const { customerId } = req.params;

    if (!companyId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company ID required' 
      });
    }

    const history = await getCustomerBalanceHistory(
      db.pool,
      companyId,
      customerId
    );

    return res.json({ success: true, data: history });

  } catch (error) {
    console.error('Get customer balance history error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============== APPLY MANUAL PAYMENT AGAINST DUES ===============
router.post('/payment/:customerId', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const userId = req.header('x-user-id');
    const { customerId } = req.params;
    const { payment_amount, payment_date, payment_ref_no } = req.body;

    if (!companyId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Company ID and User ID required' 
      });
    }

    if (!payment_amount || payment_amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment amount must be greater than 0' 
      });
    }

    if (!payment_date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment date is required' 
      });
    }

    const result = await applyCreditPayment(
      db.pool,
      companyId,
      customerId,
      payment_amount,
      payment_date,
      payment_ref_no || `MANUAL-${Date.now()}`,
      userId
    );

    return res.status(200).json({ success: true, data: result });

  } catch (error) {
    console.error('Apply payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============== GET SALES LIST (Existing - add new columns) ===============
router.get('/', async (req, res) => {
  try {
    const companyId = req.header('x-company-id') || '2';
    let { startDate, endDate } = req.query;
    
    if (!endDate) {
      endDate = new Date().toISOString().split('T')[0];
    }
    if (!startDate) {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString().split('T')[0];
    }

    // Updated query to include new columns
    const sql = `
      SELECT 
        s.id,
        s.invoice_no,
        s.invoice_date,
        COALESCE(a.account_name, 'Walk-in') as customer_name,
        s.payment_type,
        s.total_amount,
        s.discount_amount,
        s.net_amount,
        s.amount_paid,
        s.due_amount,
        s.advance_amount,
        COUNT(si.id) as item_count,
        s.created_at
      FROM sales s
      LEFT JOIN accounts a ON s.customer_account_id = a.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE s.company_id = ? AND s.invoice_date BETWEEN ? AND ?
      GROUP BY s.id
      ORDER BY s.invoice_date DESC, s.created_at DESC
    `;

    const [sales] = await db.pool.query(sql, [companyId, startDate, endDate]);
    return res.json({ success: true, data: sales });

  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============== GET SALE DETAILS (Existing - update query) ===============
router.get('/:saleId', async (req, res) => {
  try {
    const { saleId } = req.params;

    const sql = `
      SELECT 
        s.id,
        s.invoice_no,
        s.invoice_date,
        s.customer_account_id,
        COALESCE(a.account_name, 'Walk-in') as customer_name,
        s.member_id,
        COALESCE(m.member_name, '') as member_name,
        s.total_amount,
        s.discount_amount,
        s.net_amount,
        s.amount_paid,
        s.due_amount,
        s.advance_amount,
        s.payment_type,
        s.notes,
        s.created_at
      FROM sales s
      LEFT JOIN accounts a ON s.customer_account_id = a.id
      LEFT JOIN members m ON s.member_id = m.id
      WHERE s.id = ?
    `;

    const [sales] = await db.pool.query(sql, [saleId]);
    
    if (!sales || sales.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Sale not found' 
      });
    }

    const sale = sales[0];

    // Get items
    const itemSql = `
      SELECT 
        si.id,
        si.item_id,
        i.item_name,
        i.item_code,
        si.quantity,
        si.sale_rate,
        si.amount
      FROM sale_items si
      LEFT JOIN item_master i ON si.item_id = i.id
      WHERE si.sale_id = ?
    `;

    const [items] = await db.pool.query(itemSql, [saleId]);
    sale.items = items || [];

    return res.json({ success: true, data: sale });

  } catch (error) {
    console.error('Get sale details error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
