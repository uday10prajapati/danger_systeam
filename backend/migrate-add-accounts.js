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
  const connection = await mysql.createConnection(config);

  try {
    console.log('🔄 Creating accounts table...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        account_name VARCHAR(100) NOT NULL,
        account_type VARCHAR(50) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        opening_balance DECIMAL(12,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_account_per_company (company_id, account_name),
        FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
        INDEX idx_company_type (company_id, account_type),
        INDEX idx_account_type (account_type)
      )
    `);

    console.log('✅ Accounts table created successfully!');
    
    // Optional: Create default accounts for the first company
    const [companies] = await connection.query('SELECT id FROM company LIMIT 1');
    
    if (companies.length > 0) {
      const companyId = companies[0].id;
      console.log(`\n📝 Creating default accounts for company ${companyId}...`);

      const defaultAccounts = [
        { name: 'Cash', type: 'cash', balance: 0 },
        { name: 'Bank', type: 'bank', balance: 0 },
      ];

      for (const account of defaultAccounts) {
        try {
          await connection.query(
            `INSERT IGNORE INTO accounts (company_id, account_name, account_type, opening_balance, is_active)
             VALUES (?, ?, ?, ?, 1)`,
            [companyId, account.name, account.type, account.balance]
          );
          console.log(`  ✓ Created ${account.name} account`);
        } catch (err) {
          console.log(`  ⚠️  ${account.name} account may already exist`);
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

migrate();
