const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cyberChessDesktop', {
  close: () => ipcRenderer.invoke('cyber-chess:close'),
  minimize: () => ipcRenderer.invoke('cyber-chess:minimize'),
});
