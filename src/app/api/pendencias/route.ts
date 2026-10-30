import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/pendencias — lista completa (fotos só com thumb, sem dataUrl pesado)
export async function GET() {
  const itens = await db.pendencia.findMany({
    orderBy: [{ status: 'asc' }, { dataLimite: 'asc' }, { numero: 'desc' }],
    select: {
      id: true,
      numero: true,
      titulo: true,
      detalhe: true,
      local: true,
      solucao: true,
      acao: true,
      responsavel: true,
      prioridade: true,
      status: true,
      dataRegistro: true,
      dataLimite: true,
      resolvidoEm: true,
      nota: true,
      registradoPor: true,
      origem: true,
      createdAt: true,
      updatedAt: true,
      fotos: { select: { id: true, thumbUrl: true, nome: true }, orderBy: { criadoEm: 'asc' } },
      historico: { orderBy: { criadoEm: 'desc' } },
    },
  })
  return NextResponse.json(itens)
}

// POST /api/pendencias — cria pendência (fotos já comprimidas no cliente)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const titulo = String(body.titulo ?? '').trim()
    const local = String(body.local ?? '').trim()
    const responsavel = String(body.responsavel ?? '').trim()
    if (!titulo || !local || !responsavel) {
      return NextResponse.json({ erro: 'Problema, local e responsável são obrigatórios.' }, { status: 400 })
    }

    const maior = await db.pendencia.aggregate({ _max: { numero: true } })
    const numero = (maior._max.numero ?? 0) + 1

    const fotos: { dataUrl: string; thumbUrl: string; nome?: string }[] = Array.isArray(body.fotos)
      ? body.fotos.filter((f: { dataUrl?: string; thumbUrl?: string }) => f?.dataUrl && f?.thumbUrl)
      : []

    const criada = await db.pendencia.create({
      data: {
        numero,
        titulo,
        detalhe: body.detalhe ? String(body.detalhe) : null,
        local,
        solucao: body.solucao ? String(body.solucao) : null,
        acao: body.acao ? String(body.acao) : null,
        responsavel,
        prioridade: body.prioridade ?? 'Moderado',
        status: 'Pendente',
        dataRegistro: body.dataRegistro
          ? new Date(`${String(body.dataRegistro).slice(0, 10)}T12:00:00.000Z`)
          : new Date(),
        dataLimite: body.dataLimite ? new Date(`${String(body.dataLimite).slice(0, 10)}T12:00:00.000Z`) : null,
        nota: body.nota ? String(body.nota) : null,
        registradoPor: body.registradoPor ? String(body.registradoPor) : 'App',
        origem: 'App',
        fotos: { create: fotos.map((f) => ({ dataUrl: f.dataUrl, thumbUrl: f.thumbUrl, nome: f.nome ?? null })) },
        historico: {
          create: {
            status: 'Pendente',
            comentario: 'Pendência registrada',
            autor: body.registradoPor ? String(body.registradoPor) : 'App',
          },
        },
      },
      include: {
        fotos: { select: { id: true, thumbUrl: true, nome: true }, orderBy: { criadoEm: 'asc' } },
        historico: { orderBy: { criadoEm: 'desc' } },
      },
    })
    return NextResponse.json(criada, { status: 201 })
  } catch (e) {
    console.error('POST /api/pendencias', e)
    return NextResponse.json({ erro: 'Falha ao criar pendência.' }, { status: 500 })
  }
}
