const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  globalShortcut,
} = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

const getStorePath = () => path.join(app.getPath('userData'), 'blue-ai-data.json');

function createWindow() {
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 880,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#FFFFFF',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', false);
  });

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Global desktop hotkey: Ctrl/Cmd + Shift + Space to summon/toggle blue.ai
  try {
    globalShortcut.register('CommandOrControl+Shift+Space', () => {
      if (!mainWindow) {
        createWindow();
        return;
      }
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.minimize();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch {
    // Ignore if shortcut is already claimed by OS
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Window IPC controls
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  }
  mainWindow.maximize();
  return true;
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:getState', () => {
  if (!mainWindow) {
    return { isMaximized: false, isAlwaysOnTop: false, platform: process.platform };
  }
  return {
    isMaximized: mainWindow.isMaximized(),
    isAlwaysOnTop: mainWindow.isAlwaysOnTop(),
    platform: process.platform,
  };
});

ipcMain.handle('window:setAlwaysOnTop', (_event, flag) => {
  if (!mainWindow) return false;
  mainWindow.setAlwaysOnTop(Boolean(flag));
  return mainWindow.isAlwaysOnTop();
});

ipcMain.handle('shell:openExternal', async (_event, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('dialog:saveFile', async (_event, { defaultName, content, filters }) => {
  if (!mainWindow) return { canceled: true };
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName || 'blue-ai-export.md',
    filters: filters || [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }
  fs.writeFileSync(result.filePath, content, 'utf-8');
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('storage:read', () => {
  try {
    const file = getStorePath();
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
});

ipcMain.handle('storage:write', (_event, data) => {
  try {
    const file = getStorePath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch {
    return false;
  }
});
