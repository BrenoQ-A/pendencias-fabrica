#!/bin/sh
# ============================================================
# Backup do banco Turso (produção) antes de mudar o esquema.
# Complementa o scripts/backup.sh (que copia o banco do container
# docker): este aqui copia o banco remoto do Turso.
#
# Uso:        ./scripts/backup-turso.sh <nome-do-banco>
# Exemplo:    ./scripts/backup-turso.sh pendencias-prod
# Requer:     CLI do Turso instalado e logado (turso auth login)
# ============================================================
set -e

BANCO="${1:?Informe o nome do banco: ./scripts/backup-turso.sh <nome-do-banco>}"
DEST="${2:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"

cd "$(dirname "$0")/.."
mkdir -p "$DEST"

ARQUIVO="$DEST/turso-$BANCO-$STAMP.sql"
echo "Copiando $BANCO do Turso..."
turso db shell "$BANCO" .dump > "$ARQUIVO"

gzip "$ARQUIVO"
echo "✔ Backup criado: $ARQUIVO.gz"
echo "Conferência rápida antes de mexer no esquema:"
echo "  zcat $ARQUIVO.gz | head -5"
