const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');

let mainWindow = null;
let pythonProcess = null;
const PORT = 3033;

const REPO_OWNER = 'pedrofranchim35-netizen';
const REPO_NAME = 'traces-tool';
const BRANCH = 'main';

// Determina o diretório real onde os arquivos do app estão instalados
function getAppDirectory() {
  if (app.isPackaged) {
    const resourcesApp = path.join(process.resourcesPath, 'app');
    if (fs.existsSync(resourcesApp)) {
      return resourcesApp;
    }
    return __dirname;
  }
  return __dirname;
}

// ------------------------------------------------------------------------------
// 1. AUTO-UPDATER DIRETO DO GITHUB
// ------------------------------------------------------------------------------

function getLocalVersion() {
  const appDir = getAppDirectory();
  const vFile = path.join(appDir, '.version');
  if (fs.existsSync(vFile)) {
    try {
      return fs.readFileSync(vFile, 'utf8').trim();
    } catch (e) {}
  }
  return '2026.2.0-initial';
}

function setLocalVersion(v) {
  const appDir = getAppDirectory();
  const vFile = path.join(appDir, '.version');
  try {
    fs.writeFileSync(vFile, v, 'utf8');
  } catch (e) {}
}

function checkGitHubUpdate() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}/commits/${BRANCH}`,
      headers: {
        'User-Agent': 'TRACES-Toad-AutoUpdater',
        'Accept': 'application/vnd.github.v3+json'
      },
      timeout: 8000
    };

    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const json = JSON.parse(data);
            const latestSha = json.sha ? json.sha.substring(0, 7) : '';
            const localVersion = getLocalVersion();
            const isDifferent = localVersion !== latestSha && localVersion !== json.sha;

            resolve({
              success: true,
              updateAvailable: isDifferent,
              currentVersion: localVersion,
              latestVersion: latestSha,
              fullSha: json.sha,
              commitMessage: json.commit && json.commit.message ? json.commit.message.split('\n')[0] : 'Atualização do sistema',
              commitDate: json.commit && json.commit.author ? json.commit.author.date : new Date().toISOString()
            });
          } else {
            resolve({ success: false, error: `GitHub retornou status ${res.statusCode}` });
          }
        } catch (err) {
          resolve({ success: false, error: err.message });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Timeout de conexão ao GitHub' });
    });
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    function get(u) {
      https.get(u, { headers: { 'User-Agent': 'TRACES-Toad-AutoUpdater' } }, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
          file.close();
          try { fs.unlinkSync(dest); } catch (e) {}
          const newFile = fs.createWriteStream(dest);
          https.get(response.headers.location, { headers: { 'User-Agent': 'TRACES-Toad-AutoUpdater' } }, (res2) => {
            res2.pipe(newFile);
            newFile.on('finish', () => {
              newFile.close(() => resolve(dest));
            });
          }).on('error', err => {
            fs.unlink(dest, () => reject(err));
          });
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(dest, () => reject(new Error(`Falha no download (HTTP ${response.statusCode})`)));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(dest));
        });
      }).on('error', (err) => {
        file.close();
        fs.unlink(dest, () => reject(err));
      });
    }

    get(url);
  });
}

async function applyGitHubUpdate(event) {
  try {
    const check = await checkGitHubUpdate();
    if (!check.success || !check.updateAvailable) {
      return { success: false, message: 'Nenhuma atualização disponível.' };
    }

    const tempDir = os.tmpdir();
    const zipPath = path.join(tempDir, `traces-update-${Date.now()}.zip`);
    const extractDir = path.join(tempDir, `traces-extract-${Date.now()}`);
    const zipUrl = `https://codeload.github.com/${REPO_OWNER}/${REPO_NAME}/zip/refs/heads/${BRANCH}`;

    if (event) event.sender.send('update-progress', { stage: 'downloading', text: 'Baixando atualização do GitHub...' });
    await downloadFile(zipUrl, zipPath);

    if (event) event.sender.send('update-progress', { stage: 'extracting', text: 'Extraindo arquivos atualizados...' });

    await new Promise((resolve, reject) => {
      let cmd = '';
      if (process.platform === 'win32') {
        cmd = `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`;
      } else {
        cmd = `mkdir -p "${extractDir}" && unzip -q -o "${zipPath}" -d "${extractDir}"`;
      }
      exec(cmd, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (event) event.sender.send('update-progress', { stage: 'copying', text: 'Aplicando arquivos ao aplicativo...' });

    const sourceFolder = path.join(extractDir, `${REPO_NAME}-${BRANCH}`);
    const appDir = getAppDirectory();

    function copyFolderSync(from, to) {
      if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
      const entries = fs.readdirSync(from, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'dist-win' || entry.name.endsWith('.exe')) continue;
        const srcPath = path.join(from, entry.name);
        const destPath = path.join(to, entry.name);
        if (entry.isDirectory()) {
          copyFolderSync(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }

    copyFolderSync(sourceFolder, appDir);
    setLocalVersion(check.fullSha || check.latestVersion);

    try {
      fs.unlinkSync(zipPath);
      fs.rmSync(extractDir, { recursive: true, force: true });
    } catch (e) {}

    if (event) event.sender.send('update-progress', { stage: 'ready', text: 'Atualização concluída! Reiniciando aplicativo...' });

    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 1500);

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ------------------------------------------------------------------------------
// 2. INICIALIZAR O BRIDGE ORACLE EM SEGUNDO PLANO
// ------------------------------------------------------------------------------

function startOracleBridgeProcess() {
  const appDir = getAppDirectory();
  const pyScript = path.join(appDir, 'bridge', 'oracle_server.py');
  if (!fs.existsSync(pyScript)) {
    console.log('[TRACES] Script oracle_server.py não encontrado em:', pyScript);
    return false;
  }

  // 1. Python Embutido no próprio app (zero instalação necessária!)
  const embeddedPy = path.join(appDir, 'python', 'python.exe');
  const pythonCandidates = [
    embeddedPy,
    'python',
    'python3',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
    'C:\\Program Files\\Python311\\python.exe',
    'C:\\Program Files\\Python312\\python.exe'
  ];

  for (const py of pythonCandidates) {
    if (py === embeddedPy && !fs.existsSync(embeddedPy)) continue;
    try {
      pythonProcess = spawn(py, [pyScript], {
        cwd: appDir,
        detached: false,
        stdio: 'ignore',
        windowsHide: true
      });
      pythonProcess.on('error', (err) => {
        console.log(`[TRACES] Falha ao iniciar bridge com ${py}:`, err.message);
        pythonProcess = null;
      });
      if (pythonProcess) {
        console.log(`[TRACES] Servidor Oracle Bridge iniciado via: ${py}`);
        return true;
      }
    } catch (e) {}
  }
  return false;
}

// Aguarda o servidor na porta 3033 responder
function waitForPort(port, maxTries = 35) {
  return new Promise((resolve) => {
    let tries = 0;
    const check = () => {
      const sock = net.createConnection({ port, host: '127.0.0.1' });
      sock.on('connect', () => {
        sock.destroy();
        resolve(true);
      });
      sock.on('error', () => {
        sock.destroy();
        tries++;
        if (tries < maxTries) {
          setTimeout(check, 100);
        } else {
          resolve(false);
        }
      });
    };
    check();
  });
}

// ------------------------------------------------------------------------------
// 3. JANELA PRINCIPAL NATIVA DO DESKTOP
// ------------------------------------------------------------------------------

async function createMainWindow() {
  Menu.setApplicationMenu(null);

  const appDir = getAppDirectory();
  const iconPath = path.join(appDir, 'assets', 'traces.ico');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'TRACES Toad for Oracle',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#f0f0f0',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(appDir, 'preload.js'),
      webSecurity: false
    }
  });

  // Tentar iniciar o bridge Oracle
  startOracleBridgeProcess();

  // Aguardar porta 3033 ficar ativa (até 3,5 segundos)
  const isPortUp = await waitForPort(PORT, 35);

  if (isPortUp) {
    // Carregar via HTTP local (todas as rotas /api/ e banco real funcionam nativamente)
    mainWindow.loadURL(`http://127.0.0.1:${PORT}/index.html`);
  } else {
    // Fallback: carregar arquivo local diretamente
    mainWindow.loadFile(path.join(appDir, 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Checagem silenciosa de atualização em segundo plano após 4s
  setTimeout(async () => {
    try {
      const check = await checkGitHubUpdate();
      if (check && check.updateAvailable && mainWindow) {
        mainWindow.webContents.send('update-available', check);
      }
    } catch (e) {}
  }, 4000);
}

// IPC Handlers
ipcMain.handle('check-update', async () => {
  return await checkGitHubUpdate();
});

ipcMain.handle('apply-update', async (event) => {
  return await applyGitHubUpdate(event);
});

ipcMain.handle('relaunch-app', () => {
  app.relaunch();
  app.exit(0);
});

// Ciclo de vida
app.whenReady().then(() => {
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
