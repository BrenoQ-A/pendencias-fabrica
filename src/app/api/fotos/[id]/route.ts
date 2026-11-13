import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { exigirEditor } from '@/lib/autorizacao'

type Params = { params: Promise<{ id: string }> }

// GET /api/fotos/[id] — devolve a foto em resolução completa (para o lightbox)
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const foto = await db.foto.findUnique({ where: { id }, select: { id: true, dataUrl: true, nome: true } })
  if (!foto) return NextResponse.json({ erro: 'Foto não encontrada.' }, { status: 404 })
  return NextResponse.json(foto)
}

// DELETE /api/fotos/[id] — só ADMIN
export async function DELETE(_req: NextRequest, { params }: Params) {
  const bloqueio = await exigirEditor()
  if (bloqueio) return bloqueio
  const { id } = await params
  await db.foto.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
