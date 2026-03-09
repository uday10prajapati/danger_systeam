import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'superstore_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

async function createItemRateTable() {
  const connection = await pool.getConnection()
  try {
    // Create item_rate table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS item_rate (
        id INT PRIMARY KEY AUTO_INCREMENT,
        company_id INT NOT NULL,
        item_id INT NOT NULL,
        purchase_rate DECIMAL(12, 2) NOT NULL,
        sale_rate DECIMAL(12, 2) NOT NULL,
        mrp DECIMAL(12, 2),
        effective_from DATE NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        CONSTRAINT fk_itemrate_company FOREIGN KEY (company_id) 
          REFERENCES company(id) ON DELETE CASCADE,
        CONSTRAINT fk_itemrate_item FOREIGN KEY (item_id) 
          REFERENCES item_master(id) ON DELETE CASCADE,
        
        INDEX idx_company_item (company_id, item_id),
        INDEX idx_item_active (item_id, is_active),
        INDEX idx_effective_from (effective_from),
        UNIQUE KEY uk_company_item_active (company_id, item_id, is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    
    console.log('✅ item_rate table created successfully')

    // Create price_history view (read-only for audit trail)
    await connection.query(`
      CREATE OR REPLACE VIEW price_history AS
      SELECT 
        ir.id,
        ir.company_id,
        ir.item_id,
        im.item_name,
        im.item_code,
        ir.purchase_rate,
        ir.sale_rate,
        ir.mrp,
        ir.effective_from,
        ir.is_active,
        ir.created_at,
        CASE WHEN ir.is_active = 1 THEN 'Active' ELSE 'Inactive' END AS status
      FROM item_rate ir
      JOIN item_master im ON ir.item_id = im.id
      ORDER BY ir.item_id, ir.effective_from DESC
    `)
    
    console.log('✅ price_history view created successfully')
    
    console.log('\n📋 Schema Summary:')
    console.log('   - item_rate: Main pricing table with foreign keys')
    console.log('   - Unique constraint: Only ONE active rate per item per company')
    console.log('   - price_history view: Full audit trail of price changes')
    console.log('   - Automatic timestamps for created_at and updated_at')
    
  } catch (error) {
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('⚠️  item_rate table already exists')
    } else {
      console.error('❌ Error:', error.message)
      throw error
    }
  } finally {
    await connection.release()
  }
}

createItemRateTable().then(() => {
  process.exit(0)
}).catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
