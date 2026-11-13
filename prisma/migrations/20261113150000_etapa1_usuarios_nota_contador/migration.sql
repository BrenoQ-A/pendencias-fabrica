-- Etapa 1: usuários com papel, separação da nota e contador da numeração.
-- Aplicar no banco de produção (Turso) APÓS o backup:
--   ./scripts/backup-turso.sh <nome-do-banco>
--   bun scripts/aplicar_schema_turso.ts prisma/migrations/20261113150000_etapa1_usuarios_nota_contador/migration.sql
-- A migration é aditiva (cria tabelas, acrescenta colunas) — não altera nem apaga dados.
-- OBS.: o índice único de "Pendencia"."numero" já existe no banco (criado no bootstrap).

-- 1) Usuários com perfil (ADMIN edita · SUPERVISOR só vê)
CREATE TABLE IF NOT EXISTS "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "login" TEXT NOT NULL,
    "nome" TEXT,
    "papel" TEXT NOT NULL DEFAULT 'SUPERVISOR',
    "senhaHash" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_login_key" ON "Usuario"("login");

-- 2) Nota, ordem e local de instalação em campos separados (importação SAP)
ALTER TABLE "Pendencia" ADD COLUMN "ordem" TEXT;
ALTER TABLE "Pendencia" ADD COLUMN "localInstalacao" TEXT;
ALTER TABLE "Pendencia" ADD COLUMN "notaOriginal" TEXT;

-- 3) Contador atômico da numeração (troca o "maior número + 1")
CREATE TABLE IF NOT EXISTS "Contador" (
    "chave" TEXT NOT NULL PRIMARY KEY,
    "valor" INTEGER NOT NULL
);

-- Inicializa o contador com o maior número já usado (não sobrescreve se já existir)
INSERT INTO "Contador" ("chave", "valor")
SELECT 'Pendencia', COALESCE(MAX("numero"), 0)
FROM "Pendencia"
WHERE NOT EXISTS (SELECT 1 FROM "Contador" WHERE "chave" = 'Pendencia');
