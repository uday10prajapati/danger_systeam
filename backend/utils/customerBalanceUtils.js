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
    FROM customer_ledger
    WHERE company_id = ? 
      AND customer_account_id = ? 
      AND is_deleted = FALSE
  `;
  
  const [results] = await pool.query(sql, [companyId, customerId]);
  
  const total_debits = results[0]?.total_debits || 0;
  const total_credits = results[0]?.total_credits || 0;
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
  /**
   * Determine if customer has advance and how much to apply
   * 
   * Returns:
   * {
   *   advance_to_apply: 30,     // How much advance to use (0 if none)
   *   remaining_due: 70,        // What customer still needs to pay
   *   adjusted: true            // Whether adjustment was made
   * }
   */
  
  const balance = await getCustomerBalance(pool, companyId, customerId);
  
  // If customer has advance, automatically determine adjustment
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
  /**
   * Create sale with automatic balance handling
   * 
   * Flow:
   * 1. Calculate total and net amount
   * 2. Check for customer's advance balance
   * 3. Auto-apply advance if available
   * 4. Calculate due or advance for this sale
   * 5. Create sale + ledger entries + cash book entry
   * 
   * Returns:
   * {
   *   id, invoice_no, total_amount, net_amount, 
   *   amount_paid, due_amount, advance_amount,
   *   advance_adjusted
   * }
   */
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // ============ STEP 1: Calculate amounts ============
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.quantity * item.sale_rate;
    }
    const netAmount = totalAmount - (discountAmount || 0);
    
    // ============ STEP 2: Calculate advance adjustment ============
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
      effectiveAmountPaid = amountPaid + advanceToApply;
    }
    
    // ============ STEP 3: Calculate due/advance ============
    const totalCollected = effectiveAmountPaid;
    let dueAmount = 0;
    let advanceAmount = 0;
    
    if (totalCollected < netAmount) {
      dueAmount = netAmount - totalCollected;
    } else if (totalCollected > netAmount) {
      advanceAmount = totalCollected - netAmount;
    }
    
    // ============ STEP 4: Insert sale header ============
    const saleResult = await connection.query(
      `INSERT INTO sales 
       (company_id, invoice_no, invoice_date, customer_account_id, member_id,
        total_amount, discount_amount, net_amount, amount_paid, 
        due_amount, advance_amount, payment_type, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId, invoiceNo, invoiceDate, customerId || null, memberId || null,
        totalAmount, discountAmount || 0, netAmount, amountPaid,
        dueAmount, advanceAmount, paymentType, notes, userId
      ]
    );
    
    const saleId = saleResult[0].insertId;
    
    // ============ STEP 5: Insert sale items + stock ============
    for (const item of items) {
      const amount = item.quantity * item.sale_rate;
      
      // Insert sale item
      await connection.query(
        `INSERT INTO sale_items (sale_id, item_id, quantity, sale_rate, amount)
         VALUES (?, ?, ?, ?, ?)`,
        [saleId, item.item_id, item.quantity, item.sale_rate, amount]
      );
      
      // Get current stock
      const currentStockRow = await connection.query(
        `SELECT COALESCE(SUM(quantity_in - quantity_out), 0) as current_stock 
         FROM purchase_stock_ledger 
         WHERE company_id = ? AND item_id = ?`,
        [companyId, item.item_id]
      );
      
      const currentStock = currentStockRow[0][0]?.current_stock || 0;
      const newStock = currentStock - item.quantity;
      
      // Insert stock ledger
      await connection.query(
        `INSERT INTO purchase_stock_ledger 
         (company_id, item_id, quantity_out, current_stock, transaction_type, 
          reference_id, reference_no, created_by)
         VALUES (?, ?, ?, ?, 'SALE_OUT', ?, ?, ?)`,
        [companyId, item.item_id, item.quantity, newStock, saleId, `SALE-${saleId}`, userId]
      );
    }
    
    // ============ STEP 6: Update customer ledger ============
    if (customerId) {
      // First, create advance adjustment entry if needed
      if (advanceToApply > 0) {
        const preAdjustmentBalance = await getCustomerBalance(pool, companyId, customerId);
        const postAdjustmentBalance = preAdjustmentBalance.net_balance + advanceToApply;
        
        await connection.query(
          `INSERT INTO customer_ledger 
           (company_id, customer_account_id, debit_amount, balance, balance_type,
            transaction_type, reference_no, notes, created_by)
           VALUES (?, ?, ?, ?, 'DUE', 'ADJUSTMENT', ?, ?, ?)`,
          [
            companyId, customerId, advanceToApply, postAdjustmentBalance,
            `ADVANCE-ADJ-${saleId}`,
            `Advance adjusted against sale ${invoiceNo}`,
            userId
          ]
        );
      }
      
      // Then, create main sale entry in ledger
      const currentBalance = await getCustomerBalance(pool, companyId, customerId);
      const newBalance = currentBalance.total_debits + netAmount - 
                         (currentBalance.total_credits + effectiveAmountPaid);
      
      await connection.query(
        `INSERT INTO customer_ledger 
         (company_id, customer_account_id, debit_amount, credit_amount, balance,
          balance_type, transaction_type, reference_no, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 'SALE', ?, ?)`,
        [
          companyId, customerId, netAmount, 0, newBalance,
          newBalance > 0 ? 'DUE' : 'ADVANCE',
          `SALE-${saleId}`,
          userId
        ]
      );
    }
    
    // ============ STEP 7: Insert cash book entry ============
    // Only for amount actually paid (not due or advance applied)
    if (amountPaid > 0) {
      // Check if insertCashBookEntry is available
      const cashBookSql = `
        INSERT INTO cash_book 
        (company_id, entry_date, entry_type, source_type, source_id, 
         reference_no, description, debit_amount, credit_amount, created_by, notes)
        VALUES (?, ?, 'RECEIPT', 'SALE', ?, ?, ?, ?, 0, ?, ?)
      `;
      
      await connection.query(
        cashBookSql,
        [
          companyId, invoiceDate, saleId, invoiceNo,
          `Sale - ${invoiceNo}`, amountPaid, userId, ''
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
  /**
   * Get detailed transaction history for customer
   * Useful for reports and customer ledger display
   */
  
  const sql = `
    SELECT 
      cl.id,
      cl.created_at,
      cl.transaction_type,
      cl.reference_no,
      cl.debit_amount,
      cl.credit_amount,
      cl.balance,
      cl.balance_type,
      cl.notes
    FROM customer_ledger cl
    WHERE cl.company_id = ? AND cl.customer_account_id = ?
    ORDER BY cl.created_at ASC
  `;
  
  const [results] = await pool.query(sql, [companyId, customerId]);
  return results || [];
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
  /**
   * Apply manual payment against customer's outstanding dues
   * 
   * This is different from sale payment - it's a separate payment receipt
   */
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const balance = await getCustomerBalance(pool, companyId, customerId);
    
    if (balance.net_balance <= 0) {
      throw new Error('Customer has no outstanding dues');
    }
    
    const newBalance = balance.net_balance - paymentAmount;
    
    // Create ledger entry for payment
    await connection.query(
      `INSERT INTO customer_ledger 
       (company_id, customer_account_id, debit_amount, credit_amount, balance,
        balance_type, transaction_type, reference_no, created_by)
       VALUES (?, ?, 0, ?, ?, ?, 'PAYMENT', ?, ?)`,
      [
        companyId, customerId, paymentAmount, newBalance,
        newBalance > 0 ? 'DUE' : 'ADVANCE',
        `PAYMENT-${paymentRefNo}`,
        userId
      ]
    );
    
    // Cash book entry
    await connection.query(
      `INSERT INTO cash_book 
       (company_id, entry_date, entry_type, source_type, source_id,
        reference_no, description, debit_amount, credit_amount, created_by)
       VALUES (?, ?, 'RECEIPT', 'PAYMENT', ?, ?, ?, ?, 0, ?)`,
      [
        companyId, paymentDate, customerId, `PAYMENT-${paymentRefNo}`,
        `Payment against dues`, paymentAmount, userId
      ]
    );
    
    await connection.commit();
    
    return {
      old_balance: balance.net_balance,
      payment_amount: paymentAmount,
      new_balance: newBalance,
      status: newBalance > 0 ? 'PARTIAL' : (newBalance === 0 ? 'SETTLED' : 'OVERPAID')
    };
    
  } catch (error) {
    await connection.rollback();
    console.error('Apply credit payment error:', error);
    throw error;
  } finally {
    connection.release();
  }
}
