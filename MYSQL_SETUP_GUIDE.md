# MySQL Setup Guide for Superstore (XAMPP)

## Changes Made

✅ **db.js**: Migrated from SQLite (better-sqlite3) to MySQL (mysql2)
✅ **package.json**: Removed better-sqlite3, kept mysql2 dependency  
✅ **.env**: Updated with MySQL configuration for development
✅ **.env.production**: Updated with MySQL configuration template for production
✅ **Database Schema**: Converted all table definitions from SQLite to MySQL syntax

## Setup Instructions

### 1. Install Dependencies

Navigate to the backend directory and reinstall packages:

```powershell
cd d:\Superstore\backend
npm install
```

This will remove better-sqlite3 and ensure mysql2 is properly installed.

### 2. Start XAMPP

1. Open XAMPP Control Panel
2. Start **Apache** (if you want to use phpMyAdmin)
3. Start **MySQL**

### 3. Create the Database

Option A: Using phpMyAdmin (easiest)
- Open browser: `http://localhost/phpmyadmin`
- Click "New" in the left sidebar
- Database name: `superstore`
- Collation: `utf8mb4_unicode_ci`
- Click "Create"

Option B: Using Command Line
```bash
mysql -u root -p
```
(Press Enter for password - XAMPP default is no password)

Then run:
```sql
CREATE DATABASE superstore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Verify .env Configuration

Check that `.env` file has correct settings:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=superstore
```

Adjust if your XAMPP MySQL has a different password.

### 5. Start the Backend Server

```powershell
cd d:\Superstore\backend
npm start
```

The server will automatically:
- Connect to MySQL
- Create all database tables
- Log: "✅ Connected to MySQL Database (XAMPP)"

### 6. Verify Connection

You should see in the logs:
```
✅ Connected to MySQL Database (XAMPP)
✅ MySQL Database tables created/verified
```

## Database Changes

All tables have been converted from SQLite to MySQL:
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `INT PRIMARY KEY AUTO_INCREMENT`
- `REAL` → `DECIMAL(10, 2)` (for monetary values)
- Indexes: Now use MySQL `CREATE UNIQUE INDEX` syntax

## Troubleshooting

**Error: "Access Denied for user 'root'@'localhost'"**
- Check if MySQL is running in XAMPP Control Panel
- Verify password in .env (XAMPP default is empty)

**Error: "Database 'superstore' doesn't exist"**
- Create the database using phpMyAdmin or MySQL CLI (see step 3)

**Error: "connect ECONNREFUSED 127.0.0.1:3306"**
- Start MySQL in XAMPP Control Panel
- Check if port 3306 is not blocked

## Next Steps

1. Update frontend `api.js` if needed (should already work)
2. Update any migration scripts to use MySQL syntax
3. Test CRUD operations
4. Set proper JWT_SECRET in production .env

## Rollback to SQLite

If you need to switch back:
1. Restore original `db.js` 
2. `npm install better-sqlite3`
3. Remove MySQL configuration from .env
4. Restart server
