const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Helper to find pg_dump / pg_restore binaries
const findPgBinary = (binName) => {
    const basePaths = [
        path.join('C:', 'Program Files', 'PostgreSQL'),
        path.join('C:', 'Program Files (x86)', 'PostgreSQL')
    ];

    const foundPaths = [];

    basePaths.forEach(base => {
        if (fs.existsSync(base)) {
            const versions = fs.readdirSync(base);
            versions.forEach(v => {
                const fullPath = path.join(base, v, 'bin', binName);
                if (fs.existsSync(fullPath)) {
                    foundPaths.push({ version: parseFloat(v) || 0, path: fullPath });
                }
            });
        }
    });

    // Sort by version descending (highest first)
    foundPaths.sort((a, b) => b.version - a.version);

    if (foundPaths.length > 0) {
        return `"${foundPaths[0].path}"`;
    }

    // Fallback to just the name and hope it's in PATH
    return `"${binName}"`;
};

const DB_NAME = process.env.DB_NAME || 'danger_systeam';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '6099';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || '5432';

const BACKUP_DIR = path.join(app.getPath('userData'), 'backups');

/**
 * Ensures the backup directory exists
 */
const ensureBackupDir = () => {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
};

/**
 * Creates a database backup
 */
const createBackup = () => {
    return new Promise((resolve, reject) => {
        ensureBackupDir();
        
        const timestamp = new Date().toISOString().replace(/[:T]/g, '').split('.')[0];
        const filename = `backup_${timestamp}.backup`;
        const filePath = path.join(BACKUP_DIR, filename);
        
        const pgDumpPath = findPgBinary('pg_dump.exe');
        
        // Environment variables for pg_dump (specifically PGPASSWORD)
        const env = { ...process.env, PGPASSWORD: DB_PASSWORD };
        
        const command = `${pgDumpPath} -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -F c -b -v -f "${filePath}" ${DB_NAME}`;
        
        console.log(`🚀 Starting backup: ${filename}`);
        
        exec(command, { env }, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ Backup failed: ${error.message}`);
                return reject(error);
            }
            
            console.log(`✅ Backup successful: ${filePath}`);
            
            // Cleanup old backups
            cleanupOldBackups(10);
            
            resolve({ filename, filePath });
        });
    });
};

/**
 * Restores the latest database backup
 */
const restoreLatestBackup = () => {
    return new Promise((resolve, reject) => {
        ensureBackupDir();
        
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('backup_') && f.endsWith('.backup'))
            .sort()
            .reverse();
            
        if (files.length === 0) {
            return reject(new Error('No backup files found'));
        }
        
        const latestBackup = path.join(BACKUP_DIR, files[0]);
        const pgRestorePath = findPgBinary('pg_restore.exe');
        
        const env = { ...process.env, PGPASSWORD: DB_PASSWORD };
        
        // -c: clean (drop database objects before recreating)
        // -d: database name
        // -v: verbose
        const command = `${pgRestorePath} -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c -v "${latestBackup}"`;
        
        console.log(`🚀 Starting restore from: ${files[0]}`);
        
        exec(command, { env }, (error, stdout, stderr) => {
            // pg_restore often exits with code 1 due to minor errors (like "role already exists") 
            // even if the data was restored. We check the error but also consider stdout/stderr.
            if (error && error.code !== 1) { 
                console.error(`❌ Restore failed: ${error.message}`);
                return reject(error);
            }
            
            console.log(`✅ Restore complete from: ${files[0]}`);
            resolve({ filename: files[0] });
        });
    });
};

/**
 * Deletes old backups, keeping only the most recent N
 */
const cleanupOldBackups = (keepCount) => {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('backup_') && f.endsWith('.backup'))
            .sort()
            .reverse();
            
        if (files.length > keepCount) {
            const filesToDelete = files.slice(keepCount);
            filesToDelete.forEach(file => {
                fs.unlinkSync(path.join(BACKUP_DIR, file));
                console.log(`🗑️ Deleted old backup: ${file}`);
            });
        }
    } catch (err) {
        console.error('❌ Failed to cleanup old backups:', err);
    }
};

module.exports = {
    createBackup,
    restoreLatestBackup
};
