const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const isDev = !app.isPackaged;

let backendProcess;
let mainWindow;
let backendReady = false;

/**
 * Get the correct path to backend/server.js based on environment
 */
function getBackendPath() {
  if (isDev) {
    // Development: backend is adjacent to electron folder
    return path.join(__dirname, '../backend/server.js');
  } else {
    // Production: files are in resources/app after packaging
    return path.join(process.resourcesPath, 'app', 'backend', 'server.js');
  }
}

/**
 * Get the correct working directory for backend
 */
function getBackendCwd() {
  if (isDev) {
    return path.join(__dirname, '../backend');
  } else {
    return path.join(process.resourcesPath, 'app', 'backend');
  }
}

/**
 * Check if backend is running by making a health check request
 */
function checkBackendHealth() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5000/api/health', (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.setTimeout(1000, () => {
      req.abort();
      resolve(false);
    });
  });
}

/**
 * Wait for backend to be ready
 */
async function waitForBackend(maxAttempts = 30) {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const isHealthy = await checkBackendHealth();
    
    if (isHealthy) {
      console.log('✅ Backend is ready');
      backendReady = true;
      return true;
    }
    
    attempts++;
    console.log(`⏳ Waiting for backend... (${attempts}/${maxAttempts})`);
    
    // Wait 200ms before retry
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.error('❌ Backend failed to start after 6 seconds');
  return false;
}

/**
 * Start the backend Node.js server
 */
function startBackend() {
  return new Promise((resolve, reject) => {
    const serverPath = getBackendPath();
    const cwd = getBackendCwd();
    
    console.log(`🚀 Starting backend from: ${serverPath}`);
    console.log(`📂 Working directory: ${cwd}`);
    console.log(`✓ NODE_ENV: ${isDev ? 'development' : 'production'}`);
    
    let backendOutput = '';
    let backendStarted = false;

    backendProcess = spawn(process.execPath, [serverPath], {
      cwd: cwd,
      stdio: 'pipe',
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        NODE_ENV: isDev ? 'development' : 'production',
        PORT: 5000
      }
    });

    console.log(`✓ Backend process spawned with PID: ${backendProcess.pid}`);

    // Handle stdout
    if (backendProcess.stdout) {
      backendProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(`[Backend] ${output}`);
          backendOutput += output + '\n';
          
          // Check if server started
          if (!backendStarted && (output.includes('Server running') || output.includes('✅'))) {
            backendStarted = true;
            console.log('✅ Backend startup detected');
            resolve();
          }
        }
      });
    }

    // Handle stderr
    if (backendProcess.stderr) {
      backendProcess.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.error(`[Backend stderr] ${output}`);
          backendOutput += output + '\n';
        }
      });
    }

    // Handle errors
    backendProcess.on('error', (err) => {
      console.error('❌ Failed to spawn backend process:', err.message);
      console.error('Error code:', err.code);
      console.error('Error path:', err.path);
      reject(err);
    });

    // Handle process exit unexpectedly
    backendProcess.on('exit', (code, signal) => {
      console.log(`⚠️  Backend process exited (code: ${code}, signal: ${signal})`);
      backendReady = false;
      
      if (!backendStarted) {
        console.error('Backend exited before starting. Output:');
        console.error(backendOutput);
        reject(new Error(`Backend exited with code ${code}`));
      }
    });

    // Timeout if process doesn't respond
    setTimeout(() => {
      if (!backendStarted) {
        console.error('❌ Backend startup timeout (10s)');
        console.error('Partial output:', backendOutput);
        reject(new Error('Backend startup timeout'));
      }
    }, 10000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  // Load URL based on environment
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173'); // Vite dev server
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  // Open dev tools in development for debugging
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  try {
    // Start backend server
    console.log('🔄 App Ready - Starting backend...');
    await startBackend();

    // Verify backend is responding
    console.log('🔍 Verifying backend health...');
    const healthy = await waitForBackend();
    
    if (!healthy) {
      console.warn('⚠️  Backend health check failed, but continuing...');
    } else {
      console.log('✅ Backend is responding');
    }

    // Create the window
    console.log('📱 Creating main window...');
    createWindow();

  } catch (error) {
    console.error('❌ Error during startup:', error.message);
    console.error('Full error:', error);
    
    // Create window anyway so user can see error in DevTools
    console.log('📱 Creating main window despite error...');
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', (event) => {
  // Give backend time to shut down gracefully
  if (backendProcess) {
    console.log('🛑 Stopping backend server...');
    backendProcess.kill('SIGTERM');
    
    // Force kill after 3 seconds if still running
    const killTimeout = setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        console.log('⚠️  Force killing backend...');
        backendProcess.kill('SIGKILL');
      }
    }, 3000);
    
    backendProcess.on('exit', () => {
      clearTimeout(killTimeout);
    });
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', () => {
  return app.getAppPath();
});

// Create application menu
const menu = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Exit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          app.quit();
        },
      },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
    ],
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
    ],
  },
];

Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
