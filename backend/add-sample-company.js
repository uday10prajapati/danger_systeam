import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), '..', 'superstore.db');
console.log('Adding sample company to:', dbPath);

try {
  const db = new Database(dbPath);
  
  const result = db.prepare(`
    INSERT INTO company (
      company_name, 
      address, 
      phone, 
      email, 
      gst_number,
      financial_year_start,
      financial_year_end,
      currency
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Sample Superstore',
    '123 Main Street',
    '+91-9876543210',
    'info@superstore.com',
    '27AABCT1234H1Z0',
    '2024-04-01',
    '2025-03-31',
    'INR'
  );
  
  console.log('✅ Company created with ID:', result.lastInsertRowid);
    
  db.close();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
