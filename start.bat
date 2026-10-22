@echo off
REM ==============================================================================
REM TRACES TOAD FOR ORACLE - INICIALIZADOR RAPIDO WINDOWS
REM ==============================================================================
title TRACES Toad for Oracle - Database Server
cd /d "%~dp0"

REM 1. Configurar caminho do Python automaticamente
if exist "%~dp0python\python.exe" (
    set "PATH=%~dp0python;%~dp0python\Scripts;%PATH%"
)
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PATH=%LOCALAPPDATA%\Programs\Python\Python311;%LOCALAPPDATA%\Programs\Python\Python311\Scripts;%PATH%"
)
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PATH=%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts;%PATH%"
)
if exist "C:\Program Files\Python311\python.exe" (
    set "PATH=C:\Program Files\Python311;C:\Program Files\Python311\Scripts;%PATH%"
)

REM 2. Verificar se o servidor ja esta ativo e respondendo HTTP 200 (ultra-rapido via curl)
curl.exe -s -m 1 http://127.0.0.1:3033/api/ping | findstr /C:"online" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Servidor TRACES Toad ja esta ativo! Abrindo janela...
    goto :OPEN_UI
)

REM 3. Limpar processo travado na porta 3033 (se houver) via netstat (instantaneo)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3033 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM 4. Iniciar servidor Python em segundo plano
echo [INFO] Iniciando servidor TRACES Toad for Oracle...
start "" /B python bridge\oracle_server.py >"%TEMP%\traces_toad_server.log" 2>&1

REM 5. Aguardar servidor responder (ate 6 segundos)
for /L %%i in (1,1,20) do (
    curl.exe -s -m 1 http://127.0.0.1:3033/api/ping | findstr /C:"online" >nul 2>&1
    if not errorlevel 1 goto :OPEN_UI
    ping 127.0.0.1 -n 1 -w 250 >nul
)

:OPEN_UI
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:3033/index.html
    exit /b 0
)
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3033/index.html
    exit /b 0
)
if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3033/index.html
    exit /b 0
)
start "" "http://localhost:3033/index.html"
exit /b 0
