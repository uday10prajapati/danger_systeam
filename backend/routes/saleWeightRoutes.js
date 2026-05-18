
import express from 'express';
import { query, queryOne, execute, getConnection } from '../db.js';

const router = express.Router();

/**
 * POST /api/sales/weight-based
 */
router.post('/weight-based', async (req, res) => {
  const connection = await getConnection();
  try {
    const companyId = parseInt(req.header('x-company-id'));
    const userId = parseInt(req.header('x-user-id') || 1);

    const { 
      invoice_date, customer_account_id, items, 
      payment_type, notes,
      driver_name, mobile_number, gadi_number,
      brokerage_percent, brokerage_amount, labour_charge, invoice_no
    } = req.body;

    const customerAccountId = customer_account_id ? parseInt(customer_account_id) : null;

    console.log('DEBUG: Received Sale Payload:', JSON.stringify(req.body, null, 2));

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items array is required and cannot be empty' });
    }

    await connection.beginTransaction();

    // 1. Calculate totals
    const grossTotal = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const rawNetAmount = grossTotal - parseFloat(brokerage_amount || 0) - parseFloat(labour_charge || 0);
    const netAmount = Math.round(rawNetAmount);
    const roundingDiff = netAmount - rawNetAmount;

    // 2. Insert Sale Header
    const [saleRows] = await connection.query(
      `INSERT INTO sales 
        (company_id, invoice_no, invoice_date, customer_account_id, 
        total_amount, net_amount, payment_type, notes, created_by,
        driver_name, mobile_number, gadi_number,
        brokerage_percent, brokerage_amount, labour_charge)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        companyId, invoice_no, invoice_date, customerAccountId,
        grossTotal, netAmount, payment_type, notes || null, userId,
        driver_name || null, mobile_number || null, gadi_number || null,
        brokerage_percent || 0, brokerage_amount || 0, labour_charge || 0
      ]
    );

    const saleId = saleRows[0].id;

    // 3. Insert Sale Items
    for (const item of items) {
      await connection.query(
        `INSERT INTO sale_items 
          (sale_id, item_id, weight, quantity, sale_rate, amount, taxable_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [saleId, parseInt(item.item_id), item.weight, item.quantity, item.sale_rate, item.amount, item.amount]
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
        // Find Cash Account (CS0001)
        const cashAcc = await queryOne("SELECT id FROM accounts WHERE company_id = ? AND account_code = 'CS0001' LIMIT 1", [companyId]);
        if (cashAcc) targetAccountId = cashAcc.id;
        else {
           // Fallback to searching by type if code fails
           const fallbackCash = await queryOne("SELECT id FROM accounts WHERE company_id = ? AND account_type = 'cash' LIMIT 1", [companyId]);
           if (fallbackCash) targetAccountId = fallbackCash.id;
        }
    }

    if (!targetAccountId) {
        // Fallback or error if no account found for cash sale
        throw new Error('No valid account found for this sale type.');
    }

    const ledgerNarrative = `Sale Inv #${invoice_no} | ${items.map(i => i.item_name).join(', ')}`;

    // Resolve member_id if it's a member-linked account
    const memberRow = await queryOne('SELECT id FROM member_master WHERE account_id = ? AND company_id = ?', [customer_account_id, companyId]);
    const memberId = memberRow?.id || null;

    if (isCashSale) {
        // --- CASH SALE LOGIC (Standard: Cash Debit, Sales Credit) ---
        // 1. Debit Cash (Shows on UDHAR side of Rojmel)
        await connection.query(
            `INSERT INTO account_ledger (company_id, account_id, member_id, transaction_date, reference_id, reference_type, reference_no, debit, description, financial_year, created_by, transaction_type)
             VALUES (?, ?, ?, ?, ?, 'SALE', ?, ?, ?, ?, ?, 'cash_book')`,
            [companyId, targetAccountId, memberId, invoice_date, saleId, invoice_no, netAmount, ledgerNarrative, financialYear, userId]
        );

        // 2. Credit Sales Account (Shows on JAMA side of Rojmel)
        // 2. Credit Sales Account (Search by code first, then fallback)
        let salesAcc = await queryOne("SELECT id FROM accounts WHERE company_id = ? AND account_code = 'S0001' LIMIT 1", [companyId]);
        if (!salesAcc) {
            salesAcc = await queryOne("SELECT id FROM accounts WHERE company_id = ? AND (account_type = 'sales' OR account_name LIKE '%Sales%') LIMIT 1", [companyId]);
        }
        if (salesAcc) {
            await connection.query(
                `INSERT INTO account_ledger (company_id, account_id, member_id, transaction_date, reference_id, reference_type, reference_no, credit, description, financial_year, created_by, transaction_type)
                 VALUES (?, ?, ?, ?, ?, 'SALE', ?, ?, ?, ?, ?, 'cash_book')`,
                [companyId, salesAcc.id, memberId, invoice_date, saleId, invoice_no, grossTotal, `Gross Sale Inv #${invoice_no}`, financialYear, userId]
            );
        }
    } else {
        // --- CREDIT SALE LOGIC (Standard Debtor: Customer Debit, Sales Credit) ---
        // 1. Debit Customer (Shows on UDHAR side of Rojmel)
        await connection.query(
            `INSERT INTO account_ledger (company_id, account_id, member_id, transaction_date, reference_id, reference_type, reference_no, debit, description, financial_year, created_by, transaction_type)
             VALUES (?, ?, ?, ?, ?, 'SALE', ?, ?, ?, ?, ?, 'cash_book')`,
            [companyId, targetAccountId, memberId, invoice_date, saleId, invoice_no, netAmount, ledgerNarrative, financialYear, userId]
        );

        // 2. Credit Sales Account (Shows on JAMA side of Rojmel)
        // 2. Credit Sales Account
        let salesAcc = await queryOne("SELECT id FROM accounts WHERE company_id = ? AND account_code = 'S0001' LIMIT 1", [companyId]);
        if (!salesAcc) {
            salesAcc = await queryOne("SELECT id FROM accounts WHERE company_id = ? AND (account_type = 'sales' OR account_name LIKE '%Sales%') LIMIT 1", [companyId]);
        }
        if (salesAcc) {
            await connection.query(
                `INSERT INTO account_ledger (company_id, account_id, member_id, transaction_date, reference_id, reference_type, reference_no, credit, description, financial_year, created_by, transaction_type)
                 VALUES (?, ?, ?, ?, ?, 'SALE', ?, ?, ?, ?, ?, 'cash_book')`,
                [companyId, salesAcc.id, memberId, invoice_date, saleId, invoice_no, grossTotal, `Gross Sale Inv #${invoice_no}`, financialYear, userId]
            );
        }
    }

    // C. Deductions (Also show in Rojmel for visibility)
    if (parseFloat(brokerage_amount) > 0) {
        const brokerageAcc = await queryOne("SELECT id FROM accounts WHERE company_id = ? AND account_code = 'BK0001' LIMIT 1", [companyId]);
        if (brokerageAcc) {
            await connection.query(
                `INSERT INTO account_ledger (company_id, account_id, member_id, transaction_date, reference_id, reference_type, reference_no, debit, description, financial_year, created_by, transaction_type)
                 VALUES (?, ?, ?, ?, ?, 'SALE_DEDUCTION', ?, ?, ?, ?, ?, 'cash_book')`,
                [companyId, brokerageAcc.id, memberId, invoice_date, saleId, invoice_no, brokerage_amount, `Brokerage on Bardan`, financialYear, userId]
            );
        }
    }

    if (parseFloat(labour_charge) > 0) {
        const labourAcc = await queryOne("SELECT id FROM accounts WHERE company_id = ? AND account_code = 'LK0001' LIMIT 1", [companyId]);
        if (labourAcc) {
            await connection.query(
                `INSERT INTO account_ledger (company_id, account_id, member_id, transaction_date, reference_id, reference_type, reference_no, debit, description, financial_year, created_by, transaction_type)
                 VALUES (?, ?, ?, ?, ?, 'SALE_DEDUCTION', ?, ?, ?, ?, ?, 'cash_book')`,
                [companyId, labourAcc.id, memberId, invoice_date, saleId, invoice_no, labour_charge, `Labour Charge`, financialYear, userId]
            );
        }
    }

    // D. Rounding Entry
    if (Math.abs(roundingDiff) > 0.001) {
        const roundingAcc = await queryOne("SELECT id FROM accounts WHERE company_id = ? AND account_code = 'RK0001' LIMIT 1", [companyId]);
        if (roundingAcc) {
            const isDebit = roundingDiff < 0; 
            const amt = Math.abs(roundingDiff);
            
            await connection.query(
                `INSERT INTO account_ledger (company_id, account_id, member_id, transaction_date, reference_id, reference_type, reference_no, ${isDebit ? 'debit' : 'credit'}, description, financial_year, created_by, transaction_type)
                 VALUES (?, ?, ?, ?, ?, 'SALE_ROUNDING', ?, ?, ?, ?, ?, 'cash_book')`,
                [companyId, roundingAcc.id, memberId, invoice_date, saleId, invoice_no, amt, `Rounding on Inv #${invoice_no}`, financialYear, userId]
            );
        }
    }

    await connection.commit();
    res.json({ success: true, message: 'Sale and Rojmel entries posted successfully', data: { saleId } });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('CRITICAL: Weight-based sale error!');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

export default router;
