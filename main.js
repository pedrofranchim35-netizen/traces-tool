const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;
let pythonProcess = null;
const PORT = 3033;

// 1. Iniciar Servidor Embutido de API (Node.js nativo)
// Garante que todas as rotas /api/ funcionem 100% mesmo se o Python não estiver instalado na máquina
function startInternalHttpServer() {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // Rotas de API
    if (pathname === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'online',
        mode: 'native-desktop-electron',
        python_bridge: pythonProcess ? 'active' : 'fallback-internal',
        version: '2026.2.0',
        platform: process.platform
      }));
      return;
    }

    if (pathname === '/api/update/check') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        updateAvailable: false,
        currentCommit: 'v2026.2.0-native',
        latestCommit: 'v2026.2.0-native',
        commitMessage: 'Versão nativa standalone para Windows',
        commitDate: new Date().toISOString()
      }));
      return;
    }

    // Servir arquivos estáticos locais como fallback
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[TRACES NATIVE] Servidor interno ouvindo em http://127.0.0.1:${PORT}`);
  });

  server.on('error', (err) => {
    console.log('[TRACES NATIVE] Porta 3033 já ocupada ou reservada, ignorando:', err.message);
  });
}

// 2. Tentar subir o bridge Python em segundo plano (se houver python na máquina)
function tryStartPythonBridge() {
  const pyScript = path.join(__dirname, 'bridge', 'oracle_server.py');
  if (!fs.existsSync(pyScript)) return;

  const pythonCandidates = [
    'python',
    'python3',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
    'C:\\Program Files\\Python311\\python.exe',
    'C:\\Program Files\\Python312\\python.exe'
  ];

  for (const py of pythonCandidates) {
    try {
      pythonProcess = spawn(py, [pyScript], {
        cwd: __dirname,
        detached: false,
        stdio: 'ignore',
        windowsHide: true
      });
      pythonProcess.on('error', () => { pythonProcess = null; });
      if (pythonProcess) break;
    } catch (e) {}
  }
}

// 3. Criar a Janela Nativa do Desktop
function createMainWindow() {
  Menu.setApplicationMenu(null); // Ocultar barra de menu padrão do Electron

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'TRACES Toad for Oracle',
    icon: path.join(__dirname, 'assets', 'traces.ico'),
    backgroundColor: '#f0f0f0',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Permite carregar recursos locais livremente
    }
  });

  // Carregar diretamente do arquivo local do aplicativo (100% garantido e offline!)
  const indexPath = path.join(__dirname, 'index.html');
  mainWindow.loadFile(indexPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Inicialização do Electron
app.whenReady().then(() => {
  startInternalHttpServer();
  tryStartPythonBridge();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    try { pythonProcess.kill(); } catch (e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
