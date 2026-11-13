// Checagem de permissão para as rotas de API.
// O proxy (src/proxy.ts) já barra quem não está logado; aqui entra quem pode
// escrever — ADMIN edita, SUPERVISOR só vê (etapa 1 do plano).
//
// Uso no começo de cada handler que cria/edita/apaga:
//   const bloqueio = await exigirEditor()
//   if (bloqueio) return bloqueio

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { COOKIE_SESSAO, verificarTokenSessao, type Sessao } from '@/lib/auth'

/** Sessão do cookie atual (null quando não há sessão válida). */
export async function sessaoAtual(): Promise<Sessao | null> {
  const armazen = await cookies()
  return verificarTokenSessao(armazen.get(COOKIE_SESSAO)?.value)
}

/** Verdadeiro só para o perfil que edita. */
export function podeEditar(sessao: Sessao | null): boolean {
  return sessao?.papel === 'ADMIN'
}

/**
 * Guarda das mutações. Devolve null quando pode seguir;
 * devolve 401 (sem sessão) ou 403 (supervisor) para retornar já.
 */
export async function exigirEditor(): Promise<NextResponse | null> {
  const sessao = await sessaoAtual()
  if (!sessao) {
    return NextResponse.json({ erro: 'Não autenticado. Faça login para acessar.' }, { status: 401 })
  }
  if (sessao.papel !== 'ADMIN') {
    return NextResponse.json(
      { erro: 'Seu perfil só consulta; a edição é para o administrador.' },
      { status: 403 },
    )
  }
  return null
}
