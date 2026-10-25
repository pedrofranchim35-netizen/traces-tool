@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   TRACES Toad for Oracle - Native Launcher Compiler
echo ========================================================

set CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe
if not exist "%CSC%" (
    set CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe
)

if not exist "%CSC%" (
    echo [ERRO] Compilador C# csc.exe nao foi encontrado no sistema.
    pause
    exit /b 1
)

set EXENAME=%1
if "%EXENAME%"=="" (
    set EXENAME=Toad.exe
)

echo Compilando src-native\Launcher.cs para %EXENAME%...
"%CSC%" /target:winexe /out:"%EXENAME%" src-native\Launcher.cs

if %ERRORLEVEL% EQU 0 (
    echo [SUCESSO] Executavel gerado: %EXENAME%
) else (
    echo [ERRO] Falha ao compilar executavel.
)

endlocal
