@echo off
REM ==============================================================================
REM TRACES TOAD FOR ORACLE - INICIALIZADOR & AUTO-UPDATE WINDOWS
REM ==============================================================================
title TRACES Toad for Oracle - Database Server
cd /d "%~dp0"

echo ==================================================================
echo   TRACES TOAD FOR ORACLE - INICIANDO SISTEMA
echo ==================================================================

REM 1. Atualizar via Git se repositorio .git existir
if exist ".git" (
    echo [INFO] Verificando atualizacoes no GitHub...
    git pull origin main --quiet 2>nul
)

REM 2. Se nao tiver pasta .git, atualizar via API do GitHub
if not exist ".git" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { $commit = (Invoke-RestMethod 'https://api.github.com/repos/pedrofranchim35-netizen/traces-tool/commits/main' -Headers @{'User-Agent'='Traces'}).sha; $cur = ''; if (Test-Path .version) { $cur = (Get-Content .version -Raw).Trim() }; if ($cur -ne $commit) { echo '[INFO] Baixando versao mais recente do GitHub...'; Invoke-WebRequest 'https://codeload.github.com/pedrofranchim35-netizen/traces-tool/zip/refs/heads/main' -OutFile 'update.zip' -UseBasicParsing; Expand-Archive 'update.zip' -DestinationPath 'upd_temp' -Force; Copy-Item 'upd_temp\traces-tool-main\*' . -Recurse -Force; Remove-Item 'update.zip','upd_temp' -Recurse -Force; Set-Content .version $commit; echo '[OK] Atualizado com sucesso!'; } } catch {}"
)

REM 3. Encerrar processo antigo rodando na porta 3033
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3033 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul

REM 4. Verificar python e oracledb
python -c "import oracledb" 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Instalando driver python-oracledb...
    python -m pip install oracledb --quiet 2>nul || pip install oracledb
)

REM 5. Abrir navegador sem cache
echo [INFO] Abrindo Toad no navegador...
set TIMESTAMP=%date:~6,4%%date:~3,2%%date:~0,2%%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
start "" "http://localhost:3033/index.html?t=%TIMESTAMP%"

echo [INFO] Servidor ativo em: http://localhost:3033/index.html
echo ==================================================================
python bridge\oracle_server.py
pause
