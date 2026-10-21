const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');
const net = require('net');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');

// Chromium switches: garante que requisições locais (127.0.0.1) nunca sofram bloqueio de PNA ou CORS
app.commandLine.appendSwitch('disable-features', 'BlockInsecurePrivateNetworkRequests');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('allow-file-access-from-files');

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

    // Parar processo Python ativo para liberar recursos do sistema
    if (pythonProcess) {
      try {
        pythonProcess.kill();
        pythonProcess = null;
      } catch (e) {}
    }

    const sourceFolder = path.join(extractDir, `${REPO_NAME}-${BRANCH}`);
    const appDir = getAppDirectory();

    function copyFolderSync(from, to) {
      if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
      const entries = fs.readdirSync(from, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'dist-win' || entry.name === 'python' || entry.name.endsWith('.exe')) continue;
        const srcPath = path.join(from, entry.name);
        const destPath = path.join(to, entry.name);
        if (entry.isDirectory()) {
          copyFolderSync(srcPath, destPath);
        } else {
          try {
            fs.copyFileSync(srcPath, destPath);
          } catch (e) {
            // Ignora arquivos bloqueados em execução (ex: DLLs ou binários ativos)
          }
        }
      }
    }

    copyFolderSync(sourceFolder, appDir);
    setLocalVersion(check.fullSha || check.latestVersion);

    // Garantir dependências no Python embutido após atualização
    const embeddedPy = path.join(appDir, 'python', 'python.exe');
    const vendorDir = path.join(appDir, 'bridge', 'vendor');
    if (fs.existsSync(embeddedPy)) {
      if (event) event.sender.send('update-progress', { stage: 'deps', text: 'Verificando dependências Python (sshtunnel, oracledb)...' });
      try {
        const { execSync } = require('child_process');
        execSync(`"${embeddedPy}" -c "import sys; sys.path.insert(0, r'${vendorDir}'); import sshtunnel, paramiko, oracledb"`, { stdio: 'ignore', timeout: 5000 });
      } catch (e) {
        try {
          const { execSync } = require('child_process');
          execSync(`"${embeddedPy}" -m pip install oracledb sshtunnel paramiko bcrypt --quiet --no-warn-script-location`, { stdio: 'ignore', timeout: 30000 });
        } catch (e2) {}
      }
    }

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

function killPortOccupant(port) {
  try {
    const { execSync } = require('child_process');
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = out.split('\n');
      for (const line of lines) {
        if (line.includes('LISTENING') || line.includes('LIST') || line.includes(`:${port}`)) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== `${process.pid}`) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
              console.log(`[TRACES] Processo anterior liberado na porta ${port} (PID: ${pid})`);
            } catch (e) {}
          }
        }
      }
    }
  } catch (e) {}
}

function startOracleBridgeProcess() {
  const appDir = getAppDirectory();
  const pyScript = path.join(appDir, 'bridge', 'oracle_server.py');
  if (!fs.existsSync(pyScript)) {
    console.log('[TRACES] Script oracle_server.py não encontrado em:', pyScript);
    return false;
  }

  // Libera a porta 3033 de processos zumbis anteriores
  killPortOccupant(PORT);

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

// Aguarda o servidor na porta 3033 responder (até 15s)
function waitForPort(port, maxTries = 150) {
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
  const editTemplate = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
        { role: 'toggleDevTools', accelerator: 'CmdOrCtrl+Shift+I' }
      ]
    }
  ];
  try {
    Menu.setApplicationMenu(Menu.buildFromTemplate(editTemplate));
  } catch (e) {
    Menu.setApplicationMenu(null);
  }

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
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(appDir, 'preload.js'),
      webSecurity: false
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // Tentar iniciar o bridge Oracle
  startOracleBridgeProcess();

  // Aguardar porta 3033 ficar ativa (até 15 segundos)
  const isPortUp = await waitForPort(PORT, 150);

  if (isPortUp) {
    // Carregar via HTTP local (todas as rotas /api/ e banco real funcionam nativamente)
    mainWindow.loadURL(`http://127.0.0.1:${PORT}/index.html`);
  } else {
    // Fallback de contingência: carregar arquivo local diretamente
    mainWindow.loadFile(path.join(appDir, 'index.html'));

    // Continua tentando conectar na porta em background; assim que o bridge responder, carrega a URL HTTP
    const pollTimer = setInterval(async () => {
      const up = await waitForPort(PORT, 2);
      if (up && mainWindow) {
        clearInterval(pollTimer);
        console.log('[TRACES] Servidor Bridge pronto! Redirecionando para http://127.0.0.1:3033/index.html');
        mainWindow.loadURL(`http://127.0.0.1:${PORT}/index.html`);
      }
    }, 1000);
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
  killPortOccupant(PORT);
  if (pythonProcess) {
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        execSync(`taskkill /F /T /PID ${pythonProcess.pid}`, { stdio: 'ignore' });
      } else {
        pythonProcess.kill('SIGKILL');
      }
    } catch (e) {}
    pythonProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
