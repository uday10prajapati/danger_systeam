import { createPool } from 'mysql2/promise';

const pool = createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'superstore_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function migrate() {
  let connection;
  try {
    connection = await pool.getConnection();

    // Create item_master table
    const sql = `
      CREATE TABLE IF NOT EXISTS item_master (
        id INT PRIMARY KEY AUTO_INCREMENT,
        company_id INT NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        item_code VARCHAR(100) NOT NULL,
        barcode VARCHAR(100) NOT NULL UNIQUE,
        category VARCHAR(100),
        unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
        tax_percentage DECIMAL(5, 2) DEFAULT 0,
        reorder_level INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
        UNIQUE KEY unique_item_code (company_id, item_code),
        UNIQUE KEY unique_barcode (barcode),
        INDEX idx_company (company_id),
        INDEX idx_barcode (barcode),
        INDEX idx_category (category),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await connection.execute(sql);
    console.log('✓ item_master table created successfully');

    // Verify table structure
    const [tables] = await connection.query(
      'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      ['superstore', 'item_master']
    );

    if (tables.length > 0) {
      console.log('✓ Table verification successful');
      console.log('✓ Migration completed');
      process.exit(0);
    } else {
      console.error('✗ Table creation failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Migration error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.release();
    await pool.end();
  }
}

migrate();
