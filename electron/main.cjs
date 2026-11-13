/**
 * Processus principal Electron — Kroma Studio Desktop (Style CapCut).
 * Lance Kroma Studio dans une fenêtre native Windows indépendante,
 * sans barre d'adresse ni onglets de navigateur, avec accélération matérielle GPU.
 */
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;

function checkViteDevServer(url, timeoutMs = 1000) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = http.request(
        {
          hostname: u.hostname,
          port: u.port || 80,
          path: '/',
          method: 'HEAD',
          timeout: timeoutMs,
        },
        (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        },
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 920,
    minWidth: 1024,
    minHeight: 720,
    title: 'Kroma Studio — Éditeur Vidéo',
    backgroundColor: '#090a0f',
    autoHideMenuBar: true,
    show: false, // Afficher une fois le contenu prêt pour éviter le flash blanc
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Déterminer si le serveur Vite dev tourne sur le port 5173
  const devUrl = 'http://localhost:5173';
  const isViteRunning = await checkViteDevServer(devUrl);

  if (isViteRunning) {
    await mainWindow.loadURL(devUrl);
  } else {
    // Si Vite n'est pas lancé, charger directement le build de production local
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    await mainWindow.loadFile(indexPath);
  }

  // Ouvrir les éventuels liens web externes dans le navigateur par défaut de Windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
