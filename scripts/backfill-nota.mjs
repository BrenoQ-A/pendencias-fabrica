// Divide o texto único do campo "nota" em nota / ordem / local de instalação,
// preservando o texto original em "notaOriginal" (nada se perde).
//
// MODO TESTE (não grava nada, mostra o que faria):
//   bun scripts/backfill-nota.mjs
// MODO GRAVAÇÃO (só depois de conferir a amostra do modo teste):
//   bun scripts/backfill-nota.mjs --aplicar
//
// A regra abaixo considera o formato "NOTA / ORDEM - LOCAL DE INSTALAÇÃO".
// Rode primeiro no modo teste com dados reais: linhas sem barra ficam como
// estão e as fora do padrão aparecem na lista "para revisar à mão". É
// idempotente — só toca em linhas ainda sem notaOriginal.
import { createClient } from '@libsql/client'

const aplicar = process.argv.includes('--aplicar')
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('✗ TURSO_DATABASE_URL / TURSO_AUTH_TOKEN não definidos no .env')
  process.exit(1)
}
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })

// "123456 / 7890123456"           → nota=123456, ordem=7890123456, local=null
// "123456 / 7890123456 - Poste X" → nota=123456, ordem=7890123456, local="Poste X"
// "123456" (sem barra)            → fica como está
const PADRAO =
  /^\s*(?<nota>[A-Za-z0-9]+)\s*\/\s*(?<ordem>\d+)\s*(?:[-–—]\s*(?<local>.*?))?\s*$/

const { rows } = await db.execute(
  `SELECT "id", "nota" FROM "Pendencia"
    WHERE "nota" IS NOT NULL AND TRIM("nota") <> '' AND "notaOriginal" IS NULL`,
)

const parecidas = []
const naoCasadas = []
let semMudanca = 0

for (const linha of rows) {
  const bruto = String(linha.nota)
  const m = PADRAO.exec(bruto)

  if (!m) {
    if (!bruto.includes('/')) {
      semMudanca++ // sem barra: já é só nota, nada a separar
    } else {
      naoCasadas.push({ id: linha.id, texto: bruto })
    }
    continue
  }

  parecidas.push({
    id: linha.id,
    nota: m.groups.nota,
    ordem: m.groups.ordem ?? null,
    local: (m.groups.local ?? '').trim() || null,
    original: bruto,
  })
}

console.log(`Linhas lidas:            ${rows.length}`)
console.log(`Para separar:            ${parecidas.length}`)
console.log(`Sem barra (inalteradas): ${semMudanca}`)
console.log(`Para revisar à mão:      ${naoCasadas.length}`)

if (parecidas.length > 0) {
  console.log('\nAmostra das 10 primeiras:')
  for (const p of parecidas.slice(0, 10)) {
    console.log(
      `  id=${p.id}  "${p.original}"  →  nota=${p.nota} | ordem=${p.ordem ?? '-'} | local=${p.local ?? '-'}`,
    )
  }
}
if (naoCasadas.length > 0) {
  console.log('\nNão casaram com o padrão (revisar o texto ou ajustar PADRAO):')
  for (const n of naoCasadas.slice(0, 20)) {
    console.log(`  id=${n.id}  "${n.texto}"`)
  }
}

if (!aplicar) {
  console.log('\nMODO TESTE — nada foi gravado. Confira a amostra e rode com --aplicar.')
  process.exit(0)
}

const comandos = parecidas.map((p) => ({
  sql: `UPDATE "Pendencia"
        SET "nota" = ?, "ordem" = ?, "localInstalacao" = ?, "notaOriginal" = ?
        WHERE "id" = ?`,
  args: [p.nota, p.ordem, p.local, p.original, p.id],
}))

// Em blocos de 100, cada bloco numa transação: ou grava tudo, ou nada
let gravadas = 0
for (let i = 0; i < comandos.length; i += 100) {
  const bloco = comandos.slice(i, i + 100)
  await db.batch(bloco, 'write')
  gravadas += bloco.length
}
console.log(`\nOK: ${gravadas} linha(s) separadas. O texto original ficou em notaOriginal.`)
