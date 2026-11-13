// Cria um usuário do app (ou reseta a senha / papel de um que já existe).
//
// Uso (lê TURSO_DATABASE_URL / TURSO_AUTH_TOKEN do .env automaticamente):
//   bun scripts/criar-usuario.mjs --login breno --senha 'S3nh4F0rte!' --nome 'Breno' --papel ADMIN
//   bun scripts/criar-usuario.mjs --login supervisora --senha 'OutraS3nh4!' --nome 'Nome' --papel SUPERVISOR
//   (com Node: node --env-file=.env scripts/criar-usuario.mjs ...)
//
// Papéis: ADMIN edita · SUPERVISOR só vê. Reexecutar com o mesmo login
// redefine a senha e o papel — é também a recuperação de acesso.
//
// O hash usa PBKDF2-SHA256 (Web Crypto) no mesmo formato de src/lib/auth.ts:
// "pbkdf2$<iterações>$<sal hex>$<chave hex>"
import { createClient } from '@libsql/client'
import { webcrypto as crypto } from 'node:crypto'

const ITERACOES = 600_000

async function criarHashSenha(senha) {
  const sal = crypto.getRandomValues(new Uint8Array(16))
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: ITERACOES },
    base,
    256,
  )
  const hex = (b) => Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
  return `pbkdf2$${ITERACOES}$${hex(sal)}$${hex(new Uint8Array(bits))}`
}

const args = process.argv.slice(2)
const pega = (nome) => {
  const i = args.indexOf(nome)
  return i === -1 ? undefined : args[i + 1]
}

const login = pega('--login')?.trim().toLowerCase()
const senha = pega('--senha')
const nome = pega('--nome') ?? null
const papel = (pega('--papel') ?? 'ADMIN').toUpperCase()

if (!login || !senha) {
  console.error('Uso: bun scripts/criar-usuario.mjs --login <login> --senha <senha> [--nome <nome>] [--papel ADMIN|SUPERVISOR]')
  process.exit(1)
}
if (!['ADMIN', 'SUPERVISOR'].includes(papel)) {
  console.error('Papel inválido: use ADMIN ou SUPERVISOR.')
  process.exit(1)
}
if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error('✗ TURSO_DATABASE_URL / TURSO_AUTH_TOKEN não definidos no .env')
  process.exit(1)
}

const senhaHash = await criarHashSenha(senha)
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN })

// ON CONFLICT: reexecutar com o mesmo login redefine senha e papel
await db.execute({
  sql: `INSERT INTO "Usuario" ("id", "login", "nome", "papel", "senhaHash", "criadoEm")
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT ("login") DO UPDATE
        SET "senhaHash" = excluded."senhaHash",
            "papel"     = excluded."papel",
            "nome"      = excluded."nome"`,
  args: [crypto.randomUUID(), login, nome, papel, senhaHash],
})

console.log(`OK: ${login} criado/atualizado com papel ${papel}.`)
