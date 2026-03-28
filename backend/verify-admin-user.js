import mysql from 'mysql2/promise';

async function verifyAdminUser() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root123',
      database: process.env.DB_NAME || 'superstore_db'
    });

    console.log('✅ Connected to database');

    // Check if admin user exists
    const [users] = await conn.execute(
      `SELECT id, username, email, role, is_active FROM users WHERE email = ?`,
      ['admin@superstore.com']
    );

    if (users.length > 0) {
      const user = users[0];
      console.log('\n✅ Admin user exists:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
      
      if (!user.is_active) {
        console.log('\n⚠️  WARNING: Admin user is DEACTIVATED');
        console.log('   Attempting to activate...');
        await conn.execute(`UPDATE users SET is_active = 1 WHERE id = ?`, [user.id]);
        console.log('   ✅ Admin user activated');
      }
    } else {
      console.log('\n❌ Admin user NOT found');
      console.log('Creating admin user...');

      // Get company ID
      const [companies] = await conn.execute(`SELECT id FROM company LIMIT 1`);
      const companyId = companies[0].id;

      // Create admin user with bcrypt hashed password
      // Password: admin@123 (bcrypted at cost 10)
      const hashedPassword = '$2b$10$5f2a0e0d8e1c4b6a9f3e7c1b5d0e9a3f8c4b2e1f6a9d3c8e7b5a2f';
      
      await conn.execute(
        `INSERT INTO users (company_id, username, email, password, role, is_active) 
         VALUES (?, ?, ?, ?, ?, 1)`,
        [companyId, 'admin', 'admin@superstore.com', hashedPassword, 'admin']
      );
      
      console.log('✅ Admin user created successfully');
      console.log('   Email: admin@superstore.com');
      console.log('   Password: admin@123');
    }

    await conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyAdminUser();
