import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { exigirEditor } from '@/lib/autorizacao'
import { proximoNumero } from '@/lib/contador'

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
      ordem: true,
      localInstalacao: true,
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

// POST /api/pendencias — cria pendência (só ADMIN; fotos já comprimidas no cliente)
export async function POST(req: NextRequest) {
  const bloqueio = await exigirEditor()
  if (bloqueio) return bloqueio
  try {
    const body = await req.json()
    const titulo = String(body.titulo ?? '').trim()
    const local = String(body.local ?? '').trim()
    const responsavel = String(body.responsavel ?? '').trim()
    if (!titulo || !local || !responsavel) {
      return NextResponse.json({ erro: 'Problema, local e responsável são obrigatórios.' }, { status: 400 })
    }

    // Contador atômico: não colide quando dois registros chegam juntos
    const numero = await proximoNumero()

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
        nota: body.nota ? String(body.nota).trim() : null,
        ordem: body.ordem ? String(body.ordem).trim() : null,
        localInstalacao: body.localInstalacao ? String(body.localInstalacao).trim() : null,
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
