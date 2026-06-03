const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cyberChessDesktop', {
  close: () => ipcRenderer.invoke('cyber-chess:close'),
});
