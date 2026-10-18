#!/usr/bin/env bash
# ==============================================================================
# TRACES TOAD FOR ORACLE - SERVIÇO DE INICIALIZAÇÃO LOCAL / GATEWAY
# ==============================================================================
cd "$(dirname "$0")"

echo "=================================================================="
echo "  TRACES TOAD FOR ORACLE - INICIANDO SISTEMA"
echo "=================================================================="

# Verificar se Python 3 está instalado
if ! command -v python3 &> /dev/null; then
    echo "[ERRO] Python 3 não foi encontrado. Por favor instale o Python 3."
    exit 1
fi

# Instalar python-oracledb se necessário
if ! python3 -c "import oracledb" &> /dev/null; then
    echo "[INFO] Instalando driver oficial python-oracledb (Thin Mode nativo)..."
    pip3 install oracledb --user 2>/dev/null || python3 -m pip install oracledb 2>/dev/null || pip install oracledb
fi

echo "[INFO] Iniciando servidor Toad na porta 3033..."
echo "[INFO] Acesse no seu navegador em: http://localhost:3033/index.html"
echo "=================================================================="

python3 bridge/oracle_server.py
