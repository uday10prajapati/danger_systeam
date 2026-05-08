/**
 * Customer Balance Management Functions
 * 
 * Handles:
 * - Calculating customer current balance from ledger
 * - Determining advance to apply automatically
 * - Creating sales with balance tracking
 * 
 * These functions integrate with existing db.js functions
 */

export async function getCustomerBalance(pool, companyId, customerId) {
  /**
   * Calculate customer balance from Customer Ledger
   * 
   * Returns:
   * {
   *   total_debits: 100,      // What customer owes (sales)
   *   total_credits: 60,      // What we received (payments)
   *   net_balance: 40,        // 40 > 0 = DUE, < 0 = ADVANCE
   *   due_amount: 40,         // If balance > 0
   *   advance_amount: 0       // If balance < 0
   * }
   */
  
  const sql = `
    SELECT 
      COALESCE(SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END), 0) as total_debits,
      COALESCE(SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END), 0) as total_credits
    FROM account_ledger
    WHERE company_id = ? 
      AND (account_id = ? OR member_id = ?)
  `;
  
  // Use the pool.query from db.js style (directly available if we use the right export)
  const rows = await pool.query(sql, [companyId, customerId, customerId]);
  
  const total_debits = parseFloat(rows[0]?.total_debits || 0);
  const total_credits = parseFloat(rows[0]?.total_credits || 0);
  const net_balance = total_debits - total_credits;
  
  return {
    total_debits,
    total_credits,
    net_balance,
    due_amount: net_balance > 0 ? net_balance : 0,
    advance_amount: net_balance < 0 ? Math.abs(net_balance) : 0
  };
}

export async function calculateAdvanceAdjustment(pool, companyId, customerId, netAmount) {
  const balance = await getCustomerBalance(pool, companyId, customerId);
  
  if (balance.advance_amount > 0) {
    const advance_to_apply = Math.min(balance.advance_amount, netAmount);
    const remaining_due = netAmount - advance_to_apply;
    
    return {
      advance_to_apply,
      remaining_due,
      adjusted: true
    };
  }
  
  return {
    advance_to_apply: 0,
    remaining_due: netAmount,
    adjusted: false
  };
}

export async function createSaleWithBalance(
  pool,
  companyId,
  invoiceNo,
  invoiceDate,
  customerId,
  memberId,
  items,
  discountAmount,
  amountPaid,
  paymentType,
  notes,
  userId
) {
  // Use our new polyfilled getConnection
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.quantity * item.sale_rate;
    }
    const netAmount = totalAmount - (discountAmount || 0);
    
    let advanceToApply = 0;
    let effectiveAmountPaid = amountPaid || 0;
    
    if (customerId) {
      const advanceCalc = await calculateAdvanceAdjustment(
        pool,
        companyId,
        customerId,
        netAmount
      );
      advanceToApply = advanceCalc.advance_to_apply;
      effectiveAmountPaid = (parseFloat(amountPaid) || 0) + advanceToApply;
    }
    
    const totalCollected = effectiveAmountPaid;
    let dueAmount = 0;
    let advanceAmount = 0;
    
    if (totalCollected < netAmount) {
      dueAmount = netAmount - totalCollected;
    } else if (totalCollected > netAmount) {
      advanceAmount = totalCollected - netAmount;
    }
    
    const [saleRes] = await connection.execute(
      `INSERT INTO sales 
       (company_id, invoice_no, invoice_date, customer_account_id, member_id,
        total_amount, discount_amount, net_amount, payment_type, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId, invoiceNo, invoiceDate, customerId || null, memberId || null,
        totalAmount, discountAmount || 0, netAmount, paymentType, notes, userId
      ]
    );
    
    const saleId = saleRes.insertId;
    
    for (const item of items) {
      const amount = item.quantity * item.sale_rate;
      await connection.execute(
        `INSERT INTO sale_items (sale_id, item_id, quantity, sale_rate, amount)
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, item.item_id, item.quantity, item.sale_rate, amount]
      );
      
      const [stockRow] = await connection.query(
        `SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as current_stock 
         FROM purchase_stock_ledger 
         WHERE company_id = ? AND item_id = ?`,
        [companyId, item.item_id]
      );
      
      const currentStock = parseFloat(stockRow[0]?.current_stock || 0);
      const newStock = currentStock - item.quantity;
      
      await connection.execute(
        `INSERT INTO purchase_stock_ledger 
         (company_id, item_id, quantity_out, current_stock, transaction_type, 
          reference_no, created_by)
         VALUES (?, ?, ?, ?, 'SALE_OUT', ?, ?)`,
        [companyId, item.item_id, item.quantity, newStock, `SALE-${saleId}`, userId]
      );
    }
    
    if (customerId || memberId) {
      const targetId = customerId || memberId;
      const isMember = !!memberId;
      
      await connection.execute(
        `INSERT INTO account_ledger 
         (company_id, ${isMember ? 'member_id' : 'account_id'}, debit_amount, credit_amount, 
          transaction_type, reference_no, transaction_date, description, created_by)
         VALUES (?, ?, ?, ?, 'SALE', ?, ?, ?, ?)`,
        [
          companyId, targetId, netAmount, totalCollected, 
          `SALE-${saleId}`, invoiceDate, `Sale Invoice ${invoiceNo}`, userId
        ]
      );
    }
    
    if (amountPaid > 0) {
      await connection.execute(
        `INSERT INTO cash_book 
        (company_id, transaction_date, reference_type, reference_id, 
         reference_no, description, cash_in, created_by)
        VALUES (?, ?, 'SALE', ?, ?, ?, ?, ?)`,
        [
          companyId, invoiceDate, saleId, invoiceNo,
          `Sale Receipt - ${invoiceNo}`, amountPaid, userId
        ]
      );
    }
    
    await connection.commit();
    
    return {
      id: saleId,
      invoice_no: invoiceNo,
      total_amount: totalAmount,
      net_amount: netAmount,
      amount_paid: amountPaid,
      due_amount: dueAmount,
      advance_amount: advanceAmount,
      advance_adjusted: advanceToApply
    };
    
  } catch (error) {
    await connection.rollback();
    console.error('Create sale with balance error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

export async function getCustomerBalanceHistory(pool, companyId, customerId) {
  const sql = `
    SELECT 
      id, transaction_date as created_at, transaction_type, reference_no,
      debit_amount, credit_amount, description as notes
    FROM account_ledger
    WHERE company_id = ? AND (account_id = ? OR member_id = ?)
    ORDER BY transaction_date ASC, id ASC
  `;
  const rows = await pool.query(sql, [companyId, customerId, customerId]);
  return rows || [];
}

export async function applyCreditPayment(
  pool,
  companyId,
  customerId,
  paymentAmount,
  paymentDate,
  paymentRefNo,
  userId
) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    await connection.execute(
      `INSERT INTO account_ledger 
       (company_id, account_id, debit_amount, credit_amount, 
        transaction_type, reference_no, transaction_date, description, created_by)
       VALUES (?, ?, 0, ?, 'PAYMENT', ?, ?, 'Payment Received', ?)`,
      [companyId, customerId, paymentAmount, `PAY-${paymentRefNo}`, paymentDate, userId]
    );
    
    await connection.execute(
      `INSERT INTO cash_book 
       (company_id, transaction_date, reference_type, reference_no, 
        description, cash_in, created_by)
       VALUES (?, ?, 'PAYMENT', ?, 'Customer Payment Receipt', ?, ?)`,
      [companyId, paymentDate, `PAY-${paymentRefNo}`, paymentAmount, userId]
    );
    
    await connection.commit();
    return { success: true };
    
  } catch (error) {
    await connection.rollback();
    console.error('Apply credit payment error:', error);
    throw error;
  } finally {
    connection.release();
  }
}
