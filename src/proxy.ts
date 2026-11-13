// Proteção de rotas: exige sessão válida em todas as páginas e APIs.
// Exceções: arquivos estáticos e os endpoints do próprio login.

import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_SESSAO, verificarTokenSessao } from '@/lib/auth'

export async function proxy(req: NextRequest) {
  const sessao = await verificarTokenSessao(req.cookies.get(COOKIE_SESSAO)?.value)
  const { pathname } = req.nextUrl

  // A tela de login é sempre acessível (logado ela nem aparece — vai p/ o app)
  if (pathname === '/login') {
    return sessao ? NextResponse.redirect(new URL('/', req.url)) : NextResponse.next()
  }

  if (sessao) return NextResponse.next()

  // APIs respondem 401 (o cliente redireciona ao login quando acontece)
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ erro: 'Não autenticado. Faça login para acessar.' }, { status: 401 })
  }

  // páginas redirecionam direto, preservando o destino original
  const url = new URL('/login', req.url)
  const destino = req.nextUrl.pathname + req.nextUrl.search
  if (destino && destino !== '/') url.searchParams.set('proximo', destino.slice(0, 200))
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|api/auth/login|api/auth/logout|api/auth/session|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?)$).*)',
  ],
}
