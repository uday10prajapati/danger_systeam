import express from 'express';
import { query, queryOne } from '../db.js';

const router = express.Router();

router.get('/account/:accountId', async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const companyId = req.header('x-company-id');
    const { startDate, endDate } = req.query;

    if (!companyId) return res.status(400).json({ success: false, error: 'Company ID required' });
    if (!startDate || !endDate) return res.status(400).json({ success: false, error: 'Start and End dates required' });

    // 1. Get Account Info
    const accountSql = `SELECT account_name, opening_balance FROM accounts WHERE id = ? AND company_id = ?`;
    const account = await queryOne(accountSql, [accountId, companyId]);
    if (!account) return res.status(404).json({ success: false, error: 'Account not found' });

    // 2. Get Historical Transactions (Before startDate)
    // To calculate Opening Balance for the report
    // Assuming 'closing_balance = opening_balance + sum(Debit) - sum(Credit)'
    // Wait, in Indian accounting, if Opening Balance is a Credit, it is negative. Let's assume opening_balance in DB is absolute, but usually it needs a sign. 
    // For simplicity, we assume account.opening_balance is treated as Credit if it's a liability, Debit if Asset. 
    // We will calculate exact running sums for Debit and Credit.
    const historySql = `
      SELECT 
        COALESCE(SUM(COALESCE(debit, debit_amount, 0)), 0) as total_debit_hist,
        COALESCE(SUM(COALESCE(credit, credit_amount, 0)), 0) as total_credit_hist
      FROM account_ledger 
      WHERE account_id = ? AND company_id = ? AND transaction_date < ?
    `;
    const history = await queryOne(historySql, [accountId, companyId, startDate]);
    
    // In our DB, we don't have debit/credit type for opening_balance, we just have decimal. 
    // Typically `total_debit - total_credit` is a debit balance.
    // Let's assume opening_balance is a DEBIT balance if positive. If it's a saving account (liability), it might be logged as negative, or we just rely on transactions.
    // If user DB tracks pure debits and credits:
    const baseOpeningBalance = parseFloat(account.opening_balance || 0);
    // Let's assume baseOpeningBalance is Debit. If negative, it's Credit.
    let historicalDebit = parseFloat(history.total_debit_hist || 0);
    let historicalCredit = parseFloat(history.total_credit_hist || 0);

    let netBalance = baseOpeningBalance + historicalDebit - historicalCredit;
    
    // We want to pass this as the "Opening Balance" row
    const openingRow = {
      transaction_date: startDate,
      reference_no: '',
      description: 'Opening Balance',
      debit: '',
      credit: '',
      running_balance: netBalance
    };

    // 3. Get Transactions in Range
    const txSql = `
      SELECT 
        transaction_date, 
        reference_no, 
        description, 
        COALESCE(debit, debit_amount, 0) as debit, 
        COALESCE(credit, credit_amount, 0) as credit
      FROM account_ledger 
      WHERE account_id = ? AND company_id = ? AND transaction_date BETWEEN ? AND ?
      ORDER BY transaction_date ASC, id ASC
    `;
    const transactions = await query(txSql, [accountId, companyId, startDate, endDate]);

    // 4. Calculate Running Balances
    let currentBalance = netBalance;
    let totalDebitRange = 0;
    let totalCreditRange = 0;

    const formattedTransactions = transactions.map(tx => {
      const d = parseFloat(tx.debit || 0);
      const c = parseFloat(tx.credit || 0);
      totalDebitRange += d;
      totalCreditRange += c;
      currentBalance = currentBalance + d - c;

      return {
        transaction_date: tx.transaction_date,
        reference_no: tx.reference_no,
        description: tx.description,
        debit: d > 0 ? d.toFixed(2) : '',
        credit: c > 0 ? c.toFixed(2) : '',
        running_balance: currentBalance
      };
    });

    // 5. Build Result
    const reportData = [openingRow, ...formattedTransactions];

    return res.json({ 
      success: true, 
      account_name: account.account_name,
      data: reportData, 
      totals: {
        debit: totalDebitRange.toFixed(2),
        credit: totalCreditRange.toFixed(2)
      }
    });

  } catch (error) {
    console.error('Ledger Report Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
