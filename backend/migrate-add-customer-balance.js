/**
 * Migration: Add Customer Balance Support to Sales
 * 
 * This migration adds amount_paid, due_amount, and advance_amount columns
 * to the sales table to track payment details without storing balance.
 * 
 * RUN: node migrate-add-customer-balance.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'superstore_db',
};

async function migrate() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to database');

    // Add columns to sales table
    console.log('Adding columns to sales table...');
    
    try {
      await connection.query(`
        ALTER TABLE sales 
        ADD COLUMN amount_paid DECIMAL(12, 2) DEFAULT 0 AFTER net_amount
      `);
      console.log('✅ Added amount_paid column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Column amount_paid already exists');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE sales 
        ADD COLUMN due_amount DECIMAL(12, 2) DEFAULT 0 AFTER amount_paid
      `);
      console.log('✅ Added due_amount column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Column due_amount already exists');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE sales 
        ADD COLUMN advance_amount DECIMAL(12, 2) DEFAULT 0 AFTER due_amount
      `);
      console.log('✅ Added advance_amount column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Column advance_amount already exists');
      } else {
        throw err;
      }
    }

    // Add indexes for faster queries
    console.log('Adding indexes...');
    
    try {
      await connection.query(`
        ALTER TABLE sales 
        ADD INDEX idx_amount_paid (amount_paid)
      `);
      console.log('✅ Added index on amount_paid');
    } catch (err) {
      if (err.code === 'ER_DUP_KEY_NAME') {
        console.log('⚠️  Index idx_amount_paid already exists');
      } else {
        throw err;
      }
    }

    try {
      await connection.query(`
        ALTER TABLE sales 
        ADD INDEX idx_due_amount (due_amount)
      `);
      console.log('✅ Added index on due_amount');
    } catch (err) {
      if (err.code === 'ER_DUP_KEY_NAME') {
        console.log('⚠️  Index idx_due_amount already exists');
      } else {
        throw err;
      }
    }

    // Add balance_type to customer_ledger if not exists
    console.log('Updating customer_ledger table...');
    
    try {
      await connection.query(`
        ALTER TABLE customer_ledger 
        ADD COLUMN balance_type ENUM('DUE', 'ADVANCE') DEFAULT 'DUE' AFTER balance
      `);
      console.log('✅ Added balance_type column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Column balance_type already exists');
      } else {
        throw err;
      }
    }

    // Add index for balance lookup
    try {
      await connection.query(`
        ALTER TABLE customer_ledger 
        ADD INDEX idx_balance_lookup (company_id, customer_account_id, created_at DESC)
      `);
      console.log('✅ Added index for balance lookup');
    } catch (err) {
      if (err.code === 'ER_DUP_KEY_NAME') {
        console.log('⚠️  Index idx_balance_lookup already exists');
      } else {
        throw err;
      }
    }

    // Verify migration
    console.log('\n✅ MIGRATION COMPLETE\n');
    
    // Show table structure
    const result = await connection.query(`DESCRIBE sales`);
    console.log('Sales table structure:');
    console.table(result[0].filter(col => 
      ['amount_paid', 'due_amount', 'advance_amount', 'net_amount'].includes(col.Field)
    ));

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
