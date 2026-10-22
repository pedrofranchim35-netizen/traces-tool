# ==============================================================================
# TRACES TOAD FOR ORACLE - FAST LAUNCHER & INSTALLER
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Port = 3033

$InstallRoot = Join-Path $env:LOCALAPPDATA "TracesToad"
$AppDir = $InstallRoot

$CurrentDir = (Get-Location).Path
if (Test-Path (Join-Path $CurrentDir "index.html")) {
    $AppDir = $CurrentDir
} else {
    $ParentDir = Split-Path -Parent $CurrentDir -ErrorAction SilentlyContinue
    if ($ParentDir -and (Test-Path (Join-Path $ParentDir "index.html"))) {
        $AppDir = $ParentDir
    } elseif (Test-Path (Join-Path $InstallRoot "index.html")) {
        $AppDir = $InstallRoot
    } elseif (Test-Path (Join-Path $InstallRoot "app\index.html")) {
        $AppDir = Join-Path $InstallRoot "app"
    }
}

# 1. Localizar Python rapidamente
$PyExe = $null
$CommonPaths = @(
    (Join-Path $AppDir "python\python.exe"),
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
        break
    }
}

if (-not $PyExe) {
    try {
        $TestOutput = & python -c "print('OK')" 2>$null
        if ($TestOutput -eq "OK") { $PyExe = "python" }
    } catch {}
}

if (-not $PyExe) {
    Write-Host "[INFO] Instalando Python 3.11 automaticamente..." -ForegroundColor Yellow
    $PyInstallerUrl = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"
    $PyTempFile = Join-Path $env:TEMP "python-installer.exe"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $PyInstallerUrl -OutFile $PyTempFile -UseBasicParsing
    Start-Process -FilePath $PyTempFile -ArgumentList "/passive InstallAllUsers=0 InstallLauncherAllUsers=0 Include_launcher=0 PrependPath=1 Include_pip=1 Shortcuts=0" -Wait
    Remove-Item $PyTempFile -Force -ErrorAction SilentlyContinue
    $PyExe = "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
}

# 2. Verificar se o servidor ja esta respondendo HTTP 200
$ServerOnline = $false
try {
    $ping = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/ping" -TimeoutSec 1 -ErrorAction Stop
    if ($ping.status -eq "online") { $ServerOnline = $true }
} catch {}

if (-not $ServerOnline) {
    $ServerScript = Join-Path $AppDir "bridge\oracle_server.py"
    $LogOut = Join-Path $env:TEMP "traces_toad_out.log"
    $LogErr = Join-Path $env:TEMP "traces_toad_err.log"
    Start-Process -FilePath $PyExe -ArgumentList "`"$ServerScript`"" -WorkingDirectory $AppDir -WindowStyle Hidden -RedirectStandardOutput $LogOut -RedirectStandardError $LogErr

    for ($i = 0; $i -lt 25; $i++) {
        Start-Sleep -Milliseconds 200
        try {
            $ping = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/ping" -TimeoutSec 1 -ErrorAction Stop
            if ($ping.status -eq "online") { break }
        } catch {}
    }
}

$AppUrl = "http://localhost:$Port/index.html"
$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$EdgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

if (Test-Path $ChromePath) {
    Start-Process -FilePath $ChromePath -ArgumentList "--app=$AppUrl"
} elseif (Test-Path $EdgePath) {
    Start-Process -FilePath $EdgePath -ArgumentList "--app=$AppUrl"
} else {
    Start-Process $AppUrl
}
