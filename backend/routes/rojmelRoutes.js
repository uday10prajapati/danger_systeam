import express from 'express';
import { query, getCashBalance } from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const { date } = req.query; // specific date for Rojmel

    if (!companyId) return res.status(400).json({ success: false, error: 'Company ID required' });
    if (!date) return res.status(400).json({ success: false, error: 'Date is required' });

    // 1. Calculate previous day's net balance (opening balance for today)
    const opBalSql = `
      SELECT 
        COALESCE(SUM(cash_in), 0) - COALESCE(SUM(cash_out), 0) as net_balance
      FROM cash_book
      WHERE company_id = ? AND transaction_date < ?
    `;
    const opBalResult = await query(opBalSql, [companyId, date]);
    const netBalanceOp = parseFloat(opBalResult[0]?.net_balance || 0);

    // If netBalanceOp > 0, historically jama > udhar. To balance yesterday, closing was on udhar.
    // So today's opening is on jama.
    // If netBalanceOp < 0, historically udhar > jama. To balance yesterday, closing was on jama.
    // So today's opening is on udhar.
    let opening = null;
    if (netBalanceOp > 0) {
      opening = { side: 'jama', amount: netBalanceOp };
    } else if (netBalanceOp < 0) {
      opening = { side: 'udhar', amount: Math.abs(netBalanceOp) };
    }

    // 2. Fetch all transactions for the current day
    const txSql = `
      SELECT id, transaction_date, reference_no, description, notes, cash_in, cash_out
      FROM cash_book
      WHERE company_id = ? AND transaction_date = ?
      ORDER BY id ASC
    `;
    const transactions = await query(txSql, [companyId, date]);

    const jamaList = []; // Left Side
    const udharList = []; // Right Side

    // 3. Add Opening Balance at TOP
    if (opening) {
      const opRow = {
        details: 'ઉઘડતી સિલ્ક (Op. Balance)',
        sub_amount: '',
        amount: opening.amount,
        isOpening: true
      };
      if (opening.side === 'jama') {
        jamaList.push(opRow);
      } else {
        udharList.push(opRow);
      }
    }

    // 4. Populate current day's transactions
    transactions.forEach(tx => {
      const cIn = parseFloat(tx.cash_in || 0);
      const cOut = parseFloat(tx.cash_out || 0);

      if (cIn > 0) {
        jamaList.push({
          id: tx.id,
          details: tx.description,
          notes: tx.notes,
          sub_amount: cIn,
          amount: cIn
        });
      }

      if (cOut > 0) {
        udharList.push({
          id: tx.id,
          details: tx.description,
          notes: tx.notes,
          sub_amount: cOut,
          amount: cOut
        });
      }
    });

    // 5. Calculate running totals
    const currentTotalJama = jamaList.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);
    const currentTotalUdhar = udharList.reduce((sum, row) => sum + parseFloat(row.amount || 0), 0);

    // 6. Calculate Closing Balance at BOTTOM based on actual current totals
    let closing = null;
    let finalJamaTotal = currentTotalJama;
    let finalUdharTotal = currentTotalUdhar;

    if (currentTotalJama > currentTotalUdhar) {
      // Need closing on Udhar side to balance
      const closingAmount = currentTotalJama - currentTotalUdhar;
      closing = { side: 'udhar', amount: closingAmount };
      udharList.push({
        details: 'બંધ સિલ્ક (Cl. Balance)',
        sub_amount: '',
        amount: closingAmount,
        isClosing: true
      });
      finalUdharTotal += closingAmount;
    } else if (currentTotalUdhar > currentTotalJama) {
      // Need closing on Jama side to balance
      const closingAmount = currentTotalUdhar - currentTotalJama;
      closing = { side: 'jama', amount: closingAmount };
      jamaList.push({
        details: 'બંધ સિલ્ક (Cl. Balance)',
        sub_amount: '',
        amount: closingAmount,
        isClosing: true
      });
      finalJamaTotal += closingAmount;
    }

    // Format strictly required by user
    return res.json({ 
      success: true, 
      date: date,
      data: {
        jama: jamaList,
        udhar: udharList,
        totals: {
           jama_total: finalJamaTotal,
           udhar_total: finalUdharTotal
        },
        closing: closing || { side: null, amount: 0 },
        opening: opening || { side: null, amount: 0 }
      }
    });

  } catch (error) {
    console.error('Rojmel Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
