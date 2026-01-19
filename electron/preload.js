const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onDeepLink: (callback) => ipcRenderer.on('deep-link', (_event, value) => callback(value)),
});
