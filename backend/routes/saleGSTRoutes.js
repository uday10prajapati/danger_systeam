/**
 * Enhanced Sale Routes with GST Integration
 * 
 * This module extends the standard sale routes to include GST calculations
 * Supports both intra-state (CGST+SGST) and inter-state (IGST) sales
 */

import express from 'express';
import db, { 
  createSale, 
  getSalesByCompany, 
  getSaleDetails, 
  getItemByBarcode,
  getItemRate,
  insertCashBookEntry,
  query,
  queryOne
} from '../db.js';
import { validateSale } from '../validators/saleValidator.js';
import { calculateGST, calculateBulkGST } from '../utils/gstCalculator.js';

const router = express.Router();

/**
 * POST /api/sales/with-gst
 * Create new sale with GST calculation
 * 
 * Body:
 * {
 *   invoice_date: "2025-01-23",
 *   customer_account_id: 1,
 *   member_id: null,
 *   items: [
 *     { item_id: 1, quantity: 2, sale_rate: 500, gst_percent: 18 }
 *   ],
 *   discount_amount: 100,
 *   payment_type: "cash",
 *   is_intra_state: true,
 *   notes: "Order notes"
 * }
 */
router.post('/with-gst', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const userId = req.header('x-user-id');

    if (!companyId || !userId) {
      return res.status(400).json({ success: false, error: 'Company ID and User ID required' });
    }

    const { invoice_date, customer_account_id, member_id, items, discount_amount, payment_type, is_intra_state, notes } = req.body;

    // Validate input
    const validation = validateSale({ invoice_date, items, payment_type });
    if (!validation.isValid) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items array is required and must not be empty' });
    }

    // Validate GST data in items
    let totalTaxableAmount = 0;
    const itemsWithGST = [];

    for (const item of items) {
      if (!item.item_id) {
        return res.status(400).json({ success: false, error: 'item_id is required for each item' });
      }
      if (!item.quantity || !item.sale_rate) {
        return res.status(400).json({ success: false, error: 'quantity and sale_rate are required' });
      }
      if (item.gst_percent === undefined) {
        return res.status(400).json({ success: false, error: 'gst_percent is required for each item' });
      }

      const taxableAmount = item.quantity * item.sale_rate;
      totalTaxableAmount += taxableAmount;

      itemsWithGST.push({
        taxable_amount: taxableAmount,
        gst_percent: item.gst_percent,
        is_intra_state: is_intra_state !== false
      });
    }

    // Calculate bulk GST
    const gstCalculation = calculateBulkGST(itemsWithGST);

    // Generate invoice number
    const invoiceNo = `INV-${Date.now()}`;

    // Get database connection for transaction
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. INSERT sale header with GST data
      const [saleResult] = await connection.query(
        `INSERT INTO sales 
         (company_id, invoice_no, invoice_date, customer_account_id, member_id, 
          total_amount, discount_amount, payment_type, notes, created_by,
          taxable_amount, gst_percent, cgst_percent, sgst_percent, igst_percent,
          cgst_amount, sgst_amount, igst_amount, total_tax, net_amount, is_intra_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                 ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId, invoiceNo, invoice_date, customer_account_id || null, member_id || null,
          gstCalculation.total_taxable_amount, discount_amount || 0, payment_type || 'cash', notes, userId,
          gstCalculation.total_taxable_amount, 0, 
          gstCalculation.total_cgst_amount > 0 ? 18 : 0,  // Store GST % if applicable
          gstCalculation.total_sgst_amount > 0 ? 18 : 0,
          gstCalculation.total_igst_amount > 0 ? 18 : 0,
          gstCalculation.total_cgst_amount, gstCalculation.total_sgst_amount, gstCalculation.total_igst_amount,
          gstCalculation.total_tax, 
          gstCalculation.total_taxable_amount + gstCalculation.total_tax - (discount_amount || 0),
          is_intra_state !== false
        ]
      );

      const saleId = saleResult.insertId;
      let itemIndex = 0;

      // 2. INSERT sale items with GST
      for (const item of items) {
        const taxableAmount = item.quantity * item.sale_rate;
        const itemGSTCalc = calculateGST(taxableAmount, item.gst_percent, is_intra_state !== false);

        await connection.query(
          `INSERT INTO sale_items 
           (sale_id, item_id, quantity, sale_rate, amount,
            taxable_amount, gst_percent, gst_amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            saleId, item.item_id, item.quantity, item.sale_rate, taxableAmount,
            taxableAmount, item.gst_percent, itemGSTCalc.total_tax
          ]
        );

        // Get current stock
        const [stockRow] = await connection.query(
          `SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as current_stock 
           FROM purchase_stock_ledger 
           WHERE company_id = ? AND item_id = ?`,
          [companyId, item.item_id]
        );

        const currentStock = stockRow[0]?.current_stock || 0;
        const newStock = currentStock - item.quantity;

        // Insert stock ledger entry
        await connection.query(
          `INSERT INTO purchase_stock_ledger 
           (company_id, item_id, quantity_out, current_stock, transaction_type, reference_id, reference_no, created_by)
           VALUES (?, ?, ?, ?, 'SALE_OUT', ?, ?, ?)`,
          [companyId, item.item_id, item.quantity, newStock, saleId, `SALE-${saleId}`, userId]
        );

        itemIndex++;
      }

      // 3. Calculate final net amount
      const finalNetAmount = gstCalculation.total_taxable_amount + gstCalculation.total_tax - (discount_amount || 0);

      // 4. Update sale with final amount
      await connection.query(
        `UPDATE sales SET 
         total_amount = ?, net_amount = ? 
         WHERE id = ?`,
        [gstCalculation.total_taxable_amount + gstCalculation.total_tax, finalNetAmount, saleId]
      );

      // 5. Create account ledger entries
      const accountIdForLedger = customer_account_id || member_id;
      
      if (accountIdForLedger) {
        try {
          // DEBIT Customer Account
          await connection.query(
            `INSERT INTO account_ledger 
             (account_id, company_id, transaction_date, reference_type, reference_id, reference_no, description, debit, credit)
             VALUES (?, ?, ?, 'SALE', ?, ?, ?, ?, 0)`,
            [accountIdForLedger, companyId, invoice_date, saleId, `SALE-${saleId}`, `Sale (GST-${is_intra_state !== false ? 'Intra' : 'Inter'}-State) - ${invoiceNo}`, finalNetAmount]
          );

          // CREDIT Sales Revenue Account
          const [salesAcctRow] = await connection.query(
            `SELECT id FROM accounts WHERE company_id = ? AND (account_type = 'Revenue' OR account_type = 'Sales') AND is_deleted = FALSE LIMIT 1`,
            [companyId]
          );

          let salesAccountId = null;
          if (salesAcctRow && salesAcctRow.length > 0) {
            salesAccountId = salesAcctRow[0].id;
          } else {
            const [createResult] = await connection.query(
              `INSERT INTO accounts (company_id, account_name, account_type, is_active) 
               VALUES (?, 'Sales Revenue', 'Revenue', TRUE)`,
              [companyId]
            );
            salesAccountId = createResult.insertId;
          }

          if (salesAccountId) {
            await connection.query(
              `INSERT INTO account_ledger 
               (account_id, company_id, transaction_date, reference_type, reference_id, reference_no, description, debit, credit)
               VALUES (?, ?, ?, 'SALE', ?, ?, ?, 0, ?)`,
              [salesAccountId, companyId, invoice_date, saleId, `SALE-${saleId}`, `Sale - ${invoiceNo}`, finalNetAmount]
            );
          }
        } catch (err) {
          console.error('Error creating ledger entries:', err);
        }
      }

      // 6. Create customer ledger entry for credit sales
      if (payment_type === 'credit' && customer_account_id) {
        const [balanceRow] = await connection.query(
          `SELECT COALESCE(SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END) - 
                           SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END), 0) as balance
           FROM customer_ledger 
           WHERE company_id = ? AND customer_account_id = ?`,
          [companyId, customer_account_id]
        );

        const previousBalance = balanceRow[0]?.balance || 0;
        const newBalance = previousBalance + finalNetAmount;

        await connection.query(
          `INSERT INTO customer_ledger 
           (company_id, customer_account_id, debit_amount, balance, transaction_type, reference_no, created_by)
           VALUES (?, ?, ?, ?, 'SALE', ?, ?)`,
          [companyId, customer_account_id, finalNetAmount, newBalance, `SALE-${saleId}`, userId]
        );
      }

      await connection.commit();

      return res.status(201).json({
        success: true,
        data: {
          id: saleId,
          invoice_no: invoiceNo,
          taxable_amount: gstCalculation.total_taxable_amount,
          gst_summary: {
            cgst_amount: gstCalculation.total_cgst_amount,
            sgst_amount: gstCalculation.total_sgst_amount,
            igst_amount: gstCalculation.total_igst_amount,
            total_tax: gstCalculation.total_tax,
            state_type: is_intra_state !== false ? 'intra-state (CGST+SGST)' : 'inter-state (IGST)'
          },
          net_amount: finalNetAmount
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Create sale with GST error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sales/gst-summary/:id
 * Get GST summary for a specific sale
 */
router.get('/gst-summary/:id', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const saleId = req.params.id;

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    const sale = await queryOne(
      `SELECT 
        id, invoice_no, invoice_date,
        taxable_amount, gst_percent,
        cgst_percent, cgst_amount,
        sgst_percent, sgst_amount,
        igst_percent, igst_amount,
        total_tax, net_amount, is_intra_state
      FROM sales
      WHERE id = ? AND company_id = ?`,
      [saleId, companyId]
    );

    if (!sale) {
      return res.status(404).json({ success: false, error: 'Sale not found' });
    }

    return res.json({
      success: true,
      data: {
        invoice_no: sale.invoice_no,
        invoice_date: sale.invoice_date,
        taxable_amount: sale.taxable_amount,
        tax_breakdown: {
          cgst: {
            percent: sale.cgst_percent,
            amount: sale.cgst_amount
          },
          sgst: {
            percent: sale.sgst_percent,
            amount: sale.sgst_amount
          },
          igst: {
            percent: sale.igst_percent,
            amount: sale.igst_amount
          }
        },
        total_tax: sale.total_tax,
        net_amount: sale.net_amount,
        state_type: sale.is_intra_state ? 'intra-state' : 'inter-state'
      }
    });
  } catch (error) {
    console.error('Get GST summary error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
