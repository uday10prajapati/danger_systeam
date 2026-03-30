import express from 'express';
import { query, getCashBalance } from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const { date } = req.query; // specific date for Rojmel

    if (!companyId) return res.status(400).json({ success: false, error: 'Company ID required' });
    if (!date) return res.status(400).json({ success: false, error: 'Date is required' });

    // 1. Get Opening Balance (Cash balance UP TO the day before `date`)
    const previousDate = new Date(date);
    previousDate.setDate(previousDate.getDate() - 1);
    const prevDateStr = previousDate.toISOString().split('T')[0];
    
    // We can rely on getCashBalance, but let's do a direct SUM query for reliability
    const opBalSql = `
      SELECT 
        COALESCE(SUM(cash_in), 0) - COALESCE(SUM(cash_out), 0) as opening_balance
      FROM cash_book
      WHERE company_id = ? AND transaction_date <= ?
    `;
    const opBalResult = await query(opBalSql, [companyId, prevDateStr]);
    const openingBalance = parseFloat(opBalResult[0]?.opening_balance || 0);

    // 2. Fetch all transactions for the day
    const txSql = `
      SELECT id, transaction_date, reference_no, description, cash_in, cash_out
      FROM cash_book
      WHERE company_id = ? AND transaction_date = ?
      ORDER BY id ASC
    `;
    const transactions = await query(txSql, [companyId, date]);

    // 3. Separate into Jama (Left / In) and Udhar (Right / Out)
    // Deshi Nama Rule: Jama = Incomes/Receipts, Udhar = Expenses/Payments
    const jamaList = []; // Left Side
    const udharList = []; // Right Side
    
    let totalCashIn = 0;
    let totalCashOut = 0;

    transactions.forEach(tx => {
      const cIn = parseFloat(tx.cash_in || 0);
      const cOut = parseFloat(tx.cash_out || 0);

      // In Indian accounting, if there is a double entry showing both, we separate them
      if (cIn > 0) {
        jamaList.push({
          details: tx.description,
          sub_amount: cIn, // For visual structure, we can map it straight to amount
          amount: cIn
        });
        totalCashIn += cIn;
      }

      if (cOut > 0) {
        udharList.push({
          details: tx.description,
          sub_amount: cOut,
          amount: cOut
        });
        totalCashOut += cOut;
      }
    });

    // 4. Calculate Closing Balance
    // Closing Balance = Opening Balance + Cash In - Cash Out
    const closingBalance = openingBalance + totalCashIn - totalCashOut;

    // 5. Build Final Response Arrays with Balances Injected
    // Right Side (Udhar) Starts with Opening Balance
    // Left Side (Jama) Ends with Closing Balance
    
    const udharResponse = [];
    if (openingBalance !== 0 || transactions.length === 0) {
      udharResponse.push({
        details: 'ઉઘડતી સિલ્ક (Op. Balance)',
        sub_amount: '',
        amount: Math.max(0, openingBalance)
      });
      // If opening balance is negative, it technically goes to Jama, but commonly kept on Udhar with negative sign.
    }
    udharResponse.push(...udharList);

    const jamaResponse = [...jamaList];

    // Subtotals before Closing Balance
    const jamaSubTotal = totalCashIn;
    const udharSubTotal = Math.max(0, openingBalance) + totalCashOut;

    // Append Closing Balance on Jama
    jamaResponse.push({
      details: 'બંધ સિલ્ક (Cl. Balance)',
      sub_amount: '',
      amount: Math.max(0, closingBalance)
    });

    const finalJamaTotal = jamaSubTotal + Math.max(0, closingBalance);
    const finalUdharTotal = udharSubTotal; 
    // They should mathematically balance.

    return res.json({ 
      success: true, 
      date: date,
      data: {
        jama: jamaResponse,
        udhar: udharResponse,
        totals: {
           jama_sub_total: jamaSubTotal,
           jama_total: finalJamaTotal,
           udhar_total: finalUdharTotal
        }
      }
    });

  } catch (error) {
    console.error('Rojmel Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
