@echo off
title TRACES Toad for Oracle - Launcher
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0TracesLauncher.ps1"
if %errorlevel% neq 0 (
    echo [ERRO] Ocorreu um problema ao inicializar.
    pause
)
