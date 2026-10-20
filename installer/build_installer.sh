#!/usr/bin/env bash
# ==============================================================================
# TRACES TOAD FOR ORACLE - BUILD EXECUTÁVEL E INSTALADOR (.EXE)
# Compila:
#  1. TracesToad.exe & Toad.exe (C Win32 nativo via MinGW)
#  2. TracesToad-Setup.exe (Instalador & Atualizador via NSIS)
# ==============================================================================
set -e
cd "$(dirname "$0")/.."

echo "=================================================================="
echo "  COMPILANDO EXECUTÁVEIS (.EXE) E INSTALADOR / ATUALIZADOR"
echo "=================================================================="

# 1. Compilar executável nativo C (TracesToad.exe)
echo "[1/2] Compilando TracesToad.exe e Toad.exe..."
cd src-native
/opt/homebrew/bin/x86_64-w64-mingw32-windres resource.rc -O coff -o resource.res
/opt/homebrew/bin/x86_64-w64-mingw32-gcc -O2 -mwindows launcher.c resource.res -o ../TracesToad.exe -lws2_32 -lshlwapi
cd ..
cp -f TracesToad.exe Toad.exe

# 2. Compilar instalador e atualizador NSIS (TracesToad-Setup.exe)
echo "[2/2] Compilando TracesToad-Setup.exe via NSIS..."
cd installer
/opt/homebrew/bin/makensis setup.nsi
cd ..

cp -f TracesToad-Setup.exe Setup-TracesToad.exe
cp -f TracesToad-Setup.exe /Users/pedrofranchim/Downloads/TracesToad-Setup.exe
cp -f TracesToad.exe /Users/pedrofranchim/Downloads/TracesToad.exe

echo "=================================================================="
echo "  ✔ SUCESSO! ARQUIVOS EXECUTÁVEIS GERADOS:"
echo "  - TracesToad.exe (Aplicativo nativo para Windows)"
echo "  - Toad.exe (Nome alternativo)"
echo "  - TracesToad-Setup.exe (Instalador completo e Atualizador)"
echo "  - Copiados para ~/Downloads/"
echo "=================================================================="
