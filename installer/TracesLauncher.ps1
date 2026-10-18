# ==============================================================================
# TRACES TOAD FOR ORACLE - AUTO-UPDATING LAUNCHER & INSTALLER
# Empacota instalação, sincronização com Git e inicialização em um só processo.
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "TRACES Toad for Oracle - Launcher & Auto-Updater"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "     TRACES TOAD FOR ORACLE - INICIALIZADOR & AUTO-UPDATE        " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Carregar Configurações
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ConfigFile = Join-Path $ScriptDir "config.json"
$RepoUrl = "https://github.com/morluto/rea.git"
$Branch = "main"
$Port = 3033

if (Test-Path $ConfigFile) {
    try {
        $Config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
        if ($Config.gitRepoUrl) { $RepoUrl = $Config.gitRepoUrl }
        if ($Config.gitBranch) { $Branch = $Config.gitBranch }
        if ($Config.serverPort) { $Port = $Config.serverPort }
    } catch {
        Write-Host "[AVISO] Falha ao ler config.json, usando valores padrão." -ForegroundColor DarkYellow
    }
}

# 2. Diretório de Instalação e Execução
$LocalParent = Split-Path -Parent $ScriptDir
if (Test-Path (Join-Path $LocalParent "index.html")) {
    $AppDir = $LocalParent
    Write-Host "[1/4] Executando diretamente da pasta do aplicativo: $AppDir" -ForegroundColor Green
} else {
    $InstallRoot = Join-Path $env:LOCALAPPDATA "TracesToad"
    $AppDir = Join-Path $InstallRoot "app"
    if (-not (Test-Path $InstallRoot)) {
        New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
    }
    if (-not (Test-Path $AppDir)) {
        Write-Host "[1/4] Primeira execução detectada: Instalando aplicativo..." -ForegroundColor Green
        if ($HasGit) {
            Write-Host "      Clonando repositório Git ($RepoUrl)..." -ForegroundColor Gray
            git clone --branch $Branch $RepoUrl $AppDir
        }
    }
} else {
    Write-Host "[1/4] Verificando atualizações no Git..." -ForegroundColor Cyan
    if ($HasGit -and (Test-Path (Join-Path $AppDir ".git"))) {
        try {
            Push-Location $AppDir
            Write-Host "      Consultando novos commits em $RepoUrl..." -ForegroundColor Gray
            git fetch origin $Branch --quiet
            $LOCAL = git rev-parse HEAD
            $REMOTE = git rev-parse "origin/$Branch"

            if ($LOCAL -ne $REMOTE) {
                Write-Host "      [NOVA VERSÃO DETECTADA!] Atualizando aplicativo..." -ForegroundColor Yellow
                git pull origin $Branch --quiet
                Write-Host "      Aplicativo atualizado com sucesso para o commit mais recente!" -ForegroundColor Green
            } else {
                Write-Host "      O aplicativo já está na versão mais recente." -ForegroundColor Green
            }
            Pop-Location
        } catch {
            Write-Host "      [AVISO] Não foi possível verificar o Git no momento. Iniciando versão local." -ForegroundColor DarkYellow
        }
    } else {
        Write-Host "      Repositório pronto. Iniciando..." -ForegroundColor Gray
    }
}

# 4. Criar Atalhos na Área de Trabalho e Menu Iniciar
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $DesktopPath = [Environment]::GetFolderPath("Desktop")
    $ShortcutPath = Join-Path $DesktopPath "TRACES Toad for Oracle.lnk"
    
    if (-not (Test-Path $ShortcutPath)) {
        Write-Host "[2/4] Criando atalho na Área de Trabalho..." -ForegroundColor Cyan
        $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
        $Shortcut.TargetPath = (Join-Path $ScriptDir "TracesLauncher.bat")
        $IconPath = Join-Path $AppDir "assets\traces.ico"
        if (Test-Path $IconPath) { $Shortcut.IconLocation = $IconPath }
        $Shortcut.Description = "Toad for Oracle - Traces Edition"
        $Shortcut.Save()
    }
} catch {
    # Ignora erro de atalho
}

# 5. Verificar Python e Dependências
Write-Host "[3/4] Verificando ambiente Python e driver Oracle..." -ForegroundColor Cyan
$HasPython = $null -ne (Get-Command "python" -ErrorAction SilentlyContinue)

if (-not $HasPython) {
    Write-Host "[ERRO] Python 3 não encontrado. Por favor instale o Python em https://python.org" -ForegroundColor Red
    Pause
    exit 1
}

# Instalar python-oracledb silenciosamente se faltar
$HasOracleDb = python -c "import oracledb" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "      Instalando driver oficial python-oracledb..." -ForegroundColor Yellow
    python -m pip install oracledb --quiet 2>$null
    if ($LASTEXITCODE -ne 0) {
        python -m pip install oracledb
    }
}

# 6. Iniciar Servidor do Toad e Abrir Navegador
Write-Host "[4/4] Iniciando Traces Toad for Oracle na porta $Port..." -ForegroundColor Green
$ServerScript = Join-Path $AppDir "bridge\oracle_server.py"

# Iniciar servidor em segundo plano
Start-Process -FilePath "python" -ArgumentList "`"$ServerScript`"" -WindowStyle Hidden

Start-Sleep -Seconds 1

# Abrir janela da aplicação
$AppUrl = "http://localhost:$Port/index.html"
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  SISTEMA PRONTO! Abrindo Toad for Oracle em: $AppUrl" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Green

# Tentar abrir em modo App (janela limpa sem abas de navegador) com Edge ou Chrome
$EdgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"

if (Test-Path $EdgePath) {
    Start-Process -FilePath $EdgePath -ArgumentList "--app=$AppUrl"
} elseif (Test-Path $ChromePath) {
    Start-Process -FilePath $ChromePath -ArgumentList "--app=$AppUrl"
} else {
    Start-Process $AppUrl
}
