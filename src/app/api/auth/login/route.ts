// POST /api/auth/login — valida credenciais e cria o cookie de sessão
import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_SESSAO, criarTokenSessao, opcoesCookie, verificarCredenciais } from '@/lib/auth'

// Limite simples de tentativas por IP (memória do processo) contra força bruta
const LIMITE_TENTATIVAS = 5
const JANELA_MS = 3 * 60 * 1000 // 3 minutos
const TENTATIVAS = new Map<string, { n: number; ate: number }>()

function ipCliente(req: NextRequest): string {
  const encaminhado = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  return encaminhado || req.headers.get('x-real-ip') || 'desconhecido'
}

export async function POST(req: NextRequest) {
  const ip = ipCliente(req)
  const registro = TENTATIVAS.get(ip)
  if (registro && registro.n >= LIMITE_TENTATIVAS && Date.now() < registro.ate) {
    const segundos = Math.ceil((registro.ate - Date.now()) / 1000)
    return NextResponse.json(
      { erro: `Muitas tentativas incorretas. Tente novamente em ${segundos}s.` },
      { status: 429 },
    )
  }

  let usuario = ''
  let senha = ''
  try {
    const body = await req.json()
    usuario = String(body.usuario ?? '')
    senha = String(body.senha ?? '')
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 })
  }

  if (!(await verificarCredenciais(usuario, senha))) {
    const n = registro && Date.now() < registro.ate ? registro.n + 1 : 1
    TENTATIVAS.set(ip, { n, ate: Date.now() + JANELA_MS })
    return NextResponse.json({ erro: 'Usuário ou senha incorretos.' }, { status: 401 })
  }

  TENTATIVAS.delete(ip)

  // Cookie seguro só quando o acesso é por HTTPS (Caddy envia x-forwarded-proto)
  const https = (req.headers.get('x-forwarded-proto') ?? '').split(',')[0].trim() === 'https'
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_SESSAO, await criarTokenSessao((usuario || 'admin').trim().toLowerCase()), opcoesCookie(https))
  return res
}
