
import express from 'express';
import { query, queryOne, execute, getConnection } from '../db.js';

const router = express.Router();

/**
 * POST /api/sales/weight-based
 */
router.post('/weight-based', async (req, res) => {
  const connection = await getConnection();
  try {
    const companyId = req.header('x-company-id');
    const userId = req.header('x-user-id') || 1;

    const { 
      invoice_date, customer_account_id, items, 
      payment_type, notes,
      driver_name, mobile_number, gadi_number,
      brokerage_percent, brokerage_amount, labour_charge, invoice_no
    } = req.body;

    await connection.beginTransaction();

    // 1. Calculate totals
    const grossTotal = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const rawNetAmount = grossTotal - parseFloat(brokerage_amount || 0) - parseFloat(labour_charge || 0);
    const netAmount = Math.round(rawNetAmount);
    const roundingDiff = netAmount - rawNetAmount;

    // 2. Insert Sale Header
    const [saleResult] = await connection.query(
      `INSERT INTO sales 
        (company_id, invoice_no, invoice_date, customer_account_id, 
        total_amount, net_amount, payment_type, notes, created_by,
        driver_name, mobile_number, gadi_number,
        brokerage_percent, brokerage_amount, labour_charge)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId, invoice_no, invoice_date, customer_account_id,
        grossTotal, netAmount, payment_type, notes || null, userId,
        driver_name || null, mobile_number || null, gadi_number || null,
        brokerage_percent || 0, brokerage_amount || 0, labour_charge || 0
      ]
    );

    const saleId = saleResult.insertId;

    // 3. Insert Sale Items
    for (const item of items) {
      await connection.query(
        `INSERT INTO sale_items 
          (sale_id, item_id, weight, quantity, sale_rate, amount, taxable_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [saleId, item.item_id, item.weight, item.quantity, item.sale_rate, item.amount, item.amount]
      );

      // Update Stock
      const [stockRow] = await connection.query(
        `SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as current_stock 
         FROM purchase_stock_ledger 
         WHERE company_id = ? AND item_id = ?`,
        [companyId, item.item_id]
      );
      const currentStock = stockRow[0]?.current_stock || 0;
      const newStock = currentStock - (item.quantity || 0);

      await connection.query(
        `INSERT INTO purchase_stock_ledger (company_id, item_id, quantity_out, current_stock, transaction_type, reference_no, created_by)
         VALUES (?, ?, ?, ?, 'SALE_OUT', ?, ?)`,
        [companyId, item.item_id, item.quantity || 0, newStock, `SALE-${saleId}`, userId]
      );
    }

    // 4. Ledger Entries (Rojmel)
    const financialYear = '2026-27'; 
    const isCashSale = payment_type === 'cash';
    let targetAccountId = customer_account_id;

    if (isCashSale) {
        // Find Cash Account
        const cashAcc = await queryOne('SELECT id FROM accounts WHERE company_id = ? AND account_type = "cash" LIMIT 1', [companyId]);
        if (cashAcc) targetAccountId = cashAcc.id;
    }

    if (!targetAccountId) {
        // Fallback or error if no account found for cash sale
        throw new Error('No valid account found for this sale type.');
    }

    const ledgerNarrative = `Sale Inv #${invoice_no} | ${items.map(i => i.item_name).join(', ')}`;

    if (isCashSale) {
        // --- CASH SALE LOGIC (Standard: Cash Debit, Sales Credit) ---
        // 1. Debit Cash (Shows on UDHAR side of Rojmel)
        await connection.query(
            `INSERT INTO account_ledger (company_id, account_id, transaction_date, reference_id, reference_type, reference_no, debit, description, financial_year, created_by, transaction_type)
             VALUES (?, ?, ?, ?, 'SALE', ?, ?, ?, ?, ?, 'cash_book')`,
            [companyId, targetAccountId, invoice_date, saleId, invoice_no, netAmount, ledgerNarrative, financialYear, userId]
        );

        // 2. Credit Sales Account (Shows on JAMA side of Rojmel)
        const salesAcc = await queryOne('SELECT id FROM accounts WHERE company_id = ? AND account_type = "sales" LIMIT 1', [companyId]);
        if (salesAcc) {
            await connection.query(
                `INSERT INTO account_ledger (company_id, account_id, transaction_date, reference_id, reference_type, reference_no, credit, description, financial_year, created_by, transaction_type)
                 VALUES (?, ?, ?, ?, 'SALE', ?, ?, ?, ?, ?, 'cash_book')`,
                [companyId, salesAcc.id, invoice_date, saleId, invoice_no, grossTotal, `Gross Sale Inv #${invoice_no}`, financialYear, userId]
            );
        }
    } else {
        // --- CREDIT SALE LOGIC (Standard Debtor: Customer Debit, Sales Credit) ---
        // 1. Debit Customer (Shows on UDHAR side of Rojmel)
        await connection.query(
            `INSERT INTO account_ledger (company_id, account_id, transaction_date, reference_id, reference_type, reference_no, debit, description, financial_year, created_by, transaction_type)
             VALUES (?, ?, ?, ?, 'SALE', ?, ?, ?, ?, ?, 'cash_book')`,
            [companyId, targetAccountId, invoice_date, saleId, invoice_no, netAmount, ledgerNarrative, financialYear, userId]
        );

        // 2. Credit Sales Account (Shows on JAMA side of Rojmel)
        const salesAcc = await queryOne('SELECT id FROM accounts WHERE company_id = ? AND account_type = "sales" LIMIT 1', [companyId]);
        if (salesAcc) {
            await connection.query(
                `INSERT INTO account_ledger (company_id, account_id, transaction_date, reference_id, reference_type, reference_no, credit, description, financial_year, created_by, transaction_type)
                 VALUES (?, ?, ?, ?, 'SALE', ?, ?, ?, ?, ?, 'cash_book')`,
                [companyId, salesAcc.id, invoice_date, saleId, invoice_no, grossTotal, `Gross Sale Inv #${invoice_no}`, financialYear, userId]
            );
        }
    }

    // C. Deductions (Also show in Rojmel for visibility)
    if (parseFloat(brokerage_amount) > 0) {
        const brokerageAcc = await queryOne('SELECT id FROM accounts WHERE company_id = ? AND account_name LIKE "%Brokerage%" LIMIT 1', [companyId]);
        if (brokerageAcc) {
            await connection.query(
                `INSERT INTO account_ledger (company_id, account_id, transaction_date, reference_id, reference_type, reference_no, debit, description, financial_year, created_by, transaction_type)
                 VALUES (?, ?, ?, ?, 'SALE_DEDUCTION', ?, ?, ?, ?, ?, 'cash_book')`,
                [companyId, brokerageAcc.id, invoice_date, saleId, invoice_no, brokerage_amount, `Brokerage on Inv #${invoice_no}`, financialYear, userId]
            );
        }
    }

    if (parseFloat(labour_charge) > 0) {
        const labourAcc = await queryOne('SELECT id FROM accounts WHERE company_id = ? AND account_name LIKE "%Labour%" LIMIT 1', [companyId]);
        if (labourAcc) {
            await connection.query(
                `INSERT INTO account_ledger (company_id, account_id, transaction_date, reference_id, reference_type, reference_no, debit, description, financial_year, created_by, transaction_type)
                 VALUES (?, ?, ?, ?, 'SALE_DEDUCTION', ?, ?, ?, ?, ?, 'cash_book')`,
                [companyId, labourAcc.id, invoice_date, saleId, invoice_no, labour_charge, `Labour on Inv #${invoice_no}`, financialYear, userId]
            );
        }
    }

    // D. Rounding Entry
    if (Math.abs(roundingDiff) > 0.001) {
        const roundingAcc = await queryOne('SELECT id FROM accounts WHERE company_id = ? AND account_name LIKE "%Rounding%" LIMIT 1', [companyId]);
        if (roundingAcc) {
            const isDebit = roundingDiff < 0; // Negative means we rounded down (2.3 -> 2.0), so we need a Debit to Rounding to balance
            const amt = Math.abs(roundingDiff);
            
            await connection.query(
                `INSERT INTO account_ledger (company_id, account_id, transaction_date, reference_id, reference_type, reference_no, ${isDebit ? 'debit' : 'credit'}, description, financial_year, created_by, transaction_type)
                 VALUES (?, ?, ?, ?, 'SALE_ROUNDING', ?, ?, ?, ?, ?, 'cash_book')`,
                [companyId, roundingAcc.id, invoice_date, saleId, invoice_no, amt, `Rounding on Inv #${invoice_no}`, financialYear, userId]
            );
        }
    }

    await connection.commit();
    res.json({ success: true, message: 'Sale and Rojmel entries posted successfully', data: { saleId } });

  } catch (error) {
    await connection.rollback();
    console.error('Weight-based sale error:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
