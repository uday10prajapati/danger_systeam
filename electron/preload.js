const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  backupDB: () => ipcRenderer.invoke('backup-db'),
  restoreDB: () => ipcRenderer.invoke('restore-db'),
  onNavigate: (callback) => ipcRenderer.on('navigate-to-path', (event, path) => callback(path)),
});
