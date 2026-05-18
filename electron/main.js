const { app, BrowserWindow, Menu, ipcMain, globalShortcut, utilityProcess, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { createBackup, restoreLatestBackup } = require('./backup');

const isDev = !app.isPackaged;
let mainWindow;
let backendChild;

/**
 * Run the PostgreSQL setup script if needed
 */
function checkAndSetupDatabase() {
  return new Promise((resolve) => {
    const scriptPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'setup_database.ps1')
      : path.join(__dirname, '../setup_database.ps1');

    console.log(`🔍 Checking database setup: ${scriptPath}`);

    if (!fs.existsSync(scriptPath)) {
      console.warn("⚠️ Setup script not found, skipping...");
      return resolve();
    }

    const command = `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`;
    exec(command, (error, stdout, stderr) => {
      if (error) console.error(`❌ DB Setup Error: ${error.message}`);
      console.log(`✅ DB Setup Output: ${stdout}`);
      resolve();
    });
  });
}

/**
 * Start the Backend Server
 */
function startBackend() {
  const backendEntry = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'server.js')
    : path.join(__dirname, '../backend/server.js');

  // Setup Logging immediately
  const logPath = path.join(app.getPath('userData'), 'backend.log');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });
  logStream.write(`\n\n--- App Start: ${new Date().toISOString()} ---\n`);
  logStream.write(`🚀 Backend Entry: ${backendEntry}\n`);

  if (!fs.existsSync(backendEntry)) {
    const errorMsg = `❌ Backend entry point not found at: ${backendEntry}\n`;
    console.error(errorMsg);
    logStream.write(errorMsg);
    return;
  }

  try {
    // Use utilityProcess for a robust background process
    backendChild = utilityProcess.fork(backendEntry, [], {
      stdio: 'pipe',
      env: { 
        ...process.env, 
        NODE_ENV: app.isPackaged ? 'production' : 'development',
        PORT: '5080',
        DB_USER: 'postgres',
        DB_PASSWORD: '6099',
        DB_NAME: 'danger_systeam',
        DB_HOST: '127.0.0.1',
        DB_PORT: '5432'
      }
    });

    backendChild.stdout.on('data', (data) => logStream.write(`[STDOUT] ${data}`));
    backendChild.stderr.on('data', (data) => logStream.write(`[STDERR] ${data}`));

    backendChild.on('spawn', () => {
      console.log('✅ Backend process spawned');
      logStream.write('✅ Backend process spawned successfully\n');
    });

    backendChild.on('exit', (code) => {
      const msg = `⚠️ Backend exited with code: ${code}\n`;
      console.log(msg);
      logStream.write(msg);
    });

    backendChild.on('error', (err) => {
      const msg = `❌ Backend fork error: ${err.message}\n`;
      console.error(msg);
      logStream.write(msg);
    });

  } catch (err) {
    const msg = `❌ Failed to fork backend: ${err.message}\n`;
    console.error(msg);
    logStream.write(msg);
  }
}

// IPC Handlers for Backup & Restore
ipcMain.handle('backup-db', async () => {
  try {
    const result = await createBackup();
    return { success: true, message: `Backup created: ${result.filename}` };
  } catch (error) {
    console.error('IPC Backup Error:', error);
    return { success: false, message: `Backup failed: ${error.message}` };
  }
});

ipcMain.handle('restore-db', async () => {
  try {
    const result = await restoreLatestBackup();
    
    // Relaunch the app after 1 second
    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 1000);

    return { success: true, message: `Restore successful from ${result.filename}. Restarting...` };
  } catch (error) {
    console.error('IPC Restore Error:', error);
    return { success: false, message: `Restore failed: ${error.message}` };
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    show: false, // Hidden until maximized to prevent flicker
    title: "Danger Systeam Pro",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, '../frontend/public/image.png')
  });

  // Maximize immediately
  mainWindow.maximize();
  mainWindow.show();

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('ready', async () => {
  // 1. Database Setup
  await checkAndSetupDatabase();

  // 2. Start Backend with a short delay to let PG service breathe
  console.log('⏳ Waiting for database service to stabilize...');
  setTimeout(() => {
    startBackend();
  }, 2000);

  // 3. Launch UI
  createWindow();

  // 4. Register Shortcuts
  const shortcuts = [
    { key: 'Alt+V', path: '/village' },
    { key: 'Alt+M', path: '/members' },
    { key: 'Alt+A', path: '/accounts' },
    { key: 'Alt+I', path: '/items' },
    { key: 'Alt+D', path: '/dangar-entry' }
  ];

  shortcuts.forEach(s => {
    globalShortcut.register(s.key, () => {
      if (mainWindow) mainWindow.webContents.send('navigate-to-path', s.path);
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendChild) backendChild.kill();
});
