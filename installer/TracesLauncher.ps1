# ==============================================================================
# TRACES TOAD FOR ORACLE - AUTO-UPDATING LAUNCHER & INSTALLER
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

# 5. Verificar Python e Instalar Driver Oficial (via python -m pip)
Write-Host "[2/3] Verificando ambiente Python e driver Oracle..." -ForegroundColor Cyan

$HasPython = $null -ne (Get-Command "python" -ErrorAction SilentlyContinue)
if (-not $HasPython) {
    Write-Host "[ERRO] Python não encontrado. Instale o Python em https://python.org" -ForegroundColor Red
    Pause
    exit 1
}

python -c "import oracledb" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "      Instalando driver oficial python-oracledb..." -ForegroundColor Yellow
    python -m pip install oracledb --quiet 2>$null
    if ($LASTEXITCODE -ne 0) {
        python -m ensurepip --default-pip 2>$null
        python -m pip install oracledb
    }
}

# 6. Iniciar Servidor e Abrir Navegador
Write-Host "[3/3] Iniciando Traces Toad for Oracle na porta $Port..." -ForegroundColor Green
$ServerScript = Join-Path $AppDir "bridge\oracle_server.py"

Start-Process -FilePath "python" -ArgumentList "`"$ServerScript`"" -WorkingDirectory $AppDir -WindowStyle Hidden
Start-Sleep -Seconds 1

$AppUrl = "http://localhost:$Port/index.html"
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  SISTEMA PRONTO! Abrindo Toad for Oracle em: $AppUrl" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Green

# Abrir janela limpa com Edge, Chrome ou navegador padrão
$EdgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"

if (Test-Path $EdgePath) {
    Start-Process -FilePath $EdgePath -ArgumentList "--app=$AppUrl"
} elseif (Test-Path $ChromePath) {
    Start-Process -FilePath $ChromePath -ArgumentList "--app=$AppUrl"
} else {
    Start-Process $AppUrl
}
