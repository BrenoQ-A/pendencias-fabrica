import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

const VALIDOS = ['Pendente', 'Em andamento', 'Concluído']

// POST /api/pendencias/[id]/status — muda status e registra no histórico
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const status = String(body.status ?? '')
    if (!VALIDOS.includes(status)) {
      return NextResponse.json({ erro: 'Status inválido.' }, { status: 400 })
    }

    const atual = await db.pendencia.findUnique({ where: { id } })
    if (!atual) return NextResponse.json({ erro: 'Pendência não encontrada.' }, { status: 404 })
    if (atual.status === status) {
      return NextResponse.json({ ok: true, semMudanca: true })
    }

    const atualizada = await db.pendencia.update({
      where: { id },
      data: {
        status,
        resolvidoEm: status === 'Concluído' ? new Date() : null,
        historico: {
          create: {
            status,
            comentario: body.comentario ? String(body.comentario) : null,
            autor: body.autor ? String(body.autor) : 'App',
          },
        },
      },
      include: {
        fotos: { select: { id: true, thumbUrl: true, nome: true }, orderBy: { criadoEm: 'asc' } },
        historico: { orderBy: { criadoEm: 'desc' } },
      },
    })
    return NextResponse.json(atualizada)
  } catch (e) {
    console.error('POST /api/pendencias/[id]/status', e)
    return NextResponse.json({ erro: 'Falha ao alterar status.' }, { status: 500 })
  }
}
