-- This script runs as the postgres user to create the application database
-- Note: CREATE DATABASE cannot be executed inside a transaction block or IF NOT EXISTS in plain SQL
-- We will handle the "exists" check in the Inno Setup script or via a batch wrapper.

SELECT 'CREATE DATABASE my_app_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'my_app_db')\gexec
