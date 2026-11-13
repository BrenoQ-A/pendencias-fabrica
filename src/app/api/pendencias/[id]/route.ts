import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { exigirEditor } from '@/lib/autorizacao'

type Params = { params: Promise<{ id: string }> }

// GET /api/pendencias/[id] — detalhe com histórico (fotos sem o dataUrl pesado)
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const item = await db.pendencia.findUnique({
    where: { id },
    include: {
      fotos: { select: { id: true, thumbUrl: true, nome: true }, orderBy: { criadoEm: 'asc' } },
      historico: { orderBy: { criadoEm: 'desc' } },
    },
  })
  if (!item) return NextResponse.json({ erro: 'Pendência não encontrada.' }, { status: 404 })
  return NextResponse.json(item)
}

// PATCH /api/pendencias/[id] — edita campos (só ADMIN); fotos novas entram como { dataUrl, thumbUrl }
export async function PATCH(req: NextRequest, { params }: Params) {
  const bloqueio = await exigirEditor()
  if (bloqueio) return bloqueio
  try {
    const { id } = await params
    const body = await req.json()

    const atual = await db.pendencia.findUnique({ where: { id }, include: { fotos: true } })
    if (!atual) return NextResponse.json({ erro: 'Pendência não encontrada.' }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (body.titulo !== undefined) data.titulo = String(body.titulo).trim()
    if (body.detalhe !== undefined) data.detalhe = body.detalhe ? String(body.detalhe) : null
    if (body.local !== undefined) data.local = String(body.local).trim()
    if (body.solucao !== undefined) data.solucao = body.solucao ? String(body.solucao) : null
    if (body.acao !== undefined) data.acao = body.acao ? String(body.acao) : null
    if (body.responsavel !== undefined) data.responsavel = String(body.responsavel).trim()
    if (body.prioridade !== undefined) data.prioridade = String(body.prioridade)
    if (body.nota !== undefined) data.nota = body.nota ? String(body.nota).trim() : null
    if (body.ordem !== undefined) data.ordem = body.ordem ? String(body.ordem).trim() : null
    if (body.localInstalacao !== undefined)
      data.localInstalacao = body.localInstalacao ? String(body.localInstalacao).trim() : null
    if (body.registradoPor !== undefined) data.registradoPor = body.registradoPor ? String(body.registradoPor) : null
    if (body.dataRegistro !== undefined)
      data.dataRegistro = new Date(`${String(body.dataRegistro).slice(0, 10)}T12:00:00.000Z`)
    if (body.dataLimite !== undefined)
      data.dataLimite = body.dataLimite ? new Date(`${String(body.dataLimite).slice(0, 10)}T12:00:00.000Z`) : null

    // fotos: mantém as de IDs informados, remove o resto, cria as novas
    if (Array.isArray(body.manterFotoIds)) {
      const manter = body.manterFotoIds as string[]
      const remover = atual.fotos.filter((f) => !manter.includes(f.id)).map((f) => f.id)
      if (remover.length) await db.foto.deleteMany({ where: { id: { in: remover } } })
    }
    if (Array.isArray(body.novasFotos)) {
      const novas = (body.novasFotos as { dataUrl: string; thumbUrl: string; nome?: string }[]).filter(
        (f) => f?.dataUrl && f?.thumbUrl,
      )
      if (novas.length)
        await db.foto.createMany({
          data: novas.map((f) => ({ pendenciaId: id, dataUrl: f.dataUrl, thumbUrl: f.thumbUrl, nome: f.nome ?? null })),
        })
    }

    const atualizada = await db.pendencia.update({
      where: { id },
      data,
      include: {
        fotos: { select: { id: true, thumbUrl: true, nome: true }, orderBy: { criadoEm: 'asc' } },
        historico: { orderBy: { criadoEm: 'desc' } },
      },
    })
    return NextResponse.json(atualizada)
  } catch (e) {
    console.error('PATCH /api/pendencias/[id]', e)
    return NextResponse.json({ erro: 'Falha ao atualizar pendência.' }, { status: 500 })
  }
}

// DELETE /api/pendencias/[id] — só ADMIN
export async function DELETE(_req: NextRequest, { params }: Params) {
  const bloqueio = await exigirEditor()
  if (bloqueio) return bloqueio
  const { id } = await params
  await db.pendencia.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
