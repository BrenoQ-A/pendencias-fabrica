-- CreateTable
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

-- CreateTable
CREATE TABLE "Foto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pendenciaId" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "thumbUrl" TEXT NOT NULL,
    "nome" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Foto_pendenciaId_fkey" FOREIGN KEY ("pendenciaId") REFERENCES "Pendencia" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HistoricoItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pendenciaId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "comentario" TEXT,
    "autor" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HistoricoItem_pendenciaId_fkey" FOREIGN KEY ("pendenciaId") REFERENCES "Pendencia" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Pendencia_numero_key" ON "Pendencia"("numero");

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "login" TEXT NOT NULL,
    "nome" TEXT,
    "papel" TEXT NOT NULL DEFAULT 'SUPERVISOR',
    "senhaHash" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_login_key" ON "Usuario"("login");

-- CreateTable
CREATE TABLE "Contador" (
    "chave" TEXT NOT NULL PRIMARY KEY,
    "valor" INTEGER NOT NULL
);

