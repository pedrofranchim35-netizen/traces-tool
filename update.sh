#!/usr/bin/env bash
# ==============================================================================
# TRACES TOAD FOR ORACLE - SCRIPT DE ATUALIZAÇÃO (PULL DO GITHUB)
# ==============================================================================
cd "$(dirname "$0")"

echo "=================================================================="
echo "  ATUALIZANDO TRACES TOAD FOR ORACLE (GITHUB)"
echo "=================================================================="

# 1. Encerrar versão anterior na porta 3033
echo "[1/3] Encerrando processo na porta 3033..."
lsof -ti :3033 | xargs kill -9 2>/dev/null || true

# 2. Puxar atualização do GitHub
echo "[2/3] Baixando versão mais recente do GitHub..."
if [ -d ".git" ]; then
    git pull origin main
else
    curl -sL https://codeload.github.com/pedrofranchim35-netizen/traces-tool/zip/refs/heads/main -o traces-update.zip
    unzip -q -o traces-update.zip
    cp -rf traces-tool-main/* .
    rm -rf traces-update.zip traces-tool-main
fi

# 3. Iniciar versão nova
echo "[3/3] Iniciando versão atualizada..."
echo "=================================================================="
chmod +x start.sh 2>/dev/null || true
./start.sh
