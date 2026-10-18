@echo off
REM ==============================================================================
REM TRACES TOAD FOR ORACLE - INICIALIZADOR WINDOWS
REM ==============================================================================
title Traces Toad for Oracle - Database Server
cd /d "%~dp0"

echo ==================================================================
echo   TRACES TOAD FOR ORACLE - INICIANDO SISTEMA
echo ==================================================================

python -c "import oracledb" 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Instalando driver python-oracledb...
    python -m pip install oracledb --quiet 2>nul || pip install oracledb
)

echo [INFO] Abrindo Toad no navegador...
start http://localhost:3033/index.html

echo [INFO] Servidor ativo em: http://localhost:3033/index.html
echo ==================================================================
python bridge\oracle_server.py
pause
