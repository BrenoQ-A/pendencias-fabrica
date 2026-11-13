// Autenticação do app Pendências da Fábrica
//
// Acesso único (ideal para equipe pequena) definido por variáveis de ambiente:
//   APP_USUARIO  — nome de usuário (padrão: admin)
//   APP_SENHA    — senha de acesso (padrão: fabrica2026 — TROQUE em produção)
//   AUTH_SECRET  — segredo que assina o cookie de sessão (defina um valor
//                  aleatório em produção; se vazio, usa um padrão fixo)
//
// A sessão é um cookie HttpOnly assinado com HMAC-SHA256 (payload com usuário
// e expiração). Usa apenas Web Crypto, funcionando no middleware (edge) e nas
// rotas de API (Node).

export const COOKIE_SESSAO = 'pendencias_sessao'

const DURACAO_PADRAO_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias

export function obterCredenciais() {
  return {
    usuario: (process.env.APP_USUARIO ?? '').trim() || 'admin',
    senha: process.env.APP_SENHA || 'fabrica2026',
  }
}

export function obterSegredo(): string {
  const explicito = (process.env.AUTH_SECRET ?? '').trim()
  if (explicito) return explicito
  // Padrão fixo (nunca derivado de valores que possam mudar em tempo de
  // execução): garante que middleware e rotas usem sempre o mesmo segredo.
  return 'pendencias-fabrica|segredo-padrao|troque-o-com-AUTH_SECRET'
}

export function duracaoSessaoMs(): number {
  const dias = Number(process.env.SESSAO_DIAS)
  return Number.isFinite(dias) && dias > 0 ? dias * 24 * 60 * 60 * 1000 : DURACAO_PADRAO_MS
}

// ===== Utilitários base64url (btoa/atob existem no edge e no Node 18+) =====

function bytesParaBase64url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64urlParaBytes(texto: string): Uint8Array {
  const base64 = texto.replaceAll('-', '+').replaceAll('_', '=')
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// ===== Comparação em tempo constante (evita ataques de temporização) =====

function comparacaoSegura(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let dif = 0
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return dif === 0
}

async function resumoHex(texto: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verificarCredenciais(usuario?: string, senha?: string): Promise<boolean> {
  const cred = obterCredenciais()
  const [resumoUInfo, resumoUCred] = await Promise.all([
    resumoHex((usuario ?? '').trim().toLowerCase()),
    resumoHex(cred.usuario.toLowerCase()),
  ])
  const [resumoSInfo, resumoSCred] = await Promise.all([resumoHex(senha ?? ''), resumoHex(cred.senha)])
  return comparacaoSegura(resumoUInfo, resumoUCred) && comparacaoSegura(resumoSInfo, resumoSCred)
}

// ===== Token de sessão: <payload base64url>.<hmac base64url> =====

async function chaveHmac(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(obterSegredo()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

export async function criarTokenSessao(usuario: string): Promise<string> {
  const payload = { u: usuario, exp: Date.now() + duracaoSessaoMs() }
  const corpo = bytesParaBase64url(new TextEncoder().encode(JSON.stringify(payload)))
  const assinatura = await crypto.subtle.sign('HMAC', await chaveHmac(), new TextEncoder().encode(corpo))
  return `${corpo}.${bytesParaBase64url(new Uint8Array(assinatura))}`
}

export async function verificarTokenSessao(token: string | undefined | null): Promise<{ usuario: string } | null> {
  if (!token) return null
  const sep = token.lastIndexOf('.')
  if (sep <= 0) return null
  const corpo = token.slice(0, sep)
  const assinatura = token.slice(sep + 1)

  try {
    const esperada = await crypto.subtle.sign('HMAC', await chaveHmac(), new TextEncoder().encode(corpo))
    if (!comparacaoSegura(bytesParaBase64url(new Uint8Array(esperada)), assinatura)) return null

    const payload = JSON.parse(new TextDecoder().decode(base64urlParaBytes(corpo))) as {
      u?: unknown
      exp?: unknown
    }
    if (typeof payload.u !== 'string' || typeof payload.exp !== 'number') return null
    if (payload.exp < Date.now()) return null
    return { usuario: payload.u }
  } catch {
    return null
  }
}

// ===== Cookie =====

export function opcoesCookie(https: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: https, // só em HTTPS (atrás do Caddy) — em HTTP interno não quebra o login
    path: '/',
    maxAge: Math.floor(duracaoSessaoMs() / 1000),
  }
}
