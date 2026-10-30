// Seed: importa os 38 registros reais da planilha para o banco do app.
// Mapeamento de status: "Atrasada" -> "Pendente" (o app deriva "Atrasada" pela data limite).
import { readFileSync } from 'fs'
import { criarPrisma } from '../src/lib/db'

const db = criarPrisma()

interface Rec {
  [k: string]: string
}

function dt(s: string): Date | null {
  if (!s) return null
  const d = new Date(`${s.slice(0, 10)}T12:00:00.000Z`)
  return isNaN(d.getTime()) ? null : d
}

function mapearStatus(s: string): string {
  if (s === 'Concluído') return 'Concluído'
  if (s === 'Em andamento') return 'Em andamento'
  return 'Pendente' // "Atrasada" e vazios
}

async function main() {
  const raw = JSON.parse(readFileSync('scripts/seed_data.json', 'utf-8')) as Rec[]
  console.log(`Importando ${raw.length} registros...`)

  await db.historicoItem.deleteMany()
  await db.foto.deleteMany()
  await db.pendencia.deleteMany()

  let i = 0
  for (const r of raw) {
    const numero = parseInt(r['ID'] ?? '0', 10)
    if (!numero || !r['Problema encontrado']) continue
    const status = mapearStatus(r['Status'] ?? '')
    const dataRegistro = dt(r['Data'] ?? r['Hora de início'] ?? '')
    const dataLimite = dt(r['Data limite'] ?? '')
    const autor = r['Nome'] || 'Importado da planilha'
    await db.pendencia.create({
      data: {
        numero,
        titulo: r['Problema encontrado'],
        detalhe: r['Detalhamento (opcional)'] || null,
        local: r['Onde o problema foi identificado?'] || 'Não informado',
        solucao: r['Solução necessária'] || null,
        acao: r['Ação - Facilities'] || null,
        responsavel: r['Responsável - Execução'] || 'Manutenção',
        prioridade: r['Nível de prioridade'] || 'Moderado',
        status,
        dataRegistro: dataRegistro ?? new Date(),
        dataLimite,
        nota: r['Nota'] || null,
        registradoPor: autor,
        origem: 'Planilha',
        historico: {
          create: {
            status,
            comentario:
              status === 'Concluído'
                ? 'Importado da planilha — concluído antes da migração'
                : 'Importado da planilha',
            autor,
          },
        },
      },
    })
    i++
  }
  console.log(`✔ ${i} pendências importadas`)
  const st = await db.pendencia.groupBy({ by: ['status'], _count: true })
  console.log(st.map((s) => `${s.status}: ${s._count}`).join(' | '))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
