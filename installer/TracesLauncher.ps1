# ==============================================================================
# TRACES TOAD FOR ORACLE - AUTO-UPDATING LAUNCHER & INSTALLER
# Funciona COM ou SEM Git instalado na máquina do usuário!
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

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$LocalParent = Split-Path -Parent $ScriptDir

# Determinar diretório do aplicativo
if (Test-Path (Join-Path $LocalParent "index.html")) {
    $AppDir = $LocalParent
} else {
    $InstallRoot = Join-Path $env:LOCALAPPDATA "TracesToad"
    $AppDir = Join-Path $InstallRoot "app"
    if (-not (Test-Path $AppDir)) {
        New-Item -ItemType Directory -Path $AppDir -Force | Out-Null
    }
}

# 2. Verificação de Atualizações no GitHub (Funciona sem Git instalado!)
Write-Host "[1/3] Verificando atualizações no GitHub ($RepoOwner/$RepoName)..." -ForegroundColor Cyan

$VersionFile = Join-Path $AppDir ".version"
$LocalVersion = ""
if (Test-Path $VersionFile) {
    $LocalVersion = (Get-Content $VersionFile -Raw).Trim()
}

$HasGit = $null -ne (Get-Command "git" -ErrorAction SilentlyContinue)

try {
    # Consultar último commit no GitHub
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $CommitUrl = "https://api.github.com/repos/$RepoOwner/$RepoName/commits/$Branch"
    $Headers = @{ "User-Agent" = "TracesLauncher" }
    $CommitInfo = Invoke-RestMethod -Uri $CommitUrl -Headers $Headers -TimeoutSec 5 -ErrorAction Stop
    $RemoteVersion = $CommitInfo.sha

    if ($LocalVersion -ne $RemoteVersion) {
        Write-Host "      [NOVA ATUALIZAÇÃO DETECTADA!] Baixando do Git..." -ForegroundColor Yellow

        if ($HasGit -and (Test-Path (Join-Path $AppDir ".git"))) {
            Push-Location $AppDir
            git pull origin $Branch --quiet
            Pop-Location
        } else {
            # Download automático do ZIP do GitHub (Sem precisar de git.exe!)
            $ZipUrl = "https://github.com/$RepoOwner/$RepoName/archive/refs/heads/$Branch.zip"
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

        # Gravar nova versão local
        Set-Content -Path $VersionFile -Value $RemoteVersion -Force
        Write-Host "      ✔ Aplicativo atualizado com sucesso para a versão mais recente!" -ForegroundColor Green
    } else {
        Write-Host "      ✔ O aplicativo já está na versão mais recente." -ForegroundColor Green
    }
} catch {
    Write-Host "      [INFO] Iniciando com a versão local existente." -ForegroundColor DarkYellow
}

# 3. Criar Atalho na Área de Trabalho com Ícone TRACES
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $ShortcutPath = Join-Path $DesktopPath "TRACES Toad for Oracle.lnk"
    
    if (-not (Test-Path $ShortcutPath)) {
        $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
        $LauncherBat = Join-Path $ScriptDir "TracesLauncher.bat"
        if (-not (Test-Path $LauncherBat)) {
            $LauncherBat = Join-Path $AppDir "start.bat"
        }
        $Shortcut.TargetPath = $LauncherBat
        $IconPath = Join-Path $AppDir "assets\traces.ico"
        if (Test-Path $IconPath) { $Shortcut.IconLocation = $IconPath }
        $Shortcut.Description = "Toad for Oracle - Traces Edition"
        $Shortcut.Save()
    }
} catch {}

# 4. Verificar Python e Instalar Driver Oficial (via python -m pip)
Write-Host "[2/3] Verificando ambiente Python e driver Oracle..." -ForegroundColor Cyan

$HasPython = $null -ne (Get-Command "python" -ErrorAction SilentlyContinue)
if (-not $HasPython) {
    Write-Host "[ERRO] Python não encontrado. Instale o Python em https://python.org" -ForegroundColor Red
    Pause
    exit 1
}

# Verificar se oracledb já está instalado
python -c "import oracledb" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "      Instalando driver oficial python-oracledb..." -ForegroundColor Yellow
    python -m pip install oracledb --quiet 2>$null
    if ($LASTEXITCODE -ne 0) {
        python -m ensurepip --default-pip 2>$null
        python -m pip install oracledb
    }
}

# 5. Iniciar Servidor e Abrir Navegador
Write-Host "[3/3] Iniciando Traces Toad for Oracle na porta $Port..." -ForegroundColor Green
$ServerScript = Join-Path $AppDir "bridge\oracle_server.py"

Start-Process -FilePath "python" -ArgumentList "`"$ServerScript`"" -WindowStyle Hidden
Start-Sleep -Seconds 1

$AppUrl = "http://localhost:$Port/index.html"
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  PRONTO! Abrindo Toad for Oracle em: $AppUrl" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Green

# Abrir janela limpa com Edge ou Chrome
$EdgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"

if (Test-Path $EdgePath) {
    Start-Process -FilePath $EdgePath -ArgumentList "--app=$AppUrl"
} elseif (Test-Path $ChromePath) {
    Start-Process -FilePath $ChromePath -ArgumentList "--app=$AppUrl"
} else {
    Start-Process $AppUrl
}
