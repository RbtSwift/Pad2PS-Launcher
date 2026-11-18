const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

let pythonServer = null;
let mainWindow = null;

function waitForServer(port, retries = 40) {
  return new Promise((resolve, reject) => {
    const check = (left) => {
      http.get(`http://127.0.0.1:${port}/index.html`, (res) => {
        res.resume();
        resolve();
      }).on('error', () => {
        if (left <= 0) return reject(new Error('Servidor não respondeu'));
        setTimeout(() => check(left - 1), 150);
      });
    };
    check(retries);
  });
}

function startBackend() {
  const pyBin = path.join(__dirname, '.venv', 'bin', 'python');
  const script = path.join(__dirname, 'pad2ps_launcher.py');
  const port = 45890 + Math.floor(Math.random() * 1000);

  pythonServer = spawn(pyBin, [script, '--headless', String(port)], {
    cwd: __dirname,
    stdio: 'inherit',
  });

  return port;
}

async function createWindow() {
  const port = startBackend();
  await waitForServer(port);

  mainWindow = new BrowserWindow({
    title: 'Pad2PS Launcher',
    fullscreen: true,
    autoHideMenuBar: true,
    frame: false,
    backgroundColor: '#0B0B0F',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (pythonServer) {
    pythonServer.kill();
  }
  app.quit();
});
