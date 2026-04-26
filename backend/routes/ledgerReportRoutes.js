import express from 'express';
import { query, queryOne } from '../db.js';

const router = express.Router();

router.get('/account/:accountId', async (req, res) => {
  try {
    const rawId = req.params.accountId;
    const companyId = req.header('x-company-id');
    const { startDate, endDate } = req.query;

    if (!companyId) return res.status(400).json({ success: false, error: 'Company ID required' });
    if (!startDate || !endDate) return res.status(400).json({ success: false, error: 'Start and End dates required' });

    // Determine if this is a Member or a General Account
    const isMember = String(rawId).startsWith('M');
    const dbId = isMember ? rawId.substring(1) : rawId;
    const identityCol = isMember ? 'member_id' : 'account_id';

    // 1. Get Identity Info
    let identityName = '';
    let baseOpeningBalance = 0;

    if (isMember) {
       const member = await queryOne(`SELECT name as account_name, COALESCE(opening_balance, 0) as opening_balance FROM member_master WHERE id = ? AND company_id = ?`, [dbId, companyId]);
       if (!member) return res.status(404).json({ success: false, error: 'Member not found' });
       identityName = member.account_name;
       baseOpeningBalance = parseFloat(member.opening_balance || 0);
    } else {
       const account = await queryOne(`SELECT account_name, COALESCE(opening_balance, 0) as opening_balance FROM accounts WHERE id = ? AND company_id = ?`, [dbId, companyId]);
       if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
       identityName = account.account_name;
       baseOpeningBalance = parseFloat(account.opening_balance || 0);
    }

    // 2. Get Historical Transactions (Before startDate)
    const historySql = `
      SELECT 
        COALESCE(SUM(COALESCE(debit, debit_amount, 0)), 0) as total_debit_hist,
        COALESCE(SUM(COALESCE(credit, credit_amount, 0)), 0) as total_credit_hist
      FROM account_ledger 
      WHERE ${identityCol} = ? AND company_id = ? AND transaction_date < ?
    `;
    const history = await queryOne(historySql, [dbId, companyId, startDate]);
    
    let historicalDebit = parseFloat(history.total_debit_hist || 0);
    let historicalCredit = parseFloat(history.total_credit_hist || 0);

    // In this system: Balance = Opening + Credit - Debit (assuming liability/income style)
    // Or Balance = Opening + Debit - Credit (Asset style)
    // Let's stick to Debit (+) - Credit (-) as standard "Debit Balance"
    let netBalance = baseOpeningBalance + historicalDebit - historicalCredit;
    
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
      WHERE ${identityCol} = ? AND company_id = ? AND transaction_date BETWEEN ? AND ?
      ORDER BY transaction_date ASC, id ASC
    `;
    const transactions = await query(txSql, [dbId, companyId, startDate, endDate]);

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
      account_name: identityName,
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
