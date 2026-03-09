/**
 * Migration: Add Member Code (numeric auto-increment) and enhance Member Master
 * 
 * Changes:
 * 1. Add member_code (INT AUTO_INCREMENT per company)
 * 2. Add member_address (TEXT)
 * 3. Add member_gst_no (VARCHAR)
 * 4. Create UNIQUE constraint on (company_id, member_code)
 */

import db, { query } from './db.js';

async function migrateMemberMaster() {
  try {
    console.log('🔄 Starting Member Master Migration...');

    // 1. Add member_code column
    console.log('📝 Adding member_code column...');
    try {
      await query(`
        ALTER TABLE member_master 
        ADD COLUMN member_code INT DEFAULT NULL 
        AFTER company_id
      `);
      console.log('  ✅ Added: member_code');
    } catch (error) {
      if (error.message.includes('Duplicate')) {
        console.log('  ⏭️  Already exists: member_code');
      } else {
        throw error;
      }
    }

    // 2. Add member_address column
    console.log('📝 Adding member_address column...');
    try {
      await query(`
        ALTER TABLE member_master 
        ADD COLUMN member_address TEXT 
        AFTER member_name
      `);
      console.log('  ✅ Added: member_address');
    } catch (error) {
      if (error.message.includes('Duplicate')) {
        console.log('  ⏭️  Already exists: member_address');
      } else {
        throw error;
      }
    }

    // 3. Add member_gst_no column
    console.log('📝 Adding member_gst_no column...');
    try {
      await query(`
        ALTER TABLE member_master 
        ADD COLUMN member_gst_no VARCHAR(20) 
        AFTER member_address
      `);
      console.log('  ✅ Added: member_gst_no');
    } catch (error) {
      if (error.message.includes('Duplicate')) {
        console.log('  ⏭️  Already exists: member_gst_no');
      } else {
        throw error;
      }
    }

    // 4. Generate member codes for existing members (if not already done)
    console.log('🔢 Generating member codes for existing members...');
    
    const companies = await query(`SELECT DISTINCT company_id FROM member_master WHERE member_code IS NULL`);
    
    if (companies.length > 0) {
      for (const company of companies) {
        const companyId = company.company_id;
        
        // Get all members without code for this company
        const members = await query(`
          SELECT id FROM member_master 
          WHERE company_id = ? AND member_code IS NULL 
          ORDER BY id ASC
        `, [companyId]);

        let maxCode = 0;
        
        // Get current max code for this company
        const maxResult = await query(`
          SELECT MAX(member_code) as max_code FROM member_master 
          WHERE company_id = ?
        `, [companyId]);
        
        if (maxResult.length > 0 && maxResult[0].max_code) {
          maxCode = maxResult[0].max_code;
        }

        // Assign codes to members
        for (const member of members) {
          maxCode++;
          await query(`
            UPDATE member_master SET member_code = ? WHERE id = ?
          `, [maxCode, member.id]);
          console.log(`  ✅ Assigned code ${maxCode} to member ID ${member.id}`);
        }
      }
    } else {
      console.log('  ✅ All members already have codes');
    }

    // 5. Create UNIQUE constraint on (company_id, member_code)
    console.log('🔐 Creating unique constraint...');
    try {
      await query(`
        ALTER TABLE member_master 
        ADD CONSTRAINT idx_company_member_code 
        UNIQUE (company_id, member_code)
      `);
      console.log('  ✅ Created: UNIQUE constraint on (company_id, member_code)');
    } catch (error) {
      if (error.message.includes('Duplicate')) {
        console.log('  ⏭️  Constraint already exists');
      } else {
        throw error;
      }
    }

    // 6. Create INDEX on member_code for faster search
    console.log('📇 Creating index for member_code...');
    try {
      await query(`
        CREATE INDEX idx_member_code ON member_master (company_id, member_code)
      `);
      console.log('  ✅ Created: Index on member_code');
    } catch (error) {
      if (error.message.includes('Duplicate')) {
        console.log('  ⏭️  Index already exists');
      } else {
        throw error;
      }
    }

    // 7. Make member_code NOT NULL
    console.log('🔒 Making member_code NOT NULL...');
    try {
      await query(`
        ALTER TABLE member_master 
        MODIFY member_code INT NOT NULL
      `);
      console.log('  ✅ member_code is now NOT NULL');
    } catch (error) {
      console.log('  ⚠️  Could not modify member_code constraint:', error.message);
    }

    console.log('✅ Member Master Migration completed successfully!');
    console.log('\n📋 Schema Updated:');
    console.log('  - member_code (INT, AUTO_INCREMENT per company)');
    console.log('  - member_address (TEXT)');
    console.log('  - member_gst_no (VARCHAR)');
    console.log('  - UNIQUE constraint: (company_id, member_code)');
    console.log('  - INDEX: member_code for fast search');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Member Master Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrateMemberMaster();
