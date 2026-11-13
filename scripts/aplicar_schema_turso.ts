// Aplica um arquivo SQL no banco Turso e verifica as tabelas.
// Uso: bun scripts/aplicar_schema_turso.ts <arquivo.sql>
// Sem argumento, usa /tmp/schema_turso.sql (comportamento antigo).
// Exemplo: bun scripts/aplicar_schema_turso.ts prisma/migrations/20261113150000_etapa1_usuarios_nota_contador/migration.sql
import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'

const url = process.env.TURSO_DATABASE_URL
const token = process.env.TURSO_AUTH_TOKEN
if (!url || !token) {
  console.error('✗ TURSO_DATABASE_URL / TURSO_AUTH_TOKEN não definidos no .env')
  process.exit(1)
}

const caminhoSql = process.argv[2] ?? '/tmp/schema_turso.sql'
const db = createClient({ url, authToken: token })

async function main() {
  // 1. Conexão
  const ping = await db.execute('SELECT 1 AS ok')
  console.log('✓ Conectado ao Turso — ping:', ping.rows[0].ok)

  // 2. Schema
  const sql = readFileSync(caminhoSql, 'utf-8')
  await db.executeMultiple(sql)
  console.log(`✓ SQL aplicado (${caminhoSql})`)

  // 3. Tabelas criadas
  const tabs = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'libsql_%' AND name NOT LIKE '_cf_%' ORDER BY name")
  console.log('✓ Tabelas:', tabs.rows.map((r) => r.name).join(', '))

  // 4. Contagem atual
  for (const t of ['Pendencia', 'Foto', 'HistoricoItem']) {
    const c = await db.execute(`SELECT COUNT(*) AS n FROM "${t}"`)
    console.log(`  ${t}: ${c.rows[0].n} registros`)
  }
}

main().catch((e) => {
  console.error('✗ Erro:', e instanceof Error ? e.message : e)
  process.exit(1)
})
