const { app, BrowserWindow, Menu, ipcMain, globalShortcut, utilityProcess } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    show: false, // Start hidden to prevent flicker while maximizing
    title: "Danger Systeam Pro",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, '../frontend/public/image.png')
  });

  mainWindow.maximize(); // Force full screen (maximized)
  mainWindow.show();     // Show only after maximizing

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  let isQuitting = false;
  mainWindow.on('close', async (e) => {
    if (isQuitting) return;
    
    e.preventDefault();
    const { dialog } = require('electron');
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Yes', 'No', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      title: 'Backup Data',
      message: 'Do you want to backup your data before exiting?'
    });

    if (response === 2) return; // Cancel

    if (response === 0) { // Yes
      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Backup',
        defaultPath: `danger_systeam_backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.sql`,
        filters: [{ name: 'SQL Files', extensions: ['sql'] }]
      });

      if (filePath) {
        let pgDump = 'pg_dump';
        try {
          require('child_process').execSync('pg_dump --version', { stdio: 'ignore' });
        } catch {
          const basePath = 'C:\\Program Files\\PostgreSQL';
          if (fs.existsSync(basePath)) {
            const versions = fs.readdirSync(basePath).filter(d => !isNaN(d)).sort((a, b) => b - a);
            for (const v of versions) {
              const p = path.join(basePath, v, 'bin', 'pg_dump.exe');
              if (fs.existsSync(p)) {
                pgDump = `"${p}"`;
                break;
              }
            }
          }
        }

        const command = `${pgDump} -U postgres -h 127.0.0.1 -p 5432 -F p -f "${filePath}" danger_systeam`;
        try {
          require('child_process').execSync(command, {
            env: { ...process.env, PGPASSWORD: '6099' }
          });
          dialog.showMessageBoxSync(mainWindow, {
            type: 'info',
            title: 'Backup Successful',
            message: `Backup saved successfully to:\n${filePath}`
          });
        } catch (err) {
          dialog.showMessageBoxSync(mainWindow, {
            type: 'error',
            title: 'Backup Failed',
            message: `Failed to create backup.\n${err.message}`
          });
        }
      }
    }

    isQuitting = true;
    app.quit();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  // 1. Database Setup (Awaited for safety, but fast if already set up)
  await checkAndSetupDatabase();

  // 2. Start Backend
  startBackend();

  // 3. Launch UI (Wait a moment for backend to initialize)
  setTimeout(() => {
    createWindow();
  }, 2000);

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
