#!/bin/sh
# ============================================================
# Entrypoint do container — cria o banco SQLite no primeiro boot
# ============================================================
set -e

DB_PATH="${DATABASE_URL#file:}"
DB_DIR="$(dirname "$DB_PATH")"

mkdir -p "$DB_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "» Banco de dados não encontrado — criando schema em $DB_PATH ..."
  sqlite3 "$DB_PATH" < /app/prisma/bootstrap.sql
  echo "» Schema criado com sucesso."
fi

exec "$@"
