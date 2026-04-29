import express from 'express';
import { 
  insertCashBookEntry,
  getConnection,
  query
} from '../db.js';
import { calculateGST, calculateBulkGST } from '../utils/gstCalculator.js';

const router = express.Router();

router.post('/with-gst', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const userId = req.header('x-user-id');

    if (!companyId || !userId) {
      return res.status(400).json({ success: false, error: 'Company ID and User ID required' });
    }

    const { 
      invoice_date, supplier_account_id, invoice_no, items, 
      payment_type, is_intra_state, notes,
      driver_name, mobile_number, gadi_number 
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items array is required and must not be empty' });
    }

    let totalTaxableAmount = 0;
    const itemsWithGST = [];

    for (const item of items) {
      if (!item.item_id || !item.quantity || !item.purchase_rate) {
        return res.status(400).json({ success: false, error: 'item_id, quantity and purchase_rate are required' });
      }
      
      const taxableAmount = item.quantity * item.purchase_rate;
      totalTaxableAmount += taxableAmount;

      itemsWithGST.push({
        taxable_amount: taxableAmount,
        gst_percent: item.gst_percent || (item.cgstPercent ? item.cgstPercent + item.sgstPercent : 0),
        is_intra_state: is_intra_state !== false
      });
    }

    const gstCalculation = calculateBulkGST(itemsWithGST);

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const [purchaseResult] = await connection.query(
        `INSERT INTO purchases 
         (company_id, invoice_no, invoice_date, supplier_account_id, 
          total_amount, payment_type, notes, created_by,
          taxable_amount, gst_percent, cgst_percent, sgst_percent, igst_percent,
          cgst_amount, sgst_amount, igst_amount, total_tax, net_amount, is_intra_state,
          driver_name, mobile_number, gadi_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?,
                 ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                 ?, ?, ?)`,
        [
          companyId, invoice_no, invoice_date, supplier_account_id || null, 
          gstCalculation.total_taxable_amount, payment_type || 'credit', notes, userId,
          gstCalculation.total_taxable_amount, 0, 
          gstCalculation.total_cgst_amount > 0 ? 18 : 0,  
          gstCalculation.total_sgst_amount > 0 ? 18 : 0,
          gstCalculation.total_igst_amount > 0 ? 18 : 0,
          gstCalculation.total_cgst_amount, gstCalculation.total_sgst_amount, gstCalculation.total_igst_amount,
          gstCalculation.total_tax, 
          gstCalculation.total_taxable_amount + gstCalculation.total_tax,
          is_intra_state !== false,
          driver_name || null, mobile_number || null, gadi_number || null
        ]
      );

      const purchaseId = purchaseResult.insertId;

      for (const item of items) {
        const taxableAmount = item.quantity * item.purchase_rate;
        const targetPercent = item.gst_percent || (item.cgstPercent ? item.cgstPercent + item.sgstPercent : 0);
        const itemGSTCalc = calculateGST(taxableAmount, targetPercent, is_intra_state !== false);

        const [itemInsertResult] = await connection.query(
          `INSERT INTO purchase_items 
           (purchase_id, item_id, quantity, purchase_rate, amount,
            taxable_amount, gst_percent, gst_amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            purchaseId, item.item_id, item.quantity, item.purchase_rate, taxableAmount,
            taxableAmount, targetPercent, itemGSTCalc.total_tax
          ]
        );

        const [stockRow] = await connection.query(
          `SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as current_stock 
           FROM purchase_stock_ledger 
           WHERE company_id = ? AND item_id = ?`,
          [companyId, item.item_id]
        );

        const currentStock = stockRow[0]?.current_stock || 0;
        const newStock = currentStock + item.quantity;

        // Note: transaction_type is PURCHASE_IN
        await connection.query(
          `INSERT INTO purchase_stock_ledger 
           (company_id, item_id, purchase_id, purchase_item_id, quantity_in, current_stock, transaction_type, reference_no, created_by)
           VALUES (?, ?, ?, ?, ?, ?, 'PURCHASE_IN', ?, ?)`,
          [companyId, item.item_id, purchaseId, itemInsertResult.insertId, item.quantity, newStock, `PURC-${purchaseId}`, userId]
        );
      }

      const finalNetAmount = gstCalculation.total_taxable_amount + gstCalculation.total_tax;

      const accountIdForLedger = supplier_account_id;
      
      if (accountIdForLedger) {
        try {
          await connection.query(
            `INSERT INTO account_ledger 
             (account_id, company_id, transaction_date, transaction_type, reference_no, debit, credit, created_by)
             VALUES (?, ?, ?, 'PURCHASE', ?, 0, ?, ?)`,
            [accountIdForLedger, companyId, invoice_date, `PURC-${purchaseId}`, finalNetAmount, userId]
          );

          const [purchaseAcctRow] = await connection.query(
            `SELECT id FROM accounts WHERE company_id = ? AND account_type = 'Expense' AND is_deleted = 0 ORDER BY id ASC LIMIT 1`,
            [companyId]
          );

          let purchaseAcctId = null;
          if (purchaseAcctRow && purchaseAcctRow.length > 0) {
            purchaseAcctId = purchaseAcctRow[0].id;
          } else {
            const [createResult] = await connection.query(
              `INSERT INTO accounts (company_id, account_name, account_type, is_active) 
               VALUES (?, 'Purchases', 'Expense', TRUE)`,
              [companyId]
            );
            purchaseAcctId = createResult.insertId;
          }

          await connection.query(
            `INSERT INTO account_ledger 
             (account_id, company_id, transaction_date, transaction_type, reference_no, debit, credit, created_by)
             VALUES (?, ?, ?, 'PURCHASE', ?, ?, 0, ?)`,
            [purchaseAcctId, companyId, invoice_date, `PURC-${purchaseId}`, finalNetAmount, userId]
          );
        } catch (err) {
          console.error('Error creating ledger entries:', err);
        }
      }

      const isCreditPurchase = payment_type && payment_type.toLowerCase().includes('credit');

      if (isCreditPurchase && supplier_account_id) {
        const [balanceRow] = await connection.query(
          `SELECT COALESCE(SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END) - 
                           SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END), 0) as balance
           FROM supplier_ledger 
           WHERE company_id = ? AND supplier_account_id = ?`,
          [companyId, supplier_account_id]
        );

        const previousBalance = parseFloat(balanceRow[0]?.balance || 0);
        const newBalance = previousBalance + finalNetAmount;

        await connection.query(
          `INSERT INTO supplier_ledger 
           (company_id, supplier_account_id, credit_amount, balance, transaction_type, reference_no, created_by)
           VALUES (?, ?, ?, ?, 'PURCHASE', ?, ?)`,
          [companyId, supplier_account_id, finalNetAmount, newBalance, `PURC-${purchaseId}`, userId]
        );
      }

      await connection.commit();

      try {
        let productDetails = '';
        for (const item of items) {
          const [itemRow] = await connection.query('SELECT item_name FROM item_master WHERE id = ?', [item.item_id]);
          const itemName = itemRow[0]?.item_name || 'Item';
          productDetails += `${item.quantity} ${itemName} * ${item.purchase_rate} = ${(item.quantity * item.purchase_rate).toFixed(2)}\n`;
        }

        // --- UDHAR SIDE (PAYMENTS) ---
        await insertCashBookEntry(
          companyId, invoice_date, 'purchase', purchaseId, invoice_no,
          `NON RATION PURCHASE A/C - ${invoice_no}`, 0, gstCalculation.total_taxable_amount, userId, productDetails
        );

        if (is_intra_state !== false) {
           if (gstCalculation.total_cgst_amount > 0) {
             await insertCashBookEntry(companyId, invoice_date, 'purchase', purchaseId, invoice_no, `CGST IN /OUT - 0`, 0, gstCalculation.total_cgst_amount, userId, '');
           }
           if (gstCalculation.total_sgst_amount > 0) {
             await insertCashBookEntry(companyId, invoice_date, 'purchase', purchaseId, invoice_no, `SGST IN OUT - 0`, 0, gstCalculation.total_sgst_amount, userId, '');
           }
        } else {
           if (gstCalculation.total_igst_amount > 0) {
             await insertCashBookEntry(companyId, invoice_date, 'purchase', purchaseId, invoice_no, `IGST IN OUT - 0`, 0, gstCalculation.total_igst_amount, userId, '');
           }
        }

        // --- JAMA SIDE (RECEIPTS) ---
        if (isCreditPurchase && supplier_account_id) {
          let supplierName = 'Supplier';
          const [aRow] = await connection.query('SELECT account_name FROM accounts WHERE id = ?', [supplier_account_id]);
          if (aRow.length > 0) supplierName = aRow[0].account_name;
          
          await insertCashBookEntry(
            companyId, invoice_date, 'purchase_credit', purchaseId, invoice_no,
            `${supplierName.toUpperCase()} - 0 (1)`, finalNetAmount, 0, userId, ''
          );
        }
      } catch (cashErr) {
        console.error('Failed to insert cash book entries:', cashErr);
      }

      return res.status(201).json({
        success: true,
        data: {
          id: purchaseId,
          invoice_no: invoice_no,
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
    console.error('Post Purchase Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
