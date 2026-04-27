import express from 'express';
import { query, queryOne } from '../db.js';

const router = express.Router();

// GET /api/ledger-report/account/:accountId
// Supports both regular ledger accounts (numeric id e.g. "5")
// and member accounts (M-prefixed e.g. "M2")
router.get('/account/:accountId', async (req, res) => {
  try {
    const rawId     = req.params.accountId;   // "5" or "M2"
    const companyId = req.header('x-company-id');
    const { startDate, endDate } = req.query;

    if (!companyId) return res.status(400).json({ success: false, error: 'Company ID required' });
    if (!startDate || !endDate) return res.status(400).json({ success: false, error: 'Start and End dates required' });

    const isMember  = String(rawId).toUpperCase().startsWith('M');
    const numericId = isMember ? parseInt(rawId.slice(1), 10) : parseInt(rawId, 10);

    let entityName     = '';
    let openingBalance = 0;
    let whereClause    = '';
    let whereParams    = [];

    if (isMember) {
      // ── Member account ────────────────────────────────
      const member = await queryOne(
        `SELECT member_name FROM member_master WHERE id = ?`,
        [numericId]
      );
      if (!member) return res.status(404).json({ success: false, error: 'Member not found' });
      entityName     = member.member_name;
      openingBalance = 0;
      whereClause    = 'member_id = ? AND company_id = ?';
      whereParams    = [numericId, companyId];
    } else {
      // ── Ledger account ────────────────────────────────
      const account = await queryOne(
        `SELECT account_name, opening_balance FROM accounts WHERE id = ? AND company_id = ?`,
        [numericId, companyId]
      );
      if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
      entityName     = account.account_name;
      openingBalance = parseFloat(account.opening_balance || 0);
      whereClause    = 'account_id = ? AND company_id = ?';
      whereParams    = [numericId, companyId];
    }

    // ── Historical totals before startDate (for opening row) ──
    const history = await queryOne(
      `SELECT 
         COALESCE(SUM(COALESCE(debit,  debit_amount,  0)), 0) AS total_debit_hist,
         COALESCE(SUM(COALESCE(credit, credit_amount, 0)), 0) AS total_credit_hist
       FROM account_ledger
       WHERE ${whereClause} AND transaction_date < ?`,
      [...whereParams, startDate]
    );

    const histDebit  = parseFloat(history.total_debit_hist  || 0);
    const histCredit = parseFloat(history.total_credit_hist || 0);
    let netBalance   = openingBalance + histDebit - histCredit;

    const openingRow = {
      transaction_date: startDate,
      reference_no:     '',
      description:      'Opening Balance',
      debit:            '',
      credit:           '',
      running_balance:  netBalance
    };

    // ── Transactions in date range ────────────────────────────
    const transactions = await query(
      `SELECT 
         transaction_date,
         reference_no,
         description,
         COALESCE(debit,  debit_amount,  0) AS debit,
         COALESCE(credit, credit_amount, 0) AS credit
       FROM account_ledger
       WHERE ${whereClause} AND transaction_date BETWEEN ? AND ?
       ORDER BY transaction_date ASC, id ASC`,
      [...whereParams, startDate, endDate]
    );

    // ── Running balance ───────────────────────────────────────
    let currentBalance   = netBalance;
    let totalDebitRange  = 0;
    let totalCreditRange = 0;

    const formattedTransactions = transactions.map(tx => {
      const d = parseFloat(tx.debit  || 0);
      const c = parseFloat(tx.credit || 0);
      totalDebitRange  += d;
      totalCreditRange += c;
      currentBalance    = currentBalance + d - c;
      return {
        transaction_date: tx.transaction_date,
        reference_no:     tx.reference_no,
        description:      tx.description,
        debit:            d > 0 ? d.toFixed(2) : '',
        credit:           c > 0 ? c.toFixed(2) : '',
        running_balance:  currentBalance
      };
    });

    return res.json({
      success:      true,
      account_name: entityName,
      is_member:    isMember,
      data:         [openingRow, ...formattedTransactions],
      totals: {
        debit:  totalDebitRange.toFixed(2),
        credit: totalCreditRange.toFixed(2)
      }
    });

  } catch (error) {
    console.error('Ledger Report Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
