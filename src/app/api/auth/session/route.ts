// GET /api/auth/session — informa ao cliente se a sessão é válida e de quem
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { COOKIE_SESSAO, verificarTokenSessao } from '@/lib/auth'

export async function GET() {
  const armazen = await cookies()
  const sessao = await verificarTokenSessao(armazen.get(COOKIE_SESSAO)?.value)
  return NextResponse.json({ autenticado: !!sessao, usuario: sessao?.usuario ?? null })
}
