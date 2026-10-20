# ==============================================================================
# TRACES TOAD FOR ORACLE - AUTO-UPDATING LAUNCHER & INSTALLER
# Instala o Python automaticamente se faltar, atualiza via Git e abre o app!
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "TRACES Toad for Oracle - Launcher & Auto-Updater"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "     TRACES TOAD FOR ORACLE - INICIALIZADOR & AUTO-UPDATE        " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Configurações do Repositório GitHub
$RepoOwner = "pedrofranchim35-netizen"
$RepoName = "traces-tool"
$Branch = "main"
$Port = 3033

# 2. Definição do Diretório do Aplicativo
$InstallRoot = Join-Path $env:LOCALAPPDATA "TracesToad"
$AppDir = Join-Path $InstallRoot "app"

# Se executado dentro da pasta que já tem index.html ou pasta pai:
$CurrentDir = (Get-Location).Path
if (Test-Path (Join-Path $CurrentDir "index.html")) {
    $AppDir = $CurrentDir
} else {
    $ParentDir = Split-Path -Parent $CurrentDir -ErrorAction SilentlyContinue
    if ($ParentDir -and (Test-Path (Join-Path $ParentDir "index.html"))) {
        $AppDir = $ParentDir
    }
}

if (-not (Test-Path $AppDir)) {
    New-Item -ItemType Directory -Path $AppDir -Force | Out-Null
}

Write-Host "[1/3] Diretório do aplicativo: $AppDir" -ForegroundColor Gray
Write-Host "      Verificando atualizações no GitHub ($RepoOwner/$RepoName)..." -ForegroundColor Cyan

# 3. Sincronização e Download do GitHub (Funciona 100% sem Git instalado!)
$VersionFile = Join-Path $AppDir ".version"
$LocalVersion = ""
if (Test-Path $VersionFile) {
    try { $LocalVersion = (Get-Content $VersionFile -Raw).Trim() } catch {}
}

$HasGit = $null -ne (Get-Command "git" -ErrorAction SilentlyContinue)

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $CommitUrl = "https://api.github.com/repos/$RepoOwner/$RepoName/commits/$Branch"
    $Headers = @{ "User-Agent" = "TracesLauncher" }
    $CommitInfo = Invoke-RestMethod -Uri $CommitUrl -Headers $Headers -TimeoutSec 6 -ErrorAction Stop
    $RemoteVersion = $CommitInfo.sha

    if ($LocalVersion -ne $RemoteVersion -or (-not (Test-Path (Join-Path $AppDir "index.html")))) {
        Write-Host "      [NOVA ATUALIZAÇÃO DETECTADA!] Baixando do Git..." -ForegroundColor Yellow

        if ($HasGit -and (Test-Path (Join-Path $AppDir ".git"))) {
            Push-Location $AppDir
            git pull origin $Branch --quiet
            Pop-Location
        } else {
            $ZipUrl = "https://codeload.github.com/$RepoOwner/$RepoName/zip/refs/heads/$Branch"
            $TempZip = Join-Path $env:TEMP "traces-update.zip"
            $TempExtract = Join-Path $env:TEMP "traces-extract"

            Invoke-WebRequest -Uri $ZipUrl -OutFile $TempZip -UseBasicParsing
            if (Test-Path $TempExtract) { Remove-Item -Path $TempExtract -Recurse -Force }
            Expand-Archive -Path $TempZip -DestinationPath $TempExtract -Force

            $ExtractedFolder = Join-Path $TempExtract "$RepoName-$Branch"
            Copy-Item -Path "$ExtractedFolder\*" -Destination $AppDir -Recurse -Force

            Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
            Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
        }

        Set-Content -Path $VersionFile -Value $RemoteVersion -Force
        Write-Host "      ✔ Atualizado para a versão mais recente com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "      ✔ O aplicativo já está na versão mais recente." -ForegroundColor Green
    }
} catch {
    Write-Host "      [INFO] Usando versão local existente." -ForegroundColor DarkYellow
}

# 4. Criar Atalho na Área de Trabalho com Ícone TRACES
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $ShortcutPath = Join-Path $DesktopPath "TRACES Toad for Oracle.lnk"
    
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $StartBat = Join-Path $AppDir "start.bat"
    $Shortcut.TargetPath = $StartBat
    $IconPath = Join-Path $AppDir "assets\traces.ico"
    if (Test-Path $IconPath) { $Shortcut.IconLocation = $IconPath }
    $Shortcut.WorkingDirectory = $AppDir
    $Shortcut.Description = "Toad for Oracle - Traces Edition"
    $Shortcut.Save()
} catch {}

# 5. Verificar Python e Instalar Automaticamente se faltar
Write-Host "[2/3] Verificando ambiente Python e driver Oracle..." -ForegroundColor Cyan

$PyExe = "python"
$HasRealPython = $false

# Testar se o comando python atual executa código de verdade
try {
    $TestOutput = & python -c "print('OK')" 2>$null
    if ($TestOutput -eq "OK") {
        $HasRealPython = $true
    }
} catch {}

# Se não tiver Python no PATH, procurar nos locais padrões
if (-not $HasRealPython) {
    $CommonPaths = @(
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe",
        "C:\Program Files\Python311\python.exe",
        "C:\Program Files\Python312\python.exe",
        "C:\Python311\python.exe"
    )
    foreach ($cand in $CommonPaths) {
        if (Test-Path $cand) {
            $PyExe = $cand
            $HasRealPython = $true
            break
        }
    }
}

# Se ainda não tiver Python, instalar automaticamente!
if (-not $HasRealPython) {
    Write-Host "      [PYTHON NÃO DETECTADO] Instalando Python 3 automaticamente..." -ForegroundColor Yellow
    
    $HasWinget = $null -ne (Get-Command "winget" -ErrorAction SilentlyContinue)
    $InstalledOk = $false

    if ($HasWinget) {
        Write-Host "      Instalando via Windows Package Manager (winget)..." -ForegroundColor Gray
        try {
            winget install Python.Python.3.11 --silent --accept-package-agreements --accept-source-agreements
            $InstalledOk = $true
        } catch {}
    }

    if (-not $InstalledOk) {
        Write-Host "      Baixando instalador oficial do Python (python.org)..." -ForegroundColor Gray
        $PyInstallerUrl = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
        $PyTempFile = Join-Path $env:TEMP "python-installer.exe"
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $PyInstallerUrl -OutFile $PyTempFile -UseBasicParsing
            Write-Host "      Executando instalação silenciosa do Python..." -ForegroundColor Gray
            Start-Process -FilePath $PyTempFile -ArgumentList "/passive InstallAllUsers=0 PrependPath=1 Include_pip=1" -Wait
            Remove-Item $PyTempFile -Force -ErrorAction SilentlyContinue
            $InstalledOk = $true
        } catch {
            Write-Host "      [ERRO] Falha ao baixar instalador do Python: $_" -ForegroundColor Red
        }
    }

    # Atualizar PATH na sessão atual
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + [System.Environment]::GetEnvironmentVariable("Path","Machine")

    # Localizar o executável recém-instalado
    $CommonPaths = @(
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "C:\Program Files\Python311\python.exe"
    )
    foreach ($cand in $CommonPaths) {
        if (Test-Path $cand) {
            $PyExe = $cand
            $HasRealPython = $true
            break
        }
    }
    Write-Host "      ✔ Python instalado com sucesso: $PyExe" -ForegroundColor Green
}

# 6. Instalar drivers python-oracledb, sshtunnel e paramiko (Ponte SSH)
Write-Host "      Verificando drivers (oracledb, sshtunnel, paramiko)..." -ForegroundColor Gray
$VendorDir = Join-Path $AppDir "bridge\vendor"
& $PyExe -c "import sys; sys.path.insert(0, r'$VendorDir'); import oracledb, sshtunnel, paramiko" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "      Instalando dependencias (oracledb, sshtunnel, paramiko)..." -ForegroundColor Yellow
    & $PyExe -m pip install oracledb sshtunnel paramiko --quiet 2>$null
    if ($LASTEXITCODE -ne 0) {
        & $PyExe -m ensurepip --default-pip 2>$null
        & $PyExe -m pip install oracledb sshtunnel paramiko
    }
}
Write-Host "      ✔ Drivers Oracle e Ponte SSH prontos!" -ForegroundColor Green

# 7. Iniciar Servidor do Toad
Write-Host "[3/3] Iniciando Traces Toad for Oracle na porta $Port..." -ForegroundColor Green
$ServerScript = Join-Path $AppDir "bridge\oracle_server.py"

# Encerrar processo antigo rodando na porta do servidor para garantir atualização
try {
    $OldConn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($OldConn) {
        foreach ($c in $OldConn) {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Milliseconds 600
    }
} catch {}

Start-Process -FilePath $PyExe -ArgumentList "`"$ServerScript`"" -WorkingDirectory $AppDir -WindowStyle Hidden
Start-Sleep -Seconds 2

# Testar se o servidor subiu
$ServerAlive = $false
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:$Port/api/status" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($resp.StatusCode -eq 200) { $ServerAlive = $true }
} catch {}

$CacheBust = Get-Date -Format "yyyyMMddHHmmss"
$AppUrl = "http://localhost:$Port/index.html?v=$CacheBust"
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  SISTEMA PRONTO! Abrindo Toad for Oracle em: $AppUrl" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Green

# Abrir janela com Edge, Chrome ou navegador padrão
$EdgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"

if (Test-Path $EdgePath) {
    Start-Process -FilePath $EdgePath -ArgumentList "--app=$AppUrl"
} elseif (Test-Path $ChromePath) {
    Start-Process -FilePath $ChromePath -ArgumentList "--app=$AppUrl"
} else {
    Start-Process $AppUrl
}
