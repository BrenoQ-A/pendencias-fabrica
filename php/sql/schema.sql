-- Pendências da Fábrica — schema da versão PHP (igual ao do app Next/Prisma)
-- Tabelas e colunas têm os mesmos nomes; hashes de senha do formato
-- "pbkdf2$<iterações>$<sal hex>$<chave hex>" funcionam nos dois apps.
-- Status canônico: "Pendente" | "Em andamento" | "Concluído"
-- "Atrasada" é derivado: dataLimite < hoje && status != "Concluído"

CREATE TABLE "Pendencia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalhe" TEXT,
    "local" TEXT NOT NULL,
    "solucao" TEXT,
    "acao" TEXT,
    "responsavel" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL DEFAULT 'Moderado',
    "status" TEXT NOT NULL DEFAULT 'Pendente',
    "dataRegistro" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataLimite" DATETIME,
    "resolvidoEm" DATETIME,
    "nota" TEXT,
    "ordem" TEXT,
    "localInstalacao" TEXT,
    "notaOriginal" TEXT,
    "registradoPor" TEXT,
    "origem" TEXT NOT NULL DEFAULT 'App',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Foto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pendenciaId" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "thumbUrl" TEXT NOT NULL,
    "nome" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Foto_pendenciaId_fkey" FOREIGN KEY ("pendenciaId") REFERENCES "Pendencia" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "HistoricoItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pendenciaId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "comentario" TEXT,
    "autor" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistoricoItem_pendenciaId_fkey" FOREIGN KEY ("pendenciaId") REFERENCES "Pendencia" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Pendencia_numero_key" ON "Pendencia"("numero");

CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "login" TEXT NOT NULL,
    "nome" TEXT,
    "papel" TEXT NOT NULL DEFAULT 'SUPERVISOR',
    "senhaHash" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Usuario_login_key" ON "Usuario"("login");

CREATE TABLE "Contador" (
    "chave" TEXT NOT NULL PRIMARY KEY,
    "valor" INTEGER NOT NULL
);

-- Numeração parte do maior número já usado (banco novo → 0)
INSERT INTO "Contador" ("chave", "valor")
SELECT 'Pendencia', COALESCE(MAX("numero"), 0) FROM "Pendencia"
WHERE NOT EXISTS (SELECT 1 FROM "Contador" WHERE "chave" = 'Pendencia');
