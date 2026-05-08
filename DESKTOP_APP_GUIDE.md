# 🖥️ Creating a Desktop Application with Node.js, React, and PostgreSQL

This guide provides a comprehensive walkthrough for building a standalone Windows Desktop Application (`.exe`) that includes a React frontend, a Node.js backend, and an automated PostgreSQL database setup.

---

## 🏗️ 1. Project Architecture

To create a professional desktop app, we use **Electron** as the shell. This allows us to bundle our web technologies into a single executable.

```text
/my-desktop-app
├── /client             # React Frontend (Vite/CRA)
├── /server             # Node.js Backend (Express/Sequelize)
├── main.js             # Electron Main Process (Starts Server + Window)
├── preload.js          # Electron Bridge
├── setup_database.ps1  # Auto-installer for PostgreSQL
├── package.json        # Project Configuration & Build Scripts
└── .env                # Environment Variables
```

---

## ⚙️ 2. Core Components

### A. Electron Main Process (`main.js`)
The `main.js` file is the heart of your app. It does three critical things:
1.  **DB Check**: Checks if PostgreSQL is installed; if not, it runs the setup script.
2.  **Backend Fork**: Starts your Node.js server as a background process.
3.  **Window Management**: Opens a native window and loads your React frontend.

> [!IMPORTANT]
> Use `utilityProcess.fork` (Electron 22+) to run your backend. This ensures the server dies when the app is closed.

### B. Database Auto-Setup (`setup_database.ps1`)
This PowerShell script handles the "Silent Installation" of PostgreSQL.
- **Download**: Fetches the PostgreSQL installer from EDB.
- **Silent Install**: Runs the installer with `--mode unattended` flags.
- **Configuration**: Sets the default password (e.g., `6099`) so your backend can connect immediately.

---

## 🚀 3. Step-by-Step Implementation

### Step 1: Initialize Electron
Install the necessary dependencies in your root directory:
```bash
npm install electron electron-builder concurrently cross-env wait-on
```

### Step 2: Configure `package.json`
Your `package.json` needs specific instructions for `electron-builder` to bundle the server and frontend correctly.

```json
"build": {
  "appId": "com.yourdomain.app",
  "productName": "My Awesome App",
  "files": [
    "main.js",
    "setup_database.ps1",
    "server/**/*",
    "client/dist/**/*",
    "node_modules/**/*"
  ],
  "asar": true,
  "asarUnpack": [
    "setup_database.ps1"
  ],
  "win": {
    "target": "nsis"
  }
}
```

### Step 3: Integrate Backend & Frontend
In `main.js`, load the frontend:
- **Dev**: `mainWindow.loadURL('http://localhost:5173')`
- **Prod**: `mainWindow.loadFile(path.join(__dirname, 'client/dist/index.html'))`

---

## 📦 4. Packaging the App (Creating the EXE)

Once your code is ready, you can generate the installer with one command:

```bash
# 1. Build React Frontend
cd client && npm run build

# 2. Package into EXE
cd .. && electron-builder --win
```

Your installer will be generated in the `/dist` or `/dist-electron` folder.

---

## 🐘 5. Handling PostgreSQL

### Silent Installation Commands
In your PowerShell script, use these flags to install PG without user interaction:
```powershell
Start-Process -FilePath $INSTALLER_PATH -ArgumentList "--mode unattended --superpassword 6099 --unattendedmodeui none" -Wait
```

### Connection Strategy
Always use a fixed port and password in your production `.env` to ensure the app works out-of-the-box on client PCs.

---

## 💡 Pro Tips for Other Projects
1.  **Port Management**: Use a unique port (e.g., `5005`) to avoid conflicts with other apps.
2.  **Logging**: Implement file-based logging (`app-error.log`) to debug issues on client machines.
3.  **ASAR Unpacking**: Files that need to be executed by the OS (like `.ps1` scripts) **must** be added to `asarUnpack`.
4.  **Admin Rights**: The installer needs `PrivilegesRequired=admin` to install PostgreSQL services.

---

> [!TIP]
> You can reuse the `setup_database.ps1` and `main.js` from this project by simply updating the `productName` and `appId` in `package.json`.
