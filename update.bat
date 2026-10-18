@echo off
title Atualizando TRACES Toad for Oracle
cd /d "%~dp0"

echo ==================================================================
echo   ATUALIZANDO TRACES TOAD FOR ORACLE (GITHUB)
echo ==================================================================

REM 1. Fechar versao anterior na porta 3033
echo [1/3] Encerrando versao antiga na porta 3033...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3033 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul

REM 2. Baixar atualizacao do GitHub
echo [2/3] Baixando versao corrigida do GitHub...
if exist ".git" (
    git pull origin main
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest 'https://codeload.github.com/pedrofranchim35-netizen/traces-tool/zip/refs/heads/main' -OutFile 'traces-update.zip' -UseBasicParsing; Expand-Archive 'traces-update.zip' -DestinationPath '_upd_temp' -Force; Copy-Item '_upd_temp\traces-tool-main\*' . -Recurse -Force; Remove-Item 'traces-update.zip','_upd_temp' -Recurse -Force"
)

REM 3. Iniciar versao nova
echo [3/3] Iniciando aplicacao...
echo ==================================================================
call start.bat
