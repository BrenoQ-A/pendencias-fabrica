// Número novo de pendência sem risco de colisão.
//
// UPDATE ... RETURNING é atômico no SQLite/libSQL: se dois pedidos chegarem
// juntos, cada um recebe um valor diferente. Substitui o padrão
// "pega o maior número e soma 1" (que dava número igual em registros
// simultâneos). O índice único em Pendencia.numero segue como travinha
// final: se algo escapar, o banco recusa em vez de duplicar.

import { db } from '@/lib/db'

export async function proximoNumero(): Promise<number> {
  try {
    const linhas = await db.$queryRaw<Array<{ valor: number }>>`
      UPDATE "Contador"
      SET "valor" = "valor" + 1
      WHERE "chave" = 'Pendencia'
      RETURNING "valor"
    `
    const valor = linhas[0]?.valor
    if (typeof valor === 'number') return valor
    console.warn('proximoNumero: linha do Contador não veio, usando maior número + 1')
  } catch (e) {
    // Tabela Contador ainda não existe (migration pendente) → comportamento antigo
    console.warn('proximoNumero: Contador indisponível, usando maior número + 1', e instanceof Error ? e.message : e)
  }
  const maior = await db.pendencia.aggregate({ _max: { numero: true } })
  return (maior._max.numero ?? 0) + 1
}
