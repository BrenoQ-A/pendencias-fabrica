// Aplica o schema SQL no banco Turso e verifica as tabelas criadas.
// Uso: bun scripts/aplicar_schema_turso.ts  (lê TURSO_* do .env automaticamente)
import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'

const url = process.env.TURSO_DATABASE_URL
const token = process.env.TURSO_AUTH_TOKEN
if (!url || !token) {
  console.error('✗ TURSO_DATABASE_URL / TURSO_AUTH_TOKEN não definidos no .env')
  process.exit(1)
}

const db = createClient({ url, authToken: token })

async function main() {
  // 1. Conexão
  const ping = await db.execute('SELECT 1 AS ok')
  console.log('✓ Conectado ao Turso — ping:', ping.rows[0].ok)

  // 2. Schema
  const sql = readFileSync('/tmp/schema_turso.sql', 'utf-8')
  await db.executeMultiple(sql)
  console.log('✓ Schema aplicado (executeMultiple)')

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
