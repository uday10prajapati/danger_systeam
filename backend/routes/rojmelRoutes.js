import express from 'express';
import { query, getCashBalance } from '../db.js';

const router = express.Router();
 
router.get('/nav-dates', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const { date } = req.query;

    if (!companyId || !date) return res.status(400).json({ success: false, error: 'Company ID and date required' });

    const prevSql = `
      SELECT TO_CHAR(transaction_date, 'YYYY-MM-DD') as nav_date
      FROM account_ledger 
      WHERE company_id = ? AND transaction_date < CAST(? AS DATE) 
      AND (transaction_type = 'cash_book' OR reference_type = 'cash_book')
      ORDER BY transaction_date DESC 
      LIMIT 1
    `;
    const nextSql = `
      SELECT TO_CHAR(transaction_date, 'YYYY-MM-DD') as nav_date
      FROM account_ledger 
      WHERE company_id = ? AND transaction_date > CAST(? AS DATE) 
      AND (transaction_type = 'cash_book' OR reference_type = 'cash_book')
      ORDER BY transaction_date ASC 
      LIMIT 1
    `;

    const prevResult = await query(prevSql, [companyId, date]);
    const nextResult = await query(nextSql, [companyId, date]);

    res.json({
      success: true,
      prevDate: prevResult && prevResult.length > 0 ? prevResult[0].nav_date : null,
      nextDate: nextResult && nextResult.length > 0 ? nextResult[0].nav_date : null
    });
  } catch (error) {
    console.error('Nav Dates Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const companyId = req.header('x-company-id');
    const { date, showSubledger, itemDetails } = req.query;

    if (!companyId || !date) return res.status(400).json({ success: false, error: 'Company ID and date required' });

    // 1. Calculate Opening Balance (Cash Flow perspective)
    // Formula: Total Receipts (Member Credits) - Total Payments (Member Debits)
    const opBalSql = `
      SELECT 
        SUM(COALESCE(credit, credit_amount, 0)) - SUM(COALESCE(debit, debit_amount, 0)) as net_balance 
      FROM account_ledger 
      WHERE company_id = ? AND transaction_date < ?
      AND (transaction_type = 'cash_book' OR reference_type = 'cash_book')
    `;
    const opBalRows = await query(opBalSql, [companyId, date]);
    const netBalanceOp = parseFloat(opBalRows[0]?.net_balance || 0);

    let opening = null;
    if (netBalanceOp > 0) opening = { side: 'jama', amount: netBalanceOp };
    else if (netBalanceOp < 0) opening = { side: 'udhar', amount: Math.abs(netBalanceOp) };

    // 2. Fetch Ledger entries (Cash perspective)
    // GROUP BY reference_no to show "Mix Entry" for batch payments
    let txSql = '';
    let txParams = [companyId, date];

    if (showSubledger === '1') {
      // Subledger View: Show individual entries with member names
      txSql = `
        SELECT 
          al.id, 
          al.reference_no, 
          al.reference_type, 
          al.description as description, 
          COALESCE(acc.account_name, al.description) as description_en,
          acc.account_name_gu as description_gu,
          COALESCE(m.member_name, acc.account_name) as sub_details, 
          m.member_name_gu as sub_details_gu,
          acc.account_name_gu as sub_details_acc_gu,
          al.notes, 
          al.credit as cash_in, 
          al.debit as cash_out,
          COALESCE(al.credit, al.debit, 0) as sub_amount
        FROM account_ledger al
        LEFT JOIN accounts acc ON al.account_id = acc.id
        LEFT JOIN member_master m ON al.member_id = m.id
        WHERE al.company_id = ? AND al.transaction_date = ? 
        AND (al.transaction_type = 'cash_book' OR al.reference_type = 'cash_book' OR al.reference_type = 'dangar_entry' OR al.reference_type = 'dangar_entry_kapat')
        ORDER BY al.id ASC
      `;
    } else {
      // Grouped View: Show consolidated entries per Ledger Account AND SIDE
      // Uses MAX() for non-aggregated columns to satisfy strict PostgreSQL GROUP BY rules
      txSql = `
        SELECT 
          MIN(al.id) as id, 
          MAX(al.reference_no) as reference_no, 
          al.reference_type, 
          MAX(COALESCE(acc.account_name, al.description)) as description,
          MAX(COALESCE(acc.account_name, al.description)) as description_en,
          MAX(acc.account_name_gu) as description_gu, 
          MAX(CASE WHEN al.member_id IS NOT NULL THEN 'Multiple Members' ELSE '' END) as sub_details,
          MAX(al.notes) as notes, 
          SUM(COALESCE(al.credit, 0)) as cash_in, 
          SUM(COALESCE(al.debit, 0)) as cash_out,
          SUM(COALESCE(al.credit, al.debit, 0)) as sub_amount
        FROM account_ledger al
        LEFT JOIN accounts acc ON al.account_id = acc.id
        WHERE al.company_id = ? AND al.transaction_date = ? 
        AND (al.transaction_type = 'cash_book' OR al.reference_type = 'cash_book' OR al.reference_type = 'dangar_entry' OR al.reference_type = 'dangar_entry_kapat')
        GROUP BY 
          al.account_id, 
          al.reference_type, 
          (al.credit > 0)
        ORDER BY MIN(al.id) ASC
      `;
      txParams = [companyId, date];
    }
    const transactions = (await query(txSql, txParams)) || [];

    // 3. Fetch Non-Cash JV Items (Adjustments that don't hit cash_book)
    const jvSql = `
      SELECT i.id, i.type, i.amount, i.reference_no, i.particulars, a.account_name, v.voucher_type
      FROM journal_voucher_items i
      JOIN journal_vouchers v ON i.voucher_id = v.id
      JOIN accounts a ON i.account_id = a.id
      WHERE v.company_id = ? AND v.voucher_date = ? AND a.account_type NOT IN ('cash', 'bank')
    `;
    const jvItems = (await query(jvSql, [companyId, date])) || [];

    const jamaList = []; 
    const udharList = [];

    if (opening) {
      const opRow = { details: 'ઉઘડતી સિલ્ક (Op. Balance)', amount: Number(opening.amount || 0), isOpening: true };
      opening.side === 'jama' ? jamaList.push(opRow) : udharList.push(opRow);
    }

    const extractGSTType = (desc) => {
      if (!desc || typeof desc !== 'string') return null;
      if (desc.includes('CGST')) return 'CGST';
      if (desc.includes('SGST')) return 'SGST';
      if (desc.includes('IGST')) return 'IGST';
      return null;
    };

    const gstGrouped = { jama: { CGST: 0, SGST: 0, IGST: 0 }, udhar: { CGST: 0, SGST: 0, IGST: 0 } };
    const gstSubledger = { jama: { CGST: [], SGST: [], IGST: [] }, udhar: { CGST: [], SGST: [], IGST: [] } };

    // Process Ledger entries
    // Process Ledger entries
    transactions.forEach(tx => {
      if (!tx) return;
      const refType = (tx.reference_type || '').toUpperCase();
      const desc = tx.description || 'Unknown Transaction';
      const desc_en = tx.description_en || tx.description || 'Unknown Transaction';
      const desc_gu = tx.description_gu || desc_en || '';
      const isJVOrContra = ['JV', 'CONTRA'].includes(refType);
      const gstType = isJVOrContra ? null : extractGSTType(desc);
      const cIn = parseFloat(tx.cash_in || 0);
      const cOut = parseFloat(tx.cash_out || 0);

      if (gstType) {
        if (cIn > 0) {
          gstGrouped.jama[gstType] += cIn;
          gstSubledger.jama[gstType].push({ id: tx.id, description: desc, amount: cIn });
        }
        if (cOut > 0) {
          gstGrouped.udhar[gstType] += cOut;
          gstSubledger.udhar[gstType].push({ id: tx.id, description: desc, amount: cOut });
        }
      } else {
        const isNonCash = (
          refType.includes('JV') || 
          tx.reference_type === 'dangar_entry' || 
          tx.reference_type === 'dangar_entry_fund' || 
          tx.reference_type === 'jama_bardan_entry' ||
          tx.reference_type === 'bardan_entry'
        );

        if (cIn > 0) {
          jamaList.push({ 
            id: tx.id, 
            details: desc,
            description: desc,
            description_en: desc_en,
            description_gu: desc_gu,
            sub_details: tx.sub_details || '',
            sub_details_gu: tx.sub_details_gu || '',
            sub_details_acc_gu: tx.sub_details_acc_gu || '',
            notes: tx.notes || '', 
            reference_no: tx.reference_no || '',
            amount: cIn, 
            sub_amount: tx.sub_amount || cIn,
            isJV: isNonCash, 
            isContra: refType.includes('CONTRA') 
          });
        }
        if (cOut > 0) {
          udharList.push({ 
            id: tx.id, 
            details: desc,
            description: desc,
            description_en: desc_en,
            description_gu: desc_gu,
            sub_details: tx.sub_details || '',
            sub_details_gu: tx.sub_details_gu || '',
            sub_details_acc_gu: tx.sub_details_acc_gu || '',
            notes: tx.notes || '', 
            reference_no: tx.reference_no || '',
            amount: cOut, 
            sub_amount: tx.sub_amount || cOut,
            isJV: isNonCash, 
            isContra: refType.includes('CONTRA') 
          });
        }
      }
    });

    // Process Adjustment JVs
    jvItems.forEach(item => {
      if (!item) return;
      const amt = parseFloat(item.amount || 0);
      const vType = (item.voucher_type || '').toUpperCase();
      const row = {
        id: `JV-ITEM-${item.id}`,
        details: item.particulars || `${item.account_name || 'Unknown Account'} (JV Adjustment)`,
        notes: item.reference_no || '',
        amount: amt,
        isJV: vType.includes('JV'),
        isContra: vType.includes('CONTRA')
      };
      item.type === 'CREDIT' ? jamaList.push(row) : udharList.push(row);
    });

    // Add grouped GST entries
    ['CGST', 'SGST', 'IGST'].forEach(gstType => {
      if (gstGrouped.jama[gstType] > 0) {
        jamaList.push({ details: `${gstType} IN/OUT`, amount: gstGrouped.jama[gstType], isGST: true, gstType, subledger: gstSubledger.jama[gstType] || [] });
      }
      if (gstGrouped.udhar[gstType] > 0) {
        udharList.push({ details: `${gstType} IN/OUT`, amount: gstGrouped.udhar[gstType], isGST: true, gstType, subledger: gstSubledger.udhar[gstType] || [] });
      }
    });

    const totalJama = jamaList.reduce((sum, r) => sum + ((r.isJV || r.isContra) ? 0 : parseFloat(r.amount || 0)), 0);
    const totalUdhar = udharList.reduce((sum, r) => sum + ((r.isJV || r.isContra) ? 0 : parseFloat(r.amount || 0)), 0);

    let closing = { side: null, amount: 0 };
    let finalJama = totalJama;
    let finalUdhar = totalUdhar;

    if (totalJama > totalUdhar) {
      closing = { side: 'udhar', amount: totalJama - totalUdhar };
      udharList.push({ details: 'બંધ સિલ્ક (Cl. Balance)', amount: closing.amount, isClosing: true });
      finalUdhar += closing.amount;
    } else if (totalUdhar > totalJama) {
      closing = { side: 'jama', amount: totalUdhar - totalJama };
      jamaList.push({ details: 'બંધ સિલ્ક (Cl. Balance)', amount: closing.amount, isClosing: true });
      finalJama += closing.amount;
    }

    res.json({ 
      success: true, 
      date, 
      data: { 
        jama: jamaList, 
        udhar: udharList, 
        totals: { jama_total: finalJama, udhar_total: finalUdhar }, 
        closing, 
        opening: opening || { side: null, amount: 0 } 
      } 
    });

  } catch (error) {
    console.error('ROJMEL CRITICAL ERROR');
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    console.error('Attempted SQL:', txSql);
    console.error('SQL Params:', txParams);

    res.status(500).json({ 
      success: false, 
      error: 'Rojmel Generation Failed',
      details: error.message,
      jama: [],
      udhar: [],
      totals: { jama_total: 0, udhar_total: 0 }
    });
  }
});

export default router;