# ==============================================================================
# TRACES TOAD FOR ORACLE - SCRIPT DE ATUALIZAÇÃO RÁPIDA (ONE-LINER)
# ==============================================================================
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  TRACES TOAD FOR ORACLE - ATUALIZADOR AUTOMATICO" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Fechar processo antigo na porta 3033
Write-Host "[1/4] Encerrando versao antiga na porta 3033..." -ForegroundColor Gray
try {
    $Old = Get-NetTCPConnection -LocalPort 3033 -ErrorAction SilentlyContinue
    if ($Old) {
        foreach ($c in $Old) {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Milliseconds 600
    }
} catch {}

# 2. Localizar pasta do aplicativo
$TargetDir = $PWD.Path
if (-not (Test-Path (Join-Path $TargetDir "index.html"))) {
    $InstallRoot = Join-Path $env:LOCALAPPDATA "TracesToad\app"
    if (Test-Path $InstallRoot) {
        $TargetDir = $InstallRoot
    } else {
        $DesktopFolder = Join-Path ([Environment]::GetFolderPath("Desktop")) "traces-oracle"
        if (Test-Path $DesktopFolder) {
            $TargetDir = $DesktopFolder
        }
    }
}

Write-Host "[2/4] Atualizando arquivos em: $TargetDir" -ForegroundColor Cyan

# 3. Baixar arquivos mais recentes do GitHub
$ZipUrl = "https://codeload.github.com/pedrofranchim35-netizen/traces-tool/zip/refs/heads/main"
$TempZip = Join-Path $env:TEMP "traces-upd.zip"
$TempExtract = Join-Path $env:TEMP "traces-upd-dir"

Invoke-WebRequest -Uri $ZipUrl -OutFile $TempZip -UseBasicParsing
if (Test-Path $TempExtract) { Remove-Item -Path $TempExtract -Recurse -Force }
Expand-Archive -Path $TempZip -DestinationPath $TempExtract -Force

$Extracted = Join-Path $TempExtract "traces-tool-main"
Copy-Item -Path "$Extracted\*" -Destination $TargetDir -Recurse -Force
Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
Remove-Item -Path $TempExtract -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "[3/4] Arquivos atualizados com sucesso!" -ForegroundColor Green

# 4. Iniciar novo servidor
Write-Host "[4/4] Iniciando novo servidor e abrindo Toad..." -ForegroundColor Green
$PyExe = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $PyExe) {
    $PyExe = "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
}

$ServerScript = Join-Path $TargetDir "bridge\oracle_server.py"
Start-Process -FilePath $PyExe -ArgumentList "`"$ServerScript`"" -WorkingDirectory $TargetDir -WindowStyle Hidden
Start-Sleep -Seconds 2

$CacheBust = Get-Date -Format "yyyyMMddHHmmss"
$AppUrl = "http://localhost:3033/index.html?v=$CacheBust"
Start-Process $AppUrl

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  ✔ ATUALIZAÇÃO CONCLUÍDA! NOVA VERSÃO ABERTA NO NAVEGADOR" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
