#!/bin/sh
# ============================================================
# Backup do banco de dados do app Pendências da Fábrica
# Faz cópia ONLINE (sem parar o app) usando a API de backup
# do SQLite, salva no host e mantém os 30 mais recentes.
#
# Uso:        ./scripts/backup.sh [diretório-destino]
# Exemplo:    ./scripts/backup.sh /var/backups/pendencias
# Agendar:    crontab -e  →  0 22 * * *  /caminho/do/projeto/scripts/backup.sh /var/backups/pendencias
# ============================================================
set -e

DEST="${1:-./backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"

cd "$(dirname "$0")/.."   # garante que roda da raiz do projeto (compose v2)

mkdir -p "$DEST"

# Backup online e consistente dentro do container
docker compose exec -T app sqlite3 /data/custom.db ".backup '/tmp/backup.db'"
docker compose cp app:/tmp/backup.db "$DEST/pendencias-$STAMP.db"
docker compose exec -T app rm -f /tmp/backup.db

# Retenção: mantém os 30 backups mais recentes
ls -1t "$DEST"/pendencias-*.db 2>/dev/null | tail -n +31 | xargs -r rm -f

echo "✔ Backup criado: $DEST/pendencias-$STAMP.db"
