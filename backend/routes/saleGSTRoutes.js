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
  queryOne,
  getConnection
} from '../db.js';
import { validateSale } from '../validators/saleValidator.js';
import { calculateGST, calculateBulkGST } from '../utils/gstCalculator.js';

const router = express.Router();

/**
 * POST /api/sales/with-gst
 */
router.post('/with-gst', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const userId = req.header('x-user-id');

    if (!companyId || !userId) {
      return res.status(400).json({ success: false, error: 'Company ID and User ID required' });
    }

    const { 
      invoice_date, customer_account_id, member_id, items, 
      discount_amount, payment_type, is_intra_state, notes,
      driver_name, mobile_number, gadi_number 
    } = req.body;

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
      const taxableAmount = item.quantity * item.sale_rate;
      totalTaxableAmount += taxableAmount;

      itemsWithGST.push({
        taxable_amount: taxableAmount,
        gst_percent: item.gst_percent || 0,
        is_intra_state: is_intra_state !== false
      });
    }

    // Calculate bulk GST
    const gstCalculation = calculateBulkGST(itemsWithGST);

    // Generate invoice number
    let invoiceNo = `GR0001`; 
    try {
      const lastSaleRows = await query(
        `SELECT invoice_no FROM sales WHERE company_id = ? AND invoice_no LIKE 'GR%' ORDER BY id DESC LIMIT 1`,
        [companyId]
      );
      if (lastSaleRows && lastSaleRows.length > 0 && lastSaleRows[0].invoice_no) {
        const match = lastSaleRows[0].invoice_no.match(/GR0*(\d+)/);
        if (match) {
          const nextNum = parseInt(match[1], 10) + 1;
          invoiceNo = `GR${String(nextNum).padStart(4, '0')}`;
        }
      }
    } catch (err) {
      console.error('Invoice Number Gen Error:', err);
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      // 1. INSERT sale header
      const [saleResult] = await connection.query(
        `INSERT INTO sales 
          (company_id, invoice_no, invoice_date, customer_account_id, member_id, 
          total_amount, discount_amount, payment_type, notes, created_by,
          taxable_amount, gst_percent, cgst_percent, sgst_percent, igst_percent,
          cgst_amount, sgst_amount, igst_amount, total_tax, net_amount, is_intra_state,
          driver_name, mobile_number, gadi_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                  ?, ?, ?)`,
        [
          companyId, invoiceNo, invoice_date, customer_account_id || null, member_id || null,
          gstCalculation.total_taxable_amount, discount_amount || 0, payment_type || 'cash', notes, userId,
          gstCalculation.total_taxable_amount, 0, 
          gstCalculation.total_cgst_amount > 0 ? 18 : 0,  
          gstCalculation.total_sgst_amount > 0 ? 18 : 0,
          gstCalculation.total_igst_amount > 0 ? 18 : 0,
          gstCalculation.total_cgst_amount, gstCalculation.total_sgst_amount, gstCalculation.total_igst_amount,
          gstCalculation.total_tax, 
          gstCalculation.total_taxable_amount + gstCalculation.total_tax - (discount_amount || 0),
          is_intra_state !== false,
          driver_name || null, mobile_number || null, gadi_number || null
        ]
      );

      const saleId = saleResult.insertId;

      // 2. INSERT sale items
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

        const [stockRow] = await connection.query(
          `SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as current_stock 
           FROM purchase_stock_ledger 
           WHERE company_id = ? AND item_id = ?`,
          [companyId, item.item_id]
        );

        const currentStock = stockRow[0]?.current_stock || 0;
        const newStock = currentStock - item.quantity;

        await connection.query(
          `INSERT INTO purchase_stock_ledger 
           (company_id, item_id, quantity_out, current_stock, transaction_type, reference_no, created_by)
           VALUES (?, ?, ?, ?, 'SALE_OUT', ?, ?)`,
          [companyId, item.item_id, item.quantity, newStock, `SALE-${saleId}`, userId]
        );
      }

      const finalNetAmount = gstCalculation.total_taxable_amount + gstCalculation.total_tax - (discount_amount || 0);

      // 3. Create account ledger entries
      const accountIdForLedger = customer_account_id;
      if (accountIdForLedger) {
        // DEBIT Customer
        await connection.query(
          `INSERT INTO account_ledger 
            (account_id, company_id, transaction_date, transaction_type, reference_no, debit, credit, created_by)
            VALUES (?, ?, ?, 'SALE', ?, ?, 0, ?)`,
          [accountIdForLedger, companyId, invoice_date, `SALE-${saleId}`, finalNetAmount, userId]
        );

        // CREDIT Sales
        const [salesAcctRow] = await connection.query(
          `SELECT id FROM accounts WHERE company_id = ? AND (account_type = 'Revenue' OR account_type = 'Sales') AND is_deleted = 0 LIMIT 1`,
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

        await connection.query(
          `INSERT INTO account_ledger 
            (account_id, company_id, transaction_date, transaction_type, reference_no, debit, credit, created_by)
            VALUES (?, ?, ?, 'SALE', ?, 0, ?, ?)`,
          [salesAccountId, companyId, invoice_date, `SALE-${saleId}`, finalNetAmount, userId]
        );
      }

      await connection.commit();

      // 4. Cash Book Entries
      try {
        let productDetails = '';
        for (const item of items) {
          const [itemRow] = await connection.query('SELECT item_name FROM item_master WHERE id = ?', [item.item_id]);
          const itemName = itemRow[0]?.item_name || 'Item';
          productDetails += `${item.quantity} ${itemName} * ${item.sale_rate} = ${(item.quantity * item.sale_rate).toFixed(2)}\n`;
        }

        await insertCashBookEntry(
          companyId, invoice_date, 'sale', saleId, invoiceNo,
          `SALE A/C - ${invoiceNo}`, gstCalculation.total_taxable_amount - (discount_amount || 0), 0, userId, productDetails
        );

        if (is_intra_state !== false) {
           if (gstCalculation.total_cgst_amount > 0) await insertCashBookEntry(companyId, invoice_date, 'sale', saleId, invoiceNo, `CGST IN/OUT - ${invoiceNo}`, gstCalculation.total_cgst_amount, 0, userId, '');
           if (gstCalculation.total_sgst_amount > 0) await insertCashBookEntry(companyId, invoice_date, 'sale', saleId, invoiceNo, `SGST IN/OUT - ${invoiceNo}`, gstCalculation.total_sgst_amount, 0, userId, '');
        } else {
           if (gstCalculation.total_igst_amount > 0) await insertCashBookEntry(companyId, invoice_date, 'sale', saleId, invoiceNo, `IGST IN/OUT - ${invoiceNo}`, gstCalculation.total_igst_amount, 0, userId, '');
        }

        if (payment_type && payment_type.toLowerCase().includes('credit')) {
          let customerName = 'Customer';
          if (customer_account_id) {
            const [aRow] = await connection.query('SELECT account_name FROM accounts WHERE id = ?', [customer_account_id]);
            if (aRow.length > 0) customerName = aRow[0].account_name;
          }
          await insertCashBookEntry(
            companyId, invoice_date, 'sale_credit', saleId, invoiceNo,
            `PARTY: ${customerName.toUpperCase()} - ${invoiceNo}`, 0, finalNetAmount, userId, ''
          );
        }
      } catch (cashErr) {
        console.error('Cash Book Error:', cashErr);
      }

      return res.status(201).json({
        success: true,
        data: {
          id: saleId,
          invoice_no: invoiceNo,
          taxable_amount: gstCalculation.total_taxable_amount,
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
    console.error('Create sale error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sales/gst-summary/:id
 */
router.get('/gst-summary/:id', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const saleId = req.params.id;
    const sale = await queryOne(
      `SELECT * FROM sales WHERE id = ? AND company_id = ?`,
      [saleId, companyId]
    );
    if (!sale) return res.status(404).json({ success: false, error: 'Sale not found' });
    return res.json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
