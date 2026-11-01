const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('blueDesktop', {
  isElectron: true,
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  getWindowState: () => ipcRenderer.invoke('window:getState'),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('window:setAlwaysOnTop', flag),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  saveFile: (payload) => ipcRenderer.invoke('dialog:saveFile', payload),
  readStorage: () => ipcRenderer.invoke('storage:read'),
  writeStorage: (data) => ipcRenderer.invoke('storage:write', data),
  onMaximizedChanged: (callback) => {
    const handler = (_event, isMaximized) => callback(isMaximized);
    ipcRenderer.on('window:maximized-changed', handler);
    return () => ipcRenderer.removeListener('window:maximized-changed', handler);
  },
});
