const { app, BrowserWindow, Menu, ipcMain, screen } = require('electron');
const { createReadStream, existsSync, statSync } = require('node:fs');
const { createServer } = require('node:http');
const { extname, join, resolve } = require('node:path');

const staticRoot = resolve(process.env.CYBER_CHESS_STATIC_ROOT || join(__dirname, 'app'));
const appIcon = join(__dirname, 'icon.ico');
const windowAspect = 1672 / 941;
const targetWindow = { width: 1672, height: 941 };

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ttf', 'font/ttf'],
  ['.mp3', 'audio/mpeg'],
  ['.mp4', 'video/mp4'],
  ['.wav', 'audio/wav'],
  ['.fbx', 'application/octet-stream'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

let server;

function staticFileForUrl(url) {
  const rawPath = decodeURIComponent((url || '/').split('?')[0]);
  const relativePath = rawPath === '/' ? 'index.html' : rawPath.replace(/^\/+/, '');
  const filePath = resolve(staticRoot, relativePath);
  return filePath.startsWith(staticRoot) ? filePath : null;
}

function createStaticServer() {
  return createServer((req, res) => {
    const filePath = staticFileForUrl(req.url);

    if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }

    res.writeHead(200, {
      'content-type': mimeTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream',
    });
    createReadStream(filePath).pipe(res);
  });
}

function listen(serverToStart) {
  return new Promise((resolveListen, rejectListen) => {
    serverToStart.once('error', rejectListen);
    serverToStart.listen(0, '127.0.0.1', () => {
      serverToStart.off('error', rejectListen);
      resolveListen(serverToStart.address().port);
    });
  });
}

async function createWindow() {
  server = createStaticServer();
  const port = await listen(server);
  const { width: workWidth, height: workHeight } = screen.getPrimaryDisplay().workAreaSize;
  const fitScale = Math.min(1, workWidth / targetWindow.width, workHeight / targetWindow.height);
  const width = Math.max(960, Math.floor(targetWindow.width * fitScale));
  const height = Math.round(width / windowAspect);

  const win = new BrowserWindow({
    width,
    height,
    minWidth: Math.min(960, width),
    minHeight: Math.min(Math.round(960 / windowAspect), height),
    backgroundColor: '#02050c',
    autoHideMenuBar: true,
    center: true,
    frame: false,
    fullscreenable: false,
    maximizable: false,
    title: 'Cyber Chess',
    icon: appIcon,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, 'preload.cjs'),
      sandbox: true,
    },
  });

  win.setAspectRatio(windowAspect);
  await win.loadURL(`http://127.0.0.1:${port}/`);
}

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

app.whenReady().then(() => {
  ipcMain.handle('cyber-chess:close', () => {
    BrowserWindow.getFocusedWindow()?.close();
  });
  ipcMain.handle('cyber-chess:minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });
  Menu.setApplicationMenu(null);
  return createWindow();
});

app.on('window-all-closed', () => {
  if (server) {
    server.close();
    server = undefined;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
