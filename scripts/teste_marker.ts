// Insere/remove registro-marcador direto no Turso para validar o caminho do app.
// Uso: bun scripts/teste_marker.ts [inserir|verificar|remover]
import { createClient } from '@libsql/client'

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const acao = process.argv[2] ?? 'inserir'
const ID = 'teste-marker-turso-001'

async function main() {
  if (acao === 'inserir') {
    await db.execute({
      sql: `INSERT INTO Pendencia (id, numero, titulo, local, responsavel, prioridade, status, dataRegistro, origem, createdAt, updatedAt)
            VALUES (?, 9999, 'TESTE-MARKER-TURSO', 'Teste', 'Teste', 'Baixo', 'Pendente', CURRENT_TIMESTAMP, 'App', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [ID],
    })
    console.log('✓ marcador inserido no Turso')
  } else if (acao === 'verificar') {
    const r = await db.execute('SELECT COUNT(*) AS n FROM Pendencia')
    const m = await db.execute({ sql: 'SELECT id FROM Pendencia WHERE id = ?', args: [ID] })
    console.log(`Pendencia: ${r.rows[0].n} | marcador presente: ${m.rows.length > 0}`)
  } else if (acao === 'remover') {
    await db.execute({ sql: 'DELETE FROM Pendencia WHERE id = ?', args: [ID] })
    const r = await db.execute('SELECT COUNT(*) AS n FROM Pendencia')
    console.log(`✓ marcador removido | Pendencia: ${r.rows[0].n}`)
  }
}

main().catch((e) => {
  console.error('✗ Erro:', e instanceof Error ? e.message : e)
  process.exit(1)
})
